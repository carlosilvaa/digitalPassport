# apps/products/serializers.py
from rest_framework import serializers
from apps.products.models import *
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


class ProductLifecycleSerializer(serializers.Serializer):
    estimatedLifetimeHours = serializers.IntegerField(required=False, allow_null=True)
    recommendedMaintenanceIntervalDays = serializers.IntegerField(required=False, allow_null=True)
    endOfLifeDate = serializers.DateField(required=False, allow_null=True)
    
class ManufacturingDetailsSerializer(serializers.Serializer):
    location = serializers.CharField(required=False, allow_null=True)
    city = serializers.CharField(required=False, allow_null=True)
    country = serializers.CharField(required=False, allow_null=True)
    productionDate = serializers.DateField(required=False, allow_null=True)
    productionReport = serializers.URLField(required=False, allow_null=True)

class ProductionDataSerializer(serializers.Serializer):
    manufacturing = ManufacturingDetailsSerializer(required=False, allow_null=True)

class OperationalSnapshotSerializer(serializers.Serializer):
    conveyorCount = serializers.IntegerField(required=False, allow_null=True)
    positionInSequence = serializers.IntegerField(required=False, allow_null=True)
    numberOfPieces = serializers.IntegerField(required=False, allow_null=True)
    lastPieceTime = serializers.FloatField(required=False, allow_null=True)
    motorOperatingTime = serializers.FloatField(required=False, allow_null=True)
    motorStatus = serializers.CharField(required=False, allow_null=True)
    inputSensorStatus = serializers.CharField(required=False, allow_null=True)
    outputSensorStatus = serializers.CharField(required=False, allow_null=True)
    vibration = serializers.FloatField(required=False, allow_null=True)
    current = serializers.FloatField(required=False, allow_null=True)
    batteryLevel = serializers.FloatField(required=False, allow_null=True)
    updateDate = serializers.DateTimeField(required=False, allow_null=True)

class OperationalDataSerializer(serializers.Serializer):
    last = OperationalSnapshotSerializer(required=False, allow_null=True)
    history = serializers.ListField(child=OperationalSnapshotSerializer(), required=False, allow_null=True)

class UsageAttachmentSerializer(serializers.Serializer):
    attachmentId = serializers.CharField(read_only=True)
    filename = serializers.CharField(read_only=True)
    contentType = serializers.CharField(read_only=True)
    size = serializers.IntegerField(read_only=True)
    uploadedAt = serializers.DateTimeField(read_only=True)
    url = serializers.CharField(read_only=True)  # view preenche no retrieve

class MaintenanceItemSerializer(serializers.Serializer):
    date = serializers.DateField(required=False, allow_null=True)
    type = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    technician = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    cost = serializers.FloatField(required=False, allow_null=True)
    attachments = UsageAttachmentSerializer(many=True, required=False, read_only=True)

class RepairItemSerializer(serializers.Serializer):
    date = serializers.DateField(required=False, allow_null=True)
    component = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    vendor = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    cost = serializers.FloatField(required=False, allow_null=True)
    underWarranty = serializers.BooleanField(required=False)
    attachments = UsageAttachmentSerializer(many=True, required=False, read_only=True)

class UsageDataSerializer(serializers.Serializer):
    environment = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    usageFrequency = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    averageUsagePerDay = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    lastUsedAt = serializers.DateField(required=False, allow_null=True)
    condition = serializers.ChoiceField(required=False, allow_null=True,
        choices=[("new","new"),("good","good"),("worn","worn"),("damaged","damaged"),("not_working","not_working")])
    notes = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    maintenanceHistory = MaintenanceItemSerializer(many=True, required=False, allow_null=True)
    repairHistory = RepairItemSerializer(many=True, required=False, allow_null=True)

class ProductsSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    _id = serializers.SerializerMethodField(read_only=True)

    identification = IdentificationSerializer()
    technicalSpecifications = TechnicalSpecificationsSerializer(required=False, allow_null=True)
    documentation = DocumentationSerializer(required=False, allow_null=True)
    sustainability = SustainabilitySerializer(required=False, allow_null=True)
    productLifecycle = ProductLifecycleSerializer(required=False, allow_null=True)

    description = serializers.CharField(allow_blank=True, required=False, allow_null=True)
    imageUrl = serializers.URLField(allow_blank=True, required=False, allow_null=True)
    qr_code = serializers.URLField(allow_blank=True, required=False, allow_null=True)
    createdAt = serializers.DateTimeField(read_only=True)
    
    productionData = ProductionDataSerializer(required=False, allow_null=True)
    operationalData = OperationalDataSerializer(required=False, allow_null=True)
    usageData = UsageDataSerializer(required=False, allow_null=True)

    updatedAt = serializers.DateTimeField(read_only=True)
    createdById   = serializers.CharField(read_only=True)
    updatedById   = serializers.CharField(read_only=True)
    ownerUserId   = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    companyUserId = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    
    def get__id(self, obj):
        return {"$oid": str(obj.id)}

    def _build_embed(self, cls, data):
        return None if data is None else cls(**data)

    def create(self, validated_data):
        return Products(
            identification=self._build_embed(Identification, validated_data['identification']),
            technicalSpecifications=self._build_embed(TechnicalSpecifications, validated_data.get('technicalSpecifications')),
            documentation=self._build_embed(Documentation, validated_data.get('documentation')),
            sustainability=self._build_embed(Sustainability, validated_data.get('sustainability')),
            productLifecycle=self._build_embed(ProductLifecycle, validated_data.get('productLifecycle')),
            productionData=self._build_embed(ProductionData, validated_data.get('productionData')),
            usageData=self._build_embed(UsageData, validated_data.get('usageData')),
            description=validated_data.get('description'),
            imageUrl=validated_data.get('imageUrl')
        ).save()

    def update(self, instance, validated_data):
        mapping = {
            'identification': Identification,
            'technicalSpecifications': TechnicalSpecifications,
            'documentation': Documentation,
            'sustainability': Sustainability,
            'productLifecycle': ProductLifecycle,
            'productionData': ProductionData,
            'usageData': UsageData,   # <— NOVO
        }
        for key, cls in mapping.items():
            if key in validated_data:
                setattr(instance, key, self._build_embed(cls, validated_data.get(key)))

        instance.description = validated_data.get('description', instance.description)
        instance.imageUrl = validated_data.get('imageUrl', instance.imageUrl)
        instance.save()
        return instance