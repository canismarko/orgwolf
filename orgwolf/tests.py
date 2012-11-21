
from __future__ import unicode_literals
from gtd.models import Node, TodoState
from orgwolf.models import OrgWolfUser as User

"""Hold some helper functions useful to all test suits"""
def prepare_database():
    dummy_user = User(username='test')
    dummy_user.set_password('secret')
    dummy_user.save()
    TodoState(
        abbreviation='ACTN',
        display_text='Action',
        actionable=True,
        closed=False,
        owner=dummy_user,
        ).save()
    TodoState(
        abbreviation='NEXT',
        display_text='Next Action',
        actionable=True,
        closed=False,
        owner=dummy_user,
        ).save()
    TodoState(
        abbreviation='DONE',
        display_text='Completed',
        actionable=False,
        closed=True,
        owner=dummy_user
        ).save()
