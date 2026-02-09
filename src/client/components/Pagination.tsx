import { For, Show, createMemo } from "solid-js";
import { GlassButtonSmall } from "./LiquidButton";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function Pagination(props: PaginationProps) {
    const visiblePages = createMemo(() => {
        const total = props.totalPages;
        const current = props.currentPage;
        const delta = 2; // Number of pages to show before and after current
        
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
                range.push(i);
            }
        }

        for (let i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots;
    });

    return (
        <Show when={props.totalPages > 1}>
            <nav class="pagination-container glass-pagination">
                <GlassButtonSmall
                    class="nav-btn prev-btn outline secondary"
                    disabled={props.currentPage === 1}
                    onClick={() => props.onPageChange(props.currentPage - 1)}
                    classList={{ 'pagination-disabled': props.currentPage === 1, 'pagination-enabled': props.currentPage !== 1 }}
                    padding="0.3rem 0.6rem"
                >
                    Prev
                </GlassButtonSmall>

                <div class="page-buttons" style={{ "align-items": "center", "display": "flex", "gap": "0.5rem" }}>
                    <span class="pagination-info" style={{ "font-size": "0.85rem", "font-weight": "600", "color": "var(--pico-muted-color)" }}>
                        Page {props.currentPage} of {props.totalPages}
                    </span>
                </div>

                <GlassButtonSmall
                    class="nav-btn next-btn outline secondary"
                    disabled={props.currentPage === props.totalPages}
                    onClick={() => props.onPageChange(props.currentPage + 1)}
                    classList={{ 'pagination-disabled': props.currentPage === props.totalPages, 'pagination-enabled': props.currentPage !== props.totalPages }}
                    padding="0.3rem 0.6rem"
                >
                    Next
                </GlassButtonSmall>
            </nav>
        </Show>
    );
}