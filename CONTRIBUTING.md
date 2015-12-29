# Writ Contributions
Thank you so much for contributing to Writ! We appreciate any ideas and contributions that
furthers our goals of creating a highly collaborative and fun text adventure environment.

## Module Overview

* Server - The express based server which wraps our database commands in an API
* Database - The PouchDB which only the server interfaces with.
* Models - The JSON Schema models with the frontend/backend share for validation.
* CLI - The terminal client for the express server.
* Client - The web client for the server.

## Reporting Bugs
Please provide bug reports on our issue tracker, be sure to search around to make sure you
aren't submitting a duplicate. Be descriptive and clear about the issue and provide the
environment you're experiencing the issue in.

## Suggesting Enhancements/Features
Same rules as reporting bugs except please provide a user story for the suggestion. We're
very open minded here, but the main goal of the project is to create a text adventure system
which is highly collaborative, easy to write and edit, and fun to play on your own or with others.

## Pull Requests
We have a somewhat strict enforcement of what gets accepted into the develop/master branch, be
sure to follow these rules for a feature to be successfully accepted:
* Linting - We currently have jshint and jscs enforcement, please set up your editor to
follow these rules accordingly, or risk our hound commenting all over your pull request.
* Testing - Unit testing is a must, we expect at least 80% jasmine coverage of submitted pull
requests. All tests must pass, or the PR will be automatically marked broken by Travis.
* File Structure - Our goal is to build most of the code in a very modular/flat way. Please
familiarize yourself with the file structure of the rest of the project.
* JSDoc - All functions that are not anonymous/parameterless require a JSDoc notation describing
how they are intended to work, and their parameters/return value types. I highly suggest
setting up your editor to use the local `./node_modules/jscs` as that will include the jsdoc
enforcement that is required for your PR to be accepted.
