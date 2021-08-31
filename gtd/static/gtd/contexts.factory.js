"use strict";

import "angular";

import "./gtd-object.factory.js";

angular.module("orgwolf.gtd")
    .factory('contexts', contexts);


contexts.$inject = ['GtdObject'];


function contexts(GtdObject) {
    /*************************************************
     * Factory returns all the available
     * Context objects
     *
     **************************************************/
    return GtdObject('/gtd/contexts', {is_visible: true});
}
