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
    """
    Serialize message objects with full set of data attributes
    """
    class Meta:
        model = Message


class InboxSerializer(serializers.ModelSerializer):
    """
    Serialize queryset of message objects with only the fields
    necessary for displaying the inbox.
    """
    def __init__(self, qs=None, *args, **kwargs):
        # prefetch_related to cut down on db hits
        if kwargs.get('many', False):
            qs = qs.select_related('source_node')
        return super(InboxSerializer, self).__init__(qs, *args, **kwargs)

    # Custom fields
    source_node = serializers.SerializerMethodField('get_node_id')
    node_slug = serializers.SerializerMethodField()
    repeats = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'subject', 'sender',
                  'unread', 'handler_path', 'rcvd_date',
                  'source_node', 'node_slug', 'repeats']

    def get_node_id(self, msg):
        if msg.source_node is not None:
            pk = msg.source_node.pk
        else:
            pk = None
        return pk

    def get_node_slug(self, msg):
        if msg.source_node is not None:
            slug = msg.source_node.slug
        else:
            slug = None
        return slug

    def get_repeats(self, msg):
        if msg.source_node is not None:
            return msg.source_node.repeats
