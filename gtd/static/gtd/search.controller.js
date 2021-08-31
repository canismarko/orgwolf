"use strict";

import 'angular';

angular.module('orgwolf.gtd')
    .controller('search', search);


search.$inject = ['$scope', '$location', 'Heading'];


function search($scope, $location, Heading) {
    /*************************************************
     * Search controller
     *
     **************************************************/
    var i, query, resultIds, result, reString, addToResults;
    $scope.rawResults = [];
    // Process search string into seperate queries
    $scope.queryString = $location.search().q.replace("+", " ");
    $scope.queries = $scope.queryString.split(" ");
    addToResults = function(r) {
	$scope.rawResults = $scope.results.concat(r);
    };
    for (i=0; i<$scope.queries.length; i+=1) {
	query = $scope.queries[i];
	// Fetch query results and combine into one array
	Heading.query({'title__contains': query}).$promise.then(addToResults);
	Heading.query({'text__contains': query}).$promise.then(addToResults);
    }
    // Deduplicate results
    $scope.$watchCollection('rawResults', function() {
	resultIds = [];
	$scope.results = [];
	for (i=0; i<$scope.rawResults.length; i+=1) {
	    result = $scope.rawResults[i];
	    if (resultIds.indexOf(result.id) === -1) {
		// First instance of this result so save it
		$scope.results.push(result);
		resultIds.push(result.id);
	    }
	}
    });
    // Prepare a regular expression of query string for highlighting text
    reString = '';
    for (i=0; i<$scope.queries.length; i+=1) {
	reString += "|" + $scope.queries[i];
    }
    if ($scope.queries.length > 0) {
	// Remove leading | character
	reString = reString.slice(1);
    }
    $scope.reString = reString;
}
