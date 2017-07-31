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

from django.core.urlresolvers import reverse
from django.test import TestCase
from django.contrib.auth.models import AnonymousUser

from orgwolf.forms import RegistrationForm
from orgwolf.models import OrgWolfUser as User, HTMLEscaper, AccountAssociation, JSONField
from orgwolf.serializers import UserSerializer
from plugins import BaseAccountHandler, google
from wolfmail.models import Message

class HTMLParserTest(TestCase):
    """Check OrgWolf's HTML Parsing object that is used to escape
    HTML in a customizable way."""
    def setUp(self):
        self.parser = HTMLEscaper()
    def test_meta(self):
        """Return values and such"""
        self.assertTrue(
            isinstance(self.parser.clean(''), str)
            )
        self.parser._cleaned = 'Some stale data'
        self.parser.reset()
        self.assertFalse(
            self.parser._cleaned
            )
    def test_bad_tags(self):
        self.assertEqual(
            '&lt;script&gt;alert(&#39;evil stuff&#39;);&lt;/script&gt;',
            self.parser.clean('<script>alert(\'evil stuff\');</script>')
            )
    def test_allowed_tags(self):
        self.assertEqual(
            '<h1>Hello</h1>',
            self.parser.clean('<h1>Hello</h1>')
            )
        self.parser.reset()
        self.assertEqual(
            '<h2>Hello</h2>',
            self.parser.clean('<h2>Hello</h2>')
            )
        self.parser.reset()
        self.assertEqual(
            '<h3>Hello</h3>',
            self.parser.clean('<h3>Hello</h3>')
            )
        self.parser.reset()
        self.assertEqual(
            '<h4>Hello</h4>',
            self.parser.clean('<h4>Hello</h4>')
            )
        self.parser.reset()
        self.assertEqual(
            '<h5>Hello</h5>',
            self.parser.clean('<h5>Hello</h5>')
            )
        self.parser.reset()
        self.assertEqual(
            '<h6>Hello</h6>',
            self.parser.clean('<h6>Hello</h6>')
            )
        self.parser.reset()
        text = '<ul>\n<li>Hello</li>\n<li>world</li></ul>'
        self.assertEqual(
            text,
            self.parser.clean(text)
            )
        self.parser.reset()
        text = '<ol>\n<li>Hello</li>\n<li>world</li></ol>'
        self.assertEqual(
            text,
            self.parser.clean(text)
            )
        self.parser.reset()
        text = '<div><p>Hello, world!</p></div>'
        self.assertEqual(
            text,
            self.parser.clean(text)
            )
        self.parser.reset()
        self.assertEqual(
            '<hr></hr>',
            self.parser.clean('<hr />')
            )

    def test_style_attribute(self):
        """Check that <p style="..."> is allowed to pass"""
        self.assertEqual(
            self.parser.clean('<p style="color: red">'),
            '<p style="color: red">'
        )

    def test_forbidden_attribute(self):
        """Check that <p onclick="..."> is not allowed to pass"""
        self.assertEqual(
            self.parser.clean('<p onclick="do_some_evil_stuff()">'),
            '<p>'
        )


class UserMutators(TestCase):
    def test_get_display(self):
        user = User()
        username = 'mark'
        f_name = 'Mark'
        l_name = 'Wolf'
        user.username = username
        # No name details
        self.assertEqual(
            username,
            user.get_display()
            )
        # First and last name
        user.first_name = f_name
        user.last_name = l_name
        self.assertEqual(
            '{0} {1}'.format(f_name, l_name),
            user.get_display()
            )
        # Names are spaces
        user.first_name = ' '
        user.last_name = ' '
        self.assertEqual(
            username,
            user.get_display()
            )
        user.first_name = '\t\n'
        self.assertEqual(
            username,
            user.get_display()
            )


class UserSerializerTest(TestCase):
    fixtures = ['test-users.json']
    def test_anonymous_user(self):
        """Does the serializer respond correctly when not logged in"""
        anon_user = AnonymousUser()
        serializer = UserSerializer(anon_user)
        self.assertEqual(
            serializer.data['name'],
            'Guest'
        )

    def test_user_name(self):
        """Does the serializer provide the users full name"""
        user = User.objects.get(pk=3)
        serializer = UserSerializer(user)
        self.assertEqual(
            serializer.data['name'],
            'Mark Wolf'
        )


class AccountAssociationTests(TestCase):
    def test_handler_property(self):
        acc = AccountAssociation()
        self.assertTrue(isinstance(
            acc.handler,
            BaseAccountHandler
        ))
        acc.handler.test_string = 'hello'
        self.assertEqual(
            acc.handler.test_string,
            'hello',
            'AccountAssociation().handler not preserved'
        )

    def test_overridden_handler(self):
        acc = AccountAssociation(handler_path="plugins.google")
        self.assertTrue(isinstance(
            acc.handler,
            google.AccountHandler
        ))


class FeedbackAPI(TestCase):
    """
    Tests the ability to save user submitted feedback
    """
    fixtures = ['test-users.json']
    def setUp(self):
        self.user = User.objects.get(pk=1)
        self.client.login(
            username=self.user.get_username(),
            password='secret'
        )
    def test_permissions(self):
        # User must be logged in or else 403
        self.client.logout()
        response = self.client.post(
            reverse('feedback'),
            {'body': 'Here is some feedback'}
        )
        self.assertEqual(
            response.status_code,
            403
        )
    def test_post_feedback(self):
        data = {'body': 'You are all idiots!'}
        self.client.post(
            reverse('feedback'),
            data
        )
        # Check saved message attributes
        msg = Message.objects.filter(message_text=data['body'])
        self.assertEqual(
            msg.count(),
            1,
            'Message not created'
        )
        msg = msg[0]
        self.assertEqual(
            msg.owner.pk,
            1,
            'Incorrect owner: {}'.format(msg.owner)
        )
        self.assertEqual(
            msg.subject,
            'Site feedback'
        )
        self.assertEqual(
            msg.handler_path,
            '',
        )
        self.assertEqual(
            msg.sender,
            self.user.get_username()
        )
        self.assertEqual(
            msg.message_text,
            data['body']
        )
