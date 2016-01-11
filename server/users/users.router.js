'use strict';

var express = require('express');
var router = express.Router();
var passport = require('./users.auth');
var controller = require('./users.ctrl');
var validate = require('../middleware/middleware.validate');
var models = require('../../models');

router.route('/login/')
    .get(passport.authenticate('basic', {session: false}), controller.login);

router.route('/user/')
    .options(controller.users.options)
    .get(passport.authenticate('basic', {
        session: false
    }), controller.users.get)
    .post(validate(models.io.user), controller.users.post);

router.route('/user/list')
    .get(passport.authenticate('basic', {
        session: false
    }), controller.users.list);

router.route('/user/:userId')
    .get(controller.user.get)
    .post(passport.authenticate('basic', {
        session: false
    }), controller.user.post)
    .delete(passport.authenticate('basic', {
        session: false
    }), controller.user.delete);

router.route('/verify/:token')
    .get(controller.user.verify);

module.exports = router;
