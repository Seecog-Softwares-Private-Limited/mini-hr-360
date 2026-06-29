/**
 * Profile photo picker with inline preview, save/cancel, and full-size view modal.
 */
window.initProfilePhotoUpload = function initProfilePhotoUpload(config) {
  const input = document.getElementById(config.inputId);
  const avatarDisplay = document.getElementById(config.avatarDisplayId);
  const statusEl = document.getElementById(config.statusId);
  const previewPanel = document.getElementById(config.previewPanelId);
  const previewImg = document.getElementById(config.previewImgId);
  const uploadBtn = document.getElementById(config.uploadBtnId);
  const cancelBtn = document.getElementById(config.cancelBtnId);
  const viewModalEl = document.getElementById(config.viewModalId);
  const viewImg = document.getElementById(config.viewImgId);

  if (!input || !avatarDisplay || !statusEl) return;

  let pendingFile = null;
  let previewObjectUrl = null;
  let viewModal = null;

  if (viewModalEl && window.bootstrap?.Modal) {
    viewModal = new bootstrap.Modal(viewModalEl);
  }

  function setStatus(message, type) {
    statusEl.textContent = message || '';
    statusEl.className = `small mt-1${type ? ` text-${type}` : ''}`;
  }

  function getAvatarImg() {
    return avatarDisplay.querySelector('img');
  }

  function ensureAvatarImg() {
    let img = getAvatarImg();
    if (!img) {
      const initials = avatarDisplay.querySelector('span');
      if (initials) initials.remove();
      img = document.createElement('img');
      img.alt = 'Profile photo';
      img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
      avatarDisplay.appendChild(img);
    }
    return img;
  }

  function revokePreviewUrl() {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
  }

  function clearPending() {
    pendingFile = null;
    revokePreviewUrl();
    if (previewPanel) previewPanel.classList.add('d-none');
    if (uploadBtn) uploadBtn.disabled = false;
    input.value = '';
  }

  function showPreview(file) {
    revokePreviewUrl();
    previewObjectUrl = URL.createObjectURL(file);
    const img = ensureAvatarImg();
    img.src = previewObjectUrl;
    if (previewImg) previewImg.src = previewObjectUrl;
    if (previewPanel) previewPanel.classList.remove('d-none');
    setStatus('Preview ready — click Save photo to apply.', 'muted');
  }

  function getCurrentPhotoUrl() {
    const img = getAvatarImg();
    return img?.src || '';
  }

  function openPhotoView() {
    const src = previewObjectUrl || getCurrentPhotoUrl();
    if (!src || !viewImg || !viewModal) return;
    viewImg.src = src;
    viewModal.show();
  }

  avatarDisplay.style.cursor = 'pointer';
  avatarDisplay.title = 'Click to view profile photo';
  avatarDisplay.addEventListener('click', () => {
    if (getCurrentPhotoUrl() || previewObjectUrl) openPhotoView();
  });

  input.addEventListener('change', function () {
    const file = input.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStatus('Please choose a JPG, PNG, or WEBP image.', 'danger');
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatus('Image must be 5MB or smaller.', 'danger');
      input.value = '';
      return;
    }

    pendingFile = file;
    showPreview(file);
  });

  cancelBtn?.addEventListener('click', () => {
    clearPending();
    setStatus('', '');
    if (config.originalPhotoUrl) {
      const img = getAvatarImg();
      if (img) img.src = config.originalPhotoUrl;
    } else {
      const img = getAvatarImg();
      if (img) img.remove();
      if (config.initialsHtml) {
        avatarDisplay.insertAdjacentHTML('beforeend', config.initialsHtml);
      }
    }
  });

  async function uploadPhoto() {
    if (!pendingFile) return;

    const formData = new FormData();
    formData.append('file', pendingFile);

    if (uploadBtn) uploadBtn.disabled = true;
    setStatus('Uploading...', 'primary');

    try {
      const response = await fetch(config.uploadUrl, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      const photoUrl = data[config.responsePhotoKey];
      if (photoUrl) {
        const img = ensureAvatarImg();
        img.src = photoUrl;
        if (previewImg) previewImg.src = photoUrl;
      }

      clearPending();
      setStatus('Profile photo updated.', 'success');
      setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      setStatus(error.message || 'Upload failed', 'danger');
      if (uploadBtn) uploadBtn.disabled = false;
    }
  }

  uploadBtn?.addEventListener('click', uploadPhoto);
};
