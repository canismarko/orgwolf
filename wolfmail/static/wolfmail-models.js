/*globals $, jQuery*/
"use strict";
var Message;

/*************************************************
* Message object definition
*
**************************************************/
Message = function(obj) {
    if ( obj === undefined ) {
	obj = {};
    }
    this.fields = {};
    this.set_fields(obj);
};

Message.prototype.set_fields = function(obj) {
    $.extend(this.fields, obj);
    this.pk = obj.id;
    this.url = '/wolfmail/message/' + this.pk + '/';
};

Message.prototype.create_node = function(obj) {
    var that, success, data;
    that = this;
    success = function() {
	obj.list.remove(that);
    };
    // Prepare the ajax payload
    data = {action: 'create_node'};
    $.extend(data, obj);
    delete data.list;
    delete data.$scope;
    jQuery.ajax(this.url, {
	type: 'PUT',
	data: data,
	success: function() {
	    // Determine whether to call $scope.$apply() to refresh models
	    if (typeof obj.$scope !== 'undefined' ) {
		obj.$scope.$apply(success());
	    } else {
		success();
	    }
	}
    });
};

Message.prototype.defer = function(args) {
    // Re-schedule this message for later on
    // If obj is a string, assume it's the new date. If it's an object then pass
    // it should be of the form
    // { by: 3, unit: 'd' } (by 3 days)
    var data = {action: 'defer'};
    // Set JSON data
    if ( typeof args === 'string' ) {
	data.to = args;
    } else {
	data.by = args.by;
	data.unit = args.unit;
    }
    jQuery.ajax(this.url, {
	type: 'PUT',
	data: data
    });
};

Message.prototype.delete_msg = function(obj) {
    // Delete the message in the database
    var success, that;
    that = this;
    success = function() {
	obj.list.remove(that);
    };
    jQuery.ajax(this.url, {
	type: 'DELETE',
	data: {'action': 'delete'},
	success: function() {
	    // Determine whether to call $scope.$apply() to refresh models
	    if (typeof obj.$scope !== 'undefined' ) {
		obj.$scope.$apply(success());
	    } else {
		success();
	    }
	}
    });
};
