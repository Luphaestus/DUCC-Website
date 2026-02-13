import { createSignal, Show, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { KEY_SVG, PERSON_SVG, LOCK_SVG, MAIL_SVG } from '@/utils/icons';
import { useNotifications } from "@/stores/notifications";
import { useAuth } from "@/stores/auth";
import { LoginEvent } from "@/utils/events/events";
import * as SimpleWebAuthnBrowser from '@simplewebauthn/browser';
import OTPInput from "@/components/OTPInput";

export default function LoginPage() {
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const { refetchUser } = useAuth();
    const [email, setEmail] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [requires2FA, setRequires2FA] = createSignal(false);
    const [methods, setMethods] = createSignal<{ totp: boolean; passkey: boolean; email: boolean }>({ totp: false, passkey: false, email: false });
    const [totpCode, setTotpCode] = createSignal("");
    const [emailCode, setEmailCode] = createSignal("");
    const [totpSuccess, setTotpSuccess] = createSignal(false);
    const [emailSuccess, setEmailSuccess] = createSignal(false);
    const [errors, setErrors] = createSignal<Record<string, boolean>>({});
    const [shaking, setShaking] = createSignal<Record<string, boolean>>({});
    const [emailOtpSent, setEmailOtpSent] = createSignal(false);

    onMount(async () => {
        try {
            const status = await apiRequest('GET', '/api/auth/status', true);
            if (status.authenticated) {
                navigate('/events');
                return;
            }
        } catch (e) { }
    });

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

    const handleLoginSuccess = async (res: any) => {
        await refetchUser();
        LoginEvent.notify({ authenticated: true });
        notify('Success', res.message || 'Login successful!', 'success', 1500, 'login-status');

        const redirect = sessionStorage.getItem('redirect_after_login');
        sessionStorage.removeItem('redirect_after_login');
        navigate(redirect || '/events');
    };

    const startPasskeyLogin = async (emailVal: string | null = null, useConditionalUI = false) => {
        try {
            const options = await apiRequest('POST', '/api/auth/passkey/login-options', { email: emailVal });
            
            // startAuthentication handles the browser prompt
            const asseResp = await SimpleWebAuthnBrowser.startAuthentication(options, useConditionalUI);
            const res = await apiRequest('POST', '/api/auth/passkey/login-verify', asseResp);
            handleLoginSuccess(res);
        } catch (err: any) {
            // Ignore cancels and aborts, especially for conditional UI
            if (err.name === 'NotAllowedError' || err.name === 'AbortError') return;
            
            if (!useConditionalUI) {
                triggerError(['passkey']);
                notify('Error', err.message || 'Passkey login failed.', 'error');
            }
        }
    };

    const handlePasswordLogin = async (e: Event) => {
        e.preventDefault();
        let fullEmail = email();
        if (fullEmail && !fullEmail.includes('@')) {
            fullEmail += '@durham.ac.uk';
        }

        try {
            const res = await apiRequest('POST', '/api/auth/login', { email: fullEmail, password: password() });
            if (res.requires2FA) {
                setMethods(res.methods);
                setRequires2FA(true);
                if (res.methods.email && !res.methods.totp && !res.methods.passkey) {
                    setEmailOtpSent(true);
                }
                if (res.methods.passkey && !res.methods.totp && !res.methods.email) startPasskeyLogin();
            } else {
                handleLoginSuccess(res);
            }
        } catch (error: any) {
            if (error.unverified) {
                navigate(`/email-sent?type=signup&email=${encodeURIComponent(error.email)}`);
                return;
            }
            triggerError(['email', 'password']);
            notify('Error', error.message || 'Login failed.', 'error', 3000, 'login-status');
        }
    };

    const handleTOTPVerify = async (e?: Event | string) => {
        if (typeof e !== 'string') e?.preventDefault();
        const code = typeof e === 'string' ? e : totpCode();
        if (code.length !== 6) return;

        try {
            const res = await apiRequest('POST', '/api/auth/verify-totp', { token: code });
            setTotpSuccess(true);
            setTimeout(() => handleLoginSuccess(res), 600);
        } catch (err: any) {
            triggerError(['totp']);
            notify('Error', err.message, 'error');
            setTotpCode(""); // Clear on error
        }
    };

    const handleEmailVerify = async (e?: Event | string) => {
        if (typeof e !== 'string') e?.preventDefault();
        const code = typeof e === 'string' ? e : emailCode();
        if (code.length !== 6) return;

        try {
            const res = await apiRequest('POST', '/api/auth/verify-email-otp', { token: code });
            setEmailSuccess(true);
            setTimeout(() => handleLoginSuccess(res), 600);
        } catch (err: any) {
            triggerError(['emailOtp']);
            notify('Error', err.message, 'error');
            setEmailCode(""); // Clear on error
        }
    };

    const resendEmailOTP = async () => {
        try {
            await apiRequest('POST', '/api/auth/resend-email-otp');
            setEmailOtpSent(true);
            notify('Success', 'Verification code resent to your email.', 'success');
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    return (
        <div id="login-view" class="auth-page-wrapper">
            <div class="auth-card">
                <Show when={!requires2FA()}>
                    <div class="center-text">
                        <h2>Sign In</h2>
                        <p class="auth-subtitle">Welcome back! Please sign in to continue.</p>
                    </div>

                    <button
                        type="button"
                        class="secondary outline full-width"
                        classList={{ 'shaking': shaking().passkey, 'is-invalid': errors().passkey }}
                        onClick={() => {
                            clearError('passkey');
                            startPasskeyLogin(email() ? (email().includes('@') ? email() : email() + '@durham.ac.uk') : null);
                        }}
                        style={{ "border-radius": "16px" }}
                    >
                        <span innerHTML={KEY_SVG} style="margin-right: 8px;" /> Sign in with Passkey
                    </button>

                    <div class="divider" style="margin: 1.5rem 0;"><span>OR</span></div>

                    <form onSubmit={handlePasswordLogin}>
                        <div class="modern-form-group">
                            <label for="email">Email address</label>
                            <div class="glass-input-group durham-email-wrapper" classList={{ 'is-invalid': errors().email, 'shaking': shaking().email }}>
                                <div class="icon">
                                    <span innerHTML={PERSON_SVG} />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    placeholder="email"
                                    autocomplete="username"
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
                                />
                                <span class="email-suffix">@durham.ac.uk</span>
                            </div>
                        </div>

                        <div class="modern-form-group">
                            <label for="password">Password</label>
                            <div class="glass-input-group" classList={{ 'is-invalid': errors().password, 'shaking': shaking().password }}>
                                <div class="icon">
                                    <span innerHTML={LOCK_SVG} />
                                </div>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    autocomplete="current-password"
                                    placeholder="••••••••"
                                    value={password()}
                                    onInput={(e) => {
                                        clearError('password');
                                        setPassword(e.currentTarget.value);
                                    }}
                                />
                            </div>
                        </div>

                        <div style="margin-top: 0.5rem;">
                            <button type="submit" class="primary full-width" style={{ "border-radius": "16px" }}>
                                Continue with Password
                            </button>
                        </div>
                    </form>
                </Show>

                <Show when={requires2FA()}>
                    <div class="center-text">
                        <h2>Verify Identity</h2>
                        <p class="auth-subtitle">Your account is protected with 2FA.</p>
                    </div>

                    <Show when={methods().totp}>
                        <form onSubmit={handleTOTPVerify} class="modern-form">
                            <label for="totp-code" class="center-text">Authenticator Code</label>
                            <OTPInput
                                value={totpCode()}
                                onInput={(val) => {
                                    clearError('totp');
                                    setTotpCode(val);
                                }}
                                onComplete={(val) => handleTOTPVerify(val)}
                                error={errors().totp}
                                success={totpSuccess()}
                                disabled={totpSuccess()}
                            />
                            <button type="submit" class="primary full-width" style={{ "border-radius": "16px" }} disabled={totpSuccess()}>
                                Verify Code
                            </button>
                        </form>
                    </Show>

                    <Show when={methods().email}>
                        <div class="email-otp-section" style="margin-top: 1rem;">
                            <Show when={methods().totp}>
                                <div class="divider" style="margin: 1.5rem 0;"><span>OR</span></div>
                            </Show>

                            <Show when={!emailOtpSent()}>
                                <button
                                    class="secondary outline full-width"
                                    onClick={resendEmailOTP}
                                    style={{ "border-radius": "16px" }}
                                >
                                    Send code to email
                                </button>
                            </Show>

                            <Show when={emailOtpSent()}>
                                <form onSubmit={handleEmailVerify} class="modern-form">
                                    <label for="email-otp-code" class="center-text">Email Verification Code</label>
                                    <OTPInput
                                        value={emailCode()}
                                        onInput={(val) => {
                                            clearError('emailOtp');
                                            setEmailCode(val);
                                        }}
                                        onComplete={(val) => handleEmailVerify(val)}
                                        error={errors().emailOtp}
                                        success={emailSuccess()}
                                        disabled={emailSuccess()}
                                    />
                                    <div class="center-text" style="margin-top: 1rem;">
                                        <small>Didn't receive the code? <a onClick={resendEmailOTP} class="clickable">Resend</a></small>
                                    </div>
                                </form>
                            </Show>
                        </div>
                    </Show>

                    <Show when={methods().passkey}>
                        <div class="passkey-login-section">
                            <Show when={methods().totp}>
                                <div class="divider" style="margin: 1.5rem 0;"><span>OR</span></div>
                            </Show>
                            <button
                                class="secondary full-width"
                                classList={{ 'shaking': shaking().passkey, 'is-invalid': errors().passkey }}
                                onClick={() => {
                                    clearError('passkey');
                                    startPasskeyLogin();
                                }}
                                style={{ "border-radius": "16px" }}
                            >
                                <span innerHTML={KEY_SVG} style="margin-right: 8px;" /> Use Passkey
                            </button>
                        </div>
                    </Show>
                </Show>

                <div class="auth-footer">
                    <p>
                        <a onClick={() => navigate('/reset-password')} class="secondary">Forgot password?</a>
                        <span style="margin: 0 8px; color: var(--text-secondary); opacity: 0.5;">•</span>
                        <a onClick={() => navigate('/signup')}>Create an account</a>
                    </p>
                </div>
            </div>
        </div>
    );
}