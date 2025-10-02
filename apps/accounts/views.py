# apps/accounts/views.py (páginas HTML)
from django.shortcuts import render, redirect
from django.views import View
from django.contrib import messages
from django.utils.translation import gettext as _
from django.contrib.auth import login as dj_login, logout as dj_logout
from django.contrib.auth.models import User as DjangoUser
from django.conf import settings
import re

from web_project import TemplateLayout
from apps.accounts.models import User
from apps.accounts.serializers import RegisterSerializer, LoginSerializer

RE_NIF  = re.compile(r"^\d{9}$")
RE_NISS = re.compile(r"^\d{11}$")

def _get_or_create_django_user_for_account(acc: User) -> DjangoUser:
    username = (acc.email or "").lower()
    dj_user, _ = DjangoUser.objects.get_or_create(
        username=username,
        defaults={
            "email": username,
            "first_name": (acc.full_name or "")[:150],
            "is_active": True,
            "is_staff": bool(acc.is_company),
            "is_superuser": bool(acc.is_superuser),
        },
    )
    changed = False
    if dj_user.email != username: dj_user.email = username; changed = True
    if dj_user.first_name != (acc.full_name or "")[:150]: dj_user.first_name = (acc.full_name or "")[:150]; changed = True
    if dj_user.is_staff != bool(acc.is_company): dj_user.is_staff = bool(acc.is_company); changed = True
    if dj_user.is_superuser != bool(acc.is_superuser): dj_user.is_superuser = bool(acc.is_superuser); changed = True
    if changed: dj_user.save()
    return dj_user

class LoginPage(View):
    template_name = "accounts/login.html"

    def get(self, request):
        ctx = TemplateLayout.init(request, {"layout_path": "layouts/base.html", "hide_chrome": True, "errors": {}})
        return render(request, self.template_name, ctx)

    def post(self, request):
        data = {"email": (request.POST.get("email") or "").strip(),
                "password": request.POST.get("password") or ""}
        s = LoginSerializer(data=data)
        errors = {}
        if not s.is_valid():
            if not data["email"]: errors["email"] = _("Informe o e-mail.")
            if not data["password"]: errors["password"] = _("Informe a palavra-passe.")
            ctx = TemplateLayout.init(request, {"layout_path": "layouts/base.html", "hide_chrome": True, **data, "errors": errors})
            return render(request, self.template_name, ctx, status=400)

        email = s.validated_data["email"].lower()
        pwd   = s.validated_data["password"]

        acc = User.objects(email=email, is_active=True).first()
        if not acc or not acc.check_password(pwd):
            ctx = TemplateLayout.init(request, {"layout_path": "layouts/base.html", "hide_chrome": True,
                                                "email": email,
                                                "errors": {"email": _("E-mail ou palavra-passe inválidos."),
                                                           "password": _("E-mail ou palavra-passe inválidos.")}})
            return render(request, self.template_name, ctx, status=401)

        dj_user = _get_or_create_django_user_for_account(acc)
        dj_login(request, dj_user, backend="django.contrib.auth.backends.ModelBackend")
        request.session["user_id"] = str(acc.id)

        nxt = request.GET.get("next") or getattr(settings, "LOGIN_REDIRECT_URL", "/products/")
        return redirect(nxt)

class RegisterPage(View):
    template_name = "accounts/register.html"

    def get(self, request):
        ctx = TemplateLayout.init(request, {"layout_path": "layouts/base.html", "hide_chrome": True, "errors": {}})
        return render(request, self.template_name, ctx)

    def post(self, request):
        full_name = (request.POST.get("full_name") or "").strip()
        email     = (request.POST.get("email") or "").strip()
        password  = (request.POST.get("password") or "").strip()
        address   = (request.POST.get("address") or "").strip()
        nif_raw   = (request.POST.get("nif") or "").strip()
        niss_raw  = (request.POST.get("niss") or "").strip()

        errors = {}
        if not full_name: errors["full_name"] = _("Informe o nome completo.")
        if not email:     errors["email"]     = _("Informe o e-mail.")
        if not password:  errors["password"]  = _("Informe a palavra-passe.")

        if not nif_raw and not niss_raw:
            errors["nif"]  = _("Informe NIF (utilizador) ou NISS (empresa).")
            errors["niss"] = _("Informe NIF (utilizador) ou NISS (empresa).")
        if nif_raw and niss_raw:
            errors["nif"]  = _("Use apenas um: NIF ou NISS.")
            errors["niss"] = _("Use apenas um: NIF ou NISS.")

        nif = niss = None
        is_company = False
        if nif_raw and not niss_raw:
            if not RE_NIF.match(nif_raw):
                errors["nif"] = _("NIF deve conter exatamente 9 dígitos.")
            else:
                nif = nif_raw
        if niss_raw and not nif_raw:
            if not RE_NISS.match(niss_raw):
                errors["niss"] = _("NISS deve conter exatamente 11 dígitos.")
            else:
                niss = niss_raw
                is_company = True

        payload = {
            "full_name": full_name,
            "email": email,
            "password": password,
            "address": address,
            "nif": nif,
            "niss": niss,
            "is_company": is_company,
        }

        s = RegisterSerializer(data=payload)
        # 1) erros de validação (inclui e-mail duplicado agora)
        if not s.is_valid() or errors:
            if hasattr(s, "errors"):
                # mescla os erros do serializer (p.ex., email duplicado)
                for f, arr in s.errors.items():
                    if arr:
                        errors[f] = arr[0]
            ctx = TemplateLayout.init(request, {"layout_path": "layouts/base.html", "hide_chrome": True})
            ctx.update({"errors": errors, **payload, "nif": nif_raw, "niss": niss_raw})
            return render(request, self.template_name, ctx, status=400)

        # 2) criação protegida (caso alguém ainda lance ValidationError no create)
        try:
            s.save()
        except serializers.ValidationError as exc:
            # transforma a exceção em erros de campo
            extra = {}
            if isinstance(exc.detail, dict):
                for k, v in exc.detail.items():
                    extra[k] = v[0] if isinstance(v, list) and v else str(v)
            else:
                extra["__all__"] = str(exc.detail)
            ctx = TemplateLayout.init(request, {"layout_path": "layouts/base.html", "hide_chrome": True})
            ctx.update({"errors": {**errors, **extra}, **payload, "nif": nif_raw, "niss": niss_raw})
            return render(request, self.template_name, ctx, status=400)

        # sucesso: não loga; manda para login
        messages.success(request, _("Conta criada! Faça login para continuar."))
        return redirect("/accounts/login/")


    def post(self, request):
        full_name = (request.POST.get("full_name") or "").strip()
        email     = (request.POST.get("email") or "").strip()
        password  = (request.POST.get("password") or "").strip()
        address   = (request.POST.get("address") or "").strip()
        nif_raw   = (request.POST.get("nif") or "").strip()
        niss_raw  = (request.POST.get("niss") or "").strip()

        errors = {}
        if not full_name: errors["full_name"] = _("Informe o nome completo.")
        if not email: errors["email"] = _("Informe o e-mail.")
        if not password: errors["password"] = _("Informe a palavra-passe.")

        if not nif_raw and not niss_raw:
            errors["nif"]  = _("Informe NIF (utilizador) ou NISS (empresa).")
            errors["niss"] = _("Informe NIF (utilizador) ou NISS (empresa).")
        if nif_raw and niss_raw:
            errors["nif"]  = _("Use apenas um: NIF ou NISS.")
            errors["niss"] = _("Use apenas um: NIF ou NISS.")

        nif = niss = None
        is_company = False
        if nif_raw and not niss_raw:
            if not RE_NIF.match(nif_raw): errors["nif"] = _("NIF deve conter exatamente 9 dígitos.")
            else: nif = nif_raw
        if niss_raw and not nif_raw:
            if not RE_NISS.match(niss_raw): errors["niss"] = _("NISS deve conter exatamente 11 dígitos.")
            else: niss = niss_raw; is_company = True

        payload = {"full_name": full_name, "email": email, "password": password,
                   "address": address, "nif": nif, "niss": niss, "is_company": is_company}

        s = RegisterSerializer(data=payload)
        if not s.is_valid() or errors:
            if hasattr(s, "errors"):
                for f, arr in s.errors.items():
                    if arr and f not in errors:
                        errors[f] = arr[0]
            ctx = TemplateLayout.init(request, {"layout_path": "layouts/base.html", "hide_chrome": True})
            ctx.update({"errors": errors, **payload, "nif": nif_raw, "niss": niss_raw})
            return render(request, self.template_name, ctx, status=400)

        s.save()
        messages.success(request, _("Conta criada! Faça login para continuar."))
        return redirect(getattr(settings, "LOGIN_URL", "/accounts/login/"))

class LogoutPage(View):
    def post(self, request):
        request.session.flush()
        dj_logout(request)
        return redirect(getattr(settings, "LOGIN_URL", "/accounts/login/"))

    def get(self, request):
        return self.post(request)
