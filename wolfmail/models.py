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

import datetime as dt
import importlib

from django.db import models
from django.dispatch import receiver
from django.utils.encoding import python_2_unicode_compatible

from orgwolf import settings
import plugins


@python_2_unicode_compatible
class Message(models.Model):
    """
    Class for all messages that get passed around, either incoming or
    outgoing.  Most of the functionality is actually implemented in
    the self.handler attribute that is created on __init__() from the
    self.handler_path field.
    """
    subject = models.TextField()
    sender = models.TextField(blank=True)
    recipient = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL)
    unread = models.BooleanField(default=True)
    handler_path = models.CharField(max_length=100, blank=True)
    in_inbox = models.BooleanField(default=True)
    rcvd_date = models.DateTimeField(default=dt.datetime.now)
    message_text = models.TextField(blank=True)
    spawned_nodes = models.ManyToManyField('gtd.Node', blank=True)
    source_node = models.OneToOneField('gtd.Node', null=True, blank=True,
                                       related_name='deferred_message')

    def __str__(self):
        return self.subject


@receiver(models.signals.post_init, sender=Message)
def add_handler(sender, instance, **kwargs):
    """Add the appropriate Handler() object as an attribute"""
    if instance.handler_path == '':
        instance.handler = plugins.BaseMessageHandler(instance)
    else:
        module = importlib.import_module(instance.handler_path)
        instance.handler = module.MessageHandler(instance)
