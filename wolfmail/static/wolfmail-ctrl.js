/*globals document, $, jQuery*/
"use strict";

/*************************************************
* Factor that creates a message object
*
**************************************************/
gtd_module.factory('MessageAPI', ['$resource', '$http', MessageFactory]);
function MessageFactory($resource, $http) {
    var res = $resource(
	'/wolfmail/message/:id', {id: '@id'},
	{
	    'query': {
		method: 'GET',
		transformResponse: $http.defaults.transformResponse.concat([
		    function (data, headersGetter) {
			var i, new_message;
			for ( i=0; i<data.length; i+=1 ) {
			    new_message = new Message(data[i]);
			    data[i] = new_message;
			}
			return data;
		    }
		]),
		isArray: true
	    },
	}
    );
    return res;
}

/*************************************************
* Directive sets the parameters of next
* actions table row
**************************************************/
gtd_module.directive('owMessageRow', function() {
    function link(scope, element, attrs) {
	var $element = $(element);
	$element.find('.glyphicon').tooltip();
    }
    return {
	link: link,
    };
});

/*************************************************
* Angular inbox controller
*
**************************************************/
gtd_module.controller(
    'owInbox', function($scope, $resource, MessageAPI) {
	var ds, today;
	// Date for this inbox allows user to see future dfrd msgs
	today = new Date();
	$scope.current_date = today;
	ds = today.getFullYear() + '-' + (today.getMonth() + 1);
	ds += '-' + today.getDate() + 'T23:59:59Z';
	console.log(ds);
	$scope.messages = MessageAPI.query(
	    {in_inbox: true,
	     rcvd_date__lte: ds}
	);
    }
);
