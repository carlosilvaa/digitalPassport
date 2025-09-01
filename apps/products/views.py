from django.shortcuts import render
from django.views.generic import TemplateView
from web_project import TemplateLayout
from apps.utils.menu_utils import get_menu_items
from rest_framework import viewsets, status
from apps.products.serializers import ProductsSerializer
from rest_framework.response import Response
from apps.products.models import Products
from django.shortcuts import get_object_or_404
from django.core.files.storage import default_storage
from django.http import JsonResponse
import json
from rest_framework.decorators import action
from django.http import FileResponse, HttpResponseBadRequest, Http404
import os, mimetypes
from uuid import uuid4
from django.utils.text import slugify

def clean_empty_strings(data):
    for key, value in data.items():
        if isinstance(value, dict):
            clean_empty_strings(value)
        elif isinstance(value, str) and value.strip() == "":
            data[key] = None

MAX_PDF_MB = 10
MAX_IMG_MB = 5
ALLOWED_IMG_MIME = {"image/png", "image/jpeg", "image/webp"}

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


class ProductsViewSet(viewsets.ViewSet):
    serializer_class = ProductsSerializer

    def list(self, request):
        try:
            produtos = Products.objects.filter(identification__isActive=True)
            serializer = self.serializer_class(produtos, many=True)
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
            json_data = json.loads(request.data.get('json', '{}'))
            clean_empty_strings(json_data)
            serializer = self.serializer_class(data=json_data)
            if not serializer.is_valid():
                return Response({"success": False, "errors": serializer.errors},
                                status=status.HTTP_400_BAD_REQUEST)

            product = serializer.save()

            # --- manual (PDF)
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

            # --- imagem
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
            serializer = self.serializer_class(product)
            data = serializer.data

            # injeta URLs e nomes dos ficheiros (para preencher modal)
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
            json_data = json.loads(request.data.get('json', '{}'))
            clean_empty_strings(json_data)

            serializer = self.serializer_class(product, data=json_data, partial=True)
            if not serializer.is_valid():
                return Response({"success": False, "errors": serializer.errors},
                                status=status.HTTP_400_BAD_REQUEST)

            updated_product = serializer.save()

            # --- remoções explícitas
            if _truthy(request.data.get('removeManual')) and updated_product.manualFile:
                updated_product.manualFile.delete()
                updated_product.manualFile = None

            if _truthy(request.data.get('removeImage')) and updated_product.imageFile:
                updated_product.imageFile.delete()
                updated_product.imageFile = None
                updated_product.imageUrl = None  # evita card mostrar imagem antiga

            # --- upload/replace manual
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

            # --- upload/replace imagem
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

class ProductsViews(TemplateView):
    def get_context_data(self, **kwargs):
        context = TemplateLayout.init(self, super().get_context_data(**kwargs))
        context['menu_items'] = get_menu_items(self.request)
        return context


def product_details(request, product_id):
    product = Products.objects(id=product_id).first()
    if not product:
        return render(request, '404.html', status=404)

    product_data = product.to_mongo()
    context = TemplateLayout.init(request, {'product': product_data})
    context['menu_items'] = get_menu_items(request)
    return render(request, 'productDetail.html', context)
