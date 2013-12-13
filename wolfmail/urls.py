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

from django.conf.urls import patterns, include, url
from wolfmail.views import DeferredItemView

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('wolfmail.views',
                       # url(r'^$', 'display_label', kwargs={'requested_label': 'inbox'}),
                       # url(r'^([^/\d][^/]*)/$', 'display_label'),
                       # url(r'^([^/\d][^/]*)/(\d+)/$', 'display_message'),
                       # url(r'^([^/\d][^/]*)/(\d+)/new_node/$', 'convert_mail_to_node'),
                       # url(r'^([^/\d][^/]*)/(\d+)/new_node/([^/\d][^/]*/)?$', 'quick_node'),
                       url(r'^inbox/?$', 'inbox', name='inbox'),
                       url(r'^deferreditem/?',
                           DeferredItemView.as_view(),
                           name='deferred_items',
                       ),
)
