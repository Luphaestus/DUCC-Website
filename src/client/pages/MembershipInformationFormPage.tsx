// todo clean up
import { createSignal, onMount, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { requireAuth } from "@/utils/auth";
import { ACCOUNT_BOX_SVG, CALL_SVG, MEDICAL_INFORMATION_SVG, CONTRACT_SVG } from "@/utils/icons";
import { LegalEvent } from "@/utils/events/events";

import PageTitle from "@/components/PageTitle";

export default function LegalPage() {
    const { notify } = useNotifications();
    const [colleges, setColleges] = createSignal<any[]>([]);
    const [userData, setUserData] = createSignal<any>({});
    const [loading, setLoading] = createSignal(true);
    const [hasMedicalConditions, setHasMedicalConditions] = createSignal(false);
    const [takesMedication, setTakesMedication] = createSignal(false);
    const [hasDietaryInfo, setHasDietaryInfo] = createSignal(false);

    onMount(async () => {
        if (!await requireAuth()) return;

        try {
            const [collegesRes, userRes, userNameRes] = await Promise.all([
                apiRequest('GET', '/api/colleges'),
                apiRequest('GET', `/api/user/elements/filled_legal_info,date_of_birth,college_id,emergency_contact_name,emergency_contact_phone,home_address,phone_number,medical_conditions_details,medication_details,dietary_info_details,agrees_to_fitness_statement,agrees_to_club_rules,agrees_to_pay_debts,agrees_to_data_storage,agrees_to_keep_health_data,has_medical_conditions,takes_medication,has_dietary_info`),
                apiRequest('GET', '/api/user/elements/first_name,last_name')
            ]);

            setColleges(collegesRes || []);
            setUserData({
                ...userRes,
                name: `${userNameRes.first_name} ${userNameRes.last_name}`
            });
            setHasMedicalConditions(userRes.has_medical_conditions === 1 || userRes.has_medical_conditions === true);
            setTakesMedication(userRes.takes_medication === 1 || userRes.takes_medication === true);
            setHasDietaryInfo(userRes.has_dietary_info === 1 || userRes.has_dietary_info === true);
        } catch (e) {
            console.error("Legal page load error", e);
            notify('Error', 'Failed to load form data.', 'error');
        } finally {
            setLoading(false);
        }
    });

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const payload: Record<string, any> = {};

        formData.forEach((value, key) => {
            if (key === 'college_id') payload[key] = parseInt(value as string, 10);
            else if (value === 'on') payload[key] = true;
            else payload[key] = value;
        });

        payload['has_medical_conditions'] = hasMedicalConditions();
        payload['takes_medication'] = takesMedication();
        payload['has_dietary_info'] = hasDietaryInfo();

        const checkboxes = ['agrees_to_fitness_statement', 'agrees_to_club_rules', 'agrees_to_pay_debts', 'agrees_to_data_storage', 'agrees_to_keep_health_data'];
        checkboxes.forEach(cb => {
            if (!payload[cb]) payload[cb] = false;
        });

        try {
            await apiRequest('POST', '/api/user/elements', payload);
            notify('Saved', 'Information updated successfully.', 'success');
            LegalEvent.notify();
        } catch (error: any) {
            notify('Error', error.message || 'Save failed.', 'error');
        }
    };

    return (
        <div id="legal-view" class="view">
            <div class="legal-container">
                <PageTitle text="Membership Information Form" />
                <Show when={!loading()} fallback={<p>Loading...</p>}>
                    <form onSubmit={handleSubmit}>
                        <div class="legal-grid">
                            <div class="liquid-container">
                                <header>
                                    <h3><span innerHTML={ACCOUNT_BOX_SVG} /> Personal Information</h3>
                                </header>
                                <div class="grid">
                                    <label>Name* <input type="text" name="name" value={userData().name} disabled /></label>
                                    <label>Phone Number* <input type="tel" name="phone_number" value={userData().phone_number || ''} /></label>
                                </div>
                                <div class="grid">
                                    <label>Date of Birth* <input type="date" name="date_of_birth" value={userData().date_of_birth || ''} /></label>
                                    <label>College*
                                        <select name="college_id" value={userData().college_id || ''}>
                                            <option value="" disabled>Select your college</option>
                                            <For each={colleges()}>
                                                {(c) => <option value={c.id}>{c.name}</option>}
                                            </For>
                                        </select>
                                    </label>
                                </div>
                                <label>Home Address* <textarea name="home_address" rows="3" value={userData().home_address || ''}></textarea></label>
                            </div>

                            <div class="liquid-container">
                                <header>
                                    <h3><span innerHTML={CALL_SVG} /> Emergency Contact</h3>
                                </header>
                                <label>Name* <input type="text" name="emergency_contact_name" value={userData().emergency_contact_name || ''} /></label>
                                <label>Phone Number* <input type="tel" name="emergency_contact_phone" value={userData().emergency_contact_phone || ''} /></label>
                            </div>

                            <div class="liquid-container">
                                <header>
                                    <h3><span innerHTML={MEDICAL_INFORMATION_SVG} /> Medical Information</h3>
                                </header>
                                <fieldset>
                                    <legend>Medical Conditions & Allergies*</legend>
                                    <div class="grid">
                                        <label><input type="radio" name="has_medical_conditions_radio" checked={hasMedicalConditions() === true} onChange={() => setHasMedicalConditions(true)} /> Yes</label>
                                        <label><input type="radio" name="has_medical_conditions_radio" checked={hasMedicalConditions() === false} onChange={() => setHasMedicalConditions(false)} /> No</label>
                                    </div>
                                    <div class={`expandable-section ${hasMedicalConditions() ? 'open' : ''}`}>
                                        <div class="expandable-content">
                                            <textarea name="medical_conditions_details" placeholder="Please specify..." value={userData().medical_conditions_details || ''} required={hasMedicalConditions()}></textarea>
                                        </div>
                                    </div>
                                </fieldset>

                                <fieldset>
                                    <legend>Medication*</legend>
                                    <div class="grid">
                                        <label><input type="radio" name="takes_medication_radio" checked={takesMedication() === true} onChange={() => setTakesMedication(true)} /> Yes</label>
                                        <label><input type="radio" name="takes_medication_radio" checked={takesMedication() === false} onChange={() => setTakesMedication(false)} /> No</label>
                                    </div>
                                    <div class={`expandable-section ${takesMedication() ? 'open' : ''}`}>
                                        <div class="expandable-content">
                                            <textarea name="medication_details" placeholder="Please specify..." value={userData().medication_details || ''} required={takesMedication()}></textarea>
                                        </div>
                                    </div>
                                </fieldset>

                                <fieldset>
                                    <legend>Dietary Information & Allergies*</legend>
                                    <div class="grid">
                                        <label><input type="radio" name="has_dietary_info_radio" checked={hasDietaryInfo() === true} onChange={() => setHasDietaryInfo(true)} /> Yes</label>
                                        <label><input type="radio" name="has_dietary_info_radio" checked={hasDietaryInfo() === false} onChange={() => setHasDietaryInfo(false)} /> No</label>
                                    </div>
                                    <div class={`expandable-section ${hasDietaryInfo() ? 'open' : ''}`}>
                                        <div class="expandable-content">
                                            <textarea name="dietary_info_details" placeholder="Please specify..." value={userData().dietary_info_details || ''} required={hasDietaryInfo()}></textarea>
                                        </div>
                                    </div>
                                </fieldset>

                                <fieldset>
                                    <label><input type="checkbox" name="agrees_to_fitness_statement" checked={userData().agrees_to_fitness_statement} /> I am not suffering from any medical condition or injury that prevents full participation.*</label>
                                </fieldset>
                            </div>

                            <div class="liquid-container form-box full-width">
                                <header>
                                    <h3><span innerHTML={CONTRACT_SVG} /> Terms and Conditions</h3>
                                </header>

                                <div>
                                    <fieldset><label><input type="checkbox" name="agrees_to_club_rules" checked={userData().agrees_to_club_rules} /> I agree to the club rules and safety policy.*</label></fieldset>
                                </div>
                                <div>
                                    <fieldset><label><input type="checkbox" name="agrees_to_pay_debts" checked={userData().agrees_to_pay_debts} /> I agree to pay all outstanding debts.*</label></fieldset>
                                </div>

                                <button type="submit">Submit Information</button>
                            </div>
                        </div>
                    </form>
                </Show>
            </div>
        </div>
    );
}
