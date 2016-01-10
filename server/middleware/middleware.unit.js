'use strict';

var errors = require('../app/app.errors');
var roles = require('../roles');

describe('Middleware Unit Tests', function() {

    describe('middleware.restrict', function() {

        var restrict = require('./middleware.restrict');

        var testSchema = {
            '$schema': 'http://json-schema.org/draft-04/schema#',
            'id': '/writ/io/user',
            'type': 'object',
            'properties': {
                'email': {
                    'type': 'string',
                    'format': 'email',
                    'permission': {
                        'read': 19,
                        'write': 19
                    }
                },
                'name': {
                    'type': 'string',
                    'permission': {
                        'read': 100,
                        'write': 19
                    }
                },
                'password': {
                    'type': 'string',
                    'permission': {
                        'read': 0,
                        'write': 19
                    }
                }
            },
            'additionalProperties': false,
            'required': [
                'email',
                'name',
                'password'
            ]
        };

        it('Allows anonymous users to make unrestricted actions', function() {

            var req = {
                body: {
                    email: 'test@test.com',
                    name: 'Testing Tester',
                    password: 'Testing123'
                }
            };

            var restricted = restrict(roles.anonymous, testSchema);

            restricted(req, null, function(err) {
                expect(err).toBeUndefined();
            });

        });

        it('Doesn\'t allow an anonymous user to make admin actions',
        function() {

            var req = {
                body: {
                    email: 'test@test.com',
                    name: 'Testing Tester',
                    password: 'Testing123'
                }
            };

            var restricted = restrict(roles.admin, testSchema);

            restricted(req, null, function(err) {
                expect(err)
                    .toEqual(jasmine.any(errors.ForbiddenError));
                expect(err.message).toBe('Your account is not allowed ' +
                        'to access this endpoint.');
            });

        });
    });

    describe('middleware.validate', function() {

        var validator = require('./middleware.validate');

        var testSchema = {
            '$schema': 'http://json-schema.org/draft-04/schema#',
            'id': '/writ/io/user',
            'type': 'object',
            'properties': {
                'email': {
                    'type': 'string',
                    'format': 'email'
                },
                'name': {
                    'type': 'string'
                },
                'password': {
                    'type': 'string'
                }
            },
            'additionalProperties': false,
            'required': [
                'email',
                'name',
                'password'
            ]
        };

        describe('validate', function() {

            var validate = validator(testSchema);

            it('passes validation if the JSON request is valid.', function() {

                var req = {
                    body: {
                        email: 'test@test.com',
                        name: 'Testing Tester',
                        password: 'Testing123'
                    }
                };

                validate(req, null, function(err) {
                    expect(err).toBeUndefined();
                });

            });

            it('fails validation if the JSON posted is invalid.', function() {

                var req = {
                    body: {
                        test: false
                    }
                };

                validate(req, null, function(err) {
                    expect(err)
                        .toEqual(
                            jasmine.any(errors.JsonSchemaValidationError));
                    expect(err.errors.length).toBe(4);
                });

            });

        });

    });

    describe('middleware.errors', function() {

        var errorHandler = require('./middleware.errors');
        var err;
        var req;
        var res;
        var next;

        beforeAll(function() {
            err = null;
            req = {
                /**
                 * Mock response that the client doesn't accept JSON.
                 *
                 * @returns {boolean}
                 */
                accepts: function() { return true; }
            };
            res = {};
            next = function() {};
        });

        describe('errorHandler', function() {

            it('responds with an error that JSON is only acceptable.',
                function(done) {
                    var errorMessage = 'Only JSON Content type is accepted.';

                    /**
                     * Mock response that the client doesn't accept JSON.
                     *
                     * @returns {boolean}
                     */
                    req.accepts = function() { return false; };

                    /**
                     * Mock content type setting.
                     *
                     * @param {string} key - Key to set in header
                     * @param {string} value - Value to set in header
                     * @returns {{status: status}}
                     */
                    res.set = function(key, value) {
                        expect(key).toBe('Content-Type');
                        expect(value).toBe('text/plain');
                        return {

                            /**
                             * Mock status setting.
                             *
                             * @param {number} status - Status Code.
                             * @returns {{send: send}}
                             */
                            status: function(status) {
                                expect(status).toBe(406);
                                return {
                                    /**
                                     * Mock simple text send.
                                     *
                                     * @param {string} message - String to send.
                                     */
                                    send: function(message) {
                                        expect(message).toBe(errorMessage);
                                        done();
                                    }
                                };
                            }
                        };
                    };

                    errorHandler(err, req, res, next);
                });

            it('responds with an error if there is a json-schema issue.',
                function(done) {

                    /**
                     * Mock response that the client doesn't accept JSON.
                     *
                     * @returns {boolean}
                     */
                    req.accepts = function() { return true; };

                    err = new errors.JsonSchemaValidationError([], []);

                    /**
                     * Mock status setting.
                     *
                     * @param {number} status - Status Code.
                     * @returns {{send: send}}
                     */
                    res.status = function(status) {
                        expect(status).toBe(400);

                        /**
                         * Mock simple json send.
                         *
                         * @param {string} responseData - Object to send.
                         */
                        return {json: function() {
                            done();
                        }};
                    };

                });

            xit('responds with an error if there is a JSON Parsing issue.',
                function() {

                });

            xit('responds with an error if an email is already used.',
                function() {

                });

            xit('responds with an error if an email secret isn\'t found.',
                function() {

                });

            xit('passes off all other errors down the chain.',
                function() {

                });
        });

    });
});
