"""Account utility helpers."""
import re
import secrets
import string
import random

from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.conf import settings


# ── Security tips rotated into every email ──────────────────────────────────
_SECURITY_TIPS = [
    "Use a unique, strong password for every account. A password manager like Bitwarden or 1Password can generate and store them securely.",
    "Enable Two-Factor Authentication (2FA) on all accounts that support it. Even if your password is stolen, attackers can't access your account.",
    "Always verify the sender's email address before clicking any link. Phishing emails often spoof display names.",
    "Keep your devices and apps up-to-date. Security patches fix vulnerabilities that attackers actively exploit.",
    "Never use public Wi-Fi for sensitive activities like banking. Use a VPN to encrypt your traffic.",
    "Check for HTTPS (padlock icon) before entering any personal information on a website.",
    "Back up your data regularly following the 3-2-1 rule: 3 copies, 2 different media types, 1 offsite.",
    "Be wary of urgent requests for personal information — scammers create false urgency to bypass your critical thinking.",
    "A strong password has at least 12 characters, mixing uppercase, lowercase, numbers, and symbols. Avoid dictionary words.",
    "Review app permissions regularly. An app should only have access to what it genuinely needs.",
]


def get_random_security_tip():
    return random.choice(_SECURITY_TIPS)


def send_otp_email(email: str, otp: str, expiry_minutes: int = 10):
    """Send a styled HTML OTP verification email."""
    otp_digits = list(otp)

    context = {
        'email': email,
        'otp': otp,
        'otp_digits': otp_digits,
        'expiry_minutes': expiry_minutes,
        'security_tip': get_random_security_tip(),
    }

    subject = 'CyberAware — Your Email Verification Code'
    plain_text = (
        f"Your CyberAware verification code is: {otp}\n\n"
        f"This code expires in {expiry_minutes} minutes.\n\n"
        "Never share this code with anyone.\n\n"
        "If you didn't request this, ignore this email."
    )
    html_content = render_to_string('accounts/email_otp.html', context)

    msg = EmailMultiAlternatives(
        subject=subject,
        body=plain_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
    )
    msg.attach_alternative(html_content, 'text/html')
    msg.send(fail_silently=False)


def send_password_reset_email(email: str, reset_url: str, expiry_hours: int = 1):
    """Send a styled HTML password-reset email."""
    context = {
        'email': email,
        'reset_url': reset_url,
        'expiry_hours': expiry_hours,
        'security_tip': get_random_security_tip(),
    }

    subject = 'CyberAware — Password Reset Request'
    plain_text = (
        f"Hello {email},\n\n"
        "We received a request to reset your CyberAware password.\n\n"
        f"Reset link: {reset_url}\n\n"
        f"This link expires in {expiry_hours} hour(s).\n\n"
        "If you didn't request this, ignore this email.\n\n"
        "— The CyberAware Team"
    )
    html_content = render_to_string('accounts/email_reset_password.html', context)

    msg = EmailMultiAlternatives(
        subject=subject,
        body=plain_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
    )
    msg.attach_alternative(html_content, 'text/html')
    msg.send(fail_silently=False)


def format_display_name(full_name):
    """Return properly capitalized display name, e.g. 'shreehari' -> 'Shreehari'."""
    if not full_name:
        return ''
    parts = re.split(r'\s+', full_name.strip())
    return ' '.join(p[:1].upper() + p[1:].lower() if p else '' for p in parts)


def generate_otp(length=6):
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def generate_strong_password(min_len=12, max_len=16):
    """Generate a secure random password meeting complexity requirements."""
    length = secrets.randbelow(max_len - min_len + 1) + min_len
    lower = string.ascii_lowercase
    upper = string.ascii_uppercase
    digits = string.digits
    special = '!@#$%^&*?_-'
    all_chars = lower + upper + digits + special

    password = [
        secrets.choice(lower),
        secrets.choice(upper),
        secrets.choice(digits),
        secrets.choice(special),
    ]
    password += [secrets.choice(all_chars) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(password)
    return ''.join(password)


def sanitize_input(value, max_length=500):
    """Basic input sanitization — strip and truncate."""
    if value is None:
        return ''
    text = str(value).strip()
    return text[:max_length]
