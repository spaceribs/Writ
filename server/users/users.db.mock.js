'use strict';

var Database = require('../../db');
var memdown = require('memdown');

module.exports = new Database('Mock-Users', {
    db: memdown
});
