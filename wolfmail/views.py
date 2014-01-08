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

from django.contrib.auth.decorators import login_required
from django.http import HttpResponseNotAllowed
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.decorators import method_decorator
from django.utils.timezone import get_current_timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from gtd.models import Node, TodoState
from wolfmail.models import Message
from wolfmail.serializers import MessageSerializer


def inbox(request):
    return render_to_response('wolfmail/inbox.html',
                              locals(),
                              RequestContext(request))


class MessageView(APIView):
    """
    RESTFUL API for interacting with wolfmail.models.Message objects.
    """
    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super(MessageView, self).dispatch(*args, **kwargs)

    def get(self, request, pk=None):
        data = request.GET.copy()
        if data.get('now', False):
            data.pop('now')
            data['rcvd_date__lte'] = dt.datetime.now()
        # No pk so list as collection
        qs = Message.objects.filter(owner=request.user)
        # Filter by get params
        qs = qs.filter(**data.dict())
        # Return results as serialized JSON
        serializer = MessageSerializer(qs, many=True)
        return Response(serializer.data)

    def put(self, request, pk):
        action = request.DATA.get('action', None)
        message = Message.objects.get(pk=pk)
        if action == 'create_node':
            node = message.handler.create_node()
            # Set some attributes on the newly created Node()
            node.todo_state = TodoState.objects.get(abbreviation='NEXT')
            node.title = request.DATA.get('title', node.title)
            pid = request.DATA.get('parent', None)
            if pid is not None:
                node.parent = Node.objects.get(pk=pid)
            node.save()
            # Close this Node if requested
            if request.DATA.get('close', False):
                node.todo_state = TodoState.objects.get(abbreviation='DONE')
                node.save()
        elif action == 'archive':
            # Archive this Message
            message.handler.archive()
        elif action == 'defer':
            # Reschedule this Message to a later date
            new_date = dt.datetime.strptime(
                request.DATA['target_date'],
                '%Y-%m-%d'
            ).replace(tzinfo=get_current_timezone())
            message.rcvd_date = new_date
            message.save()
        r = {'status': 'success',
             'result': 'message_deleted'}
        return Response(r)

    def post(self, request, pk):
        # data = JSONParser().parse(request.DATA.dict())
        # msg = Message(**data)
        data = request.DATA.dict()
        data['rcvd_date'] = dt.datetime.now(get_current_timezone())
        data['owner'] = request.user
        msg = Message(**data)
        msg.save()
        serializer = MessageSerializer(msg)
        return Response(serializer.data)

    def delete(self, request, pk):
        if pk is None:
            return HttpResponseNotAllowed(['GET', 'POST'])
        msg = Message.objects.get(pk=pk)
        msg.delete()
        return Response({'status': 'success',
                         'result': 'message_deleted'})
