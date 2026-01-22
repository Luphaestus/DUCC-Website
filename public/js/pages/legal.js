/**
 * legal.js
 * 
 * Logic for the Legal & Medical Information Form.
 * Handles extensive user profile data collection including personal info,
 * emergency contacts, medical history, and liability waivers.
 * Features complex field validation and auto-population.
 * 
 * Registered Route: /legal
 */

import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { notify } from '/js/components/notification.js';
import { ViewChangedEvent, addRoute } from '/js/utils/view.js';
import { Event } from "/js/utils/event.js";
import { requireAuth } from '/js/utils/auth.js';
import { ACCOUNT_BOX_SVG, CALL_SVG, MEDICAL_INFORMATION_SVG, CONTRACT_SVG } from '/images/icons/outline/icons.js';

// --- DOM IDs ---
const name_id = 'name';
const date_of_birth_id = 'date';
const college_id = 'college';
const emergency_contact_name_id = 'emergency-contact-name';
const emergency_contact_phone_id = 'emergency-contact-phone';
const home_address_id = 'address';
const phone_number_id = 'phone-number';
const has_medical_conditions_id = 'medical-yes';
const has_medical_conditions_no_id = 'medical-no';
const medical_conditions_details_id = 'medical-condition';
const takes_medication_id = 'medication-yes';
const takes_medication_no_id = 'medication-no';
const medication_details_id = 'medication-condition';
const agrees_to_fitness_statement_id = 'no-incapacity-checkbox';
const agrees_to_club_rules_id = 'terms-checkbox';
const agrees_to_pay_debts_id = 'debts-checkbox';
const agrees_to_data_storage_id = 'data-checkbox';
const agrees_to_keep_health_data_id = 'keep-health-checkbox';
const submitButton_id = 'health-form-submit';

addRoute('/legal', 'legal');

/** HTML Template for the legal form page */
const HTML_TEMPLATE = /*html*/`<div id="legal-view" class="view hidden">
            <div class="small-container hidden" id="legal-container">
                <h1>Legal & Medical Information Form</h1>
                <div id="grid-legal">
                    <article>
                        <form>
                            <header>
                                ${ACCOUNT_BOX_SVG}
                                <h3>Personal Information</h3>
                            </header>
                            <label for="name">Name*</label>
                            <input type="text" id=${name_id} name="name" placeholder="e.g. John Doe">
                            <label for="phone-number">Phone Number*</label>
                            <input type="tel" id=${phone_number_id} name="phone-number" placeholder="e.g. +44 7123 456789">
                            <label for="date">Date of Birth*</label>
                            <input type="date" id=${date_of_birth_id} name="date">
                            <label for="address">Home Address*</label>
                            <textarea id=${home_address_id} name="address" rows="4"
                                placeholder="e.g. 123 River St&#10;Maidenhead&#10;AB12 3CD&#10;United Kingdom"></textarea>
                            <label for="college">College*</label>
                            <Select id=${college_id} name="college" placeholder="College">
                                <option value="" disabled selected>Select your college</option>
                            </Select>
                        </form>
                    </article>

                    <article>
                        <form>
                            <header>
                                ${CALL_SVG}
                                <h3>Emergency Contact</h3>
                            </header>
                            <label for="emergency-contact-name">Name*</label>
                            <input type="text" id=${emergency_contact_name_id} name="emergency-contact-name"
                                placeholder="e.g. Jane Doe">
                            <label for="emergency-contact-phone">Phone Number*</label>
                            <input type="tel" id=${emergency_contact_phone_id} name="emergency-contact-phone"
                                placeholder="e.g. +44 7123 456789">
                        </form>
                    </article>

                    <article>
                        <form>
                            <header>
                                ${MEDICAL_INFORMATION_SVG}
                                <h3>Medical Information</h3>
                            </header>
                            <fieldset>
                                <legend>Medical Conditions & Allergies*</legend>
                                <div class="radio-group">
                                    <label for="medical-yes"><input type="radio" id=${has_medical_conditions_id} name="medical-condition-radio" value="yes"> Yes</label>
                                    <label for="medical-no"><input type="radio" id=${has_medical_conditions_no_id} name="medical-condition-radio" value="no"> No</label>
                                </div>
                                <input type="text" id=${medical_conditions_details_id} name="medical-condition" placeholder="Please specify... (e.g. Asthma)">
                            </fieldset>
                            <fieldset>
                                <legend>Medication*</legend>
                                <div class="radio-group">
                                    <label for="medication-yes"><input type="radio" id=${takes_medication_id} name="medication-radio" value="yes"> Yes</label>
                                    <label for="medication-no"><input type="radio" id=${takes_medication_no_id} name="medication-radio" value="no"> No</label>
                                </div>
                                <input type="text" id=${medication_details_id} name="medication-condition" placeholder="Please specify... (e.g. Inhaler)">
                            </fieldset>
                            <fieldset>
                                <label for="no-incapacity-checkbox">
                                    <input type="checkbox" id=${agrees_to_fitness_statement_id} name="no-incapacity-checkbox">
                                    I am not suffering from any medical condition or injury that prevents full participation.*
                                </label>
                            </fieldset>
                        </form>
                    </article>
                </div>
                <article>
                    <form>
                        <header>
                            ${CONTRACT_SVG}
                            <h3>Terms and Conditions</h3>
                        </header>
                        <fieldset>
                            <label for="terms-checkbox">
                                <input type="checkbox" id=${agrees_to_club_rules_id} name="terms-checkbox">
                                I agree to the club rules and safety policy.*
                            </label>
                        </fieldset>
                        <fieldset>
                            <label for="debts-checkbox">
                                <input type="checkbox" id=${agrees_to_pay_debts_id} name="debts-checkbox">
                                I agree to pay all outstanding debts.*
                            </label>
                        </fieldset>
                        <fieldset>
                            <label for="data-checkbox">
                                <input type="checkbox" id=${agrees_to_data_storage_id} name="data-checkbox">
                                I agree to encrypted storage of my data.*
                            </label>
                        </fieldset>
                        <fieldset>
                            <label for="keep-health-checkbox">
                                <input type="checkbox" id=${agrees_to_keep_health_data_id} name="keep-health-checkbox">
                                I would like my health form to be kept on the server beyond the end of the year.
                            </label>
                        </fieldset>
                        <button type="submit" id=${submitButton_id}>Submit</button>
                    </form>
                </article>
            </div>
        </div>`;

/**
 * Mapping between Backend API field names and Frontend DOM IDs.
 * @type {Object<string, string>}
 */
const FIELD_MAP = {
    date_of_birth: date_of_birth_id,
    college_id: college_id,
    emergency_contact_name: emergency_contact_name_id,
    emergency_contact_phone: emergency_contact_phone_id,
    home_address: home_address_id,
    phone_number: phone_number_id,
    has_medical_conditions: has_medical_conditions_id,
    medical_conditions_details: medical_conditions_details_id,
    takes_medication: takes_medication_id,
    medication_details: medication_details_id,
    agrees_to_fitness_statement: agrees_to_fitness_statement_id,
    agrees_to_club_rules: agrees_to_club_rules_id,
    agrees_to_pay_debts: agrees_to_pay_debts_id,
    agrees_to_data_storage: agrees_to_data_storage_id,
    agrees_to_keep_health_data: agrees_to_keep_health_data_id
};

/** @type {Event} Emitted when legal info is successfully saved */
const LegalEvent = new Event();

/** @type {Function|null} Handle to current notification */
let notification = null;

/** @type {Object<string, HTMLElement>} Map of active validation message elements */
let validationMessages = {};

/**
 * Displays a toast notification.
 */
function displayNotification(title, message, type) {
    if (notification) notification();
    notification = notify(title, message, type);
}

/**
 * Injects a validation error message below a specific input element.
 * 
 * @param {HTMLElement} inputElement 
 * @param {string} message 
 */
function displayValidationMessage(inputElement, message) {
    let messageId = `validation-message-${inputElement.id}`;
    let existingMessage = document.getElementById(messageId);
    
    if (!existingMessage) {
        existingMessage = document.createElement('p');
        existingMessage.id = messageId;
        existingMessage.classList.add('validation-message');
        
        if (inputElement.type === 'radio') {
            const fieldset = inputElement.closest('fieldset');
            if (fieldset) {
                fieldset.appendChild(existingMessage);
            } else {
                inputElement.parentNode.insertBefore(existingMessage, inputElement.nextSibling);
            }
        } else {
            inputElement.parentNode.insertBefore(existingMessage, inputElement.nextSibling);
        }
    }
    existingMessage.textContent = message;
    validationMessages[inputElement.id] = existingMessage;
    inputElement.ariaInvalid = 'true';
}

/**
 * Removes the validation error state from an input.
 * 
 * @param {HTMLElement} inputElement 
 */
function clearInputError(inputElement) {
    if (validationMessages[inputElement.id]) {
        validationMessages[inputElement.id].remove();
        delete validationMessages[inputElement.id];
    }
    inputElement.removeAttribute('aria-invalid');
}

/**
 * Configures a checkbox for validation watching.
 * 
 * @param {string} id - DOM ID.
 * @param {boolean} [watch=true] - If true, clears error on input.
 */
function validateCheckbox(id, watch = true) {
    const input = document.getElementById(id);
    if (!input) return false;
    if (watch) input.addEventListener('input', () => clearInputError(input));
}

/**
 * Configures a Yes/No radio group and its associated detail field.
 * Handles toggling visibility of the detail field based on the "Yes" selection.
 * 
 * @param {string} idYes - "Yes" radio ID.
 * @param {string} idNo - "No" radio ID.
 * @param {string|null} detailId - ID of the text field for extra info.
 * @param {boolean} [watch=true] - If true, adds event listeners.
 */
function validateYeseNo(idYes, idNo, detailId = null, watch = true) {
    const inputYes = document.getElementById(idYes);
    const inputNo = document.getElementById(idNo);
    const detailInput = detailId ? document.getElementById(detailId) : null;

    if (!inputYes || !inputNo) return false;

    const toggle = () => {
        clearInputError(inputYes);
        clearInputError(inputNo);
        if (detailInput) {
            if (inputYes.checked) {
                detailInput.classList.remove('hidden');
            } else {
                detailInput.classList.add('hidden');
                clearInputError(detailInput);
            }
        }
    };

    if (watch) {
        inputYes.addEventListener('input', toggle);
        inputNo.addEventListener('input', toggle);
        if (detailInput) detailInput.addEventListener('input', () => clearInputError(detailInput));
    }

    // Initial state
    if (detailInput) {
        if (inputYes.checked) detailInput.classList.remove('hidden');
        else detailInput.classList.add('hidden');
    }
}

/**
 * Aggregates all form fields into a JSON object for submission.
 * 
 * @returns {object}
 */
function getFormData() {
    const data = {};
    for (const [apiKey, domId] of Object.entries(FIELD_MAP)) {
        const el = document.getElementById(domId);
        if (!el) continue;
        if (el.type === 'checkbox' || el.type === 'radio') data[apiKey] = el.checked;
        else data[apiKey] = el.value;
    }

    // Explicitly handle radio groups to distinguish false vs null (unselected)
    const medicalYes = document.getElementById(has_medical_conditions_id);
    const medicalNo = document.getElementById(has_medical_conditions_no_id);
    if (medicalYes && medicalNo) {
        if (medicalYes.checked) data['has_medical_conditions'] = true;
        else if (medicalNo.checked) data['has_medical_conditions'] = false;
        else data['has_medical_conditions'] = null;
    }

    const medYes = document.getElementById(takes_medication_id);
    const medNo = document.getElementById(takes_medication_no_id);
    if (medYes && medNo) {
        if (medYes.checked) data['takes_medication'] = true;
        else if (medNo.checked) data['takes_medication'] = false;
        else data['takes_medication'] = null;
    }

    // Clean up numeric fields
    if (data.college_id === "" || data.college_id === null) data.college_id = null;
    else data.college_id = parseInt(data.college_id, 10);

    return data;
}

/**
 * Fills the form fields from a data object.
 * 
 * @param {object} data 
 */
function populateForm(data) {
    for (const [apiKey, domId] of Object.entries(FIELD_MAP)) {
        const el = document.getElementById(domId);
        if (!el || data[apiKey] === undefined || data[apiKey] === null) continue;
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!data[apiKey];
        else el.value = data[apiKey];
    }
}

/**
 * Initializes form validation logic and input restriction.
 * 
 * @param {boolean} [watch=true]
 */
async function validateForm(watch = true) {
    // Lock name field if already set in profile
    const name = await ajaxGet('/api/user/elements/first_name,last_name').then((d) => `${d.first_name} ${d.last_name}`).catch(() => null);
    const nameInput = document.getElementById(name_id);
    if (nameInput && name && name.trim() !== '' && name.trim() !== 'undefined undefined') {
        nameInput.value = name;
        nameInput.disabled = true;
    } else if (watch && nameInput) {
        nameInput.addEventListener('input', () => clearInputError(nameInput));
    }

    [emergency_contact_name_id, phone_number_id, emergency_contact_phone_id, home_address_id].forEach(id => {
        if (watch) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => clearInputError(el));
        }
    });

    // Set Date of Birth constraints (Min 17 years old)
    const dobInput = document.getElementById(date_of_birth_id);
    if (dobInput) {
        const today = new Date();
        const max = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
        const min = new Date(today.getFullYear() - 90, today.getMonth(), today.getDate());
        dobInput.max = max.toISOString().split('T')[0];
        dobInput.min = min.toISOString().split('T')[0];
        if (watch) dobInput.addEventListener('input', () => clearInputError(dobInput));
    }

    const collegeSelect = document.getElementById(college_id);
    if (collegeSelect && watch) {
        collegeSelect.addEventListener('input', () => clearInputError(collegeSelect));
    }

    // Initialize radio group behavior
    validateYeseNo(has_medical_conditions_id, has_medical_conditions_no_id, medical_conditions_details_id, watch);
    validateYeseNo(takes_medication_id, takes_medication_no_id, medication_details_id, watch);
    [agrees_to_fitness_statement_id, agrees_to_club_rules_id, agrees_to_pay_debts_id, agrees_to_data_storage_id].forEach(id => validateCheckbox(id, watch));
}

/**
 * Fetches existing user data and college list to populate the form.
 */
async function getCurrentMedicalData() {
    // Fetch colleges first to ensure dropdown is ready
    try {
        const colleges = await ajaxGet('/api/colleges');
        const collegeSelect = document.getElementById(college_id);
        if (collegeSelect) {
            collegeSelect.innerHTML = '<option value="" disabled selected>Select your college</option>' + 
                colleges.map(c => `<option value="${c.id}">${c.name.charAt(0).toUpperCase() + c.name.slice(1)}</option>`).join('');
        }
    } catch (e) {
        console.error("Failed to load colleges", e);
    }

    // Fetch user data
    const keys = ['filled_legal_info', ...Object.keys(FIELD_MAP)].join(',');
    const data = await ajaxGet(`/api/user/elements/${keys}`);
    if (!data || !data.filled_legal_info) return;
    
    populateForm(data);
    
    // Explicitly handle radio buttons as they are usually handled by groups in the mapper
    if (data.has_medical_conditions !== null) {
        document.getElementById(data.has_medical_conditions ? has_medical_conditions_id : has_medical_conditions_no_id).checked = true;
    }
    if (data.takes_medication !== null) {
        document.getElementById(data.takes_medication ? takes_medication_id : takes_medication_no_id).checked = true;
    }
}

/**
 * Binds the submission button logic.
 */
function bindStaticEvents() {
    const btn = document.getElementById(submitButton_id);
    if (!btn) return;
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
            await ajaxPost('/api/user/elements', getFormData());
            displayNotification('Information Saved', 'Saved successfully.', 'success');
            LegalEvent.notify();

            // Clear all errors on success
            Object.keys(validationMessages).forEach(id => {
                const el = document.getElementById(id);
                if (el) clearInputError(el);
            });
        } catch (error) {
            // Handle field-specific validation errors from server
            if (error.errors) {
                let displayedError = false;
                for (const [key, msg] of Object.entries(error.errors)) {
                    if (FIELD_MAP[key]) {
                        displayValidationMessage(document.getElementById(FIELD_MAP[key]), msg);
                        displayedError = true;
                    } else if (key === 'first_name' || key === 'last_name') {
                        const nameInput = document.getElementById(name_id);
                        if (nameInput && !nameInput.disabled) {
                            displayValidationMessage(nameInput, msg);
                            displayedError = true;
                        }
                    }
                }
                if (displayedError) {
                    displayNotification('Validation Error', 'Please check the highlighted fields.', 'error');
                    return;
                }
            }
        }
    });
}

/**
 * Triggers full page update when the route is matched.
 */
async function updateLegalPage(page) {
    if (page !== '/legal' || !await requireAuth()) return;
    const container = document.getElementById('legal-container');
    if (container) container.classList.remove('hidden');
    await getCurrentMedicalData();
    await validateForm();
}

document.addEventListener('DOMContentLoaded', () => {
    bindStaticEvents();
    ViewChangedEvent.subscribe(({ resolvedPath }) => updateLegalPage(resolvedPath));
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
export { LegalEvent };