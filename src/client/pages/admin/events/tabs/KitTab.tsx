// todo clean up
import { createSignal, createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { CHECK_CIRCLE_SVG } from '@/utils/icons';

interface KitRequest {
    id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    item_name: string;
    item_type: string;
    item_size: string;
    is_fulfilled: boolean;
}

export default function KitTab(props: { eventId: number }) {
    const { notify } = useNotifications();

    const [requests, { refetch }] = createResource(async () => {
        const res = await apiRequest('GET', `/api/kit/event/${props.eventId}`);
        return (res || []) as KitRequest[];
    });

    const toggleFulfillment = async (id: number) => {
        try {
            await apiRequest('POST', `/api/kit/request/${id}/fulfill`);
            notify('Success', 'Status updated', 'success');
            refetch();
        } catch (e: any) {
            notify('Error', e.message, 'error');
        }
    };

    // Group by user or item? Group by Type is good for checking inventory.
    // Let's just list for now.

    return (
        <div class="kit-admin-tab">
            <h3>Kit Requests</h3>
            <div class="glass-table-container">
                <table class="glass-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Item</th>
                            <th>Type</th>
                            <th>Size</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <For each={requests()}>
                            {req => (
                                <tr>
                                    <td>{req.first_name} {req.last_name}</td>
                                    <td>{req.item_name}</td>
                                    <td><span class="badge neutral">{req.item_type}</span></td>
                                    <td>{req.item_size}</td>
                                    <td>
                                        <span class={`badge ${req.is_fulfilled ? 'success' : 'warning'}`}>
                                            {req.is_fulfilled ? 'Fulfilled' : 'Pending'}
                                        </span>
                                    </td>
                                    <td>
                                        <button 
                                            class={`icon-btn ${req.is_fulfilled ? 'secondary' : 'success'}`} 
                                            onClick={() => toggleFulfillment(req.id)}
                                            title={req.is_fulfilled ? 'Mark as Pending' : 'Mark as Fulfilled'}
                                            innerHTML={CHECK_CIRCLE_SVG}
                                        />
                                    </td>
                                </tr>
                            )}
                        </For>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
