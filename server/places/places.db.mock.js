'use strict';

var Database = require('../../db');
var placeModel = require('../../models').db.place;
var memdown = require('memdown');

var Places = new Database('Mock-Places', {
    db: memdown
});

/**
 * Create a mock user for testing.
 *
 * @param {int} permission - Permission level to set for this user.
 * @param {boolean} invalid - Put some strange parameters in for validation.
 * @returns {Promise}
 */
function mockPlace(owner) {

    var place = jsf(placeModel);

    return Places.put(place)
        .then(function() {
        });

}

module.exports = Places;
