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
 * A custom error to handle if a user cannot be found.
 *
 * @param {?string} [message] - Custom user error message.
 * @param {string} token - Token that was searched.
 * @constructor
 */
function UserNotFoundError(message) {
    this.status = 404;
    this.name = 'UserNotFoundError';
    this.message = (message || 'No user found.');
}
UserNotFoundError.prototype = Object.create(Error.prototype);

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
 * @param {string} message - Custom login error message.
 * @constructor
 */
function ForbiddenError(message) {
    this.status = 403;
    this.name = 'ForbiddenError';
    this.message = message;
}
ForbiddenError.prototype = Object.create(Error.prototype);

/**
 * A custom error to handle any places which cannot be found.
 *
 * @param {string} [message] - Custom user error message.
 * @constructor
 */
function PlacesNotFoundError(message) {
    this.status = 404;
    this.name = 'PlacesNotFoundError';
    this.message = message;
}
PlacesNotFoundError.prototype = Object.create(Error.prototype);

/**
 * A custom error to handle any places which cannot be found.
 *
 * @param {string} [message] - Custom user error message.
 * @constructor
 */
function PassagesNotFoundError(message) {
    this.status = 404;
    this.name = 'PassagesNotFoundError';
    this.message = message;
}
PassagesNotFoundError.prototype = Object.create(Error.prototype);

/**
 * A custom error to handle any place which cannot be found.
 *
 * @param {?string} [message] - Custom user error message.
 * @constructor
 */
function PlaceNotFoundError(message) {
    this.status = 404;
    this.name = 'PlaceNotFoundError';
    this.message = (message || 'No place found at this address.');
}
PlaceNotFoundError.prototype = Object.create(Error.prototype);

/**
 * A custom error to handle any passage which cannot be found.
 *
 * @param {?string} [message] - Custom user error message.
 * @constructor
 */
function PassageNotFoundError(message) {
    this.status = 404;
    this.name = 'PassageNotFoundError';
    this.message = (message || 'No passage found at this address.');
}
PlaceNotFoundError.prototype = Object.create(Error.prototype);

/**
 * A custom error to handle when a new place is invalid
 *
 * @param {string} [message] - Custom user error message.
 * @constructor
 */
function PlaceInvalidError(message) {
    this.status = 400;
    this.name = 'PlaceInvalidError';
    this.message = message;
}
PlaceInvalidError.prototype = Object.create(Error.prototype);

/**
 * A custom error to handle when a new place is invalid
 *
 * @param {string} [message] - Custom user error message.
 * @constructor
 */
function PassageInvalidError(message) {
    this.status = 400;
    this.name = 'PassageInvalidError';
    this.message = message;
}
PassageInvalidError.prototype = Object.create(Error.prototype);

module.exports = {
    SyntaxError              : SyntaxError,
    JsonSchemaValidationError: JsonSchemaValidationError,
    EmailUsedError           : EmailUsedError,
    SecretNotFoundError      : SecretNotFoundError,
    UserNotFoundError        : UserNotFoundError,
    PlacesNotFoundError      : PlacesNotFoundError,
    PassagesNotFoundError    : PassagesNotFoundError,
    PlaceNotFoundError       : PlaceNotFoundError,
    PassageNotFoundError     : PassageNotFoundError,
    LoginError               : LoginError,
    ForbiddenError           : ForbiddenError,
    PlaceInvalidError        : PlaceInvalidError,
    PassageInvalidError      : PassageInvalidError
};
