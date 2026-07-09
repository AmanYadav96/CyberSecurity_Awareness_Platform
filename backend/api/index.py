import os
import django
import re
from django.core.handlers.wsgi import WSGIHandler
from django.core.wsgi import get_wsgi_application
from django.conf import settings

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

django.setup()

# Get the WSGI application
application = get_wsgi_application()

# Compile regex patterns for allowed origins
CORS_ALLOWED_ORIGIN_REGEXES = [
    re.compile(r"^https?://.*\.vercel\.app$"),
    re.compile(r"^https?://.*\.netlify\.app$"),
    re.compile(r"^https?://.*\.github\.io$"),
    re.compile(r"^https?://.*\.gitlab\.io$"),
    re.compile(r"^https?://.*\.pages\.dev$"),
    re.compile(r"^https?://.*\.cloudflare\.com$"),
    re.compile(r"^https?://.*\.azure\.com$"),
    re.compile(r"^https?://.*\.aws\.amazon\.com$"),
    re.compile(r"^https?://.*\.googleapis\.com$"),
    re.compile(r"^https?://localhost(:\d+)?$"),
    re.compile(r"^https?://127\.0\.0\.1(:\d+)?$"),
    re.compile(r"^https?://0\.0\.0\.0(:\d+)?$"),
    re.compile(r"^https?://.*\.ngrok\.io$"),
    re.compile(r"^https?://.*\.ngrok-free\.app$"),
]

def is_origin_allowed(origin):
    """Check if origin matches any allowed regex pattern"""
    if not origin:
        return False
    for pattern in CORS_ALLOWED_ORIGIN_REGEXES:
        if pattern.match(origin):
            return True
    return False

def get_cors_headers(origin):
    """Generate CORS headers for a given origin"""
    if is_origin_allowed(origin):
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken, X-Requested-With, Accept, Origin',
            'Access-Control-Max-Age': '86400',
        }
    else:
        # For disallowed origins, return minimal headers without credentials
        return {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken, X-Requested-With, Accept, Origin',
            'Access-Control-Max-Age': '86400',
        }


def handler(event, context):
    # Create a WSGI environment from the Vercel event
    os.environ['SERVER_NAME'] = event.get('headers', {}).get('host', 'localhost')
    os.environ['SERVER_PORT'] = event.get('headers', {}).get('x-forwarded-port', '443')
    
    # Get the origin from request headers
    request_origin = event.get('headers', {}).get('origin', '')
    
    # Set up the WSGI environment
    body = event.get('body', '')
    if event.get('isBase64Encoded', False):
        body = body.encode('utf-8')
    
    # Create WSGI environment
    environ = {
        'REQUEST_METHOD': event['httpMethod'],
        'PATH_INFO': event['path'],
        'QUERY_STRING': event.get('queryStringParameters', '') or '',
        'SERVER_PROTOCOL': 'HTTP/1.1',
        'CONTENT_TYPE': event.get('headers', {}).get('content-type', ''),
        'CONTENT_LENGTH': str(len(body)),
        'SCRIPT_NAME': '',
        'SERVER_NAME': os.environ['SERVER_NAME'],
        'SERVER_PORT': os.environ['SERVER_PORT'],
        'wsgi.url_scheme': event.get('headers', {}).get('x-forwarded-proto', 'https'),
        'wsgi.input': body,
        'wsgi.version': (1, 0),
        'wsgi.errors': open(os.devnull, 'w'),
        'wsgi.multithread': False,
        'wsgi.multiprocess': False,
        'wsgi.run_once': False,
    }
    
    # Add headers to environment
    for key, value in event.get('headers', {}).items():
        key = key.upper().replace('-', '_')
        if key not in ['CONTENT_TYPE', 'CONTENT_LENGTH']:
            key = 'HTTP_' + key
        environ[key] = value
    
    # Handle OPTIONS preflight requests
    if event['httpMethod'] == 'OPTIONS':
        cors_headers = get_cors_headers(request_origin)
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': ''
        }
    
    # Call the Django application
    response_status = []
    response_headers = []
    
    def start_response(status, headers, exc_info=None):
        response_status.append(status)
        response_headers.extend(headers)
        return lambda x: x
    
    # Get the response from Django
    response_body = b''.join(application(environ, start_response))
    
    # Extract status code
    status_code = int(response_status[0].split(' ')[0])
    
    # Add CORS headers to response based on request origin
    cors_headers = get_cors_headers(request_origin)
    
    # Merge CORS headers with Django response headers
    response_headers_dict = dict(response_headers)
    response_headers_dict.update(cors_headers)
    
    # Return the response in Vercel format
    return {
        'statusCode': status_code,
        'headers': response_headers_dict,
        'body': response_body.decode('utf-8') if isinstance(response_body, bytes) else response_body
    }