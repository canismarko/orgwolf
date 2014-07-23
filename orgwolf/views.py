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
import datetime as dt
import json
import requests

from django.core.urlresolvers import reverse
from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.hashers import is_password_usable
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.views.generic import TemplateView
import httplib2
from oauth2client import client as google_client
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from gtd.shortcuts import load_fixture
from orgwolf import settings
from orgwolf.forms import RegistrationForm, ProfileForm, PasswordForm
from orgwolf.models import AccountAssociation
from orgwolf.models import OrgWolfUser as User
from orgwolf.serializers import AccountAssociationSerializer
from wolfmail.models import Message


class AngularView(TemplateView):
    """
    View class that serves up the base angular template.
    """
    template_name = 'angular.html'

    def get_context_data(self, **kwargs):
        """
        Add local_net from settings variable.
        """
        context = super(AngularView, self).get_context_data(**kwargs)
        context['local_net'] = settings.LOCAL_NET
        return context


def home(request):
    if request.user.is_authenticated():
        url = reverse(request.user.home)
    else:
        url = reverse('projects')
    return redirect(url)


class FeedbackView(APIView):
    """
    Allows the user to quickly provide feedback about
    the operation of the site.
    """
    permission_classes = (IsAuthenticated,)
    def post(self, request):
        msg = Message(subject='Site feedback',
                      message_text=request.DATA['body'],
                      owner=User.objects.get(pk=1),
                      sender=request.user.get_username())
        msg.save()
        msg = Message.objects.get(pk=msg.pk)
        return Response({})


# @login_required
# def profile(request):
#     """Shows the user a settings page"""
#     post = request.POST
#     if request.method == "POST" and post.get('form') == 'profile':
#         # User is modifying profile data
#         profile_form = ProfileForm(post, instance=request.user)
#         if profile_form.is_valid():
#             profile_form.save()
#     else: # Normal GET request
#         # Prepare the relevant forms
#         profile_form = ProfileForm(instance=request.user)
#     # Sort the social_auth accounts into active and inactive lists
#     # backends = list(settings.SOCIAL_AUTH_BACKENDS)
#     # accounts = request.user.social_auth.all()
#     active_backends = []
#     be_list = []
#     # for backend in backends:
#     #     be_list.append( backend['backend'] )
#     # for account in accounts:
#     #     be_str = '{0}.{1}'.format(
#     #         account.get_backend().AUTH_BACKEND.__module__,
#     #         account.get_backend().AUTH_BACKEND.__name__
#     #         )
#     #     if be_str in be_list: # User is authenticated on this backend
#     #         new_be = backends.pop(
#     #             be_list.index(be_str)
#     #             )
#     #         new_be['pk'] = account.pk
#     #         active_backends.append(new_be)
#     #         be_list.pop(
#     #             be_list.index(be_str)
#     #             )
#     # See if the user has a password saved
#     if is_password_usable(request.user.password):
#         password_set = True
#     else:
#         password_set = False
#     return render_to_response('registration/profile.html',
#                               locals(),
#                               RequestContext(request))


# class AccountsView(TemplateView):
#     """
#     View for setting or disabling social login inboxes.
#     """
#     template_name = 'registration/inboxes.html'

#     def get_context_data(self, **kwargs):
#         """
#         Return a list of current accounts, etc.
#         """
#         context = super(AccountsView, self).get_context_data(**kwargs)
#         context['backends'] = list(settings.SOCIAL_AUTH_BACKENDS)
#         context['accounts'] = self.request.user.social_auth.all()
#         return context


GOOGLE_SCOPE = 'https://www.googleapis.com/auth/plus.login'


@api_view(['GET'])
def socialauth_providers(request):
    """
    Returns data needed by angularjs to make social auth buttons,
    mostly from settings.py.
    """
    def google_provider():
        dict = {
            "plus_scope": ' '.join(GOOGLE_SCOPE),
            "plus_id": settings.GOOGLE_PLUS_KEY,
            "button_type": "Google",
        }
        return dict
    # settings.py determines which of these providers get sent
    dispatcher_dict = {
        'google': google_provider
    }
    providers = settings.SOCIAL_AUTH_PROVIDERS
    data = [dispatcher_dict[provider]() for provider in providers]
    return Response(data)


@api_view(['POST'])
def google_auth(request):
    """Exchange a google-plus authorization code for an access token."""
    code = request.DATA['code']

    # Upgrade the authorization code into a credentials object
    oauth_flow = google_client.OAuth2WebServerFlow(
        client_id=settings.GOOGLE_PLUS_KEY,
        client_secret=settings.GOOGLE_PLUS_SECRET,
        redirect_uri='postmessage',
        scope=GOOGLE_SCOPE)
    credentials = oauth_flow.step2_exchange(code)

    # Check that the access token is valid.
    access_token = credentials.access_token
    url = ('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=%s'
           % access_token)
    h = httplib2.Http()
    result = json.loads(h.request(url, 'GET')[1])
    # If there was an error in the access token info, abort.
    if result.get('error') is not None:
        response = make_response(json.dumps(result.get('error')), 500)
        response.headers['Content-Type'] = 'application/json'
        return response
    # Verify that the access token is valid for this app.
    if result['issued_to'] != settings.GOOGLE_PLUS_KEY:
        response = make_response(
            json.dumps("Token's client ID does not match app's."), 401)
        response.headers['Content-Type'] = 'application/json'
        return response
    # Check that the user's credentials don't already exist then save them
    if AccountAssociation.objects.filter(remote_id=result['user_id']).count() == 0:
        association = AccountAssociation(
            ow_user=request.user,
            access_token=credentials.access_token,
            handler_path='Google',
            remote_id=result['user_id'],
        )
        association.save()
        return Response({"status": "success"})
    else:
        return Response({"status": "unchanged"})


class AccountAssociationView(APIView):
    """Interact with connections between social accounts linked to a user."""
    def get(self, request, id=None):
        associations = AccountAssociation.objects.filter(ow_user=request.user)
        serializer = AccountAssociationSerializer(associations, many=True)
        return Response(serializer.data)
    def delete(self, request, id=None):
        print(id)
        if id:
            AccountAssociation.objects.get(pk=id).delete()
        return Response({})


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

@api_view(['POST'])
def persona_login(request):
    """Authenticates a user based on the persona library by Mozilla."""
    # First validate assertiong with identifer
    data = {'audience': settings.PERSONA_AUDIENCE,
            'assertion': request.DATA['assertion'] }
    r = requests.post('https://verifier.login.persona.org/verify',
                             params=data, verify=True)
    r = r.json()
    if r['status'] == 'okay':
        # Persona login succeeded
        users = User.objects.filter(username=r['email'])
        if len(users) == 1:
            # Existing user
            user = users[0]
        elif len(users) == 0:
            # Create new user
            user = User()
            user.email = r['email']
            user.username = r['email']
            user.password = '!'
            user.save()
            # Copy public nodes as help system
            load_fixture(open('gtd/fixtures/public-data.json')).update(owner=user)
        else:
            # Ambiguous e-mail address, multiple users
            r['status'] = 'failure'
            r['reason'] = 'multiple users with email'
        if r['status'] == 'okay':
            # Now login
            user.backend = 'django.contrib.auth.backends.ModelBackend'
            login(request, user)
            r['user_id'] = user.id
            if request.GET.get('next'):
                r['next'] = request.GET.get('next')
            else:
                r['next'] = reverse(user.home)
                print('no next found')
    response = HttpResponse(json.dumps(r))
    if r['status'] == 'failure':
        response.status_code = 400
    return response

def persona_logout(request):
    logout(request)
    return HttpResponse(json.dumps({'status': 'success'}))
