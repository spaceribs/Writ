'use strict';

var app = require('../app');
var userUtil = require('./users.util');
var jsf = require('json-schema-faker');
var userModel = require('../../models').user;
var _ = require('lodash');

describe('Users', function() {

    describe('User Utilities', function() {

        it('processes passwords in response bodies', function() {

            var fakeUser = jsf(userModel);
            var fakeUserClone = _.clone(fakeUser);
            userUtil.processPassword(fakeUserClone);

            expect(fakeUserClone.password).toBeUndefined();
            expect(fakeUserClone.salt).toEqual(jasmine.any(String));
            expect(fakeUserClone.hash).toEqual(jasmine.any(String));
        });

        it('processes passwords in response bodies', function() {

            var fakeUser = jsf(userModel);
            var fakeUserClone = _.clone(fakeUser);
            userUtil.processPassword(fakeUserClone);

            expect(fakeUserClone.password).toBeUndefined();
            expect(fakeUserClone.salt).toEqual(jasmine.any(String));
            expect(fakeUserClone.hash).toEqual(jasmine.any(String));
        });

    });

});
