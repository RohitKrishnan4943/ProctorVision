/**
 * exam.js - NON-BLOCKING Exam Interface with AI Detection
 * Location: frontend/js/exam.js
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
let isMonitoring = false;
let cheatingCount = 0;
let warnings = [];

// ===================== AUTH CHECK =====================
if (!token) {
    window.location.href = 'index.html';
}

// ===================== DOM READY =====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎓 Exam interface loading...');

    const examCode = new URLSearchParams(window.location.search).get('code');
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
        document.getElementById('examDuration').textContent = `${currentExam.duration} minutes`;
        document.getElementById('examQuestions').textContent = currentExam.questions.length;

        hideLoading();
        showSection('examIntro');

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

        await enterFullscreen();

        // ✅ START EXAM IMMEDIATELY
        initializeExam();
        hideLoading();
        showSection('examInterface');
        startTimer();

        // 🚀 AI STARTS IN PARALLEL (NON-BLOCKING)
        startAIMonitoringSafely();

        console.log('✅ Exam started');

    } catch (err) {
        console.error(err);
        alert(err.message);
        hideLoading();
    }
};

// ===================== FULLSCREEN =====================
async function enterFullscreen() {
    try {
        const el = document.documentElement;
        if (el.requestFullscreen) await el.requestFullscreen();
    } catch {
        console.warn('Fullscreen not allowed');
    }
}

// ===================== AI MONITORING (SAFE) =====================
function startAIMonitoringSafely() {
    const timeout = setTimeout(() => {
        console.warn('⚠️ AI init timeout – continuing exam');
        updateAIStatus(false);
    }, 6000);

    startAIMonitoring()
        .then(() => clearTimeout(timeout))
        .catch(() => {
            clearTimeout(timeout);
            updateAIStatus(false);
        });
}

async function startAIMonitoring() {
    console.log('🚀 Starting AI monitoring (non-blocking)...');

    aiEngine = new AIDetectionEngine(
        currentAttempt.id,
        API_BASE_URL,
        token
    );

    aiEngine.onViolation = handleViolationDetected;
    aiEngine.onWarningUpdate = updateWarningDisplay;
    aiEngine.onAutoSubmit = autoSubmitExam;

    await aiEngine.initialize('videoElement');
    aiEngine.start();

    updateAIStatus(true);
    isMonitoring = true;

    console.log('✅ AI monitoring active');
}

function updateAIStatus(active) {
    document.getElementById('cameraStatus').textContent = active ? 'AI Active' : 'AI Delayed';
    document.getElementById('faceStatus').innerHTML =
        active ? '✓ Monitoring' : '⚠️ Pending';
    document.getElementById('audioStatus').innerHTML =
        active ? '✓ Monitoring' : '⚠️ Pending';
}

// ===================== EXAM INIT =====================
function initializeExam() {
    currentExam.questions.forEach((_, i) => answers[i] = null);
    timeRemaining = currentExam.duration * 60;
    loadQuestion(0);
    updateQuestionNavigation();
}

// ===================== TIMER =====================
function startTimer() {
    examTimer = setInterval(() => {
        timeRemaining--;
        const m = Math.floor(timeRemaining / 60);
        const s = timeRemaining % 60;
        document.getElementById('timerDisplay').textContent =
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

    document.getElementById('currentQuestionNumber').textContent = i + 1;
    document.getElementById('questionText').textContent = q.question_text;

    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';

    q.options.forEach((opt, idx) => {
        const div = document.createElement('div');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.checked = answers[i] === idx;
        radio.onchange = () => answers[i] = idx;

        div.append(radio, document.createTextNode(opt));
        container.appendChild(div);
    });
}

function updateQuestionNavigation() {}

// ===================== VIOLATIONS =====================
function handleViolationDetected(v) {
    warnings.push(v);
    cheatingCount++;
}

// ===================== SUBMIT =====================
async function autoSubmitExam(reason) {
    alert(`Exam auto-submitted: ${reason}`);
}

// ===================== UI HELPERS =====================
function showSection(id) {
    document.querySelectorAll('.exam-section').forEach(s => s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
}

function showLoading(msg) {
    document.getElementById('loadingMessage').textContent = msg;
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

console.log('✅ exam.js loaded (non-blocking AI)');
