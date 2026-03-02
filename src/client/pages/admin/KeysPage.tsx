import { createSignal, createResource, Show, For, createMemo } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { useAuth } from "@/stores/auth";
import Panel from "@/components/Panel";
import { FaSolidKey, FaSolidPlus, FaSolidTrash, FaSolidHouse, FaSolidClockRotateLeft, FaSolidMagnifyingGlass } from 'solid-icons/fa';
import Avatar from "@/components/Avatar";
import { showConfirmModal } from "@/utils/modal";

interface Key {
    id: number;
    holder_id: number | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    profile_picture_path: string | null;
}

interface KeyLog {
    id: number;
    key_id: number;
    event_type: 'create' | 'transfer' | 'delete';
    from_user_id: number | null;
    to_user_id: number | null;
    transferred_by_id: number;
    timestamp: string;
    from_first_name: string | null;
    from_last_name: string | null;
    to_first_name: string | null;
    to_last_name: string | null;
    by_first_name: string;
    by_last_name: string;
}

export default function KeysPage() {
    const { notify } = useNotifications();
    const { user: authUser } = useAuth();

    const canManage = createMemo(() => authUser()?.permissions.includes('keys.manage') || authUser()?.permissions.includes('site.admin'));

    const [keys, { refetch: refetchKeys }] = createResource<Key[]>(async () => await apiRequest('GET', '/api/keys'));
    const [logs, { refetch: refetchLogs }] = createResource<KeyLog[]>(async () => await apiRequest('GET', '/api/admin/keys/logs'));
    const [users] = createResource(async () => {
        const res = await apiRequest('GET', '/api/admin/users?limit=200');
        return res.users;
    });

    const [searchQuery, setSearchQuery] = createSignal("");
    const filteredUsers = createMemo(() => {
        const query = searchQuery().toLowerCase();
        if (!query) return [];
        const usersList = users();
        if (!usersList) return [];
        return usersList.filter((u: any) =>
            u.first_name.toLowerCase().includes(query) ||
            u.last_name.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query)
        ).slice(0, 5);
    });

    const [activeTransferKey, setActiveTransferKey] = createSignal<number | null>(null);
    const [selectedLogKeyId, setSelectedLogKeyId] = createSignal<number | null>(null);
    const [selectedLogUserId, setSelectedLogUserId] = createSignal<number | null>(null);
    const [selectedLogUserName, setSelectedLogUserName] = createSignal<string>('');

    const toggleKeyFilter = (keyId: number) => {
        setSelectedLogKeyId((prev) => (prev === keyId ? null : keyId));
    };

    const toggleUserFilter = (userId: number | null, userName: string) => {
        if (!userId) return;
        const currentlySelected = selectedLogUserId();
        const nextUserId = currentlySelected === userId ? null : userId;
        setSelectedLogUserId(nextUserId);
        setSelectedLogUserName(nextUserId ? userName : '');
    };

    const filteredLogs = createMemo(() => {
        const keyId = selectedLogKeyId();
        const userId = selectedLogUserId();
        const allLogs = logs() || [];
        return allLogs.filter((log) => {
            const keyMatch = !keyId || Number(log.key_id) === Number(keyId);
            const userMatch = !userId || [log.from_user_id, log.to_user_id, log.transferred_by_id].some((id) => Number(id) === Number(userId));
            return keyMatch && userMatch;
        });
    });

    const handleCreateKey = async () => {
        try {
            await apiRequest('POST', '/api/admin/keys', {});
            notify('Success', 'Key created.', 'success');
            refetchKeys();
            refetchLogs();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    const handleDeleteKey = async (id: number) => {
        if (await showConfirmModal('Delete Key?', 'This will retire the key from circulation.')) {
            try {
                await apiRequest('DELETE', `/api/admin/keys/${id}`);
                notify('Success', 'Key removed.', 'success');
                refetchKeys();
                refetchLogs();
            } catch (err: any) {
                notify('Error', err.message, 'error');
            }
        }
    };

    const handleTransfer = async (keyId: number, holderId: number | null) => {
        try {
            await apiRequest('POST', `/api/admin/keys/${keyId}/transfer`, { holderId });
            notify('Success', 'Key transferred.', 'success');
            setSearchQuery("");
            setActiveTransferKey(null);
            refetchKeys();
            refetchLogs();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    return (
        <div class="glass-layout keys-page">
            <div class="liquid-container glass-toolbar">
                <div class="toolbar-content">
                    <div class="toolbar-left">
                        <h3>Boatshed Keys</h3>
                    </div>
                    <div class="toolbar-right">
                        <Show when={canManage()}>
                            <button class="primary small-btn" onClick={handleCreateKey}>
                                <FaSolidPlus /> Create Key
                            </button>
                        </Show>
                    </div>
                </div>
            </div>

            <div class="keys-main-content">
                <div class="keys-inventory-section">
                    <Show when={!keys.loading && !users.loading} fallback={<div class="loading-cell text-centre" style="padding: 2rem;">Loading keys...</div>}>
                        <div class="keys-grid">
                            <For each={keys() || []}>
                                {(key) => (
                                    <Panel
                                        class="key-card glass-panel"
                                        title={
                                            <button
                                                type="button"
                                                class="key-title-btn"
                                                classList={{ active: selectedLogKeyId() === key.id }}
                                                onClick={() => toggleKeyFilter(key.id)}
                                                title={selectedLogKeyId() === key.id ? 'Clear key log filter' : 'Show logs for this key'}
                                            >
                                                Key #{key.id}
                                            </button>
                                        }
                                    >
                                        <div class="key-card-body">
                                            <div class="current-holder">
                                                <span class="label">Current Holder</span>
                                                <Show when={key.holder_id} fallback={
                                                    <div class="holder-info club">
                                                        <FaSolidHouse />
                                                        <span>Club Possession</span>
                                                    </div>
                                                }>
                                                    <div class="holder-info">
                                                        <Avatar user={key} classes="mini" />
                                                        <button
                                                            type="button"
                                                            class="person-filter-btn"
                                                            classList={{ active: selectedLogUserId() === key.holder_id }}
                                                            onClick={() => toggleUserFilter(key.holder_id, `${key.first_name} ${key.last_name}`)}
                                                        >
                                                            {key.first_name} {key.last_name}
                                                        </button>
                                                    </div>
                                                </Show>
                                            </div>

                                            <div class="key-actions">
                                                <Show when={activeTransferKey() === key.id} fallback={
                                                    <div class="action-buttons">
                                                        <Show when={canManage() || key.holder_id === authUser()?.id}>
                                                            <button class="small-btn primary" onClick={() => setActiveTransferKey(key.id)}>Transfer</button>
                                                            <Show when={key.holder_id !== null}>
                                                                <button class="small-btn secondary" onClick={() => handleTransfer(key.id, null)}>Return to Club</button>
                                                            </Show>
                                                        </Show>
                                                        <Show when={canManage()}>
                                                            <button class="small-btn icon-only delete" onClick={() => handleDeleteKey(key.id)}><FaSolidTrash /></button>
                                                        </Show>
                                                    </div>
                                                }>
                                                    <div class="transfer-input-group">
                                                        <div class="search-input-wrapper">
                                                            <span class="search-icon"><FaSolidMagnifyingGlass /></span>
                                                            <input
                                                                type="text"
                                                                placeholder="Search member..."
                                                                onInput={(e) => setSearchQuery(e.currentTarget.value)}
                                                                autofocus
                                                            />
                                                            <button class="cancel-link" onClick={() => setActiveTransferKey(null)}>Cancel</button>
                                                        </div>

                                                        <div class="autocomplete-results">
                                                            <For each={filteredUsers()}>
                                                                {(user) => (
                                                                    <div class="result-item" onClick={() => handleTransfer(key.id, user.id)}>
                                                                        <Avatar user={user} classes="mini" />
                                                                        <span>{user.first_name} {user.last_name}</span>
                                                                    </div>
                                                                )}
                                                            </For>
                                                            <Show when={searchQuery().length > 0 && filteredUsers().length === 0}>
                                                                <div class="no-results">No members found</div>
                                                            </Show>
                                                        </div>
                                                    </div>
                                                </Show>
                                            </div>
                                        </div>
                                    </Panel>
                                )}
                            </For>
                            <Show when={(keys() || []).length === 0}>
                                <div class="empty-state">
                                    <FaSolidKey />
                                    <p>No keys in inventory.</p>
                                </div>
                            </Show>
                        </div>
                    </Show>
                </div>

                <div class="keys-history-section">
                    <Panel title="Transfer History" icon={FaSolidClockRotateLeft} class="glass-panel">
                        <Show when={selectedLogKeyId() || selectedLogUserId()}>
                            <div class="logs-filter-bar">
                                <div class="active-filter-list">
                                    <Show when={selectedLogKeyId()}>
                                        <button type="button" class="small-btn secondary outline" onClick={() => setSelectedLogKeyId(null)}>
                                            Key #{selectedLogKeyId()} ✕
                                        </button>
                                    </Show>
                                    <Show when={selectedLogUserId()}>
                                        <button type="button" class="small-btn secondary outline" onClick={() => { setSelectedLogUserId(null); setSelectedLogUserName(''); }}>
                                            {selectedLogUserName() || `User #${selectedLogUserId()}`} ✕
                                        </button>
                                    </Show>
                                </div>
                                <button
                                    type="button"
                                    class="small-btn secondary outline"
                                    onClick={() => { setSelectedLogKeyId(null); setSelectedLogUserId(null); setSelectedLogUserName(''); }}
                                >
                                    Clear All
                                </button>
                            </div>
                        </Show>
                        <div class="logs-container">
                            <table class="glass-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Key</th>
                                        <th>From</th>
                                        <th>To</th>
                                        <th>By</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <For each={filteredLogs()}>
                                        {(log) => (
                                            <tr>
                                                <td class="small-text">{new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        class="key-num-filter-btn"
                                                        classList={{ active: selectedLogKeyId() === log.key_id }}
                                                        onClick={() => toggleKeyFilter(log.key_id)}
                                                    >
                                                        #{log.key_id}
                                                    </button>
                                                </td>
                                                <td>
                                                    <Show when={log.from_user_id} fallback={<span class="muted-text">Club</span>}>
                                                        <button
                                                            type="button"
                                                            class="person-filter-btn"
                                                            classList={{ active: selectedLogUserId() === log.from_user_id }}
                                                            onClick={() => toggleUserFilter(log.from_user_id, `${log.from_first_name} ${log.from_last_name}`)}
                                                        >
                                                            {log.from_first_name} {log.from_last_name}
                                                        </button>
                                                    </Show>
                                                </td>
                                                <td>
                                                    <Show when={log.to_user_id} fallback={<span class="muted-text">Club</span>}>
                                                        <button
                                                            type="button"
                                                            class="person-filter-btn"
                                                            classList={{ active: selectedLogUserId() === log.to_user_id }}
                                                            onClick={() => toggleUserFilter(log.to_user_id, `${log.to_first_name} ${log.to_last_name}`)}
                                                        >
                                                            {log.to_first_name} {log.to_last_name}
                                                        </button>
                                                    </Show>
                                                </td>
                                                <td class="small-text">
                                                    <button
                                                        type="button"
                                                        class="person-filter-btn"
                                                        classList={{ active: selectedLogUserId() === log.transferred_by_id }}
                                                        onClick={() => toggleUserFilter(log.transferred_by_id, `${log.by_first_name} ${log.by_last_name}`)}
                                                    >
                                                        {log.by_first_name} {log.by_last_name}
                                                    </button>
                                                </td>
                                                <td>
                                                    <Show when={log.event_type === 'create'}>
                                                        <span class="status-tag success">Created</span>
                                                    </Show>
                                                    <Show when={log.event_type === 'transfer'}>
                                                        <span class="status-tag primary">Transferred</span>
                                                    </Show>
                                                    <Show when={log.event_type === 'delete'}>
                                                        <span class="status-tag danger">Retired</span>
                                                    </Show>
                                                </td>
                                            </tr>
                                        )}
                                    </For>
                                    <Show when={filteredLogs().length === 0}>
                                        <tr><td colspan="6" class="empty-cell">No transfer history.</td></tr>
                                    </Show>
                                </tbody>
                            </table>
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    );
}
