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
from django.contrib.auth.decorators import login_required

from wolfmail.models import MailItem, Label
from gtd.forms import NodeForm

@login_required
def display_label(request, requested_label):
    """Displays the inbox of new messages"""
    label = Label.objects.get(name__iexact=requested_label)
    mail_items = label.mailitem_set.all()
    mail_items = mail_items.filter(owner=request.user)
    return render_to_response('display_inbox.html',
                              locals(),
                              RequestContext(request))

@login_required
def display_message(request, requested_label, message_id):
    """Show the details of a message. Handled specially for inbox."""
    label = Label.objects.get(name__iexact=requested_label)
    mail_item = MailItem.objects.get(id=message_id)
    return render_to_response('display_message.html',
                              locals(),
                              RequestContext(request))

@login_required
def convert_mail_to_node(request, url_label, message_id):
    """Take a user's mail item and convert it into a new node.
    This displays a more formal node addition mechanism for if
    the quick links aren't used."""
    message = MailItem.objects.get(id=message_id)
    if request.method == 'POST': # Process submitted form
        form = NodeForm(request.POST)
    else: # Present new form
        initial_values = {}
        initial_values = {'title': message.subject}
        form = NodeForm(initial=initial_values)
    return render_to_response('new_node.html',
                              locals(),
                              RequestContext(request))

@login_required
def quick_node(request):
    pass
