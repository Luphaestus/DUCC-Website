/**
 * Show custom confirmation modal.
 * @param {string} title
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export function showConfirmModal(title, message) {
    return new Promise((resolve) => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'custom-modal-overlay';

        modalOverlay.innerHTML = /*html*/`
            <div class="custom-modal-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn-cancel" id="confirm-cancel">Cancel</button>
                    <button class="btn-confirm" id="confirm-ok">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        requestAnimationFrame(() => modalOverlay.classList.add('visible'));

        const cleanup = (val) => {
            modalOverlay.classList.remove('visible');
            setTimeout(() => {
                if (document.body.contains(modalOverlay)) document.body.removeChild(modalOverlay);
                resolve(val);
            }, 300);
        };

        modalOverlay.querySelector('#confirm-ok').onclick = () => cleanup(true);
        modalOverlay.querySelector('#confirm-cancel').onclick = () => cleanup(false);
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) cleanup(false); };
    });
}

/**
 * Show password confirmation modal.
 * @param {string} title
 * @param {string} message
 * @returns {Promise<string|null>} Returns password if confirmed, null otherwise.
 */
export function showPasswordModal(title, message) {
    return new Promise((resolve) => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'custom-modal-overlay';

        modalOverlay.innerHTML = /*html*/`
            <div class="custom-modal-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <input type="password" id="confirm-password" placeholder="Enter your password" style="width: 100%; margin-bottom: 1rem;">
                <div class="modal-actions">
                    <button class="btn-cancel" id="confirm-cancel">Cancel</button>
                    <button class="btn-confirm" id="confirm-ok">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        requestAnimationFrame(() => modalOverlay.classList.add('visible'));

        const input = modalOverlay.querySelector('#confirm-password');
        input.focus();

        const cleanup = (val) => {
            modalOverlay.classList.remove('visible');
            setTimeout(() => {
                if (document.body.contains(modalOverlay)) document.body.removeChild(modalOverlay);
                resolve(val);
            }, 300);
        };

        const confirm = () => {
            const password = input.value;
            if (password) cleanup(password);
        };

        modalOverlay.querySelector('#confirm-ok').onclick = confirm;
        modalOverlay.querySelector('#confirm-cancel').onclick = () => cleanup(null);
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) cleanup(null); };
        input.onkeydown = (e) => { if (e.key === 'Enter') confirm(); };
    });
}
