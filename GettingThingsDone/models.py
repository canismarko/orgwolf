from django.db import models
# Create your models here.

class TodoState(models.Model):
    abbreviation = models.CharField(max_length=10)
    display_text = models.CharField(max_length=30)
    actionable = models.BooleanField(default=True)
    done = models.BooleanField(default=False)

class Tag(models.Model):
    display = models.CharField(max_length=100)
    value = models.CharField(max_length=10)

class Tool(Tag):
    
class Location(Tag):

class Contact(Tag):

class Context(models.Model):
    tools_available = models.ManyToManyField('Tool')
    tools_unavailable = models.ManyToManyField('Tool')
    locations_available = models.ManyToManyField('Location')
    locations_unavailable = models.ManytoManyField('Location')

class Heading(models.Model):
    """
    Django model that holds some sort of divisional heading. Similar to orgmode '*** Heading'
    syntax. It can have todo states associated with it as well as scheduling and other information.
    """
    # Determine where this heading is
    parent = models.ForeignKey('self')
    todo_state = models.ForeignKey('TodoState', blank=True, null=True)
    # Scheduling details
    scheduled_date = models.DateField(blank=True, null=True)
    closed_date = models.DateField(blank=True, null=True)
    deadline_date = models.DateField(blank=True, null=True)
    scheduled_datetime = models.DateTimefield(blank=True, null=True)
    closed_datetime = models.DateTimefield(blank=True, null=True)
    deadline_datetime = models.DateTimefield(blank=True, null=True)
    # Miscellaneous details
    priority = models.ForeignKey('Priority', blank=True, null=True)
    context = models.ForeignKey('Context')
    contact = models.ManyToManyField('Contact')
    tag_string = models.TextField() # Org-mode style string (eg ":comp:-phone:")
    # These methods provide statuses of this object
    def is_todo(self):
        if self.todo_state:
            return True
        else:
            return False
    def is_actionable(self):
        if self.todo_state:
            return todo_state.actionable
        else:
            return False
    def is_done(self):
        if self.todo_state:
            return todo_state.done
        else:
            return False
    # Get the tags associated with this heading
    def get_tags(self):
        tags_list = self.tag_string.split(":")
        return tags_list[1:len(tags_list-1) # Get rid of the empty first and last elements
class Text(models.Model):
    parent = models.ForeignKey('Heading')

