import express from "express";
import authMiddleware from "../middleware/Authmiddleware.js";
import { createQuiz, getQuizzes, startQuiz, endQuiz, deleteQuiz, downloadQuiz, submitQuiz, setCurrentQuestion, getQuizResults, joinQuiz, updateQuiz } from "../controllers/Quiz.js";


export default (upload) => {
  const router = express.Router();

  // Create a new quiz with explicit Multer error handling (JSON, not HTML)
  router.post(
    '/quiz/create',
    (req, res, next) => {
      const mw = upload.array('questionImage', 10);
      mw(req, res, function (err) {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message || 'File upload error'
          });
        }
        next();
      });
    },
    createQuiz
  );


  // Get all quizzes for a class (classId)
  router.get('/quiz/:id', getQuizzes);


  // Start a quiz (quizId), broadcasts to classId room
  router.post('/quiz/start/:id', startQuiz);


  // End a quiz (quizId), broadcasts to classId room
  router.post('/quiz/end/:id', endQuiz);


  // Delete a quiz (quizId)
  router.post('/quiz/delete/:id', deleteQuiz);


  // Download a quiz as PDF (quizId)
  router.get('/quiz/download/:id', downloadQuiz);


  // Submit an answer (quizId), requires authentication
  router.post('/quiz/submit/:id', authMiddleware, submitQuiz);


  // Set the current question (quizId), broadcasts to classId room
  router.post('/quiz/setQuestion/:id', setCurrentQuestion);


  // Get quiz results (quizId)
  router.get('/quiz/results/:id', getQuizResults);


  // Join a quiz (quizId), requires authentication
  router.post('/quiz/join/:id', authMiddleware, joinQuiz);


  router.put('/quiz/update/:id', upload.array('questionImage', 10), updateQuiz);


  return router;
};
