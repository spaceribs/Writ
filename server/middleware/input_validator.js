'use strict';

var tv4 = require('tv4');
var errors = require('../app/errors');

/**
 * Middleware to validate database updates from the user.
 *
 * @param {object} schema - Schema to validate against.
 * @param {Array} schemaDependencies - Array of possible dependencies.
 * @returns {Function}
 */
function validate(schema, schemaDependencies) {

    for (var i = 0; i < schemaDependencies.length; i++) {
        var dependency = schemaDependencies[i];
        tv4.addSchema(dependency);
    }

    return function(req, res, next) {
        if (tv4.validateMultiple(req.body, schema)) {
            next(new errors.JsonSchemaValidationError(tv4.error.errors, tv4.error.missing));
        } else {
            next();
        }
    };
}

module.exports = validate;
