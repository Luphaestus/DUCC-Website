import { createSignal } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { LOCK_SVG } from "@/utils/icons";
import { useNavigate, useSearchParams } from "@solidjs/router";

export default function SetPasswordPage() {
    const { notify } = useNotifications();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = () => searchParams.token;

    const [password, setPassword] = createSignal("");
    const [confirmPassword, setConfirmPassword] = createSignal("");
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
        
        if (password() !== confirmPassword()) {
            triggerError(['password', 'confirmPassword']);
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
            triggerError(['password', 'confirmPassword']);
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
                        <div class="glass-input-group" classList={{ 'is-invalid': errors().password, 'shaking': shaking().password }}>
                            <div class="icon">
                                <span innerHTML={LOCK_SVG} />
                            </div>
                            <input 
                                type="password" 
                                id="new-password" 
                                placeholder="••••••••"
                                value={password()}
                                autofocus
                                onInput={(e) => {
                                    clearError('password');
                                    setPassword(e.currentTarget.value);
                                }}
                                required
                            />
                        </div>
                    </div>
                    
                    <div class="modern-form-group">
                        <label for="confirm-password">Confirm Password</label>
                        <div class="glass-input-group" classList={{ 'is-invalid': errors().confirmPassword, 'shaking': shaking().confirmPassword }}>
                            <div class="icon">
                                <span innerHTML={LOCK_SVG} />
                            </div>
                            <input 
                                type="password" 
                                id="confirm-password" 
                                placeholder="••••••••"
                                value={confirmPassword()}
                                onInput={(e) => {
                                    clearError('confirmPassword');
                                    setConfirmPassword(e.currentTarget.value);
                                }}
                                required
                            />
                        </div>
                    </div>
                    
                    <div style="margin-top: 0.5rem;">
                        <button type="submit" class="primary full-width" style={{ "border-radius": "16px" }}>
                            Update Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
