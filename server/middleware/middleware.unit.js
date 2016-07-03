'use strict';

var errors = require('../app/app.errors');
var roles = require('../roles');

describe('Middleware', function() {

    describe('restrict', function() {

        var restrict = require('./middleware.restrict');

        it('allows anonymous users to access open endpoints', function() {

            var req = {
                body: {
                    email: 'test@test.com',
                    name: 'Testing Tester',
                    password: 'Testing123'
                }
            };

            var restricted = restrict(roles.anonymous);

            restricted(req, null, function(err) {
                expect(err).toBeUndefined();
            });

        });

        it('doesn\'t allow an anonymous user to access admin endpoints',
        function() {

            var req = {
                user: {},
                body: {
                    email: 'test@test.com',
                    name: 'Testing Tester',
                    password: 'Testing123'
                }
            };

            var restricted = restrict(roles.admin);

            restricted(req, null, function(err) {
                expect(err)
                    .toEqual(jasmine.any(errors.ForbiddenError));
                expect(err.message).toBe('Your account is not allowed ' +
                        'to access this endpoint.');
            });

        });

        it('allows an admin user to access admin endpoints',
        function() {

            var req = {
                user: {
                    permission: roles.admin
                },
                body: {
                    email: 'test@test.com',
                    name: 'Testing Tester',
                    password: 'Testing123'
                }
            };

            var restricted = restrict(roles.admin);

            restricted(req, null, function(err) {
                expect(err).toBeUndefined();
            });

        });

        it('doesn\'t allow an admin user to access system endpoints',
        function() {

            var req = {
                user: {
                    permission: roles.admin
                },
                body: {
                    email: 'test@test.com',
                    name: 'Testing Tester',
                    password: 'Testing123'
                }
            };

            var restricted = restrict(roles.system);

            restricted(req, null, function(err) {
                expect(err)
                        .toEqual(jasmine.any(errors.ForbiddenError));
                expect(err.message).toBe('Your account is not allowed ' +
                        'to access this endpoint.');
            });

        });
    });

    describe('validate', function() {

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

        var refSchema = {
            '$ref': '/writ/io/user'
        };

        describe('validate', function() {

            var validate = validator(testSchema);
            var validateRef = validator(refSchema, [testSchema]);

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

            it('accepts references to other schemas.', function() {

                var req = {
                    body: {
                        email: 'test@test.com',
                        name: 'Testing Tester',
                        password: 'Testing123'
                    }
                };

                validateRef(req, null, function(err) {
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

    describe('errors', function() {

        var errorHandler = require('./middleware.errors');
        var err;
        var req;
        var res;
        var next;

        beforeAll(function() {
            err = null;
            req = {
                accepts: null
            };
            res = {};
            next = null;
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
                     * Mock response that the client accepts JSON.
                     *
                     * @returns {boolean}
                     */
                    req.accepts = function() { return true; };

                    err = new errors.JsonSchemaValidationError([], []);

                    /**
                     * Mock status setting.
                     *
                     * @param {number} status - Status Code.
                     * @returns {{json: json}}
                     */
                    res.status = function(status) {
                        expect(status).toBe(400);

                        /**
                         * Mock simple json send.
                         *
                         * @param {string} responseData - Object to send.
                         */
                        return {json: function(responseData) {
                            expect(responseData).toEqual({
                                'status': 'SCHEMA_INVALID',
                                'errors': {
                                    body: []
                                }
                            });
                            done();
                        }};
                    };

                    errorHandler(err, req, res, next);
                });

            it('responds with an error if there is a JSON Parsing issue.',
                function(done) {
                    /**
                     * Mock response that the client accepts JSON.
                     *
                     * @returns {boolean}
                     */
                    req.accepts = function() { return true; };

                    err = new errors.SyntaxError();

                    /**
                     * Mock status setting.
                     *
                     * @param {number} status - Status Code.
                     * @returns {{json: json}}
                     */
                    res.status = function(status) {
                        expect(status).toBe(400);

                        /**
                         * Mock simple json send.
                         *
                         * @param {string} responseData - Object to send.
                         */
                        return {json: function(responseData) {
                            expect(responseData).toEqual({
                                'status': 'INVALID_JSON',
                                'message': ''
                            });
                            done();
                        }};
                    };

                    errorHandler(err, req, res, next);
                });

            it('responds with an error if an email is already used.',
                function(done) {
                    /**
                     * Mock response that the client accepts JSON.
                     *
                     * @returns {boolean}
                     */
                    req.accepts = function() { return true; };

                    err = new errors.EmailInUseError(
                            'test message.', 'test@test.com');

                    /**
                     * Mock status setting.
                     *
                     * @param {number} status - Status Code.
                     * @returns {{json: json}}
                     */
                    res.status = function(status) {
                        expect(status).toBe(409);

                        /**
                         * Mock simple json send.
                         *
                         * @param {string} responseData - Object to send.
                         */
                        return {json: function(responseData) {
                            expect(responseData).toEqual({
                                status: 'EMAIL_IN_USE',
                                message: 'test message.'
                            });
                            done();
                        }};
                    };

                    errorHandler(err, req, res, next);
                });

            it('responds with an error if an email secret isn\'t found.',
                function(done) {
                    /**
                     * Mock response that the client accepts JSON.
                     *
                     * @returns {boolean}
                     */
                    req.accepts = function() { return true; };

                    err = new errors.EmailTokenNotFoundError(
                            'test message.', '12345');

                    /**
                     * Mock status setting.
                     *
                     * @param {number} status - Status Code.
                     * @returns {{json: json}}
                     */
                    res.status = function(status) {
                        expect(status).toBe(404);

                        /**
                         * Mock simple json send.
                         *
                         * @param {string} responseData - Object to send.
                         */
                        return {json: function(responseData) {
                            expect(responseData).toEqual({
                                status: 'EMAIL_TOKEN_NOT_FOUND',
                                message: 'test message.'
                            });
                            done();
                        }};
                    };

                    errorHandler(err, req, res, next);
                });

            it('responds with an error if an action is forbidden.',
                function(done) {
                    /**
                     * Mock response that the client accepts JSON.
                     *
                     * @returns {boolean}
                     */
                    req.accepts = function() { return true; };

                    err = new errors.ForbiddenError('test message.');

                    /**
                     * Mock status setting.
                     *
                     * @param {number} status - Status Code.
                     * @returns {{json: json}}
                     */
                    res.status = function(status) {
                        expect(status).toBe(403);

                        /**
                         * Mock simple json send.
                         *
                         * @param {string} responseData - Object to send.
                         */
                        return {json: function(responseData) {
                            expect(responseData).toEqual({
                                status: 'FORBIDDEN',
                                message: 'test message.'
                            });
                            done();
                        }};
                    };

                    errorHandler(err, req, res, next);
                });

            it('passes off all other errors down the chain.',
                function(done) {
                    /**
                     * Mock response that the client accepts JSON.
                     *
                     * @returns {boolean}
                     */
                    req.accepts = function() { return true; };

                    err = new Error();

                    /**
                     * Generic error that should pass through
                     *
                     * @param {Error} err - Error object passed.
                     */
                    next = function(err) {
                        expect(err).toEqual(jasmine.any(Error));
                        done();
                    };

                    errorHandler(err, req, res, next);
                });
        });

    });
});
