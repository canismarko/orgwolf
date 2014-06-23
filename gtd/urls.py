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

from django.conf.urls import patterns, url

from orgwolf.views import AngularView

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

from gtd.views import NodeView, TodoStateView, ScopeView, ContextView

urlpatterns = patterns(
    'gtd.views',

    # urls for angular pages
    url(r'^node/search/', AngularView.as_view(), name="search"),
    url(r'^project/?$', AngularView.as_view(), name='projects'),
    url(r'^actions(?:/\d+/[-A-Za-z0-9_]+)?/?$',
        AngularView.as_view(), name='list_display'),

    # Urls for api entry points
    url(r'^nodes(?:/(?P<pk>\d+))?/?$', NodeView.as_view(), name='node_object'),
    url(r'^todostate(?:/(?P<pk>\d+))?/?$',
        TodoStateView.as_view(), name='todo_state'),
    url(r'^scope/?$', ScopeView.as_view(), name='scope_api'),
    url(r'^context/?$', ContextView.as_view(), name='context_api',),
)
