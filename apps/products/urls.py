from django.urls import path
from .views import ProductsViews, product_details
from rest_framework.routers import DefaultRouter
from .views import ProductsViewSet

router = DefaultRouter()
router.register(r'api/products', ProductsViewSet, basename='products')

urlpatterns = [
    path('', ProductsViews.as_view(template_name='products.html'), name='products'),
    path('products/<str:product_id>/', product_details, name='product_details'),
    
] + router.urls
