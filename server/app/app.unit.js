'use strict';

var jsf = require('json-schema-faker');
var models = require('../../models');
var _ = require('lodash');

describe('App Unit Tests', function() {

    var util;
    var database;
    var errors;
    var newUser;

    beforeAll(function() {
        util = require('./app.util');
        database = require('./app.db.handler.js');
        errors = require('./app.errors');
    });

    beforeEach(
        /**
         * For each test, create a new set of all users that
         * could be used in these tests. Also create a fake brand new user.
         */
        function userSetup() {
            newUser = jsf(models.io.user, models.refs);
        }
    );

    describe('Database Error Handler', function() {

        it('maps an error from the database to a handled Writ error.',
            function() {
                expect(function() {
                    database('place')({status: 404});
                }).toThrowError(errors.PlaceNotFoundError);
            });

        it('throws an unhandled or unknown error upward.',
            function() {
                expect(function() {
                    database('place')({status: 502});
                }).toThrow();
            });

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
                    var anotherUser = jsf(models.io.user, models.refs);

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

    describe('Errors', function() {

        beforeEach(function() {
            errors = require('./app.errors');
        });

        describe('ForbiddenError', function() {

            it('returns generic messaging if no message is provided.',
                function() {
                    var error = new errors.ForbiddenError();
                    expect(error.message).toEqual(jasmine.any(String));
                });

        });

        describe('EmailInUseError', function() {

            it('returns generic messaging if no message is provided',
                function() {
                    var error = new errors.EmailInUseError();
                    expect(error.message).toEqual(jasmine.any(String));
                });

        });

        describe('EmailTokenNotFoundError', function() {

            it('returns generic messaging if no message is provided',
                function() {
                    var error = new errors.EmailTokenNotFoundError(
                        null, '1234'
                    );
                    expect(error.message).toEqual(jasmine.any(String));
                    expect(error.token).toBe('1234');
                });

        });

        describe('PlacesNotFoundError', function() {

            it('returns generic messaging if no message is provided',
                function() {
                    var error = new errors.PlacesNotFoundError();
                    expect(error.message).toEqual(jasmine.any(String));
                });

        });

        describe('PassagesNotFoundError', function() {

            it('returns generic messaging if no message is provided',
                function() {
                    var error = new errors.PassagesNotFoundError();
                    expect(error.message).toEqual(jasmine.any(String));
                });

        });

        describe('PlaceInvalidError', function() {

            it('returns generic messaging if no message is provided',
                function() {
                    var error = new errors.PlaceInvalidError();
                    expect(error.message).toEqual(jasmine.any(String));
                });

        });

        describe('PassageInvalidError', function() {

            it('returns generic messaging if no message is provided',
                function() {
                    var error = new errors.PassageInvalidError();
                    expect(error.message).toEqual(jasmine.any(String));
                });

        });
    });

});
