import { createSignal, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { 
    PERSON_SVG, EDIT_SVG, 
    ID_CARD_SVG, CLOSE_SVG,
    CONTRACT_SVG, HOME_SVG, EMERGENCY_SVG, MEDICAL_INFORMATION_SVG
} from '@/utils/icons';
import Panel from "@/components/Panel";

export default function ProfileTab(props: { user: any, permissions: string[], canManageUsers: boolean, isExec: boolean, refetchUser: () => void }) {
    const { notify } = useNotifications();
    
    const [isEditing, setIsEditing] = createSignal(false);

    const isSigned = () => !!props.user.filled_legal_info;

    const handleSaveProfile = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data: any = Object.fromEntries(formData.entries());
        // Simple conversion for checkboxes
        data.is_member = !!formData.get('is_member');
        data.is_instructor = !!formData.get('is_instructor');
        
        try {
            await apiRequest('POST', `/api/admin/user/${props.user.id}/elements`, data);
            notify('Success', 'Profile updated', 'success');
            setIsEditing(false);
            props.refetchUser();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    return (
        <div class="dashboard-section active">
            <article class="value-header no-margin" style={{ margin: "0 0 1.5rem 0" }}>
                <div class="value-info">
                    <span class="value-title">Legal Status</span>
                    <div class="value-display" classList={{ 'positive': isSigned() }}>
                        {isSigned() ? 'Signed' : 'Missing'}
                    </div>
                </div>
                <div class="value-actions" innerHTML={CONTRACT_SVG}></div>
            </article>

            <div class="dual-grid">
                <Panel title="Health Information" icon={MEDICAL_INFORMATION_SVG} class="no-margin">
                    <div class="detail-info-group">
                        <div class="medical-section">
                            <div class="info-item-modern compact">
                                <span class="label">Medical Conditions:</span> 
                                <span class="badge" classList={{ warning: props.user.has_medical_conditions, success: !props.user.has_medical_conditions }}>
                                    {props.user.has_medical_conditions ? 'Yes' : 'None Reported'}
                                </span>
                            </div>
                            <Show when={props.user.has_medical_conditions}>
                                <div class="detail-info-box">{props.user.medical_conditions_details}</div>
                            </Show>
                        </div>

                        <div class="medical-section">
                            <div class="info-item-modern compact">
                                <span class="label">Medication:</span>
                                <span class="badge" classList={{ warning: props.user.takes_medication, success: !props.user.takes_medication }}>
                                    {props.user.takes_medication ? 'Yes' : 'None Reported'}
                                </span>
                            </div>
                            <Show when={props.user.takes_medication}>
                                <div class="detail-info-box">{props.user.medication_details}</div>
                            </Show>
                        </div>
                    </div>
                </Panel>

                <Panel 
                    title="Identity & Contact" 
                    icon={PERSON_SVG}
                    class="no-margin"
                    action={
                        <Show when={props.permissions.includes('user.manage.advanced')}>
                            <button class="small-btn secondary" onClick={() => setIsEditing(!isEditing())}>
                                <span innerHTML={isEditing() ? CLOSE_SVG : EDIT_SVG} /> {isEditing() ? 'Cancel' : 'Edit'}
                            </button>
                        </Show>
                    }
                >
                    <Show when={isEditing()} fallback={
                        <div class="detail-info-group">
                            <div class="detail-info-box">
                                <span class="box-label"><span innerHTML={ID_CARD_SVG} /> Identity Details</span>
                                <div class="box-value-grid">
                                    <div class="row">
                                        <span class="label-sub">Email</span>
                                        <span>{props.user.email}</span>
                                    </div>
                                    <div class="row">
                                        <span class="label-sub">Phone</span>
                                        <span>{props.user.phone_number || 'N/A'}</span>
                                    </div>
                                    <div class="row">
                                        <span class="label-sub">Date of Birth</span>
                                        <span>{props.user.date_of_birth || 'N/A'}</span>
                                    </div>
                                    <div class="row">
                                        <span class="label-sub">First Aid Expiry</span>
                                        <span>{props.user.first_aid_expiry || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-info-box">
                                <span class="box-label"><span innerHTML={HOME_SVG} /> Home Address</span>
                                <span class="box-value">{props.user.home_address || 'N/A'}</span>
                            </div>
                            
                            <div class="detail-info-box warning">
                                <span class="box-label"><span innerHTML={EMERGENCY_SVG} /> Emergency Contact</span>
                                <div class="box-value">
                                    <strong class="contact-name">{props.user.emergency_contact_name || 'N/A'}</strong>
                                    <span class="contact-phone">{props.user.emergency_contact_phone || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    }>
                        <form class="modern-form" onSubmit={handleSaveProfile}>
                            <label>Email <input name="email" value={props.user.email} /></label>
                            <label>Phone <input name="phone_number" value={props.user.phone_number || ''} /></label>
                            <Show when={props.canManageUsers}>
                                <div class="grid-2-col">
                                    <label>Free Sessions <input type="number" name="free_sessions" value={props.user.free_sessions} /></label>
                                    <label>Swims (Total) <input type="number" name="swims" value={props.user.swims} /></label>
                                </div>
                                <label><input type="checkbox" name="is_member" checked={props.user.is_member} /> Is Member</label>
                            </Show>
                            <div class="form-actions mt-2">
                                <button type="submit" class="small-btn">Save</button>
                                <button type="button" class="small-btn secondary outline" onClick={() => setIsEditing(false)}>Cancel</button>
                            </div>
                        </form>
                    </Show>
                </Panel>
            </div>
        </div>
    );
}