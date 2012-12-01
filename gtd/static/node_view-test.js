// Holds QUnit tests that get imported by the global-test file: orgwolf/static/jstest.html
var module_name = 'node_view.js - ';
module(module_name + 'Heading');
test('pass-data', function() {
    // Check if a new heading can be made passing new data
    var test_heading = new heading({
	node_id: 1,
	html: 'Test node 1',
	tags: ''
    });
    equal(test_heading.id, 1);
    equal(test_heading.title, 'Test node 1');
    equal(test_heading.tags, '');
    equal(test_heading.level, 0);
    var workspace = $('#node-workspace');
    workspace.id = 0;
    deepEqual(test_heading.parent, workspace);
});
test('pass-parent_id', function() {
    // Check if the parent attribute is set properly
    var parent_heading = new heading({
	node_id: 1,
	html: 'Parent node 1',
	tags: '', 
	level: 0,
    });
    $('#qunit-fixture').html(parent_heading.as_html());
    var $parent = $('#heading1');
    equal($parent.attr('node_id'), '1');
    equal($parent.attr('level'), '0');
    var child_heading = new heading({
	node_id: 2,
	html: 'Child node 1',
	tags: ':home...^&#',
	parent_id: '1',
    });
    equal(child_heading.level, 1);
    equal(child_heading.parent.attr('node_id'), '1');
    equal(child_heading.parent.attr('title'), 'Parent node 1');
});
test('pass-heading_selector', function() {
    var parent_heading = new heading({
	node_id: 1,
	html: 'Parent node 1',
	tags: ':comp:magic:', 
	parent_id: '0',
    });
    $('#heading0').html(parent_heading.as_html());
    var new_heading = new heading({
	heading_div: $('#heading1')
    });
    equal(new_heading.id, 1);
    equal(new_heading.title, 'Parent node 1');
    equal(new_heading.tags, ':comp:magic:');
    equal(new_heading.level, 0);
});
test('High heading levels', function() {
    var parent_heading = new heading({
	node_id: 1,
	html: 'Parent node 1',
	tags: ':comp:magic:', 
    });
    parent_heading.level = 5;
    equal(parent_heading.level, 5);
    $('#qunit-fixture').html(parent_heading.as_html());
    var $parent = $('#heading1');
    equal($parent.attr('node_id'), '1');
    equal($parent.attr('level'), '5');
    var child_heading = new heading({
	node_id: 2,
	html: 'Child node 1',
	tags: ':home...^&#',
	parent_id: '1',
    });
    equal(child_heading.level, 6);
});
test('Set level when passing existing element', function() {
    var new_heading = new heading({
	node_id: 1,
	html: 'Parent node 1',
	tags: ':comp:magic:',
	parent_id: '0',
    });
    new_heading.level = 5;
    equal(new_heading.level, 5);
    var $fixture = $('#qunit-fixture')
    $fixture.html(new_heading.as_html());
    var $parent = $('#heading1');
    equal($parent.attr('node_id'), '1');
    equal($parent.attr('level'), '5');
    var existing_heading = new heading({
	heading_div: $parent});
    var child_heading = new heading({
	node_id: 2,
	html: 'Child node 1',
	tags: ':home...^&#',
	parent_id: '1',
    });
    equal(child_heading.level, 6);
    $fixture.html($fixture.html() + child_heading.as_html());
    var $heading_div = $('#heading2')
    equal($heading_div.attr('parent_id'), 1);
    var existing_heading = new heading({
	heading_div: $heading_div});
    equal(existing_heading.level, 6);
});
