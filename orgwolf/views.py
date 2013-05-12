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

from __future__ import unicode_literals, print_function, absolute_import
from datetime import datetime
import json
import urllib

from django.core.urlresolvers import reverse
from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import forms as authforms
from django.contrib.auth.hashers import is_password_usable
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse

from orgwolf import settings
from orgwolf.models import OrgWolfUser as User
from orgwolf.forms import FeedbackForm, RegistrationForm, ProfileForm, PasswordForm
from wolfmail.models import MailItem, Label

def home(request):
    if request.user.is_authenticated():
        if request.is_mobile:
            template = 'home_m.html'
        else:
            template = 'home.html'
        return render_to_response(template,
                                  locals(),
                                  RequestContext(request))
    else:
        form = authforms.AuthenticationForm()
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
        # data = request.POST.copy()
        data = request.POST.copy()
        data['last_login'] = data.get('last_login', datetime.now())
        data['date_joined'] = data.get('date_joined', datetime.now())
        data['home'] = data.get('home', 'node_object')
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

@login_required
def profile(request):
    """Shows the user a settings page"""
    post = request.POST
    if request.method == "POST" and post.get('form') == 'profile':
        # User is modifying profile data
        profile_form = ProfileForm(post, instance=request.user)
        if profile_form.is_valid():
            profile_form.save()
    else: # Normal GET request
        # Prepare the relevant forms
        profile_form = ProfileForm(instance=request.user)
    # Sort the social_auth accounts into active and inactive lists
    backends = list(settings.SOCIAL_AUTH_BACKENDS)
    accounts = request.user.social_auth.all()
    active_backends = []
    be_list = []
    for backend in backends:
        be_list.append( backend['backend'] )
    for account in accounts:
        be_str = '{0}.{1}'.format(
            account.get_backend().AUTH_BACKEND.__module__,
            account.get_backend().AUTH_BACKEND.__name__
            )
        if be_str in be_list: # User is authenticated on this backend
            new_be = backends.pop(
                be_list.index(be_str)
                )
            new_be['pk'] = account.pk
            active_backends.append(new_be)
            be_list.pop(
                be_list.index(be_str)
                )
    # See if the user has a password saved
    if is_password_usable(request.user.password):
        password_set = True
    else:
        password_set = False
    return render_to_response('registration/profile.html',
                              locals(),
                              RequestContext(request))

def change_password(request):
    """Provides the change password form or changes password based on
    submitted form."""
    if request.method == 'POST':
        form = PasswordForm(request.POST)
        form.user = request.user
        if form.is_valid():
            request.user.set_password(form.cleaned_data['password'])
            request.user.save()
            return redirect(reverse('orgwolf.views.profile'))
    else:
        form = PasswordForm()
    return render_to_response('registration/password.html',
                                  locals(),
                                  RequestContext(request))

def persona_login(request):
    """Authenticates a user based on the persona library by Mozilla."""
    # First validate assertiong with identifer
    data = {'audience': settings.PERSONA_AUDIENCE,
            'assertion': request.POST['assertion'] }
    r = urllib.urlopen(
        'https://verifier.login.persona.org/verify',
        urllib.urlencode(data)
    )
    r = json.loads( r.read() )
    if r['status'] == 'okay':
        # Persona login succeeded
        users = User.objects.filter(username=r['email'])
        if len(users) == 1:
            # Existing user
            user = users[0]
        elif len(users) == 0:
            # Create new user
            user = User()
            user.home = 'orgwolf.views.home'
            user.email = r['email']
            user.username = r['email']
            user.password = '!'
            user.save()
        else:
            # Ambiguous e-mail address, multiple users
            r['status'] = 'failure'
            r['reason'] = 'multiple users with email'
        if r['status'] == 'okay':
            # Now login
            user.backend = 'django.contrib.auth.backends.ModelBackend'
            login(request, user)
            if request.GET.get('next'):
                r['next'] = request.GET.get('next')
                print(request.GET.get('next'))
            else:
                r['next'] = reverse(user.home)
                print('no next found')
    response = HttpResponse(json.dumps(r))
    if r['status'] == 'failure':
        response.status_code = 400
    return response

def persona_logout(request):
    logout(request)
    return response

def jstest(request):
    """Executes the javascript test runner (QUnit).
    Unit tests are stored in `appname/static/`."""
    return render_to_response('qunit.html',
                              locals(),
                              RequestContext(request))
