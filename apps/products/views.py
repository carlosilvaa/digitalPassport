from django.shortcuts import render
from django.views.generic import TemplateView
from web_project import TemplateLayout
from apps.utils.menu_utils import get_menu_items
from rest_framework import viewsets, status
from apps.products.serializers import ProductsSerializer
from rest_framework.response import Response
from apps.products.models import Products, UsageData, MaintenanceItem, RepairItem, UsageAttachment
from rest_framework.decorators import action
from django.http import FileResponse, Http404
import json, os, mimetypes, qrcode
from uuid import uuid4
from django.utils.text import slugify
from datetime import datetime, timezone
from django.contrib.auth.mixins import LoginRequiredMixin 
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
import re
from django.utils.html import mark_safe
from apps.products.forms import *
from django.core.serializers.json import DjangoJSONEncoder
from django.conf import settings


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

USAGE_MAINT_RE = re.compile(r'^usage_maint_(\d+)_(\d+)$')
USAGE_REPAIR_RE = re.compile(r'^usage_repair_(\d+)_(\d+)$')
def _is_usage_filekey(k: str) -> bool:
    return bool(USAGE_MAINT_RE.match(k) or USAGE_REPAIR_RE.match(k))


ALLOWED_PARTIAL_SPEC = {
    "usageData": True,
    "productLifecycle": True,
}

QR_DIR = os.path.join(settings.BASE_DIR, "qrcodes")

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

def _qr_disk_path(product_id: str) -> str:
    return os.path.join(QR_DIR, f"{product_id}.png")

def _product_detail_abs_url(request, product_id: str) -> str:
    return request.build_absolute_uri(f"/products/products/{product_id}/")

def generate_qr_for_product(request, product):
    os.makedirs(QR_DIR, exist_ok=True)
    path = _qr_disk_path(str(product.id))

    target_url = _product_detail_abs_url(request, str(product.id))

    img = qrcode.make(target_url)
    img.save(path)

    return request.build_absolute_uri(f"/products/api/products/{product.id}/qrcode/")
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

def _apply_ids(form, prefix, checkbox_as='form-check-input'):
    for name, field in form.fields.items():
        wid = field.widget
        base_cls = wid.attrs.get('class', '')

        if getattr(wid, 'input_type', None) == 'checkbox':
            # checkboxes
            cls = base_cls.split()
            if 'form-check-input' not in cls:
                cls.append(checkbox_as)
            wid.attrs['class'] = ' '.join(cls)
        else:
            # inputs/selects/textarea => GARANTIR sm
            cls = base_cls.split()
            if 'form-control' not in cls:
                cls.append('form-control')
            if 'form-control-sm' not in cls:
                cls.append('form-control-sm')
            wid.attrs['class'] = ' '.join(cls)

        wid.attrs['id'] = f'{prefix}_{name}'

def _build_admin_forms_ctx():
    ident = IdentificationForm()
    _apply_ids(ident, 'identification')
    
    prod_cat = ProductCategoryForm()
    _apply_ids(prod_cat, 'identification_productCategory')

    tech = TechnicalSpecificationsForm()
    _apply_ids(tech, 'technicalSpecifications')
    tech_operV = OperatingRangeForm(); _apply_ids(tech_operV, 'technicalSpecifications_operatingVoltage')
    tech_operT = OperatingRangeForm(); _apply_ids(tech_operT, 'technicalSpecifications_operatingTemperature')
    tech_power = PowerConsumptionForm(); _apply_ids(tech_power, 'technicalSpecifications_powerConsumption')
    tech_dims = DimensionsForm(); _apply_ids(tech_dims,  'technicalSpecifications_dimensions')
    tech_w = WeightForm(); _apply_ids(tech_w,     'technicalSpecifications_weight')
    tech_add = AdditionalSpecsForm(); _apply_ids(tech_add,   'technicalSpecifications_additionalSpecs')
    doc  = DocumentationForm(); _apply_ids(doc, 'documentation')
    prod = ManufacturingForm(); _apply_ids(prod, 'productionData_manufacturing')
    sust = SustainabilityForm(); _apply_ids(sust, 'sustainability')
    eol  = ProductLifecycleForm(); _apply_ids(eol, 'productLifecycle')

    return {
        'ident': ident,
        'prod_cat': prod_cat,  # Add product category form to context
        'tech': tech,
        'tech_operV': tech_operV,
        'tech_operT': tech_operT,
        'tech_power': tech_power,
        'tech_dims': tech_dims,
        'tech_w': tech_w,
        'tech_add': tech_add,
        'doc': doc,
        'sust': sust,
        'eol': eol,
        'prod': prod
    }

def _build_common_forms_ctx():
    usage = UsageDataForm(); _apply_ids(usage, 'usageData')
    eol = ProductLifecycleForm(); _apply_ids(eol, 'productLifecycle')
    return {'usage': usage, 'eol': eol}

def render_form_rows(form, title=None, icon=None, cols=2):
    html = []
    if title:
        ico = f'<i class="{icon} me-1"></i>' if icon else ''
        html.append(f'<div class="section-title mt-1">{ico}{title}</div>')
    html.append('<div class="row g-2">')
    col_cls = f'col-md-{12 // cols} m-0'
    for bf in form:
        html.append(f'<div class="{col_cls}">{bf.label_tag()} {bf.as_widget()}</div>')
    html.append('</div>')
    return mark_safe(''.join(html))

def render_custom_fields(fields_config, title=None, icon=None):
    """
    Render fields with custom column sizes for optimal space usage.
    fields_config: list of tuples (field_object, col_size) where col_size is like 'col-md-6', 'col-md-4', etc.
    """
    html = []
    if title:
        ico = f'<i class="{icon} me-1"></i>' if icon else ''
        html.append(f'<div class="section-title mt-1">{ico}{title}</div>')
    html.append('<div class="row g-2">')
    for bf, col_cls in fields_config:
        html.append(f'<div class="{col_cls} m-0">{bf.label_tag()} {bf.as_widget()}</div>')
    html.append('</div>')
    return mark_safe(''.join(html))

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
            try:
                qr_url = generate_qr_for_product(request, product)
                product.qr_code = qr_url 
            except Exception as e:
                print("Erro ao gerar QR:", e)

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
                return Response(
                    {"success": False, "detail": "Sem permissão para visualizar este produto."},
                    status=status.HTTP_403_FORBIDDEN
                )

            serializer = self.serializer_class(product)
            data = serializer.data

            if product.imageFile:
                data['imageUrl'] = request.build_absolute_uri(
                    f"/products/api/products/{product.id}/image/"
                )
                data['imageFileName'] = getattr(product.imageFile, "filename", None) or "image"

            if product.manualFile:
                data['manualUrl'] = request.build_absolute_uri(
                    f"/products/api/products/{product.id}/manual/"
                )
                data['manualFileName'] = getattr(product.manualFile, "filename", None) or "manual.pdf"

            def _inject_usage_attachment_urls(request, product, data):
                usage = data.get('usageData') or {}
                base = f"/products/api/products/{product.id}/usage-attachment/"
                for item in (usage.get('maintenanceHistory') or []):
                    for att in (item.get('attachments') or []):
                        if att.get('attachmentId'):
                            att['url'] = request.build_absolute_uri(
                                base + att['attachmentId'] + "/"
                            )
                for item in (usage.get('repairHistory') or []):
                    for att in (item.get('attachments') or []):
                        if att.get('attachmentId'):
                            att['url'] = request.build_absolute_uri(
                                base + att['attachmentId'] + "/"
                            )

            _inject_usage_attachment_urls(request, product, data)

            return Response(data, status=status.HTTP_200_OK)

        except Products.DoesNotExist:
            return Response(
                {"success": False, "error": "Produto não encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )

    def update(self, request, pk=None):
        def _truthy(v): return str(v).lower() in {"1", "true", "on", "yes"}

        json_data = {}
        try:
            product = Products.objects.get(id=pk)
            uid = _get_current_user_id(request)
            profile = _get_profile(uid)
            if not uid or not profile:
                return Response({"success": False, "detail": "Não autenticado."},
                                status=status.HTTP_401_UNAUTHORIZED)

            full = _can_edit_full(profile, product)
            part = _can_edit_partial(profile, product)

            if not (full or part):
                return Response({"success": False, "detail": "Sem permissão para editar este passaporte."},
                                status=status.HTTP_403_FORBIDDEN)

            is_super = bool(getattr(profile, "is_superuser", False))
            is_company = bool(getattr(profile, "is_company", False))

            try:
                json_data = json.loads(request.data.get("json", "{}"))
            except Exception:
                json_data = {}
            
            if is_company and not is_super:
                forbidden = {"usageData", "productLifecycle"}
                for key in forbidden:
                    if key in json_data:
                        json_data.pop(key)
            
            remove_ids_raw = request.data.get("removeUsageAttachmentIds")
            remove_ids = set()
            if remove_ids_raw:
                try:
                    remove_ids = set(json.loads(remove_ids_raw) or [])
                except Exception:
                    pass

            clean_empty_strings(json_data)

            if part and not full:
                json_data = _prune_by_spec(json_data, ALLOWED_PARTIAL_SPEC)
                for fk in request.FILES.keys():
                    if fk in ("manualFile", "imageFile") or not _is_usage_filekey(fk):
                        return Response(
                            {"success": False, "detail": "Apenas anexos de usageData são permitidos em edição parcial."},
                            status=status.HTTP_403_FORBIDDEN,
                        )

            old_maint_attachments = {}
            old_repair_attachments = {}
            
            if hasattr(product, 'usageData') and product.usageData:
                if product.usageData.maintenanceHistory:
                    for idx, item in enumerate(product.usageData.maintenanceHistory):
                        if item.attachments:
                            old_maint_attachments[idx] = list(item.attachments)
                
                if product.usageData.repairHistory:
                    for idx, item in enumerate(product.usageData.repairHistory):
                        if item.attachments:
                            old_repair_attachments[idx] = list(item.attachments)

            serializer = self.serializer_class(product, data=json_data, partial=True)
            if not serializer.is_valid():
                return Response({"success": False, "errors": serializer.errors},
                                status=status.HTTP_400_BAD_REQUEST)

            updated_product = serializer.save()

            if not updated_product.usageData:
                updated_product.usageData = UsageData()
            if updated_product.usageData.maintenanceHistory is None:
                updated_product.usageData.maintenanceHistory = []
            if updated_product.usageData.repairHistory is None:
                updated_product.usageData.repairHistory = []

            # Restore maintenance attachments
            for idx, attachments in old_maint_attachments.items():
                if idx < len(updated_product.usageData.maintenanceHistory):
                    item = updated_product.usageData.maintenanceHistory[idx]
                    if item.attachments is None:
                        item.attachments = []
                    item.attachments.extend(attachments)

            # Restore repair attachments
            for idx, attachments in old_repair_attachments.items():
                if idx < len(updated_product.usageData.repairHistory):
                    item = updated_product.usageData.repairHistory[idx]
                    if item.attachments is None:
                        item.attachments = []
                    item.attachments.extend(attachments)

            if remove_ids:
                u = getattr(updated_product, "usageData", None)
                if u:
                    for group in [u.maintenanceHistory or [], u.repairHistory or []]:
                        for item in group:
                            if not item.attachments:
                                continue
                            kept = []
                            for att in item.attachments:
                                if att.attachmentId in remove_ids:
                                    try:
                                        if getattr(att, "file", None):
                                            att.file.delete()
                                    except Exception:
                                        pass
                                    continue
                                kept.append(att)
                            item.attachments = kept

            for key, file in request.FILES.items():
                if not key.startswith("usage_maint_"):
                    continue
                try:
                    parts = key.split("_")
                    if len(parts) < 4:
                        continue
                    i = int(parts[2])
                except (ValueError, IndexError):
                    continue

                while len(updated_product.usageData.maintenanceHistory) <= i:
                    updated_product.usageData.maintenanceHistory.append(MaintenanceItem())

                item = updated_product.usageData.maintenanceHistory[i]
                if item.attachments is None:
                    item.attachments = []

                att = UsageAttachment(
                    attachmentId=uuid4().hex,
                    filename=getattr(file, "name", None),
                    contentType=getattr(file, "content_type", None),
                    size=getattr(file, "size", None),
                )
                att.file.put(
                    file,
                    content_type=att.contentType or "application/octet-stream",
                    filename=_safe_filename(att.filename or "file", att.contentType or "application/octet-stream"),
                )
                item.attachments.append(att)

            for key, file in request.FILES.items():
                if not key.startswith("usage_repair_"):
                    continue
                try:
                    parts = key.split("_")
                    if len(parts) < 4:
                        continue
                    i = int(parts[2])
                except (ValueError, IndexError):
                    continue

                while len(updated_product.usageData.repairHistory) <= i:
                    updated_product.usageData.repairHistory.append(RepairItem())

                item = updated_product.usageData.repairHistory[i]
                if item.attachments is None:
                    item.attachments = []

                att = UsageAttachment(
                    attachmentId=uuid4().hex,
                    filename=getattr(file, "name", None),
                    contentType=getattr(file, "content_type", None),
                    size=getattr(file, "size", None),
                )
                att.file.put(
                    file,
                    content_type=att.contentType or "application/octet-stream",
                    filename=_safe_filename(att.filename or "file", att.contentType or "application/octet-stream"),
                )
                item.attachments.append(att)

            updated_product.updatedById = str(uid)
            updated_product.updatedAt = _now_utc()

            # Remover manual / imagem se marcado
            if _truthy(request.data.get("removeManual")) and updated_product.manualFile:
                updated_product.manualFile.delete()
                updated_product.manualFile = None
            if _truthy(request.data.get("removeImage")) and updated_product.imageFile:
                updated_product.imageFile.delete()
                updated_product.imageFile = None
                updated_product.imageUrl = None

            # Substituir manualFile / imageFile se enviados
            if "manualFile" in request.FILES:
                file = request.FILES["manualFile"]
                ok, msg = _validate_pdf(file)
                if not ok:
                    return Response({"success": False, "errors": {"manualFile": [msg]}},
                                    status=status.HTTP_400_BAD_REQUEST)
                target = updated_product.manualFile
                if target:
                    target.replace(file, content_type=file.content_type,
                                filename=_safe_filename(file.name, file.content_type))
                else:
                    updated_product.manualFile.put(
                        file, content_type=file.content_type,
                        filename=_safe_filename(file.name, file.content_type)
                    )

            if "imageFile" in request.FILES:
                img = request.FILES["imageFile"]
                ok, msg = _validate_image(img)
                if not ok:
                    return Response({"success": False, "errors": {"imageFile": [msg]}},
                                    status=status.HTTP_400_BAD_REQUEST)
                target = updated_product.imageFile
                if target:
                    target.replace(img, content_type=img.content_type,
                                filename=_safe_filename(img.name, img.content_type))
                else:
                    updated_product.imageFile.put(
                        img, content_type=img.content_type,
                        filename=_safe_filename(img.name, img.content_type)
                    )
                updated_product.imageUrl = request.build_absolute_uri(
                    f"/products/api/products/{updated_product.id}/image/"
                )

            updated_product.save()

            response_serializer = self.serializer_class(updated_product)
            response_data = response_serializer.data

            # Adicionar URLs de imagem e manual
            if updated_product.imageFile:
                response_data['imageUrl'] = request.build_absolute_uri(
                    f"/products/api/products/{updated_product.id}/image/"
                )
                response_data['imageFileName'] = getattr(updated_product.imageFile, "filename", None) or "image"

            if updated_product.manualFile:
                response_data['manualUrl'] = request.build_absolute_uri(
                    f"/products/api/products/{updated_product.id}/manual/"
                )
                response_data['manualFileName'] = getattr(updated_product.manualFile, "filename", None) or "manual.pdf"

            def _inject_usage_attachment_urls(request, product, data):
                usage = data.get('usageData') or {}
                base = f"/products/api/products/{product.id}/usage-attachment/"
                for item in (usage.get('maintenanceHistory') or []):
                    for att in (item.get('attachments') or []):
                        if att.get('attachmentId'):
                            att['url'] = request.build_absolute_uri(
                                base + att['attachmentId'] + "/"
                            )
                for item in (usage.get('repairHistory') or []):
                    for att in (item.get('attachments') or []):
                        if att.get('attachmentId'):
                            att['url'] = request.build_absolute_uri(
                                base + att['attachmentId'] + "/"
                            )

            _inject_usage_attachment_urls(request, updated_product, response_data)

            return Response(
                {
                    "success": True,
                    "message": "Produto atualizado com sucesso",
                    "data": response_data
                },
                status=status.HTTP_200_OK,
            )

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
        
    @action(detail=True, methods=['get'], url_path='usage-attachment/(?P<attachment_id>[a-f0-9]{32})')
    def usage_attachment(self, request, pk=None, attachment_id=None):
        product = _get_product_or_404(pk)
        uid = _get_current_user_id(request); profile = _get_profile(uid)
        if not uid or not profile or not _can_view(profile, uid, product):
            return Response(status=status.HTTP_403_FORBIDDEN)

        u = getattr(product, "usageData", None)
        if not u: return Response(status=status.HTTP_404_NOT_FOUND)
        att = None
        for it in (u.maintenanceHistory or []):
            for a in (it.attachments or []):
                if a.attachmentId == attachment_id: att = a; break
        if not att:
            for it in (u.repairHistory or []):
                for a in (it.attachments or []):
                    if a.attachmentId == attachment_id: att = a; break
        if not att or not att.file:
            return Response(status=status.HTTP_404_NOT_FOUND)

        resp = FileResponse(att.file, content_type=att.contentType or "application/octet-stream")
        resp["Content-Disposition"] = f'inline; filename="{att.filename or "attachment"}"'
        return resp
   
    # apps/products/views.py  (dentro de ProductsViewSet.form_admin)

    @action(detail=False, methods=['get'], url_path='form/admin')
    def form_admin(self, request):
        ctx = _build_admin_forms_ctx()

        ident_form = ctx['ident']
        prod_cat_form = ctx['prod_cat']  # Get product category form
        
        step1_html = ''.join([
            '<div class="section-title mt-1"><i class="bx bx-id-card me-1"></i> Product Identification</div>',
            '<div class="row g-2">',
            # Brand and Model - most important fields, half width each
            f'<div class="col-md-6 m-0">{ident_form["brandName"].label_tag()} {ident_form["brandName"].as_widget()}</div>',
            f'<div class="col-md-6 m-0">{ident_form["modelName"].label_tag()} {ident_form["modelName"].as_widget()}</div>',
            # SKU, UPC, Serial Pattern - medium importance, 4 columns each
            f'<div class="col-md-4 m-0">{ident_form["sku"].label_tag()} {ident_form["sku"].as_widget()}</div>',
            f'<div class="col-md-4 m-0">{ident_form["upc"].label_tag()} {ident_form["upc"].as_widget()}</div>',
            f'<div class="col-md-4 m-0">{ident_form["serialNumberPattern"].label_tag()} {ident_form["serialNumberPattern"].as_widget()}</div>',
            # Active checkbox - small field
            f'<div class="col-md-12 m-0"><div class="form-check mt-2">{ident_form["isActive"].as_widget()} {ident_form["isActive"].label_tag(attrs={"class": "form-check-label"})}</div></div>',
            # Categories section - grouped together at the end
            '<div class="col-12 mt-3"><hr class="my-2"><h6 class="text-muted small mb-2"><i class="bx bx-category me-1"></i> Product Categories</h6></div>',
            f'<div class="col-md-4 m-0">{prod_cat_form["primary"].label_tag()} {prod_cat_form["primary"].as_widget()}</div>',
            f'<div class="col-md-4 m-0">{prod_cat_form["secondary"].label_tag()} {prod_cat_form["secondary"].as_widget()}</div>',
            f'<div class="col-md-4 m-0">{prod_cat_form["tertiary"].label_tag()} {prod_cat_form["tertiary"].as_widget()}</div>',
            '</div>',
        ])

        step2_html = ''.join([
            '<div class="section-title mt-1"><i class="bx bxs-bolt me-1"></i> Operating Voltage</div>',
            '<div class="row g-2">',
            f'<div class="col-md-4 m-0">{ctx["tech_operV"]["min"].label_tag()} {ctx["tech_operV"]["min"].as_widget()}</div>',
            f'<div class="col-md-4 m-0">{ctx["tech_operV"]["max"].label_tag()} {ctx["tech_operV"]["max"].as_widget()}</div>',
            f'<div class="col-md-4 m-0">{ctx["tech_operV"]["unit"].label_tag()} {ctx["tech_operV"]["unit"].as_widget()}</div>',
            '</div>',
            
            '<div class="section-title mt-2"><i class="bx bxs-thermometer me-1"></i> Operating Temperature</div>',
            '<div class="row g-2">',
            f'<div class="col-md-4 m-0">{ctx["tech_operT"]["min"].label_tag()} {ctx["tech_operT"]["min"].as_widget()}</div>',
            f'<div class="col-md-4 m-0">{ctx["tech_operT"]["max"].label_tag()} {ctx["tech_operT"]["max"].as_widget()}</div>',
            f'<div class="col-md-4 m-0">{ctx["tech_operT"]["unit"].label_tag()} {ctx["tech_operT"]["unit"].as_widget()}</div>',
            '</div>',
            
            '<div class="section-title mt-2"><i class="bx bx-battery me-1"></i> Power Consumption</div>',
            '<div class="row g-2">',
            f'<div class="col-md-4 m-0">{ctx["tech_power"]["standby"].label_tag()} {ctx["tech_power"]["standby"].as_widget()}</div>',
            f'<div class="col-md-4 m-0">{ctx["tech_power"]["active"].label_tag()} {ctx["tech_power"]["active"].as_widget()}</div>',
            f'<div class="col-md-4 m-0">{ctx["tech_power"]["unit"].label_tag()} {ctx["tech_power"]["unit"].as_widget()}</div>',
            '</div>',
            
            '<div class="section-title mt-2"><i class="bx bx-ruler me-1"></i> Physical Specifications</div>',
            '<div class="row g-2">',
            # Dimensions - all in one compact row
            f'<div class="col-md-2 m-0">{ctx["tech_dims"]["length"].label_tag()} {ctx["tech_dims"]["length"].as_widget()}</div>',
            f'<div class="col-md-2 m-0">{ctx["tech_dims"]["width"].label_tag()} {ctx["tech_dims"]["width"].as_widget()}</div>',
            f'<div class="col-md-2 m-0">{ctx["tech_dims"]["height"].label_tag()} {ctx["tech_dims"]["height"].as_widget()}</div>',
            f'<div class="col-md-2 m-0">{ctx["tech_dims"]["unit"].label_tag()} {ctx["tech_dims"]["unit"].as_widget()}</div>',
            # Weight - compact next to dimensions
            f'<div class="col-md-2 m-0">{ctx["tech_w"]["value"].label_tag()} {ctx["tech_w"]["value"].as_widget()}</div>',
            f'<div class="col-md-2 m-0">{ctx["tech_w"]["unit"].label_tag()} {ctx["tech_w"]["unit"].as_widget()}</div>',
            '</div>',
            
            '<div class="section-title mt-2"><i class="bx bx-shield me-1"></i> Standards & Compliance</div>',
            '<div class="row g-2">',
            f'<div class="col-md-6 m-0">{ctx["tech"]["ipRating"].label_tag()} {ctx["tech"]["ipRating"].as_widget()}</div>',
            f'<div class="col-md-6 m-0">{ctx["tech"]["compliance"].label_tag()} {ctx["tech"]["compliance"].as_widget()}</div>',
            '</div>',
            
            '<div class="section-title mt-2"><i class="bx bx-chip me-1"></i> Additional Specifications</div>',
            '<div class="row g-2">',
            f'<div class="col-md-4 m-0">{ctx["tech_add"]["sensorType"].label_tag()} {ctx["tech_add"]["sensorType"].as_widget()}</div>',
            f'<div class="col-md-4 m-0">{ctx["tech_add"]["accuracy"].label_tag()} {ctx["tech_add"]["accuracy"].as_widget()}</div>',
            f'<div class="col-md-4 m-0">{ctx["tech_add"]["calibrationInterval"].label_tag()} {ctx["tech_add"]["calibrationInterval"].as_widget()}</div>',
            '</div>',
        ])

        step3_html = ''.join([
            '<div class="section-title mt-1"><i class="bx bx-detail me-1"></i> General Description & Media</div>',
            '<div class="row g-2">',
            # Description takes 7 columns, image upload takes 5 for better balance
            '<div class="col-md-7 m-0">',
            '<label for="description" class="form-label">Product Description</label>',
            '<textarea class="form-control form-control-sm" id="description" rows="9" placeholder="Detailed product description..."></textarea>',
            '</div>',
            
            '<div class="col-md-5 m-0">',
            '<label class="form-label">Product Image</label>',
            '<div class="file-drop-area">',
            '<div class="file-drop-area-content py-3 px-2 text-center border-2 rounded border-dashed" id="imgDropZone">',
            '<i class="bx bx-cloud-upload display-6 text-muted"></i>',
            '<p class="mb-1 small">PNG/JPG/WEBP · Max 5 MB</p>',
            '<button type="button" class="btn btn-primary btn-sm" id="browseImgBtn">',
            '<i class="bx bx-search-alt me-1"></i> Select Image</button>',
            '<input type="file" class="file-input" id="imageFile" accept=".png,.jpg,.jpeg,.webp" hidden>',
            '<div class="file-list mt-2" id="imageFileList"></div>',
            '</div></div>',
            '</div>',
            '</div>',

            '<div class="section-title mt-3"><i class="bx bx-file me-1"></i> Documentation</div>',
            '<div class="row g-2">',
            # Documentation fields - optimized column sizes
            f'<div class="col-md-6 m-0">{ctx["doc"]["instructionManual_url"].label_tag()} {ctx["doc"]["instructionManual_url"].as_widget()}</div>',
            f'<div class="col-md-3 m-0">{ctx["doc"]["instructionManual_version"].label_tag()} {ctx["doc"]["instructionManual_version"].as_widget()}</div>',
            f'<div class="col-md-3 m-0">{ctx["doc"]["warranty_durationMonths"].label_tag()} {ctx["doc"]["warranty_durationMonths"].as_widget()}</div>',
            f'<div class="col-md-12 m-0">{ctx["doc"]["warranty_termsUrl"].label_tag()} {ctx["doc"]["warranty_termsUrl"].as_widget()}</div>',
            '</div>',

            '<div class="row g-2 mt-2">',
            '<div class="col-12 m-0">',
            '<label class="form-label">Instruction Manual (PDF · Max 10 MB)</label>',
            '<div class="file-drop-area">',
            '<div class="file-drop-area-content py-3 px-2 text-center border-2 rounded border-dashed" id="dropZone">',
            '<i class="bx bx-cloud-upload display-6 text-muted"></i>',
            '<p class="mb-1 small">Drag and drop PDF file here</p>',
            '<button type="button" class="btn btn-primary btn-sm" id="browseFileBtn">',
            '<i class="bx bx-search-alt me-1"></i> Select PDF</button>',
            '<input type="file" class="file-input" id="manualFile" accept=".pdf" hidden>',
            '<div class="file-list mt-2" id="fileList"></div>',
            '</div></div>',
            '</div>',
            '</div>',
        ])

        sust_form = ctx['sust']
        step4_html = ''.join([
            '<div class="section-title mt-1"><i class="bx bx-recycle me-1"></i> Recycling Information</div>',
            '<div class="row g-2">',
            f'<div class="col-md-3 m-0"><div class="form-check mt-4">{sust_form["recycling_isRecyclable"].as_widget()} {sust_form["recycling_isRecyclable"].label_tag(attrs={"class": "form-check-label"})}</div></div>',
            f'<div class="col-md-3 m-0">{sust_form["recycling_recyclabilityPercentage"].label_tag()} {sust_form["recycling_recyclabilityPercentage"].as_widget()}</div>',
            f'<div class="col-md-6 m-0">{sust_form["recycling_recyclingInstructionsUrl"].label_tag()} {sust_form["recycling_recyclingInstructionsUrl"].as_widget()}</div>',
            '</div>',
            
            '<div class="section-title mt-2"><i class="bx bx-wrench me-1"></i> Disassembly Information</div>',
            '<div class="row g-2">',
            f'<div class="col-md-3 m-0">{sust_form["disassembly_timeRequiredMinutes"].label_tag()} {sust_form["disassembly_timeRequiredMinutes"].as_widget()}</div>',
            f'<div class="col-md-3 m-0">{sust_form["disassembly_difficultyRating"].label_tag()} {sust_form["disassembly_difficultyRating"].as_widget()}</div>',
            f'<div class="col-md-6 m-0">{sust_form["disassembly_instructionsUrl"].label_tag()} {sust_form["disassembly_instructionsUrl"].as_widget()}</div>',
            f'<div class="col-md-12 m-0">{sust_form["disassembly_toolRequirements"].label_tag()} {sust_form["disassembly_toolRequirements"].as_widget()}</div>',
            '</div>',
            
            '<div class="section-title mt-2"><i class="bx bx-trash me-1"></i> Disposal Information</div>',
            '<div class="row g-2">',
            f'<div class="col-md-3 m-0"><div class="form-check mt-4">{sust_form["disposal_hazardousComponentsPresent"].as_widget()} {sust_form["disposal_hazardousComponentsPresent"].label_tag(attrs={"class": "form-check-label"})}</div></div>',
            f'<div class="col-md-9 m-0">{sust_form["disposal_disposalInstructions"].label_tag()} {sust_form["disposal_disposalInstructions"].as_widget()}</div>',
            f'<div class="col-md-3 m-0"><div class="form-check mt-4">{sust_form["disposal_takeBackProgram_isAvailable"].as_widget()} {sust_form["disposal_takeBackProgram_isAvailable"].label_tag(attrs={"class": "form-check-label"})}</div></div>',
            f'<div class="col-md-9 m-0">{sust_form["disposal_takeBackProgram_programUrl"].label_tag()} {sust_form["disposal_takeBackProgram_programUrl"].as_widget()}</div>',
            '</div>',
            
            '<div class="section-title mt-2"><i class="bx bx-refresh me-1"></i> Reuse Potential</div>',
            '<div class="row g-2">',
            f'<div class="col-md-3 m-0"><div class="form-check mt-4">{sust_form["reuse_componentsReusable"].as_widget()} {sust_form["reuse_componentsReusable"].label_tag(attrs={"class": "form-check-label"})}</div></div>',
            f'<div class="col-md-9 m-0">{sust_form["reuse_refurbishmentPotential"].label_tag()} {sust_form["reuse_refurbishmentPotential"].as_widget()}</div>',
            '</div>',
        ])

        prod_form = ctx['prod']
        extra_prod_html = ''.join([
            '<div class="section-title mt-1"><i class="bx bxs-factory me-1"></i> Manufacturing Information</div>',
            '<div class="row g-2">',
            f'<div class="col-md-6 m-0">{prod_form["location"].label_tag()} {prod_form["location"].as_widget()}</div>',
            f'<div class="col-md-3 m-0">{prod_form["city"].label_tag()} {prod_form["city"].as_widget()}</div>',
            f'<div class="col-md-3 m-0">{prod_form["country"].label_tag()} {prod_form["country"].as_widget()}</div>',
            f'<div class="col-md-6 m-0">{prod_form["productionDate"].label_tag()} {prod_form["productionDate"].as_widget()}</div>',
            f'<div class="col-md-6 m-0">{prod_form["productionReport"].label_tag()} {prod_form["productionReport"].as_widget()}</div>',
            '</div>',
        ])

        tabs = {
            'step-1': step1_html,
            'step-2': step2_html,
            'step-3': step3_html,
            'step-4': step4_html,
            'extra-prod': extra_prod_html
        }
        return Response({'tabs': tabs})

    @action(detail=False, methods=['get'], url_path='form/common')
    def form_common(self, request):
        ctx = _build_common_forms_ctx()
        tabs = {
            'extra-prod': ''.join([
                '<div data-tab-title="Usage Data"></div>',
                '<div class="section-title mt-1"><i class="bx bx-spreadsheet me-1"></i> Usage Data</div>',
                render_form_rows(ctx["usage"], title=None, icon=None, cols=2),

                '<div class="section-title mt-3"><i class="bx bx-wrench me-1"></i> Maintenance History</div>',
                '<div id="maintenance-list" class="vstack gap-2"></div>',
                '<button type="button" id="btnAddMaint" class="btn btn-sm btn-outline-primary mt-1">',
                '<i class="bx bx-plus"></i> Adicionar manutenção</button>',
                
                '<div class="section-title mt-3"><i class="bx bx-cog me-1"></i> Repair History</div>',
                '<div id="repair-list" class="vstack gap-2"></div>',
                '<button type="button" id="btnAddRepair" class="btn btn-sm btn-outline-primary mt-1">',
                '<i class="bx bx-plus"></i> Adicionar reparo</button>',
            ]),
            'extra-eol': render_form_rows(ctx['eol'], title="End of Life", icon="bx bx-time-five", cols=3)
        }
        return Response({'tabs': tabs})



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


@login_required(login_url='/login/')
def product_details(request, product_id):
    product = Products.objects(id=product_id).first()
    if not product:
        return render(request, '404.html', status=404)

    uid = _get_current_user_id(request)
    profile = _get_profile(uid)
    if not uid or not profile or not _can_view(profile, uid, product):
        return render(request, '403.html', status=403)

    serializer = ProductsSerializer(product)
    data = serializer.data

    def _inject_usage_attachment_urls(req, prod, _data):
        usage = _data.get('usageData') or {}
        base = f"/products/api/products/{prod.id}/usage-attachment/"
        for item in (usage.get('maintenanceHistory') or []):
            for att in (item.get('attachments') or []):
                if att.get('attachmentId'):
                    att['url'] = req.build_absolute_uri(base + att['attachmentId'] + "/")
        for item in (usage.get('repairHistory') or []):
            for att in (item.get('attachments') or []):
                if att.get('attachmentId'):
                    att['url'] = req.build_absolute_uri(base + att['attachmentId'] + "/")

    _inject_usage_attachment_urls(request, product, data) 

    product_json = json.dumps(data, cls=DjangoJSONEncoder)

    context = TemplateLayout.init(request, {
        'product': data, 
        'product_json': product_json 
    })
    context['menu_items'] = get_menu_items(request)
    return render(request, 'productDetail.html', context)

def product_qrcode(request, product_id: str):
    path = _qr_disk_path(product_id)
    if not os.path.exists(path):
        try:
            target_url = _product_detail_abs_url(request, product_id)
            os.makedirs(QR_DIR, exist_ok=True)
            img = qrcode.make(target_url)
            img.save(path)
        except Exception:
            raise Http404("QR Code não encontrado")

    return FileResponse(open(path, "rb"), content_type="image/png")
