from django import template
from django.core.urlresolvers import reverse, NoReverseMatch
import re

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
            "{0} tag requires at least two to three arguments".format(token.contents.split()[0])
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
        html = html.format(
            url=self.url,
            active=active,
            display=self.display,
            )
        return html
