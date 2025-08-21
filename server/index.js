import express from "express";
import dotenv from "dotenv";
import DBcon from "./utils/db.js";
import AuthRoutes from "./routes/Auth.js";
import ClassRoutes from "./routes/Class.js";
import OTPRoutes from "./routes/otp.js";
import AttendanceRoutes from "./routes/attendance.js";
import cors from "cors";
import StudentRoutes from "./routes/students.js";
import path from "path";
import QuizRoutes from "./routes/Quiz.js";
import FacultyClassRoutes from "./routes/faculty.js";
import leaveRoute from "./routes/leaveRoutes.js";
import ApprovalRoutes from './routes/approvalRoutes.js';
import mentorStudentRoutes from './routes/mentorstudentRoutes.js';
import achievementsRoutes from "./routes/achievements.js";
import marksRouter from './routes/markroutes.js';
import { Server } from "socket.io";
import http from "http";
import upload from "./middleware/Multer.js"; // ADDED
import QuizModel from "./models/QuizModel.js";


dotenv.config();


const app = express(); // ✅ create app first
const server = http.createServer(app); // ✅ now pass app
const io = new Server(server, { cors: { origin: "*" } });


const PORT = process.env.PORT || 5000;


DBcon();


const allowedOrigins = [
  "http://localhost:5173",
  "http://10.70.2.38",
  "https://classroom.bitsathy.ac.in",
  "https://classroom-lime-mu.vercel.app",
  "https://classroom-798mphos9-sabarevijays-projects.vercel.app",
  "https://accounts.google.com",
];


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
  cors({
    origin: (origin, callback) => {
      const normalizedOrigin = origin && origin.endsWith("/") ? origin.slice(0, -1) : origin;
      if (!origin || allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.options("*", cors());


app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});


app.use("/images", express.static(path.join(path.resolve(), "public/images")));
app.use("/quizzes", express.static(path.join(path.resolve(), "public/quizzes")));
app.use("/uploads", express.static(path.join(path.resolve(), "public/uploads"))); // ADDED


app.get("/", (req, res) => {
  res.send("Hello from classroom backend");
});

// Attach io to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/auth", AuthRoutes);
app.use("/class", ClassRoutes);
app.use("/quizes", QuizRoutes(upload)); // CHANGED: pass upload to route factory
app.use("/otp", OTPRoutes);
app.use("/attendance", AttendanceRoutes);
app.use("/students", StudentRoutes);
app.use("/facultyclass", FacultyClassRoutes);
app.use('/api/leave', leaveRoute);
app.use('/api/approval', ApprovalRoutes);
app.use('/api/mentorstudent', mentorStudentRoutes);
app.use("/api/achievements", achievementsRoutes);
app.use("/api/marks", marksRouter);


// Socket.io handlers
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("joinClass", ({ classId }) => {
    socket.join(classId);
  });

  socket.on("requestCurrentQuestion", async ({ quizId }) => {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) return;
    const qi = quiz.currentQuestionIndex;
    socket.emit("currentQuestion", {
      quizId,
      questionIndex: qi,
      question: qi >= 0 ? quiz.questions[qi] : null,
      timeLimit: qi >= 0 ? (quiz.questions[qi].timeLimit || 0) : 0,
      submitEnabled: quiz.submitEnabled
    });
  });
});

server.listen(process.env.PORT || 5000, () => {
  console.log("Server running");
});
