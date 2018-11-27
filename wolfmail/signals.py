# -*- coding: utf-8 -*-
#######################################################################
# Copyright 2018 Mark Wolfman
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

import importlib

from django.db import models
from django.dispatch import receiver

from .models import Message
from plugins.handler import BaseMessageHandler

@receiver(models.signals.post_init, sender=Message)
def add_handler(sender, instance, **kwargs):
    """Add the appropriate Handler() object as an attribute"""
    if instance.handler_path == '':
        instance.handler = BaseMessageHandler(instance)
    else:
        try:
            module = importlib.import_module(instance.handler_path)
            instance.handler = module.MessageHandler(instance)
        except AttributeError:
            instance.handler = BaseMessageHandler(instance)
