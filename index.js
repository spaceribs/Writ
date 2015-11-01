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

var userSchema = require('./models/user.schema.json');
var passageSchema = require('./models/passage.schema.json');
var roomSchema = require('./models/room.schema.json');

PouchDB.debug.enable('*');

var UserDB = new PouchDB('./db/Users');

console.log(prettyjson.render(jsf(models, [models])));