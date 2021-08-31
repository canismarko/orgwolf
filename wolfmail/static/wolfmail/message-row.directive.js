"use strict";

import "angular";

angular.module("orgwolf.wolfmail")
    .directive('owMessageRow', owMessageRow);


function owMessageRow() {
    /*************************************************
     * Directive sets the parameters of next
     * actions table row
     **************************************************/
    function link(scope, element, attrs) {
	var $element, $bTask, $bProject, $bComplete, $bDefer, $bArchive, $bDelete;
	$element = $(element);
	$element.find('span').tooltip();
	scope.headings = [];
	// Find buttons
	$bTask = $element.find('.inbox-list__action-button--new-task');
	$bProject = $element.find('.inbox-list__action-button--new-project');
	$bComplete = $element.find('.inbox-list__action-button--complete');
	$bDefer = $element.find('.inbox-list__action-button--defer');
	$bArchive = $element.find('.inbox-list__action-button--archive');
	$bDelete = $element.find('.inbox-list__action-button--delete');
	// Set button visibility for this row
	if (attrs.owHandler === 'plugins.deferred') {
	    // Deferred nodes
	    $bProject.remove();
	    $bArchive.remove();
	    $bDelete.remove();
	} else {
	    $bComplete.remove();
	}
	// Respond to new rows being added
	scope.$on('heading-created', function(e, message, newHeading) {
	    if ( scope.message.id === message.id ) {
		scope.headings.push(newHeading);
	    }
	});
    }
    return {
	scope: true,
	link: link,
    };
}
