/**
 * modal.js
 * Usage:
 * import { Modal } from '/js/widgets/Modal.js';
 * const myModal = new Modal({ id: 'my-modal', title: 'My Modal', content: '<p>Hello, World!</p>' });
 * const HTML_TEMPLATE = myModal.getHTML();
 * myModal.attachListeners();
 *
 * Easy way to create a modal.
 */


import { CLOSE_SVG } from '../../images/icons/outline/icons.js';

/**
 * Easy way to create a modal. 
 */
export class Modal {
    /**
     * @param {Object} options
     * @param {string} options.id - The ID for the modal overlay element.
     * @param {string} [options.title] - Optional title for the header.
     * @param {string} [options.content] - HTML content for the body.
     * @param {string} [options.contentId] - ID for the content container.
     * @param {Function} [options.onClose] - Callback when modal is closed.
     * @param {boolean} [options.isView=false] - If true, adds 'view hidden' classes for SPA routing.
     * @param {string} [options.extraClasses=''] - Extra classes for the overlay.
     * @param {string} [options.contentClasses=''] - Extra classes for the content container.
     * @param {string} [options.bodyClass='c-modal-body'] - Class for the body container. Set to empty string for no default padding/styles.
     * @param {string} [options.fallbackPath] - Path to navigate to if no history exists (only for isView=true).
     */
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

    /**
     * Generates the HTML structure for the modal.
     */
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

    /**
     * Attaches event listeners to the modal element in the DOM.
     * Checks if the element exists, if not, tries to find it by ID.
     */
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