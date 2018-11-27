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


import math
import datetime as dt

from django.db.models import signals
from django.dispatch import receiver
from django.conf import settings
from django.utils.timezone import get_current_timezone

from orgwolf.models import HTMLEscaper
from wolfmail.models import Message
from .models import Node, Contact, NodeRepetition, TodoState

# Saving a new user creates a new contact
@receiver(signals.post_save, sender=settings.AUTH_USER_MODEL)
def contact_post_save(sender, **kwargs):
    if not kwargs['raw']:
        instance = kwargs['instance']
        if not Contact.objects.filter(user=instance).exists():
            contact = Contact()
            contact.f_name = instance.first_name
            contact.l_name = instance.last_name
            contact.user = instance
            if instance.first_name or instance.last_name:
                contact.tag_string = '{0}{1}'.format(
                    contact.f_name[0].upper(),
                    contact.l_name[0].upper()
                )
            else:
                contact.tag_string = instance.username[0:1].upper()
            contact.save()


# Signal handlers for the Node class
@receiver(signals.pre_save, sender=Node)
def node_timestamp(sender, **kwargs):
    """Check if a node is being changed to a closed todo_state.
    If so, set the closed timestamp to now."""
    # This function check the passed instance node against
    # the version currently in the database.
    if not kwargs['raw']:
        instance = kwargs['instance']
        if instance.is_closed() and instance.auto_close:
            if instance.id: # Existing node
                old_node = Node.objects.get(pk=instance.id)
                if not old_node.is_closed():
                    instance.closed = dt.datetime.now(get_current_timezone())
            else: # New node
                instance.closed = dt.datetime.now(get_current_timezone())


@receiver(signals.pre_save, sender=Node)
def validate_deferred_date(sender, instance, **kwargs):
    """
    If the Node is deferred, make sure that the scheduled_date field is set.
    """
    if not kwargs['raw']:
        if (getattr(instance.todo_state, 'abbreviation', None) == 'DFRD'
            and instance.scheduled_date is None):
            instance.scheduled_date = dt.date.today()


@receiver(signals.post_save, sender=Node)
def set_deferred_message(sender, instance, **kwargs):
    """
    Checks if the Node is a deferred Node and if so,
    set the deferred_message foreign key.
    """
    if not kwargs['raw']:
        if (getattr(instance.todo_state, 'abbreviation', None) == 'DFRD' and
            not instance.archived):
            # Node is deferred so create new message or update existing message
            message = instance.get_deferred_msg()
            if message is None:
                message = Message()
                message.source_node = instance
            message.subject = instance.title
            message.handler_path = 'plugins.deferred'
            message.owner = instance.owner
            message.rcvd_date = dt.datetime.combine(
                instance.scheduled_date,
                dt.time(0, tzinfo=get_current_timezone()),
            )
            message.save()
        else:
            # If instance is not deferred, then it can't have a deferred_message
            message = instance.get_deferred_msg()
            if message is not None and message.pk is not None:
                instance.deferred_message.delete()


@receiver(signals.pre_save, sender=Node)
def clean_text(sender, instance, **kwargs):
    """pre_save receiver that cleans up the text before saving
    eg. escape HTML"""
    if not kwargs['raw']:
        parser = HTMLEscaper()
        instance.text = parser.clean(instance.text)


@receiver(signals.pre_save, sender=Node)
def node_repeat(sender, **kwargs):
    """
    Handle repeating information if the Node has the Node.repeats
    flag set.
    """
    if not kwargs['raw']:
        def _get_new_time(original, number, unit):
            """Helper function to determine new repeated timestamp"""
            if unit == 'd': # Days
                new = original + dt.timedelta(days=number)
            elif unit == 'w': # Weeks
                new = original + dt.timedelta(days=(number*7))
            elif unit == 'm': # Months
                month = ((original.month + number -1 ) % 12) + 1
                # Make sure we're not setting Sep 31st or other non-dates
                if month in (4, 6, 9, 11) and original.day == 31:
                    day = 30
                elif month == 2 and original.day > 28:
                    day = 28
                else:
                    day = original.day
                year = int(
                    math.floor(
                        original.year + ((original.month + number - 1) / 12)
                        )
                    )
                new = dt.date(year=year,
                               month=month,
                               day=day)
            elif unit == 'y': # Years
                new = dt.date(year=original.year+number,
                               month=original.month,
                               day=original.day)
            else: # None of the above
                raise ValueError('"{}" is not a valid time unit'.format(unit))
            return new
        # Code execution starts here
        instance = kwargs['instance']
        if instance.repeats and instance.auto_update:
            if instance.id: # if existing node
                old_node = Node.objects.get(pk=instance.pk)
                if not (old_node.todo_state == instance.todo_state):
                    # Only if something has changed
                    new_state = old_node.todo_state
                    if instance.scheduled_date: # Adjust Node.scheduled_date
                        if instance.repeats_from_completion:
                            original = dt.datetime.now(get_current_timezone()).date()
                            # repeats from completion only makes sense for DFRD
                            new_state = TodoState.objects.get(abbreviation='DFRD')
                        else:
                            original = instance.scheduled_date
                        instance.scheduled_date = _get_new_time(
                            original,
                            instance.repeating_number,
                            instance.repeating_unit)
                    if instance.deadline_date: # Adjust Node.deadline_date
                        if instance.repeats_from_completion:
                            original = dt.datetime.now(get_current_timezone()).date()
                        else:
                            original = instance.deadline_date
                        instance.deadline_date = _get_new_time(
                            original,
                            instance.repeating_number,
                            instance.repeating_unit)
                    # Make a record of what we just did
                    new_repetition = NodeRepetition()
                    new_repetition.node = instance
                    new_repetition.original_todo_state = old_node.todo_state
                    new_repetition.new_todo_state = instance.todo_state
                    new_repetition.timestamp = dt.datetime.now(
                        get_current_timezone())
                    new_repetition.save()
                    # Set the actual todo_state back to its original value
                    instance.todo_state = new_state


@receiver(signals.pre_save, sender=Node)
def auto_archive(sender, **kwargs):
    """
    pre_save receiver that archives the node if it's being closed
    and doesn't have any content the user might want to reference.
    """
    if not kwargs['raw']:
        instance = kwargs['instance']
        # Determine if this node should be checked
        status = (
            instance.pk and
            getattr(instance.todo_state, 'closed', False) and
            instance.auto_update and
            not instance.text
        )
        # Only retrieve the old node if the updated node should be archived
        if status:
            old_node = Node.objects.get(pk=instance.pk)
            if not getattr(old_node.todo_state, 'closed', False):
                instance.archived = True


@receiver(signals.m2m_changed, sender=Node.focus_areas.through)
def update_focus_area(sender, instance, action, pk_set, **kwargs):
    """
    If a Node has a FocusArea added or removed, this receiver applies to operation
    to all its descendants.
    """
    # Add a focus_area
    if action == 'post_add':
        for descendant in instance.get_descendants():
            descendant.focus_areas.add(*pk_set)
    # Remove a focus_area
    if action == 'post_remove':
        for descendant in instance.get_descendants():
            descendant.focus_areas.remove(*pk_set)
