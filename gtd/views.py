# -*- coding: utf-8 -*-
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
import json
import logging
import math
import re

from django.contrib.auth.decorators import login_required
from django.core import serializers
from django.core.exceptions import FieldError
from django.urls import reverse
from django.db.models import Q
from django.db.models.query import QuerySet
from django.http import (HttpResponse, Http404,
                         HttpResponseBadRequest, HttpResponseNotAllowed)
from django.shortcuts import render_to_response, redirect, get_object_or_404
from django.template import RequestContext
from django.utils.timezone import get_current_timezone
from django.views.generic import View
from django.views.generic.detail import DetailView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import mixins, generics

from gtd.forms import NodeForm
from gtd.models import TodoState, Node, Context, FocusArea, Location
from gtd.shortcuts import get_todo_abbrevs, order_nodes
from gtd.serializers import (ContextSerializer, FocusAreaSerializer,
                             TagSerializer,
                             TodoStateSerializer, NodeSerializer,
                             NodeListSerializer, NodeOutlineSerializer,
                             CalendarSerializer, CalendarDeadlineSerializer)
from orgwolf import settings

# Prepare logger
logger = logging.getLogger('gtd.views')


class NodeView(APIView):
    """
    API for interacting with Node objects. Unauthenticated requests
    are permitted but do not alter the database. Several query parameters
    have special significance, otherwise query parameters are treated as
    filters:

    - 'context=[integer]': Any query with context (even if it is null) is
    treated as an actions-list. The query indicates which Context object
    should be used.

    - 'field_group=[string]': Allows for an alternate set of fields to
    be returned.

    - 'upcoming=[date-string]': Requests a list of Node objects that are
    due soon. The date-string should be UTC and ISO formatted (YYYY-mm-dd).
    """
    def get(self, request, *args, **kwargs):
        """Returns the details of the node as a json encoded object"""
        SERIALIZERS = {
            'default': NodeSerializer,
            'actions_list': NodeListSerializer,
            'outline': NodeOutlineSerializer,
            'calendar': CalendarSerializer,
            'calendar_deadlines': CalendarDeadlineSerializer,
        }
        import time
        get_dict = request.GET.copy()
        node_id = kwargs.get('pk')
        # Look for the reserved query parameters
        if get_dict.get('upcoming', None):
            # Get Nodes with upcoming deadline
            nodes = self.get_upcoming(request, *args, **kwargs)
            default_serializer = 'actions_list'
        elif get_dict.get('context', None):
            # Context is given, so this is an actions list
            nodes = self.get_actions_list(request, *args, **kwargs)
            default_serializer = 'actions_list'
        elif node_id is not None:
            # A specific Node object is requested
            nodes = get_object_or_404(Node, pk=node_id)
            default_serializer = 'default'
        else:
            nodes = self.get_queryset(request, *args, **kwargs)
            default_serializer = 'default'
        # Check for alternate serializer
        try:
            field_group = get_dict.pop('field_group')[0]
        except KeyError:
            field_group = default_serializer
        Serializer = SERIALIZERS[field_group]
        # Serialize and return the queryset or object
        is_many = isinstance(nodes, QuerySet)
        serializer = Serializer(nodes, many=is_many, request=request)
        return Response(serializer.data)
    
    def get_queryset(self, request, *args, **kwargs):
        """
        Return a queryset for regular GET queries. If a context
        is given as a query parameter, then the get_action_list()
        method is to be used instead.
        """
        BOOLS = ('archived',) # Translate 'False' -> False for these fields
        M2M = ['todo_state'] # For filtering on arrays
        nodes = Node.objects.mine(request.user, get_archived=True)
        get_dict = request.GET.copy()
        # get_dict = dict(request.GET)
        parent_id = get_dict.get('parent_id', None)
        if parent_id == '0':
            nodes = nodes.filter(parent=None)
            get_dict.pop('parent_id')
        # Apply each criterion to the queryset
        for key in get_dict.keys():
            if key in BOOLS:
                query = {key: False if get_dict[key] == 'false' else True}
            elif key in M2M:
            # Convert to (param__in=[]) style list filtering
                value_list = get_dict.getlist(key)
                param = "{}__in".format(key)
                query = {param: value_list}
            else:
                query = {key: get_dict[key]}
            try:
                nodes = nodes.filter(**query)
            except FieldError:
                pass
        nodes = nodes.select_related('owner')
        nodes = nodes.prefetch_related('users', 'focus_areas')
        return nodes
    
    def get_actions_list(self, request, *args, **kwargs):
        """
        Fetches a queryset for the requested "Next Actions" list.
        Only called if 'context' is passed as a GET query parameter (even if
        it equals None).
        """
        # Filter by parent
        parent_id = request.GET.get('parent', None)
        if parent_id is not None:
            parent = Node.objects.get(pk=parent_id)
            nodes = parent.get_descendants(include_self=True)
        else:
            nodes = Node.objects.all()
        nodes = nodes.assigned(request.user).select_related('todo_state')
        # Filter by todo state
        final_Q = Q()
        todo_states_params = request.GET.getlist('todo_state')
        todo_string = ''
        for todo_state in todo_states_params:
            final_Q = final_Q | Q(todo_state=todo_state)
        nodes = nodes.filter(final_Q)
        # Filter by FocusArea
        focus_area = request.GET.get('focus_area', None)
        if focus_area:
            nodes = nodes.filter(focus_areas=focus_area)
        # Filter by context
        context_id = request.GET.get('context', None)
        if context_id == '0':
            request.session['context_id'] = None
        elif context_id != 'None' and context_id is not None:
            context = Context.objects.get(id=context_id)
            nodes = context.apply(nodes)
            request.session['context_id'] = context_id
            request.session['context_name'] = context.name
        # DB optimization
        nodes = nodes.select_related('owner')
        nodes = nodes.prefetch_related('users', 'focus_areas')
        return nodes
    
    def get_upcoming(self, request, *args, **kwargs):
        """
        Get QuerySet with deadlines coming up based on
        'upcoming' query parameter.
        """
        deadline_period = 7 # in days
        all_nodes_qs = Node.objects.mine(request.user)
        target_date = dt.datetime.strptime(request.GET['upcoming'],
                                           '%Y-%m-%d').date()
        # Determine query filters for "Upcoming Deadlines" section
        undone_Q = Q(todo_state__closed=False) | Q(todo_state=None)
        deadline = target_date + dt.timedelta(days=deadline_period)
        upcoming_deadline_Q = Q(deadline_date__lte=deadline)
        scheduled_Q = ~Q(scheduled_date__gt=target_date) | Q(deadline_date__lte=target_date)
        deadline_nodes = all_nodes_qs.filter(undone_Q, upcoming_deadline_Q, scheduled_Q)
        deadline_nodes = deadline_nodes.order_by("deadline_date")
        # DB optimization
        deadline_nodes = deadline_nodes.select_related('owner')
        deadline_nodes = deadline_nodes.prefetch_related('focus_areas')
        return deadline_nodes
    
    def post(self, request, pk=None, *args, **kwargs):
        """
        Create a new Node, conducted through JSON format:
        {
          id: [node primary key],
          title: 'Everything's shiny, captn',
          todo_state: 2,
          etc...
        }
        
        Ignores fields related to MPTT for new nodes as these get
        set automatically based on the 'parent' attribute.
        
        Returns: JSON object of all node fields, with changes.
        """
        data = request.data.copy()
        if pk is not None:
            # Cannot POST if a node is specified by primary key
            return HttpResponseNotAllowed(['GET', 'PUT'])
        # Create new node
        self.node = Node()
        if not request.user.is_anonymous:
            self.node.owner = request.user
        self.node.save()
        # Set fields (ignore mptt fields for new nodes)
        for key in ('id', 'tree_id', 'lft', 'rght', 'level'):
            try:
                data.pop(key)
            except KeyError:
                pass
        self.node.set_fields(data)
        self.node.save()
        # Return newly saved node as json
        self.node = Node.objects.get(pk=self.node.pk)
        serializer = NodeSerializer(self.node, request=request)
        data = serializer.data
        # Don't keep nodes sent via the public interface
        if request.user.is_anonymous:
            self.node.delete()
        return Response(data)

    def put(self, request, pk=None, *args, **kwargs):
        """
        Edit existing nodes through JSON format:
        {
          id: [node primary key],
          title: 'Everything's shiny, captn',
          todo_state: 2,
          etc...
        }
        """
        if pk is None:
            # Throw error response if user is trying to
            # PUT without specifying a pk
            return HttpResponseNotAllowed(['GET', 'POST'])
        data = request.data.copy()
        # Remove tree metadata from the request
        TREE_FIELDS = ('lft', 'rght', 'level', 'tree_id')
        for key in TREE_FIELDS:
            try:
                data.pop(key)
            except KeyError:
                pass
        # Check the permissions of the Node
        node = get_object_or_404(Node, pk=pk)
        access = node.access_level(request.user)
        if ((request.user.is_anonymous and node.owner is not None) or
            (not request.user.is_anonymous and access != 'write')):
            # Not authorized
            return HttpResponse(
                json.dumps({'status': 'failure',
                            'reason': 'unauthorized'}),
                status=401)
        # Update and return the Node
        node.set_fields(data)
        if not request.user.is_anonymous:
            node.save()
            node = Node.objects.get(pk=node.pk)
        serializer = NodeSerializer(node, request=request)
        return Response(serializer.data)


class TodoStateView(mixins.ListModelMixin,
                    mixins.RetrieveModelMixin,
                    generics.GenericAPIView):
    """Handles RESTful retrieval of TodoState objects"""
    serializer_class = TodoStateSerializer
    def get_object(self):
        return TodoState.objects.get(pk=self.kwargs['pk'])
    def get_queryset(self):
        return TodoState.get_visible(user=self.request.user)
    def get(self, request, pk=None, *args, **kwargs):
        if pk:
            return self.retrieve(request, *args, **kwargs)
        else:
            return self.list(request, *args, **kwargs)


class FocusAreaView(APIView):
    """RESTful interaction with the gtd.FocusArea object"""
    def get(self, request, *args, **kwargs):
        params = dict(request.query_params)
        if 'is_visible' in params:
            params['is_visible'] = bool(params['is_visible'][0])
        focus_areas = FocusArea.get_visible(request.user)
        focus_areas = focus_areas.filter(**params)
        serializer = FocusAreaSerializer(focus_areas, many=True)
        return Response(serializer.data)


class ContextView(APIView):
    """RESTful interaction with the gtd.context object"""
    def get(self, request, *args, **kwargs):
        contexts = Context.get_visible(request.user)
        # Get some prefetched values to minimize database workload
        contexts = contexts.prefetch_related('locations_available')
        # Turn contexts into a serialized list
        serializer = ContextSerializer(contexts, many=True)
        return Response(serializer.data)


class LocationView(generics.ListAPIView):
    """RESTful interaction with the gtd.models.Location object"""
    serializer_class = TagSerializer
    
    def get_queryset(self):
        if self.request.user.is_authenticated:
            by_user = Q(owner=self.request.user)
        else:
            by_user = Q(owner=None)
        is_public = Q(public=True)
        qs = Location.objects.filter(by_user | is_public)
        return qs
