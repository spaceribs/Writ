'use strict';

var nodemailer = require('nodemailer');
var uuid = require('node-uuid');
var _ = require('lodash');
var tv4 = require('tv4');

var models = require('../../models');
var config = require('../config');
var emailConfig = require('../email.json');
var errors = require('../app/app.errors');
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
        data   : util.permFilter(30, 'user', req.user, false, true)
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

    //TODO: Move to the configuration file.
    var params = util.permFilter(20, 'user', req.body, true, true);
    util.processPassword(params);

    Users.createIndex({
        'index': {
            'fields': ['email']
        }
    }).then(function() {
        return Users.find({
            selector : {email: req.body.email}
        });

    }).then(function(result) {
        if (result.docs.length) {
            throw new errors.EmailUsedError(
                    'This email address is already in use by another account.',
                    req.body.email
            );
        }

    }).then(function() {
        params.secret = uuid.v4();
        params.id = uuid.v4();
        params._id = 'user/' + params.id;
        params.created = new Date().toISOString();
        params.updated = new Date().toISOString();
        params.permission = 30;

        var validate = tv4.validateMultiple(params, models.db.user);

        if (validate.valid) {
            return Users.put(params);
        } else {
            throw new errors.JsonSchemaValidationError(
                validate.errors,
                validate.missing
            );
        }

    }).then(function() {
        var transporter = nodemailer.createTransport(emailConfig);
        var verifyUrl = config.hostname + '/verify/' + params.secret;

        transporter.sendMail(
            util.tokenEmail(config.sysop, params.email, verifyUrl),
            function(err) {
                if (err) {
                    next(err);
                } else {
                    res.json({
                        status  : 'SUCCESS',
                        message : 'Please check your email to ' +
                        'verify your account.',
                        data    : {
                            id    : params.id,
                            email : params.email
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

    //TODO: Limit this call to only admins.
    Users.allDocs({
        startkey     : 'user/',
        endkey   : 'user/\uffff',
        include_docs : true
    }).then(function(results) {
        for (var i = 0; i < results.rows.length; i++) {
            var row = results.rows[i];
            //TODO: Hook up permission level to user.
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
            //TODO: Hook this up to user's permission level.
            var filtered = util.permFilter(100,
                    'user', result);
            res.json(filtered);
        }).catch(function(err) {
            //TODO: validate if this needs to be converted to an object?
            next(JSON.parse(err));
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

    var userId = req.params.userId;
    //TODO: Hook this up to user's permission level.
    var params = util.permFilter(30, 'user', req.body, true, true);
    var newParams;

    if (params.password) {
        util.processPassword(params);
    }

    if (params.email) {
        params.secret = uuid.v4();
        params.permission = 30;
    }

    Users.createIndex({
            'index': {
                'fields': ['email']
            }
        }).then(function() {
            if (params.email) {
                return Users.find({
                    selector : {email: params.email}
                }).then(function(result) {
                    if (result.docs.length && result.docs[0].id !== userId) {
                        throw new errors.EmailUsedError(
                                'This email address is already ' +
                                'in use by another account.',
                                req.body.email
                        );
                    }
                });
            }

        }).then(function() {
            return Users.get('user/' + userId);

        }).then(function(result) {
            newParams = _.extend({}, result, params);
            newParams.updated = new Date().toISOString();

            var validate = tv4.validateMultiple(newParams, models.db.user);

            if (validate.valid) {
                return Users.put(newParams);
            } else {
                throw new errors.JsonSchemaValidation(validate.error);
            }

        }).then(function() {
            if (!params.email) {

                res.json({
                    status  : 'SUCCESS',
                    message : 'User has been successfully updated.',
                    data    : util.permFilter(newParams.permission, 'user',
                            newParams, false, true)
                });

            } else {

                var transporter = nodemailer.createTransport(emailConfig);
                var verifyUrl = config.hostname + '/verify/' + params.secret;

                transporter.sendMail(
                    util.tokenEmail(config.sysop, params.email, verifyUrl),
                    function(err) {
                        if (err) {
                            next(err);
                        } else {
                            res.json({
                                status  : 'SUCCESS',
                                message : 'User has been updated, and an ' +
                                'email has been sent to the new address.',
                                data    : util.permFilter(newParams.permission,
                                        'user', newParams, false, true)
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
 * Deletes a specific user.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function userDelete(req, res, next) {
    var userId = req.params.userId;

    Users.get('user/' + userId).then(function(doc) {
        return Users.remove(doc);
    }).then(function() {
        res.json({
            status  : 'SUCCESS',
            message : 'User has been deleted.'
        });
    }).catch(function(err) {
        next(JSON.parse(err));
    });
}

/**
 * Called when a user makes a GET request to /verify/{token}/.
 * This is used to verify their email address with their account.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function userVerify(req, res, next) {

    Users.createIndex({
        'index': {
            'fields': ['secret']
        }
    }).then(function() {
        return Users.find({
            selector : {secret: req.params.token}
        });
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
        user.updated = new Date().toISOString();
        var validate = tv4.validateMultiple(user, models.db.user);

        if (validate.valid) {
            return Users.put(user);
        } else {
            throw new errors.JsonSchemaValidation(validate.error);
        }

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

    Users.createIndex({
        'index': {
            'fields': ['email']
        }
    }).then(function() {
        return Users.find({
            selector : {email: email}
        });

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
