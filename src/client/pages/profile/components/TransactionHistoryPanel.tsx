import { For, Show } from "solid-js";
import Panel from "@/components/Panel";
import { FaSolidHourglass, FaSolidPlus, FaSolidMinus } from 'solid-icons/fa';
import type { Transaction } from "../types";

interface TransactionHistoryPanelProps {
    transactions: Transaction[];
}

export default function TransactionHistoryPanel(props: TransactionHistoryPanelProps) {
    return (
        <Panel title="Transaction History" class="glass-panel no-margin">
            <div class="item-list">
                <For each={props.transactions} fallback={<p>No transactions found.</p>}>
                    {(tx) => (
                        <div class="list-item" classList={{ 'pending-tx': tx.status === 'pending' }}>
                            <div class="item-icon" classList={{ positive: tx.amount > 0, negative: tx.amount < 0, pending: tx.status === 'pending' }}>
                                <Show when={tx.status === 'pending'} fallback={tx.amount > 0 ? <FaSolidPlus /> : <FaSolidMinus />}>
                                    <FaSolidHourglass />
                                </Show>
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
                                <span class="item-value" classList={{ positive: tx.amount > 0, negative: tx.amount < 0, muted: tx.status === 'pending' }}>
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
    );
}
