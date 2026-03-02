export function fuzzyScore(query: string, text: string): number {
    if (!query) return 1;

    const q = query.toLowerCase().trim();
    const value = text.toLowerCase();

    if (value === q) return 1000;
    if (value.startsWith(q)) return 700;
    if (value.includes(` ${q}`)) return 500;
    if (value.includes(q)) return 300;

    let queryIndex = 0;
    for (let textIndex = 0; textIndex < value.length && queryIndex < q.length; textIndex++) {
        if (value[textIndex] === q[queryIndex]) queryIndex++;
    }

    return queryIndex === q.length ? 100 : 0;
}

export function fuzzyFilterSort<T>(
    query: string,
    items: T[],
    getLabel: (item: T) => string,
    limit = 12
): T[] {
    return items
        .map((item) => {
            const label = getLabel(item);
            return { item, label, score: fuzzyScore(query, label) };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
        .slice(0, limit)
        .map((entry) => entry.item);
}
