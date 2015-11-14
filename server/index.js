'use strict';

var express = require('express');
var expressResponse = require('express-json-response');
var bodyParser = require('body-parser');

var uuid = require('node-uuid');
var _ = require('lodash');

var PouchDB = require('pouchdb');
var UserDB = new PouchDB('./db/Users');
PouchDB.debug.enable('*');