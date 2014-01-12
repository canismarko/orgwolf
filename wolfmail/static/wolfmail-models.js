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
    var that, success, data, scope;
    that = this;
    // Prepare the ajax payload
    data = {action: 'create_node'};
    $.extend(data, obj);
    delete data.$scope;
    jQuery.ajax(this.url, {
	type: 'PUT',
	data: data,
	success: function() {
	    obj.$scope.$apply(obj.$scope.success(that));
	},
    });
};

Message.prototype.delete_msg = function(obj) {
    // Delete the message in the database
    var success, that;
    that = this;
    jQuery.ajax(this.url, {
	type: 'DELETE',
	data: {'action': 'delete'},
	success: function() {
	    obj.$scope.$apply(obj.$scope.success(that));
	}
    });
};

Message.prototype.archive = function(obj) {
    // Delete the message in the database
    var success, that;
    that = this;
    jQuery.ajax(this.url, {
	type: 'PUT',
	data: {'action': 'archive'},
	success: function() {
	    obj.$scope.$apply(obj.$scope.success(that));
	}
    });
};

Message.prototype.defer = function(obj) {
    // Reschedule the message in the database for later
     var success, that;
    that = this;
    jQuery.ajax(this.url, {
	type: 'PUT',
	data: {'action': 'defer',
	       'target_date': obj.target_date},
	success: function() {
	    obj.$scope.$apply(obj.$scope.success(that));
	}
    });
};
