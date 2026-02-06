import { createSignal, Show, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { LOGIN_SVG, KEY_SVG } from '@/utils/icons';
import { useNotifications } from "@/stores/notifications";
import { useAuth } from "@/stores/auth";
import { LoginEvent } from "@/utils/events/events";
import * as SimpleWebAuthnBrowser from '@simplewebauthn/browser';
import { GlassButtonLarge, GlassButtonSmall } from "../components/LiquidButton";

export default function LoginPage() {
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const { refetchUser } = useAuth();
    const [email, setEmail] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [requires2FA, setRequires2FA] = createSignal(false);
    const [methods, setMethods] = createSignal<{ totp: boolean; passkey: boolean }>({ totp: false, passkey: false });
    const [totpCode, setTotpCode] = createSignal("");

    onMount(async () => {
        try {
            const status = await apiRequest('GET', '/api/auth/status', true);
            if (status.authenticated) {
                navigate('/events');
            }
        } catch (e) {}
    });

    const handleLoginSuccess = async (res: any) => {
        await refetchUser();
        LoginEvent.notify({ authenticated: true });
        notify('Success', res.message || 'Login successful!', 'success', 1500, 'login-status');
        
        const redirect = sessionStorage.getItem('redirect_after_login');
        sessionStorage.removeItem('redirect_after_login');
        navigate(redirect || '/events');
    };

    const startPasskeyLogin = async (emailVal: string | null = null) => {
        try {
            const options = await apiRequest('POST', '/api/auth/passkey/login-options', { email: emailVal });
            const asseResp = await SimpleWebAuthnBrowser.startAuthentication(options);
            const res = await apiRequest('POST', '/api/auth/passkey/login-verify', asseResp);
            handleLoginSuccess(res);
        } catch (err: any) {
            if (err.name === 'NotAllowedError' || err.name === 'AbortError') return;
            notify('Error', err.message || 'Passkey login failed.', 'error');
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
                if (res.methods.passkey && !res.methods.totp) startPasskeyLogin();
            } else {
                handleLoginSuccess(res);
            }
        } catch (error: any) {
            notify('Error', error.message || 'Login failed.', 'error', 3000, 'login-status');
        }
    };

    const handleTOTPVerify = async (e: Event) => {
        e.preventDefault();
        try {
            const res = await apiRequest('POST', '/api/auth/verify-totp', { token: totpCode() });
            handleLoginSuccess(res);
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    return (
        <div id="login-view" class="view">
            <div class="small-container">
                <div class="form-info">
                    <article class="form-box shadow">
                        <Show when={!requires2FA()}>
                            <div class="center-text" style="margin-bottom: 2rem;">
                                <h2 class="no-margin">
                                    <span innerHTML={LOGIN_SVG} />
                                    Sign In
                                </h2>
                            </div>
                            
                            <div class="passkey-quick-login center-text" style="margin-bottom: 1.5rem;">
                                <GlassButtonLarge 
                                    type="button" 
                                    class="secondary outline full-width" 
                                    onClick={() => startPasskeyLogin(email() ? (email().includes('@') ? email() : email() + '@durham.ac.uk') : null)}
                                    borderRadius={16}
                                >
                                    <span innerHTML={KEY_SVG} style="margin-right: 8px;" /> Sign in with Passkey
                                </GlassButtonLarge>
                                <div class="divider" style="margin: 1.5rem 0;"><span>OR</span></div>
                            </div>

                            <form onSubmit={handlePasswordLogin}>
                                <label for="email">Email address</label>
                                <div class="durham-email-wrapper">
                                    <input 
                                        id="email" 
                                        name="email" 
                                        placeholder="username" 
                                        autocomplete="username"
                                        value={email()}
                                        onInput={(e) => setEmail(e.currentTarget.value.split('@')[0])}
                                    />
                                    <span class="email-suffix">@durham.ac.uk</span>
                                </div>

                                <label for="password">Password</label>
                                <input 
                                    type="password" 
                                    id="password" 
                                    name="password" 
                                    autocomplete="current-password" 
                                    placeholder="••••••••"
                                    value={password()}
                                    onInput={(e) => setPassword(e.currentTarget.value)}
                                />
                                
                                <div style="margin-top: 1rem;">
                                    <GlassButtonLarge type="submit" class="primary full-width" borderRadius={16}>
                                        Continue with Password
                                    </GlassButtonLarge>
                                </div>
                            </form>
                        </Show>

                        <Show when={requires2FA()}>
                            <div class="center-text" style="margin-bottom: 2rem;">
                                <h2 class="no-margin">Verify Identity</h2>
                            </div>
                            <p class="center-text secondary">Your account is protected with 2FA.</p>
                            
                            <Show when={methods().totp}>
                                <form onSubmit={handleTOTPVerify} class="modern-form">
                                    <label for="totp-code">Authenticator Code</label>
                                    <input 
                                        type="text" 
                                        id="totp-code" 
                                        placeholder="123456" 
                                        pattern="[0-9]*" 
                                        inputmode="numeric" 
                                        required 
                                        autofocus
                                        value={totpCode()}
                                        onInput={(e) => setTotpCode(e.currentTarget.value)}
                                    />
                                    <GlassButtonLarge type="submit" class="primary full-width" borderRadius={16}>
                                        Verify Code
                                    </GlassButtonLarge>
                                </form>
                            </Show>

                            <Show when={methods().passkey}>
                                <div class="passkey-login-section">
                                    <Show when={methods().totp}>
                                        <div class="divider" style="margin: 1.5rem 0;"><span>OR</span></div>
                                    </Show>
                                    <GlassButtonLarge class="secondary full-width" onClick={() => startPasskeyLogin()} borderRadius={16}>
                                        <span innerHTML={KEY_SVG} style="margin-right: 8px;" /> Use Passkey
                                    </GlassButtonLarge>
                                </div>
                            </Show>

                            <div class="center-text" style="margin-top: 2rem;">
                                <GlassButtonSmall class="outline secondary" onClick={() => setRequires2FA(false)}>
                                    Back to Login
                                </GlassButtonSmall>
                            </div>
                        </Show>

                        <div class="center-text" style="margin-top: 2rem; border-top: 1px solid var(--pico-muted-border-color); padding-top: 1rem;">
                            <p class="no-margin"><a onClick={() => navigate('/reset-password')} class="secondary">Forgot password?</a></p>
                            <p class="no-margin" style="margin-top: 0.5rem;">New here? <a onClick={() => navigate('/signup')}>Create an account</a></p>
                        </div>
                    </article>
                </div>
            </div>
        </div>
    );
}