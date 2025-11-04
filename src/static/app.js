document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Simple HTML escaper to avoid injecting raw values into the DOM
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[s]);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section
        const participants = Array.isArray(details.participants) ? details.participants : [];
        let participantsHtml = '';
        if (participants.length > 0) {
          participantsHtml = '<ul class="participants-list">' + participants.map(p => `\n              <li class="participant-item">\n                <span class="participant-name">${escapeHtml(p)}</span>\n                <button class="participant-delete" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" aria-label="Remove ${escapeHtml(p)}">✖</button>\n              </li>`).join('') + '\n            </ul>';
        } else {
          participantsHtml = '<p class="no-participants">No participants yet</p>';
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p><strong>Participants:</strong></p>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle click on participant delete buttons using event delegation
  activitiesList.addEventListener('click', async (event) => {
    const btn = event.target.closest('.participant-delete');
    if (!btn) return;

    const activityName = btn.dataset.activity;
    const email = btn.dataset.email;

    if (!activityName || !email) return;

    // Confirm removal with the user
    const confirmed = confirm(`Remove ${email} from ${activityName}?`);
    if (!confirmed) return;

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, {
        method: 'POST',
      });

      const result = await resp.json();
      if (resp.ok) {
        // Refresh activities list to reflect the change
        fetchActivities();
        messageDiv.textContent = result.message || 'Participant removed';
        messageDiv.className = 'success';
      } else {
        messageDiv.textContent = result.detail || 'Failed to remove participant';
        messageDiv.className = 'error';
      }
      messageDiv.classList.remove('hidden');
      setTimeout(() => messageDiv.classList.add('hidden'), 4000);
    } catch (err) {
      console.error('Error removing participant:', err);
      messageDiv.textContent = 'Failed to remove participant. Please try again.';
      messageDiv.className = 'error';
      messageDiv.classList.remove('hidden');
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the new participant appears immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
