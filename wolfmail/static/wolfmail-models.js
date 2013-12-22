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
}

Message.prototype.set_fields = function(obj) {
    $.extend(this.fields, obj);
    this.pk = obj.id
    this.url = '/wolfmail/message/' + this.pk + '/';
};

Message.prototype.create_node = function(title) {
    jQuery.ajax(this.url, {
	type: 'PUT',
	data: {action: 'create_node',
	       title: title},
    });
};

Message.prototype.create_project = function(title) {
    jQuery.ajax(this.url, {
	type: 'PUT',
	data: {action: 'create_project',
	       title: title}
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
}
