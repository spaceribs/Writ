'use strict';

var Database = require('../../db');
var models = require('../../models');
var memdown = require('memdown');
var jsf = require('json-schema-faker');

var Passages = new Database('Mock-Passages', {
    db: memdown
});

/**
 * Create a mock passage for testing.
 *
 * @param {object} owner - User ID of the
 * @param {{x: int, y: int, z: int}} pos - set a specific position for the
 * mock passage.
 * @param {string} from - Room id the passage comes from
 * @param {string=} to - Room id the passage goes to
 * @param {boolean=} invalid - Put some strange parameters in for validation.
 * @returns {Promise}
 */
function mockPassage(owner, pos, from, to, invalid) {

    var passage = jsf(models.db.passage, models.refs);

    passage.owner = owner._id;
    passage.id = passage._id.match(/^passage\/([a-z0-9-]+)$/)[1];
    delete passage._rev;
    passage.pos = pos;
    passage.from = from;
    passage.to = to;

    if (invalid) {
        passage.weird = 'yep';
        passage.odd = true;
    }

    return Passages.put(passage)
        .then(function() {
            return passage;
        });

}

/**
 *
 * Create mock passages for testing.
 *
 * @param {object} places - Places to connect.
 * @returns {Promise}
 */
function mockPassages(places) {

    var passages = {};

    return mockPassage(
            places.lobby.owner,
            {x: 0, y: 0.5, z: 0},
            places.lobby._id,
            places.northRoom._id
        )
        .then(function(northDoor) {
            passages.northDoor = northDoor;
            return mockPassage(places.northRoom.owner,
                {x: 0, y: 0, z: -0.5},
                places.northRoom._id,
                places.northEastRoom._id
            );
        })
        .then(function(northEastDoor) {
            passages.northEastDoor = northEastDoor;
            return mockPassage(places.lobby.owner,
                {x: 0, y: 0, z: -0.5},
                places.lobby._id,
                places.basement._id
            );
        })
        .then(function(basementDoor) {
            passages.basementDoor = basementDoor;
            return mockPassage(
                places.lobby.owner,
                {x: -0.5, y: 0, z: 0},
                places.lobby._id
            );
        })
        .then(function(openDoor) {
            places.openWestDoor = openDoor;
            return mockPassage(
                places.invalidRoom.owner,
                {x: 666, y: 666, z: 666},
                places.lobby._id,
                places.invalidRoom._id,
                true
            );
        })
        .then(function(invalidPassage) {
            places.invalidPassage = invalidPassage;
            return passages;
        });

}

module.exports = Passages;
module.exports.mockPassage = mockPassage;
module.exports.mockPassages = mockPassages;
