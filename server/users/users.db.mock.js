'use strict';

var Database = require('../../db');
var util = require('./users.util');
var memdown = require('memdown');

var Users = new Database('Mock-Users', {
    db: memdown
});
module.exports = Users;

var unverifiedUser = {
    id: 'd10e2377-6de7-4674-9d38-40ca0f8fcf80',
    _id: 'user/d10e2377-6de7-4674-9d38-40ca0f8fcf80',
    secret: '15c04d2c-3810-4fee-bc41-58fce4412ac1',
    created: new Date().toISOString(),
    name: 'Unverified User',
    email: 'unverified_user@test.com',
    password: 'unverified_user',
    permission: 30
};

var verifiedUser = {
    id: '375e7beb-7768-41f1-a8c0-6ca02c6cbfdc',
    _id: 'user/375e7beb-7768-41f1-a8c0-6ca02c6cbfdc',
    created: new Date().toISOString(),
    name: 'Verified User',
    email: 'verified_user@test.com',
    password: 'verified_user',
    permission: 20
};

var adminUser = {
    id: 'ef288553-635a-44a7-ab7d-3404bebc02a5',
    _id: 'user/ef288553-635a-44a7-ab7d-3404bebc02a5',
    created: new Date().toISOString(),
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'admin_user',
    permission: 10
};

module.exports.unverifiedUser = unverifiedUser;
util.processPassword(unverifiedUser);
Users.put(unverifiedUser);
module.exports.unverifiedUser.password = 'unverified_user';

module.exports.verifiedUser = verifiedUser;
util.processPassword(verifiedUser);
Users.put(verifiedUser);
module.exports.verifiedUser.password = 'verified_user';

module.exports.adminUser = adminUser;
util.processPassword(adminUser);
Users.put(adminUser);
module.exports.adminUser.password = 'admin_user';
