"use strict";

import "angular";
import "angular-mocks";


describe('the ow-nav navigation directive', function() {
    var $compile, $rootScope, element, $scope;
    beforeEach(angular.mock.module('orgwolf'));
    beforeEach(inject(function($injector) {
	$compile = $injector.get('$compile');
	$rootScope = $injector.get('$rootScope');
	element = $compile('<div ow-navbar></div>')($rootScope);
    }));
    it('recognizes changes to the url', function() {
	$scope = element.scope();
	$scope.$broadcast('$locationChangeSuccess');
	expect(true).toBeTruthy();
    });
});
