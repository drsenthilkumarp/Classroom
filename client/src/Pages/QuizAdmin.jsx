import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import SecondNav from "../Components/SecondNav";
import io from "socket.io-client";
import { classGet, classPost, downloadFile } from "../services/Endpoint";
import toast from "react-hot-toast";
import axios from "axios";
import { FaPlus, FaPlay, FaDownload, FaTrash, FaChevronLeft, FaChevronRight, FaRegImage } from "react-icons/fa";
import "../styles/QuizAdmin.css";

const socket = io("http://localhost:8000", {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const DEFAULT_OPT = () => ({ text: "", isCorrect: false });
const DEFAULT_Q = () => ({ text: "", image: null, options: [DEFAULT_OPT(), DEFAULT_OPT()], marks: 1 });

const QuizAdmin = () => {
  const { id } = useParams();
  const [classData, setClassData] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Presenter
  const [showPresenter, setShowPresenter] = useState(false);
  const [controlQuizId, setControlQuizId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerValue, setTimerValue] = useState(0);
  const [results, setResults] = useState([]);

  // Editor
  const [showForm, setShowForm] = useState(false);
  const [editQuizId, setEditQuizId] = useState(null);
  const [editIndex, setEditIndex] = useState(0);
  const [quizForm, setQuizForm] = useState({ title: "", questions: [DEFAULT_Q()] });
  const [titleStep, setTitleStep] = useState(false);

  const joined = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const c = await classGet(`/class/getclass/${id}`);
        const q = await classGet(`/quizes/quiz/${id}`);
        setClassData(c.data.classData);
        setQuizzes(q.data.quizzes || []);
      } catch {
        toast.error("Failed to load");
      } finally {
        setIsLoading(false);
      }
    };
    load();

    if (!joined.current) {
      socket.emit("joinClass", id);
      joined.current = true;
    }

    // Live submissions stream
    socket.on("updateResults", d => setResults(d.submissions || []));

    // Keep admin side in sync if another admin toggles or sets question
    socket.on("updateQuestion", payload => {
      if (payload.quizId === controlQuizId) {
        setCurrentIndex(payload.questionIndex);
        setShowResults(!!payload.showResults);
      }
    });

    return () => {
      socket.off("updateResults");
      socket.off("updateQuestion");
    };
  }, [id, controlQuizId]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const t = setInterval(() => {
        setTimeLeft(p => {
          if (p <= 1) {
            socket.emit("updateQuestion", {
              quizId: controlQuizId,
              questionIndex: currentIndex,
              question: quizzes.find(q => q._id === controlQuizId)?.questions[currentIndex],
              showResults,
              timeLimit: 0,
              submitEnabled: false,
              classId: id
            });
            return 0;
          }
          return p - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [timeLeft, showResults, currentIndex, controlQuizId, id, quizzes]);

  // Ensure editIndex is always valid
  useEffect(() => {
    setEditIndex(prev => {
      const max = Math.max(0, quizForm.questions.length - 1);
      return Math.min(Math.max(0, prev), max);
    });
  }, [quizForm.questions.length]);

  const validate = () =>
    quizForm.title.trim() &&
    quizForm.questions.every(
      q =>
        q.text.trim() &&
        q.marks > 0 &&
        q.options.length >= 2 &&
        q.options.every(o => o.text.trim()) &&
        q.options.some(o => o.isCorrect)
    );

  const handleEditQuiz = quiz => {
    setQuizForm({
      title: quiz.title,
      questions: quiz.questions.map(q => ({ ...q, image: q.image || null }))
    });
    setEditQuizId(quiz._id);
    setEditIndex(0);
    setShowForm(true);
  };

  const handleNewDeck = () => {
    setQuizForm({ title: "", questions: [DEFAULT_Q()] });
    setEditQuizId(null);
    setEditIndex(0);
    setShowForm(true);
    setTitleStep(true);
  };

  const removeQuestionImage = i => {
    const qs = quizForm.questions.map((q, idx) => (idx === i ? { ...q, image: null } : q));
    setQuizForm({ ...quizForm, questions: qs });
  };

  const deleteQuestion = i => {
    if (quizForm.questions.length === 1) return;
    const qs = quizForm.questions.filter((_, idx) => idx !== i);
    setQuizForm({ ...quizForm, questions: qs });
    setEditIndex(prev => {
      const max = Math.max(0, qs.length - 1);
      return Math.min(prev, max);
    });
  };

  const handleSaveQuiz = async () => {
    if (!validate()) return toast.error("Fill all fields correctly");
    try {
      const fd = new FormData();
      fd.append("title", quizForm.title);
      fd.append("classId", id);
      quizForm.questions.forEach((q, i) => {
        if (q.image instanceof File) fd.append("questionImage", q.image, `questionImage${i}`);
      });
      fd.append(
        "questions",
        JSON.stringify(
          quizForm.questions.map((q, i) => ({
            text: q.text,
            marks: q.marks,
            options: q.options,
            image: q.image === null ? null : q.image instanceof File ? `questionImage${i}` : q.image
          }))
        )
      );

      if (editQuizId) {
        await axios.put(`http://localhost:8000/quizes/quiz/update/${editQuizId}`, fd);
        toast.success("Quiz updated");
      } else {
        await classPost("/quizes/quiz/create", fd);
        toast.success("Quiz created");
      }

      setShowForm(false);
      setEditQuizId(null);
      setEditIndex(0);

      const qList = await classGet(`/quizes/quiz/${id}`);
      setQuizzes(qList.data.quizzes);
    } catch (e) {
      console.error("Save error:", e?.response || e);
      toast.error("Save failed");
    }
  };

  // Presenter controls
  const handleStartQuiz = async quizId => {
    try {
      // allow starting anytime; reset flags
      await classPost(`/quizes/quiz/start/${quizId}`);
      setQuizzes(prev =>
        prev.map(q =>
          q._id === quizId ? { ...q, started: true, completed: false, submissions: [] } : q
        )
      );
      setControlQuizId(quizId);
      setCurrentIndex(0);
      setShowResults(false);
      setTimerValue(0);
      setTimeLeft(0);
      setResults([]);
      setShowPresenter(true);

      await handleSetQuestion(quizId, 0);
      socket.emit("quizStarted", { quizId, classId: id });
      toast.success("Started");
    } catch {
      toast.error("Start failed");
    }
  };

  const handleEndQuiz = async quizId => {
    try {
      await classPost(`/quizes/quiz/end/${quizId}`);
      setQuizzes(prev => prev.map(q => (q._id === quizId ? { ...q, completed: true } : q)));
      setShowPresenter(false);
      setControlQuizId(null);
      setCurrentIndex(0);
      socket.emit("quizEnded", { quizId, classId: id });
    } catch {
      toast.error("End failed");
    }
  };

  const handleDeleteQuiz = async quizId => {
    try {
      await classPost(`/quizes/quiz/delete/${quizId}`);
      setQuizzes(prev => prev.filter(q => q._id !== quizId));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleDownload = async (quizId, title) => {
    try {
      const r = await downloadFile(`/quizes/quiz/download/${quizId}`);
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleSetQuestion = async (quizId, index) => {
    try {
      const question = quizzes.find(q => q._id === quizId)?.questions[index];
      await classPost(`/quizes/quiz/setQuestion/${quizId}`, {
        questionIndex: index,
        showResults,
        timeLimit: 0, // timer not required for submitting
        submitEnabled: true
      });
      setCurrentIndex(index);
      socket.emit("updateQuestion", {
        quizId,
        questionIndex: index,
        question,
        showResults,
        timeLimit: 0,
        submitEnabled: true,
        classId: id
      });
    } catch {
      toast.error("Set question failed");
    }
  };

  const toggleResults = async () => {
    if (!controlQuizId) return;
    const newShow = !showResults;
    setShowResults(newShow);

    // Persist and broadcast so users lock/unlock and see correct answer
    try {
      await classPost(`/quizes/quiz/setQuestion/${controlQuizId}`, {
        questionIndex: currentIndex,
        showResults: newShow,
        timeLimit: 0,
        submitEnabled: true
      });
      const question = quizzes.find(q => q._id === controlQuizId)?.questions[currentIndex];
      socket.emit("updateQuestion", {
        quizId: controlQuizId,
        questionIndex: currentIndex,
        question,
        showResults: newShow,
        timeLimit: 0,
        submitEnabled: true,
        classId: id
      });
    } catch {
      // still emit to keep UI in sync even if server call fails
      const question = quizzes.find(q => q._id === controlQuizId)?.questions[currentIndex];
      socket.emit("updateQuestion", {
        quizId: controlQuizId,
        questionIndex: currentIndex,
        question,
        showResults: newShow,
        timeLimit: 0,
        submitEnabled: true,
        classId: id
      });
    }
  };

  const nextSlide = () => {
    const quiz = quizzes.find(q => q._id === controlQuizId);
    if (!quiz) return;
    if (currentIndex < quiz.questions.length - 1) {
      setShowResults(false);
      handleSetQuestion(controlQuizId, currentIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      setShowResults(false);
      handleSetQuestion(controlQuizId, currentIndex - 1);
    }
  };

  const startTimer = () => setTimeLeft(0); // timer not required for submission now

  const pollData = qi => {
    const quiz = quizzes.find(q => q._id === controlQuizId);
    if (!quiz || qi < 0) return [];
    const question = quiz.questions[qi];
    return question.options.map((opt, idx) => {
      const votes = results.reduce((sum, s) => (s.answers[qi] === opt.text ? sum + 1 : sum), 0);
      return { option: opt.text, votes, idx, isCorrect: opt.isCorrect };
    });
  };

  if (isLoading) return <div className="spinner"></div>;

  return (
    <div className="page-container">
      <div className="card-container">
        <SecondNav classId={id} />
        <h2 className="class-name">{classData?.className || ""}</h2>

        <div className="section-head">
          <h3 className="section-title">Quizzes</h3>
        </div>

        {quizzes.length === 0 ? (
          <div className="no-quizzes">No quizzes yet. Create one!</div>
        ) : (
          <div className="quiz-list">
            {quizzes.map(q => (
              <div className="quiz-card" key={q._id}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{q.title}</div>
                  <div className="quiz-meta">
                    <span>{q.questions.length} Questions</span>
                    <span>{q.totalMarks || 0} Marks</span>
                    {q.started && !q.completed && <span className="tag tag--live">Live</span>}
                    {q.completed && <span className="tag tag--ended">Ended</span>}
                  </div>
                </div>
                <div className="actions">
                  <button className="ppt-btn ppt-primary" onClick={() => handleStartQuiz(q._id)}>
                    <FaPlay /> Start
                  </button>
                  <button className="ppt-btn" onClick={() => handleEditQuiz(q)}>
                    Edit
                  </button>
                  <button className="ppt-btn" onClick={() => handleDownload(q._id, q.title)}>
                    <FaDownload />
                  </button>
                  <button className="ppt-btn ppt-danger" onClick={() => handleDeleteQuiz(q._id)}>
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="create-wrap">
          <button className="ppt-btn ppt-primary" onClick={handleNewDeck}>
            <FaPlus /> New Slide Deck
          </button>
        </div>
      </div>

      {/* Form Overlay */}
      {showForm && (
        <div className="ppt-overlay">
          <div className="ppt-slide-template">
            {!titleStep && (
              <>
                <div className="ppt-edge-nav left">
                  <button className="ppt-nav-btn" onClick={() => setEditIndex(p => Math.max(0, p - 1))} disabled={editIndex === 0}>
                    <FaChevronLeft />
                  </button>
                </div>
                <div className="ppt-edge-nav right">
                  <button className="ppt-nav-btn" onClick={() => setEditIndex(p => Math.min(quizForm.questions.length - 1, p + 1))} disabled={editIndex === quizForm.questions.length - 1}>
                    <FaChevronRight />
                  </button>
                </div>
              </>
            )}

            <div className="ppt-header">
              <input
                type="text"
                value={quizForm.title}
                onChange={e => setQuizForm({ ...quizForm, title: e.target.value })}
                placeholder="Quiz Title"
                style={{ fontSize: 24, fontWeight: 800, border: "none", outline: "none", flex: 1 }}
              />
              {!titleStep && <span>{editIndex + 1} / {quizForm.questions.length}</span>}
            </div>

            <div className="ppt-body">
              {titleStep ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
                  <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 20 }}>Enter Quiz Title</h2>
                  <input
                    type="text"
                    value={quizForm.title}
                    onChange={e => setQuizForm({ ...quizForm, title: e.target.value })}
                    placeholder="Type the title here..."
                    style={{ fontSize: 24, padding: "10px 20px", borderRadius: 10, border: "1px solid #ddd", width: "80%", maxWidth: 600, textAlign: "center" }}
                  />
                  <button
                    className="ppt-btn ppt-primary"
                    onClick={() => {
                      if (quizForm.title.trim()) setTitleStep(false);
                      else toast.error("Title is required");
                    }}
                    style={{ marginTop: 30, padding: "12px 24px", fontSize: 18 }}
                  >
                    Next
                  </button>
                </div>
              ) : (
                <>
                  <div className="ppt-img-box">
                    {quizForm.questions[editIndex].image ? (
                      <div style={{ position: "relative" }}>
                        <img
                          src={
                            quizForm.questions[editIndex].image instanceof File
                              ? URL.createObjectURL(quizForm.questions[editIndex].image)
                              : `http://localhost:8000/uploads/${quizForm.questions[editIndex].image}`
                          }
                          alt="Question"
                          className="ppt-img"
                        />
                        <button className="remove-image-btn" onClick={() => removeQuestionImage(editIndex)}>
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <label
                        className="dropzone"
                        onDrop={e => {
                          e.preventDefault();
                          const file = e.dataTransfer.files[0];
                          if (file) {
                            const qs = [...quizForm.questions];
                            qs[editIndex].image = file;
                            setQuizForm({ ...quizForm, questions: qs });
                          }
                        }}
                        onDragOver={e => e.preventDefault()}
                      >
                        <div className="ppt-img-drop">
                          <FaRegImage size={32} />
                          <span>Drop image here or click to upload</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={e => {
                            const file = e.target.files[0];
                            if (file) {
                              const qs = [...quizForm.questions];
                              qs[editIndex].image = file;
                              setQuizForm({ ...quizForm, questions: qs });
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <div className="form-block">
                    <div className="form-row">
                      <div className="form-qindex">Q{editIndex + 1}</div>
                      <input
                        type="text"
                        value={quizForm.questions[editIndex].text}
                        onChange={e => {
                          const qs = [...quizForm.questions];
                          qs[editIndex].text = e.target.value;
                          setQuizForm({ ...quizForm, questions: qs });
                        }}
                        placeholder="Question Text"
                      />
                      <input
                        type="number"
                        value={quizForm.questions[editIndex].marks}
                        onChange={e => {
                          const qs = [...quizForm.questions];
                          qs[editIndex].marks = parseInt(e.target.value) || 1;
                          setQuizForm({ ...quizForm, questions: qs });
                        }}
                        min={1}
                        placeholder="Marks"
                      />
                    </div>

                    {quizForm.questions[editIndex].options.map((opt, oi) => (
                      <div className="option-edit" key={oi}>
                        <div className="checkbox">
                          <input
                            type="checkbox"
                            checked={opt.isCorrect}
                            onChange={e => {
                              const qs = [...quizForm.questions];
                              qs[editIndex].options[oi].isCorrect = e.target.checked;
                              setQuizForm({ ...quizForm, questions: qs });
                            }}
                          />
                          <span>Correct</span>
                        </div>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={e => {
                            const qs = [...quizForm.questions];
                            qs[editIndex].options[oi].text = e.target.value;
                            setQuizForm({ ...quizForm, questions: qs });
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        />
                        <button
                          onClick={() => {
                            const qs = [...quizForm.questions];
                            qs[editIndex].options.splice(oi, 1);
                            setQuizForm({ ...quizForm, questions: qs });
                          }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => {
                        const qs = [...quizForm.questions];
                        qs[editIndex].options.push(DEFAULT_OPT());
                        setQuizForm({ ...quizForm, questions: qs });
                      }}
                    >
                      Add Option
                    </button>

                    <button className="delete-question-btn" onClick={() => deleteQuestion(editIndex)} disabled={quizForm.questions.length === 1}>
                      Delete Question
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="ppt-controls">
              <button
                className="ppt-btn"
                onClick={() => {
                  setShowForm(false);
                  setTitleStep(false);
                }}
              >
                Cancel
              </button>
              {!titleStep && (
                <button
                  className="ppt-btn"
                  onClick={() => {
                    setQuizForm({ ...quizForm, questions: [...quizForm.questions, DEFAULT_Q()] });
                    setEditIndex(quizForm.questions.length);
                  }}
                >
                  <FaPlus /> Add Question
                </button>
              )}
              <button className="ppt-btn ppt-primary" onClick={handleSaveQuiz}>
                Save Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {showPresenter && controlQuizId && (
        <div className="ppt-overlay">
          <div className="ppt-slide-template">
            <div className="ppt-edge-nav left">
              <button className="ppt-nav-btn" onClick={prevSlide} disabled={currentIndex === 0}>
                <FaChevronLeft />
              </button>
            </div>
            <div className="ppt-edge-nav right">
              <button
                className="ppt-nav-btn"
                onClick={nextSlide}
                disabled={currentIndex === (quizzes.find(q => q._id === controlQuizId)?.questions.length - 1)}
              >
                <FaChevronRight />
              </button>
            </div>

            <div className="ppt-header">
              <div className="ppt-qtext">
                {quizzes.find(q => q._id === controlQuizId)?.questions[currentIndex]?.text || ""}
              </div>
              <div className="ppt-marks">
                {quizzes.find(q => q._id === controlQuizId)?.questions[currentIndex]?.marks || 1} pts
              </div>
            </div>

            <div className="ppt-body">
              <div className="ppt-img-box">
                {quizzes.find(q => q._id === controlQuizId)?.questions[currentIndex]?.image ? (
                  <img
                    src={`http://localhost:8000/uploads/${quizzes.find(q => q._id === controlQuizId)?.questions[currentIndex]?.image}`}
                    alt="Question"
                    className="ppt-img"
                  />
                ) : (
                  <div className="ppt-img-drop">
                    <FaRegImage size={32} />
                    <span>No Image</span>
                  </div>
                )}
              </div>

              <div className="poll-panel">
                <div className="poll-option-list">
                  {pollData(currentIndex).map(pd => (
                    <div className={`poll-opt-row ${pd.isCorrect && showResults ? "poll-correct-row" : ""}`} key={pd.idx}>
                      <span className="poll-opt-label">{String.fromCharCode(65 + pd.idx)}</span>
                      <span className="poll-opt-text">{pd.option}</span>
                      {showResults && <span className="poll-votes">{pd.votes}</span>}
                      {pd.isCorrect && showResults && <span className="is-correct">Correct</span>}
                    </div>
                  ))}
                </div>
                {showResults && (
                  <div className="poll-bars-row">
                    {pollData(currentIndex).map(pd => (
                      <div className="poll-bar-box" key={pd.idx}>
                        <span className="poll-bar-votes">{pd.votes}</span>
                        <div
                          className={`poll-bar bar${pd.idx + 1}`}
                          style={{
                            height: `${(pd.votes / Math.max(1, pollData(currentIndex).reduce((s, p) => s + p.votes, 0))) * 100}%`
                          }}
                        ></div>
                        <span className="poll-bar-label">{String.fromCharCode(65 + pd.idx)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="ppt-controls">
              <div className="group">
                <input
                  type="number"
                  value={timerValue}
                  onChange={e => setTimerValue(parseInt(e.target.value) || 0)}
                  placeholder="Timer (s)"
                  style={{ width: 80, padding: 8, borderRadius: 10, border: "1px solid #ddd" }}
                />
                <button className="ppt-btn" onClick={startTimer} disabled>
                  Start Timer
                </button>
                {timeLeft > 0 && <span>Time Left: {timeLeft}s</span>}
              </div>
              <button className="ppt-btn" onClick={toggleResults}>
                {showResults ? "Hide" : "Show"} Results
              </button>
              <button className="ppt-btn ppt-danger" onClick={() => handleEndQuiz(controlQuizId)}>
                End Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizAdmin;
