/*globals owMain, Message*/
"use strict";
var MessageFactory;

/*************************************************
* Message object represents a mail item,
* DFRD node, quick-capture item, etc.
*
**************************************************/
owMain.factory('MessageAPI', ['$resource', '$http', MessageFactory]);
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
	    'get': {
		method: 'GET',
		transformResponse: $http.defaults.transformResponse.concat([
		    function(data) {
			return new Message(data);
		    }
		])
	    }
	}
    );
    // Attach custom methods to the prototype
    res.prototype.create_node = Message.prototype.create_node;
    res.prototype.delete_msg = Message.prototype.delete_msg;
    res.prototype.archive = Message.prototype.archive;
    res.prototype.defer = Message.prototype.defer;
    return res;
}
