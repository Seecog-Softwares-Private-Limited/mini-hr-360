/**
 * Education & Qualification wizard for Add/Edit Employee modal.
 */
(function () {
  "use strict";

  const SCHOOL_LEVELS = ["10th", "12th"];
  const GRAD_LEVELS = ["Diploma", "Bachelors", "Masters", "Doctorate"];
  const CURRENT_YEAR = new Date().getFullYear();
  const MIN_YEAR = CURRENT_YEAR - 60;

  const FALLBACK_COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
    "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
    "Cambodia", "Cameroon", "Canada", "Chad", "Chile", "China", "Colombia", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
    "Denmark", "Dominican Republic",
    "Ecuador", "Egypt", "El Salvador", "Estonia", "Ethiopia",
    "Fiji", "Finland", "France",
    "Georgia", "Germany", "Ghana", "Greece", "Guatemala",
    "Haiti", "Honduras", "Hong Kong", "Hungary",
    "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
    "Jamaica", "Japan", "Jordan",
    "Kazakhstan", "Kenya", "Kuwait",
    "Laos", "Latvia", "Lebanon", "Libya", "Lithuania", "Luxembourg",
    "Malaysia", "Maldives", "Malta", "Mexico", "Mongolia", "Morocco", "Myanmar",
    "Nepal", "Netherlands", "New Zealand", "Nigeria", "North Korea", "Norway",
    "Oman",
    "Pakistan", "Panama", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar",
    "Romania", "Russia", "Rwanda",
    "Saudi Arabia", "Senegal", "Serbia", "Singapore", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan", "Sweden", "Switzerland", "Syria",
    "Taiwan", "Tanzania", "Thailand", "Tunisia", "Turkey",
    "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
    "Venezuela", "Vietnam",
    "Yemen",
    "Zambia", "Zimbabwe",
  ];

  let entries = [];
  let editingIndex = -1;
  let formOpen = false;
  let pendingCertificateFile = null;
  let certificateUploadPromise = null;
  let onValidityChange = null;

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function notifyValidityChange() {
    if (typeof onValidityChange === "function") onValidityChange();
  }

  function isSchoolLevel(level) {
    return SCHOOL_LEVELS.includes(level);
  }

  function isGradLevel(level) {
    return GRAD_LEVELS.includes(level);
  }

  function populateYearSelect(selectEl, placeholder) {
    if (!selectEl) return;
    const current = selectEl.value;
    selectEl.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = placeholder || "Select year";
    selectEl.appendChild(empty);
    for (let y = CURRENT_YEAR; y >= MIN_YEAR; y -= 1) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      selectEl.appendChild(opt);
    }
    if (current) selectEl.value = current;
  }

  function initSearchableSelect(selectEl) {
    if (!selectEl || selectEl.dataset.searchableInit === "true") return;
    selectEl.dataset.searchableInit = "true";

    const wrap = document.createElement("div");
    wrap.className = "edu-searchable-wrap";
    selectEl.parentNode.insertBefore(wrap, selectEl);
    wrap.appendChild(selectEl);
    selectEl.classList.add("d-none");

    const search = document.createElement("input");
    search.type = "text";
    search.className = "form-control form-control-sm edu-searchable-filter mb-1";
    search.placeholder = "Type to search…";
    search.autocomplete = "off";
    wrap.insertBefore(search, selectEl);

    const icon = document.createElement("i");
    icon.className = "fas fa-chevron-down edu-searchable-icon";
    wrap.appendChild(icon);

    const dropdown = document.createElement("div");
    dropdown.className = "edu-searchable-dropdown";
    wrap.appendChild(dropdown);

    function buildOptions(filter) {
      dropdown.innerHTML = "";
      const q = (filter || "").trim().toLowerCase();
      Array.from(selectEl.options).forEach((opt) => {
        const label = opt.textContent.trim();
        const value = (opt.value || "").trim();
        if (!value) return;
        if (q && !label.toLowerCase().includes(q)) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "edu-searchable-option";
        btn.textContent = label;
        btn.dataset.value = value;
        if (value === selectEl.value) btn.classList.add("is-selected");
        btn.addEventListener("mousedown", (e) => e.preventDefault());
        btn.addEventListener("click", () => {
          selectEl.value = value;
          selectEl.dispatchEvent(new Event("change", { bubbles: true }));
          search.value = label;
          closeDropdown();
        });
        dropdown.appendChild(btn);
      });
      if (!dropdown.children.length) {
        const empty = document.createElement("div");
        empty.className = "px-3 py-2 small text-muted";
        empty.textContent = "No matches";
        dropdown.appendChild(empty);
      }
    }

    function openDropdown() {
      buildOptions(search.value);
      dropdown.classList.add("is-open");
    }

    function closeDropdown() {
      dropdown.classList.remove("is-open");
    }

    function syncSearchFromSelect() {
      const selected = selectEl.options[selectEl.selectedIndex];
      search.value = selected && selected.value ? selected.textContent.trim() : "";
    }

    search.addEventListener("focus", openDropdown);
    search.addEventListener("input", openDropdown);
    search.addEventListener("blur", () => setTimeout(closeDropdown, 150));
    selectEl.addEventListener("change", syncSearchFromSelect);
    syncSearchFromSelect();
  }

  function getFormData() {
    return {
      level: els.level?.value?.trim() || "",
      degree: els.degree?.value?.trim() || "",
      specialization: els.specialization?.value?.trim() || "",
      institutionName: els.institutionName?.value?.trim() || "",
      board: els.board?.value?.trim() || "",
      startYear: els.startYear?.value || "",
      endYear: els.endYear?.value || "",
      yearOfPassing: els.yearOfPassing?.value || "",
      percentageOrCgpa: els.percentageOrCgpa?.value?.trim() || "",
      modeOfStudy: els.modeOfStudy?.value || "",
      educationType: els.educationType?.value || "",
      country: els.country?.value || "",
      city: els.city?.value?.trim() || "",
      certificateUrl: els.certificateUrl?.value?.trim() || "",
      googleDriveUrl: els.googleDriveUrl?.value?.trim() || "",
      certificateFileName: els.certificateFileName?.value || "",
    };
  }

  function setFormData(data) {
    const d = data || {};
    if (els.level) els.level.value = d.level || "";
    if (els.degree) els.degree.value = d.degree || "";
    if (els.specialization) els.specialization.value = d.specialization || "";
    if (els.institutionName) els.institutionName.value = d.institutionName || "";
    if (els.board) els.board.value = d.board || "";
    if (els.startYear) els.startYear.value = d.startYear ? String(d.startYear) : "";
    if (els.endYear) els.endYear.value = d.endYear ? String(d.endYear) : "";
    if (els.yearOfPassing) els.yearOfPassing.value = d.yearOfPassing ? String(d.yearOfPassing) : "";
    if (els.percentageOrCgpa) els.percentageOrCgpa.value = d.percentageOrCgpa || "";
    if (els.modeOfStudy) els.modeOfStudy.value = d.modeOfStudy || "";
    if (els.educationType) els.educationType.value = d.educationType || "";
    if (els.country) els.country.value = d.country || "";
    if (els.city) els.city.value = d.city || "";
    if (els.certificateUrl) els.certificateUrl.value = d.certificateUrl || "";
    if (els.googleDriveUrl) els.googleDriveUrl.value = d.googleDriveUrl || "";
    if (els.certificateFileName) els.certificateFileName.value = d.certificateFileName || "";

    pendingCertificateFile = null;
    updateCertificatePreview(d.certificateUrl, d.certificateFileName);
    updateFieldVisibility();
    syncSearchableDisplays();
  }

  function syncSearchableDisplays() {
    document.querySelectorAll("#educationFormPanel .edu-searchable-wrap").forEach((wrap) => {
      const select = wrap.querySelector("select");
      const search = wrap.querySelector(".edu-searchable-filter");
      if (!select || !search) return;
      const selected = select.options[select.selectedIndex];
      search.value = selected && selected.value ? selected.textContent.trim() : "";
    });
  }

  function clearFormValidation() {
    els.formPanel?.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
    els.formPanel?.querySelectorAll(".edu-inline-error").forEach((el) => el.remove());
  }

  function setFieldError(fieldEl, message) {
    if (!fieldEl) return;
    fieldEl.classList.add("is-invalid");
    const wrap = fieldEl.closest(".col-md-3, .col-md-4, .col-md-6, .col-md-12, .col-12") || fieldEl.parentElement;
    if (!wrap || wrap.querySelector(".edu-inline-error")) return;
    const err = document.createElement("div");
    err.className = "edu-inline-error";
    err.textContent = message;
    wrap.appendChild(err);
  }

  function validateYears(data) {
    const start = parseInt(data.startYear, 10);
    const end = parseInt(data.endYear, 10);
    const passing = parseInt(data.yearOfPassing, 10);
    let ok = true;

    if (data.startYear && data.endYear && start > end) {
      setFieldError(els.endYear, "End year cannot be before start year");
      ok = false;
    }
    if (data.endYear && data.yearOfPassing && passing < end) {
      setFieldError(els.yearOfPassing, "Passing year cannot be before end year");
      ok = false;
    }
    if (data.startYear && data.yearOfPassing && passing < start) {
      setFieldError(els.yearOfPassing, "Passing year cannot be before start year");
      ok = false;
    }
    return ok;
  }

  function validateForm({ markInvalid = false } = {}) {
    if (!markInvalid) {
      return validateFormInternal(false);
    }
    clearFormValidation();
    return validateFormInternal(true);
  }

  function validateFormInternal(markInvalid) {
    const data = getFormData();
    let ok = true;

    if (!data.level) {
      if (markInvalid) setFieldError(els.level, "Required");
      ok = false;
    }
    if (!data.institutionName) {
      if (markInvalid) setFieldError(els.institutionName, "Required");
      ok = false;
    }
    if (isSchoolLevel(data.level) && !data.board) {
      if (markInvalid) setFieldError(els.board, "Required for school qualifications");
      ok = false;
    }
    if (isGradLevel(data.level) && !data.degree) {
      if (markInvalid) setFieldError(els.degree, "Required for this qualification");
      ok = false;
    }
    if (!data.startYear) {
      if (markInvalid) setFieldError(els.startYear, "Required");
      ok = false;
    }
    if (!data.endYear) {
      if (markInvalid) setFieldError(els.endYear, "Required");
      ok = false;
    }
    if (!data.yearOfPassing) {
      if (markInvalid) setFieldError(els.yearOfPassing, "Required");
      ok = false;
    }
    if (!data.educationType) {
      if (markInvalid) setFieldError(els.educationType, "Required");
      ok = false;
    }
    if (!data.country) {
      if (markInvalid) setFieldError(els.country, "Required");
      ok = false;
    }
    if (!data.city) {
      if (markInvalid) setFieldError(els.city, "Required");
      ok = false;
    }

    if (markInvalid && ok) {
      ok = validateYears(data);
    } else if (!markInvalid && ok) {
      const start = parseInt(data.startYear, 10);
      const end = parseInt(data.endYear, 10);
      const passing = parseInt(data.yearOfPassing, 10);
      if (data.startYear && data.endYear && start > end) ok = false;
      if (data.endYear && data.yearOfPassing && passing < end) ok = false;
      if (data.startYear && data.yearOfPassing && passing < start) ok = false;
    }

    return ok;
  }

  function updateFieldVisibility() {
    const level = els.level?.value || "";
    const school = isSchoolLevel(level);
    const grad = isGradLevel(level);

    els.groupDegree?.classList.toggle("edu-field-hidden", school);
    els.groupSpecialization?.classList.toggle("edu-field-hidden", school);
    els.groupBoard?.classList.toggle("edu-field-hidden", grad || !level);

    if (els.degree) els.degree.required = grad;
    if (els.board) els.board.required = school;

    if (level && els.educationType && !els.educationType.value) {
      if (school) els.educationType.value = "School";
      else if (grad) els.educationType.value = "College";
    }
  }

  function formatEntryTitle(entry) {
    if (isGradLevel(entry.level) && entry.degree) {
      return `${entry.level} — ${entry.degree}`;
    }
    return entry.level || "Education";
  }

  function formatEntrySubtitle(entry) {
    const parts = [entry.institutionName];
    if (isSchoolLevel(entry.level) && entry.board) parts.push(entry.board);
    if (entry.specialization) parts.push(entry.specialization);
    return parts.filter(Boolean).join(" · ") || "—";
  }

  function renderSavedList() {
    if (!els.savedList) return;

    els.savedList.innerHTML = "";
    els.savedList.classList.toggle("is-empty", entries.length === 0);

    if (entries.length === 0) {
      els.emptyState?.classList.remove("d-none");
      return;
    }

    els.emptyState?.classList.add("d-none");

    entries.forEach((entry, index) => {
      const card = document.createElement("article");
      card.className = "edu-entry-card";
      card.innerHTML = `
        <div class="edu-entry-card__top">
          <div>
            <h6 class="edu-entry-card__title"></h6>
            <p class="edu-entry-card__subtitle"></p>
          </div>
          <div class="edu-entry-card__actions">
            <button type="button" class="btn btn-sm btn-outline-primary edu-edit-entry-btn" data-index="${index}" title="Edit">
              <i class="fas fa-pen"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger edu-delete-entry-btn" data-index="${index}" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="edu-entry-card__meta"></div>
      `;

      card.querySelector(".edu-entry-card__title").textContent = formatEntryTitle(entry);
      card.querySelector(".edu-entry-card__subtitle").textContent = formatEntrySubtitle(entry);

      const meta = card.querySelector(".edu-entry-card__meta");
      const years = [entry.startYear, entry.endYear].filter(Boolean).join(" – ");
      const metaParts = [];
      if (years) metaParts.push(`<span><i class="far fa-calendar"></i> ${years}</span>`);
      if (entry.yearOfPassing) metaParts.push(`<span><i class="fas fa-graduation-cap"></i> Passed ${entry.yearOfPassing}</span>`);
      if (entry.percentageOrCgpa) metaParts.push(`<span><i class="fas fa-chart-line"></i> ${entry.percentageOrCgpa}</span>`);
      if (entry.city || entry.country) {
        metaParts.push(`<span><i class="fas fa-location-dot"></i> ${[entry.city, entry.country].filter(Boolean).join(", ")}</span>`);
      }
      if (entry.certificateUrl || entry.googleDriveUrl) {
        metaParts.push(`<span><i class="fas fa-paperclip"></i> Document attached</span>`);
      }
      meta.innerHTML = metaParts.join("");

      els.savedList.appendChild(card);
    });
  }

  function showForm(mode, index) {
    formOpen = true;
    editingIndex = typeof index === "number" ? index : -1;
    pendingCertificateFile = null;

    if (els.formPanel) els.formPanel.classList.remove("d-none");
    if (els.formTitle) {
      els.formTitle.textContent = mode === "edit" ? "Edit Education" : "Add Education";
    }

    if (mode === "edit" && entries[index]) {
      setFormData(entries[index]);
    } else {
      clearFormValidation();
      setFormData({});
    }

    notifyValidityChange();
  }

  function hideForm() {
    formOpen = false;
    editingIndex = -1;
    pendingCertificateFile = null;
    clearFormValidation();
    setFormData({});
    if (els.formPanel) els.formPanel.classList.add("d-none");
    notifyValidityChange();
  }

  function isFormDirty() {
    if (!formOpen) return false;
    const data = getFormData();
    return !!(
      data.level ||
      data.degree ||
      data.specialization ||
      data.institutionName ||
      data.board ||
      data.startYear ||
      data.endYear ||
      data.yearOfPassing ||
      data.percentageOrCgpa ||
      data.modeOfStudy ||
      data.educationType ||
      data.country ||
      data.city ||
      data.googleDriveUrl ||
      data.certificateUrl ||
      pendingCertificateFile
    );
  }

  async function uploadCertificateFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/v1/employees/education-certificate/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      let msg = "Upload failed";
      try {
        const err = await res.json();
        msg = err.error || msg;
      } catch (e) {
        /* ignore */
      }
      throw new Error(msg);
    }

    return res.json();
  }

  function updateCertificatePreview(url, fileName) {
    if (!els.filePreview) return;
    const name = fileName || (url ? url.split("/").pop() : "");
    if (url || pendingCertificateFile) {
      els.filePreview.classList.remove("d-none");
      els.filePreview.querySelector(".edu-file-preview__name").textContent =
        pendingCertificateFile?.name || name || "Certificate uploaded";
    } else {
      els.filePreview.classList.add("d-none");
    }
  }

  async function resolveCertificateUrl(data) {
    if (pendingCertificateFile) {
      if (!certificateUploadPromise) {
        certificateUploadPromise = uploadCertificateFile(pendingCertificateFile);
      }
      try {
        const result = await certificateUploadPromise;
        data.certificateUrl = result.url || data.certificateUrl;
        data.certificateFileName = pendingCertificateFile.name;
      } finally {
        certificateUploadPromise = null;
      }
    }
    return data;
  }

  async function saveCurrentEntry() {
    clearFormValidation();
    if (!validateForm({ markInvalid: true })) {
      notifyValidityChange();
      return false;
    }

    let data = getFormData();

    try {
      if (els.saveEntryBtn) {
        els.saveEntryBtn.disabled = true;
        els.saveEntryBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving…';
      }
      data = await resolveCertificateUrl(data);
    } catch (err) {
      alert(err.message || "Could not upload certificate");
      if (els.saveEntryBtn) {
        els.saveEntryBtn.disabled = false;
        els.saveEntryBtn.innerHTML = '<i class="fas fa-check me-1"></i> Save Entry';
      }
      return false;
    }

    const payload = {
      level: data.level,
      degree: data.degree || null,
      specialization: data.specialization || null,
      institutionName: data.institutionName,
      board: data.board || null,
      startYear: data.startYear ? parseInt(data.startYear, 10) : null,
      endYear: data.endYear ? parseInt(data.endYear, 10) : null,
      yearOfPassing: data.yearOfPassing ? parseInt(data.yearOfPassing, 10) : null,
      percentageOrCgpa: data.percentageOrCgpa || null,
      modeOfStudy: data.modeOfStudy || null,
      educationType: data.educationType,
      country: data.country,
      city: data.city,
      certificateUrl: data.certificateUrl || null,
      googleDriveUrl: data.googleDriveUrl || null,
      certificateFileName: data.certificateFileName || null,
    };

    if (editingIndex >= 0) {
      entries[editingIndex] = payload;
    } else {
      entries.push(payload);
    }

    renderSavedList();
    hideForm();

    if (els.saveEntryBtn) {
      els.saveEntryBtn.disabled = false;
      els.saveEntryBtn.innerHTML = '<i class="fas fa-check me-1"></i> Save Entry';
    }

    notifyValidityChange();
    return true;
  }

  function deleteEntry(index) {
    if (!window.confirm("Remove this education entry?")) return;
    entries.splice(index, 1);
    if (editingIndex === index) hideForm();
    renderSavedList();
    notifyValidityChange();
  }

  function bindEvents() {
    els.addBtn?.addEventListener("click", () => showForm("add"));
    els.cancelBtn?.addEventListener("click", hideForm);
    els.saveEntryBtn?.addEventListener("click", () => saveCurrentEntry());

    els.savedList?.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".edu-edit-entry-btn");
      const deleteBtn = e.target.closest(".edu-delete-entry-btn");
      if (editBtn) {
        showForm("edit", parseInt(editBtn.dataset.index, 10));
      }
      if (deleteBtn) {
        deleteEntry(parseInt(deleteBtn.dataset.index, 10));
      }
    });

    els.level?.addEventListener("change", () => {
      updateFieldVisibility();
      notifyValidityChange();
    });

    els.formPanel?.querySelectorAll("input, select, textarea").forEach((el) => {
      el.addEventListener("input", notifyValidityChange);
      el.addEventListener("change", notifyValidityChange);
    });

    if (els.fileUpload && els.fileInput) {
      els.fileUpload.addEventListener("click", () => els.fileInput.click());
      els.fileUpload.addEventListener("dragover", (e) => {
        e.preventDefault();
        els.fileUpload.classList.add("is-dragover");
      });
      els.fileUpload.addEventListener("dragleave", () => {
        els.fileUpload.classList.remove("is-dragover");
      });
      els.fileUpload.addEventListener("drop", (e) => {
        e.preventDefault();
        els.fileUpload.classList.remove("is-dragover");
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFileSelected(file);
      });
      els.fileInput.addEventListener("change", () => {
        const file = els.fileInput.files?.[0];
        if (file) handleFileSelected(file);
      });
    }

    els.removeFileBtn?.addEventListener("click", () => {
      pendingCertificateFile = null;
      if (els.fileInput) els.fileInput.value = "";
      if (els.certificateUrl) els.certificateUrl.value = "";
      if (els.certificateFileName) els.certificateFileName.value = "";
      updateCertificatePreview(null);
      notifyValidityChange();
    });
  }

  function handleFileSelected(file) {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      alert("Only PDF, JPG, and PNG files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be 5 MB or smaller.");
      return;
    }
    pendingCertificateFile = file;
    updateCertificatePreview(null, file.name);
    notifyValidityChange();
  }

  function cacheElements() {
    els.savedList = $("educationSavedList");
    els.emptyState = $("educationEmptyState");
    els.formPanel = $("educationFormPanel");
    els.formTitle = $("educationFormTitle");
    els.addBtn = $("addEducationEntryBtn");
    els.cancelBtn = $("educationFormCancelBtn");
    els.saveEntryBtn = $("educationFormSaveBtn");
    els.groupDegree = $("eduGroupDegree");
    els.groupSpecialization = $("eduGroupSpecialization");
    els.groupBoard = $("eduGroupBoard");
    els.level = $("eduFormLevel");
    els.degree = $("eduFormDegree");
    els.specialization = $("eduFormSpecialization");
    els.institutionName = $("eduFormInstitution");
    els.board = $("eduFormBoard");
    els.startYear = $("eduFormStartYear");
    els.endYear = $("eduFormEndYear");
    els.yearOfPassing = $("eduFormPassingYear");
    els.percentageOrCgpa = $("eduFormPercentage");
    els.modeOfStudy = $("eduFormMode");
    els.educationType = $("eduFormEducationType");
    els.country = $("eduFormCountry");
    els.city = $("eduFormCity");
    els.googleDriveUrl = $("eduFormDriveUrl");
    els.certificateUrl = $("eduFormCertificateUrl");
    els.certificateFileName = $("eduFormCertificateFileName");
    els.fileUpload = $("eduFormFileUpload");
    els.fileInput = $("eduFormFileInput");
    els.filePreview = $("eduFormFilePreview");
    els.removeFileBtn = $("eduFormRemoveFileBtn");
  }

  function renderCountryOptions(selectEl, names) {
    if (!selectEl) return;
    const current = selectEl.value;
    selectEl.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select country";
    selectEl.appendChild(placeholder);
    names.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      selectEl.appendChild(opt);
    });
    if (current && names.includes(current)) {
      selectEl.value = current;
    }
  }

  async function ensureCountryOptions(selectEl) {
    if (!selectEl) return;
    const names = new Set();

    Array.from(selectEl.options).forEach((opt) => {
      const value = (opt.value || opt.textContent || "").trim();
      if (value && !/^select country$/i.test(value)) names.add(value);
    });

    const presentSelect = document.querySelector('select[name="presentCountry"]');
    if (presentSelect) {
      Array.from(presentSelect.options).forEach((opt) => {
        const value = (opt.value || opt.textContent || "").trim();
        if (value && !/^select country$/i.test(value)) names.add(value);
      });
    }

    try {
      const res = await fetch("/api/v1/countries?status=ACTIVE");
      if (res.ok) {
        const json = await res.json();
        (json.data || []).forEach((country) => {
          if (country?.name) names.add(String(country.name).trim());
        });
      }
    } catch (err) {
      /* use fallbacks below */
    }

    FALLBACK_COUNTRIES.forEach((name) => names.add(name));

    const sorted = [...names].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    renderCountryOptions(selectEl, sorted);
  }

  function initYearPickers() {
    populateYearSelect(els.startYear, "Start year");
    populateYearSelect(els.endYear, "End year");
    populateYearSelect(els.yearOfPassing, "Passing year");
  }

  function initSearchableDropdowns() {
    [els.level, els.educationType, els.country].forEach(initSearchableSelect);
  }

  async function init(options = {}) {
    cacheElements();
    if (!els.formPanel) return;

    initYearPickers();
    if (els.country) {
      await ensureCountryOptions(els.country);
    }
    initSearchableDropdowns();
    bindEvents();
    renderSavedList();
    hideForm();

    if (typeof options.onValidityChange === "function") {
      onValidityChange = options.onValidityChange;
    }
  }

  function reset() {
    entries = [];
    editingIndex = -1;
    pendingCertificateFile = null;
    renderSavedList();
    hideForm();
    notifyValidityChange();
  }

  function getEntries() {
    return entries.map((e) => ({
      level: e.level,
      degree: e.degree,
      specialization: e.specialization,
      institutionName: e.institutionName,
      board: e.board,
      startYear: e.startYear,
      endYear: e.endYear,
      yearOfPassing: e.yearOfPassing,
      percentageOrCgpa: e.percentageOrCgpa,
      modeOfStudy: e.modeOfStudy,
      educationType: e.educationType,
      country: e.country,
      city: e.city,
      certificateUrl: e.certificateUrl,
      googleDriveUrl: e.googleDriveUrl,
    }));
  }

  function loadEntries(list) {
    entries = Array.isArray(list)
      ? list.map((e) => ({
          level: e.level || "",
          degree: e.degree || "",
          specialization: e.specialization || "",
          institutionName: e.institutionName || "",
          board: e.board || "",
          startYear: e.startYear || "",
          endYear: e.endYear || "",
          yearOfPassing: e.yearOfPassing || "",
          percentageOrCgpa: e.percentageOrCgpa || "",
          modeOfStudy: e.modeOfStudy || "",
          educationType: e.educationType || "",
          country: e.country || "",
          city: e.city || "",
          certificateUrl: e.certificateUrl || "",
          googleDriveUrl: e.googleDriveUrl || "",
          certificateFileName: e.certificateUrl ? e.certificateUrl.split("/").pop() : "",
        }))
      : [];
    renderSavedList();
    hideForm();
    notifyValidityChange();
  }

  function isTabValid({ markInvalid = false } = {}) {
    if (formOpen) {
      if (markInvalid && isFormDirty()) {
        validateForm({ markInvalid: true });
      }
      return false;
    }
    return true;
  }

  window.EmployeeEducationWizard = {
    init,
    reset,
    getEntries,
    loadEntries,
    isTabValid,
    isFormOpen: () => formOpen,
  };
})();
