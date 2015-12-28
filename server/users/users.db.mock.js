'use strict';

var Database = require('../../db');
var memdown = require('memdown');

console.log('--> Mocking User Database');

module.exports = new Database('Mock-Users', {
    db: memdown
});
