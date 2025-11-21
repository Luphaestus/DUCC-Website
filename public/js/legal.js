import { ajaxGet, ajaxPost } from './misc/ajax.js';
import { notify, NotificationTypes } from './misc/notification.js';
import { ViewChangedEvent } from './misc/view.js';

let minWarning = "none";
const inputStatus = {};

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

function presence(id, watch = true) {
    const input = document.getElementById(id);
    if (!input) return false;

    function validate(value) {
        if (input.value.trim() !== '') {
            input.ariaInvalid = 'false';
            inputStatus[id] = true;
        } else {
            input.ariaInvalid = minWarning;
            inputStatus[id] = false;
        }
    }

    if (watch) {
        input.addEventListener('input', () => {
            validate(input.value);
        });
    }

    validate(input.value);
}

function regexInput(id, pattern, watch = true) {
    const input = document.getElementById(id);
    if (!input) return false;

    function validate() {
        if (pattern.test(input.value)) {
            input.ariaInvalid = 'false';
            inputStatus[id] = true;
        } else if (input.value === '') {
            input.ariaInvalid = minWarning;
            inputStatus[id] = false;
        } else {
            input.ariaInvalid = 'true';
            inputStatus[id] = false;
        }
    }

    if (watch) {
        input.addEventListener('input', () => {
            validate(input.value);
        });
    }

    validate(input.value);
}

function validateCheckbox(id, watch = true) {
    const input = document.getElementById(id);
    if (!input) return false;

    function validate() {
        if (input.checked) {
            input.ariaInvalid = 'false';
            inputStatus[id] = true;
        } else {
            input.ariaInvalid = minWarning;
            inputStatus[id] = false;
        }
    }

    if (watch) {
        input.addEventListener('input', validate);
    }

    validate();
}

function validateYeseNo(idYes, idNo, detailId = null, watch = true) {
    const inputYes = document.getElementById(idYes);
    const inputNo = document.getElementById(idNo);
    const detailInput = detailId ? document.getElementById(detailId) : null;
    var detailRequired = false;

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
            if (input.value.trim() !== '') {
                input.ariaInvalid = 'false';
                inputStatus[id] = true;
            } else {
                input.ariaInvalid = minWarning;
                inputStatus[id] = false;
            }
        }

        if (watch) {
            input.addEventListener('input', () => {
                validate(input.value);
            });
        }

        validate(input.value);
    }

    validate();
    if (detailInput) lpresence(detailId, watch);
}

async function validateForm(watch = true) {
    const namePattern = /^[a-zA-Z\s ,.'-]+$/;

    const name = await ajaxGet('/api/user/name').then((data) => `${data.name.first_name} ${data.name.last_name}`).catch(() => null);
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

    const phonePattern = /^\+?[0-9\s\-()]{7,15}$/;
    regexInput(phone_number_id, phonePattern, watch);
    regexInput(emergency_contact_phone_id, phonePattern, watch);
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
            const dob = new Date(dobInput.value);
            if (dob >= minDate && dob <= maxDate) {
                dobInput.ariaInvalid = 'false';
                inputStatus[date_of_birth_id] = true;

            } else {
                dobInput.ariaInvalid = 'true';
                inputStatus[date_of_birth_id] = false;
            }
        }

        if (watch) {
            dobInput.addEventListener('input', validateDob);
        }

        validateDob();
    }

    presence(home_address_id, watch);

    const collegeSelect = document.getElementById(college_id);
    if (collegeSelect) {
        function validateCollege() {
            if (collegeSelect.value && collegeSelect.value !== 'Select') {
                collegeSelect.ariaInvalid = 'false';
                inputStatus[college_id] = true;
            } else {
                collegeSelect.ariaInvalid = minWarning;
                inputStatus[college_id] = false;
            }
        }

        if (watch) {
            collegeSelect.addEventListener('input', validateCollege);
        }

        validateCollege();
    }

    validateYeseNo(has_medical_conditions_id, has_medical_conditions_no_id, medical_conditions_details_id, watch);
    validateYeseNo(takes_medication_id, takes_medication_no_id, medication_details_id, watch);

    validateCheckbox(agrees_to_fitness_statement_id, watch);

    validateCheckbox(agrees_to_club_rules_id, watch);
    validateCheckbox(agrees_to_pay_debts_id, watch);
    validateCheckbox(agrees_to_data_storage_id, watch);
}

function allInputsValid() {
    return Object.values(inputStatus).every(status => status === true);
}

async function getCurrentMedicalData() {
    const response = await ajaxGet('/api/user/legalinfo');
    if (!response || !response.legalInfo) return;
    const currentData = response.legalInfo;

    if (!currentData.filled_legal_info) return;

    document.getElementById(date_of_birth_id).value = currentData.date_of_birth || '';
    document.getElementById(college_id).value = currentData.college || 'Select';
    document.getElementById(emergency_contact_name_id).value = currentData.emergency_contact_name || '';
    document.getElementById(emergency_contact_phone_id).value = currentData.emergency_contact_phone || '';
    document.getElementById(home_address_id).value = currentData.home_address || '';
    document.getElementById(phone_number_id).value = currentData.phone_number || '';
    document.getElementById(has_medical_conditions_id).checked = !!currentData.has_medical_conditions;
    document.getElementById(has_medical_conditions_no_id).checked = !currentData.has_medical_conditions;
    document.getElementById(medical_conditions_details_id).value = currentData.medical_conditions_details || '';
    document.getElementById(takes_medication_id).checked = !!currentData.takes_medication;
    document.getElementById(takes_medication_no_id).checked = !currentData.takes_medication;
    document.getElementById(medication_details_id).value = currentData.medication_details || '';
    document.getElementById(agrees_to_fitness_statement_id).checked = !!currentData.agrees_to_fitness_statement;
    document.getElementById(agrees_to_club_rules_id).checked = !!currentData.agrees_to_club_rules;
    document.getElementById(agrees_to_pay_debts_id).checked = !!currentData.agrees_to_pay_debts;
    document.getElementById(agrees_to_data_storage_id).checked = !!currentData.agrees_to_data_storage;
    document.getElementById(agrees_to_keep_health_data_id).checked = !!currentData.agrees_to_keep_health_data;
}

let lastNotification = null;

async function updateLegalPage(page) {
    if (page && page !== '/legalinfo') return;

    const authenticated = await ajaxGet('/api/user/loggedin').then((data) => data.loggedIn).catch(() => false);

    const legalContainer = document.getElementById('legal-container');
    const notAuthDiv = document.getElementById('legal-not-authenticated');

    if (!authenticated) {
        if (legalContainer) legalContainer.classList.add('hidden');
        if (notAuthDiv) notAuthDiv.classList.remove('hidden');
        return;
    } else {
        if (legalContainer) legalContainer.classList.remove('hidden');
        if (notAuthDiv) notAuthDiv.classList.add('hidden');
    }

    await getCurrentMedicalData();
    await validateForm();

    const submitButton = document.getElementById('health-form-submit');
    if (submitButton) {
        submitButton.addEventListener('click', async (event) => {
            event.preventDefault();

            console.log("Submit button clicked. Validating form...");

            if (!allInputsValid()) {
                minWarning = 'true';
                if (lastNotification) {
                    lastNotification()
                }

                lastNotification = notify('Missing or incorrect fields.', 'Please fill out all required fields correctly.', NotificationTypes.ERROR);
                await validateForm(false);
                return;
            }

            await ajaxPost('/api/user/legalinfo', {
                date_of_birth: document.getElementById(date_of_birth_id).value,
                college: document.getElementById(college_id).value,
                emergency_contact_name: document.getElementById(emergency_contact_name_id).value,
                emergency_contact_phone: document.getElementById(emergency_contact_phone_id).value,
                home_address: document.getElementById(home_address_id).value,
                phone_number: document.getElementById(phone_number_id).value,
                has_medical_conditions: document.getElementById(has_medical_conditions_id).checked,
                medical_conditions_details: document.getElementById(medical_conditions_details_id).value,
                takes_medication: document.getElementById(takes_medication_id).checked,
                medication_details: document.getElementById(medication_details_id).value,
                agrees_to_fitness_statement: document.getElementById(agrees_to_fitness_statement_id).checked,
                agrees_to_club_rules: document.getElementById(agrees_to_club_rules_id).checked,
                agrees_to_pay_debts: document.getElementById(agrees_to_pay_debts_id).checked,
                agrees_to_data_storage: document.getElementById(agrees_to_data_storage_id).checked,
                agrees_to_keep_health_data: document.getElementById(agrees_to_keep_health_data_id).checked
            });

            if (lastNotification) {
                lastNotification();
            }
            lastNotification = notify('Information Saved', 'Your legal and medical information has been saved successfully.', NotificationTypes.SUCCESS);
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    ViewChangedEvent.subscribe(async (data) => updateLegalPage(data.view));
});