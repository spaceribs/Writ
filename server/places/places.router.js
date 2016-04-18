'use strict';

var express = require('express');
var passport = require('../users/users.auth');
var controller = require('./places.ctrl');
var restrict = require('../middleware/middleware.restrict');
var roles = require('../roles');

var authOptions = {
    session: false
};

var router = express.Router();

router.route('/place/')
    .options(controller.places.options)
    .get(passport.authenticate('basic', authOptions),
        restrict(roles.user),
        controller.places.get)
    .post(passport.authenticate('basic', authOptions),
        restrict(roles.user),
        controller.places.post);

router.route('/place/list')
    .get(passport.authenticate('basic', authOptions),
        restrict(roles.admin),
        controller.places.list);

router.route('/place/:placeId')
    .get(passport.authenticate(['basic', 'anonymous'], authOptions),
        restrict(roles.anonymous),
        controller.place.get)
    .post(passport.authenticate('basic', authOptions),
        restrict(roles.user),
        controller.place.post)
    .delete(passport.authenticate('basic', authOptions),
        restrict(roles.admin),
        controller.place.delete);

module.exports = router;
