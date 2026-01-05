// config.js — Codespaces / Cloud Backend Configuration

// 🔹 Backend base URL (Codespaces)
window.API_BASE_URL ="https://probable-space-goggles-69596vjpvg9wcr474-8000.app.github.dev/api";


console.log("✅ Using backend:", window.API_BASE_URL);

// 🔹 Health check on page load
window.addEventListener("load", async () => {
  try {
    const response = await fetch("https://probable-space-goggles-69596vjpvg9wcr474-8000.app.github.dev/health")


    if (response.ok) {
      console.log("✅ Backend is running and reachable!");
    } else {
      console.warn("⚠️ Backend responded but status not OK");
    }
  } catch (error) {
    console.error("❌ Cannot connect to backend:", error);
    console.log("💡 Make sure backend is running and port 8000 is public");
  }
});
