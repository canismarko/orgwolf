"use strict";

import { module as ngModule } from "angular";

import "./gtd-object.factory.js";

ngModule("orgwolf.gtd")
    .factory('locations', locations);


locations.$inject = ['GtdObject'];


function locations(GtdObject) {
    return GtdObject('/gtd/locations', {});
}
