import uuid
from django.utils import timezone
from django.conf import settings
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, EmailOTP, CyberSurvey
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer,
    ChangePasswordSerializer, ForgotPasswordSerializer,
    ResetPasswordSerializer, AdminUserSerializer,
    SmartAuthSerializer, SendOTPSerializer, VerifyOTPSerializer,
    CyberSurveySerializer,
)
from .permissions import IsAdmin
from .utils import generate_otp, send_otp_email, send_password_reset_email


def _auth_response(user, message='Success'):
    refresh = RefreshToken.for_user(user)
    return Response({
        'message': message,
        'user': UserSerializer(user).data,
        'tokens': {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        },
    })


class SmartAuthView(APIView):
    """
    Step 1 smart auth: email + password.
    If user exists → login. If not → return needs_registration.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SmartAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(email=email)
            # Existing user — attempt login
            from django.contrib.auth import authenticate
            user = authenticate(email=email, password=password)
            if not user:
                return Response(
                    {'action': 'login_failed', 'error': 'Invalid password.'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            if not user.is_active:
                return Response({'error': 'Account deactivated.'}, status=status.HTTP_403_FORBIDDEN)
            return _auth_response(user, 'Login successful.')
        except User.DoesNotExist:
            return Response({
                'action': 'needs_registration',
                'message': 'No account found. Complete your profile to register.',
                'email': email,
            })


class SendOTPView(APIView):
    """Send email verification OTP for new registration."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        otp = generate_otp()
        expires = timezone.now() + timezone.timedelta(minutes=10)

        EmailOTP.objects.create(email=email, otp=otp, expires_at=expires)
        send_otp_email(email=email, otp=otp, expiry_minutes=10)

        return Response({'message': 'Verification code sent to your email.'})


class VerifyOTPView(APIView):
    """Verify OTP before completing registration."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({'message': 'Email verified successfully.', 'verified': True})


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return _auth_response(user, 'Registration successful.')


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return _auth_response(serializer.validated_data['user'], 'Login successful.')


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'message': 'Password changed successfully.'})


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            token = uuid.uuid4()
            user.password_reset_token = token
            user.password_reset_token_created = timezone.now()
            user.save()
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
            send_password_reset_email(email=email, reset_url=reset_url, expiry_hours=1)
            response_data = {'message': 'If an account exists with this email, a password reset link has been sent.'}
            if settings.DEBUG:
                response_data['reset_link'] = reset_url
            return Response(response_data)
        except User.DoesNotExist:
            pass
        return Response({'message': 'If an account exists with this email, a password reset link has been sent.'})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']
        try:
            user = User.objects.get(password_reset_token=token)
            if user.password_reset_token_created:
                elapsed = timezone.now() - user.password_reset_token_created
                if elapsed.total_seconds() > 3600:
                    return Response({'error': 'Reset token has expired.'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(serializer.validated_data['new_password'])
            user.password_reset_token = None
            user.password_reset_token_created = None
            user.save()
            return Response({'message': 'Password reset successful.'})
        except User.DoesNotExist:
            return Response({'error': 'Invalid reset token.'}, status=status.HTTP_400_BAD_REQUEST)


class SurveyView(APIView):
    """Submit or check cyber awareness onboarding survey."""

    def get(self, request):
        completed = request.user.survey_completed
        has_survey = hasattr(request.user, 'cyber_survey')
        return Response({
            'survey_completed': completed,
            'needs_survey': not completed and not has_survey,
        })

    def post(self, request):
        if request.user.survey_completed:
            return Response({'error': 'Survey already completed.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = CyberSurveySerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Survey submitted successfully.', 'survey_completed': True})


class SuggestPasswordView(APIView):
    """Generate a strong password suggestion."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .utils import generate_strong_password
        return Response({'password': generate_strong_password()})


class AdminUserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['user_type', 'is_active']
    search_fields = ['email', 'full_name']
    ordering_fields = ['date_joined', 'full_name']


class AdminStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        from quiz.models import QuizAttempt, Question
        from django.db.models import Avg, Count

        total_users = User.objects.exclude(user_type='admin').count()
        total_questions = Question.objects.count()
        total_attempts = QuizAttempt.objects.count()
        avg_score = QuizAttempt.objects.aggregate(avg=Avg('percentage'))['avg'] or 0

        user_distribution = dict(
            User.objects.exclude(user_type='admin')
            .values_list('user_type')
            .annotate(count=Count('id'))
            .values_list('user_type', 'count')
        )

        from datetime import timedelta
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_attempts = QuizAttempt.objects.filter(created_at__gte=thirty_days_ago).count()

        phishing_avg = QuizAttempt.objects.filter(phishing_total__gt=0).aggregate(avg=Avg('phishing_score'))['avg'] or 0
        malware_avg = QuizAttempt.objects.filter(malware_total__gt=0).aggregate(avg=Avg('malware_score'))['avg'] or 0

        return Response({
            'total_users': total_users,
            'total_questions': total_questions,
            'total_attempts': total_attempts,
            'average_score': round(float(avg_score), 2),
            'recent_attempts': recent_attempts,
            'user_distribution': user_distribution,
            'phishing_average': round(float(phishing_avg), 2),
            'malware_average': round(float(malware_avg), 2),
        })
