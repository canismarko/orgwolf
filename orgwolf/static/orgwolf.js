// Function validates a form based on data-validate attribute
var validate_node = function($form) {
    var NOTBLANK_RE = /\S/;
    var NOTINT_RE = /\D/;
    var success = true;
    // Helper function to remove all the last error entries
    var reset_form = function( $form ) {
	$form.find('.error').remove();
	$form.find('.invalid').removeClass('invalid');
    };
    // Code execution starts here
    $form.each(function() {
	var $this_form = $(this);
	reset_form( $this_form );
	$(this).find('[data-validate]').each(function() {
	    var method = $(this).attr('data-validate')
	    if ( method == 'required' ) {
		// Required fields
		if ( ! NOTBLANK_RE.test($(this).attr('value'))) {
		    success = false;
		    $(this).focus();
		    $(this).addClass('invalid');
		    $(this).after('<span class="error"><br />This field is required</span>');
		}
	    } else if (method == 'date') {
		// Dates
		var s = $(this).attr('value')
		if ( NOTBLANK_RE.test(s) ) { // Ignore empty dates
		    var bits = s.split('-');
		    var d = new Date(bits[0], bits[1]-1, bits[2]);
		    if ( d.getFullYear() != bits[0] ||
			 d.getMonth() + 1 != bits[1] ||
			 d.getDate() != bits[2] ) {
			// Date does not match
			$(this).addClass('invalid');
			$(this).after('<span class="error"><br />Please enter a valid date in the form YYYY-MM-DD</span>');
			success = false;
			$(this).focus()
		    }
		}
	    } else if (method == 'time') {
		var s = $(this).attr('value')
		if ( NOTBLANK_RE.test(s) ) { // Ignore empty times
		    var bits = s.split(':');
		    var t = new Date(0, 0, 0, bits[0], bits[1]);
		    if ( t.getHours() != bits[0] ||
			 t.getMinutes() != bits[1] 
		       ) {
			// Time does not match
			$(this).addClass('invalid');
			$(this).after('<span class="error"><br />Please enter a valid 24-hour time in the form HH:MM</span>');
			success = false;
			$(this).focus();
		    }
		}
	    } else if (method == 'int') {
		var s = $(this).attr('value')
		if ( NOTBLANK_RE.test(s) && NOTINT_RE.test(s) ) { //Ignore empty fields
		    success = false;
		    $(this).focus();
		    $(this).addClass('invalid');
		    $(this).after('<span class="error"><br />Please enter an integer</span>');
		}
	    }
	});
	$(this).find('[data-requires]').each( function() {
	    // Check for elements requiring cross-reference validation
	    var $this = $(this);
	    if ( $this.attr('checked') ) {
		var reqs = $(this).attr('data-requires').split(',');
		for ( var i=0; i<reqs.length; i++ ) {
		    var $elem = $this_form.find(reqs[i]);
		    var s = $elem.attr('value');
		    if ( ! NOTBLANK_RE.test(s) ) {
			success = false;
			$(this).focus();
			$elem.addClass('invalid');
			$elem.parent().append('<span class="error"><br />Field required by ' +
		    				       $this.attr('id') + '</span>');
		    }
		}
	    }
	});
    })
    return success;
};

var attach_pickers = function( $target ) {
    if ( $.fn.datepicker ) {
	// Disable inputs for repeating information if checkbox is blank
	function repeating_toggle(selector) {
	    if ($target.find(selector).attr('checked') == 'checked') {
		$target.find('#id_repeating_number').removeAttr('disabled');
		$target.find('#id_repeating_unit').removeAttr('disabled');
		$target.find('#id_repeats_from_completion').removeAttr('disabled');
	    } else {
		$target.find('#id_repeating_number').attr('disabled', 'disabled');
		$target.find('#id_repeating_unit').attr('disabled', 'disabled');
		$target.find('#id_repeats_from_completion').attr('disabled', 'disabled');
	    }
	}
	$target.find('#id_repeats').click(function() {
	    repeating_toggle('#id_repeats');
	});
	repeating_toggle('#id_repeats');
	// Set up timepicker/datepicker functionality
	$target.find("input.datepicker").each(function(ct) {
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
	$target.find('.datepicker').each(function() {
	    $(this).datepicker({format: 'yyyy-mm-dd'})
		.on('changeDate', function() {
		    $(this).datepicker('hide')});
	});
	$target.find("input.timepicker").each(function(ct) {
	    // Prepare a time field for the time picker widget
	    $(this).wrap('<div class="bootstrap-timepicker-component input-append" data-date></div>');
	    $(this).after('<span class="add-on">\n<i class="icon-time"></i>\n</span>');
	    // Shrink the field by the size of the button
	    var btn_width = $(this).next('span.add-on').outerWidth();
	    var mod_width = $(this).width() - btn_width
	    $(this).width(mod_width);
	});
    // enable or disable the timepicker objects
    function timepicker_toggle(id_attr) 
	{
	    var checkbox = '#' + id_attr;
	    var input = '#id_' + $("#" + id_attr).attr('toggles');
	    var button = input + ' ~ span.add-on'
	    if ($target.find(checkbox).attr('checked') == 'checked')
	    {
		$target.find(input).removeAttr('disabled');
		$target.find(button).removeClass('disabled');
	    }
	    else
	    {
		$target.find(input).attr('disabled', 'disabled');
		$target.find(button).addClass('disabled');
	    }
	}
	// Disable scheduled/deadline time input if checkbox is blank
	$target.find('#id_scheduled_time_specific').click(function() {
	    timepicker_toggle($(this).attr('id'))});
	$target.find('#id_deadline_time_specific').click(function() {
	    timepicker_toggle($(this).attr('id'))});
	timepicker_toggle('id_scheduled_time_specific');
	timepicker_toggle('id_deadline_time_specific');
	$target.find('#id_scheduled_time').timepicker( {defaultTime: 'value',
							showMeridian: false});
	$target.find('#id_deadline_time').timepicker( {defaultTime: 'value',
						       showMeridian: false});
    }
};

$(document).ready(function(){
    attach_pickers( $('body') );
    // Add django CSRF token to all AJAX POST requests
    function getCookie(name) {
	var cookieValue = null;
	if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
		var cookie = jQuery.trim(cookies[i]);
		// Does this cookie string begin with the name we want?
		if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
		}
            }
	}
	return cookieValue;
    }
    var csrftoken = getCookie('csrftoken');
    $.ajaxSetup({
	beforeSend: function(xhr) {
	    xhr.setRequestHeader('X-CSRFToken', csrftoken);
	}
    });
}); // End of onReady


/*************************************************
* jQuery todoState plugin
* 
* Allows for AJAXically changing the todo-state of
*   a heading.
* 
* Process the following elements:
* - $(this) has the current state.
*   - $(this).data('todo_id') should be the current
*     todo id.
* Options:
* - states: array of JSON objects describing the
*   all the "in play" todo states:
*   {todo_id: <integer>, display: <string>}
*   A todo_id of 0 has special meaning (None)
* - node_id: id of the node to change by AJAX
*************************************************/
(function( $ ){
    // Define different methods inside this plugin
    var methods = {
	// Plugin initialization
	init: function( options ) {
	    return this.each(function() {
		// Process options
		var $todo = $(this);
		var data = $todo.data('todoState');
		// Initialize if not already done
		if ( !data ) {
		    // Remove any links that may be in the todo_state element
		    $todo.find('a').contents().unwrap();
		    var todo_id = $todo.attr('todo_id');
		    var settings = $.extend(
			{
			    states: [
				{pk: 0, display: '[None]'},
			    ],
			    todo_id: todo_id,
			    node_id: 0,
			    click: (function() {}),
			    parent_elem: $todo.parent()
			}, options);
		    // Helper function gets todo state given a todo_id
		    var get_state = function(todo_id) {
			var new_state = {
			    pk: -1,
			    display: '',
			    full: ''
			};
			for (var i=0; i<settings.states.length; i++) {
			    if (settings.states[i].pk == todo_id) {
				new_state = settings.states[i];
			    }
			}
			return new_state;
		    };
		    // Helper function for getting the current todo_id
		    settings.get_todo_id = function() {
			if ( this.heading ) {
			    return this.heading.todo_id;
			} else {
			    return this.todo_id;
			}
		    };
		    var curr_state = get_state(todo_id);
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
		    // Tooltip
		    $todo.tooltip({
			delay: {show:1000, hide: 100},
			title: 'click to change',
			placement: 'right'
		    });
		    $todo.attr('data-original-title', curr_state.full);
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
			option_html += settings.states[i].pk;
			option_html += '"';
			if (settings.states[i].pk == settings.get_todo_id()) {
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
			$todo.tooltip('hide');
			// ...set the position
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
			if ( ! $(this).attr('selected') ) {
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
			
			var heading = $popover.parent().parent().data('nodeOutline');
			var url = '/gtd/node/' + settings.node_id + '/edit/';
			var payload = {
			    format: 'json',
			    todo_id: new_id,
			};
			// Avoid dismissing if same todo state selected
			if ( new_id != settings.get_todo_id() ) {
			    // If todo state is being changed then...
			    $.post(url, payload, function(response) {
				var response = $.parseJSON(response);
				// (callback) update the document todo states after change
				if (response['status']=='success') {
				    if ( settings.heading ) {
					var heading = settings.heading;
					var old = heading.todo_id;
					heading.todo_id = response['todo_id'];
				    } else {
					var old = $todo.attr('todo_id');
					$todo.attr('todo_id', response['todo_id']);
					todo_id = response['todo_id'];
				    }
				    var new_state = get_state(response['todo_id']);
				    $todo.html(new_state.display);
				    $todo.attr('data-original-title', new_state.full);
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
			    }); // end of $.post
			    hide_popover();
			}
		    });
		    // save the options
		    $todo.data('todoState', settings);
		}
	    });
	}, // end of init method
	update: function( options ) {
	    // Update the parameters of the todoState with new values
	    this.each( function() {
		var $todo = $(this);
		var data = $todo.data('todoState');
		var $popover = $todo.next('.popover');
		if ( typeof options.todo_id != 'undefined' ) {
		    // if a new todo_id is being assigned
		    data.todo_id = options.todo_id;
		    $todo.attr('todo_id', options.todo_id);
		    var s_all = '.todo-option';
		    var s_new = s_all + '[todo_id="' + options.todo_id + '"]';
		    $popover.find(s_all).removeAttr('selected');
		    $popover.find(s_new).attr('selected', 'selected');
		    var new_todo = data.states.filter( function ( state ) { 
		    	return state.pk == options.todo_id;
		    })[0];
		    $todo.html(new_todo.display);
		    if ( data.todo_id > 0 ) {
			$todo.show();
		    } else {
			$todo.hide();
		    };
		}
		$todo.data('todoState', data);
	    });
	} // end of update method
    };

    // Method selection magic
    $.fn.todoState = function( method ) {
	if ( methods[method] ) {
	    return methods[method].apply( this, Array.prototype.slice.call( arguments, 1));
	} else if ( typeof method === 'object' || !method ) {
	    return methods.init.apply( this, arguments );
	} else {
	    $.error( 'Method ' + method + ' does not exist on jQuery.todoState' );
	}
    };
})(jQuery);


/*************************************************
* jQuery Aloha plugin for AJAX text
* 
* This is a wrapper for the Aloha editor.
* It returns the new text to the server via AJAX
* 
* Process the following elements:
* - $(this) is the element that holds the text
* 
* Options:
*   None
*************************************************/
(function( $ ){
    $.fn.alohaText = function(options) {
	// Process options
	var $text_j = this;
	if ( typeof options != 'object' ) {
	    options = {}
	}
	options.$element = $text_j;
	if ( typeof options.$parent == 'undefined' ) {
	    options.$parent = options.$element.parent();
	}
	// Bind the aloha editor
	Aloha.ready(function() {
	    var $text_a = Aloha.jQuery($text_j);
	    $text_a.aloha()
	});
	// Save options
	$text_j.data('alohaText', options);
	return this;
    };
    // Bind the AJAX handler for changing the text
    $('document').ready(function() {
	Aloha.ready(function() {
	    console.log('# Todo: Switch Aloha editor to PubSub');
	    Aloha.bind('aloha-editable-deactivated', function(e, arg) {
		editable = arg.editable
		if (editable.snapshotContent!= editable.obj.html()) {
		    // If they text was changed, submit the ajax request
		    var $text = $(editable.obj.context);
		    var options = $text.data('alohaText');
		    if ( options ) { // Only if an AlohaText exists
			var $parent = options.$parent;
			var url = '/gtd/node/' + $parent.attr('node_id') + '/edit/';
			var new_text = $text.html();
			if ( new_text == '<br>' ) {
			    new_text = '';
			}
			var payload = {
			    format: 'json',
			    node_id: $parent.attr('node_id'),
			    text: new_text
			};
			console.log(new_text);
			$.post(url, payload, function(r) {
			    // Callback for aloha edit request
			    r = $.parseJSON(r);
			    // Update modal dialog with new text
			    var $modal = $parent.data('nodeOutline').$buttons.find('#edit-modal');
			    if ( $modal.length > 0 ) {
				$modal.each( function() {
				    var $text = $(this).find('#id_text');
				    var $aloha_text = $text.siblings('#id_text-aloha');
				    $text.html(r.text);
				    $aloha_text.html(r.text);
				});
			    }
			});
		    }
		}
	    });
	});
    });
})(jQuery);


/*************************************************
* jQuery nodeList plugin
* 
* Implements javascript for a next-actions style
* list.
* 
* Process the following elements:
* - $(this) is the element that holds the text
* 
* Options:
* - states: list of all todo state to be included
*   in the list.
*************************************************/
(function( $ ) {
    $.fn.nodeList = function(args) {
	this.find('.list-node').each(function() {
	    var node_id = $(this).attr('node_id');
	    var $todo = $(this).find('.todo-state');
	    var todo_id = $todo.attr('todo_id');
	    // Reset blank todo states to zero for proper handling
	    if (todo_id == '') {
		$todo.attr('todo_id', 0);
		$todo.html('[None]');
	    }
	    $todo.todoState({
		states: args.states,
		node_id: node_id
	    });
	});
	return this;
    }
})(jQuery);




// Begin implementation of hierarchical expanding project list
var GtdHeading = function GtdHeading( args ) {
    if ( ! args ) {
	args = {};
    }
    GtdHeading.ICON = 'icon-chevron-right';
    // Set defaults in the constructor
    //   Setting specific field values occurs in the set_fields() method
    //   which is called at the end of the constructor
    this.pk = 0;
    this.populated = false;
    this.text = '';
    this.todo_id = 0;
    this.archived = false;
    this.level = 1;
    // Determine the width of icon that is being used
    var $body = $('body');
    $body.append('<i id="7783452" class="' + GtdHeading.ICON + '"></i>');
    this.icon_width = Number($body.find('#7783452').css('width').slice(0,-2));
    $('#7783452').remove();
    // Now update the fields with passed values
    this.set_fields( args );
}; // end of GtdHeading constructor

// Methods for GtdHeading...
GtdHeading.prototype.set_fields = function( fields ) {
    // Updates properties based on dictionary of new fields
    // First make some modifications to the dictionary
    if ( typeof fields.title_html == 'undefined' ) {
	fields.title_html = fields.title;
    }
    if ( typeof fields.pk != 'undefined' ) {
	fields.pk = Number(fields.pk);
    }
    if ( typeof fields.is_leaf_node != 'undefined' ) {
	fields.has_children = ! fields.is_leaf_node;
	delete fields.is_leaf_node;
    }
    if ( typeof fields.todo_state != 'undefined' ) {
	fields.todo_id = fields.todo_state;
	delete fields.todo_state
    }
    if ( typeof fields.previous_sibling_id != 'undefined' ) {
	fields._previous_sibling = fields.previous_sibling_id;
	delete fields.previous_sibling_id;
    }
    // Now apply the dictionary
    for ( var field in fields ) {
	this[field] = fields[field];
    }
    return true;
}

GtdHeading.prototype.get_todo_state = function() {
    // Look through the outline.todo_state and return the correct
    // TodoState object
    var found_state = null;
    if ( typeof this.workspace != 'undefined' ) {
	for ( var i=0; i < this.workspace.todo_states.length; i++ ) {
	    var state = this.workspace.todo_states[i]
	    if ( state.pk == this.todo_id ) {
		found_state = state;
	    }
	}
    }
    if ( found_state ) {
	return found_state;
    } else {
	return {pk: this.todo_id};
    }
};
GtdHeading.prototype.set_selectors = function() {
    if ( this.level > 0 ) {
	// Determine how to find each piece of the heading
	var new_selector = '.heading';
	new_selector += '[node_id="' + this.pk + '"]';
	// Set selectors
	this.$element = this.workspace.$children.find(new_selector);
	this.$hoverable = this.$element.children('.ow-hoverable');
	this.$details = this.$element.children('.details');
	this.$children = this.$details.children('.children');
	this.$loading = this.$details.children('.loading');
	this.$clickable = this.$hoverable.children('.clickable');
	this.$todo_state = this.$hoverable.children('.todo-state');
	this.$icon = this.$hoverable.children('i');
	this.$text = this.$details.children('.ow-text');
	this.$buttons = this.$hoverable.children('.ow-buttons');
	this.$title = this.$hoverable.children('.ow-title');
    }
};
GtdHeading.prototype.as_html = function() {
    // Render to html
    // This is just the skeleton of the html
    // Actual values are added later using update_dom()
    var new_string = '';
    new_string += '<div class="heading" node_id="' + this.pk + '">\n';
    new_string += '  <div class="ow-hoverable">\n';
    new_string += '    <i class="twisty clickable ' + GtdHeading.ICON + '"></i>\n';
    // Todo state
    new_string += '    <span class="todo-state update" data-field="todo_abbr"></span>\n';
    // title
    new_string += '    <div class="clickable ow-title"></div>\n';
    // Quick-action buttons
    new_string += '    <div class="ow-buttons">\n';
    new_string += '      <i class="icon-pencil edit-btn" title="Edit"></i>\n';		    
    new_string += '      <i class="icon-arrow-right detail-btn" title="Detail view"></i>\n';
    new_string += '      <i class="icon-plus new-btn" title="New subheading"></i>\n';
    new_string += '    </div>\n';
    new_string += '  </div>\n';
    // Child containers
    new_string += '  <div class="details">\n';
    new_string += '    <div class="ow-text"></div>\n';
    new_string += '    <div class="children">\n';
    new_string += '    </div>\n';
    if ( this.has_children ) {
	new_string += '    <div class="loading">\n';
	new_string += '      <em>Loading...</em>\n';
	new_string += '    </div>\n';
    }
    new_string += '  </div>\n</div>\n';
    return new_string;
};
GtdHeading.prototype.create_div = function( $target ) {
    var heading = this;
    // Create a new "<div></div>" element representing this heading
    //  provided one does not already exist
    // First determine if creating the div is necessary
    if ( typeof this.$element == 'undefined' ) {
	var do_create = true;
    } else {
	this.set_selectors()
	if ( this.$element.length < 1 ) {
	    var do_create = true;
	} else if ( this.$element.length > 1 ) {
	    // Extras were created, erase and start over
	    this.$element.each( function() {
		$(this).remove()
	    });
	    var do_create = true;
	} else {
	    var do_create = false;
	}
    }
    // Then do the creating if necessary
    if (do_create && (this.level > 0)) {
	var node_id = this.pk;
	if ($target) {
	    var write = function(content) {
		$target.append(content);
	    };
	} else { // Try and find the container if none was specified
	    var previous = this.get_previous_sibling();
	    var me = this.pk;
	    var write;
	    if ( previous ) {
		previous.create_div(); // make sure the sibling exists;
		write = function(content) {
		    previous.$element.after(content);
		};
	    } else if ( this.workspace.get_heading(this.parent_id) ) {
		var workspace = this.workspace;
		var parent_id = this.parent_id;
		var $target = workspace.get_heading(parent_id).$children;
		write = function(content) {
		    $target.prepend(content);
		};
	    } else {
		return 1;
	    }
	}
	write(this.as_html());
	this.set_selectors();
	this.state = 'closed';
	this.$details.hide();
	// Apply tooltips
	this.$buttons.children('i').tooltip({
	    delay: {show:1000, hide: 100}
	});
	// Set color based on indentation level
	var COLORS = this.workspace.COLORS;
	var color_i = this.level % COLORS.length;
	this.color = COLORS[color_i-1];
	this.$clickable.css('color', this.color);
	this.set_indent(this.$children, 1);
	this.set_indent(this.$loading, 1);
	this.set_indent(this.$text, 1);
	// Attach event handlers
	var heading = this;
	this.$clickable.click(function() {
	    heading.toggle();
	});
	this.$buttons.find('.icon-arrow-right').click( function() {
	    window.location = '/gtd/node/' + node_id + '/';
	});
	this.$buttons.find('.edit-btn').click( function() {
	    // Modal dialog for editing this heading
	    var $this = $(this);
	    var $hoverable = $this.parent().parent();
	    var $heading = $hoverable.parent();
	    $hoverable.unbind('.autohide');
	    $this.nodeEdit( {
		$modal: heading.workspace.$edit_modal,
		heading: heading,
		show: true,
		target: $hoverable,
		node_id: node_id,
		changed: function(node) {
		    $hoverable.find('.todo-state').todoState(
			'update', {todo_id: node.todo_state}
		    );
		    heading.text = node.text;
		    heading.archived = node.archived;
		    heading.title = node.title;
		    var parent = heading.get_parent();
		    if ( parent) {
			parent.redraw();
		    } else {
			heading.redraw();
		    };
		},
	    });
	});
	this.$buttons.find('.new-btn').click( function() {
	    // Modal dialog for new children of this heading
	    var $this = $(this);
	    $this.parent().parent().unbind('.autohide');
	    $this.nodeEdit( {
		show: true,
		// parent_id: heading.pk,
		parent: heading,
		$modal: heading.workspace.$edit_modal,
		changed: function(node) {
		    node.workspace = heading.workspace;
		    console.log(typeof node);
		    var new_heading = new GtdHeading( node );
		    heading.workspace.headings.add(new_heading);
		    var parent = new_heading.get_parent();
		    parent.has_children = true;
		    parent.redraw();
		    parent.open();
		},
	    });
	});
	var todo_states = this.todo_states;
	return 1;
    }
}; // end of GtdHeading.create_div()
GtdHeading.prototype.get_previous_sibling = function() {
    return this.workspace.headings.get(
	{pk: Number(this._previous_sibling)}
    );
};
GtdHeading.prototype.get_parent = function() {
    return this.workspace.headings.get({pk: this.parent_id});
}
GtdHeading.prototype.get_children = function() {
    return this.workspace.headings.filter({parent_id: this.pk});
}
GtdHeading.prototype.is_expandable = function() {
    // Return true if the heading has information that
    // can be seen by expanding a twisty.
    if ( this.level == 0 ) {
	// The main workspace is always expandable
	return true;
    }
    if  ( this.text ) {
	// Anything with text is always expandable
	return true;
    } else if ( this.workspace.show_all ) {
	// Any children are visible
	if ( this.has_children ) {
	    return true;
	} else {
	    return false;
	}
    } else {
	// Only non-archived children are visible
	if ( this.get_children().filter({archived: false}).length ) {
	    return true
	} else if ( this.populated == false && this.has_children ) {
	    return true;
	} else {
	    return false;
	}
    }
};
// Read the current object properties and update the
//   DOM element to reflect any changes
GtdHeading.prototype.redraw = function() {
    // Test the various parts and update them as necessary
    //   then call redraw on all children
    this.set_selectors();
    this.create_div();
    // Set CSS classes
    if (this.text) {
	// Always show if there's text
	this.$element.addClass('expandable');
	this.$element.removeClass('lazy-expandable');
	this.$element.removeClass('arch-expandable');
    } else if (this.workspace.show_all && this.has_children) {
	// If show_all box is checked then any heading
	//   with children is expandable
	this.$element.addClass('expandable');
	this.$element.removeClass('lazy-expandable');
	this.$element.removeClass('arch-expandable');
    } else if ( this.populated && this.has_children ) {
	if ( this.get_children().filter({archived: false}).length > 0 ) {
	    this.$element.addClass('expandable');
	    this.$element.removeClass('lazy-expandable');
	    this.$element.removeClass('arch-expandable');
	} else {
	    this.$element.addClass('arch-expandable');
	    this.$element.removeClass('expandable');
	    this.$element.removeClass('lazy-expandable');
	}
    } else if ( this.has_children ) {
	this.$element.addClass('lazy-expandable');
	this.$element.removeClass('expandable');
	this.$element.removeClass('arch-expandable');
    } else {
	this.$element.removeClass('lazy-expandable');
	this.$element.removeClass('expandable');
	this.$element.removeClass('arch-expandable');
    }
    if ( this.state == 'open' && this.is_expandable() ) {
	this.$element.addClass('open');
    } else {
	this.$element.removeClass('open');
    }
    if ( this.workspace.show_all ) {
	this.$element.removeClass('archived');
	this.$element.slideDown(
	    this.workspace.ANIM_SPEED
	);
    } else if ( this.archived ) {
	this.$element.addClass('archived');
	this.$element.slideUp(
	    this.workspace.ANIM_SPEED
	);
    } else {
	this.$element.removeClass('archived');
	this.$element.slideDown(
	    this.workspace.ANIM_SPEED
	);
    }
    // Set content
    if ( this.$todo_state ) {
	var todo_state = this.get_todo_state();
	if ( todo_state.pk > 0 ) {
	    this.$todo_state.html(todo_state.display);
	} else {
	    this.$todo_state.html('');
	}
	// Attach the todoState plugin
	var heading = this;
	this.$todo_state.todoState({
	    states: this.workspace.todo_states,
	    node_id: this.pk,
	    heading: this,
	    click: function(ajax_response) {
		heading.todo_id = ajax_response['todo_id'];
	    }
	}); // end of todoState plugin
    }
    if ( this.$title ) {
	this.$title.html(this.title_html);
    }
    if ( this.$text && this.text ) {
	// If text exists, display it
	this.$text.html(this.text);
	this.$text.alohaText({$parent: this.$element});
    }
    if ( this.populated ) {
	// Get rid of loading... indicator if expired
	this.$element.addClass('populated');
    }
    // Redraw children
    var children = this.workspace.headings.filter(
	{parent_id: this.pk}
    );
    for ( var i=0; i < children.length; i++ ) {
	children[i].redraw();
    }
}
GtdHeading.prototype.set_indent = function($target, offset) {
    var indent = (this.icon_width + 4) * offset;
    $target.css('margin-left', indent + 'px');
};
GtdHeading.prototype.show_error = function($container) {
    var html = '';
    html += '<i class="icon-warning-sign"></i>\n';
    html += 'Error! Please refresh your browser\n';
    $container.html(html);
};
GtdHeading.prototype.populate_children = function(options) {
    // Gets children via AJAX request and creates their div elements
    if ( typeof options == 'undefined' ) {
	options = {};
    }
    var url = '/gtd/node/' + this.pk + '/descendants/';
    var ancestor = this;
    var get_nodes = function(options) {
	// Get immediate children
	var payload = {offset: options.offset};
	$.getJSON(url, payload, function(response) {
	    // (callback) Process AJAX to get an array of children objects
	    if ( response['status'] == 'success' ) {
		var nodes = response['nodes'];
		// Process each node in the response
		for ( var i=0; i < nodes.length; i++ ) {
		    var node = nodes[i];
		    node.workspace = ancestor.workspace;
		    var heading = new GtdHeading(node);
		    var parent = heading.get_parent();
		    if ( parent ) {
			// Only add this heading if the parent exists
			ancestor.workspace.headings.add(heading);
			heading.create_div();
			// Remove the loading... indicator
			if ( (!parent.populated) && parent.$details) {
			    if ( options.offset == 1 ) {
				parent.$loading.slideUp(
				    parent.workspace.ANIM_SPEED
				);
			    } else {
				parent.$loading.hide();
			    }
			}
			parent.populated = true;
		    }
		}
		ancestor.redraw();
		// Now show the new children gracefully
		if ( (options.offset == 1) && parent) {
		    parent.$children.slideDown(
			parent.workspace.ANIM_SPEED
		    );
		}
	    }
	});
    };
    if ( ! this.populated ) {
	if ( this.level > 0 ) {
	    this.$children.hide();
	}
	get_nodes( {offset: 1} );
    }
    if ( ! this.populated_level_2 ) {
	get_nodes({offset: 2});
	this.populated_level_2 = true;
    }
}; // end this.populate_children()
GtdHeading.prototype.open = function() {
    // Opens a toggleable heading and populates its children
    this.state = 'open';
    this.$details.slideDown(
	this.workspace.ANIM_SPEED
    );
    this.populate_children();
    this.redraw();
};
GtdHeading.prototype.close = function() {
    // Closes a toggleable heading
    this.state = 'closed';
    this.$details.slideUp(
	this.workspace.ANIM_SPEED
    );
    this.redraw();
};
GtdHeading.prototype.toggle = function( direction ) {
    // Show or hide the children div based on present state
    if(this.state == 'open') {
	this.close();
    } else if (this.state == 'closed') {
	this.open();
    }
};

// End of GtdHeading definition

/*************************************************
* jQuery nodeOutline plugin
* 
* Creates a twisty-style hieararchy based on DOM
* data. Fetches the contents by AJAX.
* 
* Process the following elements:
* - $(this) is the container. Looks for 
*   data-node-id to get node_id of parent.
*
*************************************************/
(function( $ ){
    // Define different methods inside this plugin
    var methods = {
	// Plugin initialization
	init: function( args ) {
	    // Subclass an array that holds headings
	    var HeadingManager = function() {
		var headings = new Array();
		// get returns a single heading object based on the query
		headings.get = function(query) {
		    return this.filter(query)[0];
		};
		headings.filter = function(criteria) {
		    // Step through the list and filter by any
		    // properties listed in criteria object
		    var filtered = new HeadingManager();
		    for ( var i = 0; i < this.length; i++ ) {
			var heading = this[i];
			var passed = true;
			for ( var key in criteria ) {
			    // check each criterion, reject if it fails
			    if ( heading[key] !== criteria[key] ) {
				passed = false;
			    }
			}
			if (passed) {
			    filtered.push(heading)
			}
		    }
		    return filtered;
		}; // end of filter() method
		headings.order_by = function(field) {
		    // Accepts a string and orders according to
		    // the field represented by that string.
		    // '-field' reverses the order.
		    var fields = /^(-)?(.*)$/.exec(field);
		    var sorted = this.slice(0);
		    var compare = function( a, b ) {
			var num_a = Number(a[fields[2]]);
			var num_b = Number(b[fields[2]]);
			if ( num_a && num_b ) {
			    // Sorting by number
			    return num_a - num_b;
			} else {
			    // Sorting by alphabet
			    if ( a < b ) {
				return -1;
			    } else if ( a > b ) {
				return 1;
			    } else {
				return 0
			    }
			}
		    };
		    sorted.sort(compare);
		    if ( fields[1] == '-' ) {
			sorted.reverse();
		    }
		    return sorted;
		}; // end of headings.order_by
		headings.add = function(new_heading) {
		    // Add or replace a heading based on pk
		    var other_heading = this.get({pk: new_heading.pk});
		    if ( other_heading ) {
			// Heading already exists so just update it
			for ( var key in new_heading ) {
			    other_heading[key] = new_heading[key];
			}
		    } else {
			// Heading doesn't exist so push it to the stack
			this.push(new_heading);
		    }
		};
		return headings;
		// filter returns itself with the appropriate filter applied
	    }; // end definition of HeadingManager()
	    // Code execution starts here
	    if ( !args ) {
		args = {};
	    }
	    if ( args.get_proto ) {
		return GtdHeading;
	    }
	    this.each(function() {
		// process each outline element
		var $this = $(this);
		var node_id = $this.attr('data-node_id')
		if ( node_id == '0' ) {
		    var header = 'Projects:';
		} else {
		    var header = 'Children:';
		}
		var data = {};
		// Some settings
		// Array of browser recognized colors for each level of nodes
		var COLORS = ['blue', 'brown', 'purple', 'red', 'green', 'teal', 'slateblue', 'darkred'];
		var ANIM_SPEED = 300;
		var workspace = new GtdHeading( {
		    pk: node_id,
		    title: 'Outline Workspace',
		});
		workspace.$element = $this;
		workspace.$element.addClass('heading');
		workspace.workspace = workspace;
		workspace.show_all = false;
		workspace.$element.data('nodeOutline', workspace);
		workspace.level = 0;
		workspace.COLORS = COLORS;
		workspace.ANIM_SPEED = ANIM_SPEED;
		workspace.state = 'open';
		workspace.color = workspace.COLORS[0];
		workspace.headings = new HeadingManager();
		if ( typeof args.todo_states != 'undefined' ) {
	    	    workspace.todo_states = args.todo_states
		} else {
	    	    workspace.todo_states = { todo_id: 0, display: '[None]' }
		}
		// Override some methods
		workspace.get_heading = function(pk) {
		    // Sort through the headings array and return the desired object
		    for( var i=0; i<this.headings.length; i++ ){
			if (this.headings[i].pk == pk ){
			    return this.headings[i];
			}
		    }
		};
		workspace.headings.add(workspace);
		// Sort through the elements in the old container and 
		// populate the headings array.
		$this.find('.ow-heading').each(function() {
		    var $row = $(this);
		    var pk = $row.attr('data-node_id');
		    var todo_id = $row.attr('data-todo_id');
		    var title = $row.attr('data-title');
		    var text = $row.attr('data-text');
		    var parent_id = workspace.pk;
		    var tags = $row.attr('data-tag_string');
		    var sibling_id = $row.attr('data-previous_sibling');
		    if ( $row.attr('data-is_leaf_node') == 'False' ) {
		    	var has_children = true;
		    } else {
		    	var has_children = false;
		    }
		    if (sibling_id == '') {
			sibling_id = undefined;
		    } else {
			sibling_id = Number(sibling_id);
		    }
		    var dict = {
			pk: pk,
			title: title,
			text: text,
			todo_state: todo_id,
			parent_id: parent_id,
			tags: tags,
			level: 1,
			previous_sibling_id: sibling_id,
			has_children: has_children,
			workspace: workspace
			   }
		    var heading = new GtdHeading(dict);
		    workspace.headings.add(heading);
		});
		// Clear old content and replace
		$this.html('<strong>' + header + '</strong><br />\n<div class="children"></div>');
		workspace.$children = $this.children('.children');
		var root_headings = workspace.headings.filter({level: 1});
		workspace.redraw();
		// Add some utility buttons at the end
		var h = '';
		h += '<div class="ow-buttons" id="add-heading">\n';
		h += '  <i class="icon-plus-sign"></i>Add Heading\n';
		h += '</div>\n';
		// Checkbox for showing archived nodes
		h += '<label class="checkbox" id="show-all-label">\n';
		h += '  <input class="ow-buttons show-all" type="checkbox">';
		h += '  </input>Show archived</label>\n';
		workspace.$element.append(h);
		// Archived checkbox toggles visibility of archived nodes
		workspace.$showall = $this.find('.show-all');
		workspace.$showall.bind('change.show-all', function (e) {
		    if ( workspace.show_all ) {
			workspace.show_all = false;
		    } else {
			workspace.show_all = true;
		    }
		    workspace.redraw();
		});
		workspace.$add = $this.find('#add-heading');
		// Retrieve the node edit modal form
		$.get('/gtd/node/new/',
		      { format: 'modal_form' },
		      function(response) {
			  workspace.$element.append(response);
			  workspace.$edit_modal = workspace.$element.children('#new-modal');
			  attach_pickers( workspace.$edit_modal );
			  // Now attach the nodeEdit plugin
			  workspace.$add.on('click', function(e) {
			      var $this = $(this);
			      $this.nodeEdit( {
				  show: true,
				  $modal: workspace.$edit_modal,
				  parent_id: workspace.pk,
				  changed: function(node) {
				      node.workspace = workspace;
				      new_heading = new GtdHeading( node );
				      workspace.headings.add(new_heading);
				      workspace.redraw()
				  }
			      });
			  });
		      });
		// Get all root children again
		//   Retrieves extra fields for editing plus archived nodes
		workspace.populated_level_2 = true; // supress loading grandchildren
		workspace.populate_children();
	    }); // end of this.each()
	}, // end of init method
    };
    // Method selection magic
    $.fn.nodeOutline = function( method ) {
	if ( methods[method] ) {
	    return methods[method].apply( this, Array.prototype.slice.call( arguments, 1));
	} else if ( typeof method === 'object' || !method ) {
	    return methods.init.apply( this, arguments );
	} else {
	    $.error( 'Method ' + method + ' does not exist on jQuery.todoState' );
	}
    };
})(jQuery); // end of nodeOutline plugin

/*************************************************
* jQuery agenda plugin
* 
* Adds javascript functionality to the select
* agenda element.
* 
* Process the following elements:
* - $('.daily') becomes the day specific section
* - $('.timely') becomes the time specific section
* - $('.deadlines') becomes the deadline section
* - $('form.date') allows the user to change the
*   the day the agenda represents ajaxically. It
*   should have a text input named "date"
*************************************************/

(function( $ ) {
    $.fn.agenda = function(options) {
	var $form = this.find('form.date');
	var $text = $form.find('input[name="date"][type="text"]');
	var $agenda = this;
	// Initialize data container if it doesn't exist
	if (!this.data('agenda')) {
	    this.data('agenda', {}); // Default settings go here
	}
	var data = $.extend(this.data('agenda'), options);
	// Try and get agenda date from div (otherwise set to today)
	var get_date = function(date_string) {
	    var RE = /(\d{4})-([01]?\d)-([0-3]?\d)/;
	    var result = RE.exec(date_string);
	    if (result) {
		var year = Number(result[1]);
		var month = Number(result[2])-1;
		var day = Number(result[3]);
		var new_date = new Date(year, month, day);
	    }
	    else {
		new_date = undefined;
	    }
		return new_date
	};
	data.date = get_date(this.attr('date'));
	if (!data.date) {
	    var now = new Date();
	    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	    data.date = today;
	}
	this.data('agenda', data);
	// function reloads the agenda ajaxically
	var update_agenda = function() {
	    var url = '/gtd/agenda/' + 
		data.date.getFullYear() + '-' +
		(data.date.getMonth()+1) + '-' +
		data.date.getDate() + '/';
	    $.getJSON(url, {format: 'json'}, function(response) {
		// (callback) Update the sections with the new agenda
		if (response.status == 'success') {
		    $agenda.find('.daily').html(response.daily_html);
		    $agenda.find('.timely').html(response.timely_html);
		    $agenda.find('.deadlines').html(
			response.deadlines_html);
		    var date_string = '';
		    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
				  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		    date_string += months[data.date.getMonth()] + '. ';
		    date_string += data.date.getDate() + ', ';
		    date_string += data.date.getFullYear();
		    $agenda.children('.date:header').html(date_string);
		};
	    });
	};
	// Re-appropriate the form submit button for AJAX
	$form.bind('submit', function() {
	    var new_date = get_date($text.val());
	    if (new_date) {
		data.date = new_date;
		$agenda.data('agenda', data);
		update_agenda();
	    }
	    else {
		// Improperly formatted date submitted
		jQuery.error('Improperly formatted date: ' + $text.val());
	    }
	    return false;
	});
	// Quick-change todo states
	$agenda.find('.todo-state').each(function() {
	    var node_id = $(this).parent().attr('node_id');
	    $(this).todoState({
		states: data.states,
		node_id: node_id,
		click: (function() {
		    update_agenda();
		})
	    });
	});
	return this;
    };
})(jQuery);

/*************************************************
* jQuery nodeEdit plugin
* 
* Modal dialog that allows editing of nodes
* 
* Accepts the following options:
* - args['url'] is the RESTFUL URL for editing
*   a node
* - args['target'] is the jQuery selector for the
*   element to search for .update elements.
* - args['changed']: callback function to be
*   executed after successful AJAX modification.
* - args['$modal']: the $modal form to use. If
*   not provided, the modal will be retrieved via
*   AJAX.
* - args['heading']: the heading that is being edited
*   if ommitted, assume creating a new node
* Process the following elements:
* - $(this) is the button that triggers the modal
* - .update (with obj['target']) will be updated
*   with returned data once form is submitted.
*   - attribute data-field holds the name of the
*   field to use for .update purposes.
*************************************************/

(function( $ ) {
    // Define different methods inside this plugin
    var methods = {
	// Initialization
	init: function( args ) {
	    if ( typeof args == 'undefined' ) {
		args = {};
	    }
	    // Determine what the correct URL is
	    var edit_url = '';
	    if ( args.url ) {
		edit_url = args['url'];
	    } else {
		if ( args.heading ) {
		    // Heading object was passed
		    edit_url = '/gtd/node/' + args.heading.pk + '/edit/';
		}
		else if ( args.node_id > 0 ) {
		    // Existing node
		    edit_url = '/gtd/node/' + args.node_id + '/edit/';
		} else if ( args.parent_id > 0 ) {
		    // new node with parent
		    edit_url = '/gtd/node/' + args.parent_id + '/new/';
		} else {
		    // New top-level node
		    edit_url = '/gtd/node/new/';
		}
	    }
	    var data = this.data('nodeEdit');
	    if ( args.parent ) {
		if ( data ) {
		    data.parent = args.parent;
		}
		args.parent_id = args.parent.pk;
	    }
	    if ( data ) {
		data.edit_url = edit_url;
		data.$modal.find('#edit_url').attr('value', edit_url);
	    } else {
		data = {edit_url: edit_url};
		var start_shown = args.show;
		var $target = $(args['target']);
		var $button = this;
		var node_id = args.node_id;
		var parent_id = args.parent_id;
		var changed = args['changed'];
		var on_modal = args['on_modal'];
		data.changed = changed
		data.heading = args['heading'];
		data.parent = args['parent'];
		data.on_modal = args['on_modal'];
		data.$target = $target;
		var toggle = function() {
		    if ( data.heading ) {
			// Set current values based on existing heading
			var heading = data.heading;
			data.$modal.find('.header-title').html(
			    'Edit "' + heading.title_html + '"');
			data.$modal.find('#id_title').attr('value', heading.title);
			data.$modal.find('#id_text').attr('value', heading.text);
			data.$modal.find('#id_text-aloha').html(heading.text);
			data.$modal.find('#id_tag_string').attr('value', heading.tag_string);
			if ( heading.archived ) {
			    data.$modal.find('#id_archived').attr('checked', 'checked');
			}
			// Scheduled information
			data.$modal.find('#id_scheduled_date').attr('value', heading.scheduled_date);
			data.$modal.find('#id_scheduled_time').attr('value', heading.scheduled_time);
			if ( heading.scheduled_time_specific ) {
			    data.$modal.find('#id_scheduled_time_specific').attr('checked', 'checked');
			}
			// Deadline information
			data.$modal.find('#id_deadline_date').attr('value', heading.deadline_date);
			data.$modal.find('#id_deadline_time').attr('value', heading.deadline_time);
			if ( heading.deadline_time_specific ) {
			    data.$modal.find('#id_deadline_time_specific').attr('checked', 'checked');
			}
			// Repeating information
			data.$modal.find('#id_repeating_number').attr('value', heading.repeating_number);
			if ( heading.repeats ) {
			    data.$modal.find('#id_repeats').attr('checked', 'checked');
			}			
			var s = 'option[value="' + heading.repeating_unit + '"]';
			data.$modal.find('#id_repeating_unit').find(s).attr('selected', 'selected');
			if ( heading.repeats_from_completion ) {
			    data.$modal.find('#id_repeats_from_completion').attr('checked', 'checked');
			}			
			// Priority
			var s = 'option[value="' + heading.priority + '"]';
			data.$modal.find('#id_priority').find(s).attr('selected', 'selected');
			// Find todo state
			if (heading.todo_id) {
			    data.$modal.find('#id_todo_state').children('option[value="' + heading.todo_id + '"]').attr('selected', 'selected');
			} else {
			    data.$modal.find('#id_todo_state').children('option[value="0"]').attr('selected', 'selected');
			}
			// Find scopes
			var $scope = data.$modal.find('#id_scope');
			for ( var i = 0; i < heading.scope.length; i++ ) {
			    var s = 'option[value="' + heading.scope[i] + '"]'
			    $scope.find(s).attr('selected', 'selected');
			}
			// Find related_projects
			var $project = data.$modal.find('#id_related_projects');
			for ( var i = 0; i < heading.related_projects.length; i++ ) {
			    var s = 'option[value="' + heading.related_projects[i] + '"]'
			    $project.find(s).attr('selected', 'selected');
			}
		    } else {
			// No heading, so clear current values
			var clear_text = ['#id_title', '#id_scheduled_date', '#id_scheduled_time', '#id_deadline_date', '#id_deadline_time', '#id_tag_string', '#id_text', '#id_repeating_number'];
			var clear_select = ['#id_todo_state', '#id_priority', '#id_related_projects', '#id_scope', '#id_repeating_unit'];
			var clear_check = ['#id_archived', '#id_scheduled_time_specific', '#id_deadline_time_specific', '#id_repeats', '#id_repeats_from_completion'];
			data.$modal.find('.header-title').html('New node');
			// Clear text boxes (clear_text array)
			for ( var i = 0; i < clear_text.length; i++ ) {
			    data.$modal.find(clear_text[i]).attr('value', '');
			}
			// Clear select elements
			for ( var i = 0; i < clear_select.length; i++ ) {
			    data.$modal.find(clear_select[i]).find('option:selected').each(function() {
				$(this).removeAttr('selected');
			    });
			    data.$modal.find(clear_select[i]).find('option[value=""]').attr('selected', 'selected');
			}
			// Now set some select elements that inherit from their parent
			if ( data.parent ) {
			    var scopes = data.parent.scope;
			    var $scope = data.$modal.find('#id_scope');
			    for ( var i = 0; i<scopes.length; i++ ) {
				$scope.find('option[value="' + scopes[i] + '"]').attr('selected', 'selected');
			    }
			    var related_projects = data.parent.related_projects;
			    var $projects = data.$modal.find('#id_related_projects');
			    for ( var i = 0; i<related_projects.length; i++ ) {
				$projects.find('option[value="' + related_projects[i] + '"]').attr('selected', 'selected');
			    }
			}
			// Clear checkboxes
			for ( var i = 0; i < clear_check.length; i++ ) {
			    data.$modal.find(clear_check[i]).removeAttr('checked');
			}
			// Clear aloha editor
			data.$modal.find('#id_text-aloha').html('<br class="aloha-cleanme" style="">');
		    } // end of setting current values
		    data.$modal.modal('toggle');
			// Focus the title box
			data.$modal.find('#id_title').focus();		    
		}
		var connect_handlers = function() {
		    var $text = data.$modal.find('#id_text');
		    var $text_a = Aloha.jQuery($text);
		    $text_a.aloha();
		    data.$modal.modal( {show: false} );
		    if ( start_shown ) {
			toggle();
		    }
		    // Even handlers for new form
		    $button.click(function(e) {
			e.preventDefault();
			toggle();
		    });
		    data.$modal.on('hidden', function () {
			methods['reset']({ $elem: $button });
		    });
		    data.$modal.on('show', function() {
			data.$modal.find('.modal-body').scrollTop(0);
		    });
		    data.$modal.on('shown', function() {
			data.$modal.find('#id_title').focus();
		    });
		    var $form = data.$modal.find('form');
		    $form.unbind('submit.submit_edit');
		    $form.on('submit.submit_edit', function(e) {
			// Validate form
			if ( !validate_node($(this))) {
			    return false;
			}
			// Handle submission of the form
			e.preventDefault();
			var payload = $form.serialize();
			payload += '&format=json&auto_repeat=false';
			var saved_url = data.$modal.find('#edit_url').attr('value');
			if ( saved_url ) {
			    var submit_url = saved_url;
			} else {
			    submit_url = data.edit_url;
			}
			$(this).data('nodeEdit', data);
			var that = this;
			$.post(submit_url, payload, function(r) {
		      	    r = $.parseJSON(r)
		      	    if (r.status == 'success') {
		      		// Success! Now update the page
		      		node = r.node_data;
		      		// Update data
				var data = $(that).data('nodeEdit');
		      		if ( node.todo_state == null ) {
		      		    node.todo_state = 0;
		      		}
		      		data.todo_id = node.todo_state;
		      		// Update DOM
				if ( data.heading ) {
				    data.heading.set_fields( node );
				}
				if ( $target ) {
		      		    $target.find('.update').each(function() {
		      			var field = $(this).attr('data-field');
		      			var new_html = node[field];
		      			$(this).html(new_html);
		      		    });
		      		}
		      		data.$modal.modal('hide');
		      		// User supplied callback function
		      		if (typeof data.changed != 'undefined') {
		      		    data.changed(node);
		      		}
		      	    } else { // JSON response was not successful
		      		console.log(r);
		      	    }
			});
		    });
		    // Call user given callback
		    if ( data.on_modal ) {
			data.on_modal(data.$modal);
		    }
		}; // End of connect_handlers method
		if ( args['$modal'] ) {
		    // client has already gotten the $modal dialog
		    data.$modal = args['$modal']
		    data.$modal.find('#edit_url').attr('value', data.edit_url);
		    connect_handlers();
		} else {
		    // Retrieve the modal form itself
		    $.get(data.edit_url,
			  {format: 'modal_form'},
			  function(response) {
			      $button.after(response);
			      data.$modal = $button.next('.modal');
			      attach_pickers(data.$modal);
			      // Find some data for later resetting
			      var $todo = data.$modal.find('#id_todo_state').children('option[selected="selected"]');
			      if ($todo.length == 1) {
				  data.todo_id = Number($todo.attr('value'));
			      } else {
				  data.todo_id = 0;
			      }
			      connect_handlers();
			  });
		}
		$button.data('nodeEdit', data);
	    }
	}, // end of init
	update: function ( args ) {
	    // Updates the DOM to reflect changes made through other sources
	    var $this = this;
	    var data = $this.data('nodeEdit');
	    if ( data ) {
		// Only execute if the plugin is initialized
		var $modal = data.$modal;
		if ( typeof args.todo_id != 'undefined' ) {
		    data.todo_id = args.todo_id;
		    var $select = $modal.find('#id_todo_state');
		    $select.find('option').removeAttr('selected');
		    var $new_opt = $select.find('option[value="' + args.todo_id +  '"]');
		    $new_opt.attr('selected', 'selected');
		}
		$this.data('nodeEdit', data); // Write the settings
	    }
	}, // end of update method
	reset: function ( args ) {
	    // Resets the values in the modal to the saved versions
	    if ( typeof args == 'undefined' ) {
		args = {};
	    }
	    if ( typeof args.$elem != 'undefined' ) {
		var $elem = args.$elem;
	    } else {
		var $elem = this;
	    }
	    return $elem.each(function() {
		var $this = $(this);
		var data = $this.data('nodeEdit');
		if ( data ) {
		    var $modal = data.$modal;
		    // Reset the todo_state select element
		    var $todo = $modal.find('#id_todo_state')
		    $todo.find('option').removeAttr('selected');
		    var sel = 'option[value="' + data.todo_id + '"]';
		    $todo.find(sel).attr('selected', 'selected');
		}
	    });
	} // end of reset method
    };

    // Method selection magic
    $.fn.nodeEdit = function( method ) {
	if ( methods[method] ) {
	    return methods[method].apply( this, Array.prototype.slice.call( arguments, 1));
	} else if ( typeof method === 'object' || !method ) {
	    var result = methods.init.apply( this, arguments );
	} else {
	    $.error( 'Method ' + method + ' does not exist on jQuery.nodeEdit' );
	}
    };
})(jQuery);

/*************************************************
* jQuery todoButtons plugin
* 
* Adds javascript functionality to a series of
* buttons to be used for easily changing todostate
* 
* Process the following elements:
* - $(this) is an element with a series of buttons
* 
* Options:
* - callback: a function to run upon successful
*   JSON response
*************************************************/
(function( $ ){
    // Define different methods inside this plugin
    var methods = {
	// Initialization
	init: function( args ) {
	    return this.each(function() {
		// Handle some setup stuff first (settings, etc.)
		if ( typeof args == 'undefined' ) {
		    args = {};
		};
		var $this = $(this);
		var data = {};
		data.node_id = $this.attr('node_id');
		data.url = '/gtd/node/' + data.node_id + '/edit/';
		data.sel = 'button';
		var $buttons = $this.find(data.sel)
		// Bind to each buttons click event
		$buttons.bind('click.buttons', function(e) {
		    e.preventDefault();
		    var $btn = $(this);
		    var new_todo_id = $btn.attr('value');
		    var payload = {
			format: 'json',
			todo_id: new_todo_id
		    };
		    // Submit the change to server
		    jQuery.post(data.url, payload, function(r) {
			//data = $this.data('todobuttons'); // Read in settings
			r = $.parseJSON(r);
			if ( r.status == 'success' ) {
			    // Call the update method to update the DOM
			    methods['update']({ todo_id: r.todo_id,
						$elem: $this });
			    // Call user-submitted callback
			    if ( typeof args.callback != 'undefined' ) {
				args.callback(r);
			    }
			}
		    });
		});
		// Save settings to element
		$this.data('todobuttons', data);
	    });
	}, // end of init method
	// Method accepts new data and updates the DOM elements and jQuery.data()
	update: function( args ) {
	    if (typeof args.$elem == 'undefined') {
		var $elem = this;
	    } else {
		var $elem = args.$elem;
	    }
	    return $elem.each(function() {
		var $this = $(this);
		var data = $this.data('todobuttons'); // Read in settings
		// Make sure the plugin has been initialized
		if ( !data ) {
		    method['init']();
		};
		// Now update the element
		if ( typeof args.todo_id != 'undefined' ) {
		    data.todo_id = args.todo_id;
		}
		// Clear all active states
		$(data.sel).removeClass('active');
		// And activate the new button
		var new_sel = data.sel + '[value="' + data.todo_id + '"]';
		$this.find(new_sel).addClass('active');
		// Write the new settings
		$this.data('todobuttons', data);
	    });
	} // end of update method
    };
	
    // Method selection magic
    $.fn.todoButtons = function( method ) {
	if ( methods[method] ) {
	    return methods[method].apply( this, Array.prototype.slice.call( arguments, 1));
	} else if ( typeof method === 'object' || !method ) {
	    return methods.init.apply( this, arguments );
	} else {
	    $.error( 'Method ' + method + ' does not exist on jQuery.todoButtons' );
	}
    };
})(jQuery);
