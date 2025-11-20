let selectedFile = null;
let currentId = null;
let stepper = null;
let associateModal;
let uploadedPDF = null;
let stepperCommon = null;
let currentCommonId = null;
let usageEntryModal = null;
let commonModalInst = null;
let movedDropArea = null;
let movedDropOwner = null;
let movedDropWasHidden = false;
let removeAttachmentIds = new Set();
const EDIT_FORM_SELECTOR = '#product-form';
const EDIT_MODAL_SELECTOR = '#product-modal';

function lockAllEditFields() {
  const $f = $(EDIT_FORM_SELECTOR);
  $f.find('input, select, textarea').prop('disabled', true);
  $f.find('button[type="submit"]').prop('disabled', true);
  $f.find('.btn-cancel, [data-bs-dismiss="modal"]').prop('disabled', false);

  $('#browseImgBtn').prop('disabled', true);
  $('#removeIMG').prop('disabled', true);
  $('#imageFile').prop('disabled', true);
  $('body').addClass('readonly');

  $('#browseManualBtn').prop('disabled', true);
  $('#removePDF').prop('disabled', true);
  $('#manualFile').prop('disabled', true);
}

function unlockAllEditFields() {
  const $f = $(EDIT_FORM_SELECTOR);
  $f.find('input, select, textarea, button[type="submit"]').prop('disabled', false);

  $('#browseImgBtn').prop('disabled', false);
  $('#removeIMG').prop('disabled', false);
  $('#imageFile').prop('disabled', false);
  $('body').removeClass('readonly');

  $('#browseManualBtn').prop('disabled', false);
  $('#removePDF').prop('disabled', false);
  $('#manualFile').prop('disabled', false);
}

function unlockOnlyEditableFields(paths = []) {
  const $f = $(EDIT_FORM_SELECTOR);
  lockAllEditFields();

  paths.forEach(p => {
    $f.find(`[name="${p}"]`).prop('disabled', false);
  });

  $f.find('button[type="submit"]').prop('disabled', false);
}

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
      console.log('🚀 ~ fetchProducts ~ response:', response);
      if (response.success) {
        if (callback) callback(response.data);
      } else {
        showBootstrapAlert('danger', 'Erro', response.error || 'Erro ao carregar produtos');
        if (callback) callback([]);
      }
    },
    error: function (xhr) {
      if (xhr.status === 401) {
        window.location = '/accounts/login/?next=' + encodeURIComponent(window.location.pathname);
        return;
      }
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
      if (xhr.status === 401) {
        window.location = '/accounts/login/?next=' + encodeURIComponent(window.location.pathname);
        return;
      }
      console.error('Erro ao buscar produto:', xhr);
      showBootstrapAlert('danger', 'Erro', 'Produto não encontrado');
      if (callback) callback(null);
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
      if (xhr.status === 401) {
        window.location = '/accounts/login/?next=' + encodeURIComponent(window.location.pathname);
        return;
      }
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

    if (typeof rebindProductCardEvents === 'function') rebindProductCardEvents();
    bindAssociateButtons();
  });
}

function cardHtml(product) {
  const id = product._id?.$oid || product._id || product.id || '---';
  const brand = product.identification?.brandName || '---';
  const model = product.identification?.modelName || '---';
  const active = product.identification?.isActive === false ? false : true;
  const image =
    product.imageUrl ||
    'https://img.freepik.com/premium-vector/default-image-icon-vector-missing-picture-page-website-design-mobile-app-no-photo-available_87543-11093.jpg?w=360';
  const desc = product.description || 'Sem descrição';
  const category = product.identification?.productCategory?.primary || '';

  const statusClass = active ? 'bg-success' : 'bg-secondary';

  const canAssociate = window.APP_CONTEXT?.canAssociate === true;

  const canDelete = window.APP_CONTEXT?.isSuperuser === true;

  const productId = (product._id && (product._id.$oid || product._id)) || product.id || '';

  const associateBtn = canAssociate
    ? `
    <button
      class="btn btn-outline-primary px-3 btn-associate-owner"
      data-product-id="${productId}"
      title="Associar proprietário">
      <i class="bx bx-link"></i> <span>Associar</span>
    </button>
  `
    : '';

  const editBtn = `
    <button class="btn btn-outline-primary px-3 edit-product-btn" data-id="${id}" title="Editar">
      <i class="bx bx-edit"></i>
    </button>
  `;

  const deleteBtn = canDelete
    ? `
    <button class="btn btn-outline-danger px-3 delete-product-btn" data-id="${id}" title="Excluir">
      <i class="bx bx-trash"></i>
    </button>
  `
    : '';

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
              ${editBtn}
              ${deleteBtn}
            </div>
            ${associateBtn}
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

  // DOCUMENTAÇÃO
  $('#documentation_instructionManual_url').val(data.documentation?.instructionManual?.url || '');
  $('#documentation_instructionManual_version').val(data.documentation?.instructionManual?.version || '');
  $('#documentation_warranty_durationMonths').val(data.documentation?.warranty?.durationMonths || '');
  $('#documentation_warranty_termsUrl').val(data.documentation?.warranty?.termsUrl || '');

  // SUSTENTABILIDADE — RECYCLING (usar URL, não textarea de texto)
  $('#sustainability_recycling_isRecyclable').prop('checked', data.sustainability?.recycling?.isRecyclable || false);
  $('#sustainability_recycling_recyclabilityPercentage').val(
    data.sustainability?.recycling?.recyclabilityPercentage || ''
  );
  $('#sustainability_recycling_recyclingInstructionsUrl').val(
    data.sustainability?.recycling?.recyclingInstructionsUrl || ''
  );

  // SUSTENTABILIDADE — DISASSEMBLY (usar URL com id ..._instructionsUrl)
  $('#sustainability_disassembly_timeRequiredMinutes').val(data.sustainability?.disassembly?.timeRequiredMinutes || '');
  $('#sustainability_disassembly_difficultyRating').val(data.sustainability?.disassembly?.difficultyRating || '');
  $('#sustainability_disassembly_instructionsUrl').val(data.sustainability?.disassembly?.instructionsUrl || '');
  $('#sustainability_disassembly_toolRequirements').val(
    (data.sustainability?.disassembly?.toolRequirements || []).join(', ')
  );

  // SUSTENTABILIDADE — DISPOSAL
  $('#sustainability_disposal_hazardousComponentsPresent').prop(
    'checked',
    data.sustainability?.disposal?.hazardousComponentsPresent || false
  );
  $('#sustainability_disposal_disposalInstructions').val(data.sustainability?.disposal?.disposalInstructions || '');
  $('#sustainability_disposal_takeBackProgram_isAvailable').prop(
    'checked',
    data.sustainability?.disposal?.takeBackProgram?.isAvailable || false
  );
  $('#sustainability_disposal_takeBackProgram_programUrl').val(
    data.sustainability?.disposal?.takeBackProgram?.programUrl || ''
  );

  // SUSTENTABILIDADE — REUSE
  $('#sustainability_reuse_componentsReusable').val((data.sustainability?.reuse?.componentsReusable || []).join(', '));
  $('#sustainability_reuse_refurbishmentPotential').prop(
    'checked',
    data.sustainability?.reuse?.refurbishmentPotential || false
  );

  // SUSTENTABILIDADE — PRODUCT LIFECYCLE
  $('#id_estimatedLifetimeHours').val(data.productLifecycle?.estimatedLifetimeHours || '');
  $('#id_recommendedMaintenanceIntervalDays').val(data.productLifecycle?.recommendedMaintenanceIntervalDays || '');
  $('#id_endOfLifeDate').val(data.productLifecycle?.endOfLifeDate || '');

  $('#productionData_manufacturing_location').val(data?.productionData?.manufacturing?.location || '');
  $('#productionData_manufacturing_city').val(data?.productionData?.manufacturing?.city || '');
  $('#productionData_manufacturing_country').val(data?.productionData?.manufacturing?.country || '');
  $('#productionData_manufacturing_productionDate').val(data?.productionData?.manufacturing?.productionDate || '');
  $('#productionData_manufacturing_productionReport').val(data?.productionData?.manufacturing?.productionReport || '');

  $('#id_estimatedLifetimeHours').val(data?.productLifecycle?.estimatedLifetimeHours || '');
  $('#id_recommendedMaintenanceIntervalDays').val(data?.productLifecycle?.recommendedMaintenanceIntervalDays || '');
  $('#id_endOfLifeDate').val(data?.productLifecycle?.endOfLifeDate || '');

  if (data.imageUrl) {
    $('#imageFileList').html(`
      <div class="d-flex justify-content-between align-items-center bg-white p-2 rounded shadow-sm border">
        <span><i class="bx bx-image me-2"></i> ${data.imageFileName || 'Imagem atual'}</span>
        <div class="d-flex gap-2">
          <a class="btn btn-sm btn-outline-secondary" href="${data.imageUrl}" target="_blank">Abrir</a>
          <button type="button" class="btn btn-sm btn-outline-danger" id="removeIMG">
            <i class="bx bx-x"></i>
          </button>
        </div>
      </div>
    `);
    $('#removeIMG')
      .off('click')
      .on('click', function () {
        $('#imageFile').val('');
        $('#imageFileList').empty();
        $('#removeImageFlag').val('true');
      });
  }

  if (data.manualUrl) {
    $('#fileList').html(`
      <div class="d-flex justify-content-between align-items-center bg-white p-2 rounded shadow-sm border">
        <span><i class="bx bx-file me-2"></i> ${data.manualFileName || 'Manual atual'}</span>
        <div class="d-flex gap-2">
          <a class="btn btn-sm btn-outline-secondary" href="${data.manualUrl}" target="_blank">Abrir</a>
          <button type="button" class="btn btn-sm btn-outline-danger" id="removePDF">
            <i class="bx bx-x"></i>
          </button>
        </div>
      </div>
    `);
    $('#removePDF')
      .off('click')
      .on('click', function () {
        $('#manualFile').val('');
        $('#fileList').empty();
        $('#removeManualFlag').val('true');
      });
  }
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
    try {
      stepper.destroy();
    } catch (e) {}
    stepper = null;
  }

  const steps = [
    { id: 'step-1', title: 'Identificação', icon: 'bx bx-id-card' },
    { id: 'step-2', title: 'Especificações', icon: 'bx bx-cog' },
    { id: 'step-3', title: 'Detalhes', icon: 'bx bx-detail' },
    { id: 'step-4', title: 'Sustentabilidade', icon: 'bx bx-recycle' }
  ];

  const $hdr = $('#stepper-header').empty();
  steps.forEach((s, i) =>
    $hdr.append(`
      <div class="step" data-target="#${s.id}">
        <button type="button" class="step-trigger p-1">
          <span class="bs-stepper-circle"><i class="${s.icon}"></i></span>
          <span class="bs-stepper-label d-none d-sm-inline">${s.title}</span>
        </button>
      </div>${i < steps.length - 1 ? '<div class="line"></div>' : ''}
    `)
  );

  const $cnt = $('#stepper-content').empty();
  $cnt.append('<div id="step-1" class="content"></div>');
  $cnt.append('<div id="step-2" class="content"></div>');
  $cnt.append('<div id="step-3" class="content"></div>');
  $cnt.append('<div id="step-4" class="content"></div>');

  showLoader('#product-modal .modal-body', 'Carregando formulário...');

  $.getJSON('/products/api/products/form/admin/', function (resp) {
    const tabs = resp?.tabs || {};
    if (tabs['step-1']) $('#step-1').html(tabs['step-1']);
    if (tabs['step-2']) $('#step-2').html(tabs['step-2']);
    if (tabs['step-3']) $('#step-3').html(tabs['step-3']);
    if (tabs['step-4']) $('#step-4').html(tabs['step-4']);

    if (tabs['extra-prod']) {
      if (!$('#extra-prod').length) {
        $('#stepper-content').append('<div id="extra-prod" class="content"></div>');
        $('#stepper-header').append(
          '<div class="line"></div><div class="step" data-target="#extra-prod"><button type="button" class="step-trigger p-1"><span class="bs-stepper-circle"><i class="bx bxs-factory"></i></span><span class="bs-stepper-label d-none d-sm-inline">Produção</span></button></div>'
        );
      }
      $('#extra-prod').html(tabs['extra-prod']);
    }

    stepper = new Stepper($('#product-stepper')[0], { linear: false, animation: true });

    $('#product-stepper').off('shown.bs-stepper').on('shown.bs-stepper', updateStepperButtons);

    $('#btnPrevStep')
      .off('click')
      .on('click', () => {
        if (stepper) stepper.previous();
        updateStepperButtons();
      });
    $('#btnNextStep')
      .off('click')
      .on('click', () => {
        if (!validateCurrentStep()) return;
        if (stepper) stepper.next();
        updateStepperButtons();
      });
    $('#btnSubmitForm')
      .off('click')
      .on('click', () => {
        if (!validateAllAndFocus()) return;
        saveProduct();
      });

    initFileUploadArea();
    updateStepperButtons();

    if (id) {
      fetchProductById(id, function (data) {
        if (data) {
          fillForm(data);
          applyEditPermissionsSimple(data);
        }
        hideLoader('#product-modal .modal-body');
      });
    } else {
      hideLoader('#product-modal .modal-body');
    }
  });

  $('#product-modal').modal('show');
}

function updateStepperButtons() {
  if (!stepper || !Array.isArray(stepper._steps) || stepper._steps.length === 0) {
    $('#btnPrevStep, #btnNextStep, #btnSubmitForm').hide();
    return;
  }

  const currentStep = typeof stepper._currentIndex === 'number' ? stepper._currentIndex : 0;
  const totalSteps = stepper._steps.length - 1;

  $('#btnPrevStep').toggle(currentStep > 0);
  $('#btnNextStep').toggle(currentStep < totalSteps);
  $('#btnSubmitForm').toggle(currentStep === totalSteps);
}

function validateCurrentStep() {
  if (!stepper || !Array.isArray(stepper._steps) || stepper._steps.length === 0) {
    return true;
  }

  let isValid = true;
  const idx = typeof stepper._currentIndex === 'number' ? stepper._currentIndex : 0;
  const currentStepId = stepper._steps[idx]?.id || 'step-1';
  $('.invalid-feedback').remove();

  if (currentStepId === 'step-1') {
    const $brand = $('#identification_brandName');
    const $model = $('#identification_modelName');

    if (!$brand.val().trim()) {
      markInvalid($brand);
      isValid = false;
    } else {
      clearInvalid($brand);
    }
    if (!$model.val().trim()) {
      markInvalid($model);
      isValid = false;
    } else {
      clearInvalid($model);
    }
  }

  if (!isValid) {
    showBootstrapAlert('danger', 'Erro', 'Por favor, preencha os campos obrigatórios.');
  }
  return isValid;
}

function markInvalid($el, msg = 'Campo obrigatório') {
  if (!$el.length) {
    return;
  }

  $el.addClass('is-invalid');
  if (!$el.next('.invalid-feedback').length) {
    $el.after(`<div class="invalid-feedback">${msg}</div>`);
  } else {
    $el.next('.invalid-feedback').text(msg);
  }
}

function clearInvalid($el) {
  $el.removeClass('is-invalid');
  $el.next('.invalid-feedback').remove();
}

function getStepIndexFromField($el) {
  const content = $el.closest('.content');
  if (!content.length) {
    return 0;
  }
  const id = content.attr('id');
  const index = parseInt(id.split('-')[1], 10) - 1;
  return isNaN(index) ? 0 : index;
}

function validateAllAndFocus() {
  let firstInvalid = null;
  $('.invalid-feedback').remove();

  ['#identification_brandName', '#identification_modelName'].forEach(sel => {
    const $f = $(sel);
    if (!$f.val().trim()) {
      markInvalid($f);
      if (!firstInvalid) firstInvalid = $f;
    } else {
      clearInvalid($f);
    }
  });

  $('input[type="url"]').each(function () {
    const $f = $(this);
    const val = $f.val().trim();
    if (!val) {
      clearInvalid($f);
      return;
    }
    try {
      new URL(val);
      clearInvalid($f);
    } catch {
      markInvalid($f, 'Introduza um URL válido.');
      if (!firstInvalid) firstInvalid = $f;
    }
  });

  if (firstInvalid) {
    const goTo = getStepIndexFromField(firstInvalid);
    if (typeof stepper?.to === 'function') stepper.to(goTo + 1);
    setTimeout(() => firstInvalid.trigger('focus'), 150);
    showBootstrapAlert('danger', 'Erro', 'Por favor, corrija os campos assinalados.');
    return false;
  }
  return true;
}

function saveProduct() {
  if (!validateForm()) {
    showBootstrapAlert('danger', 'Erro', 'Por favor, preencha todos os campos obrigatórios.');
    return;
  }

  const formData = new FormData();

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
        min: Number.parseFloat($('#technicalSpecifications_operatingVoltage_min').val() || '0'),
        max: Number.parseFloat($('#technicalSpecifications_operatingVoltage_max').val() || '0'),
        unit: $('#technicalSpecifications_operatingVoltage_unit').val()
      },
      operatingTemperature: {
        min: Number.parseFloat($('#technicalSpecifications_operatingTemperature_min').val() || '0'),
        max: Number.parseFloat($('#technicalSpecifications_operatingTemperature_max').val() || '0'),
        unit: $('#technicalSpecifications_operatingTemperature_unit').val()
      },
      powerConsumption: {
        standby: Number.parseFloat($('#technicalSpecifications_powerConsumption_standby').val() || '0'),
        active: Number.parseFloat($('#technicalSpecifications_powerConsumption_active').val() || '0'),
        unit: $('#technicalSpecifications_powerConsumption_unit').val()
      },
      dimensions: {
        length: Number.parseFloat($('#technicalSpecifications_dimensions_length').val() || '0'),
        width: Number.parseFloat($('#technicalSpecifications_dimensions_width').val() || '0'),
        height: Number.parseFloat($('#technicalSpecifications_dimensions_height').val() || '0'),
        unit: $('#technicalSpecifications_dimensions_unit').val()
      },
      weight: {
        value: Number.parseFloat($('#technicalSpecifications_weight_value').val() || '0'),
        unit: $('#technicalSpecifications_weight_unit').val()
      },
      ipRating: $('#technicalSpecifications_ipRating').val(),
      compliance: ($('#technicalSpecifications_compliance').val() || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      additionalSpecs: {
        sensorType: $('#technicalSpecifications_additionalSpecs_sensorType').val(),
        accuracy: $('#technicalSpecifications_additionalSpecs_accuracy').val(),
        calibrationInterval: Number.parseInt(
          $('#technicalSpecifications_additionalSpecs_calibrationInterval').val() || '0'
        )
      }
    },
    description: $('#description').val(),
    documentation: {
      instructionManual: {
        url: $('#documentation_instructionManual_url').val(),
        version: $('#documentation_instructionManual_version').val()
      },
      warranty: {
        durationMonths: Number.parseInt($('#documentation_warranty_durationMonths').val() || '0'),
        termsUrl: $('#documentation_warranty_termsUrl').val()
      }
    },
    sustainability: {
      recycling: {
        isRecyclable: $('#sustainability_recycling_isRecyclable').is(':checked'),
        recyclabilityPercentage: Number.parseFloat($('#sustainability_recycling_recyclabilityPercentage').val() || '0'),
        recyclingInstructionsUrl: $('#sustainability_recycling_recyclingInstructionsUrl').val()
      },
      disassembly: {
        timeRequiredMinutes: Number.parseInt($('#sustainability_disassembly_timeRequiredMinutes').val() || '0'),
        difficultyRating: Number.parseInt($('#sustainability_disassembly_difficultyRating').val() || '0'),
        instructionsUrl: $('#sustainability_disassembly_instructionsUrl').val(),
        toolRequirements: ($('#sustainability_disassembly_toolRequirements').val() || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
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
        componentsReusable: ($('#sustainability_reuse_componentsReusable').val() || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        refurbishmentPotential: $('#sustainability_reuse_refurbishmentPotential').is(':checked')
      }
    },
    productLifecycle: {
      estimatedLifetimeHours: Number.parseInt($('#id_estimatedLifetimeHours').val() || '0'),
      recommendedMaintenanceIntervalDays: Number.parseInt($('#id_recommendedMaintenanceIntervalDays').val() || '0'),
      endOfLifeDate: $('#id_endOfLifeDate').val()
    }
  };

  if ($('#productionData_manufacturing_location').length) {
    payload.productionData = {
      manufacturing: {
        location: $('#productionData_manufacturing_location').val() || null,
        city: $('#productionData_manufacturing_city').val() || null,
        country: $('#productionData_manufacturing_country').val() || null,
        productionDate: $('#productionData_manufacturing_productionDate').val() || null,
        productionReport: $('#productionData_manufacturing_productionReport').val() || null
      }
    };
  }

  const safeExtraBlocks = typeof extraBlocks === 'object' && extraBlocks ? extraBlocks : {};
  Object.assign(payload, safeExtraBlocks);
  formData.append('json', JSON.stringify(payload));

  formData.append('removeImage', $('#removeImageFlag').val());
  formData.append('removeManual', $('#removeManualFlag').val());

  const manualFile = $('#manualFile')[0].files[0];
  if (manualFile) {
    formData.append('manualFile', manualFile);
  }

  const imageFile = $('#imageFile')[0].files[0];
  if (imageFile) {
    formData.append('imageFile', imageFile);
  }

  showLoader('#btnSaveProduct', 'Salvando...');

  const method = currentId ? 'PUT' : 'POST';
  const url = currentId ? `/products/api/products/${currentId}/` : '/products/api/products/';

  $.ajax({
    url,
    method,
    processData: false,
    contentType: false,
    headers: {
      'X-CSRFToken': getCsrfToken(),
      'X-Requested-With': 'XMLHttpRequest'
    },
    data: formData,
    success: function (res) {
      showBootstrapAlert('success', 'Sucesso', 'Produto salvo com sucesso!');
      $('#product-modal').modal('hide');
      loadProductsGrid();
    },
    error: function (xhr) {
      if (xhr.status === 401) {
        window.location = '/accounts/login/?next=' + encodeURIComponent(window.location.pathname);
        return;
      }
      const errors = xhr.responseJSON?.errors || {};
      let firstField = null;

      function applyErr(selector, msg) {
        const $f = $(selector);
        if ($f.length) {
          markInvalid($f, msg);
          if (!firstField) firstField = $f;
        }
      }

      if (errors.documentation?.instructionManual?.url?.length) {
        applyErr('#documentation_instructionManual_url', errors.documentation.instructionManual.url[0]);
      }
      if (errors.sustainability?.recycling?.recyclingInstructionsUrl?.length) {
        applyErr(
          '#sustainability_recycling_recyclingInstructionsUrl',
          errors.sustainability.recycling.recyclingInstructionsUrl[0]
        );
      }
      if (errors.sustainability?.disassembly?.instructionsUrl?.length) {
        applyErr('#sustainability_disassembly_instructionsUrl', errors.sustainability.disassembly.instructionsUrl[0]);
      }
      if (errors.documentation?.warranty?.termsUrl?.length) {
        applyErr('#documentation_warranty_termsUrl', errors.documentation.warranty.termsUrl[0]);
      }

      if (firstField) {
        const idx = getStepIndexFromField(firstField);
        if (typeof stepper?.to === 'function') stepper.to(idx + 1);
        setTimeout(() => firstField.trigger('focus'), 150);
        showBootstrapAlert('danger', 'Erro', 'Por favor, corrija os campos assinalados.');
      } else {
        const msg = xhr.responseJSON?.detail || 'Erro ao salvar';
        showBootstrapAlert('danger', 'Erro', msg);
      }
    },
    complete: function () {
      hideLoader('#btnSaveProduct');
    }
  });
}

function initEvents() {
  $('#btnAddProduct').on('click', () => openModal());

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

  $(document).on('input', '#identification_sku, #identification_upc', function () {
    this.value = this.value.replace(/[^a-zA-Z0-9]/g, '');
  });

  $(document).on('input', '#technicalSpecifications_ipRating', function () {
    this.value = this.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  });

  $(document).on('blur', 'input[required], textarea[required]', function () {
    if (!this.value.trim()) {
      $(this).addClass('is-invalid');
    } else {
      $(this).removeClass('is-invalid');
    }
  });

  $(document).on('input', '#identification_brandName, #identification_modelName, #stock', function () {
    if (this.value.trim()) {
      $(this).removeClass('is-invalid');
      $(this).next('.invalid-feedback').remove();
    }
  });

  $('.btn-associate-owner').off('click').on('click', function () {
      const productId = $(this).data('product-id');
      openAssociateModal(productId);
    });
}

function initFileUploadArea() {
  // PDF
  const $dropZone = $('#dropZone');
  const $fileInput = $('#manualFile');
  const $fileList = $('#fileList');
  const $browseBtn = $('#browseFileBtn');

  function clearPDF() {
    uploadedPDF = null;
    $fileInput.val('');
    $fileList.empty();
  }
  function renderPDF(file) {
    $fileList.html(`
      <div class="d-flex justify-content-between align-items-center bg-white p-2 rounded shadow-sm border">
        <span><i class="bx bx-file me-2"></i> ${file.name}</span>
        <button type="button" class="btn btn-sm btn-outline-danger" id="removePDF"><i class="bx bx-x"></i></button>
      </div>
    `);
    $('#removePDF').off('click').on('click', clearPDF);
  }
  function validatePDF(file) {
    if (file.type !== 'application/pdf') {
      alert('Apenas PDF é permitido.');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('O manual excede 10 MB.');
      return false;
    }
    return true;
  }

  $browseBtn.off('click').on('click', () => $fileInput.trigger('click'));
  $fileInput.off('change').on('change', function () {
    const f = this.files[0];
    if (f && validatePDF(f)) {
      uploadedPDF = f;
      renderPDF(f);
    } else {
      clearPDF();
    }
  });

  $dropZone.off('dragover').on('dragover', e => {
    e.preventDefault();
    $dropZone.addClass('bg-light border-primary');
  });
  $dropZone.off('dragleave').on('dragleave', () => $dropZone.removeClass('bg-light border-primary'));
  $dropZone.off('drop').on('drop', function (e) {
    e.preventDefault();
    $dropZone.removeClass('bg-light border-primary');
    const f = e.originalEvent.dataTransfer.files[0];
    if (f && validatePDF(f)) {
      $fileInput[0].files = e.originalEvent.dataTransfer.files;
      uploadedPDF = f;
      renderPDF(f);
    } else clearPDF();
  });

  // IMAGEM
  const $imgDropZone = $('#imgDropZone');
  const $imgInput = $('#imageFile');
  const $imgFileList = $('#imageFileList');
  const $browseImgBtn = $('#browseImgBtn');

  function clearImg() {
    $imgInput.val('');
    $imgFileList.empty();
  }
  function renderImg(file) {
    $imgFileList.html(`
      <div class="d-flex justify-content-between align-items-center bg-white p-2 rounded shadow-sm border">
        <span><i class="bx bx-image me-2"></i> ${file.name}</span>
        <button type="button" class="btn btn-sm btn-outline-danger" id="removeIMG"><i class="bx bx-x"></i></button>
      </div>
    `);
    $('#removeIMG').off('click').on('click', clearImg);
  }
  function validateImg(file) {
    const ok = ['image/png', 'image/jpeg', 'image/webp'];
    if (!ok.includes(file.type)) {
      alert('Imagem inválida. Use PNG, JPG ou WEBP.');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem excede 5 MB.');
      return false;
    }
    return true;
  }

  $browseImgBtn.off('click').on('click', () => $imgInput.trigger('click'));
  $imgInput.off('change').on('change', function () {
    const f = this.files[0];
    if (f && validateImg(f)) renderImg(f);
    else clearImg();
  });
  $imgDropZone.off('dragover').on('dragover', e => {
    e.preventDefault();
    $imgDropZone.addClass('bg-light border-primary');
  });
  $imgDropZone.off('dragleave').on('dragleave', () => $imgDropZone.removeClass('bg-light border-primary'));
  $imgDropZone.off('drop').on('drop', function (e) {
    e.preventDefault();
    $imgDropZone.removeClass('bg-light border-primary');
    const f = e.originalEvent.dataTransfer.files[0];
    if (f && validateImg(f)) {
      $imgInput[0].files = e.originalEvent.dataTransfer.files;
      renderImg(f);
    } else clearImg();
  });

  // Validação inline de URLs
  $(document)
    .off('blur.url', 'input[type="url"]')
    .on('blur.url', 'input[type="url"]', function () {
      const val = this.value.trim();
      if (!val) {
        $(this).removeClass('is-invalid');
        return;
      }
      try {
        new URL(val);
        $(this).removeClass('is-invalid');
      } catch {
        $(this).addClass('is-invalid');
      }
    })
    .off('input.url change.url', 'input[type="url"]')
    .on('input.url change.url', 'input[type="url"]', function () {
      if ($(this).hasClass('is-invalid')) {
        const val = this.value.trim();
        if (!val) $(this).removeClass('is-invalid');
        else {
          try {
            new URL(val);
            $(this).removeClass('is-invalid');
          } catch {}
        }
      }
    });
}

function openAssociateModal(productId) {
  $('#associateProductId').val(productId);
  $('#associateIdentifier').val('').removeClass('is-invalid');
  $('#associateFeedback').text('');
  if (associateModal) associateModal.show();
}

function initAssociateModal() {
  const $modalEl = $('#associateModal');
  if ($modalEl.length === 0) return;
  associateModal = new bootstrap.Modal($modalEl[0]);

  $('#btnConfirmAssociate')
    .off('click')
    .on('click', function (e) {
      e.preventDefault();

      const productId = $('#associateProductId').val();
      const identifier = $('#associateIdentifier').val().trim();
      const $feedback = $('#associateFeedback');

      if (!identifier) {
        $('#associateIdentifier').addClass('is-invalid');
        showBootstrapAlert('danger', 'Erro', 'Informe um NIF ou NISS válido.');
        return;
      }

      const $btn = $(this).prop('disabled', true);

      $.ajax({
        url: `/products/api/products/${productId}/associate-owner/`,
        type: 'POST',
        dataType: 'json',
        headers: {
          'X-CSRFToken': getCookie('csrftoken'),
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({ identifier }),
        success: function (data, status, xhr) {
          if (!data || data.success === false) {
            const detail = (data && (data.detail || data.error)) || 'Não foi possível associar.';
            $feedback.text(detail);
            if (typeof showBootstrapAlert === 'function') {
              showBootstrapAlert('danger', 'Erro', detail);
            }
            return;
          }

          if (typeof showBootstrapAlert === 'function') {
            showBootstrapAlert('success', 'Sucesso', 'Proprietário associado com sucesso!');
          }
          associateModal.hide();

          if (typeof loadProductsGrid === 'function') {
            loadProductsGrid();
          }
        },
        error: function (xhr) {
          if (xhr.status === 401) {
            window.location = '/accounts/login/?next=' + encodeURIComponent(window.location.pathname);
            return;
          }
          const detail = xhr.responseJSON?.detail || 'Erro inesperado ao associar.';
          $('#associateFeedback').text(detail);
          if (typeof showBootstrapAlert === 'function') {
            showBootstrapAlert('danger', 'Erro', detail);
          }
        },
        complete: function () {
          $btn.prop('disabled', false);
        }
      });
    });
}

function bindAssociateButtons() {
  $('.btn-associate-owner')
    .off('click')
    .on('click', function () {
      const productId = $(this).data('product-id');
      openAssociateModal(productId);
    });
}

function applyEditPermissionsSimple(product) {
  const isCompany = window.APP_CONTEXT?.isCompany === true;
  const isSuperuser = window.APP_CONTEXT?.isSuperuser === true;
  const userId = (window.APP_CONTEXT?.userId || '').toString();
  const ownerId = (product?.ownerUserId || '').toString();

  if (isCompany || isSuperuser) {
    unlockAllEditFields();
    return;
  }

  lockAllEditFields();
  if (userId && ownerId && userId === ownerId) {
    lockAllEditFields();
    $('#identification_brandName').prop('disabled', false);
    $('#identification_modelName').prop('disabled', false);
    $('#btnSubmitForm').prop('disabled', false);

    $('#browseImgBtn, #removeIMG, #imageFile').prop('disabled', true);
    $('#browseManualBtn, #removePDF, #manualFile').prop('disabled', true);
  }
}

function openCommonModal(id) {
  currentCommonId = id;
  removeAttachmentIds = new Set();

  const $hdr = $('#common-stepper-header').empty();
  const $cnt = $('#common-stepper-content').empty();
  $cnt.append('<div id="extra-prod" class="content"></div>');
  $cnt.append('<div id="extra-eol" class="content"></div>');

  $hdr.append(`
    <div class="step" data-target="#extra-prod">
      <button type="button" class="step-trigger p-1">
        <span class="bs-stepper-circle"><i class='bx bx-spreadsheet'></i></span>
        <span class="bs-stepper-label d-none d-sm-inline">Usage Data</span>
      </button>
    </div>
    <div class="line"></div>
    <div class="step" data-target="#extra-eol">
      <button type="button" class="step-trigger p-1">
        <span class="bs-stepper-circle"><i class="bx bx-time-five"></i></span>
        <span class="bs-stepper-label d-none d-sm-inline">End of Life</span>
      </button>
    </div>
  `);

  showLoader('#product-common-modal .modal-body', 'Carregando...');
  $.getJSON('/products/api/products/form/common/', function (resp) {
    const tabs = resp?.tabs || {};
    if (tabs['extra-prod']) $('#extra-prod').html(tabs['extra-prod']);
    if (tabs['extra-eol']) $('#extra-eol').html(tabs['extra-eol']);

    if (tabs['extra-usage']) {
      if (!$('#extra-usage').length) {
        $('#product-common-stepper .bs-stepper-content').append('<div id="extra-usage" class="content"></div>');
        $('#product-common-stepper .bs-stepper-header').append(
          '<div class="line"></div><div class="step" data-target="#extra-usage">' +
            '<button type="button" class="step-trigger p-1">' +
            '<span class="bs-stepper-circle"><i class="bx bx-spreadsheet"></i></span>' +
            '<span class="bs-stepper-label d-none d-sm-inline">Uso</span>' +
            '</button></div>'
        );
      }
      $('#extra-usage').html(tabs['extra-usage']);
    }
    if (tabs['extra-eol']) {
      if (!$('#extra-eol').length) {
        $('#product-common-stepper .bs-stepper-content').append('<div id="extra-eol" class="content"></div>');
        $('#product-common-stepper .bs-stepper-header').append(
          '<div class="line"></div><div class="step" data-target="#extra-eol">' +
            '<button type="button" class="step-trigger p-1">' +
            '<span class="bs-stepper-circle"><i class="bx bx-time-five"></i></span>' +
            '<span class="bs-stepper-label d-none d-sm-inline">Fim de Vida</span>' +
            '</button></div>'
        );
      }
      $('#extra-eol').html(tabs['extra-eol']);
    }

    stepperCommon = new Stepper($('#product-common-stepper')[0], { linear: false, animation: true });

    $('#product-common-stepper').off('shown.bs-stepper').on('shown.bs-stepper', updateStepperButtonsCommon);

    $('#btnAddMaint')
      .off('click')
      .on('click', () => {
        const idx = $('#maintenance-list .maint-item').length;
        $('#maintenance-list').append(maintItemTemplate(idx));
      });
    $('#btnAddRepair')
      .off('click')
      .on('click', () => {
        const idx = $('#repair-list .repair-item').length;
        $('#repair-list').append(repairItemTemplate(idx));
      });

    $(document)
      .off('click', '.btn-remove-maint')
      .on('click', '.btn-remove-maint', function () {
        $(this).closest('.maint-item').remove();
        renumberUsageItems();
      });
    $(document)
      .off('click', '.btn-remove-repair')
      .on('click', '.btn-remove-repair', function () {
        $(this).closest('.repair-item').remove();
        renumberUsageItems();
      });
    $(document)
      .off('click', '.btn-remove-existing')
      .on('click', '.btn-remove-existing', function () {
        const attId = $(this).data('id');
        if (attId) removeAttachmentIds.add(attId.toString());
        $(this).closest('.file-item').remove();
      });

    function renumberUsageItems() {
      $('#maintenance-list .maint-item').each(function (i) {
        $(this).attr('data-index', i);
      });
      $('#repair-list .repair-item').each(function (i) {
        $(this).attr('data-index', i);
      });
    }

    $('#btnPrevStepCommon')
      .off('click')
      .on('click', () => {
        if (stepperCommon) stepperCommon.previous();
        updateStepperButtonsCommon();
      });
    $('#btnNextStepCommon')
      .off('click')
      .on('click', () => {
        if (stepperCommon) stepperCommon.next();
        updateStepperButtonsCommon();
      });

    updateStepperButtonsCommon();

    fetchProductById(id, function (data) {
      if (data) fillCommonFromData(data); // nova função (abaixo)
      hideLoader('#product-common-modal .modal-body');
    });
  });

  $('#product-common-modal').modal('show');
}

function initUsageDropAreas() {
  // Botão "Selecionar"
  $(document)
    .off('click', '.browseMaintBtn, .browseRepairBtn')
    .on('click', '.browseMaintBtn, .browseRepairBtn', function () {
      $(this).closest('.file-drop-area-content').find('input[type=file]').trigger('click');
    });

  // Selecionar arquivos
  $(document)
    .off('change', '.maint-files, .repair-files')
    .on('change', '.maint-files, .repair-files', function () {
      const $list = $(this).closest('.file-drop-area').find('.file-list');
      $list.empty();
      Array.from(this.files).forEach(f => {
        $list.append(`
          <div class="d-flex justify-content-between align-items-center bg-white p-2 rounded shadow-sm border file-item">
            <span><i class="bx bx-file me-2"></i>${f.name}</span>
          </div>
        `);
      });
    });

  // Drag and drop
  $(document)
    .off('dragover', '.maint-dropzone, .repair-dropzone')
    .on('dragover', '.maint-dropzone, .repair-dropzone', function (e) {
      e.preventDefault();
      $(this).addClass('bg-light border-primary');
    })
    .off('dragleave', '.maint-dropzone, .repair-dropzone')
    .on('dragleave', '.maint-dropzone, .repair-dropzone', function () {
      $(this).removeClass('bg-light border-primary');
    })
    .off('drop', '.maint-dropzone, .repair-dropzone')
    .on('drop', '.maint-dropzone, .repair-dropzone', function (e) {
      e.preventDefault();
      $(this).removeClass('bg-light border-primary');
      const files = e.originalEvent.dataTransfer.files;
      const $input = $(this).find('input[type=file]')[0];
      $input.files = files;
      const $list = $(this).closest('.file-drop-area').find('.file-list');
      $list.empty();
      Array.from(files).forEach(f => {
        $list.append(`
          <div class="d-flex justify-content-between align-items-center bg-white p-2 rounded shadow-sm border file-item">
            <span><i class="bx bx-file me-2"></i>${f.name}</span>
          </div>
        `);
      });
    });
}

function fillCommonFromData(data) {
  $('#usageData_environment').val(data.usageData?.environment || '');
  $('#usageData_usageFrequency').val(data.usageData?.usageFrequency || '');
  $('#usageData_averageUsagePerDay').val(data.usageData?.averageUsagePerDay || '');
  $('#usageData_lastUsedAt').val(data.usageData?.lastUsedAt || '');
  $('#usageData_condition').val(data.usageData?.condition || '');
  $('#usageData_notes').val(data.usageData?.notes || '');

  $('#maintenance-list').empty();
  (data.usageData?.maintenanceHistory || []).forEach((item, i) => {
    $('#maintenance-list').append(maintItemTemplate(i, item));
  });

  $('#repair-list').empty();
  (data.usageData?.repairHistory || []).forEach((item, i) => {
    $('#repair-list').append(repairItemTemplate(i, item));
  });

  $('#productLifecycle_estimatedLifetimeHours').val(data?.productLifecycle?.estimatedLifetimeHours || '');
  $('#productLifecycle_recommendedMaintenanceIntervalDays').val(
    data?.productLifecycle?.recommendedMaintenanceIntervalDays || ''
  );
  $('#productLifecycle_endOfLifeDate').val(data?.productLifecycle?.endOfLifeDate || '');

  buildUsageAccordionTables(true);
  renderMaintRepairTables();

}

function updateStepperButtonsCommon() {
  const s = stepperCommon;
  if (!s || !Array.isArray(s._steps) || s._steps.length === 0) {
    $('#btnPrevStepCommon, #btnNextStepCommon, #btnSubmitFormCommon').hide();
    return;
  }
  const cur = typeof s._currentIndex === 'number' ? s._currentIndex : 0;
  const total = s._steps.length - 1;
  $('#btnPrevStepCommon').toggle(cur > 0);
  $('#btnNextStepCommon').toggle(cur < total);
  $('#btnSubmitFormCommon').toggle(cur === total);

  $('#btnSubmitFormCommon').off('click').on('click', saveCommonModal);
}

function saveCommonModal() {
  const id = currentCommonId;
  if (!id) return;

  const fd = new FormData();

  const payload = {
    usageData: {
      environment: $('#usageData_environment').val() || null,
      usageFrequency: $('#usageData_usageFrequency').val() || null,
      averageUsagePerDay: $('#usageData_averageUsagePerDay').val() || null,
      lastUsedAt: $('#usageData_lastUsedAt').val() || null,
      condition: $('#usageData_condition').val() || null,
      notes: $('#usageData_notes').val() || null,
      maintenanceHistory: [],
      repairHistory: []
    },
    productLifecycle: {
      estimatedLifetimeHours: parseInt($('#productLifecycle_estimatedLifetimeHours').val() || '0', 10) || null,
      recommendedMaintenanceIntervalDays:
        parseInt($('#productLifecycle_recommendedMaintenanceIntervalDays').val() || '0', 10) || null,
      endOfLifeDate: $('#productLifecycle_endOfLifeDate').val() || null
    }
  };

  $('#maintenance-list .maint-item').each(function (i) {
    const card = $(this);
    payload.usageData.maintenanceHistory.push({
      date: card.find('.maint-date').val() || null,
      type: card.find('.maint-type').val() || null,
      description: card.find('.maint-desc').val() || null,
      technician: card.find('.maint-tech').val() || null,
      cost: card.find('.maint-cost').val() ? parseFloat(card.find('.maint-cost').val()) : null
    });
    const files = card.find('.maint-files')[0]?.files || [];
    Array.from(files).forEach((f, j) => {
      fd.append(`usage_maint_${i}_${j}`, f, f.name);
    });
  });

  $('#repair-list .repair-item').each(function (i) {
    const card = $(this);
    const warrantyVal = card.find('.repair-warranty').val();
    let underWarranty = null;
    if (warrantyVal === 'true') underWarranty = true;
    if (warrantyVal === 'false') underWarranty = false;

    payload.usageData.repairHistory.push({
      date: card.find('.repair-date').val() || null,
      component: card.find('.repair-component').val() || null,
      description: card.find('.repair-desc').val() || null,
      vendor: card.find('.repair-vendor').val() || null,
      cost: card.find('.repair-cost').val() ? parseFloat(card.find('.repair-cost').val()) : null,
      underWarranty
    });
    const files = card.find('.repair-files')[0]?.files || [];
    Array.from(files).forEach((f, j) => {
      fd.append(`usage_repair_${i}_${j}`, f, f.name);
    });
  });

  fd.append('json', JSON.stringify(payload));
  fd.append('removeUsageAttachmentIds', JSON.stringify(Array.from(removeAttachmentIds)));

  $.ajax({
    url: `/products/api/products/${id}/`,
    method: 'PUT',
    data: fd,
    processData: false,
    contentType: false,
    headers: { 'X-CSRFToken': getCookie('csrftoken') },
    success: function () {
      showBootstrapAlert('success', 'Sucesso', 'Dados salvos com sucesso!');
      $('#product-common-modal').modal('hide');
      loadProductsGrid();
    },
    error: function (xhr) {
      showBootstrapAlert('danger', 'Erro ao salvar dados.');
      console.error(xhr.responseJSON || xhr.responseText);
    }
  });
}

function maintItemTemplate(idx, data = {}) {
  const atts = (data.attachments || [])
    .map(
      a => `
      <div class="d-flex justify-content-between align-items-center bg-white p-2 rounded shadow-sm border file-item">
        <span><i class="bx bx-file me-2"></i> ${a.filename || 'Arquivo'}</span>
        <div class="d-flex gap-2">
          <a class="btn btn-sm btn-outline-secondary" href="${a.url}" target="_blank">Abrir</a>
          <button type="button" class="btn btn-sm btn-outline-danger btn-remove-existing" data-id="${a.attachmentId}">
            <i class="bx bx-x"></i>
          </button>
        </div>
      </div>`
    )
    .join('');

  return `
  <div class="card p-2 maint-item" data-index="${idx}">
    <div class="row g-2 align-items-end">
      <div class="col-sm-3"><label class="form-label">Data</label>
        <input type="date" class="form-control form-control-sm maint-date" value="${data.date || ''}">
      </div>
      <div class="col-sm-3"><label class="form-label">Tipo</label>
        <input type="text" class="form-control form-control-sm maint-type" value="${data.type || ''}">
      </div>
      <div class="col-sm-3"><label class="form-label">Técnico</label>
        <input type="text" class="form-control form-control-sm maint-tech" value="${data.technician || ''}">
      </div>
      <div class="col-sm-3"><label class="form-label">Custo</label>
        <input type="number" step="0.01" class="form-control form-control-sm maint-cost" value="${data.cost ?? ''}">
      </div>

      <div class="col-12">
        <label class="form-label">Descrição</label>
        <textarea class="form-control form-control-sm maint-desc" rows="2">${data.description || ''}</textarea>
      </div>

      <div class="col-12 mt-2">
        <label class="form-label">Upload (PDF/IMG)</label>
        <div class="file-drop-area mb-2">
          <div class="file-drop-area-content py-4 px-3 text-center border-2 rounded border-dashed maint-dropzone">
            <i class="bx bx-cloud-upload display-6 text-muted"></i>
            <h6 class="mb-0 small">Arraste arquivos aqui ou clique para selecionar</h6>
            <p class="text-muted small mb-2">ou</p>
            <button type="button" class="btn btn-primary btn-sm browseMaintBtn">Selecionar arquivo</button>
            <input type="file" class="file-input maint-files" multiple accept=".pdf,image/*" hidden>
          </div>
          <div class="file-list mt-2">${atts || '<span class="text-muted small">Nenhum arquivo enviado</span>'}</div>
        </div>
      </div>

      <div class="col-12 d-flex justify-content-end">
        <button type="button" class="btn btn-sm btn-outline-danger btn-remove-maint">
          <i class="bx bx-trash"></i> Remover manutenção
        </button>
      </div>
    </div>
  </div>`;
}

function repairItemTemplate(idx, data = {}) {
  const atts = (data.attachments || [])
    .map(
      a => `
      <div class="d-flex justify-content-between align-items-center bg-white p-2 rounded shadow-sm border file-item">
        <span><i class="bx bx-file me-2"></i> ${a.filename || 'Arquivo'}</span>
        <div class="d-flex gap-2">
          <a class="btn btn-sm btn-outline-secondary" href="${a.url}" target="_blank">Abrir</a>
          <button type="button" class="btn btn-sm btn-outline-danger btn-remove-existing" data-id="${a.attachmentId}">
            <i class="bx bx-x"></i>
          </button>
        </div>
      </div>`
    )
    .join('');

  return `
  <div class="card p-2 repair-item" data-index="${idx}">
    <div class="row g-2 align-items-end">
      <div class="col-sm-3"><label class="form-label">Data</label>
        <input type="date" class="form-control form-control-sm repair-date" value="${data.date || ''}">
      </div>
      <div class="col-sm-3"><label class="form-label">Componente</label>
        <input type="text" class="form-control form-control-sm repair-component" value="${data.component || ''}">
      </div>
      <div class="col-sm-3"><label class="form-label">Fornecedor</label>
        <input type="text" class="form-control form-control-sm repair-vendor" value="${data.vendor || ''}">
      </div>
      <div class="col-sm-3"><label class="form-label">Custo</label>
        <input type="number" step="0.01" class="form-control form-control-sm repair-cost" value="${data.cost ?? ''}">
      </div>

      <div class="col-sm-3"><label class="form-label">Garantia?</label>
        <select class="form-select form-select-sm repair-warranty">
          <option value="" ${data.underWarranty == null ? 'selected' : ''}>—</option>
          <option value="true" ${data.underWarranty === true ? 'selected' : ''}>Sim</option>
          <option value="false" ${data.underWarranty === false ? 'selected' : ''}>Não</option>
        </select>
      </div>
      <div class="col-sm-9"><label class="form-label">Descrição</label>
        <textarea class="form-control form-control-sm repair-desc" rows="2">${data.description || ''}</textarea>
      </div>


      <div class="col-sm-12 mt-2">
        <label class="form-label">Upload (PDF/IMG)</label>
        <div class="file-drop-area mb-2">
          <div class="file-drop-area-content py-4 px-3 text-center border-2 rounded border-dashed repair-dropzone">
            <i class="bx bx-cloud-upload display-6 text-muted"></i>
            <h6 class="mb-0 small">Arraste arquivos aqui ou clique para selecionar</h6>
            <p class="text-muted small mb-2">ou</p>
            <button type="button" class="btn btn-primary btn-sm browseRepairBtn">Selecionar arquivo</button>
            <input type="file" class="file-input repair-files" multiple accept=".pdf,image/*" hidden>
          </div>
          <div class="file-list mt-2">${atts || '<span class="text-muted small">Nenhum arquivo enviado</span>'}</div>
        </div>
      </div>

      <div class="col-12 d-flex justify-content-end">
        <button type="button" class="btn btn-sm btn-outline-danger btn-remove-repair">
          <i class="bx bx-trash"></i> Remover reparo
        </button>
      </div>
    </div>
  </div>`;
}

function ensureUsageEntryModal() {
  if (!usageEntryModal) {
    const el = document.getElementById('usageEntryModal');
    if (el) usageEntryModal = new bootstrap.Modal(el);
  }
}

function getCommonModal() {
  const el = document.getElementById('product-common-modal');
  commonModalInst = bootstrap.Modal.getOrCreateInstance(el);
  return commonModalInst;
}

function gridifyUsageSummary() {
  const $usageSection = $('#extra-prod');
}

function buildUsageAccordionTables(forceRebuild = false) {
  $('#maintenance-list, #repair-list').addClass('visually-hidden');

  if (forceRebuild) $('#maintTableWrap').remove();
  if (!$('#maintTableWrap').length) {
    $('#maintenance-list').after(`
      <div id="maintTableWrap" class="mt-2">
        <button class="btn btn-sm btn-light border mb-2" type="button"
                data-bs-toggle="collapse" data-bs-target="#maintTableCollapse" aria-expanded="true">
          <i class="bx bx-chevron-down me-1"></i> Maintenance History (<span id="maintCount">0</span>)
        </button>
        <div class="collapse show" id="maintTableCollapse">
          <div class="table-responsive">
            <table class="table table-sm mb-0 align-middle">
              <thead>
                <tr>
                  <th style="width:110px;">Data</th>
                  <th>Tipo</th>
                  <th style="width:160px;">Técnico</th>
                  <th style="width:110px;">Custo</th>
                  <th style="width:90px;" class="text-center">Anexos</th>
                  <th style="width:120px;" class="text-end">Ações</th>
                </tr>
              </thead>
              <tbody id="maintTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  }

  $('#btnAddMaint').off('click._add').on('click._add', () => openUsageEntry('maintenance', null));

  if (forceRebuild) $('#repairTableWrap').remove();
  if (!$('#repairTableWrap').length) {
    $('#repair-list').after(`
      <div id="repairTableWrap" class="mt-2">
        <button class="btn btn-sm btn-light border mb-2" type="button"
                data-bs-toggle="collapse" data-bs-target="#repairTableCollapse" aria-expanded="true">
          <i class="bx bx-chevron-down me-1"></i> Repair History (<span id="repairCount">0</span>)
        </button>
        <div class="collapse show" id="repairTableCollapse">
          <div class="table-responsive">
            <table class="table table-sm mb-0 align-middle">
              <thead>
                <tr>
                  <th style="width:110px;">Data</th>
                  <th>Componente</th>
                  <th style="width:160px;">Fornecedor</th>
                  <th style="width:110px;">Custo</th>
                  <th style="width:90px;" class="text-center">Garantia</th>
                  <th style="width:90px;" class="text-center">Anexos</th>
                  <th style="width:120px;" class="text-end">Ações</th>
                </tr>
              </thead>
              <tbody id="repairTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  }

  $('#btnAddRepair').off('click._add').on('click._add', () => openUsageEntry('repair', null));
}

function renderMaintRepairTables() {
  const $mb = $('#maintTableBody').empty();
  const $rb = $('#repairTableBody').empty();

  // === Maintenance rows
  const maintItems = $('#maintenance-list .maint-item');
  $('#maintCount').text(maintItems.length);
  maintItems.each(function (i) {
    const $it = $(this);
    const date = $it.find('.maint-date').val() || '-';
    const type = $it.find('.maint-type').val() || '-';
    const tech = $it.find('.maint-tech').val() || '-';
    const cost = $it.find('.maint-cost').val() || '-';

    const existingCount = $it.find('.file-item .btn-remove-existing').length;
    const newFiles = $it.find('.maint-files')[0]?.files?.length || 0;
    const totalAtts = existingCount + newFiles;

    $mb.append(`
      <tr data-kind="maintenance" data-index="${i}">
        <td>${date}</td>
        <td>${escapeHtml(type)}</td>
        <td>${escapeHtml(tech)}</td>
        <td>${cost !== '-' ? Number(cost) : '-'}</td>
        <td class="text-center">${totalAtts || 0}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary btn-edit-usage"><i class="bx bx-edit"></i></button>
            <button class="btn btn-outline-danger btn-del-usage"><i class="bx bx-trash"></i></button>
          </div>
        </td>
      </tr>
    `);
  });

  // === Repair rows
  const repairItems = $('#repair-list .repair-item');
  $('#repairCount').text(repairItems.length);
  repairItems.each(function (i) {
    const $it = $(this);
    const date = $it.find('.repair-date').val() || '-';
    const comp = $it.find('.repair-component').val() || '-';
    const vendor = $it.find('.repair-vendor').val() || '-';
    const cost = $it.find('.repair-cost').val() || '-';
    const underW = $it.find('.repair-warranty').val();
    const warr = underW === 'true' ? 'Sim' : underW === 'false' ? 'Não' : '—';

    const existingCount = $it.find('.file-item .btn-remove-existing').length;
    const newFiles = $it.find('.repair-files')[0]?.files?.length || 0;
    const totalAtts = existingCount + newFiles;

    $rb.append(`
      <tr data-kind="repair" data-index="${i}">
        <td>${date}</td>
        <td>${escapeHtml(comp)}</td>
        <td>${escapeHtml(vendor)}</td>
        <td>${cost !== '-' ? Number(cost) : '-'}</td>
        <td class="text-center">${warr}</td>
        <td class="text-center">${totalAtts || 0}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary btn-edit-usage"><i class="bx bx-edit"></i></button>
            <button class="btn btn-outline-danger btn-del-usage"><i class="bx bx-trash"></i></button>
          </div>
        </td>
      </tr>
    `);
  });

  // Ações
  $(document).off('click.usageEdit', '.btn-edit-usage').on('click.usageEdit', '.btn-edit-usage', function () {
      const $tr = $(this).closest('tr');
      openUsageEntry($tr.data('kind'), parseInt($tr.data('index'), 10));
    });

  $(document).off('click.usageDel', '.btn-del-usage').on('click.usageDel', '.btn-del-usage', function () {
      const $tr = $(this).closest('tr');
      const kind = $tr.data('kind');
      const idx = parseInt($tr.data('index'), 10);

      if (kind === 'maintenance') {
        const $item = $('#maintenance-list .maint-item').eq(idx);
        $item.find('.btn-remove-existing').each(function () {
          const id = $(this).data('id');
          if (id) removeAttachmentIds.add(id.toString());
        });
        $item.remove();
      } else {
        const $item = $('#repair-list .repair-item').eq(idx);
        $item.find('.btn-remove-existing').each(function () {
          const id = $(this).data('id');
          if (id) removeAttachmentIds.add(id.toString());
        });
        $item.remove();
      }

      renumberUsageHiddenLists();
      renderMaintRepairTables();
    });
}

function renumberUsageHiddenLists() {
  $('#maintenance-list .maint-item').each(function (i) {
    $(this).attr('data-index', i);
  });
  $('#repair-list .repair-item').each(function (i) {
    $(this).attr('data-index', i);
  });
}

function openUsageEntry(kind, indexOrNull) {
  ensureUsageEntryModal();
  const common = getCommonModal();

  const isEdit = indexOrNull !== null && indexOrNull !== undefined;
  $('#usageEntryType').val(kind);
  $('#usageEntryIndex').val(isEdit ? indexOrNull : '');
  $('#usageEntryTitle').text((isEdit ? 'Editar ' : 'Adicionar ') + (kind === 'maintenance' ? 'Manutenção' : 'Reparo'));

  $('#ue_date, #ue_type, #ue_component, #ue_technician, #ue_vendor, #ue_cost, #ue_description').val('');
  $('#ue_warranty').val('');
  $('#ue_drop_host').empty();
  movedDropArea = null;
  movedDropOwner = null;

  if (kind === 'maintenance') {
    $('#ue_block_maintenance').removeClass('d-none');
    $('#ue_block_repair_component, #ue_block_vendor, #ue_block_warranty').addClass('d-none');
    $('#ue_block_technician').removeClass('d-none');
  } else {
    $('#ue_block_maintenance').addClass('d-none');
    $('#ue_block_repair_component, #ue_block_vendor, #ue_block_warranty').removeClass('d-none');
    $('#ue_block_technician').addClass('d-none');
  }

  let $it;
  if (isEdit) {
    $it = (kind === 'maintenance')
      ? $('#maintenance-list .maint-item').eq(indexOrNull)
      : $('#repair-list .repair-item').eq(indexOrNull);
  } else {
    if (kind === 'maintenance') {
      const idx = $('#maintenance-list .maint-item').length;
      $('#maintenance-list').append(maintItemTemplate(idx, {}));
      $it = $('#maintenance-list .maint-item').last();
    } else {
      const idx = $('#repair-list .repair-item').length;
      $('#repair-list').append(repairItemTemplate(idx, {}));
      $it = $('#repair-list .repair-item').last();
    }
    $it.attr('data-new', '1');
  }

  if (kind === 'maintenance') {
    $('#ue_date').val($it.find('.maint-date').val() || '');
    $('#ue_type').val($it.find('.maint-type').val() || '');
    $('#ue_technician').val($it.find('.maint-tech').val() || '');
    $('#ue_cost').val($it.find('.maint-cost').val() || '');
    $('#ue_description').val($it.find('.maint-desc').val() || '');
  } else {
    $('#ue_date').val($it.find('.repair-date').val() || '');
    $('#ue_component').val($it.find('.repair-component').val() || '');
    $('#ue_vendor').val($it.find('.repair-vendor').val() || '');
    $('#ue_cost').val($it.find('.repair-cost').val() || '');
    $('#ue_description').val($it.find('.repair-desc').val() || '');
    $('#ue_warranty').val($it.find('.repair-warranty').val() || '');
  }

  const $drop = $it.find('.file-drop-area').first();
  if ($drop.length) {
    movedDropWasHidden = $drop.hasClass('d-none');
    movedDropArea = $drop.detach();
    movedDropOwner = $it;
    $('#ue_drop_host').append(movedDropArea);
    movedDropArea.removeClass('d-none'); 
  }

  common.hide();
  usageEntryModal.show();
}

function _trim(v){ 
  return (v ?? '').toString().trim(); 
}

function clearUsageEntryValidation() {
  $('#ue_date, #ue_type, #ue_component, #ue_technician, #ue_vendor, #ue_cost, #ue_warranty, #ue_description')
    .removeClass('is-invalid')
    .each(function(){
      const $n = $(this).next('.invalid-feedback');
      if ($n.length) $n.text('');
    });
}

function validateUsageEntry(kind) {
  clearUsageEntryValidation();

  const date = _trim($('#ue_date').val());
  const cost = _trim($('#ue_cost').val());
  const notes = _trim($('#ue_description').val());

  let hasError = false;

  if (!date) {
    $('#ue_date').addClass('is-invalid');
    hasError = true;
  }

  if (kind === 'maintenance') {
    const type = _trim($('#ue_type').val());
    if (!type) {
      $('#ue_type').addClass('is-invalid');
      hasError = true;
    }

    if (hasError) {
      showBootstrapAlert('danger', 'Preencha os campos obrigatórios da manutenção.','');
      return { ok: false };
    }
    return { ok: true, values: { date, type, tech: _trim($('#ue_technician').val()), cost, notes } };

  } else {
    const comp = _trim($('#ue_component').val());
    const vendor = _trim($('#ue_vendor').val());
    const warranty = $('#ue_warranty').val();

    if (!comp) {
      $('#ue_component').addClass('is-invalid');
      hasError = true;
    }

    if (hasError) {
      showBootstrapAlert('danger', 'Preencha os campos obrigatórios do reparo.','');
      return { ok: false };
    }
    return { ok: true, values: { date, comp, vendor, cost, notes, warranty } };
  }
}

function isHiddenItemEmpty($it, kind){
  if (kind === 'maintenance'){
    return !_trim($it.find('.maint-date').val())
        && !_trim($it.find('.maint-type').val())
        && !_trim($it.find('.maint-tech').val())
        && !_trim($it.find('.maint-cost').val())
        && !_trim($it.find('.maint-desc').val())
        && !($it.find('.file-item .btn-remove-existing').length)
        && !($it.find('.maint-files')[0]?.files?.length);
  } else {
    return !_trim($it.find('.repair-date').val())
        && !_trim($it.find('.repair-component').val())
        && !_trim($it.find('.repair-vendor').val())
        && !_trim($it.find('.repair-cost').val())
        && !_trim($it.find('.repair-desc').val())
        && !_trim($it.find('.repair-warranty').val())
        && !($it.find('.file-item .btn-remove-existing').length)
        && !($it.find('.repair-files')[0]?.files?.length);
  }
}

$(document).off('click', '#usageEntrySaveBtn').on('click', '#usageEntrySaveBtn', function () {
  const kind = $('#usageEntryType').val();
  const idxStr = $('#usageEntryIndex').val();
  const isEdit = idxStr !== '';

  const res = validateUsageEntry(kind);
  if (!res.ok){
    if (!isEdit){
      const $last = (kind === 'maintenance')
        ? $('#maintenance-list .maint-item').last()
        : $('#repair-list .repair-item').last();
      if ($last.attr('data-new') === '1') $last.remove();
      renumberUsageHiddenLists();
      renderMaintRepairTables();
    }
    return;
  }

  let $it;
  if (isEdit) {
    const i = parseInt(idxStr, 10);
    $it = (kind === 'maintenance')
      ? $('#maintenance-list .maint-item').eq(i)
      : $('#repair-list .repair-item').eq(i);
  } else {
    $it = (kind === 'maintenance')
      ? $('#maintenance-list .maint-item').last()
      : $('#repair-list .repair-item').last();
  }

  if (kind === 'maintenance') {
    const {date,type,tech,cost,notes} = res.values;
    $it.find('.maint-date').val(date);
    $it.find('.maint-type').val(type);
    $it.find('.maint-tech').val(tech);
    $it.find('.maint-cost').val(cost);
    $it.find('.maint-desc').val(notes);
  } else {
    const {date,comp,vendor,cost,notes,warranty} = res.values;
    $it.find('.repair-date').val(date);
    $it.find('.repair-component').val(comp);
    $it.find('.repair-vendor').val(vendor);
    $it.find('.repair-cost').val(cost);
    $it.find('.repair-desc').val(notes);
    $it.find('.repair-warranty').val(warranty);
  }

  if (movedDropArea && movedDropOwner) {
    movedDropOwner.append(movedDropArea);
    if (movedDropWasHidden){
      movedDropArea.addClass('d-none');
    }else{
      movedDropArea.removeClass('d-none');
    }
    movedDropArea = null;
    movedDropOwner = null;
    movedDropWasHidden = false;
  }

  $it.removeAttr('data-new');

  renumberUsageHiddenLists();
  renderMaintRepairTables();

  usageEntryModal.hide();
  getCommonModal().show();
});

$(document).on('input change', '#usageEntryForm input, #usageEntryForm select, #usageEntryForm textarea', function(){
  $(this).removeClass('is-invalid');
  const $n = $(this).next('.invalid-feedback');
  if ($n.length) $n.text('');
});

$('#usageEntryModal').off('hidden.bs.modal').on('hidden.bs.modal', function () {
  if (movedDropArea && movedDropOwner) {
    movedDropOwner.append(movedDropArea);
    if (movedDropWasHidden){
      movedDropArea.addClass('d-none');
    }else{
      movedDropArea.removeClass('d-none');
    }
    movedDropArea = null;
    movedDropOwner = null;
    movedDropWasHidden = false;
  }


  const kind = $('#usageEntryType').val();
  const idxStr = $('#usageEntryIndex').val();
  if (idxStr === '') {
    const $it = (kind === 'maintenance')
      ? $('#maintenance-list .maint-item').last()
      : $('#repair-list .repair-item').last();
    if ($it.attr('data-new') === '1' && isHiddenItemEmpty($it, kind)) {
      $it.remove();
      renumberUsageHiddenLists();
      renderMaintRepairTables();
    }
  }

  getCommonModal().show();
});

function escapeHtml(s) {
  return (s || '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

$('#btnSubmitFormCommon').off('click').on('click', saveCommonModal);

$(document).on('click', '.edit-product-btn', function () {
  const id = $(this).data('id');
  const isAdmin = window.APP_CONTEXT?.isCompany === true || window.APP_CONTEXT?.isSuperuser === true;
  if (isAdmin) {
    openModal(id);
    return;
  }

  fetchProductById(id, function (data) {
    if (!data) {
      openModal(id);
      return;
    }
    const ownerId = (data.ownerUserId || '').toString();
    const uid = (window.APP_CONTEXT?.userId || '').toString();
    if (uid && ownerId && uid === ownerId) {
      openCommonModal(id);
    } else {
      openModal(id);
    }
  });
});

$(document).ready(function () {
  initEvents();
  initUsageDropAreas();
  loadProductsGrid();
  initAssociateModal();
});
