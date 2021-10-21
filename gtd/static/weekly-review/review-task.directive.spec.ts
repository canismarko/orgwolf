// import {jasmine} from "jasmine";
import * as angular from "angular";
import "angular-mocks";

describe('the reviewTask directive', function() {
    let $httpBackend, $compile, $rootScope, $scope, $templateCache, element;
    beforeEach(angular.mock.module("orgwolf.weeklyReview"));
    beforeEach(inject(function($injector) {
        $httpBackend = $injector.get('$httpBackend');
        $compile = $injector.get('$compile');
        $rootScope = $injector.get('$rootScope');
        $templateCache = $injector.get('$templateCache');
    }));
    beforeEach(function() {
        $templateCache.put('/static/project-outline.html', '');
        // Prepare the DOM element
	element = $compile(
            '<div ow-review-task ow-task="task" ow-draggable></div>'
        )($rootScope);
    });
    it("makes tags with ``ow-draggable`` into draggable elements", function() {
	// Try a non-draggable version
	element = $compile(
            '<div ow-review-task ow-task="task"></div>'
        )($rootScope);
	$scope = element.isolateScope();
        expect($scope.isDraggable).toBeFalsy();
	// Try a draggable version
	element = $compile(
            '<div ow-review-task ow-task="task" ow-draggable></div>'
        )($rootScope);
	$scope = element.isolateScope();
        expect($scope.isDraggable).toBeTruthy();
    });
});
