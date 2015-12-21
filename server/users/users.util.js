'use strict';

var secureRandom = require('secure-random');
var hmac = require('crypto-js/hmac-sha512');

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

module.exports = {
    processPassword: processPassword,
    checkPassword: checkPassword,
    getHash: getHash
};
