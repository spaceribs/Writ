'use strict';

var express = require('express');
var passport = require('../users/users.auth');
var controller = require('./passages.ctrl');
var restrict = require('../middleware/middleware.restrict');
var roles = require('../roles');

var authOptions = {
    session: false
};

var router = express.Router();

router.route('/passage/')
    .options(controller.passages.options)
    .get(passport.authenticate('basic', authOptions),
        restrict(roles.user),
        controller.passages.get)
    .post(passport.authenticate('basic', authOptions),
        restrict(roles.user),
        controller.passages.post);

router.route('/passage/list')
    .get(passport.authenticate('basic', authOptions),
        restrict(roles.admin),
        controller.passages.list);

router.route('/passage/:passageId')
    .get(passport.authenticate(['basic', 'anonymous'], authOptions),
        restrict(roles.anonymous),
        controller.passage.get)
    .post(passport.authenticate('basic', authOptions),
        restrict(roles.user),
        controller.passage.post)
    .delete(passport.authenticate('basic', authOptions),
        restrict(roles.admin),
        controller.passage.delete);

module.exports = router;
