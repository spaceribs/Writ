'use strict';

var JsonSchemaValidation = require('express-jsonschema').JsonSchemaValidation;
var JsonSchemaCustomPropertyError = require('express-jsonschema').JsonSchemaCustomPropertyError;

/**
 * A custom error to handle duplicate email errors
 *
 * @param {string} message - Custom user error message.
 * @constructor
 */
function EmailUsedError(message, email) {
    this.status = 400;
    this.email = email;
    this.name = 'EmailUsedError';
    this.message = (message || 'Invalid user.');
}
EmailUsedError.prototype = Error.prototype;

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
LoginError.prototype = Error.prototype;

module.exports = {
    JsonSchemaValidation: JsonSchemaValidation,
    JsonSchemaCustomPropertyError: JsonSchemaCustomPropertyError,
    SyntaxError: SyntaxError,
    EmailUsedError: EmailUsedError
};
