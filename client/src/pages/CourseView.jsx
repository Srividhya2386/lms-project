import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function CourseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [lastAttempt, setLastAttempt] = useState(null);
  const [pastAttempts, setPastAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  const [showAddLesson, setShowAddLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [addingLesson, setAddingLesson] = useState(false);
  const [addLessonError, setAddLessonError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchCourse();
  }, [id]);

  useEffect(() => {
    if (activeLessonId) {
      fetchAttempts(activeLessonId);
    }
  }, [activeLessonId]);

  const fetchCourse = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourse(res.data);
      if (res.data.lessons?.length > 0 && !activeLessonId) {
        setActiveLessonId(res.data.lessons[0]._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load course.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttempts = async (lessonId) => {
    setLoadingAttempts(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/lessons/${lessonId}/attempts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPastAttempts(res.data);
    } catch (err) {
      setPastAttempts([]);
    } finally {
      setLoadingAttempts(false);
    }
  };

  const activeLesson = course?.lessons?.find((l) => l._id === activeLessonId);

  const selectLesson = (lessonId) => {
    setActiveLessonId(lessonId);
    setAnswers({});
    setLastAttempt(null);
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    setError('');
    try {
      await axios.post(
        `http://localhost:5000/api/courses/${id}/enroll`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCourse();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enroll.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    const confirmed = window.confirm('Unenroll from this course?');
    if (!confirmed) return;
    setEnrolling(true);
    setError('');
    try {
      await axios.delete(`http://localhost:5000/api/courses/${id}/enroll`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchCourse();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unenroll.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    setAddLessonError('');
    setAddingLesson(true);
    try {
      const res = await axios.post(
        'http://localhost:5000/api/lessons',
        { courseId: id, title: lessonTitle, content: lessonContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newLesson = res.data;
      setCourse((prev) => ({
        ...prev,
        lessons: [...(prev.lessons || []), newLesson],
      }));
      setActiveLessonId(newLesson._id);
      setLessonTitle('');
      setLessonContent('');
      setShowAddLesson(false);
    } catch (err) {
      setAddLessonError(err.response?.data?.message || 'Failed to add lesson.');
    } finally {
      setAddingLesson(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!activeLesson) return;
    setGenerating(true);
    setError('');
    try {
      const res = await axios.post(
        `http://localhost:5000/api/lessons/${activeLesson._id}/generate-quiz`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCourse((prev) => ({
        ...prev,
        lessons: prev.lessons.map((l) =>
          l._id === res.data._id ? res.data : l
        ),
      }));
      setAnswers({});
      setLastAttempt(null);
      setPastAttempts([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate quiz.');
    } finally {
      setGenerating(false);
    }
  };

  const selectAnswer = (questionIndex, optionIndex) => {
    if (lastAttempt) return;
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeLesson?.quiz) return;
    setSubmitting(true);
    setError('');
    try {
      const answersArray = activeLesson.quiz.map((_, i) =>
        answers[i] !== undefined ? answers[i] : null
      );

      const res = await axios.post(
        `http://localhost:5000/api/lessons/${activeLesson._id}/attempts`,
        { answers: answersArray },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLastAttempt(res.data);
      setPastAttempts((prev) => [res.data, ...prev]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading course...</div>;
  }

  if (error && !course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-red-500">{error}</p>
        <Link to="/dashboard" className="text-blue-600">Back to Dashboard</Link>
      </div>
    );
  }

  const isStudent = user?.role === 'student';
  const isInstructor = user?.role === 'instructor';

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/dashboard" className="text-sm text-blue-600">Back to Dashboard</Link>

        <div className="flex items-center justify-between mt-2 mb-1">
          <h1 className="text-2xl font-bold text-blue-600">{course.title}</h1>
          {isInstructor && (
            <button
              onClick={() => setShowAddLesson((prev) => !prev)}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded font-medium hover:bg-blue-700"
            >
              {showAddLesson ? 'Cancel' : '+ Add Lesson'}
            </button>
          )}
        </div>
        {course.description && (
          <p className="text-gray-600 mt-1 mb-2">{course.description}</p>
        )}
        <p className="text-gray-400 text-xs mb-6">
          {course.studentCount} student{course.studentCount === 1 ? '' : 's'} enrolled
        </p>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {isStudent && !course.isEnrolled && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6 text-center">
            <p className="text-gray-600 mb-4">
              Enroll in this course to see its lessons and quizzes.
            </p>
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {enrolling ? 'Enrolling...' : 'Enroll in Course'}
            </button>
          </div>
        )}

        {isStudent && course.isEnrolled && (
          <div className="mb-4">
            <button
              onClick={handleUnenroll}
              disabled={enrolling}
              className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
            >
              {enrolling ? 'Working...' : 'Unenroll from this course'}
            </button>
          </div>
        )}

        {isInstructor && showAddLesson && (
          <form
            onSubmit={handleAddLesson}
            className="bg-white p-6 rounded-lg shadow-md mb-6"
          >
            <h2 className="text-lg font-semibold mb-4">Add a new lesson</h2>

            {addLessonError && (
              <p className="text-red-500 text-sm mb-3">{addLessonError}</p>
            )}

            <input
              type="text"
              placeholder="Lesson title"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Lesson content"
              value={lessonContent}
              onChange={(e) => setLessonContent(e.target.value)}
              required
              rows={6}
              className="w-full border rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={addingLesson}
              className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {addingLesson ? 'Adding...' : 'Add Lesson'}
            </button>
          </form>
        )}

        {course.isEnrolled ? (
          (!course.lessons || course.lessons.length === 0) ? (
            <p className="text-gray-500">No lessons in this course yet.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase">Lessons</h2>
                <div className="space-y-2">
                  {course.lessons.map((lesson) => (
                    <button
                      key={lesson._id}
                      onClick={() => selectLesson(lesson._id)}
                      className={`w-full text-left px-3 py-2 rounded ${
                        lesson._id === activeLessonId
                          ? 'bg-blue-600 text-white'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      {lesson.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 bg-white rounded-lg shadow-md p-6">
                {activeLesson && (
                  <>
                    <h2 className="text-xl font-semibold mb-3">{activeLesson.title}</h2>
                    <p className="text-gray-700 whitespace-pre-wrap mb-6">
                      {activeLesson.content}
                    </p>

                    {isInstructor && (
                      <button
                        onClick={handleGenerateQuiz}
                        disabled={generating}
                        className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 mb-6"
                      >
                        {generating
                          ? 'Generating quiz...'
                          : activeLesson.quiz?.length > 0
                          ? 'Regenerate Quiz'
                          : 'Generate Quiz'}
                      </button>
                    )}

                    {activeLesson.quiz?.length > 0 ? (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Quiz</h3>
                        {activeLesson.quiz.map((q, qi) => (
                          <div key={qi} className="mb-5">
                            <p className="font-medium mb-2">
                              {qi + 1}. {q.question}
                            </p>
                            <div className="space-y-2">
                              {q.options.map((opt, oi) => {
                                const isSelected = answers[qi] === oi;
                                const isCorrect = oi === q.correctIndex;
                                let style = 'border-gray-300';
                                if (lastAttempt) {
                                  if (isCorrect) style = 'border-green-500 bg-green-50';
                                  else if (isSelected) style = 'border-red-500 bg-red-50';
                                } else if (isSelected) {
                                  style = 'border-blue-500 bg-blue-50';
                                }
                                return (
                                  <button
                                    key={oi}
                                    onClick={() => selectAnswer(qi, oi)}
                                    className={`w-full text-left border rounded px-3 py-2 ${style}`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {!lastAttempt ? (
                          <button
                            onClick={handleSubmitQuiz}
                            disabled={
                              submitting ||
                              Object.keys(answers).length < activeLesson.quiz.length
                            }
                            className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                          >
                            {submitting ? 'Submitting...' : 'Submit Quiz'}
                          </button>
                        ) : (
                          <div>
                            <p className="font-semibold mb-3">
                              Score: {lastAttempt.score} / {lastAttempt.total}
                            </p>
                            <button
                              onClick={() => {
                                setAnswers({});
                                setLastAttempt(null);
                              }}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Retake quiz
                            </button>
                          </div>
                        )}

                        {!loadingAttempts && pastAttempts.length > 0 && (
                          <div className="mt-6 pt-4 border-t">
                            <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                              Your past attempts
                            </h4>
                            <div className="space-y-1">
                              {pastAttempts.map((a) => (
                                <p key={a._id} className="text-sm text-gray-600">
                                  {a.score} / {a.total} — {new Date(a.createdAt).toLocaleString()}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">
                        No quiz yet for this lesson.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        ) : (
          !isStudent && (
            <p className="text-gray-500">
              You don't have access to view this course's lessons.
            </p>
          )
        )}
      </div>
    </div>
  );
}
