import { ajaxGet, ajaxPost } from './misc/ajax.js';
import { notify } from './misc/notification.js';
import { ViewChangedEvent } from './misc/view.js';
import { Event } from "./misc/event.js";
import { requireAuth } from './misc/auth.js';

/**
 * Legal & Medical information form management.
 * @module Legal
 */

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

const HTML_TEMPLATE = `<div id="/legal-view" class="view hidden">
            <div class="small-container hidden" id="legal-container">
                <h1>Legal & Medical Information Form</h1>
                <div id="grid-legal">
                    <article>
                        <form>
                            <h3>Personal Information</h3>
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
                                <option value="Select" disabled selected>Select your college</option>
                                <option value="castle">Castle</option>
                                <option value="collingwood">Collingwood</option>
                                <option value="grey">Grey</option>
                                <option value="hatfield">Hatfield</option>
                                <option value="johnsnow">John Snow</option>
                                <option value="jb">Josephine Butler</option>
                                <option value="south">South</option>
                                <option value="aidans">St Aidans</option>
                                <option value="stchads">St Chads</option>
                                <option value="stcuthberts">St Cuthberts</option>
                                <option value="hildbede">St Hild & St Bede</option>
                                <option value="stjohns">St Johns</option>
                                <option value="stmarys">St Marys</option>
                                <option value="stephenson">Stephenson</option>
                                <option value="trevelyan">Trevelyan</option>
                                <option value="ustinov">Ustinov</option>
                                <option value="van-mildert">Van Mildert</option>
                            </Select>
                        </form>
                    </article>

                    <article>
                        <form>
                            <h3> Emergency Contact</h3>
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
                            <h3>Medical Information</h3>
                            <fieldset>
                                <label for="medical-condition">Do you have any medical condition or allergies?*</label>
                                <label for="medical-yes"><input type="radio" id=${has_medical_conditions_id} name="medical-condition-radio" value="yes"> Yes</label>
                                <label for="medical-no"><input type="radio" id=${has_medical_conditions_no_id} name="medical-condition-radio" value="no"> No</label>
                                <input type="text" id=${medical_conditions_details_id} name="medical-condition" placeholder="e.g. Asthma, bee sting allergy">
                            </fieldset>
                            <fieldset>
                                <label for="medication-condition">Do you take any medication?*</label>
                                <label for="medication-yes"><input type="radio" id=${takes_medication_id} name="medication-radio" value="yes"> Yes</label>
                                <label for="medication-no"><input type="radio" id=${takes_medication_no_id} name="medication-radio" value="no"> No</label>
                                <input type="text" id=${medication_details_id} name="medication-condition" placeholder="e.g. Inhaler for asthma">
                            </fieldset>
                            <fieldset>
                                <label for="no-incapacity-checkbox">I am not suffering from any medical condition or injury that prevents full participation.*</label>
                                <input type="checkbox" id=${agrees_to_fitness_statement_id} name="no-incapacity-checkbox">
                            </fieldset>
                        </form>
                    </article>
                </div>
                <article>
                    <form>
                        <h3>Terms and Conditions</h3>
                        <fieldset>
                            <label for="terms-checkbox">I agree to the club rules and safety policy.*</label>
                            <input type="checkbox" id=${agrees_to_club_rules_id} name="terms-checkbox">
                        </fieldset>
                        <fieldset>
                            <label for="debts-checkbox">I agree to pay all outstanding debts.*</label>
                            <input type="checkbox" id=${agrees_to_pay_debts_id} name="debts-checkbox">
                        </fieldset>
                        <fieldset>
                            <label for="data-checkbox">I agree to encrypted storage of my data.*</label>
                            <input type="checkbox" id=${agrees_to_data_storage_id} name="data-checkbox">
                        </fieldset>
                        <fieldset>
                            <label for="keep-health-checkbox">I would like my health form to be kept on the server beyond the end of the year.</label>
                            <input type="checkbox" id=${agrees_to_keep_health_data_id} name="keep-health-checkbox">
                        </fieldset>
                        <button type="submit" id=${submitButton_id}>Submit</button>
                    </form>
                </article>
            </div>
        </div>`;

/**
 * API field to DOM ID mapping.
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

const LegalEvent = new Event();
const inputStatus = {};
let minWarning = "none";
let notification = null;

/**
 * Sync input validity to aria-invalid.
 * @param {HTMLElement} input
 * @param {string} id
 * @param {boolean} isValid
 */
function setValidationState(input, id, isValid) {
    if (isValid) {
        input.ariaInvalid = 'false';
        inputStatus[id] = true;
    } else {
        input.ariaInvalid = input.value === '' ? minWarning : 'true';
        inputStatus[id] = false;
    }
}

function displayNotification(title, message, type) {
    if (notification) notification();
    notification = notify(title, message, type);
}

/**
 * Validate required field.
 */
function presence(id, watch = true) {
    const input = document.getElementById(id);
    if (!input) return false;
    const validate = () => setValidationState(input, id, input.value.trim() !== '');
    if (watch) input.addEventListener('input', validate);
    validate();
}

/**
 * Validate against regex.
 */
function regexInput(id, pattern, watch = true) {
    const input = document.getElementById(id);
    if (!input) return false;
    const validate = () => setValidationState(input, id, pattern.test(input.value));
    if (watch) input.addEventListener('input', validate);
    validate();
}

/**
 * Validate checkbox.
 */
function validateCheckbox(id, watch = true) {
    const input = document.getElementById(id);
    if (!input) return false;
    const validate = () => {
        inputStatus[id] = input.checked;
        input.ariaInvalid = input.checked ? 'false' : minWarning;
    };
    if (watch) input.addEventListener('input', validate);
    validate();
}

/**
 * Handle conditional medical/medication details.
 */
function validateYeseNo(idYes, idNo, detailId = null, watch = true) {
    const inputYes = document.getElementById(idYes);
    const inputNo = document.getElementById(idNo);
    const detailInput = detailId ? document.getElementById(detailId) : null;
    let detailRequired = false;

    if (!inputYes || !inputNo) return false;

    const validate = () => {
        if (inputYes.checked || inputNo.checked) {
            inputYes.ariaInvalid = 'false';
            inputNo.ariaInvalid = 'false';
            inputStatus[idYes] = true;
            inputStatus[idNo] = true
            if (detailInput) {
                if (inputYes.checked) {
                    detailInput.classList.remove('hidden');
                    presence(detailId, false);
                    detailRequired = true;
                } else {
                    detailInput.classList.add('hidden');
                    inputStatus[detailId] = true;
                    detailRequired = false;
                }
            }
        } else {
            inputYes.ariaInvalid = minWarning;
            inputNo.ariaInvalid = minWarning;
            inputStatus[idYes] = false;
            inputStatus[idNo] = false;
            if (detailInput) {
                detailInput.classList.add('hidden');
                detailRequired = false;
            }
        }
    };

    if (watch) {
        inputYes.addEventListener('input', validate);
        inputNo.addEventListener('input', validate);
    }

    const lpresence = (id, watch = true) => {
        const input = document.getElementById(id);
        if (!input) return false;
        const v = () => { if (detailRequired) setValidationState(input, id, input.value.trim() !== ''); };
        if (watch) input.addEventListener('input', v);
        v();
    };

    validate();
    if (detailInput) lpresence(detailId, watch);
}

/**
 * Collect form data into JSON.
 */
function getFormData() {
    const data = {};
    for (const [apiKey, domId] of Object.entries(FIELD_MAP)) {
        const el = document.getElementById(domId);
        if (!el) continue;
        if (el.type === 'checkbox' || el.type === 'radio') data[apiKey] = el.checked;
        else data[apiKey] = el.value;
    }
    return data;
}

/**
 * Populate form from JSON data.
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
 * Run all form validations.
 */
async function validateForm(watch = true) {
    const namePattern = /^[a-zA-Z\s ,.'-]+$/;
    const name = await ajaxGet('/api/user/elements/first_name,last_name').then((d) => `${d.first_name} ${d.last_name}`).catch(() => null);
    const nameInput = document.getElementById(name_id);
    if (nameInput && name) {
        nameInput.value = name
        nameInput.disabled = true;
        nameInput.ariaInvalid = 'false';
        inputStatus[name_id] = true;
    } else regexInput(name_id, namePattern, watch);

    regexInput(emergency_contact_name_id, namePattern, watch);
    const phonePattern = /^\+?[0-9\s\-()]{7,15}$/;
    regexInput(phone_number_id, phonePattern, watch);
    regexInput(emergency_contact_phone_id, phonePattern, watch);
    
    const dobInput = document.getElementById(date_of_birth_id);
    if (dobInput) {
        const today = new Date();
        const max = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
        const min = new Date(today.getFullYear() - 90, today.getMonth(), today.getDate());
        dobInput.max = max.toISOString().split('T')[0];
        dobInput.min = min.toISOString().split('T')[0];
        const v = () => {
            if (dobInput.value === '') { dobInput.ariaInvalid = minWarning; return; }
            const val = new Date(dobInput.value);
            setValidationState(dobInput, date_of_birth_id, val >= min && val <= max);
        };
        if (watch) dobInput.addEventListener('input', v);
        v();
    }

    presence(home_address_id, watch);
    const collegeSelect = document.getElementById(college_id);
    if (collegeSelect) {
        const v = () => setValidationState(collegeSelect, college_id, collegeSelect.value && collegeSelect.value !== 'Select');
        if (watch) collegeSelect.addEventListener('input', v);
        v();
    }

    validateYeseNo(has_medical_conditions_id, has_medical_conditions_no_id, medical_conditions_details_id, watch);
    validateYeseNo(takes_medication_id, takes_medication_no_id, medication_details_id, watch);
    [agrees_to_fitness_statement_id, agrees_to_club_rules_id, agrees_to_pay_debts_id, agrees_to_data_storage_id].forEach(id => validateCheckbox(id, watch));
}

/**
 * Check if all fields are valid.
 */
function allInputsValid() {
    return Object.values(inputStatus).every(s => s === true);
}

/**
 * Fetch and populate existing medical data.
 */
async function getCurrentMedicalData() {
    const keys = ['filled_legal_info', ...Object.keys(FIELD_MAP)].join(',');
    const data = await ajaxGet(`/api/user/elements/${keys}`);
    if (!data || !data.filled_legal_info) return;
    populateForm(data);
    document.getElementById(has_medical_conditions_no_id).checked = !data.has_medical_conditions;
    document.getElementById(takes_medication_no_id).checked = !data.takes_medication;
}

/**
 * Initialize static event listeners.
 */
function bindStaticEvents() {
    const btn = document.getElementById(submitButton_id);
    if (!btn) return;
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!allInputsValid()) {
            minWarning = 'true';
            displayNotification('Missing fields', 'Please fill out all required fields correctly.', 'error');
            await validateForm(false);
            return;
        }
        await ajaxPost('/api/user/elements', getFormData());
        displayNotification('Information Saved', 'Saved successfully.', 'success');
        LegalEvent.notify();
    });
}

/**
 * Load legal page data and setup.
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