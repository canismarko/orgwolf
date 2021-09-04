"use strict";

import { module as $module } from "angular";

$module("orgwolf.gtd")
    .factory('Heading', Heading);

Heading.$inject = ['$http', '$resource', 'toaster'];


function Heading($http, $resource, toaster) {
    /*************************************************
     * Factory creates GtdHeading objects
     *
     **************************************************/
    var toastOnly, res;
    // Interceptors for manipulating the responses
    toastOnly = {
        'response': function(response) {
            // Announce a successful save
            toaster.pop('success', 'Saved');
            return response;
        },
        'responseError': function(reason) {
            toaster.pop('error', "Error, not saved!",
                "Check your internet connection and try again");
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
            'update': { method: 'PUT', interceptor: toastOnly },
            'create': { method: 'POST', interceptor: toastOnly },
        }
    );
    return res;
}
