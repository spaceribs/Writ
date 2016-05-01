'use strict';

var jsf = require('json-schema-faker');
var models = require('../../models');
var mockery = require('mockery');
var uuid = require('node-uuid');
var errors = require('../app/app.errors');
var SuccessMessage = require('../app/app.successes').SuccessMessage;

var Users = require('../users/users.db.mock');
var Places = require('../places/places.db.mock');
var Passages = require('../passages/passages.db.mock');

describe('Passages', function() {

    var newPassage;
    var users;
    var places;
    var passages;
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
        mockery.registerSubstitute(
            './places.db', './places.db.mock');
        mockery.registerSubstitute(
            './passages.db', './passages.db.mock');

        ctrl = require('./passages.ctrl');
    });

    afterAll(function() {
        mockery.deregisterAll();
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

            /*eslint-disable */
            /* istanbul ignore next */
            res.json.and.callFake(function(response) {
                console.error('UNEXPECTED RESPONSE: \n', response);
            });

            /* istanbul ignore next */
            callback.and.callFake(function(err) {
                console.error('UNEXPECTED ERROR: \n', err);
            });
            /*eslint-enable */

        }
    );

    beforeEach(
        /**
         * For each test, create a new set of places for testing.
         *
         * @param {function} done - Called when all users have been set up.
         */
        function placesSetup(done) {

            newPassage = jsf(models.io.passage, models.refs);

            Users.mockUsers()
                .then(function(mockUsers) {
                    users = mockUsers;
                    return Places.mockPlaces(users);
                })
                .then(function(mockPlaces) {
                    places = mockPlaces;
                    return Passages.mockPassages(places);
                })
                .then(function(mockPassages) {
                    passages = mockPassages;
                })
                .then(done)
            /*eslint-disable */
            /* istanbul ignore next */
                .catch(function(err) {
                    console.error(err.stack);
                });
            /*eslint-enable */

        }
    );

    afterEach(function(done) {

        Users.erase()
            .then(function() {
                return Places.erase();
            })
            .then(function() {
                return Passages.erase();
            })
            .then(done)
        /*eslint-disable */
        /* istanbul ignore next */
            .catch(function(err) {
                console.error(err);
            });
        /*eslint-enable */

    });

    describe('Controller', function() {

        describe('passagesOptions()', function() {

            it('returns a json-schema when requesting options.',
                function(done) {
                    req.accepts.and.returnValue(true);

                    res.json.and.callFake(function(response) {
                        expect(req.accepts).toHaveBeenCalled();
                        expect(req.accepts).toHaveBeenCalledWith('json');
                        expect(response)
                            .toEqual(models.io.passage);
                        done();
                    });

                    ctrl.passages.options(req, res, callback);

                });

            it('passes through if json isn\'t accepted.', function(done) {
                req.accepts.and.returnValue(false);

                callback.and.callFake(function(response) {
                    expect(req.accepts).toHaveBeenCalled();
                    expect(res.json).not.toHaveBeenCalled();
                    expect(response).toBeUndefined();
                    done();
                });

                ctrl.passages.options(req, res, callback);
            });
        });

        xdescribe('passagesGet()', function() {
            xit('returns authenticated users\' owned passages.', function(done) {
                req.user = users.verifiedUser;
                ctrl.places.get(req, res, callback);

                res.json.and.callFake(function(response) {
                    expect(response.data.length).toBe(3);
                    done();
                });

            });

            xit('returns a 404 error if there are no passages found.',
                function(done) {
                    req.user = users.unverifiedUser;
                    ctrl.places.get(req, res, callback);

                    callback.and.callFake(function(err) {
                        expect(callback).toHaveBeenCalled();
                        expect(err)
                            .toEqual(jasmine.any(errors.PlacesNotFoundError));
                        done();
                    });

                });

            xit('doesn\'t return some information to verified users.',
                function(done) {
                    req.user = users.verifiedUser;
                    ctrl.places.get(req, res, callback);

                    res.json.and.callFake(function(response) {
                        expect(response.data[0].created).toBeUndefined();
                        done();
                    });
                });

            xit('returns more information to admin users.',
                function(done) {
                    req.user = users.adminUser;
                    ctrl.places.get(req, res, callback);

                    res.json.and.callFake(function(response) {
                        expect(response.data[0].created).toBeDefined();
                        done();
                    });
                });
        });

        xdescribe('passagesPost()', function() {
            xit('creates a new passage owned by the current user.',
                function(done) {
                    req.user = users.verifiedUser;
                    req.body = newPlace;
                    req.body.pos = {x: 1, y: 2, z: 0};
                    ctrl.places.post(req, res, callback);

                    res.json.and.callFake(function(response) {
                        expect(response)
                            .toEqual(jasmine.any(SuccessMessage));
                        done();
                    });
                });

            xit('doesn\'t allow a passage to be created at ' +
                'an existing position.',
                function(done) {
                    req.user = users.verifiedUser;
                    req.body = newPlace;
                    req.body.pos = places.lobby.pos;
                    ctrl.places.post(req, res, callback);

                    callback.and.callFake(function(err) {
                        expect(err)
                            .toEqual(jasmine.any(errors.PlaceInvalidError));
                        done();
                    });
                });

            xit('doesn\'t allow a passage to be created below ground level ' +
                'without a place above.',
                function(done) {
                    req.user = users.verifiedUser;
                    req.body = newPlace;
                    req.body.pos = {x: 1, y: 2, z: -1};
                    ctrl.places.post(req, res, callback);

                    callback.and.callFake(function(err) {
                        expect(err)
                            .toEqual(jasmine.any(errors.PlaceInvalidError));
                        done();
                    });
                });

            xit('doesn\'t allow a passage to be created above ground level ' +
                'without a place below.',
                function(done) {
                    req.user = users.verifiedUser;
                    req.body = newPlace;
                    req.body.pos = {x: 1, y: 2, z: 1};
                    ctrl.places.post(req, res, callback);

                    callback.and.callFake(function(err) {
                        expect(err)
                            .toEqual(jasmine.any(errors.PlaceInvalidError));
                        done();
                    });
                });

            xit('creates a new passage above ground level if ' +
                'there is a passage below.',
                function(done) {
                    req.user = users.verifiedUser;
                    req.body = newPlace;
                    req.body.pos = {x: 0, y: 1, z: 1};
                    ctrl.places.post(req, res, callback);

                    res.json.and.callFake(function(response) {
                        expect(response)
                            .toEqual(jasmine.any(SuccessMessage));
                        done();
                    });
                });

            xit('creates a new passage below ground level if ' +
                'there is a passage above.',
                function(done) {
                    req.user = users.verifiedUser;
                    req.body = newPlace;
                    req.body.pos = {x: 0, y: 1, z: -1};
                    ctrl.places.post(req, res, callback);

                    res.json.and.callFake(function(response) {
                        expect(response)
                            .toEqual(jasmine.any(SuccessMessage));
                        done();
                    });
                });

            xit('doesn\'t create an invalid passage.', function(done) {
                req.user = users.verifiedUser;
                newPlace.invalid = true;
                req.body = newPlace;
                req.body.pos = {x: 1, y: 2, z: 0};
                ctrl.places.post(req, res, callback);

                callback.and.callFake(function(err) {
                    expect(err)
                        .toEqual(jasmine.any(errors.JsonSchemaValidationError));
                    expect(err.errors[0].message)
                        .toBe('Additional properties not allowed');
                    done();
                });

            });
        });

        xdescribe('passagesList()', function() {
            xit('lists all passages.', function(done) {
                req.user = users.adminUser;
                ctrl.places.list(req, res);

                res.json.and.callFake(function(response) {
                    expect(response)
                        .toEqual({
                            total_rows: 5,
                            offset: 0,
                            rows: jasmine.any(Array)
                        });
                    expect(response.rows.length).toEqual(5);
                    done();
                });
            });
        });

        xdescribe('passageGet()', function() {
            xit('gets the details of a specific passage.',
                function(done) {
                    req.params = {
                        placeId: places.lobby.id
                    };
                    ctrl.place.get(req, res, callback);

                    res.json.and.callFake(function(response) {
                        expect(response)
                            .toEqual(jasmine.any(SuccessMessage));
                        expect(response.data.created).toBeUndefined();
                        done();
                    });
                });

            xit('doesn\'t return anything if the passage doesn\'t exist',
                function(done) {
                    req.params = {
                        placeId: uuid.v4()
                    };
                    ctrl.place.get(req, res, callback);

                    callback.and.callFake(function(response) {
                        expect(response)
                            .toEqual(jasmine.any(errors.PlaceNotFoundError));
                        done();
                    });

                });

            xit('gets more information if you are an admin.',
                function(done) {
                    req.user = users.adminUser;
                    req.params = {
                        placeId: places.lobby.id
                    };
                    ctrl.place.get(req, res, callback);

                    res.json.and.callFake(function(response) {
                        expect(response)
                            .toEqual(jasmine.any(SuccessMessage));
                        expect(response.data.created).toBeDefined();
                        done();
                    });
                });
        });

        xdescribe('passagePost()', function() {
            xit('allows normal users to make updates ' +
                'to passages they own.', function(done) {
                req.user = users.verifiedUser;
                req.params = {
                    placeId: places.northRoom.id
                };
                req.body = {
                    name: newPlace.name
                };
                ctrl.place.post(req, res, callback);

                res.json.and.callFake(function(response) {
                    expect(response.data.name)
                        .toBe(newPlace.name);
                    expect(response)
                        .toEqual(jasmine.any(SuccessMessage));
                    done();
                });
            });

            xit('doesn\'t allow normal users to make changes ' +
                'to passages they don\'t own.', function(done) {
                req.user = users.verifiedUser;
                req.params = {
                    placeId: places.lobby.id
                };
                req.body = {
                    name: newPlace.name
                };
                callback.and.callFake(function(err) {
                    expect(err)
                        .toEqual(jasmine.any(errors.ForbiddenError));
                    done();
                });

                ctrl.place.post(req, res, callback);
            });

            xit('allows admin users to make changes ' +
                'to passages they don\'t own.', function(done) {
                req.user = users.adminUser;
                req.params = {
                    placeId: places.lobby.id
                };
                req.body = {
                    name: newPlace.name
                };
                ctrl.place.post(req, res, callback);

                res.json.and.callFake(function(response) {
                    expect(response.data.name)
                        .toBe(newPlace.name);
                    expect(response)
                        .toEqual(jasmine.any(SuccessMessage));
                    done();
                });
            });

            xit('allows admin users to change passage owners.',
                function(done) {
                req.user = users.adminUser;
                req.params = {
                    placeId: places.northRoom.id
                };
                req.body = {
                    owner: users.unverifiedUser._id
                };
                ctrl.place.post(req, res, callback);

                res.json.and.callFake(function(response) {
                    expect(response.data.owner)
                        .toBe(users.unverifiedUser._id);
                    expect(response)
                        .toEqual(jasmine.any(SuccessMessage));
                    done();
                });
            });

            xit('doesn\'t allow normal users to change ' +
                'passage owners.', function(done) {
                req.user = users.verifiedUser;
                req.params = {
                    placeId: places.northRoom.id
                };
                req.body = {
                    owner: users.unverifiedUser
                };
                ctrl.place.post(req, res, callback);

                callback.and.callFake(function(err) {
                    expect(err)
                        .toEqual(jasmine.any(errors.ForbiddenError));
                    done();
                });
            });

            xit('doesn\'t update anything if the passage doesn\'t ' +
                'exist.', function(done) {
                req.user = users.verifiedUser;
                req.params = {
                    placeId: uuid.v4()
                };
                req.body = {
                    name: newPlace.name
                };
                ctrl.place.post(req, res, callback);

                callback.and.callFake(function(err) {
                    expect(err)
                        .toEqual(jasmine.any(errors.PlaceNotFoundError));
                    done();
                });
            });

            xit('doesn\'t update anything if the passage ' +
                'is invalid.', function(done) {
                req.user = users.adminUser;
                req.params = {
                    placeId: places.invalidRoom.id
                };
                req.body = {
                    name: newPlace.name
                };
                ctrl.place.post(req, res, callback);

                callback.and.callFake(function(err) {
                    expect(err)
                        .toEqual(jasmine.any(errors.JsonSchemaValidationError));
                    done();
                });
            });
        });

        xdescribe('passageDelete()', function() {
            xit('deletes a specific passage.', function(done) {
                req.user = users.adminUser;
                req.params = {
                    placeId: places.northRoom.id
                };
                ctrl.place.delete(req, res, callback);

                res.json.and.callFake(function(response) {
                    expect(response)
                        .toEqual(jasmine.any(SuccessMessage));
                    done();
                });
            });

            xit('doesn\'t delete anything if the passage doesn\'t exist',
                function(done) {
                    req.user = users.adminUser;
                    req.params = {
                        placeId: uuid.v4()
                    };
                    ctrl.place.delete(req, res, callback);

                    callback.and.callFake(function(err) {
                        expect(err)
                            .toEqual(jasmine.any(errors.PlaceNotFoundError));
                        done();
                    });
                });
        });

    });

});
