'use strict';

var secureRandom = require('secure-random');
var hmac = require('crypto-js/hmac-sha512');
var models = require('../../models');
var _ = require('lodash');

/**
 * Transforms a request body password to a salt/hash.
 *
 * @param {object} params - Request body to process.
 */
function processPassword(params) {
    if (params.password) {
        params.salt = secureRandom.randomBuffer(256).toString('hex');
        params.hash = getHash(params.password, params.salt);
        delete params.password;
    }
}

/**
 * Checks a password against a hash
 *
 * @param {string} password - Password to check.
 * @param {string} salt - Salt from the database to generate the hash with.
 * @param {string} hash - Hash from the database to check against.
 * @returns {boolean}
 */
function checkPassword(password, salt, hash) {
    return getHash(password, salt) === hash;
}

/**
 * Generates a password hash.
 *
 * @param {string} password - Password to generate the hash for.
 * @param {string} salt - Random content to salt the hash with.
 * @returns {string}
 */
function getHash(password, salt) {
    return hmac(password, salt).toString();
}

/**
 * Can the user perform the specified action determined by the model?
 *
 * @param {int} permLevel - Permission level to check.
 * @param {object} model - Model schema properties to check.
 * @param {string} prop - Model property to check permissions levels on.
 * @param {boolean=} write - Check write permissions instead of read.
 * @returns {boolean} - The user can perform the action.
 */
function userCan(permLevel, model, prop, write) {
    var permissions = model[prop].permission;
    var propLevel = write ? permissions.write : permissions.read;
    if (typeof permLevel === 'number') {
        permLevel = Math.ceil(permLevel);
        permLevel = Math.min(permLevel, 100);
        permLevel = Math.max(permLevel, -1);
        return permLevel <= propLevel;
    } else {
        return 100 <= propLevel;
    }
}

/**
 * Filter parameters based on permission level of user.
 *
 * @param {int} permLevel - Permission level to check.
 * @param {string} modelName - Model schema to check.
 * @param {object} result - Result to filter.
 * @param {boolean=} write - Check against write permissions.
 * @param {boolean=} owner - If the param is private, is the caller the owner?
 * @returns {object} - Filtered object
 */
function permFilter(permLevel, modelName, result, write, owner) {
    var output = {};
    var model = _.extend({}, models.io[modelName].properties, models.db[modelName].properties);
    var keys = Object.keys(model);
    permLevel -= owner ? 1 : 0;
    for (var i = 0; i < keys.length; i++) {
        if (userCan(permLevel, model, keys[i], write)) {
            output[keys[i]] = result[keys[i]];
        }
    }
    return output;
}

module.exports = {
    processPassword: processPassword,
    checkPassword: checkPassword,
    getHash: getHash,
    userCan: userCan,
    permFilter: permFilter
};
