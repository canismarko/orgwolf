from __future__ import unicode_literals

from django.core.urlresolvers import reverse
from django.test import TestCase
from django.test.client import Client, RequestFactory

from gtd.models import Node, TodoState
from orgwolf.models import OrgWolfUser as User
from orgwolf import wsgi # For unit testing code coverage
from orgwolf.models import HTMLEscaper
from orgwolf.forms import RegistrationForm
from orgwolf.middleware import AjaxMiddleware

class HTMLParserTest(TestCase):
    """Check OrgWolf's HTML Parsing object that is used to escape
    HTML in a customizable way."""
    def setUp(self):
        self.parser = HTMLEscaper()
    def test_meta(self):
        """Return values and such"""
        self.assertTrue(
            isinstance(self.parser.clean(''), unicode)
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

class NewUser(TestCase):
    """Check new user registration"""
    fixtures = ['gtd-env.json']
    def setUp(self):
        self.url = '/accounts/register/'
    def test_registration_form(self):
        url = '/accounts/register/'
        response = self.client.get(url)
        form = RegistrationForm()
        self.assertContains(response,
                            form.as_table(),
                            )
        self.assertContains(response,
                            '<form'
                            )
        self.assertContains(response,
                            '<button type="submit"'
                            )
    def test_registration_via_client(self):
        self.assertFalse(
            User.objects.all().exists()
            )
        url = self.url
        data = {
            'username': 'test3',
            'password': 'secret',
            'password_2': 'secret'
            }
        response = self.client.post(url, data, follow=True)
        self.assertTrue(
            User.objects.all().exists(),
            'User object not was created upon form submission'
            )
        # User starts out authenticated
        self.assertEqual(
            200,
            response.status_code
            )
        self.assertEqual(
            'http://testserver/gtd/node/',
            response.redirect_chain[-1][0]
            )
    def test_bad_registration(self):
        """Tests failure of bad credentials or invalid data for login"""
        data = {
            'username': '',
            'password': 'secret'
            }
        response = self.client.post(self.url, data)
        self.assertFalse(
            User.objects.all().exists(),
            'Blank username does not trigger validation error'
            )
        data = {
            'username': 'test',
            'password': 'secret',
            'password_2': ''
            }
        response = self.client.post(self.url, data)
        self.assertFalse(
            User.objects.all().exists(),
            'password_2 left blank does not trigger validation error'
            )
        data = {
            'username': 'test',
            'password': 'secret',
            'password_2': 'secert'
            }
        response = self.client.post(self.url, data)
        self.assertFalse(
            User.objects.all().exists(),
            'non-matching passwords do not trigger validation error'
            )
        self.assertContains(
            response,
            'Passwords do not match'
            )

class ChangePassword(TestCase):
    fixtures = ['test-users.json']
    def setUp(self):
        self.url = reverse('change_password')
        self.user = User.objects.get(username='test')
        self.assertTrue(
            self.client.login(username=self.user.username, password='secret')
        )
    def test_bad_old_password(self):
        data = {
            'old_password': 'gibberish',
            'password': 'secret1',
            'password_2': 'secret2'
        }
        response = self.client.post(self.url, data)
        self.assertEqual(
            200,
            response.status_code
        )
        self.assertContains(
            response,
            'Incorrect password',
            status_code=200
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

class AjaxMiddlewareTest(TestCase):
    """Checks the middleware that translates various parts of the REST API"""
    def setUp(self):
        self.middleware = AjaxMiddleware()
        self.client = Client()
        self.factory = RequestFactory()
    def test_chainability(self):
        self.assertTrue(
            self.middleware.process_request(self.factory.get('/gtd/node/')) is None
        )
    def test_html_decoding(self):
        request = self.factory.put(
            '/gtd/node/', 'pk=2&fields%5Btext%5D=thisstuff&fields%5Btodo_state%5D=2&fields%5Btag_string%5D=&fields%5Bopened%5D=2012-11-12T06%3A19%3A50Z&fields%5Bassigned%5D=',
            content_type='application/x-www-form-urlencoded',
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.middleware.process_request(request)
        self.assertEqual(
            request.PUT.__class__.__name__,
            'dict',
        )
        self.assertEqual(
            request.PUT['pk'],
            2,
            'First attribute ("pk") not set'
        )
        self.assertEqual(
            request.PUT['fields']['tag_string'],
            '',
        )
        self.assertEqual(
            request.PUT['fields']['todo_state'],
            2,
            'field[todo_state] not set'
        )
        self.assertEqual(
            request.PUT['fields']['text'],
            'thisstuff'
        )
        self.assertEqual(
            request.PUT['fields']['opened'],
            '2012-11-12T06:19:50Z'
        )
        self.assertTrue(
            request.PUT['fields']['assigned'] is None
        )
    def test_json_decoding(self):
        request = self.factory.put(
            '/gtd/node/', '{"pk":172,"fields":{"archived":false,"todo_state":null,"text":"","scope":[1],"related_projects":[],"rght":6,"tag_string":"","assigned":null,"lft":1,"deadline":null,"owner":1,"opened":"2012-11-12T06:20:17Z","title":"[a]","time_needed":null,"priority":"","closed":null,"tree_id":2,"energy":null,"repeating_number":null,"scheduled":null,"users":[],"parent":null,"repeating_unit":"","slug":"","level":0,"scheduled_time_specific":true,"repeats_from_completion":true,"deadline_time_specific":true,"repeats":true}}',
            content_type='application/json',
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.middleware.process_request(request)
        self.assertEqual(
            request.PUT.__class__.__name__,
            'dict'
        )
        self.assertEqual(
            request.PUT['pk'],
            172
        )
