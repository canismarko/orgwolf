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

import gtd.models as gtd
from gtd.forms import NodeForm
from mptt.admin import MPTTModelAdmin

class NodeAdminForm(NodeForm):
    class Meta:
        model = gtd.Node
        fields = ['title', 'slug', 'todo_state', 'archived', 'text',
                  'parent', 'scheduled_time', 'scheduled_date',
                  'end_time', 'end_date', 'deadline_time',
                  'deadline_date', 'closed', 'repeats',
                  'repeating_number', 'repeating_unit', 'priority',
                  'tag_string', 'focus_areas', 'users']

class NodeAdmin(MPTTModelAdmin):
    form = NodeAdminForm

admin.site.register(gtd.TodoState)
admin.site.register(gtd.Node, NodeAdmin)
admin.site.register(gtd.Context)
admin.site.register(gtd.Tool)
admin.site.register(gtd.Location)
admin.site.register(gtd.Contact)
admin.site.register(gtd.FocusArea)
