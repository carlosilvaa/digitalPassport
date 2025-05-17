from django.urls import path
from .views import HomeViews



urlpatterns = [
    path(
        "",
        HomeViews.as_view(template_name="home.html"),
        name="index",
    )
]
