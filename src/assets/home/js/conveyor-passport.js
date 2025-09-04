window.DPP_CFG = window.DPP_CFG || {
  BROKER_URL: 'wss://test.mosquitto.org:8081',
  TOPIC_FALLBACK: 'conveyor3/status',
  RECONNECT_BASE_MS: 1500,
  RECONNECT_CAP_MS: 15000
};

if (window.__DPP_BOOTED) {
} else {
  window.__DPP_BOOTED = true;

  const NA = 'Não informado';

  function dppIsEmpty(v) {
    return (
      v === null ||
      v === undefined ||
      (typeof v === 'string' && v.trim() === '') ||
      (typeof v === 'string' && ['none', 'null', 'undefined'].includes(v.trim().toLowerCase()))
    );
  }
  function dppNorm(v) {
    return dppIsEmpty(v) ? NA : String(v).trim();
  }
  function dppUnit(v, u) {
    return dppIsEmpty(v) ? NA : `${v} ${u}`;
  }
  function dppBool(v, t, f) {
    return v ? t : f;
  }

  function dppFmtSeconds(s) {
    if (dppIsEmpty(s)) return NA;
    const n = Number(s);
    if (Number.isNaN(n)) return dppNorm(s);
    const d = moment.duration(n, 'seconds');
    return n < 3600
      ? moment.utc(d.asMilliseconds()).format('mm:ss')
      : moment.utc(d.asMilliseconds()).format('HH:mm:ss');
  }

  function dppFmtStamp(ts) {
    if (dppIsEmpty(ts)) return NA;
    let m;
    if (typeof ts === 'number') {
      m = String(ts).length > 11 ? moment(ts) : moment(ts * 1000);
    } else {
      const n = Number(ts);
      m =
        !Number.isNaN(n) && isFinite(n)
          ? String(ts).length > 11
            ? moment(n)
            : moment(n * 1000)
          : moment(ts, moment.ISO_8601, true);
    }
    return m.isValid() ? m.format('DD/MM/YYYY HH:mm:ss') : dppNorm(ts);
  }

  function dppDeriveTopic() {
    try {
      const $tag = $('#conveyor-passport-js');
      const topicAttr = ($tag.data('topic') || '').trim();
      const brokerAttr = ($tag.data('broker') || '').trim();
      if (brokerAttr) window.DPP_CFG.BROKER_URL = brokerAttr;
      if (topicAttr) return topicAttr;

      const p = window.productData || {};
      const pid = (p.id || p._id || p.productId || (p.identification && p.identification.id) || '').toString().trim();
      if (pid) return `conveyor/${pid}/status`;
      return window.DPP_CFG.TOPIC_FALLBACK;
    } catch {
      return window.DPP_CFG.TOPIC_FALLBACK;
    }
  }

  function dppApplyFallbacks($scope) {
    $scope = $scope && $scope.length ? $scope : $(document);
    $scope.find('td, .fw-medium, .value').each(function () {
      const $el = $(this);
      if ($el.find('a,.badge').length) return;
      const v = dppNorm($el.text());
      if (v !== $el.text()) $el.text(v);
    });
    $scope.find('a[href]').each(function () {
      const $a = $(this);
      const href = ($a.attr('href') || '').trim();
      if (!href) $a.removeAttr('href').text(NA);
    });
  }

  function dppSetProductImage(selector, url) {
    const $img = $(selector);
    if (!$img.length) return;
    const placeholder = $img.data('placeholder') || '/static/home/img/no-image.png';
    if (dppIsEmpty(url)) {
      $img.attr('src', placeholder).attr('alt', 'Imagem não informada');
      return;
    }
    $img
      .attr('src', url)
      .off('error')
      .on('error', function () {
        $(this).attr('src', placeholder).attr('alt', 'Imagem não informada');
      });
  }

  function dppHydrateFromProductData() {
    if (typeof window.productData === 'undefined') return;
    const p = window.productData || {};

    // imagem
    dppSetProductImage('#product-image', p.imageUrl);

    const id = p.identification || {};
    const brand = p.brandName || id.brandName;
    const model = p.modelName || id.modelName;
    const sku = p.sku || id.sku;
    const upc = p.upc || id.upc;

    const vals = [brand, model, sku, upc, p.description];
    const $firstTableVals = $('#product-detail table').first().find('tr td:last-child');
    $firstTableVals.each(function (i) {
      if (i < vals.length) $(this).text(dppNorm(vals[i]));
    });

    const $dppLink = $('table a[target="_blank"]').first();
    if ($dppLink.length) {
      const href = dppNorm(
        p.dppUrl ||
          (p.documentation && p.documentation.instructionManual && p.documentation.instructionManual.url) ||
          ''
      );
      if (href === NA) $dppLink.replaceWith($('<span/>', { text: NA }));
      else $dppLink.attr('href', href);
    }
  }

  function dppInitTooltips(scope) {
    scope = scope || document;
    if (!window.bootstrap || typeof window.bootstrap.Tooltip !== 'function') return;
    [].slice.call(scope.querySelectorAll('[data-bs-toggle="tooltip"]')).forEach(function (el) {
      const inst = window.bootstrap.Tooltip.getInstance(el);
      if (inst) inst.dispose();
      new window.bootstrap.Tooltip(el);
    });
  }

  let dppMap = null;
  function dppInitMap() {
    const $map = $('#map');
    if (!$map.length || typeof L === 'undefined') return;
    dppMap = L.map('map').setView([41.806, -6.757], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(dppMap);
    L.marker([41.806, -6.757])
      .addTo(dppMap)
      .bindPopup('<b>Instituto Politécnico de Bragança</b><br>Manufacturing Location')
      .openPopup();
  }

  $(document)
    .off('shown.bs.tab.dpp', 'button[data-bs-target="#productiondata"]')
    .on('shown.bs.tab.dpp', 'button[data-bs-target="#productiondata"]', function () {
      if (dppMap) dppMap.invalidateSize();
    });

  const DPP_OP_ID = {
    conveyorCount: '#conveyorCount',
    position_in_sequence: '#position_in_sequence',
    number_of_pieces: '#number_of_pieces',
    last_piece_time: '#last_piece_time',
    motor_operating_time: '#motor_operating_time',
    motor_status: '#motor_status',
    input_sensor_status: '#input_sensor_status',
    output_sensor_status: '#output_sensor_status',
    vibration: '#vibration',
    current: '#current',
    battery_level: '#battery_level',
    update_date: '#update_date'
  };

  function dppStyleStatus($el, value) {
    if (!$el || !$el.length) return;
    $el.removeClass('text-success text-danger');
    const v = String(value).toLowerCase();
    if (v.includes('ligado') || v.includes('ativo')) $el.addClass('text-success');
    else if (value !== NA) $el.addClass('text-danger');
  }

  function updateHomeData(data) {
    if (!data || typeof data !== 'object') return;

    const mapped = {
      conveyorCount: data.conveyor_count ?? data.conveyorCount,
      position_in_sequence: dppNorm(data.position_in_sequence),
      number_of_pieces: dppIsEmpty(data.pieces_transported) ? '0' : String(data.pieces_transported),
      last_piece_time: dppFmtSeconds(data.last_piece_time),
      motor_operating_time: dppFmtSeconds(data.motor_operating_time),
      motor_status: dppBool(!!(data.motor_on ?? data.motorStatus), 'Ligado', 'Desligado'),
      input_sensor_status: dppBool(!!(data.input_sensor ?? data.inputSensor), 'Ativo', 'Inativo'),
      output_sensor_status: dppBool(!!(data.output_sensor ?? data.outputSensor), 'Ativo', 'Inativo'),
      vibration: dppUnit(data.vibration, 'm/s²'),
      current: dppUnit(data.current, 'A'),
      battery_level: dppIsEmpty(data.battery_level) ? NA : `${data.battery_level}%`,
      update_date: dppFmtStamp(data.update_date || Date.now())
    };

    $.each(mapped, function (k, v) {
      const $el = $(DPP_OP_ID[k]);
      if (!$el.length) return;
      $el.text(dppNorm(v));
      if (/(status|motor_status)/.test(k)) dppStyleStatus($el, v);
    });

    dppToastUpdated();
  }
  window.updateHomeData = updateHomeData;

  function dppToastUpdated() {
    const $t = $(`
      <div class="position-fixed bottom-0 end-0 p-3" style="z-index:1080">
        <div class="toast show align-items-center text-bg-light border-0 shadow">
          <div class="d-flex">
            <div class="toast-body">Dados operacionais atualizados</div>
            <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>
      </div>`);
    $('body').append($t);
    setTimeout(function () {
      $t.find('.toast').removeClass('show');
      setTimeout(function () {
        $t.remove();
      }, 400);
    }, 2200);
  }

  function dppInitMqtt() {
    if (typeof mqtt === 'undefined') {
      console.warn('mqtt.min.js não encontrado. Inclua antes deste arquivo.');
      return;
    }

    const topic = dppDeriveTopic();

    if (window._mqttClient) {
      const c = window._mqttClient;
      if (window._mqttTopic && window._mqttTopic !== topic) {
        try {
          c.unsubscribe(window._mqttTopic);
        } catch (e) {}
      }
      c.subscribe(topic, { qos: 0 }, function (err) {
        if (err) console.error('[MQTT] erro ao inscrever:', err);
      });
      window._mqttTopic = topic;
      return;
    }

    const opts = {
      clientId: 'dpp-conveyor-' + Math.random().toString(16).slice(2, 10),
      reconnectPeriod: window.DPP_CFG.RECONNECT_BASE_MS,
      keepalive: 60,
      clean: true
    };

    const client = mqtt.connect(window.DPP_CFG.BROKER_URL, opts);
    let backoff = window.DPP_CFG.RECONNECT_BASE_MS;

    client.on('connect', function () {
      console.log('[MQTT] conectado:', window.DPP_CFG.BROKER_URL, 'topic:', topic);
      backoff = window.DPP_CFG.RECONNECT_BASE_MS;
      client.subscribe(topic, { qos: 0 }, function (err) {
        if (err) console.error('[MQTT] erro ao inscrever:', err);
      });
      window._mqttTopic = topic;
    });

    client.on('reconnect', function () {
      backoff = Math.min(backoff * 1.5, window.DPP_CFG.RECONNECT_CAP_MS);
      client.options.reconnectPeriod = backoff;
      console.log('[MQTT] tentando reconectar…', backoff, 'ms');
    });

    client.on('close', function () {
      console.log('[MQTT] conexão fechada');
    });
    client.on('error', function (err) {
      console.error('[MQTT] erro:', err?.message || err);
    });

    client.on('message', function (t, msg) {
      if (t !== window._mqttTopic) return;
      try {
        const data = JSON.parse(msg.toString());
        updateHomeData(data);
      } catch (e) {
        console.error('[MQTT] JSON inválido:', e);
      }
    });

    window._mqttClient = client;
  }

  function dppBoot() {
    const $scope = $('#product-detail').length ? $('#product-detail') : $(document.body);
    dppApplyFallbacks($scope);
    dppHydrateFromProductData();
    dppInitTooltips(document);
    dppInitMap();
    dppInitMqtt();
  }

  $(document).ready(function () {
    dppBoot();
  });
}
