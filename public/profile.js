const state = {
  users: [],
  activeUserId: localStorage.getItem("plmActiveUserId") || "",
};

const THEME_KEY = "plmTheme";

const els = {
  activeUserName: document.getElementById("activeUserName"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  backBtn: document.getElementById("backBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  teamProfileForm: document.getElementById("teamProfileForm"),
  teamProfileUser: document.getElementById("teamProfileUser"),
  teamRole: document.getElementById("teamRole"),
  teamEmail: document.getElementById("teamEmail"),
  teamPhone: document.getElementById("teamPhone"),
  teamNotes: document.getElementById("teamNotes"),
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function disableBrowserAutofill() {
  const forms = document.querySelectorAll("form");
  for (const form of forms) {
    form.setAttribute("autocomplete", "off");
  }

  const fields = document.querySelectorAll("input, textarea");
  fields.forEach((field, index) => {
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
      return;
    }

    const isInput = field instanceof HTMLInputElement;
    const inputType = isInput ? field.type : "textarea";
    if (inputType === "hidden" || inputType === "file") {
      return;
    }

    field.setAttribute("autocomplete", "off");
    field.setAttribute("autocorrect", "off");
    field.setAttribute("autocapitalize", "off");
    field.setAttribute("spellcheck", "false");

    if (isInput && inputType === "password") {
      field.setAttribute("autocomplete", "new-password");
    }

    if (isInput && field.id) {
      field.setAttribute("name", `plm_${field.id}_${index}`);
    }

    field.readOnly = true;
    field.addEventListener("focus", () => {
      field.readOnly = false;
    });
    field.addEventListener("blur", () => {
      field.readOnly = true;
    });
  });
}

function showToast(message, type = "info") {
  if (!message) {
    return;
  }

  let stack = document.getElementById("toastStack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toastStack";
    stack.className = "toast-stack";
    stack.setAttribute("aria-live", "polite");
    stack.setAttribute("aria-atomic", "true");
    document.body.appendChild(stack);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  stack.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 220);
  }, 2800);
}

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", nextTheme);
  localStorage.setItem(THEME_KEY, nextTheme);
  if (els.themeToggleBtn) {
    els.themeToggleBtn.textContent = nextTheme === "dark" ? "Light Mode" : "Dark Mode";
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

function getSelectedUser() {
  return state.users.find((user) => user.id === els.teamProfileUser.value) || null;
}

function fillForm(user) {
  if (!user) {
    els.teamRole.value = "";
    els.teamEmail.value = "";
    els.teamPhone.value = "";
    els.teamNotes.value = "";
    return;
  }

  els.teamRole.value = user.role || "";
  els.teamEmail.value = user.email || "";
  els.teamPhone.value = user.phone || "";
  els.teamNotes.value = user.notes || "";
}

function renderUserOptions() {
  const previous = els.teamProfileUser.value;
  els.teamProfileUser.innerHTML = "";

  for (const user of state.users) {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = user.name;
    els.teamProfileUser.appendChild(option);
  }

  if (state.users.some((user) => user.id === previous)) {
    els.teamProfileUser.value = previous;
  } else if (state.activeUserId && state.users.some((user) => user.id === state.activeUserId)) {
    els.teamProfileUser.value = state.activeUserId;
  }

  fillForm(getSelectedUser());
}

async function loadUsers() {
  const data = await api("/api/users");
  state.users = data.users;

  const active = state.users.find((user) => user.id === state.activeUserId);
  els.activeUserName.textContent = active ? active.name : "Not selected";
  renderUserOptions();
}

els.teamProfileUser.addEventListener("change", () => {
  fillForm(getSelectedUser());
});

els.teamProfileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const user = getSelectedUser();
  if (!user) {
    showToast("Choose a team member first", "error");
    return;
  }

  try {
    await api(`/api/users/${user.id}`, {
      method: "PUT",
      body: JSON.stringify({
        role: els.teamRole.value.trim(),
        email: els.teamEmail.value.trim(),
        phone: els.teamPhone.value.trim(),
        notes: els.teamNotes.value.trim(),
      }),
    });
    await loadUsers();
    showToast("Team profile saved", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
});

els.backBtn.addEventListener("click", () => {
  window.location.href = "/";
});

els.logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("plmActiveUserId");
  window.location.href = "/";
});

if (els.themeToggleBtn) {
  els.themeToggleBtn.addEventListener("click", toggleTheme);
}

(async function init() {
  disableBrowserAutofill();
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
  if (!state.activeUserId) {
    window.location.href = "/";
    return;
  }

  await loadUsers();
})();
