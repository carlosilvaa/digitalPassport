# apps/home/staticfiles.py
from django.templatetags.static import static as django_static

def home_static(path):
    return django_static(f'home/{path}')