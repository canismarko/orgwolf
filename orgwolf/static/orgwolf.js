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
				{todo_id: 0, display: '[None]'},
			    ],
			    todo_id: todo_id,
			    node_id: 0,
			    click: (function() {}),
			    parent_elem: $todo.parent()
			}, options);
		    // Helper function gets todo state given a todo_id
		    var get_state = function(todo_id) {
			var new_state = {
			    todo_id: -1,
			    display: '',
			    full: ''
			};
			for (var i=0; i<settings.states.length; i++) {
			    if (settings.states[i].todo_id == todo_id) {
				new_state = settings.states[i];
			    }
			}
			return new_state;
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
		    // todo_id 0 has some special properties
		    var bind_autohide = function() {
			var todo_id = $todo.attr('todo_id');
			if (todo_id == 0) {
			    $todo.hide();
			} else {
			    $todo.show();
			    settings.parent_elem.unbind('.autohide');
			}
		    }
		    bind_autohide();
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
			    // 		    if ($(this).attr('todo_id') != todo_id) {
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
			var url = '/gtd/nodes/' + settings.node_id + '/edit/';
			var payload = {
			    format: 'json',
			    todo_id: new_id,
			};
			// Avoid dismissing if same todo state selected
			if (new_id != todo_id) {
			    // If todo state is being changed then...
			    $.post(url, payload, function(response) {
				response = $.parseJSON(response);
				// (callback) update the document todo states after change
				if (response['status']=='success') {
				    var old = $todo.attr('todo_id');
				    $todo.attr('todo_id', response['todo_id']);
				    todo_id = response['todo_id'];
				    var new_state = get_state(response['todo_id']);
				    $todo.html(new_state.display);
				    $todo.attr('data-original-title', new_state.full);
				    $options.removeAttr('selected'); // clear selected
				    var s = '.todo-option[todo_id="';
				    s += response['todo_id'] + '"]';
				    $inner.children(s).attr('selected', '');
				    bind_autohide();
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
			return state.todo_id == options.todo_id;
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
			var url = '/gtd/nodes/' + $parent.attr('node_id') + '/edit/';
			var new_text = $text.html();
			if ( new_text == '<br>' ) {
			    new_text = '';
			}
			var payload = {
			    format: 'json',
			    node_id: $parent.attr('node_id'),
			    text: new_text
			};
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

var get_heading = function (node_id) {
    // Accepts a node_id and returns the JQuery selected element
    node_id = Number(node_id); // In case a string was passed
    return $('.heading[node_id="' + node_id + '"]');
};

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
	    // Begin implementation of hierarchical expanding project list
	    var outline_heading = function( args ) {
		if ( ! args ) {
		    args = {};
		}
		this.ICON = 'icon-chevron-right';
		this.title = args['title'];
		this.has_children = false;
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
		this.archived = args['archived'];
		// Detect the location in the hierarchy
		if (typeof args['parent_id'] == 'undefined' ) {
		    // Root level heading
		    this.level = 1;
	    	    this.todo_states = { todo_id: 0, display: '[None]' }
		    this.COLORS = ['black'];
		}
		else { // Find the parent and get its info
		    this.parent_id = Number(args['parent_id']);
		    var s = '.heading[node_id="' + this.parent_id + '"]';
		    this.$parent = $(s);
		    var parent = this.$parent.data('nodeOutline');
		    if (typeof parent == 'undefined') {
			// Parent can't be found
	    		this.todo_states = { todo_id: 0, display: '[None]' };
			this.COLORS = ['black']; // Default if no colors set
		    } else {
			this.COLORS = this.$parent.data('nodeOutline').COLORS;
			this.$workspace = parent.$workspace;
			this.todo_states = parent.todo_states;
			this.level = (parent.level + 1);
		    }
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
		    new_string += '    <span class="todo-state update" data-field="todo_abbr"></span>\n';
		    // title
		    new_string += '    <div class="clickable ow-title"></div>\n';
		    // Quick-action buttons
		    new_string += '    <div class="ow-buttons">\n';
		    new_string += '      <i class="icon-pencil" title="Edit"></i>\n';		    
		    new_string += '      <i class="icon-th-list" title="Detail view"></i>\n';
		    new_string += '      <i class="icon-plus" title="New subheading"></i>\n';
		    new_string += '    </div>\n';
		    new_string += '  </div>\n';
		    // Child containers
		    new_string += '  <div class="details">\n';
		    new_string += '    <div class="ow-text"></div>\n';
		    new_string += '    <div class="children">\n';
		    new_string += '      <div class="loading">\n';
		    new_string += '        <em>Loading...</em>\n';
		    new_string += '      </div>\n';
		    new_string += '    </div>\n  </div>\n</div>\n';
		    return new_string;
		};
		this.set_autohide = function ( $hover_target, $hide_target ) {
		    $hover_target.bind( 'mouseenter.autohide', function() {
			$hide_target.css('visibility', 'visible');
		    });
		    $hover_target.bind( 'mouseleave.autohide', function() {
			$hide_target.css('visibility', 'hidden');
		    });
		    $hide_target.css('visibility', 'hidden');
		};
		this.create_div = function( $container ) {
		    // Create a new "<div></div>" element representing this heading
		    var node_id = this.node_id;
		    $container.append(this.as_html());
		    var new_selector = '.heading';
		    new_selector += '[node_id="' + this.node_id + '"]';
		    // Set selectors
		    var $element = $(new_selector);
		    $element.hide();
		    var $hoverable = $element.children('.ow-hoverable');
		    if ( typeof parent != 'undefined' ) {
			var $workspace = parent.$workspace
			parent.$element.addClass('expandable');
			parent.expandable = true;
		    } else {
			var $workspace = $element.parent();
		    }
		    var $clickable = $hoverable.children('.clickable');
		    var $todo_state = $hoverable.children('.todo-state');
		    var $icon = $hoverable.children('i');
		    var $buttons = $hoverable.children('.ow-buttons');
		    var $title = $hoverable.children('.ow-title');
		    this.$element = $element;
		    this.$hoverable = $hoverable;
		    this.$details = this.$element.children('.details');
		    this.$children = this.$details.children('.children');
		    this.$workspace = $workspace;
		    this.$clickable = $clickable;
		    this.$todo_state = $todo_state;
		    this.$icon = $icon;
		    this.$text = this.$details.children('.ow-text');
		    this.$buttons = $buttons;
		    this.$title = $title;
		    this.populated = false;
		    // Set initial dom data
		    this.update_dom();
		    // Set jquery data
		    this.$element.data('nodeOutline', this);
		    this.$clickable.data('$parent', this.$element);
		    // Apply tooltips
		    $buttons.children('i').tooltip({
			delay: {show:1000, hide: 100}
		    });
		    // Set color based on indentation level
		    var color_i = this.level % this.COLORS.length;
		    this.color = this.COLORS[color_i-1];
		    var $children = this.$details.children('.children');
		    this.$children = $children;
		    // Set initial CSS
		    if ( this.archived ) {
			this.$element.hide();
		    }
		    this.$clickable.css('color', this.color);
		    this.$details.hide();
		    this.$buttons.css('visibility', 'hidden');
		    this.set_indent(this.$children, 1);
		    this.set_indent(this.$text, 1);
		    // Attach event handlers
		    this.$clickable.click(function() {
			var saved_heading = $(this).data('$parent').data('nodeOutline');
			if ( saved_heading.expandable ) {
			    saved_heading.toggle();
			}
		    });
		    this.set_autohide( this.$hoverable, $buttons );
		    this.$buttons.find('.icon-th-list').click( function() {
			window.location = '/gtd/nodes/' + node_id + '/';
		    });
		    this.$buttons.find('.icon-pencil').click( function() {
			// Modal dialog for editing this heading
			var $this = $(this);
			var $hoverable = $this.parent().parent();
			var $heading = $hoverable.parent();
			$hoverable.unbind('.autohide');
			if ( ! $this.data('nodeEdit') ) {
			    $this.nodeEdit( {
				show: true,
				target: $hoverable,
				node_id: node_id,
				changed: function(node) {
				    var heading = $heading.data('nodeOutline');
				    $hoverable.find('.todo-state').todoState(
					'update', {todo_id: node.todo_state}
				    );
				    heading.text = node.text;
				    heading.archived = node.archived;
				    heading.title = node.title;
				    heading.$element.data('nodeOutline', heading);
				    heading.update_dom();
				},
				on_modal: function($modal) {
				    // disable the hovering feature while the modal is active

				    $modal.on('show', function() {
					$this.parent().parent().unbind('.autohide');
				    });
				    $modal.on('hidden', function() {
					new outline_heading().set_autohide( $modal.parent().parent(), $modal.parent());
				    });
				}
			    });
			}
		    });
		    this.$buttons.find('.icon-plus').click( function() {
			// Modal dialog for new children of this heading
			var $this = $(this);
			$this.parent().parent().unbind('.autohide');
			if ( ! $this.data('nodeEdit') ) {
			    $this.nodeEdit( {
				show: true,
				parent_id: node_id,
				changed: function(node) {
				    new_heading = new outline_heading( {
					title: node.title,
					text: node.text,
					node_id: node.id,
					todo_id: node.todo_state,
					tags: node.tag_string,
					parent_id: node_id
				    });
				    new_heading.create_div( $children );
				    var parent = new_heading.$parent.data('nodeOutline')
				    parent.has_children = true;
				    parent.update_dom();
				    parent.toggle('open');
				},
				on_modal: function($modal) {
				    // disable the hovering feature while the modal is active

				    $modal.on('show', function() {
					$this.parent().parent().unbind('.autohide');
				    });
				    $modal.on('hidden', function() {
					new outline_heading().set_autohide( $modal.parent().parent(), $modal.parent());
				    });
				}
			    });
			}
		    });
		    var todo_states = this.todo_states;
		    $element.slideToggle();
		};
		// Read the current object properties and update the
		//   DOM element to reflect any changes
		this.update_dom = function() {
		    var heading = this;
		    // node_id
		    this.$element.attr('node_id', this.node_id);
		    this.$hoverable = this.$element.children('.ow-hoverable');
		    this.$todo_state = this.$hoverable.children('.todo-state');
		    // todo_id
		    this.$todo_state.data('todo_id', this.todo_id);
		    this.$todo_state.attr('todo_id', this.todo_id);
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
			    heading.$buttons.children('.icon-pencil').nodeEdit(
				'update',
				{ todo_id: heading.todo_id }
			    );
			    heading.set_autohide(heading.$hoverable, 
						 heading.$buttons
						);
			}
		    });
		    // Text div (including aloha editor)
		    if ( typeof this.$text != 'undefined' ) {
			this.$text.html(this.text);
			// // Make the heading expandable
			if ( this.text ) {
			    // Bind Aloha editor
			    if ( this.$text.text() != '' ) {
				this.$text.alohaText({$parent: this.$element});
			    }
			}
			if (typeof this.$text.aloha == 'function') {
			    this.$text.aloha();
			}
		    }
		    // Title div
		    if ( typeof this.$title != 'undefined' ) {
			this.$title.html('<strong class="update" data-field="title">' + this.title + '</strong>');
		    }
		    // Archived status
		    if ( this.archived ) {
			this.$element.addClass('archived');
		    } else {
			this.$element.removeClass('archived');
		    }
		    var $checkbox = this.$element.find('.show-all');
		    if ( $checkbox.length > 0 ) {
			this.$showall = $checkbox;
		    } else if ( this.$workspace.data('nodeOutline') ) {
			$checkbox = this.$workspace.data('nodeOutline').$showall;
		    }
		    // Set expandability
		    var c
		    if ( $checkbox.is(':checked') ) {
			c = this.$children.children('.heading');
		    } else {
			c = this.$children.children('.heading:not(.archived)');
		    }
		    if ( c.length > 0 ) {
		    	this.has_children = true;
		    } else {
		    	this.has_children = false;
		    }
		    if ( this.text || this.has_children ) {
			this.expandable = true;
			this.$element.addClass('expandable'); 
		    } else {
			this.expandable = false;
			this.$element.removeClass('expandable');
		    }
		    var show_all = $checkbox.is(':checked');
		    if ( this.archived && ! show_all ) {
			this.$element.attr('archived');
			this.$element.hide();
		    } else {
			this.$element.removeAttr('archived');
		    }
		    // Write settings
		    this.$element.data('nodeOutline', this);
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
			// Set some special attributes if the parent has children
			if ( children.length > 0 ) {
			    parent.$element.addClass('has-children')
			    parent.has_children = true;
			}
			// Create the DOM elements
			parent.$children.children('.loading').remove()
			parent.populated = true;
			if (typeof extra_callback == 'function') {
			    extra_callback();
			}
			var populated = true;
			parent.$element.data('nodeOutline', parent);
			parent.update_dom();
		    });
		};
		this.toggle = function( direction ) {
		    // Show or hide the children div based on present state
		    var $icon = this.$element.children('.ow-hoverable').children('i.clickable');
		    if ( $icon.hasClass('icon-chevron-right') || direction == 'open' ) {
			var new_icon_class = 'icon-chevron-down';
			$icon.removeClass('icon-chevron-right');
			this.$details.slideDown();
		    }
		    else {
			var new_icon_class = 'icon-chevron-right';
			$icon.removeClass('icon-chevron-down');
			this.$details.slideUp();
		    }
		    $icon.addClass(new_icon_class);
		    var outline = this;
		    this.$children.children('.heading').each(function() {
			// Populate the next level of children 
			// in aniticipation of the user needing them
			if ( ! $(this).data('nodeOutline').populated ) {
			    $(this).data('nodeOutline').populate_children();
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
	    }; // end of outline_heading prototype

	    // Code execution starts here
	    $this = this;
	    $this.html('<strong>Children:</strong><br />\n<div class="children"></div>'); // Clear old content
	    if ( !args ) {
		args = {};
	    }
	    if ( args.get_proto ) {
		return outline_heading;
	    }
	    var data = {};
	    // Some settings
	     var COLORS = ['blue', 'brown', 'purple', 'red', 'green', 'teal', 'slateblue', 'darkred'];
	    // Array of browser recognized colors for each level of nodes
	    data.COLORS = ['blue', 'brown', 'purple', 'red', 'green', 'teal', 'slateblue', 'darkred'];
	    if ( typeof args.todo_states != 'undefined' ) {
	    	data.todo_states = args.todo_states
	    } else {
	    	data.todo_states = { todo_id: 0, display: '[None]' }
	    }
	    var workspace = new outline_heading( {
		node_id: $this.attr('node_id'),
		title: 'Outline Workspace',
	    });
	    workspace.$children = $this.children('.children');
	    workspace.$element = $this;
	    workspace.$element.addClass('heading');
	    workspace.$workspace = this;
	    workspace.$showall = $this.find('.show-all');
	    workspace.$element.data('nodeOutline', workspace);
	    workspace.level = 0;
	    workspace.COLORS = COLORS;
	    workspace.color = workspace.COLORS[0];
	    workspace.todo_states = data.todo_states;
	    // Create all the first two levels of nodes
	    workspace.populate_children(function() {
		workspace.$children.children('.heading').each(function() {
		    var subheading = $(this).data('nodeOutline');
		    subheading.populate_children();
		});
		var h = '';
		// Button for adding a new child node
		h += '<div class="ow-buttons" id="add-heading">\n';
		h += '  <i class="icon-plus-sign"></i>Add Heading\n';
		h += '</div>\n';
		// Checkbox for showing archived nodes
		h += '<label class="checkbox" id="show-all-label">\n';
		h += '  <input class="ow-buttons show-all" type="checkbox">';
		h += '  </input>Show archived</label>\n';
		workspace.$element.append(h);
		workspace.$checkbox = workspace.$element.find('.show-all');
		workspace.$add_heading = workspace.$element.find('#add-heading');
		// var heading = workspace.$checkbox.siblings('.heading').first().data('nodeOutline');
		var heading = workspace.$add_heading.siblings('.children').children('.heading').first().data('nodeOutline');
		var margin = heading.$icon.outerWidth()+4;
		workspace.$add_heading.css('margin-left', margin);
		var $add = workspace.$add_heading;
		$add.nodeEdit( {
		    parent_id: workspace.node_id,
		    changed: function(node) {
			new_heading = new outline_heading( {
			    title: node.title,
			    text: node.text,
			    node_id: node.id,
			    todo_id: node.todo_state,
			    tags: node.tag_string,
			    parent_id: workspace.node_id
			});
			new_heading.create_div( workspace.$children );
		    }
		});
		// Archived checkbox toggles visibility of archived nodes
		workspace.$checkbox.bind('change.show-all', function (e) {
		    var checked;
		    if ( $(this).is(':checked') ) {
			checked = true;
		    } else {
			checked = false;
		    }
		    workspace.showall = checked;
		    workspace.$element.find('.heading.archived').each( function() {
			var $parent = $(this).data('nodeOutline').$parent;
			parent = $parent.data('nodeOutline');
			if ( checked ) {
			    $(this).slideDown();
			} else {
			    $(this).slideUp();
			}
			parent.update_dom();
			// Save data object back to elements
			$parent.data('nodeOutline', parent);
			workspace.$element.data('nodeOutline', workspace);
		    });
                });
		workspace.todo_states = data.todo_states;
		$this.data('nodeOutline', workspace);
	    });
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
	    var start_shown = args.show;
	    var $target = $(args['target']);
	    var $button = this;
	    var node_id = args.node_id;
	    var parent_id = args.parent_id;
	    // Determine what the correct URL is
	    var edit_url;
	    if ( args.url ) {
		edit_url = args['url'];
	    } else {
		if ( node_id > 0 ) {
		    // Existing node
		    edit_url = '/gtd/nodes/' + node_id + '/edit/';
		} else if ( parent_id > 0 ) {
		    // new node with parent
		    edit_url = '/gtd/nodes/' + parent_id + '/new/';
		} else {
		    // New top-level node
		    edit_url = '/gtd/nodes/new/';
		}
	    }
	    var changed = args['changed'];
	    var on_modal = args['on_modal'];
	    var data = {};
	    data.changed = changed
	    data.on_modal = args['on_modal'];
	    data.$target = $target;
	    $.get(edit_url,
		  {format: 'modal_form'},
		  function(response) {
		      $button.after(response);
		      var $modal = $button.next('.modal');
		      data.$modal = $modal
		      var $text = $modal.find('#id_text');
		      var $text_a = Aloha.jQuery($text);
		      $text_a.aloha();
		      if ( start_shown ) {
			  $modal.modal( {show: true} );
		      } else {
			  $modal.modal( {show: false} );
		      }
		      // Extract values and save to .data()
		      data.todo_id = $modal.find('#id_todo_state').find('option[selected]').attr('value');
		      // Even handlers for new form
		      $button.click(function(e) {
			  e.preventDefault();
			  $modal.modal('toggle');
		      });
		      $modal.on('hidden', function () {
			  methods['reset']({ $elem: $button });
		      });
		      var $form = $modal.find('form');
		      $form.submit(function(e) {
			  // Handle submission of the form
			  e.preventDefault();
			  var payload = $form.serialize();
			  payload += '&format=json';
			  $.post(edit_url, payload, function(r) {
			      r = $.parseJSON(r)
			      if (r.status == 'success') {
				  // Success! Now update the page
				  node = $.parseJSON(r.node_data);
				  // Update data
				  if ( node.todo_state == null ) {
				      node.todo_state = 0;
				  }
				  var data = $button.data('nodeEdit');
				  data.todo_id = node.todo_state;
				  $button.data('nodeEdit', data);
				  // Update DOM
				  $modal.modal('hide');
				  if ( $target ) {
				      $target.find('.update').each(function() {
					  var field = $(this).attr('data-field');
					  var new_html = node[field];
					  $(this).html(new_html);
				      });
				  }
				  // User supplied callback function
				  if (typeof data.changed != 'undefined') {
				      data.changed(node);
				  }
			      }
			  });
		      });
		      // Call user given callback
		      if ( data.on_modal ) {
			  data.on_modal($modal);
		      }
		      // Save settings
		      $button.data('nodeEdit', data);
		  });
	    $button.data('nodeEdit', data);
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
		var $modal = data.$modal;
		// Reset the todo_state select element
		var $todo = $modal.find('#id_todo_state')
		$todo.find('option').removeAttr('selected');
		var sel = 'option[value="' + data.todo_id + '"]';
		$todo.find(sel).attr('selected', 'selected');
	    });
	} // end of reset method
    };

    // Method selection magic
    $.fn.nodeEdit = function( method ) {
	if ( methods[method] ) {
	    return methods[method].apply( this, Array.prototype.slice.call( arguments, 1));
	} else if ( typeof method === 'object' || !method ) {
	    return methods.init.apply( this, arguments );
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
		data.url = '/gtd/nodes/' + data.node_id + '/edit/';
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
