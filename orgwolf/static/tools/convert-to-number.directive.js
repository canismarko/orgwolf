"use strict";

import {module as ngModule} from 'angular';

ngModule("orgwolf.tools")
    .directive('convertToNumber', convertToNumber);


function convertToNumber() {
    // Directive to allow for select inputs to be bound to numeric models
    // taken from: https://code.angularjs.org/1.4.7/docs/api/ng/directive/select
    // #binding-select-to-a-non-string-value-via-ngmodel-parsing-formatting
    return {
        require: 'ngModel',
        link: function(scope, element, attrs, ngModel) {
            ngModel.$parsers.push(function(val) {
                return parseInt(val, 10);
            });
            ngModel.$formatters.push(function(val) {
                return '' + val;
            });
        }
    }
};
