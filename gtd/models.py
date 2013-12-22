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

from __future__ import unicode_literals, absolute_import, print_function
import re
import math
import operator
import json
import datetime as dt
from datetime import datetime, timedelta
import dateutil.parser
from warnings import warn

from django.core import serializers
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Q, signals, query
from django.dispatch import receiver
from django.forms.models import model_to_dict
from django.template.defaultfilters import slugify
from django.utils.encoding import python_2_unicode_compatible
from django.utils.html import conditional_escape
from django.utils.safestring import mark_safe
from django.utils.timezone import get_current_timezone, utc

from mptt.managers import TreeManager
from mptt.models import MPTTModel, TreeForeignKey
from orgwolf import settings
from orgwolf.models import Color, HTMLEscaper, OrgWolfUser as User
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
        settings.AUTH_USER_MODEL,
        blank=True, null=True)
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
    def get_visible(user=None):
        """Returns a queryset containing all the TodoState objects
        that are currently in play."""
        query = Q(owner=None)
        if user:
            query = query | Q(owner=user)
        return TodoState.objects.filter(query)
    @staticmethod
    def as_json(queryset=None, full=False, user=None):
        """Converts a queryset of todo states into a JSON string"""
        new_array = [{'todo_id': 0, 'pk': 0, 'display': '<span class="todo-none">[None]</span>', 'full': ''}]
        if not queryset:
            queryset=TodoState.get_visible(user=user)
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
        return unicode(json.dumps(new_array))
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
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True)
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
    user = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True)
    # message_contact = models.ForeignKey('messaging.contact', blank=True, null=True) # TODO: uncomment this once messaging is implemented
    def __str__(self):
        if self.f_name or self.l_name:
            return '{0} {1}'.format(self.f_name, self.l_name)
        else:
            return self.user.__str__()
    def __repr__(self):
        return '<Contact: {0}>'.format(self.__str__())

# Saving a new user creates a new contact
@receiver(signals.post_save, sender=User)
def contact_post_save(sender, **kwargs):
    if not kwargs['raw']:
        instance = kwargs['instance']
        if not Contact.objects.filter(user=instance).exists():
            contact = Contact()
            contact.f_name = instance.first_name
            contact.l_name = instance.last_name
            contact.user = instance
            if instance.first_name or instance.last_name:
                contact.tag_string = '{0}{1}'.format(
                    contact.f_name[0].upper(),
                    contact.l_name[0].upper()
                )
            else:
                contact.tag_string = instance.username[0:1].upper()
            contact.save()

@python_2_unicode_compatible
class Context(models.Model):
    """A context is a [Location], with [Tool]s and/or [Contact]s available"""
    name = models.CharField(max_length=100)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True, null=True)
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
            final_queryset = final_queryset.exclude(
                tag_string__icontains=tool.tag_string)
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
        if user.is_authenticated():
            qs = Context.objects.filter(Q(owner=user)|Q(owner=None))
        else:
            qs = Context.objects.filter(Q(owner=None))
        return qs


class Priority(models.Model):
    priority_value = models.IntegerField(default=50)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL)


@python_2_unicode_compatible
class Scope(models.Model):
    """High-level area of focus.
    For example: work, family, health
    """
    # (no owner means built-in tag)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, blank=True, null=True)
    public = models.BooleanField(default=False)
    display = models.CharField(max_length=50)
    name = models.CharField(max_length=50)
    @staticmethod
    def get_visible(user=None):
        """Return a queryset of scopes that the user can subscribe to"""
        public = Scope.objects.filter(public=True)
        scopes = Scope.objects.filter(owner=user)
        return scopes | public
    def __str__(self):
        return self.display


class NodeQuerySet(query.QuerySet):
    def as_json(self):
        """Return queryset in json serialized format"""
        # print('Deprecation warning: )
        warn('NodeQuerySet.as_json() has been replaced with django-rest-framework serializers', DeprecationWarning)
        return serializers.serialize('json', self)

    def assigned(self, user, get_archived=False):
        """Get all the objects that `user` is responsible for
        """
        if user.is_authenticated():
            qs = self
            if not get_archived:
                qs = qs.filter(archived=False)
            owned = qs.filter(assigned=None).filter(owner=user)
            # Look for assigned nodes
            contact = user.contact_set.all()
            assigned = qs.filter(assigned__in=contact)
            return assigned | owned
        else:
            raise RuntimeWarning('user not authenticated')
            return Node.objects.none()

    def mine(self, user, get_archived=False):
        """Get all the objects that have `user` as the owner or assigned,
        or have `user` in the related_users relationship."""
        if user.is_authenticated():
            qs = self
            if not get_archived:
                qs = qs.filter(archived=False)
            owned = Q(owner=user)
            others = Q(users=user)
            # Look for assigned nodes
            contact = user.contact_set.all()
            assigned = Q(assigned__in=contact)
            qs = qs.filter(owned | others | assigned)
            return qs
        else:
            raise RuntimeWarning('user not authenticated')
            return Node.objects.none()

    def owned(self, user, get_archived=False):
        """Get all the objects owned by the user with some optional
        filters applied"""
        qs = self
        if not get_archived:
            qs = qs.filter(archived=False)
        if user.is_authenticated():
            qs = qs.filter(owner=user)
        else:
            qs = Node.objects.none()
        return qs


class NodeManager(TreeManager):
    """Object manager for for retrieving nodes."""
    def get_queryset(self):
        return NodeQuerySet(self.model)

    def __getattr__(self, name):
        """Ensure that methods of the queryset are callable by the manager"""
        return getattr(self.get_queryset(), name)


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
    # Database fields
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="owned_node_set")
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True)
    assigned = models.ForeignKey(
        'Contact',
        blank=True, null=True,
        related_name="assigned_node_set")
    title = models.TextField(blank=True)
    slug = models.SlugField()
    todo_state = models.ForeignKey(
        'TodoState',
        blank=True, null=True)
    archived = models.BooleanField(default=False)
    text = models.TextField(blank=True)
    parent = TreeForeignKey(
        'self',
        blank=True, null=True,
        related_name='children')
    # Scheduling details
    scheduled_time = models.TimeField(blank=True, null=True)
    scheduled_date = models.DateField(blank=True, null=True)
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
    scope = models.ManyToManyField('Scope', blank=True)

    # Info methods
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

    def overdue(self, field, agenda_date=None, future=False):
        """Returns a string representing how many days ago
        the target_date was scheduled. Method will ignore
        future dates unless the future parameter is True.
        """
        if agenda_date is None:
            # Default to today
            agenda_date = datetime.now().date()
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
        if self.owner == user:
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
        # Convert some fields to serializable format
        # d = model_to_dict(self)
        # for field in d:
        #     if type(d[field]) is dt.date:
        #         d[field] = str(d[field])
        #     if type(d[field]) is dt.datetime:
        #         val = d[field].replace(tzinfo=None)
        #         d[field] = val.isoformat() + 'Z'
        #     if type(d[field]) is dt.time:
        #         d[field] = d[field].strftime('%H:%M:%S')
        # # Return dictionary as json
        # fields = d
        # node_dict = {
        #     'pk': self.pk,
        #     'model': 'gtd.node',
        #     'fields': fields
        # }
        # s = json.dumps(node_dict)
        # return s
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
        Does not commit new values to the database.
        """
        boolean_fields = ['archived', 'auto_update']
        date_fields = ['scheduled_date', 'deadline_date']
        time_fields = ['scheduled_time', 'deadline_time']
        datetime_fields = ['opened', 'closed']
        for key, value in fields.iteritems():
            # Convert 'None' to None singleton
            if value == 'None':
                value = None
            # resolve todo_state foreign key
            if key == 'todo_state':
                if isinstance(value, list):
                    value = value[0]
                if isinstance(value, (int, long)):
                    self.todo_state = TodoState.objects.get(pk=value)
                else:
                    self.todo_state = None
            elif key == 'owner' and isinstance(value, (int, long)):
                self.owner = User.objects.get(pk=value)
            elif key == 'parent' and isinstance(value, (int, long)):
                self.parent = Node.objects.get(pk=value)
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
            # Resolve datetime fields to datetime objects
            elif key in datetime_fields and value is not None:
                # Convert to datetime object
                setattr(self, key, dateutil.parser.parse(value))
            elif key in date_fields and value is not None:
                # Convert to date object
                setattr(self, key, dateutil.parser.parse(value).date())
            elif key in time_fields and value is not None:
                # Convert to datetime object
                setattr(self, key, dateutil.parser.parse(value).time())
            # Set other things
            else:
                setattr(self, key, value)

    # Override superclass save methods
    def save(self, *args, **kwargs):
        if self.slug is None:
            # set slug field on newly created nodes
            new_slug = slugify(self.title)
            if len(new_slug) > 50:
                new_slug = new_slug[0:49]
            self.slug = slugify(new_slug)
        return super(Node, self).save(*args, **kwargs)

    def __str__(self):
        if hasattr(self.todo_state, "abbreviation"):
            return mark_safe(
                "[" + self.todo_state.as_html() + "] " + conditional_escape(
                    self.get_title())
            )
        else:
            return self.get_title()

    def __repr__(self):
        s = '<Node: {0}>'.format(self.title)
        return s.encode('utf8')


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
def validate_deferred_date(sender, instance, **kwargs):
    """
    If the Node is deferred, validate that the scheduled_date field is set."""
    if not kwargs['raw']:
        if (getattr(instance.todo_state, 'abbreviation', None) == 'DFRD' and
            instance.scheduled_date is None):
            raise ValidationError('Node is DFRD but scheduled_date not set')

@receiver(signals.post_save, sender=Node)
def set_deferred_message(sender, instance, **kwargs):
    """
    Checks if the Node is a deferred Node and if so,
    set the deferred_message foreign key.
    """
    if not kwargs['raw']:
        if getattr(instance.todo_state, 'abbreviation', None) == 'DFRD':
            # Node is deferred so create new message or update existing message
            message = instance.get_deferred_msg()
            if message is None:
                message = Message()
                message.source_node = instance
            message.subject = instance.title
            message.handler_path = 'plugins.deferred'
            message.owner = instance.owner
            message.rcvd_date = dt.datetime.combine(
                instance.scheduled_date,
                dt.time(0, tzinfo=get_current_timezone()),
            )
            message.save()
        else:
            # If instance is not deferred, then it can't have a deferred_message
            message = instance.get_deferred_msg()
            if message is not None and message.pk is not None:
                instance.deferred_message.delete()

@receiver(signals.pre_save, sender=Node)
def clean_text(sender, instance, **kwargs):
    """pre_save receiver that cleans up the text before saving
    eg. escape HTML"""
    if not kwargs['raw']:
        parser = HTMLEscaper()
        instance.text = parser.clean(instance.text)


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
                new = dt.date(year=year,
                               month=month,
                               day=day)
            elif unit == 'y': # Years
                new = dt.date(year=original.year+number,
                               month=original.month,
                               day=original.day)
            else: # None of the above
                raise ValueError('"{}" is not a valid time unit'.format(unit))
            return new
        # Code execution starts here
        instance = kwargs['instance']
        if instance.repeats and instance.auto_update:
            if instance.id: # if existing node
                old_node = Node.objects.get(pk=instance.pk)
                if not (old_node.todo_state == instance.todo_state):
                    # Only if something has changed
                    new_state = old_node.todo_state
                    if instance.scheduled_date: # Adjust Node.scheduled_date
                        if instance.repeats_from_completion:
                            original = datetime.now(get_current_timezone()).date()
                            # repeats from completion only makes sense for DFRD
                            new_state = TodoState.objects.get(abbreviation='DFRD')
                        else:
                            original = instance.scheduled_date
                        instance.scheduled_date = _get_new_time(
                            original,
                            instance.repeating_number,
                            instance.repeating_unit)
                    if instance.deadline_date: # Adjust Node.deadline_date
                        if instance.repeats_from_completion:
                            original = datetime.now(get_current_timezone()).date()
                        else:
                            original = instance.deadline_date
                        instance.deadline_date = _get_new_time(
                            original,
                            instance.repeating_number,
                            instance.repeating_unit)
                    # Make a record of what we just did
                    new_repetition = NodeRepetition()
                    new_repetition.node = instance
                    new_repetition.original_todo_state = old_node.todo_state
                    new_repetition.new_todo_state = instance.todo_state
                    new_repetition.timestamp = datetime.now(
                        get_current_timezone())
                    new_repetition.save()
                    # Set the actual todo_state back to its original value
                    instance.todo_state = new_state


@receiver(signals.pre_save, sender=Node)
def auto_archive(sender, **kwargs):
    """pre_save receiver that archives the node if it's being closed"""
    if not kwargs['raw']:
        instance = kwargs['instance']
        status = (
            instance.pk and
            getattr(instance.todo_state, 'closed', False) and
            instance.auto_update
        )
        if status:
            old_node = Node.objects.get(pk=instance.pk)
            if not getattr(old_node.todo_state, 'closed', False):
                instance.archived = True


@python_2_unicode_compatible
class NodeRepetition(models.Model):
    """
    Describes an occurance of a repeating Node being toggled.
    The handlers for the Node class will create instances of
    this class when their state is changed.
    """
    node = models.ForeignKey('Node')
    original_todo_state = models.ForeignKey(
        'TodoState',
        related_name='repetitions_original_set',
        blank=True,
        null=True)
    new_todo_state = models.ForeignKey(
        'TodoState', related_name='repetitions_new_set',
        blank=True, null=True)
    timestamp = models.DateTimeField()
    def __str__(self):
        string = ''
        string += self.node.title + ': '
        string += self.original_todo_state.abbreviation
        string += ' --> ' + self.new_todo_state.abbreviation
        return string
