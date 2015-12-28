'use strict';

var PouchDB = require('pouchdb');
var Promise = require('bluebird');
PouchDB.plugin(require('pouchdb-find'));
PouchDB.debug.enable('*');

module.exports = function(name, options) {
    return new PouchDB(name, options);
};
