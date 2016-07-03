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
var databaseErrorHandler = require('../app/app.database');
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

    Promise.resolve().then(function() {
        return Passages.createIndex({
            'index': {
                'fields': ['owner']
            }
        }).catch(databaseErrorHandler('passages'));
        
    }).then(function() {
        return Passages.find({
            selector: {
                owner: req.user._id
            }
        }).catch(databaseErrorHandler('passages'));

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

    Promise.resolve().then(function() {
        return Passages.createIndex({
            'index': {
                'fields': ['from', 'to']
            }
        }).catch(databaseErrorHandler('passages'));

    }).then(function() {

        if (passageData.from === passageData.to) {
            throw new errors.PassageInvalidError(
                'You cannot connect a place to itself.'
            );
        }

        var findDuplicatePassage = Passages.find({
            selector: {
                'from': passageData.from,
                'to'  : passageData.to
            },
            limit: 1
        }).catch(databaseErrorHandler('passage'));

        var findReversePassage = Passages.find({
            selector: {
                'from': passageData.to,
                'to'  : passageData.from
            },
            limit: 1
        }).catch(databaseErrorHandler('passage'));

        return Promise.all([
            findDuplicatePassage,
            findReversePassage
        ]);

    }).then(function(passagesExist) {

        var passageExists = _.reduce(passagesExist, function(exists, result) {
            return exists || !!result.docs.length;
        }, false);

        if (passageExists) {
            throw new errors.PassageInvalidError(
                'A passage already exists between these places.'
            );
        }

        return Places.get(passageData.from)
            .catch(databaseErrorHandler('place'));

    }).then(function(fromResult) {

        passageFrom = fromResult;

        // Check if user is an admin or the owner of the originating place
        var isOwner = passageFrom.owner === req.user._id;
        var isAdmin = req.user.permission <= roles.admin;

        if (!isAdmin && !isOwner) {
            throw new errors.ForbiddenError(
                'You are not allowed to connect a passage ' +
                'from a place you do not own.'
            );
        }

        return Places.get(passageData.to)
            .catch(databaseErrorHandler('place'));

    }).then(function(toResult) {

        passageTo = toResult;

        // Check if user is an admin or the owner of the originating place
        var isOwner = passageTo.owner === req.user._id;
        var isAdmin = req.user.permission <= roles.admin;

        if (!isAdmin && !isOwner) {
            throw new errors.ForbiddenError(
                'You are not allowed to connect a passage ' +
                'to a place you do not own.'
            );
        }

        // Generate the offset between the connecting places
        var offsets = _.reduce(passageFrom.pos,
            function(offsets, coord, axis) {
                offsets[axis] = coord - passageTo.pos[axis];
                return offsets;
            }, {});

        // Get the distance between the connecting places
        var vicinity = _.reduce(offsets, function(distance, offset) {
            if (distance !== false && Math.abs(offset) <= 1) {
                return Math.abs(offset) + distance;
            } else {
                return false;
            }
        }, 0);

        // Make sure that the passage is only connecting places which
        // are directly adjacent to each other by checking the vicinity.
        var adjacent = (vicinity <= 1);

        if (!vicinity || !adjacent) {
            throw new errors.PassageInvalidError(
                'A passage cannot connect two non-adjacent places.'
            );
        }

        return _.reduce(passageFrom.pos,
            function(pos, coord, axis) {
                pos[axis] = coord + (offsets[axis] / 2);
                return pos;
            }, {});

    }).then(function(pos) {

        passageData.pos = pos;
        passageData.id = uuid.v4();
        passageData._id = 'passage/' + passageData.id;
        passageData.owner = req.user._id;
        passageData.created = new Date().toISOString();
        passageData.updated = new Date().toISOString();

        var validate = tv4.validateMultiple(
            passageData, models.db.passage);

        if (!validate.valid) {
            throw new errors.JsonSchemaValidationError(
                validate.errors, validate.missing);
        }

        return Passages.put(passageData)
            .catch(databaseErrorHandler('passage'));

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

    Promise.resolve().then(function() {
        return Passages.allDocs({
            startkey    : 'passage/',
            endkey      : 'passage/\uffff',
            include_docs: true
        }).catch(databaseErrorHandler('passages'));

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

    Promise.resolve().then(function() {
        return Passages.get('passage/' + passageId)
            .catch(databaseErrorHandler('passage'));

    }).then(function(result) {
        var filtered = util.dbFilter(
            req.user.permission, 'passage', result, false, false);
        res.json(new SuccessMessage(
            'Passage found.', filtered));

    }).catch(function(err) {
        next(err);

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

    Promise.resolve().then(function() {
        return Passages.createIndex({
            'index': {
                'fields': ['from', 'to']
            }
        }).catch(databaseErrorHandler('passages'));

    }).then(function() {
        return Passages.get('passage/' + passageId)
            .catch(databaseErrorHandler('passage'));
    })
    .then(function(result) {
        var passageUpdates = util.ioFilter(
            req.user.permission, 'passage', req.body, true,
            result.owner === req.user._id);

        if (_.isEmpty(passageUpdates)) {
            throw new errors.ForbiddenError(
                'You are not allowed to make these updates to this passage.');
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

        if (newPassageData.from === newPassageData.to) {
            throw new errors.PassageInvalidError(
                'You cannot connect a place to itself.'
            );
        }

        var findDuplicatePassage = Passages.find({
            selector: {
                'from': newPassageData.from,
                'to'  : newPassageData.to
            },
            limit: 1
        }).catch(databaseErrorHandler('passage'));

        var findReversePassage = Passages.find({
            selector: {
                'from': newPassageData.to,
                'to'  : newPassageData.from
            },
            limit: 1
        }).catch(databaseErrorHandler('passage'));

        return Promise.all([
            findDuplicatePassage,
            findReversePassage
        ]);

    }).then(function(passagesExist) {

        var passageExists = _.reduce(passagesExist,
            function(exists, result) {
                if (_.get(result, 'docs[0].id') === passageId) {
                    return false;
                }
                return exists || !!result.docs.length;
            }, false);

        if (passageExists) {
            throw new errors.PassageInvalidError(
                'A passage between these 2 places already exists.'
            );
        }

        return Places.get(newPassageData.from)
            .catch(databaseErrorHandler('place'));

    }).then(function(fromResult) {

        passageFrom = fromResult;

        // Check if user is an admin or the owner of the originating place
        var isOwner = passageFrom.owner === req.user._id;
        var isAdmin = req.user.permission <= roles.admin;

        if (!isAdmin && !isOwner) {
            throw new errors.ForbiddenError(
                'You are not allowed to connect a passage ' +
                'from a place you do not own.'
            );
        }

        return Places.get(newPassageData.to)
            .catch(databaseErrorHandler('place'));

    }).then(function(toResult) {

        passageTo = toResult;

        // Check if user is an admin or the owner of the originating place
        var isOwner = passageTo.owner === req.user._id;
        var isAdmin = req.user.permission <= roles.admin;

        if (!isAdmin && !isOwner) {
            throw new errors.ForbiddenError(
                'You are not allowed to connect a passage ' +
                'to a place you do not own.'
            );
        }

        // Generate the offset between the connecting places
        var offsets = _.reduce(passageFrom.pos,
            function(offsets, coord, axis) {
                offsets[axis] = coord - passageTo.pos[axis];
                return offsets;
            }, {});

        // Get the distance between the connecting places
        var vicinity = _.reduce(offsets, function(distance, offset) {
            if (distance !== false && Math.abs(offset) <= 1) {
                return Math.abs(offset) + distance;
            } else {
                return false;
            }
        }, 0);

        // Make sure that the passage is only connecting places which
        // are directly adjacent to each other by checking the vicinity.
        var adjacent = (vicinity <= 1);

        if (!vicinity || !adjacent) {
            throw new errors.PassageInvalidError(
                'A passage cannot connect two non-adjacent places.'
            );
        }

        return _.reduce(passageFrom.pos,
            function(pos, coord, axis) {
                pos[axis] = coord + (offsets[axis] / 2);
                return pos;
            }, {});

    }).then(function(pos) {

        newPassageData.pos = pos;
        newPassageData.updated = new Date().toISOString();

        var validate = tv4.validateMultiple(
            newPassageData, models.db.passage);

        if (!validate.valid) {
            throw new errors.JsonSchemaValidationError(
                validate.errors, validate.missing);
        }

        return Passages.put(newPassageData)
            .catch(databaseErrorHandler('passage'));

    }).then(function() {
        var filtered = util.dbFilter(
            req.user.permission, 'passage', newPassageData, false,
            newPassageData.owner === req.user._id);

        res.json(new SuccessMessage(
            'Passage has been successfully updated.', filtered));

    }).catch(function(err) {
        next(err);

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

    Promise.resolve()
    .then(function() {
        return Passages.get('passage/' + passageId)
            .catch(databaseErrorHandler('passage'));

    }).then(function(doc) {
        return Passages.remove(doc)
            .catch(databaseErrorHandler('passage'));

    }).then(function() {
        res.json(new SuccessMessage('Passage has been deleted.'));

    }).catch(function(err) {
        next(err);

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
