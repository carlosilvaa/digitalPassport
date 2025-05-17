def get_menu_items(request):
    """
    Retorna os itens do menu com base no request.
    """
    menu_items = [
        {
            'name': 'Home',
            'icon': 'bx bx-home-smile',
            'url': 'index',
            'is_active': request.resolver_match.url_name == 'index' or '/home/' in request.path,
            'children': []
        },
        {
            'name': 'Products',
            'icon': 'bx bx-package',
            'url': 'products',
            'is_active': request.resolver_match.url_name == 'products' or '/products/' in request.path,
            'children': []
        },
    ]

    # Retorna os itens do menu com as condições de ativação já avaliadas
    return menu_items