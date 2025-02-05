function ms_to_s(time) {
    return time / 1000
}

function h_to_s(time) {
    return time * 60 * 60
}

function meters_to_yards(distance) {
    return distance * 1706 / 1609.34
}

function meters_to_miles(distance) {
    return distance / 1609.34
}

function mps_to_mph(speed) {
    return meters_to_miles(speed) / h_to_s(1)
}


function set_timer(duration) {
    let timer_interval = setInterval(() => {
            current_time += 100;
            if (current_time >= duration) {
                clearInterval(timer_interval);
                play_tone();
            }
            set_current_time(current_time);
        },
        100)
}

function play_tone() {
    if (tone_on) {
        let dvat_timer_player = document.getElementById("dvat-timer-player");
        dvat_timer_player.play();
    }
}

function set_current_run_log(value) {
    let current_run_log = document.getElementById('current_run_log');
    current_run_log.innerHTML = value.join(' ');
}

function set_current_time(value) {
    let current_time = document.getElementById('current_time');
    current_time.innerHTML = ms_to_s(value).toFixed(1);
}

function set_current_distance(value) {
    let current_distance = document.getElementById('current_distance');
    current_distance.innerHTML = value.toFixed(1) + ' (' + (value * .95).toFixed(1) + ')';
}

function set_max_velocity(value) {
    let max_velocity = document.getElementById('max_velocity');
    max_velocity.innerHTML = value.toFixed(2) + ' (' + (value * .95).toFixed(2) + ')';
}

function set_current_velocity(value) {
    let current_velocity = document.getElementById('current_velocity');
    current_velocity.innerHTML = value.toFixed(2);
}

function set_max_velocity_time(value) {
    let max_velocity_time = document.getElementById('max_velocity_time');
    max_velocity_time.innerHTML = ms_to_s(value).toFixed(1);
}

function set_max_acceleration(value) {
    let max_acceleration = document.getElementById('max_acceleration');
    max_acceleration.innerHTML = value.toFixed(2) + ' (' + (value * .95).toFixed(2) + ')';
}

function set_bluetooth_status(value) {
    let bluetooth_status = document.getElementById('bluetooth_status');
    bluetooth_status.innerHTML = value;
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
    return (event.target.value.getUint16(1, true) / 256.0)
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
            },
            y: {
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
let last_velocity = 0.0;
let max_velocity = 0.0;
let current_time = 0.0; // milliseconds
let current_distance = 0.0; // meters
let max_acceleration = 0.0; // m/s/s
let time_at_velocity_lookup = {};
let tone_on = true;

function reset_dvat_config() {
    last_velocity = 0.0;
    max_velocity = 0.0;
    current_time = 0.0;
    current_distance = 0.0;
    max_acceleration = 0.0;
    time_at_velocity_lookup = {};
    tone_on = true;
}


function handle_notifications(event) {
    let timestamp = event.timeStamp;
    let velocity = get_velocity_from_event(event);
    handle_run_data([timestamp, velocity]);
}


function handle_run_data(run_data) {
    let timestamp = run_data[0];
    let velocity = run_data[1];
    let deck_size_select = document.getElementById("dvat-timer-select");
    duration = parseInt(deck_size_select.value) * 1000;

    // Run is starting.
    if (velocity > 0 & current_run_data.length == 0) {
        reset_chart();
        reset_dvat_config();
        // 270 ms is the typical time between samples.
        first_timestamp = timestamp - 270;
        last_timestamp = timestamp - 270;
        current_run_data.push([0, 0.0]);
        add_data(dvat_graph, 0.0, 0.0);
        set_current_velocity(0.0);
        set_timer(duration);
    }
    // Reset data if exists. End rep early.
    if (current_run_data.length > 0 & (velocity <= .01 & last_velocity <= .01)) {
        current_run_data = [];
        current_time = duration;
        timestamp = duration + 1;
        tone_on = false;
    }
    if ((timestamp - first_timestamp) <= duration) {
        let timestamp_diff = timestamp - last_timestamp;
        if (timestamp_diff >= 100) {
            set_current_velocity(velocity);
            add_data(dvat_graph, timestamp - first_timestamp, velocity);
            current_run_data.push([timestamp, velocity]);
            current_distance += ms_to_s(timestamp_diff) * (velocity + last_velocity) / 2;
            set_current_distance(current_distance);
            max_acceleration = Math.max(max_acceleration, (velocity - last_velocity) / ms_to_s(timestamp_diff))
            set_max_acceleration(max_acceleration);
            last_timestamp = timestamp;
            last_velocity = velocity;
            time_at_velocity_lookup[velocity] = (timestamp - first_timestamp);
            max_velocity = Math.max(velocity, max_velocity);
            set_max_velocity(max_velocity);
            set_max_velocity_time(time_at_velocity_lookup[max_velocity]);
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
    // timestamp in milliseconds. rescale to make reasonable.
    chart.data.labels.push(ms_to_s(timestamp));
    chart.data.datasets.forEach((dataset) => {
        dataset.data.push(velocity);
    });
    chart.update();
}
