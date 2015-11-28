'use strict';

var errors = require('../errors');

module.exports = function(err, req, res, next) {
    var responseData;

    if (!req.accepts('json')) {
        res.set('Content-Type', 'text/plain')
            .status(406).send('Only JSON Content type is accepted.');
    } else if (err instanceof errors.JsonSchemaValidation) {
        responseData = {
            status: 'INVALID_SCHEME',
            errors: err.validations
        };
        res.status(400).json(responseData);

    } else if (err instanceof errors.JsonSchemaCustomPropertyError) {
        responseData = {
            status: 'INVALID_PROPERTY',
            errors: {
                'body': [{
                    'value': err.body,
                    'property': 'request.body',
                    'messages': [err.message]
                }]
            }
        };
        res.status(400).json(responseData);

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

    } else {
        // pass error to next error middleware handler
        next(err);
    }
};
