'use strict';

//var tv4 = require('tv4');

var models = require('../../models');
//var errors = require('../app/app.errors');
//var SuccessMessage = require('../app/app.successes').SuccessMessage;
//var util = require('../app/app.util');

/**
 * Called when a user makes an OPTIONS request to "/places/".
 * Returns the json-schema used to validate/update places.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function placesOptions(req, res, next) {
    if (req.accepts('json')) {
        res.json(models.io.place);
    } else {
        next();
    }
}

/**
 * Called when a user makes an GET request to "/place/".
 * Returns the authenticated users' owned places.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function placesGet(req, res, next) {}

/**
 * Called when a user makes an POST request to "/place/".
 * Creates a new place for the current user.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function placesPost(req, res, next) {}

/**
 * Called when a user makes an GET request to "/place/list/".
 * An admin only list of all places for all users.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function placesList(req, res, next) {}

/**
 * Called when a user makes an GET request to "/place/:placeId".
 * Gets the details of a specific place.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function placeGet(req, res, next) {}

/**
 * Called when a user makes an GET request to "/place/:placeId".
 * Updates a specific place.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function placePost(req, res, next) {}

/**
 * Called when a user makes an GET request to "/place/:placeId".
 * Deletes a specific place from the world.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Callback for the response.
 */
function placeDelete(req, res, next) {}

module.exports = {
    places   : {
        options: placesOptions,
        get    : placesGet,
        post   : placesPost,
        list   : placesList
    },
    place    : {
        get   : placeGet,
        post  : placePost,
        delete: placeDelete
    }
};
