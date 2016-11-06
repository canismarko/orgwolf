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

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.html import conditional_escape as escape
from html.parser import HTMLParser

class OrgWolfUser(AbstractUser):
    """Holds profile information for users."""
    preferred_timezone = models.CharField(max_length=25, blank=True)
    home = models.CharField(max_length=100, default='list_display')
    def get_display(self):
        """How should this user be shown to others"""
        full_name = self.get_full_name()
        if full_name:
            display = full_name
        else:
            display = self.username
        return display


class AccountAssociation(models.Model):
    """
    Hold a relationship between a social account (eg Google) and a User.
    """
    ow_user = models.ForeignKey(OrgWolfUser)
    access_token = models.TextField(blank=True)
    handler_path = models.CharField(max_length=100)
    remote_id = models.CharField(max_length=100)
    extra_data = models.TextField(blank=True)


class Color:
    """
    Describes an RGB color with alpha.
    """
    # TODO: write unittests for Color class
    RED_OFFSET = 16 # in bits
    GREEN_OFFSET = 8
    BLUE_OFFSET = 0
    RED_MASK = 0xFF0000
    GREEN_MASK = 0x00FF00
    BLUE_MASK = 0x0000FF
    def __init__(self, red, green, blue, alpha=float(1)):
        self.red = red
        self.green = green
        self.blue = blue
        self._alpha = int(alpha*100) # Alpha is stored internally as integer 0-100
    def html_string(self):
        """Return a hex string suitable for use in html documents"""
        def _format_hex_digits(number):
            return "%.02X" % number
            # return str(hex(number))[2:4].upper()
        string = "#"
        string += _format_hex_digits(self.red)
        string += _format_hex_digits(self.green)
        string += _format_hex_digits(self.blue)
        return string

    def rgb_string(self):
        """Return a (red, green, blue) string. Suitable for use in CSS."""
        def _format_int_digits(number):
            return str(int(number))
        string = "rgb("
        string += _format_int_digits(self.red)
        string += ", "
        string += _format_int_digits(self.green)
        string += ", "
        string += _format_int_digits(self.blue)
        string += ")"
        return string

    def rgba_string(self):
        """Returns a (red, green, blue, alpha) string. Suitable for use in CSS."""
        # Calls rgb_string and adds alpha
        string = "rgba("
        string += self.rgb_string()[4:-1] + ", "
        string += str(float(self._alpha)/100) + ")"
        return string

    def rgb_hex(self):
        """Returns a number describing the color: 0xRRGGBB"""
        composite = self.red << self.RED_OFFSET
        composite = composite & (self.green << self.GREEN_OFFSET)
        composite = composite & (self.blue << self.BLUE_OFFSET)
        return hex(composite)

    def as_dict(self):
        d = {
            'red': self.red,
            'green': self.green,
            'blue': self.blue,
            'alpha': self.get_alpha()}
        return d

    def get_alpha(self):
        return float(self._alpha)/100

    def set_alpha(self, new_alpha):
        """Sets the alpha value (between 0 and 1)."""
        self._alpha = int(new_alpha * 100)


class HTMLEscaper(HTMLParser):
    # Default list of html tags to allow
    ALLOWED_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'b', 'i', 'del', 'sup', 'sub', 'strong', 'em',
                    'ul', 'ol', 'li',
                    'div', 'p', 'span', 'hr', 'a', 'br',
                    'table', 'tbody', 'thead', 'tr', 'td', 'th',
                    'caption', 'pre', 'img',
                    ]
    ALLOWED_ATTRS = ['style', 'href', 'src', 'alt', 'width', 'height']
    def __init__(self, white_tags=None):
        HTMLParser.__init__(self)
        self.found = False

    def reset(self):
        HTMLParser.reset(self)
        self._cleaned = ''

    def clean(self, data):
        if data is not None:
            self.feed(data)
        return self._cleaned

    def handle_starttag(self, tag, attrs):
        self.found = True
        new_string = '<' + tag
        # Remove forbidden attributes
        for attr in attrs:
            if attr[0] in self.ALLOWED_ATTRS:
                new_string += ' {0}="{1}"'.format(attr[0], attr[1])
        new_string += '>'
        # Escape forbidden tags
        if not tag in self.ALLOWED_TAGS:
            new_string = escape(new_string)
        self._cleaned += new_string

    def handle_endtag(self, tag):
        new_string = '</' + tag + '>'
        if not tag in self.ALLOWED_TAGS:
            new_string = escape(new_string)
        self._cleaned += new_string

    def handle_data(self, data):
        self._cleaned += escape(data)
