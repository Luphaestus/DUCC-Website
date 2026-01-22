/**
 * footer.js
 * 
 * Logic for the global application footer.
 * Injects social media links, contact information, and copyright notice
 * at the bottom of the main container.
 */

import { MAIL_SVG } from "../../images/icons/outline/icons.js";

/** HTML Template for the global footer */
const HTML_TEMPLATE = /*html*/`
    <footer>
        <div class="small-container">
            <div class="footer-content">
                <div class="social-links">
                    <a href="https://www.facebook.com/DurhamUniversityCanoeClub" target="_blank" aria-label="Facebook">
                        <img src="/images/icons/outline/brand-facebook.svg" alt="Facebook">
                    </a>
                    <a href="https://www.instagram.com/durhamuniversitycanoe/" target="_blank" aria-label="Instagram">
                        <img src="/images/icons/outline/brand-instagram.svg" alt="Instagram">
                    </a>
                    <a href="mailto:canoe.club@durham.ac.uk" aria-label="Email">
                        ${MAIL_SVG}
                    </a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2025 Durham University Canoe Club. All rights reserved.</p>
            </div>
        </div>
    </footer>
`;

// Insert the footer after the main container to maintain semantic document order
const main = document.querySelector('main');
if (main) {
    main.insertAdjacentHTML('afterend', HTML_TEMPLATE);
} else {
    document.body.insertAdjacentHTML('beforeend', HTML_TEMPLATE);
}