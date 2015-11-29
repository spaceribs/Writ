'use strict';

var models = require('../../models');

/**
 * Can the user perform the specified action determined by the model.
 *
 * @param {int} permLevel - Permission level to check.
 * @param {string} modelName - Model schema to check.
 * @param {string} prop - Model property to check permissions levels on.
 * @param {boolean=} write - Check write permissions instead of read.
 * @returns {boolean} - The user can perform the action.
 */
function can(permLevel, modelName, prop, write) {
    var permissions = models[modelName].properties[prop].permission;
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
    var keys = Object.keys(models[modelName].properties);
    permLevel -= owner ? 1 : 0;
    for (var i = 0; i < keys.length; i++) {
        if (can(permLevel, modelName, keys[i], write)) {
            output[keys[i]] = result[keys[i]];
        }
    }
    return output;
}

module.exports = {
    can: can,
    permFilter: permFilter
};