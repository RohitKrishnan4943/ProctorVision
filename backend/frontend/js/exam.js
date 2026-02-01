console.log("🔥 NEW exam.js LOADED 2.0");
console.log("Working fine");
const token = localStorage.getItem("token");
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!token || !currentUser || currentUser.role !== "student") {
    window.location.href = "index.html";
}

const API_BASE_URL = "/api";

let currentExam = null;
let currentAttempt = null;
let currentQuestion = 0;

let answers = {};
let timeRemaining = 0;
let examTimer = null;


// ================= CAMERA + MIC =================
async function requestCameraAndMic() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        const video = document.getElementById("videoElement");
        if (video) {
            video.srcObject = stream;
            video.play();
        }

        console.log("✅ Camera & Mic enabled");
    } catch (err) {
        alert("Camera & Microphone permission required to take exam.");
        throw err;
    }
}


// ================= DOM READY =================
document.addEventListener("DOMContentLoaded", async () => {
    const examCode = new URLSearchParams(window.location.search).get("code");

    if (!examCode) {
        window.location.href = "student-dashboard.html";
        return;
    }

    await loadExamFromBackend(examCode.toUpperCase());
});


// ================= LOAD EXAM =================
async function loadExamFromBackend(examCode) {
    const response = await fetch(`${API_BASE_URL}/exams/${examCode}`, {
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        alert("Exam not found");
        return;
    }

    currentExam = await response.json();

    // safe DOM updates
    const examTitleEl = document.getElementById("examTitle");
    const examDescriptionEl = document.getElementById("examDescription");
    const studentNameEl = document.getElementById("studentName");
    const examDurationEl = document.getElementById("examDuration");
    const loadingOverlay = document.getElementById("loadingOverlay");

    if (examTitleEl) examTitleEl.textContent = currentExam.title;
    if (examDescriptionEl) examDescriptionEl.textContent = currentExam.description || "";
    if (studentNameEl) studentNameEl.textContent = currentUser.name;
    if (examDurationEl) examDurationEl.textContent = `${currentExam.duration} minutes`;
    if (loadingOverlay) loadingOverlay.style.display = "none";

    const startBtn = document.getElementById("startExamBtn");
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = "Start Exam";
    }
}


// ================= START EXAM =================
window.startExam = async function () {
    if (!currentExam) {
        alert("Exam not loaded properly. Please refresh the page.");
        return;
    }

    try {
        await requestCameraAndMic();

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

        currentAttempt = await response.json();
        currentExam.questions.forEach((_, i) => answers[i] = null);

        initializeExamUI();
        startTimer();
        
    } catch (error) {
        console.error("Error starting exam:", error);
        alert("Failed to start exam: " + error.message);
    }
};


// ================= UI INIT =================
function initializeExamUI() {
    const instructions = document.getElementById("examInstructions");
    const examContainer = document.getElementById("examContainer");

    if (instructions) instructions.style.setProperty("display", "none");
    if (examContainer) examContainer.style.setProperty("display", "block");

    loadQuestion(0);
    buildQuestionGrid();
}


// ================= TIMER =================
function startTimer() {
    timeRemaining = currentExam.duration * 60;

    examTimer = setInterval(() => {
        timeRemaining--;

        const m = Math.floor(timeRemaining / 60);
        const s = timeRemaining % 60;
        const timerEl = document.getElementById("examTimer");

        if (timerEl) {
            timerEl.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
            
            // Add warning classes based on time
            timerEl.classList.remove("warning", "danger");
            if (timeRemaining < 300) { // 5 minutes
                timerEl.classList.add("warning");
            }
            if (timeRemaining < 60) { // 1 minute
                timerEl.classList.add("danger");
            }
        }

        if (timeRemaining <= 0) {
            clearInterval(examTimer);
            submitExam();
        }
    }, 1000);
}


// ================= QUESTIONS =================
function loadQuestion(index) {
    if (!currentExam || !currentExam.questions[index]) return;

    currentQuestion = index;
    const q = currentExam.questions[index];

    const container = document.getElementById("questionsContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="question-container">
            <div class="question-text">${q.question_text}</div>
            <div class="options-container" id="optionsContainer"></div>
        </div>
    `;

    const optionsContainer = document.getElementById("optionsContainer");
    const questionNumberEl = document.getElementById("currentQuestionNumber");
    
    if (questionNumberEl) {
        questionNumberEl.textContent = `Question ${index + 1} of ${currentExam.questions.length}`;
    }

    if (q.type === "mcq" && q.options) {
        q.options.forEach((opt, i) => {
            const optionDiv = document.createElement("div");
            optionDiv.className = "option";
            if (answers[index] === i) {
                optionDiv.classList.add("selected");
            }

            optionDiv.innerHTML = `
                <input type="radio" name="q${index}" ${answers[index] === i ? 'checked' : ''}>
                <span class="option-label">${opt}</span>
            `;

            optionDiv.onclick = () => {
                answers[index] = i;
                loadQuestion(index);
                updateQuestionGrid();
            };

            if (optionsContainer) {
                optionsContainer.appendChild(optionDiv);
            }
        });
    } else {
        // Short answer question
        const textarea = document.createElement("textarea");
        textarea.className = "short-answer-input";
        textarea.placeholder = "Type your answer here...";
        textarea.value = answers[index] || "";
        textarea.oninput = (e) => {
            answers[index] = e.target.value;
            updateQuestionGrid();
        };
        if (optionsContainer) {
            optionsContainer.appendChild(textarea);
        }
    }

    updateQuestionGrid();
    updateNavigationButtons();
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    
    if (prevBtn) prevBtn.disabled = currentQuestion === 0;
    if (nextBtn) nextBtn.disabled = currentQuestion === currentExam.questions.length - 1;
    
    // Add event listeners
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentQuestion > 0) {
                loadQuestion(currentQuestion - 1);
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentExam && currentQuestion < currentExam.questions.length - 1) {
                loadQuestion(currentQuestion + 1);
            }
        };
    }
}


function buildQuestionGrid() {
    const grid = document.getElementById("questionGrid");
    if (!grid) return;

    grid.innerHTML = "";

    currentExam.questions.forEach((_, i) => {
        const b = document.createElement("div");
        b.className = "question-number";
        b.textContent = i + 1;
        b.onclick = () => loadQuestion(i);
        grid.appendChild(b);
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


// ================= SUBMIT =================
window.submitExam = async function () {
    const submitBtn = document.getElementById("submitBtn");
    const submitConfirm = document.getElementById("submitConfirm");
    const submitOverlay = document.getElementById("submitOverlay");
    
    if (submitConfirm && submitOverlay) {
        submitConfirm.classList.add("show");
        submitOverlay.classList.add("show");
        return;
    }
    
    await confirmSubmit();
};

async function confirmSubmit() {
    const formatted = Object.keys(answers).map(i => ({
        question_index: +i,
        answer: answers[i]
    }));

    try {
        const response = await fetch(`${API_BASE_URL}/exams/submit/${currentAttempt.submission_id}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ answers: formatted })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to submit exam");
        }

        const result = await response.json();
        
        if (examTimer) {
            clearInterval(examTimer);
        }

        alert(`✅ Exam submitted successfully!\n\nScore: ${result.score}/${result.total_marks} (${result.percentage}%)\nCheating warnings: ${result.cheating_warnings || 0}`);
        window.location.href = "student-dashboard.html";

    } catch (error) {
        console.error("❌ Error submitting exam:", error);
        alert("Failed to submit exam: " + error.message);
    }
}

// Helper functions for modal
function closeSubmitConfirm() {
    const submitConfirm = document.getElementById("submitConfirm");
    const submitOverlay = document.getElementById("submitOverlay");
    
    if (submitConfirm) submitConfirm.classList.remove("show");
    if (submitOverlay) submitOverlay.classList.remove("show");
}

// Initialize submit button
document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) {
        submitBtn.onclick = () => window.submitExam();
    }
});