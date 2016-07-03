'use strict';

var errors = require('../app/app.errors');

/**
 * The error handler for Writ, currently a very large switch statement
 * for all the different kinds of errors we expect from our express app.
 *
 * @param {Error} err - Error thrown.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {function} next - Callback for Express.
 */
function errorHandler(err, req, res, next) {

    var responseData;

    if (!req.accepts('json')) {
        res.set('Content-Type', 'text/plain')
            .status(406).send('Only JSON Content type is accepted.');

    } else if (err instanceof errors.SyntaxError) {
        responseData = {
            status: 'INVALID_JSON',
            message: err.message
        };
        res.status(400).json(responseData);

    } else if (err instanceof errors.JsonSchemaValidationError) {
        responseData = {
            status: err.status,
            errors: {
                'body': err.errors
            }
        };
        res.status(err.code).json(responseData);

    } else if (err instanceof errors.WritError) {
        responseData = {
            status: err.status,
            message: err.message
        };
        res.status(err.code).json(responseData);

    } else {
        next(err);

    }
}

module.exports = errorHandler;
