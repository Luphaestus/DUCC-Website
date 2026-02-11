import { createSignal, onMount, For, createEffect } from "solid-js";

interface OTPInputProps {
    length?: number;
    value: string;
    onInput: (value: string) => void;
    onComplete?: (value: string) => void;
    error?: boolean;
    success?: boolean;
    disabled?: boolean;
}

export default function OTPInput(props: OTPInputProps) {
    const length = props.length || 6;
    let inputRefs: HTMLInputElement[] = [];

    createEffect(() => {
        // When value is cleared, focus the first box
        if (props.value === "" && inputRefs[0]) {
            inputRefs[0].focus();
        }
    });

    const handleInput = (e: InputEvent, index: number) => {
        const input = e.target as HTMLInputElement;
        const val = input.value;
        
        // Handle only numeric input
        const char = val.replace(/[^0-9]/g, '').slice(-1);
        
        // Ensure we have an array of the correct length to avoid holes
        const currentCode = Array.from({ length }, (_, i) => props.value[i] || '');
        
        if (char) {
            currentCode[index] = char;
            const newCode = currentCode.join('');
            props.onInput(newCode);

            // Move to next box
            if (index < length - 1) {
                inputRefs[index + 1].focus();
            }

            // Auto-complete check - check the joined string length
            const filledCode = newCode.replace(/\s/g, '');
            if (filledCode.length === length && props.onComplete) {
                props.onComplete(filledCode);
            }
        } else {
            // Keep current value if non-numeric was typed
            input.value = props.value[index] || '';
        }
    };

    const handleKeyDown = (e: KeyboardEvent, index: number) => {
        if (e.key === 'Backspace') {
            const currentCode = Array.from({ length }, (_, i) => props.value[i] || '');
            if (!currentCode[index] && index > 0) {
                // If box is empty, go back and clear previous box
                currentCode[index - 1] = '';
                props.onInput(currentCode.join(''));
                inputRefs[index - 1].focus();
            } else {
                // Clear current box
                currentCode[index] = '';
                props.onInput(currentCode.join(''));
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs[index - 1].focus();
        } else if (e.key === 'ArrowRight' && index < length - 1) {
            inputRefs[index + 1].focus();
        }
    };

    const handlePaste = (e: ClipboardEvent) => {
        e.preventDefault();
        const pasteData = e.clipboardData?.getData('text').trim().slice(0, length).replace(/[^0-9]/g, '');
        if (pasteData) {
            props.onInput(pasteData);
            // Focus appropriate box
            const nextIndex = Math.min(pasteData.length, length - 1);
            inputRefs[nextIndex].focus();
            
            if (pasteData.length === length && props.onComplete) {
                props.onComplete(pasteData);
            }
        }
    };

    return (
        <div 
            class="otp-input-container" 
            classList={{ 'error': props.error, 'success': props.success, 'shaking': props.error }}
            onPaste={handlePaste}
        >
            <For each={Array.from({ length })}>
                {(_, i) => (
                    <input
                        ref={(el) => (inputRefs[i()] = el)}
                        type="text"
                        inputmode="numeric"
                        value={props.value[i()] || ''}
                        onInput={(e) => handleInput(e as InputEvent, i())}
                        onKeyDown={(e) => handleKeyDown(e, i())}
                        disabled={props.disabled}
                        class="otp-box"
                        placeholder="•"
                    />
                )}
            </For>
        </div>
    );
}
