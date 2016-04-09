'use strict';

var jsf = require('json-schema-faker');
var models = require('../../models');
var mockery = require('mockery');
var uuid = require('node-uuid');
var errors = require('../app/app.errors');
var SuccessMessage = require('../app/app.successes').SuccessMessage;

var Places = require('./places.db.mock');
var Users = require('../users/users.db.mock');

describe('Places', function() {

    var newUser;

    var adminUser;
    var verifiedUser;
    var unverifiedUser;
    var invalidUser;

    var ctrl;

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

            newUser = jsf(models.io.user, models.refs);

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
                })
                .then(done);

        }
    );

    describe('Controller', function() {

        describe('placesOptions()', function() {
            xit('returns a json-schema when requesting options.', function() {
                req.accepts.and.returnValue(true);

                ctrl.users.options(req, res, callback);

                expect(req.accepts).toHaveBeenCalled();
                expect(req.accepts).toHaveBeenCalledWith('json');
                expect(res.json).toHaveBeenCalled();
                expect(res.json.calls.mostRecent().args[0])
                    .toEqual(userModel);
            });

            xit('passes through if json isn\'t accepted.', function() {
                req.accepts.and.returnValue(false);

                ctrl.users.options(req, res, callback);

                expect(req.accepts).toHaveBeenCalled();
                expect(res.json).not.toHaveBeenCalled();
                expect(callback).toHaveBeenCalled();
            });
        });

        xdescribe('placesGet()', function() {
            xit('returns authenticated users\' owned places.', function() {});
        });

        xdescribe('placesPost()', function() {
            xit('creates a new place owned by the current user.', function() {});
        });

        xdescribe('placesList()', function() {
            xit('lists all places.', function() {});
        });

        xdescribe('placeGet()', function() {
            xit('gets the details of a specific place.', function() {});
        });

        xdescribe('placePost()', function() {
            xit('makes updates to a specific place.', function() {});
        });

        xdescribe('placeDelete()', function() {
            xit('deletes a specific place.', function() {});
        });

    });

});
