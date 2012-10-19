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
from django.db.models.signals import post_save
from GettingThingsDone.models import TodoState, Location, Contact, Tool, Priority

class UserProfile(models.Model):
    # TODO: This will be deprecated in Django1.5. Translate code.
    user = models.OneToOneField(User)
    # Customized user profile fields
    todo_state = models.ManyToManyField(TodoState, blank=True)
    location = models.ManyToManyField(Location, blank=True)
    contact = models.ManyToManyField(Contact, blank=True)
    tool = models.ManyToManyField(Tool, blank=True)
    priority = models.ManyToManyField(Priority, blank=True)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
post_save.connect(create_user_profile, sender=User)
