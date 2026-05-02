const state = {
  contacts: [],
  selectedId: null,
  searchQuery: "",
  sortOrder: "asc",
  mobileView: "home",
  users: [],
  activeUserId: localStorage.getItem("plmActiveUserId") || "",
  splashSelectedUserId: "",
  splashRequiresPasswordSetup: false,
};

const THEME_KEY = "plmTheme";

const els = {
  userSplash: document.getElementById("userSplash"),
  userPicker: document.getElementById("userPicker"),
  passwordHelpText: document.getElementById("passwordHelpText"),
  userPassword: document.getElementById("userPassword"),
  confirmPasswordWrap: document.getElementById("confirmPasswordWrap"),
  confirmUserPassword: document.getElementById("confirmUserPassword"),
  showResetPasswordBtn: document.getElementById("showResetPasswordBtn"),
  resetPasswordPanel: document.getElementById("resetPasswordPanel"),
  resetCurrentPassword: document.getElementById("resetCurrentPassword"),
  resetNewPassword: document.getElementById("resetNewPassword"),
  resetConfirmPassword: document.getElementById("resetConfirmPassword"),
  applyResetPasswordBtn: document.getElementById("applyResetPasswordBtn"),
  cancelResetPasswordBtn: document.getElementById("cancelResetPasswordBtn"),
  continueBtn: document.getElementById("continueBtn"),
  userMenuWrap: document.getElementById("userMenuWrap"),
  userMenuBtn: document.getElementById("userMenuBtn"),
  userMenuPanel: document.getElementById("userMenuPanel"),
  mobileUserMenuOverlay: document.getElementById("mobileUserMenuOverlay"),
  mobileUserMenuSheet: document.getElementById("mobileUserMenuSheet"),
  activeUserInitials: document.getElementById("activeUserInitials"),
  activeUserName: document.getElementById("activeUserName"),
  mobileActiveUserName: document.getElementById("mobileActiveUserName"),
  openProfilePaneBtn: document.getElementById("openProfilePaneBtn"),
  mobileOpenProfilePaneBtn: document.getElementById("mobileOpenProfilePaneBtn"),
  profilePaneOverlay: document.getElementById("profilePaneOverlay"),
  profilePane: document.getElementById("profilePane"),
  closeProfilePaneBtn: document.getElementById("closeProfilePaneBtn"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  mobileThemeToggleBtn: document.getElementById("mobileThemeToggleBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  mobileLogoutBtn: document.getElementById("mobileLogoutBtn"),
  contactStartHint: document.getElementById("contactStartHint"),
  mobileHomePanel: document.getElementById("mobileHomePanel"),
  directoryPanel: document.getElementById("directoryPanel"),
  contactDetailsPanel: document.getElementById("contactDetailsPanel"),
  ocrPanel: document.getElementById("ocrPanel"),
  timelinePanel: document.getElementById("timelinePanel"),
  contactsList: document.getElementById("contactsList"),
  searchShell: document.querySelector(".search-shell"),
  searchInput: document.getElementById("searchInput"),
  sortOrder: document.getElementById("sortOrder"),
  teamProfileForm: document.getElementById("teamProfileForm"),
  teamProfileUser: document.getElementById("teamProfileUser"),
  teamRole: document.getElementById("teamRole"),
  teamEmail: document.getElementById("teamEmail"),
  teamPhone: document.getElementById("teamPhone"),
  teamNotes: document.getElementById("teamNotes"),
  newContactBtn: document.getElementById("newContactBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  resetBtn: document.getElementById("resetBtn"),
  contactForm: document.getElementById("contactForm"),
  contactId: document.getElementById("contactId"),
  name: document.getElementById("name"),
  company: document.getElementById("company"),
  title: document.getElementById("title"),
  email: document.getElementById("email"),
  phone: document.getElementById("phone"),
  website: document.getElementById("website"),
  linkedIn: document.getElementById("linkedIn"),
  tags: document.getElementById("tags"),
  nextMeetingDate: document.getElementById("nextMeetingDate"),
  noteForm: document.getElementById("noteForm"),
  noteText: document.getElementById("noteText"),
  timeline: document.getElementById("timeline"),
  timelineItemTemplate: document.getElementById("timelineItemTemplate"),
  contactItemTemplate: document.getElementById("contactItemTemplate"),
  ocrForm: document.getElementById("ocrForm"),
  cardImage: document.getElementById("cardImage"),
  ocrRaw: document.getElementById("ocrRaw"),
  mobileScanCardBtn: document.getElementById("mobileScanCardBtn"),
  mobileQuickNewBtn: document.getElementById("mobileQuickNewBtn"),
  mobileTabBar: document.getElementById("mobileTabBar"),
  mobileTabHome: document.getElementById("mobileTabHome"),
  mobileTabDirectory: document.getElementById("mobileTabDirectory"),
  mobileTabCapture: document.getElementById("mobileTabCapture"),
};

const mobileMediaQuery = window.matchMedia("(max-width: 980px)");

function getActiveUser() {
  return state.users.find((user) => user.id === state.activeUserId) || null;
}

function getSplashSelectedUser() {
  return state.users.find((user) => user.id === state.splashSelectedUserId) || null;
}

function getSelectedProfileUser() {
  return state.users.find((user) => user.id === els.teamProfileUser.value) || null;
}

function getInitials(name) {
  if (!name) {
    return "--";
  }

  const parts = String(name)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function requireActiveUserId() {
  if (!state.activeUserId) {
    throw new Error("Select a team member first");
  }
  return state.activeUserId;
}

function updateActiveUserBadge() {
  const user = getActiveUser();
  els.activeUserName.textContent = user ? user.name : "Not selected";
  if (els.mobileActiveUserName) {
    els.mobileActiveUserName.textContent = user ? user.name : "Not selected";
  }
  els.activeUserInitials.textContent = getInitials(user?.name || "");
  els.userMenuBtn.title = user ? `${user.name} menu` : "Open active user menu";
}

function setUserMenuVisible(visible) {
  const mobileMenu = mobileMediaQuery.matches;
  els.userMenuPanel.classList.toggle("hidden", mobileMenu || !visible);
  if (els.mobileUserMenuOverlay) {
    els.mobileUserMenuOverlay.classList.toggle("hidden", !mobileMenu || !visible);
  }
  if (els.mobileUserMenuSheet) {
    els.mobileUserMenuSheet.classList.toggle("hidden", !mobileMenu || !visible);
  }
  els.userMenuBtn.setAttribute("aria-expanded", visible ? "true" : "false");
  document.body.classList.toggle("mobile-menu-open", visible && mobileMenu);
  if (mobileMenu) {
    requestAnimationFrame(() => {
      enforceNoHorizontalScroll();
    });
  }
}

function setProfilePaneVisible(visible) {
  els.profilePaneOverlay.classList.toggle("hidden", !visible);
  els.profilePane.classList.toggle("hidden", !visible);
  els.profilePane.setAttribute("aria-hidden", visible ? "false" : "true");
}

function fillProfileForm(user) {
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

function renderProfileUserOptions() {
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

  fillProfileForm(getSelectedProfileUser());
}

function setContactPanelsVisible(visible) {
  if (mobileMediaQuery.matches) {
    if (!visible) {
      setMobileView("home");
      return;
    }
    setMobileView("details");
    return;
  }

  els.contactStartHint.classList.toggle("hidden", visible);
  els.contactDetailsPanel.classList.toggle("hidden", !visible);
  els.ocrPanel.classList.toggle("hidden", !visible);
  els.timelinePanel.classList.toggle("hidden", !visible);
}

function updateMobileTabActive(view) {
  if (!els.mobileTabBar) {
    return;
  }

  const mapping = {
    home: els.mobileTabHome,
    directory: els.mobileTabDirectory,
    capture: els.mobileTabCapture,
    details: els.mobileTabDirectory,
  };

  [els.mobileTabHome, els.mobileTabDirectory, els.mobileTabCapture]
    .filter(Boolean)
    .forEach((node) => node.classList.remove("active"));

  const activeNode = mapping[view] || els.mobileTabHome;
  if (activeNode) {
    activeNode.classList.add("active");
  }
}

function setMobileView(view) {
  state.mobileView = view;
  if (!mobileMediaQuery.matches) {
    return;
  }

  document.body.classList.add("mobile-ui");

  const show = (node, visible) => {
    if (node) {
      node.classList.toggle("hidden", !visible);
    }
  };

  show(els.mobileHomePanel, view === "home");
  show(els.directoryPanel, view === "directory");
  show(els.contactStartHint, view === "start");
  show(els.contactDetailsPanel, view === "details");
  show(els.ocrPanel, view === "capture");
  show(els.timelinePanel, view === "details" || view === "notes");
  show(els.searchShell, view === "directory");
  updateMobileTabActive(view);
  requestAnimationFrame(() => {
    enforceNoHorizontalScroll();
  });
}

function syncMobileUI() {
  if (mobileMediaQuery.matches) {
    setMobileView(state.mobileView || "home");
    requestAnimationFrame(() => {
      enforceNoHorizontalScroll();
    });
    return;
  }

  document.body.classList.remove("mobile-ui");
  if (els.searchShell) {
    els.searchShell.classList.remove("hidden");
  }
  if (els.mobileHomePanel) {
    els.mobileHomePanel.classList.add("hidden");
  }
  if (els.directoryPanel) {
    els.directoryPanel.classList.remove("hidden");
  }
  if (state.selectedId) {
    els.contactStartHint.classList.add("hidden");
    els.contactDetailsPanel.classList.remove("hidden");
    els.ocrPanel.classList.remove("hidden");
    els.timelinePanel.classList.remove("hidden");
  } else {
    els.contactStartHint.classList.remove("hidden");
    els.contactDetailsPanel.classList.add("hidden");
    els.ocrPanel.classList.add("hidden");
    els.timelinePanel.classList.add("hidden");
  }
}

function enforceNoHorizontalScroll() {
  if (!mobileMediaQuery.matches) {
    return;
  }

  const viewportWidth = document.documentElement.clientWidth;
  document.documentElement.style.overflowX = "hidden";
  document.body.style.overflowX = "hidden";

  const nodes = document.body.querySelectorAll("*");
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    const overflowsRight = rect.right > viewportWidth + 1;
    const overflowsLeft = rect.left < -1;
    const tooWide = rect.width > viewportWidth + 1;

    if (overflowsRight || overflowsLeft || tooWide) {
      node.style.maxWidth = "100%";
      node.style.overflowX = "hidden";
      node.style.minWidth = "0";
    }
  }

  if (window.scrollX !== 0) {
    window.scrollTo(0, window.scrollY);
  }
}

function renderUserPicker() {
  els.userPicker.innerHTML = "";

  for (const user of state.users) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "user-card";
    if (state.splashSelectedUserId === user.id) {
      button.classList.add("active");
    }

    const subtitle = user.role || user.email || "Profile not set";
    const initials = user.name
      .split(" ")
      .map((part) => part[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase();
    button.innerHTML = `
      <div class="user-card-head">
        <div class="user-avatar">${initials}</div>
        <div>
          <strong>${user.name}</strong>
          <small>${subtitle}</small>
        </div>
      </div>
    `;
    button.addEventListener("click", () => {
      state.splashSelectedUserId = user.id;
      state.splashRequiresPasswordSetup = !user.hasPassword;
      updatePasswordUI();
      renderUserPicker();
    });

    els.userPicker.appendChild(button);
  }
}

function resetPasswordInputs() {
  els.userPassword.value = "";
  els.confirmUserPassword.value = "";
  els.resetCurrentPassword.value = "";
  els.resetNewPassword.value = "";
  els.resetConfirmPassword.value = "";
}

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", nextTheme);
  localStorage.setItem(THEME_KEY, nextTheme);
  if (els.themeToggleBtn) {
    els.themeToggleBtn.textContent = nextTheme === "dark" ? "Light Mode" : "Dark Mode";
  }
  if (els.mobileThemeToggleBtn) {
    els.mobileThemeToggleBtn.textContent = nextTheme === "dark" ? "Light Mode" : "Dark Mode";
  }
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

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

function setResetPasswordVisible(visible) {
  els.resetPasswordPanel.classList.toggle("hidden", !visible);
}

function updatePasswordUI() {
  const user = getSplashSelectedUser();
  if (!user) {
    state.splashRequiresPasswordSetup = false;
    els.passwordHelpText.textContent = "Select a user to continue.";
    els.confirmPasswordWrap.classList.add("hidden");
    els.showResetPasswordBtn.classList.add("hidden");
    setResetPasswordVisible(false);
    return;
  }

  state.splashRequiresPasswordSetup = !user.hasPassword;
  if (state.splashRequiresPasswordSetup) {
    els.passwordHelpText.textContent =
      `${user.name} is logging in for the first time. Create a password.`;
    els.confirmPasswordWrap.classList.remove("hidden");
    els.showResetPasswordBtn.classList.add("hidden");
    setResetPasswordVisible(false);
  } else {
    els.passwordHelpText.textContent = `Enter password for ${user.name}.`;
    els.confirmPasswordWrap.classList.add("hidden");
    els.showResetPasswordBtn.classList.remove("hidden");
  }
}

function openSplash(force = false) {
  if (force) {
    state.splashSelectedUserId = state.activeUserId || state.users[0]?.id || "";
  }

  renderUserPicker();
  updatePasswordUI();
  resetPasswordInputs();
  setResetPasswordVisible(false);
  els.userSplash.classList.remove("hidden");
}

function showUserLoadFailure(message) {
  openSplash(false);
  els.userPicker.innerHTML = "";

  const empty = document.createElement("p");
  empty.className = "panel-intro";
  empty.textContent = message;
  els.userPicker.appendChild(empty);

  els.passwordHelpText.textContent = message;
  els.userPassword.disabled = true;
  els.confirmUserPassword.disabled = true;
  els.showResetPasswordBtn.classList.add("hidden");
  els.continueBtn.disabled = true;
}

function closeSplash() {
  els.userSplash.classList.add("hidden");
}

function openProfilePane() {
  renderProfileUserOptions();
  setProfilePaneVisible(true);
  setUserMenuVisible(false);
}

function closeProfilePane() {
  setProfilePaneVisible(false);
}

async function loadUsers() {
  const data = await api("/api/users");
  state.users = data.users;

  if (!state.users.some((user) => user.id === state.activeUserId)) {
    state.activeUserId = "";
    localStorage.removeItem("plmActiveUserId");
  }

  updateActiveUserBadge();
  renderProfileUserOptions();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const responseText = await response.text();
  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (responseText) {
    if (contentType.includes("application/json")) {
      data = JSON.parse(responseText);
    } else {
      try {
        data = JSON.parse(responseText);
      } catch (_error) {
        data = null;
      }
    }
  }

  if (!response.ok) {
    const fallbackMessage = responseText
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    throw new Error(data?.error || fallbackMessage || "Request failed");
  }

  if (responseText && !data) {
    throw new Error("Server returned an unexpected response");
  }

  return data;
}

function contactToPayload() {
  return {
    actorId: requireActiveUserId(),
    name: els.name.value.trim(),
    company: els.company.value.trim(),
    title: els.title.value.trim(),
    email: els.email.value.trim(),
    phone: els.phone.value.trim(),
    website: els.website.value.trim(),
    linkedIn: els.linkedIn.value.trim(),
    tags: els.tags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    nextMeetingDate: els.nextMeetingDate.value,
  };
}

function resetForm() {
  els.contactId.value = "";
  els.contactForm.reset();
  state.selectedId = null;
  els.deleteBtn.disabled = true;
  renderContacts();
  renderTimeline([]);
  setContactPanelsVisible(false);
}

function fillForm(contact) {
  els.contactId.value = contact.id;
  els.name.value = contact.name || "";
  els.company.value = contact.company || "";
  els.title.value = contact.title || "";
  els.email.value = contact.email || "";
  els.phone.value = contact.phone || "";
  els.website.value = contact.website || "";
  els.linkedIn.value = contact.linkedIn || "";
  els.tags.value = (contact.tags || []).join(", ");
  els.nextMeetingDate.value = contact.nextMeetingDate || "";
  els.deleteBtn.disabled = false;
}

function renderContacts() {
  els.contactsList.innerHTML = "";

  if (!state.contacts.length) {
    const empty = document.createElement("p");
    empty.textContent = "No contacts yet";
    els.contactsList.appendChild(empty);
    return;
  }

  const sortedContacts = [...state.contacts].sort((a, b) => {
    const nameA = String(a.name || "").toLocaleLowerCase();
    const nameB = String(b.name || "").toLocaleLowerCase();
    if (nameA === nameB) {
      return 0;
    }
    const order = nameA < nameB ? -1 : 1;
    return state.sortOrder === "desc" ? -order : order;
  });

  for (const contact of sortedContacts) {
    const node = els.contactItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".contact-name").textContent = contact.name;
    node.querySelector(".contact-company").textContent =
      contact.company || "No company";
    const nextMeeting = contact.nextMeetingDate
      ? `Next: ${contact.nextMeetingDate}`
      : "Next: Not set";
    const updatedMeta = `Updated by ${contact.updatedByName || "Unknown"} on ${new Date(
      contact.updatedAt || contact.createdAt
    ).toLocaleString()}`;
    node.querySelector(".contact-meta").textContent = `${nextMeeting} | ${updatedMeta}`;

    if (state.selectedId === contact.id) {
      node.classList.add("active");
    }

    node.addEventListener("click", async () => {
      await selectContact(contact.id);
    });

    els.contactsList.appendChild(node);
  }
}

function renderTimeline(entries) {
  els.timeline.innerHTML = "";

  if (!entries || !entries.length) {
    const empty = document.createElement("p");
    empty.textContent = "No notes yet";
    els.timeline.appendChild(empty);
    return;
  }

  for (const entry of entries) {
    const node = els.timelineItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".timeline-text").textContent = entry.text;
    node.querySelector(".timeline-date").textContent = `${
      entry.createdByName || "Unknown"
    } • ${new Date(entry.createdAt).toLocaleString()}`;
    els.timeline.appendChild(node);
  }
}

async function loadContacts() {
  const q = encodeURIComponent(state.searchQuery);
  const data = await api(`/api/contacts?search=${q}`);
  state.contacts = data.contacts;
  renderContacts();
}

async function selectContact(id) {
  if (document.activeElement !== els.searchInput && els.searchInput.value !== state.searchQuery) {
    els.searchInput.value = state.searchQuery;
  }

  const data = await api(`/api/contacts/${id}`);
  const contact = data.contact;
  state.selectedId = contact.id;
  setContactPanelsVisible(true);
  fillForm(contact);
  renderTimeline(contact.timeline || []);
  renderContacts();
}

els.contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const payload = contactToPayload();
    const id = els.contactId.value;

    if (!id) {
      const data = await api("/api/contacts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      state.selectedId = data.contact.id;
    } else {
      await api(`/api/contacts/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      state.selectedId = id;
    }

    await loadContacts();
    if (state.selectedId) {
      await selectContact(state.selectedId);
    }
  } catch (error) {
    showToast(error.message, "error");
  }
});

els.noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!state.selectedId) {
    showToast("Select or create a contact first", "error");
    return;
  }

  try {
    requireActiveUserId();
    await api(`/api/contacts/${state.selectedId}/notes`, {
      method: "POST",
      body: JSON.stringify({
        text: els.noteText.value.trim(),
        actorId: state.activeUserId,
      }),
    });
    els.noteText.value = "";
    await selectContact(state.selectedId);
    await loadContacts();
  } catch (error) {
    showToast(error.message, "error");
  }
});

els.deleteBtn.addEventListener("click", async () => {
  if (!state.selectedId) {
    return;
  }

  if (!window.confirm("Delete this contact and all timeline notes?")) {
    return;
  }

  try {
    requireActiveUserId();
    await api(`/api/contacts/${state.selectedId}`, {
      method: "DELETE",
      body: JSON.stringify({ actorId: state.activeUserId }),
    });
    resetForm();
    await loadContacts();
  } catch (error) {
    showToast(error.message, "error");
  }
});

els.newContactBtn.addEventListener("click", () => {
  resetForm();
  if (mobileMediaQuery.matches) {
    setMobileView("details");
  } else {
    setContactPanelsVisible(true);
  }
  els.name.focus();
});

if (els.mobileQuickNewBtn) {
  els.mobileQuickNewBtn.addEventListener("click", () => {
    resetForm();
    setMobileView("details");
    els.name.focus();
  });
}

if (els.mobileScanCardBtn) {
  els.mobileScanCardBtn.addEventListener("click", () => {
    setMobileView("capture");
    els.cardImage.click();
  });
}

els.resetBtn.addEventListener("click", () => {
  if (state.selectedId) {
    selectContact(state.selectedId);
  } else {
    resetForm();
  }
});

els.searchInput.addEventListener("input", async () => {
  if (document.activeElement !== els.searchInput) {
    els.searchInput.value = state.searchQuery;
    return;
  }

  state.searchQuery = els.searchInput.value.trim();
  await loadContacts();
});

els.searchInput.addEventListener("blur", () => {
  if (els.searchInput.value !== state.searchQuery) {
    els.searchInput.value = state.searchQuery;
  }
  els.searchInput.readOnly = true;
});

els.searchInput.addEventListener("focus", () => {
  els.searchInput.readOnly = false;
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && document.activeElement !== els.searchInput) {
    els.searchInput.value = state.searchQuery;
  }
});

els.sortOrder.addEventListener("change", () => {
  state.sortOrder = els.sortOrder.value === "desc" ? "desc" : "asc";
  renderContacts();
});

if (els.mobileTabHome) {
  els.mobileTabHome.addEventListener("click", () => setMobileView("home"));
}
if (els.mobileTabDirectory) {
  els.mobileTabDirectory.addEventListener("click", () => setMobileView("directory"));
}
if (els.mobileTabCapture) {
  els.mobileTabCapture.addEventListener("click", () => {
    setMobileView("capture");
    els.cardImage.click();
  });
}
els.userMenuBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  const activeMenuPanel = mobileMediaQuery.matches ? els.mobileUserMenuSheet : els.userMenuPanel;
  const isHidden = activeMenuPanel ? activeMenuPanel.classList.contains("hidden") : true;
  setUserMenuVisible(isHidden);
});

els.openProfilePaneBtn.addEventListener("click", () => {
  openProfilePane();
});

if (els.mobileOpenProfilePaneBtn) {
  els.mobileOpenProfilePaneBtn.addEventListener("click", () => {
    openProfilePane();
  });
}

function handleLogout() {
  setUserMenuVisible(false);
  closeProfilePane();
  localStorage.removeItem("plmActiveUserId");
  state.activeUserId = "";
  openSplash(true);
}

els.logoutBtn.addEventListener("click", () => {
  handleLogout();
});

if (els.mobileLogoutBtn) {
  els.mobileLogoutBtn.addEventListener("click", () => {
    handleLogout();
  });
}

els.closeProfilePaneBtn.addEventListener("click", () => {
  closeProfilePane();
});

els.profilePaneOverlay.addEventListener("click", () => {
  closeProfilePane();
});

els.teamProfileUser.addEventListener("change", () => {
  fillProfileForm(getSelectedProfileUser());
});

els.teamProfileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const user = getSelectedProfileUser();
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
    fillProfileForm(getSelectedProfileUser());
    showToast("Team profile saved", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (mobileMediaQuery.matches) {
    const tappedMenuButton = els.userMenuBtn.contains(target);
    const tappedMobileSheet = els.mobileUserMenuSheet && els.mobileUserMenuSheet.contains(target);
    if (!tappedMenuButton && !tappedMobileSheet) {
      setUserMenuVisible(false);
    }
    return;
  }

  if (!els.userMenuWrap.contains(target)) {
    setUserMenuVisible(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setUserMenuVisible(false);
    closeProfilePane();
  }
});

if (els.themeToggleBtn) {
  els.themeToggleBtn.addEventListener("click", toggleTheme);
}

if (els.mobileThemeToggleBtn) {
  els.mobileThemeToggleBtn.addEventListener("click", toggleTheme);
}

els.showResetPasswordBtn.addEventListener("click", () => {
  const selected = getSplashSelectedUser();
  if (!selected || state.splashRequiresPasswordSetup) {
    return;
  }
  setResetPasswordVisible(true);
});

els.cancelResetPasswordBtn.addEventListener("click", () => {
  setResetPasswordVisible(false);
  resetPasswordInputs();
});

els.applyResetPasswordBtn.addEventListener("click", () => {
  void (async () => {
    const selected = getSplashSelectedUser();
    if (!selected) {
      showToast("Choose your user card first", "error");
      return;
    }

    const currentPassword = els.resetCurrentPassword.value;
    const newPassword = els.resetNewPassword.value;
    const confirmPassword = els.resetConfirmPassword.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Fill all reset password fields", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }

    try {
      await api(`/api/users/${selected.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      showToast("Password reset successful", "success");
      setResetPasswordVisible(false);
      resetPasswordInputs();
      await loadUsers();
      updatePasswordUI();
    } catch (error) {
      showToast(error.message, "error");
    }
  })();
});

els.continueBtn.addEventListener("click", () => {
  void (async () => {
    const selected = getSplashSelectedUser();
    if (!selected) {
      showToast("Choose your user card to sign in", "error");
      return;
    }

    const password = els.userPassword.value;
    if (!password) {
      showToast("Enter your password", "error");
      return;
    }

    if (state.splashRequiresPasswordSetup) {
      if (password !== els.confirmUserPassword.value) {
        showToast("Passwords do not match", "error");
        return;
      }
    } else {
      els.confirmUserPassword.value = "";
    }

    try {
      const result = await api(`/api/users/${selected.id}/auth`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });

      if (!result.authenticated) {
        showToast("Unable to authenticate user", "error");
        return;
      }

      state.activeUserId = selected.id;
      localStorage.setItem("plmActiveUserId", selected.id);
      await loadUsers();
      updateActiveUserBadge();
      resetPasswordInputs();
      closeSplash();
      showToast(`Signed in as ${selected.name}`, "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  })();
});

els.ocrForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!els.cardImage.files || !els.cardImage.files[0]) {
    showToast("Choose an image first", "error");
    return;
  }

  const formData = new FormData();
  formData.append("cardImage", els.cardImage.files[0]);

  try {
    const response = await fetch("/api/ocr/business-card", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to process image");
    }

    const fields = data.fields || {};
    if (fields.name) els.name.value = fields.name;
    if (fields.company) els.company.value = fields.company;
    if (fields.title) els.title.value = fields.title;
    if (fields.email) els.email.value = fields.email;
    if (fields.phone) els.phone.value = fields.phone;
    if (fields.website) els.website.value = fields.website;
    if (fields.linkedIn) els.linkedIn.value = fields.linkedIn;

    els.ocrRaw.textContent = data.rawText || "No text found";
    showToast("Business card extracted", "success");
    if (mobileMediaQuery.matches) {
      setMobileView("details");
    }
  } catch (error) {
    showToast(error.message, "error");
  }
});

(async function init() {
  disableBrowserAutofill();
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
  state.searchQuery = "";
  els.searchInput.value = "";
  els.searchInput.readOnly = true;
  state.sortOrder = els.sortOrder.value === "desc" ? "desc" : "asc";
  try {
    await loadUsers();
    if (state.activeUserId) {
      closeSplash();
    } else {
      openSplash(true);
    }
    els.userPassword.disabled = false;
    els.confirmUserPassword.disabled = false;
    els.continueBtn.disabled = false;
  } catch (error) {
    const reason = error?.message ? ` (${error.message})` : "";
    showUserLoadFailure(`Could not load team members${reason}`);
    return;
  }
  if (mobileMediaQuery.matches) {
    setMobileView("home");
  } else {
    setContactPanelsVisible(false);
  }
  await loadContacts();
  syncMobileUI();
  requestAnimationFrame(() => {
    enforceNoHorizontalScroll();
  });
})();

mobileMediaQuery.addEventListener("change", () => {
  setUserMenuVisible(false);
  syncMobileUI();
  requestAnimationFrame(() => {
    enforceNoHorizontalScroll();
  });
});

window.addEventListener("resize", () => {
  requestAnimationFrame(() => {
    enforceNoHorizontalScroll();
  });
});
