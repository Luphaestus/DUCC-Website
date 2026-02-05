import { onMount, onCleanup, For, createSignal } from "solid-js";

interface Blob {
  size: string;
  top: string;
  left: string;
  colour: string;
  duration: string;
  delay: string;
}

export default function Background() {
  const [blobs, setBlobs] = createSignal<Blob[]>([]);

  onMount(() => {
    const colours = [
      'var(--blob-colour-1)',
      'var(--blob-colour-2)',
      'var(--blob-colour-3)',
      'var(--blob-colour-4)',
      'var(--blob-colour-5)'
    ];

    const newBlobs = Array.from({ length: 5 }).map((_, i) => ({
      size: `${Math.random() * 400 + 300}px`,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      colour: colours[i % colours.length],
      duration: `${Math.random() * 20 + 20}s`,
      delay: `${Math.random() * -20}s`
    }));

    setBlobs(newBlobs);
  });

  return (
    <div id="animated-background">
      <For each={blobs()}>
        {(blob) => (
          <div 
            class="bg-blob" 
            style={{
              width: blob.size,
              height: blob.size,
              top: blob.top,
              left: blob.left,
              "background-color": blob.colour,
              animation: `floatAround ${blob.duration} infinite ease-in-out`,
              "animation-delay": blob.delay
            }}
          />
        )}
      </For>
    </div>
  );
}
