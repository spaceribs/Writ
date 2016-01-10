'use strict';

var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var controller = require('./users.ctrl');

passport.use(new BasicStrategy(controller.strategy));

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

module.exports = passport;
