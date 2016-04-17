'use strict';

var PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));
PouchDB.plugin(require('pouchdb-erase'));

module.exports = function(name, options) {
    return new PouchDB(name, options);
};
