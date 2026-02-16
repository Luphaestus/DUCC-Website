import { Show, Accessor, JSX } from "solid-js";
import { TabNav } from "./TabNav";
import { 
    FaSolidList, FaSolidCalendarDay, FaSolidCalendarDays, 
    FaSolidChevronLeft, FaSolidChevronRight, FaSolidArrowsRotate 
} from 'solid-icons/fa';

interface EventsHeaderControlsProps {
    viewMode: Accessor<'list' | 'week' | 'month'>;
    setView: (mode: 'list' | 'week' | 'month') => void;
    rangeText: Accessor<string>;
    onNavigate: (delta: number) => void;
    onToday: () => void;
    isToday: Accessor<boolean>;
    isRefreshing?: Accessor<boolean>;
    isDesktop: Accessor<boolean>;
    secondary?: JSX.Element;
}

export function EventsHeaderControls(props: EventsHeaderControlsProps) {
    return (
        <div class="events-header-container">
            <div class="events-header-primary">
                <div class="view-selector-container">
                    <Show when={props.isDesktop()}>
                        <TabNav class="toggle-group-mini">
                            <button class="tab-btn" classList={{ active: props.viewMode() === 'list' }} onClick={() => props.setView('list')} title="List View"><FaSolidList /></button>
                            <button class="tab-btn" classList={{ active: props.viewMode() === 'week' }} onClick={() => props.setView('week')} title="Week View"><FaSolidCalendarDay /></button>
                            <button class="tab-btn" classList={{ active: props.viewMode() === 'month' }} onClick={() => props.setView('month')} title="Month View"><FaSolidCalendarDays /></button>
                        </TabNav>
                    </Show>
                </div>

                <div class="page-selector-container">
                    <div class="week-navigator-mini flex align-center gap-3">
                        <button class="nav-btn" title="Previous" onClick={() => props.onNavigate(-1)}>
                            <FaSolidChevronLeft />
                        </button>
                        <div class="current-week-display">
                            <span class="range-text">{props.rangeText()}</span>
                        </div>
                        <button class="nav-btn" title="Next" onClick={() => props.onNavigate(1)}>
                            <FaSolidChevronRight />
                        </button>
                    </div>
                </div>

                <div class="today-control-container">
                    <button 
                        class="today-btn" 
                        classList={{ 
                            disabled: props.isToday(), 
                            'spin-active': props.isRefreshing?.() 
                        }} 
                        title="Back to Today" 
                        onClick={props.onToday}
                    >
                        <FaSolidArrowsRotate />
                        <span class="btn-text">Today</span>
                    </button>
                </div>
            </div>

            <Show when={props.secondary}>
                <div class="events-header-secondary">
                    {props.secondary}
                </div>
            </Show>
        </div>
    );
}
