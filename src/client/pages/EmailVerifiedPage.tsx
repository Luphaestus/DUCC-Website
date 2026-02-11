import { useNavigate } from "@solidjs/router";
import { CHECK_CIRCLE_SVG } from "@/utils/icons";

export default function EmailVerifiedPage() {
    const navigate = useNavigate();

    return (
        <div id="email-verified-view" class="auth-page-wrapper">
            <div class="auth-card">
                <div class="center-text" style="margin-bottom: 2rem;">
                    <h2>Email Verified!</h2>
                    <p class="auth-subtitle">Your account is now fully active.</p>
                </div>

                <div class="auth-footer">
                    <button class="primary full-width" onClick={() => navigate('/login')} style={{ "border-radius": "16px" }}>
                        Log In
                    </button>
                </div>
            </div>
        </div>
    );
}
