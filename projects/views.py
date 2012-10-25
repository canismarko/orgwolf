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

from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.contrib.auth.decorators import login_required
from django.http import Http404
from django.db.models import Q
from django.contrib.auth.models import User
import re
import datetime

from GettingThingsDone.models import Project, Node, Text
from projects.forms import NodeForm

def display_node(request, node_id=None):
    """Displays a node as a list of links to its children.
    If no node_id is specified, shows the projects list."""
    all_projects_qs = Project.objects.all()
    all_nodes_qs = Node.objects.all()
    child_nodes_qs = all_nodes_qs
    all_text_qs = Text.objects.all()
    # If the user asked for a specific node
    if node_id:
        node_text_qs = all_text_qs.filter(parent__id=node_id)
        child_nodes_qs = child_nodes_qs.filter(parent__id=node_id)
        parent_node = all_nodes_qs.get(id=node_id)
        parent_tags = parent_node.get_tags()
        breadcrumb_list = parent_node.get_hierarchy()
    else: # Otherwise display root level nodes (Projects)
        child_nodes_qs = child_nodes_qs.filter(parent=None)
        node_text_qs = all_text_qs.filter(parent=None)
    return render_to_response('project_view.html',
                              locals(),
                              RequestContext(request))

def edit_node(request, node_id):
    """Display a form to allow the user to edit a node"""
    node = Node.objects.get(id=node_id)
    breadcrumb_list = node.get_hierarchy()
    if request.method == "POST": # Form submission
        form = NodeForm(request.POST, instance=node)
        if form.is_valid():
            form.save()
            redirect_url = "/projects/" + node_id + "/"
            return redirect(redirect_url)
    else: # Blank form
        form = NodeForm(instance=node)
    return render_to_response('node_edit.html',
                              locals(),
                              RequestContext(request))

def new_node(request, node_id):
    """Display a form to allow the user to edit a node"""
    new = "Yes" # Used in template logic
    node = Node.objects.get(id=node_id)
    breadcrumb_list = node.get_hierarchy()
    if request.method == "POST": # Form submission
        last_node = Node.objects.filter(parent__id=node_id).reverse()[0]
        form = NodeForm(request.POST)
        form.owner = User.objects.get(id=1) # TODO: switch to user profile
        form.order = last_node.order + last_node.ORDER_STEP
        form.parent = Node.objects.get(id=node_id)
        if form.is_valid():
            form.save()
            redirect_url = "/projects/" + form.id + "/"
            return redirect(redirect_url)
    else: # Blank form
        form = NodeForm()
        # TODO: set default projects for new nodes
    return render_to_response('node_edit.html',
                              locals(),
                              RequestContext(request))
