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

from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.contrib.auth.models import User

from wolfmail.models import MailItem

def inbox(request):
    """Displays the inbox of new messages"""
    # owner_id = request.user.id
    mail_items = MailItem.objects.filter(owner=request.user)
    return render_to_response('display_inbox.html',
                              locals(),
                              RequestContext(request))

def filter_label(request, label):
    return render_to_response('display_inbox.html',
                              locals(),
                              RequestContext(request))

    
