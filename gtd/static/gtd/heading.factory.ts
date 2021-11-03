"use strict";

import { module as $module } from "angular";

$module("orgwolf.gtd")
    .factory('Heading', Heading);

Heading.$inject = ['$http', '$resource', 'owNotifier', '$filter'];


function Heading($http, $resource, owNotifier, $filter) {
    /*************************************************
     * Factory creates GtdHeading objects
     *
     **************************************************/
    var notifyOnly, res, priorityFilter;
    priorityFilter = $filter('priority');
    // Interceptors for manipulating the responses
    notifyOnly = {
        'response': function(response) {
            // Announce a successful save
	    owNotifier.success("Saved");
            return response;
        },
        'responseError': function(reason) {
	    owNotifier.error("Not saved! Check the debug console for more infomation.");
            console.log('Save failed:');
            console.log(reason);
        },
    };
    // Create the actual resource here
    res = $resource(
        '/gtd/nodes/:id/',
        {
            id: '@id',
            field_group: '@field_group'
        },
        {
            'update': { method: 'PUT', interceptor: notifyOnly },
            'create': { method: 'POST', interceptor: notifyOnly },
        }
    );
    res.prototype.priority = function() {
	return priorityFilter(this);
    }
    return res;
}
