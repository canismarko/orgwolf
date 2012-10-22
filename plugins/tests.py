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

from django.test import TestCase
from django.contrib.auth.models import User
import re
# from IOString import IOString

from PyOrgMode import PyOrgMode
from plugins import orgmode
from GettingThingsDone.models import Node, Text

# class SimpleTest(TestCase):
#     def test_basic_addition(self):
#         """
#         Tests that 1 + 1 always equals 2.
#         """
#         self.assertEqual(1 + 1, 2)

class TestOrgModePlugin(TestCase):
    def setUp(self):
        new_user = User()
        new_user.save()
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
* [#A] [#B] Heading 1
  SCHEDULED: <2012-10-21 Sun>
** NEXT Heading 1-0
** DONE Heading 1-1
   SCHEDULED: <2012-10-19 Fri +2d> DEADLINE: <2012-10-22 Mon>

   :PROPERTIES:
   :LAST_REPEAT: [2012-09-23 Sun 15:03]
   :END:
* [#4] Heading 2

* Back to python"""
        orgmode.import_structure(string=self.org_file)

    def test_heading_parameters(self):
        root_nodes = Node.objects.filter(parent=None)
        texts = Text.objects.all()
        self.assertEqual(root_nodes[0].title, "Heading 0")
        child_nodes = Node.objects.filter(parent=root_nodes[0])
        self.assertEqual(child_nodes[0].tag_string, ":home:work:comp:")
        self.assertEqual(child_nodes[1].tag_string, ":jaz3z:")
        child_nodes = Node.objects.filter(parent=child_nodes[1])
        # TODO: Finish unittesting of orgmode plugin

    def test_output(self):
        """Check that the org-mode input and output are similar."""
        self.maxDiff = None
        input_string = orgmode.standardize_string(
            self.org_file).split('\n')
        output_string = orgmode.standardize_string(
            orgmode.export_to_string()).split('\n')
        self.assertEqual(input_string, output_string)
        self.assertEqual(len(input_string), len(output_string))
        for line_index in range(0, len(input_string)):
            sef.assertEqual(output_string[line_index], input_string[line_index])
