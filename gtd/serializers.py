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
import datetime as dt

from rest_framework import serializers

from gtd.models import Context, FocusArea, Node, TodoState, Tag, WeeklyReview


class WeeklyReviewSerializer(serializers.ModelSerializer):
    # extra_tasks = NodeSerializer(many=True)
    class Meta:
        model = WeeklyReview
        fields = "__all__"


class FocusAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = FocusArea
        fields = "__all__"


class TodoStateSerializer(serializers.ModelSerializer):
    color = serializers.SerializerMethodField()

    def get_color(self, obj):
        """Convert the _color_* fields into an integer color dictionary."""
        return obj.color().as_dict()

    class Meta:
        model = TodoState
        fields = ['id', 'color', 'actionable', 'abbreviation',
                  'closed', 'display_text']


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'display', 'tag_string', 'owner', 'public']


class ContextSerializer(serializers.ModelSerializer):
    class Meta:
        model = Context
        fields = ('id', 'name', 'locations_available')


class NodeSerializer(serializers.ModelSerializer):
    read_only = serializers.SerializerMethodField()
    has_text = serializers.SerializerMethodField()
    def __init__(self, qs, request=None, *args, **kwargs):
        # Perform some optimization before hitting the database
        self.request = request
        if kwargs.get('many', False):
            # Prefetch related fields only if passing a queryset
            qs = qs.select_related('owner')
            qs = qs.prefetch_related('focus_areas', 'users')
        return super(NodeSerializer, self).__init__(qs, *args, **kwargs)
    
    def get_read_only(self, obj):
        """Determine if the request.user can edit this Node."""
        user = getattr(self.request, 'user', None)
        status = True # Default
        if obj.owner == user and obj.owner is not None:
            status = False
        return status
    
    def get_has_text(self, obj):
        has_text = False
        if obj.text:
            has_text = True
        return has_text
    
    class Meta:
        model = Node
        exclude = ['priority']


class NodeListSerializer(NodeSerializer):
    """Returns values relevant for next actions lists"""
    root_id = serializers.SerializerMethodField()
    root_name = serializers.SerializerMethodField()
    class Meta:
        model = Node
        fields = ['id', 'title', 'todo_state', 'tag_string',
                  'slug', 'focus_areas', 'root_id', 'root_name',
                  'deadline_date', 'deadline_time',
                  'scheduled_date', 'scheduled_time',
                  'tree_id', 'lft', 'rght',
                  'repeats', 'read_only', 'has_text']

    def to_representation(self, obj):
        """
        Prefetch the root node to avoid multiple DB hits
        """
        obj.current_root = obj.get_root()
        return super(NodeListSerializer, self).to_representation(obj)

    def get_root_id(self, obj):
        root = obj.current_root
        return root.pk

    def get_root_name(self, obj):
        root = obj.current_root
        return root.title


class NodeOutlineSerializer(NodeSerializer):
    """Fields needed for constructing an outline with minimal details."""
    class Meta:
        model = Node
        fields = ['title', 'tag_string', 'lft', 'rght', 'tree_id', 'id',
                  'focus_areas', 'level', 'archived',
                  'todo_state', 'repeats', 'scheduled_date',
                  'read_only', 'has_text']


class CalendarSerializer(NodeSerializer):
    """For displaying nodes as calendar objects in angular-ui-calendar"""
    start = serializers.SerializerMethodField()
    end = serializers.SerializerMethodField()
    allDay = serializers.SerializerMethodField('get_all_day')

    def get_start(self, obj,
                  date_field='scheduled_date',
                  time_field='scheduled_time'):
        """Calculate this Node's calendar start date (and time if appropriate)"""
        date = getattr(obj, date_field)
        time = getattr(obj, time_field)
        if date and time:
            # Time specific
            start_dt = dt.datetime.combine(date, time)
        elif date:
            # Date specific
            start_dt = date
        else:
            # Unscheduled
            start_dt = None
        return start_dt

    def get_end(self, obj,
                date_field='end_date',
                time_field='end_time'):
        """Calculate this Node's calendar end date (and time if appropriate)"""
        if obj.end_date:
            end_datetime = self.get_start(obj, date_field=date_field, time_field=time_field)
        elif obj.scheduled_time:
            end_datetime = self.get_start(obj) + dt.timedelta(hours=1)
        else:
            end_datetime = self.get_start(obj)
        return end_datetime

    def get_all_day(self, obj,
                    date_field='scheduled_date',
                    time_field='scheduled_time'):
        """
        Determine if this Node is day-specific (True) or time-specific (False).
        """
        date = getattr(obj, date_field)
        time = getattr(obj, time_field)
        if date and not time:
            all_day = True
        else:
            all_day = False
        return all_day
    
    class Meta:
        model = Node
        fields = ['title', 'id', 'start', 'end', 'allDay',
                  'repeats', 'focus_areas', 'read_only', 'has_text']


class CalendarDeadlineSerializer(CalendarSerializer):
    """
    For displaying nodes as calendar objects in angular-ui-calendar,
    using deadline fields instead of scheduled.
    """
    start = serializers.SerializerMethodField('get_deadline_start')
    end = serializers.SerializerMethodField('get_deadline_end')
    allDay = serializers.SerializerMethodField('get_deadline_all_day')

    def get_deadline_start(self, obj):
        return self.get_start(obj,
                              date_field='deadline_date',
                              time_field='deadline_time')

    def get_deadline_end(self, obj):
        return None

    def get_deadline_all_day(self, obj):
        return self.get_all_day(obj,
                              date_field='deadline_date',
                              time_field='deadline_time')
