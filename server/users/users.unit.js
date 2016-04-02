'use strict';

var jsf = require('json-schema-faker');
var userModel = require('../../models').io.user;
var _ = require('lodash');
var mockery = require('mockery');
var uuid = require('node-uuid');
var errors = require('../app/app.errors');
var SuccessMessage = require('../app/app.successes').SuccessMessage;

var Users = require('./users.db.mock');

describe('Users', function() {

    var newUser;

    var adminUser;
    var verifiedUser;
    var unverifiedUser;
    var invalidUser;

    var util;
    var ctrl;
    var mail;

    var req;
    var res;
    var callback;

    var anonymousUser = {
        name: 'Anonymous User',
        permission: 100,
        anonymous: true
    };

    beforeAll(function() {
        mockery.enable({
            warnOnReplace     : false,
            warnOnUnregistered: false
        });

        mockery.registerSubstitute(
            './users.db', './users.db.mock');
        mockery.registerSubstitute(
            '../mail/mail.ctrl', '../mail/mail.ctrl.mock');

        mail = require('../mail/mail.ctrl');
        util = require('./users.util');
        ctrl = require('./users.ctrl');
    });

    afterAll(function() {
        mockery.disable();
    });

    beforeEach(
        /**
         * Initialize request, response and callbacks for the Express
         * controllers we'll be testing.
         */
        function expressSetup() {

            req = {
                user: anonymousUser,
                accepts: jasmine.createSpy('accepts')
            };

            res = {
                json: jasmine.createSpy('json')
            };

            callback = jasmine.createSpy('callback');

        }
    );

    beforeEach(
        /**
         * For each test, create a new set of all users that
         * could be used in these tests. Also create a fake brand new user.
         *
         * @param {function} done - Called when all users have been set up.
         */
        function userSetup(done) {

            newUser = jsf(userModel);

            Users.mockUser(10)
                .then(function(user) {
                    adminUser = user;
                    return Users.mockUser(20);
                })
                .then(function(user) {
                    verifiedUser = user;
                    return Users.mockUser(30);
                })
                .then(function(user) {
                    unverifiedUser = user;
                    return Users.mockUser(20, true);
                })
                .then(function(user) {
                    invalidUser = user;
                    done();
                });

        }
    );

    describe('Utilities', function() {

        describe('getHash', function() {

            it('generates a valid sha512 hash from a password and a salt.',
            function() {
                var hash = util.getHash('Some Password', 'Some Salt');

                expect(hash).toEqual(jasmine.any(String));
                expect(hash).toMatch(/^[a-f0-9]{128}$/);
            });
        });

        describe('processPassword', function() {

            it('removes a password and generates a salt/hash.', function() {
                util.processPassword(newUser);
                expect(newUser.password).toBeUndefined();
                expect(newUser.salt).toEqual(jasmine.any(String));
                expect(newUser.hash).toEqual(jasmine.any(String));
            });

            it('makes a valid hash.', function() {
                util.processPassword(newUser);
                expect(newUser.hash).toMatch(/^[a-f0-9]{128}$/);
            });

            it('checks that no collisions could exist between users.',
            function() {
                var anotherUser = jsf(userModel);

                util.processPassword(newUser);
                util.processPassword(anotherUser);

                expect(newUser.salt).not.toEqual(anotherUser.salt);
                expect(newUser.hash).not.toEqual(anotherUser.hash);
            });

            it('checks that no collisions exist even with the same password.',
            function() {
                var newUser11 = _.clone(newUser);

                util.processPassword(newUser);
                util.processPassword(newUser11);

                expect(newUser.salt).not.toEqual(newUser11.salt);
                expect(newUser.hash).not.toEqual(newUser11.hash);
            });

        });

        describe('checkPassword', function() {

            it('validates a matching password correctly.', function() {
                var processedUserOne = _.clone(newUser);
                util.processPassword(processedUserOne);

                var userOneCheck = util
                    .checkPassword(newUser.password,
                        processedUserOne.salt,
                        processedUserOne.hash);

                expect(userOneCheck).toBe(true);
            });

            it('validates that incorrect passwords fail to match.', function() {
                var processedUserOne = _.clone(newUser);
                util.processPassword(processedUserOne);

                var userOneCheck = util
                    .checkPassword('$$$ THIS IS WRONG $$$',
                        processedUserOne.salt,
                        processedUserOne.hash);

                expect(userOneCheck).toBe(false);
            });

        });

        describe('userCan', function() {

            var model;

            beforeEach(function() {
                model = {
                    'test': {
                        'permission': {
                            read: 20,
                            write: 10,
                            owner: true
                        }
                    }
                };
            });

            it('allows an admin user to read.', function() {
                var can = util.userCan(10, model, 'test', false, false);
                expect(can).toBe(true);
            });

            it('allows a verified user to read.', function() {
                var can = util.userCan(20, model, 'test', false, false);
                expect(can).toBe(true);
            });

            it('disallows a unverified user to read.', function() {
                var can = util.userCan(30, model, 'test', false, false);
                expect(can).toBe(false);
            });

            it('disallows an anonymous user to read.', function() {
                var can = util.userCan(100, model, 'test', false, false);
                expect(can).toBe(false);
            });

            it('allows an unverified user to read if they are the owner.',
            function() {
                var can = util.userCan(30, model, 'test', false, true);
                expect(can).toBe(true);
            });

            it('allows an admin user to write.', function() {
                var can = util.userCan(10, model, 'test', true, false);
                expect(can).toBe(true);
            });

            it('disallows a verified user to write.', function() {
                var can = util.userCan(20, model, 'test', true, false);
                expect(can).toBe(false);
            });

            it('only accepts numbers', function() {
                //noinspection JSCheckFunctionSignatures
                var can = util.userCan('admin', model, 'test', true, true);
                expect(can).toBe(false);
            });

        });

    });

    describe('Controller', function() {

        afterEach(function() {
            mail.testError = false;
            Users.mockError = false;
        });

        describe('usersOptions', function() {

            it('returns a json-schema when requesting options.', function() {
                req.accepts.and.returnValue(true);

                ctrl.users.options(req, res, callback);

                expect(req.accepts).toHaveBeenCalled();
                expect(req.accepts).toHaveBeenCalledWith('json');
                expect(res.json).toHaveBeenCalled();
                expect(res.json.calls.mostRecent().args[0])
                    .toEqual(userModel);
            });

            it('passes through if json isn\'t accepted.', function() {
                req.accepts.and.returnValue(false);

                ctrl.users.options(req, res, callback);

                expect(req.accepts).toHaveBeenCalled();
                expect(res.json).not.toHaveBeenCalled();
                expect(callback).toHaveBeenCalled();
            });

        });

        describe('usersGet', function() {

            it('returns the decorated profile of the current user.',
            function() {
                req.user = verifiedUser;
                ctrl.users.get(req, res);

                expect(res.json).toHaveBeenCalled();
                expect(res.json.calls.mostRecent().args[0])
                    .toEqual(new SuccessMessage('Your credentials are valid.', {
                        id: verifiedUser.id,
                        email: verifiedUser.email,
                        name: verifiedUser.name,
                        permission: verifiedUser.permission
                    }));
            });

        });

        describe('usersPost', function() {

            beforeEach(function() {
                req.body = newUser;
            });

            it('creates a new user with the post body.', function(done) {
                res.json.and.callFake(function() {
                    expect(res.json).toHaveBeenCalled();
                    expect(res.json.calls.mostRecent().args[0])
                        .toEqual(new SuccessMessage(
                            'Please check your email to ' +
                            'verify your account.', {
                                id   : jasmine.any(String),
                                email: newUser.email
                            }));
                    done();
                });

                ctrl.users.post(req, res, callback);
            });

            it('updates an existing user with a new name.', function(done) {
                res.json.and.callFake(function() {
                    expect(res.json).toHaveBeenCalled();
                    expect(res.json.calls.mostRecent().args[0])
                        .toEqual(new SuccessMessage(
                            'User has been successfully updated.', {
                                email: verifiedUser.email,
                                name: newUser.name,
                                permission: 20
                            }));
                    done();
                });

                req.user = verifiedUser;
                req.body = {name: newUser.name};
                ctrl.users.post(req, res, callback);
            });

            it('updates an existing user with a new email.', function(done) {
                res.json.and.callFake(function() {
                    expect(res.json).toHaveBeenCalled();
                    expect(res.json.calls.mostRecent().args[0])
                        .toEqual(new SuccessMessage(
                            'User has been updated, and an email ' +
                            'has been sent to the new address.', {
                                email: newUser.email,
                                name: verifiedUser.name,
                                permission: 30
                            }));
                    done();
                });

                req.user = verifiedUser;
                req.body = {email: newUser.email};
                ctrl.users.post(req, res, callback);
            });

            it('updates an existing user with a new password.', function(done) {
                res.json.and.callFake(function() {
                    expect(res.json).toHaveBeenCalled();
                    expect(res.json.calls.mostRecent().args[0])
                        .toEqual(new SuccessMessage(
                            'User has been successfully updated.', {
                                email: verifiedUser.email,
                                name: verifiedUser.name,
                                permission: 20
                            }));
                    done();
                });

                req.user = verifiedUser;
                req.body = {password: newUser.password};
                ctrl.users.post(req, res, callback);
            });

            it('throws an error if sending an email failed.', function(done) {
                callback.and.callFake(function(err) {
                    expect(err).toEqual(jasmine.any(Error));
                    done();
                });

                mail.testError = true;
                ctrl.users.post(req, res, callback);
            });

            it('checks if the email already exists before creating a new user.',
            function(done) {

                callback.and.callFake(function(err) {
                    expect(err).toEqual(jasmine.any(errors.EmailUsedError));
                    done();
                });

                res.json.and.callFake(function() {
                    ctrl.users.post(req, res, callback);
                });

                ctrl.users.post(req, res, callback);
            });

            it('checks if the user schema is valid.',
            function(done) {

                callback.and.callFake(function(err) {
                    expect(err).toEqual(
                            jasmine.any(errors.JsonSchemaValidationError));
                    expect(err.errors[0].message)
                            .toBe('Invalid type: number (expected string)');
                    done();
                });

                req.body.name = 12;
                ctrl.users.post(req, res, callback);

            });

            it('checks if the user is valid before updating.',
            function(done) {

                callback.and.callFake(function(err) {
                    expect(err).toEqual(
                        jasmine.any(errors.JsonSchemaValidationError));
                    expect(err.errors[0].message)
                        .toBe('Additional properties not allowed');
                    done();
                });

                req.user = invalidUser;
                req.body = {name: newUser.name};
                ctrl.users.post(req, res, callback);

            });

        });

        describe('usersList', function() {

            it('returns an array of users.', function(done) {

                res.json.and.callFake(function(options) {
                    expect(options).toEqual({
                        total_rows: jasmine.any(Number),
                        offset    : jasmine.any(Number),
                        rows      : jasmine.any(Array)
                    });
                    done();
                });

                ctrl.users.list(req, res, callback);

            }, 30000);

            it('returns an error if the database call fails.',
            function(done) {

                callback.and.callFake(function() {
                    expect(callback).toHaveBeenCalled();
                    expect(callback.calls.mostRecent().args[0])
                        .toEqual(jasmine.any(Error));
                    done();
                });

                Users.mockError = true;
                ctrl.users.list(req, res, callback);

            }, 30000);

        });

        describe('userGet', function() {

            beforeEach(function() {
                req.params = {
                    userId: verifiedUser.id
                };
            });

            it('gets a user by their id.', function(done) {

                res.json.and.callFake(function(response) {
                    expect(response).toEqual({
                        id: verifiedUser.id,
                        name: verifiedUser.name,
                        permission: verifiedUser.permission
                    });
                    done();
                });

                ctrl.user.get(req, res, callback);
            });

            it('returns a 404 error if no user exists.', function(done) {

                callback.and.callFake(function() {
                    expect(callback).toHaveBeenCalled();
                    expect(callback.calls.mostRecent().args[0])
                        .toEqual({
                            status: 'DATABASE_ERROR',
                            message: 'missing'
                        });
                    done();
                });

                req.params.userId = uuid.v4();
                ctrl.user.get(req, res, callback);
            });

            it('returns more information if you are an admin.', function(done) {

                res.json.and.callFake(function(response) {
                    expect(response).toEqual({
                        id: verifiedUser.id,
                        name: verifiedUser.name,
                        email: verifiedUser.email,
                        permission: verifiedUser.permission
                    });
                    done();
                });

                req.user = adminUser;
                ctrl.user.get(req, res, callback);

            });

        });

        describe('userPost', function() {

            beforeEach(function initRequest() {
                req.user = adminUser;
                req.params = {
                    userId: verifiedUser.id
                };
                req.body = {};
            });

            it('returns a 404 error if no user exists.', function(done) {

                callback.and.callFake(function() {
                    expect(callback).toHaveBeenCalled();
                    expect(callback.calls.mostRecent().args[0])
                        .toEqual({
                            status: 'DATABASE_ERROR',
                            message: 'missing'
                        });
                    done();
                });

                req.params.userId = uuid.v4();
                ctrl.user.get(req, res, callback);
            });

            it('updates basic user information.', function(done) {

                res.json.and.callFake(function(response) {
                    expect(response).toEqual(new SuccessMessage(
                        'User has been successfully updated.', {
                            email: verifiedUser.email,
                            name: newUser.name,
                            permission: 20
                        }));
                    done();

                });

                req.body.name = newUser.name;
                ctrl.user.post(req, res, callback);

            });

            it('doesn\'t update a user if their email is already ' +
            'associated with another account.', function(done) {

                callback.and.callFake(function() {
                    expect(callback).toHaveBeenCalled();
                    expect(callback.calls.mostRecent().args[0])
                        .toEqual(jasmine.any(errors.EmailUsedError));
                    done();
                });

                req.body.email = unverifiedUser.email;
                ctrl.user.post(req, res, callback);

            });

            it('updates a users email.', function(done) {

                res.json.and.callFake(function(response) {
                    expect(response).toEqual(new SuccessMessage(
                        'User has been updated, and an ' +
                        'email has been sent to the new address.', {
                            email: newUser.email,
                            name: verifiedUser.name,
                            permission: 30
                        }));
                    done();
                });

                req.body.email = newUser.email;
                ctrl.user.post(req, res, callback);

            });

            it('updates a users password.', function(done) {

                res.json.and.callFake(function(response) {
                    expect(response).toEqual(new SuccessMessage(
                        'User has been successfully updated.', {
                            email: verifiedUser.email,
                            name: verifiedUser.name,
                            permission: 20
                        }));
                    done();

                });

                req.body.password = newUser.password;
                ctrl.user.post(req, res, callback);

            });

        });

        describe('userDelete', function() {

            beforeEach(function() {
                req.user = adminUser;
                req.params = {};
            });

            it('returns an error if the user doesn\'t exist.', function(done) {
                callback.and.callFake(function(response) {
                    expect(response).toEqual({
                        status: 'DATABASE_ERROR',
                        message: 'missing'
                    });
                    done();
                });

                ctrl.user.delete(req, res, callback);
            });

            it('deletes a user.', function(done) {
                res.json.and.callFake(function(response) {
                    expect(response).toEqual(new SuccessMessage(
                        'User has been deleted.'));
                    done();
                });

                req.params.userId = verifiedUser.id;
                ctrl.user.delete(req, res, callback);
            });

        });

        describe('userVerify', function() {

            beforeEach(function() {
                req = {params: {token: uuid.v4()}};
            });

            it('returns an error if no user matches the token',
                function(done) {
                    callback.and.callFake(function(err) {
                        expect(err)
                            .toEqual(jasmine.any(errors.SecretNotFoundError));
                        done();
                    });

                    ctrl.user.verify(req, res, callback);

                });

            it('verifies a user via an email.', function(done) {
                res.json.and.callFake(function(response) {
                    expect(response).toEqual(new SuccessMessage(
                        'Your email has been verified.'));
                    done();
                });

                req.params.token = unverifiedUser.secret;
                ctrl.user.verify(req, res, callback);
            });

            it('checks if the user is valid before verifying.', function(done) {

                callback.and.callFake(function(err) {
                    expect(err).toEqual(
                        jasmine.any(errors.JsonSchemaValidationError));
                    expect(err.errors[0].message)
                        .toBe('Additional properties not allowed');
                    done();
                });

                req.params.token = invalidUser.secret;
                ctrl.user.verify(req, res, callback);

            });

        });

        describe('loginStrategy', function() {

            beforeEach(function() {
                req = {
                    params: {token: uuid.v4()},
                    user: anonymousUser
                };
            });

            it('doesn\'t log in a non existent user.', function(done) {
                ctrl.strategy(newUser.email, newUser.password,
                    function(err) {
                        expect(err).toEqual(jasmine.any(errors.LoginError));
                        done();
                    });
            });

            it('doesn\'t log in a user with a bad password.', function(done) {

                ctrl.strategy(verifiedUser.email, 'BAD PASSWORD!',
                    function(err) {
                        expect(err)
                            .toEqual(jasmine.any(errors.LoginError));
                        done();
                    });
            });

            it('logs in a valid user.', function(done) {

                ctrl.strategy(
                    verifiedUser.email,
                    verifiedUser.password,
                    function(err, user) {
                        expect(err).toBeNull();
                        expect(user.id).toEqual(verifiedUser.id);
                        done();
                    });

            });
        });

    });

});
