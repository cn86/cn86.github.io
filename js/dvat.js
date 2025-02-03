function set_current_run_log(value) {
    let current_run_log = document.getElementById('current_run_log');
    current_run_log.innerHTML = value.join(' ');
}

function set_current_time(value) {
    let current_time = document.getElementById('current_time');
    current_time.innerHTML = value.toFixed(1);
}

function set_current_distance(value) {
    let current_distance = document.getElementById('current_distance');
    current_distance.innerHTML = value.toFixed(1);
}

function set_max_velocity(value) {
    let max_velocity = document.getElementById('max_velocity');
    max_velocity.innerHTML = value.toFixed(1);
}

function set_current_velocity(value) {
    let current_velocity = document.getElementById('current_velocity');
    current_velocity.innerHTML = value.toFixed(1);
}

function set_current_acceleration(value) {
    let current_acceleration = document.getElementById('current_acceleration');
    current_acceleration.innerHTML = value.toFixed(1);
}

function set_bluetooth_status(value) {
    let current_acceleration = document.getElementById('bluetooth_status');
    current_acceleration.innerHTML = value;
}

var rsc_characteristic;

function start_bluetooth() {
    let serviceUuid = 'running_speed_and_cadence';
    let characteristicUuid = 'rsc_measurement';

    set_bluetooth_status('Requesting Bluetooth Device...');
    navigator.bluetooth.requestDevice({
            filters: [{
                services: [serviceUuid]
            }]
        })
        .then(device => {
            set_bluetooth_status('Connecting to GATT Server...');
            return device.gatt.connect();
        })
        .then(server => {
            set_bluetooth_status('Getting Service...');
            return server.getPrimaryService(serviceUuid);
        })
        .then(service => {
            set_bluetooth_status('Getting Characteristic...');
            return service.getCharacteristic(characteristicUuid);
        })
        .then(characteristic => {
            rsc_characteristic = characteristic;
            return rsc_characteristic.startNotifications().then(_ => {
                set_bluetooth_status('Notifications started');
                rsc_characteristic.addEventListener('characteristicvaluechanged',
                    handle_notifications);
            });
        })
        .catch(error => {
            set_bluetooth_status('Error! ' + error);
        });
}

function stop_bluetooth() {
    if (rsc_characteristic) {
        rsc_characteristic.stopNotifications()
            .then(_ => {
                set_bluetooth_status('Notifications stopped');
                rsc_characteristic.removeEventListener('characteristicvaluechanged',
                    handle_notifications);
            })
            .catch(error => {
                set_bluetooth_status('Error! ' + error);
            });
    }
}

function get_velocity_from_event(event) {
    // convert from m/s to mph
    return (event.target.value.getUint16(1, true) / 256.0 * 3600.0 / 1609.34)
}

function handle_notifications(event) {
    let velocity = get_velocity_from_event(event);
    let timestamp = event.timeStamp / 1000.0;
    handle_run_data([timestamp, velocity]);
}


let velocity_vs_time_canvas = document.getElementById('velocity_vs_time');
velocity_vs_time_canvas.width = 600;
velocity_vs_time_canvas.height = 400;


const dvat_graph_config = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Velocity',
            backgroundColor: 'rgb(74, 219, 255)',
            borderColor: 'rgb(74, 219, 255)',
            data: [],
        }]
    },
    options: {
        scales: {
            x: {
                beginAtZero: true,
                type: 'linear',
            }
        }
    }

};

let dvat_graph = new Chart(
    velocity_vs_time_canvas,
    dvat_graph_config
);

let current_run_data = [];
let previous_run_data = [];
let first_timestamp = 0.0;
let last_timestamp = 0.0;
let max_velocity = 0.0;

function handle_run_data(run_data) {
    let velocity = run_data[1];
    let timestamp = run_data[0];
    if (velocity > 0) {
        if (current_run_data.length == 0) {
            reset_chart();
            first_timestamp = timestamp;
            last_timestamp = timestamp;
            current_run_data.push([timestamp, velocity]);
            set_current_velocity(velocity);
            set_current_time(0.0);
            add_data(dvat_graph, 0.0, velocity);
        }
        if ((timestamp - last_timestamp) >= 0.1) {
            set_current_velocity(velocity);
            set_current_time(timestamp - first_timestamp);
            add_data(dvat_graph, timestamp - first_timestamp, velocity);
            current_run_data.push([timestamp, velocity]);
            last_timestamp = timestamp;
        }
        max_velocity = Math.max(velocity, max_velocity);
        set_max_velocity(max_velocity);
    } else {
        if (current_run_data.length > 0) {
            current_run_data = [];
        }
    }
}

function reset_chart() {
    dvat_graph.data.labels = [];
    dvat_graph.data.datasets.forEach((dataset) => {
        dataset.data = [];
    });
    dvat_graph.destroy();
    dvat_graph = new Chart(
        velocity_vs_time_canvas,
        dvat_graph_config
    );
}

function add_data(chart, timestamp, velocity) {
    chart.data.labels.push(timestamp);
    chart.data.datasets.forEach((dataset) => {
        dataset.data.push(velocity);
    });
    chart.update();
}
