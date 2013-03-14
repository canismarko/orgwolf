from django import template
from django.utils.html import conditional_escape
from django.utils.safestring import mark_safe
import datetime as dt
import re
from markdown import markdown

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
        html += '<a href="' + base_url + str(obj.id) + '">'
        if hasattr(obj.todo_state, 'pk'):
            html += esc(obj.todo_state.as_html())
        html += '</a>'
        html += '</td>\n<td>'
        html += '<a href="' + base_url + str(obj.id) + '">'
        html += esc(obj.get_title())
        html += '</a><br />'
        html += '<small>' + esc(obj.get_hierarchy_as_string()) + '</small>'
        html += '</td>\n<td>'
        html += esc(obj.tag_string)
        html += '</td>\n</tr>\n'
    html += '</table>'
    return mark_safe(html)

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

@register.filter(expects_localtime=True)
def overdue(item_dt, agenda_dt=None, future=False):
    """Returns a string describing the datetime in a prettier format.
    It returns things like "in 1 day". If future=True then it will
    also process dates in the future otherwise it will just return
    blank strings."""
    if item_dt == None:
        # Item has no deadline/scheduled/etc
        return mark_safe('&nbsp;')
    if agenda_dt:
        today = agenda_dt.date()
    else:
        today = dt.datetime.now().date()
    item_date = item_dt.date()
    string = '&nbsp;'
    diff = (item_date - today).days
    # Pluralized
    if abs(diff) != 1:
        plural = 's'
    else:
        plural = ''
    # Process dates
    if diff == 0:
        string = 'today'
    elif diff > 0 and future == True:
        # Process future dates
        string = 'in ' + str(diff) + ' day' + plural
    elif diff < 0:
        # Process past dates
        string = str(abs(diff)) + ' day' + plural + ' ago'
    return mark_safe(string)

@register.filter(expects_localtime=True)
def upcoming(item_dt, agenda_dt=None):
    """Wrapper for overdue()."""
    return overdue(item_dt, agenda_dt, future=True)

@register.filter
def escape_html(raw_text):
    parser = HTMLEscaper()
    new_html = parser.clean(raw_text)
    new_text = markdown(new_html)
    return mark_safe(new_html)
