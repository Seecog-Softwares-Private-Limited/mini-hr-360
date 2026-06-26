/**
 * Experience / Employment History wizard for Add/Edit Employee modal.
 */
(function () {
  "use strict";

  const FALLBACK_COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria", "Bangladesh", "Belgium", "Brazil",
    "Canada", "China", "Colombia", "Denmark", "Egypt", "Finland", "France", "Germany", "Ghana", "Greece",
    "Hong Kong", "Iceland", "India", "Indonesia", "Ireland", "Israel", "Italy", "Japan", "Kenya", "Malaysia",
    "Mexico", "Nepal", "Netherlands", "New Zealand", "Nigeria", "Norway", "Pakistan", "Philippines", "Poland",
    "Portugal", "Qatar", "Russia", "Saudi Arabia", "Singapore", "South Africa", "South Korea", "Spain", "Sri Lanka",
    "Sweden", "Switzerland", "Taiwan", "Thailand", "Turkey", "United Arab Emirates", "United Kingdom",
    "United States", "Vietnam",
  ];

  const COMMON_INDUSTRIES = [
    "Information Technology", "Software Development", "Banking & Finance", "Healthcare", "Pharmaceuticals",
    "Manufacturing", "Retail", "E-commerce", "Education", "Consulting", "Telecommunications", "Automotive",
    "Real Estate", "Hospitality", "Media & Entertainment", "Logistics & Supply Chain", "Energy & Utilities",
    "Government", "Non-Profit", "Agriculture", "Construction", "Legal Services", "Marketing & Advertising",
    "Insurance", "Other",
  ];

  let entries = [];
  let editingIndex = -1;
  let formOpen = false;
  let onValidityChange = null;

  const pendingFiles = {
    relievingLetter: null,
    salarySlips: null,
    bankStatement: null,
  };

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function notifyValidityChange() {
    if (typeof onValidityChange === "function") onValidityChange();
  }

  function initSearchableSelect(selectEl) {
    if (!selectEl || selectEl.dataset.searchableInit === "true") return;
    selectEl.dataset.searchableInit = "true";

    const wrap = document.createElement("div");
    wrap.className = "exp-searchable-wrap";
    selectEl.parentNode.insertBefore(wrap, selectEl);
    wrap.appendChild(selectEl);
    selectEl.classList.add("d-none");

    const search = document.createElement("input");
    search.type = "text";
    search.className = "form-control exp-searchable-filter";
    search.placeholder = "Type to search…";
    search.autocomplete = "off";
    wrap.insertBefore(search, selectEl);

    const icon = document.createElement("i");
    icon.className = "fas fa-chevron-down exp-searchable-icon";
    wrap.appendChild(icon);

    const dropdown = document.createElement("div");
    dropdown.className = "exp-searchable-dropdown";
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
        btn.className = "exp-searchable-option";
        btn.textContent = label;
        btn.dataset.value = value;
        if (value === selectEl.value) btn.classList.add("is-selected");
        btn.addEventListener("mousedown", (e) => e.preventDefault());
        btn.addEventListener("click", () => {
          selectEl.value = value;
          selectEl.dispatchEvent(new Event("change", { bubbles: true }));
          search.value = label;
          dropdown.classList.remove("is-open");
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

    search.addEventListener("focus", () => {
      buildOptions(search.value);
      dropdown.classList.add("is-open");
    });
    search.addEventListener("input", () => {
      buildOptions(search.value);
      dropdown.classList.add("is-open");
    });
    search.addEventListener("blur", () => setTimeout(() => dropdown.classList.remove("is-open"), 150));

    selectEl.addEventListener("change", () => {
      const selected = selectEl.options[selectEl.selectedIndex];
      search.value = selected && selected.value ? selected.textContent.trim() : "";
    });
  }

  function syncSearchableDisplays() {
    document.querySelectorAll("#experienceFormPanel .exp-searchable-wrap").forEach((wrap) => {
      const select = wrap.querySelector("select");
      const search = wrap.querySelector(".exp-searchable-filter");
      if (!select || !search) return;
      const selected = select.options[select.selectedIndex];
      search.value = selected && selected.value ? selected.textContent.trim() : "";
    });
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
    if (current && names.includes(current)) selectEl.value = current;
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
        (json.data || []).forEach((c) => {
          if (c?.name) names.add(String(c.name).trim());
        });
      }
    } catch (err) {
      /* fallback below */
    }
    FALLBACK_COUNTRIES.forEach((n) => names.add(n));
    renderCountryOptions(selectEl, [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })));
  }

  function initIndustryDatalist() {
    if (!els.industryType || document.getElementById("expIndustryList")) return;
    const datalist = document.createElement("datalist");
    datalist.id = "expIndustryList";
    COMMON_INDUSTRIES.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item;
      datalist.appendChild(opt);
    });
    els.industryType.setAttribute("list", "expIndustryList");
    els.formPanel?.appendChild(datalist);
  }

  function formatDateDisplay(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
  }

  function clearFormValidation() {
    els.formPanel?.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
    els.formPanel?.querySelectorAll(".exp-inline-error").forEach((el) => el.remove());
  }

  function setFieldError(fieldEl, message) {
    if (!fieldEl) return;
    fieldEl.classList.add("is-invalid");
    const wrap = fieldEl.closest(".col-md-3, .col-md-4, .col-md-6, .col-md-12, .col-12") || fieldEl.parentElement;
    if (!wrap || wrap.querySelector(".exp-inline-error")) return;
    const err = document.createElement("div");
    err.className = "exp-inline-error";
    err.textContent = message;
    wrap.appendChild(err);
  }

    function updateCurrentJobState() {
    const isCurrent = !!els.isCurrent?.checked;
    if (els.endDate) {
      els.endDate.disabled = isCurrent;
      els.endDate.classList.toggle("exp-date-disabled", isCurrent);
      if (isCurrent) els.endDate.value = "";
    }
    els.groupLeaving?.classList.toggle("exp-field-hidden", isCurrent);
    $("expGroupNotice")?.classList.toggle("exp-field-hidden", isCurrent);
    if (isCurrent) {
      if (els.reasonForLeaving) els.reasonForLeaving.value = "";
      if (els.noticePeriodServed) els.noticePeriodServed.checked = false;
    }
    notifyValidityChange();
  }

  function getFormData() {
    return {
      organizationName: els.organizationName?.value?.trim() || "",
      jobTitle: els.jobTitle?.value?.trim() || "",
      employmentType: els.employmentType?.value || "",
      department: els.department?.value?.trim() || "",
      industryType: els.industryType?.value?.trim() || "",
      companyLocationCity: els.city?.value?.trim() || "",
      companyLocationCountry: els.country?.value || "",
      startDate: els.startDate?.value || "",
      endDate: els.endDate?.value || "",
      isCurrent: !!els.isCurrent?.checked,
      lastDrawnCtc: els.lastDrawnCtc?.value?.trim() || "",
      reasonForLeaving: els.reasonForLeaving?.value?.trim() || "",
      noticePeriodServed: !!els.noticePeriodServed?.checked,
      relievingLetterUrl: els.relievingLetterUrl?.value?.trim() || "",
      salarySlipsUrl: els.salarySlipsUrl?.value?.trim() || "",
      bankStatementUrl: els.bankStatementUrl?.value?.trim() || "",
      relievingLetterFileName: els.relievingLetterFileName?.value || "",
      salarySlipsFileName: els.salarySlipsFileName?.value || "",
      bankStatementFileName: els.bankStatementFileName?.value || "",
    };
  }

  function setFormData(data) {
    const d = data || {};
    if (els.organizationName) els.organizationName.value = d.organizationName || "";
    if (els.jobTitle) els.jobTitle.value = d.jobTitle || "";
    if (els.employmentType) els.employmentType.value = d.employmentType || "";
    if (els.department) els.department.value = d.department || "";
    if (els.industryType) els.industryType.value = d.industryType || "";
    if (els.city) els.city.value = d.companyLocationCity || "";
    if (els.country) els.country.value = d.companyLocationCountry || "";
    if (els.startDate) els.startDate.value = d.startDate ? String(d.startDate).slice(0, 10) : "";
    if (els.endDate) els.endDate.value = d.endDate ? String(d.endDate).slice(0, 10) : "";
    if (els.isCurrent) els.isCurrent.checked = !!d.isCurrent;
    if (els.lastDrawnCtc) els.lastDrawnCtc.value = d.lastDrawnCtc != null ? d.lastDrawnCtc : "";
    if (els.reasonForLeaving) els.reasonForLeaving.value = d.reasonForLeaving || "";
    if (els.noticePeriodServed) els.noticePeriodServed.checked = !!d.noticePeriodServed;
    if (els.relievingLetterUrl) els.relievingLetterUrl.value = d.relievingLetterUrl || "";
    if (els.salarySlipsUrl) els.salarySlipsUrl.value = d.salarySlipsUrl || "";
    if (els.bankStatementUrl) els.bankStatementUrl.value = d.bankStatementUrl || "";
    if (els.relievingLetterFileName) els.relievingLetterFileName.value = d.relievingLetterFileName || "";
    if (els.salarySlipsFileName) els.salarySlipsFileName.value = d.salarySlipsFileName || "";
    if (els.bankStatementFileName) els.bankStatementFileName.value = d.bankStatementFileName || "";

    pendingFiles.relievingLetter = null;
    pendingFiles.salarySlips = null;
    pendingFiles.bankStatement = null;

    updateFilePreview("relievingLetter", d.relievingLetterUrl, d.relievingLetterFileName);
    updateFilePreview("salarySlips", d.salarySlipsUrl, d.salarySlipsFileName);
    updateFilePreview("bankStatement", d.bankStatementUrl, d.bankStatementFileName);

    updateCurrentJobState();
    syncSearchableDisplays();
  }

  function validateForm({ markInvalid = false } = {}) {
    if (markInvalid) clearFormValidation();
    const data = getFormData();
    let ok = true;

    if (!data.organizationName) {
      if (markInvalid) setFieldError(els.organizationName, "Required");
      ok = false;
    }
    if (!data.jobTitle) {
      if (markInvalid) setFieldError(els.jobTitle, "Required");
      ok = false;
    }
    if (!data.employmentType) {
      if (markInvalid) setFieldError(els.employmentType, "Required");
      ok = false;
    }
    if (!data.startDate) {
      if (markInvalid) setFieldError(els.startDate, "Required");
      ok = false;
    }
    if (!data.isCurrent && !data.endDate) {
      if (markInvalid) setFieldError(els.endDate, "Required unless currently working");
      ok = false;
    }
    if (data.startDate && data.endDate && !data.isCurrent) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (start > end) {
        if (markInvalid) setFieldError(els.endDate, "End date cannot be before start date");
        ok = false;
      }
    }
    if (data.lastDrawnCtc) {
      const salary = parseFloat(data.lastDrawnCtc);
      if (Number.isNaN(salary) || salary < 0) {
        if (markInvalid) setFieldError(els.lastDrawnCtc, "Enter a valid amount");
        ok = false;
      }
    }

    return ok;
  }

  function updateFilePreview(key, url, fileName) {
    const preview = els[`${key}Preview`];
    const pending = pendingFiles[key];
    if (!preview) return;
    const name = pending?.name || fileName || (url ? url.split("/").pop() : "");
    if (url || pending) {
      preview.classList.remove("d-none");
      preview.querySelector(".exp-file-preview__name").textContent = name || "File attached";
    } else {
      preview.classList.add("d-none");
    }
  }

  async function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/v1/employees/experience-document/upload", {
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

  function handleFileSelected(key, file) {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      alert("Only PDF, JPG, and PNG files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be 5 MB or smaller.");
      return;
    }
    pendingFiles[key] = file;
    updateFilePreview(key, null, file.name);
    notifyValidityChange();
  }

  function bindFileUpload(key, uploadEl, inputEl, removeBtn) {
    if (!uploadEl || !inputEl) return;
    uploadEl.addEventListener("click", () => inputEl.click());
    uploadEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadEl.classList.add("is-dragover");
    });
    uploadEl.addEventListener("dragleave", () => uploadEl.classList.remove("is-dragover"));
    uploadEl.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadEl.classList.remove("is-dragover");
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFileSelected(key, file);
    });
    inputEl.addEventListener("change", () => {
      const file = inputEl.files?.[0];
      if (file) handleFileSelected(key, file);
    });
    removeBtn?.addEventListener("click", () => {
      pendingFiles[key] = null;
      inputEl.value = "";
      const urlEl = els[`${key}Url`];
      const nameEl = els[`${key}FileName`];
      if (urlEl) urlEl.value = "";
      if (nameEl) nameEl.value = "";
      updateFilePreview(key, null);
      notifyValidityChange();
    });
  }

  async function resolveFileUploads(data) {
    const map = {
      relievingLetter: { urlKey: "relievingLetterUrl", nameKey: "relievingLetterFileName" },
      salarySlips: { urlKey: "salarySlipsUrl", nameKey: "salarySlipsFileName" },
      bankStatement: { urlKey: "bankStatementUrl", nameKey: "bankStatementFileName" },
    };
    for (const [key, cfg] of Object.entries(map)) {
      if (pendingFiles[key]) {
        const result = await uploadFile(pendingFiles[key]);
        data[cfg.urlKey] = result.url || data[cfg.urlKey];
        data[cfg.nameKey] = pendingFiles[key].name;
      }
    }
    return data;
  }

  function formatEntryTitle(entry) {
    return entry.jobTitle ? `${entry.jobTitle} at ${entry.organizationName}` : entry.organizationName || "Experience";
  }

  function formatDateRange(entry) {
    const start = formatDateDisplay(entry.startDate);
    const end = entry.isCurrent ? "Present" : formatDateDisplay(entry.endDate);
    if (!start && !end) return "";
    return `${start || "?"} – ${end || "?"}`;
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
      card.className = "exp-entry-card";
      card.innerHTML = `
        <div class="exp-entry-card__top">
          <div>
            <h6 class="exp-entry-card__title"></h6>
            <p class="exp-entry-card__subtitle"></p>
          </div>
          <div class="exp-entry-card__actions">
            <button type="button" class="btn btn-sm btn-outline-primary exp-edit-entry-btn" data-index="${index}" title="Edit"><i class="fas fa-pen"></i></button>
            <button type="button" class="btn btn-sm btn-outline-danger exp-delete-entry-btn" data-index="${index}" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div class="exp-entry-card__meta"></div>
      `;
      card.querySelector(".exp-entry-card__title").textContent = formatEntryTitle(entry);
      card.querySelector(".exp-entry-card__subtitle").textContent =
        [entry.employmentType, entry.department].filter(Boolean).join(" · ") || "—";

      const meta = card.querySelector(".exp-entry-card__meta");
      const parts = [];
      const range = formatDateRange(entry);
      if (range) parts.push(`<span><i class="far fa-calendar"></i> ${range}</span>`);
      if (entry.isCurrent) parts.push('<span class="exp-entry-card__badge">Currently working</span>');
      if (entry.companyLocationCity || entry.companyLocationCountry) {
        parts.push(`<span><i class="fas fa-location-dot"></i> ${[entry.companyLocationCity, entry.companyLocationCountry].filter(Boolean).join(", ")}</span>`);
      }
      if (entry.lastDrawnCtc) parts.push(`<span><i class="fas fa-indian-rupee-sign"></i> ${entry.lastDrawnCtc}</span>`);
      if (entry.relievingLetterUrl || entry.salarySlipsUrl || entry.bankStatementUrl) {
        parts.push('<span><i class="fas fa-paperclip"></i> Documents attached</span>');
      }
      meta.innerHTML = parts.join("");
      els.savedList.appendChild(card);
    });
  }

  function showForm(mode, index) {
    formOpen = true;
    editingIndex = typeof index === "number" ? index : -1;
    pendingFiles.relievingLetter = null;
    pendingFiles.salarySlips = null;
    pendingFiles.bankStatement = null;

    els.formPanel?.classList.remove("d-none");
    if (els.formTitle) {
      els.formTitle.textContent = mode === "edit" ? "Edit Experience" : "Add Experience";
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
    pendingFiles.relievingLetter = null;
    pendingFiles.salarySlips = null;
    pendingFiles.bankStatement = null;
    clearFormValidation();
    setFormData({});
    els.formPanel?.classList.add("d-none");
    notifyValidityChange();
  }

  function isFormDirty() {
    if (!formOpen) return false;
    const data = getFormData();
    return !!(
      data.organizationName || data.jobTitle || data.employmentType || data.department ||
      data.industryType || data.companyLocationCity || data.companyLocationCountry ||
      data.startDate || data.endDate || data.lastDrawnCtc || data.reasonForLeaving ||
      data.relievingLetterUrl || data.salarySlipsUrl || data.bankStatementUrl ||
      data.isCurrent || data.noticePeriodServed ||
      pendingFiles.relievingLetter || pendingFiles.salarySlips || pendingFiles.bankStatement
    );
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
      data = await resolveFileUploads(data);
    } catch (err) {
      alert(err.message || "Could not upload document(s)");
      if (els.saveEntryBtn) {
        els.saveEntryBtn.disabled = false;
        els.saveEntryBtn.innerHTML = '<i class="fas fa-check me-1"></i> Save Entry';
      }
      return false;
    }

    const payload = {
      organizationName: data.organizationName,
      jobTitle: data.jobTitle,
      employmentType: data.employmentType,
      department: data.department || null,
      industryType: data.industryType || null,
      companyLocationCity: data.companyLocationCity || null,
      companyLocationCountry: data.companyLocationCountry || null,
      startDate: data.startDate || null,
      endDate: data.isCurrent ? null : (data.endDate || null),
      isCurrent: data.isCurrent,
      lastDrawnCtc: data.lastDrawnCtc ? parseFloat(data.lastDrawnCtc) : null,
      reasonForLeaving: data.isCurrent ? null : (data.reasonForLeaving || null),
      noticePeriodServed: data.isCurrent ? false : data.noticePeriodServed,
      relievingLetterUrl: data.relievingLetterUrl || null,
      salarySlipsUrl: data.salarySlipsUrl || null,
      bankStatementUrl: data.bankStatementUrl || null,
      relievingLetterFileName: data.relievingLetterFileName || null,
      salarySlipsFileName: data.salarySlipsFileName || null,
      bankStatementFileName: data.bankStatementFileName || null,
    };

    if (editingIndex >= 0) entries[editingIndex] = payload;
    else entries.push(payload);

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
    if (!window.confirm("Remove this experience entry?")) return;
    entries.splice(index, 1);
    if (editingIndex === index) hideForm();
    renderSavedList();
    notifyValidityChange();
  }

  function cacheElements() {
    els.savedList = $("experienceSavedList");
    els.emptyState = $("experienceEmptyState");
    els.formPanel = $("experienceFormPanel");
    els.formTitle = $("experienceFormTitle");
    els.addBtn = $("addExperienceEntryBtn");
    els.cancelBtn = $("experienceFormCancelBtn");
    els.saveEntryBtn = $("experienceFormSaveBtn");
    els.organizationName = $("expFormOrganization");
    els.jobTitle = $("expFormJobTitle");
    els.employmentType = $("expFormEmploymentType");
    els.department = $("expFormDepartment");
    els.industryType = $("expFormIndustry");
    els.city = $("expFormCity");
    els.country = $("expFormCountry");
    els.startDate = $("expFormStartDate");
    els.endDate = $("expFormEndDate");
    els.isCurrent = $("expFormIsCurrent");
    els.lastDrawnCtc = $("expFormSalary");
    els.reasonForLeaving = $("expFormReason");
    els.noticePeriodServed = $("expFormNoticeServed");
    els.groupLeaving = $("expGroupLeaving");
    els.relievingLetterUrl = $("expFormRelievingUrl");
    els.salarySlipsUrl = $("expFormSalarySlipsUrl");
    els.bankStatementUrl = $("expFormBankStatementUrl");
    els.relievingLetterFileName = $("expFormRelievingFileName");
    els.salarySlipsFileName = $("expFormSalarySlipsFileName");
    els.bankStatementFileName = $("expFormBankStatementFileName");
    els.relievingLetterPreview = $("expFormRelievingPreview");
    els.salarySlipsPreview = $("expFormSalarySlipsPreview");
    els.bankStatementPreview = $("expFormBankStatementPreview");
  }

  function bindEvents() {
    els.addBtn?.addEventListener("click", () => showForm("add"));
    els.cancelBtn?.addEventListener("click", hideForm);
    els.saveEntryBtn?.addEventListener("click", () => saveCurrentEntry());
    els.isCurrent?.addEventListener("change", updateCurrentJobState);

    els.savedList?.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".exp-edit-entry-btn");
      const deleteBtn = e.target.closest(".exp-delete-entry-btn");
      if (editBtn) showForm("edit", parseInt(editBtn.dataset.index, 10));
      if (deleteBtn) deleteEntry(parseInt(deleteBtn.dataset.index, 10));
    });

    els.formPanel?.querySelectorAll("input, select, textarea").forEach((el) => {
      el.addEventListener("input", notifyValidityChange);
      el.addEventListener("change", notifyValidityChange);
    });

    bindFileUpload("relievingLetter", $("expFormRelievingUpload"), $("expFormRelievingInput"), $("expFormRelievingRemove"));
    bindFileUpload("salarySlips", $("expFormSalarySlipsUpload"), $("expFormSalarySlipsInput"), $("expFormSalarySlipsRemove"));
    bindFileUpload("bankStatement", $("expFormBankStatementUpload"), $("expFormBankStatementInput"), $("expFormBankStatementRemove"));
  }

  async function init(options = {}) {
    cacheElements();
    if (!els.formPanel) return;

    if (els.country) await ensureCountryOptions(els.country);
    initSearchableSelect(els.employmentType);
    initSearchableSelect(els.country);
    initIndustryDatalist();
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
    renderSavedList();
    hideForm();
    notifyValidityChange();
  }

  function getEntries() {
    return entries.map((e) => ({
      organizationName: e.organizationName,
      jobTitle: e.jobTitle,
      employmentType: e.employmentType,
      department: e.department,
      industryType: e.industryType,
      companyLocationCity: e.companyLocationCity,
      companyLocationCountry: e.companyLocationCountry,
      startDate: e.startDate,
      endDate: e.endDate,
      isCurrent: e.isCurrent,
      lastDrawnCtc: e.lastDrawnCtc,
      reasonForLeaving: e.reasonForLeaving,
      noticePeriodServed: e.noticePeriodServed,
      relievingLetterUrl: e.relievingLetterUrl,
      salarySlipsUrl: e.salarySlipsUrl,
      bankStatementUrl: e.bankStatementUrl,
    }));
  }

  function loadEntries(list) {
    entries = Array.isArray(list)
      ? list.map((e) => ({
          organizationName: e.organizationName || "",
          jobTitle: e.jobTitle || "",
          employmentType: e.employmentType || "",
          department: e.department || "",
          industryType: e.industryType || "",
          companyLocationCity: e.companyLocationCity || "",
          companyLocationCountry: e.companyLocationCountry || "",
          startDate: e.startDate || "",
          endDate: e.endDate || "",
          isCurrent: !!e.isCurrent,
          lastDrawnCtc: e.lastDrawnCtc != null ? e.lastDrawnCtc : "",
          reasonForLeaving: e.reasonForLeaving || "",
          noticePeriodServed: !!e.noticePeriodServed,
          relievingLetterUrl: e.relievingLetterUrl || "",
          salarySlipsUrl: e.salarySlipsUrl || "",
          bankStatementUrl: e.bankStatementUrl || "",
          relievingLetterFileName: e.relievingLetterUrl ? e.relievingLetterUrl.split("/").pop() : "",
          salarySlipsFileName: e.salarySlipsUrl ? e.salarySlipsUrl.split("/").pop() : "",
          bankStatementFileName: e.bankStatementUrl ? e.bankStatementUrl.split("/").pop() : "",
        }))
      : [];
    renderSavedList();
    hideForm();
    notifyValidityChange();
  }

  function isTabValid({ markInvalid = false } = {}) {
    if (formOpen) {
      if (markInvalid && isFormDirty()) validateForm({ markInvalid: true });
      return false;
    }
    return true;
  }

  window.EmployeeExperienceWizard = {
    init,
    reset,
    getEntries,
    loadEntries,
    isTabValid,
    isFormOpen: () => formOpen,
  };
})();
