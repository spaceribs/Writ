'use strict';

var jsf = require('json-schema-faker');
var models = require('../../models');
var mocks = require('../app/app.mock');
var supertest = require('supertest');
var util = require('../../test/util');

var Users = require('../users/users.db.mock');
var Places = require('../places/places.db.mock');
var Passages = require('../passages/passages.db.mock');

describe('Passages Endpoint', function() {

    var app;
    var newPassage;
    var places;
    var users;
    var passages;

    beforeAll(function() {
        mocks.enable();
        app = require('../app/app');
    });

    afterAll(mocks.disable);

    beforeEach(
        /**
         * For each test, create a new set of passages for testing.
         *
         * @param {function} done - Called when all users have been set up.
         */
        function passagesSetup(done) {

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
                console.error(err.stack);
            });
        /*eslint-enable */

    });

    describe('"/passage/" OPTIONS', function() {

        it('should return the JSON schema for passages.',
            function(done) {
                supertest(app)
                    .options('/passage/')
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        expect(res.body).toEqual(models.io.passage);
                    })
                    .expect(200)
                    .end(util.handleSupertest(done));
            });

    });

    describe('"/passage/" GET', function() {

        it('should return an error when ' +
            'you don\'t authenticate.', function(done) {
            supertest(app)
                .get('/passage/')
                .expect(401)
                .end(util.handleSupertest(done));

        });

        it('should return a list of owned places ' +
            'when basically authenticated.', function(done) {
            supertest(app)
                .get('/passage/')
                .auth(
                    users.verifiedUser.email,
                    users.verifiedUser.password
                )
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'Owned passages found.',
                        data   : jasmine.any(Array)
                    });
                    expect(res.body.data[0].owner)
                        .toBe(users.verifiedUser._id);
                })
                .expect(200)
                .end(util.handleSupertest(done));

        });

        it('should return an error if ' +
            'you don\'t own any passages.', function(done) {
            supertest(app)
                .get('/passage/')
                .auth(
                    users.newUser.email,
                    users.newUser.password
                )
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'PASSAGES_NOT_FOUND',
                        message: 'You do not own any passages.'
                    });
                })
                .expect(404)
                .end(util.handleSupertest(done));

        });

        it('should return more information ' +
            'when authenticated as an admin.', function(done) {
            supertest(app)
                .get('/passage/')
                .auth(users.adminUser.email, users.adminUser.password)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'Owned passages found.',
                        data   : jasmine.any(Array)
                    });
                    expect(res.body.data[0].created)
                        .toBeDefined();
                })
                .expect(200)
                .end(util.handleSupertest(done));

        });

    });

    describe('"/passage/" POST', function() {

        it('should return an error when ' +
            'you don\'t authenticate.', function(done) {
            supertest(app)
                .post('/passage/')
                .expect(401)
                .end(util.handleSupertest(done));

        });

        it('should return an error if ' +
            'you are not the owner of ' +
            'the originating room', function() {});

        it('should return an error if ' +
            'you are not the owner of ' +
            'the destination room', function() {});

        it('should return success if ' +
            'you are an admin but not ' +
            'the owner of the originating room', function() {});

        it('should return success if ' +
            'you are an admin but not ' +
            'the owner of the destination room', function() {});

        it('should return an error when trying to ' +
            'create a passage without information.', function(done) {
            supertest(app)
                .post('/passage/')
                .auth(
                    users.verifiedUser.email,
                    users.verifiedUser.password
                )
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'SCHEMA_INVALID',
                        errors: jasmine.any(Object)
                    });
                    expect(res.body.errors.body.length).toBe(4);
                })
                .expect('Content-Type', /json/)
                .expect(400)
                .end(util.handleSupertest(done));
        });

        it('should return an error when the passage ' +
            'submission doesn\'t match the JSON schema.', function(done) {
            supertest(app)
                .post('/passage/')
                .auth(
                    users.verifiedUser.email,
                    users.verifiedUser.password
                )
                .send({nope: 'blah', wrong: ':('})
                .expect('Content-Type', /json/)
                .expect(400)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'SCHEMA_INVALID',
                        errors: jasmine.any(Object)
                    });
                    expect(res.body.errors.body.length).toBe(6);
                })
                .end(util.handleSupertest(done));
        });

        it('should return an error when ' +
            'the new passage connection is ' +
            'the same as another passage.', function(done) {
            newPassage.from = places.lobby._id;
            newPassage.to =  places.northRoom._id;

            supertest(app)
                .post('/passage/')
                .auth(
                    users.verifiedUser.email,
                    users.verifiedUser.password
                )
                .send(newPassage)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'PASSAGE_INVALID',
                        message: 'A passage already exists ' +
                        'between these places.'
                    });
                })
                .expect(400)
                .end(util.handleSupertest(done));
        });

        it('should return an error when ' +
            'the new passage connection is ' +
            'the same as another, just reversed.', function(done) {
            newPassage.to = places.lobby._id;
            newPassage.from =  places.northRoom._id;

            supertest(app)
                .post('/passage/')
                .auth(
                    users.adminUser.email,
                    users.adminUser.password
                )
                .send(newPassage)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'PASSAGE_INVALID',
                        message: 'A passage already exists ' +
                        'between these places.'
                    });
                })
                .expect(400)
                .end(util.handleSupertest(done));
        });

        it('should return an error when ' +
            'the originating place isn\'t adjacent ' +
            'to the destination place.' , function(done) {
            newPassage.from = places.northRoom._id;
            newPassage.to =  places.basement._id;

            supertest(app)
                .post('/passage/')
                .auth(
                    users.verifiedUser.email,
                    users.verifiedUser.password
                )
                .send(newPassage)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'PASSAGE_INVALID',
                        message: 'A passage cannot connect two ' +
                        'non-adjacent places.'
                    });
                })
                .expect(400)
                .end(util.handleSupertest(done));
        });

        it('should return an error when ' +
            'trying to connect the same place ' +
            'to itself.', function(done) {
            newPassage.from = places.northRoom._id;
            newPassage.to =  places.northRoom._id;

            supertest(app)
                .post('/passage/')
                .auth(
                    users.verifiedUser.email,
                    users.verifiedUser.password
                )
                .send(newPassage)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'PASSAGE_INVALID',
                        message: 'You cannot connect a place ' +
                        'to itself.'
                    });
                })
                .expect(400)
                .end(util.handleSupertest(done));
        });

        it('should return success when ' +
            'the new passage submission is valid.', function(done) {
            newPassage.from = places.northRoom._id;
            newPassage.to =  places.northWestRoom._id;

            supertest(app)
                .post('/passage/')
                .auth(
                    users.verifiedUser.email,
                    users.verifiedUser.password
                )
                .send(newPassage)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'Created new passage.',
                        data   : {
                            id: jasmine.any(String)
                        }
                    });
                })
                .expect(200)
                .end(util.handleSupertest(done));
        });

    });

    describe('"/passage/list" GET', function() {

        it('should return an error when ' +
            'you don\'t authenticate.', function(done) {
            supertest(app)
                .get('/passage/list/')
                .expect(401)
                .end(util.handleSupertest(done));

        });

        it('should return an error when ' +
            'authenticated without admin privileges.', function(done) {
            supertest(app)
                .get('/passage/list/')
                .auth(
                    users.verifiedUser.email,
                    users.verifiedUser.password
                )
                .expect('Content-Type', /json/)
                .expect(403)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'FORBIDDEN',
                        message: 'Your account is not allowed to ' +
                        'access this endpoint.'
                    });
                })
                .end(util.handleSupertest(done));

        });

        it('should return a list of passages ' +
            'when authenticated as an admin.', function(done) {
            supertest(app)
                .get('/passage/list/')
                .auth(
                    users.adminUser.email,
                    users.adminUser.password
                )
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        'total_rows': jasmine.any(Number),
                        'offset'    : 0,
                        'rows'      : jasmine.any(Array)
                    });
                })
                .expect(200)
                .end(util.handleSupertest(done));

        });

    });

    describe('"/passage/:passageId" GET', function() {

        it('should return basic information if ' +
            'you are not authenticated', function(done) {
            supertest(app)
                .get('/passage/' + passages.northDoor.id)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        message: 'Passage found.',
                        status : 'SUCCESS',
                        data   : jasmine.any(Object)
                    });
                })
                .expect(200)
                .end(util.handleSupertest(done));

        });

        it('should return more information if ' +
            'you are authenticated as an admin', function(done) {
            supertest(app)
                .get('/passage/' + passages.northDoor.id)
                .auth(
                    users.adminUser.email,
                    users.adminUser.password
                )
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        message: 'Passage found.',
                        status: 'SUCCESS',
                        data: jasmine.any(Object)
                    });
                    expect(res.body.data.created)
                        .toBeDefined();
                })
                .expect(200)
                .end(util.handleSupertest(done));

        });

    });

    describe('"/passage/:passageId" POST', function() {

        it('should not allow anonymous users ' +
            'to make changes to passages.', function(done) {
            supertest(app)
                .post('/passage/' + passages.northDoor.id)
                .send({name: 'Bad Name'})
                .expect(401)
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                    }

                    supertest(app).get('/passage/' + passages.northDoor.id)
                        .expect('Content-Type', /json/)
                        .expect(function(res) {
                            expect(res.body.data.name).not.toBe('Bad Name');
                        })
                        .expect(200)
                        .end(util.handleSupertest(done));
                });
        });

        it('should allow normal users ' +
            'to make changes to their own passages.', function(done) {
            supertest(app)
                .post('/passage/' + passages.farNorthDoor.id)
                .send({name: 'Good Name'})
                .auth(
                    users.verifiedUser.email,
                    users.verifiedUser.password
                )
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'Passage has been successfully updated.',
                        data   : jasmine.any(Object)
                    });
                })
                .expect(200)
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                    }

                    supertest(app).get('/passage/' + passages.farNorthDoor.id)
                        .expect('Content-Type', /json/)
                        .expect(function(res) {
                            expect(res.body.data.name).toBe('Good Name');
                        })
                        .expect(200)
                        .end(util.handleSupertest(done));
                });
        });

        it('should not allow normal users ' +
            'to make changes to admin owned passages.', function(done) {
            supertest(app)
                .post('/passage/' + passages.northDoor.id)
                .send({name: 'Bad Name'})
                .auth(
                    users.verifiedUser.email,
                    users.verifiedUser.password
                )
                .expect('Content-Type', /json/)
                .expect(403)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'FORBIDDEN',
                        message: 'You are not allowed to make ' +
                        'these updates to this passage.'
                    });
                })
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app)
                        .get('/passage/' + passages.northDoor.id)
                        .expect('Content-Type', /json/)
                        .expect(function(res) {
                            expect(res.body.data.name).not.toBe('Bad Name');
                        })
                        .expect(200)
                        .end(util.handleSupertest(done));
                });

        });

        it('should allow admin users ' +
            'to make changes to other users\' passages.', function(done) {
            supertest(app)
                .post('/passage/' + passages.northEastDoor.id)
                .send({name: 'Good Name'})
                .auth(
                    users.adminUser.email,
                    users.adminUser.password
                )
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'Passage has been successfully updated.',
                        data   : jasmine.any(Object)
                    });
                })
                .expect(200)
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app)
                        .get('/passage/' + passages.northEastDoor.id)
                        .expect('Content-Type', /json/)
                        .expect(function(res) {
                            expect(res.body.data.name).toBe('Good Name');
                        })
                        .expect(200)
                        .end(util.handleSupertest(done));
                });

        });

    });

    describe('"/passage/:passageId" DELETE', function() {

        it('should not allow anonymous users ' +
            'to delete passages.', function(done) {
            supertest(app)
                .delete('/passage/' + passages.northEastDoor.id)
                .expect(401)
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app).get('/passage/' + passages.northEastDoor.id)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(util.handleSupertest(done));
                });
        });

        it('should not allow normal users ' +
            'to delete passages.', function(done) {
            supertest(app)
                .delete('/passage/' + passages.northEastDoor.id)
                .auth(
                    users.verifiedUser.email,
                    users.verifiedUser.password
                )
                .expect(403)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'FORBIDDEN',
                        message: 'Your account is not allowed ' +
                        'to access this endpoint.'
                    });
                })
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app).get('/passage/' + passages.northEastDoor.id)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(util.handleSupertest(done));
                });
        });

        it('should allow admin users ' +
            'to delete passages.', function(done) {
            supertest(app)
                .delete('/passage/' + passages.northEastDoor.id)
                .auth(
                    users.adminUser.email,
                    users.adminUser.password
                )
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'Passage has been deleted.'
                    });
                })
                .expect(200)
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app).get('/passage/' + passages.northEastDoor.id)
                        .expect('Content-Type', /json/)
                        .expect(404)
                        .end(util.handleSupertest(done));

                });

        });

    });

});
