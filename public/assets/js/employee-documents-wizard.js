/**
 * Documents & KYC wizard for Add/Edit Employee modal.
 */
(function () {
  "use strict";

  const DOCUMENT_TYPES = [
    "Aadhaar Card",
    "PAN Card",
    "Passport",
    "Driving License",
    "Voter ID",
    "10th Marksheet",
    "12th Marksheet",
    "Degree Certificate",
    "Offer Letter",
    "Relieving Letter",
    "Resume",
    "Address Proof",
    "Bank Statement",
    "Other",
  ];

  const TYPE_CONFIG = {
    "Aadhaar Card": {
      category: "KYC",
      numberLabel: "Aadhaar Number",
      numberPlaceholder: "12-digit number",
      pattern: /^\d{12}$/,
      patternMessage: "Aadhaar must be exactly 12 digits",
      requireName: true,
      requireNumber: true,
      requireExpiry: false,
      showIssueDate: false,
    },
    "PAN Card": {
      category: "PAN",
      numberLabel: "PAN Number",
      numberPlaceholder: "ABCDE1234F",
      pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/i,
      patternMessage: "Invalid PAN format (e.g. ABCDE1234F)",
      requireName: true,
      requireNumber: true,
      requireExpiry: false,
      showIssueDate: false,
      uppercaseNumber: true,
    },
    Passport: {
      category: "KYC",
      numberLabel: "Passport Number",
      requireName: true,
      requireNumber: true,
      requireExpiry: true,
      showIssueDate: true,
    },
    "Driving License": {
      category: "KYC",
      numberLabel: "License Number",
      requireName: true,
      requireNumber: true,
      requireExpiry: true,
      showIssueDate: true,
    },
    "Voter ID": {
      category: "KYC",
      numberLabel: "Voter ID Number",
      requireName: true,
      requireNumber: true,
      requireExpiry: false,
      showIssueDate: false,
    },
    "10th Marksheet": {
      category: "EDUCATION",
      numberLabel: "Roll / Registration Number",
      requireName: true,
      requireNumber: false,
      requireExpiry: false,
      showIssueDate: true,
    },
    "12th Marksheet": {
      category: "EDUCATION",
      numberLabel: "Roll / Registration Number",
      requireName: true,
      requireNumber: false,
      requireExpiry: false,
      showIssueDate: true,
    },
    "Degree Certificate": {
      category: "EDUCATION",
      numberLabel: "Registration Number",
      requireName: true,
      requireNumber: false,
      requireExpiry: false,
      showIssueDate: true,
    },
    "Offer Letter": {
      category: "HR",
      numberLabel: "Reference Number",
      requireName: false,
      requireNumber: false,
      requireExpiry: false,
      showIssueDate: true,
    },
    "Relieving Letter": {
      category: "EXPERIENCE",
      numberLabel: "Reference Number",
      requireName: false,
      requireNumber: false,
      requireExpiry: false,
      showIssueDate: true,
    },
    Resume: {
      category: "OTHER",
      numberLabel: "Document Number",
      requireName: false,
      requireNumber: false,
      requireExpiry: false,
      showIssueDate: false,
    },
    "Address Proof": {
      category: "ADDRESS",
      numberLabel: "Reference Number",
      requireName: true,
      requireNumber: false,
      requireExpiry: false,
      showIssueDate: true,
    },
    "Bank Statement": {
      category: "KYC",
      numberLabel: "Account Number (last 4 digits optional)",
      requireName: true,
      requireNumber: false,
      requireExpiry: false,
      showIssueDate: true,
    },
    Other: {
      category: "OTHER",
      numberLabel: "Document Number",
      requireName: false,
      requireNumber: false,
      requireExpiry: false,
      showIssueDate: true,
    },
  };

  let entries = [];
  let editingIndex = -1;
  let formOpen = false;
  let pendingFile = null;
  let onValidityChange = null;

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function notifyValidityChange() {
    if (typeof onValidityChange === "function") onValidityChange();
  }

  function getTypeConfig(type) {
    return TYPE_CONFIG[type] || TYPE_CONFIG.Other;
  }

  function statusBadgeClass(status) {
    const s = (status || "Pending").toLowerCase();
    return `doc-status-badge doc-status-badge--${s}`;
  }

  function initSearchableSelect(selectEl, options) {
    if (!selectEl || selectEl.dataset.searchableInit === "true") return;
    selectEl.dataset.searchableInit = "true";

    if (options?.length) {
      const current = selectEl.value;
      selectEl.innerHTML = '<option value="">Select document type</option>';
      options.forEach((label) => {
        const opt = document.createElement("option");
        opt.value = label;
        opt.textContent = label;
        selectEl.appendChild(opt);
      });
      if (current) selectEl.value = current;
    }

    const wrap = document.createElement("div");
    wrap.className = "doc-searchable-wrap";
    selectEl.parentNode.insertBefore(wrap, selectEl);
    wrap.appendChild(selectEl);
    selectEl.classList.add("d-none");

    const search = document.createElement("input");
    search.type = "text";
    search.className = "form-control doc-searchable-filter";
    search.placeholder = "Search document type…";
    search.autocomplete = "off";
    wrap.insertBefore(search, selectEl);

    const dropdown = document.createElement("div");
    dropdown.className = "doc-searchable-dropdown";
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
        btn.className = "doc-searchable-option";
        btn.textContent = label;
        btn.addEventListener("mousedown", (e) => e.preventDefault());
        btn.addEventListener("click", () => {
          selectEl.value = value;
          selectEl.dispatchEvent(new Event("change", { bubbles: true }));
          search.value = label;
          dropdown.classList.remove("is-open");
        });
        dropdown.appendChild(btn);
      });
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

  function syncSearchableDisplay() {
    const wrap = els.documentType?.closest(".doc-searchable-wrap");
    if (!wrap) return;
    const search = wrap.querySelector(".doc-searchable-filter");
    const selected = els.documentType.options[els.documentType.selectedIndex];
    if (search) {
      search.value = selected && selected.value ? selected.textContent.trim() : "";
    }
  }

  function updateDynamicFields() {
    const type = els.documentType?.value || "";
    const cfg = getTypeConfig(type);

    if (els.category) els.category.value = cfg.category || "KYC";

    if (els.numberLabel) {
      els.numberLabel.textContent = cfg.numberLabel || "Document Number";
    }
    if (els.documentNumber) {
      els.documentNumber.placeholder = cfg.numberPlaceholder || "";
    }

    els.groupName?.classList.toggle("doc-field-hidden", cfg.requireName === false);
    els.groupNumber?.classList.toggle("doc-field-hidden", cfg.requireNumber === false);
    els.groupIssueDate?.classList.toggle("doc-field-hidden", cfg.showIssueDate === false);
    els.groupExpiryDate?.classList.toggle("doc-field-hidden", !cfg.requireExpiry);

    notifyValidityChange();
  }

  function getSelectedStatus() {
    const active = els.formPanel?.querySelector(".doc-status-picker__btn.is-active");
    return active?.dataset.status || "Pending";
  }

  function setSelectedStatus(status) {
    els.formPanel?.querySelectorAll(".doc-status-picker__btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.status === status);
    });
  }

  function clearFormValidation() {
    els.formPanel?.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
    els.formPanel?.querySelectorAll(".doc-inline-error").forEach((el) => el.remove());
  }

  function setFieldError(fieldEl, message) {
    if (!fieldEl) return;
    fieldEl.classList.add("is-invalid");
    const wrap = fieldEl.closest(".col-md-3, .col-md-4, .col-md-6, .col-md-12, .col-12") || fieldEl.parentElement;
    if (!wrap || wrap.querySelector(".doc-inline-error")) return;
    const err = document.createElement("div");
    err.className = "doc-inline-error";
    err.textContent = message;
    wrap.appendChild(err);
  }

  function getFormData() {
    return {
      category: els.category?.value || "KYC",
      documentType: els.documentType?.value || "",
      nameOnDocument: els.nameOnDocument?.value?.trim() || "",
      documentNumber: els.documentNumber?.value?.trim() || "",
      issueDate: els.issueDate?.value || "",
      expiryDate: els.expiryDate?.value || "",
      verificationStatus: getSelectedStatus(),
      fileUrl: els.fileUrl?.value?.trim() || "",
      documentImageUrl: els.documentImageUrl?.value?.trim() || "",
      fileName: els.fileName?.value || "",
      notes: els.notes?.value?.trim() || "",
    };
  }

  function setFormData(data) {
    const d = data || {};
    if (els.documentType) els.documentType.value = d.documentType || "";
    updateDynamicFields();
    if (els.category) els.category.value = d.category || getTypeConfig(d.documentType).category || "KYC";
    if (els.nameOnDocument) els.nameOnDocument.value = d.nameOnDocument || "";
    if (els.documentNumber) els.documentNumber.value = d.documentNumber || "";
    if (els.issueDate) els.issueDate.value = d.issueDate ? String(d.issueDate).slice(0, 10) : "";
    if (els.expiryDate) els.expiryDate.value = d.expiryDate ? String(d.expiryDate).slice(0, 10) : "";
    setSelectedStatus(d.verificationStatus || "Pending");
    if (els.fileUrl) els.fileUrl.value = d.fileUrl || "";
    if (els.documentImageUrl) els.documentImageUrl.value = d.documentImageUrl || "";
    if (els.fileName) els.fileName.value = d.fileName || "";
    if (els.notes) els.notes.value = d.notes || "";
    pendingFile = null;
    updateFilePreview(d.fileUrl, d.fileName || d.documentImageUrl);
    syncSearchableDisplay();
  }

  function validateForm({ markInvalid = false } = {}) {
    if (markInvalid) clearFormValidation();
    const data = getFormData();
    const cfg = getTypeConfig(data.documentType);
    let ok = true;

    if (!data.documentType) {
      if (markInvalid) setFieldError(els.documentType, "Required");
      ok = false;
    }
    if (cfg.requireName && !data.nameOnDocument) {
      if (markInvalid) setFieldError(els.nameOnDocument, "Required for this document type");
      ok = false;
    }
    if (cfg.requireNumber && !data.documentNumber) {
      if (markInvalid) setFieldError(els.documentNumber, "Required for this document type");
      ok = false;
    }
    if (data.documentNumber && cfg.pattern) {
      const value = cfg.uppercaseNumber ? data.documentNumber.toUpperCase() : data.documentNumber;
      if (!cfg.pattern.test(value)) {
        if (markInvalid) setFieldError(els.documentNumber, cfg.patternMessage || "Invalid format");
        ok = false;
      }
    }
    if (cfg.requireExpiry && !data.expiryDate) {
      if (markInvalid) setFieldError(els.expiryDate, "Expiry date is required");
      ok = false;
    }
    if (data.issueDate && data.expiryDate) {
      if (new Date(data.issueDate) > new Date(data.expiryDate)) {
        if (markInvalid) setFieldError(els.expiryDate, "Expiry cannot be before issue date");
        ok = false;
      }
    }
    if (!data.fileUrl && !pendingFile) {
      if (markInvalid) setFieldError(els.fileUpload, "Please upload a document file");
      ok = false;
    }

    return ok;
  }

  function updateFilePreview(url, fileName) {
    if (!els.filePreview) return;
    const name = pendingFile?.name || fileName || (url ? url.split("/").pop() : "");
    if (url || pendingFile) {
      els.filePreview.classList.remove("d-none");
      els.filePreview.querySelector(".doc-file-preview__name").textContent = name || "Document uploaded";
    } else {
      els.filePreview.classList.add("d-none");
    }
  }

  async function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/v1/employees/document/upload", {
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

  function handleFileSelected(file) {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ];
    if (!allowed.includes(file.type)) {
      alert("Only PDF, DOC, DOCX, JPG, and PNG files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be 5 MB or smaller.");
      return;
    }
    pendingFile = file;
    updateFilePreview(null, file.name);
    notifyValidityChange();
  }

  function viewDocument(entry) {
    const url = entry.fileUrl || entry.documentImageUrl;
    if (!url) {
      alert("No file attached for this document.");
      return;
    }
    const path = url.startsWith("http") ? url : `/${url.replace(/^\/+/, "")}`;
    window.open(path, "_blank", "noopener");
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
      card.className = "doc-entry-card";
      card.innerHTML = `
        <div class="doc-entry-card__top">
          <div>
            <h6 class="doc-entry-card__title"></h6>
            <p class="doc-entry-card__subtitle"></p>
          </div>
          <div class="doc-entry-card__actions">
            <button type="button" class="btn btn-sm btn-outline-secondary doc-view-entry-btn" data-index="${index}" title="View"><i class="fas fa-eye"></i></button>
            <button type="button" class="btn btn-sm btn-outline-primary doc-edit-entry-btn" data-index="${index}" title="Edit"><i class="fas fa-pen"></i></button>
            <button type="button" class="btn btn-sm btn-outline-danger doc-delete-entry-btn" data-index="${index}" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div class="doc-entry-card__meta"></div>
      `;

      card.querySelector(".doc-entry-card__title").textContent = entry.documentType || "Document";
      card.querySelector(".doc-entry-card__subtitle").textContent =
        [entry.nameOnDocument, entry.documentNumber].filter(Boolean).join(" · ") || entry.category || "KYC";

      const meta = card.querySelector(".doc-entry-card__meta");
      const parts = [`<span class="${statusBadgeClass(entry.verificationStatus)}">${entry.verificationStatus || "Pending"}</span>`];
      if (entry.expiryDate) parts.push(`<span><i class="far fa-calendar"></i> Expires ${entry.expiryDate}</span>`);
      if (entry.fileUrl || entry.documentImageUrl) parts.push('<span><i class="fas fa-paperclip"></i> File attached</span>');
      meta.innerHTML = parts.join("");
      els.savedList.appendChild(card);
    });
  }

  function showForm(mode, index) {
    formOpen = true;
    editingIndex = typeof index === "number" ? index : -1;
    pendingFile = null;
    els.formPanel?.classList.remove("d-none");
    if (els.formTitle) els.formTitle.textContent = mode === "edit" ? "Edit Document" : "Add Document";
    if (mode === "edit" && entries[index]) setFormData(entries[index]);
    else {
      clearFormValidation();
      setFormData({ verificationStatus: "Pending" });
    }
    notifyValidityChange();
  }

  function hideForm() {
    formOpen = false;
    editingIndex = -1;
    pendingFile = null;
    clearFormValidation();
    setFormData({});
    els.formPanel?.classList.add("d-none");
    notifyValidityChange();
  }

  function isFormDirty() {
    if (!formOpen) return false;
    const data = getFormData();
    return !!(
      data.documentType || data.nameOnDocument || data.documentNumber ||
      data.issueDate || data.expiryDate || data.notes || data.fileUrl || pendingFile
    );
  }

  async function saveCurrentEntry() {
    clearFormValidation();
    if (!validateForm({ markInvalid: true })) {
      notifyValidityChange();
      return false;
    }

    let data = getFormData();
    const cfg = getTypeConfig(data.documentType);
    if (cfg.uppercaseNumber && data.documentNumber) {
      data.documentNumber = data.documentNumber.toUpperCase();
    }

    try {
      if (els.saveEntryBtn) {
        els.saveEntryBtn.disabled = true;
        els.saveEntryBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving…';
      }
      if (pendingFile) {
        const result = await uploadFile(pendingFile);
        const isImage = pendingFile.type.startsWith("image/");
        if (isImage) {
          data.documentImageUrl = result.url;
          data.fileUrl = data.fileUrl || result.url;
        } else {
          data.fileUrl = result.url;
        }
        data.fileName = pendingFile.name;
      }
    } catch (err) {
      alert(err.message || "Could not upload document");
      if (els.saveEntryBtn) {
        els.saveEntryBtn.disabled = false;
        els.saveEntryBtn.innerHTML = '<i class="fas fa-check me-1"></i> Save Document';
      }
      return false;
    }

    const payload = {
      category: data.category || "KYC",
      documentType: data.documentType,
      nameOnDocument: data.nameOnDocument || null,
      documentNumber: data.documentNumber || null,
      issueDate: data.issueDate || null,
      expiryDate: data.expiryDate || null,
      verificationStatus: data.verificationStatus || "Pending",
      fileUrl: data.fileUrl || null,
      documentImageUrl: data.documentImageUrl || null,
      fileName: data.fileName || null,
      notes: data.notes || null,
    };

    if (editingIndex >= 0) entries[editingIndex] = payload;
    else entries.push(payload);

    renderSavedList();
    hideForm();

    if (els.saveEntryBtn) {
      els.saveEntryBtn.disabled = false;
      els.saveEntryBtn.innerHTML = '<i class="fas fa-check me-1"></i> Save Document';
    }
    notifyValidityChange();
    return true;
  }

  function deleteEntry(index) {
    if (!window.confirm("Remove this document?")) return;
    entries.splice(index, 1);
    if (editingIndex === index) hideForm();
    renderSavedList();
    notifyValidityChange();
  }

  function cacheElements() {
    els.savedList = $("documentsSavedList");
    els.emptyState = $("documentsEmptyState");
    els.formPanel = $("documentsFormPanel");
    els.formTitle = $("documentsFormTitle");
    els.addBtn = $("addDocumentEntryBtn");
    els.cancelBtn = $("documentsFormCancelBtn");
    els.saveEntryBtn = $("documentsFormSaveBtn");
    els.category = $("docFormCategory");
    els.documentType = $("docFormType");
    els.nameOnDocument = $("docFormName");
    els.documentNumber = $("docFormNumber");
    els.numberLabel = $("docFormNumberLabel");
    els.issueDate = $("docFormIssueDate");
    els.expiryDate = $("docFormExpiryDate");
    els.notes = $("docFormNotes");
    els.fileUrl = $("docFormFileUrl");
    els.documentImageUrl = $("docFormImageUrl");
    els.fileName = $("docFormFileName");
    els.fileUpload = $("docFormFileUpload");
    els.fileInput = $("docFormFileInput");
    els.filePreview = $("docFormFilePreview");
    els.removeFileBtn = $("docFormRemoveFileBtn");
    els.groupName = $("docGroupName");
    els.groupNumber = $("docGroupNumber");
    els.groupIssueDate = $("docGroupIssueDate");
    els.groupExpiryDate = $("docGroupExpiryDate");
  }

  function bindEvents() {
    els.addBtn?.addEventListener("click", () => showForm("add"));
    els.cancelBtn?.addEventListener("click", hideForm);
    els.saveEntryBtn?.addEventListener("click", () => saveCurrentEntry());
    els.documentType?.addEventListener("change", updateDynamicFields);

    els.formPanel?.querySelectorAll(".doc-status-picker__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        setSelectedStatus(btn.dataset.status);
        notifyValidityChange();
      });
    });

    els.savedList?.addEventListener("click", (e) => {
      const viewBtn = e.target.closest(".doc-view-entry-btn");
      const editBtn = e.target.closest(".doc-edit-entry-btn");
      const deleteBtn = e.target.closest(".doc-delete-entry-btn");
      if (viewBtn) viewDocument(entries[parseInt(viewBtn.dataset.index, 10)]);
      if (editBtn) showForm("edit", parseInt(editBtn.dataset.index, 10));
      if (deleteBtn) deleteEntry(parseInt(deleteBtn.dataset.index, 10));
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
      els.fileUpload.addEventListener("dragleave", () => els.fileUpload.classList.remove("is-dragover"));
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
      pendingFile = null;
      if (els.fileInput) els.fileInput.value = "";
      if (els.fileUrl) els.fileUrl.value = "";
      if (els.documentImageUrl) els.documentImageUrl.value = "";
      if (els.fileName) els.fileName.value = "";
      updateFilePreview(null);
      notifyValidityChange();
    });
  }

  function init(options = {}) {
    cacheElements();
    if (!els.formPanel) return;

    initSearchableSelect(els.documentType, DOCUMENT_TYPES);
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
      category: e.category,
      documentType: e.documentType,
      nameOnDocument: e.nameOnDocument,
      documentNumber: e.documentNumber,
      issueDate: e.issueDate,
      expiryDate: e.expiryDate,
      verificationStatus: e.verificationStatus,
      fileUrl: e.fileUrl,
      documentImageUrl: e.documentImageUrl,
      notes: e.notes,
    }));
  }

  function loadEntries(list) {
    entries = Array.isArray(list)
      ? list.map((d) => ({
          category: d.category || "KYC",
          documentType: d.documentType || "",
          nameOnDocument: d.nameOnDocument || "",
          documentNumber: d.documentNumber || "",
          issueDate: d.issueDate || "",
          expiryDate: d.expiryDate || "",
          verificationStatus: d.verificationStatus || "Pending",
          fileUrl: d.fileUrl || "",
          documentImageUrl: d.documentImageUrl || "",
          fileName: (d.fileUrl || d.documentImageUrl || "").split("/").pop(),
          notes: d.notes || "",
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

  window.EmployeeDocumentsWizard = {
    init,
    reset,
    getEntries,
    loadEntries,
    isTabValid,
    isFormOpen: () => formOpen,
  };
})();
