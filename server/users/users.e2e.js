'use strict';

var jsf = require('json-schema-faker');
var userModel = require('../../models').io.user;
var supertest = require('supertest');
var mockery = require('mockery');
var util = require('../../test/util');

var Users = require('./users.db.mock');

describe('Users Endpoint', function() {

    var app;
    var mail;
    var newUser1;

    beforeAll(function() {

        mockery.enable({
            warnOnReplace     : false,
            warnOnUnregistered: false
        });

        mockery.registerSubstitute(
            './users.db', './users.db.mock');
        mockery.registerSubstitute(
            '../mail/mail.ctrl', '../mail/mail.ctrl.mock');

        mail = require('../mail/mail.ctrl');
        app = require('../app/app');
    });

    beforeEach(function() {
        newUser1 = jsf(userModel);
    });

    describe('"/user/" POST', function() {

        it('should return an error when ' +
            'trying to create a user without information.', function(done) {
            supertest(app)
                .post('/user/')
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
                    expect(res.body.errors.body.length).toBe(5);
                })
                .end(util.handleSupertest(done));
        });

        it('should return success when ' +
        'the new user submission is valid.', function(done) {

            var sentLength = mail.sent.length;

            supertest(app)
                .post('/user/')
                .send(newUser1)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'Please check your email ' +
                            'to verify your account.',
                        data   : {
                            id   : jasmine.any(String),
                            email: newUser1.email
                        }
                    });
                })
                .expect(function() {
                    expect(mail.sent.length).toBe(sentLength + 1);
                })
                .end(util.handleSupertest(done));
        });

        xit('should update my information ' +
            'when I make an authenticated request.', function() {
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
                        status: 'EMAIL_TOKEN_NOT_FOUND',
                        message: 'This token was not found.'
                    });
                })
                .end(util.handleSupertest(done));
        });

        it('should return success when ' +
            'a valid token is provided.', function(done) {
            supertest(app)
                .get('/verify/' + Users.unverifiedUser.secret)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'SUCCESS',
                        message: 'Your email has been verified.'
                    });
                })
                .end(util.handleSupertest(done));
        });

    });

    describe('"/user/" OPTIONS', function() {

        it('should return the JSON schema for users', function(done) {
            supertest(app)
                .options('/user/')
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual(userModel);
                })
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
                .auth(Users.verifiedUser.email, Users.verifiedUser.password)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'SUCCESS',
                        message: 'Your credentials are valid.',
                        data: {
                            email: Users.verifiedUser.email,
                            name: Users.verifiedUser.name,
                            id: Users.verifiedUser.id,
                            permission: 20
                        }
                    });
                    Users.verifiedUser.permission = res.body.data.permission;
                })
                .end(util.handleSupertest(done));

        });

        it('should return an admin user ' +
            'when authenticated as an admin.', function(done) {
            supertest(app)
                .get('/user/')
                .auth(Users.adminUser.email, Users.adminUser.password)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'SUCCESS',
                        message: 'Your credentials are valid.',
                        data: {
                            email: Users.adminUser.email,
                            name: Users.adminUser.name,
                            id: Users.adminUser.id,
                            permission: 10
                        }
                    });
                })
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
                .auth(Users.verifiedUser.email, Users.verifiedUser.password)
                .expect('Content-Type', /json/)
                .expect(403)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'FORBIDDEN',
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
                .auth(Users.adminUser.email, Users.adminUser.password)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        'total_rows': jasmine.any(Number),
                        'offset': 0,
                        'rows': jasmine.any(Array)
                    });
                })
                .end(util.handleSupertest(done));

        });

    });

    describe('"/user/:userId" GET', function() {

        it('should return basic information if ' +
            'you are not authenticated', function(done) {
            supertest(app)
                .get('/user/' + Users.verifiedUser.id)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        'id': Users.verifiedUser.id,
                        'name': Users.verifiedUser.name,
                        'permission': Users.verifiedUser.permission
                    });
                })
                .end(util.handleSupertest(done));

        });

        it('should return more information if ' +
            'you are authenticated as an admin', function(done) {
            supertest(app)
                .get('/user/' + Users.verifiedUser.id)
                .auth(Users.adminUser.email, Users.adminUser.password)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        'id': Users.verifiedUser.id,
                        'email': Users.verifiedUser.email,
                        'name': Users.verifiedUser.name,
                        'permission': Users.verifiedUser.permission
                    });
                })
                .end(util.handleSupertest(done));

        });

    });

    describe('"/user/:userId" POST', function() {

        it('should not allow anonymous users ' +
            'to make changes to other users.', function(done) {
            supertest(app)
                .post('/user/' + Users.unverifiedUser.id)
                .send({name: 'Bad Name'})
                .expect(401)
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                    }

                    supertest(app).get('/user/' + Users.unverifiedUser.id)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .expect(function(res) {
                            expect(res.body.name).not.toBe('Bad Name');
                        })
                        .end(util.handleSupertest(done));
                });
        });

        it('should not allow normal users ' +
            'to make changes to other users.', function(done) {
            supertest(app)
                .post('/user/' + Users.unverifiedUser.id)
                .send({name: 'Bad Name'})
                .auth(Users.verifiedUser.email, Users.verifiedUser.password)
                .expect('Content-Type', /json/)
                .expect(403)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'FORBIDDEN',
                        message: 'Your account is not allowed ' +
                            'to access this endpoint.'
                    });
                })
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app).get('/user/' + Users.unverifiedUser.id)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .expect(function(res) {
                            expect(res.body.name).not.toBe('Bad Name');
                        })
                        .end(util.handleSupertest(done));
                });

        });

        it('should allow admin users ' +
            'to make changes to other users.', function(done) {
            supertest(app)
                .post('/user/' + Users.verifiedUser.id)
                .send({name: 'Good Name'})
                .auth(Users.adminUser.email, Users.adminUser.password)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'SUCCESS',
                        message: 'User has been successfully updated.',
                        data: {
                            email: Users.verifiedUser.email,
                            name: 'Good Name',
                            permission: 20
                        }
                    });
                })
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app).get('/user/' + Users.verifiedUser.id)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .expect(function(res) {
                            expect(res.body.name).toBe('Good Name');
                        })
                        .end(util.handleSupertest(done));
                });

        });

        it('should allow admin users ' +
            'to change other users\' email address.', function(done) {
            supertest(app)
                .post('/user/' + Users.verifiedUser.id)
                .send({email: 'test@test.com'})
                .auth(Users.adminUser.email, Users.adminUser.password)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'SUCCESS',
                        message: 'User has been updated, and ' +
                            'an email has been sent to the new address.',
                        data: {
                            email: 'test@test.com',
                            name: 'Good Name',
                            permission: 30
                        }
                    });
                })
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app).get('/user/' + Users.verifiedUser.id)
                        .auth(Users.adminUser.email, Users.adminUser.password)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .expect(function(res) {
                            expect(res.body.email).toBe('test@test.com');
                        })
                        .end(util.handleSupertest(done));
                });

        });

    });

    describe('"/user/:userId" DELETE', function() {

        it('should not allow anonymous users ' +
            'to delete other users.', function(done) {
            supertest(app)
                .delete('/user/' + Users.verifiedUser.id)
                .expect(401)
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app).get('/user/' + Users.verifiedUser.id)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(util.handleSupertest(done));
                });
        });

        it('should not allow normal users ' +
            'to delete other users.', function(done) {
            supertest(app)
                .delete('/user/' + Users.verifiedUser.id)
                .auth(Users.unverifiedUser.email, Users.unverifiedUser.password)
                .expect(403)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'FORBIDDEN',
                        message: 'Your account is not allowed ' +
                        'to access this endpoint.'
                    });
                })
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app).get('/user/' + Users.verifiedUser.id)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(util.handleSupertest(done));
                });
        });

        it('should allow admin users ' +
            'to delete other users.', function(done) {
            supertest(app)
                .delete('/user/' + Users.unverifiedUser.id)
                .auth(Users.adminUser.email, Users.adminUser.password)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'SUCCESS',
                        message: 'User has been deleted.'
                    });
                })
                .end(util.handleSupertest(done));

        });

    });

});
