$(document).ready(function(){
    // Set up timepicker functionality
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
	this.COLORS = ['black'];
    }
    else { // Find the parent and get its info
	this.parent_id = Number(args['parent_id']);
	var s = '.heading[node_id="' + this.parent_id + '"]';
	this.$parent = $(s);
	var parent = this.$parent.data('object');
	if (typeof parent == 'undefined') {
	    this.COLORS = ['black']; // Default if no colors set
	}
	else {
	    this.COLORS = this.$parent.data('object').COLORS;
	    this.todo_states = parent.todo_states;
	}
	this.level = (this.$parent.data('level') + 1);
    }
    // Determine the width of icon that is being used
    var $body = $('body');
    $body.append('<i id="7783452" class="' + this.ICON + '"></i>');
    this.icon_width = Number($body.find('#7783452').css('width').slice(0,-2));
    $('#7783452').remove();
    // Methods...
    this.as_html = function() {
	// Render to html
	var new_string = '';
	new_string += '<div class="heading" node_id="' + this.node_id + '">\n';
	new_string += '<div class="ow-hoverable">\n';
	new_string += '<i class="clickable ' + this.ICON + '"></i>\n';
	    new_string += '<span class="todo_state">';
	if (this.todo) {
	    new_string += this.todo;
	}
	else {
	    new_string += '[]';
	}
	new_string += '</span>\n';
	new_string += '<div class="clickable">\n';
	new_string += this.title + '\n';
	new_string += '</div>\n';
	new_string += '<div class="ow-buttons">\n';
	new_string += '<i class="icon-plus"></i>\n';
	new_string += '<i class="icon-ok"></i>\n';
	new_string += '</div>\n';
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
	this.$hoverable = this.$element.children('.ow-hoverable');
	this.$clickable = this.$hoverable.children('.clickable');
	var $todo_state = this.$hoverable.children('.todo_state');
	var $buttons = this.$hoverable.children('.ow-buttons');
	this.$buttons =	$buttons;
	this.$element.data('title', this.title);
	this.$element.data('text', this.text);
	this.$element.data('node_id', this.node_id);
	this.$element.data('todo_id', this.todo_id);
	this.$element.data('todo', this.todo);
	this.$element.data('tags', this.tags);
	this.$element.data('level', this.level);
	this.$element.data('populated', false);
	this.$element.data('object', this);
	if (typeof this.$parent != 'undefined') {
	    this.$element.data('$workspace', this.$parent.data('$workspace'));
	}
	this.$clickable.data('$parent', this.$element);
	// Set color
	var color_i = this.level % this.COLORS.length;
	this.color = this.COLORS[color_i-1];
	this.$children = this.$element.children('.children');
	this.$text = this.$element.children('.ow-text');
	// Set initial CSS
	this.$clickable.css('color', this.color);
	this.$children.css('display', 'none');
	this.$buttons.css('visibility', 'hidden');
	this.$text.css('display', 'none');
	this.set_indent(this.$children, 1);
	this.set_indent(this.$text, 1);
	if (!this.todo) {
	    $todo_state.css('display', 'none');
	}
	// Attach event handlers
	this.$clickable.click(function() {
	    var saved_heading = $(this).data('$parent').data('object');
	    saved_heading.toggle();
	});
	this.$hoverable.mouseenter(function() {
	    $buttons.css('visibility', 'visible');
	    $todo_state.css('display', 'inline');
	});
	this.$hoverable.mouseleave(function() {
	    $buttons.css('visibility', 'hidden');
	    if (!$(this).parent().data('object').todo){
		$todo_state.css('display', 'none');
	    }

	});
	var todo_states = this.todo_states;
	this.$hoverable.children('.todo_state').click(function() {
	    // Switch out for a select box when the user click a TodoState
	    var $select_box = $(this).children('select');
	    if ($select_box.length == 0) {
		// Only modify if a select box doesn't exist
		var new_html = '';
		new_html += '<select>\n';
		for(var i=0; i<todo_states.length; i++) {
		    new_html += '<option value="' + todo_states[i].todo_id + '">\n';
		    new_html += todo_states[i].todo + '\n';
		    new_html += '</option>\n';
		}
		new_html += '</select>\n';
		$(this).html(new_html);
		$(this).children('select').change(function() {
		    console.log('clicked');
		});
	    }
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
	$add.css('color', this.COLORS[this.level]);
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
	    // (callback) Process AJAX to get an array of children objects
	    var children = response['children'];
	    for (var i = 0; i < children.length; i++) {
		children[i].parent_id = response['parent_id'];
		var child = new outline_heading(children[i]);
		child.create_div(parent.$children);
	    }
	    // Create the DOM elements
	    parent.$children.children('.loading').remove()
	    //parent.create_add_button();
	    parent.$element.data('populated', true);
	    var populated = true;
	    if (typeof extra_callback == 'function') {
		extra_callback();
	    }
	});
    };
    this.toggle = function() {
	// Show or hide the children div based on present state
	var $icon = this.$element.children('.ow-hoverable').children('i.clickable');
	if ($icon.hasClass('icon-chevron-right')) {
	    var new_icon_class = 'icon-chevron-down';
	    $icon.removeClass('icon-chevron-right');
	}
	else {
	    var new_icon_class = 'icon-chevron-right';
	    $icon.removeClass('icon-chevron-down');
	}
	$icon.addClass(new_icon_class);
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

var project_outline = function(args) {
    // Matches anchor tags for removal
    this.A_RE = '\</?a[^>]*\>';
    // Matches everything but leading and trailing whitespace
    this.WS_RE = '^[ \n\t]*((?:.|\n)*?)[ \n\t]*$';
    // Array of browser recognized colors for each level of nodes
    this.COLORS = ['blue', 'brown', 'purple', 'red', 'green', 'teal', 'slateblue', 'darkred'];
    this.$workspace = args['$workspace'];
    this.$workspace.data('$workspace', this.$workspace);
    this.todo_states = args['todo_states'];
    this.init = function () {
	// Initialize the workspace with data from AJAX request
	var new_headings = [];
	var this_a_re = this.A_RE;
	var this_ws_re = this.WS_RE;
	var parent_id = Number(this.$workspace.attr('node_id'));
	this.$workspace.html(''); // Clear old content
	this.$workspace.data('node_id', parent_id);
	var workspace = new outline_heading({
	    node_id: parent_id,
	    title: 'Outline Workspace',
	});
	workspace.COLORS = this.COLORS;
	workspace.color = this.COLORS[0];
	workspace.$children = this.$workspace;
	workspace.$element = this.$workspace;
	workspace.$element.addClass('heading');
	workspace.$element.data('object', this);
	workspace.$element.data('level', 0);
	workspace.level = 0;
	// Create all the first two levels of nodes
	workspace.populate_children(function() {
	    workspace.$element.children('.heading').each(function() {
		var subheading = $(this).data('object');
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
