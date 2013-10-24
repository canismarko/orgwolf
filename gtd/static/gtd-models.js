/*************************************************
* GtdHeading object. Represents a Node object
* in the server side.
*
*************************************************/

// Constructor
GtdHeading = function ( args ) {
    var parent, $body, sane;
    if ( ! args ) {
	args = {};
    }
    // Set defaults in the constructor
    //   Setting specific field values occurs in the set_fields() method
    //   which is called at the end of the constructor
    this.pk = 0;
    this.populated = false;
    this.text = '';
    this.expandable = 'lazy';
    this.todo_state = 0;
    this.archived = false;
    this.rank = 1;
    this.state = 'closed';
    this.visible = false;
    this.scope = [];
    this.related_projects = [];
    this.children = new HeadingManager(args.workspace);
    // Now update the fields with passed values
    this.set_fields( args );
    this.parent_obj = this.get_parent();
    // determine rank if possible
    if ( this.workspace ) {
	if ( this.parent_obj ) {
	    this.rank = this.parent_obj.rank + 1;
	}
    }
    // Add this to the parent's list of children
    if ( this.parent_obj ) {
	this.parent_obj.children.add(this);
    }
}; // end of GtdHeading constructor

// Methods for GtdHeading...

GtdHeading.prototype.set_fields = function( node ) {
    // Updates properties based on a JSON serliazed Node object
    var field, d, date_re, pk;
    pk = this.pk;
    date_re = /^\d{4}-\d{2}-\d{2}[0-9:TZ]*/;
    if ( node.pk !== undefined ) {
	this.pk = Number(node.pk);
    }
    if ( typeof node.workspace !== 'undefined' ) {
	this.workspace = node.workspace;
    }
    // Sanity checks
    try {
	if ( node.fields.parent === this.pk ) {
	    throw 'bad parent';
	}
    } catch(err) {
	if ( err === 'bad parent' ) {
	    console.error('Cannot create node as a child of itself');
	    throw err;
	}
    }
    // Set fields
    for ( field in node.fields ) {
	if ( node.fields.hasOwnProperty(field) ) {
	    // Check for datestring
	    if (date_re.exec(node.fields[field])) {
		this[field] = new Date( node.fields[field] );
	    } else {
		this[field] = node.fields[field];
	    }
	}
    }
};

GtdHeading.prototype.get_todo_state = function() {
    // Look through the outline.todo_state and return the correct
    // TodoState object
    var found_state, i, state, response;
    found_state = null;
    if ( typeof this.workspace !== 'undefined' ) {
	for ( i=0; i < this.workspace.todo_states.length; i += 1 ) {
	    state = this.workspace.todo_states[i];
	    if ( state.pk === Number(this.todo_state) ) {
		found_state = state;
	    }
	}
    }
    if ( found_state ) {
	response = found_state;
    } else {
	response = {pk: this.todo_state};
    }
    return response;
};

GtdHeading.prototype.get_title = function() {
    // Get the HTML version of this headings title
    var title;
    title = this.title;
    if ( this.archived ) {
	title = '<span class="archived-text">' +
	    title + '</span>';
    }
    return title;
};

GtdHeading.prototype.set_selectors = function() {
    // Determine how to find each piece of the heading
    $workspace = $(this.workspace.$parent);
    if ( this.rank > 0 ) {
	var new_selector = '.heading';
	new_selector += '[node_id="' + this.pk + '"]';
	// Set selectors
	this.$element = $workspace.find(new_selector);
	this.$hoverable = this.$element.children('.ow-hoverable');
	this.$details = this.$element.children('.details');
	this.$children = this.$element.children('.children');
	this.$loading = this.$details.children('.loading');
	this.$clickable = this.$hoverable.children('.clickable');
	this.$todo_state = this.$hoverable.children('.todo-state');
	this.$icon = this.$hoverable.children('i');
	this.$text = this.$details.children('.ow-text');
	this.$buttons = this.$hoverable.children('.ow-buttons');
	this.$title = this.$hoverable.children('.ow-title');
    }
};

// Tree-related methods
GtdHeading.prototype.get_previous_sibling = function() {
    // Find the previous sibling.
    // If the node is a root node this means the one with the next lowest
    //   tree_id. Else use MPTT edges.
    // Returns:
    //   GtdHeading object if previous sibling is found
    //   null if heading is first child
    //   undefined if previous sibling exists by edge but is not in headings
    var found, curr_tree, curr_lft;
    found = null;
    if ( this.level === 0 ) {
	// For root level nodes find by tree_id
	curr_tree = this.tree_id;
	while( curr_tree > 1 && found === null ) {
	    curr_tree = curr_tree - 1;
	    found = this.workspace.headings.get(
		{
		    tree_id: curr_tree,
		    level: 0,
		}
	    );
	}
    } else {
	// For non-root nodes find by MPTT edges
	curr_lft = this.lft;
	while( curr_lft > 1 && found === null ) {
	    curr_lft = curr_lft - 2;
	    found = this.workspace.headings.get(
		{
		    tree_id: this.tree_id,
		    level: this.level,
		    parent: this.parent,
		    lft: curr_lft
		}
	    );
	}
    }
    return found;
};

GtdHeading.prototype.get_parent = function() {
    var parent;
    if ( this.rank > 0 && this.workspace ) {
	if ( this.parent === null ) {
	    // null parent attribute means return heading pk=0
	    parent = this.workspace.headings.get({pk: 0});
	    parent = parent ? parent : this.workspace;
	} else {
	    parent = this.workspace.headings.get({pk: this.parent});
	}
    } else {
	parent = null;
    }
    return parent;
};

GtdHeading.prototype.get_children = function() {
    var children;
    if ( this.rank === 0 ) {
	// if this is the workspace
	children = this.workspace.headings.filter_by( {rank: 1} );
    } else {
	children = this.workspace.headings.filter_by({parent: this.pk})
	    .order_by('lft');
    }
    return children;
};

GtdHeading.prototype.refresh_tree = function() {
    // Reach out to the server API and get new node data for this heading's tree
    var url, i, heading, new_heading;
    url = '/gtd/tree/' + this.tree_id + '/';
    heading = this;
    $.get(url, function (r) {
	while ( typeof r === 'string' ) {
	    r = $.parseJSON(r);
	}
	for ( i=0; i < r.length; i += 1 ) {
	    new_heading = new GtdHeading(r[i]);
	    heading.workspace.headings.add(new_heading);
	}
    });
};

GtdHeading.prototype.is_leaf_node = function() {
    var status;
    if (this.rght-this.lft === 1) {
	status = true;
    } else if (this.rght-this.lft > 1) {
	status = false;
    } else {
	status = undefined;
    }
    return status;
};

GtdHeading.prototype.is_expandable = function() {
    // Return true if the heading has information that
    // can be seen by expanding a twisty.
    var expandable, children, response;
    expandable = false;
    if ( this.rank === 0 ) {
	// The main workspace is always expandable
	expandable = true;
    }
    if  ( this.text ) {
	// Anything with text is always expandable
	expandable = true;
    } else if ( this.workspace.show_all ) {
	// Any children are visible
	if ( this.workspace.active_scope ) {
	    expandable = this.get_children().filter_by(
		{scope: this.workspace.active_scope} ).length;
	} else {
	    expandable = ! this.is_leaf_node();
	}
    } else {
	// Only non-archived children are visible
	children = this.get_children();
	if ( this.workspace.active_scope ) {
	    children = children.filter_by(
		{ scope: this.workspace.active_scope }
	    );
	}
	if ( children.filter_by({archived: false}).length ) {
	    expandable = true;
	} else if ( this.populated === false && !this.is_leaf_node() ) {
	    expandable = true;
	}
    }
    if ( expandable ) {
	response = true;
    } else {
	response = false;
    }
    return response;
};

GtdHeading.prototype.is_visible = function() {
    // Determine if the heading is visible.
    // Some operations can be skipped if it's not.
    var visibility, showall;
    visibility = this.visible;
    showall = this.workspace ? this.workspace.show_all : false;
    if ( this.archived && ! showall ) {
	visibility = false;
    }
    return visibility;
};

GtdHeading.prototype.update = function() {
    // Helper method updates template properties before $dispatch is called.
    // Should be called after significant changes are made
    // to the heading's properties. Should also update ancestors
    // if necessary.
    re = /\S+/;
    if ( re.test(this.text) ) {
	this.expandable = 'yes';
    } else if (this.populated) {
	// Inspect the number of descendants for correct tree structure
	if (this.children.length > 0) {
	    this.expandable = 'yes';
	} else {
	    this.expandable = 'no';
	}
    }
};

GtdHeading.prototype.save = function() {
    // Method sends changes back to the server
    woijef;
}

GtdHeading.prototype.move_to = function(target, options) {
    var heading, positions, status, is_valid_move, arrange_as_child, arrange_as_sibling;
    // Method inserts a new heading into a tree relative to target
    // based on options.position. If options.save is set to true,
    // then the command will be sent back to the server as well.
    heading = this;
    status = true;
    // Set options default
    if ( options === undefined ) {
	options = {};
    }
    if ( options.position === undefined ) {
	options.position = 'first-child';
    }
    if ( options.save === undefined ) {
	options.save = false;
    }
    // Helper functions
    is_valid_move = function () {
	var success = true;
	if ( heading.tree_id === target.tree_id ) {
	    if ( heading === target ) {
		// Becoming its own parent is illogical
		console.error(
		    'GtdHeading refusing to move relative to itself'
		);
		success = false;
	    } else if ( target.lft > heading.lft && target.rght < heading.rght ) {
		// Moving relative to a child would break traversability
		console.error(
		    'GtdHeading refusing to move relative to its own child'
		);
		success = false;
	    }
	}
	return success;
    };
    arrange_as_child = function() {
	var valid = is_valid_move();
	if ( valid === true ) {
	    heading.parent = target.pk;
	    heading.tree_id = target.tree_id;
	    heading.level = target.level + 1;
	    heading.rank = target.rank + 1;
	}
	return valid;
    };
    arrange_as_sibling = function() {
	var valid = is_valid_move();
	if ( valid === true ) {
	    heading.parent = target.parent;
	    heading.tree_id = target.tree_id;
	    heading.level = target.level;
	    heading.rank = target.rank;
	}
	return valid;
    };
    // Object holds functions for inserting a node for
    // each value of options.position
    positions = {
	'first-child': function() {
	    // Put the child at the beginning of the first child
	    var valid = arrange_as_child();
	    if ( valid === true ) {
		heading.lft = -1;
	    }
	    return valid;
	},
	'last-child': function() {
	    // Put the new heading after the last child
	    var valid, children;
	    valid = arrange_as_child();
	    if ( valid === true ) {
		children = target.get_children();
		heading.lft = children[children.length-1].lft + 1;
	    }
	    return valid;
	},
	'left': function() {
	    // Put the new heading to the left of the target
	    var valid = arrange_as_sibling();
	    if ( valid === true ) {
		heading.lft = target.lft - 1;
	    }
	    return valid;
	},
	'right': function() {
	    // Put the new heading to the right of the target
	    var valid = arrange_as_sibling();
	    if ( valid === true ) {
		heading.lft = target.lft + 1;
	    }
	    return valid;
	}
    };
    // Call the appropriate function for this position and rebuild the tree
    if ( typeof positions[options.position] === 'function' ) {
	status = positions[options.position]();
    } else {
	status = false;
    }
    if ( status === true ) {
	heading.rebuild();
    }
    return status;
};

GtdHeading.prototype.rebuild = function() {
    // Recursively walks through a tree and sets lft and rght
    // Currently this method assumes root_node.lft is set properly
    // In the future, some AJAX magic may verify this with the server
    var root, set_edges;
    root = this.workspace.headings.get(
	{
	    tree_id: this.tree_id,
	    rank: 1
	}
    );
    set_edges = function( heading, new_lft ) {
	// Recursive function that sets a node and its children
	// returns new heading.rght
	var children, new_rght, i;
	heading.lft = new_lft;
	children = heading.get_children();
	new_rght = new_lft + 1;
	for ( i = 0; i < children.length; i += 1 ) {
	    new_rght = set_edges( children[i], new_rght ) + 1;
	}
	heading.rght = new_rght;
	return new_rght;
    };
    // Set root.lft if it's no defined
    if ( root.lft === undefined ) {
	root.lft = 1;
    }
    // Start the sinful recursion loop
    set_edges( root, root.lft );
};

GtdHeading.prototype.has_scope = function(pk) {
    var response;
    if ( pk === 0 ) {
	// Zero indicates all nodes
	response = true;
    } else if ( (pk === -1) && (this.scope.length === 0) ) {
	response = true;
    } else if ( jQuery.inArray(pk, this.scope) > -1 ) {
	// This node is in the given scope
	response = true;
    } else {
	// Not found
	response = false;
    }
    return response;
};

GtdHeading.prototype.set_indent = function($target, offset) {
    var indent = (this.icon_width + 4) * offset;
    $target.css('margin-left', indent + 'px');
};

GtdHeading.prototype.populate_children = function(options) {
    // Gets children via AJAX request and creates their div elements
    var url, ancestor, get_nodes;
    if ( typeof options === 'undefined' ) {
	options = {};
    }
    url = '/gtd/node/descendants/' + this.pk + '/';
    ancestor = this;
    get_nodes = function(options) {
	// Get immediate children
	var payload = {offset: options.offset};
	$.getJSON(url, payload, function(response, status, jqXHR) {
	    // (callback) Process AJAX to get an array of children objects
	    ancestor.workspace.$apply(function() {
		var nodes, i, node, heading, parent;
		if ( status === 'success' ) {
		    nodes = response;
		    // Process each node in the response
		    for ( i=0; i < nodes.length; i += 1 ) {
			node = nodes[i];
			node.workspace = ancestor.workspace;
			heading = new GtdHeading(node);
			parent = heading.get_parent();
			if ( parent || heading.rank === 1) {
			    // Only add this heading if the parent exists
			    //   or it's a first rank heading
			    heading = ancestor.workspace.headings.add(heading);
			}
			if ( parent ) {
			    parent.children.add(heading);
			    // Check visibility
			    if ( parent.state === 'open' ) {
			    	heading.visible = true;
			    }
			    // Remove the loading... indicator
			    // if ( (!parent.populated) && parent.$details) {
			    // 	if ( options.offset === 1 ) {
			    // 	    parent.$loading.slideUp(
			    // 		parent.workspace.ANIM_SPEED
			    // 	    );
			    // 	} else {
			    // 	    parent.$loading.hide();
			    // 	}
			    // }
			}
		    }
		    // Used to make sure ow_waiting works right during page load
		    if ( ancestor.rank === 0 ) {
			ancestor.populated = true;
		    }
		    // Update parents
		    if ( options.offset === 1 ) {
			ancestor.populated = true;
			ancestor.update();
		    } else if ( options.offset === 2) {
		    	for (var i=0; i<ancestor.children.length; i++) {
		    	    ancestor.children[i].populated = true;
			    ancestor.children[i].update();
		    	}
		    }
		    // If a callback is passed, call it now
		    if ( options.callback ) {
			options.callback();
		    }
		}
	    });
	});
    };
    if ( ! this.populated ) {
	// Not yet populated, so get children by ajax
	if ( this.rank > 0 && this.$children ) {
	    this.$children.hide();
	}
	get_nodes(
	    {
		offset: 1,
		callback: function() {
		    if ( ! ancestor.populated_level_2 ) {
			// for (var i=0; i<ancestor.children.length; i++) {
			//     // Default to no children, updated after AJAX call
			//     ancestor.children[i].expandable = 'no';
			// }
			get_nodes( {offset: 2} );
			ancestor.populated_level_2 = true;
		    }
		}
	    }
	);
    } else if ( ! this.populated_level_2 ) {
	get_nodes( {offset: 2} );
	this.populated_level_2 = true;
    }
}; // end this.populate_children()

GtdHeading.prototype.toggle = function( direction ) {
    // Populate children if not already done
    this.populate_children();
    // Show or hide the children div based on present state
    if(this.state === 'open') {
	this.state = 'closed';
    } else if (this.state === 'closed') {
	this.state = 'open';
    }
};

// End of GtdHeading definition

/*************************************************
* HeadingManager model. Modified array holds
* individual GtdHeading objects.
*************************************************/

// Subclass an array that holds headings
var HeadingManager = function(workspace) {
    var headings = [];
    headings.workspace = workspace;
    return headings;
};
// Override some method to Array() objects
Array.prototype.get = function(query) {
    // returns a single heading object based on the query
    var found, filtered;
    filtered = this.filter_by(query);
    if (filtered.length === 1) {
	found = filtered[0];
    } else if ( filtered.length > 1 ) {
	console.error('HeadingManager.get():' +
		      'query did not produce unique result. ' +
		      'Returning first result');
	console.log(query);
	console.log(filtered);
	found = filtered[0];
    } else {
	found = null;
    }
    return found;
};
Array.prototype.filter_by = function(criteria) {
    // Step through the list and filter by any
    // properties listed in criteria object
    var filtered, i, heading, passed, key;
    filtered = [];
    for ( i = 0; i < this.length; i += 1 ) {
	heading = this[i];
	// Removed to allow filtering on workspace
	if (heading.rank === 0) {
	    passed = false;
	} else {
	    passed = true;
	}
	for ( key in criteria ) {
	    if ( criteria.hasOwnProperty(key) ) {
		// check each criterion, reject if it fails
		if ( heading[key] instanceof Array ) {
		    if ( criteria[key] instanceof Array ) {
			if (! (($(heading.scope).not([]).length === 0 && $([]).not(heading.scope).length === 0) && typeof heading.scope !== 'undefined')) {
			    passed = false;
			}
		    } else {
			if ( jQuery.inArray( criteria[key], heading[key] ) < 0 ) {
			    passed = false;
			}
		    }
		} else {
		    if ( heading[key] !== criteria[key] ) {
			passed = false;

		    }
		}
	    }
	}
	if (passed) {
	    filtered.push(heading);
	}
    }
    return filtered;
}; // end of filter_by() method
Array.prototype.order_by = function(field) {
    // Accepts a string and orders according to
    // the field represented by that string.
    // '-field' reverses the order.
    var fields, sorted, compare;
    fields = /^(-)?(\S*)$/.exec(field);
    sorted = this.slice(0);
    compare = function( a, b ) {
	var num_a, num_b, response;
	num_a = Number(a[fields[2]]);
	num_b = Number(b[fields[2]]);
	if ( num_a && num_b ) {
	    // Sorting by number
	    response = num_a - num_b;
	} else {
	    // Sorting by alphabet
	    if ( a < b ) {
		response = -1;
	    } else if ( a > b ) {
		response = 1;
	    } else {
		response = 0;
	    }
	}
	return response;
    };
    sorted.sort(compare);
    if ( fields[1] === '-' ) {
	sorted.reverse();
    }
    return sorted;
}; // end of order_by method
Array.prototype.add = function(headings) {
    // Add or replace a heading based on pk
    // Returns the authoritative object
    var that, key, other_heading, valid, real_heading, insert, new_heading;
    that = this;
    valid = ['pk', 'populated', 'text', 'todo_state', 'archived', 'rank', 'scope', 'related_projects', 'parent'];
    insert = function(new_heading) {
	var new_heading;
	other_heading = that.get({pk: new_heading.pk});
	if ( other_heading ) {
	    // Heading already exists so just update it
	    // First preserve some data
	    new_heading.populated = other_heading.populated;
	    for ( key in new_heading ) {
		if ( new_heading.hasOwnProperty(key) ) {
		    other_heading[key] = new_heading[key];
		}
	    }
	    real_heading = other_heading;
	} else {
	    // Heading doesn't exist so push it to the stack
	    // new_heading.workspace = that.workspace;
	    that.push(new_heading);
	    real_heading = new_heading;
	}
	real_heading.update();
	return real_heading;
    };
    // Determine if one object or array-like
    if ( headings.length > 1 ) {
	for ( i=0; i<headings.length; i++ ) {
	    var new_heading = new GtdHeading(headings[i]);
	    insert(new_heading);
	}
    } else {
	real_heading = insert(headings);
    }

    return real_heading;
};
// end definition of HeadingManager()
