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

from __future__ import unicode_literals
from django.core.exceptions import ValidationError
from django.utils import unittest
from datetime import datetime
from django.utils import timezone
from io import StringIO
import pytz # At least as a reminder to have it installed
import re

from orgwolf.models import OrgWolfUser as User
from orgwolf.stack import Stack
from GettingThingsDone.models import Node, Project, TodoState, Text
from GettingThingsDone.views import get_todo_abbrevs

## Regular expressions used in this module for finding org-mode content
# Find headings (eg * TODO [#A] Heading :tag:)
r = r'^'
r += r'(\*+)[ \t]+' # Leading stars
r += r'((?!\[\#[A-Za-z0-9]\])[^ \t]+)?[ \t]*' # to-do state - validated in python
r += r'(?:\[\#([A-Za-z0-9])\])?[ \t]*' # Priority tag (eg [#A])
r += r'((?:[ \t]*?(?<=[ \t])(?!:\S+:[ \t]*$)[^ \t]+(?=(?:[ \t]|$)))+)?[ \t]*' # Remaining heading
r += r'(:\S+:)?[ \t]*' #tag string
r += r'$'
HEADING_RE = re.compile(r, re.UNICODE)
# Look for schedule, deadline or closed tags
r =  r''
r += r'(?:'
r += r'(SCHEDULED:|DEADLINE:)[ \t]*'
r += r'(<[^>]+>' # Date(time)stamp 
r += r'(?:--<[^>\]]+>)?)' # optional range
r += r'|'
r += r'(CLOSED:)[ \t]*'
r += r'(\[[^\]]+\])' # closed datetime stamp
r += r')'
TIME_SENSITIVE_RE = re.compile(r, re.UNICODE)
# Sort the active date strings (eg <2012-10-12>)
r =  r''
r += r'[<\[]' # Anchor
r += r'(\d{4})-(\d{2})-(\d{2})' # Date itself
r += r'(?:\s+(\w{3}))?' # Day (eg Fri)
r += r'(?:\s+(\d{1,2}):(\d{2}))?' # Optional time specification
r += r'(?:\s+([+.]\d+[dwmy]))?' # Repeating modifier (eg +4d)
r += r'[>\]]' # Closing anchor
r += r'(?:--' + r + r')?' # Optional range
DATE_RE = re.compile(r, re.UNICODE)

def reset_database(confirm=False):
    """
    Deletes all GTD related items from the database. Should not be used
    under normal operations. It is intended for use in unit testing.
    """
    if confirm == True:
        nodes = Node.objects.all()
        projects = Project.objects.all()
        texts = Text.objects.all()
        print("Deleting", nodes.count(), "nodes.")
        for node in nodes:
            node.delete()
        print("Deleting", projects.count(), "projects.")
        for project in projects:
            project.delete()
        print("Deleting", texts.count(), "text items.")
        for text in texts:
            text.delete()
    else:
        print("This function deletes the database. Pass argument confirm=True to pull the trigger.")

def import_structure(file=None, string=None, request=None):
    """
    Parses either an org-mode file or an org-mode string and saves the
    resulting heirerarchy to the OrgWolf models in the GettingThingsDone
    module. # TODO: rewrite this without PyOrgMode
    """
    if file and string:
        raise AttributeError("Please supply either a file or a string, not both.")
    elif string:
        source = StringIO(string)
    elif file:
        source = open(file, 'r')
    else:
        raise AttributeError("Please supply a file or a string")
    # First, build a list of dictionaries that hold the pieces of each line.
    data_list = []
    current_project = None
    if request:
        current_user = request.user
    else:
        current_user = User.objects.get(id=1)
    for line in source:
        data_list.append({'original': line})
    # Now go through each line and see if it matches a regex
    current_indent = 0 # counter
    current_order = 0
    parent_stack = Stack()
    todo_state_list = TodoState.objects.all() # Todo: filter by current user
    for line in data_list:
        heading_match = HEADING_RE.search(line['original'].strip("\n"))
        if heading_match: # It's a heading
            line_indent = len(heading_match.groups()[0])
            line['todo'] = heading_match.groups()[1]
            line['priority'] = heading_match.groups()[2]
            line['heading'] = heading_match.groups()[3]
            line['tag_string'] = heading_match.groups()[4]
            new_node = Node()
            if line_indent > current_indent: # New child
                # TODO: what if the user skips a level
                current_indent = current_indent + 1
                current_order = 0
            elif line_indent == current_indent: # Another child
                parent_stack.pop()
            elif line_indent < current_indent: # Back up to parent
                parent_stack.pop()
                for x in range(current_indent - line_indent):
                    # Move up the stack
                    current_order = parent_stack.head.value.order
                    parent_stack.pop()
                    current_indent = current_indent - 1
            # See if the 'todo' captured by the regex matches a current TodoState,
            #   if not then it's parts of the heading # TODO: find a way to not destroy whitespace
            if line['todo']:
                found = False
                for todo_state in todo_state_list:
                    if todo_state.abbreviation.lower() == line['todo'].lower():
                        new_node.todo_state = todo_state
                        found = True
                        break
                if found == False:
                    line['heading'] = line['todo'] + ' ' + str(line['heading'])
            if current_indent > 1:
                new_node.parent = parent_stack.head.value
            if current_indent == 1:
                # New project for first level heading
                new_project = Project()
                if line['heading']:
                    new_project.title = line['heading']
                else:
                    new_project.title = ''
                new_project.owner = current_user
                new_project.save()
                current_project = new_project
            if line['heading']:
                new_node.title = line['heading']
            else:
                new_node.title = ''
            new_node.owner = current_user
            new_node.order = current_order + 10
            if line['priority']:
                new_node.priority = line['priority']
            else:
                new_node.priority = ''
            if line['tag_string']:
                new_node.tag_string = line['tag_string']
            else:
                new_node.tag_string = ''
            new_node.save()
            new_node.project.add(current_project)
            # Update current state variables
            current_order = new_node.order
            parent_stack.push(new_node)
        else: # Some sort of text item
            # Test to see if it's a scheduled, deadline or closed modifier
            time_sensitive_match = TIME_SENSITIVE_RE.findall(line['original'])
            if time_sensitive_match:
                parent = parent_stack.head.value
                for match in time_sensitive_match:
                    # Bump a match for "CLOSED:" up to the 0 and 1 position
                    if match[2] and match[3]:
                        match = (match[2], match[3], "", "")
                    date_match = DATE_RE.search(match[1]).groups()
                    if date_match:
                        # Set some variables to make things easier to read
                        year = int(date_match[0])
                        month = int(date_match[1])
                        day = int(date_match[2])
                        if date_match[4]:
                            hour = int(date_match[4])
                        else:
                            hour = 0
                        if date_match[5]:
                            minute = int(date_match[5])
                        else:
                            minute = 0
                        naive_datetime = datetime(year,
                                                month,
                                                day,
                                                hour,
                                                minute)
                        new_datetime = timezone.get_current_timezone().localize(naive_datetime) # TODO: set to user's preferred timezone
                        # Fix for DST
                        # new_datetime = current_tz.normalize(new_datetime)
                        if date_match[4] and date_match[5]:
                            time_specific = True
                        else:
                            time_specific = False
                        if date_match[6]: # repeating
                            parent.repeating_number = date_match[6][1]
                            parent.repeating_unit = date_match[6][2]
                            if date_match[6][0] == "+":
                                parent.repeating_strict_mode = True
                            elif date_match[6][0] == ".":
                                parent.repeating_strict_mode = False
                        # Set the appropriate fields
                        if match[0] == "SCHEDULED:":
                            parent.scheduled = new_datetime
                            parent.scheduled_time_specific = time_specific
                        elif match[0] == "DEADLINE:":
                            parent.deadline = new_datetime
                            parent.deadline_time_specific = time_specific
                        elif match[0] == "CLOSED:":
                            parent.closed = new_datetime               
                        parent.save()
            else: # It's just a regular text item
                new_text = Text()
                new_text.text = line['original']
                new_text.owner = User.objects.get(id=1) # TODO: switch to request.user
                if current_indent > 0:
                    new_text.parent = parent_stack.head.value
                new_text.save()
                if current_project:
                    new_text.project.add(current_project)

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
        if current_node.title:
            heading_string += current_node.title
        if hasattr(current_node, 'tag_string'):
            heading_string += " " + str(current_node.tag_string)
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
    return new_string
