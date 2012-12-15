// Set up timepicker functionality
$(document).ready(function(){
    $("input.datepicker").each(function(ct) {
	// Prepare a date field for the date picker widget
	$(this).wrap('<div class="date datepicker input-append" data-date></div>');
	$(this).after('<span class="add-on">\n<i class="icon-calendar"></i>\n</span>');
	var btn_width = $(this).next('span.add-on').outerWidth();
	var mod_width = $(this).width() - btn_width
	// Shrink the field by the size of the button
	$(this).width(mod_width);
	// The parent <div> has the datepicker class now
	$(this).removeClass('datepicker');
    });
    // Now apply the actual datepicker functionality
    $('.datepicker').each(function() {
	$(this).datepicker({format: 'yyyy-mm-dd'})
	    .on('changeDate', function() {
		$(this).datepicker('hide')});
    });
    $("input.timepicker").each(function(ct) {
	// Prepare a time field for the time picker widget
	$(this).wrap('<div class="bootstrap-timepicker-component input-append" data-date></div>');
	$(this).after('<span class="add-on">\n<i class="icon-time"></i>\n</span>');
	// Shrink the field by the size of the button
	var btn_width = $(this).next('span.add-on').outerWidth();
	var mod_width = $(this).width() - btn_width
	$(this).width(mod_width);
    });
}); // End of onReady

// Begin implementation of hierarchical expanding project list
var outline_heading = function(args) {
    this.ICON = 'icon-chevron-right';
    this.title = args['title'];
    if (typeof args['text'] == 'undefined') {
	args['text'] = '';
    }
    this.text = args['text'];
    if( typeof args['todo_id'] != 'undefined' ) {
	this.todo_id = Number(args['todo_id']);
	this.todo = args['todo'];
    }
    else {
	this.todo = '';
    }
    if( typeof args['node_id'] != 'undefined' ) {
	this.node_id = Number(args['node_id']);
    }
    this.tags = args['tags'];
    // Detect the location in the hierarchy
    if (typeof args['parent_id'] == 'undefined' ) {
	// Root level heading
	this.level = 1;
    }
    else { // Find the parent a get its info
	this.parent_id = Number(args['parent_id']);
	var s = '.heading[node_id="' + this.parent_id + '"]';
	this.$parent = $(s);
	this.level = (this.$parent.data('level') + 1);
    }
    // Determine the width of icon that is being used
    var $body = $('body');
    $body.append('<i id="7783452" class="' + this.ICON + '"></i>');
    this.icon_width = Number($body.find('#7783452').css('width').slice(0,-2));
    $('#7783452').remove();
    // Methods...
    this.as_html = function() {
	var new_string = '';
	new_string += '<div class="heading" node_id="' + this.node_id + '">\n';
	new_string += '<div class="clickable">\n';
	new_string += '<i class="' + this.ICON + '"></i>\n';
	new_string += this.todo + ' ' + this.title + '\n';
	new_string += '</div>\n';
	new_string += '<div class="ow-text">';
	new_string += this.text;
	new_string += '</div>\n';
	new_string += '<div class="children">\n';
	new_string += '<div class="loading">\n<em>Loading...</em>\n</div>\n';
	new_string += '</div>\n</div>\n';
	return new_string;
    };
    this.create_div = function($container) {
	// Create a new "<div></div>" element representing this heading
	$container.append(this.as_html());
	var new_selector = '.heading';
	new_selector += '[node_id="' + this.node_id + '"]';
	var $element = $(new_selector);
	this.$element = $element;
	this.$element.data('title', this.title);
	this.$element.data('text', this.text);
	this.$element.data('node_id', this.node_id);
	this.$element.data('todo_id', this.todo_id);
	this.$element.data('todo', this.todo);
	this.$element.data('tags', this.tags);
	this.$element.data('level', this.level);
	this.$element.data('populated', false);
	this.$children = this.$element.children('.children');
	this.$text = this.$element.children('.ow-text');
	this.$children.css('display', 'none');
	this.$text.css('display', 'none');
	this.set_indent(this.$children, 1);
	this.set_indent(this.$text, 1);
	this.$element.data('object', this);
	var $clickable = this.$element.children('.clickable');
	$clickable.data('$parent', this.$element);
	this.$element.children('.clickable').click(function() {
	    var saved_heading = $(this).data('$parent').data('object');
	    saved_heading.toggle();
	});
    };
    this.set_indent = function($target, offset) {
	var indent = (this.icon_width + 4) * offset;
	$target.css('margin-left', indent + 'px');
    };
    this.create_add_button = function() {
	// Adds a button for creating a new heading and connects its handler
	var html = '';
	html += '<div class="add-heading">\n';
	html += '<i class="icon-plus-sign"></i>Add heading\n';
	html += '</div>'
	this.$children.append(html);
	var $add = this.$children.children('.add-heading');
	$add.data('parent_id', this.node_id);
    };
    this.show_error = function($container) {
	var html = '';
	html += '<i class="icon-warning-sign"></i>\n';
	html += 'Error! Please refresh your browser\n';
	$container.html(html);
    };
    this.populate_children = function(extra_callback) {
	// Gets children via AJAX request and creates their div elements
	var url = '/gtd/nodes/' + this.node_id + '/children/';
	var $children = this.$children;
	var parent = this;
	$.getJSON(url, function(response) {
	    var children = response['children'];
	    for (var i = 0; i < children.length; i++) {
		var child = new outline_heading(children[i]);
		child.create_div(parent.$children);
	    }
	    parent.$children.children('.loading').remove()
	    parent.create_add_button();
	    parent.$element.data('populated', true);
	    populated = true;
	    if (typeof extra_callback == 'function') {
		extra_callback();
	    }
	});
    };
    this.toggle = function() {
	// Show or hide the children div based on present state
	var $icon = this.$element.children('.clickable').children('i')
	if ($icon.attr('class') == 'icon-chevron-right') {
	    var new_icon_class = 'icon-chevron-down';
	}
	else {
	    var new_icon_class = 'icon-chevron-right';
	}
	$icon.attr('class', new_icon_class);
	this.$text.slideToggle();
	this.$children.slideToggle();
	this.$children.children('.heading').each(function() {
	    // Populate the next level of children 
	    // in aniticipation of the user needing them
	    if ($(this).data('populated') == false) {
		$(this).data('object').populate_children();
	    }
	});
    };
};

var project_outline = function($workspace) {
    this.$workspace = $workspace;
    // Matches anchor tags for removal
    this.A_RE = '\</?a[^>]*\>';
    // Matches everything but leading and trailing whitespace
    this.WS_RE = '^[ \n\t]*((?:.|\n)*?)[ \n\t]*$';
    this.init = function () {
	// Initialize the workspace with data from AJAX request
	var new_headings = [];
	var this_a_re = this.A_RE;
	var this_ws_re = this.WS_RE;
	var parent_id = Number(this.$workspace.attr('node_id'));
	$workspace.html(''); // Clear old content
	$workspace.data('node_id', parent_id);
	var workspace = new outline_heading({
	    node_id: parent_id,
	    title: 'Outline Workspace',
	});
	workspace.$children = $workspace;
	workspace.$element = $workspace;
	workspace.populate_children(function() {
	    workspace.$element.children('.heading').each(function() {
		subheading = $(this).data('object');
		subheading.populate_children();
	    });
	});
    };
};

var get_heading = function (node_id) {
    // Accepts a node_id and returns the JQuery selected element
    node_id = Number(node_id); // In case a string was passed
    return $('.heading[node_id="' + node_id + '"]');
};
