// Check authentication
// student.js - UPDATED VERSION

// Check authentication
checkAuth();
const currentUser = getCurrentUser();

// Get token
const token = localStorage.getItem('token');

// Validate and start exam - UPDATED
async function validateAndStartExam(examCode) {
    try {
        console.log("🔍 Validating exam code:", examCode);
        
        // Get exam details from backend
        const response = await fetch(`${window.API_BASE_URL}/exams/${examCode}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const exam = await response.json();
            
            // Check if student already has a submission
            const submissionsResponse = await checkExistingSubmission(exam.id);
            
            if (submissionsResponse && submissionsResponse.status === 'completed') {
                showAccessModal('Already Completed', 
                    `You have already completed this exam.\n\nScore: ${submissionsResponse.score || 'N/A'}`,
                    'info');
                return;
            }
            
            // Show exam instructions
            showExamInstructions(exam);
            
        } else {
            const errorData = await response.json();
            showAccessModal('Exam Not Found', errorData.detail || `No exam found with code: ${examCode}`, 'error');
        }
    } catch (error) {
        console.error('Error validating exam:', error);
        showAccessModal('Error', 'Network error. Please try again.', 'error');
    }
}

// Start exam with backend
async function startExamWithCode(examId) {
    if (!examId) {
        alert('No exam selected!');
        return;
    }
    
    try {
        // Start exam via backend (creates a submission)
        const response = await fetch(`${window.API_BASE_URL}/exams/${examCode}/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Save submission ID for later
            localStorage.setItem('currentSubmission', data.submission_id);
            
            // Close modal and redirect to exam page
            closeModal('examAccessModal');
            window.location.href = `exam.html?code=${currentExamCode}`;
        } else {
            const errorData = await response.json();
            alert('Error starting exam: ' + (errorData.detail || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error starting exam:', error);
        alert('Network error. Please try again.');
    }
}

// Helper function to check existing submission
async function checkExistingSubmission(examId) {
    try {
        // You might need to implement this endpoint
        const response = await fetch(`${window.API_BASE_URL}/exams/${examId}/submissions/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Error checking submission:', error);
        return null;
    }
}

// Store current exam ID for starting
let currentExamId = null;
let currentExamCode = null;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize user info
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    
    // Navigation Event Listeners
    const dashboardLink = document.getElementById('dashboardLink');
    const enterCodeLink = document.getElementById('enterCodeLink');
    const myExamsLink = document.getElementById('myExamsLink');
    const resultsLink = document.getElementById('resultsLink');
    
    if (dashboardLink) {
        dashboardLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPage('dashboard');
        });
    }
    
    if (enterCodeLink) {
        enterCodeLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPage('enterCode');
        });
    }
    
    if (myExamsLink) {
        myExamsLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPage('myExams');
        });
    }
    
    if (resultsLink) {
        resultsLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPage('results');
        });
    }
    
    // Check if there's an exam code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const examCodeFromUrl = urlParams.get('code');
    
    if (examCodeFromUrl) {
        // Auto-validate exam code from URL
        validateExamCodeFromUrl(examCodeFromUrl);
    } else {
        // Initialize dashboard
        showPage('dashboard');
    }
});

// Navigation function
function showPage(page) {
    console.log('Showing student page:', page);
    
    // Hide all content sections
    const sections = ['dashboardContent', 'enterCodeContent', 'myExamsContent', 'resultsContent'];
    sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Remove active class from all menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected page and set active menu
    let pageTitle = 'Student Dashboard';
    
    switch(page) {
        case 'dashboard':
            document.getElementById('dashboardContent').style.display = 'block';
            document.getElementById('dashboardLink').classList.add('active');
            pageTitle = 'Student Dashboard';
            loadStudentDashboard();
            break;
        case 'enterCode':
            document.getElementById('enterCodeContent').style.display = 'block';
            document.getElementById('enterCodeLink').classList.add('active');
            pageTitle = 'Enter Exam Code';
            break;
        case 'myExams':
            document.getElementById('myExamsContent').style.display = 'block';
            document.getElementById('myExamsLink').classList.add('active');
            pageTitle = 'My Exams';
            loadMyExamHistory();
            break;
        case 'results':
            document.getElementById('resultsContent').style.display = 'block';
            document.getElementById('resultsLink').classList.add('active');
            pageTitle = 'My Results';
            loadMyResults();
            break;
    }
    
    // Update page title
    const pageTitleElement = document.getElementById('pageTitle');
    if (pageTitleElement) {
        pageTitleElement.textContent = pageTitle;
    }
}

// Load student dashboard
function loadStudentDashboard() {
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    
    // Get exams accessible to this student
    const accessibleExams = getAccessibleExamsForStudent(currentUser.id, exams);
    
    // Get student's submissions
    const studentSubmissions = submissions.filter(sub => sub.studentId === currentUser.id);
    
    // Calculate stats
    document.getElementById('assignedExamsCount').textContent = accessibleExams.length;
    
    const completedExams = studentSubmissions.filter(sub => sub.status === 'completed').length;
    document.getElementById('completedExamsCount').textContent = completedExams;
    
    const pendingExams = accessibleExams.length - completedExams;
    document.getElementById('pendingExamsCount').textContent = pendingExams;
    
    const warnings = studentSubmissions.filter(sub => sub.cheatingCount > 0).length;
    document.getElementById('warningsCount').textContent = warnings;
    
    // Load recent exams
    const recentExamsTable = document.getElementById('recentExamsTable');
    if (recentExamsTable) {
        const tbody = recentExamsTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            // Get recent submissions (last 5)
            const recentSubmissions = [...studentSubmissions]
                .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                .slice(0, 5);
            
            recentSubmissions.forEach(submission => {
                const exam = exams.find(e => e.id === submission.examId);
                if (exam) {
                    const row = tbody.insertRow();
                    
                    // Calculate score percentage
                    let scoreDisplay = 'N/A';
                    if (submission.score !== undefined && submission.totalMarks) {
                        const percentage = Math.round((submission.score / submission.totalMarks) * 100);
                        scoreDisplay = `${percentage}%`;
                    }
                    
                    row.innerHTML = `
                        <td>${exam.title}</td>
                        <td>${exam.teacherName}</td>
                        <td>${new Date(submission.submittedAt).toLocaleDateString()}</td>
                        <td>${scoreDisplay}</td>
                        <td>
                            <span class="status ${submission.cheatingCount > 0 ? 'cheating' : 'completed'}">
                                ${submission.cheatingCount > 0 ? 'With Warnings' : 'Completed'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-primary" onclick="viewAttemptDetails('${submission.id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </td>
                    `;
                }
            });
            
            if (recentSubmissions.length === 0) {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td colspan="6" class="text-center" style="padding: 40px;">
                        <i class="fas fa-clipboard-list" style="font-size: 48px; color: #4361ee; margin-bottom: 20px;"></i>
                        <h3>No exams taken yet</h3>
                        <p>Enter an exam code to start your first exam.</p>
                    </td>
                `;
            }
        }
    }
}

// Get exams accessible to a specific student
function getAccessibleExamsForStudent(studentId, exams) {
    return exams.filter(exam => {
        if (!exam.isActive) return false;
        
        if (exam.accessType === 'link') {
            return true; // Anyone with link can access
        } else if (exam.accessType === 'specific') {
            // Check if student is in allowed list
            return exam.allowedStudents.includes(studentId);
        }
        return false;
    });
}

// Validate exam code from input
function validateExamCode() {
    const examCodeInput = document.getElementById('examCodeInput');
    const examCode = examCodeInput ? examCodeInput.value.trim().toUpperCase() : '';
    
    if (!examCode || examCode.length !== 8) {
        showAccessModal('Invalid Code', 'Please enter a valid 8-digit exam code.', 'error');
        return;
    }
    
    validateAndStartExam(examCode);
}

// Validate exam code from URL
function validateExamCodeFromUrl(examCode) {
    const cleanCode = examCode.trim().toUpperCase();
    validateAndStartExam(cleanCode);
}

// Main validation function
function validateAndStartExam(examCode) {
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    
    // Find exam by code
    const exam = exams.find(e => e.examCode === examCode);
    
    if (!exam) {
        showAccessModal('Exam Not Found', `No exam found with code: ${examCode}`, 'error');
        return;
    }
    
    if (!exam.isActive) {
        showAccessModal('Exam Inactive', 'This exam is no longer active. Please contact your teacher.', 'error');
        return;
    }
    
    // Check access restrictions
    if (exam.accessType === 'specific') {
        if (!exam.allowedStudents.includes(currentUser.id)) {
            showAccessModal('Access Denied', 'You are not authorized to take this exam. Please contact your teacher.', 'error');
            return;
        }
    }
    
    // Check if student already completed this exam
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const previousSubmission = submissions.find(sub => 
        sub.examId === exam.id && sub.studentId === currentUser.id && sub.status === 'completed'
    );
    
    if (previousSubmission) {
        showAccessModal('Already Completed', 
            `You have already completed this exam.\n\nScore: ${previousSubmission.score || 'N/A'}\nStatus: ${previousSubmission.cheatingCount > 0 ? 'With Warnings' : 'Completed'}`,
            'info');
        return;
    }
    
    // Check for in-progress attempt
    const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
    const inProgressAttempt = attempts.find(att => 
        att.examId === exam.id && 
        att.studentId === currentUser.id && 
        att.status === 'in_progress'
    );
    
    if (inProgressAttempt) {
        const continueExam = confirm(`You have an in-progress attempt for this exam.\nStarted: ${new Date(inProgressAttempt.startedAt).toLocaleString()}\n\nDo you want to continue?`);
        
        if (continueExam) {
            localStorage.setItem('currentAttempt', inProgressAttempt.id);
            window.location.href = `exam.html?code=${examCode}`;
            return;
        }
    }
    
    // Show exam instructions
    showExamInstructions(exam);
}

// Show exam instructions
function showExamInstructions(exam) {
    currentExamId = exam.id;
    currentExamCode = exam.examCode;
    
    const instructions = `
        <h4>${exam.title}</h4>
        <p>${exam.description || ''}</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h5><i class="fas fa-info-circle"></i> Exam Details:</h5>
            <ul style="margin-left: 20px; margin-top: 10px;">
                <li><strong>Duration:</strong> ${exam.duration} minutes</li>
                <li><strong>Questions:</strong> ${exam.questions.length}</li>
                <li><strong>Total Marks:</strong> ${calculateTotalMarks(exam.questions)}</li>
                <li><strong>Teacher:</strong> ${exam.teacherName}</li>
            </ul>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h5><i class="fas fa-exclamation-triangle"></i> Important Rules:</h5>
            <ol style="margin-left: 20px;">
                <li>Do not switch tabs or windows during the exam</li>
                <li>Keep your face visible to the camera at all times</li>
                <li>No talking or communication with others</li>
                <li>No use of phones, books, or other resources</li>
                <li>3 cheating warnings will result in auto-submission</li>
            </ol>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 8px;">
            <h5><i class="fas fa-camera"></i> Camera & Microphone</h5>
            <p>You must allow camera and microphone access to proceed with the exam.</p>
            <p><small>Your video will be monitored for proctoring purposes only.</small></p>
        </div>
        
        <div class="text-center" style="margin-top: 30px;">
            <button class="btn btn-primary" onclick="startExamWithCode('${exam.id}')" style="min-width: 150px;">
                <i class="fas fa-play-circle"></i> Start Exam
            </button>
            <button class="btn btn-secondary" onclick="closeModal('examAccessModal')" style="margin-left: 10px;">
                <i class="fas fa-times"></i> Cancel
            </button>
        </div>
    `;
    
    showAccessModal('Exam Instructions', instructions, 'instructions');
}

// Show access modal with different types
function showAccessModal(title, content, type) {
    const modalTitle = document.getElementById('examAccessTitle');
    const modalContent = document.getElementById('examAccessContent');
    
    if (modalTitle) modalTitle.textContent = title;
    
    if (modalContent) {
        if (type === 'instructions') {
            modalContent.innerHTML = content;
        } else {
            modalContent.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas ${type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}" 
                       style="font-size: 64px; color: ${type === 'error' ? '#f72585' : '#4cc9f0'}; margin-bottom: 20px;"></i>
                    <p style="font-size: 18px; white-space: pre-line;">${content}</p>
                </div>
                <div class="text-center" style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="closeModal('examAccessModal')">
                        OK
                    </button>
                </div>
            `;
        }
    }
    
    const modal = document.getElementById('examAccessModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Start exam with code
function startExamWithCode(examId) {
    if (!examId) {
        alert('No exam selected!');
        return;
    }
    
    // Create an exam attempt record
    const attemptId = 'ATTEMPT' + Date.now();
    const newAttempt = {
        id: attemptId,
        examId: examId,
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
    
    // Save attempt to localStorage
    const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
    attempts.push(newAttempt);
    localStorage.setItem('examAttempts', JSON.stringify(attempts));
    
    // Update exam's studentsWithAccess list
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const examIndex = exams.findIndex(e => e.id === examId);
    if (examIndex !== -1) {
        if (!exams[examIndex].studentsWithAccess.includes(currentUser.id)) {
            exams[examIndex].studentsWithAccess.push(currentUser.id);
        }
        exams[examIndex].totalAttempts = (exams[examIndex].totalAttempts || 0) + 1;
        localStorage.setItem('exams', JSON.stringify(exams));
    }
    
    // Set current attempt ID
    localStorage.setItem('currentAttempt', attemptId);
    
    // Close modal and redirect to exam page
    closeModal('examAccessModal');
    window.location.href = `exam.html?code=${currentExamCode}`;
}

// Calculate total marks
function calculateTotalMarks(questions) {
    return questions.reduce((total, question) => total + (question.marks || 1), 0);
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Load my exam history
function loadMyExamHistory() {
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
    
    // Get student's submissions and attempts
    const studentSubmissions = submissions.filter(sub => sub.studentId === currentUser.id);
    const studentAttempts = attempts.filter(attempt => attempt.studentId === currentUser.id);
    
    const myExamHistoryTable = document.getElementById('myExamHistoryTable');
    if (myExamHistoryTable) {
        const tbody = myExamHistoryTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            // Combine submissions and in-progress attempts
            const allRecords = [...studentSubmissions, ...studentAttempts.filter(a => a.status === 'in_progress')];
            
            // Sort by date (newest first)
            allRecords.sort((a, b) => new Date(b.startedAt || b.submittedAt) - new Date(a.startedAt || a.submittedAt));
            
            allRecords.forEach(record => {
                const exam = exams.find(e => e.id === record.examId);
                if (exam) {
                    const row = tbody.insertRow();
                    
                    // Calculate score if available
                    let scoreDisplay = 'N/A';
                    if (record.score !== undefined && record.totalMarks) {
                        const percentage = Math.round((record.score / record.totalMarks) * 100);
                        scoreDisplay = `${record.score}/${record.totalMarks} (${percentage}%)`;
                    } else if (record.score !== undefined) {
                        scoreDisplay = record.score;
                    }
                    
                    row.innerHTML = `
                        <td>${exam.title}</td>
                        <td>${exam.teacherName}</td>
                        <td>${new Date(record.startedAt).toLocaleString()}</td>
                        <td>${record.submittedAt ? new Date(record.submittedAt).toLocaleString() : 'Not submitted'}</td>
                        <td>${scoreDisplay}</td>
                        <td>
                            <span class="status ${record.status === 'in_progress' ? 'pending' : record.cheatingCount > 0 ? 'cheating' : 'completed'}">
                                ${record.status === 'in_progress' ? 'In Progress' : 
                                  record.cheatingCount > 0 ? 'With Warnings' : 'Completed'}
                            </span>
                        </td>
                        <td>
                            ${record.status === 'in_progress' ? 
                                `<button class="btn btn-primary" onclick="continueExam('${exam.id}')">
                                    <i class="fas fa-play"></i> Continue
                                </button>` :
                                `<button class="btn btn-primary" onclick="viewAttemptDetails('${record.id}')">
                                    <i class="fas fa-eye"></i> Review
                                </button>`
                            }
                        </td>
                    `;
                }
            });
            
            if (allRecords.length === 0) {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td colspan="7" class="text-center" style="padding: 40px;">
                        <i class="fas fa-history" style="font-size: 48px; color: #6c757d; margin-bottom: 20px;"></i>
                        <h3>No exam history</h3>
                        <p>You haven't taken any exams yet.</p>
                    </td>
                `;
            }
        }
    }
}

// Continue an in-progress exam
function continueExam(examId) {
    const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
    const currentAttempt = attempts.find(attempt => 
        attempt.examId === examId && 
        attempt.studentId === currentUser.id && 
        attempt.status === 'in_progress'
    );
    
    if (currentAttempt) {
        localStorage.setItem('currentAttempt', currentAttempt.id);
        // Find exam code
        const exams = JSON.parse(localStorage.getItem('exams')) || [];
        const exam = exams.find(e => e.id === examId);
        if (exam) {
            window.location.href = `exam.html?code=${exam.examCode}`;
        }
    } else {
        alert('No active exam found. Please enter the exam code again.');
    }
}

// View attempt details
function viewAttemptDetails(attemptId) {
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    
    const submission = submissions.find(sub => sub.id === attemptId) || 
                      attempts.find(att => att.id === attemptId);
    
    if (!submission) {
        alert('Attempt not found!');
        return;
    }
    
    const exam = exams.find(e => e.id === submission.examId);
    
    let details = `📝 Exam Details\n`;
    details += `Exam: ${exam ? exam.title : 'Unknown'}\n`;
    details += `Started: ${new Date(submission.startedAt).toLocaleString()}\n`;
    details += `Submitted: ${submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'Not submitted'}\n`;
    details += `Status: ${submission.status}\n`;
    details += `Cheating Warnings: ${submission.cheatingCount || 0}\n`;
    
    if (submission.score !== undefined) {
        details += `Score: ${submission.score}`;
        if (submission.totalMarks) {
            details += `/${submission.totalMarks}`;
            const percentage = Math.round((submission.score / submission.totalMarks) * 100);
            details += ` (${percentage}%)`;
        }
    }
    
    if (submission.warnings && submission.warnings.length > 0) {
        details += '\n\n⚠️ Warnings Received:\n';
        submission.warnings.forEach((warning, index) => {
            details += `${index + 1}. ${warning.type}: ${warning.message} (${new Date(warning.timestamp).toLocaleTimeString()})\n`;
        });
    }
    
    alert(details);
}

// Load my results
function loadMyResults() {
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    
    // Get student's completed submissions
    const studentSubmissions = submissions.filter(sub => 
        sub.studentId === currentUser.id && sub.status === 'completed'
    );
    
    const myResultsTable = document.getElementById('myResultsTable');
    if (myResultsTable) {
        const tbody = myResultsTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            studentSubmissions.forEach(submission => {
                const exam = exams.find(e => e.id === submission.examId);
                if (exam) {
                    const row = tbody.insertRow();
                    
                    // Calculate percentage
                    let percentage = 'N/A';
                    if (submission.score !== undefined && submission.totalMarks) {
                        percentage = Math.round((submission.score / submission.totalMarks) * 100);
                    }
                    
                    row.innerHTML = `
                        <td>${exam.title}</td>
                        <td>${exam.teacherName}</td>
                        <td>${new Date(submission.submittedAt).toLocaleDateString()}</td>
                        <td>${submission.score || 'N/A'}</td>
                        <td>${submission.totalMarks || calculateTotalMarks(exam.questions)}</td>
                        <td>${percentage !== 'N/A' ? percentage + '%' : 'N/A'}</td>
                        <td>
                            <span class="status ${submission.cheatingCount > 0 ? 'cheating' : 'completed'}">
                                ${submission.cheatingCount > 0 ? 'With Warnings' : 'Completed'}
                            </span>
                        </td>
                    `;
                }
            });
            
            if (studentSubmissions.length === 0) {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td colspan="7" class="text-center" style="padding: 40px;">
                        <i class="fas fa-chart-line" style="font-size: 48px; color: #6c757d; margin-bottom: 20px;"></i>
                        <h3>No results available</h3>
                        <p>Complete some exams to see your results here.</p>
                    </td>
                `;
            }
        }
    }
    
    // Calculate performance summary
    if (studentSubmissions.length > 0) {
        const scores = studentSubmissions
            .filter(sub => sub.score !== undefined && sub.totalMarks)
            .map(sub => (sub.score / sub.totalMarks) * 100);
        
        if (scores.length > 0) {
            const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            const highestScore = Math.round(Math.max(...scores));
            
            document.getElementById('averageScore').textContent = averageScore + '%';
            document.getElementById('highestScore').textContent = highestScore + '%';
        }
        
        document.getElementById('examsTaken').textContent = studentSubmissions.length;
        
        // Calculate average time (simplified)
        const totalDuration = studentSubmissions.reduce((total, sub) => {
            if (sub.startedAt && sub.submittedAt) {
                const start = new Date(sub.startedAt);
                const end = new Date(sub.submittedAt);
                return total + (end - start) / (1000 * 60); // Convert to minutes
            }
            return total;
        }, 0);
        
        if (studentSubmissions.length > 0) {
            const avgTime = Math.round(totalDuration / studentSubmissions.length);
            document.getElementById('averageTime').textContent = avgTime + ' min';
        }
    }
}

// Make functions globally accessible
window.validateExamCode = validateExamCode;
window.closeModal = closeModal;
window.showPage = showPage;
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
};
window.continueExam = continueExam;
window.viewAttemptDetails = viewAttemptDetails;

// Helper function to validate exam code from URL
function validateExamCodeFromUrl(examCode) {
    // Set the code in the input field
    const examCodeInput = document.getElementById('examCodeInput');
    if (examCodeInput) {
        examCodeInput.value = examCode;
    }
    
    // Show the enter code page
    showPage('enterCode');
    
    // Auto-validate after a short delay
    setTimeout(() => {
        validateAndStartExam(examCode);
    }, 500);
}