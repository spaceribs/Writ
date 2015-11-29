'use strict';

var express = require('express');
var bodyParser = require('body-parser');

var uuid = require('node-uuid');
var _ = require('lodash');

var app = express();

app.use(bodyParser.json());
app.use(require('./users').router);
app.use(require('./middleware/error_handler'));

app.listen(8000);
