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

from django.urls import reverse
from django.db import IntegrityError
from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.hashers import is_password_usable
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.views.generic import TemplateView
import httplib2
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from gtd.shortcuts import load_fixture
from orgwolf import settings
from orgwolf.forms import RegistrationForm, ProfileForm, PasswordForm
from orgwolf.models import AccountAssociation
from orgwolf.models import OrgWolfUser as User
from orgwolf.serializers import AccountAssociationSerializer, UserSerializer
from orgwolf.shortcuts import import_plugin
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
                      message_text=request.data['body'],
                      owner=User.objects.get(pk=1),
                      sender=request.user.get_username())
        msg.save()
        msg = Message.objects.get(pk=msg.pk)
        return Response({})


@api_view(['GET'])
def socialauth_providers(request):
    """
    Returns data needed by angularjs to make social auth buttons,
    mostly from settings.py.
    """
    # settings.py determines which of these providers get sent
    dispatcher_dict = {
        'google': {
            "plus_scope": import_plugin('plugins.google', 'GOOGLE_SCOPE'),
            "plus_id": settings.GOOGLE_PLUS_KEY,
            "button_type": "Google",
            "handler_path": "plugins.google",
        }
    }
    providers = settings.SOCIAL_AUTH_PROVIDERS
    data = [dispatcher_dict[provider] for provider in providers]
    return Response(data)


class AccountAssociationView(APIView):
    """Interact with connections between social accounts linked to a user."""
    def get(self, request, id=None):
        associations = AccountAssociation.objects.filter(ow_user=request.user)
        serializer = AccountAssociationSerializer(associations, many=True)
        return Response(serializer.data)

    def delete(self, request, id=None):
        if id:
            AccountAssociation.objects.get(pk=id).delete()
        return Response(None, status=status.HTTP_204_NO_CONTENT)

    def post(self, request, id=None):
        """Creates a new account via an account handler."""
        handler_path = request.DATA['handler_path']
        Handler = import_plugin(handler_path, 'AccountHandler')
        account, response, status = Handler.authorize_account(request.DATA,
                                                              request.user)
        return Response(response, status=status)


class UserView(APIView):
    """User details and permissions"""

    def get(self, request, *args, **kwargs):
        """ Return the currently logged in user by default"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

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
