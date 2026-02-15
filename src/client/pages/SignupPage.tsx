import { createSignal, onMount, createMemo, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { PERSON_SVG, LOCK_SVG } from '@/utils/icons';
import { calculateEntropy, getStrengthLabel } from "@/utils/password";
import { useAuth } from "@/stores/auth";
import { LoginEvent } from "@/utils/events/events";

export default function SignupPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { notify } = useNotifications();
    const { refetchUser } = useAuth();
    const [firstName, setFirstName] = createSignal("");
    const [lastName, setLastName] = createSignal("");
    const [email, setEmail] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [confirmPassword, setConfirmPassword] = createSignal("");
    const [isEmailModified, setIsEmailModified] = createSignal(false);
    const [invitationToken, setInvitationToken] = createSignal<string | null>(null);
    const [inviterName, setInviterName] = createSignal<string | null>(null);
    const [errors, setErrors] = createSignal<Record<string, string>>({});
    const [shaking, setShaking] = createSignal<Record<string, boolean>>({});

    const passwordStrength = createMemo(() => {
        const entropy = calculateEntropy(password());
        return getStrengthLabel(entropy);
    });

    onMount(async () => {
        try {
            const status = await apiRequest('GET', '/api/auth/status', null, true);
            if (status.authenticated) {
                navigate('/events');
                return;
            }
        } catch (e) {}

        const tokenParam = searchParams.token;
        const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
        
        if (token) {
            try {
                const res = await apiRequest('GET', `/api/auth/invitation/verify?token=${token}`);
                setInvitationToken(token);
                setEmail(res.email);
                setIsEmailModified(true);
                setInviterName(res.inviter_name);
                notify('Info', `Invited by ${res.inviter_name}`, 'info');
            } catch (err: any) {
                notify('Error', 'Invalid or expired invitation.', 'error');
                navigate('/signup');
            }
        }
    });

    const triggerError = (fieldErrors: Record<string, string>) => {
        const newErrors = { ...errors() };
        const newShaking: Record<string, boolean> = {};
        Object.entries(fieldErrors).forEach(([field, message]) => {
            newErrors[field] = message;
            newShaking[field] = true;
        });
        setErrors(newErrors);
        setShaking(newShaking);
        
        // Remove shake class after animation to allow re-triggering
        setTimeout(() => {
            setShaking({});
        }, 500);
    };

    const clearError = (field: string) => {
        if (errors()[field]) {
            const updated = { ...errors() };
            delete updated[field];
            setErrors(updated);
        }
    };

    const handleFirstNameInput = (val: string) => {
        clearError('firstName');
        setFirstName(val);
        if (!isEmailModified()) {
            const dot = (val !== '' && lastName() !== '') ? '.' : '';
            setEmail(`${val.toLowerCase()}${dot}${lastName().toLowerCase()}`);
        }
    };

    const handleLastNameInput = (val: string) => {
        clearError('lastName');
        setLastName(val);
        if (!isEmailModified()) {
            const dot = (firstName() !== '' && val !== '') ? '.' : '';
            setEmail(`${firstName().toLowerCase()}${dot}${val.toLowerCase()}`);
        }
    };

    const handleEmailInput = (val: string) => {
        clearError('email');
        setIsEmailModified(true);
        if (invitationToken()) return;
        setEmail(val);
    };

    const handleSignup = async (e: Event) => {
        e.preventDefault();

        const currentErrors: Record<string, string> = {};

        if (password() !== confirmPassword()) {
            currentErrors.confirmPassword = 'Passwords do not match';
        }

        if (password().length < 8) {
            currentErrors.password = 'Password must be at least 8 characters';
        } else if (password().length > 72) {
            currentErrors.password = 'Password cannot exceed 72 characters';
        }

        if (email().includes('+') && !invitationToken()) {
            currentErrors.email = 'Plus-indexed emails are not allowed';
        } else if (!email().includes('@') && !email().includes('.') && !invitationToken()) {
            currentErrors.email = 'Email must follow the first.last format';
        }

        if (Object.keys(currentErrors).length > 0) {
            triggerError(currentErrors);
            return;
        }

        let fullEmail = email();
        if (fullEmail && !fullEmail.includes('@')) {
            fullEmail += '@durham.ac.uk';
        }

        try {
            const res = await apiRequest('POST', '/api/auth/signup', {
                first_name: firstName(),
                last_name: lastName(),
                email: fullEmail,
                password: password(),
                invitation_token: invitationToken()
            });
            notify('Success', res.message || 'Sign up successful!', 'success', 1500, 'signup-status');
            
            if (res.verified) {
                await refetchUser();
                LoginEvent.notify({ authenticated: true });
                navigate('/events');
            } else {
                navigate(`/email-sent?type=signup&email=${encodeURIComponent(fullEmail)}`);
            }
        } catch (error: any) {
            const backendErrors: Record<string, string> = {};
            
            if (error.errors) {
                if (error.errors.email) backendErrors.email = error.errors.email;
                if (error.errors.first_name) backendErrors.firstName = error.errors.first_name;
                if (error.errors.last_name) backendErrors.lastName = error.errors.last_name;
            } else if (error.message === 'Email is already taken.') {
                backendErrors.email = 'This email is already registered.';
            } else {
                notify('Error', error.message || 'Sign up failed.', 'error', 2000, 'signup-status');
            }

            if (Object.keys(backendErrors).length > 0) {
                triggerError(backendErrors);
            }
        }
    };

    return (
        <div id="signup-view" class="auth-page-wrapper">
            <div class="auth-card" style={{ "max-width": "1050px" }}>
                <div class="center-text">
                    <h2>
                        Join the Club
                    </h2>
                    <p class="auth-subtitle">
                        <Show when={inviterName()} fallback="Create your account to start paddling!">
                            You've been invited by {inviterName()} to join DUCC!
                        </Show>
                    </p>
                </div>

                <form onSubmit={handleSignup}>
                    <div class="grid">
                        <div class="modern-form-group">
                            <label for="signup-first-name">First Name</label>
                            <div class="glass-input-group" classList={{ 'is-invalid': !!errors().firstName, 'shaking': shaking().firstName }}>
                                <div class="icon">
                                    <span innerHTML={PERSON_SVG} />
                                </div>
                                <input 
                                    type="text" 
                                    id="signup-first-name" 
                                    placeholder="Durham" 
                                    autocomplete="given-name"
                                    value={firstName()}
                                    onInput={(e) => handleFirstNameInput(e.currentTarget.value)}
                                    required
                                    autofocus
                                />
                            </div>
                            <Show when={errors().firstName}>
                                <small class="error-text">{errors().firstName}</small>
                            </Show>
                        </div>
                        <div class="modern-form-group">
                            <label for="signup-last-name">Last Name</label>
                            <div class="glass-input-group" classList={{ 'is-invalid': !!errors().lastName, 'shaking': shaking().lastName }}>
                                <div class="icon">
                                    <span innerHTML={PERSON_SVG} />
                                </div>
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
                            <Show when={errors().lastName}>
                                <small class="error-text">{errors().lastName}</small>
                            </Show>
                        </div>
                    </div>

                    <div class="modern-form-group">
                        <label for="signup-email">Email Address</label>
                        <div class="glass-input-group" classList={{ 'durham-email-wrapper': !invitationToken(), 'is-invalid': !!errors().email, 'shaking': shaking().email }}>
                            <div class="icon">
                                <span innerHTML={PERSON_SVG} />
                            </div>
                            <input 
                                type="text" 
                                id="signup-email" 
                                placeholder={invitationToken() ? "email@example.com" : "firstname.lastname"} 
                                autocomplete="username"
                                value={email()}
                                onInput={(e) => handleEmailInput(e.currentTarget.value)}
                                required
                                disabled={!!invitationToken()}
                            />
                            <Show when={!invitationToken() && !email().includes('@')}>
                                <span class="email-suffix">@durham.ac.uk</span>
                            </Show>
                        </div>
                        <Show when={errors().email}>
                            <small class="error-text">{errors().email}</small>
                        </Show>
                    </div>

                    <div class="grid">
                        <div class="modern-form-group">
                            <label for="signup-password">Password</label>
                            <div class="glass-input-group" classList={{ 'is-invalid': !!errors().password, 'shaking': shaking().password }}>
                                <div class="icon">
                                    <span innerHTML={LOCK_SVG} />
                                </div>
                                <input 
                                    type="password" 
                                    id="signup-password" 
                                    autocomplete="new-password"
                                    placeholder="••••••••"
                                    value={password()}
                                    onInput={(e) => {
                                        clearError('password');
                                        setPassword(e.currentTarget.value);
                                    }}
                                    required
                                />
                            </div>
                            
                            <Show when={password().length > 0}>
                                <div class="password-strength-meter" style="margin-top: 0.5rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <small style={{ color: passwordStrength().color, "font-weight": "600", "font-size": "0.75rem" }}>
                                            {passwordStrength().label}
                                        </small>
                                        <small style="color: var(--pico-muted-color); font-size: 0.7rem;">
                                            {password().length}/72
                                        </small>
                                    </div>
                                    <div style="height: 4px; width: 100%; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
                                        <div 
                                            style={{
                                                height: "100%",
                                                width: `${(passwordStrength().score / 5) * 100}%`,
                                                background: passwordStrength().color,
                                                transition: "width 0.3s ease, background 0.3s ease"
                                            }} 
                                        />
                                    </div>
                                </div>
                            </Show>

                            <Show when={errors().password}>
                                <small class="error-text">{errors().password}</small>
                            </Show>
                        </div>
                        <div class="modern-form-group">
                            <label for="signup-confirm-password">Confirm Password</label>
                            <div class="glass-input-group" classList={{ 'is-invalid': !!errors().confirmPassword, 'shaking': shaking().confirmPassword }}>
                                <div class="icon">
                                    <span innerHTML={LOCK_SVG} />
                                </div>
                                <input 
                                    type="password" 
                                    id="signup-confirm-password" 
                                    autocomplete="new-password"
                                    placeholder="••••••••"
                                    value={confirmPassword()}
                                    onInput={(e) => {
                                        clearError('confirmPassword');
                                        setConfirmPassword(e.currentTarget.value);
                                    }}
                                    required
                                />
                            </div>
                            <Show when={errors().confirmPassword}>
                                <small class="error-text">{errors().confirmPassword}</small>
                            </Show>
                        </div>
                    </div>

                    <div id="signup-footer" style="margin-top: 1rem;">
                        <button type="submit" class="primary full-width" style={{ "border-radius": "16px" }}>
                            Create Account
                        </button>
                    </div>
                </form>

                <div class="auth-footer">
                    <p>Already have an account? <a onClick={() => navigate('/login')}>Sign in instead</a></p>
                </div>
            </div>
        </div>
    );
}