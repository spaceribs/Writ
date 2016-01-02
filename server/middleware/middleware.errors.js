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

    } else if (err instanceof errors.JsonSchemaValidationError) {
        responseData = {
            status: 'INVALID_JSON_SCHEME',
            errors: {
                'body': err.errors
            }
        };
        res.status(err.status).json(responseData);

    } else if (err instanceof errors.SyntaxError) {
        responseData = {
            status: 'INVALID_JSON',
            errors: {
                'body': [{
                    'value': err.body,
                    'property': 'request.body',
                    'messages': [err.message]
                }]
            }
        };
        res.status(err.status).json(responseData);

    } else if (err instanceof errors.EmailUsedError) {
        responseData = {
            status: 'EMAIL_USED',
            errors: {
                'body': [{
                    'value': err.email,
                    'property': 'request.body.email',
                    'messages': [err.message]
                }]
            }
        };
        res.status(err.status).json(responseData);

    } else if (err instanceof errors.SecretNotFoundError) {
        responseData = {
            status: 'EMAIL_TOKEN_NOT_FOUND',
            errors: {
                'params': [{
                    'value': err.token,
                    'property': 'request.params.token',
                    'messages': [err.message]
                }]
            }
        };
        res.status(err.status).json(responseData);

    } else {
        next(err);

    }
}

module.exports = errorHandler;
