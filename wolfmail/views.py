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

from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from rest_framework.views import APIView
from rest_framework.response import Response

from gtd.forms import NodeForm
from wolfmail.models import MailItem, DeferredItem


def inbox(request):
    return render_to_response('wolfmail/inbox.html',
                              locals(),
                              RequestContext(request))


class DeferredItemView(APIView):
    def get(self, request):
        messages = DeferredItem.objects.none()
        return Response(messages)
