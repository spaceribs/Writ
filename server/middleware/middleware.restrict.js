'use strict';
var errors = require('../app/app.errors');
var roles = require('../roles');

/**
 * Throw an error if the minimum user level isn't satisfied.
 *
 * @param {integer} minimumLevel - Minimum level that a user is required to have
 * @param {string} allowOwner - If this action is allowed by owner, check
 *     this parameter against the user.id
 * @returns {Function}
 */
function restrict(minimumLevel, isOwner) {

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
