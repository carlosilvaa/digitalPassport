# filepath: d:\FACULDADE\Projeto\dev\digitalPassport\apps\products\urls.py
from django.urls import path
from .views import ProductsViews, product_details

urlpatterns = [
    path('',
         ProductsViews.as_view(template_name='products.html'),
         name='products'
    ),
    path('product-details/<str:product_id>/', product_details, name='product-details'),
]