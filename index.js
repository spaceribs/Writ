'use strict';

var jsf = require('json-schema-faker');
var prettyjson = require('prettyjson');
var util = require('util');

var models = require('./models');

util.log('\n' + prettyjson.render(jsf(models.db.place, models.refs)));
