// todo clean up
import { createSignal } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { MAIL_SVG } from "@/utils/icons";
import { useNavigate } from "@solidjs/router";
import { GlassButtonLarge } from "@/components/LiquidButton";

export default function ResetPasswordPage() {
    const { notify } = useNotifications();
    const navigate = useNavigate();
    const [email, setEmail] = createSignal("");

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        let fullEmail = email();
        if (fullEmail && !fullEmail.includes('@')) {
            fullEmail += '@durham.ac.uk';
        }

        try {
            const res = await apiRequest('POST', '/api/auth/reset-password-request', { email: fullEmail });
            notify('Success', res.message || 'Reset link sent! Please check your email.', 'success');
        } catch (error: any) {
            notify('Error', error.message || 'Failed to send reset link.', 'error');
        }
    };

    return (
        <div id="reset-password-view" class="auth-page-wrapper">
            <div class="auth-card">
                <div class="center-text">
                    <h2>
                        <span innerHTML={MAIL_SVG} />
                        Reset Password
                    </h2>
                    <p class="auth-subtitle">Enter your email and we'll send you a link to reset your password.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div class="modern-form-group">
                        <label for="reset-email">Durham Email Address</label>
                        <div class="durham-email-wrapper">
                            <input 
                                id="reset-email" 
                                name="email" 
                                placeholder="username" 
                                value={email()}
                                onInput={(e) => setEmail(e.currentTarget.value.split('@')[0])}
                                required
                            />
                            <span class="email-suffix">@durham.ac.uk</span>
                        </div>
                    </div>
                    <GlassButtonLarge type="submit" class="primary full-width" borderRadius={16}>
                        Send Reset Link
                    </GlassButtonLarge>
                </form>

                <div class="auth-footer">
                    <p>Remembered your password? <a onClick={() => navigate('/login')}>Sign in</a></p>
                </div>
            </div>
        </div>
    );
}
