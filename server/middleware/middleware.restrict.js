'use strict';
var errors = require('../app/app.errors');
var roles = require('../roles');

/**
 * Throw an error if the minimum user level isn't satisfied.
 *
 * @param {integer} minimumLevel - Minimum level that a user is required to have
 * @returns {Function}
 */
function restrict(minimumLevel) {

    return function(req, res, next) {

        var level = roles.anonymous;
        if (req.user) {
            level = req.user.permission || roles.anonymous;
        } else {
            req.user = {
                permission: roles.anonymous
            };
        }

        if (level > minimumLevel) {
            next(new errors.ForbiddenError(
                    'Your account is not allowed to access this endpoint.'));
            return;
        }

        next();
    };
}

module.exports = restrict;
