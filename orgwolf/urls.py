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
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from orgwolf.forms import RegistrationForm

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()
urlpatterns = patterns('',
                       url(r'^$', 'orgwolf.views.home', name='home'),
                       url(r'^feedback/$', 'orgwolf.views.feedback'),
                       url(r'^gtd/', include('gtd.urls')),
                       url(r'^messaging/', include('wolfmail.urls')),
                       url(r'^wolfmail/', include('wolfmail.urls')),
                       # Authentication stuff
                       url(r'', include('social_auth.urls')),
                       url(r'^accounts/login/$',
                           login,
                           name='login',
                       ),
                       url(r'^accounts/logout/', logout),
                       url(r'^accounts/register/',
                           'orgwolf.views.new_user'),
                       url(r'^accounts/profile/',
                           'orgwolf.views.profile'),
                       url(r'^accounts/password/',
                           'orgwolf.views.change_password',
                           name='change_password'),
                       url(r'^accounts/login/persona/',
                           'orgwolf.views.persona_login'),
                       url(r'^acoounts/logout/persona/',
                           'orgwolf.views.persona_logout'),

                       #Uncomment the admin/doc line below to enable admin documentation
                       url(r'^admin/doc/',
                           include('django.contrib.admindocs.urls')),
                       # Uncomment the next line to enable the admin
                       url(r'^admin/',
                           include(admin.site.urls)),

                       # Javascript unit tests (QUnit)
                       url(r'^test/js/$',
                           'orgwolf.views.jstest'),
)

# Deprecated: ? # urlpatterns += staticfiles_urlpatterns()
