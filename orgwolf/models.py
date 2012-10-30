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

from django.db import models
from django.contrib.auth.models import User, AbstractUser
from django.db.models.signals import post_save
from GettingThingsDone.models import TodoState, Location, Contact, Tool, Priority

# # Dropped in favor new 1.5 approach
# class UserProfile(models.Model):
#     # TODO: This will be deprecated in Django1.5. Translate code.
#     user = models.OneToOneField(User)
#     # Customized user profile fields
#     todo_state = models.ManyToManyField(TodoState, blank=True)
#     location = models.ManyToManyField(Location, blank=True)
#     contact = models.ManyToManyField(Contact, blank=True)
#     tool = models.ManyToManyField(Tool, blank=True)
#     priority = models.ManyToManyField(Priority, blank=True)
# def create_user_profile(sender, instance, created, **kwargs):
#     if created:
#         UserProfile.objects.create(user=instance)
# post_save.connect(create_user_profile, sender=User)

class OrgWolfUser(AbstractUser):
    """Holds profile information for users."""
    preferred_timezone = models.CharField(max_length=25, blank=True)

class Color:
    """
    Describes an RGB color with alpha.
    """
    # TODO: write unittests for Color class
    RED_OFFSET = 16 # in bits
    GREEN_OFFSET = 8
    BLUE_OFFSET = 0
    RED_MASK = 0xFF0000
    GREEN_MASK = 0x00FF00
    BLUE_MASK = 0x0000FF
    def __init__(self, red, green, blue, alpha=float(1)):
        self.red = red
        self.green = green
        self.blue = blue
        self._alpha = int(alpha*100) # Alpha is stored internally as integer 0-100
    def html_string(self):
        """Return a hex string suitable for use in html documents"""
        def _format_hex_digits(number):
            return str(hex(number))[2:4].upper()
        string = "#"
        string += _format_hex_digits(self.red)
        string += _format_hex_digits(self.green)
        string += _format_hex_digits(self.blue)
        return string

    def rgb_string(self):
        """Return a (red, green, blue) string. Suitable for use in CSS."""
        def _format_int_digits(number):
            return str(int(number))
        string = "rgb("
        string += _format_int_digits(self.red)
        string += ", "
        string += _format_int_digits(self.blue)
        string += ", "
        string += _format_int_digits(self.green)
        string += ")"
        return string
    def rgba_string(self):
        """Returns a (red, green, blue, alpha) string. Suitable for use in CSS."""
        # Calls rgb_string and adds alpha
        string = "rgba("
        string += self.rgb_string()[4:-1] + ", " 
        string += str(float(self._alpha)/100) + ")"
        return string
    def rgb_hex(self):
        """Returns a number describing the color: 0xRRGGBB"""
        composite = self.red << self.RED_OFFSET
        composite = composite & (self.green << self.GREEN_OFFSET)
        composite = composite & (self.blue << self.BLUE_OFFSET)
        return hex(composite)

    def get_alpha(self):
        return float(self._alpha)/100
    def set_alpha(self, new_alpha):
        """Sets the alpha value (between 0 and 1)."""
        self._alpha = int(new_alpha * 100)
    
