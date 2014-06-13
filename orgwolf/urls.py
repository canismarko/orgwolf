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
from django.contrib.auth.views import login, logout
from django.views.generic import TemplateView

from orgwolf.views import FeedbackView, AccountsView

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()
urlpatterns = patterns('',
                       url(r'^$', 'orgwolf.views.home', name='home'),
                       url(r'^feedback/?$', FeedbackView.as_view(),
                           name='feedback'),
                       url(r'^gtd/', include('gtd.urls')),
                       url(r'^messaging/', include('wolfmail.urls')),
                       url(r'^wolfmail/', include('wolfmail.urls')),
                       url(r'^calendar/', TemplateView.as_view(template_name='angular.html')),
                       # Authentication stuff
                       url(r'', include('social_auth.urls')),
                       url(r'^accounts/login/$',
                           login,
                           name='login',
                       ),
                       url(r'^accounts/logout/$', logout),
                       # orgwolf settings
                       url(r'^accounts/profile/',
                           'orgwolf.views.profile'),
                       url(r'^accounts/accounts/',
                           AccountsView.as_view(),
                           name='ow-accounts'),
                       url(r'^accounts/password/',
                           'orgwolf.views.change_password',
                           name='change_password'),
                       url(r'^accounts/login/persona/',
                           'orgwolf.views.persona_login'),
                       url(r'^accounts/logout/persona/$',
                           'orgwolf.views.persona_logout'),

                       #Uncomment the admin/doc line below to enable admin documentation
                       url(r'^admin/doc/',
                           include('django.contrib.admindocs.urls')),
                       # Uncomment the next line to enable the admin
                       url(r'^admin/',
                           include(admin.site.urls)),

                       # Javascript unit tests
                       url(r'^test/qunit/$',
                           'orgwolf.views.jstest'),
                       url(r'^test/jasmine/$',
                           TemplateView.as_view(template_name='jasmine.html'))

)

# Deprecated: ? # urlpatterns += staticfiles_urlpatterns()
