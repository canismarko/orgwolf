/*globals $, jQuery, document, Aloha, window, alert */
"use strict";
var attach_pickers, validate_node, GtdHeading;

function ow_waiting(str, callback) {
    // Displays an image that informs that user that
    // something is going on in the background.
    var data, re, groups, cmd, name;
    // First split the input into command.name
    //   name is used for keeping track of active waits in a stack
    re = /(\w+)?\.?(\w+)?/;
    groups = re.exec(str);
    cmd = groups[1];
    name = groups[2];
    // Do the setup work if not already done
    data = $('body').data('ow-waiting');
    if ( data === undefined ) {
	data = {};
	$('body').prepend('<div id="loading"></div>');
	data.$loading = $('#loading');
	data.$loading.hide();
	data.$loading.append(
	    '<div id="mask"></div>'
	);
	data.$mask = data.$loading.find('#mask');
	data.$mask.append('<div id="dark"></div>');
	data.$mask.append(
	    '<img id="spinner" alt="loading" src="/static/ajax-loader.gif"></img>'
	);
	$('body').data('ow-waiting', data);
    }
    if ( cmd === 'clear' ) {
	// Clear all the waiting elements
	data.$loading.fadeOut();
    } else {
	data.$mask.hide();
	data.$loading.show(callback);
	// Displays the longer waiting time "spinner" icon
	if ( cmd === 'spinner' ) {
	    data.$mask.fadeIn();
	}
    }
}
var persona_user;
// Create the loading mask for later use
// $(document).ready(function() {
// });

$(document).ready(function(){
    // Add django CSRF token to all AJAX POST requests
    function getCookie(name) {
	var cookieValue, cookies, i, cookie;
	cookieValue = null;
	if (document.cookie && document.cookie !== '') {
            cookies = document.cookie.split(';');
            for (i = 0; i < cookies.length; i += 1) {
		cookie = jQuery.trim(cookies[i]);
		// Does this cookie string begin with the name we want?
		if (cookie.substring(0, name.length + 1) === (name + '=')) {
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
	},
	dataType: 'json',
    });
}); // End of onReady

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
	if ( typeof options !== 'object' ) {
	    options = {};
	}
	options.$element = $text_j;
	if ( typeof options.$parent === 'undefined' ) {
	    options.$parent = options.$element.parent();
	}
	// Bind the aloha editor
	Aloha.ready(function() {
	    var $text_a = Aloha.jQuery($text_j);
	    $text_a.aloha();
	});
	// Save options
	$text_j.data('alohaText', options);
	return this;
    };
    // Bind the AJAX handler for changing the text
    $('document').ready(function() {
	Aloha.ready(function() {
	    console.log('# Todo: Switch Aloha editor to PubSub');
	    Aloha.bind('aloha-editable-activated', function(e, args) {
		var editable, options, $text;
		editable = args.editable;
		$text = $(editable.obj.context);
		options = $text.data('alohaText');
		if ( options ) {
		    options.old_text = editable.snapshotContent;
		}
	    });
	    Aloha.bind('aloha-editable-deactivated', function(e, arg) {
		var editable, $text, options, $parent, url, new_text, payload;
		editable = arg.editable;
		// If they text was changed, submit the ajax request
		$text = $(editable.obj.context);
		options = $text.data('alohaText');
		if ( options ) { // Only if an AlohaText exists
		    if (options.old_text !== editable.obj.html()) {
			$parent = options.$parent;
			url = '/gtd/node/' + $parent.attr('node_id') + '/';
			new_text = $text.html();
			if ( new_text === '<br>' ) {
			    new_text = '';
			}
			payload = {
			    format: 'json',
			    node_id: $parent.attr('node_id'),
			    text: new_text
			};
			$.post(url, payload, function(r) {
			    var $modal = [], outline;
			    // Callback for aloha edit request
			    r = $.parseJSON($.parseJSON(r))[0];
			    // Update headings/data with new text
			    if ( options.heading ) {
				options.heading.set_fields(r);
			    } else {
				outline = $parent.data('nodeOutline');
				if (outline) {
				    $modal = $parent.data('nodeOutline').$buttons
					.find('#edit-modal');
				}
			    }
			});
		    }
		}
	    });
	});
    });
}(jQuery));


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
	    var node_id, $todo, todo_id;
	    node_id = $(this).attr('node_id');
	    $todo = $(this).find('.todo-state');
	    todo_id = $todo.attr('todo_id');
	    // Reset blank todo states to zero for proper handling
	    if ( todo_id === '' ) {
		$todo.attr('todo_id', 0);
		$todo.html('<span class="todo-none">[None]</span>\n');
	    }
	    $todo.todoState({
		states: args.states,
		node_id: node_id
	    });
	});
	return this;
    };
}(jQuery));

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
	var $form, $text, $agenda, data, get_date, now, today, update_agenda, add_todo_plugin;
	$form = this.find('form.date');
	$text = $form.find('input[name="date"][type="text"]');
	$agenda = this;
	// Initialize data container if it doesn't exist
	if (!this.data('agenda')) {
	    this.data('agenda', {}); // Default settings go here
	}
	data = $.extend(this.data('agenda'), options);
	// Try and get agenda date from div (otherwise set to today)
	get_date = function(date_string) {
	    var RE, result, year, month, day, new_date;
	    RE = /(\d{4})-([01]?\d)-([0-3]?\d)/;
	    result = RE.exec(date_string);
	    if (result) {
		year = Number(result[1]);
		month = Number(result[2])-1;
		day = Number(result[3]);
		new_date = new Date(year, month, day);
	    }
	    else {
		new_date = undefined;
	    }
		return new_date;
	};
	data.date = get_date(this.attr('date'));
	if (!data.date) {
	    now = new Date();
	    today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	    data.date = today;
	}
	this.data('agenda', data);
	// function reloads the agenda ajaxically
	update_agenda = function() {
	    var url = '/gtd/agenda/' +
		data.date.getFullYear() + '-' +
		(data.date.getMonth()+1) + '-' +
		data.date.getDate() + '/';
	    $.getJSON(url, {format: 'json'}, function(response) {
		// (callback) Update the sections with the new agenda
		var date_string, months;
		if (response.status === 'success') {
		    $agenda.find('.daily').html(response.daily_html);
		    $agenda.find('.timely').html(response.timely_html);
		    $agenda.find('.deadlines').html(
			response.deadlines_html);
		    date_string = '';
		    months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.',
			      'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
		    date_string += months[data.date.getMonth()] + ' ';
		    date_string += data.date.getDate() + ', ';
		    date_string += data.date.getFullYear();
		    $agenda.children('.date:header').html(date_string);
		    add_todo_plugin();
		}
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
	add_todo_plugin = function() {
	    $agenda.find('.todo-state').each(function() {
		var node_id = $(this).parent().attr('node_id');
		$(this).todoState({
		    states: data.states,
		    node_id: node_id,
		    click: function() {
			update_agenda();
		    }
		});
	    });
	};
	add_todo_plugin();
	return this;
    };
}(jQuery));

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
                var i, $todo, data, todo_id, settings, get_state, curr_state, hide_popover, show_popover, new_html, $popover, $inner, option_html, $options;
                // Process options
                $todo = $(this);
                data = $todo.data('todoState');
                // Initialize if not already done
                if ( !data ) {
                    // Remove any links that may be in the todo_state element
                    $todo.find('a').contents().unwrap();
                    todo_id = $todo.attr('todo_id');
                    settings = $.extend(
                        {
                            states: [
                                {pk: 0, display: '[None]'},
                            ],
                            todo_id: todo_id,
                            node_id: 0,
                            click: function() {},
                            parent_elem: $todo.parent()
                        }, options);
                    // Helper function gets todo state given a todo_id
                    get_state = function(todo_id) {
                        var new_state, i;
                        new_state = {
                            pk: -1,
                            display: '',
                            full: ''
                        };
                        for ( i=0; i<settings.states.length; i += 1) {
                            if (settings.states[i].pk === todo_id) {
                                new_state = settings.states[i];
                            }
                        }
                        return new_state;
                    };
                    // Helper function for getting the current todo_id
                    settings.get_todo_id = function() {
                        var found_id;
                        if ( this.heading ) {
                            found_id = this.heading.todo_state;
                        } else {
                            found_id = this.todo_id;
                        }
                        return Number(found_id);
                    };
                    curr_state = get_state(todo_id);
                    hide_popover = function() {
                        $popover.hide();
                        $todo.unbind('.autohide');
                    };
                    // function shows the popover and binds dismissal events
                    show_popover = function() {
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
                    new_html = '';
                    new_html += '<div class="popover right todostate">\n';
                    new_html += '  <div class="arrow"></div>\n';
                    new_html += '  <div class="popover-title">Todo State</div>\n';
                    new_html += '  <div class="popover-inner">\n';
                    new_html += '  </div>\n';
                    new_html += '</div>\n';
                    $todo.after(new_html);
                    $popover = $todo.next('.popover');
                    $inner = $popover.children('.popover-inner');
                    // Set some css
                    $popover.hide();
                    $popover.css('position', 'absolute');
                    // Add the todo state options to popover inner
                    for ( i=0; i<settings.states.length; i += 1 ) {
                        option_html = '';
                        option_html += '<div class="todo-option"';
                        option_html += ' todo_id="';
                        option_html += settings.states[i].pk;
                        option_html += '"';
                        if (settings.states[i].pk === settings.get_todo_id()) {
                            option_html += ' selected';
                        }
                        option_html += '>';
                        option_html += settings.states[i].display;
                        option_html += '</div>\n';
                        $inner.append(option_html);
                    }
                    // Connect the todo states click functionality
                    $todo.bind('click', function(e) {
                        var new_left, top, height, new_middle, new_top, opt_id;
                        e.stopPropagation();
                        $('.popover.todostate').hide(); // Hide all the other popovers
                        $todo = $(this);
                        $todo.tooltip('hide');
                        // ...set the position
                        new_left = $todo.position().left + $todo.width();
                        $popover.css('left', new_left + 'px');
                        top = $todo.position().top;
                        height = $todo.height();
                        new_middle = top + (height/2);
                        new_top = new_middle - ($popover.height()/2);
                        $popover.css('top', new_top + 'px');
                        // ... set the selected option
                        if ( settings.heading ) {
                            opt_id = settings.heading.todo_state;
                            $popover.find('.todo-option').removeAttr('selected');
                            $popover.find('.todo-option[todo_id="'+opt_id+'"]').attr('selected', 'selected');
                        }
                        show_popover();
                    });
                    // Connect the hover functionality
                    $options = $inner.children('.todo-option');
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
                        var new_id, $popover, heading, url, payload;
                        new_id = Number($(this).attr('todo_id'));
                        $popover = $(this).parent().parent();
                        heading = $popover.parent().parent().data('nodeOutline');
                        url = '/gtd/node/' + settings.node_id + '/';
                        payload = {
			    fields: {
				todo_state: new_id,
				auto_update: true,
			    },
                        };
			payload = JSON.stringify(payload);
                        // Avoid dismissing if same todo state selected
                        if ( new_id !== settings.get_todo_id() ) {
                            // If todo state is being changed then...
                            $.ajax(url, {
				data: payload,
				type: 'PUT',
				contentType: 'application/json',
				success: function(response) {
                                    var heading, old, new_state, s;
                                    // convert response from string into JSON
                                    while ( typeof response === 'string' ) {
					response = $.parseJSON(response);
                                    }
                                    response = response[0];
                                    // (callback) update the document todo states after change
                                    if ( settings.heading ) {
					settings.heading.set_fields(
                                            response
					);
					settings.heading.redraw();
                                    } else {
					old = $todo.attr('todo_id');
					$todo.attr('todo_id', response.fields.todo_state);
					todo_id = response.fields.todo_state;
					settings.todo_id = response.fields.todo_state;
                                    }
                                    new_state = get_state(response.fields.todo_state);
                                    $todo.html(new_state.display);
                                    $todo.attr('data-original-title', new_state.full);
                                    $options.removeAttr('selected'); // clear selected
                                    s = '.todo-option[todo_id="';
                                    s += response.todo_id + '"]';
                                    $inner.children(s).attr('selected', '');
                                    // Feedback if node repeats
                                    if ( response.fields.repeats ) {
					alert('Node scheduled for ' +
                                              response.fields.scheduled.slice(0, 10));
                                    }
                                    // Run the user submitted callback
                                    settings.click(response);
                                    // Kludge to avoid stale css
                                    $todo.mouseenter();
                                    $todo.mouseleave();
				}
                            }); // end of $.ajax
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
                var $todo, data, $popover, s_all, s_new, new_todo;
                $todo = $(this);
                data = $todo.data('todoState');
                $popover = $todo.next('.popover');
                if ( typeof options.todo_state !== 'undefined' ) {
                    // if a new todo_id is being assigned
                    data.todo_state = options.todo_state;
                    $todo.attr('todo_id', options.todo_state);
                    s_all = '.todo-option';
                    s_new = s_all + '[todo_id="' + options.todo_state + '"]';
                    $popover.find(s_all).removeAttr('selected');
                    $popover.find(s_new).attr('selected', 'selected');
                    new_todo = data.states.filter( function ( state ) {
                        return state.pk === Number(options.todo_state);
                    })[0];
                    $todo.html(new_todo.display);
                    if ( data.todo_state > 0 ) {
                        $todo.show();
                    } else {
                        $todo.hide();
                    }
                }
                $todo.data('todoState', data);
            });
        } // end of update method
    };

    // Method selection magic
    $.fn.todoState = function( method ) {
        var response;
        if ( methods[method] ) {
            response = methods[method].apply( this, Array.prototype.slice.call( arguments, 1));
        } else if ( typeof method === 'object' || !method ) {
            response = methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' + method + ' does not exist on jQuery.todoState' );
        }
        return response;
    };
}(jQuery));

