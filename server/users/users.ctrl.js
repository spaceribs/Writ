'use strict';

var models = require('../../models');
var config = require('../config');
var email = require('../email');
var express = require('express');
var nodemailer = require('nodemailer');
var uuid = require('node-uuid');
var errors = require('../app/errors');
var Users = require('./users.db');
var util = require('./users.util');

/**
 * Called when login is successful.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
function login(req, res) {
    res.json({
        status : 'SUCCESS',
        data   : req.user
    });
}

/**
 * Called when a user makes an OPTIONS request to /user/.
 * Returns the json-schema used to validate/update users.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function usersOptions(req, res, next) {
    if (req.accepts('json')) {
        res.json(models.io.user);
    } else {
        next();
    }
}

/**
 * Called when a user makes an GET request to /user/.
 * Returns the currently logged in user.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
function usersGet(req, res) {
    res.json({
        status : 'SUCCESS',
        data   : req.user
    });
}

/**
 * Called when a user makes an POST request to /user/.
 * Creates a new user.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function usersPost(req, res, next) {

    util.processPassword(req.body);
    var defaultPerm = models.db.user.properties.permission.default;
    var params = util.permFilter(defaultPerm, 'user', req.body, true, true);

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
}

/**
 * Called when a user makes a GET request to /user/list/.
 * List of all users. Admin only.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function usersList(req, res, next) {

    Users.allDocs({
        startkey     : 'user/',
        endkey   : 'user/\uffff',
        include_docs : true
    }).then(function(results) {
        for (var i = 0; i < results.rows.length; i++) {
            var row = results.rows[i];
            results.rows[i].doc = util.permFilter(10, 'user', row.doc);
        }
        return results;
    })
    .then(function(results) {
        res.json(results);
    })
    .catch(function(err) {
        next(err);
    });
}

/**
 * Called when a user makes a GET request to /user/{some-uuid}/.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function userGet(req, res, next) {

    var userId = req.params.userId;
    Users.get('user/' + userId)
            .then(function(result) {
                var filtered = util.permFilter(100,
                        'user', result);
                res.json(filtered);
            }).catch(function(err) {
        next(err);
    });
}

/**
 * Called when a user makes a POST request to /user/{some-uuid}/.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function userPost(req, res, next) {

    if (req.body.password) {
        util.processPassword(req.body);
    }
    var userId = req.params.userId;
    var params = util.permFilter(19, 'user', req.body, true, true);

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
}

/**
 * Called when a user makes a DELETE request to /user/{some-uuid}/.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function userDelete(req, res, next) {
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
}

/**
 * Called when a user makes a GET request to /verify/{token}/.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function userVerify(req, res, next) {

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
}

/**
 * Passport uses this to validate provided credentials.
 *
 * @param {string} email - Email address to look for.
 * @param {string} password - Password to verify against.
 * @param {function} cb - Callback for the check
 */
function loginStrategy(email, password, cb) {

    Users.find({
        selector : {email: email}
    }).then(function(users) {

        if (!users.docs.length) {
            throw new errors.LoginError();
        }

        var user = users.docs[0];
        var passwordMatch = util.checkPassword(password, user.salt, user.hash);

        if (!passwordMatch) {
            throw new errors.LoginError();
        }

        return user;

    }).then(function(user) {

        return cb(null, user);

    }).catch(function(err) {

        return cb(err);

    });

}

module.exports = {
    login: login,
    strategy: loginStrategy,
    users: {
        options: usersOptions,
        get: usersGet,
        post: usersPost,
        list: usersList
    },
    user: {
        get: userGet,
        post: userPost,
        delete: userDelete,
        verify: userVerify
    }
};
