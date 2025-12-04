// Check authentication
checkAuth();
const currentUser = getCurrentUser();
// Admin delete variables
let adminExamsToDelete = [];
let isAdminBatchDelete = false;

// Enhanced loadAllExams function with checkboxes
function loadAllExams() {
    console.log('Loading all exams...');
    
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
    
    // Reset batch delete
    adminExamsToDelete = [];
    adminUpdateDeleteButton();
    document.getElementById('adminSelectAllExams').checked = false;
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

// Admin confirm and delete exam(s)
function adminConfirmDeleteExam() {
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
    
    let deletedCount = 0;
    
    adminExamsToDelete.forEach(examId => {
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
    closeModal('adminDeleteExamModal');
    
    if (isAdminBatchDelete) {
        alert(`${deletedCount} exam(s) deleted successfully!`);
    } else {
        alert('Exam deleted successfully!');
    }
    
    // Refresh the view
    loadAllExams();
    loadAdminDashboard();
    
    // Reset
    adminExamsToDelete = [];
    isAdminBatchDelete = false;
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
            addNewUser();
        });
    }
    
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveUserChanges();
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
            loadCheatingCases();
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

// Load admin dashboard
function loadAdminDashboard() {
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
    
    // Count active sessions (simulated - in real app, this would come from server)
    const activeSessions = attempts.filter(att => att.status === 'in_progress').length;
    document.getElementById('activeSessions').textContent = activeSessions;
}

// Load recent activity
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
        totalSize += (key.length + value.length) * 2; // Approximate bytes (2 bytes per character for UTF-16)
    }
    
    // Convert to MB
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    // Calculate percentage (assuming 5MB limit for localStorage)
    const percentage = Math.min((sizeInMB / 5) * 100, 100);
    
    // Update display
    document.getElementById('storageBar').style.width = percentage + '%';
    document.getElementById('storageUsed').textContent = sizeInMB + ' MB / 5 MB';
    
    // Update system settings
    document.getElementById('dbStorage').textContent = sizeInMB + ' MB';
}

// Load users for management
let currentUserFilter = 'all';

function filterUsers(filter) {
    currentUserFilter = filter;
    loadUsers();
}

function loadUsers() {
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

// Add new user
function addNewUser() {
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
    
    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userExists = users.find(user => user.email === email);
    if (userExists) {
        alert('User with this email already exists!');
        return;
    }
    
    // Create new user
    const newUser = {
        id: 'USER' + Date.now(),
        name: name,
        email: email,
        password: password,
        role: role,
        status: status,
        createdAt: new Date().toISOString(),
        lastLogin: null
    };
    
    // Add to users array
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    // Close modal and refresh
    closeModal('addUserModal');
    alert('User created successfully!');
    loadUsers();
    loadAdminDashboard();
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

// Save user changes
function saveUserChanges() {
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
    
    // Update user
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        alert('User not found!');
        return;
    }
    
    // Check if email is being changed to an existing email
    if (email !== users[userIndex].email) {
        const emailExists = users.find(u => u.email === email && u.id !== userId);
        if (emailExists) {
            alert('Another user with this email already exists!');
            return;
        }
    }
    
    // Update user data
    users[userIndex].name = name;
    users[userIndex].email = email;
    users[userIndex].role = role;
    users[userIndex].status = status;
    
    // Update password if provided
    if (password) {
        users[userIndex].password = password;
    }
    
    localStorage.setItem('users', JSON.stringify(users));
    
    // Close modal and refresh
    closeModal('editUserModal');
    alert('User updated successfully!');
    loadUsers();
    loadAdminDashboard();
}

// Toggle user status
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

// Delete user
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

function loadAllExams() {
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
                        <button class="btn btn-primary" onclick="viewAdminExamDetails('${exam.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-danger" onclick="adminDeleteExam('${exam.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
            });
        }
    }
}

// View exam details (admin)
function viewAdminExamDetails(examId) {
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    const exam = exams.find(e => e.id === examId);
    
    if (!exam) {
        alert('Exam not found!');
        return;
    }
    
    const teacher = users.find(u => u.id === exam.teacherId);
    const examSubmissions = submissions.filter(sub => sub.examId === examId);
    const cheatingCases = examSubmissions.filter(sub => sub.cheatingCount > 0);
    
    let details = `
        <div style="margin-bottom: 20px;">
            <h4>${exam.title}</h4>
            <p>${exam.description || 'No description'}</p>
            <p><strong>Teacher:</strong> ${teacher ? teacher.name : 'Unknown'}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Status:</strong> ${exam.isActive ? 'Active' : 'Inactive'}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Access Type:</strong> ${exam.accessType === 'specific' ? 'Specific Students' : 'Anyone with Link'}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Exam Code:</strong> ${exam.examCode}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Duration:</strong> ${exam.duration} minutes
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Questions:</strong> ${exam.questions.length}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Total Marks:</strong> ${calculateTotalMarks(exam.questions)}
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
                    <div style="font-size: 24px; font-weight: bold;">${cheatingCases.length}</div>
                    <div>Cheating Cases</div>
                </div>
                <div style="text-align: center; padding: 15px; background: #e7f3ff; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold;">${exam.totalAttempts || 0}</div>
                    <div>Total Attempts</div>
                </div>
                <div style="text-align: center; padding: 15px; background: #e7f3ff; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold;">${exam.studentsWithAccess ? exam.studentsWithAccess.length : 0}</div>
                    <div>Students Accessed</div>
                </div>
            </div>
        </div>
    `;
    
    if (cheatingCases.length > 0) {
        details += `
            <div style="margin-bottom: 20px;">
                <h5>Cheating Cases (${cheatingCases.length})</h5>
                <div style="max-height: 200px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 8px; text-align: left;">Student</th>
                                <th style="padding: 8px; text-align: left;">Warnings</th>
                                <th style="padding: 8px; text-align: left;">Score</th>
                                <th style="padding: 8px; text-align: left;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        cheatingCases.forEach(submission => {
            const student = users.find(u => u.id === submission.studentId);
            const percentage = submission.totalMarks ? 
                Math.round((submission.score / submission.totalMarks) * 100) : 0;
            
            details += `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${student ? student.name : 'Unknown'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${submission.cheatingCount}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${submission.score || 0}/${submission.totalMarks || 'N/A'} (${percentage}%)</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                        <span style="padding: 3px 8px; border-radius: 12px; font-size: 12px; background: #f8d7da; color: #721c24">
                            Cheating Detected
                        </span>
                    </td>
                </tr>
            `;
        });
        
        details += `</tbody></table></div>`;
    }
    
    details += `
        <div style="text-align: center; margin-top: 20px;">
            <button class="btn btn-primary" onclick="copyExamLink('${exam.examCode}')" style="margin-right: 10px;">
                <i class="fas fa-link"></i> Copy Exam Link
            </button>
            <button class="btn btn-secondary" onclick="closeModal('examDetailsModal')">
                Close
            </button>
        </div>
    `;
    
    // Create a modal for viewing (reusing teacher's modal)
    const modalContent = `
        <div class="modal-header">
            <h3>${exam.title} - Admin View</h3>
            <button class="close-modal" onclick="closeModal('examDetailsModal')">&times;</button>
        </div>
        <div>${details}</div>
    `;
    
    // Create or reuse modal
    let modal = document.getElementById('examDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'examDetailsModal';
        modal.innerHTML = `<div class="modal-content" style="max-width: 800px;">${modalContent}</div>`;
        document.body.appendChild(modal);
    } else {
        modal.querySelector('.modal-content').innerHTML = modalContent;
    }
    
    modal.style.display = 'flex';
}

// Delete exam (admin)
function adminDeleteExam(examId) {
    if (confirm('Are you sure you want to delete this exam? This will also delete all submissions for this exam.')) {
        const exams = JSON.parse(localStorage.getItem('exams')) || [];
        const examIndex = exams.findIndex(e => e.id === examId);
        
        if (examIndex === -1) {
            alert('Exam not found!');
            return;
        }
        
        // Remove exam
        exams.splice(examIndex, 1);
        localStorage.setItem('exams', JSON.stringify(exams));
        
        // Remove submissions for this exam
        const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
        const filteredSubmissions = submissions.filter(sub => sub.examId !== examId);
        localStorage.setItem('submissions', JSON.stringify(filteredSubmissions));
        
        // Remove attempts for this exam
        const attempts = JSON.parse(localStorage.getItem('examAttempts')) || [];
        const filteredAttempts = attempts.filter(att => att.examId !== examId);
        localStorage.setItem('examAttempts', JSON.stringify(filteredAttempts));
        
        alert('Exam deleted successfully!');
        loadAllExams();
        loadAdminDashboard();
    }
}

// Load cheating cases
let currentCheatingFilter = 'all';

function filterCheatingCases(filter) {
    currentCheatingFilter = filter;
    loadCheatingCases();
}

function loadCheatingCases() {
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    // Get cheating cases
    let cheatingCases = submissions.filter(sub => sub.cheatingCount > 0);
    
    // Apply filters
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    if (currentCheatingFilter === 'today') {
        cheatingCases = cheatingCases.filter(sub => {
            const subDate = new Date(sub.submittedAt);
            return subDate >= today;
        });
    } else if (currentCheatingFilter === 'week') {
        cheatingCases = cheatingCases.filter(sub => {
            const subDate = new Date(sub.submittedAt);
            return subDate >= weekAgo;
        });
    } else if (currentCheatingFilter === 'serious') {
        cheatingCases = cheatingCases.filter(sub => sub.cheatingCount >= 3);
    } else if (currentCheatingFilter === 'warning') {
        cheatingCases = cheatingCases.filter(sub => sub.cheatingCount < 3);
    }
    
    // Sort by date (newest first)
    cheatingCases.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    // Update statistics
    const totalCases = submissions.filter(sub => sub.cheatingCount > 0).length;
    const uniqueStudents = [...new Set(cheatingCases.map(sub => sub.studentId))];
    const uniqueExams = [...new Set(cheatingCases.map(sub => sub.examId))];
    const todaysCasesCount = submissions.filter(sub => {
        const subDate = new Date(sub.submittedAt);
        return sub.cheatingCount > 0 && subDate >= today;
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
            
            cheatingCases.forEach(submission => {
                const student = users.find(u => u.id === submission.studentId);
                const exam = exams.find(e => e.id === submission.examId);
                const teacher = exam ? users.find(u => u.id === exam.teacherId) : null;
                
                if (student && exam && teacher) {
                    const row = tbody.insertRow();
                    
                    // Determine severity
                    let severity = 'Low';
                    let severityColor = '#28a745';
                    if (submission.cheatingCount >= 3) {
                        severity = 'High';
                        severityColor = '#dc3545';
                    } else if (submission.cheatingCount >= 2) {
                        severity = 'Medium';
                        severityColor = '#ffc107';
                    }
                    
                    row.innerHTML = `
                        <td>
                            <div><strong>${student.name}</strong></div>
                            <small>${student.email}</small>
                        </td>
                        <td>${exam.title}</td>
                        <td>${teacher.name}</td>
                        <td>${new Date(submission.submittedAt).toLocaleString()}</td>
                        <td>
                            <span class="status cheating">${submission.cheatingCount} warning(s)</span>
                        </td>
                        <td>
                            <span style="color: ${severityColor}; font-weight: bold;">${severity}</span>
                        </td>
                        <td>
                            <span class="status ${submission.cheatingCount >= 3 ? 'cheating' : 'pending'}">
                                ${submission.cheatingCount >= 3 ? 'Auto-Submitted' : 'Warning Only'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-primary" onclick="viewCheatingDetails('${submission.id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </td>
                    `;
                }
            });
            
            if (cheatingCases.length === 0) {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td colspan="8" class="text-center" style="padding: 40px;">
                        <i class="fas fa-check-circle" style="font-size: 48px; color: #28a745; margin-bottom: 20px;"></i>
                        <h3>No cheating cases found</h3>
                        <p>${currentCheatingFilter === 'all' ? 'No cheating detected in the system.' : 
                            `No ${currentCheatingFilter} cheating cases found.`}</p>
                    </td>
                `;
            }
        }
    }
}

// View cheating details
function viewCheatingDetails(submissionId) {
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    const submission = submissions.find(sub => sub.id === submissionId);
    
    if (!submission) {
        alert('Submission not found!');
        return;
    }
    
    const student = users.find(u => u.id === submission.studentId);
    const exam = exams.find(e => e.id === submission.examId);
    const teacher = exam ? users.find(u => u.id === exam.teacherId) : null;
    
    if (!student || !exam || !teacher) {
        alert('Could not find details for this case!');
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
            <h4>Cheating Case Details</h4>
            <p><strong>Exam:</strong> ${exam.title}</p>
            <p><strong>Student:</strong> ${student.name} (${student.email})</p>
            <p><strong>Teacher:</strong> ${teacher.name}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Total Warnings:</strong> ${submission.cheatingCount}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Status:</strong> ${submission.cheatingCount >= 3 ? 'Auto-Submitted' : 'Warning Only'}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Score:</strong> ${submission.score || 0}/${submission.totalMarks || 'N/A'} (${percentage}%)
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Duration:</strong> ${duration}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Started:</strong> ${new Date(submission.startedAt).toLocaleString()}
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <strong>Submitted:</strong> ${new Date(submission.submittedAt).toLocaleString()}
            </div>
        </div>
    `;
    
    if (submission.warnings && submission.warnings.length > 0) {
        details += `
            <div style="margin-bottom: 20px;">
                <h5>Warning Details</h5>
                <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 10px;">
        `;
        
        submission.warnings.forEach((warning, index) => {
            let warningColor = '#ffc107';
            let warningIcon = 'fa-exclamation-triangle';
            
            if (warning.type.includes('serious') || warning.type.includes('multiple')) {
                warningColor = '#dc3545';
                warningIcon = 'fa-times-circle';
            } else if (warning.type.includes('face') || warning.type.includes('audio')) {
                warningColor = '#fd7e14';
                warningIcon = 'fa-microphone-slash';
            }
            
            details += `
                <div style="margin-bottom: 10px; padding: 10px; background: ${warningColor}10; border-left: 4px solid ${warningColor}; border-radius: 4px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <i class="fas ${warningIcon}" style="color: ${warningColor};"></i>
                        <strong>Warning ${index + 1}: ${warning.type}</strong>
                    </div>
                    <div style="margin-left: 26px;">
                        <div>${warning.message}</div>
                        <small>${new Date(warning.timestamp).toLocaleString()}</small>
                    </div>
                </div>
            `;
        });
        
        details += `</div></div>`;
    }
    
    details += `
        <div style="text-align: center; margin-top: 20px;">
            <button class="btn btn-primary" onclick="contactStudent('${student.email}')" style="margin-right: 10px;">
                <i class="fas fa-envelope"></i> Contact Student
            </button>
            <button class="btn btn-warning" onclick="contactTeacher('${teacher.email}')" style="margin-right: 10px;">
                <i class="fas fa-chalkboard-teacher"></i> Contact Teacher
            </button>
            <button class="btn btn-secondary" onclick="closeModal('cheatingDetailsModal')">
                Close
            </button>
        </div>
    `;
    
    document.getElementById('cheatingDetailsContent').innerHTML = details;
    document.getElementById('cheatingDetailsModal').style.display = 'flex';
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
    
    // Filter data based on date range
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const exams = JSON.parse(localStorage.getItem('exams')) || [];
    const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
    
    // Generate report based on type
    let reportTitle = '';
    let reportData = '';
    
    switch(reportType) {
        case 'user_activity':
            reportTitle = 'User Activity Report';
            reportData = generateUserActivityReport(users, exams, submissions, fromDate, toDate);
            break;
        case 'exam_performance':
            reportTitle = 'Exam Performance Report';
            reportData = generateExamPerformanceReport(exams, submissions, fromDate, toDate);
            break;
        case 'cheating_analysis':
            reportTitle = 'Cheating Analysis Report';
            reportData = generateCheatingAnalysisReport(submissions, exams, users, fromDate, toDate);
            break;
        case 'system_usage':
            reportTitle = 'System Usage Report';
            reportData = generateSystemUsageReport(users, exams, submissions, fromDate, toDate);
            break;
    }
    
    // Display preview
    document.getElementById('reportContent').innerHTML = reportData;
    document.getElementById('reportPreview').style.display = 'block';
    
    // Scroll to preview
    document.getElementById('reportPreview').scrollIntoView({ behavior: 'smooth' });
    
    // Show download option
    if (reportFormat !== 'html') {
        setTimeout(() => {
            alert(`Report generated! In a real application, this would download as ${reportFormat.toUpperCase()}.`);
        }, 500);
    }
}

// Generate user activity report
function generateUserActivityReport(users, exams, submissions, fromDate, toDate) {
    // Filter users created in date range
    const newUsers = users.filter(user => {
        const userDate = new Date(user.createdAt);
        return userDate >= fromDate && userDate <= toDate;
    });
    
    // Filter submissions in date range
    const recentSubmissions = submissions.filter(sub => {
        const subDate = new Date(sub.submittedAt);
        return subDate >= fromDate && subDate <= toDate;
    });
    
    // Filter exams created in date range
    const recentExams = exams.filter(exam => {
        const examDate = new Date(exam.createdAt);
        return examDate >= fromDate && examDate <= toDate;
    });
    
    let report = `
        <h4>User Activity Report</h4>
        <p><strong>Date Range:</strong> ${fromDate.toLocaleDateString()} to ${toDate.toLocaleDateString()}</p>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">
            <div style="text-align: center; padding: 20px; background: #e7f3ff; border-radius: 8px;">
                <div style="font-size: 32px; font-weight: bold;">${newUsers.length}</div>
                <div>New Users</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #e7f3ff; border-radius: 8px;">
                <div style="font-size: 32px; font-weight: bold;">${recentSubmissions.length}</div>
                <div>Submissions</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #e7f3ff; border-radius: 8px;">
                <div style="font-size: 32px; font-weight: bold;">${recentExams.length}</div>
                <div>New Exams</div>
            </div>
        </div>
        
        <h5>New Users by Role</h5>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background: #f8f9fa;">
                    <th style="padding: 10px; text-align: left;">Role</th>
                    <th style="padding: 10px; text-align: left;">Count</th>
                    <th style="padding: 10px; text-align: left;">Percentage</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    const roles = ['student', 'teacher', 'admin'];
    roles.forEach(role => {
        const count = newUsers.filter(user => user.role === role).length;
        const percentage = newUsers.length > 0 ? ((count / newUsers.length) * 100).toFixed(1) : 0;
        
        report += `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${role.charAt(0).toUpperCase() + role.slice(1)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${count}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${percentage}%</td>
            </tr>
        `;
    });
    
    report += `</tbody></table>`;
    
    // Show top 10 active users
    const userActivity = {};
    recentSubmissions.forEach(sub => {
        if (!userActivity[sub.studentId]) {
            userActivity[sub.studentId] = 0;
        }
        userActivity[sub.studentId]++;
    });
    
    const topUsers = Object.entries(userActivity)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    if (topUsers.length > 0) {
        report += `
            <h5>Top 10 Active Users</h5>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 10px; text-align: left;">User</th>
                        <th style="padding: 10px; text-align: left;">Submissions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        topUsers.forEach(([userId, count]) => {
            const user = users.find(u => u.id === userId);
            if (user) {
                report += `
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${user.name} (${user.email})</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${count}</td>
                    </tr>
                `;
            }
        });
        
        report += `</tbody></table>`;
    }
    
    report += `
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn btn-primary" onclick="downloadReport('user_activity')">
                <i class="fas fa-download"></i> Download Report
            </button>
        </div>
    `;
    
    return report;
}

// Other report generation functions would be similar...
// For brevity, I'll show the structure for one more:

function generateExamPerformanceReport(exams, submissions, fromDate, toDate) {
    // Filter submissions in date range
    const recentSubmissions = submissions.filter(sub => {
        const subDate = new Date(sub.submittedAt);
        return subDate >= fromDate && subDate <= toDate;
    });
    
    // Filter exams with submissions in date range
    const activeExams = exams.filter(exam => 
        recentSubmissions.some(sub => sub.examId === exam.id)
    );
    
    let report = `
        <h4>Exam Performance Report</h4>
        <p><strong>Date Range:</strong> ${fromDate.toLocaleDateString()} to ${toDate.toLocaleDateString()}</p>
        <p><strong>Exams Analyzed:</strong> ${activeExams.length}</p>
        <p><strong>Total Submissions:</strong> ${recentSubmissions.length}</p>
        
        <h5>Top Performing Exams</h5>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background: #f8f9fa;">
                    <th style="padding: 10px; text-align: left;">Exam</th>
                    <th style="padding: 10px; text-align: left;">Teacher</th>
                    <th style="padding: 10px; text-align: left;">Submissions</th>
                    <th style="padding: 10px; text-align: left;">Avg. Score</th>
                    <th style="padding: 10px; text-align: left;">Cheating Cases</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Calculate average scores for each exam
    const examStats = {};
    
    activeExams.forEach(exam => {
        const examSubmissions = recentSubmissions.filter(sub => sub.examId === exam.id);
        const cheatingCases = examSubmissions.filter(sub => sub.cheatingCount > 0).length;
        
        let totalScore = 0;
        let totalMarks = 0;
        let validSubmissions = 0;
        
        examSubmissions.forEach(sub => {
            if (sub.score !== undefined && sub.totalMarks) {
                totalScore += sub.score;
                totalMarks += sub.totalMarks;
                validSubmissions++;
            }
        });
        
        const avgScore = validSubmissions > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
        
        examStats[exam.id] = {
            exam: exam,
            submissions: examSubmissions.length,
            avgScore: avgScore,
            cheatingCases: cheatingCases
        };
    });
    
    // Sort by average score (highest first)
    const sortedExams = Object.values(examStats).sort((a, b) => b.avgScore - a.avgScore);
    
    sortedExams.slice(0, 10).forEach(stat => {
        const teacher = getCurrentUser(); // In real app, get teacher from users array
        report += `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${stat.exam.title}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${stat.exam.teacherName}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${stat.submissions}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${stat.avgScore}%</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${stat.cheatingCases}</td>
            </tr>
        `;
    });
    
    report += `</tbody></table>`;
    
    return report;
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
    // Same as above, just different function name for clarity
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
window.editUser = editUser;
window.toggleUserStatus = toggleUserStatus;
window.deleteUser = deleteUser;
window.filterAllExams = filterAllExams;
window.viewAdminExamDetails = viewAdminExamDetails;
window.adminDeleteExam = adminDeleteExam;
window.filterCheatingCases = filterCheatingCases;
window.viewCheatingDetails = viewCheatingDetails;
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
        window.location.href = 'index.html';
    }
};