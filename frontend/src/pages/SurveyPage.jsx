import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PageLayout from '../components/layout/PageLayout';
import CenterModal from '../components/common/CenterModal';
import { getSurveyQuestions } from '../utils/constants';

/**
 * One-time cyber awareness survey shown before the first quiz.
 * Survey questions are randomly selected from a larger pool, so each user
 * sees different questions (one per backend field).
 */
export default function SurveyPage() {
  const { user, refreshProfile } = useAuth();
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const navigate = useNavigate();

  // Randomly select 5 survey questions once per component mount (stable across renders)
  const questionsRef = useRef(null);
  if (!questionsRef.current) {
    questionsRef.current = getSurveyQuestions();
  }
  const questions = questionsRef.current;

  // Redirect if survey is already completed
  useEffect(() => {
    if (user?.survey_completed) {
      navigate('/quiz', { replace: true });
    }
  }, [user, navigate]);

  const setAnswer = (key, value) => setAnswers(a => ({ ...a, [key]: value }));

  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / questions.length) * 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missing = questions.find(q => !answers[q.key]);
    if (missing) {
      setModal({ type: 'warning', title: 'Incomplete Survey', message: 'Please answer all questions before continuing.' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/survey/', answers);
      // Refresh profile so survey_completed becomes true in local state
      await refreshProfile();
      setModal({
        type: 'success',
        title: '🎉 Survey Complete!',
        message: 'Your answers will personalize your quiz questions. Redirecting to quiz...',
        onClose: () => navigate('/quiz', { replace: true }),
      });
      // Navigate after a short delay so user sees success message
      setTimeout(() => navigate('/quiz', { replace: true }), 1800);
    } catch (err) {
      setModal({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to submit survey. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="Cyber Awareness Survey" subtitle="Help us personalize your learning experience (one-time only)" centered>
      <div className="w-full max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="glass-card mb-4 px-5 py-3 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-cyber-text-dim mb-1.5">
              <span>{answeredCount} of {questions.length} answered</span>
              <span className={answeredCount === questions.length ? 'text-cyber-neon font-semibold' : 'text-cyber-gold'}>
                {answeredCount === questions.length ? '✓ All done!' : `${questions.length - answeredCount} remaining`}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progress}%`, transition: 'width 0.4s ease' }} />
            </div>
          </div>
          <span className="text-sm font-bold text-cyber-blue flex-shrink-0">{progress}%</span>
        </div>

        <form onSubmit={handleSubmit} className="glass-card profile-section-card w-full">
          <div className="space-y-7">
            {questions.map((q, idx) => (
              <div key={`${q.key}-${idx}`} className="survey-question">
                <p className="text-sm font-semibold text-cyber-text mb-3 leading-relaxed">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2
                    bg-cyber-blue/15 text-cyber-blue border border-cyber-blue/25 flex-shrink-0">
                    {idx + 1}
                  </span>
                  {q.question}
                </p>
                <div className="survey-options-grid">
                  {q.options.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setAnswer(q.key, opt.value)}
                      className={`survey-option ${answers[q.key] === opt.value ? 'selected' : ''}`}>
                      {answers[q.key] === opt.value && <span className="survey-option-check">✓</span>}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-cyber-border/20">
            <button type="submit" disabled={loading || answeredCount < questions.length} className="btn-primary w-full !py-3.5 text-sm">
              {loading ? 'Submitting...' : answeredCount < questions.length
                ? `Answer ${questions.length - answeredCount} more question${questions.length - answeredCount !== 1 ? 's' : ''} to continue`
                : 'Submit & Start Learning →'}
            </button>
          </div>
        </form>
      </div>

      <CenterModal
        open={!!modal}
        type={modal?.type}
        title={modal?.title}
        message={modal?.message}
        onClose={() => {
          if (modal?.onClose) modal.onClose();
          setModal(null);
        }}
      />
    </PageLayout>
  );
}
