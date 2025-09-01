# apps/products/serializers.py
from rest_framework import serializers
from apps.products.models import Products, Identification, TechnicalSpecifications, Documentation, Sustainability, ProductLifecycle

# --- Embedded serializers ---

class NestedDictField(serializers.DictField):
    def to_internal_value(self, data):
        return data or {}

class ProductCategorySerializer(serializers.Serializer):
    primary = serializers.CharField(required=False, allow_null=True)
    secondary = serializers.CharField(required=False, allow_null=True)
    tertiary = serializers.CharField(required=False, allow_null=True)


class IdentificationSerializer(serializers.Serializer):
    brandName = serializers.CharField(required=True)
    modelName = serializers.CharField(required=True)
    sku = serializers.CharField(required=False, allow_null=True)
    upc = serializers.CharField(required=False, allow_null=True)
    serialNumberPattern = serializers.CharField(required=False, allow_null=True)
    isActive = serializers.BooleanField(required=False)
    productCategory = ProductCategorySerializer(required=False, allow_null=True)


class OperatingRangeSerializer(serializers.Serializer):
    min = serializers.FloatField(required=False, allow_null=True)
    max = serializers.FloatField(required=False, allow_null=True)
    unit = serializers.CharField(required=False, allow_null=True)


class PowerConsumptionSerializer(serializers.Serializer):
    standby = serializers.FloatField(required=False, allow_null=True)
    active = serializers.FloatField(required=False, allow_null=True)
    unit = serializers.CharField(required=False, allow_null=True)


class DimensionsSerializer(serializers.Serializer):
    length = serializers.FloatField(required=False, allow_null=True)
    width = serializers.FloatField(required=False, allow_null=True)
    height = serializers.FloatField(required=False, allow_null=True)
    unit = serializers.CharField(required=False, allow_null=True)


class WeightSerializer(serializers.Serializer):
    value = serializers.FloatField(required=False, allow_null=True)
    unit = serializers.CharField(required=False, allow_null=True)


class AdditionalSpecsSerializer(serializers.Serializer):
    sensorType = serializers.CharField(required=False, allow_null=True)
    accuracy = serializers.CharField(required=False, allow_null=True)
    calibrationInterval = serializers.IntegerField(required=False, allow_null=True)


class TechnicalSpecificationsSerializer(serializers.Serializer):
    operatingVoltage = OperatingRangeSerializer(required=False, allow_null=True)
    operatingTemperature = OperatingRangeSerializer(required=False, allow_null=True)
    powerConsumption = PowerConsumptionSerializer(required=False, allow_null=True)
    dimensions = DimensionsSerializer(required=False, allow_null=True)
    weight = WeightSerializer(required=False, allow_null=True)
    ipRating = serializers.CharField(required=False, allow_null=True)
    compliance = serializers.ListField(child=serializers.CharField(), required=False, allow_null=True)
    additionalSpecs = AdditionalSpecsSerializer(required=False, allow_null=True)

# --- Sustainability ---

class InstructionManualSerializer(serializers.Serializer):
    url = serializers.URLField(required=False, allow_null=True)
    version = serializers.CharField(required=False, allow_null=True)

class WarrantySerializer(serializers.Serializer):
    durationMonths = serializers.IntegerField(required=False, allow_null=True)
    termsUrl = serializers.URLField(required=False, allow_null=True)

class DocumentationSerializer(serializers.Serializer):
    instructionManual = InstructionManualSerializer(required=False, allow_null=True)
    warranty = WarrantySerializer(required=False, allow_null=True)


class RecyclingSerializer(serializers.Serializer):
    isRecyclable = serializers.BooleanField(required=False)
    recyclabilityPercentage = serializers.FloatField(required=False, allow_null=True)
    recyclingInstructionsUrl = serializers.URLField(required=False, allow_null=True)


class DisassemblySerializer(serializers.Serializer):
    timeRequiredMinutes = serializers.IntegerField(required=False, allow_null=True)
    toolRequirements = serializers.ListField(child=serializers.CharField(), required=False, allow_null=True)
    instructionsUrl = serializers.URLField(required=False, allow_null=True)
    difficultyRating = serializers.IntegerField(required=False, allow_null=True)


class TakeBackProgramSerializer(serializers.Serializer):
    isAvailable = serializers.BooleanField(required=False)
    programUrl = serializers.URLField(required=False, allow_null=True)


class DisposalSerializer(serializers.Serializer):
    hazardousComponentsPresent = serializers.BooleanField(required=False)
    disposalInstructions = serializers.CharField(required=False, allow_null=True)
    takeBackProgram = TakeBackProgramSerializer(required=False, allow_null=True)


class ReuseSerializer(serializers.Serializer):
    componentsReusable = serializers.ListField(child=serializers.CharField(), required=False, allow_null=True)
    refurbishmentPotential = serializers.BooleanField(required=False)


class SustainabilitySerializer(serializers.Serializer):
    recycling = RecyclingSerializer(required=False, allow_null=True)
    disassembly = DisassemblySerializer(required=False, allow_null=True)
    disposal = DisposalSerializer(required=False, allow_null=True)
    reuse = ReuseSerializer(required=False, allow_null=True)


# --- Produto principal ---

class ProductsSerializer(serializers.Serializer):
    identification = serializers.DictField()
    technicalSpecifications = serializers.DictField(required=False)
    documentation = serializers.DictField(required=False)
    sustainability = serializers.DictField(required=False)
    productLifecycle = serializers.DictField(required=False)
    description = serializers.CharField(allow_blank=True, required=False, allow_null=True)
    imageUrl = serializers.URLField(allow_blank=True, required=False, allow_null=True)

    def create(self, validated_data):
        return Products(
            identification=Identification(**validated_data['identification']),
            technicalSpecifications=TechnicalSpecifications(**validated_data.get('technicalSpecifications', {})),
            documentation=Documentation(**validated_data.get('documentation', {})),
            sustainability=Sustainability(**validated_data.get('sustainability', {})),
            productLifecycle=ProductLifecycle(**validated_data.get('productLifecycle', {})),
            description=validated_data.get('description'),
            imageUrl=validated_data.get('imageUrl')
        ).save()