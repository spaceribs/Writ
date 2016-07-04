'use strict';

var errors = require('../app/app.errors');
var _ = require('lodash');

var errorMap = {
    place: {
        400: errors.PlaceInvalidError,
        404: errors.PlaceNotFoundError
    },
    places: {
        404: errors.PlacesNotFoundError
    },
    user: {
        404: errors.UserNotFoundError
    },
    email: {
        404: errors.EmailTokenNotFoundError,
        409: errors.EmailInUseError
    },
    passage: {
        400: errors.PassageInvalidError,
        404: errors.PassageNotFoundError
    },
    passages: {
        404: errors.PassagesNotFoundError
    }
};

/**
 * The database error handler which maps our errors to PouchDB errors.
 *
 * @param {string} type - Model type to match.
 * @returns {Function} - Catch function to return.
 */
function databaseErrorHandler(type) {
    return function(err) {
        var ErrorType = _.get(errorMap, [type, err.status]);
        if (ErrorType) {
            throw new ErrorType();
        } else {
            throw err;
        }
    };
}

module.exports = databaseErrorHandler;
