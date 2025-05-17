from django.shortcuts import render
from django.views.generic import TemplateView
from web_project import TemplateLayout
from apps.utils.menu_utils import get_menu_items  # Importa o utilitário do menu


class ProductsViews(TemplateView):
    def get_context_data(self, **kwargs):
        context = TemplateLayout.init(self, super().get_context_data(**kwargs))

        # Popula os itens do menu usando o utilitário
        context['menu_items'] = get_menu_items(self.request)

        return context

MOCK_PRODUCTS = {
    "conv000": {
        "id": "conv000",
        "brandName": "Modular Conveyor",
        "modelName": "Transfer System DPP",
        "sku": "MCT-DPP-001",
        "upc": "100000000001",
        "productCategory": "Sistemas de Transporte",
        "isActive": True,
        "description": "Sistema modular de transporte com passaporte digital integrado",
        "price": 125000.00,
        "stock": 3,
        "imageUrl": "https://victoriamelo.github.io/Modular_Conveyor_Transfer_System_DPP/Conveyor_system.jpg",
        "createdAt": "2023-05-10",
        "features": [
            "Modularidade completa",
            "Rastreabilidade digital",
            "Sistema de transferência automatizado",
            "Integração com IoT"
        ],
        "dppUrl": "https://victoriamelo.github.io/Modular_Conveyor_Transfer_System_DPP/"
    },
    "conv001": {
        "id": "conv001",
        "brandName": "Digital Conveyor",
        "modelName": "Passport System 1",
        "sku": "DCP-PS1-002",
        "upc": "100000000002",
        "productCategory": "Sistemas de Transporte",
        "isActive": True,
        "description": "Esteira transportadora com tecnologia de passaporte digital de primeira geração",
        "price": 98000.00,
        "stock": 5,
        "imageUrl": "https://victoriamelo.github.io/Digital-Product-Passport-Conveyor1/Conv1_qrcode.jpg",
        "createdAt": "2023-06-15",
        "features": [
            "Estrutura robusta",
            "Sensores integrados",
            "Painel de controle digital"
        ],
        "dppUrl": "https://victoriamelo.github.io/Digital-Product-Passport-Conveyor1/"
    },
    "conv002": {
        "id": "conv002",
        "brandName": "Digital Conveyor",
        "modelName": "Passport System 2",
        "sku": "DCP-PS2-003",
        "upc": "100000000003",
        "productCategory": "Sistemas de Transporte",
        "isActive": True,
        "description": "Segunda geração de esteira com passaporte digital avançado",
        "price": 115000.00,
        "stock": 2,
        "imageUrl": "https://victoriamelo.github.io/Digital-Product-Passport-Conveyor2/Conv2_qrcode.jpg",
        "createdAt": "2023-07-20",
        "features": [
            "Estrutura robusta",
            "Sensores integrados",
            "Painel de controle digital"
        ],
        "dppUrl": "https://victoriamelo.github.io/Digital-Product-Passport-Conveyor2/"
    },
    "conv003": {
        "id": "conv003",
        "brandName": "Digital Conveyor",
        "modelName": "Passport System 3",
        "sku": "DCP-PS3-004",
        "upc": "100000000004",
        "productCategory": "Sistemas de Transporte",
        "isActive": True,
        "description": "Terceira geração com tecnologia de passaporte digital e análise preditiva",
        "price": 135000.00,
        "stock": 4,
        "imageUrl": "https://victoriamelo.github.io/Digital-Product-Passport-Conveyor3/Conv3_qrcode.jpg",
        "createdAt": "2023-08-25",
        "features": [
            "Estrutura robusta",
            "Sensores integrados",
            "Painel de controle digital"
        ],
        "dppUrl": "https://victoriamelo.github.io/Digital-Product-Passport-Conveyor3/"
    },
    "conv004": {
        "id": "conv004",
        "brandName": "Digital Conveyor",
        "modelName": "Passport System 4",
        "sku": "DCP-PS4-005",
        "upc": "100000000005",
        "productCategory": "Sistemas de Transporte",
        "isActive": True,
        "description": "Quarta geração com passaporte digital e inteligência artificial",
        "price": 155000.00,
        "stock": 1,
        "imageUrl": "https://victoriamelo.github.io/Digital-Product-Passport-Conveyor4/Conv4_qrcode.jpg",
        "createdAt": "2023-09-30",
        "features": [
            "Estrutura robusta",
            "Sensores integrados",
            "Painel de controle digital"
        ],
        "dppUrl": "https://victoriamelo.github.io/Digital-Product-Passport-Conveyor4/"
    }
}

def product_details(request, product_id):
    product = MOCK_PRODUCTS.get(product_id)
    if not product:
        return render(request, '404.html', status=404)

    # Chama TemplateLayout.init manualmente
    context = TemplateLayout.init(request, {'product': product})
    context['menu_items'] = get_menu_items(request)
    return render(request, 'productDetail.html', context)