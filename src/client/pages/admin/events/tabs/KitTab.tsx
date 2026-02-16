// todo clean up
import { createSignal, createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { FaSolidCircleCheck } from 'solid-icons/fa';
import { MdFillKayaking } from "solid-icons/md";
import Panel from "@/components/Panel";

interface KitVariant {
  id: number;
  name: string;
  total_quantity: number;
}

interface KitItem {
  id: number;
  name: string;
  type: string;
  variants: KitVariant[];
}

interface KitRequest {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  item_name: string;
  item_type: string;
  kit_item_id: number;
  kit_variant_id: number | null;
  variant_name: string | null;
  is_fulfilled: boolean;
}

export default function KitTab(props: { eventId: number }) {
  const { notify } = useNotifications();

  const [requests, { refetch: refetchRequests }] = createResource(async () => {
    const res = await apiRequest('GET', `/api/kit/event/${props.eventId}`);
    return (res || []) as KitRequest[];
  });

  const [inventory] = createResource(async () => {
    const res = await apiRequest('GET', '/api/kit');
    return (res || []) as KitItem[];
  });

  const toggleFulfillment = async (id: number) => {
    try {
      await apiRequest('POST', `/api/kit/request/${id}/fulfill`);
      notify('Success', 'Status updated', 'success');
      refetchRequests();
    } catch (e: any) {
      notify('Error', e.message, 'error');
    }
  };

  const summary = () => {
    const reqs = requests();
    const inv = inventory();
    if (!reqs || !inv) return [];

    const stats: any[] = [];

    inv.forEach(item => {
      item.variants.forEach(variant => {
        const requested = reqs.filter(r => r.kit_item_id === item.id && r.kit_variant_id === variant.id).length;
        stats.push({
          itemId: item.id,
          itemName: item.name,
          variantId: variant.id,
          variantName: variant.name,
          requested,
          available: variant.total_quantity
        });
      });

      // Count "Not Sure" (requests for this item where NO variant is selected)
      const notSure = reqs.filter(r => r.kit_item_id === item.id && r.kit_variant_id === null).length;
      if (notSure > 0) {
        stats.push({
          itemId: item.id,
          itemName: item.name,
          variantId: null,
          variantName: 'Not Sure',
          requested: notSure,
          available: -1 // Indeterminate
        });
      }
    });

    return stats.filter(s => s.requested > 0);
  };

  const getStatusColor = (requested: number, available: number) => {
    if (available === -1) return 'neutral';
    if (requested > available) return 'error';
    if (requested === available) return 'warning';
    if (requested >= available * 0.8) return 'warning';
    return 'success';
  };

  return (
    <div class="kit-admin-tab flex-column gap-6">
      <Panel title="Inventory Summary" icon={MdFillKayaking}>
        <div class="glass-table-container">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Variant</th>
                <th>Requested</th>
                <th>Available</th>
                <th class="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              <For each={summary()}>
                {stat => (
                  <tr>
                    <td>{stat.itemName}</td>
                    <td>{stat.variantName}</td>
                    <td>{stat.requested}</td>
                    <td>{stat.available === -1 ? '?' : stat.available}</td>
                    <td class="text-right">
                      <span class={`badge ${getStatusColor(stat.requested, stat.available)}`}>
                        {stat.available === -1 ? 'Check Manual' :
                          stat.requested > stat.available ? 'Over Limit' :
                            stat.requested === stat.available ? 'Full' :
                              stat.requested >= stat.available * 0.8 ? 'Near Limit' : 'OK'}
                      </span>
                    </td>
                  </tr>
                )}
              </For>
              <Show when={summary().length === 0}>
                <tr>
                  <td colspan="5" class="text-center py-4 text-muted">No kit items requested for this event.</td>
                </tr>
              </Show>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Detailed Requests" icon={MdFillKayaking}>
        <div class="glass-table-container">
          <table class="glass-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Item</th>
                <th>Variant</th>
                <th>Status</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <For each={requests()}>
                {req => (
                  <tr>
                    <td>{req.first_name} {req.last_name}</td>
                    <td>{req.item_name}</td>
                    <td><span class="badge neutral">{req.variant_name || 'Not Sure'}</span></td>
                    <td>
                      <span class={`badge ${req.is_fulfilled ? 'success' : 'warning'}`}>
                        {req.is_fulfilled ? 'Fulfilled' : 'Pending'}
                      </span>
                    </td>
                    <td class="text-right">
                      <button
                        class={`icon-btn ${req.is_fulfilled ? 'secondary' : 'success'}`}
                        onClick={() => toggleFulfillment(req.id)}
                        title={req.is_fulfilled ? 'Mark as Pending' : 'Mark as Fulfilled'}
                      >
                        <FaSolidCircleCheck />
                      </button>
                    </td>
                  </tr>
                )}
              </For>
              <Show when={(requests() || []).length === 0}>
                <tr>
                  <td colspan="5" class="text-center py-4 text-muted">No individual kit requests found.</td>
                </tr>
              </Show>
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
