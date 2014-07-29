from httplib2 import Http
from apiclient.discovery import build
from apiclient.http import BatchHttpRequest
from django.conf import settings
from django.db import IntegrityError
import json
from oauth2client import client
from rest_framework import status

from orgwolf.models import AccountAssociation
from plugins import BaseAccountHandler


NAME = "Google"
GOOGLE_SCOPE = 'https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/gmail.modify'


class AccountHandler(BaseAccountHandler):
    name = NAME

    def get_messages(self):
        # Get GMail message
        account = AccountAssociation.objects.first()
        messages = []
        credentials = client.AccessTokenCredentials(account.access_token, '')
        http = credentials.authorize(Http())
        batch = BatchHttpRequest(callback=callback)
        service = build('gmail', 'v1', http=http)
        message_list = service.users().messages().list(userId="me").execute()
        for message in message_list['messages']:
            batch.add(service.users().messages().get(userId="me", id=message["id"]))
        batch.execute(http=http)
        return messages

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
        return (association, response_data, response_status)
