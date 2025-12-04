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
   REGISTRATION
-------------------------------------------------- */
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        const users = JSON.parse(localStorage.getItem('users'));

        const userExists = users.find(u => u.email === email);
        if (userExists) {
            showMessage('User with this email already exists!', 'error');
            return;
        }

        const newUser = {
            id: Date.now(),
            name,
            email,
            password,
            role,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        showMessage('Registration successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    });
}


/* -------------------------------------------------
   LOGIN
-------------------------------------------------- */
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const users = JSON.parse(localStorage.getItem('users'));
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            redirectBasedOnRole(user);
        } else {
            showMessage('Invalid email or password!', 'error');
        }

    }); // <-- CLOSE addEventListener
} // <-- CLOSE if(loginForm)


/* -------------------------------------------------
   UTILITY FUNCTIONS
-------------------------------------------------- */

function showMessage(text, type) {
    const div = document.getElementById('message');
    div.textContent = text;
    div.className = `message ${type}`;
    div.style.display = "block";

    setTimeout(() => {
        div.style.display = 'none';
    }, 5000);
}

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) window.location.href = 'index.html';
    return user;
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

function redirectBasedOnRole(user) {
    switch (user.role) {
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
// Update the redirectBasedOnRole function in auth.js
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