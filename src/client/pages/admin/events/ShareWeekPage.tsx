import { createEffect, createMemo, createResource, createSignal, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useSearchParams } from "@solidjs/router";
import PageTitle from "@/components/PageTitle";
import { useNotifications } from "@/stores/notifications";

export default function ShareWeekPage() {
    const { notify } = useNotifications();
    const [searchParams] = useSearchParams();
    const date = () => searchParams.date ? new Date(searchParams.date as string) : new Date();
    const [panelWidth, setPanelWidth] = createSignal(750);
    const [panelHeight, setPanelHeight] = createSignal(745);
    const [theme, setTheme] = createSignal<'dark' | 'light'>('dark');
    const [headerTitle, setHeaderTitle] = createSignal("What's On This Week");
    const [monthYearLabel, setMonthYearLabel] = createSignal('');
    const [signupTitle, setSignupTitle] = createSignal('Signup at');
    const [signupLink, setSignupLink] = createSignal('durhamunicanoe.co.uk');
    const [isCustomizerOpen, setIsCustomizerOpen] = createSignal(false);
    const [eventTitleOverrides, setEventTitleOverrides] = createSignal<Record<number, string>>({});
    const [hiddenEventIds, setHiddenEventIds] = createSignal<number[]>([]);
    const [customEvents, setCustomEvents] = createSignal<any[]>([]);
    const [nextCustomEventId, setNextCustomEventId] = createSignal(1_000_000);
    const [isAutoHeightMode, setIsAutoHeightMode] = createSignal(false);
    const [darkPanelBg, setDarkPanelBg] = createSignal('#0f172a');
    const [darkOuterBg, setDarkOuterBg] = createSignal('#0f172a');
    const [darkTitleColor, setDarkTitleColor] = createSignal('#f0c8ff');
    const [darkTimeColor, setDarkTimeColor] = createSignal('#d47de4');
    const [lightPanelBg, setLightPanelBg] = createSignal('#f8fafc');
    const [lightOuterBg, setLightOuterBg] = createSignal('#f3f4f6');
    const [lightTitleColor, setLightTitleColor] = createSignal('#5b21b6');
    const [lightTimeColor, setLightTimeColor] = createSignal('#7e22ce');
    const [centerWatermarkUrl, setCenterWatermarkUrl] = createSignal('/images/misc/share-week-watermark.png');
    const [centerWatermarkOpacity, setCenterWatermarkOpacity] = createSignal(0.12);
    const [centerWatermarkEnabled, setCenterWatermarkEnabled] = createSignal(true);
    const [lightFooterBgTint, setLightFooterBgTint] = createSignal('#e8f1ff');
    const [lightFooterBorderColor, setLightFooterBorderColor] = createSignal('#93c5fd');
    const [lightFooterTitleColor, setLightFooterTitleColor] = createSignal('#1e3a8a');
    const [lightFooterLinkColor, setLightFooterLinkColor] = createSignal('#1d4ed8');
    const [exportScale, setExportScale] = createSignal<1 | 2>(1);
    const exportPaddingX = 16;
    const exportPaddingTop = 10;
    const exportPaddingBottom = 24;
    const effectiveExportPaddingBottom = () => isAutoHeightMode() ? 2 : exportPaddingBottom;

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
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return (res.events || []).filter((e: any) => {
            const s = new Date(e.start);
            return s >= startOfWeek && s <= endOfWeek && e.status !== 'pending';
        }).sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());
    });

    const [savedThemeConfig] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/globals/ShareWeekThemeConfig');
            return res.res?.ShareWeekThemeConfig?.data || '';
        } catch {
            return '';
        }
    });

    const editableEvents = createMemo(() => {
        const merged = [...(events() || []), ...customEvents()];
        return merged.sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());
    });

    const visibleEvents = createMemo(() => {
        const hidden = new Set(hiddenEventIds());
        const overrides = eventTitleOverrides();

        return editableEvents()
            .filter((event: any) => !hidden.has(event.id))
            .map((event: any) => ({
                ...event,
                title: (overrides[event.id] || event.title || '').trim() || event.title
            }));
    });

    const groupedEvents = createMemo(() => {
        const groups = new Map<string, { key: string; weekday: string; dateText: string; events: any[] }>();

        for (const event of visibleEvents() || []) {
            const start = new Date(event.start);
            const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    weekday: start.toLocaleDateString('en-GB', { weekday: 'long' }),
                    dateText: start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                    events: []
                });
            }

            groups.get(key)!.events.push(event);
        }

        return Array.from(groups.values());
    });

    const eventCount = createMemo(() => (visibleEvents() || []).length);
    const densityScale = createMemo(() => {
        const count = eventCount();
        if (count <= 8) return 1;
        if (count <= 11) return 0.93;
        if (count <= 14) return 0.87;
        return 0.8;
    });

    const handleDownloadJpg = async () => {
        const panel = document.getElementById('capture-area') as HTMLDivElement | null;
        if (!panel) return;

        const centerWatermarkImage = panel.querySelector('.share-center-watermark') as HTMLImageElement | null;
        const previousWatermarkDisplay = centerWatermarkImage?.style.display;
        const previousPanelBoxShadow = panel.style.boxShadow;

        try {
            panel.style.boxShadow = 'none';
            if (centerWatermarkImage) {
                centerWatermarkImage.style.display = 'none';
            }

            const docFonts = (document as any).fonts;
            if (docFonts?.ready) {
                await docFonts.ready;
            }

            const logoImage = panel.querySelector('.share-logo') as HTMLImageElement | null;
            if (logoImage && 'decode' in logoImage) {
                try { await logoImage.decode(); } catch { }
            }

            const rect = panel.getBoundingClientRect();
            const captureWidth = Math.ceil(rect.width);
            const captureHeight = Math.ceil(rect.height);
            const { default: html2canvas } = await import('html2canvas');
            const panelCanvas = await html2canvas(panel, {
                scale: exportScale(),
                useCORS: true,
                backgroundColor: theme() === 'dark' ? darkPanelBg() : lightPanelBg(),
                width: captureWidth,
                height: captureHeight
            });

            const shadowBlur = 42 * exportScale();
            const shadowOffsetX = 0;
            const shadowOffsetY = 14 * exportScale();
            const shadowReachX = shadowBlur + Math.abs(shadowOffsetX);
            const shadowReachY = shadowBlur + Math.abs(shadowOffsetY);
            const framePadX = Math.ceil(shadowReachX);
            const framePadY = Math.ceil(shadowReachY);
            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = panelCanvas.width + (framePadX * 2);
            outputCanvas.height = panelCanvas.height + (framePadY * 2);

            const opaquePanelCanvas = document.createElement('canvas');
            opaquePanelCanvas.width = panelCanvas.width;
            opaquePanelCanvas.height = panelCanvas.height;
            const opaquePanelContext = opaquePanelCanvas.getContext('2d');
            if (!opaquePanelContext) return;

            opaquePanelContext.fillStyle = theme() === 'dark' ? darkPanelBg() : lightPanelBg();
            opaquePanelContext.fillRect(0, 0, opaquePanelCanvas.width, opaquePanelCanvas.height);
            opaquePanelContext.drawImage(panelCanvas, 0, 0);

            const outputContext = outputCanvas.getContext('2d');
            if (!outputContext) return;

            outputContext.fillStyle = theme() === 'dark' ? darkOuterBg() : lightOuterBg();
            outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

            const imageX = Math.round((outputCanvas.width - panelCanvas.width) / 2);
            const imageY = Math.round((outputCanvas.height - panelCanvas.height) / 2);

            outputContext.save();
            outputContext.shadowColor = theme() === 'dark' ? 'rgba(0, 0, 0, 0.55)' : 'rgba(15, 23, 42, 0.3)';
            outputContext.shadowBlur = shadowBlur;
            outputContext.shadowOffsetX = shadowOffsetX;
            outputContext.shadowOffsetY = shadowOffsetY;
            outputContext.fillStyle = theme() === 'dark' ? darkPanelBg() : lightPanelBg();
            outputContext.fillRect(imageX, imageY, opaquePanelCanvas.width, opaquePanelCanvas.height);
            outputContext.restore();

            outputContext.drawImage(opaquePanelCanvas, imageX, imageY);

            const link = document.createElement('a');
            const stamp = date().toISOString().slice(0, 10);
            link.download = `ducc-share-week-${stamp}.jpg`;
            link.href = outputCanvas.toDataURL('image/jpeg', 0.95);
            link.click();
        } catch (error) {
            console.error('Failed to export share panel as JPG', error);
        } finally {
            panel.style.boxShadow = previousPanelBoxShadow;
            if (centerWatermarkImage) {
                centerWatermarkImage.style.display = previousWatermarkDisplay ?? '';
            }
        }
    };

    const formatTime = (value: string | Date) => new Date(value).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const weekLabel = createMemo(() => {
        return monthYearLabel().trim() || date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    });

    const updateEventTitle = (eventId: number, title: string) => {
        setEventTitleOverrides(prev => ({ ...prev, [eventId]: title }));
    };

    const toggleEventVisibility = (eventId: number, visible: boolean) => {
        setHiddenEventIds(prev => {
            const next = new Set(prev);
            if (visible) next.delete(eventId);
            else next.add(eventId);
            return Array.from(next);
        });
    };

    const resetCustomizations = () => {
        setPanelWidth(750);
        setPanelHeight(745);
        setIsAutoHeightMode(false);
        setTheme('dark');
        setDarkPanelBg('#0f172a');
        setDarkOuterBg('#0f172a');
        setDarkTitleColor('#f0c8ff');
        setDarkTimeColor('#d47de4');
        setLightPanelBg('#f8fafc');
        setLightOuterBg('#f3f4f6');
        setLightTitleColor('#5b21b6');
        setLightTimeColor('#7e22ce');
        setCenterWatermarkUrl('/images/misc/share-week-watermark.png');
        setCenterWatermarkOpacity(0.12);
        setCenterWatermarkEnabled(true);
        setHeaderTitle("What's On This Week");
        setMonthYearLabel('');
        setSignupTitle('Signup at');
        setSignupLink('durhamunicanoe.co.uk');
        setExportScale(1);
        setLightFooterBgTint('#e8f1ff');
        setLightFooterBorderColor('#93c5fd');
        setLightFooterTitleColor('#1e3a8a');
        setLightFooterLinkColor('#1d4ed8');
        setEventTitleOverrides({});
        setHiddenEventIds([]);
        setCustomEvents([]);
        setNextCustomEventId(1_000_000);
    };

    const handleSaveThemeConfig = async () => {
        const payload = {
            dark: {
                panelBg: darkPanelBg(),
                outerBg: darkOuterBg(),
                titleColor: darkTitleColor(),
                timeColor: darkTimeColor(),
            },
            light: {
                panelBg: lightPanelBg(),
                outerBg: lightOuterBg(),
                titleColor: lightTitleColor(),
                timeColor: lightTimeColor(),
                footerBgTint: lightFooterBgTint(),
                footerBorderColor: lightFooterBorderColor(),
                footerTitleColor: lightFooterTitleColor(),
                footerLinkColor: lightFooterLinkColor(),
            },
            common: {
                watermarkUrl: centerWatermarkUrl(),
                watermarkOpacity: centerWatermarkOpacity(),
                watermarkEnabled: centerWatermarkEnabled(),
            },
        };

        try {
            await apiRequest('POST', '/api/globals/ShareWeekThemeConfig', { value: JSON.stringify(payload) });
            notify('Saved', 'Share theme colors saved.', 'success');
        } catch (error: any) {
            notify('Error', error?.message || 'Failed to save theme colors.', 'error');
        }
    };

    const toDateTimeLocalValue = (value: Date) => {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        const hours = String(value.getHours()).padStart(2, '0');
        const minutes = String(value.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const addCustomEvent = () => {
        const targetDate = date();
        const startOfWeek = new Date(targetDate);
        startOfWeek.setDate(targetDate.getDate() - (targetDate.getDay() === 0 ? 6 : targetDate.getDay() - 1));
        startOfWeek.setHours(18, 0, 0, 0);

        const endOfWeekEvent = new Date(startOfWeek);
        endOfWeekEvent.setHours(19, 0, 0, 0);

        const customEventId = nextCustomEventId();
        setNextCustomEventId(customEventId + 1);

        setCustomEvents(prev => [
            ...prev,
            {
                id: customEventId,
                title: 'New Event',
                start: toDateTimeLocalValue(startOfWeek),
                end: toDateTimeLocalValue(endOfWeekEvent),
                isCustom: true,
                status: 'confirmed'
            }
        ]);
    };

    const updateCustomEvent = (eventId: number, updates: Partial<{ title: string; start: string; end: string }>) => {
        setCustomEvents(prev => prev.map(event => event.id === eventId ? { ...event, ...updates } : event));
        if (updates.title !== undefined) {
            setEventTitleOverrides(prev => ({ ...prev, [eventId]: updates.title || '' }));
        }
    };

    const removeCustomEvent = (eventId: number) => {
        setCustomEvents(prev => prev.filter(event => event.id !== eventId));
        setHiddenEventIds(prev => prev.filter(id => id !== eventId));
        setEventTitleOverrides(prev => {
            const next = { ...prev };
            delete next[eventId];
            return next;
        });
    };

    const autoSetBestHeight = () => {
        const panel = document.getElementById('capture-area') as HTMLDivElement | null;
        if (!panel) return;
        setIsAutoHeightMode(true);

        const previousHeight = panel.style.height;
        panel.style.height = 'auto';
        const measured = Math.ceil(panel.getBoundingClientRect().height);
        panel.style.height = previousHeight;

        if (measured > 0) {
            setPanelHeight(measured);
        }
    };

    createEffect(() => {
        const loadedEvents = editableEvents() || [];
        if (!loadedEvents.length) return;

        const validIds = new Set(loadedEvents.map((event: any) => event.id));
        setHiddenEventIds(prev => prev.filter(id => validIds.has(id)));
    });

    createEffect(() => {
        const rawConfig = savedThemeConfig();
        if (!rawConfig) return;

        try {
            const parsed = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
            if (parsed?.dark?.panelBg) setDarkPanelBg(parsed.dark.panelBg);
            if (parsed?.dark?.outerBg) setDarkOuterBg(parsed.dark.outerBg);
            if (parsed?.dark?.titleColor) setDarkTitleColor(parsed.dark.titleColor);
            if (parsed?.dark?.timeColor) setDarkTimeColor(parsed.dark.timeColor);

            if (parsed?.light?.panelBg) setLightPanelBg(parsed.light.panelBg);
            if (parsed?.light?.outerBg) setLightOuterBg(parsed.light.outerBg);
            if (parsed?.light?.titleColor) setLightTitleColor(parsed.light.titleColor);
            if (parsed?.light?.timeColor) setLightTimeColor(parsed.light.timeColor);

            if (parsed?.light?.footerBgTint) setLightFooterBgTint(parsed.light.footerBgTint);
            if (parsed?.light?.footerBorderColor) setLightFooterBorderColor(parsed.light.footerBorderColor);
            if (parsed?.light?.footerTitleColor) setLightFooterTitleColor(parsed.light.footerTitleColor);
            if (parsed?.light?.footerLinkColor) setLightFooterLinkColor(parsed.light.footerLinkColor);

            if (parsed?.common?.watermarkUrl !== undefined) setCenterWatermarkUrl(parsed.common.watermarkUrl || '');
            if (parsed?.common?.watermarkOpacity !== undefined) {
                const parsedOpacity = Number(parsed.common.watermarkOpacity);
                if (!Number.isNaN(parsedOpacity)) {
                    setCenterWatermarkOpacity(Math.max(0, Math.min(1, parsedOpacity)));
                }
            }
            if (parsed?.common?.watermarkEnabled !== undefined) {
                setCenterWatermarkEnabled(!!parsed.common.watermarkEnabled);
            }
        } catch {
        }
    });

    return (
        <div id="share-week-view" class="view">
            <PageTitle text="Share Week" centered={true} />
            <div
                id="capture-export-area"
                class={`capture-export-area theme-${theme()}`}
                style={{
                    "--custom-dark-outer-bg": darkOuterBg(),
                    "--custom-light-outer-bg": lightOuterBg(),
                    padding: `${exportPaddingTop}px ${exportPaddingX}px ${effectiveExportPaddingBottom()}px`
                }}
            >
                <div
                    class={`share-container theme-${theme()} ${isAutoHeightMode() ? 'auto-height-active' : ''}`}
                    id="capture-area"
                    style={{
                        "--share-density": String(densityScale()),
                        "--custom-dark-panel-bg": darkPanelBg(),
                        "--custom-dark-title": darkTitleColor(),
                        "--custom-dark-time": darkTimeColor(),
                        "--custom-light-panel-bg": lightPanelBg(),
                        "--custom-light-title": lightTitleColor(),
                        "--custom-light-time": lightTimeColor(),
                        "--custom-light-footer-bg": lightFooterBgTint(),
                        "--custom-light-footer-border": lightFooterBorderColor(),
                        "--custom-light-footer-title": lightFooterTitleColor(),
                        "--custom-light-footer-link": lightFooterLinkColor(),
                        "--custom-watermark-opacity": String(centerWatermarkOpacity()),
                        width: `${panelWidth()}px`,
                        height: `${panelHeight()}px`
                    }}
                >
                    <Show when={centerWatermarkEnabled() && !!centerWatermarkUrl().trim()}>
                        <img src={centerWatermarkUrl()} alt="Share watermark" class="share-center-watermark" />
                    </Show>
                    <header class="share-header">
                        <img src={logo() || "/api/files/1/download?view=true"} alt="DUCC Logo" class="share-logo" />
                        <div class="header-text">
                            <h1>{headerTitle()}</h1>
                            <p>{weekLabel()}</p>
                        </div>
                    </header>

                    <div class="share-events-list">
                        <For each={groupedEvents()} fallback={<p>No events published this week.</p>}>
                            {(group) => (
                                <div class="share-event-item share-day-item">
                                    <div class="day-heading">
                                        <span class="day-weekday">{group.weekday}</span>
                                        <span class="day-date">{group.dateText}</span>
                                    </div>
                                    <div class="day-events-column">
                                        <For each={group.events}>
                                            {(event: any) => (
                                                <div class="event-details">
                                                    <p class="event-time">{formatTime(event.start)} - {formatTime(event.end)}</p>
                                                    <h3>{event.title}</h3>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>

                    <footer class="share-footer">
                        <p class="signup-title">{signupTitle()}</p>
                        <p class="signup-link">{signupLink()}</p>
                    </footer>
                </div>
            </div>

            <div class="share-controls no-print">
                <button class="secondary" onClick={() => setIsCustomizerOpen(true)}>Customize</button>
                <label class="export-scale-control">
                    <span>Export</span>
                    <select
                        value={String(exportScale())}
                        onChange={(event) => setExportScale(event.currentTarget.value === '2' ? 2 : 1)}
                    >
                        <option value="1">Exact (1x)</option>
                        <option value="2">High-res (2x)</option>
                    </select>
                </label>
                <button class="primary" onClick={handleDownloadJpg}>Download JPG</button>
                <p class="muted-text">Exports only the share panel above ({Math.round(panelWidth() * exportScale())} × {Math.round(panelHeight() * exportScale())}).</p>
            </div>

            <Show when={isCustomizerOpen()}>
                <div class="share-customizer-backdrop no-print" onClick={() => setIsCustomizerOpen(false)}>
                    <div class="share-customizer-modal" onClick={(event) => event.stopPropagation()}>
                        <h3>Customize Share Card</h3>

                        <div class="customizer-grid">
                            <label>
                                Width (px)
                                <input
                                    type="number"
                                    min="320"
                                    max="2000"
                                    value={panelWidth()}
                                    onInput={(event) => setPanelWidth(Math.max(320, Number(event.currentTarget.value) || 750))}
                                />
                            </label>
                            <label>
                                Height (px)
                                <input
                                    type="number"
                                    min="320"
                                    max="2000"
                                    value={panelHeight()}
                                    onInput={(event) => {
                                        setIsAutoHeightMode(false);
                                        setPanelHeight(Math.max(320, Number(event.currentTarget.value) || 745));
                                    }}
                                />
                            </label>
                            <div class="auto-height-wrap">
                                <span>Auto height</span>
                                <button class="secondary" type="button" onClick={autoSetBestHeight}>Auto Height</button>
                            </div>
                            <label>
                                Theme
                                <select value={theme()} onChange={(event) => setTheme(event.currentTarget.value as 'dark' | 'light')}>
                                    <option value="dark">Dark</option>
                                    <option value="light">Light</option>
                                </select>
                            </label>
                        </div>

                        <div class="customizer-grid">
                            <label>
                                Header title
                                <input value={headerTitle()} onInput={(event) => setHeaderTitle(event.currentTarget.value)} />
                            </label>
                            <label>
                                Month / year text
                                <input value={monthYearLabel()} onInput={(event) => setMonthYearLabel(event.currentTarget.value)} placeholder="March 2026" />
                            </label>
                            <label>
                                Footer title
                                <input value={signupTitle()} onInput={(event) => setSignupTitle(event.currentTarget.value)} />
                            </label>
                            <label>
                                Footer link text
                                <input value={signupLink()} onInput={(event) => setSignupLink(event.currentTarget.value)} />
                            </label>
                        </div>

                        <div class="customizer-grid">
                            <label>
                                Center image path/URL
                                <input
                                    value={centerWatermarkUrl()}
                                    onInput={(event) => setCenterWatermarkUrl(event.currentTarget.value)}
                                    placeholder="/images/misc/share-week-watermark.png"
                                />
                            </label>
                            <label>
                                Center image opacity
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={centerWatermarkOpacity()}
                                    onInput={(event) => setCenterWatermarkOpacity(Math.max(0, Math.min(1, Number(event.currentTarget.value) || 0)))}
                                />
                            </label>
                            <label class="toggle-label">
                                <span>Show center image</span>
                                <input
                                    type="checkbox"
                                    checked={centerWatermarkEnabled()}
                                    onChange={(event) => setCenterWatermarkEnabled(event.currentTarget.checked)}
                                />
                            </label>
                        </div>

                        <div class="customizer-grid">
                            <label>
                                Dark panel background
                                <input type="color" value={darkPanelBg()} onInput={(event) => setDarkPanelBg(event.currentTarget.value)} />
                            </label>
                            <label>
                                Dark outer background
                                <input type="color" value={darkOuterBg()} onInput={(event) => setDarkOuterBg(event.currentTarget.value)} />
                            </label>
                            <label>
                                Dark title color
                                <input type="color" value={darkTitleColor()} onInput={(event) => setDarkTitleColor(event.currentTarget.value)} />
                            </label>
                            <label>
                                Dark time color
                                <input type="color" value={darkTimeColor()} onInput={(event) => setDarkTimeColor(event.currentTarget.value)} />
                            </label>
                        </div>

                        <div class="customizer-grid">
                            <label>
                                Light panel background
                                <input type="color" value={lightPanelBg()} onInput={(event) => setLightPanelBg(event.currentTarget.value)} />
                            </label>
                            <label>
                                Light outer background
                                <input type="color" value={lightOuterBg()} onInput={(event) => setLightOuterBg(event.currentTarget.value)} />
                            </label>
                            <label>
                                Light title color
                                <input type="color" value={lightTitleColor()} onInput={(event) => setLightTitleColor(event.currentTarget.value)} />
                            </label>
                            <label>
                                Light time color
                                <input type="color" value={lightTimeColor()} onInput={(event) => setLightTimeColor(event.currentTarget.value)} />
                            </label>
                        </div>

                        <Show when={theme() === 'light'}>
                            <div class="customizer-grid light-footer-grid">
                                <label>
                                    Footer tint (light mode)
                                    <input type="color" value={lightFooterBgTint()} onInput={(event) => setLightFooterBgTint(event.currentTarget.value)} />
                                </label>
                                <label>
                                    Footer top border (light mode)
                                    <input type="color" value={lightFooterBorderColor()} onInput={(event) => setLightFooterBorderColor(event.currentTarget.value)} />
                                </label>
                                <label>
                                    Footer title color (light mode)
                                    <input type="color" value={lightFooterTitleColor()} onInput={(event) => setLightFooterTitleColor(event.currentTarget.value)} />
                                </label>
                                <label>
                                    Footer link color (light mode)
                                    <input type="color" value={lightFooterLinkColor()} onInput={(event) => setLightFooterLinkColor(event.currentTarget.value)} />
                                </label>
                            </div>
                        </Show>

                        <div class="customizer-events">
                            <div class="customizer-events-header">
                                <h4>Edit / remove events</h4>
                                <button class="secondary" type="button" onClick={addCustomEvent}>Add event</button>
                            </div>
                            <For each={editableEvents() || []}>
                                {(event: any) => {
                                    const hidden = () => hiddenEventIds().includes(event.id);
                                    return (
                                        <div class="customizer-event-row">
                                            <label class="event-visibility-toggle">
                                                <input
                                                    type="checkbox"
                                                    checked={!hidden()}
                                                    onChange={(e) => toggleEventVisibility(event.id, e.currentTarget.checked)}
                                                />
                                                Show
                                            </label>
                                            <span class="event-time-label">{formatTime(event.start)} - {formatTime(event.end)}</span>
                                            <input
                                                class="event-title-input"
                                                value={eventTitleOverrides()[event.id] ?? event.title}
                                                onInput={(e) => event.isCustom
                                                    ? updateCustomEvent(event.id, { title: e.currentTarget.value })
                                                    : updateEventTitle(event.id, e.currentTarget.value)}
                                            />
                                            <Show when={event.isCustom}>
                                                <div class="custom-event-inputs">
                                                    <input
                                                        type="datetime-local"
                                                        class="custom-event-datetime"
                                                        value={event.start}
                                                        onInput={(e) => updateCustomEvent(event.id, { start: e.currentTarget.value })}
                                                    />
                                                    <input
                                                        type="datetime-local"
                                                        class="custom-event-datetime"
                                                        value={event.end}
                                                        onInput={(e) => updateCustomEvent(event.id, { end: e.currentTarget.value })}
                                                    />
                                                    <button class="danger" type="button" onClick={() => removeCustomEvent(event.id)}>Remove</button>
                                                </div>
                                            </Show>
                                        </div>
                                    );
                                }}
                            </For>
                        </div>

                        <div class="customizer-actions">
                            <button class="primary" onClick={handleSaveThemeConfig}>Save Colors</button>
                            <button class="secondary" onClick={resetCustomizations}>Reset</button>
                            <button class="primary" onClick={() => setIsCustomizerOpen(false)}>Done</button>
                        </div>
                    </div>
                </div>
            </Show>

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
                    box-sizing: border-box;
                    overflow: hidden;
                    position: relative;
                    padding: calc(2rem * var(--share-density));
                    border-radius: 0;
                    border: 1px solid transparent;
                    font-family: Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    color: var(--text-color);
                    background: var(--panel-bg);
                    display: flex;
                    flex-direction: column;
                    gap: calc(1.25rem * var(--share-density));
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                }
                .share-center-watermark {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    width: min(62%, calc(420px * var(--share-density)));
                    height: auto;
                    max-height: 58%;
                    object-fit: contain;
                    opacity: var(--custom-watermark-opacity);
                    pointer-events: none;
                    z-index: 0;
                }
                .share-header,
                .share-events-list,
                .share-footer {
                    position: relative;
                    z-index: 1;
                }
                .capture-export-area {
                    display: inline-block;
                    box-sizing: border-box;
                }
                .capture-export-area.theme-dark {
                    background: var(--custom-dark-outer-bg);
                }
                .capture-export-area.theme-light {
                    background: var(--custom-light-outer-bg);
                }
                .share-container.theme-dark {
                    --panel-bg: var(--custom-dark-panel-bg);
                    --text-color: #ffffff;
                    --muted-text-color: rgba(255, 255, 255, 0.9);
                    --line-color: rgba(255,255,255,0.1);
                    --item-bg: rgba(255,255,255,0.06);
                    --accent: var(--custom-dark-time);
                    --time-color: var(--custom-dark-time);
                    --title-color: var(--custom-dark-title);
                    --event-title-color: #ffffff;
                    --day-label-color: rgba(255,255,255,0.95);
                }
                .share-container.theme-light {
                    --panel-bg: var(--custom-light-panel-bg);
                    --text-color: #111827;
                    --muted-text-color: #334155;
                    --line-color: rgba(15,23,42,0.22);
                    --item-bg: #e5e7eb;
                    --accent: var(--custom-light-time);
                    --time-color: var(--custom-light-time);
                    --title-color: var(--custom-light-title);
                    --event-title-color: #111827;
                    --day-label-color: #0f172a;
                    border-color: transparent;
                    --footer-bg: var(--custom-light-footer-bg);
                    --footer-border-color: var(--custom-light-footer-border);
                    --footer-title-color: var(--custom-light-footer-title);
                    --footer-link-color: var(--custom-light-footer-link);
                }
                .share-container.theme-dark {
                    --footer-bg: transparent;
                    --footer-border-color: var(--line-color);
                    --footer-title-color: var(--muted-text-color);
                    --footer-link-color: var(--accent);
                }
                .share-header {
                    display: flex;
                    align-items: center;
                    gap: calc(1.5rem * var(--share-density));
                    border-bottom: 1px solid var(--line-color);
                    padding-bottom: calc(1.2rem * var(--share-density));
                }
                .share-logo {
                    width: calc(112px * var(--share-density));
                    height: auto;
                    max-height: calc(96px * var(--share-density));
                    object-fit: contain;
                    aspect-ratio: auto;
                    display: block;
                    flex-shrink: 0;
                }
                .header-text h1 {
                    margin: 0;
                    font-size: calc(1.9rem * var(--share-density));
                    line-height: 1.12;
                    color: var(--title-color);
                    background: none;
                }
                .header-text p {
                    margin: calc(0.08rem * var(--share-density)) 0 0;
                    color: var(--muted-text-color);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-weight: 800;
                    line-height: 1.1;
                    font-size: calc(0.9rem * var(--share-density));
                }
                .share-events-list {
                    display: flex;
                    flex-direction: column;
                    gap: calc(0.75rem * var(--share-density));
                    min-height: 0;
                }
                .share-day-item {
                    display: grid;
                    grid-template-columns: calc(140px * var(--share-density)) 1fr;
                    gap: calc(0.65rem * var(--share-density));
                    align-items: center;
                }
                .day-heading {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    justify-content: center;
                    gap: calc(0.04rem * var(--share-density));
                    border-bottom: none;
                    padding-bottom: 0;
                    padding-left: calc(0.3rem * var(--share-density));
                }
                .day-weekday {
                    margin: 0;
                    font-weight: 900;
                    font-size: calc(0.95rem * var(--share-density));
                    line-height: 1.05;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: var(--day-label-color);
                }
                .day-date {
                    margin: 0;
                    font-size: calc(0.8rem * var(--share-density));
                    font-weight: 700;
                    line-height: 1.05;
                    color: var(--muted-text-color);
                }
                .day-events-column {
                    display: flex;
                    flex-direction: column;
                    gap: calc(0.35rem * var(--share-density));
                    min-width: 0;
                    width: 100%;
                    justify-content: center;
                }
                .share-event-item {
                    display: flex;
                    gap: calc(0.8rem * var(--share-density));
                    align-items: stretch;
                    justify-content: space-between;
                    background: var(--item-bg);
                    border-radius: calc(10px * var(--share-density));
                    padding: calc(0.45rem * var(--share-density)) calc(0.6rem * var(--share-density));
                }
                .share-event-item.share-day-item {
                    display: grid;
                    grid-template-columns: calc(140px * var(--share-density)) 1fr;
                    gap: calc(0.65rem * var(--share-density));
                    align-items: center;
                    justify-content: initial;
                }
                .event-details {
                    display: grid;
                    grid-template-columns: calc(8.8rem * var(--share-density)) minmax(0, 1fr);
                    align-items: center;
                    column-gap: calc(0.55rem * var(--share-density));
                    text-align: left;
                    padding: calc(0.15rem * var(--share-density)) 0;
                }
                .event-details h3 {
                    margin: 0 !important;
                    font-size: calc(1rem * var(--share-density));
                    line-height: 1.25;
                    font-weight: 700;
                    color: var(--event-title-color);
                }
                .event-details .event-time {
                    margin: 0;
                    font-size: calc(0.9rem * var(--share-density));
                    font-weight: 800;
                    color: var(--time-color);
                    width: calc(8.8rem * var(--share-density));
                    justify-self: end;
                    text-align: right;
                    font-variant-numeric: tabular-nums;
                    white-space: nowrap;
                }
                .share-footer {
                    margin-top: auto;
                    text-align: center;
                    border-top: 1px solid var(--footer-border-color);
                    border-right: none;
                    border-bottom: none;
                    border-left: none;
                    background: var(--footer-bg);
                    position: relative;
                    left: calc(-2rem * var(--share-density));
                    width: calc(100% + (4rem * var(--share-density)));
                    margin-bottom: calc(-2rem * var(--share-density));
                    padding: calc(0.55rem * var(--share-density)) calc(2rem * var(--share-density)) calc(0.45rem * var(--share-density));
                    box-sizing: border-box;
                }
                .share-container.auto-height-active .share-footer {
                    margin-top: calc(0.18rem * var(--share-density));
                    margin-bottom: 0;
                    left: 0;
                    width: 100%;
                }
                .share-footer .signup-title {
                    margin: 0;
                    font-size: calc(0.8rem * var(--share-density));
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: var(--footer-title-color);
                }
                .share-footer .signup-link {
                    margin: calc(0.08rem * var(--share-density)) 0 0;
                    font-weight: 700;
                    font-size: calc(1.2rem * var(--share-density));
                    color: var(--footer-link-color);
                }
                .share-controls {
                    margin-top: 2rem;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                .export-scale-control {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.88rem;
                }
                .export-scale-control select {
                    border: 1px solid rgba(255,255,255,0.25);
                    background: rgba(255,255,255,0.08);
                    color: #fff;
                    border-radius: 6px;
                    padding: 0.35rem 0.45rem;
                }
                .share-customizer-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.55);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1rem;
                    box-sizing: border-box;
                }
                .share-customizer-modal {
                    width: min(920px, 100%);
                    max-height: 88vh;
                    overflow: auto;
                    background: #0b1328;
                    color: #ffffff;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 10px;
                    padding: 1rem;
                    box-sizing: border-box;
                }
                .share-customizer-modal h3,
                .share-customizer-modal h4 {
                    margin: 0 0 0.75rem;
                }
                .customizer-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
                    gap: 0.65rem;
                    margin-bottom: 0.85rem;
                }
                .customizer-grid label {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                    font-size: 0.88rem;
                }
                .toggle-label {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.6rem;
                    padding-top: 1.15rem;
                }
                .auto-height-wrap {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                    justify-content: flex-end;
                    font-size: 0.88rem;
                }
                .customizer-grid input,
                .customizer-grid select,
                .event-title-input {
                    border: 1px solid rgba(255,255,255,0.25);
                    background: rgba(255,255,255,0.08);
                    color: #fff;
                    border-radius: 6px;
                    padding: 0.45rem 0.55rem;
                }
                .customizer-grid input[type='color'] {
                    height: 2.2rem;
                    padding: 0.15rem;
                }
                .light-footer-grid input[type='color'] {
                    height: 2.2rem;
                    padding: 0.15rem;
                }
                .customizer-events {
                    border-top: 1px solid rgba(255,255,255,0.16);
                    margin-top: 0.5rem;
                    padding-top: 0.75rem;
                }
                .customizer-events-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.6rem;
                    margin-bottom: 0.6rem;
                }
                .customizer-events-header h4 {
                    margin: 0;
                }
                .customizer-event-row {
                    display: grid;
                    grid-template-columns: auto calc(8.8rem * var(--share-density)) minmax(220px, 1fr);
                    gap: 0.6rem;
                    align-items: center;
                    margin-bottom: 0.45rem;
                }
                .custom-event-inputs {
                    grid-column: 1 / -1;
                    display: grid;
                    grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) auto;
                    gap: 0.45rem;
                }
                .custom-event-datetime {
                    width: 100%;
                }
                .event-visibility-toggle {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.85rem;
                }
                .event-time-label {
                    text-align: right;
                    font-variant-numeric: tabular-nums;
                    color: #d9a8e8;
                    font-size: 0.88rem;
                    white-space: nowrap;
                }
                .customizer-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.5rem;
                    margin-top: 0.8rem;
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
