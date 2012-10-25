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
    timezone.activate('America/New_York')
    current_tz = timezone.get_current_timezone() # TODO: allow user to set timezone
    new_datetime = datetime(time_struct.tm_year, 
                            time_struct.tm_mon,
                            time_struct.tm_mday,
                            time_struct.tm_hour,
                            time_struct.tm_min,
                            time_struct.tm_sec,
                            tzinfo=current_tz)#timezone.get_current_timezone())
    return new_datetime

def reset_database(confirm=False):
    """
    Deletes all GTD related items from the database. Should not be used
    under normal operations. It is intended for use in unit testing.
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
    module. # TODO: rewrite this without PyOrgMode
    """
    start_time = datetime.now()
    # print "Starting import at", start_time
    REGEX_REPEAT = "([\+\.]{1,2})(\d+)([dwmy])"
    new_structure = PyOrgMode.OrgDataStructure()
    new_structure.plugins = [PyOrgMode.OrgNode(), PyOrgMode.OrgSchedule(), PyOrgMode.OrgClock()]
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
        order = 10
        order_step = Node.ORDER_STEP
        for child_orgnode in current_orgnode:
            try:
                child_orgnode.TYPE
            except AttributeError:
                # This is some text related to its parent
                if child_orgnode.__class__ == str:
                    new_text += child_orgnode + "\n"
            else:
                # If this child is itself a parent, then process and recurse
                if child_orgnode.TYPE == 'NODE_ELEMENT':
                    # If a top level node then it's also a project
                    if parent_node == None and child_orgnode.heading != '':
                        project = Project()
                        project.title = child_orgnode.heading
                        project.owner_id = 1 # TODO: set to current user
                        project.clean_fields()
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
                    new_node.priority = child_orgnode.priority
                    new_node.tag_string = child_orgnode.tags
                    new_node.owner_id = 1 # TODO: set to current user
                    # Ordering
                    new_node.order = order
                    order += order_step
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
    # print "Ending import at", stop_time, "(", stop_time-start_time, ")"

def export_to_string(node=None):
    """
    Take the selected node and output it to as an org-mode file
    that's a string.
    """
    output_string = ""
    current_level = 1 # Tracks how many *'s are at the begging of a heading
    if node == None:
       root_nodes_qs = Node.objects.filter(parent=None)
    else:
        root_nodes_qs = Node.objects.filter(parent=node)
    # some more sinful recursion.
    # process each node and find and process its children recursively
    def heading_as_string(current_node, level):
        heading_string = "*" * level + " "
        if hasattr(current_node.todo_state, 'abbreviation'):
            heading_string += current_node.todo_state.abbreviation + " "
        if current_node.priority != "":
            heading_string += "[#" + current_node.priority + "] "
        heading_string += current_node.title
        if hasattr(current_node, 'tag_string'):
            heading_string += " " + current_node.tag_string
        heading_string += "\n"
        # add scheduled components
        if current_node.scheduled or current_node.deadline or current_node.closed:
            scheduled_string = " " * level # Indent
            if current_node.scheduled:
                scheduled_string += current_node.scheduled.strftime(" SCHEDULED: <%Y-%m-%d %a")
                if current_node.scheduled_time_specific:
                    scheduled_string += current_node.scheduled.strftime(" %H:%M>")
                else:
                    scheduled_string += ">"
            if current_node.deadline:
                scheduled_string += current_node.deadline.strftime(" DEADLINE: <%Y-%m-%d %a")
                if current_node.deadline_time_specific:
                    scheduled_string += current_node.deadline.strftime(" %H:%M")
                else:
                    scheduled_string += ">"
            if current_node.closed:
                scheduled_string += current_node.closed.strftime(" CLOSED: <%Y-%m-%d %a %H:%M>")
            heading_string += scheduled_string + "\n"
        # Check for text associated with this heading
        text_qs = Text.objects.filter(parent = current_node)
        for text in text_qs:
            heading_string += text.text
        # Now we look for any child nodes and add their text
        child_node_qs = Node.objects.filter(parent = current_node)
        for child_node in child_node_qs:
            heading_string += heading_as_string(child_node, level+1)
        # Finally, return the compelted string
        return heading_string
    for root_node in root_nodes_qs:
        output_string += heading_as_string(root_node, 1)
    # Remove extra newline artifact
    output_string = output_string[0:-1]
    return output_string

def standardize_string(input_string):
    """Apply common conventions for spacing and ordering.
    This can be useful for unit-testing."""
    # remove excess whitespace from headers
    # tag_regex = re.compile(r'(\*+.*\b(?=[ \t]+:[\w:]+:\s*$))[ \t]+(:[\w:]+:)\s*$')
    node_regex = re.compile(r"""
        ^(\*+) # Leading stars
        \s*(.*?(?=:\S+:)?) # The actual heading (with lookahead to avoid tags)
        \s*(:\S+:)? # The tag string itself
        $""", re.X)
    # print whitespace_regex.findall(input_string)
    # input_string = whitespace_regex.sub(r'\1 \2', input_string)
    date_regex = re.compile(
        r'[ \t]((?:scheduled|deadline|closed):[ \t]*<[^>]+>)',
        re.I
        )
    # Put deadline, closed elements in order
    line_list = input_string.split('\n')
    new_string = ""
    for line in line_list:
        new_line = line
        # Modify nodes
        re_result = node_regex.findall(line)
        if re_result:
            new_line = ""
            new_line += re_result[0][0]
            if re_result[0][1]:
                new_line += " " + re_result[0][1]
            if re_result[0][2]:
                new_line += " " + re_result[0][2]
        # Rearrange and append the results of the date regex
        re_result = sorted(date_regex.findall(line))
        if re_result:
            count = 0
            new_line = ""
            for item in re_result:
                count += 1
                if count == 1:
                    new_line += item
        new_string += new_line + "\n"
    return unicode(new_string)
