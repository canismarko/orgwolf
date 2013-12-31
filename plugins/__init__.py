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

from gtd.models import Node

class BaseMessageHandler():
    """
    Handler to be subclassed by plugins. Responsible for processing
    the various commands (methods) on a message. Each plugin file
    should define exactly one subclass of BaseMessageHandler
    called 'MessageHandler'.
    """

    def __init__(self, msg):
        """Set the msg as an attribute for later analysis"""
        self._msg = msg

    def create_node(self):
        """
        Creates and returns a new Node instance. It is not saved
        into the database.
        """
        new_node = Node()
        new_node.owner = self._msg.owner
        self._msg.delete()
        return new_node
