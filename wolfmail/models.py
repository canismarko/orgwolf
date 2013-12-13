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
from django.contrib.auth.models import User
from django.utils.encoding import python_2_unicode_compatible

from gtd.models import Node
from orgwolf import settings
from orgwolf.models import Color
from plugins.models import Plugin

# @python_2_unicode_compatible
# class Label(models.Model):
#     """
#     A label for grouping mail items.
#     Eg. Inbox, Waiting_for
#     """
#     name = models.CharField(max_length=100)
#     owner = models.ForeignKey(settings.AUTH_USER_MODEL)
#     _color_rgb = models.IntegerField(default=0x000000)
#     _color_alpha = models.FloatField(default=1)
#     def color(self):
#         """Returns a Color object built from _color_rgba field."""
#         red = (self._color_rgb & Color.RED_MASK) >> Color.RED_OFFSET
#         green = (self._color_rgb & Color.GREEN_MASK) >> Color.GREEN_OFFSET
#         blue = (self._color_rgb & Color.BLUE_MASK) >> Color.BLUE_OFFSET
#         new_color = Color(red, green, blue, self._color_alpha)
#         return new_color
#     def __str__(self):
#         return self.name

@python_2_unicode_compatible
class MailItem(models.Model):
    """
    Incoming item that hasn't been processed yet.
    """
    sender = models.TextField()
    recipient = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL)
    unread = models.BooleanField(default=True)
    plugin = models.ForeignKey(Plugin, blank=True, null=True)
    in_inbox = models.BooleanField(default=True)
    subject = models.TextField()
    rcvd_date = models.DateTimeField()
    message_text = models.TextField(blank=True)
    nodes = models.ManyToManyField(Node, blank=True)
    def __str__(self):
        return self.subject
    def spawn_node(self):
        """Create a new GTD node based on this mail item.
        For example a new TODO item."""
        pass # TOOO: create spawn_node method

@python_2_unicode_compatible
class DeferredItem(models.Model):
    """
    An actionable reminder that has been deferred to the rcvd_date.
    Analagous to something placed in a GTD tickler file.
    """
    subject = models.TextField()
    unread = models.BooleanField(default=True)
    nodes = models.ManyToManyField(Node, blank=True)
    scheduled = models.DateField()
    in_inbox = models.BooleanField(default=True)
    repeats = models.BooleanField(default=False)
    repeating_number = models.IntegerField(blank=True, null=True)
    repeating_unit = models.CharField(
        max_length=1, blank=True, null=True,
        choices=(('d', 'Days'),
                 ('w', 'Weeks'),
                 ('m', 'Months'),
                 ('y', 'Years')))
    # If repeats_from_completions is True, then when the system
    # repeats this node, it will schedule it from the current
    # time rather than the original scheduled time.
    repeats_from_completion = models.BooleanField(default=False)
    def __str__(self):
        return self.subject
