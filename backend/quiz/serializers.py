from rest_framework import serializers
from .models import Question, QuizAttempt, UserAnswer


class QuestionSerializer(serializers.ModelSerializer):
    """Full question serializer for admin CRUD."""

    class Meta:
        model = Question
        fields = '__all__'


class QuizQuestionSerializer(serializers.ModelSerializer):
    """Question serializer for quiz-taking (hides correct answer)."""

    class Meta:
        model = Question
        fields = [
            'id', 'question_text', 'option_a', 'option_b',
            'option_c', 'option_d', 'category', 'difficulty',
        ]


class AnswerSubmitSerializer(serializers.Serializer):
    """Serializer for a single answer submission."""
    question_id = serializers.IntegerField()
    selected_answer = serializers.CharField(max_length=1, allow_null=True, allow_blank=True, required=False, default=None)

    def validate_selected_answer(self, value):
        if value is None or value == '':
            return None  # Unanswered — will be treated as incorrect
        if value.upper() not in ['A', 'B', 'C', 'D']:
            raise serializers.ValidationError("Answer must be A, B, C, or D.")
        return value.upper()


class QuizSubmitSerializer(serializers.Serializer):
    """Serializer for quiz submission."""
    answers = AnswerSubmitSerializer(many=True)
    quiz_type = serializers.CharField(max_length=10, default='20')
    time_taken = serializers.IntegerField(default=0)

    def validate_quiz_type(self, value):
        if value not in ['20', '30', '50']:
            raise serializers.ValidationError("Quiz type must be '20', '30', or '50'.")
        return value


class UserAnswerSerializer(serializers.ModelSerializer):
    """Serializer for answer review."""
    question_text = serializers.CharField(source='question.question_text', read_only=True)
    option_a = serializers.CharField(source='question.option_a', read_only=True)
    option_b = serializers.CharField(source='question.option_b', read_only=True)
    option_c = serializers.CharField(source='question.option_c', read_only=True)
    option_d = serializers.CharField(source='question.option_d', read_only=True)
    explanation = serializers.CharField(source='question.explanation', read_only=True)
    category = serializers.CharField(source='question.category', read_only=True)

    class Meta:
        model = UserAnswer
        fields = [
            'id', 'question_text', 'option_a', 'option_b',
            'option_c', 'option_d', 'selected_answer',
            'correct_answer', 'is_correct', 'explanation', 'category',
        ]


class QuizAttemptSerializer(serializers.ModelSerializer):
    """Serializer for quiz attempt history."""
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'user_name', 'score', 'total_questions',
            'phishing_score', 'phishing_total',
            'malware_score', 'malware_total',
            'percentage', 'feedback', 'quiz_type',
            'time_taken', 'created_at',
        ]


class QuizAttemptDetailSerializer(serializers.ModelSerializer):
    """Detailed quiz attempt with answers for review."""
    answers = UserAnswerSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'user_name', 'score', 'total_questions',
            'phishing_score', 'phishing_total',
            'malware_score', 'malware_total',
            'percentage', 'feedback', 'quiz_type',
            'time_taken', 'created_at', 'answers',
        ]
