'use strict';

var jsf = require('json-schema-faker');
var userModel = require('../../models').io.user;
var userDbModel = require('../../models').db.user;
var _ = require('lodash');
var mockery = require('mockery');
var uuid = require('node-uuid');
var errors = require('../app/app.errors');
var SuccessMessage = require('../app/app.successes').SuccessMessage;

var Users = require('./users.db.mock');

describe('Users', function() {

    var newUser1;
    var newUser2;
    var newDbUser;
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

    beforeEach(function(done) {

        req = {
            user: anonymousUser,
            accepts: jasmine.createSpy('accepts')
        };

        res = {
            json: jasmine.createSpy('json')
        };

        callback = jasmine.createSpy('callback');

        newUser1 = jsf(userModel);
        newUser2 = jsf(userModel);

        newDbUser = jsf(userDbModel);
        newDbUser.permission = 20;
        newDbUser.secret = uuid.v4();
        newDbUser.id = newDbUser._id.match(/^user\/([a-z0-9-]+)$/)[1];
        delete newDbUser._rev;

        Users.put(newDbUser)
            .then(done);

    });

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
                util.processPassword(newUser1);
                expect(newUser1.password).toBeUndefined();
                expect(newUser1.salt).toEqual(jasmine.any(String));
                expect(newUser1.hash).toEqual(jasmine.any(String));
            });

            it('makes a valid hash.', function() {
                util.processPassword(newUser1);
                expect(newUser1.hash).toMatch(/^[a-f0-9]{128}$/);
            });

            it('checks that no collisions exist between users.', function() {
                util.processPassword(newUser1);
                util.processPassword(newUser2);

                expect(newUser1.salt).not.toEqual(newUser2.salt);
                expect(newUser1.hash).not.toEqual(newUser2.hash);
            });

            it('checks that no collisions exist even with the same password.',
            function() {
                var newUser11 = _.clone(newUser1);

                util.processPassword(newUser1);
                util.processPassword(newUser11);

                expect(newUser1.salt).not.toEqual(newUser11.salt);
                expect(newUser1.hash).not.toEqual(newUser11.hash);
            });

        });

        describe('checkPassword', function() {

            it('validates a matching password correctly.', function() {
                var processedUserOne = _.clone(newUser1);
                util.processPassword(processedUserOne);

                var userOneCheck = util
                    .checkPassword(newUser1.password,
                        processedUserOne.salt,
                        processedUserOne.hash);

                expect(userOneCheck).toBe(true);
            });

            it('validates that incorrect passwords fail to match.', function() {
                var processedUserOne = _.clone(newUser1);
                util.processPassword(processedUserOne);

                var userOneCheck = util
                    .checkPassword('$$$ THIS IS WRONG $$$',
                        processedUserOne.salt,
                        processedUserOne.hash);

                expect(userOneCheck).toBe(false);
            });

        });

    });

    describe('Controller', function() {

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
                req.user = Users.verifiedUser;
                ctrl.users.get(req, res);

                expect(res.json).toHaveBeenCalled();
                expect(res.json.calls.mostRecent().args[0])
                    .toEqual(new SuccessMessage('Your credentials are valid.', {
                        id: Users.verifiedUser.id,
                        email: Users.verifiedUser.email,
                        name: Users.verifiedUser.name,
                        permission: Users.verifiedUser.permission
                    }));
            });

        });

        describe('usersPost', function() {

            beforeEach(function() {
                req.body = newUser1;
                mail.testError = false;
            });

            it('creates a new user with the post body.', function(done) {
                res.json.and.callFake(function() {
                    expect(res.json).toHaveBeenCalled();
                    expect(res.json.calls.mostRecent().args[0])
                        .toEqual(new SuccessMessage(
                            'Please check your email to ' +
                            'verify your account.', {
                                id   : jasmine.any(String),
                                email: newUser1.email
                            }));
                    done();
                });

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

            it('checks if the schema is valid.',
            function(done) {

                req.body.name = 12;

                callback.and.callFake(function(err) {
                    expect(err).toEqual(
                            jasmine.any(errors.JsonSchemaValidationError));
                    expect(err.errors[0].message)
                            .toBe('Invalid type: number (expected string)');
                    done();
                });

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

            });

        });

        describe('userGet', function() {

            beforeEach(function() {
                req.params = {
                    userId: newDbUser.id
                };
            });

            it('gets a user by their id.', function(done) {

                res.json.and.callFake(function(response) {
                    expect(response).toEqual({
                        id: newDbUser.id,
                        name: newDbUser.name,
                        permission: newDbUser.permission
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
                        id: newDbUser.id,
                        name: newDbUser.name,
                        email: newDbUser.email,
                        permission: newDbUser.permission
                    });
                    done();
                });

                req.user = Users.adminUser;
                ctrl.user.get(req, res, callback);

            });

        });

        describe('userPost', function() {

            beforeEach(function initRequest() {
                req.user = Users.adminUser;
                req.params = {
                    userId: Users.verifiedUser.id
                };
                req.body = {};
            });

            afterEach(function resetUser() {
                Users.get('user/' + Users.verifiedUser.id)
                    .then(function(result) {
                        result.email = Users.verifiedUser.email;
                        result.name = Users.verifiedUser.name;
                        result.permission = 20;
                        util.processPassword(result);
                        Users.put(result);
                    });
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
                            email: Users.verifiedUser.email,
                            name: newUser1.name,
                            permission: 20
                        }));
                    done();

                });

                req.body.name = newUser1.name;
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

                req.body.email = Users.unverifiedUser.email;
                ctrl.user.post(req, res, callback);

            });

            it('updates a users email.', function(done) {

                res.json.and.callFake(function(response) {
                    expect(response).toEqual(new SuccessMessage(
                        'User has been updated, and an ' +
                        'email has been sent to the new address.', {
                            email: newUser1.email,
                            name: Users.verifiedUser.name,
                            permission: 30
                        }));
                    Users.verifiedUser.email = newUser1.email;
                    done();
                });

                req.body.email = newUser1.email;
                ctrl.user.post(req, res, callback);

            });

            it('updates a users password.', function(done) {

                res.json.and.callFake(function(response) {
                    expect(response).toEqual(new SuccessMessage(
                        'User has been successfully updated.', {
                            email: Users.verifiedUser.email,
                            name: Users.verifiedUser.name,
                            permission: 20
                        }));
                    Users.verifiedUser.password = newUser1.password;
                    done();

                });

                req.body.password = newUser1.password;
                ctrl.user.post(req, res, callback);

            });

        });

        describe('userDelete', function() {

            beforeEach(function() {
                req.user = Users.adminUser;
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

                req.params.userId = newDbUser.id;
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

                req.params.token = newDbUser.secret;
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
                ctrl.strategy(newUser1.email, newUser1.password,
                    function(err) {
                        expect(err).toEqual(jasmine.any(errors.LoginError));
                        done();
                    });
            });

            it('doesn\'t log in a user with a bad password.', function(done) {

                ctrl.strategy(Users.verifiedUser.email, 'BAD PASSWORD!',
                    function(err) {
                        expect(err)
                            .toEqual(jasmine.any(errors.LoginError));
                        done();
                    });
            });

            it('logs in a valid user.', function(done) {

                ctrl.strategy(
                    Users.verifiedUser.email,
                    Users.verifiedUser.password,
                    function(err, user) {
                        expect(err).toBeNull();
                        expect(user.id).toEqual(Users.verifiedUser.id);
                        done();
                    });

            });
        });

    });

});
