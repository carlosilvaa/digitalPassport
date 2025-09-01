from mongoengine import connect
from apps.products.models import Products, Identification, ProductCategory, TechnicalSpecifications, OperatingRange, PowerConsumption, Dimensions, Weight, AdditionalSpecs

connect(db="digitalPassport", host="localhost", port=27017)

MOCK_PRODUCT = {
    "id": "eco001",
    "identification": Identification(
        brandName="EcoTech",
        modelName="EnvSensor-X2000",
        sku="ET-ES-X2000-BLK",
        upc="123456789012",
        productCategory=ProductCategory(
            primary="Eletrônicos",
            secondary="Dispositivos IoT",
            tertiary="Sensores Ambientais"
        ),
        serialNumberPattern="ESX2###-YYWW",
        isActive=True
    ),
    "technicalSpecifications": TechnicalSpecifications(
        operatingVoltage=OperatingRange(min=3.3, max=5.0, unit="V"),
        operatingTemperature=OperatingRange(min=-20, max=60, unit="°C"),
        powerConsumption=PowerConsumption(standby=0.5, active=2.1, unit="W"),
        dimensions=Dimensions(length=50, width=30, height=10, unit="mm"),
        weight=Weight(value=120, unit="g"),
        ipRating="IP67",
        compliance=["CE", "FCC", "RoHS"],
        additionalSpecs=AdditionalSpecs(
            sensorType="Multiespectral",
            accuracy="±2%",
            calibrationInterval=365
        )
    )
}

# Inserir no banco, se ainda não existir
if not Products.objects(id=MOCK_PRODUCT["id"]).first():
    produto = Products(**MOCK_PRODUCT)
    produto.save()
    print(f'Produto {produto.id} inserido com sucesso!')
else:
    print(f'Produto {MOCK_PRODUCT["id"]} já existe.')
