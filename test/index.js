'use strict';

var Jasmine = require('jasmine');
var SpecReporter = require('jasmine-spec-reporter');
var framework = new Jasmine();

framework.addReporter(new SpecReporter({
    displayStacktrace: 'all',
    displayPendingSpec: true,
    displaySpecDuration: true
}));
framework.loadConfigFile('./test/jasmine.json');
framework.execute();

module.exports = framework;
