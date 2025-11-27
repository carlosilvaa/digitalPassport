// apps/home/static/home/js/conveyor-passport.js
let map;

function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl) {
    console.warn('Elemento com id="map" não encontrado. Mapa não será inicializado.');
    return;
  }

  const lat = parseFloat(mapEl.dataset.lat) || (productData?.production?.geo?.lat ?? 41.806);
  const lng = parseFloat(mapEl.dataset.lng) || (productData?.production?.geo?.lng ?? -6.757);

  map = L.map('map').setView([lat, lng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const title = productData?.production?.address || 'Manufacturing Location';
  L.marker([lat, lng]).addTo(map)
    .bindPopup(`<b>${title}</b>`)
    .openPopup();
}

function generateQRCode(data) {
  const qrCodeContainer = document.getElementById('qrcode');
  if (!qrCodeContainer) {
    console.warn('Elemento #qrcode não encontrado. QR não será gerado.');
    return;
  }

  qrCodeContainer.innerHTML = "";

  const QR_BASE_PATH = '/products/passport/';

  // teste http://127.0.0.1:8000/products/passport/68d65911e6179110444b78bb/

  const fullUrl = `${window.location.origin}${QR_BASE_PATH}${data.id}/`;

  new QRCode(qrCodeContainer, {
    text: fullUrl,
    width: 150,
    height: 150,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date)) return "-";
  return date.toLocaleDateString("pt-PT", { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStatusBadge(status) {
  if (!status) return 'bg-secondary';
  const normalizedStatus = String(status).toLowerCase();

  if (['atuado', 'operacional', 'ativo', 'in operation', 'running'].includes(normalizedStatus)) {
    return 'bg-success text-white';
  }
  if (['parado', 'parado para manutenção', 'stopped', 'maintenance', 'warning'].includes(normalizedStatus)) {
    return 'bg-warning text-dark';
  }
  if (['desativado', 'fora de operação', 'deactivated', 'out_of_service', 'error'].includes(normalizedStatus)) {
    return 'bg-danger text-white';
  }
  return 'bg-secondary text-white';
}

function renderProductHeader(data) {
  $('#productTitle').text(data?.identification?.name || 'Product Name');
  $('#productSubtitle').text(data?.identification?.serialNumber || 'Serial Number Unknown');
  generateQRCode(data);
}

function renderBasicInfo(data) {
  $('#serialNumber').text(data?.identification?.serialNumber || 'N/A');
  $('#productionDate').text(formatDate(data?.production?.date));
  $('#manufacturer').text(data?.production?.manufacturer || 'Unknown Manufacturer');
  $('#productType').text(data?.identification?.type || 'Unknown Type');

  const status = data?.lifecycle?.currentStatus || 'Unknown';
  const $statusEl = $('#currentStatus');
  $statusEl
    .text(status)
    .removeClass()
    .addClass(`badge ${getStatusBadge(status)}`);
}

function renderTechnicalData(data) {
  const technical = data?.technical || {};
  $('#ratedPower').text(technical.ratedPower ? `${technical.ratedPower} kW` : 'N/A');
  $('#beltSpeed').text(technical.beltSpeed ? `${technical.beltSpeed} m/s` : 'N/A');
  $('#beltCapacity').text(technical.beltCapacity ? `${technical.beltCapacity} t/h` : 'N/A');
}

function renderLifecycleData(data) {
  const lifecycle = data?.lifecycle || {};
  $('#installationDate').text(formatDate(lifecycle.installationDate));
  $('#expectedEndOfLife').text(formatDate(lifecycle.expectedEndOfLife));

  const status = lifecycle.currentStatus || 'Unknown';
  const $statusEl = $('#lifecycleStatus');
  $statusEl
    .text(status)
    .removeClass()
    .addClass(`badge ${getStatusBadge(status)}`);
}

function renderSustainabilityData(data) {
  const s = data?.sustainability || {};
  $('#co2Footprint').text(s.co2Footprint ? `${s.co2Footprint} kg CO₂` : 'N/A');
  $('#recyclable').text(s.recyclable ? 'Sim' : 'Não');
  $('#sustainableMaterials').text(s.materials?.join(', ') || 'N/A');
}

function renderDocuments(data) {
  const docs = data?.documentation?.documents || [];
  const $list = $('#documentsList').empty();

  if (!docs.length) {
    $list.html('<p class="text-muted small mb-0">Nenhum documento anexado.</p>');
    return;
  }

  docs.forEach(doc => {
    const $row = $(`
      <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
        <span class="small">${doc.name || 'Documento'}</span>
        <a href="${doc.url || '#'}" target="_blank" rel="noopener" class="small text-primary">Abrir</a>
      </div>
    `);
    $list.append($row);
  });
}

function renderMaintenanceHistory(data) {
  const history = data?.lifecycle?.maintenanceHistory || [];
  const $container = $('#maintenanceHistory').empty();

  if (!history.length) {
    $container.html('<p class="text-muted small mb-0">Nenhuma manutenção registrada.</p>');
    return;
  }

  history.forEach(entry => {
    const $row = $(`
      <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-light small">
        <span>${formatDate(entry.date)}</span>
        <span>${entry.type || 'Manutenção'}</span>
        <span class="text-muted">${entry.description || ''}</span>
      </div>
    `);
    $container.append($row);
  });
}

function updateElementTextContent(selector, value, fallback = 'N/A') {
  const $el = $(selector);
  if (!$el.length) return;
  if (value === null || value === undefined || value === '') {
    $el.text(fallback);
  } else {
    $el.text(value);
  }
}

function renderUsageData() {
  if (!productData || !productData.usageData) return;

  const usage = productData.usageData;

  updateElementTextContent('#usageStatus', usage.status);
  updateElementTextContent('#usageLoadPercentage',
    usage.loadPercentage != null ? `${usage.loadPercentage}%` : null);
  updateElementTextContent('#usageRunningHours', usage.runningHours);
  updateElementTextContent('#usageLastInspection', formatDate(usage.lastInspection));
  updateElementTextContent('#usageNotes', usage.notes);

  const operational = usage.operationalData || {};
  updateElementTextContent('#operationalStatus', operational.status);
  updateElementTextContent('#operationalTemperature',
    operational.temperature != null ? `${operational.temperature} °C` : null);
  updateElementTextContent('#operationalVibration',
    operational.vibration != null ? `${operational.vibration} mm/s` : null);
  updateElementTextContent('#operationalEnergy',
    operational.energyConsumption != null ? `${operational.energyConsumption} kW` : null);
  updateElementTextContent('#operationalLoad',
    operational.loadLevel != null ? `${operational.loadLevel}%` : null);
}

function renderProduction() {
  if (!productData || !productData.production) return;

  const production = productData.production;
  updateElementTextContent('#productionManufacturer', production.manufacturer);
  updateElementTextContent('#productionAddress', production.address);
  updateElementTextContent('#productionDate', formatDate(production.date));
}

function renderEndOfLife() {
  if (!productData || !productData.endOfLife) return;

  const eol = productData.endOfLife;
  updateElementTextContent('#eolStatus', eol.status);
  updateElementTextContent('#eolPlannedDate', formatDate(eol.plannedDate));
  updateElementTextContent('#eolRecyclingPartner', eol.recyclingPartner);
  updateElementTextContent('#eolNotes', eol.notes);
}

function renderAttachments() {
  const attachments = productData?.attachments || [];
  const $container = $('#attachmentsList').empty();

  if (!attachments.length) {
    $container.html('<p class="text-muted small mb-0">Nenhum anexo disponível.</p>');
    return;
  }

  attachments.forEach(att => {
    const $row = $(`
      <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-light small">
        <span>${att.name || 'Anexo'}</span>
        <a href="${att.url || '#'}" class="text-primary small" target="_blank" rel="noopener">
          Ver
        </a>
      </div>
    `);
    $container.append($row);
  });
}

function updateHomeData(data) {
  if (!productData.usageData) productData.usageData = {};
  productData.usageData.operationalData = {
    ...(productData.usageData.operationalData || {}),
    ...data
  };
  renderUsageData();
}

let lastOperationalData = null;

function diffOperationalData(prev, curr) {
  if (!prev) return curr;
  const diff = {};
  Object.keys(curr || {}).forEach(k => {
    if (JSON.stringify(prev[k]) !== JSON.stringify(curr[k])) {
      diff[k] = curr[k];
    }
  });
  return Object.keys(diff).length ? diff : null;
}

function saveOperationalDelta(delta) {
  if (!delta) return;

  const url = `/api/products/${productData.id}/operational/update/`;

  const csrftoken = (document.cookie.match(/csrftoken=([^;]+)/) || [])[1];

  $.ajax({
    url,
    method: 'POST',
    headers: { 'X-CSRFToken': csrftoken },
    contentType: 'application/json',
    data: JSON.stringify({ data: delta })
  })
    .done(() => console.log('Operational delta saved:', delta))
    .fail(err => console.error('Save failed', err));
}

function showUpdateNotification() {
  const $toast = $(`
        <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
            <div class="toast show" role="alert">
                <div class="toast-header">
                    <strong class="me-auto">System Update</strong>
                    <small>Just now</small>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    Operational data updated successfully
                </div>
            </div>
        </div>
    `);

  $('body').append($toast);

  setTimeout(function () {
    $toast.find('.toast').removeClass('show');
    setTimeout(function () {
      $toast.remove();
    }, 500);
  }, 3000);
}


$(document).ready(function () {
  if (typeof productData === 'undefined' || !productData) {
    console.error('productData not defined');
    return;
  }

  renderProductHeader(productData);
  renderBasicInfo(productData);
  renderTechnicalData(productData);
  renderLifecycleData(productData);
  renderSustainabilityData(productData);
  renderDocuments(productData);
  renderProduction();
  renderEndOfLife();
  renderUsageData();
  renderAttachments();


  const mqttBroker = 'wss://test.mosquitto.org:8081/mqtt';

  const client = mqtt.connect(mqttBroker, {
    clientId: 'conveyor-passport-' + Math.random().toString(16).substr(2, 8)
  });

  const baseTopic = 'conveyor/operational_data';
  const productTopic = `${baseTopic}/${productData.id}`;

  client.on('connect', function () {
    console.log('Connected to MQTT Broker:', mqttBroker);
    console.log('Subscribing to topic:', productTopic);

    client.subscribe(productTopic, function (err) {
      if (err) {
        console.error('Erro ao inscrever no tópico:', err);
      } else {
        console.log('Inscrito no tópico do produto:', productTopic);
      }
    });
  });

  client.on('message', function (topic, message) {
    try {
      if (topic !== productTopic) {
        return;
      }

      const data = JSON.parse(message.toString());
      console.log('MQTT message for this product:', topic, data);

      updateHomeData(data);

      const delta = diffOperationalData(lastOperationalData, data);
      if (delta) {
        saveOperationalDelta(delta);

        lastOperationalData = data;

        showUpdateNotification();
      }
    } catch (e) {
      console.error('Error parsing MQTT message:', e);
    }
  });
  initMap();
});
