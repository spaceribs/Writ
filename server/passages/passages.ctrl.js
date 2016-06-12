'use strict';

var uuid = require('node-uuid');
var _ = require('lodash');
var tv4 = require('tv4');

var models = require('../../models');
var Promise = require('lie');
var roles = require('../roles.json');
var Passages = require('./passages.db');
var Places = require('../places/places.db');
var errors = require('../app/app.errors');
var SuccessMessage = require('../app/app.successes').SuccessMessage;
var util = require('../app/app.util');

for (var i = 0; i < models.refs.length; i++) {
    tv4.addSchema(models.refs[i]);
}

/**
 * Called when a user makes an OPTIONS request to "/passage/".
 * Returns the json-schema used to validate/update passages.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function passagesOptions(req, res, next) {
    if (req.accepts('json')) {
        res.json(models.io.passage);
    } else {
        next();
    }
}

/**
 * Called when a user makes an GET request to "/passage/".
 * Returns the authenticated users' owned passages.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function passagesGet(req, res, next) {

    Passages.createIndex({
        'index': {
            'fields': ['owner']
        }
    }).then(function() {
        return Passages.find({
            selector: {
                owner: req.user._id
            }
        });

    }).then(function(results) {
        if (!results.docs || results.docs.length === 0) {
            throw new errors.PassagesNotFoundError(
                'You do not own any passages.'
            );
        } else {
            return results.docs;
        }

    }).then(function(passages) {
        var filteredPassages = [];

        for (var i = 0; i < passages.length; i++) {
            var filteredPassage = util.dbFilter(
                req.user.permission, 'passage', passages[i], false, true);
            filteredPassages.push(filteredPassage);
        }

        return filteredPassages;

    }).then(function(passages) {
        res.json(new SuccessMessage(
            'Owned passages found.',
            passages)
        );

    }).catch(function(err) {
        next(err);

    });

}

/**
 * Called when a user makes an POST request to "/passage/".
 * Creates a new passage for the current user.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function passagesPost(req, res, next) {

    var validation = tv4.validateMultiple(req.body, models.io.passage);
    if (!validation.valid) {
        next(new errors.JsonSchemaValidationError(
            validation.errors, validation.missing));
        return false;
    }

    var passageData = req.body;
    var passageFrom;
    var passageTo;

    Passages.createIndex({
        'index': {
            'fields': ['from', 'to']
        }
    }).then(function() {

        return Promise.all([Passages.find({
            selector: {
                'from': passageData.from,
                'to'  : passageData.to
            },
            limit: 1
        }), Passages.find({
            selector: {
                'from': passageData.to,
                'to'  : passageData.from
            },
            limit: 1
        })]);

    }).then(function(passagesExist) {
        console.log(passagesExist);

        if (passageExists && _.get(passageExists, 'docs.length')) {
            throw new errors.PassageInvalidError(
                'A passage between these 2 places already exists.'
            );
        }

        return Places.get(passageData.from);

    }).then(function(fromResult) {

        passageFrom = fromResult;

        // Check if user is an admin or the owner of the originating place
        var isOwner = passageFrom.owner === req.user._id;
        var isAdmin = req.user.permission > roles.admin;

        if (!isAdmin && !isOwner) {
            throw new errors.ForbiddenError(
                'You are not allowed to connect from a place you do not own.'
            );
        }

        return Places.get(passageData.to);

    }).then(function(toResult) {

        passageTo = toResult;

        // Check if user is an admin or the owner of the originating place
        var isOwner = passageTo.owner === req.user._id;
        var isAdmin = req.user.permission > roles.admin;

        if (!isAdmin && !isOwner) {
            throw new errors.ForbiddenError(
                'You are not allowed to connect to a place you do not own.'
            );
        }

        // Check if the rooms are adjacent to one another.
        var xOff = Math.abs(passageFrom.pos.x - passageTo.pos.x);
        var yOff = Math.abs(passageFrom.pos.y - passageTo.pos.y);
        var zOff = Math.abs(passageFrom.pos.z - passageTo.pos.z);

        if (xOff > 1 || yOff > 1 || zOff > 1) {
            throw new errors.PassageInvalidError(
                'A passage cannot connect two non-adjacent places.'
            );
        }

    }).then(function() {

        passageData.id = uuid.v4();
        passageData._id = 'place/' + passageData.id;
        passageData.owner = req.user._id;
        passageData.created = new Date().toISOString();
        passageData.updated = new Date().toISOString();

        var validate = tv4.validateMultiple(
            passageData, models.db.place);

        if (!validate.valid) {
            throw new errors.JsonSchemaValidationError(
                validate.errors, validate.missing);
        }

        return Passages.put(passageData);

    }).then(function(result) {
        var filtered = util.dbFilter(
            req.user.permission, 'passage', result, false, false);

        res.json(
            new SuccessMessage(
                'Created new passage.', filtered)
        );

    }).catch(function(err) {
        next(err);

    });
}

/**
 * Called when a user makes an GET request to "/passage/list/".
 * An admin only list of all passages for all users.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
function passagesList(req, res) {

    console.log(req.user._id);

    Passages.allDocs({
        startkey    : 'passage/',
        endkey      : 'passage/\uffff',
        include_docs: true
    }).then(function(results) {
        for (var i = 0; i < results.rows.length; i++) {
            var row = results.rows[i];
            results.rows[i].doc = util.ioFilter(
                req.user.permission, 'passage', row.doc, false, false);
        }
        return results;

    }).then(function(results) {
        res.json(results);

    });

}

/**
 * Called when a user makes an GET request to "/passage/:passageId".
 * Gets the details of a specific passage.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function passageGet(req, res, next) {

    var passageId = req.params.passageId;
    Passages.get('passage/' + passageId)
        .then(function(result) {
            var filtered = util.dbFilter(
                req.user.permission, 'passage', result, false, false);
            res.json(new SuccessMessage(
                'Passage found.', filtered));

        }).catch(function() {
            next(new errors.PassageNotFoundError());
        });

}

/**
 * Called when a user makes an POST request to "/passage/:passageId".
 * Updates a specific passage.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function passagePost(req, res, next) {

    var newPassageData;
    var passageId = req.params.passageId;
    var passageFrom;
    var passageTo;

    Passages.get('passage/' + passageId)
        .then(function(result) {
            var passageUpdates = util.ioFilter(
                req.user.permission, 'passage', req.body, true,
                result.owner === req.user._id);

            if (_.isEmpty(passageUpdates)) {
                throw new errors.ForbiddenError(
                    'You are not allowed to make these updates to the room.');
            }

            newPassageData = _.extend({}, result, passageUpdates);
            newPassageData.updated = new Date().toISOString();

            var validate = tv4.validateMultiple(
                newPassageData, models.db.passage);

            if (!validate.valid) {
                throw new errors.JsonSchemaValidationError(
                    validate.errors, validate.missing
                );
            }

            return Passages.find({
                selector: {
                    '$or': [
                        {
                            'from': newPassageData.from,
                            'to': newPassageData.to
                        },
                        {
                            'to': newPassageData.from,
                            'from': newPassageData.to
                        }
                    ]
                },
                limit: 1
            });

        }).then(function(passageExists) {

            if (passageExists && _.get(passageExists, 'docs.length')) {
                throw new errors.PassageInvalidError(
                    'A passage between these 2 places already exists.'
                );
            }

            return Places.get(newPassageData.from);

        }).then(function(fromResult) {

            passageFrom = fromResult;

            // Check if user is an admin or the owner of the originating place
            var isOwner = passageFrom.owner === req.user._id;
            var isAdmin = req.user.permission > roles.admin;

            if (!isAdmin && !isOwner) {
                throw new errors.ForbiddenError(
                    'You are not allowed to create a passage ' +
                    'from a place you do not own.'
                );
            }

            return Places.get(newPassageData.to);

        }).then(function(toResult) {

            passageTo = toResult;

            // Check if user is an admin or the owner of the originating place
            var isOwner = passageTo.owner === req.user._id;
            var isAdmin = req.user.permission > roles.admin;

            if (!isAdmin && !isOwner) {
                throw new errors.ForbiddenError(
                    'You are not allowed to create a passage ' +
                    'to a place you do not own.'
                );
            }

            // Check if the rooms are adjacent to one another.
            var xOff = Math.abs(passageFrom.pos.x - passageTo.pos.x);
            var yOff = Math.abs(passageFrom.pos.y - passageTo.pos.y);
            var zOff = Math.abs(passageFrom.pos.z - passageTo.pos.z);

            if (xOff > 1 || yOff > 1 || zOff > 1) {
                throw new errors.PassageInvalidError(
                    'A passage cannot connect two non-adjacent places.'
                );
            }

            return Passages.put(newPassageData);

        }).then(function() {
            var passageData = util.ioFilter(
                req.user.permission, 'passage',
                newPassageData, false, req.user._id === newPassageData.owner);

            res.json(new SuccessMessage(
                'Passage has been successfully updated.',
                passageData
            ));

        }).catch(function(err) {
            if (err.status === 404) {
                next(new errors.PassagesNotFoundError());
            } else {
                next(err);
            }

        });

}

/**
 * Called when a user makes an DELETE request to "/passage/:passageId".
 * Deletes a specific passage from the world.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function passageDelete(req, res, next) {

    var passageId = req.params.passageId;

    Passages.get('passages/' + passageId).then(function(doc) {
        return Passages.remove(doc);

    }).then(function() {
        res.json(new SuccessMessage('Passage has been deleted.'));

    }).catch(function() {
        next(new errors.PassageNotFoundError());

    });

}

module.exports = {
    passages   : {
        options: passagesOptions,
        get    : passagesGet,
        post   : passagesPost,
        list   : passagesList
    },
    passage    : {
        get   : passageGet,
        post  : passagePost,
        delete: passageDelete
    }
};
