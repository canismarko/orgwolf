#######################################################################
# Copyright 2012 Mark Wolf
#
# This file is part of OrgWolf.
#
# OrgWolf is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#######################################################################

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from datetime import datetime
from django.utils import timezone
import pytz # At least as a reminder to have it installed
import re

from PyOrgMode import PyOrgMode
from GettingThingsDone.models import Node, Project, TodoState, Text
from GettingThingsDone.views import get_todo_abbrevs

def time_to_datetime(time_struct):
    new_datetime = datetime(time_struct.tm_year, 
                            time_struct.tm_mon,
                            time_struct.tm_mday,
                            time_struct.tm_hour,
                            time_struct.tm_min,
                            time_struct.tm_sec,
                            tzinfo=timezone.utc)
    return new_datetime

def reset_database(confirm=False):
    """
    Deletes all GTD related items from the database. Should not be used
    under normal operations.
    """
    if confirm == True:
        nodes = Node.objects.all()
        projects = Project.objects.all()
        texts = Text.objects.all()
        print "Deleting", nodes.count(), "nodes."
        for node in nodes:
            node.delete()
        print "Deleting", projects.count(), "projects."
        for project in projects:
            project.delete()
        print "Deleting", texts.count(), "text items."
        for text in texts:
            text.delete()
    else:
        print "This function deletes the database. Pass argument confirm=True to pull the trigger."

def import_structure(file=None, string=None):
    """
    Parses either an org-mode file or an org-mode string and saves the
    resulting heirerarchy to the OrgWolf models in the GettingThingsDone
    module.
    """
    start_time = datetime.now()
    print "Starting import at", start_time
    REGEX_REPEAT = "([\+\.]{1,2})(\d+)([dwmy])"
    new_structure = PyOrgMode.OrgDataStructure()
    new_structure.set_todo_states(get_todo_abbrevs())
    # validate passed parameters
    if file and string:
        raise AttributeError("Please supply either a file or a string, not both.")
    if file:
        new_structure.load_from_file(file)
    elif string:
        new_structure.load_from_string(string)
    else:
        raise AttributeError("Please supply at least a file or a string")
    # Now for some wonderfully sinful recursion
    # Step through each item, if it's a node then step through its children
    def cycle_headings(current_orgnode, parent_node, project):
        new_text = ""
        # print(current_orgnode)
        for child_orgnode in current_orgnode:
            try:
                child_orgnode.TYPE
            except AttributeError:
                # This is some text related to its parent
                if child_orgnode.__class__ == str:
                    new_text += child_orgnode
            else:
                # If this child is itself a parent, then process and recurse
                if child_orgnode.TYPE == 'NODE_ELEMENT':
                    # If a top level node then it's also a project
                    if parent_node == None and child_orgnode.heading != '':
                        project = Project()
                        project.title = child_orgnode.heading
                        project.owner_id = 1 # TODO: set to current user
                        try:
                            project.clean_fields()
                        except ValidationError:
                            raise ValidationError
                        else:
                            project.save()
                    new_node = Node()
                    if parent_node.__class__ == Node:
                        new_node.parent = parent_node
                    # Parse Todo state
                    try:
                        todo_string = child_orgnode.todo
                    except AttributeError:
                        pass
                    else:
                        todo_state = TodoState.objects.get(abbreviation=todo_string)
                        new_node.todo_state = todo_state
                    new_node.title = child_orgnode.heading
                    new_node.tag_string = child_orgnode.tags
                    new_node.owner_id = 1 # TODO: set to current user
                    new_node.clean_fields()
                    new_node.save()
                    if not parent_node == None:
                        new_node.project.add(project)
                        new_node.save()
                    # Recurse
                    cycle_headings(child_orgnode.content, new_node, project)
                if child_orgnode.TYPE == 'SCHEDULE_ELEMENT':
                    # If this child is a schedule then add this information to its parent
                    # Check for scheduled...
                    try:
                        scheduled = child_orgnode.scheduled
                    except AttributeError:
                        pass
                    else:
                        new_datetime = time_to_datetime(scheduled.value)
                        parent_node.scheduled = new_datetime
                        if scheduled.format & scheduled.TIMED:
                            parent_node.scheduled_time_specific = True
                        if scheduled.format & scheduled.REPEAT:
                            repeat_info = re.findall(REGEX_REPEAT, scheduled.repeat)
                            if repeat_info[0][0].find('.'):
                                parent_node.repeating_strict_mode = False
                    # ...deadline...
                    try:
                        deadline = child_orgnode.deadline
                    except AttributeError:
                        pass
                    else:
                        new_datetime = time_to_datetime(deadline.value)
                        parent_node.deadline = new_datetime
                        if deadline.format & deadline.TIMED:
                            parent_node.deadline_time_specific = True
                    # ...or closed...
                    try:
                        closed = child_orgnode.closed
                    except AttributeError:
                        pass
                    else:
                        new_datetime = time_to_datetime(closed.value)
                        parent_node.closed = new_datetime
                    # ...then save
                    parent_node.save()
        if new_text:
            new_text_object = Text()
            if parent_node != None:
                try:
                    new_text_object.parent = parent_node
                except:
                    print child_orgnode
            # TODO: Change to current user
            current_user = User.objects.get(id=1)
            new_text_object.owner = current_user
            new_text_object.text = new_text
            # TODO: Add code to interpret new org-mode text
            new_text_object.clean_fields()
            new_text_object.save()
            new_text = ""
    # Here we actually enter the recursion loop
    cycle_headings(new_structure.root.content, None, None)
    stop_time = datetime.now()
    print "Ending import at", stop_time, "(", stop_time-start_time, ")"
