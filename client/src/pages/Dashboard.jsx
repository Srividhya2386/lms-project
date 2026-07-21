import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const res = await axios.post(
        'http://localhost:5000/api/courses',
        { title, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCourses((prev) => [...prev, res.data]);
      setTitle('');
      setDescription('');
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create course.');
    } finally {
      setCreating(false);
    }
  };

  const isOwner = (course) => {
    if (user?.role !== 'instructor') return false;
    if (!course.instructor) return false;
    return (
      course.instructor._id === user._id ||
      course.instructor.email === user.email
    );
  };

  const startEdit = (course) => {
    setEditingId(course._id);
    setEditTitle(course.title);
    setEditDescription(course.description || '');
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError('');
  };

  const handleSaveEdit = async (courseId) => {
    setEditError('');
    setSavingEdit(true);
    try {
      const res = await axios.put(
        `http://localhost:5000/api/courses/${courseId}`,
        { title: editTitle, description: editDescription },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCourses((prev) =>
        prev.map((c) => (c._id === courseId ? { ...c, ...res.data } : c))
      );
      setEditingId(null);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update course.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (courseId) => {
    const confirmed = window.confirm(
      'Delete this course? This cannot be undone.'
    );
    if (!confirmed) return;

    setDeletingId(courseId);
    setError('');
    try {
      await axios.delete(`http://localhost:5000/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses((prev) => prev.filter((c) => c._id !== courseId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete course.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading courses...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-600">
            Welcome{user?.name ? `, ${user.name}` : ''}
          </h1>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/login');
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Log out
          </button>
        </div>

        {user?.role === 'instructor' && (
          <form
            onSubmit={handleCreateCourse}
            className="bg-white p-6 rounded-lg shadow-md mb-8"
          >
            <h2 className="text-lg font-semibold mb-4">Create a new course</h2>

            {createError && (
              <p className="text-red-500 text-sm mb-3">{createError}</p>
            )}

            <input
              type="text"
              placeholder="Course title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Course'}
            </button>
          </form>
        )}

        <h2 className="text-lg font-semibold mb-4">Courses</h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {courses.length === 0 ? (
          <p className="text-gray-500">No courses yet.</p>
        ) : (
          <div className="grid gap-4">
            {courses.map((course) => (
              <div
                key={course._id}
                className="bg-white p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                {editingId === course._id ? (
                  <div>
                    {editError && (
                      <p className="text-red-500 text-sm mb-2">{editError}</p>
                    )}
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      className="w-full border rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="w-full border rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(course._id)}
                        disabled={savingEdit}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-sm text-gray-500 px-3 py-1.5 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <Link to={`/courses/${course._id}`} className="flex-1 block">
                      <h3 className="text-lg font-semibold text-blue-600">{course.title}</h3>
                      {course.description && (
                        <p className="text-gray-600 text-sm mt-1">{course.description}</p>
                      )}
                      {course.instructor?.name && (
                        <p className="text-gray-400 text-xs mt-2">
                          Instructor: {course.instructor.name}
                        </p>
                      )}
                      {user?.role === 'student' && (
                        <span
                          className={`inline-block text-xs mt-2 px-2 py-0.5 rounded ${
                            course.isEnrolled
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {course.isEnrolled ? 'Enrolled' : 'Not enrolled'}
                        </span>
                      )}
                    </Link>

                    {isOwner(course) && (
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(course)}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(course._id)}
                          disabled={deletingId === course._id}
                          className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === course._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
