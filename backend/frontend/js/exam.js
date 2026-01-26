/**
 * exam.js – NON-BLOCKING Exam Interface with AI Detection
 * FIXED: detection-config.js is now ACTUALLY USED
 */

import AIDetectionEngine from './ai-detection.js';
import { DETECTION_CONFIG } from './detection-config.js';

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000/api';

// ===================== GLOBAL STATE =====================
let currentExam = null;
let currentAttempt = null;
let currentQuestion = 0;
let answers = {};
let timeRemaining = 0;
let examTimer = null;
let token = localStorage.getItem('token');
let aiEngine = null;

// ===================== AUTH CHECK =====================
if (!token) {
  window.location.href = 'index.html';
}

// ===================== DOM READY =====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎓 Exam interface loading...');
  console.log('🧠 Detection config loaded:', DETECTION_CONFIG);

  const examCode = new URLSearchParams(window.location.search).get('code');
  console.log("Exam code from URL:", examCode);

  if (!examCode) {
    alert('Invalid exam link');
    window.location.href = 'dashboard.html';
    return;
  }

  await loadExam(examCode);
});

// ===================== LOAD EXAM =====================
async function loadExam(examCode) {
  try {
    showLoading('Loading exam...');

    const res = await fetch(`${API_BASE_URL}/exams/code/${examCode}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Exam not found or expired');

    currentExam = await res.json();

    document.getElementById('examTitle').textContent = currentExam.title;
    document.getElementById('examDescription').textContent =
      currentExam.description || '';
    document.getElementById('studentName').textContent =
      localStorage.getItem('user_name') || 'Student';

    hideLoading();
  } catch (err) {
    console.error(err);
    alert(err.message);
    window.location.href = 'dashboard.html';
  }
}

// ===================== START EXAM =====================
window.startExam = async function () {
  try {
    showLoading('Starting exam...');

    const res = await fetch(`${API_BASE_URL}/submissions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ exam_id: currentExam.id })
    });

    if (!res.ok) throw new Error('Failed to start exam');

    currentAttempt = await res.json();

    // ✅ SHOW EXAM IMMEDIATELY
    hideLoading();
    initializeExam();
    startTimer();

    // Best-effort fullscreen
    enterFullscreen();

    // 🤖 AI STARTS IN BACKGROUND (NON-BLOCKING)
    startAIMonitoringSafely();

    console.log('✅ Exam started');
  } catch (err) {
    console.error(err);
    alert(err.message);
    hideLoading();
  }
};

// ===================== FULLSCREEN =====================
function enterFullscreen() {
  try {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  } catch {
    console.warn('Fullscreen denied');
  }
}

// ===================== AI MONITORING (FIXED) =====================
function startAIMonitoringSafely() {
  console.log('🤖 Initializing AI (non-blocking)');

  const timeout = setTimeout(() => {
    console.warn('⚠️ AI init timeout – continuing exam');
    updateAIStatus(false);
  }, 6000);

  startAIMonitoring()
    .then(() => clearTimeout(timeout))
    .catch(err => {
      console.error('AI failed:', err);
      clearTimeout(timeout);
      updateAIStatus(false);
    });
}

async function startAIMonitoring() {
  aiEngine = new AIDetectionEngine(
    currentAttempt.id,
    API_BASE_URL,
    token,
    DETECTION_CONFIG // ✅ THIS WAS THE MISSING PIECE
  );

  aiEngine.onViolation = handleViolationDetected;
  aiEngine.onAutoSubmit = autoSubmitExam;

  await aiEngine.initialize('videoElement');
  aiEngine.start();

  updateAIStatus(true);
  console.log('✅ AI monitoring active');
}

function updateAIStatus(active) {
  document.getElementById('cameraStatus').textContent =
    active ? 'AI Active' : 'AI Delayed';
  document.getElementById('faceStatus').innerHTML =
    active ? '✓ Monitoring' : '⚠️ Pending';
  document.getElementById('audioStatus').innerHTML =
    active ? '✓ Monitoring' : '⚠️ Pending';
}

// ===================== EXAM INIT =====================
function initializeExam() {
  currentExam.questions.forEach((_, i) => (answers[i] = null));
  timeRemaining = currentExam.duration * 60;
  loadQuestion(0);
  buildQuestionGrid();
}

// ===================== TIMER =====================
function startTimer() {
  examTimer = setInterval(() => {
    timeRemaining--;

    const m = Math.floor(timeRemaining / 60);
    const s = timeRemaining % 60;

    document.getElementById('examTimer').textContent =
      `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    if (timeRemaining <= 0) {
      clearInterval(examTimer);
      autoSubmitExam('Time expired');
    }
  }, 1000);
}

// ===================== QUESTIONS =====================
function loadQuestion(i) {
  const q = currentExam.questions[i];
  currentQuestion = i;

  const container = document.getElementById('questionsContainer');
  container.innerHTML = `
    <div class="question-container">
      <div class="question-text">${q.question_text}</div>
      <div class="options-container" id="optionsContainer"></div>
    </div>
  `;

  const options = document.getElementById('optionsContainer');
  q.options.forEach((opt, idx) => {
    const div = document.createElement('div');
    div.className = 'option';
    if (answers[i] === idx) div.classList.add('selected');

    div.innerHTML = `
      <input type="radio" name="q${i}">
      <span class="option-label">${opt}</span>
    `;

    div.onclick = () => {
      answers[i] = idx;
      loadQuestion(i);
      updateQuestionGrid();
    };

    options.appendChild(div);
  });

  updateQuestionGrid();
}

// ===================== QUESTION GRID =====================
function buildQuestionGrid() {
  const grid = document.getElementById('questionGrid');
  grid.innerHTML = '';

  currentExam.questions.forEach((_, i) => {
    const q = document.createElement('div');
    q.className = 'question-number';
    q.textContent = i + 1;
    q.onclick = () => loadQuestion(i);
    grid.appendChild(q);
  });

  updateQuestionGrid();
}

function updateQuestionGrid() {
  document.querySelectorAll('.question-number').forEach((el, i) => {
    el.classList.toggle('active', i === currentQuestion);
    el.classList.toggle('answered', answers[i] !== null);
  });
}

// ===================== VIOLATIONS =====================
function handleViolationDetected(v) {
  console.warn('⚠️ Violation:', v);
}

// ===================== SUBMIT =====================
async function autoSubmitExam(reason) {
  alert(`Exam auto-submitted: ${reason}`);
  console.log('Submitting answers:', answers);
}

// ===================== UI HELPERS =====================
function showLoading(msg) {
  document.getElementById('loadingMessage').textContent = msg;
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

console.log('✅ exam.js loaded (CONFIG FIXED)');
