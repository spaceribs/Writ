'use strict';

var models = require('../../models');
var config = require('../config');
var permissions = require('../middleware/permissions');
var express = require('express');
var nodemailer = require('nodemailer');
var router = express.Router();
var validate = require('express-jsonschema').validate;
var uuid = require('node-uuid');
var errors = require('../app/errors');
var Users = require('./users.db');
var userUtil = require('./users.util');
var passport = require('./users.auth');

router.use(function(req, res, next) {
    userUtil.processPassword(req.body);
    next();
});

router.route('/login/')
        .get(passport.authenticate('basic', {session: false}), function(req, res) {
            res.json({
                status : 'SUCCESS',
                data   : req.user
            });
        });

router.route('/user/')
        .options(function(req, res) {
            // Request the user schema for clientside validation.

            if (req.accepts('json')) {
                res.json(models.user);
            }
        })
        .get(passport.authenticate('basic', {session: false}), function(req, res) {
            // Get my own profile if logged in.

            res.json({
                status : 'SUCCESS',
                data   : require('../mocks/user.json')
            });
        })
        .post(validate({body: models.user}), function(req, res, next) {

            var defaultPerm = models.user.properties.permission.default;
            var params = permissions.permFilter(defaultPerm, 'user', req.body, true, true);

            Users.find({
                selector : {email: req.body.email}
            }).then(function(result) {
                if (result.docs.length) {
                    throw new errors.EmailUsedError(
                        'This email address is already in use by another account.',
                        req.body.email
                    );
                }

            }).then(function() {
                params.secret = uuid.v4();
                params._id = 'user/' + uuid.v4();
                params.salt = req.body.salt;
                params.hash = req.body.hash;
                params.created = new Date().toISOString();
                return Users.put(params);

            }).then(function() {
                var transporter = nodemailer.createTransport({
                    service : 'Gmail',
                    auth    : {
                        user : config.emailUsername,
                        pass : config.emailPassword
                    }
                });

                var verifyUrl = config.hostname + '/verify/' + params.secret;

                transporter.sendMail({
                    from    : config.sysop + ' <' + config.emailUsername + '>',
                    to   : params.email,
                    subject : 'Please verify your email address',
                    html    : 'Go to this URL to verify your email: <a href="' + verifyUrl + '">' +
                        verifyUrl + '</a>'
                }, function(err) {
                    if (err) {
                        next(err);
                    } else {
                        res.json({
                            status  : 'SUCCESS',
                            message : 'Please check your email to verify your account.',
                            data    : {
                                id    : req.body._id,
                                email : req.body.email
                            }
                        });
                    }
                });

            }).catch(function(err) {
                next(err);
            });
        });

router.route('/user/list')
        .get(passport.authenticate('basic', {session: false}), function(req, res, next) {
            // Admin only list of users

            Users.allDocs({
                startkey     : 'user/',
                endkey   : 'user/\uffff',
                include_docs : true
            }).then(function(results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            var row = results.rows[i];
                            results.rows[i].doc = permissions.permFilter(10, 'user', row.doc);
                        }
                        return results;
                    })
                    .then(function(results) {
                        res.json(results);
                    })
                    .catch(function(err) {
                        next(err);
                    });
        });

router.route('/user/:userId')
        .get(function(req, res, next) {

            var userId = req.params.userId;
            Users.get('user/' + userId)
                .then(function(result) {
                    var filtered = permissions.permFilter(100,
                            'user', result);
                    res.json(filtered);
                }).catch(function(err) {
                    next(err);
                });
        })
        .post(passport.authenticate('basic', {session: false}), function(req, res, next) {
            // Update a profile.

            var userId = req.params.userId;
            var params = permissions.permFilter(19, 'user', req.body, true, true);

            if (params.email) {
                params.secret = uuid.v4();
                params.permission = 30;
            }

            Users.get('user/' + userId)
                    .then(function(result) {
                        return Users.put(params, result._id, result._rev);
                    })
                    .then(function() {
                        if (!params.email) {

                            res.json({
                                status  : 'SUCCESS',
                                message : 'User has been successfully updated.',
                                data    : params
                            });

                        } else {

                            var transporter = nodemailer.createTransport({
                                service : 'Gmail',
                                auth    : {
                                    user : config.emailUsername,
                                    pass : config.emailPassword
                                }
                            });

                            transporter.sendMail({
                                from    : config.sysop + ' <' + config.emailUsername + '>',
                                to   : params.email,
                                subject : 'Please verify your email address',
                                text    : 'Secret Token: ' + params.secret +
                                '\nUser ID: ' + params._id
                            }, function(err) {
                                if (err) {
                                    next(err);
                                } else {
                                    res.json({
                                        status  : 'SUCCESS',
                                        message : 'User has been updated, and an email ' +
                                        'has been sent to the new address.',
                                        data    : params
                                    });
                                }
                            });

                        }

                    }).catch(function(err) {
                next(err);
            });
        })
        .delete(passport.authenticate('basic', {session: false}), function(req, res, next) {
            // Delete a profile.

            var userId = req.params.userId;

            Users.get('user/' + userId).then(function(doc) {
                return Users.remove(doc);
            }).then(function() {
                res.json({
                    status  : 'SUCCESS',
                    message : 'User has been deleted.'
                });
            }).catch(function(err) {
                next(err);
            });
        });

router.route('/verify/:token')
        .get(function(req, res, next) {

            Users.find({
                selector : {secret: req.params.token}
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
                user.permission = Math.min(20, user.permission);
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
