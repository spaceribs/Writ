'use strict';

var tv4 = require('tv4');
var errors = require('../app/app.errors');

/**
 * Throw an error if the minimum user level isn't satisfied or the JSON schema
 * isn't valid.
 *
 * @param {integer} minimumLevel - Minimum level that a user is required to have
 * @param {object} schema - Schema to check permissions with.
 * @param {array?} schemaDependencies - Array of possible dependencies.
 * @returns {Function}
 */
function restrict(minimumLevel, schema, schemaDependencies) {

    if (schemaDependencies) {
        for (var i = 0; i < schemaDependencies.length; i++) {
            var dependency = schemaDependencies[i];
            tv4.addSchema(dependency);
        }
    }

    return function(req, res, next) {
        var level = 100;
        var validate = tv4.validateMultiple(req.body, schema);

        if (req.user) {
            level = req.user.permission || 100;
        }

        console.log(level, minimumLevel);

        if (level > minimumLevel) {
            next(new errors.ForbiddenError(
                    'Your account is not allowed to access this endpoint.'));
        }

        if (!validate.valid) {
            next(new errors.JsonSchemaValidationError(
                    validate.errors, validate.missing));
            return;
        }

        next();
    };
}

module.exports = restrict;
