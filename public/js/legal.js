import { ajaxGet, ajaxPost } from './misc/ajax.js';
import { notify } from './misc/notification.js';
import { ViewChangedEvent } from './misc/view.js';
import { Event } from "./misc/event.js";
import { requireAuth } from './misc/auth.js';

/**
 * Legal & Medical Module.
 * Manages the complex form for collecting user personal, medical, and emergency contact data.
 * Features:
 * - Automated field mapping between API keys and DOM elements.
 * - Dynamic validation (regex, required fields, date ranges).
 * - "Sticky" field logic (certain fields update based on others).
 * - Automatic population of existing data.
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

// --- Constants & Templates ---

const HTML_TEMPLATE = `<div id="/legal-view" class="view hidden">
            <h1>Legal & Medical Information Form</h1>
            <div class="small-container hidden" id="legal-container">
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
                                <label for="medical-condition">Do you have any medical condition that any individual
                                    treating
                                    you should
                                    know about, including any alergies?*</label>

                                <label for="medical-yes">
                                    <input type="radio" id=${has_medical_conditions_id} name="medical-condition-radio" value="yes">
                                    Yes
                                </label>
                                <label for="medical-no">
                                    <input type="radio" id=${has_medical_conditions_no_id} name="medical-condition-radio" value="no">
                                    No
                                </label>
                                <input type="text" id=${medical_conditions_details_id} name="medical-condition"
                                    placeholder="e.g. Asthma, bee sting allergy">
                            </fieldset>
                            <fieldset>
                                <label for="medication-condition">Do you take medication to control a medical
                                    condition?
                                    (Please
                                    include
                                    instructions where applicable)*</label>

                                <label for="medication-yes">
                                    <input type="radio" id=${takes_medication_id} name="medication-radio" value="yes">
                                    Yes
                                </label>
                                <label for="medication-no">
                                    <input type="radio" id=${takes_medication_no_id} name="medication-radio" value="no">
                                    No
                                </label>
                                <input type="text" id=${medication_details_id} name="medication-condition"
                                    placeholder="e.g. Inhaler for asthma">
                            </fieldset>
                            <fieldset>
                                <label for="no-incapacity-checkbox">I am not knowingly suffering from any medical
                                    condition,
                                    injury or
                                    incapacity that could prevent me from participating fully in sporting
                                    activities.*</label>
                                <input type="checkbox" id=${agrees_to_fitness_statement_id} name="no-incapacity-checkbox">
                            </fieldset>
                        </form>
                    </article>
                </div>
                <article>
                    <form>
                        <h3>Terms and Conditions</h3>
                        <fieldset>
                            <label for="terms-checkbox">I agree to the <a href="/club-rules" target="_blank"
                                    rel="noopener noreferrer">Canoe Club Rules</a> and <a href="/safety-policy"
                                    target="_blank" rel="noopener noreferrer">Canoe Club Safety Policy</a>.*
                            </label>
                            <input type="checkbox" id=${agrees_to_club_rules_id} name="terms-checkbox">
                        </fieldset>
                        <fieldset>
                            <label for="debts-checkbox">I agree to pay any outstanding debts to the club at the end
                                of
                                each term and understand that I will not be allowed to graduate with outstanding
                                debts.*
                            </label>
                            <input type="checkbox" id=${agrees_to_pay_debts_id} name="debts-checkbox">
                        </fieldset>
                        <fieldset>
                            <label for="data-checkbox">I am happy for Durham University Canoe Club to keep my
                                details
                                stored, encrypted, on the canoe club database.*</label>
                            <input type="checkbox" id=${agrees_to_data_storage_id} name="data-checkbox">
                        </fieldset>
                        <fieldset>
                            <label for="keep-health-checkbox"> At the end of the year, all health forms will be
                                removed
                                from
                                the server. If you would like yours to remain the the server so you don't have to
                                fill
                                it
                                out again, please check this box. It will be your responsibility to ensure the the
                                form
                                is
                                kept up-to-date.</label>
                            <input type="checkbox" id=${agrees_to_keep_health_data_id} name="keep-health-checkbox">
                        </fieldset>

                        <button type="submit" id=${submitButton_id}>Submit</button>
                    </form>
                </article>
            </div>
        </div>`;



// --- Field Mapping ---

/**
 * Mapping from Server API field names to Client-side DOM IDs.
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

// --- State ---

const LegalEvent = new Event();
/** Tracks validation status of every mapped field */
const inputStatus = {};
/** Controls whether empty fields show red borders (none) or not (true) */
let minWarning = "none";
let notification = null;

// --- Validation Helpers ---

/**
 * Syncs an input's visual state (aria-invalid) with its actual validity.
 * @param {HTMLElement} input
 * @param {string} id
 * @param {boolean} isValid
 */
function setValidationState(input, id, isValid) {
    if (isValid) {
        input.ariaInvalid = 'false';
        inputStatus[id] = true;
    } else {
        // If field is empty, don't show error unless user has attempted submission (minWarning)
        input.ariaInvalid = input.value === '' ? minWarning : 'true';
        inputStatus[id] = false;
    }
}

// --- Helper Functions ---

/** Standardized notification trigger */
function displayNotification(title, message, type) {
    if (notification) notification();
    notification = notify(title, message, type);
}

/**
 * Checks for non-empty value.
 */
function presence(id, watch = true) {
    const input = document.getElementById(id);
    if (!input) return false;

    function validate() {
        setValidationState(input, id, input.value.trim() !== '');
    }

    if (watch) input.addEventListener('input', validate);
    validate();
}

/**
 * Checks against a regular expression.
 */
function regexInput(id, pattern, watch = true) {
    const input = document.getElementById(id);
    if (!input) return false;

    function validate() {
        const isValid = pattern.test(input.value);
        setValidationState(input, id, isValid);
    }

    if (watch) input.addEventListener('input', validate);
    validate();
}

/**
 * Checks if a checkbox is ticked.
 */
function validateCheckbox(id, watch = true) {
    const input = document.getElementById(id);
    if (!input) return false;

    function validate() {
        inputStatus[id] = input.checked;
        input.ariaInvalid = input.checked ? 'false' : minWarning;
    }

    if (watch) input.addEventListener('input', validate);
    validate();
}

/**
 * Manages Yes/No radio pairs and conditionally shows a text area for "if yes, describe".
 */
function validateYeseNo(idYes, idNo, detailId = null, watch = true) {
    const inputYes = document.getElementById(idYes);
    const inputNo = document.getElementById(idNo);
    const detailInput = detailId ? document.getElementById(detailId) : null;
    let detailRequired = false;

    if (!inputYes || !inputNo) return false;

    function validate() {
        if (inputYes.checked || inputNo.checked) {
            inputYes.ariaInvalid = 'false';
            inputNo.ariaInvalid = 'false';
            inputStatus[idYes] = true;
            inputStatus[idNo] = true
            if (detailInput) {
                if (inputYes.checked) {
                    detailInput.classList.remove('hidden');
                    presence(detailId, false); // Validate the detail field now
                    detailRequired = true;
                } else {
                    detailInput.classList.add('hidden');
                    inputStatus[detailId] = true; // Mark as valid if "No" selected
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
    }

    if (watch) {
        inputYes.addEventListener('input', validate);
        inputNo.addEventListener('input', validate);
    }


    function lpresence(id, watch = true) {
        const input = document.getElementById(id);
        if (!input) return false;

        function validate() {
            if (!detailRequired) return;
            setValidationState(input, id, input.value.trim() !== '');
        }

        if (watch) input.addEventListener('input', validate);
        validate();
    }

    validate();
    if (detailInput) lpresence(detailId, watch);
}

/**
 * Scrapes all mapped fields from the DOM and returns a JSON object for the API.
 */
function getFormData() {
    const data = {};
    for (const [apiKey, domId] of Object.entries(FIELD_MAP)) {
        const el = document.getElementById(domId);
        if (!el) continue;

        if (el.type === 'checkbox') {
            data[apiKey] = el.checked;
        } else if (el.type === 'radio') {
            // Logic specifically for Yes/No pairs: API expects boolean
            data[apiKey] = el.checked; 
        } else {
            data[apiKey] = el.value;
        }
    }
    return data;
}

/**
 * Distributes data from a JSON object back into the DOM fields.
 */
function populateForm(data) {
    for (const [apiKey, domId] of Object.entries(FIELD_MAP)) {
        const el = document.getElementById(domId);
        if (!el || data[apiKey] === undefined || data[apiKey] === null) continue;

        if (el.type === 'checkbox') el.checked = !!data[apiKey];
        else if (el.type === 'radio') el.checked = !!data[apiKey];
        else el.value = data[apiKey];
    }
}

/**
 * Comprehensive orchestrator for all form field validations.
 * Includes fetching actual user names to disable the name field (preventing unauthorized name changes).
 */
async function validateForm(watch = true) {
    const namePattern = /^[a-zA-Z\s ,.'-]+$/;

    // Fetch official name to prevent editing here
    const name = await ajaxGet('/api/user/elements/first_name,last_name').then((data) => `${data.first_name} ${data.last_name}`).catch(() => null);
    const nameInput = document.getElementById(name_id);
    if (nameInput && name) {
        nameInput.value = name
        nameInput.disabled = true;
        nameInput.ariaInvalid = 'false';
        inputStatus[name_id] = true;
    } else {
        regexInput(name_id, namePattern, watch);
    }

    regexInput(emergency_contact_name_id, namePattern, watch);

    // Common phone number pattern
    const phonePattern = /^\+?[0-9\s\-()]{7,15}$/;
    regexInput(phone_number_id, phonePattern, watch);
    regexInput(emergency_contact_phone_id, phonePattern, watch);
    
    // Date of Birth logic: Must be between 17 and 90 years old
    const dobInput = document.getElementById(date_of_birth_id);
    if (dobInput) {
        const today = new Date();
        const maxDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
        const minDate = new Date(today.getFullYear() - 90, today.getMonth(), today.getDate());

        dobInput.max = maxDate.toISOString().split('T')[0];
        dobInput.min = minDate.toISOString().split('T')[0];

        function validateDob() {
            if (dobInput.value === '') {
                dobInput.ariaInvalid = minWarning;
                return;
            }
            const dobValue = new Date(dobInput.value);
            const isValid = dobValue >= minDate && dobValue <= maxDate;
            setValidationState(dobInput, date_of_birth_id, isValid);
        }

        if (watch) dobInput.addEventListener('input', validateDob);
        validateDob();
    }

    presence(home_address_id, watch);

    const collegeSelect = document.getElementById(college_id);
    if (collegeSelect) {
        function validateCollege() {
            const isValid = collegeSelect.value && collegeSelect.value !== 'Select';
            setValidationState(collegeSelect, college_id, isValid);
        }
        if (watch) collegeSelect.addEventListener('input', validateCollege);
        validateCollege();
    }

    // Medical logic pairs
    validateYeseNo(has_medical_conditions_id, has_medical_conditions_no_id, medical_conditions_details_id, watch);
    validateYeseNo(takes_medication_id, takes_medication_no_id, medication_details_id, watch);

    // Term checkboxes
    [agrees_to_fitness_statement_id, agrees_to_club_rules_id, agrees_to_pay_debts_id].forEach(id => validateCheckbox(id, watch));

    validateCheckbox(agrees_to_data_storage_id, watch);
}

/**
 * Final check: Are all trackers in inputStatus marked as true?
 */
function allInputsValid() {
    return Object.values(inputStatus).every(status => status === true);
}

/**
 * Fetches current data from API and populates the form if the user has already filled it.
 */
async function getCurrentMedicalData() {
    const keys = ['filled_legal_info', ...Object.keys(FIELD_MAP)].join(',');
    const currentData = await ajaxGet(`/api/user/elements/${keys}`);

    if (!currentData || !currentData.filled_legal_info) return;

    populateForm(currentData);
    // Extra handling for the 'No' radio buttons (mapping only handles 'Yes')
    document.getElementById(has_medical_conditions_no_id).checked = !currentData.has_medical_conditions;
    document.getElementById(takes_medication_no_id).checked = !currentData.takes_medication;
}

// --- Event Binding (Static Elements) ---

/**
 * Binds the main submit handler.
 */
function bindStaticEvents() {
    const submitButton = document.getElementById(submitButton_id);
    if (!submitButton) return;

    submitButton.addEventListener('click', async (event) => {
        event.preventDefault();

        // Perform final validation check
        if (!allInputsValid()) {
            minWarning = 'true'; // Force red borders on empty required fields
            displayNotification('Missing or incorrect fields.', 'Please fill out all required fields correctly.', 'error');
            await validateForm(false);
            return;
        }

        // Send payload to server
        await ajaxPost('/api/user/elements', getFormData());

        displayNotification('Information Saved', 'Your legal and medical information has been saved successfully.', 'success');
        
        // Notify other modules (like Profile) that the legal info is now complete
        LegalEvent.notify();
    });
}

// --- Main Update Function ---

/**
 * Orchestrates the Legal view loading sequence.
 */
async function updateLegalPage(page) {
    if (page !== '/legal') return;

    // View is protected
    if (!await requireAuth()) return;

    const legalContainer = document.getElementById('legal-container');
    if (legalContainer) legalContainer.classList.remove('hidden');

    // Load existing data first, then setup validation
    await getCurrentMedicalData();
    await validateForm();
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
    bindStaticEvents();
    // Re-run setup whenever the SPA router switches to this view
    ViewChangedEvent.subscribe(async ({ resolvedPath }) => updateLegalPage(resolvedPath));
});

// Inject view template
document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);

export { LegalEvent };