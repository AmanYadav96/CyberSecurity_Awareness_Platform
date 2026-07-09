import os
import django
from django.core.handlers.wsgi import WSGIHandler
from django.core.wsgi import get_wsgi_application
from django.conf import settings

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

django.setup()

# Get the WSGI application
application = get_wsgi_application()


def handler(event, context):
    # Create a WSGI environment from the Vercel event
    os.environ['SERVER_NAME'] = event.get('headers', {}).get('host', 'localhost')
    os.environ['SERVER_PORT'] = event.get('headers', {}).get('x-forwarded-port', '443')
    
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
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken, X-Requested-With, Accept, Origin',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Max-Age': '86400',
            },
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
    
    # Add CORS headers to response
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
    }
    
    # Merge CORS headers with Django response headers
    response_headers_dict = dict(response_headers)
    response_headers_dict.update(cors_headers)
    
    # Return the response in Vercel format
    return {
        'statusCode': status_code,
        'headers': response_headers_dict,
        'body': response_body.decode('utf-8') if isinstance(response_body, bytes) else response_body
    }