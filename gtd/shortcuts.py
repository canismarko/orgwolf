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

import json
import re

from django.contrib.auth.models import AnonymousUser
from django.db import DatabaseError
from django.db.models.query import QuerySet
from django.shortcuts import get_object_or_404
from django.http import Http404

from gtd.models import TodoState, Context, Scope, Node, Tag, Priority

def get_todo_abbrevs(todo_state_list=None):
    """Return a list of the TODO State abbreviations corresponding
    to TodoState models. If a list of TodoState objects is passed,
    it will use that instead of retrieving a new list. This is recommended
    to avoid hitting the database unnecessarily."""
    abbreviation_list = []
    for todo_state in todo_state_list:
        abbreviation_list.append(todo_state.abbreviation)
    return abbreviation_list

def order_nodes(qs, **kwargs):
    """Accepts a queryset (nominally of Node objects) and
    sorts them by context and/or date. Similar to
    queryset.order_by() except more fine-grained.
    Accepts these argument and applies them in order:
    - context
    - field (datetime)
    """
    select = {}
    order_by = []
    # Sort by a supplied date field
    field = kwargs.get('field')
    if field:
        select['date_is_null'] = '{0} IS NULL'.format(field)
        order_by.append('date_is_null')
        order_by.append(field)
    # Sort by a supplied context
    context = kwargs.get('context')
    if context:
        locations = context.locations_available.all()
        for loc in locations:
            name = 'loc{0}'.format(loc.pk)
            select[name] = 'tag_string LIKE \':%%{0}%%:\''.format(loc.tag_string)
            order_by.append('-{0}'.format(name))
    # Actually apply the sorting criteria
    return qs.extra(
        select=select,
        order_by=order_by
        )

def parse_url(raw_url, request=None, todo_states=None):
    """Detects context, scope and parent information from the url that
    was requested. Returns the results as a dictionary.
    Note: this function will throw a 404 exception if any unprocessable bits are
    passed so it's important for the calling view to strip any parts that
    are specific to itself."""
    data = {}
    # Find parent node
    regex = re.compile('^/parent(\d+)')
    result = regex.match(raw_url)
    if result:
        data['parent'] = get_object_or_404(
            Node,
            pk=int(result.groups()[0])
            )
        raw_url = regex.sub('', raw_url)
    # Find any todo states
    if todo_states == None:
        todo_states = TodoState.get_visible(getattr(request, 'user', AnonymousUser()))
    todo_abbrevs = get_todo_abbrevs(todo_states)
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
            todo_states_query = todo_states_query | TodoState.objects.filter(
                abbreviation__iexact=result.groups()[0])
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
            if int(context_id) == 0:
                data['context'] = None
            else:
                data['context'] = get_object_or_404(Context, pk=context_id)
    return data


def generate_url(**kwargs):
    """Takes selection criteria and generates a url.
    todo: either a TodoState object or a QuerySet of
      TodoState objects."""
    new_url = '/'
    # Parent
    parent = kwargs.get('parent', None)
    if parent:
        new_url += 'parent{0}/'.format(parent.pk)
    # Handle todostates
    todo = kwargs.get('todo', None)
    if isinstance(todo, TodoState):
        new_url += '{0}/'.format(todo.abbreviation.lower())
    elif isinstance(todo, QuerySet):
        for state in todo:
            new_url += '{0}/'.format(state.abbreviation.lower())
    # Scope
    scope = kwargs.get('scope', None)
    if scope:
        new_url += 'scope{0}/'.format(scope.pk)
    # Context
    context = kwargs.get('context', None)
    if context:
        new_url += 'context{0}/'.format(context.pk)
    return new_url


def reset_env(commit=False):
    """Delete large portions of the database. Since this is irrevesible,
    it will not actually succeed unless commit is passed True.
    """
    if commit:
        try:
            TodoState.objects.all().delete()
        except DatabaseError:
            for state in TodoState.objects.all():
                state.delete()
        Context.objects.all().delete()
        Scope.objects.all().delete()
        Tag.objects.all().delete()
        Priority.objects.all().delete()
    else:
        print('Warning: this function irreversibly destoroys data,')
        print('pass commit=True if you are sure you want to continue.')


def load_fixture(f):
    """
    Load a list of Node objects from a json file (f). Requires that
    MPTT fields are set correctly in fixture.
    """
    TREE_FIELDS = ['tree_id', 'lft', 'rght', 'level']
    # Keep track of primary keys to build queryset later
    pk_list = []
    json_list = json.loads(f.read())
    def create_node(data, parent=None):
        """
        Recursive function for seting a Node and then processing its children.
        """
        node = Node(title=data['title'])
        node.save()
        node.set_fields(data)
        # Remove tree fields so they can be set by MPTT framework
        for field in TREE_FIELDS:
            setattr(node, field, None)
        node.parent = parent
        node.save()
        pk_list.append(node.pk)
        children = [x for x in json_list if (x['tree_id'] == data['tree_id'] and
                                             x['lft'] > data['lft'] and
                                             x['rght'] < data['rght'] and
                                             x['level'] == data['level']+1)]
        for child in children:
            create_node(child, node)
    # Remove non-Node objects
    json_list = [x for x in json_list if x['model'] == 'gtd.node']
    json_list = [x['fields'] for x in json_list]
    # Separate nodes into trees and process each one
    tree_ids = set([x['tree_id'] for x in json_list])
    for tree_id in tree_ids:
        root = [x for x in json_list if (x['level'] == 0 and
                                         x['tree_id'] == tree_id)]
        assert len(root) == 1, 'Duplicate tree roots found'
        create_node(root[0])
            # # Remove problematic fields
            # for field in EXCLUDE:
            #     json_data['fields'].pop(field)
            # node = Node(title=json_data['fields'].pop('title'))
            # node.save()
            # node.set_fields(json_data['fields'])
            # pk_list.append(node.pk)
    qs = Node.objects.filter(pk__in=pk_list)
    return qs
