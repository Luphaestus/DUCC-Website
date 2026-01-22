import { CONTRACT_SVG, PERSON_SVG, ID_CARD_SVG, HOME_SVG, EMERGENCY_SVG, MEDICAL_INFORMATION_SVG } from '../../../../../images/icons/outline/icons.js';

/**
 * Renders the Legal tab content.
 */
export function renderLegalTab(container, user) {
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
                        <div class="info-item" style="margin-bottom: 1rem;">
                            <span class="label">Legal Waiver:</span> 
                            <span class="badge ${user.filled_legal_info ? 'success' : 'danger'}">${user.filled_legal_info ? 'Signed' : 'Missing'}</span>
                        </div>
                        <div class="info-item">
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
                        <!-- Identity Details Box -->
                        <div class="detail-info-box">
                            <span class="box-label">${ID_CARD_SVG} Identity Details</span>
                            <div class="box-value" style="display: flex; flex-direction: column; gap: 0.5rem;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="font-weight: 600; color: var(--pico-muted-color); font-size: 0.85rem;">Date of Birth</span>
                                    <span>${user.date_of_birth || 'N/A'}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="font-weight: 600; color: var(--pico-muted-color); font-size: 0.85rem;">First Aid Expiry</span>
                                    <span>${user.first_aid_expiry || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Address Box -->
                        <div class="detail-info-box">
                            <span class="box-label">${HOME_SVG} Home Address</span>
                            <span class="box-value">${user.home_address || 'N/A'}</span>
                        </div>
                        
                        <!-- Emergency Box -->
                        <div class="detail-info-box warning">
                            <span class="box-label">${EMERGENCY_SVG} Emergency Contact</span>
                            <div class="box-value">
                                <strong style="display:block; margin-bottom: 0.25rem;">${user.emergency_contact_name || 'N/A'}</strong>
                                <span style="opacity: 0.8;">${user.emergency_contact_phone || 'N/A'}</span>
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
                        <div class="medical-section">
                            <div class="info-item" style="margin-bottom: 0.5rem;">
                                <span class="label" style="min-width: 140px;">Medical Conditions:</span> 
                                <span class="badge ${user.has_medical_conditions ? 'warning' : 'success'}">${user.has_medical_conditions ? 'Yes' : 'None Reported'}</span>
                            </div>
                            ${user.has_medical_conditions ? `<div class="detail-info-box">${user.medical_conditions_details}</div>` : ''}
                        </div>

                        <div class="medical-section">
                            <div class="info-item" style="margin-bottom: 0.5rem;">
                                <span class="label" style="min-width: 140px;">Medication:</span>
                                <span class="badge ${user.takes_medication ? 'warning' : 'success'}">${user.takes_medication ? 'Yes' : 'None Reported'}</span>
                            </div>
                            ${user.takes_medication ? `<div class="detail-info-box">${user.medication_details}</div>` : ''}
                        </div>

                        <div class="info-item" style="border-top: 1px solid rgba(var(--pico-color-rgb), 0.1);">
                            <span class="label" style="min-width: 140px;">Data Consent:</span>
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
