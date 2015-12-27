'use strict';

var Database = require('../../db');

module.exports = new Database('./db/Users', {
    adapter: 'leveldb'
}, require('./users.db.indexes'));
