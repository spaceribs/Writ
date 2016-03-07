'use strict';

var Database = require('../../db');
var uuid = require('node-uuid');
var util = require('./users.util');
var memdown = require('memdown');

var rootUser = {
    id: 'ef288553-635a-44a7-ab7d-3404bebc02a5',
    _id: 'user/ef288553-635a-44a7-ab7d-3404bebc02a5',
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
