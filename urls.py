from django.urls import path, include

urlpatterns = [
    path('home/', include('apps.home.urls')),
    path('products/', include('apps.products.urls')),  # Inclua as URLs do app products
]