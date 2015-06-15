var WebSocketServer = require('ws').Server;

init_server = new WebSocketServer({port:5001});
console.log('open initserver');

// com_server = new WebSocketServer({port:5002});
// console.log('open comserver');

function user(id, name, device, ws) {
    this.id = id;
    this.name = name;
    this.device = device;
    this.ws = ws;
}

var connections = {};
var connection_count = 0;

// initialize client's setting
// Protocol: 'open' {type, name, device}
// 'com' {type, command, detail, dst, origin}
init_server.on('connection', function(ws) {
        
    ws.on('message', function(data) {
        console.log(data);
        var parsed_data = JSON.parse(data);

        console.log('received %s', parsed_data.type);
        if (parsed_data.type == 'open') {
            connections[connection_count] = new user(connection_count, parsed_data.name, parsed_data.device, ws);
            connection_count = connection_count + 1; 

            // Return the lists of connection devices and its device's name
            broadcast_userdata(user_list()) ;
        } else if (parsed_data.type == 'com') {
            console.log('received: %s, %s', parsed_data.command, parsed_data.detail);
            send_command(parsed_data);
        }
    });
});

function user_list() {　
    var array_id = [];
    var array_name = [];
    var array_device = [];

    for (var i = 0; i < connection_count; i++) {
        array_id.push(connections[i].id);
        array_name.push(connections[i].name);
        array_device.push(connections[i].device);
    }
    var data = {type:'users', yourid:connection_count - 1, ids:array_id, names:array_name, devices:array_device};
    console.log(data);
    return data;
};

function broadcast_userdata(data) {
    for (var i = 0; i < connection_count; i++) {
        connections[i].ws.send(JSON.stringify(data));
    }
};

function send_command(data) {
    if (data.command == 'swipe' || data.command == 'key' || data.command == 'mouse') {
        connections[data.dst].ws.send(JSON.stringify({type:data.command, 
                                                      detail:data.detail, 
                                                      origin:data.origin}));
    } 
};

// com_server.on('connection', function(ws) {
//     ws.on('message', function(message) {
//         console.log('received: %s', message);
//         message = 'User1: ' + message;

//         ws.send(message);

//     });

// });
