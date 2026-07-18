const express = require('express');
const Course = require('../models/Course');
const { auth, requireInstructor } = require('../middleware/auth');

const router = express.Router();

// GET /api/courses - list all courses
router.get('/', auth, async (req, res) => {
  try {
    const courses = await Course.find().populate('instructor', 'name email');
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching courses.' });
  }
});

// GET /api/courses/:id - single course with lessons
router.get('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('lessons');
    if (!course) return res.status(404).json({ message: 'Course not found.' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching course.' });
  }
});

// POST /api/courses - instructor creates a course
router.post('/', auth, requireInstructor, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required.' });

    const course = await Course.create({
      title,
      description,
      instructor: req.user.id,
    });
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating course.' });
  }
});

// PUT /api/courses/:id - instructor updates a course
router.put('/:id', auth, requireInstructor, async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, instructor: req.user.id},
      req.body,
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'Course not found or not owned by you.' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating course.' });
  }
});

// DELETE /api/courses/:id - instructor deletes a course
router.delete('/:id', auth, requireInstructor, async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({
      _id: req.params.id,
      instructor: req.user.id,
    });
    if (!course) return res.status(404).json({ message: 'Course not found or not owned by you.' });
    res.json({ message: 'Course deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting course.' });
  }
});

module.exports = router;
