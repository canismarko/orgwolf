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
from django.contrib.auth.decorators import login_required
from datetime import datetime

from orgwolf.models import OrgWolfUser as User
from orgwolf.forms import FeedbackForm
from wolfmail.models import MailItem, Label

def home(request):
    return render_to_response('home.html',
                              locals(),
                              RequestContext(request))

@login_required
def feedback(request):
    """Allows the user to quickly provide feedback about 
    the operation of the site."""
    next_page = request.GET['next']
    if request.method == "POST":
        form = FeedbackForm(request.POST)
        if form.is_valid():
            mail_item = MailItem()
            mail_item.sender = "Feedback"
            mail_item.owner = User.objects.get(id=1)
            mail_item.subject = form.cleaned_data['subject']
            mail_item.rcvd_date = datetime.now()
            mail_item.message_text = form.cleaned_data['message_text']
            mail_item.save()
            mail_item.labels.add(Label.objects.get(id=1))
            return redirect(request.POST['next'])
    else:
        form = FeedbackForm()
    return render_to_response('feedback.html',
                              locals(),
                              RequestContext(request))

def jstest(request):
    """Executes the javascript test runner (QUnit).
    Unit tests are stored in `appname/static/`."""
    return render_to_response('qunit.html',
                              locals(),
                              RequestContext(request))
