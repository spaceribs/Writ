'use strict';

module.exports = {
    db: {
        user: require('./db/user.json')
    },
    io: {
        user: require('./io/user.json'),
        place: require('./io/place.schema.json'),
        passage: require('./io/passage.schema.json'),
        item: require('./io/item.schema.json')
    }
};