import { onMount, onCleanup } from "solid-js";
import { RiverScene } from "./RiverScene";

export default function Background() {
  let containerRef: HTMLDivElement | undefined;
  let riverScene: RiverScene | undefined;

  onMount(() => {
    if (containerRef) {
      riverScene = new RiverScene(containerRef, 'dark');

      (window as any).riverScene = riverScene;
      (window as any).setBiome = (name: any) => riverScene?.updateBiome(name);
      
      const matcher = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
        riverScene?.updateTheme(e.matches ? 'dark' : 'light');
      };
      
      updateTheme(matcher);
      
      matcher.addEventListener('change', updateTheme);
      
      onCleanup(() => {
        delete (window as any).riverScene;
        delete (window as any).setBiome;
        matcher.removeEventListener('change', updateTheme);
        riverScene?.dispose();
      });
    }
  });

  return (
    <div id="animated-background">
      <div 
        ref={containerRef} 
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
