import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import { useNotify } from '../../context/NotifyContext';
import { getUserTypeLabel } from '../../utils/helpers';

const EMPTY_FORM = {
  question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
  correct_answer: 'A', category: 'phishing', difficulty: 'easy',
  target_user_type: 'student', explanation: '',
};

async function fetchAllQuestions() {
  const all = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await api.get(`/questions/?page=${page}&page_size=100`);
    const batch = res.data.results || res.data || [];
    all.push(...batch);
    hasMore = res.data.next != null;
    page += 1;
    if (!res.data.results && !res.data.next) hasMore = false;
  }
  return all;
}

function QuestionModal({ mode, form, setForm, onClose, onSave }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-modal-title"
    >
      <div className="glass-card modal-card animate-slide-up">
        <div className="modal-header shrink-0">
          <h2 id="question-modal-title" className="text-lg font-bold text-cyber-text">
            {mode === 'add' ? 'Add Question' : 'Edit Question'}
          </h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          <div className="form-field">
            <label className="input-label">Question Text</label>
            <textarea className="input-field" rows={3} placeholder="Enter the question"
              value={form.question_text} onChange={e => setForm({ ...form, question_text: e.target.value })} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {['A', 'B', 'C', 'D'].map(k => (
              <div key={k} className="form-field">
                <label className="input-label">Option {k}</label>
                <input className="input-field" placeholder={`Option ${k} text`}
                  value={form[`option_${k.toLowerCase()}`]}
                  onChange={e => setForm({ ...form, [`option_${k.toLowerCase()}`]: e.target.value })} />
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="form-field">
              <label className="input-label">Correct Answer</label>
              <select className="input-field" value={form.correct_answer}
                onChange={e => setForm({ ...form, correct_answer: e.target.value })}>
                {['A', 'B', 'C', 'D'].map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="input-label">Category</label>
              <select className="input-field" value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="phishing">Phishing</option>
                <option value="malware">Malware</option>
              </select>
            </div>
            <div className="form-field">
              <label className="input-label">Difficulty</label>
              <select className="input-field" value={form.difficulty}
                onChange={e => setForm({ ...form, difficulty: e.target.value })}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="form-field">
              <label className="input-label">Target Audience</label>
              <select className="input-field" value={form.target_user_type}
                onChange={e => setForm({ ...form, target_user_type: e.target.value })}>
                <option value="student">Student</option>
                <option value="professional">Professional</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="input-label">Explanation</label>
            <textarea className="input-field" rows={3} placeholder="Explanation shown after quiz"
              value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} />
          </div>
        </div>

        <div className="modal-footer shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm !py-2.5">Cancel</button>
          <button type="button" onClick={onSave} className="btn-primary flex-1 text-sm !py-2.5">
            {mode === 'add' ? 'Add Question' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function QuestionManagement() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const notify = useNotify();

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllQuestions();
      setQuestions(data);
    } catch {
      notify.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModal('add');
  };

  const openEdit = (q) => {
    setForm({ ...q });
    setModal('edit');
  };

  const saveQ = async () => {
    if (!form.question_text?.trim()) { notify.error('Question text is required'); return; }
    if (!form.option_a || !form.option_b || !form.option_c || !form.option_d) {
      notify.error('All four options are required');
      return;
    }
    try {
      if (modal === 'edit' && form.id) {
        await api.put(`/questions/${form.id}/`, form);
        notify.success('Question updated successfully');
      } else {
        await api.post('/questions/', form);
        notify.success('Question added successfully');
      }
      setModal(null);
      loadQuestions();
    } catch (err) {
      notify.error(Object.values(err.response?.data || {}).flat()[0] || 'Save failed');
    }
  };

  const delQ = async (id) => {
    if (!confirm('Delete this question permanently?')) return;
    try {
      await api.delete(`/questions/${id}/`);
      notify.success('Question deleted');
      loadQuestions();
    } catch {
      notify.error('Delete failed. Please try again.');
    }
  };

  const filtered = questions.filter((q) =>
    !search || q.question_text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="glass-card profile-card p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="section-title text-base">Question Management</h2>
          <p className="text-sm text-cyber-text-dim mt-1.5">{questions.length} questions in the platform</p>
        </div>
        <button type="button" onClick={openAdd} className="btn-primary text-sm !py-2.5 !px-5">+ Add Question</button>
      </div>

      <div className="form-field mb-6">
        <label className="input-label">Search Questions</label>
        <input
          type="text"
          className="input-field"
          placeholder="Type to filter questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-cyber-text-dim text-center py-10">Loading questions...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>{search ? 'No questions match your search.' : 'No questions yet. Add your first question.'}</p>
          {!search && <button type="button" onClick={openAdd} className="btn-primary text-sm !py-2.5 !px-5">Add Question</button>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-cyber-border/20">
          <table className="cyber-table w-full">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>Question</th>
                <th>Category</th>
                <th>Difficulty</th>
                <th>Target</th>
                <th>Ans</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => (
                <tr key={q.id}>
                  <td className="text-sm text-cyber-text-dim py-3">{i + 1}</td>
                  <td className="text-sm max-w-md py-3">
                    <p className="line-clamp-2 leading-relaxed">{q.question_text}</p>
                  </td>
                  <td className="py-3"><span className="badge badge-blue">{q.category}</span></td>
                  <td className="py-3">
                    <span className={`badge ${
                      q.difficulty === 'easy' ? 'badge-green' : q.difficulty === 'medium' ? 'badge-gold' : 'badge-red'
                    }`}>{q.difficulty}</span>
                  </td>
                  <td className="text-sm text-cyber-text-dim py-3">{getUserTypeLabel(q.target_user_type)}</td>
                  <td className="text-sm font-bold text-cyber-neon py-3">{q.correct_answer}</td>
                  <td className="py-3">
                    <div className="flex gap-3">
                      <button type="button" onClick={() => openEdit(q)} className="text-link text-xs text-cyber-blue hover:text-cyber-cyan">Edit</button>
                      <button type="button" onClick={() => delQ(q.id)} className="text-link text-xs text-cyber-red hover:text-cyber-pink">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <QuestionModal
          mode={modal}
          form={form}
          setForm={setForm}
          onClose={() => setModal(null)}
          onSave={saveQ}
        />
      )}
    </div>
  );
}
