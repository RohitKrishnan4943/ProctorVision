/**
 * exam.js – Exam Interface with AI Detection
 * FIXED: Better error handling and debugging
 */

import AIDetectionEngine from './ai-detection.js';
import { DETECTION_CONFIG } from './detection-config.js';

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
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser || currentUser.role !== 'student') {
  console.warn('❌ No student user found, redirecting to login');
  window.location.href = 'index.html';
}

// ===================== DOM READY =====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎓 Exam interface loading...');

  const examCode = new URLSearchParams(window.location.search).get('code');
  console.log("📋 Exam code from URL:", examCode);

  if (!examCode) {
    alert('❌ Invalid exam link - no exam code provided');
    window.location.href = 'student-dashboard.html';
    return;
  }

  // ✅ LOAD EXAM FROM LOCALSTORAGE ONLY
  loadExamFromLocalStorage(examCode);
});

// ===================== LOAD EXAM FROM LOCALSTORAGE =====================
function loadExamFromLocalStorage(examCode) {
  try {
    showLoading('Loading exam...');
    
    const cleanExamCode = examCode.trim().toUpperCase();
    console.log(`🔍 Searching for exam with code: "${cleanExamCode}"`);

    // Get all exams from localStorage
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    console.log(`📊 Found ${exams.length} exams in localStorage`);
    
    if (exams.length === 0) {
      console.warn('⚠️ No exams found in localStorage at all!');
      console.log('LocalStorage contents:', Object.keys(localStorage));
    } else {
      console.log('Exam codes in storage:', exams.map(e => e.examCode));
    }

    // Find exam by code (case-insensitive match)
    const exam = exams.find(e => {
      if (!e.examCode) {
        console.warn('Found exam without examCode:', e);
        return false;
      }
      return e.examCode.toUpperCase() === cleanExamCode;
    });

    if (!exam) {
      console.error(`❌ Exam not found. Searched for: "${cleanExamCode}"`);
      console.error('Available exams:', exams.map(e => ({ 
        title: e.title, 
        examCode: e.examCode,
        id: e.id 
      })));
      throw new Error(`Exam not found. Please check the exam code: ${cleanExamCode}`);
    }

    // Check if exam is active
    if (exam.isActive === false) {
      console.warn(`⚠️ Exam "${exam.title}" is inactive`);
      throw new Error('This exam is no longer active. Please contact your teacher.');
    }

    // ✅ Set current exam
    currentExam = exam;
    console.log('✅ Found exam:', {
      title: currentExam.title,
      code: currentExam.examCode,
      questions: currentExam.questions?.length || 0,
      duration: currentExam.duration
    });

    // Update UI with exam details
    document.getElementById('examTitle').textContent = currentExam.title;
    document.getElementById('examDescription').textContent = 
      currentExam.description || 'No description provided';
    document.getElementById('studentName').textContent = 
      currentUser?.name || 'Student';

    // ✅ Enable start button
    const startBtn = document.getElementById('startExamBtn');
    if (startBtn) {
      startBtn.disabled = false;
    }
    
    hideLoading();
    console.log('✅ Exam loaded successfully from localStorage');

  } catch (error) {
    console.error('❌ Error loading exam:', error);
    
    // Better error message
    let errorMessage = error.message;
    if (errorMessage.includes('not found')) {
      errorMessage = 'Exam not found. Please check the exam code and ensure your teacher has created the exam.';
    }
    
    alert(`❌ ${errorMessage}\n\nDebug info: Check console for details.`);
    
    // Redirect back to student dashboard
    setTimeout(() => {
      window.location.href = 'student-dashboard.html';
    }, 3000);
  }
}

// ===================== START EXAM =====================
window.startExam = async function () {
  try {
    // Validate exam exists
    if (!currentExam) {
      alert('Exam not loaded properly. Please try again.');
      return;
    }

    showLoading('Starting exam...');

    // Create local attempt (no backend)
    currentAttempt = {
      id: 'ATTEMPT_' + Date.now(),
      examId: currentExam.id,
      examCode: currentExam.examCode,
      studentId: currentUser?.id || 'student',
      studentName: currentUser?.name || 'Student',
      startedAt: new Date().toISOString(),
      status: 'started'
    };

    // ✅ SHOW EXAM UI
    hideLoading();
    initializeExam();
    startTimer();

    // Try fullscreen
    enterFullscreen();

    // ✅ Start AI monitoring (non-blocking)
    startAIMonitoringSafely();

    console.log('✅ Exam started successfully');

  } catch (error) {
    console.error('❌ Error starting exam:', error);
    alert('Failed to start exam: ' + error.message);
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

// ===================== AI MONITORING =====================
function startAIMonitoringSafely() {
  // Only start AI if exam exists
  if (!currentExam) {
    console.warn('⚠️ Cannot start AI monitoring: No exam loaded');
    updateAIStatus(false);
    return;
  }

  console.log('🤖 Initializing AI (non-blocking)');

  const timeout = setTimeout(() => {
    console.warn('⚠️ AI init timeout – continuing exam');
    updateAIStatus(false);
  }, 6000);

  startAIMonitoring()
    .then(() => clearTimeout(timeout))
    .catch(error => {
      console.error('AI failed:', error);
      clearTimeout(timeout);
      updateAIStatus(false);
    });
}

async function startAIMonitoring() {
  aiEngine = new AIDetectionEngine(
    currentAttempt.id,
    window.API_BASE_URL || 'http://localhost:8000/api',
    token,
    DETECTION_CONFIG
  );

  aiEngine.onViolation = handleViolationDetected;
  aiEngine.onAutoSubmit = autoSubmitExam;

  await aiEngine.initialize('videoElement');
  aiEngine.start();

  updateAIStatus(true);
  console.log('✅ AI monitoring active');
}

function updateAIStatus(active) {
  const cameraStatus = document.getElementById('cameraStatus');
  const faceStatus = document.getElementById('faceStatus');
  const audioStatus = document.getElementById('audioStatus');
  
  if (cameraStatus) cameraStatus.textContent = active ? 'AI Active' : 'AI Delayed';
  if (faceStatus) faceStatus.innerHTML = active ? '✓ Monitoring' : '⚠️ Pending';
  if (audioStatus) audioStatus.innerHTML = active ? '✓ Monitoring' : '⚠️ Pending';
}

// ===================== EXAM INITIALIZATION =====================
function initializeExam() {
  // Initialize answers
  currentExam.questions.forEach((_, i) => {
    answers[i] = null;
  });
  
  // Set timer
  timeRemaining = (currentExam.duration || 60) * 60;
  
  // Show exam UI
  const examContainer = document.getElementById('examContainer');
  const instructions = document.getElementById('examInstructions');
  
  if (examContainer) examContainer.style.display = 'block';
  if (instructions) instructions.style.display = 'none';
  
  // Load first question
  loadQuestion(0);
  buildQuestionGrid();
}

// ===================== TIMER =====================
function startTimer() {
  examTimer = setInterval(() => {
    timeRemaining--;

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    const timerElement = document.getElementById('examTimer');
    if (timerElement) {
      timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    if (timeRemaining <= 0) {
      clearInterval(examTimer);
      autoSubmitExam('Time expired');
    }
  }, 1000);
}

// ===================== QUESTIONS =====================
function loadQuestion(index) {
  const question = currentExam.questions[index];
  if (!question) return;
  
  currentQuestion = index;

  const container = document.getElementById('questionsContainer');
  if (!container) return;
  
  container.innerHTML = `
    <div class="question-container">
      <div class="question-text">${question.question || 'Question'}</div>
      <div class="options-container" id="optionsContainer"></div>
    </div>
  `;

  const optionsContainer = document.getElementById('optionsContainer');
  if (!optionsContainer) return;
  
  // Create options
  (question.options || []).forEach((option, optionIndex) => {
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option';
    if (answers[index] === optionIndex) optionDiv.classList.add('selected');

    optionDiv.innerHTML = `
      <input type="radio" name="q${index}">
      <span class="option-label">${option}</span>
    `;

    optionDiv.onclick = () => {
      answers[index] = optionIndex;
      loadQuestion(index);
      updateQuestionGrid();
    };

    optionsContainer.appendChild(optionDiv);
  });

  updateQuestionGrid();
}

// ===================== QUESTION GRID =====================
function buildQuestionGrid() {
  const grid = document.getElementById('questionGrid');
  if (!grid || !currentExam.questions) return;
  
  grid.innerHTML = '';

  currentExam.questions.forEach((_, index) => {
    const questionNumber = document.createElement('div');
    questionNumber.className = 'question-number';
    questionNumber.textContent = index + 1;
    questionNumber.onclick = () => loadQuestion(index);
    grid.appendChild(questionNumber);
  });

  updateQuestionGrid();
}

function updateQuestionGrid() {
  document.querySelectorAll('.question-number').forEach((element, index) => {
    element.classList.toggle('active', index === currentQuestion);
    element.classList.toggle('answered', answers[index] !== null);
  });
}

// ===================== VIOLATIONS =====================
function handleViolationDetected(violation) {
  console.warn('⚠️ Violation detected:', violation);
  
  // Show warning to student
  const warningDiv = document.getElementById('violationWarning');
  if (warningDiv) {
    warningDiv.textContent = `Warning: ${violation.type || 'Proctoring violation'} detected`;
    warningDiv.style.display = 'block';
    
    setTimeout(() => {
      warningDiv.style.display = 'none';
    }, 5000);
  }
}

// ===================== SUBMIT EXAM =====================
async function autoSubmitExam(reason) {
  console.log(`📤 Auto-submitting exam: ${reason}`);
  
  // Calculate score
  let score = 0;
  let totalMarks = 0;
  
  if (currentExam && currentExam.questions) {
    currentExam.questions.forEach((question, index) => {
      const questionMarks = question.marks || 1;
      totalMarks += questionMarks;
      
      if (answers[index] === question.correctAnswer) {
        score += questionMarks;
      }
    });
  }
  
  // Save submission to localStorage
  const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
  
  const submission = {
    id: 'SUB_' + Date.now(),
    examId: currentExam?.id,
    examCode: currentExam?.examCode,
    examTitle: currentExam?.title,
    studentId: currentUser?.id,
    studentName: currentUser?.name,
    answers: { ...answers },
    score: score,
    totalMarks: totalMarks,
    percentage: totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0,
    status: 'completed',
    submittedAt: new Date().toISOString(),
    submittedReason: reason,
    cheatingCount: aiEngine?.violationCount || 0
  };
  
  submissions.push(submission);
  localStorage.setItem('submissions', JSON.stringify(submissions));
  
  console.log('✅ Submission saved to localStorage');
  
  // Stop AI if running
  if (aiEngine) {
    aiEngine.stop();
  }
  
  // Clear timer
  if (examTimer) {
    clearInterval(examTimer);
  }
  
  // Show submission message
  alert(`Exam submitted: ${reason}\nScore: ${score}/${totalMarks}`);
  
  // Redirect to results
  setTimeout(() => {
    window.location.href = 'student-dashboard.html';
  }, 3000);
}

// ===================== UI HELPERS =====================
function showLoading(message) {
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingMessage = document.getElementById('loadingMessage');
  
  if (loadingMessage) loadingMessage.textContent = message || 'Loading...';
  if (loadingOverlay) loadingOverlay.style.display = 'flex';
}

function hideLoading() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) loadingOverlay.style.display = 'none';
}

console.log('✅ exam.js loaded (FIXED PERSISTENCE)');