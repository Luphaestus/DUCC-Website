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
            const status = await apiRequest('GET', '/api/auth/status', true);
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
        <div id="signup-view" class="view">
            <div class="small-container">
                <h1>Sign Up</h1>
                <div class="form-info">
                    <article class="form-box">
                        <h3>
                            <span innerHTML={ACCOUNT_BOX_SVG} />
                            Create Account
                        </h3>
                        <form onSubmit={handleSignup}>
                            <div>
                                <div class="grid">
                                    <div>
                                        <label for="first-name">First Name:</label>
                                        <input 
                                            type="text" 
                                            id="signup-first-name" 
                                            placeholder="First Name" 
                                            autocomplete="given-name"
                                            value={firstName()}
                                            onInput={(e) => handleFirstNameInput(e.currentTarget.value)}
                                        />
                                    </div>
                                    <div>
                                        <label for="last-name">Last Name:</label>
                                        <input 
                                            type="text" 
                                            id="signup-last-name" 
                                            placeholder="Last Name" 
                                            autocomplete="family-name"
                                            value={lastName()}
                                            onInput={(e) => handleLastNameInput(e.currentTarget.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label for="email">Email:</label>
                                    <div class="durham-email-wrapper">
                                        <input 
                                            type="text" 
                                            id="signup-email" 
                                            placeholder="username" 
                                            autocomplete="username"
                                            value={email()}
                                            onInput={(e) => handleEmailInput(e.currentTarget.value)}
                                        />
                                        <span class="email-suffix">@durham.ac.uk</span>
                                    </div>
                                </div>
                                <div class="grid">
                                    <div>
                                        <label for="password">Password:</label>
                                        <input 
                                            type="password" 
                                            id="signup-password" 
                                            autocomplete="new-password"
                                            value={password()}
                                            onInput={(e) => setPassword(e.currentTarget.value)}
                                        />
                                    </div>
                                    <div>
                                        <label for="confirm-password">Confirm Password:</label>
                                        <input 
                                            type="password" 
                                            id="signup-confirm-password" 
                                            autocomplete="new-password"
                                            value={confirmPassword()}
                                            onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div id="signup-footer" style="margin-top: 1.5rem;">
                                <GlassButtonLarge type="submit" class="primary full-width" borderRadius={16}>
                                    Sign Up
                                </GlassButtonLarge>
                            </div>
                        </form>
                    </article>
                </div>
            </div>
        </div>
    );
}