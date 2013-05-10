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

from django import forms
from django.contrib.auth import forms as authforms
from orgwolf.models import OrgWolfUser as User
from wolfmail.models import MailItem

class FeedbackForm(forms.ModelForm):
    subject = forms.CharField()
    class Meta:
        model = MailItem
        fields = ('subject', 'message_text')

class PasswordForm(authforms.AuthenticationForm):
    password = forms.CharField(
        widget=forms.PasswordInput(),
        label="New Password")
    password_2 = forms.CharField(
        widget=forms.PasswordInput(),
        label="Password Again")
    class Meta:
        model = User
        fields = ('password',)
    def clean(self):
        # Make sure both password fields are the same
        data = self.cleaned_data
        if data.get('password') != data.get('password_2'):
            raise forms.ValidationError('Passwords do not match')
        return self.cleaned_data

class RegistrationForm(PasswordForm):
    class Meta:
        model = User
        fields = ('username', 'password')

class ProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = (
            'first_name',
            'last_name',
            'email',
            'preferred_timezone',
            )
