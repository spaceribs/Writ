'use strict';

var PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));

module.exports = function(name, options) {
    return new PouchDB(name, options);
};
