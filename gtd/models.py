# -*- coding: utf-8 -*-
#######################################################################
# Copyright 2012 Mark Wolfman
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

from __future__ import unicode_literals, absolute_import, print_function
import math
import operator
import json
import datetime as dt
import dateutil.parser

from django.contrib.auth.models import AnonymousUser
from django.core import serializers
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q, query
from django.template.defaultfilters import slugify
from django.utils.encoding import python_2_unicode_compatible
from django.utils.html import conditional_escape
from django.utils.safestring import mark_safe

from mptt.managers import TreeManager
from mptt.models import MPTTModel, TreeForeignKey
from orgwolf import settings
from orgwolf.models import Color, OrgWolfUser as User
from wolfmail.models import Message

@python_2_unicode_compatible
class TodoState(models.Model):
    class_size = models.IntegerField(default=0)
    abbreviation = models.CharField(max_length=10, unique=True)
    display_text = models.CharField(max_length=30)
    actionable = models.BooleanField(default=True)
    closed = models.BooleanField(default=False)
    # No owner means system default
    owner = models.ForeignKey(
        User,
        blank=True, null=True, on_delete=models.SET_NULL)
    order = models.IntegerField(default=50)
    _color_rgb = models.IntegerField(default=0x000000)
    _color_alpha = models.FloatField(default=0)

    def color(self):
        """Returns a Color object built from _color_rgba field."""
        red = (
            self._color_rgb & Color.RED_MASK
        ) >> Color.RED_OFFSET
        green = (
            self._color_rgb & Color.GREEN_MASK
        ) >> Color.GREEN_OFFSET
        blue = (
            self._color_rgb & Color.BLUE_MASK
        ) >> Color.BLUE_OFFSET
        new_color = Color(red, green, blue, self._color_alpha)
        return new_color

    def __str__(self):
        return mark_safe(
            conditional_escape(self.as_html()) +
            ' - ' +
            conditional_escape(self.display_text)
            )

    def __repr__(self):
        return '<TodoState: {0}-{1}>'.format(
            self.abbreviation,
            self.display_text
        )
    class Meta():
        ordering = ['order']
    
    @staticmethod
    def get_visible(user=AnonymousUser()):
        """Returns a queryset containing all the TodoState objects
        that are currently in play."""
        query = Q(owner=None)
        if not user.is_anonymous:
            query = query | Q(owner=user)
        return TodoState.objects.filter(query)

    @staticmethod
    def as_json(queryset=None, full=False, user=AnonymousUser()):
        """Converts a queryset of todo states into a JSON string"""
        new_array = [{'todo_id': 0, 'pk': 0, 'display': '<span class="todo-none">[None]</span>', 'full': ''}]
        if queryset is None:
            queryset = TodoState.get_visible(user=user)
        for state in queryset:
            new_dict = {
                'todo_id': state.pk,
                'pk': state.pk,
                'full': state.display_text,
                'display': state.as_html(),
                }
            if full:
                new_dict['display'] += ' - ' + state.display_text
            new_array.append(new_dict)
        return str(json.dumps(new_array))

    def as_html(self):
        """Converts this todostate to an HTML string that can
        be put into templates"""
        html = conditional_escape(self.abbreviation)
        if self.color().get_alpha() > 0:
            html = '<span style="color: ' + self.color().rgba_string() + '">' + html + '</span>'
        if not self.closed: # Bold if not a closed TodoState
            html = '<strong>' + html + '</strong>'
        return mark_safe(html)


@python_2_unicode_compatible
class Tag(models.Model):
    display = models.CharField(max_length=100)
    tag_string = models.CharField(max_length=10, unique=True)
    # user that created this tag (no owner means built-in tag)
    owner = models.ForeignKey(User, blank=True, null=True,
                              on_delete=models.SET_NULL)
    public = models.BooleanField(default=True)
    def __str__(self):
        return self.display


class Tool(Tag):
    pass


class Location(Tag):
    GPS_info = False # TODO
    tools_available = models.ManyToManyField(
        'Tool',
        related_name='including_locations_set', blank=True
    )


class Contact(Tag):
    f_name = models.CharField(max_length = 50)
    l_name = models.CharField(max_length = 50)
    user = models.ForeignKey(User, blank=True,
                             null=True, on_delete=models.SET_NULL)
    
    def __str__(self):
        if self.f_name or self.l_name:
            return '{0} {1}'.format(self.f_name, self.l_name)
        else:
            return self.user.__str__()
    
    def __repr__(self):
        return '<Contact: {0}>'.format(self.__str__())


@python_2_unicode_compatible
class Context(models.Model):
    """A context is a [Location], with [Tool]s and/or [Contact]s available"""
    name = models.CharField(max_length=100)
    owner = models.ForeignKey(
        User,
        blank=True, null=True, on_delete=models.SET_NULL)
    tools_available = models.ManyToManyField(
        'Tool',
        blank=True,
        related_name='including_contexts_set')
    locations_available = models.ManyToManyField(
        'Location',
        blank=True,
        related_name='including_contexts_set')
    people_required = models.ManyToManyField(
        'Contact',
        blank=True,
        related_name='including_contexts_set')
    
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
            final_queryset = final_queryset.exclude(
                tag_string__icontains=tool.tag_string
            )
        for location in excluded_locations:
            final_queryset = final_queryset.exclude(
                tag_string__icontains=location.tag_string)
        # For required_people we have to construct a Q object
        new_Q = Q()
        for contact in required_people:
            new_Q = new_Q | Q(tag_string__icontains=contact.tag_string)
        final_queryset = final_queryset.filter(new_Q)
        # Now return the resulting queryset
        return final_queryset

    @staticmethod
    def get_visible(user, related=[]):
        """Return all the Context objects visible to this user"""
        if user.is_authenticated:
            qs = Context.objects.filter(Q(owner=user)|Q(owner=None))
        else:
            qs = Context.objects.filter(Q(owner=None))
        return qs


# TODO: Can this be deleted??
class Priority(models.Model):
    priority_value = models.IntegerField(default=50)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)


@python_2_unicode_compatible
class FocusArea(models.Model):
    """High-level area of focus.
    For example: work, family, health
    """
    # (no owner means built-in tag)
    owner = models.ForeignKey(
        User, blank=True, null=True,
        on_delete=models.CASCADE)
    public = models.BooleanField(default=False)
    display = models.CharField(max_length=50)
    name = models.CharField(max_length=50)
    is_visible = models.BooleanField(default=True)

    @staticmethod
    def get_visible(user=AnonymousUser()):
        """Return a queryset of focusareas that the user can subscribe to"""
        query = Q(owner=None)
        if not user.is_anonymous:
            query = query | Q(owner=user)
        return FocusArea.objects.filter(query)

    def __str__(self):
        return self.display


class NodeQuerySet(query.QuerySet):
    def assigned(self, user, get_archived=False):
        """Get all the objects that `user` is responsible for."""
        if user.is_authenticated:
            qs = self
            if not get_archived:
                qs = qs.filter(archived=False)
            owned = qs.filter(assigned=None).filter(owner=user)
            # Look for assigned nodes
            contact = user.contact_set.all()
            assigned = qs.filter(assigned__in=contact)
            return assigned | owned
        else:
            return Node.objects.filter(owner=None)
    
    def mine(self, user, get_archived=False):
        """Get all the objects that have `user` as the owner or assigned, or
        have `user` in the related_users relationship.
        
        """
        qs = self
        if user.is_anonymous:
            qs = qs.filter(owner=None)
        else:
            owned = Q(owner=user)
            others = Q(users=user)
            # Look for assigned nodes
            contact = user.contact_set.all()
            assigned = Q(assigned__in=contact)
            qs = qs.filter(owned | others | assigned)
        if not get_archived:
            qs = qs.filter(archived=False)
        return qs
    
    def owned(self, user, get_archived=False):
        """Get all the objects owned by the user with some optional filters
        applied
        
        """
        qs = self
        if not get_archived:
            qs = qs.filter(archived=False)
        if user.is_authenticated:
            qs = qs.filter(owner=user)
        else:
            qs = Node.objects.none()
        return qs


class NodeManager(TreeManager):
    """Object manager for for retrieving nodes."""
    def get_queryset(self):
        return NodeQuerySet(self.model)
    
    def assigned(self, *args, **kwargs):
        return self.all().assigned(*args, **kwargs)
    
    def mine(self, *args, **kwargs):
        return self.all().mine(*args, **kwargs)
    
    def owned(self, *args, **kwargs):
        return self.all().owned(*args, **kwargs)


# class NodeManager(TreeManager):
#     """Object manager for for retrieving nodes."""
#     def get_queryset(self):
#         return NodeQuerySet(self.model)

#     def __getattr__(self, name):
#         """Ensure that methods of the queryset are callable by the manager"""
#         return getattr(self.get_queryset(), name)


@python_2_unicode_compatible
class Node(MPTTModel):
    """
    Django model that holds some sort of divisional heading. Similar to
    orgmode's '*** Heading' syntax. It can have todo states associated
    with it as well as scheduling and other information."""
    SEARCH_FIELDS = ['title', 'text']
    auto_update = False
    auto_close = True
    objects = NodeManager()
    # objects = TreeManager.from_queryset(NodeQuerySet)
    # objects = NodeManager()
    # Database fields
    owner = models.ForeignKey(
        User,
        related_name="owned_node_set",
        null=True, blank=True, on_delete=models.SET_NULL)
    users = models.ManyToManyField(User, blank=True)
    assigned = models.ForeignKey(
        Contact,
        blank=True, null=True,
        related_name="assigned_node_set",
        on_delete=models.SET_NULL)
    title = models.TextField(blank=True)
    slug = models.SlugField()
    todo_state = models.ForeignKey(
        'TodoState',
        blank=True, null=True, on_delete=models.SET_NULL)
    archived = models.BooleanField(default=False)
    text = models.TextField(blank=True)
    parent = TreeForeignKey(
        'self',
        blank=True, null=True,
        related_name='children',
        on_delete=models.SET_NULL)
    # Scheduling details
    scheduled_time = models.TimeField(blank=True, null=True)
    scheduled_date = models.DateField(blank=True, null=True)
    end_time = models.TimeField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    deadline_time = models.TimeField(blank=True, null=True)
    deadline_date = models.DateField(blank=True, null=True)
    opened = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    closed = models.DateTimeField(blank=True, null=True)
    repeats = models.BooleanField(default=False)
    repeating_number = models.IntegerField(blank=True, null=True)
    repeating_unit = models.CharField(
        max_length=1, blank=True, null=True,
        choices=(('d', 'Days'),
                 ('w', 'Weeks'),
                 ('m', 'Months'),
                 ('y', 'Years')))
    # If repeats_from_completions is True, then when the system
    # repeats this node, it will schedule it from the current
    # time rather than the original scheduled time.
    repeats_from_completion = models.BooleanField(default=False)
    # Selection criteria
    PRIORITIES = (
        ('A', 'A'),
        ('B', 'B'),
        ('C', 'C'),
    )
    priority = models.CharField(
        max_length=1, default=PRIORITIES[1][0],
        choices=PRIORITIES,
    )
    # Org-mode style string (eg ":comp:home:RN:")
    tag_string = models.TextField(blank=True)
    energy = models.CharField(
        max_length=2, blank=True, null=True,
        choices=(('High', 'HI'),
                 ('Low', 'LO')))
    time_needed = models.CharField(
        max_length=4, blank=True, null=True,
        choices=(('High', 'HI'),
                 ('Low', 'LO')))
    focus_areas = models.ManyToManyField('FocusArea', blank=True)

    # Info methods
    def is_todo(self):
        if self.todo_state:
            return True
        else:
            return False

    def is_closed(self):
        return getattr(self.todo_state, 'closed', False)

    def overdue(self, field, agenda_date=None, future=False):
        """Returns a string representing how many days ago
        the target_date was scheduled. Method will ignore
        future dates unless the future parameter is True.
        """
        if agenda_date is None:
            # Default to today
            agenda_date = dt.datetime.now().date()
        target_date = getattr(self, field)
        response = ''
        if target_date is not None:
            difference = (target_date - agenda_date).days
            if abs(difference) == 1:
                pluralized = ''
            else:
                pluralized = 's'
            if difference < 0:
                response = '%d day%s ago' % (abs(difference), pluralized)
            elif difference > 0 and future:
                response = 'in %d day%s' % (abs(difference), pluralized)
            else:
                response = 'today'
        return response

    def access_level(self, user):
        """Determines what level of access the give user has:
        - None
        - 'write'
        - 'read'
        """
        access = None
        if self.owner == None:
            # Public nodes
            access = 'read'
        elif self.owner == user:
            access = 'write'
        return access

    def get_title(self):
        if self.title.strip(' ').strip('\t'):
            title = conditional_escape(self.title)
        else: # Nothing but whitespace
            title = '[Blank]'
        if self.archived:
            title = '<span class="archived-text">{0}</span>'.format(title)
        return mark_safe(title)

    def get_level(self):
        """Gets the node's level in the tree (1-indexed)."""
        return self.level + 1

    def get_deferred_msg(self):
        """
        Encapsulate the deferred_message field to avoid DoesNotExist error.
        Returns None is not set.
        """
        try:
            msg = self.deferred_message
        except Message.DoesNotExist:
            msg = None
        return msg

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

    def get_hierarchy_as_string(self):
        """Return a string showing the trail of ancestors
        leading up to this node"""
        delimiter = '>'
        node_list = self.get_ancestors(include_self=True)
        string = ''
        for node in node_list:
            string += '{0} {1}'.format(delimiter,
                                       node.get_title() )
            delimiter = ' >'
        return string

    def as_html(self):
        """Return a string representing the todo state and title of this node,
        properly html escaped."""
        string = ''
        if self.todo_state:
            string += self.todo_state.as_html() + ' '
        string += self.get_title()
        return mark_safe(string)

    def as_json(self):
        """Process the instance into a json string."""
        s = serializers.serialize('json', [self])
        # Remove list brackets
        s = s[1:-1]
        return s

    def get_tags(self):
        tag_strings = self.tag_string.split(":")
        # Get rid of the empty first and last elements
        tag_strings = tag_strings[1:len(tag_strings)-1]
        if len(tag_strings) > 0:
            tags_qs = Tag.objects.all()
        else:
            tags_qs = Tag.objects.none()
        # Build and return a Q filter
        tag_Q = Q()
        for tag_string in tag_strings:
            tag_Q = tag_Q | Q(tag_string = tag_string)
        tags_qs = tags_qs.filter(tag_Q)
        return tags_qs
    
    # Methods return miscellaneous information
    @staticmethod
    def search(query, user, page=0, count=None):
        """Look in columns specified by self.SEARCH_FIELDS for the given query.
        Return a queryset with the results."""
        qs = Node.objects.mine(user).select_related('todo_state')
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
                or_queries = [
                    models.Q(**{construct_search(str(field_name)): bit})
                    for field_name in Node.SEARCH_FIELDS
                ]
                qs = qs.filter(reduce(operator.or_, or_queries))
            for field_name in Node.SEARCH_FIELDS:
                if '__' in field_name:
                    qs = qs.distinct()
                    break
        # Limit the number of results to the value of `count`
        total = qs.count()
        if count:
            qs = qs[page*count:(page+1)*count]
        return (qs, total)

    def set_fields(self, fields):
        """
        Accepts a dictionary of fields and updates them on this instance.
        Does not commit new values to the database. Node must be in the
        database already so that foreign keys can be assigned.
        """
        boolean_fields = ['archived', 'auto_update']
        date_fields = ['scheduled_date', 'deadline_date', 'end_date']
        time_fields = ['scheduled_time', 'deadline_time', 'end_time']
        datetime_fields = ['opened', 'closed']
        for key, value in fields.items():
            # {datetime_field: ''} -> {datetime_field: None}
            if (key in (datetime_fields + date_fields + time_fields)
                and value == ''):
                value = None
            # Convert 'None' to None singleton
            if value == 'None':
                value = None
            # Resolve foreign keys
            if key == 'todo_state':
                if isinstance(value, list):
                    value = value[0]
                if isinstance(value, (int,)):
                    self.todo_state = TodoState.objects.get(pk=value)
                else:
                    self.todo_state = None
            elif key == 'owner' and isinstance(value, (int,)):
                self.owner =  User.objects.get(pk=value)
            elif key == 'parent' and isinstance(value, (int,)):
                self.parent = Node.objects.get(pk=value)
            elif key == 'assigned' and isinstance(value, (int,)):
                self.assigned = Contact.objects.get(pk=value)
            # Resolve boolean fields to singletons
            elif key in boolean_fields:
                if isinstance(value, list):
                    value = value[0]
                if value == 'true':
                    setattr(self, key, True)
                elif value == 'false':
                    setattr(self, key, False)
                else:
                    setattr(self, key, value)
            elif key in datetime_fields and value is not None:
                # Convert to datetime object
                setattr(self, key, dateutil.parser.parse(value))
            elif key in date_fields and value is not None:
                # Convert to date object
                setattr(self, key, dateutil.parser.parse(value).date())
            elif key in time_fields and value is not None:
                # Convert to time object
                setattr(self, key, dateutil.parser.parse(value).time())
            elif key == 'focus_area':
                # Handle focus_area many-to-many specially (signal handler)
                curr_focus_areas = set(self.focus_areas.values_list('id', flat=True))
                new_focus_areas = set(value)
                focus_areas_to_rm = list(curr_focus_areas-new_focus_areas)
                focus_areas_to_add = list(new_focus_areas-curr_focus_areas)
                self.focus_areas.add(*focus_areas_to_add)
                self.focus_areas.remove(*focus_areas_to_rm)
            elif key in ('focus_areas', 'users'):
                # Set many-to-many sets
                getattr(self, key).set(value)
            else:
                # Set other things
                setattr(self, key, value)

    # Override superclass save methods
    def save(self, *args, **kwargs):
        if self.slug == '':
            # set slug field on newly created nodes
            new_slug = slugify(self.title)
            if len(new_slug) > 50:
                new_slug = new_slug[0:49]
            self.slug = slugify(new_slug)
        return super(Node, self).save(*args, **kwargs)

    def __str__(self):
        if hasattr(self.todo_state, "abbreviation"):
            return "[{0}] {1}".format(self.todo_state.abbreviation,
                                      self.get_title())
        else:
            return self.get_title()

    def __repr__(self):
        s = '<Node: {0}>'.format(self.title)
        return str(s.encode('utf8'))


@python_2_unicode_compatible
class NodeRepetition(models.Model):
    """
    Describes an occurance of a repeating Node being toggled.
    The handlers for the Node class will create instances of
    this class when their state is changed.
    """
    node = models.ForeignKey('Node', on_delete=models.CASCADE)
    original_todo_state = models.ForeignKey(
        'TodoState',
        related_name='repetitions_original_set',
        blank=True, null=True,
        on_delete=models.SET_NULL,
    )
    new_todo_state = models.ForeignKey(
        'TodoState', related_name='repetitions_new_set',
        blank=True, null=True,
        on_delete=models.SET_NULL)
    timestamp = models.DateTimeField()
    def __str__(self):
        string = ''
        string += self.node.title + ': '
        string += self.original_todo_state.abbreviation
        string += ' --> ' + self.new_todo_state.abbreviation
        return string
