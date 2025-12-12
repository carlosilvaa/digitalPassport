from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProductsViews, product_details, ProductsViewSet, passport_public

router = DefaultRouter()
router.register(r'api/products', ProductsViewSet, basename='products')

urlpatterns = [
    path('', ProductsViews.as_view(template_name='products.html'), name='products'),
    path('products/<str:product_id>/', product_details, name='product_details'),
    path('passport/<str:product_id>/', passport_public, name='passport_public'),
    
] + router.urls
