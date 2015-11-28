'use strict';

var models = require('../../models');

/**
 * Can the user perform the specified action determined by the model.
 *
 * @param {object} user - The user to verify permissions with.
 * @param {string} modelName - Model schema to check.
 * @param {string} prop - Model property to check permissions levels on.
 * @param {boolean=} write - Check write permissions instead of read.
 * @returns {boolean} - The user can perform the action.
 */
function can(user, modelName, prop, write) {
    var permissions = models[modelName].properties[prop].permission;
    var propLevel = write ? permissions.write : permissions.read;
    if (typeof user.permission === 'number') {
        user.permission = Math.ceil(user.permission);
        user.permission = Math.min(user.permission, 100);
        user.permission = Math.max(user.permission, -1);
        return user.permission <= propLevel;
    } else {
        return 100 <= propLevel;
    }
}

/**
 * Filter parameters based on permission level of user.
 *
 * @param {object} user - User to verify permissions against.
 * @param {string} modelName - Model schema to check.
 * @param {object} result - Result to filter.
 * @param {boolean=} write - Check against write permissions.
 * @returns {object} - Filtered object
 */
function permFilter(user, modelName, result, write) {
    var output = {};
    for(var prop in models[modelName].properties) {
        if (result.hasOwnProperty(prop) && can(user, modelName, prop, write)) {
            output[prop] = result[prop];
        }
    }
    return output;
}

module.exports = {
    can: can,
    permFilter: permFilter
};