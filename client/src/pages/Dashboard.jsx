import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create-course form state (instructor only)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <Link
                key={course._id}
                to={`/courses/${course._id}`}
                className="block bg-white p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-blue-600">{course.title}</h3>
                {course.description && (
                  <p className="text-gray-600 text-sm mt-1">{course.description}</p>
                )}
                {course.instructor?.name && (
                  <p className="text-gray-400 text-xs mt-2">
                    Instructor: {course.instructor.name}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}