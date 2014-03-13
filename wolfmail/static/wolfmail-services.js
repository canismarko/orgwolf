/*globals owMain, Message, owServices, angular*/
"use strict";
var MessageFactory;

/*************************************************
* Message object represents a mail item,
* DFRD node, quick-capture item, etc.
*
**************************************************/
owServices.factory('Message', ['$resource', '$rootScope', MessageFactory]);
function MessageFactory($resource, $rootScope) {
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
	    }
	}
    );
    return res;
}
