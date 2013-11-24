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
Test the various parts of the Getting Things Done modules. Run with
    `manage.py test gtd`
from the command line.
"""

from __future__ import unicode_literals, absolute_import, print_function
import datetime as dt
import json
import re

from django.contrib.auth.models import AnonymousUser
from django.core import serializers
from django.core.urlresolvers import reverse
from django.db.models import Q
from django.forms.models import model_to_dict
from django.http import Http404
from django.template.defaultfilters import slugify
from django.test import TestCase
from django.test.client import Client, RequestFactory
from django.utils.html import conditional_escape
from django.utils.timezone import get_current_timezone, utc
from django.views.generic import View

from gtd.forms import NodeForm
from gtd.models import Node, TodoState, node_repeat, Location
from gtd.models import Tool, Context, Scope, Contact
from gtd.shortcuts import parse_url, generate_url, get_todo_abbrevs
from gtd.shortcuts import order_nodes
from gtd.templatetags.gtd_extras import escape_html
from gtd.templatetags.gtd_extras import add_scope, breadcrumbs
from gtd.views import Descendants, NodeListView, NodeView
from orgwolf.preparation import translate_old_text
from orgwolf.models import OrgWolfUser as User

class EditNode(TestCase):
    """
    Test case for editing a node by *non-AJAX* methods only. AJAX functions
    should be in NodeAPI test case.
    """
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def setUp(self):
        self.user = User.objects.get(username='test')
        self.assertTrue(
            self.client.login(username=self.user.username, password='secret')
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
            url = reverse('node_object', kwargs={'pk': node.pk})
            post_data['title'] = node.title
        else: # new node
            url = reverse('gtd.views.new_node', kwargs={'node_id': 5})
            redir_url = reverse('node_object', kwargs={'pk': 5})
            post_data['title'] = 'new node 1'
        response = client.post(url, post_data, follow=True)
        self.assertEqual(200, response.status_code)
        redir_url = reverse('node_object')
        redirect = re.match(
            'http://testserver{base_url}(\d+)/'.format(base_url=redir_url),
            response.redirect_chain[0][0]
            )
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
        self.close_node_through_client(self.client, node)
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
        self.close_node_through_client(self.client, node)
        # Refresh the node
        new_node = Node.objects.get(title='Buy cat food')
        # Make sure the node is closed
        self.assertTrue(new_node.is_closed())
        self.assertEqual(now.date(), new_node.closed.date())

        # Test that closed is set for new nodes
        new_node_id = self.close_node_through_client(self.client)
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

    def test_edit_form_states(self):
        """Make sure edit node form has only the valid states for this user"""
        node = Node.objects.get(pk=1)
        edit_url = reverse('gtd.views.edit_node',
                           kwargs={'node_id': node.pk,
                                   'slug': node.slug}
        )
        response = self.client.get(edit_url)
        good_states = TodoState.objects.filter(
            Q(owner=None) | Q(owner=self.user)
        )
        bad_states = TodoState.objects.exclude(
            owner=None).exclude(owner=self.user)
        self.assertTrue(
            len(good_states) > 0,
            'No good states found to test for (bad fixtures)'
        )
        self.assertTrue(
            len(bad_states) > 0,
            'No bad states found to test for (bad fixtures)'
        )
        for state in good_states:
            self.assertContains(
                response,
                state
            )
        for state in bad_states:
            self.assertNotContains(
                response,
                state
            )
    def test_set_fields(self):
        """Test the ability of a node to set its own fields given a dict"""
        node = Node.objects.get(pk=2)
        self.assertEqual(
            len(node.related_projects.all()),
            0
        )
        node.set_fields({'related_projects': [1]})
        self.assertEqual(
            node.related_projects.all()[0].pk,
            1
        )
        # Date and time objects
        node.set_fields({'scheduled_date': '2012-12-31',
                         'scheduled_time': '05:00:00'})
        self.assertEqual(
            'date',
            node.scheduled_date.__class__.__name__,
            'set_fields processes date strings into date objects'
        )
        self.assertEqual(
            'time',
            node.scheduled_time.__class__.__name__,
            'set_fields processes time strings into time objects'
        )

class NodeOrder(TestCase):
    """Holds tests for accessing and modifying the order of nodes"""
    fixtures = ['test-users.json', 'gtd-env.json', 'gtd-test.json']
    def setUp(self):
        self.nodes_qs = Node.objects.owned(User.objects.get(pk=1))
        self.user = User.objects.get(pk=1)
        self.client.login(username='test', password='secret')

    def test_move_up(self):
        children = Node.objects.filter(parent__pk=1)
        child1 = children[0]
        child2 = children[1]
        self.assertTrue(
            child1.lft < child2.lft
            )
        url = reverse('gtd.views.edit_node', kwargs={'node_id': child2.pk})
        response = self.client.post(
            url,
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
        url = reverse('gtd.views.edit_node', kwargs={'node_id': child1.pk})
        response = self.client.post(
            url,
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

    def test_valid_move(self):
        """Test if the Node can change parents"""
        node = Node.objects.get(pk=1)
        old_parent = node.parent
        new_parent = Node.objects.get(pk=6)
        url = reverse('gtd.views.move_node', kwargs={'node_id': node.pk})
        response = self.client.post(
            url,
            {'function': 'move',
             'target_id': new_parent.pk}
            )
        self.assertEqual(
            302,
            response.status_code
            )
        node = Node.objects.get(pk=node.pk)
        self.assertEqual(
            new_parent,
            node.parent,
            )
    def test_root_move(self):
        """Test if the moved Node can be given None as a parent"""
        node = Node.objects.get(pk=1)
        old_parent = node.parent
        new_parent = None
        url = reverse('gtd.views.move_node', kwargs={'node_id': node.pk})
        response = self.client.post(
            url,
            {'function': 'move',
             'target_id': 'None'}
            )
        self.assertEqual(
            302,
            response.status_code
            )
        node = Node.objects.get(pk=node.pk)
        self.assertEqual(
            new_parent,
            node.parent,
            )
    def test_invalid_move(self):
        """Make sure that the operation fails if the user tries to make a
        Node a child of one of its descendents."""
        node = Node.objects.get(pk=1)
        old_parent = node.parent
        new_parent = Node.objects.get(pk=2)
        url = reverse('gtd.views.move_node', kwargs={'node_id': node.pk})
        response = self.client.post(
            url,
            {'function': 'move',
             'target_id': new_parent.pk}
            )
        self.assertEqual(
            400,
            response.status_code
            )
        node = Node.objects.get(pk=node.pk)
        self.assertEqual(
            old_parent,
            node.parent,
            )
    def test_move_invalid_parent(self):
        """Test what happens if the user tries to move a Node
        to a parent that doesn't exist"""
        node = Node.objects.get(pk=1)
        old_parent = node.parent
        url = reverse('gtd.views.move_node', kwargs={'node_id': node.pk})
        response = self.client.post(
            url,
            {'function': 'move',
             'target_id': '99',
             }
            )
        self.assertEqual(
            400,
            response.status_code
            )
        node = Node.objects.get(pk=node.pk)
        self.assertEqual(
            old_parent,
            node.parent,
            )

class MoveNodePage(TestCase):
    fixtures = ['test-users.json', 'gtd-env.json', 'gtd-test.json']
    def setUp(self):
        self.nodes_qs = Node.objects.owned(User.objects.get(pk=1))
        self.user = User.objects.get(pk=1)
        self.client.login(username='test', password='secret')
    def test_get_page(self):
        """Make sure the page is accessible"""
        node = Node.objects.get(pk=2)
        url = reverse('gtd.views.move_node', kwargs={'node_id': node.pk})
        response = self.client.get(url)
        self.assertEqual(
            200,
            response.status_code
            )
        self.assertContains(
            response,
            'Please select a new parent for node {0}: {1}'.format(node.pk,
                                                                node.get_title()),
            )
        tree = node.get_root().get_descendants(include_self=True)

        for child in tree:
            if child.is_descendant_of(node):
                self.assertNotContains(
                    response,
                    child.get_title()
                    )
            else:
                self.assertContains(
                    response,
                    child.get_title()
                    )
        others = Node.objects.filter(level=0).exclude(tree_id=node.tree_id)
        for root in others:
            self.assertContains(
                response,
                root.get_title()
                )
        self.assertContains(
            response,
            'Create new project'
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
    def test_get_title(self):
        node = Node.objects.get(pk=1)
        self.assertEqual(
            node.title,
            node.get_title()
            )
        node.archived = True
        elem = '<span class="archived-text">{0}</span>'
        expected = elem.format(node.title)
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
            elem.format('&lt;a&gt;'),
            node.get_title()
            )
        node.title = '\t'
        self.assertEqual(
            elem.format('[Blank]'),
            node.get_title()
            )
    def test_get_hierarchy(self):
        node = Node.objects.get(pk=2)
        parent = node.parent
        self.assertEqual(
            '> {0} > {1}'.format(parent.get_title(),
                                 node.get_title() ),
            node.get_hierarchy_as_string()
            )

class NodeManagers(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def test_queryset_as_json(self):
        qs = Node.objects.all()
        r = qs.as_json()
        r_pks = [x['pk'] for x in json.loads(r)]
        self.assertTrue(
            isinstance(r, basestring)
        )
        # Make sure querysets match up (by pk)
        self.assertQuerysetEqual(
            qs,
            r_pks,
            transform=lambda x: x.pk,
            ordered=False,
        )


class NodeArchive(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def test_auto_archive(self):
        """Test that a node being closed gets auto archived"""
        node = Node.objects.get(pk=11)
        self.assertFalse(node.archived)
        self.assertFalse(node.todo_state.closed)
        done = TodoState.objects.get(pk=3)
        node.todo_state = done
        node.auto_update = True
        node.save()
        node = Node.objects.get(pk=11)
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
        node.auto_update = True
        node.save()
        node = Node.objects.get(title='Buy cat food')
        # The state shouldn't actually change since it's repeating
        self.assertEqual(actionable, node.todo_state)
        new_date = dt.datetime(2013, 1, 3, tzinfo=get_current_timezone())
        self.assertEqual(new_date.date(), node.scheduled_date)
    def test_all_repeat_units(self):
        """Make sure day, week, month and year repeating units work"""
        node = Node.objects.get(title='Buy cat food')
        closed = TodoState.objects.get(abbreviation='DONE')
        old_date = dt.date(2012, 12, 31)
        node.repeating_number = 3
        # Test 'd' for day
        node.repeating_unit='d'
        node.scheduled_date = old_date
        node.save()
        node.todo_state=closed
        node.auto_update = True
        node.save()
        self.assertFalse(node.is_closed())
        new_date = dt.date(2013, 1, 3)
        self.assertEqual(new_date, node.scheduled_date)
        # Test 'w' for week
        node.repeating_unit='w'
        node.scheduled_date = old_date
        node.save()
        node.todo_state=closed
        node.save()
        self.assertFalse(node.is_closed())
        new_date = dt.date(2013, 1, 21)
        self.assertEqual(new_date, node.scheduled_date)
        # Test 'm' for month
        node.repeating_unit='m'
        node.scheduled_date = old_date
        node.save()
        node.todo_state=closed
        node.save()
        self.assertFalse(node.is_closed())
        new_date = dt.date(2013, 3, 31)
        self.assertEqual(new_date, node.scheduled_date)
        # Test 'y' for year
        node.repeating_unit='y'
        node.scheduled_date = old_date
        node.save()
        node.todo_state=closed
        node.save()
        self.assertFalse(node.is_closed())
        new_date = dt.date(2015, 12, 31)
        self.assertEqual(new_date, node.scheduled_date)
    def test_31st_bug(self):
        """Test for proper behavior if trying to set a month that
        doesn't have a 31st day."""
        node = Node.objects.get(title='Buy cat food')
        closed = TodoState.objects.get(abbreviation='DONE')
        node.repeating_unit = 'm'
        node.repeating_number = 1
        old_date = dt.date(2013, 8, 31)
        node.scheduled_date = old_date
        node.save()
        node.todo_state = closed
        node.auto_update = True
        node.save()
        self.assertFalse(node.is_closed())
        new_date = dt.date(2013, 9, 30)
        self.assertEqual(new_date, node.scheduled_date)
        # Now try for February type bugs
        old_date = dt.date(2013, 1, 28)
        node.scheduled_date = old_date
        node.repeating_number = 2
        node.save()
        node.todo_state = closed
        node.save()
        self.assertFalse(node.is_closed())
        new_date = dt.date(2013, 3, 28)
        self.assertEqual(new_date, node.scheduled_date)
    def test_month_bug(self):
        """Test for a bug that imporperly increments months and years
        if original_month + repeating_unit equals 12 and if
        repeating_unit = month.
        """
        node = Node.objects.get(title='Buy cat food')
        closed = TodoState.objects.get(abbreviation='DONE')
        node.scheduled_date = dt.date(2012, 11, 25)
        node.repeating_unit = 'm'
        node.repeating_number = 1
        node.repeats_from_completion = False
        node.save()
        self.assertTrue(node.todo_state.actionable)
        node.todo_state = closed
        node.auto_update = True
        node.save()
        self.assertEqual(
            dt.date(2012, 12, 25),
            node.scheduled_date
        )

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
        url = reverse('gtd.views.new_node')
        response = self.client.post(url, data)
        redir_url = reverse('node_object')
        self.assertRedirects(response, redir_url)
        data = {
            'title': 'woah',
            'repeating_number': -1,
            }
        url = reverse('gtd.views.edit_node', kwargs={'node_id': 1})
        response = self.client.post(url, data)
        self.assertEqual(
            200,
            response.status_code
            )
        data = {
            'title': 'woah',
            'repeating_number': '0',
            }
        response = self.client.post(url, data)
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
    """Test the ability of the gtd list app to filter based on passed context"""
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def setUp(self):
        self.assertTrue(
            self.client.login(username='test', password='secret')
            )
    def test_bad_context(self):
        """Confirm that trying to set context that does not exist
        returns a 404.
        """
        url = reverse('list_display')
        response = self.client.get(url, {'context': 999})
        self.assertEqual(response.status_code, 404)
    def test_home_tag(self):
        all_nodes_qs = Node.objects.filter(
            Q(tag_string=':work:')|Q(tag_string=':home:')
        )
        work = Context.objects.get(name='Work')
        home = Context.objects.get(name='Home')
        work_nodes = Node.objects.filter(Q(pk=7)|Q(pk=18))
        self.assertEqual(
            list(work_nodes),
            list(work.apply(all_nodes_qs))
            )
        self.assertEqual(
            list(Node.objects.filter(title='Home Node')),
            list(home.apply(all_nodes_qs))
            )
    def test_context_session_variables(self):
        """Test if the active GTD context is saved and stored properly
        in session variables.
        """
        url = reverse('list_display')
        response = self.client.get(url);
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.client.session['context'],
            None)
        url = reverse('list_display',
                      kwargs={'url_string': '/context1'} )
        response = self.client.get(url);
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.client.session['context'],
            Context.objects.get(pk=1)
            )
        # Test that base url redirects to the saved context
        base_url = reverse('list_display')
        response = self.client.get(base_url)
        redir_url = reverse('list_display',
                            kwargs={'url_string': '/context1'} )
        self.assertRedirects(response, redir_url)
        response = self.client.get(base_url, follow=True)
        self.assertContains(response,
                            'Actions (Work)',
                            )
        link_url = reverse('list_display',
                           kwargs={'url_string': '/next/context1'} )
        self.assertContains(response, link_url)
        # Test clearing the context by using the POST filter
        response = self.client.post(redir_url, {'context': '0',
                                                'scope': '0',
                                                })
        self.assertRedirects(response, base_url)
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
    def test_context_person(self):
        lou_node = Node.objects.get(pk=21)
        context = Context.objects.get(pk=3)
        result = context.apply()
        self.assertEqual(
            1,
            result.count(),
            'Filtering person context returns {0} nodes instead of 1'.format(
                result.count())
        )

# Project sublist moved to javascript
# class ProjectSublist(TestCase):
#     fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
#     def setUp(self):
#         self.assertTrue(
#             self.client.login(username='test', password='secret')
#             )
#     def test_has_url(self):
#         url = reverse('list_display',
#                       kwargs={'url_string': '/parent1'} )
#         response = self.client.get(url)
#         self.assertEqual(
#             200,
#             response.status_code,
#             'Getting a project sublist does not return status code 200.' +
#             'Got {0}'.format(response.status_code)
#             )
#     def test_bad_url(self):
#         # Parent does not exist
#         url = reverse('list_display',
#                       kwargs={'url_string': '/parent99'})
#         response = self.client.get(url)
#         self.assertEqual(
#             404,
#             response.status_code,
#             'Getting a list for a non-existent project does not return ' +
#             'status code 404. Got {0}'.format(response.status_code)
#         )

class Shortcuts(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def test_order_nodes(self):
        """Tests the gtd.shortcuts.order_by_date function."""
        # First make sure the method actual does something
        self.assertEqual(
            'function',
            order_nodes.__class__.__name__
            )
        original_qs = Node.objects.all()
        result_qs = order_nodes(original_qs, field='scheduled_date')
        self.assertEqual(
            'NodeQuerySet',
            result_qs.__class__.__name__
            )
        self.assertNotEqual(
            original_qs,
            result_qs,
            'gtd.shortcuts.order_by_date() method does not modify queryset'
            )
        # Now Check the actual contents of the returned queryset
        scheduled_qs = original_qs.exclude(scheduled_date=None)
        unscheduled_qs = original_qs.filter(scheduled_date=None)
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
            list(scheduled_qs.order_by('scheduled_date')),
            list(result_qs)[:scheduled_qs.count()]
            )
    def test_order_nodes_context(self):
        nodes = Node.objects.filter(tree_id=8)
        context_node = Node.objects.get(pk=18)
        deadline_node = Node.objects.get(pk=19)
        context = Context.objects.get(pk=1)
        ordered_nodes = order_nodes(nodes,
                                    context=context,
                                    field='deadline_date',
                                    )
        self.assertEqual(
            deadline_node,
            ordered_nodes[0]
            )
        self.assertEqual(
            context_node,
            ordered_nodes[1]
            )
    def test_node_as_json(self):
        """Translate Node details into a JSON string"""
        node = Node.objects.get(pk=2)
        node.archived = True
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
            response_dict['fields']['title']
            )
        self.assertEqual(
            node.todo_state.pk,
            response_dict['fields']['todo_state']
            )
        self.assertEqual(
            node.scheduled_date.isoformat(),
            response_dict['fields']['scheduled_date']
            )
        self.assertEqual(
            node.scheduled_time.isoformat()[:-3],
            response_dict['fields']['scheduled_time']
            )
        self.assertEqual(
            node.deadline_date.isoformat(),
            response_dict['fields']['deadline_date']
            )
        self.assertEqual(
            node.deadline_time.isoformat()[:-3],
            response_dict['fields']['deadline_time']
            )
        self.assertEqual(
            node.priority,
            response_dict['fields']['priority']
            )
        self.assertEqual(
            list(node.scope.values_list('pk', flat=True)),
            response_dict['fields']['scope']
            )
        self.assertEqual(
            node.repeats,
            response_dict['fields']['repeats']
            )
        self.assertEqual(
            node.repeating_number,
            response_dict['fields']['repeating_number']
            )
        self.assertEqual(
            node.repeating_unit,
            response_dict['fields']['repeating_unit']
            )
        self.assertEqual(
            node.repeats_from_completion,
            response_dict['fields']['repeats_from_completion']
            )
        self.assertEqual(
            node.archived,
            response_dict['fields']['archived']
            )
        self.assertEqual(
            list(node.related_projects.values_list('pk', flat=True)),
            response_dict['fields']['related_projects']
            )
        self.assertEqual(
            node.text,
            response_dict['fields']['text']
            )
        self.assertEqual(
            node.tag_string,
            response_dict['fields']['tag_string']
            )
        self.assertEqual(
            node.pk,
            response_dict['pk']
            )
        self.assertEqual(
            node.parent.pk,
            response_dict['fields']['parent']
            )

    def test_breadcrumb_unicode(self):
        """Make sure that the breadcrumbs template filter handles unicode
        characters properly.
        """
        node = Node.objects.filter(pk=13)
        breadcrumbs(node, '/')


class NodePermissions(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def setUp(self):
        self.assertTrue(
            self.client.login(username='test', password='secret')
            )
        self.user = User.objects.get(username='test')
    def test_owned(self):
        node = Node.objects.filter(owner=self.user)[0]
        self.assertEqual(
            'write',
            node.access_level(self.user)
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

class ScopeFilter(TestCase):
    fixtures = ['gtd-env.json']
    def setUp(self):
        self.s = '/gtd/lists/{scope}/'
    def test_basic_scope(self):
        scope = Scope.objects.get(pk=1)
        self.assertEqual(
            '/gtd/lists/scope1/',
            add_scope(self.s, scope)
            )
    def test_no_scope(self):
        self.assertEqual(
            '/gtd/lists/',
            add_scope(self.s)
            )


class ScopeAPI(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def setUp(self):
        self.url = reverse('scope_api');
        self.user = User.objects.get(username='test')
        self.assertTrue(
            self.client.login(
                username=self.user.username, password='secret')
        )
        self.scopes = Scope.objects.filter(owner=self.user)
        self.scopes = self.scopes | Scope.objects.filter(public=True)
    def test_get_scope_collection(self):
        response = self.client.get(self.url)
        expected = serializers.serialize('json', self.scopes)
        self.assertEqual(
            response.content,
            expected,
        )
    def test_scope_get_visible(self):
        expected = []
        for scope in self.scopes:
            expected.append(repr(scope))
        self.assertQuerysetEqual(
            Scope.get_visible(user=self.user),
            expected,
            ordered=False,
        )


class ContextAPI(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def setUp(self):
        self.url = reverse('context_api');
        self.user = User.objects.get(username='test')
        self.assertTrue(
            self.client.login(
                username=self.user.username, password='secret')
        )
        self.contexts = Context.objects.filter(owner=self.user)
        self.contexts = self.contexts | Context.objects.filter(owner=None)

    def test_get_context_collection(self):
        response = self.client.get(self.url)
        r = json.loads(response.content)
        expected = serializers.serialize('json', self.contexts, fields=('name'))
        self.assertEqual(
            response.content,
            expected,
        )

    def test_context_num_querysets(self):
        """
        Make sure the Context.get_visible() is a minimal number of
        queries.
        """
        def hit_db():
            self.client.get(self.url)
        self.assertNumQueries(
            3,
            hit_db,
        )

class OverdueFilter(TestCase):
    """Tests the `overdue` node method that makes dates into
    prettier "in 1 day" strings, etc."""
    fixtures = ['gtd-test.json']
    def setUp(self):
        self.node = Node.objects.get(pk=1)
    def test_filter_exists(self):
        self.assertEqual(
            self.node.overdue.__class__.__name__,
            'instancemethod')
        self.node.test_date = dt.datetime.now().date()
        self.assertEqual(
            self.node.overdue('test_date').__class__.__name__,
            'unicode')
        # Test behavior if field is None
        self.node.none_field = None
        self.assertEqual(
            self.node.overdue('none_field'),
            ''
        )
    def test_simple_date(self):
        self.node.yesterday = (dt.datetime.now() + dt.timedelta(-1)).date()
        self.assertEqual(
            self.node.overdue(
                'yesterday', future=True),
            '1 day ago')
        self.node.yesterday = self.node.yesterday + dt.timedelta(-1)
        self.assertEqual(
            self.node.overdue('yesterday', future=True),
            '2 days ago')
    def test_future_date(self):
        self.node.tomorrow = (dt.datetime.now() + dt.timedelta(1)).date()
        self.assertEqual(
            self.node.overdue('tomorrow', future=True),
            'in 1 day')
        self.node.tomorrow = self.node.tomorrow + dt.timedelta(1)
        self.assertEqual(
            self.node.overdue('tomorrow', future=True),
            'in 2 days')

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
            isinstance(generate_url(), unicode),
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
    """Tests the methods of TodoState that retrieves the list of "in play"
    todo states.
    """
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
            'Expected: ' + str(len(TodoState.get_visible())+1) + '\nGot: ' +
            str(len(result))
        )
    def test_get_visible(self):
        user = User.objects.get(pk=1)
        expected = TodoState.objects.filter(Q(owner=user) | Q(owner=None))
        self.assertEqual(
            list(expected),
            list(TodoState.get_visible(user))
            )


class AgendaNodes(TestCase):
    """Make sure the correct nodes show up in the agenda view"""
    fixtures = ['test-users.json', 'gtd-env.json', 'gtd-test.json']
    def setUp(self):
        self.user = User.objects.get(username='test')
        self.assertTrue(
            self.client.login(
                username='test', password='secret')
        )
        self.datestring = '2013-05-14'
        self.url = reverse(
            'agenda_display',
            kwargs={'date': self.datestring})

    def test_future_nodes(self):
        """Test if nodes scheduled for the future are not shown in
        today's agenda"""
        future_node = Node.objects.get(pk=16)
        response = self.client.get(self.url)
        self.assertNotContains(
            response,
            future_node.title,
            status_code=200,
            msg_prefix='Future node found in today\'s agenda'
        )


class ListViewQueryset(TestCase):
    """The get_queryset() method of the NodeListView class"""
    fixtures = ['test-users.json', 'gtd-env.json', 'gtd-test.json']
    def setUp(self):
        self.view = NodeListView()
        self.view.url_data = {}
        self.view.scope_url_data = {}
        self.factory = RequestFactory()
        self.user = User.objects.get(pk=1)
        self.view.request = self.factory.get('/gtd/lists/')
        self.view.request.user = self.user
    def test_returns_queryset(self):
        self.view.request = self.factory.get('/gtd/lists/')
        self.view.request.user = self.user
        qs = self.view.get_queryset()
        self.assertEqual(
            qs.__class__.__name__,
            'NodeQuerySet',
        )
    def test_filter_todo_state(self):
        """Check that passing a todostate to the filter works"""
        todo = TodoState.objects.filter(pk=1)
        self.view.url_data = {'todo_state': todo}
        qs = self.view.get_queryset()
        expected = Node.objects.assigned(self.user)
        expected = expected.filter(todo_state=todo)
        self.assertQuerysetEqual(
            qs,
            [repr(x) for x in expected],
            ordered=False,
        )

    def test_filter_scope(self):
        scope = Scope.objects.get(pk=1)
        self.view.url_data['scope'] = scope
        qs = self.view.get_queryset()
        expected = Node.objects.assigned(self.user)
        expected = expected.filter(scope=scope)
        self.assertQuerysetEqual(
            qs,
            [repr(x) for x in expected],
            ordered=False,
        )

    def test_context_filtering(self):
        context = Context.objects.get(pk=1)
        self.view.url_data['context'] = context
        qs = self.view.get_queryset()
        expected = context.apply(Node.objects.assigned(self.user))
        self.assertQuerysetEqual(
            qs,
            [repr(x) for x in expected],
            ordered=False,
        )


class ListAPI(TestCase):
    """
    Getting a list of actions via AJAX. Selection of Node objects is
    tested in the ListViewQueryset test class above.
    """
    fixtures = ['test-users.json', 'gtd-env.json', 'gtd-test.json']
    def setUp(self):
        self.user = User.objects.get(username='test')
        self.view = NodeListView()
        self.factory = RequestFactory()
        self.assertTrue(
            self.client.login(
                username=self.user.username, password='secret')
        )
    def test_parse_get_params(self):
        states = TodoState.objects.filter(pk__in=[1, 2])
        scope = Scope.objects.get(pk=1)
        context = Context.objects.get(pk=2)
        request = self.factory.get(
            '/gtd/list',
            {
                'todo_state': ['1', '2'],
                'scope': ['1'],
                'context': ['2']
            },
        )
        request.is_json = True
        request.user = self.user
        self.view.dispatch(request)
        self.view.get(request)
        self.assertQuerysetEqual(
            self.view.url_data['todo_state'],
            [repr(x) for x in states]
        )
        self.assertEqual(
            self.view.url_data['scope'],
            scope
        )
        self.assertEqual(
            self.view.url_data['context'],
            context
        )
    def test_missing_params(self):
        """Ensure the view ignores parameters that are empty strings"""
        request = self.factory.get(
            '/gtd/list',
            {'context': '',
             'scope': '',
             'todo_state': ''}
        )
        request.is_json = True
        request.user = self.user
        self.view.dispatch(request)
        self.view.get(request)
        self.assertEqual(
            self.view.url_data.get('Context', None),
            None
        )


class MultiUser(TestCase):
    """Tests for multi-user support in the gtd app"""
    fixtures = ['test-users.json', 'gtd-env.json', 'gtd-test.json']
    def setUp(self):
        self.factory = RequestFactory()
        self.user1 = User.objects.get(pk=1)
        self.user2 = User.objects.get(pk=2)
        self.assertTrue(
            self.client.login(
                username='test', password='secret')
        )

    def test_get_nodes(self):
        self.assertEqual(
            'instancemethod',
            Node.objects.owned.__class__.__name__
            )
        url = reverse('node_object')
        request = self.factory.get(url)
        request.user = self.user2
        self.assertEqual(
            'NodeQuerySet',
            Node.objects.owned(request.user).__class__.__name__)
        self.assertEqual(
            list(Node.objects.filter(owner = self.user2)),
            list(Node.objects.owned(request.user, get_archived=True))
            )
        request.user = AnonymousUser()
        self.assertFalse(
            request.user.is_authenticated()
            )
        self.assertEqual(
            list(Node.objects.none()),
            list(Node.objects.owned(request.user))
            )

    def test_auto_contact(self):
        """Determine if adding a user automatically creates a contact"""
        user = User()
        user.save()
        self.assertEqual(
            user.contact_set.count(),
            1,
            'Creating a new user does not create a new Contact'
            )

    def test_get_mine(self):
        """Test the Node.get_mine() method. It returns a queryset of all
        Node objects that require the current users attention.
        """
        self.assertEqual(
            'instancemethod',
            Node.objects.mine.__class__.__name__
            )
        results = Node.objects.mine(self.user2)
        contact = self.user2.contact_set.all()
        self.assertEqual(
            'NodeQuerySet',
            results.__class__.__name__
            )
        self.assertTrue(
            len(results) > 0,
            )
        # Should match nodes where user2 is in owner, users or assigned
        for node in results:
            self.assertTrue(
                node.owner == self.user2 or self.user2 in node.users.all() or node.assigned in contact,
                'Node {0} not related to {1}'.format(
                    node, self.user2)
                )
            self.assertFalse(
                node.archived,
                'Node {0} is archived'.format(node)
                )

    def test_assigned_in_responses(self):
        """Make sure that Nodes to which the user is assigned show up in the
        right places."""
        contact = self.user1.contact_set.all()[0]
        assigned = contact.assigned_node_set.all()[0]
        if assigned.parent:
            kwargs={'pk': assigned.parent.pk}
        else:
            kwargs={}
        new_url = reverse('node_object', kwargs=kwargs)
        response = self.client.get(new_url)
        self.assertContains(
            response,
            assigned.title,
            )

    def test_agenda_view(self):
        url = reverse('gtd.views.agenda_display')
        response = self.client.get(url)
        self.assertContains(
            response,
            'Test user assigned node',
            status_code=200
            )
        self.assertContains(
            response,
            'Test user others node',
            status_code=200
            )
        self.assertContains(
            response,
            'Test user owned node',
            status_code=200
            )
        self.assertNotContains(
            response,
            'not test-users node',
            status_code=200,
            msg_prefix='Agenda view',
            )

    def test_list_view(self):
        url = reverse('list_display')
        response = self.client.get(url)
        self.assertContains(
            response,
            'Test user owned node',
            status_code=200
            )
        self.assertContains(
            response,
            'Test user assigned node',
            status_code=200
            )
        self.assertNotContains(
            response,
            'Test user others node',
            status_code=200
            )

    def test_bad_list_view(self):
        """User 'test' does not have access to this todo_state"""
        self.assertTrue(
            self.client.login(username='test', password='secret')
            )
        url = reverse('list_display')
        response = self.client.get(url, {'todo_state': 10})
        self.assertEqual(
            400,
            response.status_code
            )
    def test_node_view(self):
        url = reverse('node_object')
        response = self.client.get(url)
        self.assertContains(
            response,
            'Test user owned node',
            status_code=200
            )
        self.assertNotContains(
            response,
            'test-users node',
            status_code=200,
            msg_prefix='node view',
            )

    def test_get_unauthorized_node(self):
        """Trying to access another person's node by URL
        should redirect the user to the login screen"""
        node = Node.objects.get(pk=9)
        url = reverse('node_object', kwargs={'pk': node.pk,
                                             'slug': node.slug})
        response = self.client.get(url)
        self.assertEqual(
            302,
            response.status_code,
        )
        self.assertEqual(
            response['Location'],
            'http://testserver/accounts/login/?next=/gtd/node/9/',
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

class TimeZones(TestCase):
    """Define various aspects of datetime objects, specifically
    as the reltate to timezone support"""
    fixtures = ['test-users.json', 'gtd-env.json', 'gtd-test.json']
    def setUp(self):
        self.node = Node.objects.get(pk=15)
        self.user = User.objects.get(username='test')
        self.assertTrue(
            self.client.login(username=self.user.username,
                              password='secret')
        )
    def test_agenda_timezone(self):
        datestring = '2013-01-17'
        agenda_url = reverse(
            'agenda_display',
            kwargs={'date': datestring}
        )
        response = self.client.get(agenda_url)
        self.assertContains(
            response,
            self.node.title,
            status_code=200,
            msg_prefix='Agenda does not have time specific node on the right day',
        )
        self.assertContains(
            response,
            '<input type="text" name="date" value="{0}" class="input-medium datepicker form-control" placeholder="Change date..."></input>'.format(datestring),
            status_code=200,
            msg_prefix='Incorrect date set in input date changer'
        )


class DBOptimization(TestCase):
    """Define and test the optimal database plan for different views"""
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def setUp(self):
        self.user = User.objects.get(username='test')
        self.assertTrue(
            self.client.login(username='test', password='secret')
        )
    def test_display_list(self):
        response = self.client.get(
            reverse('list_display')
        )
        self.assertNumQueries(
            7,
            self.client.get,
            reverse('list_display'),
        )
    def test_as_json_db(self):
        node = Node.objects.select_related('todo_state')
        node = Node.objects.get(pk=1)
        self.assertNumQueries(
            3,
            node.as_json,
            )
    def test_node_view(self):
        self.assertNumQueries(
            10,
            self.client.get,
            '/gtd/lists/next/',
        )

class DescendantsAPI(TestCase):
    """Tests for getting a list of descendants of a given node
    of varying levels."""
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def setUp(self):
        self.node = Node.objects.get(pk=1)
        self.url = reverse('node_descendants',
                           kwargs={'ancestor_pk': self.node.pk})
        self.assertTrue(
            self.client.login(username='test', password='secret')
        )
    def test_basic_view_behavior(self):
        """Make sure that the view uses the class based system"""
        desc_view = Descendants()
        self.assertTrue(
            isinstance(desc_view, View),
            u'Descendants is not a subclass of generic View'
        )
        response = self.client.get(self.url)
        self.assertEqual(
            200,
            response.status_code,
        )
    def test_return_offset1(self):
        self.maxDiff = None
        response = self.client.get(
            self.url,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        response_text = response.content
        response = json.loads(response_text)
        self.assertTrue(
            isinstance(response, list),
            'request did not return a list (got {0})'.format(response.__class__)
        )
        target = Node.objects.get(pk=1).get_descendants().filter(
            level = self.node.level + 1
        )
        response_qs = Node.objects.filter(
            id__in=[node['pk'] for node in response]
        )
        # Test that response returns the right nodes
        self.assertEqual(
            list(target),
            list(response_qs),
        )
        json_target = json.loads(serializers.serialize('json', target))
        self.assertEqual(
            json_target,
            response
        )

class NodeAPI(TestCase):
    """Check the /gtd/node/<node_pk>/<slug>/ functionality.
    API exchanges objects from django.core.serializers
    in json with following keys:
    - obj['pk'] -> Node.id
    - obj['model'] -> django model reference, eg. 'gtd.node'
    - obj['fields'] -> object (dict) of model fields"""
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def setUp(self):
        self.node = Node.objects.get(pk=1)
        self.new_url = reverse('node_object')
        self.url = reverse(
            'node_object',
            kwargs={'pk': self.node.pk}
        )
        self.view = NodeView()
        self.repeating_node = Node.objects.get(pk=7)
        self.repeating_url = reverse(
            'node_object',
            kwargs={'pk': self.repeating_node.pk}
        )
        self.slug = slugify(self.node.title)
        self.url_slug = reverse(
            'node_object',
            kwargs={'pk': self.node.pk,
                    'slug': self.node.slug}
        )
        self.actionable = TodoState.objects.get(abbreviation='NEXT')
        self.closed = TodoState.objects.get(abbreviation='DONE')
        self.user = User.objects.get(username='test')
        self.assertTrue(
            self.client.login(username=self.user.username, password='secret')
        )
    def test_url_slug(self):
        """Check if using /<pk>/<slug>/operates as expected"""
        response = self.client.get(
            self.url_slug,
        )
        self.assertEqual(
            200,
            response.status_code,
            'Slugged response doesn\'t return 200 ({0})'.format(
                response.status_code)
        )
        response = self.client.get(
            self.url
        )
        self.assertEqual(
            302,
            response.status_code,
            'Non-slugged response doesn\'t return 302'
        )
    def test_json_get(self):
        """Check if getting the node attributes by ajax works as expected"""
        response = self.client.get(
            self.url_slug,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_ACCEPT='application/json'
        )
        r = json.loads(response.content)
        self.assertEqual(
            self.node.pk,
            r['pk'],
        )

    def test_get_node_collection(self):
        """Check that a collection of nodes can be retried with optional filters
        applied by parameters"""
        nodes = Node.objects.mine(self.user, get_archived=True)
        response = self.client.get(
            '/gtd/node/',
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_ACCEPT='application/json'
        )
        r = json.loads(response.content)
        self.assertQuerysetEqual(
            nodes,
            [node['pk'] for node in r],
            transform = lambda x: x.pk,
            ordered=False,
        )
        # Now filter by some parameters
        nodes = Node.objects.mine(self.user).filter(parent_id='1')
        response = self.client.get(
            '/gtd/node/',
            {'parent_id': '1'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_ACCEPT='application/json',
        )
        r = json.loads(response.content)
        self.assertQuerysetEqual(
            nodes,
            [node['pk'] for node in r],
            transform = lambda x: x.pk
        )
        # Root level nodes by parameter
        nodes = Node.objects.mine(self.user, get_archived=True)
        nodes = nodes.filter(parent=None)
        response = self.client.get(
            '/gtd/node/',
            {'parent_id': '0'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_ACCEPT='application/json',
        )
        r = json.loads(response.content)
        self.assertQuerysetEqual(
            nodes,
            [node['pk'] for node in r],
            transform = lambda x: x.pk
        )

    # def test_json_get_collection_optimization(self):
    #     """Make sure that getting nodes by AJAX is database efficient"""
    #     def get_nodes():
    #         list(Node.objects.mine(self.user))
    #     self.assertNumQueries(
    #         1,
    #         get_nodes
    #     )
    #     def get_response():
    #         factory = RequestFactory()
    #         request = factory.get(
    #             '/gtd/node',
    #         )
    #         request.user = self.user
    #         return self.view.get_json(request)
    #         # return self.client.get(
    #         #     '/gtd/node/',
    #         #     HTTP_X_REQUESTED_WITH='XMLHttpRequest',
    #         #     HTTP_ACCEPT='application/json'
    #         # )
    #     self.assertNumQueries(
    #         1,
    #         get_response
    #     )

    def test_json_put(self):
        """Check if setting attributes by ajax works as expected"""
        self.assertNotEqual(
            1,
            self.node.todo_state.pk,
            'node statrts out with todo_state 2 (next test will fail)'
        )
        put_data = json.dumps({
            'pk': self.node.pk,
            'model': 'gtd.node',
            'fields': {
                'todo_state': 1,
                'archived': 'true',
            }
        })
        response = self.client.put(
            self.url_slug,
            put_data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            content_type='application/json',
        )
        json_response = json.loads(response.content)
        self.assertEqual(
            1,
            json_response['pk'],
            'AJAX doesn\'t return correct json object'
        )
        self.assertEqual(
            200,
            response.status_code,
            'changing todo state doesn\'t return 200 {0}'.format(
                response.status_code)
        )
        self.node = Node.objects.get(pk=self.node.pk)
        self.assertEqual(
            1,
            self.node.todo_state.pk,
            'todo_state not updated after ajax POST'
        )
        self.assertTrue(
            self.node.archived,
            'node not archived after ajax POST'
        )
        put_data = json.dumps({
            'fields': {
                'archived': 'false'
            }
        })
        response = self.client.put(
            self.url_slug,
            put_data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            content_type='application/json',
        )
        self.node = Node.objects.get(pk=self.node.pk)
        self.assertTrue(
            not self.node.archived,
            'node not un-archived after ajax POST'
        )

    def test_archive_by_json(self):
        """Tests archiving/unarchived node by AJAX"""
        self.assertTrue(
            not self.node.archived,
            'Node starts out archived'
        )
        self.node.archived = True
        data = self.node.as_json()
        response = self.client.put(
            self.url, data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            content_type='application/json'
            )
        self.assertEqual(
            200,
            response.status_code
            )
        node = Node.objects.get(pk = self.node.pk)
        self.assertTrue(
            node.archived,
            'Node does not become archived after changing via AJAX'
        )

    def test_text_through_json(self):
        """Check JSON editing (ie using Aloha editor)"""
        self.assertEqual(
            '',
            self.node.text
            )
        text = '<strong>evilness</strong>'
        self.node.text = text
        data = self.node.as_json()
        response = self.client.put(
            self.url, data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            content_type='application/json',
            )
        self.assertEqual(
            200,
            response.status_code
            )
        node = Node.objects.get(pk = self.node.pk)
        self.assertEqual(
            conditional_escape(text),
            node.text
            )
        # Check that it allows <b> and other whitelist elements
        text = '<b>evilness</b>'
        self.node.text = text
        data = self.node.as_json()
        response = self.client.put(
            self.url, data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            content_type='application/json'
            )
        self.assertEqual(
            200,
            response.status_code
            )
        node = Node.objects.get(pk = self.node.pk)
        self.assertEqual(
            text,
            node.text
            )

    def test_edit_autoupdate_off_by_json(self):
        """Tests changing a repeating node by JSON with auto_update off"""
        # old_state = node.todo_state
        # new_state = TodoState.objects.get(pk=3)
        self.assertTrue(
            self.repeating_node.todo_state.actionable,
            'Initial todoState is actionable'
            )
        self.repeating_node.todo_state = self.closed
        data = self.repeating_node.as_json()
        self.client.put(
            self.repeating_url, data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            content_type='application/json'
            )
        node = Node.objects.get(pk=self.repeating_node.pk)
        self.assertEqual(
            self.closed,
            node.todo_state
            )

    def test_edit_autoupdate_by_json(self):
        """If a repeating node has it's todo state changed by JSON,
        it requires special handling with auto_update on."""
        self.assertEqual(
            self.actionable,
            self.repeating_node.todo_state,
            'Node does not start out actionable'
        )
        self.assertTrue(
            self.repeating_node.repeats,
            'Node does not start out repeating'
        )
        # Execute edit via AJAX
        self.repeating_node.todo_state = self.closed
        data = self.repeating_node.as_json()
        # Add the auto-repeat field
        data = '{0}, "auto_update": true{1}'.format(data[:-2], data[-2:])
        response = self.client.put(
            self.repeating_url, data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            content_type='application/json'
            )
        self.assertEqual(
            200,
            response.status_code,
            'getJSON call did not return HTTP 200'
            )
        node = Node.objects.get(pk=self.repeating_node.pk)
        self.assertEqual(
            self.actionable,
            node.todo_state
            )
        jresponse = json.loads(response.content)
        self.assertEqual(
            self.actionable.pk,
            jresponse['fields']['todo_state'],
            )

    def test_add_node_through_json(self):
        """Add a new node by submitting the whole form through AJAX"""
        node = Node()
        data = model_to_dict(node)
        node.title = 'new node'
        node.repeats = False
        node.owner = User.objects.get(pk=1)
        node.repeating_unit = None
        node.repeating_number = None
        node.scheduled = None
        node.deadline = None
        node.todo_state = None
        node.save()
        node.scope.add(Scope.objects.get(pk=1))
        data = node.as_json()
        data = json.loads(data)
        data['pk'] = None
        data = json.dumps(data)
        node.scope = Scope.objects.filter(pk=1)
        response = self.client.post(
            self.new_url, data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            content_type='application/json'
            )
        self.assertEqual(
            200,
            response.status_code)
        response = json.loads(response.content)
        new_node = Node.objects.get(pk=response['pk'])
        self.assertEqual(
            1,
            new_node.scope.all().count(),
            'No scopes set when adding node through JSON'
        )
        self.assertEqual(
            Scope.objects.get(pk=1),
            new_node.scope.all()[0],
            'Scope not set when adding node through json'
        )


class TreeAPI(TestCase):
    """Check the /gtd/tree/<node_pk>/ functionality.
    API exchanges list of objects in tree order
    using django.core.serializers in json with
    following keys:
    - obj['pk'] -> Node.id
    - obj['model'] -> django model reference, eg. 'gtd.node'
    - obj['fields'] -> object (dict) of model fields"""
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def setUp(self):
        self.node = Node.objects.get(pk=1)
        self.url = reverse('tree_view',
                           kwargs={'tree_id': self.node.tree_id})
        self.assertTrue(
            self.client.login(username='test', password='secret')
        )
    def test_json_get(self):
        """Make sure the user can get a JSON list of nodes in this tree"""
        response = self.client.get(self.url)
        r = json.loads(response.content)
        self.assertEqual(
            Node.objects.filter(tree_id=self.node.tree_id).count(),
            len(r)
        )
