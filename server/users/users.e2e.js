'use strict';

var supertest = require('supertest');
var mockery = require('mockery');
var util = require('../../test/util');

describe('Users Endpoint', function() {
    var mailerMethods;
    var mockMailer;
    var app;

    beforeAll(function() {

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

    fdescribe('"/login/" GET', function() {

        it('should return a 401 error when no credentials are provided.', function(done) {
            supertest(app)
                .get('/login/')
                .expect(401)
                .end(util.handleSupertest(done));
        });

        it('should return a 401 error when invalid credentials are provided.', function(done) {
            supertest(app)
                .get('/login/')
                    .auth('badcred', 'badpass')
                .expect('Content-Type', /json/)
                .expect(401)
                .end(util.handleSupertest(done));
        });

    });
    xdescribe('"/verify/:token" GET', function() {});

    xdescribe('"/user/" OPTIONS', function() {});
    xdescribe('"/user/" GET', function() {});
    xdescribe('"/user/" POST', function() {});

    xdescribe('"/user/list" GET', function() {});

    xdescribe('"/user/:userId" GET', function() {});
    xdescribe('"/user/:userId" POST', function() {});
    xdescribe('"/user/:userId" DELETE', function() {});
});