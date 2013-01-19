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
from django.db import models, transaction
from django.db.models import Q, signals
from django.dispatch import receiver
from django.utils.encoding import python_2_unicode_compatible
from django.utils.timezone import get_current_timezone
from django.utils.html import conditional_escape
from django.utils.safestring import mark_safe
from datetime import datetime, timedelta
import re
import math
import operator
import json

from orgwolf import settings
from orgwolf.models import Color, HTMLEscaper

@python_2_unicode_compatible
class TodoState(models.Model):
    abbreviation = models.CharField(max_length=10, unique=True)
    display_text = models.CharField(max_length=30)
    actionable = models.BooleanField(default=True)
    closed = models.BooleanField(default=False)
    # No owner means system default
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True)
    order = models.IntegerField(default=50)
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
        return mark_safe(
            conditional_escape(self.as_html()) + 
            ' - ' + 
            conditional_escape(self.display_text)
            )
    class Meta():
        ordering = ['order']
    @staticmethod
    def get_active():
        """Returns a queryset containing all the TodoState objects
        that are currently in play."""
        return TodoState.objects.all()
    @staticmethod
    def as_json(queryset=None):
        new_array = [{'todo_id': 0, 'display': '[None]'}]
        if not queryset:
            queryset=TodoState.get_active()
        for state in queryset:
            new_dict = {
                'todo_id': state.pk,
                'display': state.as_html(),
                }
            new_array.append(new_dict)
        return unicode(json.dumps(new_array))
    def as_html(self):
        """Converts this todostate to an HTML string that can be put into tempaltes"""
        html = conditional_escape(self.abbreviation)
        # html = '<span class="todostate">' + html
        if self.color().get_alpha() > 0:
            html = '<span style="color: ' + self.color().rgba_string() + '">' + html + '</span>'
        if not self.closed: # Bold if not a closed TodoState
            html = '<strong>' + html + '</strong>'
        # html = '<span class="todo_state">' + html + '</span>'
        return mark_safe(html)

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
            final_queryset = final_queryset.exclude(tag_string__icontains=location.tag_string)
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
    Django model that holds some sort of divisional heading. Similar to 
    orgmode's '*** Heading' syntax. It can have todo states associated 
    with it as well as scheduling and other information."""
    ORDER_STEP = 10
    SEARCH_FIELDS = ['title']
    auto_repeat = False
    auto_close = True
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="owned_node_set")
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True)
    order = models.IntegerField()
    title = models.TextField(blank=True)
    todo_state = models.ForeignKey('TodoState', blank=True, null=True)
    archived = models.BooleanField(default=False)
    text = models.TextField(blank=True)
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
        unique_together = (('parent', 'order'),)
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
            today = datetime.now(get_current_timezone()).date()
        difference = (target_date.date() - today).days
        if abs(difference) == 1:
            pluralized = ''
        else:
            pluralized = 's'
        if difference < 0:
            return '%d day%s ago' % (abs(difference), pluralized)
        elif difference > 0 and future:
            return 'in %d day%s' % (abs(difference), pluralized)
        else:
            return ''
    @staticmethod
    def get_active():
        """Get all the nodes that aren't archived"""
        nodes_qs = Node.objects.filter(archived=False)
        return nodes_qs
    @staticmethod
    def get_owned(user, get_archived=False):
        """Get all the nodes owned by the user listed in the request"""
        qs = Node.get_active()
        if user.is_authenticated():
            qs = qs.filter(owner=user)
        else:
            qs = Node.objects.none()
        return qs
    def get_title(self):
        if self.title.strip(' ').strip('\t'):
            title = self.title
        else: # Nothing but whitespace
            title = "[Blank]"
        return title
    def get_level(self):
        level = 1
        node = self
        while node.parent:
            level += 1
            node = node.parent
        return level
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
    def as_html(self):
        string = ''
        if self.todo_state:
            string += self.todo_state.as_html() + ' '
        string += self.title
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
    # Re-arrangement methods, effectively these are setters for Node.order
    @transaction.commit_on_success
    def _rearrange(self, steps):
        """Changes the order of the node, slides it in between the other nodes.
        Positive values for `step` move the node farther down the list and
        negative values move it farther up the list. Zero does nothing."""
        nodes_qs = Node.get_owned(self.owner)
        if steps > 0:
            sign = 1
            remainder_qs = nodes_qs.filter(parent=self.parent, 
                                           order__gt=self.order)
        elif steps < 0:
            sign = -1
            remainder_qs = nodes_qs.filter(parent=self.parent,
                                           order__lt=self.order).reverse()
        else: # No change
            remainder_qs = Node.objects.none()
        if not remainder_qs.exists():
            return
        steps = abs(steps)
        other_node = remainder_qs[steps-1]
        # Go through scenarios in order of simplicity
        # This allows us to minimize database hits for large moves
        if steps == 1:
            # Swap the two nodes next to each other
            other_order = other_node.order
            other_node.order = self.order
            self.order = -1
            self.save()
            other_node.save()
            self.order = other_order
            self.save()
        else:
            assert False, 'Re-arranging by more than 1 step not yet implemented'
            # Todo: rearrange by steps greater than 1
    def move_up(self):
        self._rearrange(-1)
    def move_down(self):
        self._rearrange(1)
        
    # Methods return miscellaneous information
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
            return mark_safe("[" + self.todo_state.as_html() + "] " + conditional_escape(self.get_title()))
        else:
            return self.get_title()

# Signal handlers for the Node class
@receiver(signals.pre_save, sender=Node)
def node_timestamp(sender, **kwargs):
    """Check if a node is being changed to a closed todo_state.
    If so, set the closed timestamp to now."""
    # This function check the passed instance node against
    # the version currently in the database.
    if not kwargs['raw']:
        instance = kwargs['instance']
        if instance.is_closed() and instance.auto_close:
            if instance.id: # Existing node
                old_node = Node.objects.get(pk=instance.id)
                if not old_node.is_closed():
                    instance.closed = datetime.now(get_current_timezone())
            else: # New node
                instance.closed = datetime.now(get_current_timezone())

@receiver(signals.pre_save, sender=Node)
def clean_text(sender, **kwargs):
    """pre_save receiver that cleans up the text before saving
    eg. escape HTML"""
    if not kwargs['raw']:
        instance = kwargs['instance']
        if instance.id:
            old_text = Node.objects.get(pk=instance.id).text
        else:
            old_text = ''
        if instance.text != old_text:
            # only escape the text if it changed
            parser = HTMLEscaper()
            instance.text = parser.clean(instance.text)

@receiver(signals.pre_save, sender=Node)
def node_auto_increment(sender, **kwargs):
    """If the user does not specify an order for a new node, this receiver
    will find the current highest order and add it to the end"""
    instance = kwargs['instance']
    auto = False
    exists = False
    if instance.id:
        # Check if the node does actually exist
        # This is mostly to avoid problems with installing data from fixtures
        try:
            old_node = Node.objects.get(pk=instance.id)
        except Node.DoesNotExist:
            old_node = None
        else:
            exists = True
    if not exists and instance.order == None:
        # If it's a new node with no order, then auto_increment the order field
        auto = True
    elif exists:
        if (old_node.parent != instance.parent) and (old_node.order == instance.order):
            auto = True
    if auto:
        # Now actually increment if necessary
        other_nodes = Node.get_owned(instance.owner).filter(parent=instance.parent).reverse()
        if other_nodes.count() > 0:
            last_order = other_nodes[0].order
        else:
            last_order = 0
        instance.order = last_order + Node.ORDER_STEP

@receiver(signals.pre_save, sender=Node)
def node_repeat(sender, **kwargs):
    """Handle repeating information if the Node has the Node.repeats
    flag set."""
    if not kwargs['raw']:
        def _get_new_time(original, number, unit):
            """Helper function to determine new repeated timestamp"""
            if unit == 'd': # Days
                new = original + timedelta(days=number)
            elif unit == 'w': # Weeks
                new = original + timedelta(days=(number*7))
            elif unit == 'm': # Months
                month = ((original.month + number -1 ) % 12) + 1
                # Make sure we're not setting Sep 31st of other non-dates
                if month in (4, 6, 9, 11) and original.day == 31:
                    day = 30
                elif month == 2 and original.day > 28:
                    day = 28
                else:
                    day = original.day
                year = int(
                    math.floor(
                        original.year + ((original.month + number - 1) / 12)
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
        if instance.repeats and instance.auto_repeat:
            if instance.id: # if existing node
                old_node = Node.objects.get(pk=instance.pk)
                if not (old_node.todo_state == instance.todo_state):
                    # Only if something has changed
                    if instance.scheduled: # Adjust Node.scheduled
                        if instance.repeats_from_completion:
                            original = datetime.now(get_current_timezone())
                        else:
                            original = instance.scheduled
                        instance.scheduled = _get_new_time(original,
                                                           instance.repeating_number,
                                                           instance.repeating_unit)
                    if instance.deadline: # Adjust Node.deadline
                        if instance.repeats_from_completion:
                            original = datetime.now(get_current_timezone())
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
    def __str__(self):
        string = ''
        string += self.node.title + ': '
        string += self.original_todo_state.abbreviation
        string += ' --> ' + self.new_todo_state.abbreviation
        return string
