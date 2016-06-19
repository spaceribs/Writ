'use strict';

var jsf = require('json-schema-faker');
var models = require('../../models');
var supertest = require('supertest');
var mockery = require('mockery');
var util = require('../../test/util');

var Users = require('../users/users.db.mock');

describe('Users Endpoint', function() {

    var newUser;

    var adminUser;
    var verifiedUser;
    var unverifiedUser;

    var app;
    var mail;

    beforeAll(function() {
        mockery.enable({
            warnOnReplace     : false,
            warnOnUnregistered: false
        });

        mockery.registerSubstitute(
            './passages.db', '../passages/passages.db.mock');
        mockery.registerSubstitute(
            '../places/places.db', '../places/places.db.mock');
        mockery.registerSubstitute(
            './places.db', '../places/places.db.mock');
        mockery.registerSubstitute(
            './users.db', '../users/users.db.mock');
        mockery.registerSubstitute(
            '../mail/mail.ctrl', '../mail/mail.ctrl.mock');

        mail = require('../mail/mail.ctrl');
        app = require('../app/app');
    });

    afterAll(function() {
        mockery.deregisterAll();
        mockery.disable();
    });

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
                    done();
                });

        }
    );

    beforeEach(function() {
        newUser = jsf(models.io.user, models.refs);
    });

    describe('"/user/" POST', function() {

        it('should return an error when ' +
            'trying to create a user without information.', function(done) {
            supertest(app)
                .post('/user/')
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'INVALID_JSON_SCHEME',
                        errors: jasmine.any(Object)
                    });
                    expect(res.body.errors.body.length).toBe(3);
                })
                .expect('Content-Type', /json/)
                .expect(400)
                .end(util.handleSupertest(done));
        });

        it('should return an error when ' +
            'the submission doesn\'t match the JSON schema.', function(done) {
            supertest(app)
                .post('/user/')
                .send({nope: 'blah', wrong: ':('})
                .expect('Content-Type', /json/)
                .expect(400)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'INVALID_JSON_SCHEME',
                        errors: jasmine.any(Object)
                    });
                    expect(res.body.errors.body.length).toBe(3);
                })
                .end(util.handleSupertest(done));
        });

        it('should return success when ' +
        'the new user submission is valid.', function(done) {

            var sentLength = mail.sent.length;

            supertest(app)
                .post('/user/')
                .send(newUser)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'Please check your email ' +
                        'to verify your account.',
                        data   : {
                            id   : jasmine.any(String),
                            email: newUser.email
                        }
                    });
                })
                .expect(200)
                .expect(function() {
                    expect(mail.sent.length).toBe(sentLength + 1);
                })
                .end(util.handleSupertest(done));
        });

        it('should update my basic information ' +
        'when I make an authenticated request.', function(done) {
            supertest(app).post('/user/')
                .auth(verifiedUser.email, verifiedUser.password)
                .send({name: newUser.name})
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'User has been successfully updated.',
                        data   : {
                            email     : verifiedUser.email,
                            name      : newUser.name,
                            permission: 20
                        }
                    });
                })
                .expect(200)
                .end(function() {
                    supertest(app).get('/user/' + verifiedUser.id)
                        .expect('Content-Type', /json/)
                        .expect(function(res) {
                            expect(res.body).toEqual({
                                message: 'User found.',
                                status: 'SUCCESS',
                                data: {
                                    id: verifiedUser.id,
                                    name: newUser.name,
                                    permission: 20
                                }
                            });
                        })
                        .expect(200)
                        .end(util.handleSupertest(done));

                });
        });

        it('should update my email address ' +
        'when I make an authenticated request.', function(done) {

            var sentLength = mail.sent.length;

            supertest(app)
                .post('/user/')
                .auth(verifiedUser.email, verifiedUser.password)
                .send({email: newUser.email})
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'User has been updated, and an ' +
                        'email has been sent to the new address.',
                        data   : {
                            email     : newUser.email,
                            name      : verifiedUser.name,
                            permission: 30
                        }
                    });
                })
                .expect(200)
                .expect(function() {
                    expect(mail.sent.length).toBe(sentLength + 1);
                })
                .end(function() {
                    supertest(app).get('/user/' + verifiedUser.id)
                        .auth(adminUser.email, adminUser.password)
                        .expect('Content-Type', /json/)
                        .expect(function(res) {
                            expect(res.body).toEqual({
                                message: 'User found.',
                                status: 'SUCCESS',
                                data: {
                                    id: verifiedUser.id,
                                    email: newUser.email,
                                    name: verifiedUser.name,
                                    permission: 30
                                }
                            });
                        })
                        .expect(200)
                        .end(util.handleSupertest(done));

                });
        });

    });

    describe('"/verify/:token" GET', function() {

        it('should return an error when ' +
            'an invalid token is provided.', function(done) {
            supertest(app)
                .get('/verify/blahblah')
                .expect('Content-Type', /json/)
                .expect(404)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'EMAIL_TOKEN_NOT_FOUND',
                        message: 'This token was not found.'
                    });
                })
                .end(util.handleSupertest(done));
        });

        it('should return success when ' +
            'a valid token is provided.', function(done) {
            supertest(app)
                .get('/verify/' + unverifiedUser.secret)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'Your email has been verified.'
                    });
                })
                .expect(200)
                .end(util.handleSupertest(done));
        });

    });

    describe('"/user/" OPTIONS', function() {

        it('should return the JSON schema for users', function(done) {
            supertest(app)
                .options('/user/')
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual(models.io.user);
                })
                .expect(200)
                .end(util.handleSupertest(done));
        });

    });

    describe('"/user/" GET', function() {

        it('should return an error when ' +
            'you don\'t authenticate.', function(done) {
            supertest(app)
                .get('/user/')
                .expect(401)
                .end(util.handleSupertest(done));

        });

        it('should return the current user ' +
            'when authenticated.', function(done) {
            supertest(app)
                .get('/user/')
                .auth(verifiedUser.email, verifiedUser.password)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'Your credentials are valid.',
                        data   : {
                            email     : verifiedUser.email,
                            name      : verifiedUser.name,
                            id        : verifiedUser.id,
                            permission: 20
                        }
                    });
                })
                .expect(200)
                .end(util.handleSupertest(done));

        });

        it('should return an admin user ' +
            'when authenticated as an admin.', function(done) {
            supertest(app)
                .get('/user/')
                .auth(adminUser.email, adminUser.password)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'Your credentials are valid.',
                        data   : {
                            email     : adminUser.email,
                            name      : adminUser.name,
                            id        : adminUser.id,
                            permission: 10
                        }
                    });
                })
                .expect(200)
                .end(util.handleSupertest(done));

        });

    });

    describe('"/user/list/" GET', function() {

        it('should return an error when ' +
            'you don\'t authenticate.', function(done) {
            supertest(app)
                .get('/user/list/')
                .expect(401)
                .end(util.handleSupertest(done));

        });

        it('should return an error when ' +
            'authenticated without admin privileges.', function(done) {
            supertest(app)
                .get('/user/list/')
                .auth(verifiedUser.email, verifiedUser.password)
                .expect('Content-Type', /json/)
                .expect(403)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'FORBIDDEN',
                        message: 'Your account is not allowed ' +
                        'to access this endpoint.'
                    });
                })
                .end(util.handleSupertest(done));

        });

        it('should return an admin user' +
            'authenticated as an admin.', function(done) {
            supertest(app)
                .get('/user/list/')
                .auth(adminUser.email, adminUser.password)
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

    describe('"/user/:userId" GET', function() {

        it('should return basic information if ' +
            'you are not authenticated', function(done) {
            supertest(app)
                .get('/user/' + verifiedUser.id)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        message: 'User found.',
                        status: 'SUCCESS',
                        data: {
                            'id'        : verifiedUser.id,
                            'name'      : verifiedUser.name,
                            'permission': verifiedUser.permission
                        }
                    });
                })
                .expect(200)
                .end(util.handleSupertest(done));

        });

        it('should return more information if ' +
            'you are authenticated as an admin', function(done) {
            supertest(app)
                .get('/user/' + verifiedUser.id)
                .auth(adminUser.email, adminUser.password)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        message: 'User found.',
                        status: 'SUCCESS',
                        data: {
                            'id'        : verifiedUser.id,
                            'email'     : verifiedUser.email,
                            'name'      : verifiedUser.name,
                            'permission': verifiedUser.permission
                        }
                    });
                })
                .expect(200)
                .end(util.handleSupertest(done));

        });

    });

    describe('"/user/:userId" POST', function() {

        it('should not allow anonymous users ' +
            'to make changes to other users.', function(done) {
            supertest(app)
                .post('/user/' + unverifiedUser.id)
                .send({name: 'Bad Name'})
                .expect(401)
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                    }

                    supertest(app).get('/user/' + unverifiedUser.id)
                        .expect('Content-Type', /json/)
                        .expect(function(res) {
                            expect(res.body.name).not.toBe('Bad Name');
                        })
                        .expect(200)
                        .end(util.handleSupertest(done));
                });
        });

        it('should not allow normal users ' +
            'to make changes to other users.', function(done) {
            supertest(app)
                .post('/user/' + unverifiedUser.id)
                .send({name: 'Bad Name'})
                .auth(verifiedUser.email, verifiedUser.password)
                .expect('Content-Type', /json/)
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

                    supertest(app).get('/user/' + unverifiedUser.id)
                        .expect('Content-Type', /json/)
                        .expect(function(res) {
                            expect(res.body.name).not.toBe('Bad Name');
                        })
                        .expect(200)
                        .end(util.handleSupertest(done));
                });

        });

        it('should allow admin users ' +
            'to make changes to other users.', function(done) {
            supertest(app)
                .post('/user/' + verifiedUser.id)
                .send({name: 'Good Name'})
                .auth(adminUser.email, adminUser.password)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'User has been successfully updated.',
                        data   : {
                            email     : verifiedUser.email,
                            name      : 'Good Name',
                            permission: 20
                        }
                    });
                })
                .expect(200)
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app).get('/user/' + verifiedUser.id)
                        .expect('Content-Type', /json/)
                        .expect(function(res) {
                            expect(res.body.data.name).toBe('Good Name');
                        })
                        .expect(200)
                        .end(util.handleSupertest(done));
                });

        });

        it('should allow admin users ' +
            'to change other users\' email addresses.', function(done) {
            supertest(app)
                .post('/user/' + verifiedUser.id)
                .send({email: 'test@test.com'})
                .auth(adminUser.email, adminUser.password)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'User has been updated, and ' +
                        'an email has been sent to the new address.',
                        data   : {
                            email     : 'test@test.com',
                            name      : verifiedUser.name,
                            permission: 30
                        }
                    });
                })
                .expect(200)
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app).get('/user/' + verifiedUser.id)
                        .auth(adminUser.email, adminUser.password)
                        .expect('Content-Type', /json/)
                        .expect(function(res) {
                            expect(res.body.data.email).toBe('test@test.com');
                        })
                        .expect(200)
                        .end(util.handleSupertest(done));
                });

        });

    });

    describe('"/user/:userId" DELETE', function() {

        it('should not allow anonymous users ' +
            'to delete other users.', function(done) {
            supertest(app)
                .delete('/user/' + verifiedUser.id)
                .expect(401)
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app).get('/user/' + verifiedUser.id)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(util.handleSupertest(done));
                });
        });

        it('should not allow normal users ' +
            'to delete other users.', function(done) {
            supertest(app)
                .delete('/user/' + verifiedUser.id)
                .auth(verifiedUser.email, verifiedUser.password)
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

                    supertest(app).get('/user/' + verifiedUser.id)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(util.handleSupertest(done));
                });
        });

        it('should allow admin users ' +
            'to delete other users.', function(done) {
            supertest(app)
                .delete('/user/' + unverifiedUser.id)
                .auth(adminUser.email, adminUser.password)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'User has been deleted.'
                    });
                })
                .expect(200)
                .end(function() {
                    supertest(app).get('/user/' + verifiedUser.id)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(util.handleSupertest(done));
                });

        });

    });

});
