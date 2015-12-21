'use strict';

var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var hmac = require('crypto-js/hmac-sha512');
var Users = require('./users.db');
var userUtil = require('./users.util');
var errors = require('../app/errors');

passport.use(new BasicStrategy(
    function(email, password, cb) {

        Users.find({
            selector : {email: email}
        }).then(function(users) {

            if (!users.docs.length) {
                throw new errors.LoginError();
            }

            var user = users.docs[0];
            var passwordMatch = userUtil.checkPassword(password, user.salt, user.hash);

            if (!passwordMatch) {
                throw new errors.LoginError();
            }

            return user;

        }).then(function(user) {

            return cb(null, user);

        }).catch(function(err) {

            return cb(err);

        });

    }));

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

module.exports = passport;
