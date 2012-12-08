var counter = 0;
var workspace_string = '';

// An object prototype for a heading
function heading(args) {
    // CSS classes
    this.ICON = 'icon-chevron-right'; // Eg. Bootstrap glyphicon
    this.ICON_WIDTH; // Set dynamically at onReady()
    this.COLORS = new Array('red', 'green', 'blue');
    if(typeof args['heading_div'] != 'undefined') {
	// Allow a selected JQuery element to be passed
	div = args['heading_div'];
	args['node_id'] = div.attr('node_id');
	args['html'] = div.attr('title');
	args['tags'] = div.attr('tags');
	args['parent_id'] = div.attr('parent_id');
	this.exists = true;
    }
    else {
	this.exists = false;
    }
    // Set some init attributes
    this.id = args['node_id'];
    this.title = args['html'];
    this.tags = args['tags'];
    this.text = args['text'];
    if(typeof args['parent_id'] == 'undefined') {
	args['parent_id'] = '0';
    }
    if(args['parent_id'] == '0') {
	// Root level heading (child of workspace)
	this.parent = $('#node-workspace');
	this.parent.id = 0;
	this.level = 0;
    }
    else { // All others
	this.parent = $('#heading' + args['parent_id']);
	this.level = Number(this.parent.attr('level')) + 1;
    }
    if (this.exists) {
    	this.selector = '#heading'+this.id;
    }
    // Method converts a heading to it's HTML form (including divs)
    this.as_html = function() {
	var string = '<div id="heading' + this.id + '"';
	string += ' node_id="' + this.id + '"';
	string += ' level="' + this.level + '"';
	string += ' title="' + this.title + '"';
	string += ' tags="' + this.tags + '"';
	string += ' class="heading"';
	string += ' parent_id="' + this.parent.attr('node_id') + '"';
	string += '>\n';
	string += '<div class="clickable"';
	var color_i = this.level % this.COLORS.length;
	string += ' style="color: ' + this.COLORS[color_i] + ';"';
	string += '>\n';
	string += '<i class="' + this.ICON + ' twisty"></i>\n';
	string += this.title;
	string += this.tags;
	string += '</div>\n';
	string += '<div class="children';
	string += '">\n';
	if( typeof this.text != 'undefined' && this.text != '' ) {
	    string += '<div class="heading_text">\n';
	    string += this.text + '\n';
	    string += '</div>\n';
	}
	string += '<div class="loading">';
	string += '<em>Loading...</em></div>\n'; // Todo: Add indentation to the loading element
	string += '</div>\n'
	string += '</div>';
	return string
    };
    // Method creates the DOM element in the given container and sets jquery data
    this.create_new = function(args) {
	container = args['container'];
	// First render the HTML
	html = container.html();
	html += this.as_html()
	container.html(html);
	// Now set data
	this.$element = $('#heading' + this.id);
	this.exists = true;
	this.$element.attr('level', this.level);
	this.$element.attr('node_id', this.id);
	this.$element.attr('tags', this.tags);
	this.$element.attr('parent_id', this.parent.id);
	this.$element.attr('title', this.title);
	this.$element.children('.clickable').click(function() {
	    alert('clicked: ' + $(this).attr('id') + '.' + $(this).attr('class'));
	});
	this.$element.children('.clickable').click(); // This works
    }
    this.set_indent = function($element, offset) {
	// Method accepts a JQuery selector and an optional offset and
	// sets margin-left based on this.level
	if (typeof offset == 'undefined') {
	    offset = 0;
	    }
	var icon_width = $('body').data('icon_width') + 4;
	var new_margin = offset * icon_width;
	$element.css('margin-left', new_margin + 'px');
    };
    this.populate_children = function() {
	// Call ajax method to get the children of the current heading
	$.ajaxSetup({
	    headers: { "X-CSRFToken": $.cookie('csrftoken')}
	});
	// First get the necessary data from server
	$.post('/ajax/gtd/get_heading.json',
	       { parent_id: this.id },
	       function(response) {
		   parent_selector = '#heading' + response.data.parent_id;
		   var $parent = $(parent_selector);
		   var parent_heading = new heading({heading_div: $parent});
		   var $children_div = $(parent_selector).children('div.children');
		   // Then process each child heading
		   for(i in response.data.children) {
		       var child_data = response.data.children[i];
		       child_data['parent_id'] = response.data.parent_id;
		       child = new heading(child_data);
		       child.create_new({container: $children_div});
		   }
		   // Add a line to add new headings
		   var add_html = '';
		   add_html += '<div class="add_heading">\n';
		   add_html += '<i class="icon-plus-sign"></i> [New heading]\n';
		   $children_div.html($children_div.html() + add_html);
		   parent_heading.set_indent($children_div, 1);
		   var $add_heading = $parent.children('.children').children('.add_heading');
		   // Remove the "Loading..." message
		   $children_div.children('.loading').remove();
		   // Connect the add_heading to its click function
		   $add_div = $parent.children('.children').children('.add_heading');
		   $add_div.click(function() {
		       alert('New child of ' + parent_heading.id);
		       });
	       }
	      );
	// Mark this element as populated
    };
    // Method cycles between open and closed states
    this.toggle = function() {
	element = $('#heading' + this.id);
	icon = element.children('.clickable').children('i.twisty');
	if (icon.hasClass('icon-chevron-right')) {
	    icon.removeClass('icon-chevron-right');
	    icon.addClass('icon-chevron-down');
	    }
	else if (icon.hasClass('icon-chevron-down')) {
	    icon.removeClass('icon-chevron-down');
	    icon.addClass('icon-chevron-right');
	    }
	element.children('.children').slideToggle();
	// Populate all the children
	element.children('.children').children('.heading').each( function() {
	    if($(this).data('populated') != true) {
		this_heading = new heading({heading_div: $(this)});
		this_heading.populate_children();
	    }
	});
    };
};

$(document).ready(function() {
    // Determine the width of the chevron icon
    $('body').html($('body').html() + '<i id="test-icon""></i>');
    var $test_icon = $('#test-icon');
    $test_icon.css('display', 'none');
    $test_icon.addClass('icon-chevron-right');
    $('body').data('icon_width', Number($test_icon.css('width').slice(0,-2)));
    // Find and populate the workspace
    var $old_table = $('#non-js-table');
    var $workspace = $('#node-workspace');
    $workspace.html('<div class="children"></div>\n');
    if ($old_table.attr('node_id')) {
	$workspace.attr('node_id', $old_table.attr('node_id'));
    }
    else {
	$workspace.attr('node_id', '0');
    }
    $workspace.attr('level', '-1');
    $workspace.attr('id', 'heading'+$workspace.attr('node_id'));
    $workspace.css('visibility', 'hidden');
    var workspace = new heading({
	heading_div: $workspace,
    });
    workspace.populate_children();
    var $children = $workspace.children('.children');
    $children.css('display', 'block');
    $workspace.css('visibility', 'visible');
    $('#non-js-table').remove();
});

window.onload = function() {
    // Once the doument loads then go about grabbing the first level of children
    $('div.heading').each(function() {
	var row = new heading({heading_div: $(this)});
	row.populate_children();
    });
};
