'use strict';

var Database = require('../../db');
var models = require('../../models');
var jsf = require('json-schema-faker');
var uuid = require('node-uuid');
var util = require('../app/app.util');
var memdown = require('memdown');

var Users = new Database('Mock-Users', {
    db: memdown
});

/**
 * Create a mock user for testing.
 *
 * @param {int} permission - Permission level to set for this user.
 * @param {boolean=} invalid - Put some strange parameters in for validation.
 * @returns {Promise}
 */
function mockUser(permission, invalid) {

    var user = jsf(models.db.user, models.refs);
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

/**
 * Create mock users for testing.
 *
 * @returns {Promise}
 */
function mockUsers() {

    var users = {};

    return mockUser(10)
        .then(function(verifiedUser) {
            users.adminUser = verifiedUser;
            return mockUser(20);
        })
        .then(function(verifiedUser) {
            users.verifiedUser = verifiedUser;
            return mockUser(30);
        })
        .then(function(unverifiedUser) {
            users.unverifiedUser = unverifiedUser;
            return mockUser(20, true);
        })
        .then(function(invalidUser) {
            users.invalidUser = invalidUser;
            return users;
        });

}

module.exports = Users;
module.exports.mockUser = mockUser;
module.exports.mockUsers = mockUsers;
