'use strict';

var unit = require('./unit');

unit.onComplete(function(passed) {
    if (passed) {
        console.log('All specs have passed');
    } else {
        console.log('At least one spec has failed');
    }
});
unit.execute();

module.exports = {
    unit: unit
};
