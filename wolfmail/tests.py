"""
This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""

import json

from django.core.urlresolvers import reverse
from django.test import TestCase
from django.test.client import Client, RequestFactory

from orgwolf.models import OrgWolfUser as User
from wolfmail.models import DeferredItem


class DeferredItemAPI(TestCase):
    """Test the API for retrieving items that have been pushed to later"""
    fixtures = ['test-users.json', 'wolfmail-test.json']
    def test_response_is_json(self):
        response = self.client.get(
            reverse('deferred_items'),
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
        r = json.loads(response.content)
        qs = DeferredItem.objects.all()
        assert False, 'TODO: Create wolfmail-test.json fixture'
