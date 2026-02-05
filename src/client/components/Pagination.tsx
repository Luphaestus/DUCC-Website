import { For, Show } from "solid-js";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function Pagination(props: PaginationProps) {
    const pages = () => {
        const range = [];
        for (let i = 1; i <= props.totalPages; i++) {
            range.push(i);
        }
        return range;
    };

    return (
        <Show when={props.totalPages > 1}>
            <nav class="pagination-container">
                <button
                    disabled={props.currentPage === 1}
                    onClick={() => props.onPageChange(props.currentPage - 1)}
                >Prev</button>

                <For each={pages()}>
                    {(page) => (
                        <button
                            classList={{ active: page === props.currentPage }}
                            onClick={() => props.onPageChange(page)}
                        >
                            {page}
                        </button>
                    )}
                </For>

                <button
                    disabled={props.currentPage === props.totalPages}
                    onClick={() => props.onPageChange(props.currentPage + 1)}
                >Next</button>
            </nav>
        </Show>
    );
}
