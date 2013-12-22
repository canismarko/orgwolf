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
from django.contrib.auth.models import User
from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response

from gtd.forms import NodeForm
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
        # No pk so list as collection
        qs = Message.objects.filter(owner=request.user)
        # Filter by get params
        qs = qs.filter(**data.dict())
        # Return results as serialized JSON
        serializer = MessageSerializer(qs, many=True)
        return Response(serializer.data)

    def put(self, request, pk):
        action = request.DATA.get('action')
        message = Message.objects.get(pk=pk)
        node = message.handler.create_node()
        node.todo_state = TodoState.objects.get(abbreviation='NEXT')
        node.save()
        return Response()
