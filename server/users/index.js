'use strict';

module.exports = {
    router: require('./users.ctrl'),
    database: require('./users.db'),
    auth: require('./users.auth')
};
