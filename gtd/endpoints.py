from gtd.models import Node

def get_heading(request):
    """Pull the children and text of the requested node 
    and return as a JSON object."""
    parent_node = Node.objects.get(id=request.POST['parent_id'])
    children = []
    for child in parent_node.child_heading_set.all():
        children.append(
            {'html': child.title,
             'node_id': child.id,
             'tags': child.tag_string,
             })
    return {
        'parent_id': request.POST['parent_id'],
        'children': children,
        'text': parent_node.text,
        }
