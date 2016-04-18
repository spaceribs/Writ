'use strict';

var Database = require('../../db');
var models = require('../../models');
var memdown = require('memdown');
var jsf = require('json-schema-faker');

var Places = new Database('Mock-Places', {
    db: memdown
});

/**
 * Create a mock place for testing.
 *
 * @param {object} owner - User ID of the
 * @param {{x: int, y: int, z: int}} pos - set a specific position for the
 * mock place.
 * @param {boolean=} invalid - Put some strange parameters in for validation.
 * @returns {Promise}
 */
function mockPlace(owner, pos, invalid) {

    var place = jsf(models.db.place, models.refs);

    place.owner = owner._id;
    place.id = place._id.match(/^place\/([a-z0-9-]+)$/)[1];
    delete place._rev;
    place.pos = pos;

    if (invalid) {
        place.weird = 'yep';
        place.odd = true;
    }

    return Places.put(place)
        .then(function() {
            return place;
        });

}

/**
 *
 * Create mock places for testing.
 *
 * @param {object} users - Users to assign as owners.
 * @returns {Promise}
 */
function mockPlaces(users) {

    var places = {};

    return mockPlace(users.adminUser, {x: 0, y: 0, z: 0})
        .then(function(lobby) {
            places.lobby = lobby;
            return mockPlace(users.verifiedUser, {x: 0, y: 1, z: 0});
        })
        .then(function(northRoom) {
            places.northRoom = northRoom;
            return mockPlace(users.verifiedUser, {x: -1, y: -1, z: 0});
        })
        .then(function(southWestRoom) {
            places.southWestRoom = southWestRoom;
            return mockPlace(users.verifiedUser, {x: 0, y: 0, z: -1});
        })
        .then(function(basement) {
            places.basement = basement;
            return mockPlace(users.invalidUser, {x: 666, y: 666, z: 666}, true);
        })
        .then(function(invalidRoom) {
            places.invalidRoom = invalidRoom;
            return places;
        });

}

module.exports = Places;
module.exports.mockPlace = mockPlace;
module.exports.mockPlaces = mockPlaces;
