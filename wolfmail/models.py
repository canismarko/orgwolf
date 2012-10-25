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

from orgwolf.models import Color
from plugins.models import Plugin

class Label(models.Model):
    """
    A label for grouping mail items.
    Eg. Inbox, Waiting_for
    """
    name = models.CharField(max_length=100)
    owner = models.ForeignKey(User)
    _color_rgb = models.IntegerField(default=0x000000)
    _color_alpha = models.FloatField(default=1)
    def color(self):
        """Returns a Color object built from _color_rgba field."""
        red = (self._color_rgb & Color.RED_MASK) >> Color.RED_OFFSET
        green = (self._color_rgb & Color.GREEN_MASK) >> Color.GREEN_OFFSET
        blue = (self._color_rgb & Color.BLUE_MASK) >> Color.BLUE_OFFSET
        new_color = Color(red, green, blue, self._color_alpha)
        return new_color
    def __unicode__(self):
        return self.name

class MailItem(models.Model):
    """
    Incoming item that hasn't been processed yet.
    """
    sender = models.TextField()
    recipient = models.TextField(blank=True)
    owner = models.ForeignKey(User)
    unread = models.BooleanField(default=True)
    plugin = models.ForeignKey(Plugin, blank=True, null=True)
    subject = models.TextField()
    rcvd_date = models.DateTimeField()
    message_text = models.TextField(blank=True)
    labels = models.ManyToManyField(Label, blank=True)
    def __unicode__(self):
        return self.subject
    def spawn_node(self):
        """Create a new GTD node based on this mail item.
        For example a new TODO item."""
        pass # TOOO: create spawn_node method
