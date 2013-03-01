// Hold unit tests for the hierarchical expanding project outline view.
// Implementation held in orgwolf.js
var $workspace = $('#test_workspace');
var $fixture = $('#qunit-fixture');

// Fix for bad global variables detection in firefox
var console, getInterface;

// Constants and setup
var sparse_dict = {
    title: 'test_title',
    node_id: '1',
};
var full_dict = {
    title: 'test_title',
    text: 'here\' some text that goes with it',
    node_id: '1',
    todo_id: '1',
    todo: 'DONE',
    tags: ':comp:',
};
var archived_dict = {
    title: 'test_title',
    text: 'here\' some text that goes with it',
    node_id: '1',
    todo_id: '1',
    todo: 'DONE',
    tags: ':comp:',
    archived: true,
};
var second_dict = {
    title: 'maybe get some food',
    node_id: '5',
    todo_id: '2',
    todo: 'NEXT',
};
var todo_state_list = [
    {todo_id: 0,
     display: '[None]'},
    {todo_id: 1,
     display: 'NEXT'},
    {todo_id: 2,
     display: 'DONE'},
];
var ajax_timer = 20; // how long fake ajax request takes (in milliseconds)
// Setup fake AJAX responses
$.mockjax({
    url: '/gtd/nodes/0/children/',
    responseTime: ajax_timer,
    responseText: {
	status: 'success',
	parent_id: 0,
	children: [
	    {
		node_id: 1,
		title: 'Tasks',
		todo_id: 1,
		todo: 'DONE',
		tags: '',
		text: 'Mostly when I can...',
	    },
	    {
		node_id: 2,
		title: 'Expense reports',
		todo_id: 2,
		todo: 'NEXT',
		tags: ':comp:',
		text: '',
	    }
	]
    }
});
$.mockjax({
    url: '/gtd/nodes/1/children/',
    responseTime: ajax_timer,
    responseText: {
	status: 'success',
	parent_id: 1,
	children: [
	    {
		node_id: 3,
		title: 'Buy a puppy',
		todo_id: 2,
		todo: 'NEXT',
		tags: ':car:',
		text: 'I should really buy a puppy because they\'re cute',
	    },
	    {
		node_id: 4,
		title: 'Pay my taxes',
		todo_id: 2,
		todo: 'NEXT',
		tags: '',
		text: '',
		archived: true,
	    }
	]
    }
});
$.mockjax({
    url: '/gtd/nodes/2/children/',
    responseTime: ajax_timer,
    responseText: {
	status: 'success',
	parent_id: 2,
	children: [
	    {
		node_id: 5,
		title: 'Take puppy to the vet',
		todo_id: 2,
		archived: true,
		todo: 'NEXT',
		tags: ':car:',
		text: 'I should really neuter my puppy because they\'re cute',
	    }
	]
    }
});
$.mockjax({
    url: '/gtd/nodes/3/children/',
    responseTime: ajax_timer,
    responseText: {
	status: 'success',
	parent_id: 3,
	children: [
	    {
		node_id: 6,
		title: 'tax forms from Kalsec',
		todo_id: 3,
		todo: 'WAIT',
		tags: '',
		text: '',
	    }
	]
    }
});
$.mockjax({
    url: '/gtd/nodes/1/edit/',
    responseTime: ajax_timer,
    responseText: '{"status": "success", "node_id": 1, "todo_id": 2}'
});
$.mockjax({
    url: '/gtd/nodes/5/edit/',
    responseTime: ajax_timer,
    responseText: '{"status": "success", "node_id": 5, "todo_id": 0}'
});
// For testing todo buttons plugin
$.mockjax({
    url: '/gtd/nodes/7/edit/',
    responseTime: ajax_timer,
    responseText: '{"status": "success", "todo_id": 1}'
});
// For testing modal edit dialog
var options = "";
for ( var i = 0; i < todo_state_list.length; i++ ) {
    var state = todo_state_list[i];
    options += '<option value="' + state.todo_id + '"';
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


var module_name = 'OutlineHeading jQuery plugin - ';
module(module_name + 'Heading');

test('outline object', function() {
    // Check if outline functionality exists
    equal(
	typeof $.fn.nodeOutline,
	'function',
	'project_outline function exists')
});
var outline_heading = $.fn.nodeOutline({ get_proto: true });
test('heading object', function() {
    // Check that the heading object exists
    equal(typeof outline_heading, 'function', 'heading function exists')
});
test('create new heading object from full data', function() {
    var test_heading = new outline_heading(full_dict);
    equal(test_heading.title, 'test_title', 'Title is set');
    strictEqual(test_heading.todo_id, 1, 'Todo ID is set');
    equal(test_heading.text, 'here\' some text that goes with it', 'Text set');
    equal(test_heading.todo, 'DONE', 'Todo state is set');
    equal(test_heading.tags, ':comp:', 'Tag string is set');
});

test('save heading object in DOM element data()', function() {
    var $workspace = $('#test_workspace');
    var heading = new outline_heading(full_dict);
    heading.create_div($workspace);
    var saved_heading = heading.$element.data('nodeOutline');
    equal(
	saved_heading.node_id,
	1,
	'Saved object node_id'
    );
});
test('create new heading object from sparse data', function() {
    var test_heading = new outline_heading(sparse_dict);
    equal(test_heading.title, 'test_title', 'Title is set');
    equal(test_heading.todo_id, 0, 'Todo ID is set');
    equal(test_heading.todo, '[None]', 'Todo state is set');
    equal(test_heading.tags, null, 'Tag string is set');
});

test('heading as_html method', function() {
    var test_heading = new outline_heading(sparse_dict);
    var expected_html = '<div class="heading" node_id="1">\n  <div class="ow-hoverable">\n    <i class="clickable icon-chevron-right"></i>\n    <span class="todo-state update" data-field="todo_abbr"></span>\n    <div class="clickable ow-title"></div>\n    <div class="ow-buttons">\n      <i class="icon-pencil" title="Edit"></i>\n      <i class="icon-th-list" title="Detail view"></i>\n      <i class="icon-plus" title="New subheading"></i>\n    </div>\n  </div>\n  <div class="details">\n    <div class=\"ow-text\"></div>\n    <div class="children">\n      <div class="loading">\n        <em>Loading...</em>\n      </div>\n    </div>\n  </div>\n</div>\n';
    equal(test_heading.as_html(), expected_html, 'outline_heading.as_html() output');
});

test('heading create_div method', function() {
    // Make sure the outline_heading objects create_div method works as expected
    var test_heading = new outline_heading(full_dict);
    var $workspace = $('#test_workspace');
    test_heading.create_div($workspace);
    var $heading = $('#test_workspace').children('.heading');
    equal($heading.length, 1, '1 heading created');
    equal(test_heading.$element.attr('node_id'), '1', 'node_id set');
    equal(
	test_heading.$text.text(),
	'here\' some text that goes with it',
	'text element created'
    );	
    equal(
	test_heading.$details.css('display'),
	'none',
	'Initial details div is not displayed'
    );
});

test('create_div of archived node', function() {
    // Make sure the outline_heading objects create_div method works as expected
    var test_heading = new outline_heading(archived_dict);
    var $workspace = $('#test_workspace');
    test_heading.create_div($workspace);
    var $heading = $('#test_workspace').children('.heading');
    ok(
	$heading.hasClass('archived'),
	'Archived heading has \'archived\' class'
    );
});

test('update_dom method', function() {
    var test_heading = new outline_heading(full_dict);
    test_heading.todo = "NEXT";
    test_heading.todo_states = todo_state_list;
    equal(
	typeof test_heading.update_dom,
	'function',
	'update_dom() method exists'
    );
    var $workspace = $('#test_workspace');
    test_heading.create_div($workspace);
    var $heading = test_heading.$element;
    // Test heading.node_id
    equal(
	$heading.attr('node_id'),
	1,
	'Initial attribute: node_id set'
    );
    test_heading.node_id = 2;
    test_heading.update_dom();
    equal(
	$heading.attr('node_id'),
	2,
	'Updated attribute: node_id'
    );
    // Test heading.text
    equal(
	test_heading.$text.html(),
	test_heading.text,
	'Initial element: ow-text'
    );
    test_heading.text = 'Some other text here';
    test_heading.update_dom();
    equal(
	test_heading.$text.html(),
	'Some other text here',
	'Update element: ow-text'
    );
    // Test heading.title
    equal(
	test_heading.$title.html(),
	'<strong class="update" data-field="title">' + test_heading.title + '</strong>',
	'Initial element: ow-title'
    );
    test_heading.title = 'New title';
    test_heading.update_dom();
    equal(
	test_heading.$title.html(),
	'<strong class="update" data-field="title">New title</strong>',
	'Update element: ow-title'
    );
    // Test heading.todo_id
    equal(
	test_heading.$todo_state.html(),
	'NEXT',
	'Initial element: $todo_state'
    );
    test_heading.todo_id = 2;
    test_heading.update_dom();
    equal(
	test_heading.$todo_state.html(),
	'DONE',
	'Update element: $todo_state'
    );
    equal(
	test_heading.$todo_state.data('todo_id'),
	2,
	'Update data ($todo_id): todo_id'
    );
    strictEqual(
	$heading.data('nodeOutline'),
	test_heading,
	'Updated data: object'
    );
});

test('outline indentations', function() {
    var $workspace = $('#test_workspace');
    var first = new outline_heading(full_dict);
    equal(first.level, 1, 'Detect parent level');
    first.create_div($workspace);
    second_dict['parent_id'] = '1';
    var second_heading = new outline_heading(second_dict);
    equal(second_heading.level, 2, 'Detect second level');
    var $first = get_heading(1);
    second_heading.create_div($first.children('.children'));
    var $second = get_heading(5);
});

test('add function buttons', function() {
    var $workspace = $('#test_workspace');
    var heading = new outline_heading(full_dict);
    heading.create_div($workspace);
    heading.create_add_button();
    equal(
	heading.$children.children('.add-heading').data('parent_id'),
	1,
	'Set add heading button\'s parent_id data attribute'
    );
    equal(
	heading.$buttons.length,
	1,
	'Creates a buttons div'
    );
    equal(
	heading.$buttons.css('visibility'),
	'hidden',
	'Function buttons start off hidden'
    );
    heading.$buttons.mouseenter(),
    equal(
	heading.$buttons.css('visibility'),
	'visible',
	'MouseEnter makes the buttons visible'
    );
    heading.$buttons.mouseleave(),
    equal(
	heading.$buttons.css('visibility'),
	'hidden',
	'MouseLeave makes the buttons hidden again'
    );
    var $buttons = heading.$element.children('div.ow-buttons').children('i');
});

test('Heading toggle() method', function() {
    var $workspace = $('#test_workspace');
    var heading = new outline_heading(full_dict);
    heading.create_div($workspace);
    equal(
	heading.$details.css('display'),
	'none',
	'.details starts off hidden'
    );
    var $icon = heading.$element.children('.ow-hoverable').children('i.clickable');
    ok($icon.hasClass('icon-chevron-right', 'Icon ends up closed'));
    heading.toggle();
    equal(
	heading.$details.css('display'),
	'block',
	'.details get un-hidden on toggle'
    );
    ok($icon.hasClass('icon-chevron-down'), 'Icon ends up open');
    heading.toggle('open');
    ok($icon.hasClass('icon-chevron-down'), 'Icon ends up open');
});

asyncTest('Toggle clickable region on heading', function() {
    expect(1);
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline();
    setTimeout(function() {
	$workspace.find('.heading').first().each(function() {
	    var $clickable = $(this).children('.ow-hoverable').children('.clickable');
	    var heading = $clickable.data('$parent').data('nodeOutline');
	    heading.has_children = true;
	    $clickable.click();
	    equal(
		heading.$details.css('display'),
		'block',
		'CSS display set properly'
	    );
	});
	start();
    }, (ajax_timer * 1.1 + 5));
});

test('Content detection', function() {
    // If a heading has text or children is should be expandable
    var $workspace = $('#test_workspace');
    var heading = new outline_heading(sparse_dict);
    heading.create_div( $workspace );
    ok(
	!heading.expandable,
	'sparse heading doesn\'t have it\'s exandable flag set'
    );
    var heading = new outline_heading(full_dict);
    heading.create_div( $workspace );
    ok(
	heading.expandable,
	'heading with text has it\'s exandable flag set'
    );
    ok(
	heading.$element.hasClass('expandable'),
	'heading element has class \'expandable\''
    );
    ok(
	!heading.$element.hasClass('has_children'),
	'heading element does not have class \'has_children\''
    );
});

test('Hovering actions', function() {
    // When an .ow-hoverable action is hovered over, the relevant buttons show
    var $workspace = $('#test_workspace');
    var heading = new outline_heading(sparse_dict);
    heading.todo_states = [
	{todo_id: 1,
	 todo: 'NEXT'},
	{todo_id: 2,
	 todo: 'DONE'},
    ]
    heading.create_div($workspace);
    var $hoverable = heading.$element.children('.ow-hoverable')
    var heading2 = new outline_heading(second_dict);
    heading2.todo_states = heading.todo_states;
    heading2.create_div($workspace);
    var $hoverable2 = heading2.$element.children('.ow-hoverable');
    // Tests before hover over
    equal(
	$hoverable.children('.ow-buttons').length,
	1,
	'Buttons div exists'
    );
    equal(
	$hoverable.children('.ow-buttons').css('visibility'),
	'hidden',
	'Buttons div starts out hidden'
    );
    equal(
	$hoverable.children('.todo-state').length,
	1,
	'Todo state div exists'
    );
    equal(
	$hoverable.children('.todo-state').text(),
	'[]',
	'Todo state div has \'[]\' as text'
    );
    // Tests after hover over
    $hoverable.mouseenter();
    equal(
	$hoverable.children('.ow-buttons').css('visibility'),
	'visible',
	'Buttons div is visible after mouse enter'
    );
    // Tests after hover out
    $hoverable.mouseleave();
    equal(
	$hoverable.children('.ow-buttons').css('visibility'),
	'hidden',
	'Buttons div is visible after mouse enter'
    );
    equal(
	$hoverable.children('.todo-state').css('display'),
	'none',
	'Empty Todo state is hidden after mouse leave'
    );
    $hoverable2.mouseleave();
    equal(
	$hoverable2.children('.todo-state').css('display'),
	'inline',
	'Real todo state is still visible after mouse leave'
    );
});

test('Clickable TodoState elements', function() {
    // When '.todostate' spans are clicked, they become a selection popover.
    var $workspace = $('#test_workspace');
    var heading = new outline_heading(second_dict);
    heading.todo_states = todo_state_list
    heading.create_div($workspace);
    var $todo = heading.$element.find('.todo-state');
    var $popover = heading.$element.find('.popover');
    equal(
	$popover.css('position'), 
	'absolute',
	'Todo state element uses absolute positioning'
    );
    equal(
	heading.$element.find('.todo-state').length,
	1,
	'One .todo-state element found'
    );
    equal(
	$popover.length,
	1,
	'Popover div exists'
    );
    equal(
	$popover.css('display'),
	'none',
	'Popover starts off hidden'
    );
    equal(
	$popover.find('.todo-option').length,
	todo_state_list.length,
	'Correct number of todo state options in popover'
    );
    // Now click the todo state and check properties
    $todo.click();
    equal(
	$popover.css('display'),
	'block',
	'Popover is displayed on todo state click'
    );
});

test('Todo state popover', function() {
    // When '.todostate' spans are clicked, they become a combo select box.
    var $workspace = $('#test_workspace');
    var heading = new outline_heading(second_dict);
    heading.todo_states = [
	{todo_id: 1,
	 display: 'TODO'},
	{todo_id: 2,
	 display: 'NEXT'},
    ]
    heading.create_div($workspace);
    var $todo = heading.$element.find('.todo-state');
    var $popover = heading.$element.find('.popover');
    equal(
	$popover.find('.todo-option').length,
	2,
	'Created correct number of todo options'
    );
    equal(
	$popover.find('.todo-option').attr('todo_id'),
	'1',
	'todo_id attribute set'
    );
    equal(
	$popover.find('.todo-option[todo_id="1"]').html(),
	'TODO',
	'Other todo state has a white background'
    );
    // Hover-over
    var $option1 = $popover.find('.todo-option[todo_id="1"]')
    heading.$todo_state.click(); // To create the popover
    $option1.mouseenter();
    ok($option1.hasClass('ow-hover'),
       'Hovered element has class ow-hover');
    $option1.mouseleave();
    ok(!$option1.hasClass('ow-hover'),
       'Un-hovered element doesn\'t have class ow-hover');
    // Selected option does not have background set
    var $option2 = $popover.find('.todo-option[selected]');
    equal(
	$option2.length,
	1,
	'1 Selected todo-option found'
    );
    $option2.mouseenter();
    ok(!$option1.hasClass('ow-hover'),
	'Selected element doesn\'t get ow-hover class on hover');
});

test('Popover populating method', function() {
    // When '.todostate' spans are clicked, they become a combo select box.
    var $workspace = $('#test_workspace');
    var heading = new outline_heading(second_dict);
    heading.todo_states = todo_state_list;
    equal(
	typeof heading.populate_todo_states,
	'function',
	'populate_todo_states method exists'
    );
    heading.create_div($workspace);
    var $todo = heading.$element.find('.todo-state');
    var $popover = heading.$element.find('.popover');
    var $inner = $popover.children('.popover-inner')
    $inner.html('');
    equal(
	$inner.html(),
	'',
	'Popover inner html cleared'
    );
    heading.populate_todo_states($popover.find('.popover-inner'));
    equal(
	$popover.children('.popover-inner').children('.todo-option').length,
	todo_state_list.length,
	'Correct number of todo states created'
    );
    var $option1 = $inner.children('.todo-option[todo_id="1"]');
    var $option2 = $inner.children('.todo-option[todo_id="2"]');
    equal(
	$option1.attr('selected'),
	undefined,
	'Non-selected todo option does not have "selected" attribute set'
    );
    equal(
	$option2.attr('selected'),
	'selected',
	'Selected todo option has "selected" attribute set'
    );
});

asyncTest('Todo state changing functionality', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({ todo_states: todo_state_list });
    var $heading1;
    setTimeout(function() {
	start();
	$heading1 = $workspace.find('.heading[node_id="1"]');
	var $popover = $heading1.children('.ow-hoverable').children('.popover');
	equal(
	    $popover.length,
	    1,
	    'One popover exists before clicking'
	);
	equal(
	    $heading1.length,
	    1,
	    'Node 1 heading exists'
	);
	equal(
	    $heading1.find('.todo-option[selected]').html(),
	    'NEXT',
	    'Correct heading selected to start'
	);
	// Clicking on the selected node does nothing
	$heading1.children('.ow-hoverable').children('.todo-state').click();
	equal(
	    $heading1.find('.popover').css('display'),
	    'block',
	    'Popover visible after mouseenter before clicking'
	);
	$heading1.find('.todo-option[selected]').click();
	equal(
	    $heading1.find('.popover').css('display'),
	    'block',
	    'Clicking Selected option does not dismiss popover'
	);
	// Now change it to the other todo state
	$heading1.find('.todo-option[todo_id="2"]').click();
	stop();
    }, (ajax_timer * 1.1 + 5));
    setTimeout(function() {
	start();
	var heading = $heading1.data('nodeOutline');
	var $popover = $heading1.children('.ow-hoverable').children('.popover');
	equal(
	    $popover.length,
	    1,
	    'One $popover is created'
	);
	equal(
	    heading.node_id,
	    1,
	    'Heading object successfully found after todo option click'
	);
	equal(
	    heading.todo_id,
	    2,
	    'Todo state changed to 2'
	);
	equal(
	    $popover.find('.todo-option[todo_id="2"]').attr('selected'),
	    'selected',
	    'Todo option 2 is now selected'
	);
    }, (ajax_timer * 7.7 + 5));
});




module(module_name + 'Outline setup');

asyncTest('converts initial workspace', function() {
    // See if the function finds the existing workspace and sets the right number of children with the right attributes and data
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline();
    setTimeout(function() {
	equal($('#test_workspace > .children > div.heading').length, 2, 'correct number of .heading divs');
	start();
    }, (ajax_timer * 1.1 + 5));
});

asyncTest('Populates children on outline init', function() {
    // See if the appliance properly converts the non-javascript
    // table to the outline workspace.
    expect(3);
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline();
    setTimeout(function() {
	start()
	$workspace.children('.children').children('.heading').first().each(function() {
	    var heading = $(this).data('nodeOutline');
	    equal(
		heading.populated,
		true,
		'Heading ' + heading.node_id + ' populated'
	    );
	    equal(
	    	heading.$workspace.attr('id'),
	    	'test_workspace',
	    	'Each heading has a $workspace data attribute'
	    );
	    ok(
		heading.expandable,
		'Each heading has the expandable element set'
	    );
	});
    }, (ajax_timer * 5.5 + 5));
});

asyncTest('Creates #add-heading button', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline();
    setTimeout(function() {
	start();
	equal(
	    $workspace.children('#add-heading').length,
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
	    deepEqual(
		$(this).data('nodeOutline').COLORS, 
		expected_colors, 
		'outline_heading object has COLORS set'
	    );
	    equal(
		$(this).children('.ow-hoverable').children('.clickable').css('color'), 
		'rgb(0, 0, 255)', 
		'Level 1 heading is blue'
	    );
	});
	start();
    }, (ajax_timer * 1.1 + 5));
});

asyncTest('Set todo states', function() {
    expect(5);
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({
	todo_states: todo_state_list
    });
    setTimeout(function() {
	start();
	$workspace.children('.children').children('.heading').each(function() {
	    equal(
		$(this).data('nodeOutline').$workspace.attr('id'),
		'test_workspace',
		'Child ' + $(this).data('node_id') + ' has data(\'$workspace\')'
	    );
	    equal(
		$(this).data('nodeOutline').todo_states[1].display,
		'NEXT',
		'NEXT state accessible through heading object'
	    );
	});
	var $todo = $workspace.children('.children').children('.heading[node_id="1"]').children('.ow-hoverable').children('.todo-state');
	equal($todo.html(), 'NEXT', 'Todo state element selectable');
	$todo.click();
    }, (ajax_timer * 1.1 + 5));
});

asyncTest('Archived nodes', function() {
    var $workspace = $('#test_workspace');
    $workspace.nodeOutline({
	todo_states: todo_state_list
    });
    setTimeout(function() {
	start();
	var $checkbox = $workspace.find('input.show-all');
	equal(
	    $checkbox.length,
	    1,
	    'show-all checkbox exists'
	);
	var $archived = $workspace.find('.heading.archived');
	equal(
	    $archived.length,
	    2,
	    'Found two archived headings'
	);
	var $archived1 = $workspace.find('.heading.archived[node_id="5"]');
	var $archived2 = $workspace.find('.heading.archived[node_id="4"]');
	var archived1 = $archived1.data('nodeOutline');
	var archived2 = $archived2.data('nodeOutline');
	ok(
	    ! archived1.$parent.hasClass('expandable'),
	    'Parent of only archived nodes is not expandable'
	);
	// Check show-all box
	$checkbox.click();
	ok(
	    archived1.$parent.hasClass('expandable'),
	    'Parent of only archived node becomes expandable on checkbox click'
	);
	// Un-check show-all box
	$checkbox.click();
	ok(
	    ! archived1.$parent.hasClass('expandable'),
	    'Parent of only archived node becomes un-expandable on second checkbox click'
	);
	ok(
	    archived2.$parent.hasClass('expandable'),
	    'Parent of mixed nodes stays expandable after second checkbox click'
	);
    }, (ajax_timer * 5.5 + 5) );
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

asyncTest('Hidden status correct after click', function() {
    var $todo = $('#todo-test');
    $todo.attr('todo_id', 1);
    $todo.todoState({
	states: todo_state_list,
	node_id: 5,
	click: function() {$('body').data('test_value', true);}
    });
    var $popover = $todo.next('.popover');
    equal(
	$todo.css('display'),
	'block',
	'Non-zero todo state is visible before interaction'
    )
    $todo.click();
    $popover.find('.todo-option[todo_id="0"]').click()
    equal(
	$popover.css('display'),
	'none',
	'Popover hidden after todo-option clicked'
    );
    setTimeout(function() {
	start();
	equal(
	    $todo.attr('todo_id'),
	    '0',
	    '$todo element has todo_id attribute set'
	)
	equal(
	    $todo.css('display'),
	    'none',
	    'Todo state is hidden after zero todo-state is chosen'
	)
    }, (ajax_timer * 1.1 + 5))
});

asyncTest('Auto-hide feature does not trigger for switching to regular nodes', function() {
    var $todo = $('#todo-test')
    $todo.attr('todo_id', 0);
    $todo.todoState({
	states: todo_state_list,
	node_id: 1,
	click: function() {$('body').data('test_value', true);}
    });
    var $popover = $todo.next('.popover');
    equal(
	$todo.css('display'),
	'none',
	'Zero todo state is hidden before interaction'
    )
    $todo.click();
    $popover.find('.todo-option[todo_id="2"]').click()
    equal(
	$popover.css('display'),
	'none',
	'Popover hidden after todo-option clicked'
    );
    setTimeout(function() {
	start();
	equal(
	    $todo.attr('todo_id'),
	    '2',
	    '$todo element has todo_id attribute set'
	)
	equal(
	    $todo.css('display'),
	    'block',
	    'Todo state is visible after non-zero todo-state is chosen'
	)
    }, (ajax_timer * 1.1 + 5))
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



module_name = 'Node Edit Dialog';
module(module_name);
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


asyncTest('nodeEdit(\'update\') method', function() {
    var $button = $('#edit-btn');
    $button.nodeEdit({url: '/gtd/nodes/6/edit/',
		      target: '#node-detail',
		     });
    setTimeout( function() {
	start();
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
	equal(
	    $option.attr('selected'),
	    'selected',
	    'New option has selected attribute'
	);
	var settings = $button.data('nodeEdit');
	equal(
	    settings.todo_id,
	    2,
	    '.data(\'nodeEdit\') is updated'
	);
    }, ajax_timer * 1.1 + 5);
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
	    $select.find('option[selected]').attr('value'),
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
	'Form with no validation returns true'
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
    validate_node($bad_form);
    var $bad_int = $bad_form.find('#bad-int');
    ok(
	$bad_int.hasClass('invalid'),
	'Non-numbers marked as invalid'
    );
});
    
