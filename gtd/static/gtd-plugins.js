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
    var methods = {
	init: function(args) {
	    this.each(function() {
		// Process each outline in the DOM
		var $this, workspace;
		$this = $(this);
		node_id = $this.attr('data-node_id')
		// The workspace object is a monkey-patched GtdHeading object
		workspace = new GtdHeading( {
		    pk: node_id,
		    title: 'Outline Workspace',
		});
		
	    });
	},

    };
    // Method selection magic
    $.fn.nodeOutlineApp = function( method ) {
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
}(jQuery)); // end of nodeOutline plugin
