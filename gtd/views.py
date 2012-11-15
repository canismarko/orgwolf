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

from __future__ import unicode_literals
from django.shortcuts import render_to_response, redirect, get_object_or_404
from django.template import RequestContext
from django.contrib.auth.decorators import login_required
from django.http import Http404, HttpResponseRedirect
from django.db.models import Q
from django.utils.timezone import get_current_timezone
import re
import datetime

from gtd.models import TodoState, Node, Context, Scope, Text
from wolfmail.models import MailItem, Label
from gtd.forms import NodeForm
from orgwolf.models import OrgWolfUser as User

def get_todo_states():
    """Return a list of the "in-play" Todo states."""
    # TODO: be more selective about returning todo_states
    todo_states = TodoState.objects.all()
    return todo_states

def get_todo_abbrevs(todo_state_list=None):
    """Return a list of the TODO State abbreviations corresponding to TodoState models. If a list of TodoState objects is passed, it will use that instead of retrieving a new list. This is recommended to avoid hitting the database unnecessarily."""
    if not todo_state_list:
        todo_state_list = get_todo_states()
    abbreviation_list = []
    for todo_state in todo_state_list:
        abbreviation_list.append(todo_state.abbreviation)
    return abbreviation_list

def home(request):
    pass # Todo GTD/home view

@login_required
def list_display(request, url_string=""):
    """Determines which list the user has requested and fetches it."""
    all_todo_states_query = TodoState.objects.all() # TODO: switch to userprofile
    all_contexts = Context.objects.all() # TODO: switch to userprofile
    all_scope_qs = Scope.objects.all()
    scope = None
    todo_states_query = TodoState.objects.none()
    todo_abbrevs = get_todo_abbrevs(get_todo_states())
    todo_abbrevs_lc = []
    if url_string == None:
        url_string = ""
    for todo_abbrev in todo_abbrevs:
        todo_abbrevs_lc.append(todo_abbrev.lower())
    # Check for changes to the TODO and context filters
    if request.method == "POST": 
        todo_regex = re.compile(r'todo(\d+)')
        new_context_id = 0
        todo_state_Q = Q()
        empty_Q = True
        # Check for TODO filters
        for post_item in request.POST:
            todo_match = todo_regex.match(post_item)
            if todo_match:
                todo_state_Q = todo_state_Q | Q(id=todo_match.groups()[0])
                empty_Q = False
            if post_item == 'context':
                new_context_id = int(request.POST['context'])
            elif post_item == 'scope':
                new_scope_id = int(request.POST['scope'])
        # Now build the new URL and redirect
        new_url = u'/gtd/lists/'
        if empty_Q:
            matched_todo_states = TodoState.objects.none()
        else:
            matched_todo_states = TodoState.objects.filter(todo_state_Q)
        for todo_state in matched_todo_states:
            new_url += todo_state.abbreviation.lower() + '/'
        if new_scope_id > 0:
            new_url += 'scope' + str(new_scope_id) + '/'
        if new_context_id > 0:
            new_url += 'context' + str(new_context_id) + '/'
        return redirect(new_url)
    nodes = Node.objects.none()
    current_context = None
    # Build regular expression to decide what's a valid URL string
    seperator = ""
    regex_string = "("
    for abbrev in todo_abbrevs:
        regex_string += seperator + abbrev
        seperator = "|"
    # (Add more URL regex pieces here)
    regex_string += seperator + "context"
    regex_string += seperator + "scope)(\d*)"
    regex = re.compile(regex_string, re.IGNORECASE)
    regex_results = regex.findall(url_string)
    for result in regex_results:
        if result[0].lower() == "context": # URL asked for a context
            try:
                current_context = Context.objects.get(id=result[1])
            except Context.DoesNotExist:
                pass
        if result[0].lower() == "scope": # URL asked for a context
            try:
                scope = Scope.objects.get(id=result[1])
            except Context.DoesNotExist:
                pass
        elif result[0].lower() in todo_abbrevs_lc: # It's a TodoState
            todo_states_query = todo_states_query | TodoState.objects.filter(abbreviation__iexact=result[0])
        # (Add more URL handling here)
    # Filter by todo state (use of Q() objects means we only hit database once
    final_Q = Q()
    for todo_state in todo_states_query:
        final_Q = final_Q | Q(todo_state=todo_state)
    nodes = Node.objects.filter(final_Q)
    # Now apply the context
    try:
        nodes = current_context.apply(nodes)
    except AttributeError:
        pass
    # And filter by scope
    if scope:
        try:
            nodes = nodes.filter(scope=scope)
        except Node.ObjectDoesNotExist:
            pass
    return render_to_response('gtd_list.html',
                              locals(),
                              RequestContext(request))        

@login_required
def agenda_display(request, date=None):
    format_string = "%Y-%m-%d"
    if request.method == "POST":
        # Check and process the new date
        try:
            datetime.datetime.strptime(request.POST['date'], format_string)
        except ValueError:
            pass
        else:
            new_url = "/gtd/agenda/" + request.POST['date']
            return redirect(new_url)
    deadline_period = 7 # In days # TODO: pull deadline period from user
    all_nodes_qs = Node.objects.all()
    final_Q = Q()
    if date:
        try:
            agenda_date = datetime.datetime.strptime(date, format_string).date()
        except ValueError:
            raise Http404
    else:
        agenda_date = datetime.date.today()
    agenda_dt = datetime.datetime(year=agenda_date.year, month=agenda_date.month, day=agenda_date.day, hour=23, minute=59, second=59)
    # Determine query filters for "Today" section
    date_Q = Q(scheduled__lte=agenda_dt)
    time_specific_Q = Q(scheduled_time_specific=False)
    # TODO: allow user to set todo states
    hard_Q = Q(todo_state = TodoState.objects.get(abbreviation="HARD"))
    next_Q = Q(todo_state = TodoState.objects.get(abbreviation="NEXT")) # Deprecated: not used anymore
    dfrd_Q = Q(todo_state = TodoState.objects.get(abbreviation="DFRD"))
    day_specific_nodes = all_nodes_qs.filter((hard_Q | dfrd_Q), date_Q, time_specific_Q)
    day_specific_nodes = day_specific_nodes.order_by('scheduled')
    time_specific_Q = Q(scheduled_time_specific=True)
    time_specific_nodes = all_nodes_qs.filter((hard_Q | dfrd_Q), date_Q, time_specific_Q)
    time_specific_nodes = time_specific_nodes.order_by('scheduled')
    # Determine query filters for "Upcoming Deadlines" section
    undone_Q = Q(todo_state__closed = False)
    deadline = agenda_dt + datetime.timedelta(days=deadline_period)
    upcoming_deadline_Q = Q(deadline__lte = deadline) # TODO: fix this
    deadline_nodes = all_nodes_qs.filter(undone_Q, upcoming_deadline_Q)
    deadline_nodes = deadline_nodes.order_by("deadline")
    # Force database hits and then process results into list of dictionaries
    day_specific_nodes_qs = list(day_specific_nodes)
    day_specific_nodes = []
    time_specific_nodes_qs = list(time_specific_nodes)
    time_specific_nodes = []
    deadline_nodes_qs = list(deadline_nodes)
    deadline_nodes = []
    for node in day_specific_nodes_qs:
        new_dict = {}
        new_dict['overdue'] = node.overdue(node.scheduled, agenda_dt)
        new_dict['id'] = node.id
        new_dict['abbreviation'] = node.todo_state.abbreviation
        new_dict['title'] = node.title
        day_specific_nodes.append(new_dict)
    for node in time_specific_nodes_qs:
        new_dict = {}
        new_dict['overdue'] = node.overdue(node.scheduled, agenda_dt)
        new_dict['id'] = node.id
        new_dict['scheduled'] = node.scheduled
        new_dict['abbreviation'] = node.todo_state.abbreviation
        new_dict['title'] = node.title
        time_specific_nodes.append(new_dict)
    for node in deadline_nodes_qs:
        new_dict = {}
        new_dict['overdue'] = node.overdue(node.deadline, agenda_dt, future=True)
        new_dict['id'] = node.id
        new_dict['deadline'] = node.deadline
        new_dict['deadline_time_specific'] = node.deadline_time_specific
        new_dict['title'] = node.title
        deadline_nodes.append(new_dict)
    # Todo: automagically detect base_url
    base_url = '/gtd/nodes/'
    return render_to_response('agenda.html',
                              locals(),
                              RequestContext(request))

@login_required
def capture_to_inbox(request):
    """Processes the "capture widget" that appears on each page.
    Basically, this view adds the item as a MailTime with the Inbox label."""
    previous_url = request.GET.get('next', '/')
    if request.method == 'POST':
        if request.POST['new_inbox_item'] != "":
            new_item = MailItem()
            new_item.sender = "Captured"
            new_item.recipient
            new_item.owner = request.user
            new_item.subject = request.POST['new_inbox_item']
            new_item.rcvd_date = datetime.datetime.now()
            new_item.full_clean()
            new_item.save()
            new_item.labels.add(Label.objects.get(name="Inbox"))
    # TODO: automatically redirect using django.messaging
    return render_to_response('capture_success.html',
                              locals(),
                              RequestContext(request))

@login_required
def display_node(request, node_id=None, scope_id=None):
    """Displays a node as a list of links to its children.
    If no node_id is specified, shows the projects list."""
    base_url = '/gtd/nodes/' # Todo: automagically detect this
    if request.method == "POST":
        if request.POST['function'] == 'filter':
            # User has asked to filter
            redirect_string = base_url
            if int(request.POST['scope']) > 0:
                redirect_string += "scope" + request.POST['scope'] + "/"
            if request.POST['node_id']:
                redirect_string += request.POST['node_id'] + "/"
            return redirect(redirect_string)
        if request.POST['function'] == 'change_todo_state':
            # User has asked to change TodoState
            node = Node.objects.get(pk=node_id)
            node.todo_state = TodoState.objects.get(pk=request.POST['new_todo'])
            node.save()
    all_nodes_qs = Node.objects.all()
    all_todo_states_qs = TodoState.get_active()
    child_nodes_qs = all_nodes_qs
    all_text_qs = Text.objects.all()
    all_scope_qs = Scope.objects.all()
    # If the user asked for a specific node
    if node_id:
        node_text_qs = all_text_qs.filter(parent__id=node_id)
        child_nodes_qs = child_nodes_qs.filter(parent__id=node_id)
        parent_node = all_nodes_qs.get(id=node_id)
        parent_tags = parent_node.get_tags()
        breadcrumb_list = parent_node.get_hierarchy()
    else:
        child_nodes_qs = child_nodes_qs.filter(parent=None)
        node_text_qs = all_text_qs.filter(parent=None)
    base_url = '/gtd/nodes/' # Todo: automagically detect this
    # Filter by scope
    if scope_id:
        scope = get_object_or_404(Scope, pk=scope_id)
        child_nodes_qs = child_nodes_qs.filter(scope=scope)
        base_url += 'scope' + str(scope.id) + '/'
    return render_to_response('project_view.html',
                              locals(),
                              RequestContext(request))

@login_required
def edit_node(request, node_id):
    """Display a form to allow the user to edit a node"""
    base_url = '/gtd/nodes/' # Todo: automagically detect this
    node = Node.objects.get(id=node_id)
    breadcrumb_list = node.get_hierarchy()
    if request.method == "POST": # Form submission
        form = NodeForm(request.POST, instance=node)
        if form.is_valid():
            form.save()
            redirect_url= base_url + node_id + '/'
            return redirect(redirect_url)
    else: # Blank form
        form = NodeForm(instance=node)
    return render_to_response('node_edit.html',
                              locals(),
                              RequestContext(request))

@login_required
def new_node(request, node_id):
    """Display a form to allow the user to edit a node"""
    base_url = '/gtd/nodes/' # Todo: automagically detect this
    new = "Yes" # Used in template logic
    node = None
    if node_id:
        node = Node.objects.get(id=node_id)
        breadcrumb_list = node.get_hierarchy()
    if request.method == "POST": # Form submission
        form = NodeForm(request.POST, parent=node)
        if form.is_valid():
            form = form.save(commit=False)
            form.owner = request.user
            siblings = Node.objects.filter(parent__id=node_id)
            if len(siblings) > 0:
                form.order = siblings.reverse()[0].order + Node.ORDER_STEP
            else:
                form.order = 0
            if node:
                form.parent = Node.objects.get(id=node.id)
            form.save()
            redirect_url = base_url + str(form.id) + "/"
            return redirect(redirect_url)
    else: # Blank form
        initial_dict = {}
        projects = getattr(node, 'related_projects', None)
        form = NodeForm(parent=node)
    return render_to_response('node_edit.html',
                              locals(),
                              RequestContext(request))
