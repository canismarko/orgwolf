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

// jQuery plugin that allows for easily selecting todo states from a list
(function( $ ){
    $.fn.todoState = function(options) {
	// Process options
	var $todo = this;
	// Remove any links that may be in the todo_state element
	$todo.find('a').contents().unwrap();
	var todo_id = $todo.data('todo_id');
	var settings = $.extend(
	    {
		states: [
		    {todo_id: 0, display: '[None]'},
		],
		node_id: 0,
		click: (function() {}),
		parent_elem: $todo.parent()
	    }, options);
	// Helper function gets todo state given a todo_id
	var get_state = function(todo_id) {
	    var new_state = undefined;
	    for (var i=0; i<settings.states.length; i++) {
		if (settings.states[i].todo_id == todo_id) {
		    new_state = settings.states[i];
		}
	    }
	    return new_state;
	};
	var hide_popover = function() {
	    $popover.hide();
	    $todo.unbind('.autohide');
	};
	// function shows the popover and binds dismissal events
	var show_popover = function() {
	    $popover.show();
	    // Hide the popover if something else is clicked
	    $('body').one('click.autohide', function() {
		hide_popover();	
	    });
	    $popover.bind('click', function(e) {
	    	e.stopPropagation();
	    });
	    $todo.bind('click.autohide', function() {
		hide_popover();
	    });
	};
	// todo_id 0 has some special properties
	if (todo_id == 0) {
	    settings.parent_elem.mouseenter(function() {
		$todo.show();
	    });
	    settings.parent_elem.mouseleave(function() {
		$todo.hide();
	    });
	    settings.parent_elem.mouseleave();
	}
	// Create the popover div and set its contents
	var new_html = '';
	new_html += '<div class="popover right todostate">\n';
	new_html += '  <div class="arrow"></div>\n';
	new_html += '  <div class="popover-title">Todo State</div>\n';
	new_html += '  <div class="popover-inner">\n';
	new_html += '  </div>\n';
	new_html += '</div>\n';
	$todo.after(new_html);
	var $popover = $todo.next('.popover');
	var $inner = $popover.children('.popover-inner');
	// Set some css
	$popover.hide();
	$popover.css('position', 'absolute');
	// Add the todo state options to popover inner
	for (var i=0; i<settings.states.length; i++) {
	    var option_html = '';
	    option_html += '<div class="todo-option"';
	    option_html += ' todo_id="';
	    option_html += settings.states[i].todo_id;
	    option_html += '"';
	    if (settings.states[i].todo_id == todo_id) {
		option_html += ' selected';
	    }
	    option_html += '>';
	    option_html += settings.states[i].display;
	    option_html += '</div>\n';
	    $inner.append(option_html);
	}
	// Connect the todo states click functionality
	$todo.bind('click', function(e) {
	    e.stopPropagation();
	    $('.popover.todostate').hide(); // Hide all the other popovers
	    $todo = $(this);
	    // ...set the position (move this to the click() handler)
	    var new_left = $todo.position().left + $todo.width();
	    $popover.css('left', new_left + 'px');
	    var top = $todo.position().top;
	    var height = $todo.height();
	    var new_middle = top + (height/2);
	    var new_top = new_middle - ($popover.height()/2);
	    $popover.css('top', new_top + 'px');
	    show_popover();
	});
	// Connect the hover functionality
	var $options = $inner.children('.todo-option');
	$options.mouseenter(function() {
	    // Add the ow-hover class if it's not the currently selected option
	    if ($(this).attr('todo_id') != todo_id) {
		$(this).addClass('ow-hover');
	    }
	});
	$options.mouseleave(function() {
	    $(this).removeClass('ow-hover');
	});
	// Connect handler to change todo state when option is clicked
	$options.bind('click', function() {
	    var new_id = Number($(this).attr('todo_id'));
	    var $popover = $(this).parent().parent();
	    var heading = $popover.parent().parent().data('object');
	    var url = '/gtd/nodes/' + settings.node_id + '/edit/';
	    var data = {
		format: 'json',
		todo_id: new_id,
	    };
	    // Avoid dismissing if same todo state selected
	    if (new_id != todo_id) {
		// If todo state is being changed then...
		$.getJSON(url, data, function(response) {
		    // (callback) update the document todo states after change
		    if (response['status']=='success') {
			$todo.data('todo_id', response['todo_id']);
			todo_id = response['todo_id'];
			$todo.html(get_state(response['todo_id']).display);
			$options.removeAttr('selected'); // clear selected
			var s = '.todo-option[todo_id="';
			s += response['todo_id'] + '"]';
			$inner.children(s).attr('selected', '');
			// Run the user submitted callback
			settings.click(response);
			// Kludge to avoid stale css
			$todo.mouseenter();
			$todo.mouseleave();
		    }
		});
		hide_popover();
	    }
	});

	return this;
    };
})(jQuery);

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
	this.todo_id = 0
	this.todo = '[None]';
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
	// This is just the skeleton of the html
	// Actual values are added later using update_dom()
	var new_string = '';
	new_string += '<div class="heading" node_id="' + this.node_id + '">\n';
	new_string += '  <div class="ow-hoverable">\n';
	new_string += '    <i class="clickable ' + this.ICON + '"></i>\n';
	// Todo state
	new_string += '    <span class="todo-state"></span>\n';
	// title
	new_string += '    <div class="clickable ow-title"></div>\n';
	// Quick-action buttons
	new_string += '    <div class="ow-buttons">\n';
	new_string += '      <i class="icon-plus"></i>\n';
	new_string += '      <i class="icon-ok"></i>\n';
	new_string += '    </div>\n';
	new_string += '  </div>\n';
	// Child containers
	new_string += '  <div class="ow-text"></div>\n';
	new_string += '  <div class="children">\n';
	new_string += '    <div class="loading">\n';
	new_string += '      <em>Loading...</em>\n';
	new_string += '    </div>\n';
	new_string += '  </div>\n</div>\n';
	return new_string;
    };
    this.create_div = function($container) {
	// Create a new "<div></div>" element representing this heading
	$container.append(this.as_html());
	var new_selector = '.heading';
	new_selector += '[node_id="' + this.node_id + '"]';
	// Set selectors
	var $element = $(new_selector);
	var $hoverable = $element.children('.ow-hoverable');
	var $clickable = $hoverable.children('.clickable');
	var $todo_state = $hoverable.children('.todo-state');
	var $buttons = $hoverable.children('.ow-buttons');
	var $text = $element.children('.ow-text');
	var $title = $hoverable.children('.ow-title');
	this.$element = $element;
	this.$hoverable = $hoverable;
	this.$clickable = $clickable;
	this.$todo_state = $todo_state;
	this.$buttons =	$buttons;
	this.$text = $text;
	this.$title = $title;
	// Set initial dom data
	this.update_dom();
	// Set jquery data
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
	// Populate popover children
	// Set color based on indentation level
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
	// Attach event handlers
	this.$clickable.click(function() {
	    var saved_heading = $(this).data('$parent').data('object');
	    saved_heading.toggle();
	});
	this.$hoverable.mouseenter(function() {
	    $buttons.css('visibility', 'visible');
	});
	this.$hoverable.mouseleave(function() {
	    $buttons.css('visibility', 'hidden');
	});
	var todo_states = this.todo_states;
    };
    // Read the current object properties and update the
    // DOM element to reflect any changes
    this.update_dom = function() {
	var heading = this;
	// node_id
	this.$element.attr('node_id', this.node_id);
	this.$element.data('node_id', this.node_id);
	// todo_id
	this.$element.data('todo_id', this.todo_id);
	this.$todo_state.data('todo_id', this.todo_id);
	var new_todo = '[]';
	if (typeof this.todo_states == 'undefined') {
	    var num_todo_states = 0;
	}
	else {
	    var num_todo_states = this.todo_states.length;
	}
	for (var i=0; i<num_todo_states; i++) {
	    if (this.todo_states[i].todo_id == this.todo_id) {
		new_todo = this.todo_states[i].display;
	    }
	}
	this.$todo_state.html(new_todo);
	this.$todo_state.todoState({
	    states: this.todo_states,
	    node_id: this.node_id,
	    click: function(ajax_response) {
		heading.todo_id = ajax_response['todo_id'];
	    }
	});
	// Text div
	this.$text.html(this.text);
	// Title div
	this.$title.html(this.title);
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
    this.populate_todo_states = function($container) {
	var new_string = '';
	var active;
	if (typeof this.todo_states == 'undefined') {
	    var num_todo_states = 0;
	}
	else {
	    var num_todo_states = this.todo_states.length;
	}
	for (var i=0; i<num_todo_states; i++) {
	    if (this.todo_id == this.todo_states[i].todo_id) {
		active = true;
	    }
	    else {
		active = false;
	    }
	    new_string += '        <div todo_id="' + this.todo_states[i].todo_id + '"';
	    new_string += ' class="todo-option"';
	    if (active) {
		new_string += ' selected="selected"';
	    }
	    new_string += '>';
	    new_string += this.todo_states[i].display;
	    new_string += '</div>\n';
	}
	// Commit to document
	$container.html(new_string);
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
