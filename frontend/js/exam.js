// Exam state variables
// exam.js - Add at the top
const API_BASE_URL = window.API_BASE_URL || "http://localhost:8000/api";
const token = localStorage.getItem('token');
let examData = null;
let currentUser = null;
let currentAttempt = null;
let currentQuestion = 0;
let userAnswers = {};
let markedQuestions = new Set();
let examTimer = null;
let timeRemaining = 0;
let cheatingCount = 0;
let warnings = [];

// AI Monitoring variables
let videoStream = null;
let audioStream = null;
let mediaRecorder = null;
let audioChunks = [];
let isMonitoring = false;
let cheatingChecks = [];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    await checkExamAccess();
    
    // Initialize exam
    await initializeExam();
    
    // Start AI monitoring
    await startAIMonitoring();
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loadingOverlay').classList.remove('show');
    }, 1000);
});

// Check exam access
async function checkExamAccess() {
    // Get current user
    currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Please login first!');
        window.location.href = 'index.html';
        return;
    }
    
    // Get exam code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const examCode = urlParams.get('code');
    
    if (!examCode) {
        alert('Invalid exam link!');
        window.location.href = 'student-dashboard.html';
        return;
    }
    
    // Find exam by code
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    examData = exams.find(exam => exam.examCode === examCode);
    
    if (!examData) {
        alert('Exam not found!');
        window.location.href = 'student-dashboard.html';
        return;
    }
    
    if (!examData.isActive) {
        alert('This exam is no longer active.');
        window.location.href = 'student-dashboard.html';
        return;
    }
    
    // Check access restrictions
    if (examData.accessType === 'specific') {
        if (!examData.allowedStudents.includes(currentUser.id)) {
            alert('You are not authorized to take this exam.');
            window.location.href = 'student-dashboard.html';
            return;
        }
    }
    
    // Check for existing submissions
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const previousSubmission = submissions.find(sub => 
        sub.examId === examData.id && sub.studentId === currentUser.id && sub.status === 'completed'
    );
    
    if (previousSubmission) {
        alert('You have already completed this exam.');
        window.location.href = 'student-dashboard.html';
        return;
    }
    
    // Get or create attempt
    const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
    currentAttempt = attempts.find(att => 
        att.examId === examData.id && 
        att.studentId === currentUser.id && 
        att.status === 'in_progress'
    );
    
    if (!currentAttempt) {
        // Create new attempt
        currentAttempt = {
            id: 'ATTEMPT' + Date.now(),
            examId: examData.id,
            studentId: currentUser.id,
            studentName: currentUser.name,
            startedAt: new Date().toISOString(),
            status: 'in_progress',
            answers: [],
            cheatingCount: 0,
            warnings: [],
            submittedAt: null,
            score: null,
            totalMarks: null
        };
        
        attempts.push(currentAttempt);
        localStorage.setItem('examAttempts', JSON.stringify(attempts));
        
        // Update exam's studentsWithAccess
        const examIndex = exams.findIndex(e => e.id === examData.id);
        if (examIndex !== -1) {
            if (!exams[examIndex].studentsWithAccess.includes(currentUser.id)) {
                exams[examIndex].studentsWithAccess.push(currentUser.id);
            }
            exams[examIndex].totalAttempts = (exams[examIndex].totalAttempts || 0) + 1;
            localStorage.setItem('exams', JSON.stringify(exams));
        }
    }
    
    // Load saved answers if any
    if (currentAttempt.answers && currentAttempt.answers.length > 0) {
        currentAttempt.answers.forEach(answer => {
            userAnswers[answer.questionId] = answer.answer;
        });
    }
    
    // Load cheating count
    cheatingCount = currentAttempt.cheatingCount || 0;
    warnings = currentAttempt.warnings || [];
    
    // Update UI
    document.getElementById('studentName').textContent = currentUser.name;
    document.getElementById('warningCount').textContent = cheatingCount;
}

// Initialize exam
async function initializeExam() {
    // Set exam info
    document.getElementById('examTitle').textContent = examData.title;
    document.getElementById('examDescription').textContent = examData.description || '';
    
    // Initialize timer
    timeRemaining = examData.duration * 60; // Convert to seconds
    updateTimerDisplay();
    startTimer();
    
    // Generate question navigation
    generateQuestionNavigation();
    
    // Load first question
    loadQuestion(currentQuestion);
    
    // Set up event listeners
    setupEventListeners();
    
    // Start fullscreen detection
    startFullscreenDetection();
}

// Generate question navigation
function generateQuestionNavigation() {
    const questionGrid = document.getElementById('questionGrid');
    questionGrid.innerHTML = '';
    
    examData.questions.forEach((question, index) => {
        const questionNumber = document.createElement('div');
        questionNumber.className = 'question-number';
        questionNumber.textContent = index + 1;
        questionNumber.dataset.index = index;
        
        // Set initial state
        if (index === 0) {
            questionNumber.classList.add('active');
        }
        
        if (userAnswers[index]) {
            questionNumber.classList.add('answered');
        }
        
        if (markedQuestions.has(index)) {
            questionNumber.classList.add('marked');
        }
        
        questionNumber.addEventListener('click', () => {
            navigateToQuestion(index);
        });
        
        questionGrid.appendChild(questionNumber);
    });
}

// Load question
function loadQuestion(index) {
    if (index < 0 || index >= examData.questions.length) return;
    
    currentQuestion = index;
    const question = examData.questions[index];
    
    // Update navigation
    document.querySelectorAll('.question-number').forEach((qn, i) => {
        qn.classList.remove('active');
        if (i === index) {
            qn.classList.add('active');
        }
    });
    
    // Update buttons
    document.getElementById('prevBtn').disabled = index === 0;
    document.getElementById('nextBtn').disabled = index === examData.questions.length - 1;
    document.getElementById('nextBtn').innerHTML = index === examData.questions.length - 1 ? 
        'Finish <i class="fas fa-flag-checkered"></i>' : 
        'Next <i class="fas fa-arrow-right"></i>';
    
    // Update mark button
    document.getElementById('markBtn').innerHTML = markedQuestions.has(index) ? 
        '<i class="fas fa-flag"></i> Unmark' : 
        '<i class="fas fa-flag"></i> Mark for Review';
    
    // Build question HTML
    const questionsContainer = document.getElementById('questionsContainer');
    
    let questionHTML = `
        <div class="question-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Question ${index + 1} of ${examData.questions.length}</h2>
                <div style="font-weight: 600; color: #4361ee;">${question.marks} mark(s)</div>
            </div>
            
            <div class="question-text">${question.text}</div>
    `;
    
    if (question.type === 'mcq') {
        questionHTML += `<div class="options-container">`;
        
        question.options.forEach((option, optionIndex) => {
            const isSelected = Array.isArray(userAnswers[index]) ? 
                userAnswers[index].includes(optionIndex.toString()) : 
                userAnswers[index] === optionIndex.toString();
            
            questionHTML += `
                <div class="option ${isSelected ? 'selected' : ''}" onclick="selectOption(${optionIndex})">
                    <input type="${question.options.length > 1 ? 'checkbox' : 'radio'}" 
                           ${question.options.length > 1 ? 'name="mcq[]"' : `name="mcq${index}"`}
                           ${isSelected ? 'checked' : ''}
                           onclick="event.stopPropagation(); selectOption(${optionIndex})">
                    <div class="option-label">${option.text}</div>
                </div>
            `;
        });
        
        questionHTML += `</div>`;
    } else if (question.type === 'short') {
        const answer = userAnswers[index] || '';
        questionHTML += `
            <textarea class="short-answer-input" 
                      placeholder="Type your answer here..." 
                      oninput="saveShortAnswer(this.value)">${answer}</textarea>
            ${question.expectedAnswer ? 
                `<small style="display: block; margin-top: 10px; color: #666;">
                    <i class="fas fa-info-circle"></i> 
                    Expected keywords: ${question.expectedAnswer}
                </small>` : ''
            }
        `;
    }
    
    questionHTML += `</div>`;
    questionsContainer.innerHTML = questionHTML;
}

// Select option for MCQ
function selectOption(optionIndex) {
    const question = examData.questions[currentQuestion];
    
    if (question.type === 'mcq') {
        if (question.options.length > 1) {
            // Multiple selection
            if (!userAnswers[currentQuestion]) {
                userAnswers[currentQuestion] = [];
            }
            
            const index = userAnswers[currentQuestion].indexOf(optionIndex.toString());
            if (index === -1) {
                userAnswers[currentQuestion].push(optionIndex.toString());
            } else {
                userAnswers[currentQuestion].splice(index, 1);
            }
        } else {
            // Single selection
            userAnswers[currentQuestion] = optionIndex.toString();
        }
        
        // Update UI
        loadQuestion(currentQuestion);
        updateQuestionNavigation();
        saveProgress();
    }
}

// Save short answer
function saveShortAnswer(answer) {
    userAnswers[currentQuestion] = answer;
    updateQuestionNavigation();
    saveProgress();
}

// Update question navigation
function updateQuestionNavigation() {
    const questionNumber = document.querySelector(`.question-number[data-index="${currentQuestion}"]`);
    if (questionNumber) {
        questionNumber.classList.remove('answered');
        
        if (userAnswers[currentQuestion]) {
            if (Array.isArray(userAnswers[currentQuestion])) {
                if (userAnswers[currentQuestion].length > 0) {
                    questionNumber.classList.add('answered');
                }
            } else if (userAnswers[currentQuestion].toString().trim() !== '') {
                questionNumber.classList.add('answered');
            }
        }
    }
}

// Navigate to question
function navigateToQuestion(index) {
    saveProgress();
    loadQuestion(index);
}

// Setup event listeners
function setupEventListeners() {
    // Previous button
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentQuestion > 0) {
            navigateToQuestion(currentQuestion - 1);
        }
    });
    
    // Next button
    document.getElementById('nextBtn').addEventListener('click', () => {
        if (currentQuestion < examData.questions.length - 1) {
            navigateToQuestion(currentQuestion + 1);
        } else {
            showSubmitConfirm();
        }
    });
    
    // Mark button
    document.getElementById('markBtn').addEventListener('click', () => {
        if (markedQuestions.has(currentQuestion)) {
            markedQuestions.delete(currentQuestion);
        } else {
            markedQuestions.add(currentQuestion);
        }
        
        // Update button and navigation
        document.getElementById('markBtn').innerHTML = markedQuestions.has(currentQuestion) ? 
            '<i class="fas fa-flag"></i> Unmark' : 
            '<i class="fas fa-flag"></i> Mark for Review';
        
        const questionNumber = document.querySelector(`.question-number[data-index="${currentQuestion}"]`);
        if (questionNumber) {
            questionNumber.classList.toggle('marked');
        }
    });
    
    // Submit button
    document.getElementById('submitBtn').addEventListener('click', showSubmitConfirm);
    
    // Prevent right click (to prevent cheating)
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showCheatingWarning('Right-click disabled', 'Context menu is disabled during the exam.');
        return false;
    });
    
    // Prevent keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
            (e.ctrlKey && e.key === 'u')) {
            e.preventDefault();
            showCheatingWarning('Developer tools disabled', 'Developer tools are disabled during the exam.');
            return false;
        }
        
        // Prevent print
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            showCheatingWarning('Printing disabled', 'Printing is disabled during the exam.');
            return false;
        }
    });
}

// Start timer
function startTimer() {
    examTimer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(examTimer);
            autoSubmitExam('Time expired');
        }
        
        // Auto-save every 30 seconds
        if (timeRemaining % 30 === 0) {
            saveProgress();
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timerElement = document.getElementById('examTimer');
    
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update timer color based on remaining time
    timerElement.classList.remove('warning', 'danger');
    
    if (timeRemaining <= 300) { // 5 minutes
        timerElement.classList.add('danger');
    } else if (timeRemaining <= 600) { // 10 minutes
        timerElement.classList.add('warning');
    }
}

// Start AI Monitoring
async function startAIMonitoring() {
    try {
        // Request camera and microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            },
            audio: true
        });
        
        videoStream = stream;
        
        // Display video feed
        const videoElement = document.getElementById('videoElement');
        videoElement.srcObject = stream;
        
        // Start periodic cheating checks (simulated)
        startCheatingChecks();
        
        // Start audio monitoring (simulated)
        startAudioMonitoring();
        
        // Update status
        document.getElementById('cameraStatus').textContent = 'Camera Active';
        document.getElementById('faceStatus').innerHTML = '<span style="color: #28a745;">✓ Active</span>';
        document.getElementById('audioStatus').innerHTML = '<span style="color: #28a745;">✓ Active</span>';
        
        isMonitoring = true;
        
    } catch (error) {
        console.error('Error accessing media devices:', error);
        document.getElementById('loadingMessage').textContent = 'Camera/microphone access required!';
        
        // Show error
        setTimeout(() => {
            alert('Camera and microphone access is required for this exam. Please allow access and refresh the page.');
            document.getElementById('cameraStatus').textContent = 'Access Denied';
            document.getElementById('faceStatus').innerHTML = '<span style="color: #dc3545;">✗ Inactive</span>';
            document.getElementById('audioStatus').innerHTML = '<span style="color: #dc3545;">✗ Inactive</span>';
        }, 2000);
    }
}

// Start cheating checks (simulated AI)
function startCheatingChecks() {
    // Simulate periodic AI checks
    cheatingChecks.push(setInterval(() => {
        // Random cheating detection (in real app, this would use YOLOv8)
        const random = Math.random();
        
        if (random < 0.05) { // 5% chance of detection
            const violations = [
                { type: 'face_not_visible', message: 'Face not detected. Please keep your face visible.' },
                { type: 'looking_away', message: 'Looking away from screen detected.' },
                { type: 'multiple_faces', message: 'Multiple faces detected.' },
                { type: 'phone_detected', message: 'Mobile phone or prohibited object detected.' },
                { type: 'book_detected', message: 'Book or notes detected.' }
            ];
            
            const violation = violations[Math.floor(Math.random() * violations.length)];
            detectCheating(violation.type, violation.message);
        }
    }, 10000)); // Check every 10 seconds
    
    // Also check for tab switching
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            detectCheating('tab_switch', 'Tab switching detected. Please stay on the exam page.');
        }
    });
}

// Start audio monitoring (simulated)
function startAudioMonitoring() {
    // In a real app, this would use WebRTC and VAD
    cheatingChecks.push(setInterval(() => {
        const random = Math.random();
        
        if (random < 0.03) { // 3% chance of audio detection
            const violations = [
                { type: 'talking_detected', message: 'Talking detected. Please maintain silence.' },
                { type: 'background_noise', message: 'Unusual background noise detected.' },
                { type: 'multiple_voices', message: 'Multiple voices detected.' }
            ];
            
            const violation = violations[Math.floor(Math.random() * violations.length)];
            detectCheating(violation.type, violation.message);
        }
    }, 15000)); // Check every 15 seconds
}

// Detect cheating
function detectCheating(type, message) {
    if (!isMonitoring) return;
    
    // Add to warnings
    warnings.push({
        type: type,
        message: message,
        timestamp: new Date().toISOString(),
        question: currentQuestion
    });
    
    cheatingCount++;
    
    // Update UI
    document.getElementById('warningCount').textContent = cheatingCount;
    
    // Show warning
    document.getElementById('warningMessage').textContent = message;
    document.getElementById('cheatingWarning').classList.add('show');
    
    // Hide warning after 5 seconds
    setTimeout(() => {
        document.getElementById('cheatingWarning').classList.remove('show');
    }, 5000);
    
    // Show alert for serious violations or every 2nd warning
    if (cheatingCount % 2 === 1 || type.includes('multiple') || type.includes('tab_switch')) {
        showCheatingAlert(type, message);
    }
    
    // Auto-submit on 3rd warning
    if (cheatingCount >= 3) {
        setTimeout(() => {
            autoSubmitExam('Multiple cheating violations detected');
        }, 3000);
    }
    
    // Save progress
    saveProgress();
}

// Show cheating alert
function showCheatingAlert(type, message) {
    document.getElementById('alertTitle').textContent = cheatingCount >= 2 ? 'Final Warning!' : 'Warning!';
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertCount').textContent = cheatingCount;
    document.getElementById('violationType').textContent = formatViolationType(type);
    
    document.getElementById('cheatingOverlay').classList.add('show');
    document.getElementById('cheatingAlert').classList.add('show');
}

// Close cheating alert
function closeCheatingAlert() {
    document.getElementById('cheatingOverlay').classList.remove('show');
    document.getElementById('cheatingAlert').classList.remove('show');
}

// Format violation type for display
function formatViolationType(type) {
    const types = {
        'face_not_visible': 'Face Not Visible',
        'looking_away': 'Looking Away from Screen',
        'multiple_faces': 'Multiple Faces Detected',
        'phone_detected': 'Mobile Phone Detected',
        'book_detected': 'Prohibited Materials',
        'tab_switch': 'Tab Switching',
        'talking_detected': 'Talking Detected',
        'background_noise': 'Background Noise',
        'multiple_voices': 'Multiple Voices'
    };
    
    return types[type] || type.replace(/_/g, ' ').toUpperCase();
}

// Start fullscreen/tab detection
function startFullscreenDetection() {
    let hiddenTime = 0;
    let hiddenInterval = null;
    
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Show fullscreen warning
            document.getElementById('fullscreenWarning').classList.add('show');
            
            // Start counting hidden time
            hiddenTime = 0;
            hiddenInterval = setInterval(() => {
                hiddenTime++;
                
                if (hiddenTime >= 5) { // 5 seconds
                    detectCheating('tab_switch', 'Extended tab switching detected.');
                    clearInterval(hiddenInterval);
                }
            }, 1000);
        } else {
            // Hide warning
            document.getElementById('fullscreenWarning').classList.remove('show');
            
            // Clear interval
            if (hiddenInterval) {
                clearInterval(hiddenInterval);
                hiddenInterval = null;
            }
            
            // If was hidden for more than 2 seconds, log warning
            if (hiddenTime >= 2) {
                detectCheating('tab_switch', 'Tab switching detected.');
            }
        }
    });
}

// Save progress
function saveProgress() {
    if (!currentAttempt) return;
    
    // Convert answers to array format
    const answersArray = [];
    Object.keys(userAnswers).forEach(questionId => {
        answersArray.push({
            questionId: parseInt(questionId),
            answer: userAnswers[questionId]
        });
    });
    
    // Update attempt
    const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
    const attemptIndex = attempts.findIndex(att => att.id === currentAttempt.id);
    
    if (attemptIndex !== -1) {
        attempts[attemptIndex].answers = answersArray;
        attempts[attemptIndex].cheatingCount = cheatingCount;
        attempts[attemptIndex].warnings = warnings;
        attempts[attemptIndex].lastSaved = new Date().toISOString();
        
        localStorage.setItem('examAttempts', JSON.stringify(attempts));
        currentAttempt = attempts[attemptIndex];
    }
}

// Show submit confirmation
function showSubmitConfirm() {
    // Calculate unanswered questions
    const totalQuestions = examData.questions.length;
    const answeredQuestions = Object.keys(userAnswers).filter(key => {
        const answer = userAnswers[key];
        if (Array.isArray(answer)) {
            return answer.length > 0;
        }
        return answer && answer.toString().trim() !== '';
    }).length;
    
    const unansweredQuestions = totalQuestions - answeredQuestions;
    
    let message = `You have answered ${answeredQuestions} out of ${totalQuestions} questions.`;
    
    if (unansweredQuestions > 0) {
        message += ` ${unansweredQuestions} question(s) remain unanswered.`;
    }
    
    if (markedQuestions.size > 0) {
        message += ` ${markedQuestions.size} question(s) marked for review.`;
    }
    
    document.getElementById('submitMessage').textContent = message;
    
    // Show warning count if any
    if (cheatingCount > 0) {
        document.getElementById('warningCountConfirm').textContent = cheatingCount;
        document.getElementById('warningStats').style.display = 'block';
    } else {
        document.getElementById('warningStats').style.display = 'none';
    }
    
    // Show modal
    document.getElementById('submitOverlay').classList.add('show');
    document.getElementById('submitConfirm').classList.add('show');
}

// Close submit confirmation
function closeSubmitConfirm() {
    document.getElementById('submitOverlay').classList.remove('show');
    document.getElementById('submitConfirm').classList.remove('show');
}

// Submit exam
async function submitExam() {
    closeSubmitConfirm();
    
    // Show loading
    document.getElementById('loadingOverlay').classList.add('show');
    document.getElementById('loadingMessage').textContent = 'Submitting exam...';
    
    // Stop monitoring
    stopMonitoring();
    
    // Calculate score
    const score = calculateScore();
    
    // Create submission
    const submission = {
        id: 'SUBMISSION' + Date.now(),
        examId: examData.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        startedAt: currentAttempt.startedAt,
        submittedAt: new Date().toISOString(),
        status: 'completed',
        answers: currentAttempt.answers,
        cheatingCount: cheatingCount,
        warnings: warnings,
        score: score,
        totalMarks: calculateTotalMarks(),
        percentage: Math.round((score / calculateTotalMarks()) * 100)
    };
    
    // Save submission
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    submissions.push(submission);
    localStorage.setItem('submissions', JSON.stringify(submissions));
    
    // Update attempt status
    const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
    const attemptIndex = attempts.findIndex(att => att.id === currentAttempt.id);
    
    if (attemptIndex !== -1) {
        attempts[attemptIndex].status = 'completed';
        attempts[attemptIndex].submittedAt = new Date().toISOString();
        attempts[attemptIndex].score = score;
        attempts[attemptIndex].totalMarks = calculateTotalMarks();
        localStorage.setItem('examAttempts', JSON.stringify(attempts));
    }
    
    // Update exam statistics
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const examIndex = exams.findIndex(e => e.id === examData.id);
    
    if (examIndex !== -1) {
        exams[examIndex].totalAttempts = (exams[examIndex].totalAttempts || 0) + 1;
        localStorage.setItem('exams', JSON.stringify(exams));
    }
    
    // Show success message
    setTimeout(() => {
        alert(`Exam submitted successfully!\n\nScore: ${score}/${calculateTotalMarks()} (${Math.round((score / calculateTotalMarks()) * 100)}%)\nWarnings: ${cheatingCount}`);
        window.location.href = 'student-dashboard.html';
    }, 1500);
}

// Auto-submit exam (for cheating or time)
function autoSubmitExam(reason) {
    // Stop monitoring
    stopMonitoring();
    
    // Show warning
    document.getElementById('loadingOverlay').classList.add('show');
    document.getElementById('loadingMessage').textContent = `${reason}. Auto-submitting exam...`;
    
    // Add final warning
    if (reason.includes('cheating')) {
        warnings.push({
            type: 'auto_submit',
            message: `Exam auto-submitted due to: ${reason}`,
            timestamp: new Date().toISOString(),
            question: currentQuestion
        });
    }
    
    // Calculate score
    const score = calculateScore();
    
    // Create submission
    const submission = {
        id: 'SUBMISSION' + Date.now(),
        examId: examData.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        startedAt: currentAttempt.startedAt,
        submittedAt: new Date().toISOString(),
        status: 'completed',
        answers: currentAttempt.answers,
        cheatingCount: cheatingCount,
        warnings: warnings,
        score: score,
        totalMarks: calculateTotalMarks(),
        percentage: Math.round((score / calculateTotalMarks()) * 100),
        autoSubmitted: true,
        autoSubmitReason: reason
    };
    
    // Save submission
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    submissions.push(submission);
    localStorage.setItem('submissions', JSON.stringify(submissions));
    
    // Update attempt
    const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
    const attemptIndex = attempts.findIndex(att => att.id === currentAttempt.id);
    
    if (attemptIndex !== -1) {
        attempts[attemptIndex].status = 'completed';
        attempts[attemptIndex].submittedAt = new Date().toISOString();
        attempts[attemptIndex].score = score;
        attempts[attemptIndex].totalMarks = calculateTotalMarks();
        attempts[attemptIndex].autoSubmitted = true;
        localStorage.setItem('examAttempts', JSON.stringify(attempts));
    }
    
    // Show message and redirect
    setTimeout(() => {
        alert(`Exam auto-submitted!\nReason: ${reason}\n\nScore: ${score}/${calculateTotalMarks()}\nWarnings: ${cheatingCount}`);
        window.location.href = 'student-dashboard.html';
    }, 2000);
}

// Calculate score
function calculateScore() {
    let totalScore = 0;
    
    examData.questions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        
        if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
            if (question.type === 'mcq') {
                if (Array.isArray(userAnswer)) {
                    // Multiple correct answers
                    const correctAnswers = question.options
                        .filter(opt => opt.isCorrect)
                        .map(opt => opt.id.toString());
                    
                    // Check if all correct answers are selected and no incorrect ones
                    const allCorrectSelected = correctAnswers.every(ca => userAnswer.includes(ca));
                    const noIncorrectSelected = userAnswer.every(ua => correctAnswers.includes(ua));
                    
                    if (allCorrectSelected && noIncorrectSelected) {
                        totalScore += question.marks;
                    }
                } else {
                    // Single correct answer
                    const correctOption = question.options.find(opt => opt.isCorrect);
                    if (correctOption && userAnswer === correctOption.id.toString()) {
                        totalScore += question.marks;
                    }
                }
            } else if (question.type === 'short') {
                // For short answers, give partial credit if expected answer is provided
                if (question.expectedAnswer && question.expectedAnswer.trim()) {
                    const expectedKeywords = question.expectedAnswer.toLowerCase().split(',').map(k => k.trim());
                    const userAnswerLower = userAnswer.toString().toLowerCase();
                    
                    const matchingKeywords = expectedKeywords.filter(keyword => 
                        userAnswerLower.includes(keyword)
                    );
                    
                    const matchPercentage = expectedKeywords.length > 0 ? 
                        matchingKeywords.length / expectedKeywords.length : 0;
                    
                    totalScore += Math.round(question.marks * matchPercentage);
                } else {
                    // If no expected answer, give full marks for any answer
                    totalScore += question.marks;
                }
            }
        }
    });
    
    return totalScore;
}

// Calculate total marks
function calculateTotalMarks() {
    return examData.questions.reduce((total, question) => total + (question.marks || 1), 0);
}

// Stop monitoring
function stopMonitoring() {
    isMonitoring = false;
    
    // Clear intervals
    cheatingChecks.forEach(interval => clearInterval(interval));
    cheatingChecks = [];
    
    // Stop timer
    if (examTimer) {
        clearInterval(examTimer);
    }
    
    // Stop media streams
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
    }
}

// Show cheating warning
function showCheatingWarning(title, message) {
    // For minor violations, just update the warning box
    document.getElementById('warningMessage').textContent = message;
    document.getElementById('cheatingWarning').classList.add('show');
    
    setTimeout(() => {
        document.getElementById('cheatingWarning').classList.remove('show');
    }, 3000);
}

// Make functions globally accessible
window.selectOption = selectOption;
window.saveShortAnswer = saveShortAnswer;
window.closeCheatingAlert = closeCheatingAlert;
window.closeSubmitConfirm = closeSubmitConfirm;
window.submitExam = submitExam;