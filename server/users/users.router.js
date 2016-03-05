'use strict';

var express = require('express');
var router = express.Router();
var passport = require('./users.auth');
var controller = require('./users.ctrl');
var validate = require('../middleware/middleware.validate');
var restrict = require('../middleware/middleware.restrict');
var models = require('../../models');
var roles = require('../roles');

var passOptions = {
    session: false
};

router.route('/login/')
    .get(passport.authenticate('basic', passOptions),
        controller.login);

router.route('/verify/:token')
    .get(controller.user.verify);

router.route('/user/')
    .options(controller.users.options)
    .get(passport.authenticate('basic', passOptions),
        restrict(roles.user),
        controller.users.get)
    .post(
        restrict(roles.anonymous),
        validate(models.io.user),
        controller.users.post);

router.route('/user/list')
    .get(passport.authenticate('basic', passOptions),
        restrict(roles.admin),
        controller.users.list);

router.route('/user/:userId')
    .get(restrict(roles.anonymous),
        controller.user.get)
    .post(passport.authenticate('basic', passOptions),
        restrict(roles.admin),
        controller.user.post)
    .delete(passport.authenticate('basic', passOptions),
        restrict(roles.admin),
        controller.user.delete);

module.exports = router;
