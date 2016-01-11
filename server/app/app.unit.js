'use strict';

describe('App Unit Tests', function() {

    describe('errors', function() {

        var errors = require('./app.errors');

        describe('EmailUsedError', function() {

            var error = new errors.EmailUsedError('test', 'test@test.com');
            var error2 = new errors.EmailUsedError(null, 'test@test.com');

            it('returns a name.', function() {
                expect(error.name).toBe('EmailUsedError');
            });

            it('returns a 409 status message.', function() {
                expect(error.status).toBe(409);
            });

            it('returns the email that conflicts.', function() {
                expect(error.email).toBe('test@test.com');
            });

            it('returns a custom message.', function() {
                expect(error.message).toBe('test');
            });

            it('returns a default message if no message specified.',
            function() {
                expect(error2.message).toBe('Invalid email.');
            });
        });

        describe('SecretNotFoundError', function() {

            var error = new errors.SecretNotFoundError('test', '1234567890');
            var error2 = new errors.SecretNotFoundError(null, '1234567890');

            it('returns a name.', function() {
                expect(error.name).toBe('SecretNotFoundError');
            });

            it('returns a 404 status message.', function() {
                expect(error.status).toBe(404);
            });

            it('returns the token that wasn\'t found.', function() {
                expect(error.token).toBe('1234567890');
            });

            it('returns a custom message.', function() {
                expect(error.message).toBe('test');
            });

            it('returns a default message if no message specified.',
            function() {
                expect(error2.message).toBe('Invalid email token.');
            });
        });

        describe('LoginError', function() {

            var error = new errors.LoginError('test');
            var error2 = new errors.LoginError();

            it('returns a name.', function() {
                expect(error.name).toBe('LoginError');
            });

            it('returns a 404 status message.', function() {
                expect(error.status).toBe(401);
            });

            it('returns a custom message.', function() {
                expect(error.message).toBe('test');
            });

            it('returns a default message if no message specified.',
            function() {
                expect(error2.message).toBe('Invalid login.');
            });
        });
    });
});
