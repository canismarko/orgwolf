// Hold unit tests for the hierarchical expanding project outline view.
// Implementation held in orgwolf.js
var $workspace = $('#test_workspace');
var $fixture = $('#qunit-fixture');

// Fix for bad global variables detection in firefox
var console, getInterface;

// Constants and setup
var sparse_dict = {
    title: 'test_title',
    pk: '1',
};
var full_dict = {
    title: 'test title',
    text: 'here\'s some text that goes with it',
    pk: 1,
    todo_id: '1',
    tag_string: ':comp:',
    is_leaf_node: false,
    scope: [1, 2]
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
var todo_state_list = [
    {pk: 0,
     display: '[None]'},
    {pk: 1,
     display: 'NEXT',
     full: 'Next Action'},
    {pk: 2,
     display: 'DONE',
     full: 'Completed'},
];
var scopes = [
    {"pk": 1, "model": "gtd.scope",
     "fields": {"owner": null, "public": false, "name": "joe_corp", "display": "joe_corp"}
    }, 
    {"pk": 2, "model": "gtd.scope", 
     "fields": {"owner": null, "public": false, "name": "Kalsec", "display": "Kalsec"}
    }
];
var ajax_timer = 20; // how long fake ajax request takes (in milliseconds)
// Setup fake AJAX responses
var node8 = {
    pk: 8,
    title: 'it\'s all falling down',
    title_html: '<span class="archived-text">it\'s all falling down</span>',
    todo_state: 1,
    scheduled_date: '2012-03-27',
    scheduled_time: '15:53:00',
    scheduled_time_specific: true,
    parent_id: 1,
    deadline_date: '2012-03-27',
    deadline_time: '08:00:00',
    deadline_time_specific: true,
    priority: 'B',
    scope: [1, 2],
    repeats: true,
    repeating_number: 3,
    repeating_unit: 'w',
    repeats_from_completion: true,
    archived: true,
    related_projects: [11, 25, 12],
    text: 'hello, world',
    tag_string: ':work:',
    is_leaf_node: true,
};
console.log($);
$.mockjax({
    url: '/gtd/node/1/descendants/',
    responseTime: ajax_timer,
    responseText: {
	status: 'success',
	parent_id: 1,
	nodes: [
	    node8,
	    {
		pk: 9,
		parent_id: 1
	    },
	    {
		pk: 10,
		parent_id: 1
	    }
	]
    }
});
$.mockjax({
    url: '/gtd/node/2/descendants/',
    responseTime: ajax_timer,
    responseText: {
	status: 'success',
	parent_id: 2,
	nodes: []
    }
});
$.mockjax({
    url: '/gtd/node/3/descendants/',
    responseTime: ajax_timer,
    responseText: {
	status: 'success',
	parent_id: 3,
	nodes: []
    }
});
$.mockjax({
    url: '/gtd/node/4/descendants/',
    responseTime: ajax_timer,
    responseText: {
	status: 'success',
	parent_id: 4,
	nodes: [
	    {
		pk: 11,
		parent_id: 4,
		archived: true
	    }
	]
    }
});
$.mockjax({
    url: '/gtd/node/new/',
    responseTime: ajax_timer,
    responseText: '<div class="modal hide fade" id="new-modal">\n  <div class="modal-header">\n    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>\n    <h3 class="header-title">\n      New Node\n      \n    </h3>\n  </div>\n  <form id="edit-form" action="/index.html" method="POST">\n    <div class="modal-body">\n      <table>\n<tr class="required"><th><label for="id_title">Title:</label></th><td><input autofocus="autofocus" data-validate="required" id="id_title" name="title" type="text" /></td></tr>\n<tr><th><label for="id_todo_state">Todo state:</label></th><td><select id="id_todo_state" name="todo_state">\n<option value="" selected="selected">---------</option>\n<option value="8"><strong>HARD</strong> - Hard Scheduled</option>\n<option value="9"><strong>SPED</strong> - Supersonic</option>\n<option value="10"><strong>BORE</strong> - Something boring to do</option>\n<option value="1"><strong>NEXT</strong> - Next Action</option>\n<option value="2"><strong>ACTN</strong> - Future Action</option>\n<option value="3">DONE - Completed</option>\n<option value="4"><strong>SMDY</strong> - Someday Maybe</option>\n<option value="5"><strong>DFRD</strong> - Deferred</option>\n<option value="6">WAIT - Waiting For</option>\n<option value="7"><span style="color: rgba(0, 51, 204, 1.0)">CNCL</span> - Cancelled</option>\n</select></td></tr>\n<tr><th><label for="id_scheduled_date">Scheduled date:</label></th><td><input class="datepicker" data-validate="date" id="id_scheduled_date" name="scheduled_date" type="text" /></td></tr>\n<tr><th><label for="id_scheduled_time">Scheduled time:</label></th><td><input class="timepicker" data-validate="time" id="id_scheduled_time" name="scheduled_time" type="text" /></td></tr>\n<tr><th><label for="id_scheduled_time_specific">Scheduled time specific:</label></th><td><input data-requires="#id_scheduled_date, #id_scheduled_time" id="id_scheduled_time_specific" name="scheduled_time_specific" toggles="scheduled_time" type="checkbox" /></td></tr>\n<tr><th><label for="id_deadline_date">Deadline date:</label></th><td><input class="datepicker" id="id_deadline_date" name="deadline_date" type="text" /></td></tr>\n<tr><th><label for="id_deadline_time">Deadline time:</label></th><td><input class="timepicker" id="id_deadline_time" name="deadline_time" type="text" /></td></tr>\n<tr><th><label for="id_deadline_time_specific">Deadline time specific:</label></th><td><input data-requires="#id_deadline_date, #id_deadline_time" id="id_deadline_time_specific" name="deadline_time_specific" toggles="deadline_time" type="checkbox" /></td></tr>\n<tr><th><label for="id_priority">Priority:</label></th><td><select id="id_priority" name="priority">\n<option value="" selected="selected">---------</option>\n<option value="A">A</option>\n<option value="B">B</option>\n<option value="C">C</option>\n</select></td></tr>\n<tr><th><label for="id_scope">Scope:</label></th><td><select multiple="multiple" id="id_scope" name="scope">\n<option value="1">joe_corp</option>\n<option value="2">Kalsec</option>\n</select><br /><span class="helptext"> Hold down "Control", or "Command" on a Mac, to select more than one.</span></td></tr>\n<tr><th><label for="id_repeats">Repeats:</label></th><td><input data-requires="#id_repeating_number, #id_repeating_unit" id="id_repeats" name="repeats" type="checkbox" /></td></tr>\n<tr><th><label for="id_repeating_number">Repeating number:</label></th><td><input data-validate="int" id="id_repeating_number" name="repeating_number" type="text" /></td></tr>\n<tr><th><label for="id_repeating_unit">Repeating unit:</label></th><td><select id="id_repeating_unit" name="repeating_unit">\n<option value="" selected="selected">---------</option>\n<option value="d">Days</option>\n<option value="w">Weeks</option>\n<option value="m">Months</option>\n<option value="y">Years</option>\n</select></td></tr>\n<tr><th><label for="id_repeats_from_completion">Repeats from completion:</label></th><td><select id="id_repeats_from_completion" name="repeats_from_completion">\n<option value="1">Unknown</option>\n<option value="2">Yes</option>\n<option value="3" selected="selected">No</option>\n</select></td></tr>\n<tr><th><label for="id_archived">Archived:</label></th><td><input id="id_archived" name="archived" type="checkbox" /></td></tr>\n<tr><th><label for="id_related_projects">Related projects:</label></th><td><select multiple="multiple" id="id_related_projects" name="related_projects">\n<option value="1">[<strong>NEXT</strong>] Errands</option>\n<option value="11">Hello</option>\n<option value="6">[<strong>NEXT</strong>] Home Node</option>\n<option value="12">Miscellaneous</option>\n<option value="28">Mischief</option>\n<option value="8">[<strong>ACTN</strong>] Ryan node</option>\n<option value="7">[<strong>NEXT</strong>] <span class="archived-text">Work Node</span></option>\n<option value="17">contxt parent</option>\n<option value="23">goodbye, world</option>\n<option value="22">hello, world</option>\n<option value="24">kjoweij</option>\n<option value="25">october</option>\n<option value="14">to the shows</option>\n</select></td></tr>\n<tr><th><label for="id_text">Text:</label></th><td><textarea cols="40" id="id_text" name="text" rows="10">\n</textarea></td></tr>\n<tr><th><label for="id_tag_string">Tag string:</label></th><td><textarea cols="40" id="id_tag_string" name="tag_string" rows="10">\n</textarea><input id="id_scheduled" name="scheduled" type="hidden" /><input id="id_deadline" name="deadline" type="hidden" /></td></tr>\n      </table>\n    </div>\n    <div class="modal-header">\n      <button type="submit" class="btn btn-primary">Save Changes</button>\n      <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>\n      <input type="hidden" name="form" value="modal"></input>\n    </div>\n  </form>\n</div>\n'
});
// mockjax request for /gtd/node/pk/children/ are deprecated
$.mockjax({
    url: '/gtd/node/0/children/',
    responseTime: ajax_timer,
    responseText: {
	status: 'success',
	parent_id: 0,
	children: [
	    {
		pk: 1,
		title: 'Tasks',
		todo_id: 1,
		tags: '',
		text: 'Mostly when I can...',
	    },
	    {
		pk: 2,
		title: 'Expense reports',
		todo_id: 2,
		tags: ':comp:',
		text: '',
	    }
	]
    }
});
$.mockjax({
    url: '/gtd/node/1/children/',
    responseTime: ajax_timer,
    responseText: {
	status: 'success',
	parent_id: 1,
	children: [
	    {
		pk: 3,
		title: 'Buy a puppy',
		todo: 'NEXT',
		tags: ':car:',
		text: 'I should really buy a puppy because they\'re cute',
	    },
	    {
		pk: 4,
		title: 'Pay my taxes',
		todo: 'NEXT',
		tags: '',
		text: '',
		archived: true,
	    }
	]
    }
});
$.mockjax({
    url: '/gtd/node/2/children/',
    responseTime: ajax_timer,
    responseText: {
	status: 'success',
	parent_id: 2,
	children: [
	    {
		pk: 5,
		title: 'Take puppy to the vet',
		archived: true,
		todo: 'NEXT',
		tags: ':car:',
		text: 'I should really neuter my puppy because they\'re cute',
	    }
	]
    }
});
$.mockjax({
    url: '/gtd/node/3/children/',
    responseTime: ajax_timer,
    responseText: {
	status: 'success',
	parent_id: 3,
	children: [
	    {
		pk: 6,
		title: 'tax forms from Kalsec',
		todo: 'WAIT',
		tags: '',
		text: '',
	    }
	]
    }
});
$.mockjax({
    url: '/gtd/node/1/edit/',
    responseTime: ajax_timer,
    responseText: '{"status": "success", "pk": 1, "todo_id": 2}'
});
$.mockjax({
    url: '/gtd/node/5/edit/',
    responseTime: ajax_timer,
    responseText: '{"status": "success", "pk": 5, "todo_id": 0}'
});
// For testing todo buttons plugin
$.mockjax({
    url: '/gtd/node/7/edit/',
    responseTime: ajax_timer,
    responseText: '{"status": "success", "todo_id": 1}'
});
// For testing modal edit dialog
var options = "";
for ( var i = 0; i < todo_state_list.length; i++ ) {
    var state = todo_state_list[i];
    options += '<option value="' + state.pk + '"';
    if ( i == 1 ) {
	options += ' selected';
    }
    options += '>';
    options += state.display + '</option>';
}
$.mockjax({
    url: '/gtd/nodes/6/edit/',
    responseTime: ajax_timer,
    responseText: '<div class="modal hide fade" id="node-edit-modal">\n<div class="modal-body"><select id="id_todo_state">' + options + '</select></div>\n</div>'
});
for ( var i = 0; i < todo_state_list.length; i++ ) {
    var state = todo_state_list[i];
    options += '<option value="' + state.todo_id + '"';
    options += '>';
    options += state.display + '</option>';
}
$.mockjax({
    url: '/gtd/nodes/new/',
    responseTime: ajax_timer,
    responseText: '<div class="modal hide fade" id="node-edit-modal">\n<div class="modal-body"><select id="id_todo_state">' + options + '</select></div>\n</div>'
});



module('GtdHeading prototype');

test('constructor defaults', function() {
    // The constructor should set defaults if no fields are passed
    var heading = new GtdHeading();
    equal(
	heading.pk,
	0,
	'Primary key defaults to zero'
    );
});

test('set_fields() method', function() {
    var heading = new GtdHeading();
    heading.set_fields(full_dict);
    equal(
	heading.pk,
	full_dict.pk,
	'sets primary key'
    );
    strictEqual(
	heading.is_leaf_node,
	undefined,
	'is_leaf_node is not set (defer to has_children)'
    );
    ok(
	heading.has_children,
	'has_children is set based on is_leaf_node'
    );
    equal(
	heading.title_html,
	full_dict.title,
	'if title_html is omitted, title is used instead'
    );
    equal(
	heading.scope,
	full_dict.scope,
	'Scope set'
    );
	  
});



module('nodeOutline jQuery plugin');

test('creates initial heading objects', function() {
    // See if the function finds the existing workspace and sets the right number of children with the right attributes and data
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline();
    var outline = $workspace.data('nodeOutline');
    var set_heading = outline.headings.get( {pk: full_dict.pk} );
    equal(
	set_heading.pk,
	full_dict.pk,
	'Retrieved heading has correct primary key'
    );
    equal(
	set_heading.title,
	full_dict.title,
	'Retrieved heading has correct title'
    );
    equal(
	set_heading.get_todo_state().pk,
	full_dict.todo_id,
	'Retrieved heading has correct todo state'
    );
    equal(
	set_heading.text,
	full_dict.text,
	'Retrieve heading has correct text'
    );
    deepEqual(
	set_heading.workspace,
	outline,
	'heading has outline attribute set'
    );
});

test('converts initial workspace', function() {
    var $workspace = $('#test_workspace');
    var total = $workspace.find('tr.ow-heading').length;
    $workspace.nodeOutline({'simulate': true});
    var workspace = $workspace.data('nodeOutline');
    equal(
	$workspace.find('.children > div.heading').length,
	total,
	'Same number of headings as initial table rows'
    );
    var $heading1 = $workspace.find('.children > div.heading[node_id="1"]');
    equal(
	$heading1.length,
	1,
	'Heading 1 has element'
    );
    ok(
	$heading1.is(':visible'),
	'Heading 1 is visible'
    );
    equal(
	$workspace.find('.children > div.heading[node_id="2"]').length,
	1,
	'Heading 2 has element'
    );
});

asyncTest('set expandability and has-children data', function() {
    // Check that the system handles expandable nodes properly
    // Target behavior is summarized in file project-overview.org
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({simulate: true});
    var workspace = $workspace.data('nodeOutline');
    var heading1 = workspace.headings.get({pk: 1});
    var heading2 = workspace.headings.get({pk: 2});
    var heading3 = workspace.headings.get({pk: 3});
    var heading4 = workspace.headings.get({pk: 4});
    ok(
	heading1.$element.hasClass('expandable'),
	'Text and children causes expandable (prepopulated)'
    );
    ok(
	! heading1.$element.hasClass('lazy-expandable'),
	'Text and children suppresses lazy-expandable (prepopulated)'
    );
    ok(
	heading2.$element.hasClass('expandable'),
	'Text causes expandable (prepopulated)'
    );
    ok(
	! heading3.$element.hasClass('expandable'),
	'No text/children suppresses expandable (prepopulated)'
    );
    ok(
	! heading3.$element.hasClass('lazy-expandable'),
	'No text/children suppresses lazy-expandable (prepopulated)'
    );
    ok(
	heading4.$element.hasClass('lazy-expandable'),
	'Children causes lazy-expandable (prepopulated)'
    );
    ok(
	! heading4.$element.hasClass('expandable'),
	'Children suppresses expandable (prepopulated)'
    );
    // is_expandable() method
    ok(
	heading2.is_expandable(),
	'Heading 2 is_expandable() true before populating'
    );
    ok(
	! heading3.is_expandable(),
	'Heading 3 is_expandable() false before populating'
    );
    ok(
	heading4.is_expandable(),
	'Heading 4 is_expandable() true before populating'
    );
    // Check heading four when show_all is set
    workspace.show_all = true;
    workspace.redraw();
    ok(
	heading4.$element.hasClass('expandable'),
	'Children causes lazy-expandable (prepopulated)'
    )
    workspace.show_all = false;
    workspace.redraw();
    heading4.text = 'test';
    heading4.redraw();
    ok(
	! heading4.$element.hasClass('lazy-expandable'),
	'Adding text removes lazy-expandable (prepopulated)'
    )
    ok(
	heading4.$element.hasClass('expandable'),
	'Adding text causes expandable (prepopulated)'
    )
    // Remove the text in order to hit all scenarios
    heading4.text = '';
    heading1.text = '';
    heading1.toggle();
    heading2.toggle();
    heading3.toggle();
    heading4.toggle();
    setTimeout(function() {
	ok(
	    heading1.populated,
	    'Heading 1 populated'
	);
	ok(
	    heading4.populated,
	    'Heading 4 populated'
	);
	ok(
	    heading4.$element.hasClass('arch-expandable'),
	    'Heading with only archived children causes arch-expandable (post)'
	);
	ok(
	    heading1.$element.hasClass('expandable'),
	    'Heading with un-archived children causes expandable (post)'
	);
	ok(
	    heading1.is_expandable(),
	    'Heading 1 is_expandable() true after populating'
	);
	ok(
	    heading2.is_expandable(),
	    'Heading 2 is_expandable() true after populating'
	);
	ok(
	    ! heading3.is_expandable(),
	    'Heading 3 is_expandable() false after populating'
	);
	ok(
	    ! heading4.is_expandable(),
	    'Heading with only archived children is not expandable'
	);
	start();
    }, ajax_timer);
});

test('heading colors', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline();
    var outline = $workspace.data('nodeOutline');
    var heading = outline.get_heading(1);
    equal(
	heading.color,
	outline.COLORS[0],
	'heading 1 has color attribute set'
    );
});

asyncTest('Creating heading from /gtd/node/pk/descendants/', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline();
    var workspace = $workspace.data('nodeOutline');
    workspace.headings.get({pk: 1}).open();
    var heading2 = workspace.headings.get({pk: 2});
    heading2.pk = 8 // Used to test for replacement of stale nodes
    setTimeout(function() {
	// node8 has full attributes set in mockjax call
	var heading8 = workspace.headings.get({pk: 8});
	equal(
	    heading8.pk,
	    node8.pk,
	    'Heading8 has primary key set'
	);
	equal(
	    heading8.title,
	    node8.title,
	    'Heading8 has title set'
	);
	equal(
	    heading8.$title.html(),
	    heading8.title_html + '\n',
	    'title_html used for display purposes'
	);
	equal(
	    heading8.todo_id,
	    node8.todo_state,
	    'Heading8 has todo_state set'
	);
	equal(
	    heading8.scheduled_date,
	    node8.scheduled_date,
	    'Heading8 has scheduled_date set'
	);
	equal(
	    heading8.scheduled_time,
	    node8.scheduled_time,
	    'Heading8 has scheduled_time set'
	);
	strictEqual(
	    heading8.scheduled_time_specific,
	    node8.scheduled_time_specific,
	    'Heading8 has scheduled_time_specific set'
	);
	equal(
	    heading8.parent_id,
	    node8.parent_id,
	    'Heading8 has parent_id set'
	);
	equal(
	    heading8.deadline_date,
	    node8.deadline_date,
	    'Heading8 has deadline_date set'
	);
	equal(
	    heading8.deadline_time,
	    node8.deadline_time,
	    'Heading8 has deadline_time set'
	);
	strictEqual(
	    heading8.deadline_time_specific,
	    node8.deadline_time_specific,
	    'Heading8 has deadline_time_specific set'
	);
	equal(
	    heading8.priority,
	    node8.priority,
	    'Heading8 has priority set'
	);
	deepEqual(
	    heading8.scope,
	    node8.scope,
	    'Heading8 has scope set'
	);
	strictEqual(
	    heading8.repeats,
	    node8.repeats,
	    'Heading8 has repeats set'
	);
	equal(
	    heading8.repeating_number,
	    node8.repeating_number,
	    'Heading8 has repeating_number set'
	);
	equal(
	    heading8.repeating_unit,
	    node8.repeating_unit,
	    'Heading8 has repeating_unit set'
	);
	strictEqual(
	    heading8.repeats_from_completion,
	    node8.repeats_from_completion,
	    'Heading8 has repeats_from_completion set'
	);
	strictEqual(
	    heading8.archived,
	    node8.archived,
	    'Heading8 has archived set'
	);
	deepEqual(
	    heading8.related_projects,
	    node8.related_projects,
	    'Heading8 has related_projects set'
	);
	equal(
	    heading8.text,
	    node8.text,
	    'Heading8 has text set'
	);
	equal(
	    heading8.tag_string,
	    node8.tag_string,
	    'Heading8 has tag_string set'
	);
	equal(
	    heading8.has_children,
	    ! node8.is_leaf_node,
	    'Heading8 has has_children set based on is_leaf_node'
	);
	start();
    }, ajax_timer * 1);
});

test('get_heading method', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline();
    var outline = $workspace.data('nodeOutline');
    var added_heading = outline.get_heading(1);
    equal(
	added_heading.pk,
	1,
	'Returned heading has correct primary key'
    );
});

test('Headings manager get method', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({'simulate': true});
    var workspace = $workspace.data('nodeOutline');
    var heading = workspace.headings.get({pk: 2});
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
	workspace.headings.get({pk: 99}),
	undefined,
	'get() returns undefined for non-existent nodes'
    );
    heading = workspace.headings.get({text: 'other text'});
});

test('Headings manager filter method', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({'simulate': true});
    var workspace = $workspace.data('nodeOutline');
    var archived_node = {pk: 987,
			 title: 'americorp',
			 archived: true};
    var fake_archived = {pk: 998,
			 title: 'fake',
			 archived: 1};
    workspace.headings.push(archived_node);
    workspace.headings.push(fake_archived);
    var response = workspace.headings.filter({archived: true});
    equal(
	response[0],
	archived_node,
	'Filtering returns the one node'
    );
    equal(
	response.get({pk: 998}),
	undefined,
	'Filtering operates by strict comparison'
    );
    // check on array values
    workspace.headings.get({pk: 1}).scope = [1, 2];
    var expected = [];
    for ( var i in workspace.headings) {
	var r = jQuery.inArray(1, workspace.headings[i].scope);
	if (r >= 0 ) {
	    expected.push(workspace.headings[i]);
	}
    }
    deepEqual(
	workspace.headings.filter({scope: 1}),
	expected,
	'Filtering by scope'
    );
    // check on filtering by full arrays
    var expected = [];
    for ( var i in workspace.headings) {
	var heading = workspace.headings[i];
	if ( ($(heading.scope).not([]).length == 0 && $([]).not(heading.scope).length == 0) && (heading.level > 0) && typeof heading.scope != 'undefined') {
	    expected.push(workspace.headings[i]);
	}
    }
    deepEqual(
	workspace.headings.filter( {scope: []} ),
	expected,
	'Filtering by an array of scopes'
    );
});

test('Headings manager order_by method', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({'simulate': true});
    var workspace = $workspace.data('nodeOutline');
    var response = workspace.headings.order_by('-pk');
    ok(
	response.length > 1,
	'there are 2 or more headings to test ordering'
    );
    for ( var i=0; i<(response.length-1); i++ ) {
	var heading = response[i];
	var pk = Number(heading.pk);
	var neighbor =response[i+1];
	var next_pk = Number(neighbor.pk);
	ok(
	    pk > next_pk,
	    'heading ' + pk + ' in correct ordering'
	);
    }
});

test('Headings are properly drawn on init', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({simulate: true,
			   todo_states: todo_state_list});
    var workspace = $workspace.data('nodeOutline');
    var heading = workspace.headings.get({pk: 1});
    equal(
	heading.$todo_state.html(),
	heading.get_todo_state().display,
	'Element has $todo_state drawn'
    );
    equal(
	heading.$title.html(),
	heading.title,
	'Element has $title set'
    );
});

test('ordering of inserted node', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({simulate: true});
    var workspace = $workspace.data('nodeOutline');
    var heading = workspace.headings.get({pk: 4});
    var previous = workspace.headings.get({pk: 1});
    equal(
	heading.get_previous_sibling(),
	previous,
	'Can retrieve previous sibling'
    );
    equal(
	previous.$element.next('.heading').attr('node_id'),
	heading.pk,
	'heading is placed immediately after its previous sibling'
    );
})

test('heading.redraw() method', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({simulate: true,
			   todo_states: todo_state_list});
    var workspace = $workspace.data('nodeOutline');
    var heading = workspace.headings.get({pk: 1});
    var s = '.heading[node_id="' + heading.pk + '"]';
    equal(
	heading.$todo_state.html(),
	heading.get_todo_state().display,
	'Heading with non-zero status has todo state drawn'
    );
    heading.$element.remove();
    equal(
	$(s).length,
	0,
	'heading is removed'
    );
    workspace.redraw();
    equal(
	$(s).length,
	1,
	'removed heading1 $element regenerated on redraw()'
    );
    heading.$element.length
    heading.$element.attr('data-test-value', '878');
    workspace.redraw();
    equal(
	$(s).attr('data-test-value'),
	'878',
	'Redraw doesn\'t change existing elements'
    );
    heading.todo_id = 2;
    notEqual(
	heading.$todo_state.html(),
	heading.get_todo_state().abbreviation,
	'Heading is not correct prior to being redrawn'
    );
    heading.redraw();
    equal(
	heading.$todo_state.html(),
	heading.get_todo_state().display,
	'Heading is correct after being redrawn'
    );
    heading.todo_id = 0;
    heading.redraw();
    equal(
	heading.$todo_state.html(),
	'',
	'Zero todo-state is redrawn with no display'
    );
	
});

test('workspace.headings.add() method', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({simulate: true});
    var workspace = $workspace.data('nodeOutline');
    var heading = workspace.headings.get({pk: 1});
    var heading_new = workspace.headings.get({pk:1});
    heading_new.pk = 1;
    workspace.headings.add(heading_new);
    equal(
	workspace.headings.filter({pk: 1}).length,
	1,
	'Adding a duplicate heading.pk removes the other heading'
    );
});

asyncTest('Clicking a heading populates it\'s children', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline();
    var workspace = $workspace.data('nodeOutline');
    var heading1 = workspace.headings.get({pk: 1});
    heading1.toggle();
    setTimeout(function() {
	var $heading8 = $workspace.find('.heading[node_id="8"]');
	ok(
	    $heading8.length>0,
	    'Heading 8 element found'
	);
	ok(
	    heading1.populated,
	    'heading 1 has populated attribute set'
	);
	start();
    }, ajax_timer * 4.4 + workspace.ANIM_SPEED * 5);
});

asyncTest('Creates #add-heading button', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline();
    setTimeout(function() {
	start();
	equal(
	    $workspace.find('#add-heading').length,
	    1,
	    'An #add-heading div was added to the end of the list'
	);
	var workspace = $workspace.data('nodeOutline');
    }, ajax_timer * 1.1 + 5);
});

asyncTest('Alternate colors', function() {
    var $workspace = $('#test_workspace');
    var expected_colors = ['blue', 'brown', 'purple', 'red', 'green', 'teal', 'slateblue', 'darkred'];
    $workspace.nodeOutline();
    setTimeout(function() {
	$workspace.children('.children').children('.heading').each(function() {
	    equal(
		$(this).children('.ow-hoverable').children('.clickable').css('color'), 
		'rgb(0, 0, 255)', 
		'Level 1 heading is blue'
	    );
	});
	start();
    }, (ajax_timer * 1.1 + 5));
});

test('Set todo states', function() {
    // Make sure the system processes todo state properly
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({
	todo_states: todo_state_list,
	simulate: true
    });
    var workspace = $workspace.data('nodeOutline');
    equal(
	workspace.todo_states,
	todo_state_list,
	'workspace had todo_states attribute set'
    );
    var heading = workspace.headings.get({pk: 2});
    equal(
	heading.todo_id,
	1,
	'heading object has todo_id set'
    );
    equal(
	heading.get_todo_state(),
	todo_state_list[1],
	'heading.get_todo_state returns correct todo_state object'
    );
    equal(
	heading.$todo_state.html(),
	heading.get_todo_state().display,
	'$todo div has abbreviation as its html'
    );
});

asyncTest('todoState integration', function() {
    // Make sure the todoState plugin handles headings properly
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({
	todo_states: todo_state_list,
	simulate: true
    });
    var workspace = $workspace.data('nodeOutline');
    var heading1 = workspace.headings.get({pk: 1});
    var todo_state = heading1.$todo_state.data('todoState');
    equal(
	todo_state.heading,
	heading1,
	'Heading1 $todo.data(\'todoState\').heading is set'
    );
    equal(
	todo_state.get_todo_id(),
	heading1.todo_id,
	'Heading1 todo object has todo_id set'
    );
    heading1.$todo_state.click();
    var $popover = heading1.$todo_state.next('.popover');
    equal(
	$popover.find('.todo-option[todo_id="'+heading1.todo_id+'"]').attr('selected'),
	'selected',
	'Heading 1 popover has current todo state selected'
    );
    $popover.find('.todo-option[todo_id="2"]').click();
    setTimeout( function() {
	equal(
	    heading1.todo_id,
	    2,
	    'Clicking a todo_option sets heading.todo_id'
	);
	start();
    }, ajax_timer);
})

asyncTest('nodeEdit dialogs', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline();
    var workspace = $workspace.data('nodeOutline');
    var heading1 = workspace.headings.get({pk: 1});
    heading1.open();
    setTimeout(function() {
	equal(
	    workspace.$edit_modal.length,
	    1,
	    'workspace has $edit_modal set'
	);
	// Now check the "edit" dialog
	var heading8 = workspace.headings.get({pk: 8});
	heading8.get_parent().scope = [1];
	var $edit = heading8.$buttons.find('.edit-btn');
	var $add = workspace.$element.find('#add-heading');
	var $new_child = heading8.$buttons.find('.new-btn');
	equal(
	    $edit.length,
	    1,
	    'Edit button found'
	);
	$edit.click();
	equal(
	    $edit.data('nodeEdit').$modal,
	    workspace.$edit_modal,
	    'Edit button uses workspace $edit-modal'
	);
	equal(
	    $edit.data('nodeEdit').edit_url,
	    '/gtd/node/8/edit/',
	    'Edit button uses correct editing url for existing node'
	);
	equal(
	    $edit.data('nodeEdit').heading,
	    heading8,
	    'plugin saves heading if passed'
	);
	equal(
	    workspace.$edit_modal.find('#id_title').val(),
	    heading8.title,
	    'Opening the modal sets the title correctly'
	);
	equal(
	    workspace.$edit_modal.find('.header-title').html(),
	    'Edit "' + heading8.title_html + '"',
	    'Opening the modal sets the header correctly'
	)
	ok(
	    workspace.$edit_modal.find('#id_todo_state').children('option[value="' + heading8.todo_id + '"]').is(':selected'),
	    'Opening the modal sets todo-state correctly'
	);
	equal(
	    workspace.$edit_modal.find('#id_scheduled_date').val(),
	    heading8.scheduled_date,
	    'Opening the modal sets the scheduled_date correctly'
	);
	equal(
	    workspace.$edit_modal.find('#id_scheduled_time').val(),
	    heading8.scheduled_time,
	    'Opening the modal sets the scheduled_time correctly'
	);
	ok(
	    workspace.$edit_modal.find('#id_scheduled_time_specific').prop('checked'),
	    'Opening the modal sets the scheduled_time_specific correctly'
	);
	equal(
	    workspace.$edit_modal.find('#id_deadline_date').val(),
	    heading8.deadline_date,
	    'Opening the modal sets the deadline_date correctly'
	);
	equal(
	    workspace.$edit_modal.find('#id_deadline_time').val(),
	    heading8.deadline_time,
	    'Opening the modal sets the deadline_time correctly'
	);
	ok(
	    workspace.$edit_modal.find('#id_deadline_time_specific')
		.is(':checked'),
	    'Opening the modal sets the deadline_time_specific correctly'
	);
	equal(
	    workspace.$edit_modal.find('#id_tag_string').val(),
	    heading8.tag_string,
	    'Opening the modal sets the tag_string correctly'
	);
	ok(
	    workspace.$edit_modal.find('#id_priority')
		.find('option[value="'+heading8.priority+'"]').is(':selected'),
	    'Opening the modal sets the priority correctly'
	);
	// Check that the scopes are set
	var scopes = 0;
	var $scope = workspace.$edit_modal.find('#id_scope');
	for ( var i = 0; i < heading8.scope.length; i++ ) {
	    ok(
		$scope.find('option[value="'+heading8.scope[i]+'"]')
		    .is(':selected'),
		'Opening the modal selects scope ' + heading8.scope[i]
	    );
	    scopes++;
	}
	equal(
	    scopes,
	    heading8.scope.length,
	    'All the scopes were checked'
	);
	ok(
	    workspace.$edit_modal.find('#id_repeats').prop('checked'),
	    'Opening the modal sets the repeats correctly'
	);
	equal(
	    workspace.$edit_modal.find('#id_repeating_number').val(),
	    heading8.repeating_number,
	    'Opening the modal sets the repeating_number correctly'
	);
	ok(
	    workspace.$edit_modal.find('#id_repeating_unit')
		.find('option[value="'+heading8.repeating_unit+'"]')
		.is(':selected'),
	    'Opening the modal sets the repeating unit correctly'
	);
	console.log(heading8);
	ok(
	    workspace.$edit_modal.find('#id_repeats_from_completion')
		.prop('checked'),
	    'Opening the modal sets the repeats_from_completion box correctly'
	);
	ok(
	    workspace.$edit_modal.find('#id_archived').prop('checked'),
	    'Opening the modal sets the archived box correctly'
	);
	// Check that the related_projects are set
	var projects = 0;
	var $project = workspace.$edit_modal.find('#id_related_projects');
	for ( var i = 0; i < heading8.related_projects.length; i++ ) {
	    ok(
		$project.find('option[value="'+heading8.related_projects[i]+'"]')
		    .is(':selected'),
		'Opening the modal selects project ' + heading8.related_projects[i]
	    );
	    projects++;
	}
	equal(
	    projects,
	    heading8.related_projects.length,
	    'All the related_projects were checked'
	);
	equal(
	    workspace.$edit_modal.find('#id_text').val(),
	    heading8.text,
	    'Opening the modal sets the text correctly'
	);
	equal(
	    workspace.$edit_modal.find('#id_text-aloha').html(),
	    heading8.text,
	    'Opening the modal sets the text in the aloha box correctly'
	);
	// Now make sure that opening a new child nodeEdit clears values
	$add.click();
	equal(
	    $add.data('nodeEdit').$modal,
	    workspace.$edit_modal,
	    'New child button uses workspace $edit_modal'
	);
	equal(
	    workspace.$edit_modal.find('#id_title').val(),
	    '',
	    'Modal for new child has title field cleared'
	);
	equal(
	    workspace.$edit_modal.find('.header-title').html(),
	    'New node',
	    'Modal for new child has "New node" as header'
	);
	equal(
	    workspace.$edit_modal.find('#id_todo_state').find('option[value=""]').attr('selected'),
	    'selected',
	    'Modal for new child set no todo state'
	);
	equal(
	    $scope.find('option:selected').length,
	    0,
	    'No extra scopes were selected'
	)
	equal(
	    workspace.$edit_modal.find('#id_todo_state').find('option[selected="selected"]').length,
	    1,
	    'Modal for new child clears all other todo states'
	);
	equal(
	    workspace.$edit_modal.find('#id_scheduled_date').val(),
	    '',
	    'Modal for new child clears scheduled_date'
	);
	equal(
	    workspace.$edit_modal.find('#id_scope').find('option:selected').length,
	    0,
	    'Modal for new child clears scopes'
	);
	ok(
	    ! workspace.$edit_modal.find('#id_archived').is(':checked'),
	    'Modal for new child clears archived checkbox'
	);
	equal(
	    workspace.$edit_modal.find('#id_text-aloha').html(),
	    '<br class="aloha-cleanme" style="">',
	    'Modal for new child clears aloha editor text'
	);
	// Check that the scopes are set if it's a child of a parent
	$new_child.click();
	var scopes = 0;
	var $scope = workspace.$edit_modal.find('#id_scope');
	for ( var i = 0; i < heading8.scope.length; i++ ) {
	    ok(
		$scope.find('option[value="'+heading8.scope[i]+'"]')
		    .is(':selected'),
		'Opening the modal selects scope ' + heading8.scope[i]
	    );
	    scopes++;
	}
	equal(
	    scopes,
	    heading8.scope.length,
	    'All the scopes were checked'
	);
	equal(
	    $scope.find('option:selected').length,
	    heading8.scope.length,
	    'No extra scopes were selected'
	)
	start();
    }, ajax_timer);
});

test('GtdHeading.has_scope() method', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({scopes: scopes});
    var workspace = $workspace.data('nodeOutline');
    var heading = workspace.headings.get({pk: 1});
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

asyncTest('scope tabs', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({scopes: scopes});
    var workspace = $workspace.data('nodeOutline');
    equal(
	workspace.scopes,
	scopes,
	'workspace scopes object set'
    );
    equal(
	workspace.$scope_tabs.length,
	1,
	'$scope_tabs selection added to workspace'
    );
    equal(
	workspace.$scope_tabs.children('li').length,
	scopes.length + 2,
	'Correct number of tabs created'
    );
    equal(
	workspace.scopes.get(1),
	scopes[0],
	'Can retrieve scopes'
    );
    ok(
	workspace.$scope_tabs.children('li[pk="0"]').hasClass('active'),
	'\'All\' tab starts out active'
    );
    workspace.scopes.activate(1)
    ok(
	workspace.$scope_tabs.children('li[pk="1"]').hasClass('active'),
	'Activating a scope makes its tab active'
    );
    equal(
	workspace.$scope_tabs.children('li.active').length,
	1,
	'All other scopes are cleared'
    );
    workspace.$scope_tabs.children('li[pk="2"]').click();
    ok(
	workspace.$scope_tabs.children('li[pk="2"]').hasClass('active'),
	'Clicking a tab activates it'
    );
    workspace.headings.get({pk: 1}).open();
    setTimeout(function() {
	var heading1 = workspace.headings.get({pk: 1});
	ok(
	    heading1.$element.hasClass('hidden'),
	    'Non-scope headings have hidden class'
	);
	// Rest heading 8's scope to make test valid
	workspace.headings.get({pk: 8}).scope = [];
	heading1.text = '';

	workspace.scopes.activate(1);
	ok(
	    ! heading1.is_expandable(),
	    'Heading with only non-scope children is not expandable'
	);
	start();
	workspace.scopes.activate(-1);
	stop();
    }, workspace.ANIM_SPEED + ajax_timer);
    setTimeout(function() {
	var heading1 = workspace.headings.get({pk: 1});
	ok(
	    ! heading1.$element.hasClass('hidden'),
	    'None tab shows headings with no scope'
	);
	start();
    }, workspace.ANIM_SPEED * 3 + ajax_timer);
});

module_name = 'todoState jQuery plugin - ';
module(module_name + 'init method');

test('Todo state jquery plugin initialization', function() {
    equal(
	typeof $.fn.todoState,
	'function',
	'todoState plugin exists'
    );
    var $todo = $('#todo-test');
    equal(
	$todo.next('.popover').length,
	0,
	'no .popover div exists after todo element'
    );
    // Now create it and see if it's correct
    deepEqual(
	$todo.todoState(),
	$todo,
	'todoState plugin returns original element (preserves chainability)'
    );
    var $popover = $todo.next('.popover');
    equal(
	$popover.length,
	1,
	'todoState plugin created a popover div'
    );
    ok(
	$popover.hasClass('right'),
	'.popover div has the .right class'
    )
    equal(
	$popover.children('.popover-title').html(),
	'Todo State',
	'popover contains popover-title div'
	);
    equal(
	$popover.children('.arrow').length,
	1,
	'popover contains an arrow'
    );
    equal(
	$popover.children('.popover-inner').length,
	1,
	'popover contains popover-inner div'
	);
    // Check initial properties (style, position, etc)
    equal(
	$popover.css('display'),
	'none',
	'popover starts out hidden'
    );
    equal(
	$popover.css('position'),
	'absolute',
	'popover uses absolute positioning'
    );
});

test('popover populates with todo states', function() {
    var $todo = $('#todo-test');
    $todo.attr('todo_id', 1);
    $todo.todoState({
	states: todo_state_list
    });
    var $popover = $todo.next('.popover');
    equal(
	$popover.find('.todo-option').length,
	todo_state_list.length,
	'Populated correct number of todo options'
    );
    equal(
	$popover.find('.todo-option[todo_id="1"]').html(),
	'NEXT',
	'.todo-option 1 html set'
    );
    equal(
	$popover.find('.todo-option[todo_id="2"]').html(),
	'DONE',
	'.todo-option 2 html set'
    );
    equal(
	$popover.find('.todo-option[todo_id="1"]').attr('selected'),
	'selected',
	'Current todo state has the \'selected\' attribute set'
    );
});

test('todo state click functionality', function() {
    var $todo = $('#todo-test');
    $todo.todoState({
	states: todo_state_list
    });
    var $popover = $todo.next('.popover');
    $todo.click();
    equal(
	$popover.css('display'),
	'block',
	'popover becomes visible after todo state is clicked'
    );
    equal(
    	$popover.position().left,
    	$todo.position().left + Number($todo.css('width').slice(0, -2)),
    	'Popover start out to the right of the todo state'
    );
    var top = $todo.position().top;
    var height = $todo.height();
    var new_middle = top + (height/2);
    equal(
	Math.round($popover.position().top),
	Math.round(new_middle - ($popover.height()/2)),
	'Popover starts out valign->middle of the todo state'
    );
    // Make sure it goes away when another element is clicked
    var $workspace = $('#test_workspace');
    $workspace.click();
    equal(
	$popover.css('display'),
	'none',
	'Popover disappers when something else is clicked (eg $workspace)'
    );
    // Test if popover goes away if todo state is clicked again
    $todo.click();
    equal(
	$popover.css('display'),
	'block',
	'popover becomes visible after todo state is clicked again'
    );
    $todo.click();
    equal(
	$popover.css('display'),
	'none',
	'popover disapperas if todo state is clicked while popover is up'
    );
});

test('todo-option hover functionality', function() {
    var $todo = $('#todo-test');
    $todo.attr('todo_id', 1);
    $todo.todoState({
	states: todo_state_list
    });
    var $popover = $todo.next('.popover');
    $todo.click();
    var $option1 = $popover.find('.todo-option[todo_id="1"]');
    var $option2 = $popover.find('.todo-option[todo_id="2"]');
    // Non-selected options have hover functionality
    $option2.mouseenter();
    ok(
	$option2.hasClass('ow-hover'),
	'Hovered todo option has class .ow-hover'
    );
    $option2.mouseleave();
    ok(
	!($option2.hasClass('ow-hover')),
	'Option has class .ow-hover removed after mouse leaves'
    );
    // Selected option has no hover functionality
    $option1.mouseenter();
    ok(
	!($option1.hasClass('ow-hover')),
	'Selected option doesn\'t have class .ow-hover after mouse enter'
    );
});

asyncTest('Todo option click functionality', function() {
    $fixture.data('test_value', false) // For testing callback
    var $todo = $('#todo-test');
    $todo.attr('todo_id', 1);
    $todo.todoState({
	states: todo_state_list,
	node_id: 1,
	click: function() {$fixture.data('test_value', true);}
    });
    var $popover = $todo.next('.popover');
    $todo.click();
    equal(
    	$todo.attr('todo_id'),
    	1,
    	'Initial todo state set'
    );
    equal(
	$todo.html(),
	'NEXT',
	'Initial todo display html set'
    );
    // Make sure clicking the selected option does nothing
    var $option1 = $popover.find('.todo-option[todo_id="1"]');
    $option1.click();
    equal(
	$popover.css('display'),
	'block',
	'Clicking selected option does not hide the popover'
    );
    // Test functionality for clicking non-selected todo option
    var $option2 = $popover.find('.todo-option[todo_id="2"]');
    equal($option2.length, 1, 'Todo option 2 found');
    $option2.click();
    equal(
	$popover.css('display'),
	'none',
	'Popover hidden after an option is clicked'
    );
    setTimeout(function() {
	start();
	equal(
	    $todo.attr('todo_id'),
	    2,
	    '$todo.data(\'todo_id\') is updated to reflect new todo state'
	);
	equal(
	    $todo.html(),
	    'DONE',
	    'todo state html is updated to reflect new todo state'
	);
	ok($fixture.data('test_value'), 
	   'Callback function was called after click');
    }, (ajax_timer * 1.1 + 5));
});



module(module_name + 'update method');
test('Update method changes settings', function() {
    var $todo = $('#todo-test');
    $todo.attr('todo_id', 1);
    $todo.todoState({
	states: todo_state_list
    });
    var settings = $todo.data('todoState');
    equal(
	settings.todo_id,
	1,
	'Correct initial settings.todo_id'
    );
    $todo.todoState('update', {
	todo_id: "2"
	});
    settings = $todo.data('todoState');
    equal(
	settings.todo_id,
	2,
	'settings.todo_id correct after update method called'
    );
    equal(
	$todo.attr('todo_id'),
	"2",
	'todo_id attribute set after update method called'
    );
    var $popover = $todo.siblings('.popover');
    var $selected = $popover.find('.todo-option[selected]');
    var $option2 = $popover.find('.todo-option[todo_id="2"]');
    equal(
	$selected.length,
	1,
	'Only one option is selected'
    );
    ok(
	$option2.attr('selected'),
	'todo option 2 has \'selected\' attribute'
    );
    equal(
	$todo.html(),
	todo_state_list[2].display,
	'todo_state display is updated'
    );
});


module_name = 'agenda jQuery plugin - ';
module(module_name + 'Initialization');

$.mockjax({
    url: '/gtd/agenda/2012-12-19/',
    responseTime: ajax_timer,
    responseText: {
	status: 'success',
	agenda_date: '2012-12-19',
	daily_html: '<tr node_id="22">\nyo, dawg\n</tr>\n',
	timely_html: '<tr node_id="23">\nI heard you like trains\n</tr>\n',
	deadlines_html: '<tr node_id="24">\nso I pimped yo ride\n</tr>\n'
    }
});

test('Agenda jquery plugin initialization', function() {
    var $agenda = $('#agenda-div');
    equal(
	$agenda.length,
	1,
	'Test agenda div is selectable'
    );
    equal(
	typeof $.fn.agenda,
	'function',
	'agenda plugin exists'
    );
    equal(
	$agenda.agenda(),
	$agenda,
	'agenda plugin returns selecter (preserves chainability)'
    );
    // Date detection
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    deepEqual(
	$agenda.data('agenda').date,
	today,
	'Date set to today if no \'date\' attribute set'
    );
    $agenda.attr('date', '1985-05-29');
    $agenda.agenda();
    deepEqual(
	$agenda.data('agenda').date,
	new Date(1985, 4, 29),
	'Date detected from .agenda element \'date\' attribute'
    );
});

module(module_name + 'Functionality');

test('todoState plugin attached', function() {
    var $agenda = $('#agenda-div');
    $agenda.agenda({
	states: [
	    {
		todo_id: 0,
		display: '[None]'
	    },
	    {
		todo_id: 1,
		display: 'NEXT'
	    }
	]
    });
    equal(
	$agenda.find('.todo-state').length,
	1,
	'Found a todo state'
    );
    var $popover = $agenda.find('.todo-state').next('.popover');
    equal(
	$popover.length,
	1,
	'todo state has a popover after it'
    );
    equal(
	$popover.find('.todo-option').length,
	2,
	'states option passed through $.agenda() to $.todoState()'
    );
});

asyncTest('Changing agenda date', function() {
    var $agenda = $('#agenda-div');
    $agenda.agenda();
    var $form = $agenda.find('form.date');
    // Change the date
    var $text = $form.find('input[name="date"][type="text"]');
    equal(
	$text.length,
	1,
	'Date text input found'
    );
    $text.val('2012-12-19');
    $form.find('input[type="submit"]').click();
    deepEqual(
	$agenda.data('agenda').date,
	new Date(2012, 11, 19),
	'New date set when submit button is clicked'
    );
    setTimeout(function() {
	// Is the new agenda populated correctly
	start();
	// Date title at top of page
	equal(
	    $agenda.children('.date:header').html(),
	    'Dec. 19, 2012',
	    '.date Header has been changed to reflect new date'
	);
	notEqual(
	    $agenda.children('.other:header').html(),
	    'Dec. 19, 2012',
	    'Other header was not changed with new date'
	);
	// Day-specific items
	var $daily = $agenda.find('.daily')
	var $daily_item = $daily.children('tbody').children('tr');
	equal(
	    $daily_item.length,
	    1,
	    '1 day specific row added'
	);
	equal(
	    $daily_item.attr('node_id'),
	    22,
	    'Day specific row has node_id attribute set'
	)
	// Time-specific items
	var $timely = $agenda.find('.timely')
	var $timely_item = $timely.children('tbody').children('tr');
	equal(
	    $timely_item.length,
	    1,
	    '1 time specific row added'
	);
	equal(
	    $timely_item.attr('node_id'),
	    23,
	    'Time specific row has node_id attribute set'
	)
	// Upcoming deadlines
	var $deadlines = $agenda.find('.deadlines')
	var $deadlines_item = $deadlines.children('tbody').children('tr');
	equal(
	    $deadlines_item.length,
	    1,
	    '1 upcoming deadline row added'
	);
	equal(
	    $deadlines_item.attr('node_id'),
	    24,
	    'Upcoming deadline row has node_id attribute set'
	)
    }, (ajax_timer * 1.1 + 5))
});



module_name = 'Aloha editor';
module(module_name);
test('Basic functionality', function() {
    equal(
	typeof $.fn.alohaText,
	'function',
	'alohaText plugin exists'
    );
    var $fixture = $('#qunit-fixture');
    var $text = $fixture.children('.ow-text');
    deepEqual(
	$text.alohaText(),
	$text,
	'alohaText plugin preverves chainability'
    );
    $text.todoState();
    ok(
	$text.hasClass('aloha-editable'),
	'Plugin adds \'aloha-editable\' class'
    );
});

asyncTest('Project outline incoroporation', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline( {
	todo_states: todo_state_list
    } );
    $workspace = Aloha.jQuery('#test_workspace');
    setTimeout(function() {
	start();
	var $text = Aloha.jQuery('.ow-text');
	ok(
	    $text.hasClass('aloha-editable'),
	    'Aloha editor attached'
	);
	ok(
	    !$text.hasClass('aloha-editable-active'),
	    'Not aloha editable before being clicked'
	);
	$text.trigger('aloha-editable-activated');
    }, (ajax_timer * 1.1 + 5));
});



module_name = 'Node List Plugin';
module(module_name);
test('nodeList plugin initialization', function() {
    var $list = $('#node-list');
    equal(
	$list.length,
	1,
	'List table is selectable'
    );
    equal(
	typeof $.fn.nodeList,
	'function',
	'agenda plugin exists'
    );
    equal(
	$list.nodeList({
	    states: todo_state_list
	}),
	$list,
	'nodeList plugin return selector (preserves chainability');
    var $popover = $list.find('.popover');
    equal(
	1,
	$popover.length,
	'Plugin creates popovers'
    );
    equal(
	$popover.find('.todo-option').length,
	todo_state_list.length,
	'Plugin passes along todo states to todoState plugin'
    );
});




module('Node Edit Dialog');
asyncTest('Check basic functionality', function() {
    equal(
	'function',
	typeof $.fn.nodeEdit,
	'nodeEdit is a function'
    );
    var $workspace = $('#node-edit-test');
    var $button = $('#edit-btn');
    equal(
	$workspace.length,
	1,
	'div id="node-edit-test" found'
    );
    equal(
	$button.length,
	1,
	'<a id="edit-btn" found'
    );
    $button.nodeEdit({url: '/gtd/nodes/6/edit/',
		      target: '#node-detail',
		     });
    setTimeout(function() {
	start();
	var $modal = $button.siblings('#node-edit-modal');
	equal(
	    $modal.length,
	    1,
	    'dialog found'
	);
	var data = $button.data('nodeEdit');
	equal(
	    data.todo_id,
	    1,
	    'data.(\'nodeEdit\').todo_id set correctly'
	);
    }, (ajax_timer * 1.1) + 5);
});

asyncTest('nodeEdit repeating box activation', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline();
    var outline = $workspace.data('nodeOutline');
    setTimeout( function() {
	var $modal = $workspace.find('#new-modal');
	equal(
	    $modal.length,
	    1,
	    'Modal found'
	);
	attach_pickers($modal);
	var $number = $modal.find('#id_repeating_number');
	equal(
	    $number.attr('disabled'),
	    'disabled',
	    'Repeating number box starts out disabled'
	);
	$modal.find('#id_repeats').click();
	notEqual(
	    $number.attr('disabled'),
	    'disabled',
	    'Repeating number box is enabled after repeats is clicked'
	);
	start();
    }, ajax_timer)
});

asyncTest('nodeEdit(\'update\') method', function() {
    var $button = $('#edit-btn');
    $button.nodeEdit({url: '/gtd/nodes/6/edit/',
		      target: '#node-detail',
		     });
    setTimeout( function() {
	$button.nodeEdit('update', { todo_id: 2});
	var $modal = $button.siblings('#node-edit-modal');
	var $select = $modal.find('#id_todo_state');
	var $option = $select.find('option[value="2"]');
	var $selected = $select.find('option[selected]');
	equal(
	    $selected.length,
	    1,
	    'Only one option is selected'
	)
	ok(
	    $option.is(':selected'),
	    'New option has selected attribute'
	);
	var settings = $button.data('nodeEdit');
	equal(
	    settings.todo_id,
	    2,
	    '.data(\'nodeEdit\') is updated'
	);
	start();
    }, ajax_timer);
});
asyncTest('nodeEdit(\'reset\') method', function() {
   var $button = $('#edit-btn');
    $button.nodeEdit({url: '/gtd/nodes/6/edit/',
		      target: '#node-detail',
		     });
    setTimeout( function() {
	start();
	var $modal = $button.data('nodeEdit').$modal;
	var $select = $modal.find('#id_todo_state');
	$select.find('option').removeAttr('selected');
	$select.find('option[value="2"]').attr('selected', 'selected');
	$button.nodeEdit('reset');
	equal(
	    $select.find('option:selected').attr('value'),
	    "1",
	    'Todostate select element is reset upon calling reset method'
	);
    }, ajax_timer * 1.1 + 5);
});


module_name = 'Todo State Buttons';
module(module_name);
test('Plugin exists', function() {
    equal(
	'function',
	typeof $.fn.todoButtons,
	'todoButtons is a function'
    );
    var $buttons = $('#todo-buttons');
    var r = $buttons.todoButtons();
    equal(
	r,
	$buttons,
	'Plugin prefers chainability'
    );
});

asyncTest('Button clicks', function() {
    var $buttons = $('#todo-buttons');
    $buttons.todoButtons();
    var $button0 = $buttons.find('button[value=0]');
    var $button1 = $buttons.find('button[value=1]');
    ok(
	$button0.hasClass('active'),
	'Button 0 starts out active'
    );
    ok(
	!$button1.hasClass('active'),
	'Button 1 starts out inactive'
    );
    $button1.click();
    setTimeout(function() {
	start();
	ok(
	    $button1.hasClass('active'),
	    'Clicked button becomes active'
	);
	ok(
	    !$button0.hasClass('active'),
	    'Other button becomes inactive'
	);
    }, ajax_timer * 1.1 + 5);
});

test('todoButtons(\'update\') method', function() {
    var $buttons = $('#todo-buttons');
    $buttons.todoButtons();
    var $button0 = $buttons.find('button[value=0]');
    var $button1 = $buttons.find('button[value=1]');
    $buttons.todoButtons('update', {todo_id: 1});
    ok(
	$button1.hasClass('active'),
	'New button is activated'
    );
});

asyncTest('callback', function() {
    var $buttons = $('#todo-buttons');
    $buttons.data('test_value', false);
    $buttons.todoButtons({ 
	callback: function() {
	    $buttons.data('test_value', true);
	}
    });
    var $button0 = $buttons.find('button[value=0]');
    var $button1 = $buttons.find('button[value=1]');
    $button1.click();
    setTimeout( function() {
	start();
	ok(
	    $buttons.data('test_value'),
	    'callback function executed'
	);
    }, ajax_timer * 1.1 + 5);
})


module('Node Form Validation');
test('Meta', function() {
    // Check basic meta information about the validate_node function
    var $good_form = $fixture.find('#good-form');
    equal(
	typeof validate_node,
	'function',
	'validate_node is a function'
    );
    ok(
	validate_node($good_form),
	'Form with no validation error returns true'
    );
});
test('Required field', function() {
    var $bad_form = $fixture.find('#bad-form');
    ok(
	!validate_node($bad_form),
	'Invalid form returns false'
    );
    ok(
	$bad_form.find('#required').hasClass('invalid'),
	'validate_node catches required fields'
    );
});
test('Date field', function() {
    var $bad_form = $fixture.find('#bad-form');
    validate_node($bad_form);
    ok(
	$bad_form.find('#date-field').hasClass('invalid'),
	'validate_node catches bad date'
    );
    ok(
	!$bad_form.find('#no-date').hasClass('invalid'),
	'validate_node ignores blank date fields'
    );
    equal(
	$bad_form.find('#date-field').next('span.error').length,
	1,
	'An error span is placed after the bad date'
    );
    var $good_form = $fixture.find('#good-form');
    validate_node($good_form);
    ok(
	!$good_form.find('#date-field').hasClass('invalid'),
	'good date field passes validation'
    );
	
});
test('Time field', function() {
    var $bad_form = $fixture.find('#bad-form');
    validate_node($bad_form);
    var $bad_time = $bad_form.find('#bad-time-field');
    equal(
	$bad_time.length,
	1,
	'$bad_time element found in fixture'
    );
    ok(
	$bad_time.hasClass('invalid'),
	'Bad time has invalid class after validation'
    );
    equal(
	$bad_time.next('span.error').length,
	1,
	'An error span is placed after the bad time'
    );
});
test('Requires other fields', function() {
    var $bad_form = $fixture.find('#bad-form');
    validate_node($bad_form);
    var $bad_chk = $bad_form.find('#bad-requires');
    var $req_date = $bad_form.find('#required-date');
    equal(
	$bad_chk.length,
	1,
	'$bad_chk element found in fixture'
    );
    ok(
	$req_date.hasClass('invalid'),
	'Blank requires field is marked invalid'
    );
    equal(
	$req_date.parent().parent().find('span.error').length,
	1,
	'An error span is placed after the ommitted field'
    );
});
test('Integer field', function() {
    var $bad_form = $fixture.find('#bad-form');
    var $good_form = $fixture.find('#good-form');
    validate_node($bad_form);
    var $bad_int = $bad_form.find('#bad-int');
    ok(
	$bad_int.hasClass('invalid'),
	'Non-numbers marked as invalid'
    );
    validate_node($good_form);
    var $blank_int = $good_form.find('#blank-int')
    ok(
	! $blank_int.hasClass('invalid'),
	'Blank ints not marked as invalid'
    );
});
    
