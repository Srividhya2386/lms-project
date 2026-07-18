const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: {
      type: [String],
      validate: (v) => v.length === 4,
    },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
  },
  { _id: false }
);

const LessonSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    quiz: {
      type: [QuestionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lesson', LessonSchema);
