// auth.js - COMPLETE UPDATED VERSION

// Initialize localStorage for users if not exists
if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify([]));
}

if (!localStorage.getItem('currentUser')) {
    localStorage.setItem('currentUser', JSON.stringify(null));
}

if (!localStorage.getItem('exams')) {
    localStorage.setItem('exams', JSON.stringify([]));
}

if (!localStorage.getItem('submissions')) {
    localStorage.setItem('submissions', JSON.stringify([]));
}

/* -------------------------------------------------
   REGISTRATION (REAL BACKEND)
-------------------------------------------------- */
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        const adminPassword = document.getElementById('adminPassword') ? document.getElementById('adminPassword').value : '';

        // Check admin password if role is admin
        if (role === 'admin') {
            const correctAdminPassword = "shingekinokyojin";
            
            if (!adminPassword) {
                showMessage('Admin password is required for admin registration!', 'error');
                return;
            }
            
            if (adminPassword !== correctAdminPassword) {
                showMessage('Invalid admin password! Only authorized personnel can create admin accounts.', 'error');
                return;
            }
        }

        try {
            console.log("📝 Attempting registration to backend...");
            
            const response = await fetch(`${window.API_BASE_URL}/auth/register`, {
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
                console.log("✅ Registration successful:", data.user);
                
                // Save token and user info
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                
                showMessage('Registration successful! Redirecting...', 'success');
                
                // Redirect based on role
                setTimeout(() => {
                    redirectBasedOnRole(data.user);
                }, 2000);
            } else {
                const errorData = await response.json();
                showMessage(errorData.detail || 'Registration failed!', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showMessage('Network error. Please try again.', 'error');
        }
    });
}

/* -------------------------------------------------
   LOGIN (REAL BACKEND)
-------------------------------------------------- */
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            console.log("🔐 Attempting login to backend...");
            
            // Using FormData for OAuth2 style login
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);
            
            const response = await fetch(`${window.API_BASE_URL}/auth/login`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log("✅ Login successful:", data.user);
                
                // Save token and user info
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                
                // Also save to local users for compatibility
                const users = JSON.parse(localStorage.getItem('users')) || [];
                const userExists = users.find(u => u.email === email);
                if (!userExists) {
                    users.push({
                        id: data.user.id,
                        name: data.user.name,
                        email: data.user.email,
                        role: data.user.role,
                        createdAt: new Date().toISOString(),
                        isActive: true,
                        lastLogin: new Date().toISOString()
                    });
                    localStorage.setItem('users', JSON.stringify(users));
                }
                
                redirectBasedOnRole(data.user);
            } else {
                const errorData = await response.json();
                showMessage(errorData.detail || 'Invalid email or password!', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Network error. Please try again.', 'error');
        }
    });
}

/* -------------------------------------------------
   UTILITY FUNCTIONS
-------------------------------------------------- */

function showMessage(text, type) {
    const div = document.getElementById('message');
    if (!div) return;
    
    div.textContent = text;
    div.className = `message ${type}`;
    div.style.display = "block";

    setTimeout(() => {
        div.style.display = 'none';
    }, 5000);
}

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const token = localStorage.getItem('token');
    
    if (!user || !token) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

function redirectBasedOnRole(user) {
    switch(user.role) {
        case 'teacher':
            window.location.href = 'teacher-dashboard.html';
            break;
        case 'student':
            window.location.href = 'student-dashboard.html';
            break;
        case 'admin':
            window.location.href = 'admin-dashboard.html';
            break;
        default:
            showMessage('Unknown user role!', 'error');
    }
}