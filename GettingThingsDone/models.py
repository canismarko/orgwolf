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

from django.db import models
from django.db.models import Q
from django.contrib.auth.models import User
from django.utils.encoding import python_2_unicode_compatible
from datetime import datetime
import re

from orgwolf import settings

@python_2_unicode_compatible
class TodoState(models.Model):
    abbreviation = models.CharField(max_length=10, unique=True)
    display_text = models.CharField(max_length=30)
    actionable = models.BooleanField(default=True)
    done = models.BooleanField(default=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL)
    system_default = models.BooleanField(default=False)
    def __str__(self):
        return self.abbreviation + ' - ' + self.display_text

@python_2_unicode_compatible
class Tag(models.Model):
    display = models.CharField(max_length=100)
    tag_string = models.CharField(max_length=10)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True) # no owner means built-in tag
    public = models.BooleanField(default=True)
    def __str__(self):
        return self.display

class Tool(Tag):
    pass
    
class Location(Tag):
    GPS_info = False # TODO
    tools_available = models.ManyToManyField('Tool', related_name='including_locations_set', blank=True)

class Contact(Tag):
    f_name = models.CharField(max_length = 50)
    l_name = models.CharField(max_length = 50)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True)
    # message_contact = models.ForeignKey('messaging.contact', blank=True, null=True) # TODO: uncomment this once messaging is implemented

@python_2_unicode_compatible
class Context(models.Model):
    """A context is a [Location], with [Tool]s and/or [Contact]s available"""
    name = models.CharField(max_length=100)
    tools_available = models.ManyToManyField('Tool', related_name='including_contexts_set', blank=True)
    locations_available = models.ManyToManyField('Location', related_name='including_contexts_set', blank=True)
    people_required = models.ManyToManyField('Contact', related_name='including_contexts_set', blank=True)
    def __str__(self):
        return self.name
    def apply(self, queryset="blank"):
        """
        Filter a query set for this context. 
        Gets queryset of all objects of the Node class if no queryset 
        provided, then selects based on the tag_string of each object 
        in the queryset. Note that this method doesn't hit the database
        on the passed queryset, it just modifies the queryset based on 
        Context object attributes.
        """
        if queryset == "blank":
            queryset = Node.objects.all()
        final_queryset = queryset
        final_Q = Q()
        # Set some lists of tags to be used later
        excluded_tools = Tool.objects.all() # TODO: filter for current user
        included_tools = self.tools_available.all()
        excluded_locations = Location.objects.all() # TODO: filter for current user
        included_locations = self.locations_available.all()
        required_people = self.people_required.all()
        for tool in included_tools:
            excluded_tools = excluded_tools.exclude(id=tool.id)
        for location in included_locations:
            location_tools = location.tools_available.all()
            for tool in location_tools:
                excluded_tools = excluded_tools.exclude(id=tool.id)
            excluded_locations = excluded_locations.exclude(id=location.id)
        # Filter based on excluded tools and locations
        for tool in excluded_tools:
            tag_string = tool.tag_string
            final_queryset = final_queryset.exclude(tag_string__icontains=tool.tag_string)
        for location in excluded_locations:
            final_queryset = final_queryset.exclude(tag_string__icontains=tool.tag_string)
        # For required_people we have to construct a Q object
        new_Q = Q()
        for contact in required_people:
            new_Q = new_Q | Q(tag_string__icontains=contact.tag_string)
        final_queryset = final_queryset.filter(new_Q)
        # Now return the resulting queryset
        return final_queryset

class Priority(models.Model):
    priority_value = models.IntegerField(default=50)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL)

class Scope(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True) # no owner means built-in tag
    public = models.BooleanField(default=True)
    display = models.CharField(max_length=50)

@python_2_unicode_compatible
class Node(models.Model):
    """
    Django model that holds some sort of divisional heading. 
    Similar to orgmode '*** Heading' syntax. 
    It can have todo states associated with it as well as 
    scheduling and other information. Each Node object must
    be associated with a project. A project is a Node with 
    no parent (a top level Node)
    """
    ORDER_STEP = 10
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="owned_node_set")
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True)
    order = models.IntegerField() # TODO: autoincrement
    title = models.TextField(blank=True)
    todo_state = models.ForeignKey('TodoState', blank=True, null=True)
    # Determine where this heading is
    parent = models.ForeignKey('self', blank=True, null=True, related_name='child_heading_set')
    project = models.ManyToManyField('Project', related_name='project_heading_set') # should this be ForeignKey?
    assigned = models.ManyToManyField('Contact', related_name='assigned_nodes')
    # Scheduling details
    scheduled = models.DateTimeField(blank=True, null=True)
    scheduled_time_specific = models.BooleanField()
    deadline = models.DateTimeField(blank=True, null=True)
    deadline_time_specific = models.BooleanField()
    opened = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    closed = models.DateTimeField(blank=True, null=True)
    repeating_number = models.IntegerField(blank=True, null=True)
    repeating_unit = models.CharField(max_length=1, blank=True, null=True,
                                      choices=(('d', 'Day'),
                                               ('w', 'Week'),
                                               ('m', 'Month'),
                                               ('y', 'Year')))
    # Strict mode has the repeat happen from when the original event was scheduled
    # rather than from when it was last completed.
    repeating_strict_mode = models.NullBooleanField(default=True)
    # Selection criteria
    priority = models.CharField(max_length=1, blank=True,
                                choices=(('A', 'A'),
                                         ('B', 'B'),
                                         ('C', 'C')))
    # priority = models.ForeignKey('Priority', blank=True, null=True)
    tag_string = models.TextField(blank=True) # Org-mode style string (eg ":comp:home:RN:")
    energy = models.CharField(max_length=2, blank=True, null=True,
                              choices=(('High', 'HI'),
                                       ('Low', 'LO'))
                              )
    time_needed = models.CharField(max_length=4, blank=True, null=True,
                                   choices=(('High', 'HI'),
                                            ('Low', 'LO'))
                                   )
    scope = models.ManyToManyField('Scope', blank=True)
    class Meta:
        ordering = ['order']
    # Methods retrieve statuses of this object
    def is_todo(self):
        if self.todo_state:
            return True
        else:
            return False
    def is_actionable(self):
        if self.todo_state:
            return todo_state.actionable
        else:
            return False
    def is_done(self):
        if self.todo_state:
            return todo_state.done
        else:
            return False
    def overdue(self):
        """Returns a string representing how many days ago the node was scheduled."""
        today = datetime.now().date()
        if self.scheduled.date() < today:
            return today - self.scheduled.date()
        else:
            return u' '
    def get_hierarchy(self):
        hierarchy_list = []
        current_parent = self
        hierarchy_list.append({'display': current_parent.title,
                                'id': current_parent.id})
        while(current_parent.parent != None):
            current_parent = current_parent.parent
            hierarchy_list.append({'display': current_parent.title,
                                    'id': current_parent.id})
        hierarchy_list.reverse()
        # assert False
        return hierarchy_list
    def get_tags(self):
        tag_strings = self.tag_string.split(":")
        tag_string = tag_strings[1:len(tag_strings)-1] # Get rid of the empty first and last elements
        tags_qs = Tag.objects.all()
        # Build and return a Q filter
        tag_Q = Q()
        for tag_string in tag_strings:
            tag_Q = tag_Q | Q(tag_string = tag_string)
        tags_qs = tags_qs.filter(tag_Q)
        return tags_qs
    # Methods manipulate the context information
    def add_context_item(self, new_item):
        """Add a required Person, Tool or Location to this Node"""
        pass # TODO
    def rm_context_item(self, item_to_remove):
        """Remove a required Person, Tool or Location from this Node"""
        pass # TODO
    def get_context_items(self):
        """
        Return a list of Person, Tool and/or Location objects required
        for this Node. Usually associated with a TODO item. Empty list
        if none.
        """
        return []
    # Methods return miscellaneous information
    def get_text(self):
        """Get any text directly associated with this node. False if none."""
        # TODO
        return False
    def get_hierarchy_string(self, delimiter):
        """
        Get id's of all the nodes (including) this one as determined by the
        parent relationship. This is useful for determining the URL for this
        node.
        """
        pass # TODO

    def get_children(self):
        """Returns a list of Node objects with this Node as its parent."""
        return [] # TODO
    def __str__(self):
        if hasattr(self.todo_state, "abbreviation"):
            return "[" + self.todo_state.abbreviation + "] " + self.title
        else:
            return self.title

@python_2_unicode_compatible
class Project(models.Model):
    """
    A project is defined as a Node that has no parent. An isolated TODO
    item is de-facto classified as a project. This may seem confusing but
    practically it does not pose any problems.
    """
    title = models.TextField()
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='owned_project_set')
    other_users = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='other_project_set', blank=True)
    def get_num_actions(self):
        pass
    def __str__(self):
        return self.title
    # TODO: brainstorm more methods

@python_2_unicode_compatible
class Text(models.Model):
    """
    Holds the text component associated with a Node object.
    """
    # TODO: Add support for lists, tables, etc.
    text = models.TextField()
    owner = models.ForeignKey(settings.AUTH_USER_MODEL)
    parent = models.ForeignKey('Node', related_name='attached_text', blank=True, null=True)
    project = models.ManyToManyField('Project')
    def __str__(self):
        return self.text
