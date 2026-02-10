// todo clean up
import { createSignal } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { LOCK_SVG } from "@/utils/icons";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { GlassButtonLarge } from "@/components/LiquidButton";

export default function SetPasswordPage() {
    const { notify } = useNotifications();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = () => searchParams.token;

    const [password, setPassword] = createSignal("");
    const [confirmPassword, setConfirmPassword] = createSignal("");

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        
        if (password() !== confirmPassword()) {
            notify('Error', 'Passwords do not match.', 'error');
            return;
        }

        try {
            await apiRequest('POST', '/api/auth/set-password', { 
                token: token(), 
                password: password() 
            });
            notify('Success', 'Password updated! You can now login.', 'success');
            navigate('/login');
        } catch (error: any) {
            notify('Error', error.message || 'Failed to set password.', 'error');
        }
    };

    return (
        <div id="set-password-view" class="auth-page-wrapper">
            <div class="auth-card">
                <div class="center-text">
                    <h2>
                        <span innerHTML={LOCK_SVG} />
                        New Password
                    </h2>
                    <p class="auth-subtitle">Choose a strong password for your account.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div class="modern-form-group">
                        <label for="new-password">New Password</label>
                        <input 
                            type="password" 
                            id="new-password" 
                            placeholder="••••••••"
                            value={password()}
                            onInput={(e) => setPassword(e.currentTarget.value)}
                            required
                        />
                    </div>
                    
                    <div class="modern-form-group">
                        <label for="confirm-password">Confirm Password</label>
                        <input 
                            type="password" 
                            id="confirm-password" 
                            placeholder="••••••••"
                            value={confirmPassword()}
                            onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                            required
                        />
                    </div>
                    
                    <div style="margin-top: 0.5rem;">
                        <GlassButtonLarge type="submit" class="primary full-width" borderRadius={16}>
                            Update Password
                        </GlassButtonLarge>
                    </div>
                </form>
            </div>
        </div>
    );
}
