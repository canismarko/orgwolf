from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from GettingThingsDone.models import TodoState, Location, Contact, Tool, Priority

class UserProfile(models.Model):
    # TODO: This will be deprecated in Django1.5. Translate code.
    user = models.OneToOneField(User)
    # Customized user profile fields
    todo_state = models.ManyToManyField(TodoState, blank=True)
    location = models.ManyToManyField(Location, blank=True)
    contact = models.ManyToManyField(Contact, blank=True)
    tool = models.ManyToManyField(Tool, blank=True)
    priority = models.ManyToManyField(Priority, blank=True)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
post_save.connect(create_user_profile, sender=User)
