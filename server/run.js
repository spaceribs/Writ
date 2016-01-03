'use strict';

var app = require('./app/app');
var config = require('./config');

app.listen(config.port);

module.exports = app;
