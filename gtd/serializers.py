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

from rest_framework import serializers

from gtd.models import Context, Scope, Node


class ScopeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scope


class ContextSerializer(serializers.ModelSerializer):
    class Meta:
        model = Context
        fields = ('id', 'name')


class NodeSerializer(serializers.ModelSerializer):
    def __init__(self, qs, *args, **kwargs):
        # Perform some optimization before hitting the database
        if kwargs.get('many', False):
            # Prefetch related fields only if passing a queryset
            qs = qs.prefetch_related('scope', 'users')
        return super(NodeSerializer, self).__init__(qs, *args, **kwargs)
    class Meta:
        model = Node


class NodeListSerializer(NodeSerializer):
    """Returns values relevant for next actions lists"""
    root_id = serializers.SerializerMethodField('get_root_id')
    root_name = serializers.SerializerMethodField('get_root_name')
    class Meta:
        model = Node
        fields = ['id', 'title', 'tree_id', 'todo_state', 'tag_string',
                  'slug', 'scope', 'root_id', 'root_name', 'priority',
                  'deadline_date', 'deadline_time',
                  'scheduled_date', 'scheduled_time']

    def get_root_id(self, obj):
        root = obj.get_root()
        return root.pk

    def get_root_name(self, obj):
        root = obj.get_root()
        return root.title
