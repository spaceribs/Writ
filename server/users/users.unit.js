'use strict';

var jsf = require('json-schema-faker');
var userModel = require('../../models').io.user;
var _ = require('lodash');
var mockery = require('mockery');

describe('Users Unit Tests', function() {

    var userOne = jsf(userModel);
    var userTwo = jsf(userModel);

    beforeAll(function() {
        mockery.enable({
            warnOnReplace: false,
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

        beforeAll(function() {
            mockery.registerSubstitute('./users.db', './users.db.mock');
            mockery.registerSubstitute('nodemailer', './users.db.mock');
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
                        data: userOne
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
                        data: userOne
                    });
            });

        });

        describe('usersPost', function() {

            beforeAll(function() {
                req = {body: userOne};
            });

            it('creates a new user with the post body', function() {
                ctrl.users.post(req, res, callback);
            });

        });

        xdescribe('usersList', function() {});

        xdescribe('userGet', function() {});

        xdescribe('userPost', function() {});

        xdescribe('userDelete', function() {});

        xdescribe('userVerify', function() {});

    });

});
