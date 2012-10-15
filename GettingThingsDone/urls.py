from django.conf.urls import patterns, include, url

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('GettingThingsDone.views',
                       url(r'^$', 'home'),
                       url(r'^lists/$', 'list_selection'),
                       url(r'^lists/([\w/]+)/$', 'list_display'),
                       url(r'^agenda/$', 'agenda_display'),
                       url(r'^agenda/([^/]+)/$', 'agenda_display'),
)
