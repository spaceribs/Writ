'use strict';

var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var AnonymousStrategy = require('passport-anonymous').Strategy;
var ctrl = require('./users.ctrl');

passport.use(new BasicStrategy(ctrl.strategy));
passport.use(new AnonymousStrategy());

module.exports = passport;
