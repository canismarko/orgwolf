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

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.http import Http404
import re

from gtd.models import TodoState, Context, Scope, Node

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

def order_by_date(qs, field):
    """Accepts a queryset (nominally of Node objects) and
    sorts them by date. Similar to queryset.order_by('data')
    except more fine-grained."""
    return qs.extra(
        select={
            'date_is_null': '{0} IS NULL'.format(field),
            },
        order_by=['date_is_null', field]
        )
                    

def parse_url(raw_url):
    """Detects context and scope information from the url that was requested.
    Returns the results as a dictionary.
    Note: this function will throw a 404 exception if any unprocessable bits are
    passed so it's important for the calling view to strip any parts that
    are specific to itself."""
    data = {}
    # Find any todo states
    todo_abbrevs = get_todo_abbrevs(get_todo_states())
    todo_states_query = TodoState.objects.none()
    seperator = ''
    RE = '^/('
    for abbrev in todo_abbrevs:
        RE += seperator + abbrev
        seperator = '|'
    RE += ')'
    regex = re.compile(RE, re.IGNORECASE)
    states_found = False
    while True:
        # Process any todo states at the front of the url
        result = regex.search(raw_url)
        if result:
            states_found = True
            todo_states_query = todo_states_query | TodoState.objects.filter(abbreviation__iexact=result.groups()[0])
            raw_url = raw_url.replace('/' + result.groups()[0], '')
        else:
            break
    if states_found:
        data['todo_states'] = todo_states_query
    # Now process scope and context
    RE = '(?:/scope(\d+))?(?:/context(\d+))?/?'
    regex = re.compile(RE, re.IGNORECASE)
    # First check if there are any unmatched parts (-> 404)
    if regex.sub('', raw_url):
        raise Http404
    # Now find and return the matched portions
    result = regex.search(raw_url)
    if result:
        if result.groups()[0]:
            # Scope processing
            scope_id = result.groups()[0]
            data['scope'] = get_object_or_404(Scope, pk=scope_id)
        if result.groups()[1]:
            # Context found
            context_id = result.groups()[1]
            data['context'] = get_object_or_404(Context, pk=context_id)
    return data

@transaction.commit_on_success
def reset_order(parent=None, recursive=False, step=Node.ORDER_STEP):
    """Processes all nodes of given parent in their natural ordering and
    sets all the orders to be in appropriate increments and enforcing the
    uniqueness contraint.
    Warning: with recursive=True, this function hits the database a lot 
    and should probably not be used by views or models unless absolutely
    necessary."""
    def reset_children(parent):
        cur_order = 0
        children = Node.objects.filter(parent=parent)
        for child in children:
            cur_order += step
            child.order = cur_order
            child.save()
            if recursive:
                reset_children(child)
    reset_children(parent)
