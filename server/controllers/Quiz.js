import QuizModel from "../models/QuizModel.js";
import ClassModel from "../models/Class.js";
import StudentsModel from "../models/students.js";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";

// --- Create Quiz ---
const createQuiz = async (req, res) => {
  try {
    const { title, classId, questions } = req.body;
    if (!title || !classId || !questions) {
      return res.status(400).json({ success: false, message: "Title, classId, and questions are required" });
    }
    let parsedQuestions;
    try {
      parsedQuestions = typeof questions === "string" ? JSON.parse(questions) : questions;
    } catch {
      return res.status(400).json({ success: false, message: "Invalid questions format" });
    }
    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      return res.status(400).json({ success: false, message: "Questions must be a non-empty array" });
    }
    const classData = await ClassModel.findById(classId);
    if (!classData) return res.status(404).json({ success: false, message: "Class not found" });

    const processed = parsedQuestions.map((q, i) => {
      if (!q.text?.trim()) throw new Error(`Question ${i + 1} missing text`);
      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new Error(`Question ${i + 1} needs at least two options`);
      }
      let img = null;
      if (Array.isArray(req.files) && req.files[i]) img = req.files[i].filename;
      return {
        text: q.text,
        options: q.options.map(opt => ({
          text: opt.text,
          isCorrect: opt.isCorrect === 'true' || opt.isCorrect === true
        })),
        marks: parseInt(q.marks) || 1,
        image: img,
        timeLimit: q.timeLimit ? parseInt(q.timeLimit) : 0
      };
    });

    const totalMarks = processed.reduce((sum, q) => sum + (q.marks || 0), 0);

    const quiz = new QuizModel({
      title,
      classId,
      questions: processed,
      totalMarks,
      allStudents: classData.students || [],
      submissions: [],
      joinedUsers: [],
      started: false,
      completed: false,
      currentQuestionIndex: -1,
      showResults: false,
      submitEnabled: true
    });

    await quiz.save();
    res.status(201).json({ success: true, message: "Quiz created", quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- Get Quizzes ---
const getQuizzes = async (req, res) => {
  try {
    const { id } = req.params;
    const quizzes = await QuizModel.find({ classId: id });
    const students = await StudentsModel.find({ ClassId: id });
    const totalStudents = students.length;
    const quizStats = quizzes.map(q => ({
      ...q._doc,
      totalStudents,
      attended: q.submissions?.length || 0,
      notAttended: totalStudents - (q.submissions?.length || 0)
    }));
    res.status(200).json({ success: true, quizzes: quizStats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- Start Quiz ---
const startQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await QuizModel.findById(id);
    if (!quiz) return res.status(404).json({ success: false });
    quiz.started = true;
    quiz.completed = false;
    quiz.currentQuestionIndex = 0;
    await quiz.save();
    const classRoom = quiz.classId.toString();
    req.io.to(classRoom).emit("quizStarted", { quizId: id, classId: classRoom });
    req.io.to(classRoom).emit("updateQuestion", {
      quizId: id,
      questionIndex: 0,
      question: quiz.questions[0],
      showResults: quiz.showResults,
      timeLimit: quiz.questions[0]?.timeLimit || 0,
      submitEnabled: quiz.submitEnabled,
      classId: classRoom
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- End Quiz ---
const endQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await QuizModel.findById(id);
    if (!quiz) return res.status(404).json({ success: false });
    quiz.completed = true;
    quiz.started = false;
    await quiz.save();
    req.io.to(quiz.classId.toString()).emit("quizEnded", { quizId: id, classId: quiz.classId.toString() });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- Delete Quiz ---
const deleteQuiz = async (req, res) => {
  try {
    await QuizModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- Download Quiz as PDF ---
const downloadQuiz = async (req, res) => {
  try {
    const quiz = await QuizModel.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false });
    const doc = new PDFDocument({ autoFirstPage: false });
    const fileName = `${quiz.title.replace(/\s+/g, "_")}.pdf`;
    const outDir = path.join(process.cwd(), "public/quizzes");
    const filePath = path.join(outDir, fileName);
    fs.mkdirSync(outDir, { recursive: true });
    const outStream = fs.createWriteStream(filePath);
    doc.pipe(outStream);
    doc.addPage().fontSize(22).text(quiz.title, { align: "center" });
    quiz.questions.forEach((q, i) => {
      doc.moveDown().fontSize(14).text(`Q${i + 1}: ${q.text} (${q.marks} marks)`);
      if (q.image) {
        const imgPath = path.join(process.cwd(), "public/uploads", q.image);
        if (fs.existsSync(imgPath)) doc.moveDown().image(imgPath, { width: 200 });
      }
      q.options.forEach((opt, j) => {
        doc.text(`${j + 1}. ${opt.text}${opt.isCorrect ? " (Correct)" : ""}`);
      });
    });
    doc.end();
    outStream.on("finish", () => res.download(filePath, fileName, () => fs.unlink(filePath, () => {})));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- Submit Quiz ---
const submitQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionIndex, answer } = req.body;
    const quiz = await QuizModel.findById(id);
    if (!quiz) return res.status(404).json({ success: false });
    const userEmail = req.user.email;
    let sub = quiz.submissions.find(s => s.user === userEmail);
    if (!sub) {
      sub = { user: userEmail, answers: [] };
      quiz.submissions.push(sub);
    }
    sub.answers[questionIndex] = answer;
    await quiz.save();
    req.io.to(quiz.classId.toString()).emit("updateResults", { questionIndex, submissions: quiz.submissions });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- Set Current Question ---
const setCurrentQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionIndex, showResults, timeLimit, submitEnabled } = req.body;
    const quiz = await QuizModel.findById(id);
    if (!quiz) return res.status(404).json({ success: false });

    if (typeof questionIndex === "number") {
      quiz.currentQuestionIndex = questionIndex;
      if (questionIndex >= 0 && typeof timeLimit !== "undefined") {
        quiz.questions[questionIndex].timeLimit = parseInt(timeLimit) || 0;
      }
    }
    if (typeof showResults !== "undefined") quiz.showResults = !!showResults;
    if (typeof submitEnabled !== "undefined") quiz.submitEnabled = !!submitEnabled;

    await quiz.save();
    const classRoom = quiz.classId.toString();
    req.io.to(classRoom).emit("updateQuestion", {
      quizId: id,
      questionIndex: quiz.currentQuestionIndex,
      question: quiz.currentQuestionIndex >= 0 ? quiz.questions[quiz.currentQuestionIndex] : null,
      showResults: quiz.showResults,
      timeLimit: quiz.currentQuestionIndex >= 0 ? quiz.questions[quiz.currentQuestionIndex].timeLimit || 0 : 0,
      submitEnabled: quiz.submitEnabled,
      classId: classRoom
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- Join Quiz ---
const joinQuiz = async (req, res) => {
  try {
    const quiz = await QuizModel.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false });
    const email = req.user.email;
    if (!quiz.joinedUsers.includes(email)) {
      quiz.joinedUsers.push(email);
      await quiz.save();
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- Get Results ---
const getQuizResults = async (req, res) => {
  try {
    const quiz = await QuizModel.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false });
    res.status(200).json({ success: true, submissions: quiz.submissions || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export {
  createQuiz,
  getQuizzes,
  startQuiz,
  endQuiz,
  deleteQuiz,
  downloadQuiz,
  submitQuiz,
  setCurrentQuestion,
  getQuizResults,
  joinQuiz
};

export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, questions } = req.body;

    let parsedQuestions;
    try {
      parsedQuestions = typeof questions === "string" ? JSON.parse(questions) : questions;
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid questions format", error: err.message });
    }

    const quiz = await QuizModel.findById(id);
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });

    quiz.title = title || quiz.title;

    // Process new images and replace/delete
    const processedQuestions = parsedQuestions.map((q, index) => {
      let imageFilename = q.image; // Existing or null

      // Handle new upload
      if (req.files && req.files[index]) {
        // Delete old image if exists
        if (quiz.questions[index] && quiz.questions[index].image) {
          const oldImagePath = path.join(process.cwd(), "public", "uploads", quiz.questions[index].image);
          if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
        }
        imageFilename = req.files[index].filename;
      } else if (q.image === null) {
        // Delete old image
        if (quiz.questions[index] && quiz.questions[index].image) {
          const oldImagePath = path.join(process.cwd(), "public", "uploads", quiz.questions[index].image);
          if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
        }
        imageFilename = null;
      }

      return {
        text: q.text,
        options: q.options.map(opt => ({
          text: opt.text,
          isCorrect: opt.isCorrect === 'true' || opt.isCorrect === true
        })),
        marks: parseInt(q.marks) || 1,
        image: imageFilename,
        timeLimit: q.timeLimit ? parseInt(q.timeLimit) : 0
      };
    });

    // Fully replace questions array (handles deletes)
    quiz.questions = processedQuestions;

    // Recalculate total marks
    quiz.totalMarks = processedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);

    await quiz.save();

    res.status(200).json({ success: true, quiz });
  } catch (error) {
    console.error("Update quiz error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};