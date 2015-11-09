"use strict";

var express = require('express');
var expressResponse = require('express-json-response');
var bodyParser = require('body-parser');

var uuid = require('node-uuid');
var PouchDB = require('pouchdb');
var _ = require('lodash');

var jsf = require('json-schema-faker');
var prettyjson = require('prettyjson');

var models = require('./models');

PouchDB.debug.enable('*');

var UserDB = new PouchDB('./db/Users');

console.log(prettyjson.render(jsf(models.item, [models])));