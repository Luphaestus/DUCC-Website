import { createSignal, onMount, onCleanup, Show, createEffect } from "solid-js";
import { useNotifications } from "@/stores/notifications";

function RiverBackground(props: { onInit: (ref: HTMLDivElement) => void }) {
  let ref: HTMLDivElement | undefined;
  onMount(() => {
    if (ref) props.onInit(ref);
  });
  return (
    <div id="animated-background">
      <div 
        ref={ref} 
        style={{
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
          background: 'transparent'
        }}
      />
    </div>
  );
}

export default function Background() {
  const { notify } = useNotifications();
  const [showEasterEgg, setShowEasterEgg] = createSignal(false);
  let riverSceneInstance: any | undefined;
  let inputBuffer = "";
  const EASTER_EGG_CODE = "kayak";

  const handleKeydown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

    inputBuffer += e.key.toLowerCase();
    if (inputBuffer.length > EASTER_EGG_CODE.length) {
      inputBuffer = inputBuffer.slice(-EASTER_EGG_CODE.length);
    }

    if (inputBuffer === EASTER_EGG_CODE) {
      toggleEasterEgg();
      inputBuffer = "";
    }
  };

  const toggleEasterEgg = async () => {
    if (!showEasterEgg()) {
      setShowEasterEgg(true);
      notify("Easter Egg Found!", "Welcome to the river. 🛶", "success");
    } else {
      setShowEasterEgg(false);
      riverSceneInstance?.dispose();
      riverSceneInstance = undefined;
      delete (window as any).riverScene;
      delete (window as any).setBiome;
    }
  };

  const initRiverScene = async (container: HTMLDivElement) => {
    const { RiverScene } = await import("./RiverScene");
    if (!riverSceneInstance) {
      riverSceneInstance = new RiverScene(container, 'dark');
      (window as any).riverScene = riverSceneInstance;
      (window as any).setBiome = (name: any) => riverSceneInstance?.updateBiome(name);
      
      const matcher = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
        riverSceneInstance?.updateTheme(e.matches ? 'dark' : 'light');
      };
      updateTheme(matcher);
      matcher.addEventListener('change', updateTheme);
    }
  };

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeydown);
    riverSceneInstance?.dispose();
    delete (window as any).riverScene;
    delete (window as any).setBiome;
  });

  return (
    <>
      {/* Professional Background */}
      <div id="professional-background" classList={{ hidden: showEasterEgg() }}>
        <div class="subtle-river"></div>
        <div class="drifting-kayak">🛶</div>
        <div class="blob-container">
          <div class="blob blob-1"></div>
          <div class="blob blob-2"></div>
          <div class="blob blob-3"></div>
        </div>
      </div>

      {/* Easter Egg Background (River Scene) */}
      <Show when={showEasterEgg()}>
        <RiverBackground onInit={initRiverScene} />
      </Show>
    </>
  );
}
