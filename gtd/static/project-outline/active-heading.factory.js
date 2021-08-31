"use strict";

angular.module("orgwolf.projectOutline")
    .factory('activeHeading', activeHeading);


activeHeading.$inject = ['Heading'];


function activeHeading(Heading) {
    /*************************************************
     * Holds the currently accessed Heading, for example
     * when the user visits /gtd/projects/#1-work-project
     *
     **************************************************/
    var HeadingObj;
    HeadingObj = {
	id: 0,
	obj: null
    };
    HeadingObj.activate = function (HeadingId, requestData) {
	var data;
	this.id = parseInt(HeadingId, 10) || 0;
	if (this.id) {
	    data = angular.extend({}, {id: this.id}, requestData);
	    this.obj = Heading.get(data);
	} else {
	    this.obj = null;
	}
    };
    HeadingObj.ifActive = function(callback) {
	if (this.obj) {
	    this.obj.$promise.then(callback);
	}
    };
    return HeadingObj;
}
