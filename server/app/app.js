'use strict';

var express = require('express');
var passport = require('../users/users.auth');
var bodyParser = require('body-parser');
var app = express();
var successes = require('./app.successes');

app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

app.get('/', function(req, res) {
    var config = require('../config.json');

    res.json(
        new successes.SuccessMessage('Hello World!', null, null, [
            {
                rel: 'users',
                href: config.hostname + '/user/'
            },
            {
                rel: 'places',
                href: config.hostname + '/place/'
            },
            {
                rel: 'passages',
                href: config.hostname + '/passage/'
            }
        ])
    );
});

app.use(require('../users/users.router'));
app.use(require('../places/places.router'));
app.use(require('../passages/passages.router'));
app.use(require('../middleware/middleware.errors.js'));

module.exports = app;
