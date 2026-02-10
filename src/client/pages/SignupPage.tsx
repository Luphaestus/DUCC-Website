// todo clean up
import { createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { ACCOUNT_BOX_SVG } from '@/utils/icons';
import { GlassButtonLarge } from "../components/LiquidButton";

export default function SignupPage() {
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const [firstName, setFirstName] = createSignal("");
    const [lastName, setLastName] = createSignal("");
    const [email, setEmail] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [confirmPassword, setConfirmPassword] = createSignal("");
    const [isEmailModified, setIsEmailModified] = createSignal(false);

    onMount(async () => {
        try {
            const status = await apiRequest('GET', '/api/auth/status', null, true);
            if (status.authenticated) {
                navigate('/events');
            }
        } catch (e) {}
    });

    const handleFirstNameInput = (val: string) => {
        setFirstName(val);
        if (!isEmailModified()) {
            const dot = (val !== '' && lastName() !== '') ? '.' : '';
            setEmail(`${val.toLowerCase()}${dot}${lastName().toLowerCase()}`);
        }
    };

    const handleLastNameInput = (val: string) => {
        setLastName(val);
        if (!isEmailModified()) {
            const dot = (firstName() !== '' && val !== '') ? '.' : '';
            setEmail(`${firstName().toLowerCase()}${dot}${val.toLowerCase()}`);
        }
    };

    const handleEmailInput = (val: string) => {
        setIsEmailModified(true);
        setEmail(val.split('@')[0]);
    };

    const handleSignup = async (e: Event) => {
        e.preventDefault();

        if (password() !== confirmPassword()) {
            notify('Error', 'Passwords do not match', 'error', 2000, 'signup-status');
            return;
        }

        let fullEmail = email();
        if (fullEmail && !fullEmail.includes('@')) {
            fullEmail += '@durham.ac.uk';
        }

        try {
            await apiRequest('POST', '/api/auth/signup', {
                first_name: firstName(),
                last_name: lastName(),
                email: fullEmail,
                password: password()
            });
            notify('Success', 'Sign up successful! Redirecting...', 'success', 1000, 'signup-status');
            setTimeout(() => navigate('/login'), 1000);
        } catch (error: any) {
            notify('Error', error.message || 'Sign up failed.', 'error', 2000, 'signup-status');
        }
    };

    return (
        <div id="signup-view" class="auth-page-wrapper">
            <div class="auth-card" style={{ "max-width": "550px" }}>
                <div class="center-text">
                    <h2>
                        <span innerHTML={ACCOUNT_BOX_SVG} />
                        Join the Club
                    </h2>
                    <p class="auth-subtitle">Create your account to start paddling!</p>
                </div>

                <form onSubmit={handleSignup}>
                    <div class="grid">
                        <div class="modern-form-group">
                            <label for="signup-first-name">First Name</label>
                            <input 
                                type="text" 
                                id="signup-first-name" 
                                placeholder="Durham" 
                                autocomplete="given-name"
                                value={firstName()}
                                onInput={(e) => handleFirstNameInput(e.currentTarget.value)}
                                required
                            />
                        </div>
                        <div class="modern-form-group">
                            <label for="signup-last-name">Last Name</label>
                            <input 
                                type="text" 
                                id="signup-last-name" 
                                placeholder="Student" 
                                autocomplete="family-name"
                                value={lastName()}
                                onInput={(e) => handleLastNameInput(e.currentTarget.value)}
                                required
                            />
                        </div>
                    </div>

                    <div class="modern-form-group">
                        <label for="signup-email">Durham Email Address</label>
                        <div class="durham-email-wrapper">
                            <input 
                                type="text" 
                                id="signup-email" 
                                placeholder="username" 
                                autocomplete="username"
                                value={email()}
                                onInput={(e) => handleEmailInput(e.currentTarget.value)}
                                required
                            />
                            <span class="email-suffix">@durham.ac.uk</span>
                        </div>
                    </div>

                    <div class="grid">
                        <div class="modern-form-group">
                            <label for="signup-password">Password</label>
                            <input 
                                type="password" 
                                id="signup-password" 
                                autocomplete="new-password"
                                placeholder="••••••••"
                                value={password()}
                                onInput={(e) => setPassword(e.currentTarget.value)}
                                required
                            />
                        </div>
                        <div class="modern-form-group">
                            <label for="signup-confirm-password">Confirm Password</label>
                            <input 
                                type="password" 
                                id="signup-confirm-password" 
                                autocomplete="new-password"
                                placeholder="••••••••"
                                value={confirmPassword()}
                                onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                                required
                            />
                        </div>
                    </div>

                    <div id="signup-footer" style="margin-top: 1rem;">
                        <GlassButtonLarge type="submit" class="primary full-width" borderRadius={16}>
                            Create Account
                        </GlassButtonLarge>
                    </div>
                </form>

                <div class="auth-footer">
                    <p>Already have an account? <a onClick={() => navigate('/login')}>Sign in instead</a></p>
                </div>
            </div>
        </div>
    );
}