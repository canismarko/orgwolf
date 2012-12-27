// Hold unit tests for the hierarchical expanding project outline view.
// Implementation held in orgwolf.js
var initial_html = $('#test_workspace').html();
var setup = function() {
    $('#test_workspace').html(initial_html);
};

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
var second_dict = {
    title: 'maybe get some food',
    node_id: '5',
    todo_id: '2',
    todo: 'NEXT',
};
var ajax_timer = 30; // how long fake ajax request takes (in milliseconds)
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
		todo: 'NEXT',
		tags: ':comp:',
		text: 'From Korea-Japan',
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
		node_id: 2,
		title: 'Buy a puppy',
		todo_id: 2,
		todo: 'NEXT',
		tags: ':car:',
		text: 'I should really buy a puppy because they\'re cute',
	    },
	    {
		node_id: 3,
		title: 'Pay my taxes',
		todo_id: 2,
		todo: 'NEXT',
		tags: '',
		text: '',
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
		node_id: 4,
		title: 'Take puppy to the vet',
		todo_id: 2,
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
	parent_id: 2,
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

var module_name = 'outline-appliance-test.js - ';
module(module_name + 'Heading');

test('outline object', function() {
    // Check if outline functionality exists
    equal(typeof project_outline, 'function', 'project_outline function exists')
});
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
    var saved_heading = heading.$element.data('object');
    equal(
	saved_heading.node_id,
	1,
	'Saved object node_id'
    );
});
test('create new heading object from sparse data', function() {
    var test_heading = new outline_heading(sparse_dict);
    equal(test_heading.title, 'test_title', 'Title is set');
    equal(test_heading.todo_id, null, 'Todo ID is set');
    equal(test_heading.todo, '', 'Todo state is set');
    equal(test_heading.tags, null, 'Tag string is set');
});
test('heading as_html method', function() {
    var test_heading = new outline_heading(sparse_dict);
    var expected_html = '<div class="heading" node_id="1">\n  <div class="ow-hoverable">\n    <i class="clickable icon-chevron-right"></i>\n    <span class="todo-state">[]</span>\n    <div class="popover right">\n      <div class="arrow"></div>\n      <div class="popover-title">Todo State</div>\n      <div class="popover-inner">\n      </div>\n    </div>\n    <div class="clickable">\n      test_title\n    </div>\n    <div class="ow-buttons">\n      <i class="icon-plus"></i>\n      <i class="icon-ok"></i>\n    </div>\n  </div>\n  <div class=\"ow-text\"></div>\n  <div class="children">\n    <div class="loading">\n      <em>Loading...</em>\n    </div>\n  </div>\n</div>\n';
    equal(test_heading.as_html(), expected_html, 'outline_heading.as_html() output');
});

test('heading create_div method', function() {
    // Make sure the outline_heading objects create_div method works as expected
    var test_heading = new outline_heading(full_dict);
    var $workspace = $('#test_workspace');
    $workspace.html('');
    test_heading.create_div($workspace);
    var $heading = $('#test_workspace').children('.heading');
    equal($heading.length, 1, '1 heading created');
    equal(test_heading.$element.attr('node_id'), '1', 'node_id set');
    equal(test_heading.$element.data('title'), 'test_title', 'title data attribute set');
    equal(
	test_heading.$element.data('text'), 
	'here\' some text that goes with it',
	'text data attribute set'
    );
    equal(
	test_heading.$element.children('.ow-text').text(),
	'here\' some text that goes with it',
	'text element created'
    );	
    equal(test_heading.$element.data('node_id'), 1, 'node_id data attribute set');
    equal(test_heading.$element.data('todo_id'), 1, 'todo_id data attribute set');
    equal(test_heading.$element.data('todo'), 'DONE', 'todo data attribute set');
    equal(test_heading.$element.data('tags'), ':comp:', 'tags data attribute set');
    equal(test_heading.$element.data('level'), 1, 'level data attribute set for root heading');
    equal(
	test_heading.$element.children('.children').css('display'),
	'none',
	'Initial children div is not displayed'
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
    equal($second.data('level'), 2, 'Set child data("level") attribute');
});

test('add function buttons', function() {
    setup();
    var $workspace = $('#test_workspace');
    var heading = new outline_heading(full_dict);
    heading.create_div($workspace);
    heading.create_add_button();
    equal(
	heading.$element.children('.children').children('.add-heading').data('parent_id'),
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
    //okay($buttons[0].hasClass('
});

asyncTest('populate children', function() {
    var $workspace = $('#test_workspace');
    var first = new outline_heading(full_dict);
    first.create_div($workspace);
    first.populate_children();
    setTimeout(function() {
	equal(
	    first.$element.find('.heading[node_id="2"]').data('title'),
	    'Buy a puppy',
	    'First child title data attribute set'
	);
	equal(
	    first.$element.data('populated'),
	    true,
	    'Parent \'populated\' data attribute set'
	);
	strictEqual(first.$element.data('populated'), true);
	start();
    }, (ajax_timer * 1.1 + 5));
});

test('Heading toggle() method', function() {
    var $workspace = $('#test_workspace');
    var heading = new outline_heading(full_dict);
    heading.create_div($workspace);
    equal(
	heading.$children.css('display'),
	'none',
	'.children starts off hidden'
    );
    var $icon = heading.$element.children('.ow-hoverable').children('i.clickable');
    ok($icon.hasClass('icon-chevron-right', 'Icon ends up closed'));
    heading.toggle();
    equal(
	heading.$children.css('display'),
	'block',
	'.children gets un-hidden on toggle'
    );
    ok($icon.hasClass('icon-chevron-down', 'Icon ends up open'));
});

asyncTest('Toggle clickable region on heading', function() {
    var $workspace = $('#test_workspace');
    setup();
    var outline = new project_outline({$workspace: $workspace});
    outline.init();
    setTimeout(function() {
	$workspace.find('.heading').each(function() {
	    // Check if all subheadings start unpopulated
	    var $subheading = $(this).children('.children').children('.heading');
	    $subheading.each(function() {
		equal(
		    $(this).data('populated'), 
		    false,
		    'node ' + $(this).data('node_id') + ' is unpopulated'
		);
	    });
	});
	$workspace.find('.heading').each(function() {
	    $(this).children('.ow-hoverable').children('.clickable').click();
	    equal(
		$(this).children('.children').css('display'),
		'block',
		'CSS display set properly'
	    );
		// This should actually pass but is being run too early I think
	});
	start();
    }, (ajax_timer * 1.1 + 5));
});

test('Hovering actions', function() {
    // When an .ow-hoverable action is hovered over, the relevant buttons show
    setup();
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
    equal(
	$hoverable.children('.todo-state').css('display'),
	'none',
	'Todo state is not displayed before mouse over'
    );
    // Tests after hover over
    $hoverable.mouseenter();
    equal(
	$hoverable.children('.ow-buttons').css('visibility'),
	'visible',
	'Buttons div is visible after mouse enter'
    );
    equal(
	$hoverable.children('.todo-state').css('display'),
	'inline',
	'Empty Todo state div is display after mouse enter'
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
    setup();
    // When '.todostate' spans are clicked, they become a combo select box.
    var $workspace = $('#test_workspace');
    var heading = new outline_heading(second_dict);
    heading.todo_states = [
	{todo_id: 1,
	 todo: 'NEXT'},
	{todo_id: 2,
	 todo: 'DONE'},
    ]
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
	2,
	'Two todo state options in popover'
    );
    // Now click the todo state and check properties
    $todo.click();
    equal(
	$popover.css('display'),
	'block',
	'Popover is displayed on todo state click'
    );
    equal(
	$popover.position().left,
	$todo.position().left + $todo.width(),
	'Todo popover is positioned right of todo state'
    );
    // Make sure it goes away when mouse leave
    heading.$element.children('.ow-hoverable').mouseleave();
    equal(
	$popover.css('display'),
	'none',
	'Heading disappers when mouse leaves \'.ow-hoverable\''
    );
});

test('Todo state popover', function() {
    setup();
    // When '.todostate' spans are clicked, they become a combo select box.
    var $workspace = $('#test_workspace');
    var heading = new outline_heading(second_dict);
    heading.todo_states = [
	{todo_id: 1,
	 todo: 'TODO'},
	{todo_id: 2,
	 todo: 'NEXT'},
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
	$popover.find('.todo-option[todo_id="2"]').html(),
	'NEXT*',
	'Current todo state has an asterisk'
    );
    equal(
	$popover.find('.todo-option[todo_id="1"]').html(),
	'TODO',
	'Other todo state has a white background'
    );
    // Hover-over
    var $option1 = $popover.find('.todo-option[todo_id="1"]')
    $option1.mouseenter();
    equal(
	$option1.css('background-color'),
	'rgb(223, 240, 216)',
	'Hovered element has background set'
    );
    $option1.mouseleave();
    equal(
	$option1.css('background-color'),
	'rgba(0, 0, 0, 0)',
	'Hovered element has background set'
    );
    
});

asyncTest('Todo state changing functionality', function() {
    var $workspace = $('#test_workspace');
    setup();
    var test_outline = new project_outline({$workspace: $workspace});
    test_outline.todo_states = [
	{todo_id: 1,
	 todo: 'DONE'},
	{todo_id: 2,
	 todo: 'NEXT'},
    ]
    test_outline.init();
    setTimeout(function() {
	start();
	console.log($workspace.html());
    }, (ajax_timer * 1.1 + 5));
});




module(module_name + 'Outline setup');

test('outline regular expressions', function() {
    // See that the regular expressions for cleaning up content are correct

    // removing anchors...
    var outline = new project_outline({$workspace: $('#test_workspace')});
    equal(typeof outline.A_RE, 'string', 'Anchors regular expression exists');
    var r = new RegExp(outline.A_RE, 'g');
    equal(r.exec('<a>'), '<a>', 'Matches simple opening anchor');
    var r = new RegExp(outline.A_RE, 'g');
    equal(r.exec('</a>'), '</a>', 'Matches simple closing anchor');
    var r = new RegExp(outline.A_RE, 'g');
    equal(r.exec('<a href="colon">'), '<a href="colon">', 'Match anchor with href');
    equal(
	'<a href="stuff">Hello, world</a>'.replace(r, ''),
	'Hello, world',
	'Replace anchors'
    );
    // stripping whitespace...
    equal(typeof outline.WS_RE, 'string', 'Whitespace regular expression exists');
    var r = new RegExp(outline.WS_RE, 'g');
    equal(r.exec('test string')[1], 'test string', 'No whitespace to strip');
    var r = new RegExp(outline.WS_RE, 'g');
    equal(r.exec('  \t \n \ntest string \n ')[1], 'test string', 'Surrounded by whitespace');
    var r = new RegExp(outline.WS_RE, 'g');
    equal(r.exec('\t \ntest st\nring \n\t')[1], 'test st\nring', 'Enclosed newline preserved');
    var r = new RegExp(outline.WS_RE, 'g');
    equal(r.exec('\n\t')[1], '', 'Only whitespace');
});

asyncTest('converts initial workspace', function() {
    // See if the function finds the existing workspace and sets the right number of children with the right attributes and data
    expect(10);
    var $workspace = $('#test_workspace');
    setup();
    var test_outline = new project_outline({$workspace: $workspace});
    test_outline.init();
    setTimeout(function() {
	equal($('#test_workspace > div.heading').length, 2, 'correct number of .heading divs');
	equal(
	    test_outline.$workspace.data('node_id'),
	    0,
	    'Set workspace node_id data attribute'
	);
	$('#test_workspace > div.heading').each(function() {
	    if( $(this).attr('node_id') == '1' ) {
		equal($(this).data('todo_id'), 1, 'Node 1 TodoState id correct');
		equal($(this).data('todo'), 'DONE', 'Node 1 TodoState correct');
		equal($(this).data('title'), 'Tasks', 'Node 1 title correct');
		equal($(this).data('tags'), '', 'Node 1 tags correct'); 
	    }
	    if( $(this).attr('node_id') == '2' ) {
		equal($(this).data('todo_id'), null, 'Node 2 TodoState id correct');
		equal($(this).data('todo'), '', 'Node 2 TodoState correct');
		equal($(this).data('title'), 'Expense reports', 'Node 2 title correct');
		equal($(this).data('tags'), ':comp:', 'Node 2 tags correct'); 
	    }
	});
	start();
    }, (ajax_timer * 1.1 + 5));
});

asyncTest('Populates children on outline init', function() {
    // See if the appliance properly converts the non-javascript
    // table to the outline workspace.
    expect(4);
    var $workspace = $('#test_workspace');
    setup();
    var outline = new project_outline({$workspace: $workspace});
    outline.init();
    setTimeout(function() {
	$workspace.children('.heading').each(function() {
	    equal(
		$(this).data('populated'), 
		true,
		'Heading ' + $(this).data('node_id') + ' populated'
	    );
	    equal(
		$(this).data('$workspace').attr('id'),
		'test_workspace',
		'Each heading has a $workspace data attribute'
	    );
	});
	start()
    }, (ajax_timer * 3.3 + 5));
});

asyncTest('Alternate colors', function() {
    var $workspace = $('#test_workspace');
    setup();
    var outline = new project_outline({$workspace: $workspace});
    var expected_colors = ['blue', 'brown', 'purple', 'red', 'green', 'teal', 'slateblue', 'darkred'];
    outline.init();
    deepEqual(
	outline.COLORS,
	expected_colors,
	'project_outline object has colors set'
    );
    setTimeout(function() {
	$workspace.children('.heading').each(function() {
	    deepEqual(
		$(this).data('object').COLORS, 
		expected_colors, 
		'outline_heading object has COLORS set'
	    );
	    equal(
		$(this).data('level'),
		1, 
		'Level has been set' + $(this).data('title')
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
    expect(7);
    var $workspace = $('#test_workspace');
    setup();
    var outline = new project_outline({
	$workspace: $workspace,
	todo_states: [
	    {todo_id: 1,
	     todo: 'NEXT'},
	    {todo_id: 2,
	     todo: 'DONE'},
	]
    });
    outline.init();
    equal(outline.todo_states[0].todo, 'NEXT', 'NEXT todo state set');
    equal(outline.todo_states[1].todo, 'DONE', 'DONE todo state set');
    setTimeout(function() {
	start();	    
	$workspace.children('.heading').each(function() {
	    equal(
		$(this).data('$workspace').attr('id'),
		'test_workspace',
		'Child ' + $(this).data('node_id') + ' has data(\'$workspace\')'
	    );
	    equal(
		$(this).data('object').todo_states[0].todo,
		'NEXT',
		'NEXT state accessible through heading object'
	    );
	});
	var $todo = $workspace.children('.heading').children('.ow-hoverable').children('.todo-state');
	equal($todo.html(), 'DONE', 'Todo state element selected');
	$todo.click();
    }, (ajax_timer*1.1+5));
});
