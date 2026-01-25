/**
 * legal.js (Admin User Tab)
 * 
 * Renders the "Legal" tab within the administrative user management view.
 */

import { Panel } from '/js/widgets/panel.js';
import { StatusIndicator } from '/js/widgets/status.js';
import { CONTRACT_SVG, PERSON_SVG, ID_CARD_SVG, HOME_SVG, EMERGENCY_SVG, MEDICAL_INFORMATION_SVG } from '../../../../../images/icons/outline/icons.js';

/**
 * Main rendering function for the Legal tab content.
 * 
 * @param {HTMLElement} container - The tab content area.
 * @param {object} user - The detailed user data object.
 */
export function renderLegalTab(container, user) {
    const isSigned = !!user.filled_legal_info;
    const legalDate = user.legal_filled_at ? new Date(user.legal_filled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';

    container.innerHTML = `
        <div class="profile-layout-grid">
            <div class="column">
                <!-- Legal Status Card -->
                ${Panel({
                    title: 'Legal Status',
                    icon: CONTRACT_SVG,
                    content: `
                        <div class="card-body">
                            ${StatusIndicator({
                                active: isSigned,
                                activeText: 'Signed',
                                inactiveText: 'Missing',
                                content: `
                                    <div class="info-item-modern mt-1">
                                        <span class="label">Last Signed:</span> 
                                        <span class="value">${legalDate}</span>
                                    </div>
                                `
                            })}
                        </div>
                    `
                })}

                ${isSigned ? `
                <!-- Personal & Emergency Card -->
                ${Panel({
                    title: 'Identity & Contact',
                    icon: PERSON_SVG,
                    content: `
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
                    `
                })}
                ` : ''}
            </div>

            ${isSigned ? `
                <div class="column">
                    <!-- Medical Details Card -->
                    ${Panel({
                        title: 'Health Information',
                        icon: MEDICAL_INFORMATION_SVG,
                        content: `
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
                        `
                    })}
                </div>
            ` : ''}
        </div>
    `;
}