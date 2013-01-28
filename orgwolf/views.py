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

from django.core.urlresolvers import reverse
from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.contrib.auth import authenticate, login
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required
from datetime import datetime

from orgwolf.models import OrgWolfUser as User
from orgwolf.forms import FeedbackForm, RegistrationForm
from wolfmail.models import MailItem, Label

def home(request):
    if request.user.is_authenticated():
        if request.is_mobile:
            template = 'home_m.html'
        else:
            template = 'home.html'
        # return redirect(reverse('gtd.views.agenda_display'))
        return render_to_response(template,
                                  locals(),
                                  RequestContext(request))
    else:
        form = AuthenticationForm()
        new_user_form = RegistrationForm()
        new_user_form.fields['username'].help_text = ''
        if request.is_mobile:
            template = 'landing_m.html'
        else:
            template = 'landing.html'
        return render_to_response(template,
                                  locals(),
                                  RequestContext(request))

def new_user(request):
    """New user registration"""
    if request.method == 'POST':
        # Validate and create new user
        data = request.POST.copy()
        data['last_login'] = data.get('last_login', datetime.now())
        data['date_joined'] = data.get('date_joined', datetime.now())
        data['home'] = data.get('home', 'gtd.views.display_node')
        new_user_form = RegistrationForm(data)
        if new_user_form.is_valid():
            # Create the new user and log her in
            new_user = User()
            new_user.username = data['username']
            new_user.set_password(data['password'])
            new_user.home = data['home']
            new_user.save()
            user = authenticate(username=data['username'],
                                password=data['password'])
            if user != None:
                login(request, user)
                return redirect(reverse(user.home))
        # Show the standard new user registration page
        return render_to_response('registration/new_user.html',
                                  locals(),
                                  RequestContext(request))
    else:
        new_user_form = RegistrationForm()
        return render_to_response('registration/new_user.html',
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
