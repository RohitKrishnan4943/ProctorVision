// ================= STUDENT.JS — FINAL STABLE VERSION =================

// ================= AUTH + INIT =================
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  const token = localStorage.getItem("token");

  if (!user || !token || user.role !== "student") {
    window.location.href = "index.html";
    return;
  }

  // Make user globally available
  window.currentUser = user;
  window.token = token;

  // Populate header
  document.getElementById("userName").textContent = user.name;
  document.getElementById("userEmail").textContent = user.email;
  document.getElementById("userAvatar").textContent =
    user.name.charAt(0).toUpperCase();

  // Default page
  showPage("dashboard");
});

// ================= NAVIGATION =================
function showPage(page) {
  const sections = [
    "dashboardContent",
    "enterCodeContent",
    "myExamsContent",
    "resultsContent"
  ];

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  document.querySelectorAll(".menu-item").forEach(i =>
    i.classList.remove("active")
  );

  let title = "Student Dashboard";

  if (page === "dashboard") {
    document.getElementById("dashboardContent").style.display = "block";
    document.getElementById("dashboardLink")?.classList.add("active");
    title = "Student Dashboard";
    loadStudentDashboard();
  }

  if (page === "enterCode") {
    document.getElementById("enterCodeContent").style.display = "block";
    document.getElementById("enterCodeLink")?.classList.add("active");
    title = "Enter Exam Code";
  }

  if (page === "myExams") {
    document.getElementById("myExamsContent").style.display = "block";
    document.getElementById("myExamsLink")?.classList.add("active");
    title = "My Exams";
  }

  if (page === "results") {
    document.getElementById("resultsContent").style.display = "block";
    document.getElementById("resultsLink")?.classList.add("active");
    title = "Results";
  }

  document.getElementById("pageTitle").textContent = title;
}

// ================= DASHBOARD =================
function loadStudentDashboard() {
  const exams = JSON.parse(localStorage.getItem("exams")) || [];
  const submissions = JSON.parse(localStorage.getItem("submissions")) || [];

  const mySubs = submissions.filter(
    s => s.studentId === currentUser.id && s.status === "completed"
  );

  document.getElementById("completedExamsCount").textContent = mySubs.length;
  document.getElementById("assignedExamsCount").textContent = exams.length;
  document.getElementById("pendingExamsCount").textContent =
    exams.length - mySubs.length;
}

// ================= EXAM CODE =================
function validateExamCode() {
  const code = document.getElementById("examCodeInput").value.trim().toUpperCase();
  if (!code) return alert("Enter exam code");

  const exams = JSON.parse(localStorage.getItem("exams")) || [];
  const exam = exams.find(e => e.examCode === code);

  if (!exam) {
    alert("Invalid exam code");
    return;
  }

  localStorage.setItem("currentExam", exam.id);
  window.location.href = `exam.html?code=${code}`;
}

// ================= LOGOUT =================
window.logout = function () {
  localStorage.clear();
  window.location.href = "index.html";
};

// ================= GLOBAL EXPORTS =================
window.showPage = showPage;
window.validateExamCode = validateExamCode;
