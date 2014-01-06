# -*- coding: utf-8 -*-
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

from gtd.views import (Descendants, NodeView, TodoStateView,
                       ScopeView, NodeListView, ContextView,
                       ProjectView, UpcomingNodeView, actions)

urlpatterns = patterns(
    'gtd.views',
    url(r'^$', 'home'),

    # url(r'^toinbox/$', 'capture_to_inbox'),

    url(r'^node/search/', 'node_search'),

    # New API urls below
    url(r'^project(?:/(?P<pk>\d+))?(?:/(?P<slug>[-\w\d]*))?(:?/(?P<show_all>all/))?/?$',
        ProjectView.as_view(),
        name='projects'
    ),

    url(r'^node(?:/(?P<pk>\d+))?/?$',
        NodeView.as_view(),
        name='node_object'
    ),

    url(r'^node/upcoming/?',
        UpcomingNodeView.as_view(),
        name='upcoming'
    ),

    url(r'^node/descendants/(?P<ancestor_pk>\d+)/$',
        Descendants.as_view(),
        name='node_descendants'
    ),

    url(r'^todostate(?:/(?P<pk>\d+))?/?$',
        TodoStateView.as_view(),
        name='todo_state'
    ),

    url(r'^actions(?:/(?P<context_id>\d+)/(?P<context_slug>[-A-Za-z0-9_]+))?/?$',
        'actions',
        name='list_display'
    ),

    url(r'^lists(?:/(?P<context_id>\d+)/(?P<context_slug>[-A-Za-z0-9_]+))?/?$',
        NodeListView.as_view(),
        name='list_api'
    ),

    url(r'^scope/?$',
        ScopeView.as_view(),
        name='scope_api',
    ),

    url(r'^context/?$',
        ContextView.as_view(),
        name='context_api',
    )
)
