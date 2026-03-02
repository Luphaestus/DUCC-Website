import Modal from "@/components/Modal";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import FuzzyPicker from "@/widgets/FuzzyPicker";
import { createEffect, createMemo, createResource, createSignal, For, Show } from "solid-js";

interface SwimUser {
    id: number;
    first_name: string;
    last_name: string;
}

interface PendingSwim {
    id: number;
    count: number;
    bootie_count?: number;
    is_bootie: number | boolean;
    message: string | null;
    created_at: string;
    added_by_name: string;
}

interface SwimActionModalProps {
    isOpen: boolean;
    mode: 'swim' | 'bootie';
    onClose: () => void;
    onSuccess?: () => void;
    initialUser?: {
        id: number;
        first_name: string;
        last_name: string;
    } | null;
}

export default function SwimActionModal(props: SwimActionModalProps) {
    const { notify } = useNotifications();

    const [selectedUserId, setSelectedUserId] = createSignal<number | null>(null);
    const [message, setMessage] = createSignal('');
    const [swimCount, setSwimCount] = createSignal(1);
    const [isTogglingSwimId, setIsTogglingSwimId] = createSignal<number | null>(null);
    const [isSubmitting, setIsSubmitting] = createSignal(false);
    const [bootieRows, setBootieRows] = createSignal<PendingSwim[]>([]);

    const [users] = createResource(
        () => props.isOpen,
        async (isOpen) => {
            if (!isOpen) return [] as SwimUser[];
            const res = await apiRequest('GET', '/api/user/swims/users?limit=200');
            return (res.data || []) as SwimUser[];
        }
    );

    const selectedUser = createMemo(() => {
        const currentId = selectedUserId();
        if (!currentId) return null;
        return (users() || []).find((u) => Number(u.id) === Number(currentId)) || null;
    });

    const [bootieHistory] = createResource(
        () => ({ isOpen: props.isOpen, mode: props.mode, userId: selectedUserId() }),
        async ({ isOpen, mode, userId }) => {
            if (!isOpen || mode !== 'bootie' || !userId) return [] as PendingSwim[];
            const res = await apiRequest('GET', `/api/user/${userId}/swims/history`);
            return (res.data || []) as PendingSwim[];
        }
    );

    createEffect(() => {
        if (props.isOpen) {
            const initial = props.initialUser || null;
            setSelectedUserId(initial?.id ?? null);
            setMessage('');
            setSwimCount(1);
            setIsSubmitting(false);
            setBootieRows([]);
        }
    });

    createEffect(() => {
        const rows = bootieHistory() || [];
        setBootieRows(rows);
    });

    const selectUser = (user: SwimUser) => {
        setSelectedUserId(user.id);
    };

    const adjustBootie = async (swimId: number, mode: 'toggle' | 'add' | 'remove' | 'set-all', amount: number = 1) => {
        const currentRows = bootieRows();
        const nextRows = currentRows.map((row) => {
            if (row.id !== swimId) return row;
            const total = Number(row.count || 0);
            const current = Number(row.bootie_count || 0);
            let next = current;

            switch (mode) {
                case 'add':
                    next = Math.min(total, current + amount);
                    break;
                case 'remove':
                    next = Math.max(0, current - amount);
                    break;
                case 'set-all':
                    next = total;
                    break;
                case 'toggle':
                default:
                    next = current >= total ? 0 : total;
                    break;
            }

            return { ...row, bootie_count: next, is_bootie: next >= total ? 1 : 0 };
        });
        try {
            setIsTogglingSwimId(swimId);
            setBootieRows(nextRows);
            await apiRequest('POST', `/api/user/swims/${swimId}/bootie/toggle`, { mode, amount });
        } catch (error: any) {
            setBootieRows(currentRows);
            notify('Error', error.message || 'Failed to update bootie.', 'error');
        } finally {
            setIsTogglingSwimId(null);
        }
    };

    const submit = async () => {
        const userId = selectedUserId();
        if (!userId) {
            notify('Error', 'Please choose a person first.', 'error');
            return;
        }

        try {
            setIsSubmitting(true);
            if (!message().trim()) {
                notify('Error', 'Please enter a message for the swim.', 'error');
                return;
            }

            await apiRequest('POST', `/api/user/${userId}/swims`, { count: Math.max(1, swimCount()), message: message().trim() });
            notify('Success', 'Swim logged.', 'success');

            props.onSuccess?.();
            props.onClose();
        } catch (error: any) {
            notify('Error', error.message || 'Failed to save changes.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={props.isOpen}
            onClose={props.onClose}
            title={props.mode === 'swim' ? 'Log Swim' : 'Log Bootie'}
            maxWidth="760px"
        >
            <div class="swim-action-modal">
                <div class="swim-action-user-section">
                    <p class="swim-action-section-title">Choose Person</p>
                    <FuzzyPicker
                        items={users() || []}
                        selectedId={selectedUserId()}
                        onSelect={selectUser}
                        getLabel={(user) => `${user.first_name} ${user.last_name}`}
                        placeholder="Search by name"
                        emptyText="No matching users found."
                        class="swim-action-user-picker"
                    />

                    <Show when={selectedUser()}>
                        <p class="small-text selected-user-label">
                            Selected: {selectedUser()!.first_name} {selectedUser()!.last_name}
                        </p>
                    </Show>
                </div>

                <Show when={props.mode === 'swim'}>
                    <div class="swim-action-input-section">
                        <p class="swim-action-section-title">Log Swim Input</p>
                        <label>
                            Count
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={swimCount()}
                                onInput={(event) => setSwimCount(Math.max(1, parseInt(event.currentTarget.value || '1', 10) || 1))}
                            />
                        </label>

                        <label>
                            Message
                            <textarea
                                value={message()}
                                onInput={(event) => setMessage(event.currentTarget.value)}
                                placeholder="What swim should be logged?"
                            />
                        </label>
                    </div>
                </Show>

                <Show when={props.mode === 'bootie' && selectedUserId()}>
                    <div class="item-list scrollable-list swim-history-list swim-action-pending-list">
                        <Show when={!bootieHistory.loading} fallback={<p class="small-text">Loading swims...</p>}>
                            <For each={bootieRows()} fallback={<p class="small-text no-margin">No swim history for this person.</p>}>
                                {(swim) => (
                                    <div
                                        class="list-item"
                                        classList={{
                                            'primary-glass': Number(swim.bootie_count || 0) >= Number(swim.count || 0),
                                            'neutral-glass': Number(swim.bootie_count || 0) < Number(swim.count || 0),
                                            'is-toggling': isTogglingSwimId() === swim.id
                                        }}
                                        onClick={() => !isTogglingSwimId() && adjustBootie(swim.id, 'toggle')}
                                        role="button"
                                        tabindex="0"
                                        onKeyDown={(event) => {
                                            if ((event.key === 'Enter' || event.key === ' ') && !isTogglingSwimId()) {
                                                event.preventDefault();
                                                adjustBootie(swim.id, 'toggle');
                                            }
                                        }}
                                    >
                                        <div class="item-details">
                                            <span class="item-title">{swim.message || '(No message)'}</span>
                                            <span class="item-subtitle">
                                                {swim.count} swim{swim.count === 1 ? '' : 's'} • {new Date(swim.created_at).toLocaleDateString()} by {swim.added_by_name}
                                            </span>
                                            <Show when={Number(swim.count || 0) > 1}>
                                                <div class="bootie-progress-row">
                                                    <div class="bootie-progress-track">
                                                        <div
                                                            class="bootie-progress-fill"
                                                            style={{ width: `${Math.min(100, Math.round(((Number(swim.bootie_count || 0) / Math.max(1, Number(swim.count || 0))) * 100)))}%` }}
                                                        />
                                                    </div>
                                                    <span class="bootie-progress-label">{Number(swim.bootie_count || 0)} / {swim.count} booties</span>
                                                </div>
                                            </Show>
                                        </div>
                                        <Show when={Number(swim.count || 0) > 1}>
                                            <div class="bootie-actions" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    class="secondary outline small-btn"
                                                    disabled={isTogglingSwimId() === swim.id || Number(swim.bootie_count || 0) <= 0}
                                                    onClick={() => adjustBootie(swim.id, 'remove', 1)}
                                                >
                                                    -1
                                                </button>
                                                <button
                                                    type="button"
                                                    class="secondary outline small-btn"
                                                    disabled={isTogglingSwimId() === swim.id || Number(swim.bootie_count || 0) >= Number(swim.count || 0)}
                                                    onClick={() => adjustBootie(swim.id, 'add', 1)}
                                                >
                                                    +1
                                                </button>
                                                <button
                                                    type="button"
                                                    class="primary small-btn"
                                                    disabled={isTogglingSwimId() === swim.id || Number(swim.bootie_count || 0) >= Number(swim.count || 0)}
                                                    onClick={() => adjustBootie(swim.id, 'set-all')}
                                                >
                                                    All
                                                </button>
                                            </div>
                                        </Show>
                                    </div>
                                )}
                            </For>
                        </Show>
                    </div>
                </Show>

                <div class="form-actions" classList={{ hidden: props.mode === 'bootie' }}>
                    <button type="button" class="secondary" onClick={props.onClose}>Cancel</button>
                    <button type="button" class="primary" onClick={submit} disabled={isSubmitting()}>
                        {isSubmitting() ? 'Saving...' : props.mode === 'swim' ? 'Log Swim' : 'Log Bootie'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
