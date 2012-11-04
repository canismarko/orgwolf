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
from django.http import Http404, HttpResponseRedirect
from django.db.models import Q
import re
import datetime

from GettingThingsDone.models import TodoState, Node, Context
from wolfmail.models import MailItem, Label

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

def list_selection(request):
    pass # Todo list_selection view

def list_display(request, url_string=""):
    """Determines which list the user has requested and fetches it."""
    all_todo_states_query = TodoState.objects.all() # TODO: switch to userprofile
    all_contexts = Context.objects.all() # TODO: switch to userprofile
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
            if post_item == u'context':
                new_context_id = request.POST['context']
        # Now build the new URL and redirect
        new_url = u'/gtd/lists/'
        if empty_Q:
            matched_todo_states = TodoState.objects.none()
        else:
            matched_todo_states = TodoState.objects.filter(todo_state_Q)
        for todo_state in matched_todo_states:
            new_url += todo_state.abbreviation.lower() + u'/'
        if int(new_context_id) > 0:
            new_url += u'context' + new_context_id + u'/'
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
    regex_string += seperator + "context)(\d*)"
    regex = re.compile(regex_string, re.IGNORECASE)
    regex_results = regex.findall(url_string)
    for result in regex_results:
        if result[0].lower() == "context": # URL asked for a context
            try:
                current_context = Context.objects.get(id=result[1])
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
   
    return render_to_response('gtd_list.html',
                              locals(),
                              RequestContext(request))        

def agenda_selection(request):
    pass # Todo agenda_selection view

def agenda_display(request, which_agenda=None):
    deadline_period = 7 # In days # TODO: pull deadline period from user
    all_nodes_qs = Node.objects.all()
    final_Q = Q()
    now = datetime.datetime.now()
    today = datetime.datetime(year=now.year, month=now.month, day=now.day, hour=23, minute=59, second=59)
    # Determine query filters for "Today" section
    date_Q = Q(scheduled__lte=today)
    time_specific_Q = Q(scheduled_time_specific=False)
    # TODO: allow user to set todo states
    hard_Q = Q(todo_state = TodoState.objects.get(abbreviation="HARD"))
    next_Q = Q(todo_state = TodoState.objects.get(abbreviation="NEXT"))
    dfrd_Q = Q(todo_state = TodoState.objects.get(abbreviation="DFRD"))
    day_specific_nodes = all_nodes_qs.filter((hard_Q | next_Q | dfrd_Q), date_Q, time_specific_Q)
    day_specific_nodes = day_specific_nodes.order_by('scheduled')
    time_specific_Q = Q(scheduled_time_specific=True)
    time_specific_nodes = all_nodes_qs.filter((hard_Q | next_Q), date_Q, time_specific_Q)
    time_specific_nodes = time_specific_nodes.order_by('scheduled')
    # Determine query filters for "Upcoming Deadlines" section
    undone_Q = Q(todo_state__done = False)
    deadline = today + datetime.timedelta(days=deadline_period)
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
        new_dict['overdue'] = node.overdue(node.scheduled)
        new_dict['id'] = node.id
        new_dict['abbreviation'] = node.todo_state.abbreviation
        new_dict['title'] = node.title
        day_specific_nodes.append(new_dict)
    for node in time_specific_nodes_qs:
        new_dict = {}
        new_dict['overdue'] = node.overdue(node.scheduled)
        new_dict['id'] = node.id
        new_dict['scheduled'] = node.scheduled
        new_dict['abbreviation'] = node.todo_state.abbreviation
        new_dict['title'] = node.title
        time_specific_nodes.append(new_dict)
    for node in deadline_nodes_qs:
        new_dict = {}
        new_dict['overdue'] = node.overdue(node.deadline, future=True)
        new_dict['id'] = node.id
        new_dict['deadline'] = node.deadline
        new_dict['deadline_time_specific'] = node.deadline_time_specific
        new_dict['title'] = node.title
        deadline_nodes.append(new_dict)
    return render_to_response('agenda.html',
                              locals(),
                              RequestContext(request))

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
