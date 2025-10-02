# apps/accounts/models.py
import datetime
from mongoengine import Document, StringField, EmailField, BooleanField, DateTimeField
from django.contrib.auth.hashers import make_password, check_password

def now_utc():
    return datetime.datetime.now(datetime.timezone.utc)

class User(Document):
    meta = {
        "collection": "accounts",
        'indexes': [
            {'fields': ['email'], 'unique': True},
            {'fields': ['nif'], 'unique': True, 'sparse': True},
            {'fields': ['niss'], 'unique': True, 'sparse': True},
        ],
        "strict": False
    }

    full_name   = StringField(required=True)
    email       = EmailField(required=True, unique=True)
    password    = StringField(required=True)  # hashed
    address     = StringField()

    nif         = StringField(unique=True, sparse=True)
    niss        = StringField(unique=True, sparse=True)

    is_company  = BooleanField(default=False)
    is_superuser= BooleanField(default=False)
    is_active   = BooleanField(default=True)

    created_at  = DateTimeField(default=now_utc)
    updated_at  = DateTimeField(default=now_utc)

    def set_password(self, raw_password: str):
        self.password = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password(raw_password, self.password)

    def touch(self):
        self.updated_at = now_utc()
