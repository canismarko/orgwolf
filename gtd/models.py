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

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q, signals
from django.dispatch import receiver
from django.utils.encoding import python_2_unicode_compatible
from django.utils.timezone import get_current_timezone
from datetime import datetime, timedelta
import re
import math
import operator

from orgwolf import settings
#from orgwolf.models import Color

@python_2_unicode_compatible
class TodoState(models.Model):
    abbreviation = models.CharField(max_length=10, unique=True)
    display_text = models.CharField(max_length=30)
    actionable = models.BooleanField(default=True)
    closed = models.BooleanField(default=False)
    # No owner means system default
    owner= models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True)
    _color_rgb = models.IntegerField(default=0x000000)
    _color_alpha = models.FloatField(default=0)
    def color(self):
        """Returns a Color object built from _color_rgba field."""
        red = (self._color_rgb & Color.RED_MASK) >> Color.RED_OFFSET
        green = (self._color_rgb & Color.GREEN_MASK) >> Color.GREEN_OFFSET
        blue = (self._color_rgb & Color.BLUE_MASK) >> Color.BLUE_OFFSET
        new_color = Color(red, green, blue, self._color_alpha)
        return new_color 
    def __str__(self):
        return self.abbreviation + ' - ' + self.display_text
    @staticmethod
    def get_active():
        """Returns a queryset containing all the TodoState objects
        that are currently in play."""
        return TodoState.objects.all()

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

@python_2_unicode_compatible
class Scope(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True) # no owner means built-in tag
    public = models.BooleanField(default=False)
    display = models.CharField(max_length=50)
    name = models.CharField(max_length=50)
    def __str__(self):
        return self.display

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
    SEARCH_FIELDS = ['title']
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="owned_node_set")
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True)
    order = models.IntegerField() # TODO: autoincrement
    title = models.TextField(blank=True)
    todo_state = models.ForeignKey('TodoState', blank=True, null=True)
    # Determine where this heading is
    parent = models.ForeignKey('self', blank=True, null=True, related_name='child_heading_set')
    related_projects = models.ManyToManyField('Node', related_name='project_set', blank=True)
    assigned = models.ManyToManyField('Contact', related_name='assigned_nodes', blank=True)
    # Scheduling details
    scheduled = models.DateTimeField(blank=True, null=True)
    scheduled_time_specific = models.BooleanField()
    deadline = models.DateTimeField(blank=True, null=True)
    deadline_time_specific = models.BooleanField()
    opened = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    closed = models.DateTimeField(blank=True, null=True)
    repeats = models.BooleanField(default=False)
    repeating_number = models.IntegerField(blank=True, null=True)
    repeating_unit = models.CharField(max_length=1, blank=True, null=True,
                                      choices=(('d', 'Day'),
                                               ('w', 'Week'),
                                               ('m', 'Month'),
                                               ('y', 'Year')))
    # If repeats_from_completions is True, then when the system repeats this node,
    # it will schedule it from the current time rather than the original scheduled time.
    repeats_from_completion = models.NullBooleanField(default=False)
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
    def is_closed(self):
        return getattr(self.todo_state, 'closed', False)
    def overdue(self, target_date, agenda_dt=None, future=False):
        """Returns a string representing how many days ago the target_date was scheduled. Method will ignore future dates unless the future parameter is True."""
        if agenda_dt:
            today = agenda_dt.date()
        else:
            today = datetime.now().date()
        if (target_date.date() < today) or future:
            return str((target_date.date() - today).days) + " days"
        else:
            return " "
    def get_title(self):
        if self.title.strip(' ').strip('\t'):
            title = self.title
        else: # Nothing but whitespace
            title = "[Blank]"
        return title
    @staticmethod
    def get_all_projects():
        return Node.objects.filter(parent=None)
    def get_primary_parent(self):
        """Return the root-level node corresponding to this node."""
        # Recursively step up through the parents
        def find_immediate_parent(child):
            if getattr(child.parent, 'pk', False):
                parent = Node.objects.get(pk=child.parent.pk)
                return find_immediate_parent(parent)
            else:
                return child
        return find_immediate_parent(self)
    def get_hierarchy(self):
        hierarchy_list = []
        current_parent = self
        hierarchy_list.append({'display': current_parent.get_title(),
                                'id': current_parent.id})
        while(current_parent.parent != None):
            current_parent = current_parent.parent
            hierarchy_list.append({'display': current_parent.get_title(),
                                    'id': current_parent.id})
        hierarchy_list.reverse()
        return hierarchy_list
    def get_hierarchy_as_string(self):
        delimiter = ' > '
        node_list = self.get_hierarchy()
        string = ''
        for node in node_list:
            string += delimiter + node['display']
        return string
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
    def get_children(self):
        """Returns a list of Node objects with this Node as its parent."""
        return [] # TODO

    @staticmethod
    def search(query):
        """Look in columns specified by self.SEARCH_FIELDS for the given query.
        Return a queryset with the results."""
        qs = Node.objects.all()
        # Apply keyword searches.
        def construct_search(field_name):
            if field_name.startswith('^'):
                return "%s__istartswith" % field_name[1:]
            elif field_name.startswith('='):
                return "%s__iexact" % field_name[1:]
            elif field_name.startswith('@'):
                return "%s__search" % field_name[1:]
            else:
                return "%s__icontains" % field_name
        if Node.SEARCH_FIELDS and query:
            for bit in query.split():
                or_queries = [models.Q(**{construct_search(str(field_name)): bit}) for field_name in Node.SEARCH_FIELDS]
                qs = qs.filter(reduce(operator.or_, or_queries))
            for field_name in Node.SEARCH_FIELDS:
                if '__' in field_name:
                    qs = qs.distinct()
                    break
        return qs

    def __str__(self):
        if hasattr(self.todo_state, "abbreviation"):
            return "[" + self.todo_state.abbreviation + "] " + self.get_title()
        else:
            return self.get_title()

# Signal handlers for the Node class
@receiver(signals.pre_save, sender=Node)
def node_timestamp(sender, **kwargs):
    """Check if a node is being changed to a closed todo_state.
    If so, set the closed timestamp to now."""
    # This function check the passed instance node against
    # the version currently in the database.
    instance = kwargs['instance']
    if instance.is_closed():
        if instance.id: # Existing node
            old_node = Node.objects.get(id=instance.id)
            if not old_node.is_closed():
                instance.closed = datetime.now(get_current_timezone())
        else: # New node
            instance.closed = datetime.now(get_current_timezone())
@receiver(signals.pre_save, sender=Node)
def node_repeat(sender, **kwargs):
    """Handle repeating information if the Node has the Node.repeats
    flag set."""
    def _get_new_time(original, number, unit):
        """Helper function to determine new repeated timestamp"""
        if unit == 'd': # Days
            new = original + timedelta(days=number)
        elif unit == 'w': # Weeks
            new = original + timedelta(days=(number*7))
        elif unit == 'm': # Months
            month = (original.month + number) % 12
            # Make sure we're not setting Sep 31st of other non-dates
            if month in (4, 6, 9, 11) and original.day == 31:
                day = 30
            elif month == 2 and original.day > 28:
                day = 28
            else:
                day = original.day
            year = int(
                math.floor(
                    original.year + ((original.month + number) / 12)
                    )
                )
            new = datetime(year=year,
                           month=month,
                           day=day,
                           tzinfo=get_current_timezone())
        elif unit == 'y': # Years
            new = datetime(year=original.year+number,
                           month=original.month,
                           day=original.day,
                           tzinfo=get_current_timezone())
        else: # None of the above
            raise ValueError
        return new
    # Code execution starts here
    instance = kwargs['instance']
    if instance.repeats:
        if instance.id: # if existing node
            old_node = Node.objects.get(pk=instance.pk)
            if not (old_node.todo_state == instance.todo_state):
                # Only if something has changed
                if instance.scheduled: # Adjust Node.scheduled
                    if instance.repeats_from_completion:
                        original = datetime.now()
                    else:
                        original = instance.scheduled
                    instance.scheduled = _get_new_time(original,
                                                       instance.repeating_number,
                                                       instance.repeating_unit)
                if instance.deadline: # Adjust Node.deadline
                    if instance.repeats_from_completion:
                        original = datetime.now()
                    else:
                        original = instance.deadline
                    instance.deadline = _get_new_time(original,
                                                      instance.repeating_number,
                                                      instance.repeating_unit)
                # Make a record of what we just did
                new_repetition = NodeRepetition()
                new_repetition.node=instance
                new_repetition.original_todo_state = old_node.todo_state
                new_repetition.new_todo_state = instance.todo_state
                new_repetition.timestamp = datetime.now(get_current_timezone())
                new_repetition.save()
                # Set the actual todo_state back to its original value
                instance.todo_state = old_node.todo_state

@python_2_unicode_compatible
class NodeRepetition(models.Model):
    """
    Describes an occurance of a repeating Node being toggled. 
    The handlers for the Node class will create instances of 
    this class when their state is changed.
    """
    node = models.ForeignKey('Node')
    original_todo_state = models.ForeignKey('TodoState', related_name='repetitions_original_set', blank=True)
    new_todo_state = models.ForeignKey('TodoState', related_name='repetitions_new_set', blank=True)
    timestamp = models.DateTimeField()

@python_2_unicode_compatible
class Text(models.Model):
    """
    Holds the text component associated with a Node object.
    """
    # TODO: Add support for lists, tables, etc.
    text = models.TextField()
    owner = models.ForeignKey(settings.AUTH_USER_MODEL)
    parent = models.ForeignKey('Node', related_name='attached_text', blank=True, null=True)
    def __str__(self):
        return self.text
