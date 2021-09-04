"use strict";

import { module as ngModule } from "angular";

import "./gtd-object.factory.js";

ngModule("orgwolf.gtd")
    .factory('contexts', contexts);


contexts.$inject = ['GtdObject'];


function contexts(GtdObject) {
    /*************************************************
     * Factory returns all the available
     * Context objects
     *
     **************************************************/
    return GtdObject('/gtd/contexts', { is_visible: true });
}
