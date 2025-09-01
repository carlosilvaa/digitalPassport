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

def clean_empty_strings(data):
    for key, value in data.items():
        if isinstance(value, dict):
            clean_empty_strings(value)
        elif isinstance(value, str) and value.strip() == "":
            data[key] = None


class ProductsViewSet(viewsets.ViewSet):
    serializer_class = ProductsSerializer

    def list(self, request):
        try:
            produtos = Products.objects.filter(isActive=True)
            if not produtos:
                return Response({
                    "success": True,
                    "data": [],
                    "message": "Nenhum produto encontrado"
                }, status=status.HTTP_200_OK)

            serializer = self.serializer_class(produtos, many=True)
            return Response({
                "success": True,
                "data": serializer.data
            }, status=status.HTTP_200_OK)

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
            if serializer.is_valid():
                product = serializer.save()

                if 'manualFile' in request.FILES:
                    file = request.FILES['manualFile']
                    product.manualFile.put(file, filename=file.name)
                    product.save()

                return Response({
                    "success": True,
                    "id": str(product.id),
                    "message": "Produto criado com sucesso"
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    "success": False,
                    "errors": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

        except json.JSONDecodeError as e:
            return Response({
                "success": False,
                "error": "Erro ao processar JSON",
                "details": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


    def retrieve(self, request, pk=None):
        try:
            product = Products.objects.get(id=pk)
            serializer = self.serializer_class(product)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Products.DoesNotExist:
            return Response({
                "success": False,
                "error": "Produto não encontrado"
            }, status=status.HTTP_404_NOT_FOUND)

    def update(self, request, pk=None):

        try:
            product = Products.objects.get(id=pk)
            json_data = json.loads(request.data.get('json', '{}'))
            clean_empty_strings(json_data)
            serializer = self.serializer_class(product, data=json_data, partial=True)
            if serializer.is_valid():
                updated_product = serializer.save()

                # Atualizar o PDF, se fornecido
                if 'manualFile' in request.FILES:
                    file = request.FILES['manualFile']
                    updated_product.manualFile.replace(file, filename=file.name)
                    updated_product.save()

                return Response({
                    "success": True,
                    "id": str(updated_product.id),
                    "message": "Produto atualizado com sucesso"
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "success": False,
                    "errors": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

        except Products.DoesNotExist:
            return Response({
                "success": False,
                "error": "Produto não encontrado"
            }, status=status.HTTP_404_NOT_FOUND)

        except json.JSONDecodeError as e:
            return Response({
                "success": False,
                "error": "Erro ao processar JSON",
                "details": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


    def destroy(self, request, pk=None):
        try:
            product = Products.objects.get(id=pk)
            product.identification.isActive = False
            product.save()
            return Response({
                "success": True,
                "message": "Produto desativado com sucesso"
            }, status=status.HTTP_200_OK)
        except Products.DoesNotExist:
            return Response({
                "success": False,
                "error": "Produto não encontrado"
            }, status=status.HTTP_404_NOT_FOUND)


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
