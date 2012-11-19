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

from django.core.exceptions import ValidationError
from django import forms
from django.forms import widgets
from django.utils import timezone
from gtd.models import Node
import datetime as dt

class NodeForm(forms.ModelForm):
    required_css_class = 'required'
    title = forms.CharField(
        widget=widgets.TextInput(attrs={'autofocus': 'autofocus'}),
        )
    scheduled = forms.DateTimeField(
        widget=widgets.HiddenInput,
        required=False,
        )
    scheduled_date = forms.DateField(
        required=False,
        widget=widgets.TextInput(attrs={'class': 'datepicker'}),
        )
    scheduled_time = forms.TimeField(
        required=False, 
        localize=True,
        widget=widgets.TextInput(attrs={'class': 'timepicker'}),
        )
    scheduled_time_specific = forms.BooleanField(
        required=False,
        widget=widgets.CheckboxInput(attrs={'toggles': 'scheduled_time'}),
        )
    deadline = forms.DateTimeField(
        widget=widgets.HiddenInput,
        required=False,
        )
    deadline_date = forms.DateField(
        required=False,
        widget=widgets.TextInput(attrs={'class': 'datepicker'}),
        )
    deadline_time = forms.TimeField(
        required=False, 
        localize=True,
        widget=widgets.TextInput(attrs={'class': 'timepicker'}),
        )
    deadline_time_specific = forms.BooleanField(
        required=False,
        widget=widgets.CheckboxInput(attrs={'toggles': 'deadline_time'}),
        )
    related_projects = forms.ModelMultipleChoiceField(
        queryset=Node.get_all_projects().order_by('title'), 
        required=False,
        )
    class Meta:
        fields = ('title',
                  'todo_state',
                  'scheduled',
                  'scheduled_date',
                  'scheduled_time',
                  'scheduled_time_specific',
                  'deadline',
                  'deadline_date',
                  'deadline_time',
                  'deadline_time_specific',
                  'priority',
                  'scope',
                  'repeats',
                  'repeating_number',
                  'repeating_unit',
                  'repeats_from_completion',
                  'related_projects',
                  'text',
                  'tag_string',
                  )
        model = Node
        widgets = {
            'title': forms.TextInput(),
            }
    def __init__(self, *args, **kwargs):
        if 'parent' in kwargs.keys():
            parent = kwargs['parent']
            del(kwargs['parent'])
        else:
            parent = None
        super(NodeForm, self).__init__(*args, **kwargs)
        # Set initial values if node already exists
        if self.instance.pk:
            local_tz = timezone.get_current_timezone()
            self.fields['related_projects'].initial = self.instance.related_projects.all()
            if self.instance.scheduled:
                self.fields['scheduled_date'].initial = self.instance.scheduled.astimezone(local_tz).date()
                self.fields['scheduled_time'].initial = self.instance.scheduled.astimezone(local_tz).time()
            if self.instance.deadline:
                self.fields['deadline_date'].initial = self.instance.deadline.astimezone(local_tz).date()
                self.fields['deadline_time'].initial = self.instance.deadline.astimezone(local_tz).time()
        # Set initial values if node does not exist
        if parent and not self.instance.pk: # A new node with a parent
            self.fields['related_projects'].initial = parent.related_projects.all()
            self.fields['scope'].initial = parent.scope.all()
        # Remove the node's main project (if it exists) from possible values
        instance = dir(self.instance)
        primary_project = self.instance.get_primary_parent()
        if parent:
            primary_project = parent.get_primary_parent()
        if primary_project:
            fixed_qs = self.fields['related_projects'].queryset.exclude(
                pk=primary_project.pk
                )
        self.fields['related_projects'].queryset = fixed_qs
           
    def clean_related_projects(self):
        data = self.cleaned_data['related_projects']
        for project in data:
            # Make sure that all related_projects are root-level nodes
            if project.parent:
                raise ValidationError('related_project [%s] is not a root-level node.' % project)
            # Also make sure all related_projects are not this node's primary project
            if project.pk == self.instance.get_primary_parent().pk:
                raise ValidationError('related_project [%s] is already primary project for this Node.' % project)
        return data
    def clean(self):
        # Combine date and time fields for scheduled and deadline info
        local_tz = timezone.get_current_timezone()
        cleaned_data = super(NodeForm, self).clean()
        def get_new_datetime(new_date, new_time):
            # Helper function to determine what to put in the new date or time field
            if new_date:
                if new_time:
                    naive_dt = dt.datetime(new_date.year,
                                         new_date.month,
                                         new_date.day,
                                         new_time.hour,
                                         new_time.minute,
                                         new_time.second)
                else:
                    naive_dt = dt.datetime(new_date.year,
                                         new_date.month,
                                         new_date.day,
                                         0,
                                         0,
                                         0)
                return local_tz.localize(naive_dt)
            else:
                return None
        # Process the deadline and scheduled fields
        cleaned_data['scheduled'] = get_new_datetime(
            cleaned_data['scheduled_date'],
            cleaned_data['scheduled_time'])
        cleaned_data['deadline'] = get_new_datetime(
            cleaned_data['deadline_date'],
            cleaned_data['deadline_time'])
        # Make sure that if this Node repeats then the repeating
        #   information is included.
        if cleaned_data['repeats']:
            if not (cleaned_data['repeating_number'] and
                    cleaned_data['repeating_unit']):
                raise forms.ValidationError(
                    "This Node repeats but the repeating value and unit have not been set properly."
                    )
        return cleaned_data
