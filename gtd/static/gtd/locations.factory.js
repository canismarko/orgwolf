"use strict";

import "angular";

import "./gtd-object.factory.js";

angular.module("orgwolf.gtd")
    .factory('locations', locations);


locations.$inject = ['GtdObject'];


function locations(GtdObject) {
    return GtdObject('/gtd/locations', {});
}
