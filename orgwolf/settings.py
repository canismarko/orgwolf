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

# Django settings for orgwolf project.

DEBUG = True
TEMPLATE_DEBUG = False # DEBUG
ENABLE_CSS = True
ENABLE_JS = True

ADMINS = (
    # ('Your Name', 'your_email@example.com'),
)

MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3', # Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': 'orgwolf-dev.db',                      # Or path to database file if using sqlite3.
        'USER': '',                      # Not used with sqlite3.
        'PASSWORD': '',                  # Not used with sqlite3.
        'HOST': '',                      # Set to empty string for localhost. Not used with sqlite3.
        'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
    }
}

AUTH_USER_MODEL = 'orgwolf.OrgWolfUser'
# AUTH_PROFILE_MODULE = 'orgwolf.UserProfile'

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'America/New_York'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/home/media/media.lawrence.com/media/"
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://media.lawrence.com/media/", "http://example.com/media/"
MEDIA_URL = ''

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT = '/home/mark/src/orgwolf/static/'

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = '/static/'

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#    'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = '(uo8+av7_)vmmd9hb^nd4(=3&amp;qh97!zn+vffxa@8pd+jti!slq'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
    'django.template.loaders.eggs.Loader',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # Uncomment the next line for simple clickjacking protection:
    # 'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'orgwolf.middleware.MobileDetectionMiddleware',
)

# Additional context processors
from django.conf.global_settings import TEMPLATE_CONTEXT_PROCESSORS
TEMPLATE_CONTEXT_PROCESSORS += (
    'orgwolf.context_processors.debug_variables',
    'orgwolf.context_processors.scope_context',
    'django.core.context_processors.request',
    )
    

ROOT_URLCONF = 'orgwolf.urls'

# TEMPLATE_CONTEXT_PROCESSORS = (
#     'django.core.context_processors.debug',
#     'django.contrib.auth.context_processors.auth',
#     )

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'orgwolf.wsgi.application'

TEMPLATE_DIRS = (
    "templates",
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    # 'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'orgwolf',
    'gtd',
    'plugins',
    'wolfmail',
    'south',
    'mptt',
    'social_auth',
    # Uncomment the next line to enable the admin:
    'django.contrib.admin',
    # Uncomment the next line to enable admin documentation:
    'django.contrib.admindocs',
)

# Django-social-auth configuration
SOCIAL_AUTH_BACKENDS = [
    {'title': 'Facebook',
     'class': 'btn-facebook',
     'view': 'facebook',
     'backend': 'social_auth.backends.facebook.FacebookBackend',
     'icon': 'facebook'},
    {'title': 'GitHub',
     'class': 'btn-github',
     'view': 'github',
     'backend': 'social_auth.backends.contrib.github.GithubBackend',
     'icon': 'github'},
    {'title': 'Google',
     'class': 'btn-google',
     'view': 'google-oauth2',
     'backend': 'social_auth.backends.google.GoogleOAuth2Backend',
     'icon': 'google-plus'},
    {'title': 'Twitter',
     'class': 'btn-twitter',
     'view': 'twitter',
     'backend': 'social_auth.backends.twitter.TwitterBackend',
     'icon': 'twitter'},
    ]
SOCIAL_AUTH_USER_MODEL = "orgwolf.OrgWolfUser"
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]
for service in SOCIAL_AUTH_BACKENDS:
    AUTHENTICATION_BACKENDS.append(service['backend'])
LOGIN_URL = '/accounts/login/'
LOGIN_REDIRECT_URL = '/accounts/profile/'
LOGIN_ERROR_URL = '/accounts/login-error/'
SOCIAL_AUTH_DEFAULT_USERNAME = 'orguser'
# Per-application configuration
FACEBOOK_APP_ID = "336968653082120"
FACEBOOK_API_SECRET = "b2c356dc4bd9924712e16394298069ca"
FACEBOOK_EXTENDED_PERMISSIONS = ['email']
GITHUB_APP_ID = 'a5492082d01e4ddc36c3'
GITHUB_API_SECRET = 'ab1226ddfa61e09495f62970eca1223332ecb606'
GOOGLE_OAUTH2_CLIENT_ID = '955970863814.apps.googleusercontent.com'
GOOGLE_OAUTH2_CLIENT_SECRET = 'LXZ4lWKCDbQIuGkbFmFzXLHn'
TWITTER_CONSUMER_KEY = 'mdCrIYcrHUqohrOvCKPz3Q'
TWITTER_CONSUMER_SECRET = 'SLir3qh8IFzuFe6VI58kHpBnzAnAohpWzqjhdmXKqQ'

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        }
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
    }
}

try:
    from local_settings import *
except ImportError:
    pass
