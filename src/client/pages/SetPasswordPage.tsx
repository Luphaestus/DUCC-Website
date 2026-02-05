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
        <div id="set-password-view" class="view">
            <div class="small-container">
                <h1>Set New Password</h1>
                <div class="form-info">
                    <article class="form-box shadow">
                        <h3>
                            <span innerHTML={LOCK_SVG} />
                            Create New Password
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <label for="new-password">New Password:</label>
                            <input 
                                type="password" 
                                id="new-password" 
                                value={password()}
                                onInput={(e) => setPassword(e.currentTarget.value)}
                                required
                            />
                            
                            <label for="confirm-password">Confirm Password:</label>
                            <input 
                                type="password" 
                                id="confirm-password" 
                                value={confirmPassword()}
                                onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                                required
                            />
                            
                            <button type="submit" class="full-width">Update Password</button>
                        </form>
                    </article>
                </div>
            </div>
        </div>
    );
}
