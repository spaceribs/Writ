'use strict';

var Jasmine = require('jasmine');
var reporters = require('jasmine-reporters');
var SpecReporter = require('jasmine-spec-reporter');

var framework = new Jasmine();
framework.addReporter(new SpecReporter({
    displayStacktrace: 'all',
    displayPendingSpec: true,
    displaySpecDuration: true
}));
framework.loadConfigFile('./test/unit/jasmine.json');

module.exports = framework;
