from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.utils import timezone

from accounts.permissions import IsAdmin
from .models import Question, QuizAttempt, UserAnswer
from .serializers import (
    QuestionSerializer, QuizQuestionSerializer, QuizSubmitSerializer,
    QuizAttemptSerializer, QuizAttemptDetailSerializer,
)
from .engine import get_quiz_questions
from .feedback import generate_feedback
from .gamification import calculate_xp, update_user_gamification, get_user_rank
from .news import get_cyber_news


PHISHING_CATEGORIES = {
    'phishing', 'social_engineering', 'email_security', 'spoofing',
    'identity_theft', 'upi_fraud', 'qr_code_scam', 'banking_fraud',
    'online_shopping_fraud', 'fake_websites', 'ai_scams', 'deepfake',
}

MALWARE_CATEGORIES = {
    'malware', 'ransomware', 'spyware', 'adware', 'trojans', 'worms',
    'viruses', 'fake_apps', 'safe_downloads',
}


def _category_bucket(category):
    if category in PHISHING_CATEGORIES or 'phish' in category:
        return 'phishing'
    if category in MALWARE_CATEGORIES or category in ('malware',):
        return 'malware'
    return 'other'


class QuestionPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500


class QuestionViewSet(viewsets.ModelViewSet):
    """Admin CRUD for questions."""
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [IsAdmin]
    pagination_class = QuestionPagination
    filterset_fields = ['category', 'difficulty', 'target_user_type', 'is_active']
    search_fields = ['question_text']
    ordering_fields = ['created_at', 'category', 'difficulty']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Allow filtering by pagination override for admin
        return queryset


def _is_admin_user(user):
    return user.user_type == 'admin' or user.is_staff or user.is_superuser


class QuizStartView(APIView):
    """Start a new quiz — returns questions based on user type."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if _is_admin_user(request.user):
            return Response(
                {'error': 'Administrators cannot take quizzes.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        quiz_type = request.query_params.get('type', '20')
        if quiz_type not in ['20', '30', '50']:
            return Response(
                {'error': 'Quiz type must be 20, 30, or 50.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        questions = get_quiz_questions(request.user, quiz_type)

        if not questions:
            return Response(
                {'error': 'No questions available for your user type. Please contact admin.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = QuizQuestionSerializer(questions, many=True)

        timer_map = {'20': 30, '30': 40, '50': 50}
        timer_minutes = timer_map.get(quiz_type, 30)

        return Response({
            'quiz_type': quiz_type,
            'total_questions': len(questions),
            'timer_minutes': timer_minutes,
            'questions': serializer.data,
        })


class QuizSubmitView(APIView):
    """Submit quiz answers and receive scores + feedback."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if _is_admin_user(request.user):
            return Response(
                {'error': 'Administrators cannot take quizzes.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answers_data = serializer.validated_data['answers']
        quiz_type = serializer.validated_data['quiz_type']
        time_taken = serializer.validated_data['time_taken']

        # Calculate scores
        total_score = 0
        phishing_score = 0
        phishing_total = 0
        malware_score = 0
        malware_total = 0
        user_answers = []

        for answer_data in answers_data:
            question = get_object_or_404(Question, id=answer_data['question_id'])
            selected = answer_data['selected_answer']  # May be None for unanswered
            correct = question.correct_answer
            # Unanswered questions (None) are always incorrect
            is_correct = selected is not None and selected == correct

            if is_correct:
                total_score += 1

            # Track category scores (phishing / malware buckets)
            bucket = _category_bucket(question.category)
            if bucket == 'phishing':
                phishing_total += 1
                if is_correct:
                    phishing_score += 1
            elif bucket == 'malware':
                malware_total += 1
                if is_correct:
                    malware_score += 1

            user_answers.append({
                'question': question,
                'selected_answer': selected or '',  # Store empty string for unanswered
                'correct_answer': correct,
                'is_correct': is_correct,
            })


        # Calculate percentage
        total_questions = len(answers_data)
        percentage = (total_score / total_questions * 100) if total_questions > 0 else 0

        # Generate feedback
        feedback_data = generate_feedback(
            phishing_score, phishing_total,
            malware_score, malware_total
        )

        # Create quiz attempt
        xp_earned = calculate_xp(total_score, total_questions, time_taken, quiz_type)
        quiz_attempt = QuizAttempt.objects.create(
            user=request.user,
            score=total_score,
            total_questions=total_questions,
            phishing_score=phishing_score,
            phishing_total=phishing_total,
            malware_score=malware_score,
            malware_total=malware_total,
            percentage=round(percentage, 2),
            feedback=feedback_data['summary'],
            quiz_type=quiz_type,
            time_taken=time_taken,
            xp_earned=xp_earned,
        )

        # Save individual answers
        for answer in user_answers:
            UserAnswer.objects.create(
                quiz_attempt=quiz_attempt,
                question=answer['question'],
                selected_answer=answer['selected_answer'],
                correct_answer=answer['correct_answer'],
                is_correct=answer['is_correct'],
            )

        # Award badges and update gamification
        from leaderboard.views import award_badges
        new_badges = award_badges(request.user, quiz_attempt)
        update_user_gamification(request.user, xp_earned)
        rank_info = get_user_rank(request.user)

        # Learning recommendations based on incorrect answers
        incorrect_cats = list({
            a['question'].category for a in user_answers if not a['is_correct']
        })
        recommendations = _learning_recommendations(incorrect_cats)

        # Improvement since last quiz
        prev = QuizAttempt.objects.filter(user=request.user).exclude(id=quiz_attempt.id).order_by('-created_at').first()
        improvement = None
        if prev:
            improvement = round(float(quiz_attempt.percentage) - float(prev.percentage), 1)

        return Response({
            'attempt_id': quiz_attempt.id,
            'score': total_score,
            'total_questions': total_questions,
            'percentage': round(percentage, 2),
            'phishing_score': phishing_score,
            'phishing_total': phishing_total,
            'malware_score': malware_score,
            'malware_total': malware_total,
            'feedback': feedback_data,
            'time_taken': time_taken,
            'new_badges': new_badges,
            'xp_earned': xp_earned,
            'total_xp': request.user.xp_points,
            'rank': rank_info.get('rank'),
            'total_learners': rank_info.get('total_learners'),
            'motivation_message': rank_info.get('motivation_message'),
            'improvement': improvement,
            'recommendations': recommendations,
        }, status=status.HTTP_201_CREATED)


class QuizHistoryView(generics.ListAPIView):
    """List user's quiz attempt history."""
    serializer_class = QuizAttemptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if _is_admin_user(self.request.user):
            return QuizAttempt.objects.select_related('user').order_by('-created_at')
        return QuizAttempt.objects.filter(user=self.request.user)


class QuizReviewView(generics.RetrieveAPIView):
    """Review a specific quiz attempt with all answers."""
    serializer_class = QuizAttemptDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if _is_admin_user(self.request.user):
            return QuizAttempt.objects.select_related('user')
        return QuizAttempt.objects.filter(user=self.request.user)


class DailyTipsView(APIView):
    """Return cybersecurity tips."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date
        tips = [
            {"title": "Think Before You Click", "content": "Always hover over links to verify the URL before clicking. Phishing links often look similar to legitimate ones but have subtle differences."},
            {"title": "Use Strong Passwords", "content": "Create passwords with at least 12 characters, mixing uppercase, lowercase, numbers, and symbols. Never reuse passwords across accounts."},
            {"title": "Enable 2FA", "content": "Two-factor authentication adds an extra layer of security. Even if your password is stolen, attackers can't access your account without the second factor."},
            {"title": "Update Regularly", "content": "Keep your operating system, browser, and applications updated. Security patches fix vulnerabilities that attackers exploit."},
            {"title": "Verify Email Senders", "content": "Check the full email address, not just the display name. Attackers often spoof display names to impersonate trusted contacts."},
            {"title": "Secure Your Wi-Fi", "content": "Use WPA3 encryption and a strong password for your Wi-Fi network. Avoid conducting sensitive transactions on public Wi-Fi."},
            {"title": "Backup Your Data", "content": "Follow the 3-2-1 rule: 3 copies of your data, on 2 different types of media, with 1 stored offsite. This protects against ransomware."},
            {"title": "Be Wary of USB Drives", "content": "Never plug in unknown USB drives. Malware can auto-execute when a USB drive is connected to your computer."},
            {"title": "Check for HTTPS", "content": "Before entering personal information on a website, verify that the URL starts with 'https://' and shows a padlock icon."},
            {"title": "Report Suspicious Activity", "content": "If you receive a suspicious email or notice unusual account activity, report it to your IT department or the platform's security team immediately."},
            {"title": "Beware of Social Engineering", "content": "Attackers often manipulate emotions like fear, urgency, or curiosity. Take a moment to think critically before responding to unexpected requests."},
            {"title": "Use a Password Manager", "content": "Password managers generate and store unique, strong passwords for each account, eliminating the need to remember them all."},
            {"title": "Recognize Phishing Red Flags", "content": "Watch for generic greetings, spelling errors, urgent deadlines, and requests for personal information — all signs of phishing."},
            {"title": "Secure Your Mobile Device", "content": "Use biometric locks, enable remote wipe, and only install apps from official stores. Mobile devices are increasingly targeted by attackers."},
            {"title": "Monitor Your Accounts", "content": "Regularly check bank statements and credit reports for unauthorized transactions. Early detection limits damage from identity theft."},
        ]

        # Rotate tip based on day of year
        day_index = date.today().timetuple().tm_yday % len(tips)
        daily_tip = tips[day_index]

        return Response({
            'daily_tip': daily_tip,
            'all_tips': tips,
        })


def _learning_recommendations(incorrect_categories):
    """Map incorrect answer categories to working learning resources."""
    RESOURCE_MAP = {
        # Phishing & Social Engineering
        'phishing': {
            'title': 'Phishing Awareness Guide',
            'type': 'article',
            'url': 'https://www.cisa.gov/topics/cyber-threats-and-advisories/phishing',
        },
        'social_engineering': {
            'title': 'Social Engineering - How It Works',
            'type': 'article',
            'url': 'https://www.kaspersky.com/resource-center/definitions/what-is-social-engineering',
        },
        'email_security': {
            'title': 'Email Security Best Practices',
            'type': 'article',
            'url': 'https://www.microsoft.com/en-us/security/business/security-101/what-is-phishing',
        },
        'spoofing': {
            'title': 'What Is Email Spoofing?',
            'type': 'article',
            'url': 'https://www.cloudflare.com/learning/email-security/what-is-email-spoofing/',
        },
        # Password & Authentication
        'password_security': {
            'title': 'Password Security Best Practices',
            'type': 'article',
            'url': 'https://www.cisa.gov/secure-our-world/use-strong-passwords',
        },
        'authentication': {
            'title': 'Authentication Explained',
            'type': 'article',
            'url': 'https://www.cloudflare.com/learning/access-management/what-is-authentication/',
        },
        'multi_factor_authentication': {
            'title': 'Why You Need Multi-Factor Authentication',
            'type': 'video',
            'url': 'https://www.youtube.com/watch?v=0mvCeNsTa1g',
        },
        # Malware
        'malware': {
            'title': 'Malware - Types & Protection',
            'type': 'article',
            'url': 'https://www.malwarebytes.com/malware',
        },
        'ransomware': {
            'title': 'Stop Ransomware - CISA',
            'type': 'article',
            'url': 'https://www.cisa.gov/stopransomware',
        },
        'spyware': {
            'title': 'What Is Spyware?',
            'type': 'article',
            'url': 'https://www.kaspersky.com/resource-center/threats/spyware',
        },
        'trojans': {
            'title': 'Trojan Horse Malware Guide',
            'type': 'article',
            'url': 'https://www.kaspersky.com/resource-center/threats/trojans',
        },
        # Network
        'public_wifi': {
            'title': 'Staying Safe on Public Wi-Fi',
            'type': 'article',
            'url': 'https://www.cisa.gov/news-events/news/using-caution-public-wi-fi',
        },
        'network_security': {
            'title': 'Network Security Fundamentals',
            'type': 'video',
            'url': 'https://www.youtube.com/watch?v=E03gh1hZh4k',
        },
        # Fraud
        'upi_fraud': {
            'title': 'UPI Fraud Prevention - I4C',
            'type': 'article',
            'url': 'https://www.npci.org.in/what-we-do/upi/fraud-awareness',
        },
        'banking_fraud': {
            'title': 'Online Banking Safety Tips',
            'type': 'article',
            'url': 'https://www.rbi.org.in/commonperson/English/Scripts/FAQs.aspx?Id=1094',
        },
        'online_shopping_fraud': {
            'title': 'Safe Online Shopping',
            'type': 'article',
            'url': 'https://consumer.ftc.gov/articles/online-shopping',
        },
        # Identity
        'identity_theft': {
            'title': 'Identity Theft Prevention',
            'type': 'article',
            'url': 'https://consumer.ftc.gov/features/identity-theft',
        },
        # AI / Deep fake
        'ai_scams': {
            'title': 'AI-Powered Scams - What to Know',
            'type': 'article',
            'url': 'https://www.consumer.ftc.gov/articles/what-know-about-romance-scams',
        },
        'deepfake': {
            'title': 'Deepfake Awareness Guide',
            'type': 'video',
            'url': 'https://www.youtube.com/watch?v=cQ54GDm1eL0',
        },
        # Data Protection
        'data_protection': {
            'title': 'Personal Data Protection Tips',
            'type': 'article',
            'url': 'https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online',
        },
        'privacy': {
            'title': 'Online Privacy Guide',
            'type': 'article',
            'url': 'https://www.eff.org/deeplinks/2019/11/every-browser-extension-you-install-is-security-risk',
        },
    }

    recs = []
    seen = set()
    for cat in incorrect_categories:
        if cat not in seen:
            seen.add(cat)
            rec = RESOURCE_MAP.get(cat, {
                'title': cat.replace('_', ' ').title() + ' — Learn More',
                'type': 'article',
                'url': 'https://www.cisa.gov/topics/cybersecurity-best-practices',
            })
            recs.append(rec)

    if not recs:
        recs.append({
            'title': 'Cybersecurity Best Practices',
            'type': 'article',
            'url': 'https://www.cisa.gov/topics/cybersecurity-best-practices',
        })
    return recs[:5]



class CyberNewsView(APIView):
    """Live cybersecurity news panel."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get('limit', 8))
        return Response({
            'news': get_cyber_news(limit),
            'refreshed_at': timezone.now().isoformat(),
        })
