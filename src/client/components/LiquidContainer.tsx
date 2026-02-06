import { onMount, onCleanup, mergeProps, ParentProps, createContext, useContext } from 'solid-js';

const LiquidContext = createContext<any>(null);

export function useLiquidContainer() {
    return useContext(LiquidContext);
}

interface LiquidProps extends ParentProps {
  class?: string;
  style?: any; 
  borderRadius?: number;
  tintOpacity?: number;
  type?: 'rounded' | 'circle' | 'pill';
  blurRadius?: number;
  edgeIntensity?: number;
  rimIntensity?: number;
  displacementScale?: number;
  saturation?: number;
  aberrationIntensity?: number;
  elasticity?: number;
  padding?: string;
  onClick?: (e: MouseEvent) => void;
  mouseContainer?: HTMLElement | null;
}

const VERTEX_SHADER = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  
  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uElasticity;
  uniform float uAberration;
  uniform float uCornerRadius;
  uniform float uGrainIntensity;
  uniform float uFrostIntensity;
  
  varying vec2 vUv;

  float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r;
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    
    vec2 mouse = uMouse / uResolution;
    mouse.y = 1.0 - mouse.y;
    
    float distToMouse = length((uv - mouse) * aspect);
    float mouseInfluence = smoothstep(0.6, 0.0, distToMouse);
    vec2 mouseDir = (uv - mouse);
    
    float noise1 = snoise(uv * 3.0 + uTime * 0.2);
    float noise2 = snoise(uv * 6.0 - uTime * 0.3);
    float liquid = (noise1 + noise2) * 0.5;
    
    float frostX = snoise(uv * 100.0) * uFrostIntensity;
    float frostY = snoise(uv * 100.0 + 15.0) * uFrostIntensity;
    float grain = rand(uv * 1000.0) * uGrainIntensity;
    
    vec3 normal = normalize(vec3(
      mouseDir.x * mouseInfluence * uElasticity * 8.0 + liquid * 0.05 + frostX,
      mouseDir.y * mouseInfluence * uElasticity * 8.0 + liquid * 0.05 + frostY,
      1.0
    ));
    
    vec3 lightDir = normalize(vec3(-0.5, 1.0, 1.0));
    float specular = pow(max(dot(normal, lightDir), 0.0), 30.0) * 0.4;
    float rim = pow(1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0) * 0.5;
    
    float colorShift = (normal.x + normal.y) * 0.5;
    vec3 refractionColor = vec3(0.0);
    refractionColor.r = smoothstep(0.2, 0.8, colorShift + uAberration * 0.05);
    refractionColor.g = smoothstep(0.2, 0.8, colorShift);
    refractionColor.b = smoothstep(0.2, 0.8, colorShift - uAberration * 0.05);
    
    vec2 p = (uv * 2.0 - 1.0) * uResolution * 0.5;
    vec2 boxSize = uResolution * 0.5;
    float dist = sdRoundedBox(p, boxSize, uCornerRadius);
    float alpha = 1.0 - smoothstep(-1.0, 1.0, dist);
    
    vec3 finalColor = vec3(1.0) * (specular + rim);
    finalColor += refractionColor * 0.15;
    finalColor += grain;
    
    gl_FragColor = vec4(finalColor, alpha * 0.15 + specular * alpha);
  }
`;

export default function LiquidContainer(props: LiquidProps) {
  const merged = mergeProps({
    class: '',
    style: {},
    displacementScale: 64,
    blurAmount: 0.134,
    saturation: 117,
    aberrationIntensity: 1.9,
    elasticity: 0.1,
    borderRadius: 20,
    padding: '0px',
    type: 'rounded'
  }, props);

  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let animationFrameId: number;
  
  const mouseState = { current: { x: 0, y: 0 }, target: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
  const startTime = Date.now();

  const effectiveCornerRadius = () => merged.borderRadius;
  const effectiveBlurPx = () => merged.blurAmount * 160; 

  const initWebGL = () => {
    if (!canvasRef) return;
    gl = canvasRef.getContext('webgl', { alpha: true, antialias: true });
    if (!gl) return;

    const createShader = (type: number, source: string) => {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) return null;
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  };

  const resize = () => {
    if (!canvasRef || !gl || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvasRef.width = rect.width * dpr;
    canvasRef.height = rect.height * dpr;
    gl.viewport(0, 0, canvasRef.width, canvasRef.height);
    const uResolution = gl.getUniformLocation(program!, 'uResolution');
    gl.uniform2f(uResolution, canvasRef.width, canvasRef.height);
  };

  const render = () => {
    if (!gl || !program) return;
    const time = (Date.now() - startTime) * 0.001;
    const spring = 0.1, friction = 0.8;
    
    mouseState.velocity.x += (mouseState.target.x - mouseState.current.x) * spring;
    mouseState.velocity.y += (mouseState.target.y - mouseState.current.y) * spring;
    mouseState.velocity.x *= friction;
    mouseState.velocity.y *= friction;
    mouseState.current.x += mouseState.velocity.x;
    mouseState.current.y += mouseState.velocity.y;

    const dpr = window.devicePixelRatio || 1;
    gl.uniform1f(gl.getUniformLocation(program, 'uTime'), time);
    gl.uniform2f(gl.getUniformLocation(program, 'uMouse'), mouseState.current.x * dpr, mouseState.current.y * dpr);
    gl.uniform1f(gl.getUniformLocation(program, 'uElasticity'), merged.elasticity);
    gl.uniform1f(gl.getUniformLocation(program, 'uAberration'), merged.aberrationIntensity);
    gl.uniform1f(gl.getUniformLocation(program, 'uCornerRadius'), merged.borderRadius * dpr);
    gl.uniform1f(gl.getUniformLocation(program, 'uGrainIntensity'), 0.02); // Permanently 0.02
    gl.uniform1f(gl.getUniformLocation(program, 'uFrostIntensity'), 0.0); // Permanently 0.0

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    animationFrameId = requestAnimationFrame(render);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    mouseState.target.x = e.clientX - rect.left;
    mouseState.target.y = e.clientY - rect.top;
  };

  onMount(() => {
    initWebGL();
    resize();
    render();
    window.addEventListener('resize', resize);
  });

  onCleanup(() => {
    window.removeEventListener('resize', resize);
    cancelAnimationFrame(animationFrameId);
  });

  return (
    <LiquidContext.Provider value={null}>
      <div
        ref={containerRef}
        class={`liquid-container ${merged.class}`}
        onClick={merged.onClick}
        onMouseMove={handleMouseMove}
        style={{
          position: 'relative',
          padding: merged.padding,
          'border-radius': `${effectiveCornerRadius()}px`,
          'backdrop-filter': `blur(${effectiveBlurPx()}px) saturate(${merged.saturation}%)`,
          '-webkit-backdrop-filter': `blur(${effectiveBlurPx()}px) saturate(${merged.saturation}%)`,
          'border': '1px solid rgba(255, 255, 255, 0.2)',
          'box-shadow': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
          ...merged.style
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            'pointer-events': 'none',
            'border-radius': `${effectiveCornerRadius()}px`,
            'z-index': 0,
            opacity: 0.8
          }}
        />
        <div style={{ 
            position: 'relative', 
            'z-index': 1, 
            display: 'flex', 
            'align-items': 'inherit', 
            'justify-content': 'inherit',
            'flex-direction': 'inherit',
            width: '100%',
            height: '100%'
        }}>
          {merged.children}
        </div>
      </div>
    </LiquidContext.Provider>
  );
}