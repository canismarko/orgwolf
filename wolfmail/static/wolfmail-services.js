/*globals angular*/
"use strict";

angular.module('owServices')

/*************************************************
* Message object represents a mail item,
* DFRD node, quick-capture item, etc.
*
**************************************************/
.factory('Message', ['$resource', '$rootScope', function($resource, $rootScope) {
    var res = $resource(
	'/wolfmail/message/:id', {id: '@id'},
	{
	    'archive': {
		method: 'PUT',
		params: {action: 'archive'},
		transformResponse: function(data) {
		    data = angular.fromJson(data);
		    $rootScope.$broadcast('message-archived', data.message);
		    return data.message;
		}
	    },
	    'createNode': {
		method: 'POST',
		params: {action: 'create_heading'},
		transformResponse: function(data) {
		    data = angular.fromJson(data);
		    $rootScope.$broadcast('heading-created',
					  data.message,
					  data.heading);
		    return data.message;
		}
	    },
	    'defer': {
		method: 'PUT',
		params: {action: 'defer'},
		transformResponse: function(data) {
		    data = angular.fromJson(data);
		    $rootScope.$broadcast('message-deferred', data.message);
		    return data.message;
		}
	    },
	}
    );
    return res;
}]);
