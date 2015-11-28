'use strict';

var models = require('../../models');
var config = require('../config');
var permissions = require('../middleware/permissions');
var express = require('express');
var nodemailer = require('nodemailer');
var router = express.Router();
var validate = require('express-jsonschema').validate;
var hmac = require('crypto-js/hmac-sha512');
var secureRandom = require('secure-random');
var uuid = require('node-uuid');
var errors = require('../errors');
var Users = require('./users.db');

router.use(function(req, res, next) {

    // If there is a password set, generate a salt and hash.
    if (req.body.password) {
        req.body.salt = secureRandom.randomBuffer(256).toString();
        req.body.hash = hmac(req.body.password, req.body.salt).toString();
        delete req.body.password;
    }

    if (!req.body.id) {
        req.body.id = uuid.v4();
    }

    next();
});

router.route('/user/')
        .options(function(req, res) {
            // Request the user schema for clientside validation.

            if (req.accepts('json')) {
                res.json(models.user);
            }
        })
        .get(function(req, res) {
            // Get my own profile if logged in.

            res.json({
                status: 'SUCCESS',
                data  : require('../mocks/user.json')
            });
        })
        .post(validate({body: models.user}), function(req, res, next) {

            var emailToken = uuid.v4();

            Users.find({
                selector: {email: req.body.email}
            }).then(function(result) {
                console.log(result);
                if (result.docs.length) {
                    throw new errors.EmailUsedError(
                            'This email address is already in use by another account.',
                            req.body.email
                    );
                }

            }).then(function() {
                return Users.put({
                    _id       : req.body.id,
                    email: req.body.email,
                    name : req.body.name,
                    salt : req.body.salt,
                    hash : req.body.hash,
                    role : 'user',
                    emailToken: emailToken
                });

            }).then(function() {
                var transporter = nodemailer.createTransport({
                    service: 'Gmail',
                    auth   : {
                        user: config.emailUsername,
                        pass: config.emailPassword
                    }
                });

                transporter.sendMail({
                    from   : config.sysop + ' <' + config.emailUsername + '>',
                    to  : req.body.email,
                    subject: 'Please verify your email address',
                    text   : 'Token: ' + emailToken
                }, function(error, info) {
                    if (error) {
                        next(error);
                    } else {
                        console.log(info);
                        res.json({
                            status : 'SUCCESS',
                            message: 'Please check your email to verify your account.',
                            data   : {
                                id   : req.body.id,
                                email: req.body.email,
                                name : req.body.name
                            }
                        });
                    }
                });

            }).catch(function(err) {
                next(err);
            });
        });

router.route('/user/:userId')
        .get(function(req, res, next) {

            var userId = req.params.userId;
            Users.get(userId)
                .then(function(result) {
                    var filtered = permissions.permFilter({
                            "permission": 1
                        }, 'user', result);
                    res.json(filtered);
                }).catch(function(err) {
                    next(err);
                });

        })
        .post(function(req, res) {
            // Update a profile.

            var userId = req.params.userId;
            res.send('TODO');
        })
        .delete(function(req, res) {
            // Delete a profile.

            var userId = req.params.userId;
            res.send('TODO');
        });

router.route('/verify/:token')
        .get(function(req, res, next) {

            var token = req.params.token;

            Users.find({
                selector: {emailToken: req.params.token}
            }).then(function(results) {
                if (!results.docs.length) {
                    throw new errors.EmailTokenNotFoundError(
                            'This token was not found.',
                            req.params.token
                    );
                } else {
                    return results.docs[0];
                }
            }).then(function(user) {
                delete user.emailToken;
                return Users.put(user);
            }).then(function() {
                res.json({
                    status: 'SUCCESS',
                    message: 'Your email has been verified.'
                });

            }).catch(function(err) {
                next(err);
            });
        });

module.exports = router;
