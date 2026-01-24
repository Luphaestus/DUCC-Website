//todo refine
/**
 * legal.js (Admin User Tab)
 * 
 * Renders the "Legal" tab within the administrative user management view.
 * Provides a read-only overview of the user's signed waiver status,
 * emergency contacts, and sensitive medical disclosures.
 */

import { CONTRACT_SVG, PERSON_SVG, ID_CARD_SVG, HOME_SVG, EMERGENCY_SVG, MEDICAL_INFORMATION_SVG } from '../../../../../images/icons/outline/icons.js';

/**
 * Main rendering function for the Legal tab content.
 * 
 * @param {HTMLElement} container - The tab content area.
 * @param {object} user - The detailed user data object.
 */
export function renderLegalTab(container, user) {
    // Format the signing date for display
    const legalDate = user.legal_filled_at ? new Date(user.legal_filled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';

    container.innerHTML = `
        <div class="profile-layout-grid">
            <div class="column">
                <!-- Legal Status Card -->
                <div class="detail-card">
                    <header>
                        ${CONTRACT_SVG}
                        <h3>Legal Status</h3>
                    </header>
                    <div class="card-body">
                        <div class="info-item-modern">
                            <span class="label">Legal Waiver:</span> 
                            <span class="badge ${user.filled_legal_info ? 'success' : 'danger'}">${user.filled_legal_info ? 'Signed' : 'Missing'}</span>
                        </div>
                        <div class="info-item-modern">
                            <span class="label">Last Signed:</span> 
                            <span class="value">${legalDate}</span>
                        </div>
                    </div>
                </div>

                <!-- Personal & Emergency Card -->
                <div class="detail-card">
                    <header>
                        ${PERSON_SVG}
                        <h3>Identity & Contact</h3>
                    </header>
                    <div class="card-body detail-info-group">
                        <!-- Identity Details -->
                        <div class="detail-info-box">
                            <span class="box-label">${ID_CARD_SVG} Identity Details</span>
                            <div class="box-value-grid">
                                <div class="row">
                                    <span class="label-sub">Date of Birth</span>
                                    <span>${user.date_of_birth || 'N/A'}</span>
                                </div>
                                <div class="row">
                                    <span class="label-sub">First Aid Expiry</span>
                                    <span>${user.first_aid_expiry || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Address -->
                        <div class="detail-info-box">
                            <span class="box-label">${HOME_SVG} Home Address</span>
                            <span class="box-value">${user.home_address || 'N/A'}</span>
                        </div>
                        
                        <!-- Emergency Contact -->
                        <div class="detail-info-box warning">
                            <span class="box-label">${EMERGENCY_SVG} Emergency Contact</span>
                            <div class="box-value">
                                <strong class="contact-name">${user.emergency_contact_name || 'N/A'}</strong>
                                <span class="contact-phone">${user.emergency_contact_phone || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="column">
                <!-- Medical Details Card -->
                <div class="detail-card">
                    <header>
                        ${MEDICAL_INFORMATION_SVG}
                        <h3>Health Information</h3>
                    </header>
                    <div class="card-body detail-info-group">
                        <!-- Conditions -->
                        <div class="medical-section">
                            <div class="info-item-modern compact">
                                <span class="label">Medical Conditions:</span> 
                                <span class="badge ${user.has_medical_conditions ? 'warning' : 'success'}">${user.has_medical_conditions ? 'Yes' : 'None Reported'}</span>
                            </div>
                            ${user.has_medical_conditions ? `<div class="detail-info-box">${user.medical_conditions_details}</div>` : ''}
                        </div>

                        <!-- Medication -->
                        <div class="medical-section">
                            <div class="info-item-modern compact">
                                <span class="label">Medication:</span>
                                <span class="badge ${user.takes_medication ? 'warning' : 'success'}">${user.takes_medication ? 'Yes' : 'None Reported'}</span>
                            </div>
                            ${user.takes_medication ? `<div class="detail-info-box">${user.medication_details}</div>` : ''}
                        </div>

                        <!-- GDPR / Privacy Consent -->
                        <div class="info-item-modern border-top">
                            <span class="label">Data Consent:</span>
                            <span class="badge ${user.agrees_to_keep_health_data ? 'success' : 'neutral'}">
                                ${user.agrees_to_keep_health_data ? 'Keep Health Data' : 'Wipe Medical on Exit'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}