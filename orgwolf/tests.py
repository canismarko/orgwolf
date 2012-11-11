
from __future__ import unicode_literals
from GettingThingsDone.models import Node, TodoState, Project
from orgwolf.models import OrgWolfUser as User

"""Hold some helper functions useful to all test suits"""
def prepare_database():
    dummy_user = User(username='test')
    dummy_user.set_password('secret')
    dummy_user.save()
    actionable = TodoState(abbreviation='ACTN',
                           display_text='Action',
                           actionable=True,
                           closed=False,
                           owner=dummy_user,
                           system_default=True)
    actionable.save()
    closed = TodoState(abbreviation='DONE',
                       display_text='Completed',
                       actionable=False,
                       closed=True,
                       owner=dummy_user,
                       system_default=True)
    closed.save()
    project = Project(title='Errands',
                      owner=dummy_user)
    project.save()
