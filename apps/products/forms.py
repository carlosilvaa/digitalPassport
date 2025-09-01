# apps/products/forms.py
from django import forms

class ProductCategoryForm(forms.Form):
    primary = forms.CharField(required=False, label="Categoria Primária", widget=forms.TextInput(attrs={'class': 'form-control'}))
    secondary = forms.CharField(required=False, label="Categoria Secundária", widget=forms.TextInput(attrs={'class': 'form-control'}))
    tertiary = forms.CharField(required=False, label="Categoria Terciária", widget=forms.TextInput(attrs={'class': 'form-control'}))


class IdentificationForm(forms.Form):
    brandName = forms.CharField(required=True, label="Marca", widget=forms.TextInput(attrs={'class': 'form-control'}))
    modelName = forms.CharField(required=True, label="Modelo", widget=forms.TextInput(attrs={'class': 'form-control'}))
    sku = forms.CharField(required=False, label="SKU", widget=forms.TextInput(attrs={'class': 'form-control'}))
    upc = forms.CharField(required=False, label="UPC", widget=forms.TextInput(attrs={'class': 'form-control'}))
    serialNumberPattern = forms.CharField(required=False, label="Padrão de Série", widget=forms.TextInput(attrs={'class': 'form-control'}))
    isActive = forms.BooleanField(required=False, label="Ativo", initial=True, widget=forms.CheckboxInput(attrs={'class': 'form-check-input'}))
    productCategory = ProductCategoryForm()


class OperatingRangeForm(forms.Form):
    min = forms.FloatField(required=False, label="Mínimo", widget=forms.NumberInput(attrs={'class': 'form-control'}))
    max = forms.FloatField(required=False, label="Máximo", widget=forms.NumberInput(attrs={'class': 'form-control'}))
    unit = forms.CharField(required=False, label="Unidade", widget=forms.TextInput(attrs={'class': 'form-control'}))


class PowerConsumptionForm(forms.Form):
    standby = forms.FloatField(required=False, label="Consumo em Standby", widget=forms.NumberInput(attrs={'class': 'form-control'}))
    active = forms.FloatField(required=False, label="Consumo Ativo", widget=forms.NumberInput(attrs={'class': 'form-control'}))
    unit = forms.CharField(required=False, label="Unidade", widget=forms.TextInput(attrs={'class': 'form-control'}))


class DimensionsForm(forms.Form):
    length = forms.FloatField(required=False, label="Comprimento", widget=forms.NumberInput(attrs={'class': 'form-control'}))
    width = forms.FloatField(required=False, label="Largura", widget=forms.NumberInput(attrs={'class': 'form-control'}))
    height = forms.FloatField(required=False, label="Altura", widget=forms.NumberInput(attrs={'class': 'form-control'}))
    unit = forms.CharField(required=False, label="Unidade", widget=forms.TextInput(attrs={'class': 'form-control'}))


class WeightForm(forms.Form):
    value = forms.FloatField(required=False, label="Peso", widget=forms.NumberInput(attrs={'class': 'form-control'}))
    unit = forms.CharField(required=False, label="Unidade", widget=forms.TextInput(attrs={'class': 'form-control'}))


class AdditionalSpecsForm(forms.Form):
    sensorType = forms.CharField(required=False, label="Tipo de Sensor", widget=forms.TextInput(attrs={'class': 'form-control'}))
    accuracy = forms.CharField(required=False, label="Precisão", widget=forms.TextInput(attrs={'class': 'form-control'}))
    calibrationInterval = forms.IntegerField(required=False, label="Intervalo de Calibração (dias)", widget=forms.NumberInput(attrs={'class': 'form-control'}))


class TechnicalSpecificationsForm(forms.Form):
    operatingVoltage = OperatingRangeForm()
    operatingTemperature = OperatingRangeForm()
    powerConsumption = PowerConsumptionForm()
    dimensions = DimensionsForm()
    weight = WeightForm()
    ipRating = forms.CharField(required=False, label="IP Rating", widget=forms.TextInput(attrs={'class': 'form-control'}))
    compliance = forms.CharField(required=False, label="Normas (separadas por vírgula)", widget=forms.TextInput(attrs={'class': 'form-control'}))
    additionalSpecs = AdditionalSpecsForm()


class DocumentationForm(forms.Form):
    instructionManual_url = forms.URLField(required=False, label="Manual de Instruções (URL)", widget=forms.URLInput(attrs={'class': 'form-control'}))
    instructionManual_version = forms.CharField(required=False, label="Versão do Manual", widget=forms.TextInput(attrs={'class': 'form-control'}))
    warranty_durationMonths = forms.IntegerField(required=False, label="Garantia (meses)", widget=forms.NumberInput(attrs={'class': 'form-control'}))
    warranty_termsUrl = forms.URLField(required=False, label="Termos da Garantia", widget=forms.URLInput(attrs={'class': 'form-control'}))


class RecyclingForm(forms.Form):
    isRecyclable = forms.BooleanField(required=False, label="Reciclável?", widget=forms.CheckboxInput())
    recyclabilityPercentage = forms.FloatField(required=False, label="Reciclabilidade (%)", widget=forms.NumberInput(attrs={'class': 'form-control'}))
    recyclingInstructionsUrl = forms.URLField(required=False, label="Instruções de Reciclagem (URL)", widget=forms.URLInput(attrs={'class': 'form-control'}))


class DisassemblyForm(forms.Form):
    timeRequiredMinutes = forms.IntegerField(required=False, label="Tempo de Desmontagem (min)", widget=forms.NumberInput(attrs={'class': 'form-control'}))
    toolRequirements = forms.CharField(required=False, label="Ferramentas", widget=forms.TextInput(attrs={'class': 'form-control'}))
    instructionsUrl = forms.URLField(required=False, label="Instruções de Desmontagem (URL)", widget=forms.URLInput(attrs={'class': 'form-control'}))
    difficultyRating = forms.IntegerField(required=False, label="Dificuldade (1 a 5)", widget=forms.NumberInput(attrs={'class': 'form-control'}))


class DisposalForm(forms.Form):
    hazardousComponentsPresent = forms.BooleanField(required=False, label="Componentes Perigosos?", widget=forms.CheckboxInput())
    disposalInstructions = forms.CharField(required=False, label="Instruções de Descarte", widget=forms.Textarea(attrs={'class': 'form-control'}))
    takeBackProgram_isAvailable = forms.BooleanField(required=False, label="Programa de Retorno Disponível?", widget=forms.CheckboxInput())
    takeBackProgram_programUrl = forms.URLField(required=False, label="URL do Programa", widget=forms.URLInput(attrs={'class': 'form-control'}))


class ReuseForm(forms.Form):
    componentsReusable = forms.CharField(required=False, label="Componentes Reutilizáveis", widget=forms.TextInput(attrs={'class': 'form-control'}))
    refurbishmentPotential = forms.BooleanField(required=False, label="Pode ser Recondicionado?", widget=forms.CheckboxInput())


class SustainabilityForm(forms.Form):
    recycling = RecyclingForm()
    disassembly = DisassemblyForm()
    disposal = DisposalForm()
    reuse = ReuseForm()


class ProductsForm(forms.Form):
    description = forms.CharField(required=False, widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 2}), label="Descrição")
    stock = forms.IntegerField(required=True, min_value=0, widget=forms.NumberInput(attrs={'class': 'form-control'}), label="Estoque")
    imageUrl = forms.URLField(required=False, widget=forms.URLInput(attrs={'class': 'form-control'}), label="URL da Imagem")
