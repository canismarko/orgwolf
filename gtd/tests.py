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
"""
This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""

from __future__ import unicode_literals
import datetime as dt
from django.test import TestCase
from django.test.client import Client, RequestFactory
from django.db.models import Q
from django.contrib.auth.models import AnonymousUser
from django.http import Http404
from django.utils.timezone import get_current_timezone
import re
import json

from orgwolf.preparation import translate_old_text
from orgwolf.models import OrgWolfUser as User
from gtd.forms import NodeForm
from gtd.models import Node, TodoState, node_repeat, Location, Tool, Context, Scope
from gtd.shortcuts import parse_url, get_todo_states, get_todo_abbrevs
from gtd.templatetags.gtd_extras import overdue, upcoming, markdown_text

class EditNode(TestCase):
    fixtures = ['test-users.yaml', 'gtd-test.yaml', 'gtd-env.yaml']
    def setUp(self):
        self.assertTrue(
            self.client.login(username='test', password='secret')
            )
    def close_node_through_client(self, client, node=None):
        """
        Helper function that uses the client to edit a node
        and set it to a closed state. If the optional /node/
        argument is passed then that node is edited, otherwise
        a new node is created.
        """
        closed_todo = TodoState.objects.get(abbreviation='DONE')
        self.assertTrue(closed_todo.closed)
        post_data = {'scheduled': '',
                     'priority': '',
                     'deadline': '',
                     'todo_state': closed_todo.id}

        if node: # existing node
            url = '/gtd/nodes/' + str(node.id) + '/edit/'
            regex = re.compile('http://testserver/gtd/nodes/' + str(node.id))
            post_data['title'] = node.title
        else: # new node
            url = '/gtd/nodes/5/new/'
            regex = re.compile('http://testserver/gtd/nodes/5/')
            post_data['title'] = 'new node 1'
        response = client.post(url, post_data, follow=True)
        self.assertEqual(200, response.status_code)
        redirect = re.match('http://testserver/gtd/nodes/(\d+)/',
                            response.redirect_chain[0][0])
        self.assertTrue(redirect.group()) # Did the redirect match
        self.assertEqual(302, response.redirect_chain[0][1])
        return redirect.groups()[0]

    def test_close_timestamp(self):
        """
        Test that the "closed" timestamp is set automatically."
        """
        now = dt.datetime.utcnow()
        client = Client()
        # Login
        self.assertTrue(
            client.login(username='test', password='secret')
            )
        node = Node.objects.get(title='Buy cat food')
        # Make sure it's not closed first
        self.assertFalse(node.is_closed())
        # Edit the node through the client
        self.close_node_through_client(client, node)
        # Refresh the node
        new_node = Node.objects.get(title='Buy cat food')
        # Make sure the node is closed
        self.assertTrue(new_node.is_closed())
        self.assertEqual(now.date(), new_node.closed.date())

        # Same thing if it has no initial todostate
        node = Node.objects.get(title='Buy cat food')
        node.todo_state = None
        node.save()
        self.assertEqual(None, node.todo_state)
        # Now run the request
        self.close_node_through_client(client, node)
        # Refresh the node
        new_node = Node.objects.get(title='Buy cat food')
        # Make sure the node is closed
        self.assertTrue(new_node.is_closed())
        self.assertEqual(now.date(), new_node.closed.date())

        # Test that closed is set for new nodes
        new_node_id = self.close_node_through_client(client)
        new_node = Node.objects.get(id=new_node_id)
        # Make sure the node is closed
        self.assertTrue(new_node.is_closed())
        self.assertEqual(now.date(), new_node.closed.date())

    def test_set_todo_state(self):
        node = Node.objects.get(title='Buy cat food')
        todo_state = TodoState.objects.get(id=2)
        node.todo_state = todo_state
        node.save()
        self.assertEqual(todo_state, node.todo_state)
    
    def test_edit_by_json(self):
        # Login
        self.assertTrue(
            self.client.login(username='test', password='secret')
            )
        node = Node.objects.get(title='Buy cat food')
        actionable = TodoState.objects.get(abbreviation='ACTN')
        closed = TodoState.objects.get(abbreviation='DONE')
        self.assertEqual(
            actionable,
            node.todo_state,
            'Node does not start out actionable'
            )
        # Execute edit via AJAX
        url = '/gtd/nodes/' + str(node.pk) + '/edit/'
        data = {
            'format': 'json',
            'todo_id': closed.pk,
            }
        response = self.client.get(url, data)
        self.assertEqual(
            200,
            response.status_code,
            'getJSON call did not return HTTP 200'
            )
        jresponse = json.loads(response.content)
        # Check response object
        self.assertEqual(
            5,
            jresponse['node_id'],
            'JSON edit does not return correct node_id'
            )
        self.assertEqual(
            'success',
            jresponse['status'],
            'JSON edit does not return success status: ' + jresponse['status']
            )
        self.assertEqual(
            closed.pk,
            jresponse['todo_id'],
            'JSON edit does not return new todo_state.pk: ' + str(closed.pk) + '/' + str(jresponse['todo_id'])
            )
        # Make sure the node has been updated
        node = Node.objects.get(title='Buy cat food')
        self.assertEqual(
            closed,
            node.todo_state,
            'node.todo_state not set properly'
            )
        # Check about setting to no node
        data = {
            'format': 'json',
            'todo_id': 0,
            }
        response = self.client.get(url, data)
        self.assertEqual(
            200,
            response.status_code,
            'getJSON call did not return HTTP 200: ' + str(response.status_code)
            )
        # jresponse = json.loads(response.content)
        node = Node.objects.get(title='Buy cat food')        
        self.assertEqual(
            None,
            node.todo_state,
            'node.todo_state not unset when todo_id: 0 passed to edit node'
            )

class NodeMutators(TestCase):
    fixtures = ['test-users.yaml', 'gtd-env.yaml', 'gtd-test.yaml']
    def test_get_level(self):
        f = Node.get_level
        node = Node.objects.get(pk=1)
        self.assertEqual(
            f(node).__class__.__name__,
            'int'
            )
        self.assertEqual(
            f(node),
            1
            )
        self.assertEqual(
            f(Node.objects.get(pk=2)),
            2
            )
        self.assertEqual(
            f(Node.objects.get(pk=4)),
            3
            )

class RepeatingNodeTest(TestCase):
    fixtures = ['test-users.yaml', 'gtd-test.yaml', 'gtd-env.yaml']
    def test_scheduled_repetition(self):
        """Make sure the item is rescheduled properly."""
        node = Node.objects.get(title='Buy cat food')
        closed = TodoState.objects.get(abbreviation='DONE')
        actionable = TodoState.objects.get(abbreviation='ACTN')
        self.assertTrue(node.repeats)
        # Close the node
        node.todo_state = closed
        node.auto_repeat = True
        node.save()
        node = Node.objects.get(title='Buy cat food')
        # The state shouldn't actually change since it's repeating
        self.assertEqual(actionable, node.todo_state)
        new_date = dt.datetime(2013, 1, 3, tzinfo=get_current_timezone())
        self.assertEqual(new_date.date(), node.scheduled.date())
    def test_all_repeat_units(self):
        """Make sure day, week, month and year repeating units work"""
        node = Node.objects.get(title='Buy cat food')
        closed = TodoState.objects.get(abbreviation='DONE')
        old_date = dt.datetime(2012, 12, 31, tzinfo=get_current_timezone())
        # Test 'd' for day
        node.repeating_unit='d'
        node.scheduled = old_date
        node.save()
        node.todo_state=closed
        node.auto_repeat = True
        node.save()
        self.assertFalse(node.is_closed())
        new_date = dt.datetime(2013, 1, 3, tzinfo=get_current_timezone())
        self.assertEqual(new_date.date(), node.scheduled.date())
        # Test 'w' for week
        node.repeating_unit='w'
        node.scheduled = old_date
        node.save()
        node.todo_state=closed
        node.save()
        self.assertFalse(node.is_closed())
        new_date = dt.datetime(2013, 1, 21, tzinfo=get_current_timezone())
        self.assertEqual(new_date.date(), node.scheduled.date())
        # Test 'm' for month
        node.repeating_unit='m'
        node.scheduled = old_date
        node.save()
        node.todo_state=closed
        node.save()
        self.assertFalse(node.is_closed())
        new_date = dt.datetime(2013, 3, 31, tzinfo=get_current_timezone())
        self.assertEqual(new_date.date(), node.scheduled.date())
        # Test 'y' for year
        node.repeating_unit='y'
        node.scheduled = old_date
        node.save()
        node.todo_state=closed
        node.save()
        self.assertFalse(node.is_closed())
        new_date = dt.datetime(2015, 12, 31, tzinfo=get_current_timezone())
        self.assertEqual(new_date.date(), node.scheduled.date())
    def test_31st_bug(self):
        """Test for proper behavior if trying to set a month that
        doesn't have a 31st day."""
        node = Node.objects.get(title='Buy cat food')
        closed = TodoState.objects.get(abbreviation='DONE')
        node.repeating_unit = 'm'
        node.repeating_number = 1
        old_date = dt.datetime(2013, 8, 31, tzinfo=get_current_timezone())
        node.scheduled = old_date
        node.save()
        node.todo_state=closed
        node.auto_repeat = True
        node.save()
        self.assertFalse(node.is_closed())
        new_date = dt.datetime(2013, 9, 30, tzinfo=get_current_timezone())
        self.assertEqual(new_date.date(), node.scheduled.date())
        # Now try for February type bugs
        old_date = dt.datetime(2013, 1, 28, tzinfo=get_current_timezone())
        node.scheduled = old_date
        node.repeating_number = 2
        node.save()
        node.todo_state = closed
        node.save()
        self.assertFalse(node.is_closed())
        new_date = dt.datetime(2013, 3, 28, tzinfo=get_current_timezone())
        self.assertEqual(new_date.date(), node.scheduled.date())
    def test_month_bug(self):
        """Test for a bug that imporperly increments months and years if original_month + repeating_unit equals 12 and if repeating_unit = month"""
        node = Node.objects.get(title='Buy cat food')
        closed = TodoState.objects.get(abbreviation='DONE')
        node.scheduled = dt.datetime(2012, 11, 25, 0, 0, tzinfo=get_current_timezone())
        node.repeating_unit = 'm'
        node.repeating_number = 1
        node.repeats_from_completion = False
        node.save()
        self.assertTrue(node.todo_state.actionable)
        node.todo_state = closed
        node.auto_repeat = True
        node.save()
        self.assertEqual(dt.datetime(2012, 12, 25, 0, 0, tzinfo=get_current_timezone()),
                         node.scheduled)

class ParentStructure(TestCase):
    fixtures = ['test-users.yaml', 'gtd-test.yaml', 'gtd-env.yaml']
    def test_primary_parent(self):
        target_parent = Node.objects.get(title='Errands')
        child = Node.objects.get(title='Meijer')
        parent = child.get_primary_parent()
        self.assertEqual(target_parent, parent)
        child = Node.objects.get(title='Meijer')
        parent = child.get_primary_parent()
        self.assertEqual(target_parent, parent)

class ContextFiltering(TestCase):
    fixtures = ['test-users.yaml', 'gtd-test.yaml', 'gtd-env.yaml']
    def setUp(self):
        self.assertTrue(
            self.client.login(username='test', password='secret')
            )
    def test_context0(self):
        """Confirm that trying to set context0 returns a 404"""
        response = self.client.get('/gtd/lists/context0/')
        self.assertEqual(response.status_code, 404)
    def test_home_tag(self):
        all_nodes_qs = Node.objects.filter(Q(tag_string=':work:')|Q(tag_string=':home:'))
        work = Context.objects.get(name='Work')
        home = Context.objects.get(name='Home')
        self.assertEqual(
            list(Node.objects.filter(title='Work Node')),
            list(work.apply(all_nodes_qs))
            )
        self.assertEqual(
            list(Node.objects.filter(title='Home Node')),
            list(home.apply(all_nodes_qs))
            )
    def test_context_session_variables(self):
        """Test if the active GTD context is saved and stored properly in session variables"""
        response = self.client.get('/gtd/lists/');
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.client.session['context'],
            None)
        response = self.client.get('/gtd/lists/context1/');
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.client.session['context'],
            Context.objects.get(name = 'Work')
            )
        # Test clearing the context by using the POST filter
        response = self.client.post('/gtd/lists/context1/', {'context': '0',
                                                             'scope': '0',
                                                             })
        self.assertRedirects(response, '/gtd/lists/')
        self.assertEqual(
            self.client.session['context'],
            None)

class TodoShortcuts(TestCase):
    fixtures = ['test-users.yaml', 'gtd-test.yaml', 'gtd-env.yaml']
    def test_gets_states(self):
        self.assertEqual(
            list(TodoState.objects.all()),
            list(get_todo_states()),
            )

class UrlParse(TestCase):
    """Tests for the gtd url_parser that extracts context and scope information
    from the URL string and returns it as a useful dictionary."""
    fixtures = ['test-users.yaml', 'gtd-test.yaml', 'gtd-env.yaml']
    def setUp(self):
        pass
    def test_function_exists(self):
        self.assertEqual(parse_url.__class__.__name__, 'function')
        return_value = parse_url('')
        self.assertEqual(return_value.__class__.__name__, 'dict')
    def test_processes_context(self):
        context2 = Context.objects.get(pk=2)
        # Successfully finds an existing context
        self.assertEqual(context2, parse_url('/context2/')['context'])
        # Non-existent context raises 404
        self.assertRaises(
            Http404,
            parse_url,
            '/context99/'
            )
        # Finds a context if mixed in with scope
        self.assertEqual(context2, parse_url('/scope1/context2/')['context'])
    def test_processes_scope(self):
        scope1 = Scope.objects.get(pk=1)
        # Successfully finds an existing scope
        self.assertEqual(scope1, parse_url('/scope1/')['scope'])
        # Non-existent scope raises 404
        self.assertRaises(
            Http404,
            parse_url,
            '/scope99/'
            )
        # Finds a context if mixed in with scope
        self.assertEqual(scope1, parse_url('/scope1/context1/')['scope'])
    def test_processes_states(self):
        hard = TodoState.objects.get(pk=8)
        self.assertEqual(
            hard,
            parse_url('/hard/next/')['todo_states'][0]
            )
        self.assertEqual(
            hard,
            parse_url('/hard/scope1/context1/')['todo_states'][0]
            )
    def test_bad_urls(self):
        """Tests to make sure that the system properly raises
        404 errors when bad urls are passed"""
        bad_urls = ['/junk/',
                    '/junk/scope1/',
                    '/scope1/junk/',
                    ]
        for url in bad_urls:
            self.assertRaises(
                Http404,
                parse_url,
                url)

class OverdueFilter(TestCase):
    """Tests the `overdue` template filter that makes deadlines into
    prettier "in 1 day" strings, etc."""
    def test_filter_exists(self):
        self.assertEqual(overdue.__class__.__name__, 'function')
        self.assertEqual(overdue(dt.datetime.now()).__class__.__name__, 'SafeBytes')
    def test_simple_dt(self):
        yesterday = dt.datetime.now() + dt.timedelta(-1)
        self.assertEqual(overdue(yesterday, future=True), '1 day ago')
        yesterday = yesterday + dt.timedelta(-1)
        self.assertEqual(overdue(yesterday, future=True), '2 days ago')
    def test_future_dt(self):
        tomorrow = dt.datetime.now() + dt.timedelta(1)
        self.assertEqual(overdue(tomorrow, future=True), 'in 1 day') 
        tomorrow = tomorrow + dt.timedelta(1)
        self.assertEqual(overdue(tomorrow, future=True), 'in 2 days')

class TodoStateRetrieval(TestCase):
    """Tests the methods of TodoState that retrieves the list of "in play" todo states"""
    fixtures = ['test-users.yaml', 'gtd-test.yaml', 'gtd-env.yaml']
    def test_as_json(self):
        self.assertEqual(
            TodoState.as_json.__class__.__name__,
            'function',
            'TodoState.as_json() method doesn\'t exist'
            )
        self.assertEqual(
            TodoState.as_json().__class__.__name__,
            'unicode',
            'TodoState.as_json() method doesn\'t return a unicode string'
            )
        result_str = TodoState.as_json()
        result = json.loads(result_str)
        self.assertEqual(
            len(TodoState.get_active())+1,
            len(result),
            'TodoState.as_json() does not find all TodoState objects\n' +
            'Expected: ' + str(len(TodoState.get_active())+1) + '\nGot: ' + str(len(result))
            )

class MultiUser(TestCase):
    """Tests for multi-user support in the gtd app"""
    fixtures = ['test-users.yaml', 'gtd-env.yaml', 'gtd-test.yaml']
    def setUp(self):
        self.factory = RequestFactory()
        self.user1 = User.objects.get(pk=1)
        self.user2 = User.objects.get(pk=2)
        self.client.login(username='ryan', password='secret')
    def test_get_nodes(self):
        self.assertEqual(
            'function',
            Node.get_owned.__class__.__name__
            )
        request = self.factory.get('/gtd/nodes')
        request.user = self.user2
        self.assertEqual(
            'QuerySet',
            Node.get_owned(request).__class__.__name__)
        self.assertEqual(
            list(Node.objects.filter(owner = self.user2)),
            list(Node.get_owned(request))
            )
        request.user = AnonymousUser()
        self.assertFalse(
            request.user.is_authenticated()
            )
        self.assertEqual(
            list(Node.objects.none()),
            list(Node.get_owned(request))
            )
    def test_agenda_view(self):
        response = self.client.get('/gtd/agenda/')
        self.assertContains(
            response,
            'Ryan node',
            status_code=200
            )
        self.assertNotContains(
            response,
            'test-users node',
            status_code=200,
            msg_prefix='Agenda view',
            )
    def test_list_view(self):
        response = self.client.get('/gtd/lists/')
        self.assertContains(
            response,
            'Ryan node',
            status_code=200
            )
        self.assertNotContains(
            response,
            'test-users node',
            status_code=200,
            msg_prefix='List view',
            )
    def test_node_view(self):
        response = self.client.get('/gtd/nodes/')
        self.assertContains(
            response,
            'Ryan node',
            status_code=200
            )
        self.assertNotContains(
            response,
            'test-users node',
            status_code=200,
            msg_prefix='node view',
            )
    def test_get_children_json(self):
        response = self.client.get('/gtd/nodes/8/children/')
        response_dict = json.loads(response.content)
        children = response_dict['children']
        self.assertEqual(
            1,
            len(children),
            )
        self.assertEqual(
            Node.objects.get(pk=children[0]['node_id']).title,
            'another ryan node'
            )
    def test_get_unauthorized_node(self):
        """Trying to access another person's node by URL
        should redirect the user to the login screen"""
        response = self.client.get('/gtd/nodes/9/')
        self.assertEqual(
            302,
            response.status_code,
            )
        self.assertEqual(
            'http://testserver/accounts/login/?next=/gtd/nodes/9/',
            response['Location']
            )

class Markdown(TestCase):
    """Test the ability of node text to be converted using
    markdown syntax"""
    def setUp(self):
        self.f = markdown_text
    def test_info(self):
        """Test class type, return value, etc"""
        self.assertEqual(
            'function',
            self.f.__class__.__name__
            )
        self.assertEqual(
            'SafeText',
            self.f('').__class__.__name__
            )
        # Escapes html
        self.assertEqual(
            '<div class="markdown"><p>&amp;</p></div>',
            self.f('&')
            )
        self.assertEqual(
            '<div class="markdown"><p>&lt;h1&gt;</p></div>',
            self.f('<h1>')
            )
    def test_heading(self):
        self.assertEqual(
            '<div class="markdown"><h1>Hello</h1></div>',
            self.f('Hello\n=====')
            )

