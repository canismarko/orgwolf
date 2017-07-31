#######################################################################
# Copyright 2014 Mark Wolf
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

import importlib

def import_plugin(plugin_module, handler_obj=None):
    """
    Shortcut for importing a plugin and optionally an object.
    """
    if plugin_module == "":
        # Get default module
        handler_cls = 'Base' + handler_cls
        plugin_module = 'plugins'
    module = importlib.import_module(plugin_module)
    if handler_obj:
        plugin = getattr(module, handler_obj)
    else:
        plugin = module
    return plugin
