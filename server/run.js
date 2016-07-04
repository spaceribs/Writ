'use strict';

var Promise = require('lie');
var fs = require('fs');
var path = require('path');
var app = require('./app/app');

module.exports = new Promise(function(resolve, reject) {
    var configFile = path.resolve(__dirname + '/config.json');

    fs.stat(configFile, function(err, data) {
        if (err) {
            reject(err);
        } else {
            resolve(data);
        }
    });

}).then(function(result) {
    // config exists
    return require('./config.json');

}).catch(function(err) {
    // config does not exist
    // run setup script
    if (err.code === 'ENOENT') {
        return require('./app/app.setup');
    } else {
        throw err;
    }

}).then(function(config) {

    return new Promise(function(resolve, reject) {

        var banner = path.resolve(__dirname + '/banner.txt');

        fs.readFile(banner, function(err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data.toString('utf8'));
            }
        });

    }).then(function(banner) {
        process.stdout.write('\x1B[2J\x1B[0f');
        process.stdout.write(banner);
        process.stdout.write('\nStarting Writ Server at ' + config.hostname + '\n\n');

        app.listen(config.port);
        return app;
    });

}).catch(function(err) {
    throw err;

});
