const express = require('express');
const { GoogleGenAI }= require('@google/genai');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const QuizAttempt = require('../models/QuizAttempt');
const { auth, requireInstructor } = require('../middleware/auth');

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function generateWithRetry(fn, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 503 && i < retries - 1) {
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

router.post('/', auth, requireInstructor, async (req, res) => {
  try {
    const { courseId, title, content } = req.body;
    if (!courseId || !title || !content) {
      return res.status(400).json({ message: 'courseId, title, and content are required.' });
    }
    const course = await Course.findOne({ _id: courseId, instructor: req.user.userId });
    if (!course) return res.status(404).json({ message: 'Course not found or not owned by you.' });
    const lesson = await Lesson.create({ course: courseId, title, content });
    course.lessons.push(lesson._id);
    await course.save();
    res.status(201).json(lesson);
  } catch (err) {
    console.error('LESSON CREATE ERROR:', err);
    res.status(500).json({ message: 'Server error creating lesson.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found.' });
    res.json(lesson);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching lesson.' });
  }
});

router.put('/:id', auth, requireInstructor, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found.' });

    const course = await Course.findOne({
      _id: lesson.course,
      instructor: req.user.userId,
    });
    if (!course) {
      return res.status(404).json({ message: 'Lesson not found or not owned by you.' });
    }

    const { title, content } = req.body;
    if (title !== undefined) lesson.title = title;
    if (content !== undefined) lesson.content = content;
    await lesson.save();

    res.json(lesson);
  } catch (err) {
    console.error('LESSON UPDATE ERROR:', err.message);
    res.status(500).json({ message: 'Server error updating lesson.' });
  }
});

router.delete('/:id', auth, requireInstructor, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found.' });

    const course = await Course.findOne({
      _id: lesson.course,
      instructor: req.user.userId,
    });
    if (!course) {
      return res.status(404).json({ message: 'Lesson not found or not owned by you.' });
    }

    await Lesson.findByIdAndDelete(req.params.id);
    course.lessons = course.lessons.filter(
      (l) => l.toString() !== req.params.id
    );
    await course.save();

    await QuizAttempt.deleteMany({ lesson: req.params.id });

    res.json({ message: 'Lesson deleted.' });
  } catch (err) {
    console.error('LESSON DELETE ERROR:', err.message);
    res.status(500).json({ message: 'Server error deleting lesson.' });
  }
});

router.post('/:id/generate-quiz', auth, requireInstructor, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found.' });
    const numQuestions = req.body.numQuestions || 5;
    const prompt = `You are a quiz generator for a learning management system.
Read the lesson content below and produce ${numQuestions} multiple-choice questions,
each with exactly 4 options and one correct answer.

Respond ONLY with valid JSON in this exact shape, no markdown fences, no extra text:
{
  "questions": [
    { "question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0 }
  ]
}

Lesson content:
"""
${lesson.content}
"""`;
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
    });
    const raw = response.text.trim();
    const cleaned = raw.replace(/^```json\s*|^```\s*|```$/g, '');
    const parsed = JSON.parse(cleaned);
    lesson.quiz = parsed.questions;
    await lesson.save();
    res.json(lesson);
  } catch (err) {
    console.error('Quiz generation error:', err.message);
    res.status(500).json({ message: 'Server error generating quiz.' });
  }
});

router.post('/:id/attempts', auth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found.' });
    if (!lesson.quiz || lesson.quiz.length === 0) {
      return res.status(400).json({ message: 'This lesson has no quiz yet.' });
    }
    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'answers must be an array.' });
    }
    let score = 0;
    lesson.quiz.forEach((q, i) => {
      if (answers[i] === q.correctIndex) score += 1;
    });
    const attempt = await QuizAttempt.create({
      user: req.user.userId,
      lesson: lesson._id,
      answers,
      score,
      total: lesson.quiz.length,
    });
    res.status(201).json(attempt);
  } catch (err) {
    console.error('QUIZ ATTEMPT SAVE ERROR:', err.message);
    res.status(500).json({ message: 'Server error saving quiz attempt.' });
  }
});

router.get('/:id/attempts', auth, async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({
      lesson: req.params.id,
      user: req.user.userId,
    }).sort({ createdAt: -1 });
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching quiz attempts.' });
  }
});

module.exports = router;
