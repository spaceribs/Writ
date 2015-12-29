'use strict';

var jsf = require('json-schema-faker');
var userModel = require('../../models').io.user;
var _ = require('lodash');
var mockery = require('mockery');
var uuid = require('node-uuid');
var errors = require('../app/errors');
var config = require('../config');

describe('Users Unit Tests', function() {

    var userOne = jsf(userModel);
    var userTwo = jsf(userModel);

    beforeAll(function() {
        mockery.enable({
            warnOnReplace     : false,
            warnOnUnregistered: false
        });
    });

    afterAll(function() {
        mockery.disable();
    });

    describe('users.util', function() {

        var util = require('./users.util');

        var processedUserOne = _.clone(userOne);
        var processedUserOneAlt = _.clone(userOne);
        var processedUserTwo = _.clone(userTwo);

        describe('getHash', function() {

            var hash = util.getHash(userOne.password, 'Some Salt');

            it('generates a valid sha512 hash string from a password and a salt.', function() {
                expect(hash).toEqual(jasmine.any(String));
                expect(hash).toMatch(/^[a-f0-9]{128}$/);
            });
        });

        describe('processPassword', function() {

            util.processPassword(processedUserOne);
            util.processPassword(processedUserOneAlt);
            util.processPassword(processedUserTwo);

            it('removes a password and generates a salt/hash.', function() {
                expect(processedUserOne.password).toBeUndefined();
                expect(processedUserOne.salt).toEqual(jasmine.any(String));
                expect(processedUserOne.hash).toEqual(jasmine.any(String));
            });

            it('checks the hash is valid.', function() {
                expect(processedUserOne.hash).toMatch(/^[a-f0-9]{128}$/);
            });

            it('checks that no collisions exist between users.', function() {
                expect(processedUserOne.salt).not.toEqual(processedUserTwo.salt);
                expect(processedUserOne.hash).not.toEqual(processedUserTwo.hash);
            });

            it('checks that no collisions exist even if users have the same password.', function() {
                expect(processedUserOne.salt).not.toEqual(processedUserOneAlt.salt);
                expect(processedUserOne.hash).not.toEqual(processedUserOneAlt.hash);
            });

        });

        describe('checkPassword', function() {

            it('validates a matching password correctly.', function() {
                var userOneCheck = util
                        .checkPassword(userOne.password, processedUserOne.salt, processedUserOne.hash);
                expect(userOneCheck).toEqual(jasmine.any(Boolean));
                expect(userOneCheck).toBe(true);
            });

            it('validates a different salt/hash correctly.', function() {
                var userOneAltCheck = util
                        .checkPassword(userOne.password, processedUserOneAlt.salt, processedUserOneAlt.hash);
                expect(userOneAltCheck).toEqual(jasmine.any(Boolean));
                expect(userOneAltCheck).toBe(true);
            });

            it('validates that incorrect passwords fail to match.', function() {
                var userOneCheck = util
                        .checkPassword('$$$ THIS IS WRONG $$$', processedUserOne.salt, processedUserOne.hash);
                expect(userOneCheck).toEqual(jasmine.any(Boolean));
                expect(userOneCheck).toBe(false);
            });

        });

    });

    describe('users.ctrl', function() {

        var ctrl;
        var req;
        var res;
        var callback;
        var mailerMethods;
        var mockMailer;

        beforeAll(function() {

            mailerMethods = {
                sendMail: function(content, callback) {
                    callback();
                }
            };
            spyOn(mailerMethods, 'sendMail').and.callThrough();

            mockMailer = {
                createTransport: function() {
                    return mailerMethods;
                }
            };
            spyOn(mockMailer, 'createTransport').and.callThrough();

            mockery.registerMock('nodemailer', mockMailer);
            mockery.registerSubstitute('./users.db', './users.db.mock');
            ctrl = require('./users.ctrl');
        });

        beforeEach(function() {
            callback = jasmine.createSpy('callback');
            res = {json: jasmine.createSpy('json')};
        });

        describe('login', function() {

            beforeAll(function() {
                req = {user: userOne};
            });

            it('returns a successful login.', function() {
                ctrl.login(req, res);

                expect(res.json).toHaveBeenCalled();
                expect(res.json.calls.mostRecent().args[0])
                        .toEqual({
                            status: 'SUCCESS',
                            data  : userOne
                        });
            });

        });

        describe('usersOptions', function() {

            beforeAll(function() {
                req = {user: userOne};
            });

            it('returns a json-schema when requesting options.', function() {
                req.accepts = jasmine.createSpy('accepts').and.returnValue(true);
                ctrl.users.options(req, res, callback);

                expect(req.accepts).toHaveBeenCalled();
                expect(req.accepts).toHaveBeenCalledWith('json');
                expect(res.json).toHaveBeenCalled();
                expect(res.json.calls.mostRecent().args[0])
                        .toEqual(userModel);
            });

            it('passes through if json isn\'t accepted.', function() {
                req.accepts = jasmine.createSpy('accepts').and.returnValue(false);
                ctrl.users.options(req, res, callback);

                expect(req.accepts).toHaveBeenCalled();
                expect(res.json).not.toHaveBeenCalled();
                expect(callback).toHaveBeenCalled();
            });

        });

        describe('usersGet', function() {

            beforeAll(function() {
                req = {user: userOne};
            });

            it('returns the decorated profile of the current user.', function() {
                ctrl.users.get(req, res);

                expect(res.json).toHaveBeenCalled();
                expect(res.json.calls.mostRecent().args[0])
                        .toEqual({
                            status: 'SUCCESS',
                            data  : userOne
                        });
            });

        });

        describe('usersPost', function() {

            var userThree;

            beforeEach(function() {
                userThree = jsf(userModel);
                req = {body: userThree};
            });

            afterEach(function() {
                mailerMethods.sendMail.and.stub();
                mailerMethods.sendMail.and.callThrough();
            });

            it('creates a new user with the post body.', function(done) {
                res.json.and.callFake(function() {
                    expect(res.json).toHaveBeenCalled();
                    expect(res.json.calls.mostRecent().args[0])
                            .toEqual({
                                status : 'SUCCESS',
                                message: 'Please check your email to verify your account.',
                                data   : {
                                    id   : jasmine.any(String),
                                    email: userThree.email
                                }
                            });
                    done();
                });

                ctrl.users.post(req, res, callback);
                expect(callback).not.toHaveBeenCalled();
            });

            it('checks if the email already exists before creating a new user.', function(done) {
                callback.and.callFake(function() {
                    expect(callback).toHaveBeenCalled();
                    expect(callback.calls.mostRecent().args[0])
                            .toEqual(jasmine.any(errors.EmailUsedError));
                    done();
                });

                res.json.and.callFake(function() {
                    ctrl.users.post(req, res, callback);
                });
                ctrl.users.post(req, res, callback);
            });

            it('constructs an email for users to verify their accounts.', function(done) {
                mailerMethods.sendMail.and.callFake(function(options) {
                    expect(options).toEqual({
                        from   : config.sysop,
                        to     : userThree.email,
                        subject: 'Writ - Verify your email address',
                        html   : jasmine.any(String)
                    });
                    done();
                });

                ctrl.users.post(req, res, callback);
            });

        });

        describe('usersList', function() {

            var userThree;

            beforeEach(function() {
                userThree = jsf(userModel);
                req = {body: userThree};
            });

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
                expect(callback).not.toHaveBeenCalled();
            });

        });

        describe('userGet', function() {

            var userThree;
            var postReq;
            var postRes;

            beforeEach(function() {
                userThree = jsf(userModel);
                req = {params: {userId: uuid.v4()}};
                postReq = {body: userThree};
                postRes = {json: jasmine.createSpy('post-json')};
            });

            it('gets a user by their id.', function(done) {

                postRes.json.and.callFake(function(response) {
                    expect(response.data).toBeDefined();
                    expect(response.data.id).toBeDefined();
                    req.params.userId = response.data.id;

                    ctrl.user.get(req, res, callback);
                });

                res.json.and.callFake(function(response) {
                    expect(response.name).toBe(userThree.name);
                    expect(callback).not.toHaveBeenCalled();
                    done();
                });

                ctrl.users.post(postReq, postRes, callback);
            });

            it('returns a 404 error if no user exists.', function(done) {

                callback.and.callFake(function() {
                    expect(callback).toHaveBeenCalled();
                    expect(callback.calls.mostRecent().args[0])
                            .toEqual({
                                status : 404,
                                name   : 'not_found',
                                message: 'missing',
                                reason : 'missing'
                            });
                    done();
                });

                ctrl.user.get(req, res, callback);
            });

            /*
            xit('returns more information if you are an admin.', function() {});
            */

        });

        describe('userPost', function() {

            var userThree;
            var postRes;

            beforeEach(function() {
                userThree = jsf(userModel);
                req = {body: userThree, params: {userId: uuid.v4()}};
                postRes = {json: jasmine.createSpy('post-json')};
            });

            /*
            xit('returns a 404 error if no user exists.', function(done) {

                callback.and.callFake(function() {
                    expect(callback).toHaveBeenCalled();
                    expect(callback.calls.mostRecent().args[0])
                            .toEqual({
                                status : 404,
                                name   : 'not_found',
                                message: 'missing',
                                reason : 'missing'
                            });
                    done();
                });

                ctrl.user.get(req, res, callback);
            });
            */

            it('updates basic user information.', function(done) {

                postRes.json.and.callFake(function(response) {
                    expect(response.data).toBeDefined();
                    expect(response.data.id).toBeDefined();
                    req.params.userId = response.data.id;

                    req.body = {name: userThree.name};

                    ctrl.user.post(req, res, callback);
                });

                res.json.and.callFake(function(response) {
                    expect(callback).not.toHaveBeenCalled();
                    expect(response).toEqual({
                        status : 'SUCCESS',
                        message: 'User has been successfully updated.',
                        data: {
                            email: userThree.email,
                            name: userThree.name
                        }
                    });
                    done();
                });

                ctrl.users.post({
                    body: userThree
                }, postRes, callback);

            });

            /*
            xit('doesn\'t update a user if their email is already associated with another account.', function() {});
            */

            it('updates a users email.', function(done) {

                postRes.json.and.callFake(function(response) {
                    expect(response.data).toBeDefined();
                    expect(response.data.id).toBeDefined();
                    req.params.userId = response.data.id;

                    req.body = {email: userThree.email};

                    ctrl.user.post(req, res, callback);
                });

                res.json.and.callFake(function(response) {
                    expect(callback).not.toHaveBeenCalled();
                    expect(response).toEqual({
                        status : 'SUCCESS',
                        message: 'User has been updated, and an email has been sent to the new address.',
                        data: {
                            email: userThree.email,
                            name: userThree.name
                        }
                    });
                    done();
                });

                ctrl.users.post({
                    body: userThree
                }, postRes, callback);

            });

            /*
            xit('updates a users password.', function() {});

            xit('updates permissions for a user.', function() {});
            */

        });

        /*
        describe('userDelete', function() {});

        describe('userVerify', function() {});
        */

    });

});
