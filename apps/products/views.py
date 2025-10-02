from django.shortcuts import render
from django.views.generic import TemplateView
from web_project import TemplateLayout
from apps.utils.menu_utils import get_menu_items
from rest_framework import viewsets, status
from apps.products.serializers import ProductsSerializer
from rest_framework.response import Response
from apps.products.models import Products
from rest_framework.decorators import action
from django.http import FileResponse, Http404
import json, os, mimetypes
from uuid import uuid4
from django.utils.text import slugify
from datetime import datetime, timezone
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
import re

# ---------------- utils já existentes ----------------

def clean_empty_strings(data):
    for key, value in data.items():
        if isinstance(value, dict):
            clean_empty_strings(value)
        elif isinstance(value, str) and value.strip() == "":
            data[key] = None

MAX_PDF_MB = 10
MAX_IMG_MB = 5
ALLOWED_IMG_MIME = {"image/png", "image/jpeg", "image/webp"}
RE_NIF  = re.compile(r"^\d{9}$")
RE_NISS = re.compile(r"^\d{11}$")

ALLOWED_PARTIAL_SPEC = {
    "identification": {
        "brandName": True,
        "modelName": True,
    }
}

def _get_product_or_404(pk: str):
    try:
        return Products.objects.get(id=pk)
    except Products.DoesNotExist:
        raise Http404("Produto não encontrado")

def _validate_pdf(file):
    if file.content_type != "application/pdf":
        return False, "Apenas PDF é permitido para o manual."
    if file.size > MAX_PDF_MB * 1024 * 1024:
        return False, f"O manual excede {MAX_PDF_MB} MB."
    return True, None

def _validate_image(file):
    if file.content_type not in ALLOWED_IMG_MIME:
        return False, "Imagem inválida. Tipos permitidos: PNG, JPG, WEBP."
    if file.size > MAX_IMG_MB * 1024 * 1024:
        return False, f"A imagem excede {MAX_IMG_MB} MB."
    return True, None

def _safe_filename(original_name, content_type):
    ext = mimetypes.guess_extension(content_type) or os.path.splitext(original_name)[1] or ""
    stem = slugify(os.path.splitext(original_name)[0]) or "file"
    return f"{stem}-{uuid4().hex}{ext}"

# ---------------- sessão/roles ----------------

def _get_current_user_id(request):
    return request.session.get("user_id")

def _get_profile(uid: str):
    if not uid:
        return None
    try:
        from apps.accounts.models import User 
        return User.objects(id=uid).only("id", "is_superuser", "is_company").first()
    except Exception:
        return None

def _can_create(profile) -> bool:
    return bool(profile and (getattr(profile, "is_superuser", False) or getattr(profile, "is_company", False)))

def _can_delete(profile) -> bool:
    return bool(profile and getattr(profile, "is_superuser", False))

def _can_edit_full(profile, product) -> bool:
    if not profile:
        return False
    if getattr(profile, "is_superuser", False):
        return True
    return bool(getattr(profile, "is_company", False) and str(getattr(product, "companyUserId", "")) == str(profile.id))

def _can_edit_partial(profile, product) -> bool:
    if not profile:
        return False
    return str(getattr(product, "ownerUserId", "")) == str(profile.id)

def _can_view(profile, uid: str, product) -> bool:
    if not profile:
        return False
    if getattr(profile, "is_superuser", False):
        return True
    if getattr(profile, "is_company", False):
        return (
            str(getattr(product, "companyUserId", "")) == str(profile.id) or
            str(getattr(product, "createdById", "")) == str(profile.id)
        )
    return str(getattr(product, "ownerUserId", "")) == str(uid)

def _now_utc():
    return datetime.now(timezone.utc)

def _prune_by_spec(payload: dict, spec: dict) -> dict:
    if not isinstance(payload, dict) or not isinstance(spec, dict):
        return {}
    out = {}
    for k, v in payload.items():
        if k not in spec:
            continue
        rule = spec[k]
        if rule is True:
            out[k] = v
        elif isinstance(rule, dict) and isinstance(v, dict):
            sub = _prune_by_spec(v, rule)
            if sub:
                out[k] = sub
    return out


# ---------------- Views ----------------

class ProductsViewSet(viewsets.ViewSet):
    serializer_class = ProductsSerializer

    def list(self, request):
        try:
            uid = _get_current_user_id(request)
            profile = _get_profile(uid)
            if not uid or not profile:
                return Response({"success": False, "detail": "Não autenticado."}, status=status.HTTP_401_UNAUTHORIZED)

            qs = Products.objects.filter(identification__isActive=True)

            if getattr(profile, "is_superuser", False):
                pass
            elif getattr(profile, "is_company", False):
                acc_id = str(profile.id)
                qs = qs.filter(__raw__={"$or": [
                    {"companyUserId": acc_id},
                    {"createdById": acc_id}
                ]})
            else:
                qs = qs.filter(ownerUserId=str(profile.id))

            serializer = self.serializer_class(qs, many=True)
            return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Erro no MongoDB: {str(e)}")
            return Response({
                "success": False,
                "error": "Erro no servidor de banco de dados",
                "details": str(e)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    def create(self, request):
        try:
            uid = _get_current_user_id(request)
            profile = _get_profile(uid)
            if not uid or not profile:
                return Response({"success": False, "detail": "Não autenticado."}, status=status.HTTP_401_UNAUTHORIZED)
            if not _can_create(profile):
                return Response({"success": False, "detail": "Apenas Empresa ou Superuser podem criar passaportes."},
                                status=status.HTTP_403_FORBIDDEN)

            json_data = json.loads(request.data.get('json', '{}'))
            clean_empty_strings(json_data)

            serializer = self.serializer_class(data=json_data)
            if not serializer.is_valid():
                return Response({"success": False, "errors": serializer.errors},
                                status=status.HTTP_400_BAD_REQUEST)

            product = serializer.save()

            product.createdById = str(uid)
            product.updatedById = str(uid)
            if getattr(profile, "is_company", False) and not getattr(product, "companyUserId", None):
                product.companyUserId = str(uid)
            product.updatedAt = _now_utc()

            if 'manualFile' in request.FILES:
                file = request.FILES['manualFile']
                ok, msg = _validate_pdf(file)
                if not ok:
                    return Response({"success": False, "errors": {"manualFile": [msg]}},
                                    status=status.HTTP_400_BAD_REQUEST)
                product.manualFile.put(
                    file,
                    content_type=file.content_type,
                    filename=_safe_filename(file.name, file.content_type)
                )

            if 'imageFile' in request.FILES:
                img = request.FILES['imageFile']
                ok, msg = _validate_image(img)
                if not ok:
                    return Response({"success": False, "errors": {"imageFile": [msg]}},
                                    status=status.HTTP_400_BAD_REQUEST)
                product.imageFile.put(
                    img,
                    content_type=img.content_type,
                    filename=_safe_filename(img.name, img.content_type)
                )
                product.imageUrl = request.build_absolute_uri(
                    f"/products/api/products/{product.id}/image/"
                )

            product.save()
            return Response({
                "success": True,
                "id": str(product.id),
                "message": "Produto criado com sucesso"
            }, status=status.HTTP_201_CREATED)

        except json.JSONDecodeError as e:
            return Response({"success": False, "error": "Erro ao processar JSON", "details": str(e)},
                            status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, pk=None):
        try:
            product = Products.objects.get(id=pk)

            uid = _get_current_user_id(request)
            profile = _get_profile(uid)
            if not uid or not profile or not _can_view(profile, uid, product):
                return Response({"success": False, "detail": "Sem permissão para visualizar este produto."},
                                status=status.HTTP_403_FORBIDDEN)
                
            serializer = self.serializer_class(product)
            data = serializer.data

            if product.imageFile:
                data['imageUrl'] = request.build_absolute_uri(f"/products/api/products/{product.id}/image/")
                data['imageFileName'] = getattr(product.imageFile, "filename", None) or "image"
            if product.manualFile:
                data['manualUrl'] = request.build_absolute_uri(f"/products/api/products/{product.id}/manual/")
                data['manualFileName'] = getattr(product.manualFile, "filename", None) or "manual.pdf"

            return Response(data, status=status.HTTP_200_OK)
        except Products.DoesNotExist:
            return Response({"success": False, "error": "Produto não encontrado"}, status=status.HTTP_404_NOT_FOUND)

    def update(self, request, pk=None):
        def _truthy(v):
            return str(v).lower() in {"1", "true", "on", "yes"}

        try:
            product = Products.objects.get(id=pk)

            uid = _get_current_user_id(request)
            profile = _get_profile(uid)
            if not uid or not profile:
                return Response({"success": False, "detail": "Não autenticado."}, status=status.HTTP_401_UNAUTHORIZED)

            full  = _can_edit_full(profile, product)
            part  = _can_edit_partial(profile, product)  

            if not (full or part):
                return Response({"success": False, "detail": "Sem permissão para editar este passaporte."},
                                status=status.HTTP_403_FORBIDDEN)

            json_data = json.loads(request.data.get('json', '{}'))
            clean_empty_strings(json_data)

            # se for edição parcial, filtre campos permitidos
            if part and not full:
                json_data = _prune_by_spec(json_data, ALLOWED_PARTIAL_SPEC)

                # bloqueia remover/substituir ficheiros em edição parcial
                if request.data.get('removeManual') or request.data.get('removeImage') or \
                ('manualFile' in request.FILES) or ('imageFile' in request.FILES):
                    return Response(
                        {"success": False, "detail": "Operações de ficheiro não são permitidas em edição parcial."},
                        status=status.HTTP_403_FORBIDDEN
                    )

            serializer = self.serializer_class(product, data=json_data, partial=True)
            if not serializer.is_valid():
                return Response({"success": False, "errors": serializer.errors},
                                status=status.HTTP_400_BAD_REQUEST)

            updated_product = serializer.save()

            updated_product.updatedById = str(uid)
            updated_product.updatedAt = _now_utc()

            if _truthy(request.data.get('removeManual')) and updated_product.manualFile:
                updated_product.manualFile.delete()
                updated_product.manualFile = None

            if _truthy(request.data.get('removeImage')) and updated_product.imageFile:
                updated_product.imageFile.delete()
                updated_product.imageFile = None
                updated_product.imageUrl = None

            if 'manualFile' in request.FILES:
                file = request.FILES['manualFile']
                ok, msg = _validate_pdf(file)
                if not ok:
                    return Response({"success": False, "errors": {"manualFile": [msg]}},
                                    status=status.HTTP_400_BAD_REQUEST)
                if updated_product.manualFile:
                    updated_product.manualFile.replace(
                        file, content_type=file.content_type,
                        filename=_safe_filename(file.name, file.content_type)
                    )
                else:
                    updated_product.manualFile.put(
                        file, content_type=file.content_type,
                        filename=_safe_filename(file.name, file.content_type)
                    )

            if 'imageFile' in request.FILES:
                img = request.FILES['imageFile']
                ok, msg = _validate_image(img)
                if not ok:
                    return Response({"success": False, "errors": {"imageFile": [msg]}},
                                    status=status.HTTP_400_BAD_REQUEST)
                if updated_product.imageFile:
                    updated_product.imageFile.replace(
                        img, content_type=img.content_type,
                        filename=_safe_filename(img.name, img.content_type)
                    )
                else:
                    updated_product.imageFile.put(
                        img, content_type=img.content_type,
                        filename=_safe_filename(img.name, img.content_type)
                    )
                updated_product.imageUrl = request.build_absolute_uri(
                    f"/products/api/products/{updated_product.id}/image/"
                )

            updated_product.save()
            return Response({"success": True, "id": str(updated_product.id),
                             "message": "Produto atualizado com sucesso"}, status=status.HTTP_200_OK)

        except Products.DoesNotExist:
            return Response({"success": False, "error": "Produto não encontrado"},
                            status=status.HTTP_404_NOT_FOUND)
        except json.JSONDecodeError as e:
            return Response({"success": False, "error": "Erro ao processar JSON", "details": str(e)},
                            status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        try:
            uid = _get_current_user_id(request)
            profile = _get_profile(uid)
            if not uid or not profile:
                return Response({"success": False, "detail": "Não autenticado."}, status=status.HTTP_401_UNAUTHORIZED)
            if not _can_delete(profile):
                return Response({"success": False, "detail": "Apenas Superuser pode excluir passaportes."},
                                status=status.HTTP_403_FORBIDDEN)

            product = Products.objects.get(id=pk)
            product.identification.isActive = False
            product.save()
            return Response({"success": True, "message": "Produto desativado com sucesso"},
                            status=status.HTTP_200_OK)
        except Products.DoesNotExist:
            return Response({"success": False, "error": "Produto não encontrado"},
                            status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'], url_path='manual')
    def manual(self, request, pk=None):
        product = _get_product_or_404(pk)
        if not product.manualFile:
            return Response(status=status.HTTP_404_NOT_FOUND)
        resp = FileResponse(product.manualFile, content_type='application/pdf')
        filename = getattr(product.manualFile, "filename", None) or "manual.pdf"
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp

    @action(detail=True, methods=['get'], url_path='image')
    def image(self, request, pk=None):
        product = _get_product_or_404(pk)
        if not product.imageFile:
            return Response(status=status.HTTP_404_NOT_FOUND)
        ct = getattr(product.imageFile, "content_type", None) or "application/octet-stream"
        resp = FileResponse(product.imageFile, content_type=ct)
        filename = getattr(product.imageFile, "filename", None) or "image"
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp

    @action(detail=True, methods=['post'], url_path='associate-owner')
    def associate_owner(self, request, pk=None):
        try:
            uid = _get_current_user_id(request)
            profile = _get_profile(uid)
            if not uid or not profile:
                return Response({"success": False, "detail": "Não autenticado."}, status=status.HTTP_401_UNAUTHORIZED)
            if not _can_create(profile):
                return Response({"success": False, "detail": "Apenas Empresa ou Superuser podem associar proprietário."},
                                status=status.HTTP_403_FORBIDDEN)

            product = Products.objects.get(id=pk)

            if not getattr(profile, "is_superuser", False):
                if not _can_edit_full(profile, product):
                    return Response({"success": False, "detail": "Sem permissão para associar proprietário a este produto."},
                                    status=status.HTTP_403_FORBIDDEN)

            identifier = (request.data.get("identifier") or "").strip()
            if not identifier:
                return Response({"success": False, "detail": "Informe NIF ou NISS."}, status=status.HTTP_400_BAD_REQUEST)

            from apps.accounts.models import User

            target = None
            if RE_NIF.fullmatch(identifier):
                target = User.objects(nif=identifier).first()
            elif RE_NISS.fullmatch(identifier):
                target = User.objects(niss=identifier).first()
            else:
                target = User.objects(nif=identifier).first() or User.objects(niss=identifier).first()

            if not target:
                return Response({"success": False, "detail": "Nenhum utilizador encontrado para esse NIF/NISS."},
                                status=status.HTTP_404_NOT_FOUND)

            product.ownerUserId = str(target.id)
            product.updatedById = str(uid)
            product.updatedAt = _now_utc()
            product.save()

            return Response({"success": True, "ownerUserId": product.ownerUserId}, status=status.HTTP_200_OK)

        except Products.DoesNotExist:
            return Response({"success": False, "detail": "Produto não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print("associate_owner error:", e)
            return Response({"success": False, "detail": "Erro ao associar proprietário."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# --------- páginas HTML ---------

@method_decorator(ensure_csrf_cookie, name='dispatch')
class ProductsViews(LoginRequiredMixin, TemplateView):
    login_url = "/accounts/login/"
    redirect_field_name = "next"

    def get_context_data(self, **kwargs):
        context = TemplateLayout.init(self, super().get_context_data(**kwargs))
        context['menu_items'] = get_menu_items(self.request)

        uid = _get_current_user_id(self.request)
        profile = _get_profile(uid)

        can_create = bool(profile and (
            getattr(profile, "is_superuser", False) or
            getattr(profile, "is_company", False)
        ))
        context["can_create"] = can_create
        context["can_associate"] = can_create

        context["APP_CONTEXT"] = {
            "canCreate": can_create,
            "canAssociate": can_create,
            "isCompany": bool(getattr(profile, "is_company", False)),
            "isSuperuser": bool(getattr(profile, "is_superuser", False)),
            "userId": str(getattr(profile, "id", "")),
        }
        return context

@ensure_csrf_cookie
@login_required(login_url="/accounts/login/")
# apps/products/views.py

def product_details(request, product_id):
    product = Products.objects(id=product_id).first()
    if not product:
        return render(request, '404.html', status=404)

    uid = _get_current_user_id(request)
    profile = _get_profile(uid)

    if not uid or not profile or not _can_view(profile, uid, product):
        return render(request, '403.html', status=403)

    product_data = product.to_mongo()
    context = TemplateLayout.init(request, {'product': product_data})
    context['menu_items'] = get_menu_items(request)
    return render(request, 'productDetail.html', context)
