'use strict';

var userUtil = require('./users.util');
var jsf = require('json-schema-faker');
var userModel = require('../../models').user;
var _ = require('lodash');

describe('users', function() {

    var userOne = jsf(userModel);
    var userTwo = jsf(userModel);

    describe('users.util', function() {

        var processedUserOne = _.clone(userOne);
        var processedUserOneAlt = _.clone(userOne);
        var processedUserTwo = _.clone(userTwo);

        describe('getHash', function() {

            var hash = userUtil.getHash(userOne.password, 'Some Salt');

            it('generates a valid sha512 hash string from a password and a salt.', function() {
                expect(hash).toEqual(jasmine.any(String));
                expect(hash).toMatch(/^[a-f0-9]{128}$/);
            });
        });

        describe('processPassword', function() {

            userUtil.processPassword(processedUserOne);
            userUtil.processPassword(processedUserOneAlt);
            userUtil.processPassword(processedUserTwo);

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
                var userOneCheck = userUtil
                        .checkPassword(userOne.password, processedUserOne.salt, processedUserOne.hash);
                expect(userOneCheck).toEqual(jasmine.any(Boolean));
                expect(userOneCheck).toBe(true);
            });

            it('validates a different salt/hash correctly.', function() {
                var userOneAltCheck = userUtil
                        .checkPassword(userOne.password, processedUserOneAlt.salt, processedUserOneAlt.hash);
                expect(userOneAltCheck).toEqual(jasmine.any(Boolean));
                expect(userOneAltCheck).toBe(true);
            });

            it('validates that incorrect passwords fail to match.', function() {
                var userOneCheck = userUtil
                        .checkPassword('$$$ THIS IS WRONG $$$', processedUserOne.salt, processedUserOne.hash);
                expect(userOneCheck).toEqual(jasmine.any(Boolean));
                expect(userOneCheck).toBe(false);
            });

        });

    });

});
