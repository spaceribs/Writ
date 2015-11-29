'use strict';

var JsonSchemaValidation = require('express-jsonschema').JsonSchemaValidation;
var JsonSchemaCustomPropertyError = require('express-jsonschema').JsonSchemaCustomPropertyError;

/**
 * A custom error to handle duplicate email errors
 *
 * @param {string} message - Custom user error message.
 * @param {string} email - The email which already exists.
 * @constructor
 */
function EmailUsedError(message, email) {
    this.status = 409;
    this.email = email;
    this.name = 'EmailUsedError';
    this.message = (message || 'Invalid email.');
}
EmailUsedError.prototype = Object.create(Error.prototype);
EmailUsedError.prototype.constructor = EmailUsedError;

/**
 * A custom error to handle any tokens which cannot be found.
 *
 * @param {string} message - Custom user error message.
 * @param {string} token - Token that was searched.
 * @constructor
 */
function SecretNotFoundError(message, token) {
    this.status = 404;
    this.token = token;
    this.name = 'SecretNotFoundError';
    this.message = (message || 'Invalid email token.');
}
SecretNotFoundError.prototype = Object.create(Error.prototype);
SecretNotFoundError.prototype.constructor = SecretNotFoundError;

/**
 * A custom error to handle login issues.
 *
 * @param {string} message - Custom login error message.
 * @constructor
 */
function LoginError(message) {
    this.status = 401;
    this.name = 'LoginError';
    this.message = (message || 'Invalid login.');
}
LoginError.prototype = Object.create(Error.prototype);
LoginError.prototype.constructor = LoginError;

module.exports = {
    JsonSchemaValidation: JsonSchemaValidation,
    JsonSchemaCustomPropertyError: JsonSchemaCustomPropertyError,
    SyntaxError: SyntaxError,
    EmailUsedError: EmailUsedError,
    SecretNotFoundError: SecretNotFoundError
};
