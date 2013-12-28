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

"""
Describe the data related to the Getting Things Done portion of this project.
The main model is described by the Node class. The remaining classes describe
other attributes.
"""

from __future__ import unicode_literals, absolute_import, print_function
import datetime as dt
import re

from django import template
from django.utils.html import conditional_escape
from django.utils.safestring import mark_safe
from django.utils.timezone import get_current_timezone

from orgwolf.models import HTMLEscaper

register = template.Library()

@register.simple_tag
def todo_states_json(args):
    return 'hello'

@register.filter
def repeat_icon(value):
    if value:
        return mark_safe('<i class="icon-repeat"></i>')
    else:
        return ''

@register.filter(needs_autoescape=True)
def nodes_as_table(qs, base_url, autoescape=None):
    def dummy_function(stuff):
        return stuff
    if autoescape:
        esc = conditional_escape
    else:
        esc = dummy_function
    html  = """<table class="table">\n
  <tr>
    <th>State</th>
    <th>Description</th>
    <th>Tags</th>
  </tr>"""
    for obj in qs:
        html += '<tr>\n<td>'
        html += '<a href="' + base_url + str(obj.id) + '">'
        html += esc(getattr(obj.todo_state, 'abbreviation', ' '))
        html += '</a>'
        html += '</td>\n<td>'
        html += '<a href="' + base_url + str(obj.id) + '">'
        html += esc(obj.get_title())
        html += '</a>'
        html += '</td>\n<td>'
        html += esc(obj.tag_string)
        html += '</td>\n</tr>\n'
    html += '</table>'
    return mark_safe(html)

@register.filter(needs_autoescape=True)
def nodes_as_hierarchy_table(qs, base_url, autoescape=None):
    def dummy_function(stuff):
        return stuff
    if autoescape:
        esc = conditional_escape
    else:
        esc = dummy_function
    html  = """<table class="table table-hover">\n
  <tr>
    <th>State</th>
    <th>Description</th>
    <th>Tags</th>
  </tr>"""
    for obj in qs:
        html += '<tr>\n<td>'
        html += '<a href="{0}{1}">'.format(base_url, obj.id)
        if hasattr(obj.todo_state, 'pk'):
            html += obj.todo_state.as_html()
        html += '</a>'
        html += '</td>\n<td>'
        html += '<a href="{0}{1}">'.format(base_url, obj.id)
        html += obj.get_title()
        html += '</a><br />'
        html += '<small>' + obj.root_title + '</small>'
        html += '</td>\n<td>'
        html += esc(obj.tag_string)
        html += '</td>\n</tr>\n'
    html += '</table>'
    return mark_safe(html)

@register.filter()
def breadcrumbs(qs, base_url):
    """Returns a breadcrumb trail given a queryset of ancestors."""
    first = True
    h = ''
    for obj in qs:
        h += '&nbsp;&gt; '
        h += '<a href="{url}{pk}/{slug}/">{title}</a>'.format(
            url=base_url,
            pk=obj.pk,
            slug=conditional_escape(obj.slug),
            title=obj.as_html()
        )
    return mark_safe(h)

@register.filter()
def add_scope(string, scope=None):
    """Returns a string formatted with the scope.pk
    added in to the formatting blocks. String should resemble
    '/example/{scope}/' where {pk} is replaced by
    the primary key of scope."""
    if scope:
        scope_s = 'scope{0}'.format(scope.pk)
        return string.format(scope=scope_s)
    else:
        return re.sub('{scope}/?', '', string)

@register.filter()
def upcoming_deadline(node, agenda_dt=None):
    """Pretty prints how many days until the deadline comes up"""
    return node.overdue('deadline',
                         agenda_dt=agenda_dt,
                         future=True)

@register.filter()
def overdue_deadline(node, agenda_dt=None):
    """Pretty prints how many days overdue the deadline is"""
    return node.overdue('deadline',
                         agenda_dt=agenda_dt,
                         future=False)

@register.filter()
def upcoming_deadline(node, agenda_dt=None):
    """Pretty prints how many days until the
    scheduled date comes up.
    """
    return node.overdue('scheduled',
                         agenda_dt=agenda_dt,
                         future=True)

@register.filter()
def overdue_deadline(node, agenda_dt=None):
    """Pretty prints how many days overdue the scheduled date is"""
    return node.overdue('scheduled',
                         agenda_dt=agenda_dt,
                         future=False)

@register.filter()
def escape_html(raw_text):
    parser = HTMLEscaper()
    new_html = parser.clean(raw_text)
    return mark_safe(new_html)
