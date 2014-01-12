var scope;

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
    expect(3);
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
	    equal(
		e.data.close,
		true,
		'close attribute sent via JSON'
	    );
	}
    });
    msg.create_node({title: 'meet David at the ski hill',
		     close: true});
    $.mockjaxClear(mock_id);
});

asyncTest('archive() method', function() {
    expect(1);
    var msg = scope.messages.get({pk: 1});
    var mock_id = $.mockjax({
	url: '/wolfmail/message/1/',
	type: 'put',
	responseTime: 0,
	response: function(e) {
	    start();
	    equal(
		e.data.action,
		'archive',
		'action sent as JSON'
	    );
	}
    });
    msg.archive({list: scope.messages});
    $.mockjaxClear(mock_id);
});

asyncTest('defer() method', function() {
    expect(2);
    var msg = scope.messages.get({pk: 1});
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
		e.data.target_date,
		'2013-01-04',
		'new target_date sent as JSON'
	    );
	}
    });
    msg.defer({list: scope.messages,
	      target_date: '2013-01-04'});
    $.mockjaxClear(mock_id);
});

asyncTest('delete() method', function() {
    expect(1);
    var msg = scope.messages.get({pk: 1});
    var mock_id = $.mockjax({
	url: '/wolfmail/message/1/',
	type: 'delete',
	responseTime: 0,
	response: function(e) {
	    start();
	    equal(
		e.data.action,
		'delete',
		'action sent as JSON'
	    );
	}
    });
    msg.delete_msg({list: scope.messages});
    $.mockjaxClear(mock_id);
});
