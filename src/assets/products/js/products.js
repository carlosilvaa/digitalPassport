let schema = null; // Declaração da variável schema no escopo global do document.ready
let stepper = null;

const ProductService = (function () {
  // Banco de dados mockado com imagens
  let products = [
    {
        id: 'conv000',
        brandName: 'Modular Conveyor',
        modelName: 'Transfer System DPP',
        sku: 'MCT-DPP-001',
        upc: '100000000001',
        productCategory: 'Sistemas de Transporte',
        isActive: true,
        description: 'Sistema modular de transporte com passaporte digital integrado',
        price: 125000.00,
        stock: 3,
        imageUrl: 'https://victoriamelo.github.io/Modular_Conveyor_Transfer_System_DPP/Conveyor_system.jpg',
        createdAt: new Date('2023-05-10'),
        features: [
            'Modularidade completa',
            'Rastreabilidade digital',
            'Sistema de transferência automatizado',
            'Integração com IoT'
        ],
        dppUrl: 'https://victoriamelo.github.io/Modular_Conveyor_Transfer_System_DPP/'
    },
    {
        id: 'conv001',
        brandName: 'Digital Conveyor',
        modelName: 'Passport System 1',
        sku: 'DCP-PS1-002',
        upc: '100000000002',
        productCategory: 'Sistemas de Transporte',
        isActive: true,
        description: 'Esteira transportadora com tecnologia de passaporte digital de primeira geração',
        price: 98000.00,
        stock: 5,
        imageUrl: 'https://victoriamelo.github.io/Digital-Product-Passport-Conveyor1/Conv1_qrcode.jpg',
        createdAt: new Date('2023-06-15'),
        features: [
            'Estrutura robusta',
            'Sensores integrados',
            'Painel de controle digital'
        ],
        dppUrl: 'https://victoriamelo.github.io/Digital-Product-Passport-Conveyor1/'
    },
    {
        id: 'conv002',
        brandName: 'Digital Conveyor',
        modelName: 'Passport System 2',
        sku: 'DCP-PS2-003',
        upc: '100000000003',
        productCategory: 'Sistemas de Transporte',
        isActive: true,
        description: 'Segunda geração de esteira com passaporte digital avançado',
        price: 115000.00,
        stock: 2,
        imageUrl: 'https://victoriamelo.github.io/Digital-Product-Passport-Conveyor2/Conv2_qrcode.jpg',
        createdAt: new Date('2023-07-20'),
        features: [
            'Estrutura robusta',
            'Sensores integrados',
            'Painel de controle digital'
        ],
        dppUrl: 'https://victoriamelo.github.io/Digital-Product-Passport-Conveyor2/'
    },
    {
        id: 'conv003',
        brandName: 'Digital Conveyor',
        modelName: 'Passport System 3',
        sku: 'DCP-PS3-004',
        upc: '100000000004',
        productCategory: 'Sistemas de Transporte',
        isActive: true,
        description: 'Terceira geração com tecnologia de passaporte digital e análise preditiva',
        price: 135000.00,
        stock: 4,
        imageUrl: 'https://victoriamelo.github.io/Digital-Product-Passport-Conveyor3/Conv3_qrcode.jpg',
        createdAt: new Date('2023-08-25'),
        features: [
            'Estrutura robusta',
            'Sensores integrados',
            'Painel de controle digital'
        ],
        dppUrl: 'https://victoriamelo.github.io/Digital-Product-Passport-Conveyor3/'
    },
    {
        id: 'conv004',
        brandName: 'Digital Conveyor',
        modelName: 'Passport System 4',
        sku: 'DCP-PS4-005',
        upc: '100000000005',
        productCategory: 'Sistemas de Transporte',
        isActive: true,
        description: 'Quarta geração com passaporte digital e inteligência artificial',
        price: 155000.00,
        stock: 1,
        imageUrl: 'https://victoriamelo.github.io/Digital-Product-Passport-Conveyor4/Conv4_qrcode.jpg',
        createdAt: new Date('2023-09-30'),
        features: [
            'Estrutura robusta',
            'Sensores integrados',
            'Painel de controle digital'
        ],
        dppUrl: 'https://victoriamelo.github.io/Digital-Product-Passport-Conveyor4/'
    }
  ];

  // Simula delay de rede
  const networkDelay = () => new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 200));

  return {
    getAll: async function() {
        await networkDelay();
        return [...products];
    },
    
    getById: async function(id) {
        await networkDelay();
        const product = products.find(p => p.id === id);
        if (!product) throw new Error('Produto não encontrado');
        return {...product};
    },
    
    create: async function(productData) {
        await networkDelay();
        const newProduct = {
            ...productData,
            id: 'prod' + Math.random().toString(36).substr(2, 6),
            createdAt: new Date(),
            // Garante uma imagem padrão se não for fornecida
            imageUrl: productData.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80'
        };
        products.push(newProduct);
        return newProduct;
    },
    
    update: async function(id, productData) {
        await networkDelay();
        const index = products.findIndex(p => p.id === id);
        if (index === -1) throw new Error('Produto não encontrado');
        
        products[index] = {
            ...products[index],
            ...productData,
            id: id // Mantém o ID original
        };
        
        return products[index];
    },
    
    delete: async function(id) {
        await networkDelay();
        const initialLength = products.length;
        products = products.filter(p => p.id !== id);
        return initialLength > products.length;
    },
    
    // Novo método para buscar por categoria
    getByCategory: async function(category) {
        await networkDelay();
        return products.filter(p => 
            p.productCategory.toLowerCase() === category.toLowerCase());
    }
  };
})();

const LABEL_MAP = {
    brandName: 'Marca',
    modelName: 'Modelo',
    sku: 'SKU',
    upc: 'UPC',
    productCategory: 'Categoria',
    isActive: 'Ativo',
    description: 'Descrição',
    stock: 'Estoque',
};

const IGNORE_FIELDS = ['id', 'createdAt'];

function fmtLabel(key) {
    return LABEL_MAP[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
}

async function loadSchema() {
    if (schema) return schema; // Usa a variável schema declarada no escopo global
    schema = await $.getJSON(window.PRODUCT_SCHEMA_URL);
    return schema;
}

async function loadGrid() {
    const $grid = $('#products-grid').empty();
    $grid.append('<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>');

    try {
        const list = await ProductService.getAll();
        $grid.empty();

        if (!list.length) {
            $grid.append('<div class="col-12 text-center">Nenhum produto cadastrado</div>');
            return;
        }

        list.forEach((p) => $grid.append(cardHtml(p)));
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Não foi possível carregar produtos', 'error');
    }
}

function cardHtml(product) {
  const statusClass = product.isActive ? 'bg-success' : 'bg-secondary';
  const stockStatus = product.stock > 0 
      ? `<span class="badge bg-success">${product.stock} em estoque</span>`
      : '<span class="badge bg-danger">Esgotado</span>';
  
  const featuresList = product.features?.map(f => 
      `<li class="feature-item"><i class="bx bx-check"></i> ${f}</li>`
  ).join('') || '';

  return `
  <div class="col-md-6 col-lg-4 mb-4 d-flex">
      <div class="card product-card w-100 border-0 shadow-sm overflow-hidden d-flex flex-column">
          <!-- Badge de status -->
          <span class="position-absolute top-0 start-0 m-2 badge ${statusClass}">
              ${product.isActive ? 'Ativo' : 'Inativo'}
          </span>
          
          <!-- Imagem do produto -->
          <div class="product-image-container position-relative overflow-hidden flex-grow-0">
              <img src="${product.imageUrl}" 
                   class="card-img-top product-image" 
                   alt="${product.brandName} ${product.modelName}"
                   loading="lazy">
              <div class="image-overlay d-flex align-items-center justify-content-center">
                  <button class="btn btn-outline-light btn-sm details-btn" 
                          data-id="${product.id}">
                      <i class="bx bx-zoom-in me-1"></i> Ver detalhes
                  </button>
              </div>
          </div>
          
          <div class="card-body d-flex flex-column">
              <!-- Categoria -->
              <div class="product-category mb-2">
                  <span class="badge bg-primary bg-opacity-25 text-white">
                      ${product.productCategory}
                  </span>
              </div>
              
              <!-- Nome e preço -->
              <div class="d-flex justify-content-between align-items-start mb-2">
                  <h5 class="card-title mb-0">${product.brandName} ${product.modelName}</h5>
              </div>
              
              <!-- Descrição -->
              <p class="card-text text-muted small mb-3">${product.description}</p>
              
              <!-- Features -->
              ${featuresList ? `
              <ul class="product-features list-unstyled small mb-auto">
                  ${featuresList}
              </ul>
              ` : '<div class="mb-auto"></div>'}
              
              <!-- Status e ações (sempre no final) -->
              <div class="d-flex justify-content-between align-items-center border-top pt-3 mt-3">
                  ${stockStatus}
                  
                  <div class="btn-group btn-group-sm" role="group">
                      <button class="btn btn-outline-primary edit-product-btn px-3" 
                              data-id="${product.id}" 
                              title="Editar">
                          <i class="bx bx-edit"></i>
                      </button>
                      <button class="btn btn-outline-danger delete-product-btn px-3" 
                              data-id="${product.id}" 
                              title="Excluir">
                          <i class="bx bx-trash"></i>
                      </button>
                  </div>
              </div>
          </div>
      </div>
  </div>
  `;
}

async function openModal(id = null) {
    const schemaObj = await loadSchema();
    buildForm(schemaObj);

    if (id) {
        const data = await ProductService.getById(id);
        fillForm(data);
        $('#productFormModalLabel').text('Editar Produto');
        currentId = id;
    } else {
        $('#productFormModalLabel').text('Adicionar Produto');
        currentId = null;
    }

    $('#product-modal').modal('show');
}

async function deleteProduct(id) {
    try {
        await ProductService.delete(id);
        loadGrid();
        Swal.fire('Excluído', 'Produto removido', 'success');
    } catch (e) {
        Swal.fire('Erro', e.message || 'Não foi possível excluir', 'error');
    }
}

// No arquivo products.js, modifique a função bindEvents:
function bindEvents() {
  $('#btnAddProduct').click(() => openModal());

  $(document)
      .on('click', '.edit-product-btn', function () {
          openModal($(this).data('id'));
      })
      .on('click', '.details-btn', function () {
          const productId = $(this).data('id');
          window.location.href = `/products/product-details/${productId}/`;// Modifique esta URL conforme sua estrutura de rotas
      })
      .on('click', '.delete-product-btn', function () {
          const id = $(this).data('id');
          Swal.fire({
              title: 'Confirmar exclusão?',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Sim, excluir',
              cancelButtonText: 'Cancelar',
          }).then((res) => {
              if (res.isConfirmed) deleteProduct(id);
          });
      });
}

function buildForm(schemaObj) {
  const sections = Object.keys(schemaObj).filter(s => !IGNORE_FIELDS.includes(s) && s !== 'metadata');
  const $h = $('#stepper-header').empty();
  const $c = $('#stepper-content').empty();

  sections.forEach((sec,i) => {
    // Header
    $h.append(
      `<div class="step" data-target="#${sec}-panel">
        <button class="step-trigger" type="button">
          <span class="bs-stepper-circle">${i+1}</span>
          <span class="bs-stepper-label">${fmtLabel(sec)}</span>
        </button>
      </div>`
    );

    // Panel
    const $panel = $(
      `<div id="${sec}-panel" class="content" role="tabpanel">
        <h6 class="mb-3">${fmtLabel(sec)}</h6>
        <div class="row g-3"></div>
      </div>`);
    const $row = $panel.find('.row');

    // Campos
    Object.entries(schemaObj[sec]).forEach(([k,v]) => {
      if (IGNORE_FIELDS.includes(k) || k === 'metadata') return;
      if (v === null || ['string','number','boolean'].includes(typeof v)) {
        const type = typeof v === 'boolean' ? 'checkbox' : typeof v === 'number' ? 'number' : 'text';
        const label = fmtLabel(k);
        if (type === 'checkbox') {
          $row.append(
            `<div class="col-12 form-check form-switch">
               <input class="form-check-input" type="checkbox" id="${sec}_${k}" name="${sec}.${k}">
               <label class="form-check-label" for="${sec}_${k}">${label}</label>
             </div>`
          );
        } else {
          $row.append(
            `<div class="col-md-6 form-floating">
               <input type="${type}" class="form-control" id="${sec}_${k}" name="${sec}.${k}" placeholder="${label}">
               <label for="${sec}_${k}">${label}</label>
             </div>`
          );
        }
      }
    });

    // Navegação
    const prev = i>0 ? '<button class="btn btn-outline-secondary btnPrev">← Anterior</button>' : '<div></div>';
    const next = i<sections.length-1 ? '<button class="btn btn-primary btnNext">Próximo →</button>' : '<button type="submit" class="btn btn-success">Salvar</button>';
    $panel.append(`<div class="d-flex justify-content-between mt-4">${prev}${next}</div>`);
    $c.append($panel);
  });

  // Inicializa stepper
  if (stepper) stepper.reset();
  stepper = new Stepper($('.bs-stepper')[0], { linear: true });

  // Eventos
  $('.btnNext').off().on('click', ()=> stepper.next());

  $('.btnPrev').off().on('click', ()=> stepper.previous());

  $('#product-form').off('submit').on('submit', async e => {
    e.preventDefault();
    await saveProduct();
    $('#product-modal').modal('hide');
    loadGrid();
    Swal.fire('Sucesso','Produto salvo com sucesso','success');
  });
}

function fillForm(data) {
  Object.entries(data).forEach(([sec,obj]) => {
    if (typeof obj === 'object') {
      Object.entries(obj).forEach(([k,v]) => {
        const $f = $(`#${sec}_${k}`);
        if ($f.length) {
          if ($f.attr('type') === 'checkbox') $f.prop('checked', v);
          else $f.val(v);
        }
      });
    }
  });
}

async function saveProduct() {
  const fd = new FormData($('#product-form')[0]);
  const payload = {};
  fd.forEach((val,key) => {
    const [sec, field] = key.split('.');
    payload[sec] = payload[sec] || {};
    payload[sec][field] = field === 'isActive' ? val === 'on' : val;
  });
  
  if (currentId){
    await ProductService.update(currentId,payload);
  }else{
    await ProductService.create(payload);
  } 
}

async function deleteProduct(id) {
  try {
    await ProductService.delete(id);
    loadGrid();
    Swal.fire('Excluído','Produto removido','success');
  } catch (e) {
    Swal.fire('Erro',e.message||'Não foi possível excluir','error');
  }
}

function showDetail(id) {
  Swal.fire('Detalhes','Produto: ' + id,'info');
}

$(document).ready(function () {
    bindEvents();
    loadGrid();
});
