'use strict';

/*************************
 * Base Error Constructors
 *************************/

/**
 * A base error for all expected errors.
 *
 * @constructor
 */
function WritError() {
    this.code = 500;
    this.name = 'WritError';
    this.status = 'ERROR';
    this.message = 'An error has occurred.';
}
WritError.prototype = Object.create(Error.prototype);

/**
 * An error with the database.
 *
 * @param {object} payload - Response from the database.
 * @param {string} type - Document type this error relates to.
 * @constructor
 */
function DatabaseError(payload, type) {
    this.code = payload.status;
    this.type = type;
    this.name = 'DatabaseError';
    this.status = 'DATABASE_ERROR';
    this.message = 'A database error has occurred.';
}
DatabaseError.prototype = new WritError();

/**
 * An error for all bad requests.
 *
 * @constructor
 */
function BadRequestError() {
    this.code = 400;
    this.name = 'BadRequestError';
    this.status = 'BAD_REQUEST';
    this.message = 'Your request is invalid.';
}
BadRequestError.prototype = new WritError();

/**
 * An error for when a resource cannot be found.
 *
 * @constructor
 */
function NotFoundError() {
    this.code = 404;
    this.name = 'NotFoundError';
    this.status = 'NOT_FOUND';
    this.message = 'Your requested resource cannot be found.';
}
NotFoundError.prototype = new WritError();

/**
 * An error for all unauthorized requests.
 *
 * @constructor
 */
function UnauthorizedError() {
    this.code = 401;
    this.name = 'UnauthorizedError';
    this.status = 'UNAUTHORIZED';
    this.message = 'Your credentials are invalid.';
}
UnauthorizedError.prototype = new WritError();

/**
 * An error for all permissions issues.
 *
 * @constructor
 */
function ForbiddenError(message) {
    this.code = 403;
    this.name = 'ForbiddenError';
    this.status = 'FORBIDDEN';
    this.message = 'You do not have permission to complete this request.';
    if (message) {
        this.message = message;
    }
}
ForbiddenError.prototype = new WritError();

/**
 * An error for all bad requests.
 *
 * @constructor
 */
function ConflictError() {
    this.code = 409;
    this.name = 'ConflictError';
    this.status = 'CONFLICT';
    this.message = 'Your request conflicts with another resource.';
}
ConflictError.prototype = new WritError();

/***************************
 * Custom Error Constructors
 ***************************/

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

    this.errors = errors;
    this.missing = missing;
    this.name = 'JsonSchemaValidationError';
    this.status = 'SCHEMA_INVALID';
    if (errors.length === 1) {
        this.message = 'Request parameter failed validation.';
    } else {
        this.message = 'Multiple request parameters failed validation.';
    }
}
JsonSchemaValidationError.prototype = new BadRequestError();

/**
 * A custom error to handle duplicate email errors
 *
 * @param {?string} [message] - Custom user error message.
 * @param {string} email - The email which already exists.
 * @constructor
 */
function EmailInUseError(message, email) {
    this.email = email;
    this.name = 'EmailInUseError';
    this.status = 'EMAIL_IN_USE';
    this.message = 'This email is already in use.';
    if (message) {
        this.message = message;
    }
}
EmailInUseError.prototype = new ConflictError();

/**
 * A custom error to handle any tokens which cannot be found.
 *
 * @param {?string} [message] - Custom user error message.
 * @param {string} token - Token that was searched.
 * @constructor
 */
function EmailTokenNotFoundError(message, token) {
    this.token = token;
    this.name = 'EmailTokenNotFoundError';
    this.status = 'EMAIL_TOKEN_NOT_FOUND';
    this.message = 'The requested email token was not found.';
    if (message) {
        this.message = message;
    }
}
EmailTokenNotFoundError.prototype = new NotFoundError();

/**
 * A custom error to handle if a user cannot be found.
 *
 * @param {?string} [message] - Custom user error message.
 * @param {string} token - Token that was searched.
 * @constructor
 */
function UserNotFoundError(message) {
    this.name = 'UserNotFoundError';
    this.status = 'USER_NOT_FOUND';
    this.message = 'The requested user was not found.';
    if (message) {
        this.message = message;
    }
}
UserNotFoundError.prototype = new NotFoundError();

/**
 * A custom error to handle login issues.
 *
 * @param {string} [message] - Custom login error message.
 * @constructor
 */
function LoginError(message) {
    this.name = 'LoginError';
    this.status = 'UNAUTHORIZED_LOGIN';
    this.message = 'Your credentials were invalid.';
    if (message) {
        this.message = message;
    }
}
LoginError.prototype = new UnauthorizedError();

/**
 * A custom error to handle any places which cannot be found.
 *
 * @param {string} [message] - Custom user error message.
 * @constructor
 */
function PlacesNotFoundError(message) {
    this.name = 'PlacesNotFoundError';
    this.status = 'PLACES_NOT_FOUND';
    this.message = 'The requested places were not found.';
    if (message) {
        this.message = message;
    }
}
PlacesNotFoundError.prototype = new NotFoundError();

/**
 * A custom error to handle any places which cannot be found.
 *
 * @param {string} [message] - Custom user error message.
 * @constructor
 */
function PassagesNotFoundError(message) {
    this.name = 'PassagesNotFoundError';
    this.status = 'PASSAGES_NOT_FOUND';
    this.message = 'The requested passages were not found.';
    if (message) {
        this.message = message;
    }
}
PassagesNotFoundError.prototype = new NotFoundError();

/**
 * A custom error to handle any place which cannot be found.
 *
 * @param {?string} [message] - Custom user error message.
 * @constructor
 */
function PlaceNotFoundError(message) {
    this.name = 'PlaceNotFoundError';
    this.status = 'PLACE_NOT_FOUND';
    this.message = 'The requested place was not found.';
    if (message) {
        this.message = message;
    }
}
PlaceNotFoundError.prototype = new NotFoundError();

/**
 * A custom error to handle any passage which cannot be found.
 *
 * @param {?string} [message] - Custom user error message.
 * @constructor
 */
function PassageNotFoundError(message) {
    this.name = 'PassageNotFoundError';
    this.status = 'PASSAGE_NOT_FOUND';
    this.message = 'The requested passage was not found.';
    if (message) {
        this.message = message;
    }
}
PassageNotFoundError.prototype = new NotFoundError();

/**
 * A custom error to handle when a new place is invalid
 *
 * @param {string} [message] - Custom user error message.
 * @constructor
 */
function PlaceInvalidError(message) {
    this.name = 'PlaceInvalidError';
    this.status = 'PLACE_INVALID';
    this.message = 'Your place request is invalid.';
    if (message) {
        this.message = message;
    }
}
PlaceInvalidError.prototype = new BadRequestError();

/**
 * A custom error to handle when a new passage is invalid
 *
 * @param {string} [message] - Custom user error message.
 * @constructor
 */
function PassageInvalidError(message) {
    this.name = 'PassageInvalidError';
    this.status = 'PASSAGE_INVALID';
    this.message = 'Your passage request is invalid.';
    if (message) {
        this.message = message;
    }
}
PassageInvalidError.prototype = new BadRequestError();

module.exports = {
    SyntaxError              : SyntaxError,
    WritError                : WritError,
    DatabaseError            : DatabaseError,

    BadRequestError          : BadRequestError,
    NotFoundError            : NotFoundError,
    UnauthorizedError        : UnauthorizedError,
    ForbiddenError           : ForbiddenError,
    ConflictError            : ConflictError,

    JsonSchemaValidationError: JsonSchemaValidationError,
    EmailInUseError          : EmailInUseError,
    EmailTokenNotFoundError  : EmailTokenNotFoundError,
    UserNotFoundError        : UserNotFoundError,
    PlacesNotFoundError      : PlacesNotFoundError,
    PassagesNotFoundError    : PassagesNotFoundError,
    PlaceNotFoundError       : PlaceNotFoundError,
    PassageNotFoundError     : PassageNotFoundError,
    LoginError               : LoginError,
    PlaceInvalidError        : PlaceInvalidError,
    PassageInvalidError      : PassageInvalidError
};
