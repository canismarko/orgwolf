from httplib2 import Http
from apiclient.discovery import build
from apiclient.http import BatchHttpRequest
import dateutil.parser
from django.conf import settings
from django.db import IntegrityError
import json
from oauth2client import client
from rest_framework import status

from orgwolf.models import AccountAssociation
from plugins import BaseAccountHandler
from wolfmail.models import Message


NAME = "Google"
GOOGLE_SCOPE = 'https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/gmail.modify'


class GoogleMessage(Message):
    """Proxy model that knows about gmails response format."""
    def __init__(self, g_data, *args, **kwargs):
        super(GoogleMessage, self).__init__(*args, **kwargs)
        self.handler_path = 'plugins.google'
        # Set up init values based on google data
        self.payload = g_data['payload']
        self.subject = self.get_header('Subject')
        self.sender = self.get_header('From')
        self.rcvd_date = dateutil.parser.parse(self.get_header('Date'))
        from base64 import urlsafe_b64decode as decode
        message_parts = [decode(p['body']['data'].encode('UTF-8')) for p in self.payload['parts'] if p['mimeType'] == 'text/html']
        for part in message_parts:
            self.message_text += part

    def get_header(self, param):
        """Return a header field from the e-mail payload"""
        result_list = [i['value'] for i in self.payload['headers']
                       if i['name'] == param]
        if len(result_list) == 1:
            result = result_list[0]
        else:
            result = None
        return result

    class Meta:
        proxy = True


class AccountHandler(BaseAccountHandler):
    name = NAME

    def get_messages(self):
        # Get GMail message
        account = AccountAssociation.objects.first()
        credentials = client.AccessTokenCredentials(account.access_token, '')
        http = credentials.authorize(Http())
        service = build('gmail', 'v1', http=http)
        message_list = service.users().messages().list(userId="me").execute()
        return message_list

    @staticmethod
    def authorize_account(request_data, user):
        """Exchange a google-plus authorization code for an access token."""
        code = request_data['code']
        response_data = {}
        # Upgrade the authorization code into a credentials object
        oauth_flow = client.OAuth2WebServerFlow(
            client_id=settings.GOOGLE_PLUS_KEY,
            client_secret=settings.GOOGLE_PLUS_SECRET,
            redirect_uri='postmessage',
            scope=GOOGLE_SCOPE)
        credentials = oauth_flow.step2_exchange(code)
        # Check that the access token is valid.
        access_token = credentials.access_token
        url = ('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=%s'
               % access_token)
        h = Http()
        result = json.loads(h.request(url, 'GET')[1])
        # If there was an error in the access token info, abort.
        if result.get('error') is not None:
            response = make_response(json.dumps(result.get('error')), 500)
            response.headers['Content-Type'] = 'application/json'
            return response
        # Verify that the access token is valid for this app.
        if result['issued_to'] != settings.GOOGLE_PLUS_KEY:
            response = make_response(
                json.dumps("Token's client ID does not match app's."), 401)
            response.headers['Content-Type'] = 'application/json'
            return response
        # Create a new association and save it
        try:
            association = AccountAssociation(
                ow_user=user,
                access_token=credentials.access_token,
                handler_path='plugins.google',
                remote_id=result['user_id'],
            )
            association.save()
            response_status = status.HTTP_201_CREATED
        except IntegrityError as e:
            association = None
            response_data['reason'] = "duplicate"
            response_status = status.HTTP_409_CONFLICT
        # Get list of gmail messages
        h = credentials.authorize(h)
        gmail_service = build('gmail', 'v1', http=h)
        query = 'label:Inbox'
        response = gmail_service.users().messages().list(userId='me', q=query).execute()
        # Get gmail message details
        def create_message(request_id, response, exception):
            # Create a new Message object from a gmail message
            import base64
            msg = GoogleMessage(response)
            msg.owner = user
            msg.save()
            print('===')
        batch = BatchHttpRequest(callback=create_message)
        for gmail_msg in response['messages']:
            batch.add(gmail_service.users().messages().get(userId='me', id=gmail_msg['id']))
        batch.execute(http=h)
        return (association, response_data, response_status)
