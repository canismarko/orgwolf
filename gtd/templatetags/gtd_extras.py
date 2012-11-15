from django import template

register = template.Library()

@register.filter
def repeat_icon(value):
    if value:
        return '<i class="icon-repeat"></i>'
    else:
        return ''
