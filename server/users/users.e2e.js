'use strict';

var jsf = require('json-schema-faker');
var userModel = require('../../models').io.user;
var supertest = require('supertest');
var mockery = require('mockery');
var util = require('../../test/util');

fdescribe('Users Endpoint', function() {

    var adminUser = {
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

    describe('"/login/" GET', function() {

        it('should return an error when ' +
            'no credentials are provided.', function(done) {
            supertest(app)
                .get('/login/')
                .expect(401)
                .end(util.handleSupertest(done));
        });

        it('should return an error when ' +
            'invalid credentials are provided.', function(done) {
            supertest(app)
                .get('/login/')
                    .auth('badcred', 'badpass')
                .expect('Content-Type', /json/)
                .expect(401)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'INVALID_LOGIN',
                        message: 'Invalid login.'
                    });
                })
                .end(util.handleSupertest(done));
        });

        it('should return an error when ' +
            'an invalid password is provided.', function(done) {
            supertest(app)
                .get('/login/')
                .auth(normalUser.email, 'badpass')
                .expect('Content-Type', /json/)
                .expect(401)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'INVALID_LOGIN',
                        message: 'Invalid login.'
                    });
                })
                .end(util.handleSupertest(done));
        });

        it('should return success when ' +
            'valid credentials are provided.', function(done) {
            supertest(app)
                .get('/login/')
                .auth(normalUser.email, normalUser.password)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'SUCCESS',
                        data: {
                            email: normalUser.email,
                            name: normalUser.name,
                            permission: 30
                        }
                    });
                    normalUser.permission = res.body.data.permission;
                })
                .end(util.handleSupertest(done));
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

        it('should return success when ' +
            'you do authenticate.', function(done) {
            supertest(app)
                .get('/user/')
                .auth(normalUser.email, normalUser.password)
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).toEqual({
                        status: 'SUCCESS',
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

    });

    xdescribe('"/user/list" GET', function() {});

    xdescribe('"/user/:userId" GET', function() {});
    xdescribe('"/user/:userId" POST', function() {});
    xdescribe('"/user/:userId" DELETE', function() {});
});
