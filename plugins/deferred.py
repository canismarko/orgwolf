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

import datetime as dt

from django.utils.timezone import get_current_timezone

from gtd.models import Node, TodoState
from plugins import BaseMessageHandler

class MessageHandler(BaseMessageHandler):
    """
    Handler for manipulating messages that are generated
    from DFRD Node objects.
    """

    def create_node(self):
        """
        Behavior varies depending on its source Node object's
        repeating status. If Node repeats, then create a new Node,
        change the rcvd_date and add to spawned_nodes. If Node
        does not repeat, then return the source Node and delete
        the Message object.
        """
        source_node = self._msg.source_node
        if source_node.repeats and not source_node.repeats_from_completion:
            # Tuple of fields to be copied to new Node()
            FIELDS = ('owner', 'title', 'slug', 'deadline_date',
                      'deadline_time', 'priority', 'tag_string',
                      'energy', 'time_needed', )
            M2M_FIELDS = ('scope',)
            # Make a duplicate of the Node
            new_node = Node()
            # Set the appropriate fields
            for field in FIELDS:
                value = getattr(source_node, field, None)
                setattr(new_node, field, value)
            new_node.insert_at(source_node,
                               position='last-child',
                               save=True)
            # Set m2m fields
            for field in M2M_FIELDS:
                for obj in getattr(source_node, field).all():
                    getattr(new_node ,field).add(obj)
            self._msg.spawned_nodes.add(new_node)
            # Now update the scheduled dates on the original Node
            source_node.todo_state = TodoState.objects.get(abbreviation='DONE')
            source_node.auto_update = True
            source_node.save()
            # Now reschedule the message itself
            self._msg.rcvd_date = dt.datetime.combine(
                source_node.scheduled_date,
                dt.time(0, tzinfo=get_current_timezone()),
            )
            self._msg.save()
        else:
            new_node = source_node
        return new_node

    def defer(self, new_date):
        """
        Reschedule the Message and Node objects to a new
        (presumably future) date.
        """
        self._msg.source_node.scheduled_date = new_date
        self._msg.source_node.save()
