
// Filter exams by status
// teacher.js - UPDATED VERSION

// Check authentication
checkAuth();
const currentUser = getCurrentUser();

// Get token for API requests
const token = localStorage.getItem('token');

// Navigation function - Add API calls
async function loadDashboardStats() {
    try {
        console.log("📊 Loading teacher dashboard stats...");
        
        const response = await fetch(`${window.API_BASE_URL}/exams/my-exams`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const exams = await response.json();
            
            // Update stats from backend data
            document.getElementById('totalExams').textContent = exams.length;
            
            // Load recent exams table
            const examsTable = document.getElementById('examsTable');
            if (examsTable) {
                const tbody = examsTable.getElementsByTagName('tbody')[0];
                if (tbody) {
                    tbody.innerHTML = '';
                    
                    exams.slice(0, 5).forEach(exam => {
                        const row = tbody.insertRow();
                        row.innerHTML = `
                            <td>${exam.title}</td>
                            <td>${new Date(exam.created_at).toLocaleDateString()}</td>
                            <td>${exam.submissions?.total || 0}</td>
                            <td><span class="status completed">Active</span></td>
                            <td>
                                <button class="btn btn-primary" onclick="viewExamDetails('${exam.exam_code}')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                            </td>
                        `;
                    });
                }
            }
        } else {
            console.warn("Could not fetch exams from backend");
            // Fallback to localStorage
            const exams = JSON.parse(localStorage.getItem('exams')) || [];
            const teacherExams = exams.filter(exam => exam.teacherId === currentUser.id);
            document.getElementById('totalExams').textContent = teacherExams.length;
        }
    } catch (error) {
        console.error("Error loading dashboard:", error);
    }
}

// CREATE EXAM FUNCTION (Backend Version)
async function handleCreateExam() {
    console.log('📝 Creating exam...');
    
    const title = document.getElementById('examTitle').value;
    const description = document.getElementById('examDescription').value;
    const duration = parseInt(document.getElementById('examDuration').value);
    const accessType = document.getElementById('accessType').value;
    
    // Collect questions
    const questions = [];
    const questionItems = document.querySelectorAll('.question-item');
    
    questionItems.forEach((item, index) => {
        const questionText = item.querySelector('.question-text').value;
        const marksInput = item.querySelector('.question-marks');
        const marks = marksInput ? parseInt(marksInput.value) : 1;
        
        // Check if it's MCQ or Short Answer
        const optionsContainer = item.querySelector('.options-container');
        if (optionsContainer) {
            // MCQ Question
            const optionElements = item.querySelectorAll('.option-text');
            const correctOption = item.querySelector(`input[name="correct${index + 1}"]:checked`);
            
            const options = [];
            optionElements.forEach((opt, optIndex) => {
                if (opt.value.trim()) {
                    options.push({
                        id: optIndex,
                        text: opt.value.trim(),
                        isCorrect: correctOption && parseInt(correctOption.value) === optIndex
                    });
                }
            });
            
            questions.push({
                type: 'mcq',
                text: questionText,
                options: options,
                marks: marks
            });
        } else {
            // Short Answer Question
            const expectedAnswerInput = item.querySelector('.expected-answer');
            const expectedAnswer = expectedAnswerInput ? expectedAnswerInput.value : '';
            
            questions.push({
                type: 'short',
                text: questionText,
                expectedAnswer: expectedAnswer,
                marks: marks
            });
        }
    });
    
    // Validate that there's at least one question
    if (questions.length === 0) {
        alert('Please add at least one question!');
        return;
    }
    
    try {
        console.log("🚀 Sending exam to backend...");
        
        const response = await fetch(`${window.API_BASE_URL}/exams/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: title,
                description: description,
                duration: duration,
                questions: questions,
                access_type: accessType,
                allowed_students: [] // You can add student IDs here
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Exam created:", data);
            
            // Generate exam link
            const examLink = `${window.location.origin}/frontend/exam.html?code=${data.exam_code}`;
            
            // Show modal with link
            const generatedLinkInput = document.getElementById('generatedLink');
            if (generatedLinkInput) {
                generatedLinkInput.value = examLink;
            }
            
            const modal = document.getElementById('examLinkModal');
            if (modal) {
                modal.style.display = 'flex';
            }
            
            // Also save to localStorage for compatibility
            const exams = JSON.parse(localStorage.getItem('exams')) || [];
            exams.push({
                id: 'EXAM' + Date.now(),
                examCode: data.exam_code,
                title: title,
                description: description,
                duration: duration,
                questions: questions,
                teacherId: currentUser.id,
                teacherName: currentUser.name,
                createdAt: new Date().toISOString(),
                isActive: true,
                accessType: accessType
            });
            localStorage.setItem('exams', JSON.stringify(exams));
            
            // Reset form
            const form = document.getElementById('createExamForm');
            if (form) form.reset();
            
            const questionsContainer = document.getElementById('questionsContainer');
            if (questionsContainer) questionsContainer.innerHTML = '';
            
        } else {
            const errorData = await response.json();
            alert('Error creating exam: ' + (errorData.detail || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error creating exam:', error);
        alert('Network error. Please try again.');
    }
}
let currentExamFilter = 'all';
// Variables for batch delete
let examsToDelete = [];
let isBatchDelete = false;

// Enhanced loadMyExams function with checkboxes
function loadMyExams() {
    console.log('Loading my exams...');
    
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    // Filter teacher's exams
    let teacherExams = exams.filter(exam => exam.teacherId === currentUser.id);
    
    // Apply filter
    if (currentExamFilter === 'active') {
        teacherExams = teacherExams.filter(exam => exam.isActive);
    } else if (currentExamFilter === 'inactive') {
        teacherExams = teacherExams.filter(exam => !exam.isActive);
    }
    
    const myExamsTable = document.getElementById('myExamsTable');
    
    if (myExamsTable) {
        const tbody = myExamsTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            teacherExams.forEach(exam => {
                const examSubmissions = submissions.filter(sub => sub.examId === exam.id);
                const uniqueStudents = [...new Set(examSubmissions.map(sub => sub.studentId))];
                
                const row = tbody.insertRow();
                
                row.innerHTML = `
                    <td>
                        <input type="checkbox" class="exam-checkbox" value="${exam.id}" onchange="updateDeleteButton()">
                    </td>
                    <td><strong>${exam.title}</strong></td>
                    <td>
                        <span class="status ${exam.isActive ? 'completed' : 'inactive'}">
                            ${exam.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>${new Date(exam.createdAt).toLocaleDateString()}</td>
                    <td>
                        <code style="background: #f8f9fa; padding: 3px 6px; border-radius: 4px;">${exam.examCode}</code>
                    </td>
                    <td>${exam.questions.length}</td>
                    <td>${exam.duration} min</td>
                    <td>${uniqueStudents.length}</td>
                    <td>${examSubmissions.length}</td>
                    <td>
                        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                            <button class="btn btn-primary" onclick="viewFullExamDetails('${exam.id}')" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-warning" onclick="toggleExamStatus('${exam.id}')" title="${exam.isActive ? 'Deactivate' : 'Activate'}">
                                <i class="fas ${exam.isActive ? 'fa-pause' : 'fa-play'}"></i>
                            </button>
                            <button class="btn btn-info" onclick="copyExamLink('${exam.examCode}')" title="Copy Link">
                                <i class="fas fa-link"></i>
                            </button>
                            <button class="btn btn-danger" onclick="deleteSingleExam('${exam.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
            });
            
            if (teacherExams.length === 0) {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td colspan="10" class="text-center" style="padding: 40px;">
                        <i class="fas fa-file-alt" style="font-size: 48px; color: #6c757d; margin-bottom: 20px;"></i>
                        <h3>No exams found</h3>
                        <p>${currentExamFilter === 'all' ? 'Create your first exam to get started!' : 
                            currentExamFilter === 'active' ? 'No active exams found' : 'No inactive exams found'}</p>
                    </td>
                `;
            }
        }
    }
    
    // Reset batch delete
    examsToDelete = [];
    updateDeleteButton();
    document.getElementById('selectAllExams').checked = false;
}

// Toggle select all exams
function toggleSelectAllExams(checkbox) {
    const examCheckboxes = document.querySelectorAll('.exam-checkbox');
    examCheckboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
    
    updateDeleteButton();
}

// Update delete button visibility
function updateDeleteButton() {
    const examCheckboxes = document.querySelectorAll('.exam-checkbox:checked');
    const deleteMultipleBtn = document.getElementById('deleteMultipleBtn');
    
    if (examCheckboxes.length > 0) {
        deleteMultipleBtn.style.display = 'inline-block';
    } else {
        deleteMultipleBtn.style.display = 'none';
    }
}

// Delete single exam
function deleteSingleExam(examId) {
    examsToDelete = [examId];
    isBatchDelete = false;
    
    // Find exam details
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const exam = exams.find(e => e.id === examId);
    
    if (exam) {
        document.getElementById('deleteExamTitle').textContent = `Delete: ${exam.title}`;
        document.getElementById('multipleDeleteInfo').style.display = 'none';
    }
    
    document.getElementById('deleteExamModal').style.display = 'flex';
}

// Delete multiple exams
function deleteMultipleExams() {
    const examCheckboxes = document.querySelectorAll('.exam-checkbox:checked');
    examsToDelete = Array.from(examCheckboxes).map(cb => cb.value);
    
    if (examsToDelete.length === 0) {
        alert('Please select at least one exam to delete.');
        return;
    }
    
    isBatchDelete = true;
    
    // Update modal for multiple delete
    document.getElementById('deleteExamTitle').textContent = 'Delete Multiple Exams';
    document.getElementById('selectedExamCount').textContent = examsToDelete.length;
    document.getElementById('multipleDeleteInfo').style.display = 'block';
    
    document.getElementById('deleteExamModal').style.display = 'flex';
}

// Confirm and delete exam(s)
function confirmDeleteExam() {
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
    
    let deletedCount = 0;
    
    examsToDelete.forEach(examId => {
        // Find exam index
        const examIndex = exams.findIndex(e => e.id === examId);
        
        if (examIndex !== -1) {
            // Remove exam
            exams.splice(examIndex, 1);
            deletedCount++;
            
            // Remove submissions for this exam
            const filteredSubmissions = submissions.filter(sub => sub.examId !== examId);
            localStorage.setItem('submissions', JSON.stringify(filteredSubmissions));
            
            // Remove attempts for this exam
            const filteredAttempts = attempts.filter(att => att.examId !== examId);
            localStorage.setItem('examAttempts', JSON.stringify(filteredAttempts));
        }
    });
    
    // Save updated exams
    localStorage.setItem('exams', JSON.stringify(exams));
    
    // Close modal and show success message
    closeModal('deleteExamModal');
    
    if (isBatchDelete) {
        alert(`${deletedCount} exam(s) deleted successfully!`);
    } else {
        alert('Exam deleted successfully!');
    }
    
    // Refresh the view
    loadMyExams();
    loadDashboardStats();
    
    // Reset
    examsToDelete = [];
    isBatchDelete = false;
}

// Close modal function (if not already in your file)
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}
function filterExams(filter) {
    currentExamFilter = filter;
    loadMyExams();
}

// Enhanced loadMyExams function
function loadMyExams() {
    console.log('Loading my exams...');
    
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    // Filter teacher's exams
    let teacherExams = exams.filter(exam => exam.teacherId === currentUser.id);
    
    // Apply filter
    if (currentExamFilter === 'active') {
        teacherExams = teacherExams.filter(exam => exam.isActive);
    } else if (currentExamFilter === 'inactive') {
        teacherExams = teacherExams.filter(exam => !exam.isActive);
    }
    
    const myExamsTable = document.getElementById('myExamsTable');
    
    if (myExamsTable) {
        const tbody = myExamsTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            teacherExams.forEach(exam => {
                const examSubmissions = submissions.filter(sub => sub.examId === exam.id);
                const uniqueStudents = [...new Set(examSubmissions.map(sub => sub.studentId))];
                
                // Calculate total marks for this exam
                const totalMarks = calculateTotalMarks(exam.questions);
                
                const row = tbody.insertRow();
                
                row.innerHTML = `
                    <td><strong>${exam.title}</strong></td>
                    <td>
                        <span class="status ${exam.isActive ? 'completed' : 'cheating'}">
                            ${exam.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>${new Date(exam.createdAt).toLocaleDateString()}</td>
                    <td>
                        <code style="background: #f8f9fa; padding: 3px 6px; border-radius: 4px;">${exam.examCode}</code>
                    </td>
                    <td>${exam.questions.length}</td>
                    <td>${exam.duration} min</td>
                    <td>${uniqueStudents.length}</td>
                    <td>${examSubmissions.length}</td>
                    <td>
                        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                            <button class="btn btn-primary" onclick="viewFullExamDetails('${exam.id}')" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-warning" onclick="toggleExamStatus('${exam.id}')" title="${exam.isActive ? 'Deactivate' : 'Activate'}">
                                <i class="fas ${exam.isActive ? 'fa-pause' : 'fa-play'}"></i>
                            </button>
                            <button class="btn btn-info" onclick="copyExamLink('${exam.examCode}')" title="Copy Link">
                                <i class="fas fa-link"></i>
                            </button>
                            <button class="btn btn-danger" onclick="deleteExam('${exam.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
            });
            
            if (teacherExams.length === 0) {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td colspan="9" class="text-center" style="padding: 40px;">
                        <i class="fas fa-file-alt" style="font-size: 48px; color: #6c757d; margin-bottom: 20px;"></i>
                        <h3>No exams found</h3>
                        <p>${currentExamFilter === 'all' ? 'Create your first exam to get started!' : 
                            currentExamFilter === 'active' ? 'No active exams found' : 'No inactive exams found'}</p>
                    </td>
                `;
            }
        }
    }
}

// View full exam details
function viewFullExamDetails(examId) {
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
    
    const exam = exams.find(e => e.id === examId);
    
    if (!exam) {
        alert('Exam not found!');
        return;
    }
    
    const examSubmissions = submissions.filter(sub => sub.examId === examId);
    const inProgressAttempts = attempts.filter(att => att.examId === examId && att.status === 'in_progress');
    const uniqueStudents = [...new Set(examSubmissions.map(sub => sub.studentId))];
    
    let details = `
        <div style="margin-bottom: 20px;">
            <h4>${exam.title}</h4>
            <p>${exam.description || 'No description'}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Duration:</strong> ${exam.duration} minutes
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Questions:</strong> ${exam.questions.length}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Total Marks:</strong> ${calculateTotalMarks(exam.questions)}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Access Type:</strong> ${exam.accessType === 'specific' ? 'Specific Students' : 'Anyone with Link'}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Exam Code:</strong> ${exam.examCode}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Status:</strong> ${exam.isActive ? 'Active' : 'Inactive'}
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h5>Statistics</h5>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                <div style="text-align: center; padding: 15px; background: #e7f3ff; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold;">${examSubmissions.length}</div>
                    <div>Submissions</div>
                </div>
                <div style="text-align: center; padding: 15px; background: #e7f3ff; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold;">${uniqueStudents.length}</div>
                    <div>Students</div>
                </div>
                <div style="text-align: center; padding: 15px; background: #e7f3ff; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold;">${inProgressAttempts.length}</div>
                    <div>In Progress</div>
                </div>
                <div style="text-align: center; padding: 15px; background: #e7f3ff; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold;">${exam.totalAttempts || 0}</div>
                    <div>Total Attempts</div>
                </div>
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h5>Questions (${exam.questions.length})</h5>
            <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 10px;">
    `;
    
    exam.questions.forEach((question, index) => {
        details += `
            <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                <strong>Q${index + 1}. ${question.text}</strong> (${question.marks} marks)
        `;
        
        if (question.type === 'mcq') {
            details += `<div style="margin-left: 20px; margin-top: 5px;">`;
            question.options.forEach((option, optIndex) => {
                details += `
                    <div>${optIndex + 1}. ${option.text} ${option.isCorrect ? '✓' : ''}</div>
                `;
            });
            details += `</div>`;
        } else if (question.type === 'short') {
            details += `<div style="margin-left: 20px; margin-top: 5px;">`;
            details += `Expected: ${question.expectedAnswer || 'No specific answer'}`;
            details += `</div>`;
        }
        
        details += `</div>`;
    });
    
    details += `
            </div>
        </div>
        
        <div>
            <h5>Student Submissions</h5>
            ${examSubmissions.length > 0 ? `
                <div style="max-height: 200px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 8px; text-align: left;">Student</th>
                                <th style="padding: 8px; text-align: left;">Score</th>
                                <th style="padding: 8px; text-align: left;">Status</th>
                                <th style="padding: 8px; text-align: left;">Time</th>
                            </tr>
                        </thead>
                        <tbody>
            ` : '<p>No submissions yet.</p>'}
    `;
    
    examSubmissions.forEach(submission => {
        const student = users.find(u => u.id === submission.studentId);
        const percentage = submission.totalMarks ? 
            Math.round((submission.score / submission.totalMarks) * 100) : 0;
        
        details += `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${student ? student.name : 'Unknown'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${submission.score || 0}/${submission.totalMarks || 'N/A'} (${percentage}%)</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                    <span style="padding: 3px 8px; border-radius: 12px; font-size: 12px; 
                          background: ${submission.cheatingCount > 0 ? '#f8d7da' : '#d4edda'}; 
                          color: ${submission.cheatingCount > 0 ? '#721c24' : '#155724'}">
                        ${submission.cheatingCount > 0 ? 'With Warnings' : 'Completed'}
                    </span>
                </td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                    ${new Date(submission.submittedAt).toLocaleString()}
                </td>
            </tr>
        `;
    });
    
    if (examSubmissions.length > 0) {
        details += `</tbody></table></div>`;
    }
    
    details += `
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn btn-primary" onclick="copyExamLink('${exam.examCode}')" style="margin-right: 10px;">
                <i class="fas fa-link"></i> Copy Exam Link
            </button>
            <button class="btn btn-secondary" onclick="closeModal('examDetailsModal')">
                Close
            </button>
        </div>
    `;
    
    document.getElementById('examDetailsTitle').textContent = exam.title;
    document.getElementById('examDetailsContent').innerHTML = details;
    document.getElementById('examDetailsModal').style.display = 'flex';
}

// Toggle exam status (active/inactive)
function toggleExamStatus(examId) {
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const examIndex = exams.findIndex(e => e.id === examId);
    
    if (examIndex !== -1) {
        exams[examIndex].isActive = !exams[examIndex].isActive;
        localStorage.setItem('exams', JSON.stringify(exams));
        
        const status = exams[examIndex].isActive ? 'activated' : 'deactivated';
        alert(`Exam ${status} successfully!`);
        loadMyExams();
        loadDashboardStats();
    }
}

// Enhanced loadResults function
function loadResults() {
    console.log('Loading results...');
    
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    // Filter teacher's submissions
    const teacherExams = exams.filter(exam => exam.teacherId === currentUser.id);
    const teacherExamIds = teacherExams.map(exam => exam.id);
    const teacherSubmissions = submissions.filter(sub => teacherExamIds.includes(sub.examId));
    
    // Calculate statistics
    document.getElementById('totalSubmissions').textContent = teacherSubmissions.length;
    
    // Calculate average score
    let totalScore = 0;
    let totalMarks = 0;
    let cheatingCases = 0;
    const uniqueStudents = new Set();
    
    teacherSubmissions.forEach(sub => {
        if (sub.score !== undefined && sub.totalMarks) {
            totalScore += sub.score;
            totalMarks += sub.totalMarks;
        }
        if (sub.cheatingCount > 0) {
            cheatingCases++;
        }
        uniqueStudents.add(sub.studentId);
    });
    
    const avgPercentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
    document.getElementById('avgScore').textContent = avgPercentage + '%';
    document.getElementById('totalCheating').textContent = cheatingCases;
    document.getElementById('studentsParticipated').textContent = uniqueStudents.size;
    
    // Load exam filter options
    const examFilter = document.getElementById('examFilter');
    if (examFilter) {
        examFilter.innerHTML = '<option value="all">All Exams</option>';
        teacherExams.forEach(exam => {
            const option = document.createElement('option');
            option.value = exam.id;
            option.textContent = exam.title;
            examFilter.appendChild(option);
        });
    }
    
    // Load results table
    const resultsTable = document.getElementById('resultsTable');
    if (resultsTable) {
        const tbody = resultsTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            teacherSubmissions.forEach(submission => {
                const exam = teacherExams.find(e => e.id === submission.examId);
                const student = users.find(u => u.id === submission.studentId);
                
                if (exam && student) {
                    const row = tbody.insertRow();
                    
                    // Calculate duration
                    let duration = 'N/A';
                    if (submission.startedAt && submission.submittedAt) {
                        const start = new Date(submission.startedAt);
                        const end = new Date(submission.submittedAt);
                        const diffMinutes = Math.round((end - start) / (1000 * 60));
                        duration = diffMinutes + ' min';
                    }
                    
                    // Calculate percentage
                    let percentage = 'N/A';
                    if (submission.score !== undefined && submission.totalMarks) {
                        percentage = Math.round((submission.score / submission.totalMarks) * 100);
                    }
                    
                    row.innerHTML = `
                        <td>
                            <div><strong>${student.name}</strong></div>
                            <small>${student.email}</small>
                        </td>
                        <td>${exam.title}</td>
                        <td>${new Date(submission.startedAt).toLocaleString()}</td>
                        <td>${new Date(submission.submittedAt).toLocaleString()}</td>
                        <td><strong>${submission.score || 'N/A'}</strong></td>
                        <td>${submission.totalMarks || 'N/A'}</td>
                        <td>
                            <span style="font-weight: bold; color: ${percentage >= 70 ? '#28a745' : percentage >= 50 ? '#ffc107' : '#dc3545'}">
                                ${percentage !== 'N/A' ? percentage + '%' : 'N/A'}
                            </span>
                        </td>
                        <td>${duration}</td>
                        <td>
                            <span class="status ${submission.cheatingCount > 0 ? 'cheating' : 'completed'}">
                                ${submission.cheatingCount > 0 ? 'Cheating Detected' : 'Completed'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-primary" onclick="viewSubmissionDetails('${submission.id}')">
                                <i class="fas fa-file-alt"></i> Details
                            </button>
                        </td>
                    `;
                }
            });
            
            if (teacherSubmissions.length === 0) {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td colspan="10" class="text-center" style="padding: 40px;">
                        <i class="fas fa-chart-bar" style="font-size: 48px; color: #6c757d; margin-bottom: 20px;"></i>
                        <h3>No results yet</h3>
                        <p>Student submissions will appear here once they complete exams.</p>
                    </td>
                `;
            }
        }
    }
}

// Filter results by exam
function filterResultsByExam() {
    const examFilter = document.getElementById('examFilter');
    const selectedExamId = examFilter.value;
    
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    const teacherExams = exams.filter(exam => exam.teacherId === currentUser.id);
    let teacherSubmissions = submissions.filter(sub => teacherExams.some(exam => exam.id === sub.examId));
    
    if (selectedExamId !== 'all') {
        teacherSubmissions = teacherSubmissions.filter(sub => sub.examId === selectedExamId);
    }
    
    // Update results table
    const resultsTable = document.getElementById('resultsTable');
    if (resultsTable) {
        const tbody = resultsTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            teacherSubmissions.forEach(submission => {
                const exam = teacherExams.find(e => e.id === submission.examId);
                const student = users.find(u => u.id === submission.studentId);
                
                if (exam && student) {
                    const row = tbody.insertRow();
                    
                    // Calculate duration
                    let duration = 'N/A';
                    if (submission.startedAt && submission.submittedAt) {
                        const start = new Date(submission.startedAt);
                        const end = new Date(submission.submittedAt);
                        const diffMinutes = Math.round((end - start) / (1000 * 60));
                        duration = diffMinutes + ' min';
                    }
                    
                    // Calculate percentage
                    let percentage = 'N/A';
                    if (submission.score !== undefined && submission.totalMarks) {
                        percentage = Math.round((submission.score / submission.totalMarks) * 100);
                    }
                    
                    row.innerHTML = `
                        <td>
                            <div><strong>${student.name}</strong></div>
                            <small>${student.email}</small>
                        </td>
                        <td>${exam.title}</td>
                        <td>${new Date(submission.startedAt).toLocaleString()}</td>
                        <td>${new Date(submission.submittedAt).toLocaleString()}</td>
                        <td><strong>${submission.score || 'N/A'}</strong></td>
                        <td>${submission.totalMarks || 'N/A'}</td>
                        <td>
                            <span style="font-weight: bold; color: ${percentage >= 70 ? '#28a745' : percentage >= 50 ? '#ffc107' : '#dc3545'}">
                                ${percentage !== 'N/A' ? percentage + '%' : 'N/A'}
                            </span>
                        </td>
                        <td>${duration}</td>
                        <td>
                            <span class="status ${submission.cheatingCount > 0 ? 'cheating' : 'completed'}">
                                ${submission.cheatingCount > 0 ? 'Cheating Detected' : 'Completed'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-primary" onclick="viewSubmissionDetails('${submission.id}')">
                                <i class="fas fa-file-alt"></i> Details
                            </button>
                        </td>
                    `;
                }
            });
        }
    }
}

// View detailed submission
function viewSubmissionDetails(submissionId) {
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    const submission = submissions.find(sub => sub.id === submissionId);
    
    if (!submission) {
        alert('Submission not found!');
        return;
    }
    
    const exam = exams.find(e => e.id === submission.examId);
    const student = users.find(u => u.id === submission.studentId);
    
    if (!exam || !student) {
        alert('Could not find exam or student details!');
        return;
    }
    
    // Calculate duration
    let duration = 'N/A';
    if (submission.startedAt && submission.submittedAt) {
        const start = new Date(submission.startedAt);
        const end = new Date(submission.submittedAt);
        const diffMinutes = Math.round((end - start) / (1000 * 60));
        duration = diffMinutes + ' minutes';
    }
    
    // Calculate percentage
    let percentage = 'N/A';
    if (submission.score !== undefined && submission.totalMarks) {
        percentage = Math.round((submission.score / submission.totalMarks) * 100);
    }
    
    let details = `
        <div style="margin-bottom: 20px;">
            <h4>${exam.title}</h4>
            <p><strong>Student:</strong> ${student.name} (${student.email})</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Score:</strong> ${submission.score || 0}/${submission.totalMarks || 'N/A'}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Percentage:</strong> ${percentage !== 'N/A' ? percentage + '%' : 'N/A'}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Duration:</strong> ${duration}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Status:</strong> ${submission.cheatingCount > 0 ? 'With Warnings' : 'Completed'}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Started:</strong> ${new Date(submission.startedAt).toLocaleString()}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Submitted:</strong> ${new Date(submission.submittedAt).toLocaleString()}
            </div>
        </div>
    `;
    
    if (submission.cheatingCount > 0) {
        details += `
            <div style="margin-bottom: 20px; padding: 15px; background: #f8d7da; border-radius: 8px; border-left: 4px solid #dc3545;">
                <h5 style="color: #721c24; margin-top: 0;">
                    <i class="fas fa-exclamation-triangle"></i> Cheating Detected (${submission.cheatingCount} warnings)
                </h5>
        `;
        
        if (submission.warnings && submission.warnings.length > 0) {
            details += `<ul style="margin-bottom: 0;">`;
            submission.warnings.forEach((warning, index) => {
                details += `
                    <li>
                        <strong>${warning.type}:</strong> ${warning.message}
                        <small>(${new Date(warning.timestamp).toLocaleTimeString()})</small>
                    </li>
                `;
            });
            details += `</ul>`;
        }
        
        details += `</div>`;
    }
    
    // Show answers if available
    if (submission.answers && submission.answers.length > 0) {
        details += `
            <div style="margin-bottom: 20px;">
                <h5>Student Answers</h5>
                <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 10px;">
        `;
        
        submission.answers.forEach((answer, index) => {
            const question = exam.questions.find(q => q.id === answer.questionId);
            if (question) {
                details += `
                    <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                        <strong>Q${index + 1}. ${question.text}</strong>
                        <div style="margin-left: 20px; margin-top: 5px;">
                            <div><strong>Student's Answer:</strong> ${answer.answer || 'No answer provided'}</div>
                `;
                
                if (question.type === 'mcq') {
                    const correctOption = question.options.find(opt => opt.isCorrect);
                    details += `<div><strong>Correct Answer:</strong> ${correctOption ? correctOption.text : 'Not specified'}</div>`;
                } else if (question.type === 'short' && question.expectedAnswer) {
                    details += `<div><strong>Expected Keywords:</strong> ${question.expectedAnswer}</div>`;
                }
                
                details += `</div></div>`;
            }
        });
        
        details += `</div></div>`;
    }
    
    details += `
        <div style="text-align: center; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="closeModal('submissionDetailsModal')">
                Close
            </button>
        </div>
    `;
    
    document.getElementById('submissionDetailsTitle').textContent = `${exam.title} - ${student.name}`;
    document.getElementById('submissionDetailsContent').innerHTML = details;
    document.getElementById('submissionDetailsModal').style.display = 'flex';
}
// Wait for DOM to load before accessing elements
document.addEventListener('DOMContentLoaded', function() {
    // Initialize user info
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    
    // Navigation Event Listeners - Check if elements exist
    const dashboardLink = document.getElementById('dashboardLink');
    const createExamLink = document.getElementById('createExamLink');
    const examsLink = document.getElementById('examsLink');
    const resultsLink = document.getElementById('resultsLink');
    
    if (dashboardLink) {
        dashboardLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPage('dashboard');
        });
    }
    
    if (createExamLink) {
        createExamLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPage('createExam');
        });
    }
    
    if (examsLink) {
        examsLink.addEventListener('click', function(e) {
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
    
    // Initialize dashboard
    showPage('dashboard');
    
    // Set up Create Exam form
    const createExamForm = document.getElementById('createExamForm');
    if (createExamForm) {
        createExamForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleCreateExam();
        });
    }
});

// Navigation function
function showPage(page) {
    console.log('Showing page:', page);
    
    // Hide all content sections
    const sections = ['dashboardContent', 'createExamContent', 'myExamsContent', 'resultsContent'];
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
    let pageTitle = 'Teacher Dashboard';
    
    switch(page) {
        case 'dashboard':
            document.getElementById('dashboardContent').style.display = 'block';
            document.getElementById('dashboardLink').classList.add('active');
            pageTitle = 'Teacher Dashboard';
            loadDashboardStats();
            break;
        case 'createExam':
            document.getElementById('createExamContent').style.display = 'block';
            document.getElementById('createExamLink').classList.add('active');
            pageTitle = 'Create Exam';
            break;
        case 'myExams':
            document.getElementById('myExamsContent').style.display = 'block';
            document.getElementById('examsLink').classList.add('active');
            pageTitle = 'My Exams';
            loadMyExams();
            break;
        case 'results':
            document.getElementById('resultsContent').style.display = 'block';
            document.getElementById('resultsLink').classList.add('active');
            pageTitle = 'Exam Results';
            loadResults();
            break;
    }
    
    // Update page title
    const pageTitleElement = document.getElementById('pageTitle');
    if (pageTitleElement) {
        pageTitleElement.textContent = pageTitle;
    }
}

// Load dashboard statistics
function loadDashboardStats() {
    console.log('Loading dashboard stats...');
    
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    // Teacher's exams
    const teacherExams = exams.filter(exam => exam.teacherId === currentUser.id);
    
    // Calculate stats
    document.getElementById('totalExams').textContent = teacherExams.length;
    
    const students = users.filter(user => user.role === 'student').length;
    document.getElementById('totalStudents').textContent = students;
    
    const completed = submissions.filter(sub => {
        const exam = teacherExams.find(e => e.id === sub.examId);
        return exam && sub.status === 'completed';
    }).length;
    document.getElementById('completedExams').textContent = completed;
    
    const cheating = submissions.filter(sub => {
        const exam = teacherExams.find(e => e.id === sub.examId);
        return exam && sub.cheatingCount > 0;
    }).length;
    document.getElementById('cheatingCases').textContent = cheating;
    
    // Load recent exams
    const examsTable = document.getElementById('examsTable');
    if (examsTable) {
        const tbody = examsTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            teacherExams.slice(0, 5).forEach(exam => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${exam.title}</td>
                    <td>${new Date(exam.createdAt).toLocaleDateString()}</td>
                    <td>${exam.studentsWithAccess ? exam.studentsWithAccess.length : 0}</td>
                    <td><span class="status completed">Active</span></td>
                    <td>
                        <button class="btn btn-primary" onclick="viewExamDetails('${exam.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                `;
            });
        }
    }
}

// Question management
let questionCounter = 0;

function addMCQ() {
    questionCounter++;
    const container = document.getElementById('questionsContainer');
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    questionDiv.innerHTML = `
        <div class="input-group">
            <label>Question ${questionCounter} (MCQ)</label>
            <input type="text" class="question-text" placeholder="Enter question" required>
        </div>
        <div class="options-container">
            <div class="option-item">
                <input type="radio" name="correct${questionCounter}" value="0" required>
                <input type="text" class="option-text" placeholder="Option 1" required>
            </div>
            <div class="option-item">
                <input type="radio" name="correct${questionCounter}" value="1" required>
                <input type="text" class="option-text" placeholder="Option 2" required>
            </div>
            <div class="option-item">
                <input type="radio" name="correct${questionCounter}" value="2">
                <input type="text" class="option-text" placeholder="Option 3">
            </div>
            <div class="option-item">
                <input type="radio" name="correct${questionCounter}" value="3">
                <input type="text" class="option-text" placeholder="Option 4">
            </div>
        </div>
        <div class="input-group">
            <label>Marks</label>
            <input type="number" class="question-marks" value="1" min="1" required>
        </div>
        <button type="button" class="btn btn-danger" onclick="removeQuestion(this)">
            <i class="fas fa-trash"></i> Remove Question
        </button>
    `;
    
    container.appendChild(questionDiv);
}

function addShortAnswer() {
    questionCounter++;
    const container = document.getElementById('questionsContainer');
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    questionDiv.innerHTML = `
        <div class="input-group">
            <label>Question ${questionCounter} (Short Answer)</label>
            <input type="text" class="question-text" placeholder="Enter question" required>
        </div>
        <div class="input-group">
            <label>Expected Answer (Keywords)</label>
            <input type="text" class="expected-answer" placeholder="Enter expected keywords">
        </div>
        <div class="input-group">
            <label>Marks</label>
            <input type="number" class="question-marks" value="5" min="1" required>
        </div>
        <button type="button" class="btn btn-danger" onclick="removeQuestion(this)">
            <i class="fas fa-trash"></i> Remove Question
        </button>
    `;
    
    container.appendChild(questionDiv);
}

function removeQuestion(button) {
    const questionItem = button.closest('.question-item');
    if (questionItem) {
        questionItem.remove();
        questionCounter--;
        // Update question numbers
        const questions = document.querySelectorAll('.question-item');
        questions.forEach((question, index) => {
            const label = question.querySelector('label');
            if (label) {
                label.textContent = `Question ${index + 1}`;
            }
        });
        questionCounter = questions.length;
    }
}

// Toggle student selection based on access type
function toggleStudentSelection() {
    const accessType = document.getElementById('accessType').value;
    const studentSelection = document.getElementById('studentSelection');
    
    if (accessType === 'specific') {
        studentSelection.style.display = 'block';
        loadStudentsForSelection();
    } else {
        studentSelection.style.display = 'none';
    }
}

// Load students for selection
function loadStudentsForSelection() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const students = users.filter(user => user.role === 'student');
    const studentList = document.getElementById('studentList');
    
    if (!studentList) return;
    
    studentList.innerHTML = '';
    
    if (students.length === 0) {
        studentList.innerHTML = '<p style="color: #666; text-align: center;">No students registered yet.</p>';
        return;
    }
    
    students.forEach(student => {
        const studentDiv = document.createElement('div');
        studentDiv.className = 'student-item';
        studentDiv.style.marginBottom = '8px';
        studentDiv.style.padding = '8px';
        studentDiv.style.border = '1px solid #ddd';
        studentDiv.style.borderRadius = '4px';
        studentDiv.style.cursor = 'pointer';
        studentDiv.style.display = 'flex';
        studentDiv.style.alignItems = 'center';
        studentDiv.style.gap = '10px';
        
        studentDiv.innerHTML = `
            <input type="checkbox" id="student_${student.id}" value="${student.id}" style="cursor: pointer;">
            <label for="student_${student.id}" style="cursor: pointer; margin: 0; flex: 1;">
                <strong>${student.name}</strong> (${student.email})
            </label>
        `;
        
        studentDiv.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox') {
                const checkbox = this.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                this.style.backgroundColor = checkbox.checked ? 'rgba(67, 97, 238, 0.1)' : 'transparent';
            }
        });
        
        const checkbox = studentDiv.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', function() {
            studentDiv.style.backgroundColor = this.checked ? 'rgba(67, 97, 238, 0.1)' : 'transparent';
        });
        
        studentList.appendChild(studentDiv);
    });
}

// Handle Create Exam
function handleCreateExam() {
    console.log('Creating exam...');
    
    const title = document.getElementById('examTitle').value;
    const description = document.getElementById('examDescription').value;
    const duration = parseInt(document.getElementById('examDuration').value);
    const accessType = document.getElementById('accessType').value;
    
    // Get selected students if access is specific
    let allowedStudents = [];
    if (accessType === 'specific') {
        const selectedCheckboxes = document.querySelectorAll('#studentList input[type="checkbox"]:checked');
        selectedCheckboxes.forEach(checkbox => {
            allowedStudents.push(checkbox.value);
        });
        
        if (allowedStudents.length === 0) {
            alert('Please select at least one student for the exam!');
            return;
        }
    }
    
    // Collect questions
    const questions = [];
    const questionItems = document.querySelectorAll('.question-item');
    
    questionItems.forEach((item, index) => {
        const questionText = item.querySelector('.question-text').value;
        const marksInput = item.querySelector('.question-marks');
        const marks = marksInput ? parseInt(marksInput.value) : 1;
        
        // Check if it's MCQ or Short Answer
        const optionsContainer = item.querySelector('.options-container');
        if (optionsContainer) {
            // MCQ Question
            const optionElements = item.querySelectorAll('.option-text');
            const correctOption = item.querySelector(`input[name="correct${index + 1}"]:checked`);
            
            const options = [];
            optionElements.forEach((opt, optIndex) => {
                if (opt.value.trim()) {
                    options.push({
                        id: optIndex,
                        text: opt.value.trim(),
                        isCorrect: correctOption && parseInt(correctOption.value) === optIndex
                    });
                }
            });
            
            questions.push({
                id: index,
                type: 'mcq',
                text: questionText,
                options: options,
                marks: marks
            });
        } else {
            // Short Answer Question
            const expectedAnswerInput = item.querySelector('.expected-answer');
            const expectedAnswer = expectedAnswerInput ? expectedAnswerInput.value : '';
            
            questions.push({
                id: index,
                type: 'short',
                text: questionText,
                expectedAnswer: expectedAnswer,
                marks: marks
            });
        }
    });
    
    // Validate that there's at least one question
    if (questions.length === 0) {
        alert('Please add at least one question!');
        return;
    }
    
    // Generate unique exam code
    const examCode = generateExamCode();
    const examId = 'EXAM' + Date.now();
    
    // Create exam object with access control
    const newExam = {
        id: examId,
        examCode: examCode,
        title: title,
        description: description,
        duration: duration,
        questions: questions,
        teacherId: currentUser.id,
        teacherName: currentUser.name,
        createdAt: new Date().toISOString(),
        isActive: true,
        accessType: accessType,
        allowedStudents: allowedStudents,
        studentsWithAccess: [], // Will store students who actually access the exam
        totalAttempts: 0
    };
    
    // Save to localStorage
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    exams.push(newExam);
    localStorage.setItem('exams', JSON.stringify(exams));
    
    // Generate exam link
    const examLink = `${window.location.origin}/frontend/exam.html?code=${examCode}`;
    
    // Show modal with link
    const generatedLinkInput = document.getElementById('generatedLink');
    if (generatedLinkInput) {
        generatedLinkInput.value = examLink;
    }
    
    const modal = document.getElementById('examLinkModal');
    if (modal) {
        modal.style.display = 'flex';
    }
    
    // Reset form
    const form = document.getElementById('createExamForm');
    if (form) {
        form.reset();
    }
    
    const questionsContainer = document.getElementById('questionsContainer');
    if (questionsContainer) {
        questionsContainer.innerHTML = '';
    }
    questionCounter = 0;
    
    // Reset student selection
    document.getElementById('studentSelection').style.display = 'none';
    
    console.log('Exam created successfully:', newExam);
}

// Generate unique exam code
function generateExamCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function copyLink() {
    const linkInput = document.getElementById('generatedLink');
    if (linkInput) {
        linkInput.select();
        linkInput.setSelectionRange(0, 99999);
        
        // Get exam code from link
        const link = linkInput.value;
        const examCode = link.split('code=')[1];
        
        navigator.clipboard.writeText(link).then(() => {
            alert(`Link copied to clipboard!\n\nExam Code: ${examCode}\n\nShare this link with students.`);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            document.execCommand('copy');
            alert('Link copied to clipboard!');
        });
    }
}

function copyExamCode() {
    const linkInput = document.getElementById('generatedLink');
    if (linkInput) {
        const link = linkInput.value;
        const examCode = link.split('code=')[1];
        
        navigator.clipboard.writeText(examCode).then(() => {
            alert(`Exam code copied to clipboard!\n\nExam Code: ${examCode}\n\nStudents can enter this code to access the exam.`);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            // Fallback
            const tempInput = document.createElement('input');
            tempInput.value = examCode;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            alert('Exam code copied to clipboard!');
        });
    }
}

function loadMyExams() {
    console.log('Loading my exams...');
    
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    
    const teacherExams = exams.filter(exam => exam.teacherId === currentUser.id);
    const myExamsTable = document.getElementById('myExamsTable');
    
    if (myExamsTable) {
        const tbody = myExamsTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            teacherExams.forEach(exam => {
                const examSubmissions = submissions.filter(sub => sub.examId === exam.id);
                const row = tbody.insertRow();
                
                row.innerHTML = `
                    <td>${exam.title}</td>
                    <td>${new Date(exam.createdAt).toLocaleDateString()}</td>
                    <td>
                        <div><strong>${exam.examCode}</strong></div>
                        <small>exam.html?code=${exam.examCode}</small>
                    </td>
                    <td>${examSubmissions.length}/${exam.allowedStudents.length || '∞'}</td>
                    <td>
                        <button class="btn btn-primary" onclick="viewExamDetails('${exam.id}')">
                            <i class="fas fa-eye"></i> Details
                        </button>
                        <button class="btn btn-warning" onclick="copyExamLink('${exam.examCode}')">
                            <i class="fas fa-link"></i> Link
                        </button>
                        <button class="btn btn-danger" onclick="deleteExam('${exam.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
            });
        }
    }
}

// Function to copy exam link again
function copyExamLink(examCode) {
    const examLink = `${window.location.origin}/frontend/exam.html?code=${examCode}`;
    
    navigator.clipboard.writeText(examLink).then(() => {
        alert(`Link copied to clipboard!\n\nExam Code: ${examCode}\n\n${examLink}`);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        // Fallback
        const tempInput = document.createElement('input');
        tempInput.value = examLink;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        alert('Link copied to clipboard!');
    });
}

// Function to view exam details
function viewExamDetails(examId) {
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    const exam = exams.find(e => e.id === examId);
    
    if (!exam) {
        alert('Exam not found!');
        return;
    }
    
    let details = `📝 Exam Details\n`;
    details += `Title: ${exam.title}\n`;
    details += `Description: ${exam.description || 'None'}\n`;
    details += `Duration: ${exam.duration} minutes\n`;
    details += `Questions: ${exam.questions.length}\n`;
    details += `Total Marks: ${calculateTotalMarks(exam.questions)}\n`;
    details += `Exam Code: ${exam.examCode}\n`;
    details += `Access Type: ${exam.accessType === 'specific' ? 'Specific Students Only' : 'Anyone with Link'}\n`;
    details += `Created: ${new Date(exam.createdAt).toLocaleString()}\n\n`;
    
    details += `📊 Statistics\n`;
    const examSubmissions = submissions.filter(sub => sub.examId === examId);
    details += `Total Attempts: ${examSubmissions.length}\n`;
    
    if (exam.accessType === 'specific' && exam.allowedStudents.length > 0) {
        details += `\n👥 Allowed Students:\n`;
        exam.allowedStudents.forEach(studentId => {
            const student = users.find(u => u.id === studentId);
            if (student) {
                const hasAttempt = examSubmissions.some(sub => sub.studentId === studentId);
                details += `• ${student.name} (${student.email}) - ${hasAttempt ? '✓ Attempted' : '✗ Not attempted'}\n`;
            }
        });
    }
    
    details += `\n🔗 Exam Link:\n${window.location.origin}/frontend/exam.html?code=${exam.examCode}`;
    
    alert(details);
}

// Calculate total marks for an exam
function calculateTotalMarks(questions) {
    return questions.reduce((total, question) => total + (question.marks || 1), 0);
}

function loadResults() {
    console.log('Loading results...');
    
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    const teacherExams = exams.filter(exam => exam.teacherId === currentUser.id);
    const resultsTable = document.getElementById('resultsTable');
    
    if (resultsTable) {
        const tbody = resultsTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            submissions.forEach(submission => {
                const exam = teacherExams.find(e => e.id === submission.examId);
                if (exam) {
                    const student = users.find(u => u.id === submission.studentId);
                    const row = tbody.insertRow();
                    
                    row.innerHTML = `
                        <td>${student ? student.name : 'Unknown'}</td>
                        <td>${exam.title}</td>
                        <td>${submission.score || 'N/A'}</td>
                        <td>
                            <span class="status ${submission.cheatingCount > 0 ? 'cheating' : 'completed'}">
                                ${submission.cheatingCount > 0 ? 'Cheating Detected' : 'Completed'}
                            </span>
                        </td>
                        <td>${new Date(submission.submittedAt).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-primary" onclick="viewSubmission('${submission.id}')">
                                <i class="fas fa-file-alt"></i> Details
                            </button>
                        </td>
                    `;
                }
            });
        }
    }
}

function deleteExam(examId) {
    if (confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
        let exams = JSON.parse(localStorage.getItem('exams')) || [];
        exams = exams.filter(exam => exam.id !== examId);
        localStorage.setItem('exams', JSON.stringify(exams));
        
        // Also remove related submissions
        let submissions = JSON.parse(localStorage.getItem('submissions')) || [];
        submissions = submissions.filter(sub => sub.examId !== examId);
        localStorage.setItem('submissions', JSON.stringify(submissions));
        
        loadMyExams();
        loadDashboardStats();
        alert('Exam deleted successfully!');
    }
}

function viewSubmission(submissionId) {
    console.log('Viewing submission:', submissionId);
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const submission = submissions.find(sub => sub.id === submissionId);
    
    if (submission) {
        alert(`Submission Details:\nScore: ${submission.score || 'N/A'}\nCheating Count: ${submission.cheatingCount || 0}\nStatus: ${submission.status}`);
    } else {
        alert('Submission not found!');
    }
}

// Make logout function accessible globally
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
};

// Make other functions globally accessible
window.addMCQ = addMCQ;
window.addShortAnswer = addShortAnswer;
window.removeQuestion = removeQuestion;
window.closeModal = closeModal;
window.copyLink = copyLink;
window.copyExamCode = copyExamCode;
window.viewExamDetails = viewExamDetails;
window.copyExamLink = copyExamLink;
window.deleteExam = deleteExam;
window.viewSubmission = viewSubmission;
window.toggleStudentSelection = toggleStudentSelection;