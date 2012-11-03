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
"""Describes a generic stack feature. Obects can be pushed and popped."""

class Element:
    def __init__(self, value, next):
        self.value = value
        self.next = next

class Stack:
    def __init__(self):
        self.head = None
    def push(self, element):
        self.head = Element(element, self.head)
    def pop(self):
        if self.empty(): raise EmptyStackException
        result = self.head.value
        self.head = self.head.next
        return result
    def empty(self):
        return self.head == None
