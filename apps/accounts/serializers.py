# apps/accounts/serializers.py
from rest_framework import serializers
from apps.accounts.models import User
from mongoengine.errors import NotUniqueError

class UserSerializer(serializers.Serializer):
    id          = serializers.CharField(read_only=True)
    full_name   = serializers.CharField()
    email       = serializers.EmailField()
    address     = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    nif         = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    niss        = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    is_company  = serializers.BooleanField()
    is_superuser= serializers.BooleanField()
    is_active   = serializers.BooleanField()

class RegisterSerializer(serializers.Serializer):
    full_name   = serializers.CharField()
    email       = serializers.EmailField()
    password    = serializers.CharField(write_only=True)
    address     = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    nif         = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    niss        = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    is_company  = serializers.BooleanField(required=False, default=False)

    def validate_email(self, value):
        value = (value or "").strip().lower()
        if User.objects(email=value).first():
            raise serializers.ValidationError("Já existe um utilizador com este e-mail.")
        return value

    def validate(self, attrs):
        data = dict(attrs)

        email = (data.get("email") or "").strip().lower()
        nif   = (data.get("nif")   or "").strip()
        niss  = (data.get("niss")  or "").strip()

        if nif:
            if User.objects(nif=nif).first():
                raise serializers.ValidationError({"nif": "Já existe um utilizador com este NIF."})
            data["nif"] = nif
        else:
            data["nif"] = None 

        if niss:
            if User.objects(niss=niss).first():
                raise serializers.ValidationError({"niss": "Já existe um utilizador com este NISS."})
            data["niss"] = niss
        else:
            data["niss"] = None

        data["email"] = email
        return data

    def create(self, validated_data):
        pwd = validated_data.pop("password")
        validated_data["email"] = (validated_data.get("email") or "").strip().lower()
        if not (validated_data.get("nif") or "").strip():
            validated_data["nif"] = None
        if not (validated_data.get("niss") or "").strip():
            validated_data["niss"] = None

        u = User(**validated_data)
        u.set_password(pwd)
        u.is_active = True
        try:
            u.save()
        except NotUniqueError as e:
            msg = str(e)
            if "email" in msg:
                raise serializers.ValidationError({"email": "Já existe um utilizador com este e-mail."})
            if "nif" in msg:
                raise serializers.ValidationError({"nif": "Já existe um utilizador com este NIF."})
            if "niss" in msg:
                raise serializers.ValidationError({"niss": "Já existe um utilizador com este NISS."})
            raise
        return u


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)
