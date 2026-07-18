const express = require('express');
const { GoogleGenAI }= require('@google/genai');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
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

// POST /api/lessons - instructor creates a lesson under a course
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

// GET /api/lessons/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found.' });
    res.json(lesson);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching lesson.' });
  }
});

// POST /api/lessons/:id/generate-quiz - AI Quiz Generator
// Takes the lesson's content and returns an AI-generated 4-option MCQ quiz.
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

module.exports = router;
