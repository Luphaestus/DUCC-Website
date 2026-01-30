/**
 * Modal.js
 * 
 * Standardized glassmorphic modal component.
 */

import { CLOSE_SVG } from '../../images/icons/outline/icons.js';

export class Modal {
    constructor({ id, title, content, contentId, onClose, isView = false, extraClasses = '', contentClasses = '', bodyClass = 'c-modal-body', fallbackPath }) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.contentId = contentId || `${id}-content`;
        this.onClose = onClose;
        this.isView = isView;
        this.extraClasses = extraClasses;
        this.contentClasses = contentClasses;
        this.bodyClass = bodyClass;
        this.fallbackPath = fallbackPath;
        this.element = null;
    }

    getHTML() {
        const overlayClasses = `c-modal-overlay ${this.isView ? 'view hidden' : ''} ${this.extraClasses}`;
        const contentClasses = `c-modal-content ${this.contentClasses}`;

        return `
            <div id="${this.id}" class="${overlayClasses}">
                <div class="${contentClasses}">
                    <button class="c-modal-close-btn" data-close-modal>${CLOSE_SVG}</button>
                    ${this.title ? `<div class="c-modal-header"><h2>${this.title}</h2></div>` : ''}
                    <div id="${this.contentId}" class="${this.bodyClass}">${this.content || ''}</div>
                </div>
            </div>
        `;
    }

    attachListeners() {
        this.element = document.getElementById(this.id);
        if (!this.element) return;

        const closeBtn = this.element.querySelector('[data-close-modal]');

        const closeHandler = (e) => {
            if (e) e.stopPropagation();
            this.close();
        };

        if (closeBtn) {
            closeBtn.onclick = closeHandler;
        }

        this.element.onclick = (e) => {
            if (e.target === this.element) {
                this.close();
            }
        };
    }

    close() {
        if (this.onClose) {
            this.onClose();
        } else if (this.isView) {
            import('/js/utils/view.js').then(({ closeModal }) => {
                const fallback = typeof this.fallbackPath === 'function' ? this.fallbackPath() : this.fallbackPath;
                closeModal(fallback);
            });
        } else {
            this.hide();
        }
    }

    hide() {
        if (this.element) {
            this.element.classList.add('hidden');
            this.element.classList.remove('visible');
        }
    }

    show() {
        if (this.element) {
            this.element.classList.remove('hidden');
            requestAnimationFrame(() => this.element.classList.add('visible'));
        }
    }
}
