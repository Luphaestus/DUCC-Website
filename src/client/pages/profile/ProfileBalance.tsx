import { createSignal, createResource, Show, For } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Modal from "@/components/Modal";
import Panel from "@/components/Panel";
import {
    WALLET_SVG, HOURGLASS_TOP_SVG, ADD_SVG, REMOVE_SVG
} from '@/utils/icons';
import { Transaction } from "./types";
import { useProfile } from "./ProfileLayout";

export default function ProfileBalance() {
    const { notify } = useNotifications();
    const context = useProfile();
    const profile = () => context?.profile();

    const [transactions, { refetch: refetchTransactions }] = createResource(async () => {
        const res = await apiRequest('GET', '/api/user/elements/transactions');
        return (res.transactions || []) as Transaction[];
    });

    const [globals] = createResource(async () => {
        try {
            const minMoneyRes = await apiRequest('GET', '/api/globals/MinMoney').catch(() => ({ res: { MinMoney: { data: -25 } } }));
            return {
                minMoney: Number(minMoneyRes.res?.MinMoney?.data || -25)
            };
        } catch {
            return { minMoney: -25 };
        }
    });

    const [isTopUpModalOpen, setIsTopUpModalOpen] = createSignal(false);
    const [topUpAmount, setTopUpAmount] = createSignal("");
    const [isSubmittingTopUp, setIsSubmittingTopUp] = createSignal(false);

    const handleTopUpSubmit = async (e: Event) => {
        e.preventDefault();
        const amount = parseFloat(topUpAmount());
        if (isNaN(amount) || amount <= 0) {
            notify('Error', 'Please enter a valid amount.', 'error');
            return;
        }

        setIsSubmittingTopUp(true);
        try {
            await apiRequest('POST', '/api/user/topup-request', { amount, description: 'Bank Transfer' });
            notify('Success', 'Top-up request submitted! Admin will verify soon.', 'success');
            setIsTopUpModalOpen(false);
            setTopUpAmount("");
            refetchTransactions();
        } catch (err: any) {
            notify('Error', err.message || 'Failed to submit request.', 'error');
        } finally {
            setIsSubmittingTopUp(false);
        }
    };

    return (
        <Show when={profile()} fallback={<p aria-busy="true">Loading...</p>}>
            <section class="dashboard-section active">
                <article class="value-header liquid-container glass-panel no-margin">
                    <div class="value-info">
                        <span class="value-title">Current Balance</span>
                        <div class="value-display" classList={{
                            'positive': profile()!.balance >= 0,
                            'negative': profile()!.balance < (globals()?.minMoney || -25),
                            'warning': profile()!.balance < 0 && profile()!.balance >= (globals()?.minMoney || -25)
                        }}>
                            £{profile()!.balance.toFixed(2)}
                        </div>
                    </div>
                    <div class="value-actions">
                        <button class="small-btn primary" onClick={() => setIsTopUpModalOpen(true)}>Report Top-Up</button>
                    </div>
                </article>

                <div class="grid">
                    <Panel title="How to Top Up" icon={WALLET_SVG} class="glass-panel no-margin">
                        <p>To add funds to your account, please make a bank transfer using the details below. Once sent, use the "Report Top-Up" button to let us know!</p>
                        <div class="bank-details liquid-container secondary-bg">
                            <div class="info-rows mini">
                                <div class="info-row"><span>Bank:</span> <strong>Durham University</strong></div>
                                <div class="info-row"><span>Sort Code:</span> <strong>20-27-66</strong></div>
                                <div class="info-row"><span>Account:</span> <strong>53770109</strong></div>
                                <div class="info-row">
                                    <span>Reference:</span>
                                    <strong>{profile()!.first_name.charAt(0).toUpperCase() + profile()!.last_name.toUpperCase() + "WEBSITE"}</strong>
                                </div>
                            </div>
                        </div>
                        <p class="mt-4 small-text"><em>Verification is usually completed within 24-48 hours.</em></p>
                    </Panel>
                </div>

                <Panel title="Transaction History" class="glass-panel no-margin">
                    <div class="item-list">
                        <For each={transactions()} fallback={<p>No transactions found.</p>}>
                            {(tx) => (
                                <div class="list-item" classList={{ 'pending-tx': tx.status === 'pending' }}>
                                    <div class="item-icon" classList={{ 'positive': tx.amount > 0, 'negative': tx.amount < 0, 'pending': tx.status === 'pending' }}>
                                        <span innerHTML={tx.status === 'pending' ? HOURGLASS_TOP_SVG : (tx.amount > 0 ? ADD_SVG : REMOVE_SVG)} />
                                    </div>
                                    <div class="item-details">
                                        <span class="item-title">
                                            {tx.description}
                                            <Show when={tx.status === 'pending'}>
                                                <span class="badge warning mini-badge ml-2">Pending Verification</span>
                                            </Show>
                                        </span>
                                        <span class="item-subtitle">{new Date(tx.created_at).toLocaleDateString('en-GB')}</span>
                                    </div>
                                    <div class="item-value-group">
                                        <span class="item-value" classList={{ 'positive': tx.amount > 0, 'negative': tx.amount < 0, 'muted': tx.status === 'pending' }}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                                        </span>
                                        <Show when={tx.status === 'completed'}>
                                            <span class="item-extra">£{tx.after?.toFixed(2) || '0.00'}</span>
                                        </Show>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </Panel>
            </section>

            <Modal isOpen={isTopUpModalOpen()} onClose={() => setIsTopUpModalOpen(false)} title="Report Bank Transfer">
                <form onSubmit={handleTopUpSubmit} class="modern-form">
                    <p>Have you already sent the transfer? Let us know the amount so we can verify it faster.</p>

                    <div class="form-group">
                        <label>Amount Transferred (£)
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={topUpAmount()}
                                onInput={e => setTopUpAmount(e.currentTarget.value)}
                                placeholder="0.00"
                                required
                                autofocus
                            />
                        </label>
                    </div>

                    <div class="liquid-container secondary-bg" style={{ "font-size": "0.85rem" }}>
                        <p class="m-0"><strong>Note:</strong> Your balance will update once a treasurer confirms the receipt of funds in the club bank account. You'll receive an email receipt once verified.</p>
                    </div>

                    <div class="form-actions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 2rem;">
                        <button type="button" class="secondary" onClick={() => setIsTopUpModalOpen(false)}>Cancel</button>
                        <button type="submit" class="primary" disabled={isSubmittingTopUp()}>
                            {isSubmittingTopUp() ? 'Submitting...' : 'Confirm Report'}
                        </button>
                    </div>
                </form>
            </Modal>
        </Show>
    );
}
