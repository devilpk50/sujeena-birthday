/* Wall of Love — messages, photos, filters, edit/delete for creators */
(function () {
    const STORAGE_KEY = 'sujeena_wall_tokens';

    const messageForm = document.getElementById('messageForm');
    const messagesContainer = document.getElementById('messages-container');
    const wallEmpty = document.getElementById('wallEmpty');
    const messageCountEl = document.getElementById('messageCount');
    const photoCountEl = document.getElementById('photoCount');
    const wallFilters = document.getElementById('wallFilters');
    const photoInput = document.getElementById('senderPhoto');
    const photoDropzone = document.getElementById('photoDropzone');
    const photoPreviewEmpty = document.getElementById('photoPreviewEmpty');
    const photoPreviewFilled = document.getElementById('photoPreviewFilled');
    const photoPreviewImg = document.getElementById('photoPreviewImg');
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    const senderMessage = document.getElementById('senderMessage');
    const senderName = document.getElementById('senderName');
    const senderRelation = document.getElementById('senderRelation');
    const charCount = document.getElementById('charCount');
    const formErrorsSummary = document.getElementById('formErrorsSummary');
    const editingMessageId = document.getElementById('editingMessageId');
    const messageModalLabel = document.getElementById('messageModalLabel');
    const messageModalSubtitle = document.getElementById('messageModalSubtitle');
    const formPanelTitle = document.getElementById('formPanelTitle');
    const formPanelSubtitle = document.getElementById('formPanelSubtitle');
    const submitMessageBtn = document.getElementById('submitMessageBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const submitSuccess = document.getElementById('submitSuccess');
    const pageMode = document.body.dataset.wallPage || 'modal';
    const isStandalonePage = pageMode === 'standalone';
    const isPreviewPage = pageMode === 'preview';
    const removePhotoWrap = document.getElementById('removePhotoWrap');
    const removePhotoCheck = document.getElementById('removePhotoCheck');
    const messageModalEl = document.getElementById('messageModal');
    const deleteConfirmModalEl = document.getElementById('deleteConfirmModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    const VALID_RELATIONS = ['Family', 'Friend', 'Colleague'];
    const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
    const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const NAME_PATTERN = /^[\p{L}\p{M}'\s.\-]{2,50}$/u;

    if (!messagesContainer) return;


    let activeFilter = 'all';
    let allMessages = [];
    let pendingDeleteId = null;

    const fieldErrors = {
        senderName: document.getElementById('senderNameError'),
        senderRelation: document.getElementById('senderRelationError'),
        senderMessage: document.getElementById('senderMessageError'),
        senderPhoto: document.getElementById('senderPhotoError')
    };

    function getTokens() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch {
            return {};
        }
    }

    function saveToken(messageId, token) {
        const tokens = getTokens();
        tokens[String(messageId)] = token;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    }

    function getToken(messageId) {
        return getTokens()[String(messageId)];
    }

    function removeToken(messageId) {
        const tokens = getTokens();
        delete tokens[String(messageId)];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    }

    function canManage(messageId) {
        return !!getToken(messageId);
    }

    function isEditMode() {
        return !!(editingMessageId?.value);
    }

    function setFieldError(fieldId, message) {
        const el = fieldErrors[fieldId];
        const input = document.getElementById(fieldId);
        if (el) el.textContent = message || '';
        if (input) input.classList.toggle('is-invalid', !!message);
        if (fieldId === 'senderPhoto' && photoDropzone) {
            photoDropzone.classList.toggle('is-invalid', !!message);
        }
    }

    function clearAllErrors() {
        Object.keys(fieldErrors).forEach(id => setFieldError(id, ''));
        formErrorsSummary?.classList.add('d-none');
        if (formErrorsSummary) formErrorsSummary.innerHTML = '';
    }

    function validatePhotoFile(file) {
        if (!file) return '';
        if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
            return 'Photo must be JPG, PNG, GIF, or WebP.';
        }
        if (file.size > MAX_PHOTO_BYTES) {
            return 'Photo is too large. Maximum size is 5MB.';
        }
        return '';
    }

    function validateForm() {
        clearAllErrors();
        const errors = [];
        const name = senderName?.value.trim() ?? '';
        const relation = senderRelation?.value ?? '';
        const message = senderMessage?.value.trim() ?? '';
        const photoFile = photoInput?.files?.[0];

        if (!name) {
            setFieldError('senderName', 'Please enter your name.');
            errors.push('Your name is required.');
        } else if (name.length < 2) {
            setFieldError('senderName', 'Name must be at least 2 characters.');
            errors.push('Name is too short.');
        } else if (name.length > 50) {
            setFieldError('senderName', 'Name cannot exceed 50 characters.');
            errors.push('Name is too long.');
        } else if (!NAME_PATTERN.test(name)) {
            setFieldError('senderName', 'Name can only contain letters, spaces, hyphens, and apostrophes.');
            errors.push('Name contains invalid characters.');
        }

        if (!relation) {
            setFieldError('senderRelation', 'Please select how you know Sujeena.');
            errors.push('Relationship is required.');
        } else if (!VALID_RELATIONS.includes(relation)) {
            setFieldError('senderRelation', 'Please choose a valid relationship.');
            errors.push('Invalid relationship.');
        }

        if (!message) {
            setFieldError('senderMessage', 'Please write a birthday message.');
            errors.push('Message is required.');
        } else if (message.length < 10) {
            setFieldError('senderMessage', `Message needs at least 10 characters (${message.length}/10).`);
            errors.push('Message is too short.');
        } else if (message.length > 500) {
            setFieldError('senderMessage', 'Message cannot exceed 500 characters.');
            errors.push('Message is too long.');
        }

        const photoErr = validatePhotoFile(photoFile);
        if (photoErr) {
            setFieldError('senderPhoto', photoErr);
            errors.push(photoErr);
        }

        if (errors.length && formErrorsSummary) {
            formErrorsSummary.classList.remove('d-none');
            formErrorsSummary.innerHTML = `<strong>Please fix the following:</strong><ul>${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`;
            formErrorsSummary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        return errors.length === 0;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str ?? '';
        return div.innerHTML;
    }

    function formatTime(ts) {
        if (!ts) return '';
        return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function updateWallStats() {
        if (messageCountEl) messageCountEl.textContent = allMessages.length;
        if (photoCountEl) photoCountEl.textContent = allMessages.filter(m => m.photoUrl).length;
        if (wallEmpty) wallEmpty.classList.toggle('hidden', allMessages.length > 0);
    }

    function applyWallFilter() {
        document.querySelectorAll('.love-note').forEach(note => {
            const show = activeFilter === 'all' || note.dataset.relation === activeFilter;
            note.classList.toggle('hidden-by-filter', !show);
        });
    }

    function buildNoteHtml(msg, isNew = false) {
        const initial = (msg.name || '?').charAt(0).toUpperCase();
        const rotate = (Math.random() * 4 - 2).toFixed(1);
        const safeName = escapeHtml(msg.name);
        const safeMsg = escapeHtml(msg.message);
        const safeRel = escapeHtml(msg.relation);
        const isOwner = canManage(msg.id) && !isPreviewPage;

        const photoBlock = msg.photoUrl
            ? `<div class="love-note__photo-wrap" data-msg-id="${msg.id}">
                    <img src="${escapeHtml(msg.photoUrl)}" class="love-note__photo" alt="Photo from ${safeName}" loading="lazy">
               </div>`
            : `<div class="love-note__photo-placeholder"><i class="bi bi-chat-heart-fill"></i></div>`;

        const actionsBlock = isOwner
            ? `<div class="love-note__actions">
                    <button type="button" class="btn-note-action btn-note-edit" data-action="edit" data-id="${msg.id}">
                        <i class="bi bi-pencil me-1"></i> Edit
                    </button>
                    <button type="button" class="btn-note-action btn-note-delete" data-action="delete" data-id="${msg.id}">
                        <i class="bi bi-trash me-1"></i> Delete
                    </button>
               </div>`
            : '';

        return `
            <article class="love-note love-note--${safeRel} ${isNew ? 'is-new' : ''}"
                     data-id="${msg.id}" data-relation="${safeRel}"
                     style="--note-rotate: ${rotate}deg">
                <div class="love-note__tape"></div>
                ${photoBlock}
                <div class="love-note__body">
                    <p class="love-note__quote">${safeMsg}</p>
                    <div class="love-note__footer">
                        <div class="love-note__avatar">${initial}</div>
                        <div class="love-note__meta">
                            <h5>${safeName}</h5>
                            <span class="love-note__badge">${safeRel}</span>
                        </div>
                        <span class="love-note__time">${formatTime(msg.timestamp)}</span>
                    </div>
                </div>
                ${actionsBlock}
            </article>
        `;
    }

    function renderMessage(msg, isNew = false) {
        const html = buildNoteHtml(msg, isNew);
        if (isNew) {
            messagesContainer.insertAdjacentHTML('afterbegin', html);
        } else {
            messagesContainer.insertAdjacentHTML('beforeend', html);
        }
        applyWallFilter();
    }

    function replaceMessageInDom(msg) {
        const note = messagesContainer.querySelector(`.love-note[data-id="${msg.id}"]`);
        if (note) {
            const isNew = note.classList.contains('is-new');
            note.outerHTML = buildNoteHtml(msg, isNew);
        } else {
            renderMessage(msg);
        }
        applyWallFilter();
    }

    function removeMessageFromDom(id) {
        const note = messagesContainer.querySelector(`.love-note[data-id="${id}"]`);
        note?.remove();
    }

    function setFormLabels(title, subtitle) {
        if (formPanelTitle) formPanelTitle.textContent = title;
        if (formPanelSubtitle) formPanelSubtitle.textContent = subtitle;
        if (messageModalLabel) messageModalLabel.textContent = title;
        if (messageModalSubtitle) messageModalSubtitle.textContent = subtitle;
    }

    function resetFormMode() {
        if (editingMessageId) editingMessageId.value = '';
        setFormLabels('Pin Your Message', isStandalonePage
            ? 'Fill in the form below — it only takes a minute!'
            : 'Your message & photo will show for everyone');
        if (submitMessageBtn) submitMessageBtn.innerHTML = '<i class="bi bi-send-heart-fill me-2"></i> Pin to Wall of Love';
        cancelEditBtn?.classList.add('d-none');
        removePhotoWrap?.classList.add('d-none');
        if (removePhotoCheck) removePhotoCheck.checked = false;
        document.getElementById('write')?.classList.remove('editing-mode');
    }

    function populateFormForEdit(msg) {
        if (editingMessageId) editingMessageId.value = msg.id;
        setFormLabels('Edit Your Post', 'Update your message below, then save');
        if (submitMessageBtn) submitMessageBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i> Save Changes';
        cancelEditBtn?.classList.remove('d-none');
        document.getElementById('write')?.classList.add('editing-mode');

        senderName.value = msg.name;
        senderRelation.value = msg.relation;
        senderMessage.value = msg.message;
        updateCharCount();
        clearPhotoPreview();

        if (msg.photoUrl) {
            photoPreviewImg.src = msg.photoUrl;
            photoPreviewEmpty?.classList.add('d-none');
            photoPreviewFilled?.classList.remove('d-none');
            removePhotoWrap?.classList.remove('d-none');
        }
        clearAllErrors();
    }

    function scrollToForm() {
        document.getElementById('write')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function openCreateModal() {
        resetFormMode();
        messageForm?.reset();
        clearPhotoPreview();
        clearAllErrors();
        updateCharCount();
        if (isStandalonePage) {
            scrollToForm();
        } else if (messageModalEl) {
            bootstrap.Modal.getOrCreateInstance(messageModalEl).show();
        }
    }

    function openEditModal(msg) {
        if (!canManage(msg.id)) {
            alert('You can only edit posts you created on this device.');
            return;
        }
        resetFormMode();
        populateFormForEdit(msg);
        if (isStandalonePage) {
            scrollToForm();
        } else if (messageModalEl) {
            bootstrap.Modal.getOrCreateInstance(messageModalEl).show();
        }
    }

    function showSubmitSuccess() {
        if (!submitSuccess) return;
        submitSuccess.classList.remove('d-none');
        setTimeout(() => submitSuccess.classList.add('d-none'), 6000);
    }

    function openPhotoLightbox({ photo, name, relation, message }) {
        document.getElementById('fullViewImage').src = photo;
        document.getElementById('fullViewName').textContent = name;
        const msgEl = document.getElementById('fullViewMessage');
        if (message) {
            msgEl.textContent = `"${message}"`;
            msgEl.classList.remove('d-none');
        } else {
            msgEl.classList.add('d-none');
        }
        const badge = document.getElementById('fullViewBadge');
        badge.textContent = relation;
        badge.className = 'badge rounded-pill';
        if (relation === 'Family') badge.classList.add('bg-primary');
        else if (relation === 'Friend') badge.classList.add('bg-success');
        else badge.classList.add('bg-info');
        new bootstrap.Modal(document.getElementById('imageViewerModal')).show();
    }

    messagesContainer.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
            e.stopPropagation();
            const id = actionBtn.dataset.id;
            const msg = allMessages.find(m => String(m.id) === String(id));
            if (!msg) return;
            if (actionBtn.dataset.action === 'edit') openEditModal(msg);
            if (actionBtn.dataset.action === 'delete') {
                pendingDeleteId = id;
                bootstrap.Modal.getOrCreateInstance(deleteConfirmModalEl).show();
            }
            return;
        }

        const wrap = e.target.closest('.love-note__photo-wrap');
        if (!wrap) return;
        const msg = allMessages.find(m => String(m.id) === String(wrap.dataset.msgId));
        if (!msg?.photoUrl) return;
        openPhotoLightbox({
            photo: msg.photoUrl,
            name: msg.name,
            relation: msg.relation,
            message: msg.message
        });
    });

    confirmDeleteBtn?.addEventListener('click', async () => {
        if (!pendingDeleteId) return;
        const token = getToken(pendingDeleteId);
        if (!token) {
            alert('You can only delete posts you created on this device.');
            return;
        }

        confirmDeleteBtn.disabled = true;
        try {
            const response = await fetch(`/api/messages/${pendingDeleteId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ editToken: token })
            });
            const result = await response.json();
            if (response.ok) {
                allMessages = allMessages.filter(m => String(m.id) !== String(pendingDeleteId));
                removeMessageFromDom(pendingDeleteId);
                removeToken(pendingDeleteId);
                updateWallStats();
                bootstrap.Modal.getInstance(deleteConfirmModalEl)?.hide();
            } else {
                alert(result.error || 'Could not delete post.');
            }
        } catch (err) {
            console.error(err);
            alert('Could not connect to the server.');
        } finally {
            confirmDeleteBtn.disabled = false;
            pendingDeleteId = null;
        }
    });

    wallFilters?.addEventListener('click', (e) => {
        const btn = e.target.closest('.wall-filter-btn');
        if (!btn) return;
        wallFilters.querySelectorAll('.wall-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        applyWallFilter();
    });

    function showPhotoPreview(file) {
        const err = validatePhotoFile(file);
        if (err) {
            setFieldError('senderPhoto', err);
            clearPhotoPreview();
            return;
        }
        setFieldError('senderPhoto', '');
        if (removePhotoCheck) removePhotoCheck.checked = false;
        const reader = new FileReader();
        reader.onload = () => {
            photoPreviewImg.src = reader.result;
            photoPreviewEmpty?.classList.add('d-none');
            photoPreviewFilled?.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
    }

    function clearPhotoPreview() {
        if (photoInput) photoInput.value = '';
        if (!isEditMode() || !allMessages.find(m => String(m.id) === editingMessageId?.value)?.photoUrl) {
            if (photoPreviewImg) photoPreviewImg.src = '';
            photoPreviewFilled?.classList.add('d-none');
            photoPreviewEmpty?.classList.remove('d-none');
        }
        setFieldError('senderPhoto', '');
    }

    photoDropzone?.addEventListener('click', () => photoInput?.click());
    photoInput?.addEventListener('change', () => {
        if (photoInput.files?.[0]) showPhotoPreview(photoInput.files[0]);
    });
    removePhotoBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isEditMode() && removePhotoCheck) {
            removePhotoCheck.checked = true;
        }
        clearPhotoPreview();
        if (isEditMode()) {
            photoPreviewFilled?.classList.add('d-none');
            photoPreviewEmpty?.classList.remove('d-none');
        }
    });
    photoDropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        photoDropzone.classList.add('drag-over');
    });
    photoDropzone?.addEventListener('dragleave', () => photoDropzone.classList.remove('drag-over'));
    photoDropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        photoDropzone.classList.remove('drag-over');
        const file = e.dataTransfer.files?.[0];
        if (file && photoInput) {
            const dt = new DataTransfer();
            dt.items.add(file);
            photoInput.files = dt.files;
            showPhotoPreview(file);
        }
    });

    function updateCharCount() {
        const len = senderMessage?.value.length ?? 0;
        if (charCount) {
            charCount.textContent = len;
            charCount.classList.remove('char-warning', 'char-danger');
            if (len >= 500) charCount.classList.add('char-danger');
            else if (len >= 450) charCount.classList.add('char-warning');
        }
    }

    senderMessage?.addEventListener('input', () => {
        updateCharCount();
        if (fieldErrors.senderMessage?.textContent) setFieldError('senderMessage', '');
    });
    senderName?.addEventListener('input', () => {
        if (fieldErrors.senderName?.textContent) setFieldError('senderName', '');
    });
    senderRelation?.addEventListener('change', () => {
        if (fieldErrors.senderRelation?.textContent) setFieldError('senderRelation', '');
    });
    senderName?.addEventListener('blur', () => {
        const name = senderName.value.trim();
        if (name && name.length >= 2 && !NAME_PATTERN.test(name)) {
            setFieldError('senderName', 'Name can only contain letters, spaces, hyphens, and apostrophes.');
        }
    });

    messageModalEl?.addEventListener('hidden.bs.modal', () => {
        resetFormMode();
        clearAllErrors();
        clearPhotoPreview();
        updateCharCount();
        messageForm?.reset();
    });

    cancelEditBtn?.addEventListener('click', () => {
        resetFormMode();
        messageForm?.reset();
        clearPhotoPreview();
        clearAllErrors();
        updateCharCount();
    });

    if (isStandalonePage && window.location.hash === '#write') {
        setTimeout(scrollToForm, 400);
    }

    async function loadMessages() {
        try {
            const response = await fetch('/api/messages');
            const result = await response.json();
            if (response.ok) {
                allMessages = result.data || [];
                messagesContainer.innerHTML = '';
                allMessages.forEach(msg => renderMessage(msg));
                updateWallStats();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    if (messageForm && !isPreviewPage) {
        messageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!validateForm()) return;

            const editId = editingMessageId?.value;
            const token = editId ? getToken(editId) : null;

            if (editId && !token) {
                alert('You can only edit posts you created on this device.');
                return;
            }

            submitMessageBtn.disabled = true;
            submitMessageBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';

            const formData = new FormData();
            formData.append('name', senderName.value.trim());
            formData.append('relation', senderRelation.value);
            formData.append('message', senderMessage.value.trim());
            if (photoInput?.files?.[0]) formData.append('photo', photoInput.files[0]);
            if (editId) {
                formData.append('editToken', token);
                if (removePhotoCheck?.checked) formData.append('removePhoto', 'true');
            }

            const url = editId ? `/api/messages/${editId}` : '/api/messages';
            const method = editId ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, { method, body: formData });
                const result = await response.json();
                if (response.ok) {
                    if (editId) {
                        const idx = allMessages.findIndex(m => String(m.id) === String(editId));
                        if (idx >= 0) allMessages[idx] = result.data;
                        replaceMessageInDom(result.data);
                    } else {
                        allMessages.push(result.data);
                        renderMessage(result.data, true);
                        if (result.editToken) saveToken(result.data.id, result.editToken);
                    }
                    updateWallStats();
                    if (editId) {
                        resetFormMode();
                        messageForm?.reset();
                        clearPhotoPreview();
                        updateCharCount();
                    } else if (isStandalonePage) {
                        messageForm?.reset();
                        clearPhotoPreview();
                        clearAllErrors();
                        updateCharCount();
                        showSubmitSuccess();
                        messagesContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                        messageForm?.reset();
                        clearPhotoPreview();
                        updateCharCount();
                    }
                    bootstrap.Modal.getInstance(messageModalEl)?.hide();
                    if (typeof confetti === 'function' && !editId) {
                        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#FFD700', '#FFC300', '#FF6B9D'] });
                    }
                } else {
                    const errMsg = result.error || 'Could not save.';
                    if (formErrorsSummary) {
                        formErrorsSummary.classList.remove('d-none');
                        formErrorsSummary.innerHTML = escapeHtml(errMsg);
                    } else {
                        alert(errMsg);
                    }
                }
            } catch (error) {
                console.error('Error saving message:', error);
                alert('Could not connect to the server. Run: npm start');
            } finally {
                submitMessageBtn.disabled = false;
                submitMessageBtn.innerHTML = editId
                    ? '<i class="bi bi-check-lg me-2"></i> Save Changes'
                    : '<i class="bi bi-send-heart-fill me-2"></i> Pin to Wall of Love';
            }
        });
    }

    loadMessages();
})();
