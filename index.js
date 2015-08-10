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

XDserver.on('connection', function(ws) {
        
    ws.on('message', function(data) {
        try {
            var parsed_data = JSON.parse(data);

            // Initialize Client's setting
            // Protocol: initialize {type = 'open', name, device}
            if (parsed_data.type == 'open') {
                console.log('Connected: ' + data);
                connections[parsed_data.name] = new user(parsed_data.name, parsed_data.device, ws);
                broadcast_userdata(user_list()) ;

            // Communication between clients
            // communication {type = 'com', command, detail, dst, origin}
            } else if (parsed_data.type == 'com') {
                console.log('Communication: ' + data);
                send_command(parsed_data);
            }
        } catch (e) {
            connections[data.origin].ws.send(JSON.stringify({type:'error', 
                                                         number: '1',
                                                         detail: 'Please send JSON message.'}));
            console.log('Error: This is not JSON style from ' + data.origin);
        }
    });

    ws.on('close', function(code, message) {
        for (var key in connections) {
            if (connections[key].ws == ws) {
                console.log('Disconnect: ' + connections[key].name);
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

    if (data.command == 'scroll' || data.command == 'zoom' || data.command == 'text' || data.command == 'page') {
        connections[data.dst].ws.send(JSON.stringify({type:data.command, 
                                                      detail:data.detail,
                                                      window: data.window, 
                                                      origin:data.origin}));
    }
};
