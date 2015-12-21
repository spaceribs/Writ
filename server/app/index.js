'use strict';

var express = require('express');
var passport = require('../users').auth;
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());
app.use(require('../users').router);
app.use(require('../middleware/error_handler'));

module.exports = app;
