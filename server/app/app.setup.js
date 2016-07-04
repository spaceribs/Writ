'use strict';

var inquirer = require('inquirer');
var fs = require('fs');
var Promise = require('lie');
var path = require('path');
var uuid = require('node-uuid');

var util = require('./app.util');
var Users = require('../users/users.db');
var Places = require('../places/places.db');
var roles = require('../roles');

var adminId;
var lobbyId;

var test = new Promise(function(resolve, reject) {

    var banner = path.resolve(__dirname + '/../banner.txt');

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
    process.stdout.write('\nPlease answer the following questions ' +
        'to set up your server:\n\n');

    return inquirer.prompt([
        {
            type   : 'input',
            name   : 'name',
            message: 'Admin Username:'
        },
        {
            type   : 'input',
            name   : 'email',
            message: 'Admin Email:'
        },
        {
            type   : 'password',
            name   : 'password',
            message: 'Admin Password:'
        }
    ]);

}).then(function(userData) {

    util.processPassword(userData);

    userData.secret = uuid.v4();
    userData.id = uuid.v4();
    userData._id = 'user/' + userData.id;
    userData.created = new Date().toISOString();
    userData.updated = new Date().toISOString();
    userData.permission = roles.admin;

    return Users.put(userData);

}).then(function(result) {

    adminId = result.id;
    process.stdout.write('\nAdmin Setup Successful!\n\n');

    return inquirer.prompt([
        {
            type   : 'input',
            name   : 'name',
            default: 'Lobby',
            message: 'Lobby Name:'
        },
        {
            type   : 'editor',
            name   : 'desc',
            default: 'You are in the lobby.',
            message: 'Lobby Description:'
        }
    ]);

}).then(function(placeData) {

    placeData.pos = {x: 0, y: 0, z: 0};
    placeData.id = uuid.v4();
    placeData._id = 'place/' + placeData.id;
    placeData.owner = adminId;
    placeData.created = new Date().toISOString();
    placeData.updated = new Date().toISOString();

    return Places.put(placeData);

}).then(function(result) {

    lobbyId = result.id;
    process.stdout.write('\nLobby Setup Successful!\n\n');

    return inquirer.prompt([
        {
            type   : 'input',
            name   : 'port',
            default: '8000',
            message: 'Server Port:'
        },
        {
            type   : 'input',
            name   : 'hostname',
            default: 'http://localhost:8000',
            message: 'Server Hostname:'
        },
        {
            type   : 'input',
            name   : 'serverEmail',
            message: 'Server Email:'
        },
        {
            type   : 'input',
            name   : 'emailService',
            default: 'Gmail',
            message: '(http://nodemailer.com/2-0-0-beta/' +
            'setup-smtp/well-known-services/)\n  Email Service:'
        },
        {
            type   : 'input',
            name   : 'emailUsername',
            message: 'Email Username:'
        },
        {
            type   : 'password',
            name   : 'emailPassword',
            message: 'Email Password:'
        }
    ]);

}).then(function(result) {

    var config = {
        lobby   : lobbyId,
        admin   : adminId,
        from    : result.serverEmail,
        port    : parseInt(result.port),
        hostname: result.hostname,
        email   : {
            service: result.emailService,
            auth   : {
                user: result.emailUsername,
                pass: result.emailPassword
            }
        }
    };

    var configPath = path.resolve(__dirname + '/../config.json');

    return new Promise(function(resolve, reject) {
        fs.writeFile(configPath,
            JSON.stringify(config, null, 4), function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
    });

}).then(function() {
    process.stdout.write('\nWrit Configuration Completed!\n\n');
    return require('../config.json');

}).catch(function(err) {
    throw err;

});

module.exports = test;
