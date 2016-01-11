'use strict';

/**
 * A custom error for JsonSchema validation issues.
 *
 * @param {Array} errors - An array of schema validations that failed.
 * @param {Array} missing - An array of missing parameters for the validation.
 * @constructor
 */
function JsonSchemaValidationError(errors, missing) {

    for (var i = 0; i < errors.length; i++) {
        // Remove the stack from the error log so clients can't get
        // information about the environment.
        delete errors[i].stack;
    }

    this.status = 400;
    this.errors = errors;
    this.missing = missing;
    this.name = 'JsonSchemaValidationError';
    this.message = 'One or more request parameters failed validation.';
}
JsonSchemaValidationError.prototype = Object.create(Error.prototype);

/**
 * A custom error to handle duplicate email errors
 *
 * @param {?string} [message] - Custom user error message.
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

/**
 * A custom error to handle any tokens which cannot be found.
 *
 * @param {?string} [message] - Custom user error message.
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

/**
 * A custom error to handle login issues.
 *
 * @param {string} [message] - Custom login error message.
 * @constructor
 */
function LoginError(message) {
    this.status = 401;
    this.name = 'LoginError';
    this.message = (message || 'Invalid login.');
}
LoginError.prototype = Object.create(Error.prototype);

/**
 * A custom error to handle unauthorized actions.
 *
 * @param {string} [message] - Custom login error message.
 * @constructor
 */
function ForbiddenError(message) {
    this.status = 403;
    this.name = 'ForbiddenError';
    this.message = (message || 'Account is forbidden.');
}
ForbiddenError.prototype = Object.create(Error.prototype);

module.exports = {
    SyntaxError              : SyntaxError,
    JsonSchemaValidationError: JsonSchemaValidationError,
    EmailUsedError           : EmailUsedError,
    SecretNotFoundError      : SecretNotFoundError,
    LoginError               : LoginError,
    ForbiddenError           : ForbiddenError
};
