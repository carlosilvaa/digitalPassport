def get_menu_items(request):
    """
    Retorna os itens do menu com base no request.
    Agora a página de produtos é a página principal.
    """
    menu_items = [
        {
            'name': 'Products',
            'icon': 'bx bx-package',
            'url': 'products',
            'is_active': request.resolver_match.url_name == 'products' or '/products/' in request.path,
            'children': []
        },
    ]

    return menu_items
