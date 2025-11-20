// apps/home/static/home/js/conveyor-passport.js
let map;

function initMap() {
  const mapEl = document.getElementById('map');
  const lat = parseFloat(mapEl?.dataset?.lat) || (productData?.production?.geo?.lat ?? 41.806);
  const lng = parseFloat(mapEl?.dataset?.lng) || (productData?.production?.geo?.lng ?? -6.757);

  map = L.map('map').setView([lat, lng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const title = productData?.production?.address || 'Manufacturing Location';
  L.marker([lat, lng]).addTo(map).bindPopup(`<b>${title}</b>`).openPopup();
}

$('button[data-bs-target="#productiondata"]').on('shown.bs.tab', function () {
  if (map) {
    map.invalidateSize(); // Forçar o Leaflet a recalcular o tamanho do mapa
  }
});

function setTextOrDefault(selector, value) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.textContent = value === null || value === undefined || value === '' ? 'Dado não fornecido' : value;
}

function renderProduction() {
  const p = productData.production || {};
  setTextOrDefault('#prod_address', p.address);
  setTextOrDefault('#prod_city', p.city);
  setTextOrDefault('#prod_country', p.country);
  setTextOrDefault('#prod_date', p.date);
  setTextOrDefault('#prod_extra', p.extraInfo);
}

function renderEndOfLife() {
  const e = productData.endOfLife || {};
  setTextOrDefault('#eol_recycling', e.recycling);
  setTextOrDefault('#eol_disassembly', e.disassembly);
  setTextOrDefault('#eol_disposal', e.disposal);
  setTextOrDefault('#eol_reuse', e.reuse);
  setTextOrDefault('#eol_lifetime', e.estimatedLifetime);
  setTextOrDefault('#eol_maint_interval', e.maintenanceInterval);
}

function renderUsageData() {
  const u = productData.usageData || {};
  const maint = Array.isArray(u.maintenanceHistory) ? u.maintenanceHistory : [];
  const repair = Array.isArray(u.repairHistory) ? u.repairHistory : [];

  const wrap = $('#usage_timeline');
  wrap.empty();

  const items = [];

  maint.forEach((it, i) => {
    items.push({
      kind: 'maintenance',
      title: it.type || 'Maintenance',
      date: it.date || '',
      notes: it.description || '',
      meta: [
        it.technician ? `Tech: ${it.technician}` : null,
        (it.cost || it.cost === 0) ? `Cost: ${it.cost}` : null
      ].filter(Boolean).join(' · '),
      attachments: (it.attachments || []).map((a, idx) => ({
        name: a.filename || `Attachment #${idx + 1}`,
        url: a.url
      }))
    });
  });

  repair.forEach((it, i) => {
    items.push({
      kind: 'repair',
      title: it.component ? `Repair – ${it.component}` : 'Repair',
      date: it.date || '',
      notes: it.description || '',
      meta: [
        it.vendor ? `Vendor: ${it.vendor}` : null,
        (it.cost || it.cost === 0) ? `Cost: ${it.cost}` : null,
        (typeof it.underWarranty === 'boolean') ? `Warranty: ${it.underWarranty ? 'Yes' : 'No'}` : null
      ].filter(Boolean).join(' · '),
      attachments: (it.attachments || []).map((a, idx) => ({
        name: a.filename || `Attachment #${idx + 1}`,
        url: a.url
      }))
    });
  });

  items.sort((a, b) => (new Date(b.date) - new Date(a.date)) || 0);

  const hasGeneral =
    u.environment || u.usageFrequency || u.averageUsagePerDay ||
    u.lastUsedAt || u.condition || u.notes;

  if (hasGeneral) {
    const general = $(`
      <div class="border rounded p-3 mb-3 bg-light-subtle">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="mb-0 fw-semibold">Usage Data</h6>
          <small class="text-muted">${u.lastUsedAt ? `Last used: ${u.lastUsedAt}` : ''}</small>
        </div>
        <div class="small row g-2">
          ${u.environment ? `<div class="col-md-4"><b>Environment:</b> ${u.environment}</div>` : ''}
          ${u.usageFrequency ? `<div class="col-md-4"><b>Frequency:</b> ${u.usageFrequency}</div>` : ''}
          ${u.averageUsagePerDay ? `<div class="col-md-4"><b>Avg/day:</b> ${u.averageUsagePerDay}</div>` : ''}
          ${u.condition ? `<div class="col-md-4"><b>Condition:</b> ${u.condition}</div>` : ''}
          ${u.notes ? `<div class="col-md-8"><b>Notes:</b> ${u.notes}</div>` : ''}
        </div>
      </div>
    `);
    wrap.append(general);
  }

  if (!items.length) {
    $('#usage_empty').removeClass('d-none');
    return;
  }
  $('#usage_empty').addClass('d-none');

  const maintRows = maint.map((it, i) => `
    <tr>
      <td>${it.date || '-'}</td>
      <td>${it.type || '-'}</td>
      <td>${it.technician || '-'}</td>
      <td>${it.cost || '-'}</td>
      <td class="text-end">
        ${(it.attachments || []).map(a =>
          `<a href="${a.url}" target="_blank" class="text-decoration-none small">📎</a>`
        ).join(' ')}
      </td>
    </tr>
  `).join('');

  const repairRows = repair.map((it, i) => `
    <tr>
      <td>${it.date || '-'}</td>
      <td>${it.component || '-'}</td>
      <td>${it.vendor || '-'}</td>
      <td>${it.cost || '-'}</td>
      <td class="text-end">
        ${(it.attachments || []).map(a =>
          `<a href="${a.url}" target="_blank" class="text-decoration-none small">📎</a>`
        ).join(' ')}
      </td>
    </tr>
  `).join('');

  const accordion = $(`
    <div class="accordion" id="usageAccordion">
      <div class="accordion-item">
        <h2 class="accordion-header" id="headingMaint">
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#collapseMaint" aria-expanded="false" aria-controls="collapseMaint">
            Maintenance History (${maint.length})
          </button>
        </h2>
        <div id="collapseMaint" class="accordion-collapse collapse" aria-labelledby="headingMaint" data-bs-parent="#usageAccordion">
          <div class="accordion-body p-0">
            ${maint.length
              ? `<table class="table table-sm mb-0 align-middle"><thead><tr><th>Date</th><th>Type</th><th>Technician</th><th>Cost</th><th class="text-end">Files</th></tr></thead><tbody>${maintRows}</tbody></table>`
              : `<div class="text-muted small p-3">No maintenance records.</div>`
            }
          </div>
        </div>
      </div>

      <div class="accordion-item mt-2">
        <h2 class="accordion-header" id="headingRepair">
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#collapseRepair" aria-expanded="false" aria-controls="collapseRepair">
            Repair History (${repair.length})
          </button>
        </h2>
        <div id="collapseRepair" class="accordion-collapse collapse" aria-labelledby="headingRepair" data-bs-parent="#usageAccordion">
          <div class="accordion-body p-0">
            ${repair.length
              ? `<table class="table table-sm mb-0 align-middle"><thead><tr><th>Date</th><th>Component</th><th>Vendor</th><th>Cost</th><th class="text-end">Files</th></tr></thead><tbody>${repairRows}</tbody></table>`
              : `<div class="text-muted small p-3">No repair records.</div>`
            }
          </div>
        </div>
      </div>
    </div>
  `);

  wrap.append(accordion);
}

function renderAttachments() {
  const cont = $('#attachments-container');
  cont.empty();

  const a = productData.attachments || {};
  const blocks = [
    { title: 'Manuals', key: 'manuals' },
    { title: 'Warranty', key: 'warranty' },
    { title: 'Maintenance', key: 'maintenance' },
    { title: 'Repair', key: 'repair' }
  ];

  let hasAny = false;
  blocks.forEach(b => {
    const items = Array.isArray(a[b.key]) ? a[b.key] : [];
    if (!items.length) return;

    hasAny = true;
    const list = items
      .map(it => `<li><a href="${it.url}" target="_blank" rel="noopener">${it.name || 'Arquivo'}</a></li>`)
      .join('');

    cont.append(`
      <div class="mb-3">
        <h6 class="mb-2">${b.title}</h6>
        <ul class="mb-0">${list}</ul>
      </div>
    `);
  });

  if (!hasAny) {
    cont.html('<p class="text-muted mb-0">Dado não fornecido</p>');
  }
}

function updateHomeData(data) {
  // Mapeamento de campos para atualização
  const fieldMap = {
    conveyorCount: data.conveyor_count !== undefined ? data.conveyor_count : 'N/A',
    position_in_sequence: data.position_in_sequence || 'N/A',
    number_of_pieces: data.pieces_transported || '0',
    last_piece_time: data.last_piece_time ? data.last_piece_time + ' s' : 'N/A',
    motor_operating_time: data.motor_operating_time ? data.motor_operating_time + ' s' : 'N/A',
    motor_status: data.motor_on ? 'ON' : 'OFF',
    input_sensor_status: data.input_sensor ? 'Active' : 'Inactive',
    output_sensor_status: data.output_sensor ? 'Active' : 'Inactive',
    vibration: data.vibration ? data.vibration + ' m/s²' : 'N/A',
    current: data.current ? data.current + ' A' : 'N/A',
    battery_level: data.battery_level ? data.battery_level + '%' : 'N/A',
    update_date: new Date().toLocaleString()
  };

  // Atualiza cada campo com jQuery
  $.each(fieldMap, function (id, value) {
    const $element = $('#' + id);
    if ($element.length) {
      $element.text(value);

      // Aplica estilos condicionais
      if (id.includes('status') || id.includes('sensor')) {
        $element
          .removeClass('text-success text-danger')
          .addClass(value.includes('ON') || value.includes('Active') ? 'text-success' : 'text-danger');
      }
    }
  });

  // Feedback visual de atualização
  showUpdateNotification();
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

  const url = `/products/${productData.id}/operational/update/`;

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
  // Cria o toast com jQuery
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

  // Adiciona ao body e configura timeout para remoção
  $('body').append($toast);

  setTimeout(function () {
    $toast.find('.toast').removeClass('show');
    setTimeout(function () {
      $toast.remove();
    }, 500);
  }, 3000);
}

$(document).ready(function () {
  // Conexão MQTT
  const client = mqtt.connect('wss://test.mosquitto.org:8081', {
    clientId: 'conveyor-passport-' + Math.random().toString(16).substr(2, 8)
  });

  client.on('connect', function () {
    console.log('Connected to MQTT Broker');
    client.subscribe('conveyor3/status');
  });

  client.on('message', function (topic, message) {
    try {
      const data = JSON.parse(message.toString());
      if (topic === 'conveyor3/status') {
        updateHomeData(data);

        const delta = diffOperationalData(lastOperationalData, data);
        if (delta) {
          saveOperationalDelta(delta);
          lastOperationalData = data;
        }
      }
    } catch (e) {
      console.error('Error parsing MQTT message:', e);
    }
  });
  renderProduction();
  renderEndOfLife();
  renderUsageData();
  renderAttachments();

  initMap();
});
