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

    var params = permissions.permFilter(20, 'user', req.body, true, true);

    // If there is a password set, generate a salt and hash.
    if (params.password) {
        params.salt = secureRandom.randomBuffer(256).toString();
        params.hash = hmac(params.password, params.salt).toString();
        delete params.password;
    }

    if (!params.permission) {
        params.permission = 20;
    }

    req.body = params;

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
                status : 'SUCCESS',
                data   : require('../mocks/user.json')
            });
        })
        .post(validate({body : models.user}), function(req, res, next) {

            Users.find({
                selector : {email : req.body.email}
            }).then(function(result) {
                if (result.docs.length) {
                    throw new errors.EmailUsedError(
                            'This email address is already in use by another account.',
                            req.body.email
                    );
                }

            }).then(function() {
                req.body.secret = uuid.v4();
                req.body._id = uuid.v4();
                return Users.put(req.body);

            }).then(function() {
                var transporter = nodemailer.createTransport({
                    service : 'Gmail',
                    auth    : {
                        user : config.emailUsername,
                        pass : config.emailPassword
                    }
                });

                transporter.sendMail({
                    from    : config.sysop + ' <' + config.emailUsername + '>',
                    to   : req.body.email,
                    subject : 'Please verify your email address',
                    text    : 'Secret Token: ' + req.body.secret
                }, function(error) {
                    if (error) {
                        next(error);
                    } else {
                        res.json({
                            status  : 'SUCCESS',
                            message : 'Please check your email to verify your account.',
                            data    : {
                                id    : req.body._id,
                                email : req.body.email,
                                name  : req.body.name
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
                        var filtered = permissions.permFilter(100,
                                'user', result);
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

            Users.find({
                selector : {secret : req.params.token}
            }).then(function(results) {
                if (!results.docs.length) {
                    throw new errors.SecretNotFoundError(
                        'This token was not found.',
                        req.params.token
                    );
                } else {
                    return results.docs[0];
                }

            }).then(function(user) {
                user.permission = 10;
                return Users.put(user);

            }).then(function() {
                res.json({
                    status  : 'SUCCESS',
                    message : 'Your email has been verified.'
                });

            }).catch(function(err) {
                next(err);
            });
        });

module.exports = router;
