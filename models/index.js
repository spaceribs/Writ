'use strict';

var db = {
    user: require('./db/user.json'),
    place: require('./db/place.json'),
    passage: require('./db/passage.json'),
    item: require('./db/item.json')
};

var io = {
    user: require('./io/user.json'),
    place: require('./io/place.json'),
    passage: require('./io/passage.json'),
    item: require('./io/item.json')
};

var refs = [
    io.item, io.user, io.place, io.passage,
    db.item, db.user, db.place, db.passage
];

module.exports = {
    db: db,
    io: io,
    refs: refs
};
