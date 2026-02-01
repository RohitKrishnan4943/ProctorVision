// ================= TEACHER.JS — STABLE & SAFE VERSION =================

// ================= GLOBAL STATE =================
let currentUser = null;
let currentExamFilter = "all";
let examsToDelete = [];
let questionCounter = 0;

// ================= DOM READY =================
document.addEventListener("DOMContentLoaded", () => {
  // ✅ FIX #1: Move ALL auth logic inside DOMContentLoaded
  currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!currentUser || currentUser.role !== "teacher") {
    window.location.replace("index.html");
    return; // Stop execution if not authenticated
  }

  // Header
  document.getElementById("userName").textContent = currentUser.name;
  document.getElementById("userEmail").textContent = currentUser.email;
  document.getElementById("userAvatar").textContent =
    currentUser.name.charAt(0).toUpperCase();

  setupNavigation();
  bindCreateExamForm();
  bindModalEvents();

  switchSection("dashboardContent", document.getElementById("dashboardLink"));
});

// ================= NAVIGATION =================
function setupNavigation() {
  const map = {
    dashboardLink: "dashboardContent",
    createExamLink: "createExamContent",
    examsLink: "myExamsContent",
    resultsLink: "resultsContent"
  };

  // ✅ FIX #2: Use Object.entries for clarity
  Object.entries(map).forEach(([linkId, sectionId]) => {
    const link = document.getElementById(linkId);
    if (!link) return;

    link.addEventListener("click", e => {
      e.preventDefault(); // Prevent default anchor behavior
      switchSection(sectionId, link);
    });
  });
}

function switchSection(sectionId, activeLink) {
  document.querySelectorAll(
    "#dashboardContent,#createExamContent,#myExamsContent,#resultsContent"
  ).forEach(div => (div.style.display = "none"));

  const section = document.getElementById(sectionId);
  if (section) section.style.display = "block";

  document.querySelectorAll(".menu-item")
    .forEach(i => i.classList.remove("active"));

  if (activeLink) activeLink.classList.add("active");

  // Page-specific loaders
  if (sectionId === "dashboardContent") loadDashboardStats();
  if (sectionId === "myExamsContent") loadMyExams();
}

// ================= DASHBOARD =================
function loadDashboardStats() {
  const exams = JSON.parse(localStorage.getItem("exams")) || [];
  const submissions = JSON.parse(localStorage.getItem("submissions")) || [];
  const users = JSON.parse(localStorage.getItem("users")) || [];

  const myExams = exams.filter(e => e.teacherId === currentUser.id);
  const myExamIds = myExams.map(e => e.id);
  const mySubs = submissions.filter(s => myExamIds.includes(s.examId));

  document.getElementById("totalExams").textContent = myExams.length;
  document.getElementById("totalStudents").textContent =
    users.filter(u => u.role === "student").length;
  document.getElementById("completedExams").textContent =
    mySubs.filter(s => s.status === "completed").length;
  document.getElementById("cheatingCases").textContent =
    mySubs.filter(s => s.cheatingCount > 0).length;
}

// ================= CREATE EXAM =================
function bindCreateExamForm() {
  // ✅ FIX #3: Proper form binding
  const form = document.getElementById("createExamForm");
  if (!form) return;

  form.addEventListener("submit", e => {
    e.preventDefault();
    handleCreateExam();
  });
}

// ================= MODAL FUNCTIONS =================
function bindModalEvents() {
  // Close modal when clicking outside
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
}

function showExamLinkModal(examCode) {
  // Generate the full exam link
  const currentUrl = window.location.origin + window.location.pathname;
  const baseUrl = currentUrl.replace('teacher-dashboard.html', '');
  const examLink = `${baseUrl}exam.html?code=${examCode}`;
  
  // Set the link in the modal
  document.getElementById('generatedLink').value = examLink;
  
  // Store exam code for copying
  document.getElementById('generatedLink').dataset.examCode = examCode;
  
  // Show the modal
  document.getElementById('examLinkModal').style.display = 'block';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

function copyLink() {
  const linkInput = document.getElementById('generatedLink');
  linkInput.select();
  linkInput.setSelectionRange(0, 99999); // For mobile devices
  
  try {
    navigator.clipboard.writeText(linkInput.value)
      .then(() => {
        alert('Link copied to clipboard!');
      })
      .catch(err => {
        // Fallback for older browsers
        document.execCommand('copy');
        alert('Link copied to clipboard!');
      });
  } catch (err) {
    // Fallback for older browsers
    document.execCommand('copy');
    alert('Link copied to clipboard!');
  }
}

function copyExamCode() {
  const linkInput = document.getElementById('generatedLink');
  const examCode = linkInput.dataset.examCode;
  
  try {
    navigator.clipboard.writeText(examCode)
      .then(() => {
        alert('Exam code copied to clipboard: ' + examCode);
      })
      .catch(err => {
        // Fallback for older browsers
        const tempInput = document.createElement('input');
        tempInput.value = examCode;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        alert('Exam code copied to clipboard: ' + examCode);
      });
  } catch (err) {
    // Fallback for older browsers
    const tempInput = document.createElement('input');
    tempInput.value = examCode;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    alert('Exam code copied to clipboard: ' + examCode);
  }
}

// ================= ENHANCED MCQ FUNCTIONALITY =================
function addMCQ() {
  questionCounter++;
  const questionId = `question-${questionCounter}`;
  
  document.getElementById("questionsContainer").insertAdjacentHTML(
    "beforeend",
    `
    <div class="question-item" id="${questionId}">
      <div class="question-header">
        <input class="question-text" placeholder="Enter your question" required>
        <input class="question-marks" type="number" value="1" min="1">
        <button type="button" onclick="removeQuestion('${questionId}')">Remove</button>
      </div>
      
      <div class="options-container">
        <div class="option-row">
          <input type="radio" name="correct-${questionId}" value="0" required>
          <input type="text" class="option-text" placeholder="Option A" data-index="0" required>
        </div>
        <div class="option-row">
          <input type="radio" name="correct-${questionId}" value="1">
          <input type="text" class="option-text" placeholder="Option B" data-index="1" required>
        </div>
        <div class="option-row">
          <input type="radio" name="correct-${questionId}" value="2">
          <input type="text" class="option-text" placeholder="Option C" data-index="2" required>
        </div>
        <div class="option-row">
          <input type="radio" name="correct-${questionId}" value="3">
          <input type="text" class="option-text" placeholder="Option D" data-index="3" required>
        </div>
      </div>
      <small class="correct-hint">Select the correct answer by clicking the radio button</small>
    </div>`
  );
}

// Helper function to remove questions
function removeQuestion(questionId) {
  document.getElementById(questionId).remove();
}

function handleCreateExam() {
  const examTitle = document.getElementById("examTitle");
  const examDuration = document.getElementById("examDuration");
  
  const exams = JSON.parse(localStorage.getItem("exams")) || [];

  const examCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  const exam = {
    id: "EXAM" + Date.now(),
    examCode: examCode,
    title: examTitle.value,
    duration: examDuration.value,
    teacherId: currentUser.id,
    createdAt: new Date().toISOString(),
    isActive: true,
    questions: []
  };

  // Process all MCQ questions
  const questionItems = document.querySelectorAll(".question-item");
  
  // Check if there are any questions
  if (questionItems.length === 0) {
    alert("Please add at least one question to the exam!");
    return;
  }

  let hasError = false;
  
  questionItems.forEach(q => {
    const questionText = q.querySelector(".question-text").value;
    const marks = parseInt(q.querySelector(".question-marks").value) || 1;
    
    // Get all options
    const options = [];
    q.querySelectorAll(".option-text").forEach(optionInput => {
      options.push(optionInput.value.trim());
    });
    
    // Get the correct answer (radio button value)
    const correctRadio = q.querySelector(`input[name^="correct-"]:checked`);
    const correctAnswer = correctRadio ? parseInt(correctRadio.value) : -1;
    
    // Validate that a correct answer is selected
    if (correctAnswer === -1) {
      alert("Please select a correct answer for each MCQ!");
      hasError = true;
      return;
    }
    
    // Validate that all options are filled
    if (options.some(opt => opt === "")) {
      alert("Please fill all options for each MCQ!");
      hasError = true;
      return;
    }
    
    exam.questions.push({
      type: "mcq",
      question: questionText,
      options: options,
      correctAnswer: correctAnswer, // 0-based index
      marks: marks
    });
  });

  if (hasError) return;

  exams.push(exam);
  localStorage.setItem("exams", JSON.stringify(exams));

  // Clear the form
  document.getElementById("examTitle").value = "";
  document.getElementById("questionsContainer").innerHTML = "";
  questionCounter = 0;
  
  // Show the exam link modal instead of just an alert
  showExamLinkModal(examCode);
}

// ================= MY EXAMS =================
function loadMyExams() {
  const exams = JSON.parse(localStorage.getItem("exams")) || [];
  const tbody = document.querySelector("#myExamsTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  exams
    .filter(e => e.teacherId === currentUser.id)
    .forEach(exam => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${exam.title}</td>
        <td>${exam.examCode}</td>
        <td>${exam.duration} min</td>
        <td>
          <button onclick="deleteExam('${exam.id}')">Delete</button>
        </td>
      `;
    });
}

function deleteExam(id) {
  if (!confirm("Delete exam?")) return;
  let exams = JSON.parse(localStorage.getItem("exams")) || [];
  exams = exams.filter(e => e.id !== id);
  localStorage.setItem("exams", JSON.stringify(exams));
  loadMyExams();
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("token"); // if you use token
  window.location.href = "index.html";
}


// ================= GLOBAL EXPORTS =================
// ✅ FIX #4: Make functions available globally for onclick attributes
window.addMCQ = addMCQ;
window.logout = logout;
window.deleteExam = deleteExam;
window.removeQuestion = removeQuestion;
window.closeModal = closeModal;
window.copyLink = copyLink;
window.copyExamCode = copyExamCode;