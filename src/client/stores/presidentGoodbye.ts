import { createSignal } from "solid-js";

const [showGoodbye, setShowGoodbye] = createSignal(false);
const [outgoingPresident, setOutgoingPresident] = createSignal<any>(null);

export function triggerPresidentGoodbye(user: any) {
    setOutgoingPresident(user);
    setShowGoodbye(true);
}

export { showGoodbye, outgoingPresident };
