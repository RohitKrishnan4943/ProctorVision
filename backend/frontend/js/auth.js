// auth.js — FINAL WORKING VERSION (FastAPI same-origin)

// ===================== API BASE =====================
window.API_BASE_URL = "/api";

// ===================== REGISTRATION =====================
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // 🔥 CRITICAL

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;
    const adminPasswordInput = document.getElementById("adminPassword");
    const adminPassword = adminPasswordInput ? adminPasswordInput.value : "";

    if (!name || !email || !password || !role) {
      showMessage("All fields are required", "error");
      return;
    }

    if (role === "admin") {
      if (adminPassword !== "shingekinokyojin") {
        showMessage("Invalid admin password", "error");
        return;
      }
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.detail || "Registration failed", "error");
        return;
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("currentUser", JSON.stringify(data.user));

      showMessage("Registration successful!", "success");

      setTimeout(() => redirectBasedOnRole(data.user), 1200);

    } catch (err) {
      console.error(err);
      showMessage("Network error", "error");
    }
  });
}

// ===================== LOGIN =====================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // 🔥 CRITICAL

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      showMessage("Email and password required", "error");
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.detail || "Invalid credentials", "error");
        return;
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("currentUser", JSON.stringify(data.user));

      redirectBasedOnRole(data.user);

    } catch (err) {
      console.error(err);
      showMessage("Network error", "error");
    }
  });
}

// ===================== UTILITIES =====================
function showMessage(text, type) {
  const div = document.getElementById("message");
  if (!div) return;

  div.textContent = text;
  div.className = `message ${type}`;
  div.style.display = "block";

  setTimeout(() => {
    div.style.display = "none";
  }, 4000);
}

function redirectBasedOnRole(user) {
  if (user.role === "teacher") location.href = "teacher-dashboard.html";
  else if (user.role === "student") location.href = "student-dashboard.html";
  else if (user.role === "admin") location.href = "admin-dashboard.html";
}
