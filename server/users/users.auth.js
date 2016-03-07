'use strict';

var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var AnonymousStrategy = require('passport-anonymous').Strategy;
var controller = require('./users.ctrl');

passport.use(new BasicStrategy(controller.strategy));
passport.use(new AnonymousStrategy());

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

module.exports = passport;
