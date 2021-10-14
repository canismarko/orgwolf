// import {jasmine} from "jasmine";
import * as angular from "angular";
import "angular-mocks";

describe('the weeklyReview controller', function() {
    var $scope, $rootScope, $httpBackend, $controller, $templateCache, activeReview, pendingReview;
    beforeEach(angular.mock.module("orgwolf.weeklyReview"));
    beforeEach(angular.mock.inject(function($injector) {
        $controller = $injector.get("$controller");
        $rootScope = $injector.get("$rootScope");
        $scope = $rootScope.$new();
        $httpBackend = $injector.get("$httpBackend");
        $templateCache = $injector.get("$templateCache");
    }));
    beforeEach(function() {
        var today;
        $controller("weeklyReview", { $scope: $scope });
        today = new Date();
        activeReview = {
	    id: 1,
            finalized: today,
        };
        pendingReview = {
	    id: 2,
            finalized: null,
        };
        // $httpBackend.whenGET("/gtd/weeklyreviews?finalized=null&is_active=true").respond(
        //     [activeReview, pendingReview]);
	$httpBackend.whenGET("/gtd/weeklyreviews/openreview/")
	    .respond(pendingReview);
	$httpBackend.whenGET("/gtd/weeklyreviews/activereview/")
	    .respond(activeReview);
	$httpBackend.whenGET("/gtd/weeklyreviews/2/nodes")
	    .respond([]);
        $templateCache.put("/static/project-outline.html", "");
    });
    it("parses the review objects into open and closed reviews", function() {
        $rootScope.$digest();
        $httpBackend.flush();
	expect($scope.activeReview.obj.id).toEqual(activeReview.id);
        expect($scope.openReview.obj.id).toEqual(pendingReview.id);
    });
});
