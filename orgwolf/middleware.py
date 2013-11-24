import sys
import cProfile
import re
import urlparse
import json

from cStringIO import StringIO
from django.conf import settings
from django.db.models.fields.related import ReverseSingleRelatedObjectDescriptor as ForeignKey

from gtd.models import Node

class MobileDetectionMiddleware(object):
    """
    Useful middleware to detect if the user is
    on a mobile device.
    """
    def process_request(self, request):
        is_mobile = False;

        if request.META.has_key('HTTP_USER_AGENT'):
            user_agent = request.META['HTTP_USER_AGENT']

            # Test common mobile values.
            pattern = "(android|iphone|up.browser|up.link|mmp|symbian|smartphone|midp|wap|phone|windows ce|pda|mobile|mini|palm|netfront)"
            prog = re.compile(pattern, re.IGNORECASE)
            match = prog.search(user_agent)
            if match:
                is_mobile = True;
            else:
                # Nokia-like test for WAP browsers.
                # http://www.developershome.com/wap/xhtmlmp/
                #   xhtml_mp_tutorial.asp?page=mimeTypesFileExtension

                if request.META.has_key('HTTP_ACCEPT'):
                    http_accept = request.META['HTTP_ACCEPT']

                    pattern = "application/vnd\.wap\.xhtml\+xml"
                    prog = re.compile(pattern, re.IGNORECASE)

                    match = prog.search(http_accept)

                    if match:
                        is_mobile = True

            if not is_mobile:
                # Now we test the user_agent from a big list.
                user_agents_test = ("w3c ", "acs-", "alav", "alca", "amoi", "audi",
                                    "avan", "benq", "bird", "blac", "blaz", "brew",
                                    "cell", "cldc", "cmd-", "dang", "doco", "eric",
                                    "hipt", "inno", "ipaq", "java", "jigs", "kddi",
                                    "keji", "leno", "lg-c", "lg-d", "lg-g", "lge-",
                                    "maui", "maxo", "midp", "mits", "mmef", "mobi",
                                    "mot-", "moto", "mwbp", "nec-", "newt", "noki",
                                    "xda",  "palm", "pana", "pant", "phil", "play",
                                    "port", "prox", "qwap", "sage", "sams", "sany",
                                    "sch-", "sec-", "send", "seri", "sgh-", "shar",
                                    "sie-", "siem", "smal", "smar", "sony", "sph-",
                                    "symb", "t-mo", "teli", "tim-", "tosh", "tsm-",
                                    "upg1", "upsi", "vk-v", "voda", "wap-", "wapa",
                                    "wapi", "wapp", "wapr", "webc", "winw", "winw",
                                    "xda-",)

                test = user_agent[0:4].lower()
                if test in user_agents_test:
                    is_mobile = True

        request.is_mobile = is_mobile

class ProfilerMiddleware(object):
    """Used for benchmarking and performance analysis"""
    def process_view(self, request, callback, callback_args, callback_kwargs):
        if settings.DEBUG and 'prof' in request.GET:
            self.profiler = cProfile.Profile()
            args = (request,) + callback_args
            return self.profiler.runcall(callback, *args, **callback_kwargs)

    def process_response(self, request, response):
        if settings.DEBUG and 'prof' in request.GET:
            self.profiler.create_stats()
            self.profiler.dump_stats(settings.PROFILE_FILE)
        return response

class AjaxMiddleware():
    """Modifies request/response as a gateway between views and REST API"""
    def parse_json(self, data):
        new_dict = json.loads(data)
        return new_dict
    def parse_url_encoded_form(self, s):
        """Accepts a URL_encoded string and parses into a dictionary"""
        new_dict = {}
        string_fields = (
            'text', 'priority', 'title', 'repeating_unit', 'tag_string')
        # Replace URL codes with actual characters
        htmlCodes =  (
            (' ', '+'),
            (':', '%3A'),
            ('[', '%5B'),
            (']', '%5D'),
            ('+', '%2B'),
        )
        for code in htmlCodes:
            s = s.replace(code[1], code[0])
        r = re.compile('(?P<key>[a-zA-Z_-]+)(?:\[(?P<subkey>[a-zA-Z_-]+)\])?=(?P<value>[a-zA-Z0-9_:\-]*)')
        # Sort through each value and parse into key, value, etc
        for datum in s.rsplit('&'):
            m = r.match(datum)
            if m:
                m = m.groupdict()
                # Convert numbers to float or int
                try:
                    m['value'] = int(m['value'])
                except ValueError:
                    try:
                        m['value'] = float(m['value'])
                    except ValueError:
                        pass
                # Now assign values
                if m['subkey']:
                    # Handle fields[title]=Archive type objects
                    # Convert missing foreign keys to None objects
                    if (m['subkey'] not in string_fields
                        and m['value'] == ''):
                        m['value'] = None
                    # and add to dictionary
                    d = new_dict.get(m['key'], {})
                    d[m['subkey']] = m['value']
                    new_dict[m['key']] = d
                else:
                    # Handle simple key=value
                    new_dict[m['key']] = m['value']
            else:
                print(datum)
        return new_dict

    def process_request(self, request):
        """
        Decode submitted data for REST API depending on format
        (JSON, url-encoded-form, etc)
        """
        EXEMPT = [
            '/accounts/logout/persona/',
            '/accounts/login/persona/',
        ]
        accept = request.META.get('HTTP_ACCEPT', '')
        content_type = request.META.get('CONTENT_TYPE', '')
        if content_type.find('application/json') > -1:
            request.is_json = True
        elif accept.find('application/json') > -1:
            request.is_json = True
        else:
            request.is_json = False
        if ( request.method in ['PUT', 'POST']
             and request.is_json
             and request.path not in EXEMPT ):
            parsers = {
                'application/json': self.parse_json,
                # 'application/x-www-form-urlencoded': self.parse_url_encoded_form,
            }
            s = request.body
            parser = parsers.get(request.META['CONTENT_TYPE'], lambda x: None)
            setattr(request, request.method, parser(s))
