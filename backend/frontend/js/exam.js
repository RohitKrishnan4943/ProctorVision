// ===== exam.js =====
// ================= AUTH CHECK =====================
console.log("🔥 NEW exam.js LOADED");
const token = localStorage.getItem("token");
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!token || !currentUser || currentUser.role !== "student") {
    console.warn('❌ No student user found, redirecting to login');
    window.location.href = "index.html";
}

const API_BASE_URL = "/api";

// ================= GLOBAL STATE =====================
let currentExam = null;
let currentAttempt = null;
let currentQuestion = 0;
let answers = {};
let timeRemaining = 0;
let examTimer = null;

// ================= DOM READY =====================
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🎓 Exam interface loading...");
    
    // Get exam code from URL
    const examCode = new URLSearchParams(window.location.search).get("code");
    console.log("📋 Exam code from URL:", examCode);
    
    if (!examCode) {
        alert("❌ Invalid exam link - no exam code provided");
        window.location.href = "student-dashboard.html";
        return;
    }
    
    // Load exam from backend
    await loadExamFromBackend(examCode.toUpperCase());
});

// ================= LOAD EXAM FROM BACKEND =====================
async function loadExamFromBackend(examCode) {
    try {
        showLoading("Loading exam from server...");
        
        // Fetch exam from backend API
        const response = await fetch(`${API_BASE_URL}/exams/${examCode}`, {
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Exam not found. Please check the exam code.");
            } else if (response.status === 403) {
                throw new Error("You are not authorized to access this exam.");
            } else {
                throw new Error(`Server error: ${response.status}`);
            }
        }
        
        const exam = await response.json();
        console.log("✅ Exam loaded from backend:", exam);
        
        // Validate exam structure
        if (!exam.questions || !Array.isArray(exam.questions)) {
            throw new Error("Invalid exam structure: No questions found.");
        }
        
        currentExam = exam;
        
        // Update UI with exam details
        document.getElementById("examTitle").textContent = exam.title;
        document.getElementById("examDescription").textContent = exam.description || "No description provided";
        document.getElementById("studentName").textContent = currentUser.name;
        document.getElementById("examDuration").textContent = `${exam.duration} minutes`;
        
        // Enable start button
        const startBtn = document.getElementById("startExamBtn");
        if (startBtn) {
            startBtn.disabled = false;
        }
        
        hideLoading();
        console.log("✅ Exam loaded successfully from backend");
        
    } catch (error) {
        console.error("❌ Error loading exam:", error);
        alert(`❌ ${error.message}\n\nPlease check with your teacher.`);
        
        // Redirect back to student dashboard
        setTimeout(() => {
            window.location.href = "student-dashboard.html";
        }, 3000);
    }
}

// ================= START EXAM =====================
window.startExam = async function () {
    try {
        if (!currentExam) {
            alert("Exam not loaded properly. Please refresh the page.");
            return;
        }
        
        showLoading("Starting exam...");
        
        // Start exam via backend API
        const response = await fetch(`${API_BASE_URL}/exams/${currentExam.exam_code}/start`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to start exam");
        }
        
        const startData = await response.json();
        currentAttempt = startData;
        
        // Initialize exam state
        currentExam.questions.forEach((_, index) => {
            answers[index] = null;
        });
        
        // Set time remaining
        timeRemaining = startData.time_remaining || (currentExam.duration * 60);
        
        // Show exam UI
        hideLoading();
        initializeExamUI();
        startTimer();
        
        // Try fullscreen
        enterFullscreen();
        
        console.log("✅ Exam started successfully");
        
    } catch (error) {
        console.error("❌ Error starting exam:", error);
        alert("Failed to start exam: " + error.message);
        hideLoading();
    }
};

// ================= INITIALIZE EXAM UI =====================
function initializeExamUI() {
    // Hide instructions, show exam
    const instructions = document.getElementById("examInstructions");
    const examContainer = document.getElementById("examContainer");
    
    if (instructions) instructions.style.display = "none";
    if (examContainer) examContainer.style.display = "block";
    
    // Load first question
    loadQuestion(0);
    buildQuestionGrid();
}

// ================= TIMER =====================
function startTimer() {
    // Update timer display immediately
    updateTimerDisplay();
    
    examTimer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(examTimer);
            autoSubmitExam("Time expired");
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timerElement = document.getElementById("examTimer");
    
    if (timerElement) {
        timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

// ================= QUESTIONS =====================
function loadQuestion(index) {
    if (!currentExam || !currentExam.questions[index]) return;
    
    currentQuestion = index;
    const question = currentExam.questions[index];
    
    const container = document.getElementById("questionsContainer");
    if (!container) return;
    
    container.innerHTML = `
        <div class="question-container">
            <div class="question-text">${question.question_text}</div>
            <div class="options-container" id="optionsContainer"></div>
        </div>
    `;
    
    const optionsContainer = document.getElementById("optionsContainer");
    
    if (question.type === "mcq" && question.options) {
        question.options.forEach((option, optionIndex) => {
            const optionDiv = document.createElement("div");
            optionDiv.className = "option";
            if (answers[index] === optionIndex) {
                optionDiv.classList.add("selected");
            }
            
            optionDiv.innerHTML = `
                <input type="radio" name="q${index}">
                <span class="option-label">${option}</span>
            `;
            
            optionDiv.onclick = () => {
                answers[index] = optionIndex;
                loadQuestion(index); // Reload to show selection
                updateQuestionGrid();
            };
            
            optionsContainer.appendChild(optionDiv);
        });
    } else {
        // Short answer question
        const textarea = document.createElement("textarea");
        textarea.className = "short-answer";
        textarea.placeholder = "Type your answer here...";
        textarea.value = answers[index] || "";
        textarea.oninput = (e) => {
            answers[index] = e.target.value;
            updateQuestionGrid();
        };
        optionsContainer.appendChild(textarea);
    }
    
    updateQuestionGrid();
}

// ================= QUESTION GRID =====================
function buildQuestionGrid() {
    if (!currentExam || !currentExam.questions) return;
    
    const grid = document.getElementById("questionGrid");
    if (!grid) return;
    
    grid.innerHTML = "";
    
    currentExam.questions.forEach((_, index) => {
        const questionNumber = document.createElement("div");
        questionNumber.className = "question-number";
        questionNumber.textContent = index + 1;
        questionNumber.onclick = () => loadQuestion(index);
        grid.appendChild(questionNumber);
    });
    
    updateQuestionGrid();
}

function updateQuestionGrid() {
    const questionNumbers = document.querySelectorAll(".question-number");
    questionNumbers.forEach((element, index) => {
        element.classList.toggle("active", index === currentQuestion);
        element.classList.toggle("answered", answers[index] !== null && answers[index] !== "");
    });
}

// ================= NAVIGATION =====================
window.prevQuestion = function () {
    if (currentQuestion > 0) {
        loadQuestion(currentQuestion - 1);
    }
};

window.nextQuestion = function () {
    if (currentExam && currentQuestion < currentExam.questions.length - 1) {
        loadQuestion(currentQuestion + 1);
    }
};

// ================= FULLSCREEN =====================
function enterFullscreen() {
    try {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
    } catch (error) {
        console.warn("Fullscreen denied:", error);
    }
}

// ================= SUBMIT EXAM =====================
window.submitExam = async function () {
    if (!confirm("Are you sure you want to submit your exam?")) return;
    
    await submitAnswers();
};

async function autoSubmitExam(reason) {
    console.log(`📤 Auto-submitting exam: ${reason}`);
    await submitAnswers(reason);
}

async function submitAnswers(autoSubmitReason = null) {
    try {
        if (!currentAttempt) {
            alert("No active exam session found.");
            return;
        }
        
        showLoading("Submitting exam...");
        
        // Prepare answers in backend format
        const formattedAnswers = Object.keys(answers).map(index => ({
            question_index: parseInt(index),
            answer: answers[index]
        }));
        
        // Submit to backend
        const response = await fetch(`${API_BASE_URL}/exams/submit/${currentAttempt.submission_id}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ answers: formattedAnswers })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to submit exam");
        }
        
        const result = await response.json();
        
        // Clear timer
        if (examTimer) {
            clearInterval(examTimer);
        }
        
        // Show result
        alert(`✅ Exam submitted successfully!\n\nScore: ${result.score}/${result.total_marks} (${result.percentage}%)\nCheating warnings: ${result.cheating_warnings || 0}`);
        
        // Redirect to student dashboard
        window.location.href = "student-dashboard.html";
        
    } catch (error) {
        console.error("❌ Error submitting exam:", error);
        alert("Failed to submit exam: " + error.message);
        hideLoading();
    }
}

// ================= UI HELPERS =====================
function showLoading(message) {
    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingMessage = document.getElementById("loadingMessage");
    
    if (loadingMessage) loadingMessage.textContent = message || "Loading...";
    if (loadingOverlay) loadingOverlay.style.display = "flex";
}

function hideLoading() {
    const loadingOverlay = document.getElementById("loadingOverlay");
    if (loadingOverlay) loadingOverlay.style.display = "none";
}