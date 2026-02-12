import { createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useSearchParams } from "@solidjs/router";
import PageTitle from "@/components/PageTitle";

export default function ShareWeekPage() {
    const [searchParams] = useSearchParams();
    const date = () => searchParams.date ? new Date(searchParams.date as string) : new Date();

    const [logo] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/globals/ClubLogo');
            return res.res?.ClubLogo?.data || "/api/files/1/download?view=true";
        } catch {
            return "/api/files/1/download?view=true";
        }
    });

    const [events] = createResource(date, async (d) => {
        const res = await apiRequest('GET', `/api/admin/events?showPast=true&limit=100`);
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
        startOfWeek.setHours(0,0,0,0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);

        return (res.events || []).filter((e: any) => {
            const s = new Date(e.start);
            return s >= startOfWeek && s <= endOfWeek && e.status !== 'pending';
        });
    });

    return (
        <div id="share-week-view" class="view">
            <PageTitle text="Share Week" centered={true} />
            <div class="share-container glass-effect mt-6" id="capture-area">
                <header class="share-header">
                    <img src={logo() || "/api/files/1/download?view=true"} alt="DUCC Logo" class="share-logo" />
                    <div class="header-text">
                        <h1>What's On This Week</h1>
                        <p>{date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
                    </div>
                </header>

                <div class="share-events-list">
                    <For each={events()} fallback={<p>No events published this week.</p>}>
                        {(event: any) => (
                            <div class="share-event-item">
                                <div class="event-date">
                                    <span class="day">{new Date(event.start).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                                    <span class="num">{new Date(event.start).getDate()}</span>
                                </div>
                                <div class="event-details">
                                    <h3>{event.title}</h3>
                                    <p>{event.location} • {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        )}
                    </For>
                </div>

                <footer class="share-footer">
                    <p>Signup at ducc.org.uk</p>
                </footer>
            </div>

            <div class="share-controls no-print">
                <button class="primary" onClick={() => window.print()}>Download / Save as PDF</button>
                <p class="muted-text mt-4">Tip: Use your browser's "Save as PDF" or take a screenshot of the area above.</p>
            </div>

            <style>{`
                #share-week-view {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 2rem;
                    background: #0f172a;
                    min-height: 100vh;
                }
                .share-container {
                    width: 500px;
                    padding: 3rem;
                    border-radius: 32px;
                    color: white;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                }
                .share-header {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 1.5rem;
                }
                .share-logo {
                    width: 80px;
                    height: 80px;
                }
                .header-text h1 {
                    margin: 0;
                    font-size: 1.75rem;
                    background: linear-gradient(135deg, #d47de4, #8e44ad);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .header-text p {
                    margin: 0;
                    opacity: 0.6;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-weight: 700;
                }
                .share-events-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .share-event-item {
                    display: flex;
                    gap: 1.5rem;
                    align-items: center;
                }
                .event-date {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    background: rgba(255,255,255,0.1);
                    padding: 0.5rem;
                    border-radius: 12px;
                    min-width: 60px;
                }
                .event-date .day {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    font-weight: 800;
                    color: #d47de4;
                }
                .event-date .num {
                    font-size: 1.5rem;
                    font-weight: 900;
                }
                .event-details h3 {
                    margin: 0;
                    font-size: 1.25rem;
                }
                .event-details p {
                    margin: 0;
                    opacity: 0.7;
                    font-size: 0.9rem;
                }
                .share-footer {
                    margin-top: auto;
                    text-align: center;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    padding-top: 1.5rem;
                }
                .share-footer p {
                    font-weight: 700;
                    color: #d47de4;
                }
                .share-controls {
                    margin-top: 2rem;
                    text-align: center;
                }
                @media print {
                    .no-print { display: none; }
                    body { background: white; }
                    #share-week-view { padding: 0; }
                    .share-container { box-shadow: none; border: 1px solid #eee; }
                }
            `}</style>
        </div>
    );
}
