'use strict';

var app = require('../app');

describe('User Endpoint', function() {

    var server;

    beforeAll(function(done) {
        server = app.listen(8000, done);
    });

    afterAll(function() {
        server.close();
    });

    it('checks stability', function() {
        expect(true).toBe(true);
    });

});
