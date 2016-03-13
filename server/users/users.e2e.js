'use strict';

var jsf = require('json-schema-faker');
var userModel = require('../../models').io.user;
var supertest = require('supertest');
var mockery = require('mockery');
var util = require('../../test/util');

describe('Users Endpoint', function() {

    var adminUser = {
        id: 'ef288553-635a-44a7-ab7d-3404bebc02a5',
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'root'
    };
    var unverifiedUser;
    var normalUser;

    var mailerMethods;
    var mockMailer;
    var app;

    beforeAll(function() {

        unverifiedUser = jsf(userModel);
        normalUser = jsf(userModel);

        mockery.enable({
            useCleanCache     : true,
            warnOnReplace     : false,
            warnOnUnregistered: false
        });

        mailerMethods = {
            /**
             * Mock method for sending an email.
             *
             * @param {object} content - content to send.
             * @param {function} callback - Callback function.
             */
            sendMail: function(content, callback) {
                callback();
            }
        };
        spyOn(mailerMethods, 'sendMail').and.callThrough();

        mockMailer = {
            /**
             * Mock method for creating a transport.
             *
             * @returns {{sendMail: mailerMethods.sendMail}}
             */
            createTransport: function() {
                return mailerMethods;
            }
        };
        spyOn(mockMailer, 'createTransport').and.callThrough();

        mockery.registerMock('nodemailer', mockMailer);
        mockery.registerSubstitute('./users.db', './users.db.mock');
        app = require('../app/app');
    });

    afterEach(function() {
        mailerMethods.sendMail.and.stub();
        mailerMethods.sendMail.and.callThrough();
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
            mailerMethods.sendMail.and.callFake(function(options, callback) {
                expect(options.html).toEqual(jasmine.any(String));
                var tokenRegex = /\/verify\/([a-f0-9-]*)/ig;
                normalUser.token = tokenRegex.exec(options.html)[1];
                callback();
            });

            supertest(app)
                .post('/user/')
                .send(normalUser)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status : 'SUCCESS',
                        message: 'Please check your email ' +
                            'to verify your account.',
                        data   : {
                            id   : jasmine.any(String),
                            email: normalUser.email
                        }
                    });
                    normalUser.id = res.body.data.id;
                })
                .end(util.handleSupertest(done));
        });

        it('should return success when ' +
            'another user is created.', function(done) {
            supertest(app)
                .post('/user/')
                .send(unverifiedUser)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    unverifiedUser.id = res.body.data.id;
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
                .get('/verify/' + normalUser.token)
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
                .auth(normalUser.email, normalUser.password)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'SUCCESS',
                        message: 'Your credentials are valid.',
                        data: {
                            email: normalUser.email,
                            name: normalUser.name,
                            id: normalUser.id,
                            permission: 20
                        }
                    });
                    normalUser.permission = res.body.data.permission;
                })
                .end(util.handleSupertest(done));

        });

        it('should return an admin user ' +
            'when authenticated as an admin.', function(done) {
            supertest(app)
                .get('/user/')
                .auth(adminUser.email, adminUser.password)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'SUCCESS',
                        message: 'Your credentials are valid.',
                        data: {
                            email: adminUser.email,
                            name: adminUser.name,
                            id: adminUser.id,
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
                .auth(normalUser.email, normalUser.password)
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
                .auth(adminUser.email, adminUser.password)
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
                .get('/user/' + normalUser.id)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        'id': normalUser.id,
                        'name': normalUser.name,
                        'permission': normalUser.permission
                    });
                })
                .end(util.handleSupertest(done));

        });

        it('should return more information if ' +
            'you are authenticated as an admin', function(done) {
            supertest(app)
                .get('/user/' + normalUser.id)
                .auth(adminUser.email, adminUser.password)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        'id': normalUser.id,
                        'email': normalUser.email,
                        'name': normalUser.name,
                        'permission': normalUser.permission
                    });
                })
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
                .post('/user/' + unverifiedUser.id)
                .send({name: 'Bad Name'})
                .auth(normalUser.email, normalUser.password)
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

                    supertest(app).get('/user/' + unverifiedUser.id)
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
                .post('/user/' + unverifiedUser.id)
                .send({name: 'Good Name'})
                .auth(adminUser.email, adminUser.password)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'SUCCESS',
                        message: 'User has been successfully updated.',
                        data: {
                            email: unverifiedUser.email,
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

                    supertest(app).get('/user/' + unverifiedUser.id)
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
                .post('/user/' + unverifiedUser.id)
                .send({email: 'test@test.com'})
                .auth(adminUser.email, adminUser.password)
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

                    supertest(app).get('/user/' + unverifiedUser.id)
                        .auth(adminUser.email, adminUser.password)
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
                .delete('/user/' + unverifiedUser.id)
                .expect(401)
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app).get('/user/' + unverifiedUser.id)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(util.handleSupertest(done));
                });
        });

        it('should not allow normal users ' +
            'to delete other users.', function(done) {
            supertest(app)
                .delete('/user/' + unverifiedUser.id)
                .auth(normalUser.email, normalUser.password)
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

                    supertest(app).get('/user/' + unverifiedUser.id)
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
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'SUCCESS',
                        message: 'User has been deleted.'
                    });
                })
                .end(function(err) {
                    if (err) {
                        done.fail(err);
                        return false;
                    }

                    supertest(app).get('/user/' + unverifiedUser.id)
                        .expect(404)
                        .end(util.handleSupertest(done));
                });

        });

    });

});
