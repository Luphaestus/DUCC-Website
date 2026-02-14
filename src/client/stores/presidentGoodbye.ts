import { createSignal } from "solid-js";

const [showGoodbye, setShowGoodbye] = createSignal(false);
const [outgoingExec, setOutgoingExec] = createSignal<any>(null);
const [goodbyeRole, setGoodbyeRole] = createSignal<string>("");

export function triggerExecGoodbye(user: any, role: string) {
    setOutgoingExec(user);
    setGoodbyeRole(role);
    setShowGoodbye(true);
}

export { showGoodbye, outgoingExec, goodbyeRole, setShowGoodbye };
