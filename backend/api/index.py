import os
import django
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

_django_app = get_wsgi_application()

# Headers forwarded to every preflight response
_CORS_ALLOW_HEADERS = (
    'Accept, Accept-Encoding, Authorization, Content-Type, '
    'DNT, Origin, User-Agent, X-CSRFToken, X-Requested-With, '
    'X-Forwarded-For, X-Forwarded-Proto, X-Forwarded-Host'
)
_CORS_ALLOW_METHODS = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'


def _cors_headers(origin):
    """Return CORS response headers for a known origin."""
    return [
        ('Access-Control-Allow-Origin', origin),
        ('Access-Control-Allow-Credentials', 'true'),
        ('Access-Control-Allow-Methods', _CORS_ALLOW_METHODS),
        ('Access-Control-Allow-Headers', _CORS_ALLOW_HEADERS),
        ('Access-Control-Max-Age', '86400'),
    ]


def application(environ, start_response):
    """
    WSGI entry-point that Vercel's Python runtime calls.

    Responsibilities
    ─────────────────
    1. Strip the literal ``{proxy}`` query-string injected by old vercel.json
       routing so Django never sees it.
    2. Short-circuit OPTIONS preflight requests at this layer — no need to
       touch Django at all.
    3. Wrap every Django response with the correct CORS headers so they are
       present even on 4xx/5xx error pages.
    """
    origin = environ.get('HTTP_ORIGIN', '')

    # ── 1. Scrub Vercel template-variable pollution from QUERY_STRING ─────────
    # Old vercel.json routes used `"dest": "/api/index.py?{proxy}"`.
    # When the template is not expanded, the WSGI app receives literal strings
    # like "{proxy}", "proxy=", or "{proxy}=" which corrupt Django routing.
    import re as _re
    qs = environ.get('QUERY_STRING', '')
    cleaned_qs = _re.sub(r'\{[^}]+\}=?', '', qs).strip('&')
    if cleaned_qs in ('', '='):
        cleaned_qs = ''
    environ['QUERY_STRING'] = cleaned_qs

    # ── 2. Handle OPTIONS preflight without touching Django ──────────────────
    if environ.get('REQUEST_METHOD') == 'OPTIONS':
        headers = [('Content-Type', 'text/plain'), ('Content-Length', '0')]
        if origin:
            headers += _cors_headers(origin)
        else:
            headers += [
                ('Access-Control-Allow-Origin', '*'),
                ('Access-Control-Allow-Methods', _CORS_ALLOW_METHODS),
                ('Access-Control-Allow-Headers', _CORS_ALLOW_HEADERS),
            ]
        start_response('200 OK', headers)
        return [b'']

    # ── 3. Inject CORS headers into every Django response ───────────────────
    def cors_start_response(status, response_headers, exc_info=None):
        headers = [(k, v) for k, v in response_headers
                   if k.lower() not in ('access-control-allow-origin',
                                        'access-control-allow-credentials')]
        if origin:
            headers += [
                ('Access-Control-Allow-Origin', origin),
                ('Access-Control-Allow-Credentials', 'true'),
            ]
        else:
            headers.append(('Access-Control-Allow-Origin', '*'))
        return start_response(status, headers, exc_info)

    return _django_app(environ, cors_start_response)
