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

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

from gtd.views import Descendants

urlpatterns = patterns('gtd.views',
                       url(r'^$', 'home'),

                       url(r'^lists(?P<url_string>/[\w/]+)?/$', 'list_display'),

                       url(r'^agenda(?:/(?P<date>\d{4}-\d{1,2}-\d{1,2}))?/$', 'agenda_display'),

                       url(r'^toinbox/$', 'capture_to_inbox'),

                       url(r'^node/(?:scope(?P<scope_id>\d+)/)?(?P<show_all>all/)?$', 'display_node'),
                       url(r'^node/(?:scope(?P<scope_id>\d+)/)?(?P<show_all>all/)?(?P<node_id>\d+)/$', 'display_node'),
                       url(r'^node/(?:scope(?P<scope_id>\d+)/)?(?P<node_id>\d+)/edit/', 'edit_node'),
                       url(r'^node/(?:scope(?P<scope_id>\d+)/)?(?P<node_id>\d+)/move/', 'move_node'),
                       url(r'^node/(?:scope(?P<scope_id>\d+)/)?(?:(?P<node_id>\d+)/)?new/', 'new_node'),
                       # url(r'^node/(?P<ancestor_pk>\d+)/descendants/$', 'get_descendants'),
                       url(r'^node/(?P<ancestor_pk>\d+)/descendants/$', 
                           Descendants.as_view(),
                           name='node_descendants'),
                       url(r'^node/search/', 'node_search'),
)
