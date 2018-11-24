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

from django.conf.urls import include, url
from django.contrib.auth.views import login, logout
from django.views.generic import TemplateView

from orgwolf.views import (FeedbackView, AngularView, AccountAssociationView,
                           UserView, home)

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = [
    
    # Redirect to other apps
    url(r'^gtd/', include('gtd.urls')),
    url(r'^wolfmail/', include('wolfmail.urls')),
    
    # Angular entry points
    url(r'^$', home, name='home'),
    url(r'^search/?', AngularView.as_view(), name="search"),
    url(r'^calendar/?', AngularView.as_view()),
    url(r'^accounts/settings/?$', AngularView.as_view()),
    
    # API entry points
    url(r'^feedback/?$', FeedbackView.as_view(), name='feedback'),
    # url(r'^providers/?$', orgwolf.views.socialauth_providers),
    # url(r'^accountassociations(?:/(?P<id>\d+))?/?$', AccountAssociationView.as_view()),
    url(r'^user/current/?$', UserView.as_view(), name='current_user'),

    # Authentication stuff
    url(r'^accounts/login/$', login, name='login'),
    url(r'^accounts/logout/$', logout),

    #Uncomment the admin/doc line below to enable admin documentation
    # url(r'^admin/doc/',
    #     include('django.contrib.admindocs.urls')),
    # Uncomment the next line to enable the admin
    url(r'^admin/', admin.site.urls),
    # url(r'^admin/', include(admin.site.urls)),
    
    # Javascript unit tests
    url(r'^test/jasmine/$', TemplateView.as_view(template_name='jasmine.html')),

]
