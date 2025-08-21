import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SecondNav from "../Components/SecondNavUs";
import { classGet, classPost, getUser } from "../services/Endpoint";
import io from "socket.io-client";
import toast from "react-hot-toast";
import "../styles/QuizUser.css";

const socket = io("http://localhost:8000", { transports: ["websocket"] });

const QuizUser = () => {
  const { id } = useParams();
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [joinPopupVisible, setJoinPopupVisible] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitEnabled, setSubmitEnabled] = useState(true);
  const [answer, setAnswer] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [userEmail, setUserEmail] = useState(null);

  // lock state per question index: { [index]: true }
  const [lockedAnswers, setLockedAnswers] = useState({});

  useEffect(() => {
    getUser().then(u => {
      const email = u?.data?.user?.email || `anon_${socket.id}`;
      setUserEmail(email);
      socket.emit("joinClass", { classId: id, userEmail: email });
    });
    classGet(`/quizes/quiz/${id}`).then(res => setQuizzes(res.data.quizzes || []));
  }, [id]);

  useEffect(() => {
    socket.on("quizStarted", ({ quizId, classId }) => {
      if (classId === id) {
        setQuizzes(qs => qs.map(q => (q._id === quizId ? { ...q, started: true, completed: false } : q)));
      }
    });

    socket.on("quizEnded", ({ quizId, classId }) => {
      if (classId === id && quizId === activeQuizId) {
        setJoinPopupVisible(false);
        setActiveQuizId(null);
      }
      setQuizzes(qs => qs.map(q => (q._id === quizId ? { ...q, completed: true } : q)));
    });

    // Single source of truth for current slide + showResults + enable state
    const applyPayload = payload => {
      if (payload.quizId === activeQuizId) {
        setCurrentQuestion({ index: payload.questionIndex, ...payload.question });
        setTimeLeft(payload.timeLimit || 0);
        setSubmitEnabled(payload.submitEnabled !== false); // default true
        setShowResults(!!payload.showResults);
        // reset temporary selection only when switching questions
        setAnswer("");
        // unlock if moving to a new question
        setLockedAnswers(prev => {
          const next = { ...prev };
          // ensure only existing locks kept; no change needed
          return next;
        });
      }
    };

    socket.on("updateQuestion", applyPayload);
    socket.on("currentQuestion", applyPayload);

    socket.on("updateResults", data => {
      setSubmissions(data.submissions || []);
    });

    return () => {
      socket.off("quizStarted");
      socket.off("quizEnded");
      socket.off("updateQuestion");
      socket.off("currentQuestion");
      socket.off("updateResults");
    };
  }, [activeQuizId, id]);

  useEffect(() => {
    if (timeLeft > 0) {
      const t = setInterval(() => setTimeLeft(p => (p <= 1 ? 0 : p - 1)), 1000);
      return () => clearInterval(t);
    }
  }, [timeLeft]);

  const handleJoin = quiz => {
    if (quiz.completed) return;
    setActiveQuizId(quiz._id);
    setJoinPopupVisible(true);
    socket.emit("requestCurrentQuestion", { quizId: quiz._id, classId: id });
  };

  const submitAnswer = async () => {
    if (!answer || !currentQuestion) return;
    try {
      await classPost(`/quizes/quiz/submit/${activeQuizId}`, {
        questionIndex: currentQuestion.index,
        answer
      });
      // lock this question locally
      setLockedAnswers(prev => ({ ...prev, [currentQuestion.index]: true }));
      toast.success("Answer submitted!");
    } catch {
      toast.error("Submit failed");
    }
  };

  const isLocked = currentQuestion ? !!lockedAnswers[currentQuestion.index] : false;

  const getOptionStyle = (opt, idx) => {
    // locked grey style when user already submitted this question
    const lockedStyle = isLocked && answer !== opt.text ? { opacity: 0.6, cursor: "not-allowed" } : {};

    if (!showResults) {
      return answer === opt.text
        ? { border: "2px solid #7c3aed", background: "#eef0ff", ...lockedStyle }
        : { ...lockedStyle };
    } else {
      if (opt.isCorrect) return { background: "#defad2", border: "2px solid #16a34a", fontWeight: "bold" };
      if (answer === opt.text && !opt.isCorrect) return { background: "#fee2e2", border: "2px solid #991b1b" };
      return {};
    }
  };

  return (
    <div className="page-container">
      <div className="card-container">
        <SecondNav classId={id} />
        <h2 className="class-name" style={{ color: "#6b48ff", fontWeight: "900" }}>User Quiz List</h2>
        <div className="quiz-list">
          {quizzes.map(q => (
            <div className="quiz-card" key={q._id}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{q.title}</div>
                <div className="quiz-meta" style={{ marginTop: 6, display: "flex", gap: 12 }}>
                  <span>{q.questions.length} Slides</span>
                  <span>{q.totalMarks || 0} Marks</span>
                  {q.started && !q.completed && <span className="tag tag--live">Live</span>}
                  {q.completed && <span className="tag tag--ended">Ended</span>}
                </div>
              </div>
              <button
                className={q.started && !q.completed ? "u-join-btn u-join-live" : "u-join-btn u-join-idle"}
                onClick={() => handleJoin(q)}
                disabled={q.completed}
                style={{ marginLeft: "auto" }}
              >
                Join
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Popup */}
      {joinPopupVisible && currentQuestion && (
        <div className="ppt-overlay" style={{ zIndex: 11000 }}>
          <div className="slide-user-panel" style={{
            background: "#fff", borderRadius: 16, maxWidth: 480, width: "95vw",
            boxShadow: "0 2px 24px rgba(99,91,255,0.08)", padding: "24px", display: "flex", flexDirection: "column"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{currentQuestion.text}</div>
              {currentQuestion.image &&
                <img src={`http://localhost:8000/uploads/${currentQuestion.image}`} alt="quiz" style={{
                  maxWidth: 120, maxHeight: 80, borderRadius: 10, marginLeft: 14, objectFit: "contain"
                }} />
              }
            </div>
            <div style={{ marginBottom: 18 }}>
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    padding: "11px 16px",
                    fontSize: "1rem",
                    marginBottom: 7,
                    borderRadius: 9,
                    cursor: isLocked ? "not-allowed" : "pointer",
                    position: "relative",
                    ...getOptionStyle(opt, idx)
                  }}
                  disabled={isLocked || showResults}
                  onClick={() => !isLocked && setAnswer(opt.text)}
                >
                  <span style={{
                    width: 30, height: 30,
                    background: "#f3f4f6",
                    borderRadius: 7,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                    fontWeight: 700
                  }}>{String.fromCharCode(65 + idx)}</span>
                  <span style={{ flex: 1 }}>{opt.text}</span>

                  {showResults && (
                    <>
                      {opt.isCorrect && (
                        <span style={{
                          background: "#22c55e",
                          color: "white",
                          borderRadius: "6px",
                          padding: "3px 7px",
                          fontSize: "13px",
                          marginLeft: 5
                        }}>Correct</span>
                      )}
                      {answer === opt.text && !opt.isCorrect && (
                        <span style={{
                          background: "#dc2626",
                          color: "white",
                          borderRadius: "6px",
                          padding: "3px 7px",
                          fontSize: "13px",
                          marginLeft: 5
                        }}>Your selection</span>
                      )}
                    </>
                  )}

                  {!showResults && answer === opt.text && (
                    <span style={{
                      background: "#6b48ff",
                      color: "white",
                      borderRadius: "6px",
                      padding: "3px 7px",
                      fontSize: "13px",
                      marginLeft: 5
                    }}>Selected</span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <span style={{
                background: "#f0f0ff", color: "#6b48ff", padding: "6px 13px", borderRadius: 11,
                fontWeight: 700, fontSize: "13px"
              }}>{timeLeft > 0 ? <>Time Left: {timeLeft}s</> : <>No Timer</>}</span>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setJoinPopupVisible(false)} style={{
                  borderRadius: 12, background: "#eee",
                  padding: "9px 18px", fontWeight: 600, border: "none"
                }}>Close</button>
                <button
                  disabled={!answer || isLocked}
                  onClick={submitAnswer}
                  style={{
                    background: answer && !isLocked ? "#6b48ff" : "#bbb",
                    color: "#fff", borderRadius: 12,
                    padding: "9px 24px", fontWeight: 700, border: "none", opacity: answer && !isLocked ? 1 : 0.7
                  }}
                >{isLocked ? "Submitted" : "Submit"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizUser;
