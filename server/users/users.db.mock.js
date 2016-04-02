'use strict';

var Database = require('../../db');
var userModel = require('../../models').db.user;
var jsf = require('json-schema-faker');
var uuid = require('node-uuid');
var util = require('./users.util');
var memdown = require('memdown');

var Users = new Database('Mock-Users', {
    db: memdown
});

/**
 *
 *
 * @param {int=} permission - Permission level to set for this user.
 * @returns {Promise}
 */
function mockUser(permission) {

    var user = jsf(userModel);
    var password = 'test_password';

    user.password = password;
    user.permission = permission || 100;
    user.secret = uuid.v4();
    user.id = user._id.match(/^user\/([a-z0-9-]+)$/)[1];
    delete user._rev;

    util.processPassword(user);

    return Users.put(user)
        .then(function() {
            user.password = password;
            return user;
        });

}

module.exports = Users;
module.exports.mockUser = mockUser;
