"""
This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""

import datetime as dt
import json

from django.core.urlresolvers import reverse
from django.test import TestCase
from django.test.client import Client, RequestFactory
from django.utils.timezone import get_current_timezone

from gtd.models import Node
from orgwolf.models import OrgWolfUser as User
from plugins.deferred import MessageHandler as DeferredHandler
from wolfmail.models import Message


class MessageAPI(TestCase):
    fixtures = ['test-users.json', 'messages-test.json',
                'gtd-env.json', 'gtd-test.json']
    def setUp(self):
        self.user = User.objects.get(pk=1)
        self.assertTrue(
            self.client.login(username=self.user.username,
                              password='secret'),
            'Login failed'
        )
        self.url = reverse('messages')
    def test_get_all_messages(self):
        response = self.client.get(self.url)
        r = json.loads(response.content)
        expected = Message.objects.filter(owner=self.user)
        self.assertQuerysetEqual(
            expected,
            [x['subject'] for x in r],
            transform=lambda x: x.subject,
            ordered=False,
        )
    def test_get_inbox(self):
        response = self.client.get(self.url, {'in_inbox': True})
        r = json.loads(response.content)
        expected = Message.objects.filter(owner=self.user, in_inbox=True)
        self.assertQuerysetEqual(
            expected,
            [x['subject'] for x in r],
            transform=lambda x: x.subject,
            ordered=False,
        )

    def test_convert_to_node(self):
        message = Message.objects.get(pk=1)
        node = message.source_node
        self.assertTrue(
            node.todo_state.abbreviation,
            'DFRD'
        )
        url = reverse('messages', kwargs={'pk': message.pk})
        response = self.client.put(
            url,
            json.dumps({'action': 'create_node'}),
            content_type='application/json'
        )
        self.assertEqual(
            Message.objects.filter(pk=1).count(),
            0,
            'Deferred message is not deleted after node is created'
        )
        node = Node.objects.get(pk=node.pk)
        self.assertEqual(
            node.todo_state.abbreviation,
            'NEXT',
            'create_node action does not set new nodes todo_state'
        )

    def test_convert_repeating_to_node(self):
        message = Message.objects.get(pk=2)
        node = message.source_node
        url = reverse('messages', kwargs={'pk': message.pk})
        response = self.client.put(
            url,
            json.dumps({'action': 'create_node'}),
            content_type='application/json'
        )
        self.assertEqual(
            Message.objects.filter(pk=message.pk).count(),
            1,
            'Deferred message deleted after repeating node is created'
        )

    def test_filter_inbox_by_date(self):
        qs = Message.objects.filter(
            rcvd_date__lte=dt.datetime(2013, 12, 21,
                                       23, 59, 59,
                                       tzinfo=get_current_timezone())
        )
        response = self.client.get(self.url, {'rcvd_date__lte': '2013-12-21'})
        r = json.loads(response.content)
        self.assertQuerysetEqual(
            qs,
            [x['subject'] for x in r],
            transform=lambda x: x.subject,
            ordered=False
        )
