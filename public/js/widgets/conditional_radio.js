/**
 * conditional_radio.js
 * Usage:
 * import { ConditionalRadio, initConditionalRadio } from '/js/widgets/conditional_radio.js';
 * thing.innerHTML = ConditionalRadio({ legend: 'Do you have a pet?', groupName: 'has-pet', yesId: 'has-pet-yes', noId: 'has-pet-no', detailId: 'pet-details', detailPlaceholder: 'Please specify your pet details' });
 * initConditionalRadio('has-pet-yes', 'has-pet-no', 'pet-details');
 * Widget for a Yes/No radio group that conditionally reveals a text input.
 */

/**
 * Renders the HTML for a conditional radio group.
 * 
 * @param {Object} options
 * @param {string} options.legend - The legend text for the fieldset.
 * @param {string} options.groupName - The name attribute for the radio buttons.
 * @param {string} options.yesId - ID for the 'Yes' radio button.
 * @param {string} options.noId - ID for the 'No' radio button.
 * @param {string} options.detailId - ID for the detail input field.
 * @param {string} options.detailPlaceholder - Placeholder text for the detail input.
 * @returns {string} HTML string
 */
export const ConditionalRadio = ({ legend, groupName, yesId, noId, detailId, detailPlaceholder }) => `
    <fieldset>
        <legend>${legend}</legend>
        <div class="radio-group">
            <label><input type="radio" id="${yesId}" name="${groupName}" value="yes"> Yes</label>
            <label><input type="radio" id="${noId}" name="${groupName}" value="no"> No</label>
        </div>
        <input type="text" id="${detailId}" class="conditional-reveal collapsed" name="${groupName}-detail" placeholder="${detailPlaceholder}">
    </fieldset>
`;

/**
 * Initialises the toggle logic for a conditional radio group.
 * @param {string} yesId 
 * @param {string} noId 
 * @param {string} detailId 
 */
export function initConditionalRadio(yesId, noId, detailId) {
    const yesBtn = document.getElementById(yesId);
    const noBtn = document.getElementById(noId);
    const detailInput = document.getElementById(detailId);

    if (!yesBtn || !noBtn || !detailInput) return;

    const updateVisibility = () => {
        if (yesBtn.checked) {
            detailInput.classList.remove('collapsed');
        } else {
            detailInput.classList.add('collapsed');
            detailInput.value = '';
            detailInput.removeAttribute('aria-invalid');
        }
    };

    yesBtn.addEventListener('change', updateVisibility);
    noBtn.addEventListener('change', updateVisibility);
    
    updateVisibility();
}
