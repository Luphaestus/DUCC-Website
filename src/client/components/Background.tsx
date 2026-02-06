import { onMount, onCleanup } from "solid-js";
import { RiverScene } from "./RiverScene";

export default function Background() {
  let containerRef: HTMLDivElement | undefined;
  let riverScene: RiverScene | undefined;

  onMount(() => {
    if (containerRef) {
      // Initialize the scene
      riverScene = new RiverScene(containerRef, 'dark');

      // Expose to console for manual biome switching
      (window as any).riverScene = riverScene;
      (window as any).setBiome = (name: any) => riverScene?.updateBiome(name);
      
      // Check system preference for theme
      const matcher = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
        riverScene?.updateTheme(e.matches ? 'dark' : 'light');
      };
      
      // Set initial theme
      updateTheme(matcher);
      
      // Listen for changes
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
