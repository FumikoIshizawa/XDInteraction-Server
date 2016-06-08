var WebSocketServer = require('ws').Server;

XDserver = new WebSocketServer({port:5001});
console.log('open initserver');

function user(name, device, ws) {
    this.name = name;
    this.device = device;
    this.ws = ws;
}

var connections = {};
// setInterval(disconnect_check, 10000);

var log4js = require('log4js');
log4js.configure('logger.json');
var biplogger = log4js.getLogger('bip');
var actionLogger = log4js.getLogger('action');


XDserver.on('connection', function(ws) {
        
    ws.on('message', function(data) {
        //console.log(data)
        try {
            var parsed_data = JSON.parse(data);

            if (parsed_data.type == 'open') {
                console.log('Connecte Device: ' + data);
                connections[parsed_data.name] = new user(parsed_data.name, parsed_data.device, ws);
                broadcast_userdata(user_list());
            } else if (parsed_data.type == 'com') {
                console.log('Communication: ' + data);
                send_command(parsed_data);
            } else if (parsed_data.type == 'bip') {
                console.log('Actions: changed');
                bip_log(data, parsed_data.origin);
            } else if (parsed_data.type == 'connect') {
                var message = 'Start logging: ' + parsed_data.from + ' to ' + parsed_data.to;
                console.log(message);
                actionLogger.info(message);
                biplogger.info(message);
                connections[parsed_data.from].ws.send(JSON.stringify({type:'connected'}));
            } else if (parsed_data.type == 'disconnect') {
                var message = 'Stop logging: ' + parsed_data.from + ' to ' + parsed_data.to;
                console.log(message);
                actionLogger.info(message);
                biplogger.info(message);
                connections[parsed_data.from].ws.send(JSON.stringify({type:'disconnected'}));
            } else if (parsed_data.type == 'custom') {
                var message = 'Custom Message: ' + parsed_data.detail + '(' + parsed_data.from + ')';
                console.log(message);
                actionLogger.info(message);
                biplogger.info(message);
            }
        } catch (e) {
            try {
                connections[data.origin].ws.send(JSON.stringify({type:'error',
                                                                 number: '1',
                                                                 detail: 'Please send JSON message.'}));
                console.log('Error: this is not JSON style from ' + data.origin);
            } catch (e) {
                console.log('Error: origin user is not defined.')
            }
        }
    });

    ws.on('close', function(code, message) {
        for (var key in connections) {
            if (connections[key].ws == ws) {
                console.log('Disconnect Device: ' + connections[key].name);
                delete connections[key];
                break; 
            }
        }

        broadcast_userdata(user_list());
    });
});

// Return the lists of connection devices and its device's name
function user_list() {　
    var array_name = [];
    var array_device = [];

    for (var key in connections) {
        array_name.push(connections[key].name);
        array_device.push(connections[key].device);
    }
    var data = {type:'users', names:array_name, devices:array_device};
    return data;
};

// Return User data {type = 'users', yourid, ids, names, devices}
function broadcast_userdata(data) {
    for (var key in connections) {
        connections[key].ws.send(JSON.stringify(data));
    }
};

function send_command(data) {
    if (!(data.dst in connections)) {
        connections[data.origin].ws.send(JSON.stringify({type:'error',
                                                         number: '0',
                                                         detail: 'There is no such client:' + data.dst}));
        console.log('Error: connect to no exist client: ' + data.origin + ' -> ' + data.dst);
        return;
    }

    if (data.command == 'scroll' || data.command == 'size' || data.command == 'text' || data.command == 'page') {
        if (data.window == '1' || data.window == 'both') {
            connections[data.dst].ws.send(JSON.stringify({type: 'com',
                                                      command: data.command,
                                                      detail: data.detail,
                                                      window: '1', 
                                                      origin: data.origin}));
            actionLogger.info('command: ' + data.command + ' ' + data.detail + ' (window1) from ' + data.origin + ' to ' + data.dst);
        } 
        if (data.window == '2' || data.window == 'both') {
            connections[data.dst].ws.send(JSON.stringify({type: 'com',
                                                      command: data.command,
                                                      detail: data.detail,
                                                      window: '2', 
                                                      origin: data.origin}));
            actionLogger.info('command: ' + data.command + ' ' + data.detail + ' (window2) from ' + data.origin + ' to ' + data.dst);
        } 
    }
};

function bip_log(data, origin) {
    biplogger.info(origin + '\n' + data);   
}
