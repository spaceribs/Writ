'use strict';

var express = require('express');
var router = express.Router();
var passport = require('./users.auth');
var controller = require('./users.ctrl');
var restrict = require('../middleware/middleware.restrict');
var roles = require('../roles');

var authOptions = {
    session: false
};

router.route('/verify/:token')
    .get(controller.user.verify);

router.route('/user/')
    .options(controller.users.options)
    .get(passport.authenticate('basic', authOptions),
        restrict(roles.user),
        controller.users.get)
    .post(passport.authenticate(['basic', 'anonymous'], authOptions),
        restrict(roles.anonymous),
        controller.users.post);

router.route('/user/list')
    .get(passport.authenticate('basic', authOptions),
        restrict(roles.admin),
        controller.users.list);

router.route('/user/:userId')
    .get(passport.authenticate(['basic', 'anonymous'], authOptions),
        restrict(roles.anonymous),
        controller.user.get)
    .post(passport.authenticate('basic', authOptions),
        restrict(roles.admin),
        controller.user.post)
    .delete(passport.authenticate('basic', authOptions),
        restrict(roles.admin),
        controller.user.delete);

module.exports = router;
