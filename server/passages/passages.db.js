'use strict';

var Database = require('../../db');

module.exports = new Database('./db/Passages', {
    adapter: 'leveldb'
});
