let selectedFile = null;
let currentId = null;
let stepper = null;
let uploadedPDF = null;

function fetchProducts(callback) {
  $.ajax({
    url: '/products/api/products/',
    type: 'GET',
    dataType: 'json',
    headers: {
      'X-CSRFToken': getCookie('csrftoken'),
      Accept: 'application/json'
    },
    success: function (response) {
      console.log("🚀 ~ fetchProducts ~ response:", response)
      if (response.success) {
        
        if (callback) callback(response.data);
      } else {
        showBootstrapAlert('danger', 'Erro', response.error || 'Erro ao carregar produtos');
        if (callback) callback([]);
      }
    },
    error: function (xhr) {
      console.error('Erro ao buscar produtos:', xhr);
      showBootstrapAlert('danger', 'Erro', 'Falha ao carregar produtos');
      if (callback) callback([]);
    }
  });
}

function fetchProductById(id, callback) {
  $.ajax({
    url: `/products/api/products/${id}/`,
    type: 'GET',
    dataType: 'json',
    headers: {
      'X-CSRFToken': getCookie('csrftoken')
    },
    success: function (response) {
      if (callback) callback(response);
    },
    error: function (xhr) {
      console.error('Erro ao buscar produto:', xhr);
      showBootstrapAlert('danger', 'Erro', 'Produto não encontrado');
      if (callback) callback(null);
    }
  });
}

function createProduct(data, callback) {
  $.ajax({
    url: '/products/api/products/',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(data),
    headers: {
      'X-CSRFToken': getCookie('csrftoken')
    },
    success: function (response) {
      if (response.success) {
        showBootstrapAlert('success', 'Sucesso', 'Produto criado com sucesso!', 5000);
        if (callback) callback(response);
      } else {
        showBootstrapAlert('danger', 'Erro', response.error || 'Erro ao processar solicitação.');
      }
    },
    error: function (xhr) {
      const errors = xhr.responseJSON?.errors || xhr.responseJSON;
      const message = errors?.detail || 'Erro ao criar produto';
      showBootstrapAlert('danger', 'Erro', message);
    }
  });
}

function updateProduct(id, data, callback) {
  $.ajax({
    url: `/products/api/products/${id}/`,
    type: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify(data),
    headers: {
      'X-CSRFToken': getCookie('csrftoken')
    },
    success: function (response) {
      if (response.success) {
        showBootstrapAlert('success', 'Sucesso', 'Produto atualizado com sucesso!', 5000);
        if (callback) callback(response);
      } else {
        showBootstrapAlert('danger', 'Erro', response.error || 'Erro ao processar solicitação.');
      }
    },
    error: function (xhr) {
      const errors = xhr.responseJSON?.errors || xhr.responseJSON;
      const message = errors?.detail || 'Erro ao atualizar produto';
      showBootstrapAlert('danger', 'Erro', message);
    }
  });
}

function deleteProduct(id, callback) {
  $.ajax({
    url: `/products/api/products/${id}/`,
    type: 'DELETE',
    headers: {
      'X-CSRFToken': getCookie('csrftoken')
    },
    success: function (response) {
      if (response.success) {
        showBootstrapAlert('success', 'Sucesso', 'Produto excluído com sucesso!', 5000);
        if (callback) callback(response);
      } else {
        showBootstrapAlert('danger', 'Erro', response.error || 'Erro ao processar solicitação.');
      }
    },
    error: function (xhr) {
      const errors = xhr.responseJSON?.errors || xhr.responseJSON;
      const message = errors?.detail || 'Erro ao excluir produto';
      showBootstrapAlert('danger', 'Erro', message);
    }
  });
}

function loadProductsGrid() {
  const $grid = $('#products-grid').empty();
  $grid.append(
    '<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>'
  );

  fetchProducts(function (products) {
    $grid.empty();

    if (!products.length) {
      $grid.append('<div class="col-12 text-center">Nenhum produto cadastrado</div>');
      return;
    }

    products.forEach(p => $grid.append(cardHtml(p)));
  });
}

function cardHtml(product) {
  const id = product._id?.$oid || product._id || product.id || '---';
  const brand = product.identification?.brandName || '---';
  const model = product.identification?.modelName || '---';
  const active = product.identification?.isActive === false ? false : true;
  const image = product.imageUrl || 'https://via.placeholder.com/600x400?text=Sem+Imagem';
  const desc = product.description || 'Sem descrição';
  const category = product.identification?.productCategory?.primary || '---';

  const statusClass = active ? 'bg-success' : 'bg-secondary';

  return `
    <div class="col-md-6 col-lg-4 mb-4 d-flex">
      <div class="card product-card w-100 border-0 shadow-sm overflow-hidden d-flex flex-column">
        <span class="position-absolute top-0 start-0 m-2 badge ${statusClass}">
          ${active ? 'Ativo' : 'Inativo'}
        </span>
        <div class="product-image-container position-relative overflow-hidden flex-grow-0">
          <img src="${image}" class="card-img-top product-image" alt="${brand} ${model}" loading="lazy">
          <div class="image-overlay d-flex align-items-center justify-content-center">
            <button class="btn btn-outline-light btn-sm details-btn" data-id="${id}">
              <i class="bx bx-zoom-in me-1"></i> Ver detalhes
            </button>
          </div>
        </div>
        <div class="card-body d-flex flex-column">
          <div class="product-category mb-2">
            <span class="badge bg-primary bg-opacity-25 text-white">${category}</span>
          </div>
          <h5 class="card-title mb-0">${brand} ${model}</h5>
          <p class="card-text text-muted small mb-3">${desc}</p>
          <div class="d-flex justify-content-between align-items-center border-top pt-3 mt-3">
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-primary px-3 edit-product-btn" data-id="${id}" title="Editar">
                <i class="bx bx-edit"></i>
              </button>
              <button class="btn btn-outline-danger px-3 delete-product-btn" data-id="${id}" title="Excluir">
                <i class="bx bx-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}


function fillForm(data) {
  // Identificação
  $('#identification_brandName').val(data.identification?.brandName || '');
  $('#identification_modelName').val(data.identification?.modelName || '');
  $('#identification_sku').val(data.identification?.sku || '');
  $('#identification_upc').val(data.identification?.upc || '');
  $('#identification_serialNumberPattern').val(data.identification?.serialNumberPattern || '');

  // Categoria do Produto
  $('#identification_productCategory_primary').val(data.identification?.productCategory?.primary || '');
  $('#identification_productCategory_secondary').val(data.identification?.productCategory?.secondary || '');
  $('#identification_productCategory_tertiary').val(data.identification?.productCategory?.tertiary || '');

  // Especificações Técnicas
  const specs = data.technicalSpecifications || {};

  // Tensão de Operação
  $('#technicalSpecifications_operatingVoltage_min').val(specs.operatingVoltage?.min || '');
  $('#technicalSpecifications_operatingVoltage_max').val(specs.operatingVoltage?.max || '');
  $('#technicalSpecifications_operatingVoltage_unit').val(specs.operatingVoltage?.unit || 'V');

  // Temperatura de Operação
  $('#technicalSpecifications_operatingTemperature_min').val(specs.operatingTemperature?.min || '');
  $('#technicalSpecifications_operatingTemperature_max').val(specs.operatingTemperature?.max || '');
  $('#technicalSpecifications_operatingTemperature_unit').val(specs.operatingTemperature?.unit || '°C');

  // Consumo de Energia
  $('#technicalSpecifications_powerConsumption_standby').val(specs.powerConsumption?.standby || '');
  $('#technicalSpecifications_powerConsumption_active').val(specs.powerConsumption?.active || '');
  $('#technicalSpecifications_powerConsumption_unit').val(specs.powerConsumption?.unit || 'W');

  // Dimensões
  $('#technicalSpecifications_dimensions_length').val(specs.dimensions?.length || '');
  $('#technicalSpecifications_dimensions_width').val(specs.dimensions?.width || '');
  $('#technicalSpecifications_dimensions_height').val(specs.dimensions?.height || '');
  $('#technicalSpecifications_dimensions_unit').val(specs.dimensions?.unit || 'mm');

  // Peso
  $('#technicalSpecifications_weight_value').val(specs.weight?.value || '');
  $('#technicalSpecifications_weight_unit').val(specs.weight?.unit || 'g');

  // Outras especificações
  $('#technicalSpecifications_ipRating').val(specs.ipRating || '');
  $('#technicalSpecifications_compliance').val(specs.compliance?.join(', ') || '');

  // Especificações Adicionais
  $('#technicalSpecifications_additionalSpecs_sensorType').val(specs.additionalSpecs?.sensorType || '');
  $('#technicalSpecifications_additionalSpecs_accuracy').val(specs.additionalSpecs?.accuracy || '');
  $('#technicalSpecifications_additionalSpecs_calibrationInterval').val(
    specs.additionalSpecs?.calibrationInterval || ''
  );

  // Detalhes
  $('#description').val(data.description || '');
  $('#stock').val(data.stock || 0);
  $('#imageUrl').val(data.imageUrl || '');

  // Novo bloco: DOCUMENTAÇÃO
  $('#documentation_instructionManual_url').val(data.documentation?.instructionManual?.url || '');
  $('#documentation_instructionManual_version').val(data.documentation?.instructionManual?.version || '');
  $('#documentation_warranty_durationMonths').val(data.documentation?.warranty?.durationMonths || '');
  $('#documentation_warranty_termsUrl').val(data.documentation?.warranty?.termsUrl || '');

  // SUSTENTABILIDADE — RECYCLING
  $('#sustainability_recycling_isRecyclable').prop('checked', data.sustainability?.recycling?.isRecyclable || false);
  $('#sustainability_recycling_recyclabilityPercentage').val(data.sustainability?.recycling?.recyclabilityPercentage || '');
  $('#sustainability_recycling_recyclingInstructions').val(data.sustainability?.recycling?.recyclingInstructionsUrl || '');

  // SUSTENTABILIDADE — DISASSEMBLY
  $('#sustainability_disassembly_timeRequiredMinutes').val(data.sustainability?.disassembly?.timeRequiredMinutes || '');
  $('#sustainability_disassembly_difficultyRating').val(data.sustainability?.disassembly?.difficultyRating || '');
  $('#sustainability_disassembly_instructions').val(data.sustainability?.disassembly?.instructionsUrl || '');
  $('#sustainability_disassembly_toolRequirements').val((data.sustainability?.disassembly?.toolRequirements || []).join(', '));

  // SUSTENTABILIDADE — DISPOSAL
  $('#sustainability_disposal_hazardousComponentsPresent').prop('checked', data.sustainability?.disposal?.hazardousComponentsPresent || false);
  $('#sustainability_disposal_disposalInstructions').val(data.sustainability?.disposal?.disposalInstructions || '');
  $('#sustainability_disposal_takeBackProgram_isAvailable').prop('checked', data.sustainability?.disposal?.takeBackProgram?.isAvailable || false);
  $('#sustainability_disposal_takeBackProgram_programUrl').val(data.sustainability?.disposal?.takeBackProgram?.programUrl || '');

  // SUSTENTABILIDADE — REUSE
  $('#sustainability_reuse_componentsReusable').val((data.sustainability?.reuse?.componentsReusable || []).join(', '));
  $('#sustainability_reuse_refurbishmentPotential').prop('checked', data.sustainability?.reuse?.refurbishmentPotential || false);

  // SUSTENTABILIDADE — PRODUCT LIFECYCLE
  $('#productLifecycle_estimatedLifetimeHours').val(data.productLifecycle?.estimatedLifetimeHours || '');
  $('#productLifecycle_recommendedMaintenanceIntervalDays').val(data.productLifecycle?.recommendedMaintenanceIntervalDays || '');
  $('#productLifecycle_endOfLifeDate').val(data.productLifecycle?.endOfLifeDate || '');

}

function validateForm() {
  let isValid = true;

  // Validar campos obrigatórios
  const requiredFields = ['#identification_brandName', '#identification_modelName'];

  requiredFields.forEach(selector => {
    const $field = $(selector);
    if (!$field.val().trim()) {
      $field.addClass('is-invalid');
      isValid = false;
    } else {
      $field.removeClass('is-invalid');
    }
  });

  return isValid;
}

function openModal(id = null) {
  $('#product-form').trigger('reset');
  currentId = id;

  if (stepper) {
    stepper.destroy();
  }

  stepper = new Stepper($('#product-stepper')[0], {
    linear: false,
    animation: true
  });

  const steps = [
    { id: 'step-1', title: 'Identificação', icon: 'bx bx-id-card' },
    { id: 'step-2', title: 'Especificações', icon: 'bx bx-cog' },
    { id: 'step-3', title: 'Detalhes', icon: 'bx bx-detail' },
    { id: 'step-4', title: 'Sustentabilidade', icon: 'bx bx-recycle' }
  ];

  
  const $stepperHeader = $('#stepper-header').empty();
  steps.forEach((step, index) => {
    $stepperHeader.append(`
      <div class="step" data-target="#${step.id}">
        <button type="button" class="step-trigger p-1">
          <span class="bs-stepper-circle"><i class="${step.icon}"></i></span>
          <span class="bs-stepper-label d-none d-sm-inline">${step.title}</span>
        </button>
      </div>
      ${index < steps.length - 1 ? '<div class="line"></div>' : ''}
    `);
  });

  const $stepperContent = $('#stepper-content').empty();

  // Etapa 1 - Identificação (mais compacta)
  $stepperContent.append(`
    <div id="step-1" class="content">
      <div class="row g-2">
        <div class="col-12 m-0">
          <div class="section-title mt-1"><i class="bx bx-id-card me-1"></i> Identificação do Produto</div>
        </div>
        <div class="col-md-6 m-0">
          <label for="identification_brandName" class="form-label">Marca*</label>
          <input type="text" class="form-control form-control-sm" id="identification_brandName" required>
        </div>
        <div class="col-md-6 m-0">
          <label for="identification_modelName" class="form-label">Modelo*</label>
          <input type="text" class="form-control form-control-sm" id="identification_modelName" required>
        </div>
        <div class="col-md-4 m-0">
          <label for="identification_sku" class="form-label">SKU</label>
          <input type="text" class="form-control form-control-sm" id="identification_sku">
        </div>
        <div class="col-md-4 m-0">
          <label for="identification_upc" class="form-label">UPC</label>
          <input type="text" class="form-control form-control-sm" id="identification_upc">
        </div>
        <div class="col-md-4 m-0">
          <label for="identification_serialNumberPattern" class="form-label">Padrão Série</label>
          <input type="text" class="form-control form-control-sm" id="identification_serialNumberPattern">
        </div>
        <div class="col-md-4 m-0">
          <label for="identification_productCategory_primary" class="form-label">Categoria Principal</label>
          <input type="text" class="form-control form-control-sm" id="identification_productCategory_primary">
        </div>
        <div class="col-md-4 m-0">
          <label for="identification_productCategory_secondary" class="form-label">Subcategoria</label>
          <input type="text" class="form-control form-control-sm" id="identification_productCategory_secondary">
        </div>
        <div class="col-md-4 m-0">
          <label for="identification_productCategory_tertiary" class="form-label">Sub-subcategoria</label>
          <input type="text" class="form-control form-control-sm" id="identification_productCategory_tertiary">
        </div>
      </div>
    </div>
  `);

  // Etapa 2 - Especificações Técnicas (com seções destacadas)
  $stepperContent.append(`
    <div id="step-2" class="content">
      <div class="row g-2">
        <div class="col-12 m-0"> 
          <div class="section-title mt-1"><i class="bx bxs-bolt me-1"></i> Tensão de Operação</div>
          <div class="row g-2">
            <div class="col-md-4 m-0">
              <label for="technicalSpecifications_operatingVoltage_min" class="form-label">Mínimo (V)</label>
              <input type="number" step="0.01" class="form-control form-control-sm" id="technicalSpecifications_operatingVoltage_min">
            </div>
            <div class="col-md-4 m-0">
              <label for="technicalSpecifications_operatingVoltage_max" class="form-label">Máximo (V)</label>
              <input type="number" step="0.01" class="form-control form-control-sm" id="technicalSpecifications_operatingVoltage_max">
            </div>
            <div class="col-md-4 m-0">
              <label for="technicalSpecifications_operatingVoltage_unit" class="form-label">Unidade</label>
              <input type="text" class="form-control form-control-sm" id="technicalSpecifications_operatingVoltage_unit" value="V">
            </div>
          </div>
        </div>
        
        <div class="col-12 m-0"> 
          <div class="section-title mt-1"><i class="bx bxs-thermometer me-1"></i> Temperatura de Operação</div>
          <div class="row g-2">
            <div class="col-md-4 m-0">
              <label for="technicalSpecifications_operatingTemperature_min" class="form-label">Mínimo (°C)</label>
              <input type="number" step="0.01" class="form-control form-control-sm" id="technicalSpecifications_operatingTemperature_min">
            </div>
            <div class="col-md-4 m-0">
              <label for="technicalSpecifications_operatingTemperature_max" class="form-label">Máximo (°C)</label>
              <input type="number" step="0.01" class="form-control form-control-sm" id="technicalSpecifications_operatingTemperature_max">
            </div>
            <div class="col-md-4 m-0">
              <label for="technicalSpecifications_operatingTemperature_unit" class="form-label">Unidade</label>
              <input type="text" class="form-control form-control-sm" id="technicalSpecifications_operatingTemperature_unit" value="°C">
            </div>
          </div>
        </div>
        
        <div class="col-12 m-0">  
          <div class="section-title mt-1"><i class="bx bx-battery me-1"></i> Consumo de Energia</div>
          <div class="row g-2">
            <div class="col-md-4 m-0">
              <label for="technicalSpecifications_powerConsumption_standby" class="form-label">Standby (W)</label>
              <input type="number" step="0.01" class="form-control form-control-sm" id="technicalSpecifications_powerConsumption_standby">
            </div>
            <div class="col-md-4 m-0">
              <label for="technicalSpecifications_powerConsumption_active" class="form-label">Ativo (W)</label>
              <input type="number" step="0.01" class="form-control form-control-sm" id="technicalSpecifications_powerConsumption_active">
            </div>
            <div class="col-md-4 m-0">
              <label for="technicalSpecifications_powerConsumption_unit" class="form-label">Unidade</label>
              <input type="text" class="form-control form-control-sm" id="technicalSpecifications_powerConsumption_unit" value="W">
            </div>
          </div>
        </div>
        
        <div class="col-12 m-0"> 
          <div class="section-title mt-1"><i class="bx bx-ruler me-1"></i> Dimensões</div>
          <div class="row g-2">
            <div class="col-md-3 m-0">
              <label for="technicalSpecifications_dimensions_length" class="form-label">Comprimento</label>
              <input type="number" step="0.01" class="form-control form-control-sm" id="technicalSpecifications_dimensions_length">
            </div>
            <div class="col-md-3 m-0">
              <label for="technicalSpecifications_dimensions_width" class="form-label">Largura</label>
              <input type="number" step="0.01" class="form-control form-control-sm" id="technicalSpecifications_dimensions_width">
            </div>
            <div class="col-md-3 m-0">
              <label for="technicalSpecifications_dimensions_height" class="form-label">Altura</label>
              <input type="number" step="0.01" class="form-control form-control-sm" id="technicalSpecifications_dimensions_height">
            </div>
            <div class="col-md-3 m-0">
              <label for="technicalSpecifications_dimensions_unit" class="form-label">Unidade</label>
              <input type="text" class="form-control form-control-sm" id="technicalSpecifications_dimensions_unit" value="mm">
            </div>
          </div>
        </div>
        
        <div class="col-12 m-0"> 
          <div class="section-title mt-1"><i class="bx bx-dumbbell me-1"></i> Peso</div>
          <div class="row g-2">
            <div class="col-md-6 m-0">
              <label for="technicalSpecifications_weight_value" class="form-label">Valor</label>
              <input type="number" step="0.01" class="form-control form-control-sm" id="technicalSpecifications_weight_value">
            </div>
            <div class="col-md-6 m-0">
              <label for="technicalSpecifications_weight_unit" class="form-label">Unidade</label>
              <input type="text" class="form-control form-control-sm" id="technicalSpecifications_weight_unit" value="g">
            </div>
          </div>
        </div>
        
        <div class="col-md-6 m-0">
          <div class="section-title mt-1"><i class="bx bx-shield me-1"></i> Classificação IP</div>
          <input type="text" class="form-control form-control-sm" id="technicalSpecifications_ipRating">
        </div>
        <div class="col-md-6 m-0">
          <div class="section-title mt-1"><i class="bx bx-certification me-1"></i> Normas de Conformidade</div>
          <input type="text" class="form-control form-control-sm" id="technicalSpecifications_compliance" placeholder="Separadas por vírgula">
        </div>
        
        <div class="col-12 m-0"> 
          <div class="section-title mt-1"><i class="bx bx-chip me-1"></i> Especificações Adicionais</div>
          <div class="row g-2">
            <div class="col-md-4 m-0">
              <label for="technicalSpecifications_additionalSpecs_sensorType" class="form-label">Tipo de Sensor</label>
              <input type="text" class="form-control form-control-sm" id="technicalSpecifications_additionalSpecs_sensorType">
            </div>
            <div class="col-md-4 m-0">
              <label for="technicalSpecifications_additionalSpecs_accuracy" class="form-label">Precisão</label>
              <input type="text" class="form-control form-control-sm" id="technicalSpecifications_additionalSpecs_accuracy">
            </div>
            <div class="col-md-4 m-0">
              <label for="technicalSpecifications_additionalSpecs_calibrationInterval" class="form-label">Intervalo de Calibração (dias)</label>
              <input type="number" class="form-control form-control-sm" id="technicalSpecifications_additionalSpecs_calibrationInterval">
            </div>
          </div>
        </div>
      </div>
    </div>
  `);

  // Etapa 3 - Detalhes (mais compacta)
  $stepperContent.append(`
    <div id="step-3" class="content">
      <div class="row g-2">
        <div class="col-12">
          <div class="section-title mt-1"><i class="bx bx-detail me-1"></i> Descrição Geral</div>
        </div>
        <div class="col-md-6">
          <label for="description" class="form-label">Descrição</label>
          <textarea class="form-control form-control-sm" id="description" rows="2"></textarea>
        </div>
        <div class="col-md-6">
          <label for="imageUrl" class="form-label">URL da Imagem</label>
          <input type="url" class="form-control form-control-sm" id="imageUrl">
        </div>
      </div>
    </div>
  `);

  // Etapa 4 - Sustentabilidade + Vida Útil do Produto
  $stepperContent.append(`
    <div id="step-4" class="content">
      <div class="row g-2">

        <div class="col-12 m-0">
          <div class="section-title mt-1"><i class="bx bx-recycle me-1"></i> Reciclagem</div>
        </div>
        <div class="col-md-12 m-0">
          <div class="form-check mt-4">
            <input class="form-check-input" type="checkbox" id="sustainability_recycling_isRecyclable">
            <label class="form-check-label" for="sustainability_recycling_isRecyclable">
              É reciclável?
            </label>
          </div>
        </div>

        <div class="col-md-6 m-0">
          <label for="sustainability_recycling_recyclabilityPercentage" class="form-label">Reciclabilidade (%)</label>
          <input type="number" step="0.01" class="form-control form-control-sm" id="sustainability_recycling_recyclabilityPercentage">
        </div>
        <div class="col-6 m-0">
          <label for="sustainability_recycling_recyclingInstructions" class="form-label">Instruções de Reciclagem</label>
          <textarea class="form-control form-control-sm"  id="sustainability_recycling_recyclingInstructions"></textarea>
        </div>

        <div class="col-12 m-0">
          <div class="section-title mt-1"><i class="bx bx-wrench me-1"></i> Desmontagem</div>
        </div>
        <div class="col-md-12 m-0">
          <label for="sustainability_disassembly_instructions" class="form-label">Instruções de Desmontagem</label>
          <textarea  class="form-control form-control-sm" id="sustainability_disassembly_instructions"></textarea
        </div>

        <div class="col-12 m-0">
          <div class="section-title mt-1"><i class="bx bx-trash-alt me-1"></i> Descarte</div>
        </div>

        <div class="row g-2">
          <div class="col-md-6 m-0">
            <div class="form-check mt-4">
              <input class="form-check-input" type="checkbox" id="sustainability_disposal_hazardousComponentsPresent">
              <label class="form-check-label" for="sustainability_disposal_hazardousComponentsPresent">
                Contém materiais perigosos?
              </label>
            </div>
          </div>

          <div class="col-md-6 m-0">
            <div class="form-check mt-4">
              <input class="form-check-input" type="checkbox" id="sustainability_disposal_takeBackProgram_isAvailable">
              <label class="form-check-label" for="sustainability_disposal_takeBackProgram_isAvailable">
                Programa de Retorno Disponível?
              </label>
            </div>
          </div>
        </div>

        <div class="col-12 m-0">
          <label for="sustainability_disposal_disposalInstructions" class="form-label">Instruções de Descarte</label>
          <textarea class="form-control form-control-sm" id="sustainability_disposal_disposalInstructions" rows="2"></textarea>
        </div>

        <div class="col-12 m-0">
          <div class="section-title mt-1"><i class="bx bx-repost me-1"></i> Reutilização</div>
        </div>
        <div class="col-md-6 m-0">
          <div class="form-check mt-4">
            <input class="form-check-input" type="checkbox" id="sustainability_reuse_refurbishmentPotential">
            <label class="form-check-label" for="sustainability_reuse_refurbishmentPotential">
              Pode ser recondicionado?
            </label>
          </div>
        </div>
        <div class="col-md-12 m-0">
          <label for="sustainability_reuse_componentsReusable" class="form-label">Componentes Reutilizáveis (vírgula)</label>
          <input type="text" class="form-control form-control-sm" id="sustainability_reuse_componentsReusable">
        </div>        

        <div class="col-12 m-0">
          <div class="section-title mt-1"><i class="bx bx-time-five me-1"></i> Vida Útil do Produto</div>
        </div>
        <div class="row g-2">
          <div class="col-md-4 m-0">
            <label for="productLifecycle_estimatedLifetimeHours" class="form-label">Vida útil estimada (horas)</label>
            <input type="number" class="form-control form-control-sm" id="productLifecycle_estimatedLifetimeHours">
          </div>
          <div class="col-md-4 m-0">
            <label for="productLifecycle_recommendedMaintenanceIntervalDays" class="form-label">Intervalo de manutenção (dias)</label>
            <input type="number" class="form-control form-control-sm" id="productLifecycle_recommendedMaintenanceIntervalDays">
          </div>
          <div class="col-md-4 m-0">
            <label for="productLifecycle_endOfLifeDate" class="form-label">Data de fim de vida</label>
            <input type="date" class="form-control form-control-sm" id="productLifecycle_endOfLifeDate">
          </div>
        </div>

        <div class="col-12 m-0">
          <div class="section-title mt-1"><i class="bx bx-file me-1"></i> Documentação</div>
        </div>

        <div class="col-md-12 m-0">
          <label for="documentation_instructionManual_url" class="form-label">Manual de Instruções (URL)</label>
          <input type="url" class="form-control form-control-sm" id="documentation_instructionManual_url">
        </div>

        <div class="col-md-12 m-0">
          <label for="documentation_instructionManual_version" class="form-label">Versão do Manual</label>
          <input type="text" class="form-control form-control-sm" id="documentation_instructionManual_version">
        </div>

        <div class="col-12 m-0 mt-2">
          <label class="form-label">Upload do Manual (PDF)</label>
          <div class="file-drop-area mb-4">
            <div class="file-drop-area-content py-5 px-3 text-center border-2 rounded border-dashed" id="dropZone">
              <i class="bx bx-cloud-upload display-4 text-muted"></i>
              <h5 class="mb-1">Arraste e solte seu ficheiro aqui</h5>
              <p class="text-muted mb-2">ou</p>
              <button type="button" class="btn btn-primary mb-3" id="browseFileBtn">
                <i class="bx bx-search-alt"></i> Selecione o ficheiro
              </button>
              <input type="file" class="file-input" id="manualFile" accept=".pdf" hidden>
              <div class="file-list mt-3" id="fileList"></div>
            </div>
          </div>
        </div>


      </div>
    </div>
  `);

  stepper = new Stepper($('#product-stepper')[0]);

  updateStepperButtons();

  $('#btnPrevStep').off('click').on('click', function() {
    stepper.previous();
    updateStepperButtons();
  });

  $('#btnNextStep').off('click').on('click', function() {
    if (validateCurrentStep()) {
      stepper.next();
      updateStepperButtons();
    }
  });

  $('#btnSubmitForm').off('click').on('click', function() {
    if (validateCurrentStep()) {
      saveProduct();
    }
  });

  if (id) {
    $('#productFormModalLabel').text('Editar Produto');
    showLoader('#product-modal .modal-body', 'Carregando...');

    fetchProductById(id, function (data) {
      if (data) {
        fillForm(data);
      }
      hideLoader('#product-modal .modal-body');
    });
  } else {
    $('#productFormModalLabel').text('Novo Produto');
  }

  $('#product-modal').modal('show');
}

function updateStepperButtons() {
  const currentStep = stepper._currentIndex;
  const totalSteps = stepper._steps.length - 1;

  // Esconder/mostrar botões conforme a etapa
  $('#btnPrevStep').toggle(currentStep > 0);
  $('#btnNextStep').toggle(currentStep < totalSteps);
  $('#btnSubmitForm').toggle(currentStep === totalSteps);
}

function validateCurrentStep() {
  let isValid = true;
  const currentStepId = stepper._steps[stepper._currentIndex].id;

  $('.invalid-feedback').remove();

  if (currentStepId === 'step-1') {
    if (!$('#identification_brandName').val().trim()) {
      $('#identification_brandName').addClass('is-invalid');
      $('#identification_brandName').after('<div class="invalid-feedback">Campo obrigatório</div>');
      isValid = false;
    }
    if (!$('#identification_modelName').val().trim()) {
      $('#identification_modelName').addClass('is-invalid');
      $('#identification_modelName').after('<div class="invalid-feedback">Campo obrigatório</div>');
      isValid = false;
    }
  } else if (currentStepId === 'step-3') {
    if (!$('#stock').val().trim()) {
      $('#stock').addClass('is-invalid');
      $('#stock').after('<div class="invalid-feedback">Campo obrigatório</div>');
      isValid = false;
    }
  }

  if (!isValid) {
    const alertMessage = currentStepId === 'step-3' 
      ? 'Por favor, preencha o campo de estoque' 
      : 'Por favor, preencha todos os campos obrigatórios';
    showBootstrapAlert('danger', 'Erro', alertMessage);
  }

  return isValid;
}

function saveProduct() {
  if (!validateForm()) {
    showBootstrapAlert('danger', 'Erro', 'Por favor, preencha todos os campos obrigatórios.');
    return;
  }

  const formData = new FormData();

  // JSON principal
  const payload = {
    identification: {
      brandName: $('#identification_brandName').val(),
      modelName: $('#identification_modelName').val(),
      sku: $('#identification_sku').val(),
      upc: $('#identification_upc').val(),
      productCategory: {
        primary: $('#identification_productCategory_primary').val(),
        secondary: $('#identification_productCategory_secondary').val(),
        tertiary: $('#identification_productCategory_tertiary').val()
      },
      serialNumberPattern: $('#identification_serialNumberPattern').val(),
      isActive: true
    },
    technicalSpecifications: {
      operatingVoltage: {
        min: parseFloat($('#technicalSpecifications_operatingVoltage_min').val() || '0'),
        max: parseFloat($('#technicalSpecifications_operatingVoltage_max').val() || '0'),
        unit: $('#technicalSpecifications_operatingVoltage_unit').val()
      },
      operatingTemperature: {
        min: parseFloat($('#technicalSpecifications_operatingTemperature_min').val() || '0'),
        max: parseFloat($('#technicalSpecifications_operatingTemperature_max').val() || '0'),
        unit: $('#technicalSpecifications_operatingTemperature_unit').val()
      },
      powerConsumption: {
        standby: parseFloat($('#technicalSpecifications_powerConsumption_standby').val() || '0'),
        active: parseFloat($('#technicalSpecifications_powerConsumption_active').val() || '0'),
        unit: $('#technicalSpecifications_powerConsumption_unit').val()
      },
      dimensions: {
        length: parseFloat($('#technicalSpecifications_dimensions_length').val() || '0'),
        width: parseFloat($('#technicalSpecifications_dimensions_width').val() || '0'),
        height: parseFloat($('#technicalSpecifications_dimensions_height').val() || '0'),
        unit: $('#technicalSpecifications_dimensions_unit').val()
      },
      weight: {
        value: parseFloat($('#technicalSpecifications_weight_value').val() || '0'),
        unit: $('#technicalSpecifications_weight_unit').val()
      },
      ipRating: $('#technicalSpecifications_ipRating').val(),
      compliance: ($('#technicalSpecifications_compliance').val() || '').split(',').map(s => s.trim()).filter(Boolean),
      additionalSpecs: {
        sensorType: $('#technicalSpecifications_additionalSpecs_sensorType').val(),
        accuracy: $('#technicalSpecifications_additionalSpecs_accuracy').val(),
        calibrationInterval: parseInt($('#technicalSpecifications_additionalSpecs_calibrationInterval').val() || '0')
      }
    },
    description: $('#description').val(),
    imageUrl: $('#imageUrl').val(),
    documentation: {
      instructionManual: {
        url: $('#documentation_instructionManual_url').val(),
        version: $('#documentation_instructionManual_version').val()
      },
      warranty: {
        durationMonths: parseInt($('#documentation_warranty_durationMonths').val() || '0'),
        termsUrl: $('#documentation_warranty_termsUrl').val()
      }
    },
    sustainability: {
      recycling: {
        isRecyclable: $('#sustainability_recycling_isRecyclable').is(':checked'),
        recyclabilityPercentage: parseFloat($('#sustainability_recycling_recyclabilityPercentage').val() || '0'),
        recyclingInstructionsUrl: $('#sustainability_recycling_recyclingInstructions').val()
      },
      disassembly: {
        timeRequiredMinutes: parseInt($('#sustainability_disassembly_timeRequiredMinutes').val() || '0'),
        difficultyRating: parseInt($('#sustainability_disassembly_difficultyRating').val() || '0'),
        instructionsUrl: $('#sustainability_disassembly_instructionsUrl').val(),
        toolRequirements: ($('#sustainability_disassembly_toolRequirements').val() || '').split(',').map(s => s.trim()).filter(Boolean)
      },
      disposal: {
        hazardousComponentsPresent: $('#sustainability_disposal_hazardousComponentsPresent').is(':checked'),
        disposalInstructions: $('#sustainability_disposal_disposalInstructions').val(),
        takeBackProgram: {
          isAvailable: $('#sustainability_disposal_takeBackProgram_isAvailable').is(':checked'),
          programUrl: $('#sustainability_disposal_takeBackProgram_programUrl').val()
        }
      },
      reuse: {
        componentsReusable: ($('#sustainability_reuse_componentsReusable').val() || '').split(',').map(s => s.trim()).filter(Boolean),
        refurbishmentPotential: $('#sustainability_reuse_refurbishmentPotential').is(':checked')
      }
    },
    productLifecycle: {
      estimatedLifetimeHours: parseInt($('#productLifecycle_estimatedLifetimeHours').val() || '0'),
      recommendedMaintenanceIntervalDays: parseInt($('#productLifecycle_recommendedMaintenanceIntervalDays').val() || '0'),
      endOfLifeDate: $('#productLifecycle_endOfLifeDate').val()
    }
  };

  // Adiciona o JSON principal como string
  formData.append('json', JSON.stringify(payload));

  const manualFile = $('#manualFile')[0].files[0];
  if (manualFile) {
    formData.append('manualFile', manualFile);
  }

  showLoader('#btnSaveProduct', 'Salvando...');

  const method = currentId ? 'PUT' : 'POST';
  const url = currentId ? `/products/api/products/${currentId}/` : '/products/api/products/';

  $.ajax({
    url,
    method,
    processData: false,
    contentType: false,
    data: formData,
    success: function (res) {
      showBootstrapAlert('success', 'Sucesso', 'Produto salvo com sucesso!');
      $('#product-modal').modal('hide');
      loadProductsGrid();
    },
    error: function (xhr) {
      const msg = xhr.responseJSON?.errors || 'Erro ao salvar';
      showBootstrapAlert('danger', 'Erro', JSON.stringify(msg));
    },
    complete: function () {
      
      hideLoader('#btnSaveProduct');
    }
  });
}

function initEvents() {
  $('#btnAddProduct').on('click', () => openModal());

  $(document).on('click', '.edit-product-btn', function () {
    const id = $(this).data('id');
    openModal(id);
  });

  $(document).on('click', '.details-btn', function () {
    const id = $(this).data('id');
    window.location.href = `/products/products/${id}/`;
  });

  $(document).on('click', '.delete-product-btn', function () {
    const id = $(this).data('id');
    Swal.fire({
      title: 'Deseja realmente excluir o produto?',
      text: 'Esta ação não poderá ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then(result => {
      if (result.isConfirmed) {
        showLoader('body', 'Excluindo...');
        deleteProduct(id, function () {
          loadProductsGrid();
          hideLoader('body');
        });
      }
    });
  });

  $('#product-form').on('submit', function (e) {
    e.preventDefault();
    saveProduct();
  });

  // Adicionar máscaras para campos específicos
  $(document).on('input', '#identification_sku, #identification_upc', function () {
    this.value = this.value.replace(/[^a-zA-Z0-9]/g, '');
  });

  $(document).on('input', '#technicalSpecifications_ipRating', function () {
    this.value = this.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  });

  // Validação em tempo real para campos obrigatórios
  $(document).on('blur', 'input[required], textarea[required]', function () {
    if (!this.value.trim()) {
      $(this).addClass('is-invalid');
    } else {
      $(this).removeClass('is-invalid');
    }
  });

  $(document).on('input', '#identification_brandName, #identification_modelName, #stock', function() {
    if (this.value.trim()) {
      $(this).removeClass('is-invalid');
      $(this).next('.invalid-feedback').remove();
    }
  });

  initFileUploadArea();
}

function initFileUploadArea() {
  const $dropZone = $('#dropZone');
  const $fileInput = $('#manualFile');
  const $fileList = $('#fileList');
  const $browseBtn = $('#browseFileBtn');

  function clearFiles() {
    uploadedPDF = null;
    $fileInput.val('');
    $fileList.empty();
  }

  function renderFile(file) {
    $fileList.html(`
      <div class="d-flex justify-content-between align-items-center bg-white p-2 rounded shadow-sm border">
        <span><i class="bx bx-file me-2"></i> ${file.name}</span>
        <button type="button" class="btn btn-sm btn-outline-danger" id="removePDF">
          <i class="bx bx-x"></i>
        </button>
      </div>
    `);
    $('#removePDF').on('click', clearFiles);
  }

  $browseBtn.on('click', () => $fileInput.trigger('click'));

  $fileInput.on('change', function () {
    const file = this.files[0];
    if (file && file.type === 'application/pdf') {
      uploadedPDF = file;
      renderFile(file);
    } else {
      alert('Por favor, selecione um arquivo PDF válido.');
      clearFiles();
    }
  });

  $dropZone.on('dragover', function (e) {
    e.preventDefault();
    $dropZone.addClass('bg-light border-primary');
  });

  $dropZone.on('dragleave', function () {
    $dropZone.removeClass('bg-light border-primary');
  });

  $dropZone.on('drop', function (e) {
    e.preventDefault();
    $dropZone.removeClass('bg-light border-primary');

    const file = e.originalEvent.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      uploadedPDF = file;
      renderFile(file);
    } else {
      alert('Por favor, solte apenas arquivos PDF.');
      clearFiles();
    }
  });
}

$(document).ready(function () {
  initEvents();
  loadProductsGrid();
});
