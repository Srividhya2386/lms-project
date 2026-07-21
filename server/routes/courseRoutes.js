const express = require('express');
const Course = require('../models/Course');
const { auth, requireInstructor } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const courses = await Course.find().populate('instructor', 'name email');
    const result = courses.map((c) => {
      const obj = c.toObject();
      const isEnrolled = c.students.some(
        (s) => s.toString() === req.user.userId
      );
      delete obj.students;
      return { ...obj, isEnrolled, studentCount: c.students.length };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching courses.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name email')
      .populate('lessons');
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    const isOwner =
      req.user.role === 'instructor' &&
      course.instructor._id.toString() === req.user.userId;
    const isEnrolled = course.students.some(
      (s) => s.toString() === req.user.userId
    );
    const hasAccess = isOwner || isEnrolled;

    const obj = course.toObject();
    const studentCount = course.students.length;
    delete obj.students;

    if (!hasAccess) {
      return res.json({ ...obj, lessons: [], isEnrolled: false, studentCount });
    }

    res.json({ ...obj, isEnrolled: true, studentCount });
  } catch (err) {
    console.error('COURSE FETCH ERROR:', err.message);
    res.status(500).json({ message: 'Server error fetching course.' });
  }
});

router.post('/', auth, requireInstructor, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required.' });

    const course = await Course.create({
      title,
      description,
      instructor: req.user.userId,
    });
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating course.' });
  }
});

router.put('/:id', auth, requireInstructor, async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, instructor: req.user.userId },
      req.body,
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'Course not found or not owned by you.' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating course.' });
  }
});

router.delete('/:id', auth, requireInstructor, async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({
      _id: req.params.id,
      instructor: req.user.userId,
    });
    if (!course) return res.status(404).json({ message: 'Course not found or not owned by you.' });
    res.json({ message: 'Course deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting course.' });
  }
});

router.post('/:id/enroll', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can enroll in courses.' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    const alreadyEnrolled = course.students.some(
      (s) => s.toString() === req.user.userId
    );
    if (!alreadyEnrolled) {
      course.students.push(req.user.userId);
      await course.save();
    }

    res.json({ message: 'Enrolled successfully.', isEnrolled: true });
  } catch (err) {
    console.error('ENROLL ERROR:', err.message);
    res.status(500).json({ message: 'Server error enrolling in course.' });
  }
});

router.delete('/:id/enroll', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    course.students = course.students.filter(
      (s) => s.toString() !== req.user.userId
    );
    await course.save();

    res.json({ message: 'Unenrolled successfully.', isEnrolled: false });
  } catch (err) {
    console.error('UNENROLL ERROR:', err.message);
    res.status(500).json({ message: 'Server error unenrolling from course.' });
  }
});

module.exports = router;
