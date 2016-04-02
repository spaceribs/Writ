'use strict';

var Jasmine = require('jasmine');
var SpecReporter = require('jasmine-spec-reporter');
var framework = new Jasmine();

framework.addReporter(new SpecReporter({
    displayStacktrace: 'all',
    displayPendingSpec: true,
    displaySpecDuration: true
}));

framework.onComplete(function(passed) {
    if (passed) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

framework.loadConfigFile('./test/jasmine.json');
framework.execute();

module.exports = framework;
