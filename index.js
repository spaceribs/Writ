"use strict";

var express = require('express');
var expressResponse = require('express-json-response');
var bodyParser = require('body-parser');

var uuid = require('node-uuid');
var PouchDB = require('pouchdb');
var _ = require('lodash');
var validate = require('validate');

PouchDB.debug.enable('*');

var UserDB = new PouchDB('./db/Users');

var UserModel = {
  name: {
    required: true
  },
  email: {
    required: true,
    email: true
  }
};