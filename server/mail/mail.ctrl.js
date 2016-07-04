'use strict';

var nodemailer = require('nodemailer');
var Promise = require('lie');

/**
 * Send an email using the current nodemailer configuration.
 *
 * @param {object} message - object containing user information and
 * the message to send.
 * @returns {Promise}
 */
function send(message) {
    var config = require('../config.json');
    var transporter = nodemailer.createTransport(config.email);

    return new Promise(function(resolve, reject) {
        transporter.sendMail(message,
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
    });
}

module.exports = {
    send: send
};
