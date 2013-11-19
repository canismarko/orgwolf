/*globals $, jQuery, document, Aloha, window, alert, GtdHeading, HeadingManager, test, equal, throws, deepEqual, strictEqual, notEqual, start, stop, asyncTest, ok */
"use strict";

// Hold unit tests for the hierarchical expanding project outline view.
// Implementation held in orgwolf.js
var node1, node2, node3, node4, options, i, state, console, getInterface, todo_state_list, heading_manager, scope, module_name;

// Mocked scope for angularjs
todo_state_list = [
    {pk: 0,
     display: '[None]'},
    {pk: 1,
     display: 'NEXT',
     full: 'Next Action'},
    {pk: 2,
     display: 'DONE',
     full: 'Completed'},
];
heading_manager = new HeadingManager();
scope = {
    todo_states: todo_state_list,
};

// Constants and setup
node1 = {
    pk: 1,
    workspace: scope,
    fields: {
	title: 'test_title',
	lft: 1,
	rght: 2,
	tree_id: 1,
    }
};
node2 = {
    pk: 2,
    workspace: scope,
    fields: {
	title: 'Another test title',
	text: 'here\'s some text that goes with it',
	lft: 1,
	rght: 6,
	todo_state: 1,
	tag_string: ':comp:',
	scope: [1, 2],
	archived: false,
	related_projects: [],
	tree_id: 2,
    }
};
node3 = {
    pk: 3,
    workspace: scope,
    model: 'gtd.node',
    fields: {
	rght: 3,
	text: 'hello, world',
	energy: null,
	assigned: null,
	lft: 2,
	deadline: '2011-05-13T08:00:00Z',
	owner: 1,
	archived: true,
	opened: '2012-11-17T11:10:39.658Z',
	title: 'it\'s all falling down',
	time_needed: null,
	priority: 'B',
	closed: '2012-12-28T04:00:00.101Z',
	tree_id: 2,
	todo_state: 1,
	scope: [1, 2],
	tag_string: ':work:',
	deadline_time_specific: false,
	scheduled: '2012-12-31T10:00:00Z',
	users: [],
	parent: 2,
	repeating_unit: 'w',
	related_projects: [11, 25, 12],
	level: 1,
	scheduled_time_specific: true,
	repeats_from_completion: true,
	repeating_number: 3,
	repeats: true
    }
};
node4 = {
    pk: 4,
    workspace: scope,
    model: 'gtd.node',
    fields: {
	rght: 5,
	text: 'have a nice day',
	energy: null,
	assigned: null,
	lft: 4,
	deadline: '2011-05-13T08:00:00Z',
	owner: 1,
	archived: true,
	opened: '2012-11-17T11:10:39.658Z',
	title: 'it\'s all falling down',
	time_needed: null,
	priority: 'B',
	closed: '2012-12-28T04:00:00.101Z',
	tree_id: 2,
	todo_state: 1,
	scope: [1, 2],
	tag_string: ':work:',
	deadline_time_specific: false,
	scheduled: '2012-12-31T10:00:00Z',
	users: [],
	parent: 2,
	repeating_unit: 'w',
	related_projects: [11, 25, 12],
	level: 1,
	scheduled_time_specific: true,
	repeats_from_completion: true,
	repeating_number: 3,
	repeats: true
    }
};
var bad_parent_dict = {
    pk: 1,
    fields: {
	title: 'test title',
	text: 'here\'s some text that goes with it',
	lft: 14,
	rght: 15,
	todo_state: '1',
	parent: 1,
	tag_string: ':comp:',
	scope: [1, 2]
    }
};
var archived_dict = {
    title: 'test_title',
    text: 'here\' some text that goes with it',
    pk: '1',
    todo_id: '1',
    tags: ':comp:',
    archived: true,
};
var second_dict = {
    title: 'maybe get some food',
    pk: '5',
    todo_id: '2',
};

var scopes = [
    {"pk": 1, "model": "gtd.scope",
     "fields": {
	 "owner": null,
	 "public": false,
	 "name": "joe_corp",
	 "display": "joe_corp"
     }
    },
    {"pk": 2, "model": "gtd.scope",
     "fields": {
	 "owner": null,
	 "public": false,
	 "name": "Kalsec",
	 "display": "Kalsec"
     }
    }
];

var ajax_timer = 20; // how long fake ajax request takes (in milliseconds)

// Setup fake AJAX responses
$.mockjax({
    url: '/gtd/node/descendants/5/',
    responseTime: ajax_timer,
    responseText: []
});
$.mockjax({
    url: '/gtd/node/descendants/1/',
    responseTime: ajax_timer,
    responseText: [
	{
	    pk: 9,
	    fields: {
		parent: 1,
		tree_id: 1,
		lft: 6,
		rght: 7,
		level: 1
	    }
	},
	{
	    pk: 10,
	    fields: {
		parent: 1,
		tree_id: 1,
		lft: 8,
		rght: 9,
		level: 1
	    }
	}
    ]
});
$.mockjax({
    url: '/gtd/node/descendants/2/',
    responseTime: ajax_timer,
    responseText: []
});
$.mockjax({
    url: '/gtd/node/descendants/3/',
    responseTime: ajax_timer,
    responseText: []
});
$.mockjax({
    url: '/gtd/node/descendants/4/',
    responseTime: ajax_timer,
    responseText: [
	{
	    pk: 11,
	    fields: {
		parent: 4,
		archived: true
	    }
	}
    ]
});


module('GtdHeading model', {
    setup: function() {
	var heading;
	// Refresh headings for next test
	scope.headings = new HeadingManager(scope);
	scope.headings.add(new GtdHeading(node1));
	scope.headings.add(new GtdHeading(node2));
	scope.headings.add(new GtdHeading(node3));
	scope.headings.add(new GtdHeading(node4));
    },
    teardown: function() {
    }
});

test('constructor', function() {
    // The constructor should set defaults if no fields are passed
    var heading = new GtdHeading();
    equal(
	heading.pk,
	0,
	'Primary key defaults to zero'
    );
    throws(
	function() {
	    heading = new GtdHeading(bad_parent_dict);
	},
	'Trying to create a node with itself as a parent fails'
    );
});

test('set_fields() method', function() {
    var heading = new GtdHeading();
    heading.set_fields(node2);
    equal(
	heading.pk,
	node2.pk,
	'sets primary key'
    );
    equal(
	heading.fields.scope,
	node2.fields.scope,
	'Scope set'
    );
    deepEqual(
	heading.fields,
	node2.fields,
	'Fields objects set'
    );
});

test('update() method', function() {
    var heading1, heading2;
    // Test ability to self-update template properties
    heading1 = scope.headings.get({pk: 1});
    // See if populating the object induces updating the expandable property
    heading1.populated = true;
    heading1.update();
    equal(
	heading1.expandable,
	'no',
	'Populated heading with no children or text is not expandable'
    );
    // Check the expandable property if the heading has text
    heading2 = scope.headings.get({pk: 2});
    heading2.update();
    equal(
	heading2.expandable,
	'yes',
	'Heading with text is expandable'
    );
    equal(
	heading1.children.length,
	0,
	'Heading 1 starts out without children'
    );
    heading2.move_to(heading1);
    heading1.update();
    equal(
	heading1.children.length,
	1,
	'heading.children updated on update()'
    );
});

test('is_visible() method', function() {
    var heading, parent, child;
    heading = scope.headings.get({pk: 1});
    ok(
	heading.is_visible(),
	'heading is visible by default'
    );
    heading.fields.archived = true;
    ok(
	! heading.is_visible(),
	'archived heading is not visible'
    );
    scope.show_arx = true;
    ok(
	heading.is_visible(),
	'archived heading is visible when scope.show_all is true'
    );
    scope.active_scope = 1;
    ok(
	! heading.is_visible(),
	'heading is not visible if not in active scope'
    );
    delete scope.active_scope;
    scope.active_states = [1];
    ok(
	! heading.is_visible(),
	'heading is not visible if its todo_state is not active'
    );
    delete scope.active_states;
    // Heading is not visible if parent is not open
    parent = scope.headings.get({pk: 2});
    child = scope.headings.get({pk: 3});
    parent.state = 'closed';
    ok(
	! child.is_visible(),
	'child with open parent is visible'
    );
    heading.pk = -1;
    ok(
	! heading.is_visible(),
	'heading with pk=-1 is not visible'
    );
});

test('MPTT: is_leaf_node', function() {
    // Test various methods related to hierarchical configuration.
    // Uses mptt principles
    var heading;
    heading = scope.headings.get({pk: 1});
    equal(
	heading.fields.lft,
	node1.fields.lft,
	'GtdHeading.lft set correctly'
    );
    equal(
	heading.fields.rght,
	node1.fields.rght,
	'GtdHeading.rght set correctly'
    );
    strictEqual(
	heading.is_leaf_node(),
	true,
	'GtdHeading.is_leaf_node() returns true if lft/rght indicate no child'
    );
    // Pretend there's a child and check again
    heading.fields.rght = heading.fields.rght+2;
    strictEqual(
	heading.is_leaf_node(),
	false,
	'GtdHeading.is_leaf_node() returns false if lft/rght indicate a child'
    );
    // Delete heading.rght and chack again
    delete heading.fields.rght;
    equal(
	heading.is_leaf_node(),
	undefined,
	'GtdHeading.is_leaf_node() returns undefined if rght is missing'
    );
});

test('MPTT move_to method (first-child)', function() {
    var parent, first_child;
    parent = scope.headings.get({pk: 1});
    first_child = scope.headings.get({pk: 2});
    equal(
	parent.get_children().length,
	0,
	'first_child has no children to start'
    );
    // Add one child to the parent
    first_child.move_to(
	parent,
	{ position: 'first-child' }
    );
    equal(
	first_child.fields.parent,
	parent.pk,
	'first_child has parent set after calling move_to()'
    );
    equal(
	parent.get_children().length,
	1,
	'first_child has one child after new_heading called move_to()'
    );
    equal(
	first_child.fields.lft,
	parent.fields.lft + 1,
	'first_child.lft is one more than parent.lft'
    );
    equal(
	first_child.fields.rght,
	parent.fields.rght - 1,
	'first_child.rght is one less than parent.rght'
    );
    equal(
	first_child.rank,
	parent.rank + 1,
	'first_child.rank is one more than parent.rank'
    );
    // Make sure setting a child to itself fails
    equal(
	first_child.move_to(first_child, { position: 'first-child' }),
	false,
	'Moving a node as a child of itself returns false'
    );
});

test('MPTT move_to method (other positions)', function() {
    var parent, first_child, second_child;
    parent = scope.headings.get({pk: 1});
    first_child = scope.headings.get({pk: 2});
    second_child = scope.headings.get({pk: 3});
    equal(
	parent.get_children().length,
	0,
	'Parent has only one child to start'
    );
    // Add one child to the parent
    first_child.move_to(
	parent,
	{ position: 'first-child' }
    );
    equal(
	parent.get_children().length,
	1,
	'Parent has only one child to start'
    );
    // Check 'last-child' position
    second_child.move_to( parent, {position: 'last-child'} );
    deepEqual(
	[ second_child.fields.lft, second_child.fields.rght ],
	[ first_child.fields.rght + 1, parent.fields.rght - 1],
	'Adding as last-child sets lft and rght correctly'
    );
    // Check 'left' position
    second_child.move_to( first_child, {position: 'left'} );
    deepEqual(
	[ second_child.fields.lft, second_child.fields.rght ],
	[ parent.fields.lft + 1, first_child.fields.lft - 1],
	'Adding to position \'left\' sets lft and rght correctly'
    );
    // Check 'right' position
    second_child.move_to( first_child, {position: 'right'} );
    deepEqual(
	[ second_child.fields.lft, second_child.fields.rght ],
	[ first_child.fields.rght + 1, parent.fields.rght - 1],
	'Adding to position \'right\' sets lft and rght correctly'
    );
});

test('MPTT move_to method (invalid conditions)', function() {
    // Test what happens when a child becomes its own parent, etc...
    var parent, first_child, second_child;
    parent = scope.headings.get({pk: 1});
    first_child = scope.headings.get({pk: 2});
    second_child = scope.headings.get({pk: 4});
    first_child.move_to( parent, { position: 'first-child' } );
    // Check what happens with a gibberish position argument
    equal(
	second_child.move_to( parent, {position: 'gibberish'} ),
	false,
	'Using an invalid position argument returns false'
    );
    equal(
	parent.get_children().length,
	1,
	'Using an invalid position argument does not add the child'
    );
    // Make sure setting a child to itself fails
    equal(
	first_child.move_to(first_child, { position: 'first-child' }),
	false,
	'Moving a node as a child of itself returns false'
    );
    // Make sure fails if target is a child of node
    equal(
	parent.move_to( first_child, { position: 'left' }),
	false,
	'Moving a node to the left of a child returns false'
    );
});

test( 'MPTT rebuild() method', function() {
    var heading1, heading2, children;
    heading1 = scope.headings.get( {pk: 1} );
    heading2 = scope.headings.get( {pk: 4} );
    heading2.fields.parent = heading1.pk;
    heading1.update();
    heading2.update();
    children = heading1.get_children();
    heading1.rebuild();
    equal(
	heading1.fields.lft,
	1,
	'heading1.lft set to 1'
    );
    equal(
	heading1.fields.rght,
	children.length * 2 + 2,
	'heading1.rght set to ' + (children.length * 2 + 2)
    );
    deepEqual(
	[children[0].fields.lft, children[0].fields.rght],
	[2, 3],
	'first child has lft of 2 and rght of 3'
    );
    start();
});

test('MPTT get_previous_sibling', function() {
    var heading1, heading2, heading3, heading4;
    heading1 = scope.headings.get({pk: 1});
    heading2 = scope.headings.get({pk: 2});
    heading3 = scope.headings.get({pk: 3});
    heading4 = scope.headings.get({pk: 4});
    // Check get_previous_sibling() of non-root nodes
    equal(
	heading4.get_previous_sibling().pk,
	heading3.pk,
	'Retrieved previous sibling of non-root node'
    );
    equal(
	heading3.get_previous_sibling(),
	null,
	'First non-root node get_previous_sibling() returns null'
    );
    // Check get_previous_sibling() of level root nodes
    equal(
	heading2.get_previous_sibling(),
	null,
	'Retrieved previous sibling of root node'
    );
});

test('Headings manager get method', function() {
    var heading;
    heading = scope.headings.get({pk: 2});
    equal(
	typeof heading,
	'object',
	'get() method returns an object'
    );
    equal(
	heading.pk,
	2,
	'get() returns heading with correct primary key'
    );
    equal(
	scope.headings.get({pk: 99}),
	undefined,
	'get() returns undefined for non-existent nodes'
    );
    heading = scope.headings.get({text: 'other text'});
});

test('Headings manager filter_by method', function() {
    var node3, response, expected, heading, i, r;
    node3 = scope.headings.get({pk: 3});
    response = scope.headings.filter_by({archived: true});
    equal(
	response.workspace,
	scope,
	'filter_by returns array with workspace set'
    );
    equal(
	response[0].pk,
	node3.pk,
	'Filtering returns the one node'
    );
    equal(
	response.get({pk: 998}),
	undefined,
	'Filtering operates by strict comparison'
    );
    // check on array values
    scope.headings.get({pk: 1}).fields.scope = [1, 2];
    expected = [];
    for ( i=0; i<scope.headings.length; i+=1) {
	r = jQuery.inArray(1, scope.headings[i].fields.scope);
	if (r >= 0 ) {
	    expected.push(scope.headings[i]);
	}
    }
    deepEqual(
	scope.headings.filter_by({scope: 1}),
	expected,
	'Filtering by scope'
    );
    // check on filtering by full arrays
    expected = [];
    for ( i = 0; i < scope.headings.length; i+=1 ) {
	heading = scope.headings[i];
	if ( ($(heading.scope).not([]).length === 0 && $([]).not(heading.scope).length === 0) && (heading.rank > 0) && typeof heading.scope !== 'undefined') {
	    expected.push(scope.headings[i]);
	}
    }
    deepEqual(
	scope.headings.filter_by( {scope: []} ),
	expected,
	'Filtering by an array of scopes'
    );
});

test('Headings manager order_by method (pk)', function() {
    var response, i, heading, pk, neighbor, next_pk;
    response = scope.headings.order_by('-pk');
    ok(
	response.length > 1,
	'there are 2 or more headings to test ordering'
    );
    for (i=0; i<(response.length-1); i+=1 ) {
	heading = response[i];
	pk = Number(heading.pk);
	neighbor =response[i+1];
	next_pk = Number(neighbor.pk);
	ok(
	    pk > next_pk,
	    'heading ' + pk + ' in correct ordering'
	);
    }
    equal(
	typeof response.filter_by,
	'function',
	'order_by returns a headings manager to preserve chainability'
    );
});

test('Headings manager order_by method (fields.lft)', function() {
    var response;
    // Set these fields to make ordering unambiguous
    scope.headings[0].fields.lft = 2;
    scope.headings[2].fields.lft = 3;
    ok(
	scope.headings[1].fields.lft < scope.headings[0].fields.lft,
	'headings start out in the wrong order'
    );
    response = scope.headings.order_by('lft');
    equal(
	response[1],
	scope.headings[0],
	'scope.headings[0] is second in ordered list'
    );
});

test('Headings manager order_by method (fields.title)', function() {
    var response, heading1, heading2, heading3;
    heading1 = scope.headings.get({pk: 1});
    heading2 = scope.headings.get({pk: 2});
    heading3 = scope.headings.get({pk: 3});
    // Set properties to ensure predictable sorting
    heading1.fields.title = 'Boy this is great';
    heading2.fields.title = 'And this is great too';
    heading3.fields.title = 'away for the day';
    response = scope.headings.order_by('title');
    equal(
	response[0].pk,
	heading2.pk,
	'Uppercase sorted properly'
    );
    equal(
	response[1].pk,
	heading3.pk,
	'lowercase sorted properly'
    );
});


test('workspace.headings.add() method', function() {
    var heading, heading_new, new_heading, index, old_length;
    heading = scope.headings.get({pk: 1});
    index = scope.headings.indexOf(heading);
    // Remove heading 1
    scope.headings.splice(index, 1);
    equal(
	scope.headings.indexOf(heading),
	-1,
	'heading removed successfully'
    );
    scope.headings.add(heading);
    equal(
	scope.headings.filter_by({pk: 1}).length,
	1,
	'Adding a duplicate heading.pk removes the other heading'
    );
    // Chcek that adding an empty array is a no-op
    old_length = scope.headings.length;
    scope.headings.add([]);
    equal(
	scope.headings.length,
	old_length,
	'HeadingManager is the same length after adding empty array'
    );
});

test('Set todo states', function() {
    var heading;
    // Make sure the system processes todo state properly
    equal(
	scope.todo_states,
	todo_state_list,
	'workspace had todo_states attribute set'
    );
    heading = scope.headings.get({pk: 2});
    equal(
	heading.fields.todo_state,
	1,
	'heading object has todo_id set'
    );
    equal(
	heading.todo_state,
	todo_state_list[1],
	'heading.get_todo_state returns correct todo_state object'
    );
});

test('GtdHeading.has_scope() method', function() {
    var heading;
    heading = scope.headings.get({pk: 1});
    heading.scope = [1];
    ok(
	heading.has_scope(1),
	'has_scope() correctly identifies an active scope'
    );
    strictEqual(
	heading.has_scope(2),
	false,
	'has_scope() correctly rejects an inactive scope'
    );
    ok(
	heading.has_scope(0),
	'has_scope() always identifies scope 0'
    );
    heading.scope = [];
    ok(
	heading.has_scope(-1),
	'has_scope(-1) identifies a node with no scope'
    );
});
