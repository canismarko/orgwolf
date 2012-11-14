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
from GettingThingsDone.models import Node

class NodeForm(forms.ModelForm):
    related_projects = forms.ModelMultipleChoiceField(
        queryset=Node.get_all_projects().order_by('title'), 
        required=False)
    class Meta:
        fields = ('title', 
                  'todo_state', 
                  'scheduled', 
                  'scheduled_time_specific', 
                  'deadline', 
                  'deadline_time_specific', 
                  'priority', 
                  'scope', 
                  'repeats', 
                  'repeating_number', 
                  'repeating_unit', 
                  'repeats_from_completion', 
                  'related_projects', 
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
            self.fields['related_projects'].initial = self.instance.related_projects.all()
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
