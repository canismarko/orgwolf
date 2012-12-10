from gtd.models import Node

def get_heading(request):
    """Pull the children and text of the requested node 
    and return as a JSON object."""
    print request.POST
    if request.POST['parent_id'] == '0':
        children_qs = Node.objects.filter(parent=None)
        parent_text = ''
    else:
        parent_node = Node.objects.get(id=request.POST['parent_id'])
        children_qs = parent_node.child_heading_set.all()
        parent_text = parent_node.text
    children = []
    for child in children_qs:
        children.append(
            {'html': child.title,
             'node_id': child.id,
             'tags': child.tag_string,
             'text': child.text,
             })
    return {
        'parent_id': request.POST['parent_id'],
        'children': children,
        'text': parent_text,
        }
