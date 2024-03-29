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

from django.conf.urls import url

from gtd import views as gtd_views
from orgwolf.views import AngularView

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

# from gtd.views import NodeView, TodoStateView, FocusAreaView, ContextView

urlpatterns = [

    # urls for angular pages
    url(r'^projects/?$', AngularView.as_view(), name='projects'),
    url(r'^actions(?:/\d+/[-A-Za-z0-9_]+)?/?$',
        AngularView.as_view(), name='list_display'),
    url(r'^review(?:/\d+/[-A-Za-z0-9_]+)?/?$',
        AngularView.as_view(), name='weekly_review'),
    
    # Urls for api entry points
    url(r'^nodes(?:/(?P<pk>\d+))?/?$',
        gtd_views.NodeView.as_view(), name='node_object'),
    url(r'^todostates(?:/(?P<pk>\d+))?/?$',
        gtd_views.TodoStateView.as_view(), name='todo_state'),
    url(r'^focusareas/?$', gtd_views.FocusAreaView.as_view(), name='focus_area_api'),
    url(r'^contexts/?$', gtd_views.ContextView.as_view(), name='context_api',),
    url(r'^locations/?$', gtd_views.LocationView.as_view(), name='location_api',),
    url(r'^weeklyreviews(?:/(?P<pk>\d+))?/?$',
        gtd_views.WeeklyReviewView.as_view(), name="weekly_review_api",),
    url(r'^weeklyreviews/activereview/?$',
        gtd_views.WeeklyReviewActiveView.as_view(), {'finalized': True}, name="weekly_review_active_api",),
    url(r'^weeklyreviews/openreview/?$',
        gtd_views.WeeklyReviewActiveView.as_view(), {'finalized': False}, name="weekly_review_open_api",),
    url(r'^weeklyreviews/(?P<pk>\d+)/nodes/?$',
        gtd_views.WeeklyReviewNodesView.as_view(), name="weekly_review_nodes_api",),
]
