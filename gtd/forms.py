######################################################################
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

from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import ValidationError
from django import forms
from django.forms import widgets
from gtd.models import Node

from gtd.models import TodoState

class NodeForm(forms.ModelForm):
    required_css_class = 'required'
    title = forms.CharField(
        widget=widgets.TextInput(
            attrs={'autofocus': 'autofocus',
                   'data-validate': 'required'}),
        )
    tag_string = forms.CharField(
        required=False,
        help_text='Example ":home:phone:"',
        )
    repeats = forms.BooleanField(
        required=False,
        widget=widgets.CheckboxInput(
            attrs={'data-requires': '#id_repeating_number, #id_repeating_unit'}
        ),
    )
    repeating_number = forms.IntegerField(
        required=False,
        widget=widgets.TextInput(
            attrs={'data-validate': 'int'}),
        );
    class Meta:
        fields = ('title',
                  'todo_state',
                  'tag_string',
                  'scheduled_date',
                  'scheduled_time',
                  'deadline_date',
                  'deadline_time',
                  'priority',
                  'focus_areas',
                  'repeats',
                  'repeating_number',
                  'repeating_unit',
                  'repeats_from_completion',
                  'archived',
                  'text',
                  )
        model = Node
        widgets = {
            'title': forms.TextInput(),
            }
    def __init__(self, *args, **kwargs):
        parent = kwargs.pop('parent', None)
        user = kwargs.pop('user', AnonymousUser())
        super(NodeForm, self).__init__(*args, **kwargs)
        # Set initial values if node does not exist
        if parent and not self.instance.pk: # A new node with a parent
            related = parent.related_projects.all()
            self.fields['related_projects'].initial = related
            self.fields['focus_area'].initial = parent.focus_areas.all()
        # Limit todo states to those valid to the user
        self.fields['todo_state'].queryset = TodoState.get_visible(user=user)

    def clean_related_projects(self):
        data = self.cleaned_data['related_projects']
        for project in data:
            # Make sure that all related_projects are root-level nodes
            if project.parent:
                raise ValidationError(
                    'related_project [%s] is not a root-level node.' % project)
            # Also make sure all related_projects are not this
            # node's primary project
            if project.pk == self.instance.get_primary_parent().pk:
                raise ValidationError(
                    'related_project [%s] is already primary project '.join(
                        'for this Node.' % project)
                )
        return data
    def clean_repeating_number(self):
        """Ensure the repeating number is positive."""
        # This models.PositiveIntegerField could in theory be used but
        # zero values are not acceptable in this case.
        num = self.cleaned_data['repeating_number']
        if num or num == 0 or num == '0':
            num = int(num)
            if num <= 0:
                raise forms.ValidationError(
                    'Repeating number must be greater than zero')
        return num
    def clean(self):
        # Combine date and time fields for scheduled and deadline info
        cleaned_data = super(NodeForm, self).clean()
        # Make sure that if this Node repeats then the repeating
        #   information is included.
        if cleaned_data['repeats']:
            if not (cleaned_data['repeating_number'] and
                    cleaned_data['repeating_unit']):
                raise forms.ValidationError(
                    'This Node repeats but the repeating value and unit '.join(
                        'have not been set properly.')
                )
        return cleaned_data
