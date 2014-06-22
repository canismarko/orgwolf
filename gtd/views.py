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
from django.core.urlresolvers import reverse
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
from gtd.models import TodoState, Node, Context, Scope
from gtd.shortcuts import (parse_url, generate_url, get_todo_abbrevs,
                           order_nodes)
from gtd.serializers import (ContextSerializer, ScopeSerializer,
                             TodoStateSerializer, NodeSerializer,
                             NodeListSerializer, NodeOutlineSerializer,
                             CalendarSerializer, CalendarDeadlineSerializer)
from orgwolf import settings

# Prepare logger
logger = logging.getLogger('gtd.views')

@login_required
def list_display(request, url_string=""):
    """Determines which list the user has requested and fetches it."""
    all_todo_states_query = TodoState.get_visible(request.user)
    all_scope_qs = Scope.objects.all()
    todo_states = all_todo_states_query
    list(todo_states)
    all_todo_states_json = TodoState.as_json(queryset = todo_states)
    todo_states_query = TodoState.objects.none()
    todo_abbrevs = get_todo_abbrevs(todo_states)
    todo_abbrevs_lc = []
    base_url = reverse('list_display')
    base_node_url = reverse('projects')
    list_url = base_url
    list_url += '{parent}{states}{scope}{context}'
    scope_url_data = {}
    tz = get_current_timezone()
    # scope_url = base_url # for urls of scope tabs
    if url_string == None:
        url_string = ""
    for todo_abbrev in todo_abbrevs:
        todo_abbrevs_lc.append(todo_abbrev.lower())
    # Handle requests to change the TODO, context and scope filters
    if request.method == "POST":
        todo_regex = re.compile(r'todo(\d+)')
        new_context_id = 0
        todo_state_Q = Q()
        empty_Q = True
        parent = None
        # Check for TODO filters
        for post_item in request.POST:
            todo_match = todo_regex.match(post_item)
            if todo_match:
                todo_state_Q = todo_state_Q | Q(id=todo_match.groups()[0])
                empty_Q = False
            elif post_item == 'context':
                new_context_id = int(request.POST['context'])
                # Update session variable if user is clearning the context
                if new_context_id == 0:
                    request.session['context'] = None
            elif post_item == 'scope':
                new_scope_id = int(request.POST['scope'])
            elif post_item == 'parent_id':
                parent = Node.objects.get(pk=request.POST['parent_id'])
        # Now build the new URL and redirect
        new_url = base_url
        if empty_Q:
            matched_todo_states = TodoState.objects.none()
        else:
            matched_todo_states = TodoState.objects.filter(todo_state_Q)
        if parent:
            new_url += 'parent{0}/'.format(parent.pk)
        for todo_state in matched_todo_states:
            new_url += todo_state.abbreviation.lower() + '/'
        if new_scope_id > 0:
            new_url += 'scope' + str(new_scope_id) + '/'
        if new_context_id > 0:
            new_url += 'context' + str(new_context_id) + '/'
        return redirect(new_url)
    # Get stored context value (or set if first visit)
    if 'context' not in request.session:
        request.session['context'] = None
    current_context = request.session['context']
    # Retrieve the context objects based on url
    url_data = parse_url(url_string, request, todo_states=todo_states)
    if url_data.get('context', False) != False: # `None` indicates context0
        if url_data.get('context') != current_context:
            # User is changing the context
            request.session['context'] = url_data.get('context')
            current_context = url_data.get('context')
    elif current_context:
        # Redirect to the url using the save context
        new_url = base_url + generate_url(
            parent=url_data.get('parent'),
            context=current_context
            )[1:] # Don't need leading '/'
        return redirect(new_url)
    # Filter by todo state (use of Q() objects means we only hit database once
    final_Q = Q()
    todo_states_query = url_data.get('todo_states', [])
    todo_string = ''
    for todo_state in todo_states_query:
        todo_string += '{0}/'.format(todo_state.abbreviation.lower())
        final_Q = final_Q | Q(todo_state=todo_state)
    scope_url_data['states'] = todo_string
    nodes = Node.objects.assigned(request.user).select_related(
        'context', 'todo_state', 'root'
    )
    nodes = nodes.filter(final_Q)
    root_nodes = Node.objects.mine(
        request.user, get_archived=True
    ).filter(level=0)
    # Now apply the context
    if current_context:
        scope_url_data['context'] = 'context{0}/'.format(
            current_context.pk
        )
    else:
        scope_url_data['context'] = ''
    try:
        nodes = current_context.apply(nodes)
    except AttributeError:
        pass
    # And filter by scope
    scope = url_data.get('scope', None)
    if scope:
        try:
            nodes = nodes.filter(scope=scope)
        except Node.ObjectDoesNotExist:
            pass
    # And filter by parent node
    parent = url_data.get('parent')
    if parent:
        nodes = nodes & parent.get_descendants(include_self=True)
        scope_url_data['parent'] = 'parent{0}/'.format(parent.pk)
        breadcrumb_list = parent.get_ancestors(include_self=True)
    else:
        scope_url_data['parent'] = ''
    # Put nodes with deadlines first
    nodes = order_nodes(nodes, field='deadline_date', context=current_context)
    # -------------------- Queryset evaluated -------------------- #
    # Prepare the URLs for use in the scope and parent links tabs
    scope_url = list_url.format(
        context = scope_url_data['context'],
        scope = '{scope}/',
        states = scope_url_data['states'],
        parent = scope_url_data['parent'],
    )
    if scope:
        scope_s = 'scope{0}/'.format(scope.pk)
    else:
        scope_s = ''
    parent_url = list_url.format(
        context = scope_url_data['context'],
        scope = scope_s,
        states = scope_url_data['states'],
        parent = 'parent{0}/'
    )
    # Add a field for the root node and deadline
    for node in nodes:
        # (uses lists in case of bad unit tests)
        root_node = [n for n in root_nodes if n.tree_id == node.tree_id]
        if len(root_node) > 0:
            node.root_url = parent_url.format(root_node[0].pk)
            node.root_title = root_node[0].title
        node.deadline_str = node.overdue('deadline_date')
    # And serve response
    return render_to_response('gtd/gtd_list.html',
                              locals(),
                              RequestContext(request))


def actions(request, context_id, context_slug):
    base_node_url = reverse('projects')
    template = 'gtd/node_list.html'
    return render_to_response(template,
                              locals(),
                              RequestContext(request))


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
        serializer = Serializer(nodes, request, many=is_many)
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
        parent_id = get_dict.get('parent_id', None)
        if parent_id == '0':
            nodes = nodes.filter(parent=None)
            get_dict.pop('parent_id')
        # Apply each criterion to the queryset
        for key in get_dict.keys():
            if key in BOOLS and get_dict[key] == 'false':
                query = {key: False}
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
        nodes = nodes.assigned(request.user).select_related(
            'context', 'todo_state', 'root'
        )
        # Filter by todo state
        final_Q = Q()
        todo_states_params = request.GET.getlist('todo_state')
        todo_string = ''
        for todo_state in todo_states_params:
            final_Q = final_Q | Q(todo_state=todo_state)
        nodes = nodes.filter(final_Q)
        # Filter by Scope
        scope = request.GET.get('scope', None)
        if scope:
            nodes = nodes.filter(scope=scope)
        # Filter by context
        context_id = request.GET.get('context', None)
        if context_id == '0':
            request.session['context_id'] = None
        elif context_id != 'None' and context_id is not None:
            context = Context.objects.get(id=context_id)
            nodes = context.apply(nodes)
            request.session['context_id'] = context_id
            request.session['context_name'] = context.name
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
        undone_Q = Q(todo_state__closed = False) | Q(todo_state = None)
        deadline = target_date + dt.timedelta(days=deadline_period)
        upcoming_deadline_Q = Q(deadline_date__lte = deadline) # TODO: fix this
        deadline_nodes = all_nodes_qs.filter(undone_Q, upcoming_deadline_Q)
        deadline_nodes = deadline_nodes.order_by("deadline_date")
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
        data = request.DATA.copy()
        if pk is not None:
            # Cannot POST if a node is specified by primary key
            return HttpResponseNotAllowed(['GET', 'PUT'])
        # Create new node
        self.node = Node()
        if not request.user.is_anonymous():
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
        serializer = NodeSerializer(self.node, request)
        data = serializer.data
        # Don't keep nodes sent via the public interface
        if request.user.is_anonymous():
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
        data = request.DATA.copy()
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
        if ((request.user.is_anonymous() and node.owner is not None) or
            (not request.user.is_anonymous() and access != 'write')):
            # Not authorized
            return HttpResponse(
                json.dumps({'status': 'failure',
                            'reason': 'unauthorized'}),
                status=401)
        # Update and return the Node
        node.set_fields(data)
        if not request.user.is_anonymous():
            node.save()
            node = Node.objects.get(pk=node.pk)
        serializer = NodeSerializer(node, request)
        return Response(serializer.data)


class ProjectView(DetailView):
    """Manages the retrieval of a tree view for the nodes"""
    model = Node
    template_name = 'gtd/node_view.html'
    context_object_name = 'parent_node'

    def get(self, request, *args, **kwargs):
        # First unpack arguments
        node_id = kwargs.get('pk')
        scope_id = 0
        show_all = request.GET.get('archived')
        slug = kwargs.get('slug')
        # Some setup work
        all_nodes_qs = Node.objects.mine(request.user, get_archived=show_all)
        all_todo_states_qs = TodoState.get_visible(user=request.user)
        child_nodes_qs = all_nodes_qs
        app_url = reverse('projects')
        scope_url = app_url + '{scope}/'
        scope = Scope.objects.get(pk=1)
        url_data = {}
        url_kwargs = {}
        # If the user asked for a specific node
        if node_id:
            scope_url += '{0}/'.format(node_id)
            child_nodes_qs = child_nodes_qs.filter(parent__id=node_id)
            parent_node = Node.objects.get(id=node_id)
            parent_json = serializers.serialize('json', [parent_node])
            parent_tags = parent_node.get_tags()
            breadcrumb_list = parent_node.get_ancestors(include_self=True)
            # Redirect in case of incorrect slug
            if slug != parent_node.slug:
                return redirect(
                    reverse(
                        'projects',
                        kwargs={'pk': str(parent_node.pk),
                                'slug': parent_node.slug}
                    )
                )
        else:
            child_nodes_qs = child_nodes_qs.filter(parent=None)
        # Filter by scope
        if scope_id:
            scope = get_object_or_404(Scope, pk=scope_id)
            url_data['scope'] = scope
            child_nodes_qs = child_nodes_qs.filter(scope=scope)
            url_kwargs['scope_id'] = scope_id
        base_url = reverse('projects', kwargs=url_kwargs)
        if node_id:
            url_kwargs['pk'] = parent_node.pk
            url_kwargs['slug'] = parent_node.slug
        node_url = reverse('projects', kwargs=url_kwargs)
        # Make sure user is authorized to see this node
        if node_id:
            if not (parent_node.access_level(request.user) in ['write', 'read']):
                new_url = reverse('django.contrib.auth.views.login')
                new_url += '?next=' + base_url + '/' + node_id + '/'
                return redirect(new_url)
        if node_id == None:
            node_id = 0
        all_todo_states_json = TodoState.as_json(all_todo_states_qs,
                                                 user=request.user)
        all_todo_states_json_full = TodoState.as_json(
            queryset=all_todo_states_qs,
            full=True,
            user=request.user
            )
        return render_to_response('gtd/node_view.html',
                                  locals(),
                                  RequestContext(request))

    def post(self, request, *args, **kwargs):
        post = request.POST
        url_kwargs = {}
        new = "No"
        node_id = kwargs['pk']
        try:
            self.node = Node.objects.mine(request.user,
                                  get_archived=True).get(pk=node_id)
        except Node.DoesNotExist:
            # If the node is not accessible return a 404
            raise Http404()
        scope_id = kwargs.get('scope_id')
        if scope_id:
            url_kwargs['scope_id'] = scope_id
        url_kwargs['slug'] = self.node.slug
        base_url = reverse('projects', kwargs=url_kwargs) + '/'
        breadcrumb_list = self.node.get_ancestors(include_self=True)
        # Make sure user is authorized to edit this node
        if self.node.access_level(request.user) != 'write':
            new_url = reverse('django.contrib.auth.views.login')
            new_url += '?next=' + base_url + node_id + '/'
            return redirect(new_url)
        if (request.method == "POST" and
              request.POST.get('function') == 'reorder'):
            # User is trying to move the node up or down
            if 'move_up' in request.POST:
                self.node.move_to(self.node.get_previous_sibling(),
                             position='left'
                             )
            elif 'move_down' in request.POST:
                self.node.move_to(self.node.get_next_sibling(),
                             position='right'
                             )
            else:
                return HttpResponseBadRequest('Missing request data')
            if self.node.parent:
                url_kwargs['pk'] = self.node.parent.pk
            redirect_url = reverse('projects', kwargs=url_kwargs)
            return redirect(redirect_url)
        elif (request.method == 'POST' and
              request.POST.get('function') == 'change_todo_state'):
            # User has asked to change TodoState
            new_todo_id = request.POST['new_todo']
            if new_todo_id == '0':
                self.node.todo_state = None
            else:
                self.node.todo_state = TodoState.objects.get(pk=new_todo_id)
            self.node.auto_update = True
            self.node.save()
            todo_state = self.node.todo_state
            url_kwargs['pk'] = self.node.pk
            redirect_url = reverse('projects', kwargs=url_kwargs)
            return redirect(redirect_url)
        elif request.method == "POST": # Form submission
            post = request.POST
            form = NodeForm(request.POST, instance=self.node)
            if form.is_valid():
                form.save()
                url_kwargs['pk'] = node_id
                redirect_url = reverse('projects', kwargs=url_kwargs)
                return redirect(redirect_url)
        else: # Blank form
            form = NodeForm(instance=self.node)
        return render_to_response('gtd/node_edit.html',
                                  locals(),
                                  RequestContext(request))


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


class ScopeView(APIView):
    """RESTful interaction with the gtd.Scope object"""
    def get(self, request, *args, **kwargs):
        scopes = Scope.get_visible(request.user)
        serializer = ScopeSerializer(scopes, many=True)
        return Response(serializer.data)


class ContextView(APIView):
    """RESTful interaction with the gtd.context object"""
    def get(self, request, *args, **kwargs):
        contexts = Context.get_visible(request.user)
        serializer = ContextSerializer(contexts, many=True)
        return Response(serializer.data)


@login_required
def get_descendants(request, ancestor_pk):
    """Looks up the descendants of the given parent. Optionally
    filtered by offset (eg offset of 1 is children (default), 2 is
    grandchildren, etc."""
    offset = request.GET.get('offset', 1)
    if int(ancestor_pk) > 0:
        parent = get_object_or_404(Node, pk=ancestor_pk)
        all_descendants = parent.get_descendants()
        level = parent.level + int(offset)
    elif int(ancestor_pk) == 0:
        parent = None
        all_descendants = Node.objects.all()
        level = int(offset)-1
    nodes_qs = all_descendants.filter(level=level)
    nodes_qs = nodes_qs & Node.objects.mine(request.user, get_archived=True)
    if request.is_ajax() or not settings.DEBUG_BAR:
        return HttpResponse(json.dumps(data))
    else:
        return render_to_response('base.html',
                                  locals(),
                                  RequestContext(request))


@login_required
def node_search(request):
    """Simple search module."""
    if request.GET.has_key('q'):
        query = request.GET['q']
        page = int(request.GET.get('page', 1))
        count = int(request.GET.get('count', 50))
        root_nodes = Node.objects.mine(
            request.user, get_archived=True
        ).filter(level=0)
        results = Node.search(
            query,
            request.user,
            page-1,
            count,
        )
        nodes_found = results[0]
        num_found = len(results[0])
        total_found = results[1]
        num_pages = int(math.ceil(total_found/float(count)))
        found_range = '{0}-{1}'.format(
            (page-1)*count + 1,
            (page-1)*count + num_found
        )
        # Figure out pagination details
        search_url = '{0}?q={1}&page={2}&count={3}'.format(
            reverse('gtd.views.node_search'),
            query,
            '{0}',
            count,
        )
        if num_pages > 1:
            pages = []
            if page != 1:
                prev = {'url': search_url.format(page-1),
                        'display': 'Prev',
                        'icon': 'arrow-l'}
                pages.append(prev)
            for x in range(num_pages):
                page_num = x+1
                new_page = {
                    'url': search_url.format(page_num),
                    'display': page_num
                }
                if page_num == page:
                    new_page['class'] = 'active'
                    del new_page['url']
                pages.append(new_page)
            if page != num_pages:
                nextt = {'url': search_url.format(page+1),
                         'display': 'Next',
                         'icon': 'arrow-r',
                         'iconpos': 'right'}
                pages.append(nextt)
        # Add a field for the root node
        for node in nodes_found:
            # (uses lists in case of bad unit tests)
            root_node = [n for n in root_nodes if n.tree_id == node.tree_id]
            if len(root_node) > 0:
                node.root_title = root_node[0].title
    else:
        query = ''
    base_url = reverse('projects')
    return render_to_response('gtd/node_search.html',
                              locals(),
                              RequestContext(request))
