from django import template


register = template.Library()

@register.filter
def repeat_icon(value):
    if value:
        return '<i class="icon-repeat"></i>'
    else:
        return ''

@register.filter
def nodes_as_table(qs, base_url):
    html  = """<table class="table">\n
  <tr>
    <th>State</th>
    <th>Description</th>
    <th>Tags</th>
  </tr>"""
    for obj in qs:
        html += '<tr>\n<td>'
        html += '<a href="' + base_url + str(obj.id) + '">'
        html += getattr(obj.todo_state, 'abbreviation', '&nbsp;')
        html += '</a>'
        html += '</td>\n<td>'
        html += '<a href="' + base_url + str(obj.id) + '">'
        html += obj.get_title()
        html += '</a>'
        html += '</td>\n<td>'
        html += obj.tag_string
        html += '</td>\n</tr>\n'
    html += '</table>'
    return html

@register.filter
def nodes_as_hierarchy_table(qs, base_url):
    html  = """<table class="table table-hover">\n
  <tr>
    <th>State</th>
    <th>Description</th>
    <th>Tags</th>
  </tr>"""
    for obj in qs:
        html += '<tr>\n<td>'
        html += '<a href="' + base_url + str(obj.id) + '">'
        html += getattr(obj.todo_state, 'abbreviation', '&nbsp;')
        html += '</a>'
        html += '</td>\n<td>'
        html += '<a href="' + base_url + str(obj.id) + '">'
        html += obj.get_title()
        html += '</a><br />'
        html += '<small>' + obj.get_hierarchy_as_string() + '</small>'
        html += '</td>\n<td>'
        html += obj.tag_string
        html += '</td>\n</tr>\n'
    html += '</table>'
    return html

