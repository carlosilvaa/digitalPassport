from django import forms
from django.contrib.auth.models import User  # Django nativo
from django.contrib.auth.password_validation import validate_password

from apps.passport.models import Account, Roles

class SignUpForm(forms.Form):
    ROLE_CHOICES = (
        (Roles.USER, "Utilizador (Portador)"),
        (Roles.COMPANY, "Empresa (Criadora)"),
    )
    role       = forms.ChoiceField(choices=ROLE_CHOICES)
    full_name  = forms.CharField(max_length=200)
    email      = forms.EmailField()
    password   = forms.CharField(widget=forms.PasswordInput, strip=False)
    address    = forms.CharField(required=False)
    nif        = forms.CharField(required=False)   # se role == USER
    niss       = forms.CharField(required=False)   # se role == COMPANY

    def clean(self):
        data = super().clean()
        role = data.get("role")
        if role == Roles.USER and not data.get("nif"):
            self.add_error("nif", "NIF é obrigatório para utilizador (portador).")
        if role == Roles.COMPANY and not data.get("niss"):
            self.add_error("niss", "NISS é obrigatório para empresa.")
        validate_password(data.get("password"))
        return data

    def save(self):
        data = self.cleaned_data
        if User.objects.filter(username=data["email"]).exists():
            raise forms.ValidationError("Já existe um utilizador com este e-mail.")

        dj_user = User.objects.create_user(
            username=data["email"],
            email=data["email"],
            password=data["password"],
            first_name=data["full_name"][:150]
        )

        acc = Account(
            user_id=str(dj_user.id),
            role=data["role"],
            full_name=data["full_name"],
            email=data["email"],
            address=data.get("address") or "",
            nif=data.get("nif") or None,
            niss=data.get("niss") or None,
        )
        acc.save()
        return dj_user
