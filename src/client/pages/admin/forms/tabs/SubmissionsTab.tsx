import { createResource, For, Show, createMemo, Index } from "solid-js";
import { apiRequest } from "@/utils/api";
import Panel from "@/components/Panel";
import { FaSolidListUl } from 'solid-icons/fa';

interface Submission {
    submission_id: number;
    submitted_at: string;
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    answers: Answer[];
}

interface Answer {
    question_id: number;
    prompt: string;
    type: string;
    value: string | string[]; // Can be string for text, or string[] for multiselect
}

interface SubmissionsTabProps {
    formId: string;
}

export default function SubmissionsTab(props: SubmissionsTabProps) {
    const [submissions] = createResource(() => props.formId, async (id) => {
        const res = await apiRequest('GET', `/api/admin/forms/${id}/submissions`);
        return res.submissions || [];
    });

    return (
        <div class="submissions-tab-content">
            <Panel title="Form Submissions" icon={FaSolidListUl} class="submissions-panel">
                <Show when={submissions()?.length > 0} fallback={<p>No submissions yet.</p>}>
                    <div class="glass-table-container">
                        <table class="glass-table">
                            <thead>
                                <tr>
                                    <th>Submitted At</th>
                                    <th>User</th>
                                    <th>Answers</th>
                                </tr>
                            </thead>
                            <tbody>
                                <For each={submissions()}>
                                    {(sub) => (
                                        <tr>
                                            <td data-label="Submitted At">{new Date(sub.submitted_at).toLocaleString()}</td>
                                            <td data-label="User">
                                                <a href={`/admin/user/${sub.user_id}`} class="link">
                                                    {sub.first_name} {sub.last_name} ({sub.email})
                                                </a>
                                            </td>
                                            <td data-label="Answers" class="answers-column">
                                                <For each={sub.answers}>
                                                    {(answer) => (
                                                        <div class="answer-item">
                                                            <strong class="answer-label">{answer.prompt}:</strong>{' '}
                                                            <Show
                                                                when={Array.isArray(answer.value)}
                                                                fallback={<span>{answer.value as string}</span>}
                                                            >
                                                                <ul class="answer-list">
                                                                    <For each={answer.value as string[]}>
                                                                        {(val) => <li>{val}</li>}
                                                                    </For>
                                                                </ul>
                                                            </Show>
                                                        </div>
                                                    )}
                                                </For>
                                            </td>
                                        </tr>
                                    )}
                                </For>
                            </tbody>
                        </table>
                    </div>
                </Show>
            </Panel>
        </div>
    );
}
