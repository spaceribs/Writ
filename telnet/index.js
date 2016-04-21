"use strict";

var telnet = require('telnet');
var fs = require('fs');

function readModuleFile(path, callback) {
    try {
        var filename = require.resolve(path);
        fs.readFile(filename, 'utf8', callback);
    } catch (e) {
        callback(e);
    }
}

telnet.createServer(function(client) {

    // make unicode characters work properly
    client.do.transmit_binary();

    // make the client emit 'window size' events
    client.do.window_size();

    // listen for the window size events from the client
    client.on('window size', function(e) {
        if (e.command === 'sb') {
            console.log('telnet window resized to %d x %d', e.width, e.height);
        }
    });

    var currentBuffer;
    // listen for the actual data from the client
    client.on('data', function(b) {
        switch (b.readUInt8()) {
        case 13:
            client.write(
                '\x08\x08\x7f\x7f\n\n' +
                currentBuffer.toString() +
                '\n> '
            );
            currentBuffer = null;
            break;
        default:
            if (currentBuffer) {
                currentBuffer = Buffer.concat([currentBuffer, b]);
            } else {
                currentBuffer = b;
            }
            break;
        }
    });

    readModuleFile('./banner.txt', function(err, banner) {
        client.write('\n' +
            banner +
            '\n\n' +
            'Session Started' +
            '\n> ');
    });

}).listen(23);