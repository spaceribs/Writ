'use strict';

var Database = require('../../db');
var util = require('./users.util');
var memdown = require('memdown');

var rootUser = {
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'root',
    permission: 10
};
util.processPassword(rootUser);

var Users = new Database('Mock-Users', {
    db: memdown
});
Users.put(rootUser);

module.exports = Users;
