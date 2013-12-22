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

from __future__ import unicode_literals

import re
import datetime as dt

from django.test import TestCase
from django.utils.timezone import get_current_timezone

from gtd.models import Node, TodoState
from orgwolf.models import OrgWolfUser as User
from plugins import orgmode, deferred, BaseMessageHandler
from wolfmail.models import Message

class RegexTest(TestCase):
    def test_heading_regex(self):
        """Make sure the regular expressions properly detect headings and
        (perhaps more importantly) don't detect non-headings"""
        # Separate text vs stars
        self.assertEqual(orgmode.HEADING_RE.search("* Heading").groups(),
                    ("*", "Heading", None, None, None))
        self.assertEqual(orgmode.HEADING_RE.search("******* Heading").groups(),
                    ("*******", "Heading", None, None, None))
        self.assertEqual(orgmode.HEADING_RE.search("*Heading"),
                         None)
        self.assertEqual(orgmode.HEADING_RE.search("* * Heading").groups(),
                    ("*", "*", None, "Heading", None))
        self.assertEqual(orgmode.HEADING_RE.search("* Heading").groups(),
                    ("*", "Heading", None, None, None))
        self.assertEqual(orgmode.HEADING_RE.search("** State Heading").groups(), 
                    ("**", "State", None, "Heading", None))
        self.assertEqual(orgmode.HEADING_RE.search(" * Heading text :nottag"),
                         None)
        # Unicode
        self.assertEqual(orgmode.HEADING_RE.search("* °unico✓de Heading").groups(), 
                    ("*", "°unico✓de",None, "Heading", None))
        # priorities
        self.assertEqual(orgmode.HEADING_RE.search("* state [#G] Heading").groups(), 
                    ("*", "state", "G", "Heading", None))
        self.assertEqual(orgmode.HEADING_RE.search("* [C] Heading").groups(),
                    ("*", "[C]", None, "Heading", None))
        self.assertEqual(orgmode.HEADING_RE.search("* [#&] Heading").groups(),
                    ("*", "[#&]", None, "Heading", None))
        self.assertEqual(orgmode.HEADING_RE.search("* [#] Heading").groups(),
                    ("*", "[#]", None, "Heading", None))
        # Tag string
        self.assertEqual(orgmode.HEADING_RE.search("* Heading :tag1:").groups(), 
                    ("*", "Heading", None, None, ":tag1:"))
        self.assertEqual(orgmode.HEADING_RE.search("* Heading :tag1:tag2:").groups(), 
                    ("*", "Heading", None, None, ":tag1:tag2:"))
        self.assertEqual(orgmode.HEADING_RE.search("* Heading text :nottag").groups(), 
                    ("*", "Heading", None, "text :nottag", None))
        self.assertEqual(orgmode.HEADING_RE.search("* Heading text nottag:").groups(), 
                    ("*", "Heading", None, "text nottag:", None))
        self.assertEqual(
            orgmode.HEADING_RE.search("* Heading text :nottag: moretext").groups(), 
            ("*", "Heading", None, "text :nottag: moretext", None)
            )
    def test_time_sensitive_regex(self):
        # Simple scheduled/deadline/closed dates
        self.assertEqual(
            orgmode.TIME_SENSITIVE_RE.findall("  SCHEDULED:   <2012-05-10 Thu>"),
            [("SCHEDULED:", "<2012-05-10 Thu>", "", "")]
            )
        self.assertEqual(
            orgmode.TIME_SENSITIVE_RE.findall("DEADLINE: <2012-05-10 Thu>"),
            [("DEADLINE:", "<2012-05-10 Thu>", "", "")]
            )
        self.assertEqual(
            orgmode.TIME_SENSITIVE_RE.findall(" othertext  CLOSED: [2012-05-10 Thu]"),
            [("", "", "CLOSED:", "[2012-05-10 Thu]")]
            )
        self.assertEqual(
            orgmode.TIME_SENSITIVE_RE.findall("  DEADLINE: <2012-05-10 Thu> CLOSED: [2012-11-02 Fri]"),
            [("DEADLINE:", "<2012-05-10 Thu>", "", ""),
             ("", "", "CLOSED:", "[2012-11-02 Fri]")]
            )
        # Ranged date
        self.assertEqual(
            orgmode.TIME_SENSITIVE_RE.findall("  DEADLINE: <2012-05-10 Thu>--<2012-11-02 Fri>"),
            [("DEADLINE:", "<2012-05-10 Thu>--<2012-11-02 Fri>", "", "")]
            )
        # Inactive date - ignore these
        self.assertEqual(
            orgmode.TIME_SENSITIVE_RE.findall("  SCHEDULED:   [2012-05-10 Thu]"),
            []
            )
    def test_date_regex(self):
        # Make sure the regex recognizes all the pieces
        self.assertEqual(
            orgmode.DATE_RE.search("<2012-11-02>").groups(),
            ("2012", "11", "02", None, None, None, None,
             None, None, None, None, None, None, None))
        self.assertEqual(
            orgmode.DATE_RE.search("<2012-11-02 4:19>").groups(),
            ("2012", "11", "02", None, "4", "19", None,
             None, None, None, None, None, None, None))
        self.assertEqual(
            orgmode.DATE_RE.search("<2012-11-02 Thu>").groups(),
            ("2012", "11", "02", "Thu", None, None, None,
             None, None, None, None, None, None, None))
        self.assertEqual(
            orgmode.DATE_RE.search("[2012-11-02 Fri 14:19]").groups(),
            ("2012", "11", "02", "Fri", "14", "19", None,
             None, None, None, None, None, None, None))
        self.assertEqual(
            orgmode.DATE_RE.search("<2012-11-02 4:19 +379d>").groups(),
            ("2012", "11", "02", None, "4", "19", "+379d",
             None, None, None, None, None, None, None))
        self.assertEqual(
            orgmode.DATE_RE.search("<2012-11-02 4:19>--<2011-07-13 Sat 15:17 .3y>").groups(),
            ("2012", "11", "02", None, "4", "19", None,
             "2011", "07", "13", "Sat", "15", "17", ".3y"))
        # TODO: write unittests for valid dates (eg day between 1 and 31)

class HelperFunctions(TestCase):
    fixtures = ['test-users.json', 'gtd-env.json', 'gtd-test.json']
    def test_heading_as_string(self):
        node = Node.objects.get(pk=5)
        f = orgmode.heading_as_string
        expected_string = """** ACTN Buy cat food
   SCHEDULED: <2012-12-31 Mon> DEADLINE: <2011-05-13 Fri> CLOSED: <2011-05-14 Sat 00:56>
"""
        self.assertEqual(
            expected_string.split('\n'),
            f(node, node.get_level()).split('\n')
            )

class TestOrgModePlugin(TestCase):
    fixtures = ['test-users.json', 'gtd-env.json']
    def setUp(self):
        # This is the test string
        self.org_file = """* Heading 0
Some heading 1 text (no indent)
  Some heading 1 text (indent)
** Heading 0-0						     :home:work:comp:
** Heading 0-1							       :jaz3z:
Some texts for heading 0-1
| and | a  | table   |
| row | io | smidgin |
*** Heading 0-1-0
**
* [#A] [#B] Heading 1
  SCHEDULED: <2012-10-21 Sun>
** NEXT Heading 1-0
** DONE Heading 1-1
   DEADLINE: <2012-10-22 Mon> SCHEDULED: <2012-10-19 Fri +2d>

   :PROPERTIES:
   :LAST_REPEAT: [2012-09-23 Sun 15:03]
   :END:
* [#4] Heading 2

* Back to python"""
        orgmode.import_structure(string=self.org_file)

    def test_scheduling_repeats(self):
        node = Node.objects.get(title="Heading 1-1")
        target_date = dt.date(2012, 10, 19)
        self.assertEqual(target_date, node.scheduled.date())
        self.assertTrue(node.repeats)
        self.assertFalse(node.repeats_from_completion)
        self.assertEqual(2, node.repeating_number)
        self.assertEqual('d', node.repeating_unit)
        self.assertFalse(node.closed)

    def test_heading_parameters(self):
        root_nodes = Node.objects.filter(parent=None)
        self.assertEqual(root_nodes[0].title, "Heading 0")
        child_nodes = Node.objects.filter(parent=root_nodes[0])
        self.assertEqual(child_nodes[0].tag_string, ":home:work:comp:")
        self.assertEqual(child_nodes[1].tag_string, ":jaz3z:")
        child_nodes = Node.objects.filter(parent=child_nodes[1])
        # TODO: Finish unittesting of orgmode plugin

    def test_text_identification(self):
        test_node = Node.objects.get(title='Heading 0-1')
        self.assertEqual('Some texts for heading 0-1\n| and | a  | table   |\n| row | io | smidgin | \n',
                    test_node.text)

    def test_output(self):
        """Check that the org-mode input and output are similar."""
        self.maxDiff = None
        input_string = orgmode.standardize_string(
            self.org_file).split('\n')
        output_string = orgmode.standardize_string(
            orgmode.export_to_string()).split('\n')
        node = Node.objects.get(title='Heading 1-1')
        self.assertEqual(input_string, output_string)
        self.assertEqual(len(input_string), len(output_string))
        for line_index in range(0, len(input_string)):
            self.assertEqual(output_string[line_index], input_string[line_index])


class DeferredHandlerTest(TestCase):
    fixtures = ['gtd-env.json', 'gtd-test.json',
                'test-users.json', 'messages-test.json', ]
    def setUp(self):
        self.user = User.objects.get(pk=1)

    def test_sets_handler(self):
        message = Message.objects.get(pk=1)
        self.assertTrue(
            isinstance(message.handler, deferred.MessageHandler),
            'self.handler is instance of {} not {}'.format(
                message.handler.__class__, deferred.MessageHandler)
        )
        self.assertEqual(
            message,
            message.handler._msg,
        )

    def test_inheritance(self):
        deferred_handler = deferred.MessageHandler(None)
        self.assertTrue(
            isinstance(deferred_handler, BaseMessageHandler),
            'deferred MessageHandler() does not inherit from BaseMessageHandler'
        )

    def test_create_node(self):
        """Test whether the MessageHandler.create_node method works"""
        message = Message.objects.get(pk=1)
        new_node = message.handler.create_node()
        self.assertTrue(
            isinstance(new_node, Node),
            'create_node method did not return a Node instance'
        )
        self.assertEqual(
            Message.objects.filter(pk=message.pk).count(),
            0,
            'Message not deleted after create_node() called'
        )

    def test_create_repeating_node(self):
        """
        Test whether a create_node() method correctly resets when source_node
        repeats.
        """
        message = Message.objects.get(pk=2)
        old_date = message.rcvd_date
        self.assertEqual(
            message.spawned_nodes.all().count(),
            0,
            'spawned nodes already exist at first'
        )
        new_node = message.handler.create_node()
        self.assertEqual(
            message.spawned_nodes.first(),
            new_node,
            'new_node not added to spawned_nodes'
        );
        message = Message.objects.get(pk=message.pk)
        self.assertEqual(
            new_node.title,
            message.source_node.title,
        )
        self.assertQuerysetEqual(
            new_node.scope.all(),
            [repr(x) for x in message.source_node.scope.all()]
        )
        self.assertEqual(
            new_node.parent.pk,
            message.source_node.pk,
            'new Node is not a child of source Node'
        )
        self.assertEqual(
            new_node.get_ancestors(ascending=True)[0].pk,
            message.source_node.pk,
            'new Node not properly inserted into MPTT tree'
        )
        self.assertNotEqual(
            new_node.pk,
            message.source_node.pk,
            'new_node and message.source_node as same instance'
        )
        # Test auto-updating of dates
        self.assertEqual(
            message.rcvd_date.date(),
            message.source_node.scheduled_date
        )

   def test_auto_message(self):
        """
        Verify that creating and modifying a DFRD Node will trigger
        Message creation.
        """
        node = Node()
        node.owner = self.user
        node.title = 'New deferred node'
        node.scheduled_date = dt.datetime.now().date()
        dfrd = TodoState.objects.get(abbreviation='DFRD')
        nxt = TodoState.objects.get(abbreviation='NEXT')
        # Create a new deferred node
        node.todo_state = dfrd
        self.assertRaises(
            Message.DoesNotExist,
            lambda x: node.deferred_message,
            'New Node() starts out with a message'
        )
        node.save()
        node = Node.objects.get(pk=node.pk)
        self.assertTrue(
            isinstance(node.deferred_message, Message)
        )
        # Now make the node NEXT and see that the message disappears
        node.todo_state = nxt
        node.save()
        node = Node.objects.get(pk=node.pk)
        self.assertRaises(
            Message.DoesNotExist,
            lambda x: node.deferred_message,
            'New Node() starts out with a message'
        )
