"use strict";

import { module, extend } from "angular";
import * as $ from "jquery";

module('orgwolf.actionList')

    .directive('owListRow', owListRow);


owListRow.$inject = ['$rootScope', 'todoStates', '$filter'];


function owListRow($rootScope, todoStates, $filter) {
    /*************************************************
     * Directive sets the parameters of next
     * actions table row
     **************************************************/
    function link(scope, element, attrs) {
        var node_pk, $element;
        $element = $(element);
        element.addClass("heading-row");
        element.addClass('priority' + (scope.heading.priority || 'B'));
        // Get heading's todoState
        scope.todoState = todoStates.getState(scope.heading.todo_state);
        // Process tag_string into tags
        scope.tags = scope.heading.tag_string.slice(1, -1).split(':');
        // Determine bootstrap row style based on overdue status
        scope.$watch(
            function() { return scope.heading.deadline_date; },
            function(newDeadline) {
                var row_cls;
                if (newDeadline) {
                    scope.owDate = $filter('deadline_str')(newDeadline);
                }
                element.removeClass('overdue');
                element.removeClass('upcoming');
                row_cls = $filter('deadline_class')(newDeadline);
                element.addClass(row_cls);
            }
        );
        // CSS class based on archived status
        scope.$watch(
            'heading.fields.archived',
            function(archived) {
                if (archived) {
                    element.addClass('archived');
                }
            }
        );
        // CSS class based on priority
        scope.$watch(
            'heading.fields.priority',
            function(new_priority, old_priority) {
                // Remove old CSS class
                if (old_priority) {
                    element.removeClass('priority-' + old_priority);
                }
                // And add new one
                if (new_priority) {
                    element.addClass('priority-' + new_priority);
                }
            }
        );
        // Handlers for action buttons
        scope.edit = function() {
            var $off;
            scope.isEditable = true;
            $off = scope.$on('finishEdit', function(e) {
                scope.isEditable = false;
                $off();
            });
        };
        // Response when user edits the heading
        scope.$on('finishEdit', function(e, newHeading, completed) {
            e.stopPropagation();
            extend(scope.heading, newHeading);
            scope.completed = completed;
        });
    }
    return {
        link: link,
        scope: {
            heading: '=owHeading',
            owDate: '@',
        },
        templateUrl: '/static/actions-list-row.html',
    };
}
