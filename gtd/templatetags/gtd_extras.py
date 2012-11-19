from django import template
from django.utils.html import conditional_escape
from django.utils.safestring import mark_safe

register = template.Library()

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
        html += esc(getattr(obj.todo_state, 'abbreviation', ' '))
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

