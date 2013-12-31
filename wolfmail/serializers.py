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

from wolfmail.models import Message


class MessageSerializer(serializers.ModelSerializer):

    def __init__(self, qs=None, *args, **kwargs):
        # prefetch_related to cut down on db hits
        if kwargs.get('many', False):
            qs = qs.select_related('source_node')
        return super(MessageSerializer, self).__init__(qs, *args, **kwargs)

    # Custom fields
    node_tree_id = serializers.SerializerMethodField('get_node_tree_id')
    node_slug = serializers.SerializerMethodField('get_node_slug')

    class Meta:
        model = Message
        exclude = ('spawned_nodes',)

    def get_node_tree_id(self, msg):
        if msg.source_node is not None:
            tree_id = msg.source_node.tree_id
        else:
            tree_id = None
        return tree_id

    def get_node_slug(self, msg):
        if msg.source_node is not None:
            slug = msg.source_node.slug
        else:
            slug = None
        return slug
