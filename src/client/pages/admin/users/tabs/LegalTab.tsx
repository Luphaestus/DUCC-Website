import { For, Show } from "solid-js";
import { CONTRACT_SVG, PERSON_SVG, ID_CARD_SVG, HOME_SVG, EMERGENCY_SVG, MEDICAL_INFORMATION_SVG } from '@/utils/icons';
import Panel from "@/components/Panel";

export default function LegalTab(props: { user: any }) {
    const isSigned = () => !!props.user.filled_legal_info;
    const legalDate = () => props.user.legal_filled_at ? new Date(props.user.legal_filled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';

    return (
        <div class="profile-layout-grid">
            <div class="column">
                {/* Legal Status Card */}
                <Panel title="Legal Status" icon={CONTRACT_SVG}>
                    <div class="status-indicator" classList={{ active: isSigned() }}>
                        <span class="status-text">{isSigned() ? 'Signed' : 'Missing'}</span>
                        <div class="info-item-modern">
                            <span class="label">Last Signed:</span> 
                            <span class="value">{legalDate()}</span>
                        </div>
                    </div>
                </Panel>

                <Show when={isSigned()}>
                    {/* Personal & Emergency Card */}
                    <Panel title="Identity & Contact" icon={PERSON_SVG}>
                        <div class="detail-info-group">
                            <div class="detail-info-box">
                                <span class="box-label"><span innerHTML={ID_CARD_SVG} /> Identity Details</span>
                                <div class="box-value-grid">
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
                    </Panel>
                </Show>
            </div>

            <Show when={isSigned()}>
                <div class="column">
                    {/* Medical Details Card */}
                    <Panel title="Health Information" icon={MEDICAL_INFORMATION_SVG}>
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

                            <div class="info-item-modern border-top">
                                <span class="label">Data Consent:</span>
                                <span class="badge" classList={{ success: props.user.agrees_to_keep_health_data, neutral: !props.user.agrees_to_keep_health_data }}>
                                    {props.user.agrees_to_keep_health_data ? 'Keep Health Data' : 'Wipe Medical on Exit'}
                                </span>
                            </div>
                        </div>
                    </Panel>
                </div>
            </Show>
        </div>
    );
}
