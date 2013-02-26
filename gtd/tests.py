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
from django.forms.models import model_to_dict
from django.db.models import Q
from django.utils.html import conditional_escape
from django.contrib.auth.models import AnonymousUser
from django.http import Http404
from django.utils.timezone import get_current_timezone
import re
import json

from orgwolf.preparation import translate_old_text
from orgwolf.models import OrgWolfUser as User
from gtd.forms import NodeForm
from gtd.models import Node, TodoState, node_repeat, Location, Tool, Context, Scope
from gtd.shortcuts import parse_url, generate_url, get_todo_states, get_todo_abbrevs, order_by_date # , reset_order
from gtd.templatetags.gtd_extras import overdue, upcoming, escape_html

class EditNode(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
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
        # Tests changing the todo state of a node via JSON
        # Login
        node = Node.objects.get(title='Hello')
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
        response = self.client.post(
            url, data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            )
        self.assertEqual(
            200,
            response.status_code,
            'getJSON call did not return HTTP 200'
            )
        jresponse = json.loads(response.content)
        # Check response object
        self.assertEqual(
            node.pk,
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
        node = Node.objects.get(pk=node.pk)
        self.assertEqual(
            closed,
            node.todo_state,
            'node.todo_state not set properly'
            )
        # Check about setting to no node
        data = {
            'format': 'json',
            'todo_id': '0',
            }
        response = self.client.post(
            url, data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            )
        self.assertEqual(
            200,
            response.status_code,
            'getJSON call did not return HTTP 200: ' + str(response.status_code)
            )
        node = Node.objects.get(pk=node.pk)
        self.assertEqual(
            None,
            node.todo_state,
            'node.todo_state not unset when todo_id: 0 passed to edit node'
            )
    def test_edit_repeating_by_json(self):
        """If a repeating node has it's todo state changed by JSON,
        if requires special handling."""
        node = Node.objects.get(pk=7)
        actionable = TodoState.objects.get(abbreviation='NEXT')
        closed = TodoState.objects.get(abbreviation='DONE')
        self.assertEqual(
            actionable,
            node.todo_state,
            'Node does not start out actionable'
            )
        self.assertTrue(
            node.repeats,
            'Node does not start out repeating'
            )
        # Execute edit via AJAX
        url = '/gtd/nodes/' + str(node.pk) + '/edit/'
        data = {
            'format': 'json',
            'todo_id': closed.pk,
            }
        response = self.client.post(
            url, data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            )
        self.assertEqual(
            200,
            response.status_code,
            'getJSON call did not return HTTP 200'
            )
        node = Node.objects.get(pk=node.pk)
        self.assertEqual(
            actionable,
            node.todo_state
            )
        jresponse = json.loads(response.content)
        self.assertEqual(
            actionable.pk,
            jresponse['todo_id'],
            )

    def test_text_through_json(self):
        """Check JSON editing (ie using Aloha editor)"""
        node = Node.objects.get(pk=1)
        self.assertEqual(
            '',
            node.text
            )
        url = '/gtd/nodes/' + str(node.pk) + '/edit/'
        text = '<strong>evilness</strong>'
        data = {'format': 'json',
                'text': text}
        response = self.client.post(
            url, data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            )
        self.assertEqual(
            200,
            response.status_code
            )
        node = Node.objects.get(pk = node.pk)
        self.assertEqual(
            conditional_escape(text),
            node.text
            )
        # Check that it allows <b> and other whitelist elements
        text = '<b>evilness</b>'
        data = {'format': 'json',
                'text': text}
        response = self.client.post(
            url, data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            )
        self.assertEqual(
            200,
            response.status_code
            )
        node = Node.objects.get(pk = node.pk)
        self.assertEqual(
            text,
            node.text
            )
        # Check that it handles a blank text element properly
        url = '/gtd/nodes/' + str(node.pk) + '/edit/'
        text = '\n<br>'
        data = {'format': 'json',
                'text': text}
        response = self.client.post(
            url, data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            )
        self.assertEqual(
            200,
            response.status_code
            )
        node = Node.objects.get(pk = node.pk)
        self.assertEqual(
            '',
            node.text
            )
    def test_edit_node_through_json(self):
        """Tests AJAX editing of entire node at once via form-like submission"""
        node = Node.objects.get(pk=1)
        node.todo_state = TodoState.objects.get(pk=1)
        node.save()
        self.assertEqual(
            1,
            node.todo_state.pk
            )
        url = '/gtd/nodes/{0}/edit/'.format(node.pk)
        data = model_to_dict(node)
        data['form'] = 'modal'
        data['format'] = 'json'
        data['repeating_unit'] = ''
        data['repeating_number'] = ''
        data['scheduled'] = ''
        data['deadline'] = ''
        data['todo_state'] = 0
        response = self.client.post(
            url, data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            )
        self.assertEqual(
            200,
            response.status_code)
        node = Node.objects.get(pk=1)
        self.assertEqual(
            None,
            node.todo_state
            )
    def test_add_node_through_json(self):
        """Add a new node by submitting the whole form through AJAX"""
        node = Node()
        url = '/gtd/nodes/6/new/'
        data = model_to_dict(node)
        data['title'] = 'new node'
        data['form'] = 'modal'
        data['format'] = 'json'
        data['repeats'] = ''
        data['repeating_unit'] = ''
        data['repeating_number'] = ''
        data['scheduled'] = ''
        data['deadline'] = ''
        data['todo_state'] = 0
        response = self.client.post(
            url, data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            )
        self.assertEqual(
            200,
            response.status_code)

class NodeOrder(TestCase):
    """Holds tests for accessing and modifying the order of nodes"""
    fixtures = ['test-users.json', 'gtd-env.json', 'gtd-test.json']
    def setUp(self):
        self.nodes_qs = Node.get_owned(User.objects.get(pk=1))
        self.user = User.objects.get(pk=1)
        self.client.login(username='test', password='secret')

    def test_move_up(self):
        children = Node.objects.filter(parent__pk=1)
        child1 = children[0]
        child2 = children[1]
        self.assertTrue(
            child1.lft < child2.lft
            )
        response = self.client.post(
            '/gtd/nodes/{0}/edit/'.format(child2.pk),
            {'function': 'reorder',
             'move_up': 'Move Up'}
            )
        self.assertEqual(
            302,
            response.status_code
            )
        child1 = Node.objects.get(pk=child1.pk)
        child2 = Node.objects.get(pk=child2.pk)
        self.assertTrue(
            child1.lft > child2.lft,
            'Nodes were not re-arranged: {0} !> {1}'.format(
                child1.lft, child2.lft)
            )
    def test_move_down(self):
        children = Node.objects.filter(parent__pk=1)
        child1 = children[0]
        child2 = children[1]
        self.assertTrue(
            child1.lft < child2.lft
            )
        response = self.client.post(
            '/gtd/nodes/{0}/edit/'.format(child1.pk),
            {'function': 'reorder',
             'move_down': 'Move Down'}
            )
        self.assertEqual(
            302,
            response.status_code
            )
        child1 = Node.objects.get(pk=child1.pk)
        child2 = Node.objects.get(pk=child2.pk)
        self.assertTrue(
            child1.lft > child2.lft,
            'Nodes were not re-arranged: {0} !> {1}'.format(
                child1.lft, child2.lft)
            )

class NodeMutators(TestCase):
    fixtures = ['test-users.json', 'gtd-env.json', 'gtd-test.json']
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
    def test_get_active(self):
        f = Node.get_active
        self.assertEqual(
            list(Node.objects.filter(archived=False)),
            list(Node.get_active())
            )
    def test_get_title(self):
        node = Node.objects.get(pk=1)
        self.assertEqual(
            node.title,
            node.get_title()
            )
        node.archived = True
        expected = '<div class="archive">{0}</div>'.format(node.title)
        self.assertEqual(
            expected,
            node.get_title()
            )
        self.assertEqual(
            conditional_escape(node.title).__class__,
            node.get_title().__class__
            )
        node.title = '<a>'
        self.assertEqual(
            '<div class="archive">&lt;a&gt;</div>',
            node.get_title()
            )
        node.title = '\t'
        self.assertEqual(
            '<div class="archive">[Blank]</div>',
            node.get_title()
            )

class NodeArchive(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def test_auto_archive(self):
        """Test that a node being closed gets auto archived"""
        node = Node.objects.get(pk=5)
        self.assertFalse(node.archived)
        self.assertFalse(node.todo_state.closed)
        done = TodoState.objects.get(pk=3)
        node.todo_state = done
        node.save()
        node = Node.objects.get(pk=5)
        self.assertTrue(node.todo_state.closed)
        self.assertTrue(node.archived)

class RepeatingNodeTest(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
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

class FormValidation(TestCase):
    fixtures = ['test-users.json', 'gtd-env.json']
    def setUp(self):
        self.client.login(username='test', password='secret')
        self.form = NodeForm()
    def test_repeating_number(self):
        """See if the program properly fails with nonsense values
        for repeating unit (eg -4, 0)"""
        data = {
            'title': 'woah'
            }
        response = self.client.post('/gtd/nodes/new/', data)
        self.assertRedirects(response, '/gtd/nodes/')
        data = {
            'title': 'woah',
            'repeating_number': -1,
            }
        response = self.client.post('/gtd/nodes/1/edit/', data)
        self.assertEqual(
            200,
            response.status_code
            )
        data = {
            'title': 'woah',
            'repeating_number': '0',
            }
        response = self.client.post('/gtd/nodes/1/edit/', data)
        self.assertEqual(
            200,
            response.status_code
            )

class ParentStructure(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def test_primary_parent(self):
        target_parent = Node.objects.get(title='Errands')
        child = Node.objects.get(title='Meijer')
        parent = child.get_primary_parent()
        self.assertEqual(target_parent, parent)
        child = Node.objects.get(title='Meijer')
        parent = child.get_primary_parent()
        self.assertEqual(target_parent, parent)

class ContextFiltering(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
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
            Context.objects.get(pk=1)
            )
        # Test that base url redirects to the saved context
        response = self.client.get('/gtd/lists/')
        self.assertRedirects(response, '/gtd/lists/context1/')
        response = self.client.get('/gtd/lists/', follow=True)
        self.assertContains(response, 
                            'Actions (Work)', 
                            )
        self.assertContains(response, 
                            '/gtd/lists/next/context1/', 
                            )
        # Test clearing the context by using the POST filter
        response = self.client.post('/gtd/lists/context1/', {'context': '0',
                                                             'scope': '0',
                                                             })
        self.assertRedirects(response, '/gtd/lists/')
        self.assertEqual(
            self.client.session['context'],
            None)
    def test_get_owned(self):
        user = User.objects.get(pk=1)
        contexts = Context.get_visible(user)
        self.assertEqual(
            list(Context.objects.filter(owner=user)),
            list(contexts)
            )

class ProjectSublist(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def setUp(self):
        self.assertTrue(
            self.client.login(username='test', password='secret')
            )
    def test_has_url(self):
        response = self.client.get('/gtd/lists/parent1/')
        self.assertEqual(
            200,
            response.status_code,
            'Getting a project sublist does not return status code 200. Got {0}'.format(response.status_code)
            )
    def test_bad_url(self):
        # Parent does not exist
        response = self.client.get('/gtd/lists/parent99/')
        self.assertEqual(
            404,
            response.status_code,
            'Getting a list for a non-existent project does not return status code 404. Got {0}'.format(response.status_code)
            )        

class Shortcuts(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def test_gets_states(self):
        self.assertEqual(
            list(TodoState.objects.all()),
            list(get_todo_states()),
            )
    def test_order_by_date(self):
        """Tests the gtd.shortcuts.order_by_date function."""
        # First make sure the method actual does something
        self.assertEqual(
            'function',
            order_by_date.__class__.__name__
            )
        original_qs = Node.objects.all()
        result_qs = order_by_date(original_qs, 'scheduled')
        self.assertEqual(
            'QuerySet',
            result_qs.__class__.__name__
            )
        self.assertNotEqual(
            original_qs,
            result_qs,
            'gtd.shortcuts.order_by_date() method does not modify queryset'
            )
        # Now Check the actual contents of the returned queryset
        scheduled_qs = original_qs.exclude(scheduled=None)
        unscheduled_qs = original_qs.filter(scheduled=None)
        self.maxDiff = None
        result_list = []
        for node in result_qs[(result_qs.count() - unscheduled_qs.count()):]:
            result_list.append(repr(node))
        self.assertQuerysetEqual(
            unscheduled_qs,
            result_list,
            ordered=False
            )
        self.assertEqual(
            list(scheduled_qs.order_by('scheduled')),
            list(result_qs)[:scheduled_qs.count()]
            )
    def test_node_as_json(self):
        node = Node.objects.get(pk=1)
        self.assertEqual(
            'instancemethod',
            node.as_json.__class__.__name__
            )
        response = node.as_json()
        self.assertEqual(
            'str',
            response.__class__.__name__
            )
        response_dict = json.loads(response)
        self.assertEqual(
            node.title,
            response_dict['title']
            )
        self.assertEqual(
            '{0} - {1}'.format(
                node.todo_state.as_html(),
                node.todo_state.display_text),
            response_dict['todo_html'],
            )

class UrlParse(TestCase):
    """Tests for the gtd url_parser that extracts context and scope information
    from the URL string and returns it as a useful dictionary."""
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
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
    def test_processes_parents(self):
        node = Node.objects.get(pk=1)
        self.assertEqual(
            node,
            parse_url('/parent1/')['parent']
            )
        self.assertEqual(
            node,
            parse_url('/parent1/next/')['parent']
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

class UrlGenerate(TestCase):
    """Tests for the gtd url_generator that returns a URL string based
    on scope/context/etc."""
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def test_meta(self):
        """Test if it exists and returns a string"""
        self.assertEqual(
            'function',
            generate_url.__class__.__name__
            )
        self.assertTrue(
            isinstance(generate_url(), str),
            'generate_url() did not return string. Got {0}'.format(
                generate_url().__class__
                )
            )
    def test_individual_entries(self):
        """Test passing each parameter type one at a time"""
        state1 = TodoState.objects.get(pk=1)
        self.assertEqual(
            '/{0}/'.format(state1.abbreviation.lower()),
            generate_url(todo=state1)
            )
        states = TodoState.objects.filter(pk__lte = 2)
        expected_url = '/'
        for state in states:
            expected_url += '{0}/'.format(state.abbreviation.lower())
        self.assertEqual(
            expected_url,
            generate_url(todo=states)
            )
        # Scope
        scope = Scope.objects.get(pk=1)
        self.assertEqual(
            '/scope{0}/'.format(scope.pk),
            generate_url(scope=scope)
            )
        # Context
        context = Context.objects.get(pk=1)
        self.assertEqual(
            '/context{0}/'.format(context.pk),
            generate_url(context=context)
            )
        # Parent
        parent = Node.objects.get(pk=2)
        self.assertEqual(
            '/parent{0}/'.format(parent.pk),
            generate_url(parent=parent)
            )
    def test_multiple_entries(self):
        """Test various combinations of parameters to generate_url"""
        states = TodoState.objects.filter(pk__lte = 2)
        todo_url = ''
        for state in states:
            todo_url += '{0}/'.format(state.abbreviation.lower())
        scope = Scope.objects.get(pk=1)
        context = Context.objects.get(pk=1)
        parent = Node.objects.get(pk=2)
        expected_url = '/parent{0}/{todo}scope{1}/context{2}/'.format(
            parent.pk,
            scope.pk,
            context.pk,
            todo=todo_url
            )
        self.assertEqual(
            expected_url,
            generate_url(
                scope=scope,
                context=context,
                todo=states,
                parent=parent
                )
            )

class TodoStateRetrieval(TestCase):
    """Tests the methods of TodoState that retrieves the list of "in play" todo states"""
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
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
            len(TodoState.get_visible())+1,
            len(result),
            'TodoState.as_json() does not find all TodoState objects\n' +
            'Expected: ' + str(len(TodoState.get_visible())+1) + '\nGot: ' + str(len(result))
            )
    def test_get_visible(self):
        user = User.objects.get(pk=1)
        expected = TodoState.objects.filter(Q(owner=user) | Q(owner=None))
        self.assertEqual(
            list(expected),
            list(TodoState.get_visible(user))
            )

class MultiUser(TestCase):
    """Tests for multi-user support in the gtd app"""
    fixtures = ['test-users.json', 'gtd-env.json', 'gtd-test.json']
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
            Node.get_owned(request.user).__class__.__name__)
        self.assertEqual(
            list(Node.objects.filter(owner = self.user2)),
            list(Node.get_owned(request.user))
            )
        request.user = AnonymousUser()
        self.assertFalse(
            request.user.is_authenticated()
            )
        self.assertEqual(
            list(Node.objects.none()),
            list(Node.get_owned(request.user))
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
    def test_bad_list_view(self):
        """User 'test' does not have access to this todo_state"""
        self.assertTrue(
            self.client.login(username='test', password='secret')
            )
        response = self.client.get('/gtd/lists/bore/')
        self.assertEqual(
            404,
            response.status_code
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
    def test_get_children_sarchived(self):
        """Check if the title of an archived child is correctly
        rendered in a json request"""
        node = Node.objects.get(pk=13)
        response = self.client.get(
            '/gtd/nodes/{0}/children/'.format(node.parent.pk)
            )
        response_dict = json.loads(response.content)        
        self.assertTrue(
            False,
            'start tests for getting node titles in italics'
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

class HTMLEscape(TestCase):
    """Test the ability of node text to be converted using
    markdown syntax"""
    def setUp(self):
        self.f = escape_html
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
        # Escapes non-whitelist html
        self.assertEqual(
            '<div>&amp;</div>',
            self.f('<div>&</div>')
            )
        # Ignores whitelist HTML
        self.assertEqual(
            '<h1>',
            self.f('<h1>')
            )

