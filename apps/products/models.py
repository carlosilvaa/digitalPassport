# apps/products/models.py
from mongoengine import (
    DynamicDocument, EmbeddedDocument, EmbeddedDocumentField, StringField, BooleanField,
    FloatField, IntField, ListField, URLField, DateField, FileField, DateTimeField
)
from datetime import datetime

class ProductCategory(EmbeddedDocument):
    primary = StringField(null=True)
    secondary = StringField(null=True)
    tertiary = StringField(null=True)

class Identification(EmbeddedDocument):
    brandName = StringField(required=True)
    modelName = StringField(required=True)
    sku = StringField(null=True)
    upc = StringField(null=True)
    productCategory = EmbeddedDocumentField(ProductCategory, null=True)
    serialNumberPattern = StringField(null=True)
    isActive = BooleanField(default=True)

class OperatingRange(EmbeddedDocument):
    min = FloatField(null=True)
    max = FloatField(null=True)
    unit = StringField(null=True)

class PowerConsumption(EmbeddedDocument):
    standby = FloatField(null=True)
    active = FloatField(null=True)
    unit = StringField(null=True)

class Dimensions(EmbeddedDocument):
    length = FloatField(null=True)
    width = FloatField(null=True)
    height = FloatField(null=True)
    unit = StringField(null=True)

class Weight(EmbeddedDocument):
    value = FloatField(null=True)
    unit = StringField(null=True)

class AdditionalSpecs(EmbeddedDocument):
    sensorType = StringField(null=True)
    accuracy = StringField(null=True)
    calibrationInterval = IntField(null=True)

class TechnicalSpecifications(EmbeddedDocument):
    operatingVoltage = EmbeddedDocumentField(OperatingRange, null=True)
    operatingTemperature = EmbeddedDocumentField(OperatingRange, null=True)
    powerConsumption = EmbeddedDocumentField(PowerConsumption, null=True)
    dimensions = EmbeddedDocumentField(Dimensions, null=True)
    weight = EmbeddedDocumentField(Weight, null=True)
    ipRating = StringField(null=True)
    compliance = ListField(StringField(), null=True)
    additionalSpecs = EmbeddedDocumentField(AdditionalSpecs, null=True)

class InstructionManual(EmbeddedDocument):
    url = URLField(null=True)
    version = StringField(null=True)

class Warranty(EmbeddedDocument):
    durationMonths = IntField(null=True)
    termsUrl = URLField(null=True)

class Documentation(EmbeddedDocument):
    instructionManual = EmbeddedDocumentField(InstructionManual, null=True)
    warranty = EmbeddedDocumentField(Warranty, null=True)

class Recycling(EmbeddedDocument):
    isRecyclable = BooleanField(null=True)
    recyclabilityPercentage = FloatField(null=True)
    recyclingInstructionsUrl = URLField(null=True)

class Disassembly(EmbeddedDocument):
    timeRequiredMinutes = IntField(null=True)
    toolRequirements = ListField(StringField(), null=True)
    instructionsUrl = URLField(null=True)
    difficultyRating = IntField(null=True)

class TakeBackProgram(EmbeddedDocument):
    isAvailable = BooleanField(null=True)
    programUrl = URLField(null=True)

class Disposal(EmbeddedDocument):
    hazardousComponentsPresent = BooleanField(null=True)
    disposalInstructions = StringField(null=True)
    takeBackProgram = EmbeddedDocumentField(TakeBackProgram, null=True)

class Reuse(EmbeddedDocument):
    componentsReusable = ListField(StringField(), null=True)
    refurbishmentPotential = BooleanField(null=True)

class Sustainability(EmbeddedDocument):
    recycling = EmbeddedDocumentField(Recycling, null=True)
    disassembly = EmbeddedDocumentField(Disassembly, null=True)
    disposal = EmbeddedDocumentField(Disposal, null=True)
    reuse = EmbeddedDocumentField(Reuse, null=True)

class ProductLifecycle(EmbeddedDocument):
    estimatedLifetimeHours = IntField(null=True)
    recommendedMaintenanceIntervalDays = IntField(null=True)
    endOfLifeDate = DateField(null=True)

class Products(DynamicDocument):
    identification = EmbeddedDocumentField(Identification, required=True)
    technicalSpecifications = EmbeddedDocumentField(TechnicalSpecifications, null=True)
    documentation = EmbeddedDocumentField(Documentation, null=True)
    sustainability = EmbeddedDocumentField(Sustainability, null=True)
    productLifecycle = EmbeddedDocumentField(ProductLifecycle, null=True)
    manualFile = FileField(null=True)
    imageFile = FileField(null=True)
    description = StringField(null=True)
    imageUrl = URLField(null=True)
    createdAt = DateTimeField(default=datetime.utcnow)
    meta = {'collection': 'products'}
