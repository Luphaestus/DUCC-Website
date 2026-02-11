import { createSignal } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { PERSON_SVG } from "@/utils/icons";
import { useNavigate } from "@solidjs/router";

export default function ResetPasswordPage() {
    const { notify } = useNotifications();
    const navigate = useNavigate();
    const [email, setEmail] = createSignal("");
    const [errors, setErrors] = createSignal<Record<string, boolean>>({});
    const [shaking, setShaking] = createSignal<Record<string, boolean>>({});

    const triggerError = (fields: string[]) => {
        const newErrors = { ...errors() };
        const newShaking: Record<string, boolean> = {};
        fields.forEach(f => {
            newErrors[f] = true;
            newShaking[f] = true;
        });
        setErrors(newErrors);
        setShaking(newShaking);
        setTimeout(() => setShaking({}), 500);
    };

    const clearError = (field: string) => {
        if (errors()[field]) {
            setErrors({ ...errors(), [field]: false });
        }
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        let fullEmail = email();
        if (fullEmail && !fullEmail.includes('@')) {
            fullEmail += '@durham.ac.uk';
        }

        try {
            await apiRequest('POST', '/api/auth/reset-password-request', { email: fullEmail });
            navigate(`/email-sent?type=reset&email=${encodeURIComponent(fullEmail)}`);
        } catch (error: any) {
            triggerError(['email']);
            notify('Error', error.message || 'Failed to send reset link.', 'error');
        }
    };

    return (
        <div id="reset-password-view" class="auth-page-wrapper">
            <div class="auth-card">
                <div class="center-text">
                    <h2>
                        Reset Password
                    </h2>
                    <p class="auth-subtitle">Enter your email and we'll send you a link to reset your password.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div class="modern-form-group">
                        <label for="reset-email">Durham Email Address</label>
                        <div class="glass-input-group durham-email-wrapper" classList={{ 'is-invalid': errors().email, 'shaking': shaking().email }}>
                            <div class="icon">
                                <span innerHTML={PERSON_SVG} />
                            </div>
                            <input 
                                id="reset-email" 
                                name="email" 
                                placeholder="username" 
                                value={email()}
                                autofocus
                                onKeyDown={(e) => {
                                    if (e.key === '@') {
                                        e.preventDefault();
                                    }
                                }}
                                onInput={(e) => {
                                    clearError('email');
                                    setEmail(e.currentTarget.value.split('@')[0]);
                                }}
                                required
                            />
                            <span class="email-suffix">@durham.ac.uk</span>
                        </div>
                    </div>
                    <button type="submit" class="primary full-width" style={{ "border-radius": "16px" }}>
                        Send Reset Link
                    </button>
                </form>

                <div class="auth-footer">
                    <p>Remembered your password? <a onClick={() => navigate('/login')}>Sign in</a></p>
                    <p style="margin-top: 0.5rem; font-size: 0.85em; opacity: 0.8;">
                        Looking for <a onClick={() => navigate('/resend-verification')}>email verification</a>?
                    </p>
                </div>
            </div>
        </div>
    );
}
