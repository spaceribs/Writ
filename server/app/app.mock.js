'use strict';

var mockery = require('mockery');

module.exports = {
    enable: function() {
        mockery.enable({
            warnOnReplace     : false,
            warnOnUnregistered: false
        });

        mockery.registerSubstitute(
            '../passages/passages.db', '../passages/passages.db.mock');
        mockery.registerSubstitute(
            '../places/places.db', '../places/places.db.mock');
        mockery.registerSubstitute(
            '../users/users.db', '../users/users.db.mock');
        mockery.registerSubstitute(
            '../mail/mail.ctrl', '../mail/mail.ctrl.mock');
        mockery.registerSubstitute(
            '../config.json', '../mocks/config.json');
    },
    disable: function() {
        mockery.deregisterAll();
        mockery.disable();
    }
};
