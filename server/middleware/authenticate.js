'use strict';

var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var SHA256 = require('crypto-js/sha256');
var Users = require('../users/').database;

passport.use(new BasicStrategy(
    function(username, password, done) {
        Users.get(username, function(err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false);
            }
            if (!user.validPassword(password)) {
                return done(null, false);
            }
            return done(null, user);
        });
    }
));
