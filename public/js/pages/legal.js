import { apiRequest } from '/js/utils/api.js';
import { notify } from '/js/components/notification.js';
import { ViewChangedEvent, addRoute } from '/js/utils/view.js';
import { requireAuth } from '/js/utils/auth.js';
import { ACCOUNT_BOX_SVG, CALL_SVG, MEDICAL_INFORMATION_SVG, CONTRACT_SVG } from '/images/icons/outline/icons.js';
import { LegalEvent } from "/js/utils/events/events.js";
import { Panel } from '/js/widgets/panel.js';
import { ConditionalRadio, initConditionalRadio } from '/js/widgets/conditional_radio.js';

// --- Configuration ---

const DOM_IDS = {
    // API Field Keys mapped to DOM IDs
    date_of_birth: 'date',
    college_id: 'college',
    emergency_contact_name: 'emergency-contact-name',
    emergency_contact_phone: 'emergency-contact-phone',
    home_address: 'address',
    phone_number: 'phone-number',
    
    // Boolean/Radio Logic fields (Base IDs)
    has_medical_conditions: 'medical-yes',
    has_medical_conditions_no: 'medical-no',
    medical_conditions_details: 'medical-condition',
    
    takes_medication: 'medication-yes',
    takes_medication_no: 'medication-no',
    medication_details: 'medication-condition',

    // Checkboxes
    agrees_to_fitness_statement: 'no-incapacity-checkbox',
    agrees_to_club_rules: 'terms-checkbox',
    agrees_to_pay_debts: 'debts-checkbox',
    agrees_to_data_storage: 'data-checkbox',
    agrees_to_keep_health_data: 'keep-health-checkbox',

    // Aux
    name: 'name',
    submit_btn: 'health-form-submit',
    container: 'legal-container'
};

const SIMPLE_FIELDS = [
    'date_of_birth', 'college_id', 'emergency_contact_name', 'emergency_contact_phone',
    'home_address', 'phone_number', 'medical_conditions_details', 'medication_details'
];

const CHECKBOX_FIELDS = [
    'agrees_to_fitness_statement', 'agrees_to_club_rules', 'agrees_to_pay_debts', 
    'agrees_to_data_storage', 'agrees_to_keep_health_data'
];

addRoute('/legal', 'legal');

const HTML_TEMPLATE = /*html*/
    `<div id="legal-view" class="view hidden">
        <div class="legal-container" id="${DOM_IDS.container}">
            <h1>Legal & Medical Information Form</h1>
                <div class="legal-grid">
                    <!-- Personal Info -->
                    ${Panel({
                        title: 'Personal Information',
                        icon: ACCOUNT_BOX_SVG,
                        classes: 'full-width',
                        content: `
                        <form>
                            <div class="grid">
                                <label>Name* <input type="text" id="${DOM_IDS.name}" name="name" placeholder="e.g. John Doe"></label>
                                <label>Phone Number* <input type="tel" id="${DOM_IDS.phone_number}" name="phone-number" placeholder="e.g. +44 7123 456789"></label>
                            </div>
                            <div class="grid">
                                <label>Date of Birth* <input type="date" id="${DOM_IDS.date_of_birth}" name="date"></label>
                                <label>College*
                                    <select id="${DOM_IDS.college_id}" name="college">
                                        <option value="" disabled selected>Select your college</option>
                                    </select>
                                </label>
                            </div>
                            <label>Home Address* <textarea id="${DOM_IDS.home_address}" name="address" rows="3" placeholder="e.g. 123 River St..."></textarea></label>
                        </form>`
                    })}

                    <!-- Emergency Contact -->
                    ${Panel({
                        title: 'Emergency Contact',
                        icon: CALL_SVG,
                        content: `
                        <form>
                            <label>Name* <input type="text" id="${DOM_IDS.emergency_contact_name}" name="emergency-contact-name" placeholder="e.g. Jane Doe"></label>
                            <label>Phone Number* <input type="tel" id="${DOM_IDS.emergency_contact_phone}" name="emergency-contact-phone" placeholder="e.g. +44 7123 456789"></label>
                        </form>`
                    })}

                    <!-- Medical Information -->
                    ${Panel({
                        title: 'Medical Information',
                        icon: MEDICAL_INFORMATION_SVG,
                        content: `
                        <form>
                            ${ConditionalRadio({
                                legend: 'Medical Conditions & Allergies*',
                                groupName: 'medical-condition-radio',
                                yesId: DOM_IDS.has_medical_conditions,
                                noId: DOM_IDS.has_medical_conditions_no,
                                detailId: DOM_IDS.medical_conditions_details,
                                detailPlaceholder: 'Please specify... (e.g. Asthma)'
                            })}
                            
                            ${ConditionalRadio({
                                legend: 'Medication*',
                                groupName: 'medication-radio',
                                yesId: DOM_IDS.takes_medication,
                                noId: DOM_IDS.takes_medication_no,
                                detailId: DOM_IDS.medication_details,
                                detailPlaceholder: 'Please specify... (e.g. Inhaler)'
                            })}

                            <fieldset>
                                <label><input type="checkbox" id="${DOM_IDS.agrees_to_fitness_statement}"> I am not suffering from any medical condition or injury that prevents full participation.*</label>
                            </fieldset>
                        </form>`
                    })}

                    <!-- Terms -->
                    ${Panel({
                        title: 'Terms and Conditions',
                        icon: CONTRACT_SVG,
                        classes: 'full-width',
                        content: `
                        <form>
                            <div class="grid">
                                <fieldset><label><input type="checkbox" id="${DOM_IDS.agrees_to_club_rules}"> I agree to the club rules and safety policy.*</label></fieldset>
                                <fieldset><label><input type="checkbox" id="${DOM_IDS.agrees_to_pay_debts}"> I agree to pay all outstanding debts.*</label></fieldset>
                            </div>
                            <div class="grid">
                                <fieldset><label><input type="checkbox" id="${DOM_IDS.agrees_to_data_storage}"> I agree to encrypted storage of my data.*</label></fieldset>
                                <fieldset><label><input type="checkbox" id="${DOM_IDS.agrees_to_keep_health_data}"> I would like my health form to be kept on the server beyond the end of the year.</label></fieldset>
                            </div>
                            <button type="submit" id="${DOM_IDS.submit_btn}">Submit Information</button>
                        </form>`
                    })}
                </div>
            </div>
        </div>`;

// --- Helper Functions ---

const getEl = (id) => document.getElementById(id);
const clearError = (el) => { if (el) el.removeAttribute('aria-invalid'); };
const markError = (el) => { if (el) el.ariaInvalid = 'true'; };
function getRadioBoolean(yesId, noId) {
    if (getEl(yesId)?.checked) return true;
    if (getEl(noId)?.checked) return false;
    return null;
}
function setRadioBoolean(yesId, noId, value) {
    if (value === true) getEl(yesId).checked = true;
    else if (value === false) getEl(noId).checked = true;
}


/**
 * Attaches standard input listeners to clear errors on user interaction.
 */
function initialiseInteractivity() {
    const inputs = document.querySelectorAll(`#${DOM_IDS.container} input, #${DOM_IDS.container} select, #${DOM_IDS.container} textarea`);
    inputs.forEach(input => input.addEventListener('input', () => clearError(input)));

    initConditionalRadio(DOM_IDS.has_medical_conditions, DOM_IDS.has_medical_conditions_no, DOM_IDS.medical_conditions_details);
    initConditionalRadio(DOM_IDS.takes_medication, DOM_IDS.takes_medication_no, DOM_IDS.medication_details);
}

/**
 * Collects and formats form data for API submission.
 */
function collectFormData() {
    const payload = {};

    SIMPLE_FIELDS.forEach(key => {
        const el = getEl(DOM_IDS[key]);
        if (el) payload[key] = el.value;
    });

    CHECKBOX_FIELDS.forEach(key => {
        const el = getEl(DOM_IDS[key]);
        if (el) payload[key] = el.checked;
    });

    payload.has_medical_conditions = getRadioBoolean(DOM_IDS.has_medical_conditions, DOM_IDS.has_medical_conditions_no);
    payload.takes_medication = getRadioBoolean(DOM_IDS.takes_medication, DOM_IDS.takes_medication_no);

    payload.college_id = payload.college_id ? parseInt(payload.college_id, 10) : null;

    return payload;
}


/**
 * Populates the form with existing user data.
 */
function applyFormData(data) {
    if (!data) return;

    SIMPLE_FIELDS.forEach(key => {
        const el = getEl(DOM_IDS[key]);
        if (el && data[key] !== null) el.value = data[key];
    });

    CHECKBOX_FIELDS.forEach(key => {
        const el = getEl(DOM_IDS[key]);
        if (el) el.checked = !!data[key];
    });

    setRadioBoolean(DOM_IDS.has_medical_conditions, DOM_IDS.has_medical_conditions_no, data.has_medical_conditions);
    setRadioBoolean(DOM_IDS.takes_medication, DOM_IDS.takes_medication_no, data.takes_medication);
}



// --- Main Page Logic ---

async function renderLegalPage(page) {
    if (page !== '/legal' || !await requireAuth()) return;
    
    const container = getEl(DOM_IDS.container);
    if (container) container.classList.remove('hidden');

    try {
        const [collegesRes, userData, userNameRes] = await Promise.all([
            apiRequest('GET', '/api/colleges'),
            apiRequest('GET', `/api/user/elements/filled_legal_info,${SIMPLE_FIELDS.join(',')},${CHECKBOX_FIELDS.join(',')},has_medical_conditions,takes_medication`),
            apiRequest('GET', '/api/user/elements/first_name,last_name')
        ]);

        const collegeSelect = getEl(DOM_IDS.college_id);
        if (collegeSelect) {
            collegeSelect.innerHTML = '<option value="" disabled selected>Select your college</option>' +
                (collegesRes || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }

        const nameInput = getEl(DOM_IDS.name);
        const userName = `${userNameRes.first_name} ${userNameRes.last_name}`;
        if (nameInput && userName.trim() !== 'undefined undefined') {
            nameInput.value = userName;
            nameInput.disabled = true;
        }

        if (userData && userData.filled_legal_info) {
            applyFormData(userData);
        }

        initialiseInteractivity();

    } catch (e) {
        console.error("Legal page load error", e);
        notify('Error', 'Failed to load form data.', 'error', 3000, 'legal-status');
    }
}

function setupFormSubmission() {
    const btn = getEl(DOM_IDS.submit_btn);
    if (!btn) return;

    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const payload = collectFormData();

        try {
            await apiRequest('POST', '/api/user/elements', payload);
            notify('Saved', 'Information updated successfully.', 'success', 3000, 'legal-status');
            LegalEvent.notify();
            
            document.querySelectorAll('[aria-invalid]').forEach(clearError);
        } catch (error) {
            if (error.errors) {
                let hasError = false;
                for (const [key, _] of Object.entries(error.errors)) {
                    if (DOM_IDS[key]) {
                        markError(getEl(DOM_IDS[key]));
                        hasError = true;
                    }
                }

                if (error.errors.first_name || error.errors.last_name) {
                    markError(getEl(DOM_IDS[name]));
                    hasError = true;
                }

                if (hasError) {
                    notify('Validation Error', 'Please check the highlighted fields.', 'error', 3000, 'legal-status');
                    return;
                }
            }
            notify('Error', error.message || 'Save failed.', 'error', 3000, 'legal-status');
        }
    });
}

// --- Initialisation ---

document.addEventListener('DOMContentLoaded', () => {
    setupFormSubmission();
    ViewChangedEvent.subscribe(({ resolvedPath }) => renderLegalPage(resolvedPath));
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
export { LegalEvent };