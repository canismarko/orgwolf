var msg1 = {
    "id": 1,
    "subject": "Deferred item 1",
    "sender": "",
    "recipient": "",
    "owner": 1,
    "unread": true,
    "handler_path": "plugins.deferred",
    "in_inbox": true,
    "rcvd_date": "2013-12-15T22:05:27Z",
    "message_text": "",
    "source_node": null,
    "spawned_nodes": []
};

module('Message model', {
    setup: function() {
	scope = {};
	scope.messages = [];
	scope.messages.push(new Message(msg1));
    }
});

test('set_fields() method', function() {
    var message = new Message();
    message.set_fields(msg1);
    equal(
	message.pk,
	msg1.id,
	'Primary key set'
    );
    equal(
	message.fields.subject,
	msg1.subject,
	'fields.subject set'
    );
    // Sets URL based on primary key
    equal(
	message.url,
	'/wolfmail/message/' + msg1.id + '/',
	'this.url set correctly'
    );
});

asyncTest('create_node() method', function() {
    expect(2);
    var msg = scope.messages.get({pk: 1});
    // Actual tests live in the mocked AJAX callback
    var mock_id = $.mockjax({
	url: '/wolfmail/message/1/',
	type: 'put',
	responseTime: 0,
	response: function(e) {
	    start();
	    equal(
		e.data.action,
		'create_node',
		'action sent as \'create_node\''
	    );
	    equal(
		e.data.title,
		'meet David at the ski hill',
		'title sent via JSON'
	    );
	}
    });
    msg.create_node('meet David at the ski hill');
    $.mockjaxClear(mock_id);
});

asyncTest('create_project() method', function() {
    expect(2);
    var msg = scope.messages.get({pk: 1});
    // Actual tests live in the mocked AJAX callback
    var mock_id = $.mockjax({
	url: '/wolfmail/message/1/',
	type: 'put',
	responseTime: 0,
	response: function(e) {
	    start();
	    equal(
		e.data.action,
		'create_project'
	    );
	    equal(
		e.data.title,
		'Skiing',
		'title sent as JSON'
	    );
	}
    });
    msg.create_project('Skiing');
    $.mockjaxClear(mock_id);
});

asyncTest('defer() method', function() {
    expect(5);
    var msg = scope.messages.get({pk: 1});
    // First test passing just a string
    var mock_id = $.mockjax({
	url: '/wolfmail/message/1/',
	type: 'put',
	responseTime: 0,
	response: function(e) {
	    start();
	    equal(
		e.data.action,
		'defer',
		'action sent as JSON'
	    );
	    equal(
		e.data.to,
		'2013-11-13'
	    );
	    stop();
	}
    });
    msg.defer('2013-11-13');
    $.mockjaxClear(mock_id);
    // The test passing a number and unit
        var mock_id = $.mockjax({
	url: '/wolfmail/message/1/',
	type: 'put',
	responseTime: 0,
	response: function(e) {
	    start();
	    equal(
		e.data.action,
		'defer',
		'action sent as JSON'
	    );
	    equal(
		e.data.by,
		'3'
	    );
	    equal(
		e.data.unit,
		'd'
	    );
	}
    });
    msg.defer({by: 3, unit: 'd'});
    $.mockjaxClear(mock_id);
});