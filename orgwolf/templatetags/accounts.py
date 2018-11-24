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

from django import template
from django.urls import reverse
from orgwolf import settings

register = template.Library()

@register.tag(name="login_buttons")
def login_buttons(parser, token):
    """Display social network login buttons based on context"""
    args = token.split_contents()
    # See if a message was supplied
    if len(args) == 1:
        msg = '<b>{0}</b>'
    elif len(args) == 2:
        msg = args[1]
    else:
        raise template.TemplateSyntaxError(
            "'{0}' tag takes at most one argument (got {1})".format(
                args[0], len(args)-1
                )
            )
    # Prepare the renderer
    btns = []
    for service in settings.SOCIAL_AUTH_BACKENDS:
        new = {
            'display': msg.strip('\'').format( service['title'] ),
            'url': reverse( 'socialauth_begin', args=[ service['view'] ] ),
            'class': 'btn-auth {0}'.format( service['class'] ),
            'icon': service['icon'],
            }
        btns.append( new )
    return Buttons(btns)

class Buttons(template.Node):
    """Formats some login services into HTML Login buttons"""
    def __init__(self, btns):
        self.btns = btns
    def render(self, context):
        html = '<ul class="social-auth">\n'
        request = context['request']
        if request.is_mobile:
            string = '<li>\n\t<a href="{1}" data-icon="{3}" data-role="button" data-theme="a" rel="external">{2}</a>\n<li>/n'
        else:
            string = '<li>\n\t<a class="{0}" href="{1}">{2}</a>\n</li>\n'
        for btn in self.btns:
            html += string.format(btn['class'],
                                  btn['url'],
                                  btn['display'],
                                  btn['icon'],
                                  )
        html += '</ul>\n'
        return html
