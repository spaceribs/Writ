'use strict';

var jsf = require('json-schema-faker');
var prettyjson = require('prettyjson');

var models = require('./models');

console.log(prettyjson.render(jsf(models.item, [models])));
