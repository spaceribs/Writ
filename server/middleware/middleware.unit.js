'use strict';

var errors = require('../app/errors');

describe('Middleware Unit Tests', function() {

    describe('input_validator', function() {

        var validator = require('./input_validator');

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
});
