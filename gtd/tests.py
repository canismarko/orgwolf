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

from django.contrib.auth.models import AnonymousUser
from django.core import serializers
from django.core.exceptions import ValidationError
from django.core.urlresolvers import reverse
from django.db.models import Q
from django.db.models.query import QuerySet
from django.http import Http404
from django.template.defaultfilters import slugify
from django.test import TestCase
from django.test.client import RequestFactory
from django.utils.html import conditional_escape
from django.utils.timezone import get_current_timezone
from django.views.generic import View
from rest_framework.renderers import JSONRenderer

from gtd.models import Node, TodoState
from gtd.models import Context, FocusArea
from gtd.serializers import (NodeSerializer, NodeListSerializer,
                             CalendarSerializer, CalendarDeadlineSerializer)
from gtd.shortcuts import order_nodes, load_fixture
from gtd.templatetags.gtd_extras import escape_html
from gtd.templatetags.gtd_extras import breadcrumbs
from gtd.views import NodeView
from orgwolf.models import OrgWolfUser as User
from plugins.deferred import MessageHandler as DeferredMessageHandler
from wolfmail.models import Message


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

    def test_set_fields(self):
        node = Node.objects.get(pk=1)
        node.set_fields(
            {'focus_areas': [3]}
        )
        self.assertEqual(
            node.focus_areas.all().count(),
            1
        )
        self.assertEqual(
            node.focus_areas.all().first().pk,
            3
        )


class NodeManagers(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def setUp(self):
        self.user = User.objects.get(username='test')

    def test_assigned(self):
        qs = Node.objects.filter(pk=1)
        assigned = qs.assigned(self.user)
        self.assertQuerysetEqual(
            assigned,
            [repr(x) for x in qs],
        )
        self.assertQuerysetEqual(
            Node.objects.assigned(self.user),
            [repr(x) for x in Node.objects.all().assigned(self.user)],
            ordered=False
        )

    def test_mine(self):
        # Test owned node
        qs = Node.objects.filter(pk=1)
        mine = qs.mine(self.user)
        self.assertQuerysetEqual(
            mine,
            [repr(x) for x in qs],
        )
        self.assertQuerysetEqual(
            Node.objects.mine(self.user),
            [repr(x) for x in Node.objects.all().mine(self.user)],
            ordered=False
        )
        qs = Node.objects.filter(owner=None)
        mine = qs.mine(self.user)
        self.assertEqual(
            mine.count(),
            0
        )

    def test_owned(self):
        qs = Node.objects.filter(pk=1)
        owned = qs.owned(self.user)
        self.assertQuerysetEqual(
            owned,
            [repr(x) for x in qs],
        )
        self.assertQuerysetEqual(
            Node.objects.owned(self.user),
            [repr(x) for x in Node.objects.all().owned(self.user)],
            ordered=False
        )

    def test_get_collections(self):
        """Test that <Node>.get_deescendants() etc... returns a NodeQuerySet"""
        node = Node.objects.get(pk=1)
        self.assertEqual(
            node.get_descendants().__class__.__name__,
            'NodeQuerySet'
        )


class NodeArchive(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def test_auto_archive(self):
        """Test that a node being closed gets auto archived"""
        node = Node.objects.get(pk=11)
        self.assertFalse(node.archived)
        self.assertFalse(node.todo_state.closed)
        done = TodoState.objects.get(abbreviation='DONE')
        node.todo_state = done
        node.auto_update = True
        node.save()
        node = Node.objects.get(pk=11)
        self.assertTrue(node.todo_state.closed)
        self.assertTrue(node.archived)

    def test_keep_node_with_text(self):
        """If a Node is closed but has text, don't archive"""
        node = Node.objects.get(pk=11)
        done = TodoState.objects.get(abbreviation='DONE')
        node.todo_state = done
        node.text = 'Some text, yo.'
        node.auto_update = True
        node.save()
        node = Node.objects.get(pk=11)
        self.assertTrue(node.todo_state.closed)
        self.assertFalse(node.archived)


class NodeSignals(TestCase):
    """Test Node models signals, for example pre_save"""
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']

    def test_descendants_add_focus_areas(self):
        """
        Check that changing the focus_areas of a Node
        updates all its descendants.
        """
        parent = Node.objects.get(pk=1)
        child = parent.get_descendants().first()
        new_focus_area = FocusArea.objects.get(pk=3)
        parent.focus_areas.add(new_focus_area)
        self.assertTrue(
            child.focus_areas.filter(pk=new_focus_area.pk).exists(),
            'New focus_area not added to child Node'
        )

    def test_descendants_remove_focus_areas(self):
        """Changing the FocusArea of a Node should update all its descendants"""
        parent = Node.objects.get(pk=1)
        child = parent.get_descendants().first()
        old_focus_area = FocusArea.objects.get(pk=1)
        parent.focus_areas.remove(old_focus_area)
        self.assertFalse(
            child.focus_areas.filter(pk=old_focus_area.pk).exists(),
            'New focus_area not removed from child Node'
        )


class RepeatingNodeTest(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']

    def test_scheduled_repetition(self):
        """Make sure the item is rescheduled properly."""
        node = Node.objects.get(pk=5)
        node.scheduled_date = dt.datetime(2012, 12, 31)
        node.deadline_date = dt.datetime(2012, 12, 31)
        closed = TodoState.objects.get(abbreviation='DONE')
        actionable = TodoState.objects.get(abbreviation='ACTN')
        self.assertTrue(node.repeats)
        # Close the node
        node.todo_state = closed
        node.auto_update = True
        node.save()
        node = Node.objects.get(pk=node.pk)
        # The state shouldn't actually change since it's repeating
        self.assertEqual(actionable, node.todo_state)
        new_date = dt.datetime(2013, 1, 3, tzinfo=get_current_timezone())
        self.assertEqual(new_date.date(), node.scheduled_date)
        self.assertEqual(new_date.date(), node.deadline_date)

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

    def test_home_tag(self):
        all_nodes_qs = Node.objects.filter(
            Q(tag_string=':work:')|Q(tag_string=':home:')
        )
        work = Context.objects.get(name='Office')
        home = Context.objects.get(name='House')
        work_nodes = Node.objects.filter(Q(pk=7)|Q(pk=18))
        self.assertEqual(
            list(work_nodes),
            list(work.apply(all_nodes_qs))
            )
        self.assertEqual(
            list(Node.objects.filter(title='Home Node')),
            list(home.apply(all_nodes_qs))
            )

    def test_get_owned(self):
        user = User.objects.get(pk=1)
        contexts = Context.get_visible(user)
        self.assertEqual(
            list(Context.objects.filter(owner=user)),
            list(contexts)
            )
    def test_context_person(self):
        context = Context.objects.get(pk=3)
        result = context.apply()
        self.assertEqual(
            1,
            result.count(),
            'Filtering person context returns {0} nodes instead of 1'.format(
                result.count())
        )


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
        # self.assertEqual(
        #     'method',
        #     node.as_json.__class__.__name__
        #     )
        self.assertTrue(hasattr(node.as_json, '__class__'))
        response = node.as_json()
        self.assertIn(
            response.__class__.__name__,
            ['str', 'unicode'],
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
            list(node.focus_areas.values_list('pk', flat=True)),
            response_dict['fields']['focus_areas']
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

    def test_load_json(self):
        """
        Test the shortcut function that loads json from files
        """
        node_1 = Node.objects.get(pk=1)
        f = open('gtd/fixtures/gtd-test.json')
        json_data = json.loads(f.read())
        f.seek(0)
        qs = load_fixture(f)
        self.assertTrue(
            isinstance(qs, QuerySet),
            'load_fixture() does not return a queryset'
        )
        # Are the correct items processed
        self.assertQuerysetEqual(
            qs,
            [x['fields']['title'] for x in json_data if x['model'] == 'gtd.node'],
            transform=lambda x: x.title,
            ordered=False,
        )
        # Make sure that tree structure is preserved and duplicated
        node_2 = Node.objects.exclude(pk=node_1.pk).get(title=node_1.title)
        self.assertNotEqual(
            node_1.tree_id,
            node_2.tree_id
        )
        self.assertQuerysetEqual(
            Node.objects.filter(tree_id=node_1.tree_id),
            [repr(x) for x in Node.objects.filter(tree_id=node_2.tree_id)],
            ordered=False
        )
        self.assertQuerysetEqual(
            node_1.get_children(),
            [repr(x) for x in node_2.get_children()],
            ordered=False
        )



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

    def test_anonymous(self):
        node = Node()
        node.owner = None
        self.assertEqual(
            'read',
            node.access_level(AnonymousUser())
        )


class FocusAreaAPI(TestCase):
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']

    def setUp(self):
        self.url = reverse('focus_area_api');
        self.user = User.objects.get(username='test')
        self.assertTrue(
            self.client.login(
                username=self.user.username, password='secret')
        )
        self.focus_areas = FocusArea.objects.filter(owner=self.user)
        self.focus_areas = (FocusArea.objects.filter(owner=None)
                            | self.focus_areas)

    def test_get_focus_area_collection(self):
        response = self.client.get(self.url)
        expected = self.focus_areas.values()
        self.assertEqual(
            [x['id'] for x in json.loads(response.content.decode())],
            [x['id'] for x in expected],
        )

    def test_get_focus_area_anonymous(self):
        # Does the Focus Area interface return public focus if not logged in
        self.client.logout()
        response = self.client.get(self.url)
        expected = FocusArea.objects.filter(owner=None)
        self.assertEqual(
            [x['id'] for x in json.loads(response.content.decode())],
            [x.pk for x in expected],
        )

    def test_focus_area_get_visible(self):
        expected = []
        for focus_area in self.focus_areas:
            expected.append(repr(focus_area))
        self.assertQuerysetEqual(
            FocusArea.get_visible(user=self.user),
            expected,
            ordered=False,
        )


class TodoStateAPI(TestCase):
    fixtures = ['gtd-env.json', 'test-users.json']
    def setUp(self):
        self.user = User.objects.get(username='test')
        self.assertTrue(
            self.client.login(
                username=self.user.username, password='secret')
        )

    def test_get_uses_serializer(self):
        """
        Ensure that the API provides the full collection of relevant
        todo states.
        """
        response = self.client.get(reverse('todo_state'))
        r = json.loads(response.content.decode())
        self.assertIn(
            'id',
            r[0].keys()
        )

    def test_create_color(self):
        state = TodoState.objects.get(pk=1)
        color_obj = state.color()
        color_dict = {
            'red': color_obj.red,
            'green': color_obj.green,
            'blue': color_obj.blue,
            'alpha': color_obj.get_alpha()
        }
        response = self.client.get(
            reverse('todo_state', kwargs={'pk': state.pk}))
        r = json.loads(response.content.decode())
        self.assertIn(
            'color',
            r.keys()
        )
        self.assertEqual(
            r['color'],
            color_dict
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
        r = json.loads(response.content.decode())
        expected = [x['name'] for x in r]
        self.assertQuerysetEqual(
            self.contexts,
            expected,
            transform=lambda x: x.name,
            ordered=False
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
    fixtures = ['gtd-test.json', 'test-users.json', 'gtd-env.json']

    def setUp(self):
        self.node = Node.objects.get(pk=1)

    def test_filter_exists(self):
        self.assertTrue(self.node.overdue, '__call__')
        self.node.test_date = dt.datetime.now().date()
        self.assertIn(
            self.node.overdue('test_date').__class__.__name__,
            ['str', 'unicode'])
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
            'str',
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


class ListViewQueryset(TestCase):
    """The get_actions_list() method of the NodeView class"""
    fixtures = ['test-users.json', 'gtd-env.json', 'gtd-test.json']

    def setUp(self):
        self.view = NodeView()
        self.user = User.objects.get(pk=1)
        self.factory = RequestFactory()
        self.url = reverse('node_object')
        self.request = self.factory.get(self.url)
        self.request.user = self.user

    def test_returns_queryset(self):
        qs = self.view.get_actions_list(self.request)
        self.assertEqual(
            qs.__class__.__name__,
            'NodeQuerySet',
        )

    def test_filter_todo_state(self):
        """Check that passing a todostate to the filter works"""
        todo = TodoState.objects.get(pk=1)
        request = self.factory.get(self.url, {'todo_state': todo.pk})
        request.user = self.user
        qs = self.view.get_actions_list(request)
        expected = Node.objects.assigned(self.user)
        expected = expected.filter(todo_state=todo)
        self.assertQuerysetEqual(
            qs,
            [repr(x) for x in expected],
            ordered=False,
        )

    def test_filter_focus_area(self):
        focus_area = FocusArea.objects.get(pk=1)
        request = self.factory.get(self.url, {'focus_area': focus_area.pk})
        request.user = self.user
        qs = self.view.get_actions_list(request)
        expected = Node.objects.assigned(self.user)
        expected = expected.filter(focus_areas=focus_area)
        self.assertQuerysetEqual(
            qs,
            [repr(x) for x in expected],
            ordered=False,
        )

    def test_context_filtering(self):
        context = Context.objects.get(pk=1)
        request = self.factory.get(self.url, {'context': context.pk})
        request.user = self.user
        request.session = {}
        qs = self.view.get_actions_list(request)
        expected = context.apply(Node.objects.assigned(self.user))
        self.assertQuerysetEqual(
            qs,
            [repr(x) for x in expected],
            ordered=False,
        )

    def test_db_optimization(self):
        """
        Make sure that the method uses the database efficiently when
        passing to a Serializer. Fundamentally, the database usage
        should be independent of the queryset length. Changes of a few
        queries could reflect changes in the serializer, changes of an
        order of magnititude probably mean broken DB optimization.
        """
        qs = self.view.get_actions_list(self.request)
        def hit_db():
            serializer = NodeSerializer(qs, many=True, request=self.request)
            serializer.data
        self.assertNumQueries(
            3,
            hit_db
        )


class ListAPI(TestCase):
    """
    Getting a list of actions via AJAX. Selection of Node objects is
    tested in the ListViewQueryset test class above.
    """
    fixtures = ['test-users.json', 'gtd-env.json', 'gtd-test.json']

    def setUp(self):
        self.user = User.objects.get(username='test')
        self.view = NodeView()
        self.factory = RequestFactory()
        self.assertTrue(
            self.client.login(
                username=self.user.username, password='secret')
        )

    def test_sets_session_context(self):
        context = Context.objects.get(pk=1)
        response = self.client.get(
            reverse('node_object'),
            {'context': context.pk},
            content_type='application/json'
        )
        self.assertEqual(
            self.client.session['context_id'],
            str(context.pk),
            'session[\'context_id\'] not set'
        )
        self.assertEqual(
            self.client.session['context_name'],
            context.name,
            'session[\'context_name\'] not set'
        )

    def test_unsets_session_context(self):
        response = self.client.get(
            reverse('node_object'),
            {'context': 0},
            content_type='application/json'
        )
        self.assertEqual(
            self.client.session['context_id'],
            None,
            'session[\'context_id\'] not unset'
        )

    def test_parent_param(self):
        """Test that adding the parent= param filters by parent"""
        parent = Node.objects.get(pk=1)
        response = self.client.get(
            reverse('node_object'),
            {
                'context': None,
                'parent': parent.pk,
            },
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_ACCEPT='application/json',
        )
        r = json.loads(response.content.decode())
        qs = parent.get_descendants(include_self=True).assigned(self.user)
        self.assertQuerysetEqual(
            qs,
            ['{0} - {1}'.format(x['id'], x['title']) for x in r],
            transform=lambda x: '{0} - {1}'.format(x.pk, x.title),
            ordered=False
        )

    def test_fields(self):
        """Very that only the correct fields are returned as json"""
        excluded = ['energy']
        included = ['id', 'tree_id', 'todo_state', 'tag_string', 'slug',
                    'deadline_date', 'deadline_time',
                    'scheduled_date', 'scheduled_time',
                    'root_id', 'root_name', 'focus_areas', 'priority',
                    'repeats']
        response = self.client.get(
            reverse('node_object'),
            {'context': None},
            content_type='application/json'
        )
        r = json.loads(response.content.decode())[0]
        node = Node.objects.get(pk=r['id'])
        for key in excluded:
            self.assertFalse(
                key in r.keys(),
                '"{}" returned from serializer'.format(key)
            )
        for key in included:
            self.assertTrue(
                key in r.keys(),
                '"{}" not returned from serializer'.format(key)
            )
        # Check root_id and root_name field values
        self.assertEqual(
            r['root_id'],
            node.get_root().pk,
        )
        self.assertEqual(
            r['root_name'],
            node.get_root().title
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
        self.assertTrue(hasattr(Node.objects.mine, '__call__'))
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


class HTMLEscape(TestCase):
    """Test the ability of node text to be converted safely to HTML"""
    fixtures = ['test-users.json']
    def setUp(self):
        self.f = escape_html
    def test_template_tag(self):
        """Test class type, return value, etc"""
        self.assertEqual(
            'function',
            self.f.__class__.__name__
            )
        self.assertIn(
            self.f('').__class__.__name__,
            ['SafeText', 'SafeBytes'],
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

    def test_auto_escape(self):
        """Check that Node text gets automatically escaped when being saved"""
        node = Node()
        node.title = 'Hello, world'
        node.owner = User.objects.get(pk=1)
        node.text = '<script>'
        node.save()
        self.assertEqual(
            node.text,
            '&lt;script&gt;'
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
        self.client.get(
            reverse('list_display')
        )
        self.assertNumQueries(
            3,
            self.client.get,
            reverse('list_display'),
        )


class NodeAPI(TestCase):
    """
    API exchanges objects from django.core.serializers
    in json with following keys:
    - obj['pk'] -> Node.id
    - obj['model'] -> django model reference, eg. 'gtd.node'
    - obj['fields'] -> object (dict) of model fields
    """
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
        self.actionable = TodoState.objects.get(abbreviation='NEXT')
        self.closed = TodoState.objects.get(abbreviation='DONE')
        self.user = User.objects.get(username='test')
        self.assertTrue(
            self.client.login(username=self.user.username, password='secret')
        )

    def test_json_get(self):
        """Check if getting the node attributes by ajax works as expected"""
        response = self.client.get(
            self.url,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_ACCEPT='application/json'
        )
        r = json.loads(response.content.decode())
        self.assertEqual(
            self.node.pk,
            r['id'],
        )

    def test_get_node_collection(self):
        """Check that a collection of nodes can be retrieved with optional
        filters applied by parameters"""
        nodes = Node.objects.mine(self.user, get_archived=True)
        url = reverse('node_object')
        response = self.client.get(
            url,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_ACCEPT='application/json'
        )
        r = json.loads(response.content.decode())
        self.assertQuerysetEqual(
            nodes,
            [node['id'] for node in r],
            transform = lambda x: x.pk,
            ordered=False,
        )
        # Now filter by some parameters
        nodes = Node.objects.mine(self.user).filter(parent_id='1')
        response = self.client.get(
            url,
            {'parent_id': '1'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_ACCEPT='application/json',
        )
        r = json.loads(response.content.decode())
        self.assertQuerysetEqual(
            nodes,
            [node['id'] for node in r],
            transform=lambda x: x.pk,
            ordered=False,
        )
        # Root level nodes by parameter
        nodes = Node.objects.mine(self.user, get_archived=False)
        nodes = nodes.filter(parent=None)
        response = self.client.get(
            url,
            {
                'parent_id': '0',
                'archived': 'false',
            },
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_ACCEPT='application/json',
        )
        r = json.loads(response.content.decode())
        self.assertQuerysetEqual(
            nodes,
            [node['id'] for node in r],
            transform=lambda x: x.pk,
            ordered=False,
        )

    def test_many_db_optimization(self):
        """Does a normal collection get query process Nodes efficiently?"""
        user = User.objects.get(pk=1)
        url = reverse('node_object')
        factory = RequestFactory()
        request = factory.get(url)
        request.user = self.user
        qs = NodeView().get_queryset(request)
        with self.assertNumQueries(3):
            serializer = NodeSerializer(qs, many=True, request=request)
            serializer.data

    def test_node_get_collection_multiple_states(self):
        """
        Test that passing more than one todo state for filtering
        returns nodes for both states
        """
        nodes = Node.objects.mine(self.user, get_archived=True).filter(
            todo_state__in=[1, 2])
        url = reverse('node_object')
        response = self.client.get(
            url,
            {'todo_state': ['1', '2']},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_ACCEPT='application/json',
        )
        r = json.loads(response.content.decode())
        self.assertQuerysetEqual(
            nodes,
            [node['title'] for node in r],
            transform=lambda x: x.title,
            ordered=False,
        )

    def test_node_get_collection_scheduled(self):
        """
        Test for a bug that doesn't correctly filter out
        future scheduled dates.
        """
        nodes = Node.objects.mine(self.user, get_archived=True).filter(
            scheduled_date__lte="2014-06-21")
        url = reverse('node_object')
        response = self.client.get(
            url,
            {'scheduled_date__lte': '2014-6-21'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_ACCEPT='application/json',
        )
        r = json.loads(response.content.decode())
        self.assertQuerysetEqual(
            nodes,
            [node['title'] for node in r],
            transform=lambda x: x.title,
            ordered=False,
        )

    def test_node_get_collection_anonymous(self):
        """
        Test that Nodes with user=None are returned
        if nobody is logged in.
        """
        expected = Node.objects.filter(owner=None)
        self.client.logout()
        response = self.client.get(
           reverse('node_object'),
            content_type='application/json'
        )
        r = json.loads(response.content.decode())
        self.assertQuerysetEqual(
            expected,
            [x['title'] for x in r],
            transform=lambda x: x.title
        )

    def test_node_list_serializer(self):
        """
        Ensure that API allows for selecting the actions list serializer
        """
        url = reverse('node_object')
        response = self.client.get(
            url, {'field_group': 'actions_list'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            HTTP_ACCEPT='application/json'
        )
        r = json.loads(response.content.decode())[0]
        node = Node.objects.get(pk=r['id'])
        self.assertEqual(
            r['root_name'],
            node.get_root().title
        )

    def test_put_read_only(self):
        """
        Does a successful PUT command properly return the read_only 'field'?
        """
        url = reverse('node_object', kwargs={'pk': 1})
        response = self.client.put(
            url,
            {},
            content_type="application/json")
        r = json.loads(response.content.decode())
        self.assertFalse(r['read_only'])

    def test_read_only_anonymous(self):
        node = Node.objects.filter(owner=None)[0]
        url = reverse('node_object', kwargs={'pk': node.pk})
        response = self.client.get(
            url,
            content_type='application/json'
        )
        r = json.loads(response.content.decode())
        self.assertTrue(
            r['read_only']
        )

    def test_read_only_owned(self):
        """
        Test that a Node the user owns is not read_only.
        """
        node = Node.objects.get(pk=1)
        url = reverse('node_object', kwargs={'pk': node.pk})
        response = self.client.get(
            url,
            content_type='application/json'
        )
        r = json.loads(response.content.decode())
        self.assertFalse(
            r['read_only']
        )

    def test_read_only_others(self):
        """
        Test that a Node in which the user is
        listed in node.others is read_only.
        """
        node = Node.objects.get(pk=10)
        url = reverse('node_object', kwargs={'pk': node.pk})
        def get_response():
            return self.client.get(
                url,
                content_type='application/json'
            )
        # Make sure we don't add extra queries
        self.assertNumQueries(
            6,
            get_response
        )
        response = get_response()
        r = json.loads(response.content.decode())
        self.assertTrue(
            r['read_only']
        )

    def test_json_put(self):
        """Check if setting attributes by ajax works as expected"""
        self.assertNotEqual(
            1,
            self.node.todo_state.pk,
            'node statrts out with todo_state 2 (next test will fail)'
        )
        put_data = json.dumps({
            'id': self.node.pk,
            'todo_state': 1,
            'archived': 'true',
            'lft': 98, # Should ignore tree meta data
        })
        response = self.client.put(
            self.url,
            put_data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            content_type='application/json',
        )
        json_response = json.loads(response.content.decode())
        self.assertEqual(
            1,
            json_response['id'],
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
        self.assertNotEqual(
            self.node.lft,
            98,
            'lft not ignored in Node PUT operation'
        )
        put_data = json.dumps({
            'archived': 'false'
        })
        response = self.client.put(
            self.url,
            put_data,
            content_type='application/json',
        )
        self.node = Node.objects.get(pk=self.node.pk)
        self.assertTrue(
            not self.node.archived,
            'node not un-archived after ajax POST'
        )

    def test_put_anonymous(self):
        """
        If the Node is public (owner=None), this API by PUT
        should return the modified Node but not actually
        save it to the database. Error if Node is owned.
        """
        # Check status code of PUTing owned nodes
        self.client.logout()
        new_title = 'PUT submitted fake title'
        response = self.client.put(
            self.url,
            json.dumps({'title': new_title}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
        # Now check PUTing public nodes
        anon_node = Node.objects.get(pk=24)
        old_title = anon_node.title
        url = reverse('node_object',
                      kwargs={'pk': anon_node.pk})
        response = self.client.put(
            url,
            json.dumps({'title': 'PUT submitted fake title'}),
            content_type='application/json'
        )
        r = json.loads(response.content.decode())
        db_node = Node.objects.get(pk=anon_node.pk)
        self.assertEqual(
            db_node.title,
            old_title,
            'Title changed in database'
        )
        self.assertEqual(
            r['title'],
            new_title,
        )

    def test_put_clear_date(self):
        node = Node(title='scheduled node',
                    scheduled_date=dt.date(2014, 1, 1),
                    owner=self.user)
        node.save()
        response = self.client.put(reverse('node_object', kwargs={'pk': node.pk}),
                                   json.dumps({'scheduled_date': '',}),
                                   content_type='application/json')
        node = Node.objects.get(pk=node.pk)
        self.assertEqual(
            node.scheduled_date,
            None
        )

    def test_archive_by_json(self):
        """Tests archiving/unarchived node by AJAX"""
        self.assertTrue(
            not self.node.archived,
            'Node starts out not archived'
        )
        self.node.archived = True
        serializer = NodeSerializer(self.node)
        response = self.client.put(
            self.url, JSONRenderer().render(serializer.data),
            content_type='application/json'
            )
        self.assertEqual(
            200,
            response.status_code
            )
        node = Node.objects.get(pk = self.node.pk)
        self.assertTrue(
            node.archived,
            'Node becomes archived after changing via AJAX'
        )

    def test_text_through_json(self):
        """Check JSON editing (ie using Aloha editor)"""
        self.assertEqual(
            '',
            self.node.text
            )
        text = '<script>evilness</script>'
        self.node.text = text
        serializer = NodeSerializer(self.node)
        response = self.client.put(
            self.url, JSONRenderer().render(serializer.data),
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
        text = '<b>niceness</b>'
        self.node.text = text
        serializer = NodeSerializer(self.node)
        response = self.client.put(
            self.url, JSONRenderer().render(serializer.data),
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
        self.assertTrue(
            self.repeating_node.todo_state.actionable,
            'Initial todoState is actionable'
            )
        self.repeating_node.todo_state = self.closed
        serializer = NodeSerializer(self.repeating_node)
        self.client.put(
            self.repeating_url, JSONRenderer().render(serializer.data),
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
        data = '{0}, "auto_update": true{1}'.format(data[:-1], data[-1:])
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
        jresponse = json.loads(response.content.decode())
        self.assertEqual(
            self.actionable.pk,
            jresponse['todo_state'],
            )

    def test_post(self):
        """Add a new node by submitting the whole form through AJAX"""
        new_data = {
            'id': 0,
            'archived': False,
            'auto_update': False,
            'level': 0,
            'parent': None,
            'priority': 'B',
            'text': '',
            'title': 'New test project',
            'todo_state': None,
            'tree_id': None,
        }
        # Test that specifying a pk raises a 405 error
        response = self.client.post(
            self.url, new_data
        )
        self.assertEqual(
            response.status_code,
            405
        )
        response = self.client.post(
            self.new_url, new_data
        )
        r = json.loads(response.content.decode())
        new_node = Node.objects.get(pk=r['id'])
        self.assertEqual(
            new_node.title,
            new_data['title']
        )
        self.assertEqual(
            new_node.slug,
            slugify(new_data['title'])
        )
        self.assertFalse(
            r['read_only']
        )

    def test_post_anonymous(self):
        """
        If User is not logged in, the API should just return
        the submitted data without saving it to the DB.
        """
        self.client.logout()
        data = {'title': 'anonymous new project'}
        self.client.post(
            reverse('node_object'),
            json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(
            Node.objects.filter(title=data['title']).count(),
            0,
            'Node was saved to database'
        )


class CalendarSerializer(TestCase):
    """
    Verify that the CalendarSerializer correctly transforms a list of
    Nodes into Calendar events that can be read by angular-ui-calendar.
    """
    Serializer = CalendarSerializer
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']
    def test_time_specific(self):
        node = Node.objects.get(pk=2)
        data = self.Serializer(node).data
        self.assertEqual(
            data['title'],
            node.title
        )
        expected_start = dt.datetime.combine(node.scheduled_date,
                                             node.scheduled_time)
        expected_end = dt.datetime.combine(node.end_date,
                                           node.end_time)
        self.assertEqual(
            data['start'],
            expected_start
        )
        self.assertEqual(
            data['end'],
            expected_end
        )
        self.assertEqual(
            data['allDay'],
            False
        )

    def test_date_specific(self):
        node = Node.objects.get(pk=5)
        data = self.Serializer(node).data
        self.assertEqual(
            data['start'],
            node.scheduled_date,
        )
        self.assertEqual(
            data['end'],
            node.end_date,
        )
        self.assertEqual(
            data['allDay'],
            True
        )

    def test_no_end_date(self):
        """
        If scheduled_date (but not scheduled_time) is set but end_date is not,
        default to same day event.
        """
        node = Node.objects.get(pk=5)
        node.end_date = None
        data = self.Serializer(node).data
        self.assertEqual(
            data['start'],
            node.scheduled_date,
        )
        self.assertEqual(
            data['end'],
            node.scheduled_date,
        )
        self.assertEqual(
            data['allDay'],
            True
        )

    def test_no_end_datetime(self):
        """
        If scheduled_date and scheduled_time are set but end_date is not,
        a reasonable default should be used.
        """
        node = Node.objects.get(pk=2)
        node.end_date = None
        data = self.Serializer(node).data
        expected_start = dt.datetime.combine(node.scheduled_date,
                                             node.scheduled_time)
        expected_end = expected_start + dt.timedelta(hours=1)
        self.assertEqual(
            data['start'],
            expected_start
        )
        self.assertEqual(
            data['end'],
            expected_end,
        )
        self.assertEqual(
            data['allDay'],
            False
        )

    def test_repeats(self):
        node = Node.objects.get(pk=5)
        data = self.Serializer(node).data
        self.assertEqual(
            data['repeats'],
            node.repeats,
        )

    def test_deadline_serializer(self):
        node = Node.objects.get(pk=6)
        data = CalendarDeadlineSerializer(node).data
        self.assertEqual(
            data['start'],
            node.deadline_date
        )


class UpcomingAPI(TestCase):
    """
    Check the UpcomingView class API. Should return a list of nodes with
    upcoming deadlines.
    """
    fixtures = ['test-users.json', 'gtd-test.json', 'gtd-env.json']

    def setUp(self):
        self.user = User.objects.get(pk=1)
        self.assertTrue(
            self.client.login(username=self.user.username,
                              password='secret')
        )
        self.url = reverse('node_object')

    def test_upcoming_deadlines(self):
        response = self.client.get(
            self.url,
            {'upcoming': '2014-03-02'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
            )
        self.assertEqual(
            response.status_code,
            200,
            )
        self.assertContains(
            response,
            'non-context child'
            )
        self.assertNotContains(
            response,
            'PetSmart'
            )

    def test_db_optimization(self):
        """
        Make sure that the method uses the database efficiently when
        passing to a Serializer. Fundamentally, the database usage
        should be independent of the queryset length. Changes of a few
        queries could reflect changes in the serializer, changes of an
        order of magnititude probably mean broken DB optimization.
        """
        user = User.objects.get(pk=1)
        url = reverse('node_object')
        factory = RequestFactory()
        request = factory.get(url, {'upcoming': '2014-03-02'})
        request.user = self.user
        qs = NodeView().get_upcoming(request)
        def hit_db():
            serializer = NodeListSerializer(qs, many=True, request=request)
            serializer.data
        self.assertNumQueries(
            5,
            hit_db
        )


class MessageIntegration(TestCase):
    """
    Tests for Node specific details of the wolfmail.models.Message class.
    Most tests should reside in wolfmail.tests but some are part of the
    Node definition (pre_save signals, etc).
    """
    fixtures = ['test-users.json', 'gtd-env.json', 'gtd-test.json']

    def test_set_presave_deferred(self):
        dfrd = TodoState.objects.get(abbreviation='DFRD')
        node = Node()
        node.owner = User.objects.get(pk=1)
        node.title = 'Test deferred node'
        self.assertEqual(
            Message.objects.filter(source_node=node).count(),
            0,
            'Deferred message is set upon new node creation'
        )
        # Set to deferred state and check that Message is created
        node.todo_state = dfrd
        node.scheduled_date = None
        # node.scheduled_date = dt.datetime.today().date()
        node.save()
        node = Node.objects.get(pk=node.pk)
        self.assertTrue(
            isinstance(node.deferred_message, Message)
        )
        self.assertTrue(
            node.deferred_message.in_inbox,
            'new message is not in_inbox'
        )
        self.assertTrue(
            isinstance(node.deferred_message.handler, DeferredMessageHandler),
            'new message is not a deferred message'
        )
        self.assertEqual(
            node.scheduled_date,
            dt.date.today()
        )
        # Change the deferred date and check that the Message is updated
        node = Node.objects.get(pk=node.pk)
        new_date = node.scheduled_date + dt.timedelta(days=3)
        node.scheduled_date = new_date
        node.save()
        node = Node.objects.get(pk=node.pk)
        # Set to a different state and check that Message is deleted
        done = TodoState.objects.get(abbreviation='DONE')
        node.todo_state = done
        node.save()
        node = Node.objects.get(pk=node.pk)
        self.assertEqual(
            Message.objects.filter(source_node=node).count(),
            0,
            'Deferred message not removed when node is DONE'
        )

    def test_archiving_node(self):
        """Archiving a deferred node should delete the message."""
        # Create the Node and verify that message is created
        dfrd = TodoState.objects.get(abbreviation='DFRD')
        node = Node()
        node.todo_state = dfrd
        node.owner = User.objects.get(pk=1)
        node.title = 'Deferred node'
        node.scheduled_date = dt.datetime.today()
        node.save()
        self.assertTrue(
            isinstance(node.deferred_message, Message)
        )
        # Now archive the node and check that message is deleted
        node.archived = True
        node.save()
        node = Node.objects.get(pk=node.pk)
        self.assertRaises(
            Message.DoesNotExist,
            lambda: node.deferred_message,
        )

    def test_schedule_from_completion(self):
        """
        See that a node with repeats_from_completion=True will
        reschedule a deferred Node
        """
        node = Node.objects.get(pk=23)
        nxt = TodoState.objects.get(abbreviation='NEXT')
        done = TodoState.objects.get(abbreviation='DONE')
        dfrd = TodoState.objects.get(abbreviation='DFRD')
        node.todo_state = nxt
        node.save()
        node.todo_state = done
        node.auto_update = True
        node.save()
        node = Node.objects.get(pk=node.pk)
        self.assertEqual(
            node.todo_state,
            dfrd,
        )
