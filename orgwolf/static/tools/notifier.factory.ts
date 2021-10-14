"use strict";

import {module as ngModule} from "angular";
import { Notyf } from "notyf";

ngModule('orgwolf.tools')
    .factory('owNotifier', owNotifier);

owNotifier.$inject = [];

function owNotifier() {
    /**
     * A service that lets us display feedback messages to the user.
     * It has functions for the various types of messages that we
     * could display:
     *   
     *   - success(message)
     *   - info(message)
     *   - warning(message)
     *   - error(message)
     */
    const notyf = new Notyf();
    return {
	success: function(message) {
	    console.log("Success: " + message);
	    notyf.success(message);
	},
	info: function(message) {
	    console.log("Info: " + message);
	    notyf.success(message);
	},
	warning: function(message) {
	    console.log("Warning: " + message);
	    notyf.error(message);
	},
	error: function(message) {
	    console.log("Error: " + message);
	    notyf.error(message);
	},
    };
}
