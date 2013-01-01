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
from django.test.client import Client
from django.http import Http404
from django.utils.timezone import get_current_timezone
import re
import json

from orgwolf.tests import prepare_database
from orgwolf.preparation import translate_old_text
from orgwolf.models import OrgWolfUser as User
from gtd.forms import NodeForm
from gtd.models import Node, TodoState, node_repeat, Text, Location, Tool, Context, Scope
from gtd.shortcuts import parse_url, get_todo_states, get_todo_abbrevs
from gtd.templatetags.gtd_extras import overdue, upcoming

class EditNode(TestCase):
    def setUp(self):
        """
        Creates a node in order to test editing functions
        """
        prepare_database()
        dummy_user = User.objects.get(pk=1)
        actionable = TodoState.objects.get(abbreviation='ACTN')
        closed = TodoState.objects.get(abbreviation='DONE')
        node = Node(owner=dummy_user,
                    order=10,
                    title='Buy cat food',
                    todo_state=actionable)
        node.save()
             
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
            url = '/gtd/nodes/1/new/'
            regex = re.compile('http://testserver/gtd/nodes/1/')
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
            1,
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
    def test_edit_from_agenda(self):
        # Login
        self.assertTrue(
            self.client.login(username='test', password='secret')
            )
        node = Node.objects.get(title='Buy cat food')
        actionable = TodoState.objects.get(abbreviation='ACTN')
        closed = TodoState.objects.get(abbreviation='DONE')
        # Execute edit via AJAX
        url = '/gtd/nodes/' + str(node.pk) + '/edit/'
        data = {
            'format': 'json',
            'todo_id': closed.pk,
            }
        self.assertTrue(False, 'Write test for processing agenda information');
        response = self.client.get(url, data)
        self.assertEqual(
            200,
            response.status_code,
            'getJSON call did not return HTTP 200'
            )
        jresponse = json.loads(response.content)

class RepeatingNodeTest(TestCase):
    def setUp(self):
        prepare_database()
        dummy_user = User(pk=1)
        actionable = TodoState.objects.get(abbreviation='ACTN')
        node = Node(owner=dummy_user,
                    order=10,
                    title='Buy cat food',
                    scheduled=dt.datetime(2012, 12, 31, tzinfo=get_current_timezone()),
                    repeats=True,
                    repeating_number=3,
                    repeating_unit='d',
                    todo_state=actionable
                    )
        node.save()
        
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
    def setUp(self):
        prepare_database()
        dummy_user = User.objects.get(pk=1)
        root_node = Node(owner=dummy_user,
                         order=10,
                         title='Errands')
        root_node.save()
        child_node1 = Node(owner=dummy_user,
                          order=10,
                          title='Meijer',
                          parent=root_node)
        child_node1.save()
        child_node2 = Node(owner=dummy_user,
                          order=20,
                          title='PetSmart',
                          parent=root_node)
        child_node2.save()
        grandchild_node1 = Node(owner=dummy_user,
                          order=10,
                          title='Buy beer',
                          parent=child_node1)                         
        grandchild_node1.save()
    def test_primary_parent(self):
        target_parent = Node.objects.get(title='Errands')
        child = Node.objects.get(title='Meijer')
        parent = child.get_primary_parent()
        self.assertEqual(target_parent, parent)
        child = Node.objects.get(title='Meijer')
        parent = child.get_primary_parent()
        self.assertEqual(target_parent, parent)

class TextHandling(TestCase):
    def setUp(self):
        prepare_database()
        dummy_user = User.objects.get(pk=1)
        root_node = Node(owner=dummy_user,
                         order=10,
                         title='Errands')
        root_node.save()
        child_node1 = Node(owner=dummy_user,
                          order=10,
                          title='Meijer',
                          parent=root_node)
        child_node1.save()
        child_node2 = Node(owner=dummy_user,
                          order=20,
                          title='PetSmart',
                          parent=root_node)
        child_node2.save()
        text1 = Text(owner=dummy_user,
                     parent=root_node,
                     text='When will I have time\n')
        text1.save()
        text2 = Text(owner=dummy_user,
                     parent=child_node1,
                     text='- Toilet paper\n')
        text2.save()
        text3 = Text(owner=dummy_user,
                     parent=child_node1,
                     text='- Milk\n')
        text3.save()
    def test_text_translate(self):
        translate_old_text()
        root_node = Node.objects.get(title='Errands')
        self.assertEqual('When will I have time\n', root_node.text)
        child_node1 = Node.objects.get(title='Meijer')
        self.assertEqual('- Toilet paper\n- Milk\n', child_node1.text)

class ContextFiltering(TestCase):
    def setUp(self):
        prepare_database()
        dummy_user = User.objects.get(pk=1)
        next_state = TodoState.objects.get(abbreviation='NEXT')
        # Create some locations
        kalsec = Location(
            display='Kalsec',
            tag_string='work',
            owner=dummy_user,
            )
        kalsec.save()
        sheldon = Location(
            display='Sheldon',
            tag_string='home',
            owner=dummy_user,
            )
        sheldon.save()
        # Create some tools
        computer = Tool(
            display='Computer',
            tag_string='comp',
            owner=dummy_user,
            )
        computer.save()
        phone = Tool(
            display='Phone',
            tag_string='phone',
            owner=dummy_user,
            )
        phone.save()
        # Create some contexts
        work = Context(
            name = 'Work',
            )
        work.save()
        work.tools_available.add(computer)
        work.tools_available.add(phone)
        work.locations_available.add(kalsec)
        home = Context(
            name = 'Home',
            )
        home.save()
        home.tools_available.add(computer)
        home.tools_available.add(phone)
        home.locations_available.add(sheldon)
        # Create some nodes to play with
        Node(
            owner=dummy_user,
            order=10,
            title='Home Node',
            todo_state=next_state,
            tag_string=':home:',
            ).save()
        Node(
            owner=dummy_user,
            order=10,
            title='Work Node',
            todo_state=next_state,
            tag_string=':work:',
            ).save()
        # Login
        self.assertTrue(
            self.client.login(username='test', password='secret')
            )
    def test_context0(self):
        """Confirm that trying to set context0 returns a 404"""
        response = self.client.get('/gtd/lists/context0/')
        self.assertEqual(response.status_code, 404)
    def test_home_tag(self):
        all_nodes_qs = Node.objects.all()
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
    fixtures = ['gtd-test.yaml']
    def test_gets_states(self):
        self.assertEqual(
            list(TodoState.objects.all()),
            list(get_todo_states()),
            )

class UrlParse(TestCase):
    """Tests for the gtd url_parser that extracts context and scope information
    from the URL string and returns it as a useful dictionary."""
    fixtures = ['test-users.yaml', 'gtd-test.yaml']
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
    def setUp(self):
        prepare_database()
        # dummy_user = User.objects.get(pk=1)
        actionable = TodoState.objects.get(abbreviation='ACTN')
        closed = TodoState.objects.get(abbreviation='DONE')
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
