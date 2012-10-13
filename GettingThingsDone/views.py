from GettingThingsDone.models import TodoState

def get_todo_abbrevs():
    """Return a list of the TODO State abbreviations corresponding to TodoState models."""
    todo_state_list = TodoState.objects.all()
    abbreviation_list = []
    for todo_state in todo_state_list:
        abbreviation_list.append(todo_state.abbreviation)
    return abbreviation_list
