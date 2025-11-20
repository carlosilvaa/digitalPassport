from django.urls import path
from .views import LoginPage, RegisterPage, LogoutPage

urlpatterns = [
    path("login/",    LoginPage.as_view(),    name="accounts_login"),
    path("register/", RegisterPage.as_view(), name="accounts_register"),
    path("logout/",   LogoutPage.as_view(),   name="accounts_logout"),
]
