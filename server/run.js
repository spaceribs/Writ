'use strict';

var app = require('./app.js');
var config = require('./config.js');
app.listen(config.port);

module.exports = app;
