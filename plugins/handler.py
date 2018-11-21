import importlib

from django.db import models
from django.dispatch import receiver

from gtd.models import Node
from wolfmail.models import Message

class BaseMessageHandler():
    """
    Handler to be subclassed by plugins. Responsible for processing
    the various commands (methods) on a message. Each plugin file
    should define exactly one subclass of BaseMessageHandler
    called 'MessageHandler'.
    """

    def __init__(self, msg):
        """Set the msg as an attribute for later analysis"""
        self._msg = msg

    def create_node(self):
        """
        Creates and returns a new Node instance. It is not saved
        into the database.
        """
        new_node = Node()
        new_node.owner = self._msg.owner
        new_node.text = self._msg.message_text
        return new_node

    def archive(self):
        """
        Removes the message from the inbox
        """
        self._msg.in_inbox = False
        self._msg.save()

    def defer(self, new_date):
        """
        Reschedule the message to appear at a new time (presumably in the future.
        """
        self._msg.rcvd_date = new_date
        self._msg.save()


@receiver(models.signals.post_init, sender=Message)
def add_handler(sender, instance, **kwargs):
    """Add the appropriate Handler() object as an attribute"""
    if instance.handler_path == '':
        instance.handler = BaseMessageHandler(instance)
    else:
        try:
            module = importlib.import_module(instance.handler_path)
            instance.handler = module.MessageHandler(instance)
        except AttributeError:
            instance.handler = BaseMessageHandler(instance)


class BaseAccountHandler():
    """
    Contains plugin specific extensions to the AccountAssociation
    model. Each plugin can define 1 AccountHandler() class that
    subclasses BaseAccountHandler.
    """
    def __init__(self, instance):
        _account = instance
    
    def get_messages(self):
        raise NotImplementedError
    
    def authorize_account(self, request_data):
        """To be overridden by plugin. Creates a new account association using
        the given request POST data. Should return a new AccountAssociation, a
        response dictionary and a response status (from rest_framework.status).
        """
        raise NotImplementedError
