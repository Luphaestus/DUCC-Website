import { CLOSE_SVG } from '@/utils/icons'; 

export interface ModalOptions {
    id: string;
    title?: string;
    content?: string;
    contentId?: string;
    onClose?: () => void;
    isView?: boolean;
    extraClasses?: string;
    contentClasses?: string;
    bodyClass?: string;
    fallbackPath?: string | ((path?: string) => string);
}

export class Modal {
    static openModals = 0;

    id: string;
    title?: string;
    content?: string;
    contentId: string;
    onClose?: () => void;
    isView: boolean;
    extraClasses: string;
    contentClasses: string;
    bodyClass: string;
    fallbackPath?: string | ((path?: string) => string);
    element: HTMLElement | null;
    _isVisible: boolean;

    constructor({ id, title, content, contentId, onClose, isView = false, extraClasses = '', contentClasses = '', bodyClass = 'c-modal-body', fallbackPath }: ModalOptions) {
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
        this._isVisible = false;
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

        const closeBtn = this.element.querySelector('[data-close-modal]') as HTMLElement;

        const closeHandler = (e: MouseEvent | null) => {
            if (e) e.stopPropagation();
            this.close();
        };

        if (closeBtn) {
            closeBtn.onclick = closeHandler;
        }

        this.element.onclick = (e) => {
            if (this.element && e.target === this.element) {
                this.close();
            }
        };
    }

    close() {
        if (this.onClose) {
            this.onClose();
        } 
        
        if (this.isView) {
            import('/js/utils/view.js').then(({ closeModal }) => {
                const fallback = typeof this.fallbackPath === 'function' ? this.fallbackPath(window.location.pathname) : this.fallbackPath;
                closeModal(fallback);
            });
        } else {
            this.hide();
        }
    }

    static increment() {
        Modal.openModals++;
        document.body.classList.add('modal-open');
    }

    static decrement() {
        Modal.openModals = Math.max(0, Modal.openModals - 1);
        if (Modal.openModals === 0) {
            document.body.classList.remove('modal-open');
        }
    }

    hide() {
        if (this.element) {
            this.element.classList.add('hidden');
            this.element.classList.remove('visible');
            
            if (this._isVisible) {
                Modal.decrement();
                this._isVisible = false;
            }
        }
    }

    show() {
        if (this.element) {
            this.element.classList.remove('hidden');
    
            requestAnimationFrame(() => {
                if (this.element) this.element.classList.add('visible');
            });

            if (!this._isVisible) {
                Modal.increment();
                this._isVisible = true;
            }
        }
    }
}
