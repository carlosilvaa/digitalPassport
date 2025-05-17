// apps/home/static/home/js/conveyor-passport.js
let map;

function initMap() {
    map = L.map('map').setView([41.806, -6.757], 15); // Coordenadas para Bragança, Portugal

    // Adicionar tiles do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Adicionar um marcador para a localização de fabricação
    L.marker([41.806, -6.757]).addTo(map)
        .bindPopup('<b>Instituto Politécnico de Bragança</b><br>Manufacturing Location')
        .openPopup();
}

$('button[data-bs-target="#productiondata"]').on('shown.bs.tab', function () {
    if (map) {
        map.invalidateSize(); // Forçar o Leaflet a recalcular o tamanho do mapa
    }
});

function updateHomeData(data) {
    // Mapeamento de campos para atualização
    const fieldMap = {
        'conveyorCount': data.conveyor_count !== undefined ? data.conveyor_count : 'N/A',
        'position_in_sequence': data.position_in_sequence || 'N/A',
        'number_of_pieces': data.pieces_transported || '0',
        'last_piece_time': data.last_piece_time ? data.last_piece_time + ' s' : 'N/A',
        'motor_operating_time': data.motor_operating_time ? data.motor_operating_time + ' s' : 'N/A',
        'motor_status': data.motor_on ? "ON" : "OFF",
        'input_sensor_status': data.input_sensor ? "Active" : "Inactive",
        'output_sensor_status': data.output_sensor ? "Active" : "Inactive",
        'vibration': data.vibration ? data.vibration + ' m/s²' : 'N/A',
        'current': data.current ? data.current + ' A' : 'N/A',
        'battery_level': data.battery_level ? data.battery_level + '%' : 'N/A',
        'update_date': new Date().toLocaleString()
    };

    // Atualiza cada campo com jQuery
    $.each(fieldMap, function(id, value) {
        const $element = $('#' + id);
        if($element.length) {
            $element.text(value);
            
            // Aplica estilos condicionais
            if(id.includes('status') || id.includes('sensor')) {
                $element.removeClass('text-success text-danger')
                       .addClass(
                           value.includes('ON') || value.includes('Active') 
                               ? 'text-success' 
                               : 'text-danger'
                       );
            }
        }
    });

    // Feedback visual de atualização
    showUpdateNotification();
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
    
    setTimeout(function() {
        $toast.find('.toast').removeClass('show');
        setTimeout(function() { $toast.remove(); }, 500);
    }, 3000);
}

$(document).ready(function() {
    // Conexão MQTT
    const client = mqtt.connect('wss://test.mosquitto.org:8081', {
        clientId: 'conveyor-passport-' + Math.random().toString(16).substr(2, 8)
    });

    client.on('connect', function() {
        console.log('Connected to MQTT Broker');
        client.subscribe('conveyor3/status');
    });

    client.on('message', function(topic, message) {
        try {
            const data = JSON.parse(message.toString());
            if(topic === 'conveyor3/status') {
                updateHomeData(data);
            }
        } catch (e) {
            console.error('Error parsing MQTT message:', e);
        }
    });

    initMap();
});