import { useSearchParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";

export default function EmailSentPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const type = searchParams.type || 'signup'; 
    const email = searchParams.email;

    const message = type === 'reset'
        ? "We've sent a password reset link to your email address. Please check your inbox and follow the instructions."
        : "We've sent a verification link to your email address. Please verify your email to unlock all features.";

    const handleTryAgain = async () => {
        if (!email) {
            if (type === 'reset') {
                navigate('/reset-password');
            } else {
                navigate('/signup');
            }
            return;
        }

        try {
            const endpoint = type === 'reset' 
                ? '/api/auth/reset-password-request' 
                : '/api/auth/resend-verification';
            
            await apiRequest('POST', endpoint, { email });
            notify('Success', 'Email resent successfully!', 'success');
        } catch (error: any) {
            notify('Error', error.message || 'Failed to resend email.', 'error');
        }
    };

    return (
        <div id="email-sent-view" class="auth-page-wrapper">
            <div class="auth-card">
                <div class="center-text" style="margin-bottom: 2rem;">
                    <h2>Check Your Inbox</h2>
                </div>

                <div class="modern-form-group" style="text-align: center; color: var(--text-secondary); line-height: 1.6;">
                    <p>{message}</p>
                    <p style="margin-top: 1rem; font-size: 0.9em;">
                        If you don't see it, check your spam folder or <a style="cursor: pointer; color: var(--primary); font-weight: 600;" onClick={handleTryAgain}>try again</a>.
                    </p>
                </div>

                <button onClick={() => window.open("https://outlook.office.com/mail/", "_blank", "noopener,noreferrer")} class="primary full-width" style="border-radius: 16px; text-decoration: none; display: flex; align-items: center; justify-content: center; color: white !important;">
                    Open Outlook
                </button>
            </div>
        </div>
    );
}