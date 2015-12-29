'use strict';

var jsf = require('json-schema-faker');
var userModel = require('../../models').io.user;
var _ = require('lodash');
var mockery = require('mockery');
var uuid = require('node-uuid');
var errors = require('../app/errors');
var config = require('../config');

describe('Users Unit Tests', function() {

    var userOne;
    var userTwo;
    var userThree;

    beforeAll(function() {
        mockery.enable({
            warnOnReplace     : false,
            warnOnUnregistered: false
        });
    });

    afterAll(function() {
        mockery.disable();
    });

    beforeEach(function() {
        userOne = jsf(userModel);
        userTwo = jsf(userModel);
        userThree = jsf(userModel);
    });

    describe('users.util', function() {

        var util = require('./users.util');

        describe('getHash', function() {

            it('generates a valid sha512 hash string from a password and a salt.', function() {
                var hash = util.getHash(userOne.password, 'Some Salt');

                expect(hash).toEqual(jasmine.any(String));
                expect(hash).toMatch(/^[a-f0-9]{128}$/);
            });
        });

        describe('processPassword', function() {

            it('removes a password and generates a salt/hash.', function() {
                var processedUserOne = _.clone(userOne);

                util.processPassword(processedUserOne);

                expect(processedUserOne.password).toBeUndefined();
                expect(processedUserOne.salt).toEqual(jasmine.any(String));
                expect(processedUserOne.hash).toEqual(jasmine.any(String));
            });

            it('checks the hash is valid.', function() {
                var processedUserOne = _.clone(userOne);
                util.processPassword(processedUserOne);

                expect(processedUserOne.hash).toMatch(/^[a-f0-9]{128}$/);
            });

            it('checks that no collisions exist between users.', function() {
                var processedUserOne = _.clone(userOne);
                var processedUserTwo = _.clone(userTwo);

                util.processPassword(processedUserOne);
                util.processPassword(processedUserTwo);

                expect(processedUserOne.salt).not.toEqual(processedUserTwo.salt);
                expect(processedUserOne.hash).not.toEqual(processedUserTwo.hash);
            });

            it('checks that no collisions exist even if users have the same password.', function() {
                var processedUserOne = _.clone(userOne);
                var processedUserOneAlt = _.clone(userOne);

                util.processPassword(processedUserOne);
                util.processPassword(processedUserOneAlt);

                expect(processedUserOne.salt).not.toEqual(processedUserOneAlt.salt);
                expect(processedUserOne.hash).not.toEqual(processedUserOneAlt.hash);
            });

        });

        describe('checkPassword', function() {

            it('validates a matching password correctly.', function() {
                var processedUserOne = _.clone(userOne);
                util.processPassword(processedUserOne);

                var userOneCheck = util
                        .checkPassword(userOne.password, processedUserOne.salt, processedUserOne.hash);

                expect(userOneCheck).toEqual(jasmine.any(Boolean));
                expect(userOneCheck).toBe(true);
            });

            it('validates that incorrect passwords fail to match.', function() {
                var processedUserOne = _.clone(userOne);
                util.processPassword(processedUserOne);

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
                /**
                 * Mock method for sending an email.
                 *
                 * @param {object} content - content to send.
                 * @param {function} callback - Callback function.
                 */
                sendMail: function(content, callback) {
                    callback();
                }
            };
            spyOn(mailerMethods, 'sendMail').and.callThrough();

            mockMailer = {
                /**
                 * Mock method for creating a transport.
                 *
                 * @returns {{sendMail: mailerMethods.sendMail}}
                 */
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

        afterEach(function() {
            mailerMethods.sendMail.and.stub();
            mailerMethods.sendMail.and.callThrough();
        });

        describe('login', function() {

            it('returns a successful login.', function() {
                userOne.permission = 30;
                req = {user: userOne};
                ctrl.login(req, res);

                expect(res.json).toHaveBeenCalled();
                expect(res.json.calls.mostRecent().args[0])
                    .toEqual({
                        status: 'SUCCESS',
                        data  : {
                            email: userOne.email,
                            name: userOne.name,
                            permission: userOne.permission
                        }
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

            it('returns the decorated profile of the current user.', function() {
                req = {user: userOne};
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

            beforeEach(function() {
                req = {body: userThree};
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
                callback.and.callFake(function(err) {
                    expect(err).toEqual(jasmine.any(errors.EmailUsedError));
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

            xit('returns an error if you aren\'t an admin.', function() {});

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

            xit('returns more information if you are an admin.', function() {});

        });

        describe('userPost', function() {

            var postRes;

            beforeEach(function() {
                req = {body: userThree, params: {userId: uuid.v4()}};
                postRes = {json: jasmine.createSpy('post-json')};
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

            it('updates basic user information.', function(done) {

                postRes.json.and.callFake(function(response) {
                    expect(response.data).toBeDefined();
                    expect(response.data.id).toBeDefined();
                    req.params.userId = response.data.id;

                    req.body = {name: userTwo.name};

                    ctrl.user.post(req, res, callback);
                });

                res.json.and.callFake(function(response) {
                    expect(callback).not.toHaveBeenCalled();
                    expect(response).toEqual({
                        status : 'SUCCESS',
                        message: 'User has been successfully updated.',
                        data: {
                            email: userOne.email,
                            name: userTwo.name,
                            permission: 30
                        }
                    });
                    done();
                });

                ctrl.users.post({
                    body: userOne
                }, postRes, callback);

            });

            it('doesn\'t update a user if their email is already ' +
            'associated with another account.', function(done) {

                postRes.json.and.callFake(function(response) {
                    expect(response.data).toBeDefined();
                    expect(response.data.id).toBeDefined();
                    req.params.userId = response.data.id;

                    req.body = {email: userOne.email};

                    ctrl.user.post(req, res, callback);
                });

                callback.and.callFake(function() {
                    expect(callback).toHaveBeenCalled();
                    expect(callback.calls.mostRecent().args[0])
                            .toEqual(jasmine.any(errors.EmailUsedError));
                    done();
                });

                var userOneRes = {
                    json: function() {
                        ctrl.users.post({
                            body: userTwo
                        }, postRes, callback);
                    }
                };

                ctrl.users.post({
                    body: userOne
                }, userOneRes, callback);
            });

            it('updates a users email.', function(done) {

                postRes.json.and.callFake(function(response) {
                    expect(response.data).toBeDefined();
                    expect(response.data.id).toBeDefined();
                    req.params.userId = response.data.id;

                    req.body = {email: userOne.email};

                    ctrl.user.post(req, res, callback);
                });

                res.json.and.callFake(function(response) {
                    expect(callback).not.toHaveBeenCalled();
                    expect(response).toEqual({
                        status : 'SUCCESS',
                        message: 'User has been updated, and an email has been sent to the new address.',
                        data: {
                            email: userOne.email,
                            name: userOne.name,
                            permission: 30
                        }
                    });
                    done();
                });

                ctrl.users.post({
                    body: userOne
                }, postRes, callback);

            });

            it('updates a users password.', function(done) {

                var loginRes = {
                    /**
                     * Temporary callback for login response.
                     *
                     * @param {object} response - Response object
                     */
                    json: function(response) {
                        expect(response).toEqual({
                            status: 'SUCCESS',
                            data  : {
                                email: userOne.email
                            }
                        });
                        done();
                    }
                };

                postRes.json.and.callFake(function(response) {
                    expect(response.data).toBeDefined();
                    expect(response.data.id).toBeDefined();
                    req.params.userId = response.data.id;

                    req.body = {password: userTwo.password};

                    ctrl.user.post(req, res, callback);
                });

                res.json.and.callFake(function(response) {
                    expect(callback).not.toHaveBeenCalled();
                    expect(response).toEqual({
                        status : 'SUCCESS',
                        message: 'User has been successfully updated.',
                        data: {
                            email: userOne.email,
                            name: userOne.name,
                            permission: 30
                        }
                    });

                    var loginReq = {user: {
                        email: userOne.email,
                        password: userTwo.password
                    }};

                    ctrl.login(loginReq, loginRes);
                });

                ctrl.users.post({
                    body: userOne
                }, postRes, callback);

            });

            xit('admin can update permissions for a user.', function() {});

        });

        describe('userDelete', function() {

            var postRes;

            beforeEach(function() {
                req = {body: userOne, params: {userId: uuid.v4()}};
                postRes = {json: jasmine.createSpy('post-json')};
            });

            it('returns an error if the user doesn\'t exist.', function(done) {
                callback.and.callFake(function(response) {
                    expect(response).toEqual({
                            status: 404,
                            name: 'not_found',
                            message: 'missing',
                            reason: 'missing'
                        });
                    done();
                });

                ctrl.user.delete(req, postRes, callback);
            });

            it('deletes a user.', function(done) {
                res.json.and.callFake(function(response) {
                    expect(response).toEqual({
                        status: 'SUCCESS',
                        message: 'User has been deleted.'
                    });
                    done();
                });

                postRes.json.and.callFake(function(response) {
                    expect(response.data).toBeDefined();
                    expect(response.data.id).toBeDefined();
                    req.params.userId = response.data.id;

                    ctrl.user.delete(req, res, callback);
                });

                ctrl.users.post({
                    body: userOne
                }, postRes, callback);
            });

            xit('deletes a user if they are the owner of an account.',
                function() {});

            xit('deletes a user if they are an admin.',
                function() {});

            xit('doesn\'t delete a user if you aren\'t an owner/admin.',
                function() {});

        });

        describe('userVerify', function() {

            var postRes;

            beforeEach(function() {
                req = {params: {token: uuid.v4()}};
                postRes = {json: jasmine.createSpy('post-json')};
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

            it('verifies a user via email sent.', function(done) {
                res.json.and.callFake(function(response) {
                    expect(response).toEqual({
                        status: 'SUCCESS',
                        message: 'Your email has been verified.'
                    });

                    done();
                });

                mailerMethods.sendMail.and.callFake(function(options) {
                    expect(options.html).toEqual(jasmine.any(String));
                    var tokenRegex = /\/verify\/([a-f0-9-]*)/ig;
                    req.params.token = tokenRegex.exec(options.html)[1];

                    ctrl.user.verify(req, res, callback);
                });

                ctrl.users.post({
                    body: userOne
                }, postRes, callback);
            });

        });

        describe('loginStrategy', function() {

            var postRes;

            beforeEach(function() {
                req = {params: {token: uuid.v4()}};
                postRes = {json: jasmine.createSpy('post-json')};
            });

            it('doesn\'t log in a non existent user.', function(done) {
                ctrl.strategy(userOne.email, userOne.password,
                    function(err) {
                        expect(err).toEqual(jasmine.any(errors.LoginError));
                        done();
                    });
            });

            it('doesn\'t log in a user with a bad password.', function(done) {

                postRes.json.and.callFake(function(response) {
                    expect(response.data).toBeDefined();
                    expect(response.data.id).toBeDefined();

                    ctrl.strategy(userOne.email, userTwo.password,
                        function(err) {
                            expect(err)
                                .toEqual(jasmine.any(errors.LoginError));
                            done();
                        });
                });

                ctrl.users.post({
                    body: userOne
                }, postRes, callback);
            });

            it('logs in a valid user.', function(done) {

                postRes.json.and.callFake(function(response) {
                    expect(response.data).toBeDefined();
                    expect(response.data.id).toBeDefined();

                    ctrl.strategy(userOne.email, userOne.password,
                        function(err, user) {
                            expect(err).toBeNull();
                            expect(user).toEqual({
                                email: userOne.email,
                                name: userOne.name,
                                salt: jasmine.any(String),
                                hash: jasmine.any(String),
                                secret: jasmine.any(String),
                                id: response.data.id,
                                created: jasmine.any(String),
                                permission: 30,
                                _id: jasmine.any(String),
                                _rev: jasmine.any(String)
                            });
                            done();
                        });
                });

                ctrl.users.post({
                    body: userOne
                }, postRes, callback);
            });
        });

    });

});
