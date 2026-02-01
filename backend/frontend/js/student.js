// ================= STUDENT.JS — FINAL WORKING VERSION =================

document.addEventListener("DOMContentLoaded", () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  // ✅ No token check for student
  if (!currentUser || currentUser.role !== "student") {
    window.location.href = "index.html";
    return;
  }

  // Header
  document.getElementById("userName").textContent = currentUser.name;
  document.getElementById("userEmail").textContent = currentUser.email;
  document.getElementById("userAvatar").textContent =
    currentUser.name.charAt(0).toUpperCase();

  setupNavigation();
  switchSection("dashboardContent", document.getElementById("dashboardLink"));
});

// ================= NAVIGATION =================
function setupNavigation() {
  const map = {
    dashboardLink: "dashboardContent",
    enterCodeLink: "enterCodeContent",
    myExamsLink: "myExamsContent",
    resultsLink: "resultsContent"
  };

  Object.keys(map).forEach(linkId => {
    const link = document.getElementById(linkId);
    if (!link) return;

    link.addEventListener("click", e => {
      e.preventDefault();
      switchSection(map[linkId], link);
    });
  });
}

function switchSection(sectionId, activeLink) {
  document.querySelectorAll(
    "#dashboardContent,#enterCodeContent,#myExamsContent,#resultsContent"
  ).forEach(div => (div.style.display = "none"));

  document.getElementById(sectionId).style.display = "block";

  document.querySelectorAll(".menu-item")
    .forEach(i => i.classList.remove("active"));

  if (activeLink) activeLink.classList.add("active");
}

// ================= EXAM CODE =================
function validateExamCode() {
  const input = document.getElementById("examCodeInput");
  const code = input.value.trim().toUpperCase(); // Convert to uppercase for matching

  if (!code) {
    alert("Please enter an exam code");
    return;
  }

  const exams = JSON.parse(localStorage.getItem("exams")) || [];
  const exam = exams.find(e => e.examCode.toUpperCase() === code); // ✅ FIX: Case-insensitive match

  if (!exam) {
    alert("Invalid exam code. Please check the code and try again.");
    return;
  }

  // ✅ Also check if exam is active
  if (exam.isActive === false) {
    alert("This exam is no longer active. Please contact your teacher.");
    return;
  }

  // ✅ Redirect to exam page with code
  window.location.href = `exam.html?code=${code}`;
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("token"); // if you use token
  window.location.href = "index.html";
}

// ================= MODAL FUNCTIONS =================
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

window.validateExamCode = validateExamCode;
window.logout = logout;
window.closeModal = closeModal;