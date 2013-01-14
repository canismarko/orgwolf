
from __future__ import unicode_literals
from django.test import TestCase

from gtd.models import Node, TodoState
from orgwolf.models import OrgWolfUser as User
from orgwolf import wsgi # For unit testing code coverage
from orgwolf.models import HTMLEscaper

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
