'use strict';

var jsf = require('json-schema-faker');
var placeModel = require('../../models').io.place;
var mockery = require('mockery');
var uuid = require('node-uuid');
var errors = require('../app/app.errors');
var SuccessMessage = require('../app/app.successes').SuccessMessage;

var Places = require('./places.db.mock');
var Users = require('../users/users.db.mock');

describe('Places', function() {

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

        xdescribe('placesGet()', function() {});

        xdescribe('placesPost()', function() {});

        xdescribe('placesList()', function() {});

        xdescribe('placeGet()', function() {});

        xdescribe('placePost()', function() {});

        xdescribe('placeDelete()', function() {});

    });

});
