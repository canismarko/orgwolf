"use strict";

import "angular";
import "angular-mocks";


describe('the ow-nav navigation directive', function() {
    var $compile, $rootScope, element, $scope;
    beforeEach(angular.mock.module('orgwolf.tools'));
    beforeEach(inject(function($injector) {
	$compile = $injector.get('$compile');
	$rootScope = $injector.get('$rootScope');
	element = $compile(
	    '<div ow-navbar>' + 
	    '<div class="navbar__item"><a class="active"></a></div>' + 
	    '</div>')($rootScope);
    }));
    it('disables active nav links when the url changes', function() {
	$scope = element.scope();
	$scope.$broadcast('$locationChangeSuccess');
	expect(element[0].outerHTML).not.toContain('active');
    });
});
