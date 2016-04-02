'use strict';

var nodemailer = require('nodemailer');
var mockTransporter = require('nodemailer-mock-transport');
var transport = mockTransporter();
var transporter = nodemailer.createTransport(transport);
var Promise = require('lie');

/**
 * Send a mock email for testing.
 *
 * @param {object} message - object containing user information and
 * the message to mock send.
 * @returns {Promise}
 */
function send(message) {
    return new Promise(function(resolve, reject) {
        transporter.sendMail(message,
            function(err) {
                if (err || module.exports.testError) {
                    reject(err || new Error('testError'));
                } else {
                    resolve();
                }
            });
    });
}

module.exports = {
    send: send,
    sent: transport.sentMail,
    testError: false
};
