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

import re

from django import template
from django.urls import reverse, NoReverseMatch

register = template.Library()

@register.tag(name="nav_link")
def nav_link(parser, token):
    """Create nav links for the mobile site"""
    # Check arguments
    args = token.split_contents()
    try:
        arg = args[3].strip("'")
    except IndexError:
        arg = None
    else:
        args.pop()
    try:
        tag_name, display, view = args
    except ValueError:
        raise template.TemplateSyntaxError(
            "'{0}' tag requires at least two to three arguments".format(
                token.contents.split()[0])
        )
    # Get the url from the view name
    try:
        if arg:
            url = reverse(view.strip("'"), args=(arg,))
        else:
            url = reverse(view.strip("'"))
    except NoReverseMatch:
        url = ''
    return NavLink(url, display)

class NavLink(template.Node):
    def __init__(self, url, display):
        self.url = url
        self.display = display
    def render(self, context):
        html = '<a href="{url}" class="{active}">{display}</a>'
        match = re.match(self.url, context['request'].path)
        request = context['request']
        # If the url matches the request then link is active
        if match:
            if request.is_mobile:
                active = 'ui-btn-active'
            else:
                active = 'active'
        else:
            active = ''
        context = request.session.get('context')
        if context:
            self.url += 'context{pk}/'.format(pk=context.pk)
        html = html.format(
            url=self.url,
            active=active,
            display=self.display,
            )
        return html
