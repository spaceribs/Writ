'use strict';

var PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));
PouchDB.debug.enable('*');

var Users = new PouchDB('./db/Users');

Users.createIndex({
    index: {
        fields: ['email']
    }
}).then(function(result) {
    return Users.createIndex({
        index: {
            fields: ['emailToken']
        }
    });

}).catch(function(err) {
    console.warn(err);
});

module.exports = Users;
