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

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User

from orgwolf.models import OrgWolfUser

admin.site.register(OrgWolfUser)
# Deprecated in favor of AUTH_USER_MODEL setting in Django 1.5a
# from orgwolf.models import UserProfile

# Define an inline admin descriptor for UserProfile model
# which acts a bit like a singleton
# class UserProfileInline(admin.StackedInline):
#     model = UserProfile
#     can_delete = False
#     verbose_name_plural = 'profile'

# # Define a new User admin
# class UserAdmin(UserAdmin):
#     inlines = (UserProfileInline, )

# # Re-register UserAdmin
# admin.site.unregister(User)
# admin.site.register(User, UserAdmin)
