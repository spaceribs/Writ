'use strict';

var PouchDB = require('pouchdb');
var Database = require('../../db');
var userModel = require('../../models').db.user;
var jsf = require('json-schema-faker');
var uuid = require('node-uuid');
var util = require('./users.util');
var memdown = require('memdown');
var Promise = require('lie');

var pouchAllDocs = PouchDB.prototype.allDocs;

/**
 * Plugin to test database error handling on allDocs.
 *
 * @param {object} options - allDocs options.
 * @param {function} callback - Callback for allDocs operation.
 * @returns {*}
 */
function ErrorTestPlugin(options, callback) {

    callback = function() {};

    if (module.exports.mockError) {
        return new Promise(function(resolve, reject) {
            reject(new Error('TestError'));
        });
    } else {
        return pouchAllDocs.call(this, options, callback);
    }

}

PouchDB.plugin({allDocs: ErrorTestPlugin});

var Users = new Database('Mock-Users', {
    db: memdown
});

/**
 *
 *
 * @param {int} permission - Permission level to set for this user.
 * @param {boolean} invalid - Put some strange parameters in for validation.
 * @returns {Promise}
 */
function mockUser(permission, invalid) {

    var user = jsf(userModel);
    var password = 'test_password';

    user.password = password;
    user.permission = permission;
    user.secret = uuid.v4();
    user.id = user._id.match(/^user\/([a-z0-9-]+)$/)[1];
    delete user._rev;

    util.processPassword(user);

    if (invalid) {
        user.weird = 'yep';
        user.odd = true;
    }

    return Users.put(user)
        .then(function() {
            user.password = password;
            return user;
        });

}

module.exports = Users;
module.exports.mockUser = mockUser;
module.exports.mockError = false;
