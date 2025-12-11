// apps/home/static/home/js/conveyor-passport.js

let map;

// ----------------- Helpers -----------------

function formatDate(dateString) {
  if (!dateString) return "Dado não fornecido";
  const date = new Date(dateString);
  if (isNaN(date)) return "Dado não fornecido";
  return date.toLocaleDateString("pt-PT", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function updateText(selector, value, fallback = "Dado não fornecido") {
  const $el = $(selector);
  if (!$el.length) return;
  if (value === null || value === undefined || value === "") {
    $el.text(fallback);
  } else {
    $el.text(value);
  }
}

// ----------------- QR Code -----------------

function generateQRCode(data) {
  const qrCodeContainer = document.getElementById("qrcode");
  if (!qrCodeContainer) {
    console.warn('Elemento #qrcode não encontrado. QR não será gerado.');
    return;
  }

  qrCodeContainer.innerHTML = "";

  const QR_BASE_PATH = "/products/passport/";
  const fullUrl = `${window.location.origin}${QR_BASE_PATH}${data.id}/`;

  // global QRCode vindo do qrcode.min.js
  // text = URL pública do passaporte
  new QRCode(qrCodeContainer, {
    text: fullUrl,
    width: 150,
    height: 150,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });
}

// ----------------- Mapa -----------------

function initMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl) {
    console.warn('Elemento com id="map" não encontrado. Mapa não será inicializado.');
    return;
  }

  const lat =
    parseFloat(mapEl.dataset.lat) ||
    (productData?.production?.geo?.lat ?? 41.806);
  const lng =
    parseFloat(mapEl.dataset.lng) ||
    (productData?.production?.geo?.lng ?? -6.757);

  map = L.map("map").setView([lat, lng], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  const title =
    productData?.production?.address || "Manufacturing Location";
  L.marker([lat, lng])
    .addTo(map)
    .bindPopup(`<b>${title}</b>`)
    .openPopup();
}

// ----------------- Production Data -----------------

function renderProductionFromProductData() {
  const prod = productData.production || {};


  updateText("#prod_address", prod.address);
  updateText("#prod_city", prod.city);
  updateText("#prod_country", prod.country);
  updateText("#prod_date", prod.date ? formatDate(prod.date) : null);
  updateText("#prod_extra", prod.extraInfo);
}

// ----------------- End of Life -----------------

function renderEndOfLifeFromProductData() {
  const eol = productData.endOfLife || {};

  // Sustentabilidade
  updateText("#eol_recycling", eol.recycling != null ? `${eol.recycling}%` : null);
  updateText("#eol_disassembly", eol.disassembly);
  updateText("#eol_disposal", eol.disposal);
  updateText("#eol_reuse", eol.reuse);

  // Ciclo de vida
  updateText(
    "#eol_lifetime",
    eol.estimatedLifetime != null ? `${eol.estimatedLifetime} h` : null
  );
  updateText(
    "#eol_maint_interval",
    eol.maintenanceInterval != null
      ? `${eol.maintenanceInterval} dias`
      : null
  );
}

// ----------------- Attachments -----------------

function renderAttachmentsFromProductData() {
  const $container = $("#attachments-container");
  if (!$container.length) return;

  $container.empty();

  const atts = productData.attachments || {};
  const hasAny =
    (atts.manuals && atts.manuals.length) ||
    (atts.warranty && atts.warranty.length) ||
    (atts.maintenance && atts.maintenance.length) ||
    (atts.repair && atts.repair.length);

  if (!hasAny) {
    $container.html(
      '<p class="text-muted mb-0">Nenhum anexo disponível.</p>'
    );
    return;
  }

  function renderGroup(title, list) {
    if (!list || !list.length) return;
    const $group = $(`
      <div class="mb-3">
        <h6 class="fw-bold mb-2">${title}</h6>
        <div class="vstack gap-1"></div>
      </div>
    `);
    const $stack = $group.find(".vstack");

    list.forEach((att) => {
      const $row = $(`
        <div class="d-flex justify-content-between align-items-center small border rounded px-2 py-1">
          <span>${att.name || "Anexo"}</span>
          <a href="${att.url || "#"}" target="_blank" rel="noopener" class="text-primary">
            Abrir
          </a>
        </div>
      `);
      $stack.append($row);
    });

    $container.append($group);
  }

  renderGroup("Manuais", atts.manuals);
  renderGroup("Garantia", atts.warranty);
  renderGroup("Manutenções", atts.maintenance);
  renderGroup("Reparos", atts.repair);
}

// ----------------- Usage Data (Maintenance & Repairs) -----------------

function renderUsageTimeline() {
  const $timeline = $("#usage_timeline");
  const $empty = $("#usage_empty");

  if (!$timeline.length) return;

  const usage = productData.usageData || {};
  const maint = usage.maintenanceHistory || [];
  const repairs = usage.repairHistory || [];

  if (!maint.length && !repairs.length) {
    $timeline.empty();
    $empty.removeClass("d-none");
    return;
  }

  $empty.addClass("d-none");
  $timeline.empty();

  if (maint.length) {
    $timeline.append('<h6 class="mb-2">Maintenance History</h6>');
    maint.forEach((item) => {
      const date = item.date ? formatDate(item.date) : "Data não fornecida";
      const type = item.type || "Manutenção";
      const desc = item.description || "";
      const tech = item.technician || "";
      const cost =
        item.cost != null ? `€ ${item.cost.toLocaleString()}` : "";

      const $card = $(`
        <div class="border rounded p-2 mb-2 small text-start">
          <div class="fw-semibold">${type}</div>
          <div class="text-muted">${date}</div>
          ${
            desc
              ? `<div class="mt-1">${desc}</div>`
              : ""
          }
          ${
            tech || cost
              ? `<div class="mt-1 text-muted">
                   ${tech ? `Técnico: ${tech}` : ""}
                   ${tech && cost ? " · " : ""}
                   ${cost ? `Custo: ${cost}` : ""}
                 </div>`
              : ""
          }
        </div>
      `);
      $timeline.append($card);
    });
  }

  if (repairs.length) {
    $timeline.append('<h6 class="mt-3 mb-2">Repair History</h6>');
    repairs.forEach((item) => {
      const date = item.date ? formatDate(item.date) : "Data não fornecida";
      const comp = item.component || "Reparo";
      const desc = item.description || "";
      const vendor = item.vendor || "";
      const cost =
        item.cost != null ? `€ ${item.cost.toLocaleString()}` : "";
      const warranty =
        item.underWarranty === true
          ? "Sob garantia"
          : item.underWarranty === false
          ? "Fora da garantia"
          : "";

      const $card = $(`
        <div class="border rounded p-2 mb-2 small text-start">
          <div class="fw-semibold">${comp}</div>
          <div class="text-muted">${date}</div>
          ${
            desc
              ? `<div class="mt-1">${desc}</div>`
              : ""
          }
          ${
            vendor || cost || warranty
              ? `<div class="mt-1 text-muted">
                   ${vendor ? `Fornecedor: ${vendor}` : ""}
                   ${vendor && (cost || warranty) ? " · " : ""}
                   ${cost ? `Custo: ${cost}` : ""}
                   ${(cost && warranty) || (vendor && warranty) ? " · " : ""}
                   ${warranty}
                 </div>`
              : ""
          }
        </div>
      `);
      $timeline.append($card);
    });
  }
}

function renderOperationalFromUsageOperationalData() {
  const usage = productData.usageData || {};
  const op = usage.operationalData || {};

  const mapKeyToSelector = {
    conveyor_count: "#conveyorCount",
    position_in_sequence: "#position_in_sequence",
    number_of_pieces: "#number_of_pieces",
    last_piece_time: "#last_piece_time",
    motor_operating_time: "#motor_operating_time",

    motor_status: "#motor_status",
    input_sensor_status: "#input_sensor_status",
    output_sensor_status: "#output_sensor_status",

    temperature: "#temperature",
    vibration: "#vibration",
    current: "#current",
    energy_consumption: "#current",
    battery_level: "#battery_level",
    load_level: "#load_level",

    conveyorCount: "#conveyorCount",
    positionInSequence: "#position_in_sequence",
    numberOfPieces: "#number_of_pieces",
    lastPieceTime: "#last_piece_time",
    motorOperatingTime: "#motor_operating_time",
    motorStatus: "#motor_status",
    inputSensorStatus: "#input_sensor_status",
    outputSensorStatus: "#output_sensor_status",
    energyConsumption: "#current",
    loadLevel: "#load_level",
    status: "#motor_status"
  };

  const defaultMsg = "No data being published at the moment.";
  let hasAnyValue = false;

  Object.keys(mapKeyToSelector).forEach((key) => {
    const selector = mapKeyToSelector[key];
    if (!$(selector).length) return;

    if (op[key] !== undefined && op[key] !== null && op[key] !== "") {
      let value = op[key];

      if (key === "vibration") {
        value = `${value} mm/s`;
      } else if (key === "current" || key === "energy_consumption" || key === "energyConsumption") {
        value = `${value} A`;
      } else if (key === "temperature") {
        value = `${value} °C`;
      } else if (key === "battery_level") {
        value = `${value} %`;
      } else if (key === "load_level" || key === "loadLevel") {
        value = `${value} %`;
      }

      updateText(selector, value, defaultMsg);
      hasAnyValue = true;
    }
  });

  if (hasAnyValue) {
    $("#update_date").text(new Date().toString());
  }
}


function updateHomeData(delta) {
  if (!productData.usageData) productData.usageData = {};
  const current = productData.usageData.operationalData || {};
  productData.usageData.operationalData = {
    ...current,
    ...delta,
  };
  renderOperationalFromUsageOperationalData();
}

let lastOperationalData = null;

function diffOperationalData(prev, curr) {
  if (!prev) return curr;
  const diff = {};
  Object.keys(curr || {}).forEach((k) => {
    const prevVal = prev[k];
    const currVal = curr[k];
    if (JSON.stringify(prevVal) !== JSON.stringify(currVal)) {
      diff[k] = currVal;
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
    method: "POST",
    headers: { "X-CSRFToken": csrftoken },
    contentType: "application/json",
    data: JSON.stringify({ data: delta }),
  })
    .done(() => console.log("Operational delta saved:", delta))
    .fail((err) => console.error("Save failed", err));
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

  $("body").append($toast);

  setTimeout(function () {
    $toast.find(".toast").removeClass("show");
    setTimeout(function () {
      $toast.remove();
    }, 500);
  }, 3000);
}

$(document).ready(function () {
  console.log("🚀 ~ productData:", productData)
  if (typeof productData === "undefined" || !productData) {
    console.error("productData not defined");
    return;
  }

  generateQRCode(productData);

  renderProductionFromProductData();
  renderEndOfLifeFromProductData();
  renderAttachmentsFromProductData();
  renderUsageTimeline();

  if (
    productData.usageData &&
    productData.usageData.operationalData
  ) {
    lastOperationalData = {
      ...productData.usageData.operationalData,
    };
    renderOperationalFromUsageOperationalData();
  }

  const mqttBroker = "wss://test.mosquitto.org:8081/mqtt";

  const client = mqtt.connect(mqttBroker, {
    clientId:
      "conveyor-passport-" +
      Math.random().toString(16).substr(2, 8),
  });

  const baseTopic = "conveyor/operational_data";
  const productTopic = `${baseTopic}/${productData.id}`;

  client.on("connect", function () {
    console.log("Connected to MQTT Broker:", mqttBroker);
    console.log("Subscribing to topic:", productTopic);

    client.subscribe(productTopic, function (err) {
      if (err) {
        console.error("Erro ao inscrever no tópico:", err);
      } else {
        console.log("Inscrito no tópico do produto:", productTopic);
      }
    });
  });

  client.on("message", function (topic, message) {
    try {
      if (topic !== productTopic) {
        return;
      }

      const data = JSON.parse(message.toString());
      console.log("MQTT message for this product:", topic, data);

      updateHomeData(data);

      const nextState = {
        ...(lastOperationalData || {}),
        ...data,
      };
      const delta = diffOperationalData(
        lastOperationalData,
        nextState
      );

      if (delta) {
        saveOperationalDelta(delta);
        lastOperationalData = nextState;
        showUpdateNotification();
      }
    } catch (e) {
      console.error("Error parsing MQTT message:", e);
    }
  });

  initMap();
});
