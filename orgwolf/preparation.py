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

"""Holds functions and classes related to first-time setup wizard."""

from gtd.models import TodoState

def populate_todo_states(reset=False):
    """
    Create objects for the system default todo-states.
    If the argument reset=True then all current TodoState objects
    will be deleted.
    """
    if reset:
        TodoState.objects.all().delete()
    system_states = [{'abbr': 'NEXT',
                      'display': 'Next Action',
                      'actionable': True,
                      'closed': False,
                      'owner': None,
                      '_color_rgb': 0,
                      '_color_alpha': 0},
                     {'abbr': 'ACTN',
                      'display': 'Future Action',
                      'actionable': False,
                      'closed': False,
                      'owner': None,
                      '_color_rgb': 0,
                      '_color_alpha': 0},
                     {'abbr': 'DONE',
                      'display': 'Completed',
                      'actionable': False,
                      'closed': True,
                      'owner': None,
                      '_color_rgb': 0,
                      '_color_alpha': 0},
                     {'abbr': 'SMDY',
                      'display': 'Someday Maybe',
                      'actionable': False,
                      'closed': False,
                      'owner': None,
                      '_color_rgb': 0,
                      '_color_alpha': 0},
                     {'abbr': 'DFRD',
                      'display': 'Deferred',
                      'actionable': False,
                      'closed': False,
                      'owner': None,
                      '_color_rgb': 0,
                      '_color_alpha': 0},
                     {'abbr': 'WAIT',
                      'display': 'Waiting For',
                      'actionable': False,
                      'closed': True,
                      'owner': None,
                      '_color_rgb': 0,
                      '_color_alpha': 0},
                     {'abbr': 'CNCL',
                      'display': 'Cancelled',
                      'actionable': False,
                      'closed': True,
                      'owner': None,
                      '_color_rgb': 0,
                      '_color_alpha': 0},
                     {'abbr': 'HARD',
                      'display': 'Hard Scheduled',
                      'actionable': False,
                      'closed': False,
                      'owner': None,
                      '_color_rgb': 0,
                      '_color_alpha': 0}]
    for state in system_states:
        todo_state = TodoState(abbreviation = state['abbr'],
                               display_text = state['display'],
                               actionable = state['actionable'],
                               closed = state['closed'],
                               _color_rgb = state['_color_rgb'],
                               _color_alpha = state['_color_alpha'])
        todo_state.save()
