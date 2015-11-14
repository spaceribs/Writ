'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var validate = require('express-jsonschema').validate;

var uuid = require('node-uuid');
var _ = require('lodash');

var PouchDB = require('pouchdb');
var UserDB = new PouchDB('./db/Users');
PouchDB.debug.enable('*');

var models = require('../models');

var app = express();
app.use(bodyParser.json());

app.get('/users/', function(req, res) {
    res.send('hello world');
});

app.post('/users/', validate({body: models.user}), function(req, res) {
    res.send('test');
});

app.use(function(err, req, res, next) {
    var responseData;
    if (err.name === 'JsonSchemaValidation') {
        responseData = {
            status: 'INVALID_REQUEST',
            errors: err.validations  // All of your validation information
        };
        res.status(400).json(responseData);
    } else if (err instanceof SyntaxError) {
        responseData = {
            status: 'INVALID_JSON',
            'errors': {
                'body': [{
                    'value': err.body,
                    'property': 'request.body',
                    'messages': [err.message]
                }]
            }
        };
        res.status(err.status).json(responseData);
    } else {
        // pass error to next error middleware handler
        next(err);
    }
});

app.listen(8000);