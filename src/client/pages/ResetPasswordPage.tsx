// todo clean up
import { createSignal } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { MAIL_SVG } from "@/utils/icons";
import { useNavigate } from "@solidjs/router";

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
        <div id="reset-password-view" class="view">
            <div class="small-container">
                <h1>Reset Password</h1>
                <div class="form-info">
                    <article class="form-box shadow">
                        <h3>
                            <span innerHTML={MAIL_SVG} />
                            Request Password Reset
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <label for="reset-email">Email:</label>
                            <div class="durham-email-wrapper">
                                <input 
                                    id="reset-email" 
                                    name="email" 
                                    placeholder="username" 
                                    value={email()}
                                    onInput={(e) => setEmail(e.currentTarget.value.split('@')[0])}
                                />
                                <span class="email-suffix">@durham.ac.uk</span>
                            </div>
                            <button type="submit" class="full-width">Send Reset Link</button>
                        </form>
                        <p class="center-text mt-4">Remembered it? <a onClick={() => navigate('/login')} class="clickable">Login</a></p>
                    </article>
                </div>
            </div>
        </div>
    );
}
