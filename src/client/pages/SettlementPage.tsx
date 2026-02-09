// todo clean up
import { createSignal, createResource, For, Show } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { CURRENCY_POUND_SVG, TRIP_SVG, WALLET_SVG, CLOSE_SVG } from '@/utils/icons';

export default function SettlementPage() {
    const params = useParams();
    const navigate = useNavigate();
    const eventId = () => params.id;

    const [data] = createResource(eventId, async (id) => {
        const [eventRes, settlementRes] = await Promise.all([
            apiRequest('GET', `/api/event/${id}`),
            apiRequest('GET', `/api/events/${id}/settlement`)
        ]);
        return { event: eventRes.event, summary: settlementRes.data };
    });

    const handleBackdropClick = (e: MouseEvent) => {
        if (e.target === e.currentTarget) {
            navigate(-1);
        }
    };

    return (
        <div id="settlement-view" class="view c-modal-overlay visible" onClick={handleBackdropClick}>
            <div class="c-modal-content modal-lg">
                <button class="c-modal-close-btn" onClick={() => navigate(-1)} innerHTML={CLOSE_SVG} />
                <div class="c-modal-body">
                    <Show when={data()} fallback={<p>Loading settlement...</p>}>
                        {(res) => (
                            <>
                                <h1>{CURRENCY_POUND_SVG} Financial Settlement: {res().event.title}</h1>
                                
                                <div class="liquid-container p-4 mb-4">
                                    <h3>Summary</h3>
                                    <p>Total Expenses: £{res().summary?.total_expenses?.toFixed(2) || '0.00'}</p>
                                </div>

                                <div class="liquid-container table-responsive" style={{ "--liquid-padding": "0" }}>
                                    <table class="glass-table">
                                        <thead>
                                            <tr>
                                                <th>Member</th>
                                                <th>Net Change</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <For each={res().summary?.breakdown || []}>
                                                {(row: any) => (
                                                    <tr>
                                                        <td>{row.name}</td>
                                                        <td class={row.net >= 0 ? 'text-success' : 'text-error'}>
                                                            £{row.net.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                )}
                                            </For>
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </Show>
                </div>
            </div>
        </div>
    );
}
