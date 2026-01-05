// Check authentication
checkAuth();
const currentUser = getCurrentUser();

// ✅ BACKEND API CONFIGURATION
const API_BASE_URL = window.API_BASE_URL || "https://probable-space-goggles-8000.preview.app.github.dev/api";
const token = localStorage.getItem('token');
console.log("🌐 Admin using API:", API_BASE_URL);

// Admin delete variables
let adminExamsToDelete = [];
let isAdminBatchDelete = false;

// Enhanced loadAllExams function with checkboxes
async function loadAllExams() {
    console.log('Loading all exams...');
    
    try {
        // ✅ FETCH FROM BACKEND
        const response = await fetch(`${API_BASE_URL}/admin/exams`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const exams = await response.json();
            
            // Filter exams
            let filteredExams = [...exams];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (currentExamFilter === 'active') {
                filteredExams = exams.filter(exam => exam.is_active);
            } else if (currentExamFilter === 'inactive') {
                filteredExams = exams.filter(exam => !exam.is_active);
            } else if (currentExamFilter === 'today') {
                filteredExams = exams.filter(exam => {
                    const examDate = new Date(exam.created_at);
                    examDate.setHours(0, 0, 0, 0);
                    return examDate.getTime() === today.getTime();
                });
            }
            
            // Display exams
            const allExamsTable = document.getElementById('allExamsTable');
            if (allExamsTable) {
                const tbody = allExamsTable.getElementsByTagName('tbody')[0];
                if (tbody) {
                    tbody.innerHTML = '';
                    
                    filteredExams.forEach(exam => {
                        const row = tbody.insertRow();
                        
                        row.innerHTML = `
                            <td>
                                <input type="checkbox" class="admin-exam-checkbox" value="${exam.id}" onchange="adminUpdateDeleteButton()">
                            </td>
                            <td><strong>${exam.title}</strong></td>
                            <td>${exam.teacher || 'Unknown'}</td>
                            <td>
                                <span class="status ${exam.is_active ? 'completed' : 'inactive'}">
                                    ${exam.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>${new Date(exam.created_at).toLocaleDateString()}</td>
                            <td>${exam.duration} min</td>
                            <td>${exam.questions_count || 0}</td>
                            <td>${exam.submissions?.unique_students || 0}</td>
                            <td>${exam.submissions?.total || 0}</td>
                            <td>
                                <span class="status ${exam.cheating?.cases > 0 ? 'cheating' : 'completed'}">
                                    ${exam.cheating?.cases || 0}
                                </span>
                            </td>
                            <td>
                                <div style="display: flex; gap: 5px;">
                                    <button class="btn btn-primary" onclick="viewAdminExamDetails('${exam.id}')" title="View Details">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-danger" onclick="adminDeleteExamBackend('${exam.id}', '${exam.title}')" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        `;
                    });
                }
            }
        } else {
            console.warn("Could not fetch exams from backend, using localStorage");
            loadAllExamsFallback();
        }
    } catch (error) {
        console.error("Error loading exams:", error);
        loadAllExamsFallback();
    }
    
    // Reset batch delete
    adminExamsToDelete = [];
    adminUpdateDeleteButton();
    document.getElementById('adminSelectAllExams').checked = false;
}

// Fallback function
function loadAllExamsFallback() {
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    // Filter exams
    let filteredExams = [...exams];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (currentExamFilter === 'active') {
        filteredExams = exams.filter(exam => exam.isActive);
    } else if (currentExamFilter === 'inactive') {
        filteredExams = exams.filter(exam => !exam.isActive);
    } else if (currentExamFilter === 'today') {
        filteredExams = exams.filter(exam => {
            const examDate = new Date(exam.createdAt);
            examDate.setHours(0, 0, 0, 0);
            return examDate.getTime() === today.getTime();
        });
    }
    
    // Display exams
    const allExamsTable = document.getElementById('allExamsTable');
    if (allExamsTable) {
        const tbody = allExamsTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            filteredExams.forEach(exam => {
                const teacher = users.find(u => u.id === exam.teacherId);
                const examSubmissions = submissions.filter(sub => sub.examId === exam.id);
                const cheatingCases = examSubmissions.filter(sub => sub.cheatingCount > 0).length;
                const uniqueStudents = [...new Set(examSubmissions.map(sub => sub.studentId))];
                
                const row = tbody.insertRow();
                
                row.innerHTML = `
                    <td>
                        <input type="checkbox" class="admin-exam-checkbox" value="${exam.id}" onchange="adminUpdateDeleteButton()">
                    </td>
                    <td><strong>${exam.title}</strong></td>
                    <td>${teacher ? teacher.name : 'Unknown'}</td>
                    <td>
                        <span class="status ${exam.isActive ? 'completed' : 'inactive'}">
                            ${exam.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>${new Date(exam.createdAt).toLocaleDateString()}</td>
                    <td>${exam.duration} min</td>
                    <td>${exam.questions.length}</td>
                    <td>${uniqueStudents.length}</td>
                    <td>${examSubmissions.length}</td>
                    <td>
                        <span class="status ${cheatingCases > 0 ? 'cheating' : 'completed'}">
                            ${cheatingCases}
                        </span>
                    </td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn btn-primary" onclick="viewAdminExamDetails('${exam.id}')" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-danger" onclick="adminDeleteSingleExam('${exam.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
            });
        }
    }
}

// Admin toggle select all exams
function adminToggleSelectAllExams(checkbox) {
    const examCheckboxes = document.querySelectorAll('.admin-exam-checkbox');
    examCheckboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
    
    adminUpdateDeleteButton();
}

// Admin update delete button
function adminUpdateDeleteButton() {
    const examCheckboxes = document.querySelectorAll('.admin-exam-checkbox:checked');
    const deleteMultipleBtn = document.getElementById('adminDeleteMultipleBtn');
    
    if (examCheckboxes.length > 0) {
        deleteMultipleBtn.style.display = 'inline-block';
    } else {
        deleteMultipleBtn.style.display = 'none';
    }
}

// Admin delete single exam
function adminDeleteSingleExam(examId) {
    adminExamsToDelete = [examId];
    isAdminBatchDelete = false;
    
    // Find exam details
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const exam = exams.find(e => e.id === examId);
    
    if (exam) {
        document.getElementById('adminDeleteExamTitle').textContent = `Delete: ${exam.title}`;
        document.getElementById('adminMultipleDeleteInfo').style.display = 'none';
    }
    
    document.getElementById('adminDeleteExamModal').style.display = 'flex';
}

// Admin delete multiple exams
function adminDeleteMultipleExams() {
    const examCheckboxes = document.querySelectorAll('.admin-exam-checkbox:checked');
    adminExamsToDelete = Array.from(examCheckboxes).map(cb => cb.value);
    
    if (adminExamsToDelete.length === 0) {
        alert('Please select at least one exam to delete.');
        return;
    }
    
    isAdminBatchDelete = true;
    
    // Update modal for multiple delete
    document.getElementById('adminDeleteExamTitle').textContent = 'Delete Multiple Exams';
    document.getElementById('adminSelectedExamCount').textContent = adminExamsToDelete.length;
    document.getElementById('adminMultipleDeleteInfo').style.display = 'block';
    
    document.getElementById('adminDeleteExamModal').style.display = 'flex';
}

// Admin confirm and delete exam(s) - BACKEND VERSION
async function adminConfirmDeleteExam() {
    try {
        if (isAdminBatchDelete) {
            // Delete multiple exams
            for (const examId of adminExamsToDelete) {
                const response = await fetch(`${API_BASE_URL}/admin/exam/${examId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error(`Error deleting exam ${examId}:`, errorData);
                }
            }
            
            alert(`${adminExamsToDelete.length} exam(s) deleted successfully!`);
        } else {
            // Delete single exam
            const examId = adminExamsToDelete[0];
            const response = await fetch(`${API_BASE_URL}/admin/exam/${examId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                alert('Exam deleted successfully!');
            } else {
                const errorData = await response.json();
                alert('Error deleting exam: ' + (errorData.detail || 'Unknown error'));
            }
        }
        
        // Close modal
        closeModal('adminDeleteExamModal');
        
        // Refresh the view
        loadAllExams();
        loadAdminDashboard();
        
        // Reset
        adminExamsToDelete = [];
        isAdminBatchDelete = false;
        
    } catch (error) {
        console.error("Error deleting exam:", error);
        alert('Network error. Please try again.');
    }
}

// Delete exam via backend
async function adminDeleteExamBackend(examId, examTitle) {
    if (!confirm(`Are you sure you want to delete this exam?\n\nTitle: ${examTitle}`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/exam/${examId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(result.message || 'Exam deleted successfully!');
            loadAllExams();
            loadAdminDashboard();
        } else {
            const errorData = await response.json();
            alert('Error: ' + (errorData.detail || 'Could not delete exam'));
        }
    } catch (error) {
        console.error('Error deleting exam:', error);
        alert('Network error. Please try again.');
    }
}

// Verify user is admin
if (currentUser.role !== 'admin') {
    alert('Access denied! Admins only.');
    logout();
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize user info
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    
    // Navigation Event Listeners
    const dashboardLink = document.getElementById('dashboardLink');
    const usersLink = document.getElementById('usersLink');
    const examsLink = document.getElementById('examsLink');
    const cheatingLink = document.getElementById('cheatingLink');
    const reportsLink = document.getElementById('reportsLink');
    const systemLink = document.getElementById('systemLink');
    
    if (dashboardLink) {
        dashboardLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPage('dashboard');
        });
    }
    
    if (usersLink) {
        usersLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPage('users');
        });
    }
    
    if (examsLink) {
        examsLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPage('exams');
        });
    }
    
    if (cheatingLink) {
        cheatingLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPage('cheating');
        });
    }
    
    if (reportsLink) {
        reportsLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPage('reports');
        });
    }
    
    if (systemLink) {
        systemLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPage('system');
        });
    }
    
    // Form submissions
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addNewUserBackend();
        });
    }
    
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveUserChangesBackend();
        });
    }
    
    // Date range toggle
    const dateRangeSelect = document.getElementById('dateRange');
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', function() {
            const customDateRange = document.getElementById('customDateRange');
            if (this.value === 'custom') {
                customDateRange.style.display = 'block';
            } else {
                customDateRange.style.display = 'none';
            }
        });
    }
    
    // Initialize dashboard
    showPage('dashboard');
});

// Navigation function
function showPage(page) {
    console.log('Showing admin page:', page);
    
    // Hide all content sections
    const sections = ['dashboardContent', 'usersContent', 'examsContent', 'cheatingContent', 'reportsContent', 'systemContent'];
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
    let pageTitle = 'Admin Dashboard';
    
    switch(page) {
        case 'dashboard':
            document.getElementById('dashboardContent').style.display = 'block';
            document.getElementById('dashboardLink').classList.add('active');
            pageTitle = 'Admin Dashboard';
            loadAdminDashboard();
            break;
        case 'users':
            document.getElementById('usersContent').style.display = 'block';
            document.getElementById('usersLink').classList.add('active');
            pageTitle = 'User Management';
            loadUsers();
            break;
        case 'exams':
            document.getElementById('examsContent').style.display = 'block';
            document.getElementById('examsLink').classList.add('active');
            pageTitle = 'All Exams';
            loadAllExams();
            break;
        case 'cheating':
            document.getElementById('cheatingContent').style.display = 'block';
            document.getElementById('cheatingLink').classList.add('active');
            pageTitle = 'Cheating Cases';
            loadCheatingCasesBackend();
            break;
        case 'reports':
            document.getElementById('reportsContent').style.display = 'block';
            document.getElementById('reportsLink').classList.add('active');
            pageTitle = 'System Reports';
            loadReports();
            break;
        case 'system':
            document.getElementById('systemContent').style.display = 'block';
            document.getElementById('systemLink').classList.add('active');
            pageTitle = 'System Settings';
            loadSystemSettings();
            break;
    }
    
    // Update page title
    const pageTitleElement = document.getElementById('pageTitle');
    if (pageTitleElement) {
        pageTitleElement.textContent = pageTitle;
    }
}

// Load admin dashboard - BACKEND VERSION
async function loadAdminDashboard() {
    try {
        console.log("📊 Loading admin dashboard from backend...");
        
        const response = await fetch(`${API_BASE_URL}/admin/dashboard-stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            console.log("✅ Dashboard stats loaded:", stats);
            
            // Calculate statistics
            document.getElementById('totalUsers').textContent = stats.users.total;
            document.getElementById('totalExams').textContent = stats.exams.total;
            document.getElementById('totalSubmissions').textContent = stats.submissions.total;
            
            // Count cheating cases
            document.getElementById('cheatingCases').textContent = stats.cheating.total_cases;
            
            // Count teachers and students
            document.getElementById('totalTeachers').textContent = stats.users.teachers;
            document.getElementById('totalStudents').textContent = stats.users.students;
            
            // Load recent activity
            loadRecentActivityBackend(stats.recent_activities || []);
            
            // Calculate storage usage
            calculateStorageUsage();
            
            // Count active sessions
            document.getElementById('activeSessions').textContent = stats.submissions.in_progress || 0;
            
        } else {
            console.warn("Could not fetch dashboard stats, falling back to localStorage");
            loadAdminDashboardFallback();
        }
    } catch (error) {
        console.error("Error loading dashboard:", error);
        loadAdminDashboardFallback();
    }
}

// Fallback function
function loadAdminDashboardFallback() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
    
    // Calculate statistics
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalExams').textContent = exams.length;
    document.getElementById('totalSubmissions').textContent = submissions.length;
    
    // Count cheating cases
    const cheatingCases = submissions.filter(sub => sub.cheatingCount > 0).length;
    document.getElementById('cheatingCases').textContent = cheatingCases;
    
    // Count teachers and students
    const teachers = users.filter(user => user.role === 'teacher').length;
    const students = users.filter(user => user.role === 'student').length;
    document.getElementById('totalTeachers').textContent = teachers;
    document.getElementById('totalStudents').textContent = students;
    
    // Load recent activity
    loadRecentActivity();
    
    // Calculate storage usage
    calculateStorageUsage();
    
    // Count active sessions (simulated)
    const activeSessions = attempts.filter(att => att.status === 'in_progress').length;
    document.getElementById('activeSessions').textContent = activeSessions;
}

// Load recent activity from backend
function loadRecentActivityBackend(activities) {
    // Display in table
    const recentActivityTable = document.getElementById('recentActivityTable');
    if (recentActivityTable) {
        const tbody = recentActivityTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            activities.forEach(activity => {
                const row = tbody.insertRow();
                
                // Format time
                const time = new Date(activity.timestamp);
                const timeString = time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                row.innerHTML = `
                    <td>${activity.user || 'System'}</td>
                    <td>${activity.action}</td>
                    <td>${activity.details ? JSON.stringify(activity.details) : ''}</td>
                    <td>${timeString}</td>
                `;
            });
        }
    }
}

// Load recent activity (fallback)
function loadRecentActivity() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    
    // Combine activities
    const activities = [];
    
    // Add user registrations
    users.forEach(user => {
        activities.push({
            user: user.name,
            action: 'Registered',
            time: user.createdAt,
            type: 'user'
        });
    });
    
    // Add exam creations
    exams.forEach(exam => {
        const teacher = users.find(u => u.id === exam.teacherId);
        activities.push({
            user: teacher ? teacher.name : 'Unknown',
            action: `Created exam: ${exam.title}`,
            time: exam.createdAt,
            type: 'exam'
        });
    });
    
    // Add submissions
    submissions.forEach(submission => {
        const student = users.find(u => u.id === submission.studentId);
        const exam = exams.find(e => e.id === submission.examId);
        if (student && exam) {
            activities.push({
                user: student.name,
                action: `Submitted: ${exam.title}`,
                time: submission.submittedAt,
                type: 'submission'
            });
        }
    });
    
    // Sort by time (newest first) and take top 10
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentActivities = activities.slice(0, 10);
    
    // Display in table
    const recentActivityTable = document.getElementById('recentActivityTable');
    if (recentActivityTable) {
        const tbody = recentActivityTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            recentActivities.forEach(activity => {
                const row = tbody.insertRow();
                
                // Format time
                const time = new Date(activity.time);
                const timeString = time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                row.innerHTML = `
                    <td>${activity.user}</td>
                    <td>${activity.action}</td>
                    <td>${timeString}</td>
                `;
            });
        }
    }
}

// Calculate storage usage
function calculateStorageUsage() {
    // Calculate approximate storage usage
    let totalSize = 0;
    
    // Check each localStorage item
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        totalSize += (key.length + value.length) * 2; // Approximate bytes
    }
    
    // Convert to MB
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    // Calculate percentage (assuming 5MB limit for localStorage)
    const percentage = Math.min((sizeInMB / 5) * 100, 100);
    
    // Update display
    const storageBar = document.getElementById('storageBar');
    const storageUsed = document.getElementById('storageUsed');
    const dbStorage = document.getElementById('dbStorage');
    
    if (storageBar) storageBar.style.width = percentage + '%';
    if (storageUsed) storageUsed.textContent = sizeInMB + ' MB / 5 MB';
    if (dbStorage) dbStorage.textContent = sizeInMB + ' MB';
}

// Load users for management - BACKEND VERSION
let currentUserFilter = 'all';

function filterUsers(filter) {
    currentUserFilter = filter;
    loadUsers();
}

async function loadUsers() {
    console.log('Loading users from backend...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const users = await response.json();
            
            // Filter users
            let filteredUsers = [...users];
            
            if (currentUserFilter === 'student') {
                filteredUsers = users.filter(user => user.role === 'student');
            } else if (currentUserFilter === 'teacher') {
                filteredUsers = users.filter(user => user.role === 'teacher');
            } else if (currentUserFilter === 'admin') {
                filteredUsers = users.filter(user => user.role === 'admin');
            } else if (currentUserFilter === 'active') {
                filteredUsers = users.filter(user => user.status === 'active');
            } else if (currentUserFilter === 'inactive') {
                filteredUsers = users.filter(user => user.status === 'inactive');
            }
            
            // Display users
            const usersTable = document.getElementById('usersTable');
            if (usersTable) {
                const tbody = usersTable.getElementsByTagName('tbody')[0];
                if (tbody) {
                    tbody.innerHTML = '';
                    
                    filteredUsers.forEach(user => {
                        const row = tbody.insertRow();
                        
                        row.innerHTML = `
                            <td>${user.id}</td>
                            <td>
                                <div><strong>${user.name}</strong></div>
                                ${user.role === 'student' ? `<small>Email: ${user.email}</small>` : ''}
                            </td>
                            <td>${user.email}</td>
                            <td>
                                <span class="status ${user.role === 'admin' ? 'cheating' : user.role === 'teacher' ? 'completed' : 'pending'}">
                                    ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </span>
                            </td>
                            <td>
                                <span class="status ${user.status === 'active' ? 'completed' : 'inactive'}">
                                    ${user.status === 'active' ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>${new Date(user.created_at).toLocaleDateString()}</td>
                            <td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                            <td>
                                <div style="display: flex; gap: 5px;">
                                    <button class="btn btn-primary" onclick="editUserBackend('${user.id}')" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-warning" onclick="toggleUserStatusBackend('${user.id}', '${user.status}')" 
                                            title="${user.status === 'inactive' ? 'Activate' : 'Deactivate'}">
                                        <i class="fas ${user.status === 'inactive' ? 'fa-check' : 'fa-ban'}"></i>
                                    </button>
                                    ${user.id !== currentUser.id ? 
                                        `<button class="btn btn-danger" onclick="deleteUserBackend('${user.id}')" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>` : 
                                        `<button class="btn btn-secondary" disabled title="Cannot delete yourself">
                                            <i class="fas fa-trash"></i>
                                        </button>`
                                    }
                                </div>
                            </td>
                        `;
                    });
                }
            }
        } else {
            console.warn("Could not fetch users, falling back to localStorage");
            loadUsersFallback();
        }
    } catch (error) {
        console.error("Error loading users:", error);
        loadUsersFallback();
    }
}

// Fallback function
function loadUsersFallback() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    
    // Filter users
    let filteredUsers = [...users];
    
    if (currentUserFilter === 'student') {
        filteredUsers = users.filter(user => user.role === 'student');
    } else if (currentUserFilter === 'teacher') {
        filteredUsers = users.filter(user => user.role === 'teacher');
    } else if (currentUserFilter === 'admin') {
        filteredUsers = users.filter(user => user.role === 'admin');
    } else if (currentUserFilter === 'active') {
        filteredUsers = users.filter(user => user.status !== 'inactive');
    } else if (currentUserFilter === 'inactive') {
        filteredUsers = users.filter(user => user.status === 'inactive');
    }
    
    // Display users
    const usersTable = document.getElementById('usersTable');
    if (usersTable) {
        const tbody = usersTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            filteredUsers.forEach(user => {
                // Count submissions for this user
                const userSubmissions = submissions.filter(sub => sub.studentId === user.id).length;
                
                const row = tbody.insertRow();
                
                row.innerHTML = `
                    <td>${user.id.substring(0, 8)}...</td>
                    <td>
                        <div><strong>${user.name}</strong></div>
                        ${user.role === 'student' ? `<small>Submissions: ${userSubmissions}</small>` : ''}
                    </td>
                    <td>${user.email}</td>
                    <td>
                        <span class="status ${user.role === 'admin' ? 'cheating' : user.role === 'teacher' ? 'completed' : 'pending'}">
                            ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                    </td>
                    <td>
                        <span class="status ${user.status === 'active' || !user.status ? 'completed' : 'inactive'}">
                            ${user.status === 'active' || !user.status ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn btn-primary" onclick="editUser('${user.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-warning" onclick="toggleUserStatus('${user.id}')" 
                                    title="${user.status === 'inactive' ? 'Activate' : 'Deactivate'}">
                                <i class="fas ${user.status === 'inactive' ? 'fa-check' : 'fa-ban'}"></i>
                            </button>
                            ${user.id !== currentUser.id ? 
                                `<button class="btn btn-danger" onclick="deleteUser('${user.id}')" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>` : 
                                `<button class="btn btn-secondary" disabled title="Cannot delete yourself">
                                    <i class="fas fa-trash"></i>
                                </button>`
                            }
                        </div>
                    </td>
                `;
            });
        }
    }
}

// Show add user modal
function showAddUserModal() {
    document.getElementById('addUserForm').reset();
    document.getElementById('addUserModal').style.display = 'flex';
}

// Add new user - BACKEND VERSION
async function addNewUserBackend() {
    const name = document.getElementById('newUserName').value;
    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    const status = document.getElementById('newUserStatus').value;
    
    // Validate
    if (!name || !email || !password || !role) {
        alert('Please fill all required fields!');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password,
                name: name,
                role: role
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Close modal and refresh
            closeModal('addUserModal');
            alert('User created successfully!');
            loadUsers();
            loadAdminDashboard();
        } else {
            const errorData = await response.json();
            alert('Error creating user: ' + (errorData.detail || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Network error. Please try again.');
    }
}

// Edit user
function editUser(userId) {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        alert('User not found!');
        return;
    }
    
    // Fill form
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserRole').value = user.role;
    document.getElementById('editUserStatus').value = user.status || 'active';
    document.getElementById('editUserPassword').value = '';
    
    // Show modal
    document.getElementById('editUserModal').style.display = 'flex';
}

// Save user changes - BACKEND VERSION
async function saveUserChangesBackend() {
    const userId = document.getElementById('editUserId').value;
    const name = document.getElementById('editUserName').value;
    const email = document.getElementById('editUserEmail').value;
    const password = document.getElementById('editUserPassword').value;
    const role = document.getElementById('editUserRole').value;
    const status = document.getElementById('editUserStatus').value;
    
    // Validate
    if (!name || !email || !role) {
        alert('Please fill all required fields!');
        return;
    }
    
    try {
        // Note: You'll need to create a user update endpoint in your backend
        // For now, we'll show a message
        alert('User update functionality requires backend endpoint implementation.');
        
        // Close modal
        closeModal('editUserModal');
        
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Network error. Please try again.');
    }
}

// Toggle user status - BACKEND VERSION
async function toggleUserStatusBackend(userId, currentStatus) {
    if (userId === currentUser.id) {
        alert('You cannot deactivate yourself!');
        return;
    }
    
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    if (!confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this user?`)) {
        return;
    }
    
    try {
        // Note: You'll need to create a user status update endpoint
        // For now, we'll fall back to localStorage
        toggleUserStatus(userId);
        
    } catch (error) {
        console.error('Error updating user status:', error);
        toggleUserStatus(userId);
    }
}

// Delete user - BACKEND VERSION
async function deleteUserBackend(userId) {
    if (userId === currentUser.id) {
        alert('You cannot delete yourself!');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/user/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(result.message || 'User deleted successfully!');
            loadUsers();
            loadAdminDashboard();
        } else {
            const errorData = await response.json();
            alert('Error: ' + (errorData.detail || 'Could not delete user'));
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Network error. Please try again.');
    }
}

// Toggle user status (fallback)
function toggleUserStatus(userId) {
    if (userId === currentUser.id) {
        alert('You cannot deactivate yourself!');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        alert('User not found!');
        return;
    }
    
    const currentStatus = users[userIndex].status || 'active';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    if (confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this user?`)) {
        users[userIndex].status = newStatus;
        localStorage.setItem('users', JSON.stringify(users));
        
        alert(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
        loadUsers();
    }
}

// Delete user (fallback)
function deleteUser(userId) {
    if (userId === currentUser.id) {
        alert('You cannot delete yourself!');
        return;
    }
    
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            alert('User not found!');
            return;
        }
        
        // Check if user has any submissions
        const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
        const userSubmissions = submissions.filter(sub => sub.studentId === userId);
        
        if (userSubmissions.length > 0) {
            if (!confirm(`This user has ${userSubmissions.length} submission(s). Deleting will also remove all their data. Continue?`)) {
                return;
            }
            
            // Remove user's submissions
            const filteredSubmissions = submissions.filter(sub => sub.studentId !== userId);
            localStorage.setItem('submissions', JSON.stringify(filteredSubmissions));
            
            // Remove user's attempts
            const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
            const filteredAttempts = attempts.filter(att => att.studentId !== userId);
            localStorage.setItem('examAttempts', JSON.stringify(filteredAttempts));
        }
        
        // Remove user from allowed students in exams
        const exams = JSON.parse(localStorage.getItem('exams')) || [];
        exams.forEach(exam => {
            if (exam.allowedStudents && exam.allowedStudents.includes(userId)) {
                exam.allowedStudents = exam.allowedStudents.filter(id => id !== userId);
            }
            if (exam.studentsWithAccess && exam.studentsWithAccess.includes(userId)) {
                exam.studentsWithAccess = exam.studentsWithAccess.filter(id => id !== userId);
            }
        });
        localStorage.setItem('exams', JSON.stringify(exams));
        
        // Remove user
        const filteredUsers = users.filter(u => u.id !== userId);
        localStorage.setItem('users', JSON.stringify(filteredUsers));
        
        alert('User deleted successfully!');
        loadUsers();
        loadAdminDashboard();
    }
}

// Load all exams (admin view)
let currentExamFilter = 'all';

function filterAllExams(filter) {
    currentExamFilter = filter;
    loadAllExams();
}

// View exam details (admin)
function viewAdminExamDetails(examId) {
    // This would fetch exam details from backend
    alert('View exam details - would fetch from backend API\nExam ID: ' + examId);
}

// Load cheating cases - BACKEND VERSION
async function loadCheatingCasesBackend() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/cheating-cases`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const cases = await response.json();
            console.log("✅ Cheating cases loaded:", cases.length);
            
            // Update statistics
            const totalCases = cases.length;
            const uniqueStudents = [...new Set(cases.map(c => c.student.id))];
            const uniqueExams = [...new Set(cases.map(c => c.exam.id))];
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todaysCasesCount = cases.filter(c => {
                const caseDate = new Date(c.submission.submitted_at);
                caseDate.setHours(0, 0, 0, 0);
                return caseDate.getTime() === today.getTime();
            }).length;
            
            document.getElementById('totalCheatingCases').textContent = totalCases;
            document.getElementById('studentsInvolved').textContent = uniqueStudents.length;
            document.getElementById('examsAffected').textContent = uniqueExams.length;
            document.getElementById('todaysCases').textContent = todaysCasesCount;
            
            // Display cases
            const cheatingCasesTable = document.getElementById('cheatingCasesTable');
            if (cheatingCasesTable) {
                const tbody = cheatingCasesTable.getElementsByTagName('tbody')[0];
                if (tbody) {
                    tbody.innerHTML = '';
                    
                    cases.forEach(cheatingCase => {
                        const row = tbody.insertRow();
                        
                        // Determine severity
                        let severity = 'Low';
                        let severityColor = '#28a745';
                        if (cheatingCase.submission.cheating_count >= 3) {
                            severity = 'High';
                            severityColor = '#dc3545';
                        } else if (cheatingCase.submission.cheating_count >= 2) {
                            severity = 'Medium';
                            severityColor = '#ffc107';
                        }
                        
                        row.innerHTML = `
                            <td>
                                <div><strong>${cheatingCase.student.name}</strong></div>
                                <small>${cheatingCase.student.email}</small>
                            </td>
                            <td>${cheatingCase.exam.title}</td>
                            <td>${cheatingCase.teacher.name}</td>
                            <td>${new Date(cheatingCase.submission.submitted_at).toLocaleString()}</td>
                            <td>
                                <span class="status cheating">${cheatingCase.submission.cheating_count} warning(s)</span>
                            </td>
                            <td>
                                <span style="color: ${severityColor}; font-weight: bold;">${severity}</span>
                            </td>
                            <td>
                                <span class="status ${cheatingCase.submission.cheating_count >= 3 ? 'cheating' : 'pending'}">
                                    ${cheatingCase.submission.cheating_count >= 3 ? 'Auto-Submitted' : 'Warning Only'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-primary" onclick="viewCheatingDetailsBackend('${cheatingCase.submission.id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                            </td>
                        `;
                    });
                }
            }
        } else {
            console.warn("Could not fetch cheating cases, falling back to localStorage");
            loadCheatingCases();
        }
    } catch (error) {
        console.error("Error loading cheating cases:", error);
        loadCheatingCases();
    }
}

let currentCheatingFilter = 'all';

function filterCheatingCases(filter) {
    currentCheatingFilter = filter;
    loadCheatingCasesBackend();
}

// View cheating details backend
async function viewCheatingDetailsBackend(submissionId) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/cheating-cases/${submissionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const cheatingCase = await response.json();
            
            let details = `
                <div style="margin-bottom: 20px;">
                    <h4>Cheating Case Details</h4>
                    <p><strong>Exam:</strong> ${cheatingCase.exam.title}</p>
                    <p><strong>Student:</strong> ${cheatingCase.student.name} (${cheatingCase.student.email})</p>
                    <p><strong>Teacher:</strong> ${cheatingCase.teacher.name}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <strong>Total Warnings:</strong> ${cheatingCase.submission.cheating_count}
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <strong>Status:</strong> ${cheatingCase.submission.cheating_count >= 3 ? 'Auto-Submitted' : 'Warning Only'}
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <strong>Score:</strong> ${cheatingCase.submission.score || 0}/${cheatingCase.submission.total_marks || 'N/A'} (${cheatingCase.submission.percentage || 0}%)
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <strong>Duration:</strong> ${cheatingCase.submission.duration || 'N/A'}
                    </div>
                </div>
            `;
            
            if (cheatingCase.cheating_events && cheatingCase.cheating_events.length > 0) {
                details += `
                    <div style="margin-bottom: 20px;">
                        <h5>Cheating Events</h5>
                        <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 10px;">
                `;
                
                cheatingCase.cheating_events.forEach((event, index) => {
                    details += `
                        <div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                            <strong>Event ${index + 1}:</strong> ${event.type} (Severity: ${event.severity})
                            <div><small>${new Date(event.timestamp).toLocaleString()}</small></div>
                        </div>
                    `;
                });
                
                details += `</div></div>`;
            }
            
            document.getElementById('cheatingDetailsContent').innerHTML = details;
            document.getElementById('cheatingDetailsModal').style.display = 'flex';
            
        } else {
            alert('Could not load cheating case details');
            viewCheatingDetails(submissionId); // Fallback
        }
    } catch (error) {
        console.error("Error loading cheating details:", error);
        alert('Network error. Loading local data...');
        viewCheatingDetails(submissionId); // Fallback
    }
}

// Load reports
function loadReports() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    
    // Calculate quick stats
    const totalUsers = users.length;
    const totalExams = exams.length;
    const totalSubmissions = submissions.length;
    const cheatingCases = submissions.filter(sub => sub.cheatingCount > 0).length;
    const activeExams = exams.filter(exam => exam.isActive).length;
    const avgSubmissionsPerExam = totalExams > 0 ? (totalSubmissions / totalExams).toFixed(1) : 0;
    
    const quickStats = `
        <div style="margin-bottom: 15px;">
            <strong>Total Users:</strong> ${totalUsers}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 5px;">
                <small>Students: ${users.filter(u => u.role === 'student').length}</small>
                <small>Teachers: ${users.filter(u => u.role === 'teacher').length}</small>
            </div>
        </div>
        
        <div style="margin-bottom: 15px;">
            <strong>Exams:</strong> ${totalExams}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 5px;">
                <small>Active: ${activeExams}</small>
                <small>Submissions/Exam: ${avgSubmissionsPerExam}</small>
            </div>
        </div>
        
        <div style="margin-bottom: 15px;">
            <strong>Submissions:</strong> ${totalSubmissions}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 5px;">
                <small>Cheating Cases: ${cheatingCases}</small>
                <small>Success Rate: ${totalSubmissions > 0 ? Math.round(((totalSubmissions - cheatingCases) / totalSubmissions) * 100) : 0}%</small>
            </div>
        </div>
        
        <div>
            <strong>System Usage:</strong>
            <div style="margin-top: 5px;">
                <small>Storage: <span id="reportStorage">Calculating...</span></small>
            </div>
        </div>
    `;
    
    document.getElementById('quickStats').innerHTML = quickStats;
    
    // Calculate storage for report
    setTimeout(() => {
        calculateStorageUsage();
        const storageText = document.getElementById('storageUsed').textContent;
        document.getElementById('reportStorage').textContent = storageText;
    }, 100);
}

// Generate detailed report
function generateDetailedReport() {
    const reportType = document.getElementById('reportType').value;
    const dateRange = document.getElementById('dateRange').value;
    const reportFormat = document.getElementById('reportFormat').value;
    
    let fromDate, toDate;
    const now = new Date();
    
    if (dateRange === 'today') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        toDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (dateRange === 'week') {
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        toDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (dateRange === 'month') {
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        toDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (dateRange === 'custom') {
        const fromInput = document.getElementById('fromDate').value;
        const toInput = document.getElementById('toDate').value;
        
        if (!fromInput || !toInput) {
            alert('Please select both from and to dates!');
            return;
        }
        
        fromDate = new Date(fromInput);
        toDate = new Date(toInput);
        toDate.setHours(23, 59, 59, 999);
    }
    
    // For now, just show a message
    alert(`Report generated for ${reportType} (${dateRange})\n\nIn a real application, this would fetch data from the backend API.`);
    
    // Display preview placeholder
    document.getElementById('reportContent').innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-chart-bar" style="font-size: 64px; color: #4361ee; margin-bottom: 20px;"></i>
            <h4>Report Preview</h4>
            <p>Type: ${reportType}</p>
            <p>Date Range: ${dateRange}</p>
            <p>Format: ${reportFormat}</p>
            <p><small>In production, this would show actual data from the backend.</small></p>
        </div>
    `;
    document.getElementById('reportPreview').style.display = 'block';
}

// Load system settings
function loadSystemSettings() {
    // Load settings from localStorage or use defaults
    const settings = JSON.parse(localStorage.getItem('systemSettings')) || {
        maxWarnings: 3,
        cheatingSensitivity: 'medium',
        enableAudioDetection: true,
        enableFaceDetection: true,
        sessionTimeout: 30,
        examAutoSubmit: 5,
        maxExamDuration: 4,
        enableEmailNotifications: true
    };
    
    // Set form values
    document.getElementById('maxWarnings').value = settings.maxWarnings;
    document.getElementById('cheatingSensitivity').value = settings.cheatingSensitivity;
    document.getElementById('enableAudioDetection').checked = settings.enableAudioDetection;
    document.getElementById('enableFaceDetection').checked = settings.enableFaceDetection;
    document.getElementById('sessionTimeout').value = settings.sessionTimeout;
    document.getElementById('examAutoSubmit').value = settings.examAutoSubmit;
    document.getElementById('maxExamDuration').value = settings.maxExamDuration;
    document.getElementById('enableEmailNotifications').checked = settings.enableEmailNotifications;
}

// Save cheating detection settings
function saveCheatingSettings() {
    const settings = {
        maxWarnings: parseInt(document.getElementById('maxWarnings').value),
        cheatingSensitivity: document.getElementById('cheatingSensitivity').value,
        enableAudioDetection: document.getElementById('enableAudioDetection').checked,
        enableFaceDetection: document.getElementById('enableFaceDetection').checked,
        sessionTimeout: parseInt(document.getElementById('sessionTimeout').value),
        examAutoSubmit: parseInt(document.getElementById('examAutoSubmit').value),
        maxExamDuration: parseInt(document.getElementById('maxExamDuration').value),
        enableEmailNotifications: document.getElementById('enableEmailNotifications').checked
    };
    
    localStorage.setItem('systemSettings', JSON.stringify(settings));
    alert('Cheating detection settings saved successfully!');
}

// Save system configuration
function saveSystemConfig() {
    saveCheatingSettings();
}

// Backup database
function backupDatabase() {
    const backupData = {};
    
    // Get all data from localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        backupData[key] = localStorage.getItem(key);
    }
    
    // Create backup
    const backup = {
        timestamp: new Date().toISOString(),
        data: backupData
    };
    
    // Save backup
    const backups = JSON.parse(localStorage.getItem('backups')) || [];
    backups.push(backup);
    localStorage.setItem('backups', JSON.stringify(backups));
    
    // Create download link
    const dataStr = JSON.stringify(backup, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `exam-system-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    alert('Database backup created and downloaded!');
}

// Clear old data
function clearOldData() {
    if (confirm('This will clear all data older than 30 days. Are you sure?')) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Clear old submissions
        const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
        const recentSubmissions = submissions.filter(sub => {
            const subDate = new Date(sub.submittedAt);
            return subDate >= thirtyDaysAgo;
        });
        localStorage.setItem('submissions', JSON.stringify(recentSubmissions));
        
        // Clear old attempts
        const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
        const recentAttempts = attempts.filter(att => {
            const attDate = new Date(att.startedAt);
            return attDate >= thirtyDaysAgo;
        });
        localStorage.setItem('examAttempts', JSON.stringify(recentAttempts));
        
        alert('Old data cleared successfully!');
        calculateStorageUsage();
    }
}

// Reset system
function resetSystem() {
    if (confirm('⚠️ WARNING: This will delete ALL data including users, exams, and submissions. This action cannot be undone! Are you absolutely sure?')) {
        if (prompt('Type "RESET" to confirm:') === 'RESET') {
            // Clear all data
            localStorage.clear();
            
            // Reset to default state
            localStorage.setItem('users', JSON.stringify([]));
            localStorage.setItem('exams', JSON.stringify([]));
            localStorage.setItem('submissions', JSON.stringify([]));
            localStorage.setItem('examAttempts', JSON.stringify([]));
            localStorage.setItem('currentUser', JSON.stringify(null));
            
            alert('System reset complete! You will be logged out.');
            logout();
        }
    }
}

// Helper function to calculate total marks
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

// Contact functions (simulated)
function contactStudent(email) {
    alert(`In a real application, this would open an email composer to: ${email}`);
}

function contactTeacher(email) {
    alert(`In a real application, this would open an email composer to: ${email}`);
}

// Download report (simulated)
function downloadReport(type) {
    alert(`In a real application, this would download the ${type} report.`);
}

// Generate quick report (from dashboard)
function generateReport() {
    showPage('reports');
}

// Make functions globally accessible
window.showPage = showPage;
window.showAddUserModal = showAddUserModal;
window.closeModal = closeModal;
window.filterUsers = filterUsers;
window.editUserBackend = editUserBackend;
window.toggleUserStatusBackend = toggleUserStatusBackend;
window.deleteUserBackend = deleteUserBackend;
window.filterAllExams = filterAllExams;
window.viewAdminExamDetails = viewAdminExamDetails;
window.adminDeleteExamBackend = adminDeleteExamBackend;
window.filterCheatingCases = filterCheatingCases;
window.viewCheatingDetailsBackend = viewCheatingDetailsBackend;
window.generateReport = generateReport;
window.generateDetailedReport = generateDetailedReport;
window.saveCheatingSettings = saveCheatingSettings;
window.saveSystemConfig = saveSystemConfig;
window.backupDatabase = backupDatabase;
window.clearOldData = clearOldData;
window.resetSystem = resetSystem;
window.contactStudent = contactStudent;
window.contactTeacher = contactTeacher;
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }
};
window.adminToggleSelectAllExams = adminToggleSelectAllExams;
window.adminUpdateDeleteButton = adminUpdateDeleteButton;
window.adminDeleteSingleExam = adminDeleteSingleExam;
window.adminDeleteMultipleExams = adminDeleteMultipleExams;
window.adminConfirmDeleteExam = adminConfirmDeleteExam;
window.addNewUserBackend = addNewUserBackend;
window.saveUserChangesBackend = saveUserChangesBackend;