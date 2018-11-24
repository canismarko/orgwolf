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

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden, HttpResponseNotAllowed
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.decorators import method_decorator
from django.utils.timezone import get_current_timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from gtd.models import Node, TodoState
from gtd.serializers import NodeSerializer
from orgwolf.models import AccountAssociation
from wolfmail.models import Message
from wolfmail.serializers import InboxSerializer, MessageSerializer


def inbox(request):
    return render_to_response('wolfmail/inbox.html',
                              locals(),
                              RequestContext(request))


class MessageView(APIView):
    """
    RESTFUL API for interacting with wolfmail.models.Message objects.
    """
    def get_queryset(self, request):
        data = dict(request.GET)
        # convert filter by rcvd_date__lte to proper datetime object
        rcvd_date = False
        if data.get('rcvd_date__lte', False):
            rcvd_date = data.pop('rcvd_date__lte')[0]
            data['rcvd_date__lte'] = dt.datetime.combine(
                dt.datetime.strptime(rcvd_date[0:10], '%Y-%m-%d'),
                dt.time(23, 59, 59, tzinfo=get_current_timezone())
            )
        # Check for user authentication status
        if request.user.is_anonymous:
            qs = Message.objects.none()
        else:
            qs = Message.objects.filter(owner=request.user)
        # Filter by get params
        if 'in_inbox' in data:
            data['in_inbox'] = bool(data['in_inbox'][0])
        # if 'rcvd_date__lte' in params:
        #     params['in_inbox'] = bool(params['in_inbox'][0])
        qs = qs.filter(**data).select_related('source_node')
        return qs

    def get(self, request, pk=None):
        if pk is None:
            # Return collection as serialized JSON
            qs = self.get_queryset(request)
            serializer = InboxSerializer(qs, many=True)
        else:
            # Return specified message as serialized JSON
            msg = Message.objects.get(pk=pk)
            # Test authorization
            if msg.owner != request.user:
                return HttpResponseForbidden()
            serializer = MessageSerializer(msg)
        return Response(serializer.data)

    def put(self, request, pk):
        if request.query_params:
            data = request.query_params
        else:
            data = request.data
        action = data.get('action', None)
        message = Message.objects.get(pk=pk)
        if action == 'archive':
            # Archive this Message
            message.handler.archive()
            serializer = MessageSerializer(message)
            r = {'status': 'success',
                 'message': serializer.data}
        elif action == 'defer':
            # Reschedule this Message to a later date
            new_date = dt.datetime.strptime(
                data['target_date'],
                '%Y-%m-%d'
            ).replace(tzinfo=get_current_timezone())
            message.handler.defer(new_date)
            serializer = MessageSerializer(message)
            r = {'status': 'success',
                 'message': serializer.data}
        return Response(r)

    def post(self, request, pk):
        if request.query_params:
            data = request.query_params
        else:
            data = request.data
        action = data.get('action', None)
        if action == 'create_heading':
            message = Message.objects.get(pk=pk)
            # Create a new action based on this message
            message_data = MessageSerializer(message).data
            node = message.handler.create_node()
            # Set some attributes on the newly created Node()
            node.todo_state = TodoState.objects.get(abbreviation='NEXT')
            node.title = data.get('title', node.title)
            node.text = message.message_text
            pid = data.get('parent', None)
            if pid is not None:
                node.parent = Node.objects.get(pk=pid)
            node.save()
            # Close this Node if requested
            if data.get('close', 'false') == 'true':
                message_data['in_inbox'] = False
                node.todo_state = TodoState.objects.get(abbreviation='DONE')
                node.auto_update = True
                node.save()
            else:
                message = Message.objects.filter(pk=pk).first()
                message_data = MessageSerializer(message).data
            heading_serializer = NodeSerializer(node, request=request)
            r = {'status': 'success',
                 'heading': heading_serializer.data}
            r['message'] = message_data
        else:
            data = data.dict()
            data['rcvd_date'] = dt.datetime.now(get_current_timezone())
            data['owner'] = request.user
            msg = Message(**data)
            msg.save()
            r = MessageSerializer(msg).data
        return Response(r)

    def delete(self, request, pk):
        if pk is None:
            return HttpResponseNotAllowed(['GET', 'POST'])
        msg = Message.objects.get(pk=pk)
        msg.delete()
        return Response({'status': 'success',
                         'result': 'message_deleted'})
