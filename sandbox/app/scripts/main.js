'use strict';

angular.module('SandboxApp', ['schemaForm', 'ui.ace']);

angular.module('SandboxApp')
    .controller('MainCtrl', [
        '$scope', function($scope) {
            $scope.baseSchema = {
                'id'                  : '/writ/io/place',
                'type'                : 'object',
                'description'         : 'The place definition',
                'additionalProperties': false,
                'properties'          : {
                    'name' : {
                        'type'      : 'string',
                        'minLength' : 3,
                        'maxLength' : 128,
                        'faker'     : 'random.words',
                        'permission': {
                            'read' : 100,
                            'write': 10,
                            'owner': true
                        }
                    },
                    'attrs': {
                        'type'                : 'object',
                        'additionalProperties': false
                    },
                    'pos'  : {
                        'description': 'Position of the place in the world.',
                        'type'       : 'object',
                        'properties' : {
                            'x': {
                                'type': 'integer'
                            },
                            'y': {
                                'type': 'integer'
                            },
                            'z': {
                                'type': 'integer'
                            }
                        },
                        'required'   : [
                            'x',
                            'y',
                            'z'
                        ],
                        'permission' : {
                            'read' : 100,
                            'write': 10,
                            'owner': true
                        }
                    },
                    'desc' : {
                        'type'      : 'string',
                        'minLength' : 3,
                        'maxLength' : 2048,
                        'faker'     : 'lorem.paragraph',
                        'permission': {
                            'read' : 100,
                            'write': 10,
                            'owner': true
                        }
                    }
                },
                'required'            : [
                    'pos',
                    'name',
                    'desc'
                ]
            };

            $scope.closet = {
                'properties': {
                    'name'       : {
                        'enum'   : ['Closet'],
                        'default': 'Closet'
                    },
                    'attrs'      : {
                        'type'      : 'object',
                        'properties': {
                            'indoor': {
                                'type'   : 'boolean',
                                'enum'   : [true],
                                'default': true
                            }
                        },
                        'required'  : [
                            'indoor'
                        ]
                    },
                    'constraints': {
                        'type'                : 'object',
                        'properties'          : {
                            'passages': {
                                'required': true,
                                'type'    : 'integer',
                                'minimum' : 0,
                                'maximum' : 2
                            }
                        },
                        'additionalProperties': false,
                        'required'            : [
                            'passages'
                        ]
                    },
                    'desc'       : {
                        'enum'   : [
                            'A simple closet.',
                            'A musty dirty closet.',
                            'A messy closet.',
                            'An empty closet.'
                        ],
                        'default': 'A simple closet.'
                    }
                },
                'required'  : [
                    'indoor',
                    'allowed',
                    'attrs',
                    'constraints'
                ]
            };

            $scope.schema = angular.merge({}, $scope.baseSchema, $scope.closet);
            $scope.schema.required = $scope.baseSchema.required.concat($scope.closet.required);

            $scope.schemaJson = angular.toJson($scope.schema, 4);
            $scope.$watch('schemaJson', function(val) {
                var json = angular.fromJson(val);
                if (json) {
                    $scope.schema = json;
                }
            });

            $scope.model = {};

            $scope.formSubmit = function(form, model) {
                if (form.$valid) {
                    $scope.modelJson = angular.toJson($scope.model, 4);
                }
            };

            $scope.fakeSchema = function() {
                console.log(jsf($scope.schema));
                $scope.model = jsf($scope.schema);
            };

            $scope.form = [
                '*',
                {
                    type : 'submit',
                    title: 'Save'
                },
                {
                    type   : 'button',
                    title  : 'Fake',
                    onClick: 'fakeSchema()'
                }
            ];
        }
    ]);
