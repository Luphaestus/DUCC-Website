import * as THREE from 'three';

type Theme = 'light' | 'dark';
export type Biome = 'sunny' | 'rainy' | 'winter' | 'autumn';

interface KayakerState {
    group: THREE.Group;
    body: THREE.Mesh;
    paddle: THREE.Group;
    offset: number;
}

interface ChunkState {
    mesh: THREE.Group;
    zInitial: number;
}

interface Entity {
    mesh: THREE.Group;
    speed: number;
    userData?: any;
}

interface BirdEntity extends Entity {
    wingSpeed: number;
}

// Configuration
const CHUNK_SIZE = 60;
const NUM_CHUNKS = 5;
const TOTAL_RIVER_LENGTH = CHUNK_SIZE * NUM_CHUNKS;

export class RiverScene {
    // Core THREE elements
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    container: HTMLElement;
    clock: THREE.Clock;
    requestID: number | null = null;
    private isDisposed: boolean = false;

    // Environment State
    theme: Theme = 'dark';
    biome: Biome = 'sunny';
    fog: THREE.Fog;

    // Scene Objects
    chunks: ChunkState[] = [];
    kayakers: KayakerState[] = [];
    planes: Entity[] = [];
    birds: BirdEntity[] = [];
    fish: THREE.Group[] = [];

    // Environment Objects
    sun!: THREE.Mesh;
    moon!: THREE.Mesh;
    moonLight!: THREE.DirectionalLight;
    stars!: THREE.Points;
    weatherSystem!: THREE.Points;

    lights: {
        ambient: THREE.AmbientLight;
        directional: THREE.DirectionalLight;
        point: THREE.PointLight;
    };

    // Animation State
    lastPlaneTime: number = -100;
    lastBirdTime: number = -100;
    lastFishTime: number = -100;
    materials: any[] = [];

    uniforms: {
        uTime: { value: number };
        uCurve: { value: THREE.Vector2 };
        uSpeed: { value: number };
        uWeather: { value: number };
    };

    // Interaction State
    mouse: { x: number; y: number } = { x: 0, y: 0 };
    targetCameraOffset: { x: number; y: number } = { x: 0, y: 0 };
    scrollProgress: number = 0;
    isMouseDown: boolean = false;
    mouseDownTime: number = 0;
    lastClickTime: number = 0;
    cameraMode: 'default' | 'fpv' = 'fpv';

    constructor(container: HTMLElement, theme: Theme = 'dark') {
        this.container = container;
        this.theme = theme;
        this.clock = new THREE.Clock();

        this.uniforms = {
            uTime: { value: 0 },
            uCurve: { value: new THREE.Vector2(0, 0) },
            uSpeed: { value: 12.0 },
            uWeather: { value: 1.0 }
        };

        // 1. Init Scene & Camera
        this.scene = new THREE.Scene();
        this.fog = new THREE.Fog(0x020617, 10, 210); // Fog ends just before the chunks recycle
        this.scene.fog = this.fog;

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 2000);
        this.camera.position.set(0, 6, 15);
        this.camera.lookAt(0, 2, -30);

        // 2. Init Renderer
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
            precision: 'highp'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.container.appendChild(this.renderer.domElement);

        // 3. Init Lights
        this.lights = {
            ambient: new THREE.AmbientLight(0xffffff, 0.2),
            directional: new THREE.DirectionalLight(0x818cf8, 0.5),
            point: new THREE.PointLight(0x00A8CC, 0.8, 20)
        };
        this.setupLights();

        // 4. Init Objects
        this.initSky();
        this.initWeather();
        this.initChunks();
        this.initKayakers();

        // 5. Setup Events & Theme
        this.updateTheme(theme);
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('scroll', this.handleScroll);
        window.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mouseup', this.handleMouseUp);
        // Touch support for mobile
        window.addEventListener('touchstart', this.handleMouseDown);
        window.addEventListener('touchend', this.handleMouseUp);
        window.addEventListener('dblclick', this.handleDoubleClick);

        this.animate();
    }

    handleDoubleClick = (event: MouseEvent | TouchEvent) => {
        const target = event.target as HTMLElement;
        // Ignore if clicking on interactive elements
        if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('.card') || target.closest('.interactive')) return;

        const biomes: Biome[] = ['sunny', 'rainy', 'winter', 'autumn'];
        let nextBiome: Biome;
        do {
            nextBiome = biomes[Math.floor(Math.random() * biomes.length)];
        } while (nextBiome === this.biome);
        
        this.updateBiome(nextBiome);
    }

    handleMouseDown = () => {
        this.isMouseDown = true;
        this.mouseDownTime = this.clock.elapsedTime;
    }

    handleMouseUp = (event: MouseEvent | TouchEvent) => {
        this.isMouseDown = false;
        this.cameraMode = 'fpv';

        // Manual double tap detection for mobile
        if ('touches' in event || 'changedTouches' in event) {
            const now = this.clock.elapsedTime;
            if (now - this.lastClickTime < 0.3) {
                this.handleDoubleClick(event as any);
            }
            this.lastClickTime = now;
        }
    }

    private setupLights() {
        this.lights.directional.position.set(-10, 20, -5);
        this.lights.directional.castShadow = true;
        this.lights.directional.shadow.mapSize.width = 2048;
        this.lights.directional.shadow.mapSize.height = 2048;
        this.lights.point.position.set(-10, 5, 0);

        this.scene.add(this.lights.ambient);
        this.scene.add(this.lights.directional);
        this.scene.add(this.lights.point);
    }

    // =========================================
    // Terrain & River Math
    // =========================================

    private getRiverWidth(z: number): number {
        const k = 2 * Math.PI / 150;
        // River narrows and widens. Base 14. Variance +/- 5.
        // When narrow, it's faster/more dangerous conceptually.
        return 14 + Math.sin(z * k) * 5.0;
    }

    private getPathX(z: number): number {
        const k = 2 * Math.PI / 300;
        // Meandering path
        return Math.sin(z * k * 2) * 6.0 + Math.cos(z * k) * 3.0;
    }

    private getRiverSlopeHeight(z: number): number {
        const segSize = 5.0;
        const absZ = Math.abs(z);
        const segments = Math.floor(absZ / segSize);
        const remainder = absZ % segSize;

        let h = 0;
        // Delta accumulation system: guaranteed monotonic
        for (let i = 0; i < segments; i++) {
            const noise = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
            h += 0.1 + noise * 0.4; // 0.1 to 0.5 drop per 5 units
        }
        
        const noiseRem = Math.abs(Math.sin(segments * 12.9898) * 43758.5453) % 1;
        h += (remainder / segSize) * (0.1 + noiseRem * 0.4);

        // Map height so distance (z < 0) is higher than foreground
        return (z > 0 ? -h : h) - 30;
    }

    private getIsRapids(z: number): number {
        const segSize = 5.0;
        const i = Math.floor(Math.abs(z) / segSize);
        const noise = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
        const delta = 0.1 + noise * 0.4;
        
        // Higher delta = steeper drop = rapids
        const rapidIntensity = THREE.MathUtils.smoothstep(delta, 0.35, 0.48);

        // Add some noise rapids in other areas
        const n = Math.sin(z * 0.5) * Math.cos(z * 0.1);
        const texture = Math.max(0, n * 0.3);

        return Math.min(1.0, rapidIntensity + texture);
    }

    private getTerrainHeight(x: number, z: number): number {
        const riverCenterX = this.getPathX(z);
        const riverWidth = this.getRiverWidth(z);
        const distFromCenter = Math.abs(x - riverCenterX);
        const slopeHeight = this.getRiverSlopeHeight(z);

        if (distFromCenter < riverWidth) {
            // Riverbed
            const normDist = distFromCenter / riverWidth;
            // Parabolic bottom, deeper in middle (-4)
            let h = -4 * (1.0 - Math.pow(normDist, 3));

            // Add turbulence height based on rapids
            const rapids = this.getIsRapids(z);
            h += (Math.sin(x * 1.5) + Math.cos(z * 0.5)) * 0.5 * rapids;

            return h + slopeHeight;
        } else {
            // Banks / Terrain
            const bankSlope = 0.8;
            let h = 2 + (distFromCenter - riverWidth) * bankSlope;

            // Terrain noise
            const k = 2 * Math.PI / 300;
            const noise = Math.sin(x * 0.3) + Math.cos(z * k * 10);
            const biomeMix = Math.sin(z * k) * 0.5 + 0.5;
            h += noise * THREE.MathUtils.lerp(1.5, 4.0, biomeMix);

            return h + slopeHeight;
        }
    }

    private getWaterHeight(xGlobal: number, zGlobal: number, elapsed: number): number {
        const speed = this.uniforms.uSpeed.value;
        const zForSampling = zGlobal - (speed * elapsed);

        // Match Shader Params for Consistency
        const k_path = 2 * Math.PI / 300;
        const riverCenter = Math.sin(zForSampling * k_path * 2.0) * 6.0 + Math.cos(zForSampling * k_path) * 3.0;
        const distFromCenter = Math.abs(xGlobal - riverCenter);
        
        const slopeHeight = this.getRiverSlopeHeight(zForSampling);
        const rapids = this.getIsRapids(zForSampling); // 0 to 1

        // Tongue Logic: Center is smoother in rapids
        const tongueMask = Math.max(0, 1.0 - (distFromCenter / 6.0));
        const tongueEffect = rapids * tongueMask;

        // Base flow movement (approximating noise with multiple sines)
        let wave = Math.sin(zForSampling * 0.15 + elapsed * 2.0) * 0.4;
        
        // Edge Turbulence / Eddies
        const edgeEffect = Math.max(0, (distFromCenter - 4.0) / 8.0);
        wave += Math.sin(xGlobal * 1.5 + zForSampling * 0.5 + elapsed * 3.0) * 0.6 * edgeEffect * (1.0 + rapids);
        
        // Choppy Standing Waves in Rapids
        const chop = Math.sin(xGlobal * 1.2) * Math.cos(zForSampling * 0.8 + elapsed * 5.0);
        wave += chop * 0.3 * rapids * (1.0 - tongueEffect);

        const waveAmp = 0.5 + (rapids * 2.0);

        // Match Shader Curvature
        const zRel = zGlobal - 15.0;
        let curveDrop = 0;
        if (zRel < 0) {
            curveDrop = (zRel * zRel * 0.00003) * 5.0; // 5.0 match shader multiplier
        }

        return slopeHeight + wave * waveAmp - curveDrop;
    }

    // =========================================
    // Material & Shaders
    // =========================================

    private modifyMaterial(material: THREE.Material, isWater = false) {
        material.dithering = true;
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.uniforms.uTime;
            shader.uniforms.uCurve = this.uniforms.uCurve;
            shader.uniforms.uSpeed = this.uniforms.uSpeed;
            this.materials.push(shader);

            shader.vertexShader = `
                uniform float uTime;
                uniform float uSpeed;
                uniform vec2 uCurve;
                ${isWater ? 'varying float vFoam;' : ''}
                
                // Simple pseudo-random noise for water texture
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
                }

                ${shader.vertexShader}
            `;

            const waveCode = isWater ? `
                vec4 worldPos = modelMatrix * vec4(transformed, 1.0);
                float zRiver = worldPos.z - uTime * uSpeed;
                
                // 1. Delta-based Slope Calculation (Monotonic)
                float absZR = abs(zRiver);
                float segSize = 5.0;
                float segments = floor(absZR / segSize);
                float h = 0.0;
                
                // Sum deltas up to current segment
                for(float i = 0.0; i < 80.0; i++) { // Cover up to 400 units
                    if(i >= segments) break;
                    float noiseVal = fract(abs(sin(i * 12.9898) * 43758.5453));
                    h += 0.1 + noiseVal * 0.4;
                }
                float noiseRem = fract(abs(sin(segments * 12.9898) * 43758.5453));
                h += (fract(absZR / segSize)) * (0.1 + noiseRem * 0.4);
                float slopeHeight = (zRiver > 0.0 ? -h : h) - 30.0;

                // 2. Rapids Intensity
                float isRapid = smoothstep(0.35, 0.48, 0.1 + noiseRem * 0.4);
                
                // Calculate River Path
                float k_path = 2.0 * 3.14159 / 300.0;
                float riverCenter = sin(zRiver * k_path * 2.0) * 6.0 + cos(zRiver * k_path) * 3.0;
                float distFromCenter = abs(worldPos.x - riverCenter);
                
                // TONGUE: The smooth V-shaped fast water in the center of rapids
                float tongueMask = smoothstep(8.0, 1.0, distFromCenter);
                float tongueEffect = isRapid * tongueMask;
                
                // WAVES & FLOW
                float wave = 0.0;
                
                // Longitudinal Flow Texture
                float flowLines = noise(vec2(worldPos.x * 0.8, zRiver * 0.1 + uTime * 4.0));
                wave += flowLines * 0.4;
                
                // Center "Tongue" Waves
                float centerSwells = sin(zRiver * 0.15 + uTime * 2.0) * 0.5;
                wave = mix(wave, centerSwells, tongueEffect * 0.7);
                
                // Edge Turbulence
                float edgeNoise = noise(vec2(worldPos.x * 1.5, zRiver * 0.5 + uTime * 3.0));
                float edgeEffect = smoothstep(4.0, 12.0, distFromCenter);
                wave += edgeNoise * 0.6 * edgeEffect * (1.0 + isRapid);
                
                // Choppy water
                float chop = sin(worldPos.x * 1.2) * cos(zRiver * 0.8 + uTime * 5.0);
                wave += chop * 0.3 * isRapid * (1.0 - tongueEffect);

                float waveAmp = 0.5 + (isRapid * 2.0);
                transformed.z += wave * waveAmp;
                
                // FOAM: White water logic
                float foamNoise = noise(vec2(worldPos.x * 3.0, zRiver * 1.5 + uTime * 6.0));
                vFoam = isRapid * 0.4 * (1.0 - tongueEffect * 0.8) // White water in rapids
                        + smoothstep(0.3, 0.6, wave * waveAmp * 0.1) * 0.3 // Peak foam
                        + smoothstep(7.0, 15.0, distFromCenter) * 0.6 * foamNoise; // Bank spray
                vFoam = clamp(vFoam, 0.0, 1.0);
            ` : '';

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                ${waveCode}
                `
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <project_vertex>',
                `
                vec4 curvedWorldPos = modelMatrix * vec4( transformed, 1.0 );
                float zRel = curvedWorldPos.z - 15.0; 
                if (zRel < 0.0) {
                    float curveFactor = zRel * zRel * 0.00003; 
                    curvedWorldPos.z -= curveFactor * (2.0 + uCurve.y); 
                    curvedWorldPos.x += curveFactor * uCurve.x * 20.0;
                    curvedWorldPos.y -= curveFactor * 5.0; // Drop the horizon vertically
                }
                vec4 mvPosition = viewMatrix * curvedWorldPos;
                gl_Position = projectionMatrix * mvPosition;
                `
            );

            if (isWater) {
                shader.fragmentShader = `
                    varying float vFoam;
                    ${shader.fragmentShader}
                `.replace(
                    '#include <color_fragment>',
                    `
                    #include <color_fragment>
                    // Foam color (white) mixed with water color
                    vec3 foamColor = vec3(0.95, 0.98, 1.0);
                    diffuseColor.rgb = mix(diffuseColor.rgb, foamColor, vFoam * 0.8);
                    diffuseColor.a = mix(diffuseColor.a, 1.0, vFoam * 0.6);
                    `
                );
            }
        };
    }

    // =========================================
    // Mesh Generation
    // =========================================

    private createRiverChunk(zOffset: number): ChunkState {
        const group = new THREE.Group();
        group.position.set(0, -5, zOffset); // Base Y is -5 relative to camera

        const width = 120;
        const length = CHUNK_SIZE;
        const widthSegments = 64;
        const lengthSegments = 64;

        // 1. Terrain Mesh
        const geometry = new THREE.PlaneGeometry(width, length, widthSegments, lengthSegments);
        const posAttribute = geometry.getAttribute('position');
        const vertex = new THREE.Vector3();

        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);
            const x = vertex.x;
            const zGlobal = zOffset - vertex.y;
            const height = this.getTerrainHeight(x, zGlobal);
            posAttribute.setZ(i, height);
        }
        geometry.computeVertexNormals();

        const terrainMat = new THREE.MeshStandardMaterial({
            flatShading: true,
            roughness: 0.9,
            side: THREE.DoubleSide
        });
        this.modifyMaterial(terrainMat);
        const terrain = new THREE.Mesh(geometry, terrainMat);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        terrain.castShadow = true;
        group.add(terrain);

        // 2. Water Mesh
        // Water needs to be wider to cover bends
        const waterGeo = new THREE.PlaneGeometry(40, length, 40, lengthSegments);
        const waterPos = waterGeo.getAttribute('position');

        for (let i = 0; i < waterPos.count; i++) {
            const zGlobal = zOffset - waterPos.getY(i);
            const xLocal = waterPos.getX(i);
            const riverCenterX = this.getPathX(zGlobal);
            const slopeHeight = this.getRiverSlopeHeight(zGlobal);
            const rapids = this.getIsRapids(zGlobal);

            // Deform water grid to follow river path
            waterPos.setX(i, xLocal + riverCenterX);

            // Base waves for mesh structure
            const kw = 2 * Math.PI / 300;
            const waveIntensity = 0.5 + rapids * 3.0;
            let noise = Math.sin(xLocal * 0.8) * 0.15 + Math.cos(zGlobal * kw * 30.0) * 0.15;
            waterPos.setZ(i, slopeHeight + noise * waveIntensity);
        }
        waterGeo.computeVertexNormals();

        const waterMat = new THREE.MeshPhysicalMaterial({
            transparent: true,
            opacity: 0.8,
            metalness: 0.5,
            roughness: 0.2,
            clearcoat: 1
        });
        this.modifyMaterial(waterMat, true);
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = -0.5; // Slightly below terrain origin to avoid z-fighting at banks
        group.add(water);

        // 3. Decorations (Rocks/Trees)
        this.addDecorations(group, zOffset);

        this.scene.add(group);
        return { mesh: group, zInitial: zOffset };
    }

    private addDecorations(group: THREE.Group, zOffset: number) {
        // Rocks
        for (let k = 0; k < 5; k++) {
            const pZLocal = (Math.random() - 0.5) * CHUNK_SIZE;
            const pZGlobal = pZLocal + zOffset;
            const riverX = this.getPathX(pZGlobal);
            const width = this.getRiverWidth(pZGlobal);

            // Rocks always on banks
            const offset = (Math.random() > 0.5 ? 1 : -1) * (width + 2 + Math.random() * 5);

            const pX = riverX + offset;

            const rockGeo = new THREE.DodecahedronGeometry(Math.random() * 0.8 + 0.5, 0);
            const rockMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.8 });
            this.modifyMaterial(rockMat);
            const rock = new THREE.Mesh(rockGeo, rockMat);
            const h = this.getTerrainHeight(pX, pZGlobal);
            rock.position.set(pX, h + 0.3, pZLocal);
            rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            rock.castShadow = true;
            group.add(rock);
        }

        // Trees
        for (let k = 0; k < 12; k++) {
            const pZLocal = (Math.random() - 0.5) * CHUNK_SIZE;
            const pZGlobal = pZLocal + zOffset;
            const riverX = this.getPathX(pZGlobal);
            const width = this.getRiverWidth(pZGlobal);

            // Trees always on banks
            const pX = riverX + (Math.random() > 0.5 ? 1 : -1) * (width + 4 + Math.random() * 20);

            const h = this.getTerrainHeight(pX, pZGlobal);
            const treeMat = new THREE.MeshStandardMaterial({ color: 0x064e3b });
            this.modifyMaterial(treeMat);
            const tree = new THREE.Mesh(new THREE.ConeGeometry(1.5, 6, 8), treeMat);
            tree.position.set(pX, h + 3, pZLocal);
            tree.castShadow = true;
            group.add(tree);
        }
    }

    private initChunks() {
        for (let i = 0; i < NUM_CHUNKS; i++) {
            this.chunks.push(this.createRiverChunk(-i * CHUNK_SIZE));
        }
    }

    // =========================================
    // Entities (Kayakers, Wildlife)
    // =========================================

    private createKayaker(pos: [number, number, number], color: string, paddlerColor: string, offset: number) {
        const group = new THREE.Group();

        // --- 1. Hull & Cockpit (Base of the boat) ---
        const points = [
            new THREE.Vector2(0, -2.2),
            new THREE.Vector2(0.25, -1.5),
            new THREE.Vector2(0.35, 0),
            new THREE.Vector2(0.25, 1.5),
            new THREE.Vector2(0, 2.2)
        ];
        const hullGeo = new THREE.LatheGeometry(points, 12);
        const hullMat = new THREE.MeshStandardMaterial({ color, roughness: 0.1 });
        this.modifyMaterial(hullMat);
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.rotation.x = -Math.PI / 2;
        hull.scale.set(1, 1, 0.5);
        hull.position.y = 0.2;
        hull.castShadow = true;
        group.add(hull);

        const rimMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        this.modifyMaterial(rimMat);
        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(0.25, 0.03, 8, 16),
            rimMat
        );
        rim.rotation.x = -Math.PI / 2;
        rim.position.set(0, 0.45, 0);
        rim.scale.set(1, 1.5, 1);
        group.add(rim);

        // --- 2. The Paddler (Body) ---
        const bodyMat = new THREE.MeshStandardMaterial({ color: paddlerColor });
        this.modifyMaterial(bodyMat);
        // Body is the parent for Head and Paddle
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.55, 8), bodyMat);
        body.position.set(0, 0.6, 0); // Position relative to Boat
        body.castShadow = true;
        group.add(body);

        // Head (Child of Body)
        const headMat = new THREE.MeshStandardMaterial({ color: 0xf5d0a9 });
        this.modifyMaterial(headMat);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), headMat);
        head.position.set(0, 0.4, 0); // Relative to Body center (0.55 height / 2 approx)
        head.castShadow = true;
        body.add(head);

        // --- 3. The Paddle (Child of Body) ---
        const paddleGroup = new THREE.Group();
        // Position relative to BODY. 
        // Body center is 0. We want it slightly up (shoulders) and forward.
        paddleGroup.position.set(0, 0.2, -0.4);

        const shaftMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        this.modifyMaterial(shaftMat);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 8), shaftMat);
        shaft.rotation.z = Math.PI / 2;
        shaft.castShadow = true;
        paddleGroup.add(shaft);

        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            side: THREE.DoubleSide,
            roughness: 0.3,
            metalness: 0.2
        });
        this.modifyMaterial(bladeMat);

        // Create a realistic asymmetric teardrop shape for the blade
        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(0, 0.03);
        bladeShape.bezierCurveTo(0.2, 0.03, 0.4, 0.18, 0.75, 0.15);
        bladeShape.bezierCurveTo(0.85, 0.12, 0.85, -0.12, 0.75, -0.15);
        bladeShape.bezierCurveTo(0.4, -0.18, 0.2, -0.03, 0, -0.03);
        bladeShape.lineTo(0, 0.03);

        const bladeGeo = new THREE.ShapeGeometry(bladeShape, 12);
        // Add a "spoon" curve to the blade vertices
        const positions = bladeGeo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            positions.setZ(i, Math.pow(x, 1.5) * 0.15);
        }
        bladeGeo.computeVertexNormals();

        const leftBlade = new THREE.Mesh(bladeGeo, bladeMat);
        leftBlade.position.set(-1.4, 0, 0);
        leftBlade.rotation.y = Math.PI; // Point outwards and face the right way
        leftBlade.rotation.x = Math.PI / 8; // Slight angle for realism
        leftBlade.castShadow = true;
        paddleGroup.add(leftBlade);

        const rightBlade = new THREE.Mesh(bladeGeo, bladeMat);
        rightBlade.position.set(1.4, 0, 0);
        rightBlade.rotation.x = Math.PI / 2 + Math.PI / 8; // Feathered + slight angle
        rightBlade.castShadow = true;
        paddleGroup.add(rightBlade);

        // Attach Paddle to Body
        body.add(paddleGroup);

        // Wrapper for the whole kayak
        const wrapper = new THREE.Group();
        wrapper.position.set(...pos);
        wrapper.add(group);

        // Return body in the object so we can animate it
        return { wrapper, paddle: paddleGroup, body, offset };
    }

    private initKayakers() {
        const wrapper = new THREE.Group();
        wrapper.position.y = -5.5;

        const colors = [
            ['#D97706', '#ef4444'], ['#68246D', '#22c55e'], ['#0ea5e9', '#f59e0b'],
            ['#be185d', '#f472b6'], ['#15803d', '#86efac'], ['#b91c1c', '#fca5a5']
        ];

        for (let i = 0; i < 6; i++) {
            const z = -2 - (i * 3);
            const x = (i % 2 === 0 ? 1 : -1) * (1.5 + Math.random());
            const c = colors[i % colors.length];

            const k = this.createKayaker([x, 0, z], c[0], c[1], i * 1.5);

            wrapper.add(k.wrapper);
            // Store body here
            this.kayakers.push({
                group: k.wrapper,
                paddle: k.paddle,
                body: k.body,
                offset: i * 1.5
            });
        }
        this.scene.add(wrapper);
    }

    // --- Spawners ---

    private spawnBird() {
        const group = new THREE.Group();
        const startX = Math.random() > 0.5 ? -100 : 100;
        group.position.set(startX, 15 + Math.random() * 15, this.camera.position.z - 30 - Math.random() * 50);

        const birdMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.3), birdMat);
        wingL.position.x = -0.4;
        group.add(wingL);
        const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.3), birdMat);
        wingR.position.x = 0.4;
        group.add(wingR);

        this.scene.add(group);
        this.birds.push({
            mesh: group,
            speed: (startX < 0 ? 1 : -1) * (15 + Math.random() * 10),
            wingSpeed: 10 + Math.random() * 5 // Faster wings
        });
    }

    private spawnPlane() {
        const group = new THREE.Group();
        const fromLeft = Math.random() > 0.5;
        const startX = fromLeft ? -120 : 120;
        const endX = fromLeft ? 120 : -120;
        group.position.set(startX, 50 + Math.random() * 20, this.camera.position.z - 80 - Math.random() * 40);

        const body = new THREE.Mesh(new THREE.CapsuleGeometry(1, 8, 4, 8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        body.rotation.z = Math.PI / 2;
        group.add(body);
        const wing = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
        group.add(wing);
        const tail = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.2), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
        tail.position.set(-3.5, 1, 0);
        group.add(tail);

        group.lookAt(endX, group.position.y, group.position.z);
        this.scene.add(group);
        this.planes.push({ mesh: group, speed: (fromLeft ? 1 : -1) * (40 + Math.random() * 20) });
    }

    private spawnFish() {
        const group = new THREE.Group();
        
        // Bigger, more elongated body for a salmon
        const bodyGeo = new THREE.SphereGeometry(0.35, 12, 12);
        
        // Salmon colors: varying between deep spawning red and silvery-pink
        const isSpawning = Math.random() > 0.4;
        const fishColor = isSpawning ? 0x9b2226 : 0xfa8072; 
        const fishMat = new THREE.MeshStandardMaterial({ 
            color: fishColor, 
            roughness: 0.4,
            metalness: 0.3
        });
        
        const body = new THREE.Mesh(bodyGeo, fishMat);
        body.scale.set(0.5, 1.2, 2.2); // Sleek and powerful profile
        group.add(body);

        // Larger tail for the bigger body
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 3), fishMat);
        tail.position.z = -0.8;
        tail.rotation.x = -Math.PI / 2;
        group.add(tail);

        // Add a dorsal fin
        const finGeo = new THREE.BoxGeometry(0.04, 0.4, 0.6);
        const fin = new THREE.Mesh(finGeo, fishMat);
        fin.position.set(0, 0.45, -0.1);
        // Slightly taper the fin
        const finPos = finGeo.attributes.position;
        for (let i = 0; i < finPos.count; i++) {
            if (finPos.getY(i) > 0) {
                finPos.setZ(i, finPos.getZ(i) - 0.2);
            }
        }
        group.add(fin);

        const z = this.camera.position.z - 20 - Math.random() * 40;
        const x = this.getPathX(z) + (Math.random() - 0.5) * 6;
        
        // Determine if this fish should jump or swim based on rapids
        const rapids = this.getIsRapids(z);
        const shouldJump = rapids > 0.3 || Math.random() > 0.7;
        
        const userData = { 
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 2, 
                shouldJump ? 10 + Math.random() * 5 : 0, 
                -this.uniforms.uSpeed.value - (5 + Math.random() * 5)
            ), 
            age: 0,
            state: shouldJump ? 'jumping' : 'swimming',
            swimPhase: Math.random() * Math.PI * 2
        };
        
        group.userData = userData;
        group.position.set(x, -5.5 + this.getWaterHeight(x, z, this.clock.elapsedTime), z);

        this.scene.add(group);
        this.fish.push(group);
    }

    // =========================================
    // Sky & Environment
    // =========================================

    private getMoonPhase(): number {
        const now = new Date();
        const jd = (now.getTime() / 86400000) + 2440587.5;
        const phase = ((jd - 2451550.1) / 29.5305882) % 1;
        return phase * Math.PI * 2;
    }

    private initSky() {
        // Sun
        const sunGeo = new THREE.SphereGeometry(30, 32, 32); // Larger for distance
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, fog: false });
        this.sun = new THREE.Mesh(sunGeo, sunMat);
        this.scene.add(this.sun);

        // Moon
        const moonGeo = new THREE.SphereGeometry(20, 32, 32); // Larger for distance
        const moonMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.1, fog: false });
        this.moon = new THREE.Mesh(moonGeo, moonMat);
        this.scene.add(this.moon);

        // Light for Moon
        this.moonLight = new THREE.DirectionalLight(0xffffff, 2.0);
        this.scene.add(this.moonLight);
        this.scene.add(this.moonLight.target); // Ensure target is in scene

        // Stars
        const starCount = 1500;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            // Spread stars over a much larger area, but ENSURE they are all very far back
            // relative to the object's origin.
            positions[i * 3] = (Math.random() - 0.5) * 5000;
            positions[i * 3 + 1] = Math.random() * 2000 - 200;
            positions[i * 3 + 2] = -Math.random() * 2000 - 500; // All between 500 and 2500 units away
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 4.0, transparent: true, fog: false }));
        this.scene.add(this.stars);
    }

    private initWeather() {
        const count = 1500;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const vels = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 140;
            positions[i * 3 + 1] = Math.random() * 80;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 140 - 20;
            vels[i] = Math.random() * 0.5 + 0.5;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('velocity', new THREE.BufferAttribute(vels, 1));
        const mat = new THREE.PointsMaterial({
            color: 0xeeeeee,
            size: 0.4,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        this.weatherSystem = new THREE.Points(geo, mat);
        this.scene.add(this.weatherSystem);
    }

    private getAutoBiome(): Biome {
        const now = new Date();
        const month = now.getMonth();
        if (month >= 10 || month <= 1) return 'winter';
        if (month >= 8 && month <= 9) return 'autumn';
        return 'sunny';
    }

    public updateTheme(theme: Theme) {
        this.theme = theme;
        let biome = this.getAutoBiome();
        if (theme === 'dark' && biome === 'sunny') biome = 'rainy';
        this.updateBiome(biome);
    }

    public updateBiome(biome: Biome) {
        this.biome = biome;
        const isDark = biome !== 'sunny';
        const isWinter = biome === 'winter';

        let bgColor = biome === 'rainy' ? '#1e293b' :
            biome === 'winter' ? (this.theme === 'dark' ? '#0f172a' : '#f8fafc') :
                biome === 'autumn' ? (this.theme === 'dark' ? '#451a03' : '#fef3c7') :
                    '#e0f2fe';

        this.scene.background = new THREE.Color(bgColor);
        this.fog.color = new THREE.Color(bgColor);

        // Light intensity
        this.lights.ambient.intensity = isDark ? 0.3 : 0.8;
        this.lights.directional.intensity = isDark ? 0.5 : 1.5;

        // Sky visibility
        const isSunny = biome === 'sunny' || (biome === 'autumn' && this.theme === 'light');
        this.sun.visible = isSunny;
        this.moon.visible = !isSunny;
        this.moonLight.visible = !isSunny;
        this.stars.visible = !isSunny;

        // Weather visibility
        this.weatherSystem.visible = biome === 'rainy' || biome === 'winter';

        // Chunk colors (Simplified update loop)
        this.chunks.forEach(chunk => {
            const terrain = chunk.mesh.children[0] as THREE.Mesh;
            const water = chunk.mesh.children[1] as THREE.Mesh;
            const tMat = terrain.material as THREE.MeshStandardMaterial;
            const wMat = water.material as THREE.MeshPhysicalMaterial;

            if (biome === 'winter') {
                tMat.color.set(0xf1f5f9);
                wMat.color.set(0x38bdf8);
            } else if (biome === 'autumn') {
                tMat.color.set(this.theme === 'dark' ? 0x78350f : 0x92400e);
                wMat.color.set(0x0369a1);
            } else if (biome === 'rainy') {
                tMat.color.set(0x14532d);
                wMat.color.set(0x0f172a);
            } else {
                tMat.color.set(0x22c55e);
                wMat.color.set(0x00A8CC);
            }
        });
    }

    handleResize = () => {
        if (!this.container) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    handleMouseMove = (event: MouseEvent) => {
        // Normalize mouse position from -1 to 1
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    handleScroll = () => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        this.scrollProgress = scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
    }

    // =========================================
    // Main Loop
    // =========================================

    animate = () => {
        if (this.isDisposed) return;
        this.requestID = requestAnimationFrame(this.animate);
        
        // Cap delta to 0.1s to prevent huge jumps when tab is in background
        const delta = Math.min(this.clock.getDelta(), 0.1);
        const elapsed = this.clock.elapsedTime;
        this.uniforms.uTime.value = elapsed;

        this.updateCameraAndControls(elapsed);
        this.updateChunks(delta);
        this.updateEntities(delta, elapsed);
        this.updateWeather(delta);

        this.renderer.render(this.scene, this.camera);
    }

    private updateCameraAndControls(elapsed: number) {
        // Interaction
        this.uniforms.uCurve.value.x = THREE.MathUtils.lerp(this.uniforms.uCurve.value.x, this.mouse.x * 2.0, 0.05);
        this.uniforms.uCurve.value.y = 1.0;

        // Kayakers Logic
        let avgX = 0;
        let avgY = 0;

        this.kayakers.forEach(k => {
            const t = elapsed + k.offset;
            const zGlobal = k.group.position.z;
            const speed = this.uniforms.uSpeed.value;
            const zForSampling = zGlobal - (speed * elapsed);

            // Path following
            const targetX = this.getPathX(zForSampling);
            // Limit lateral movement to river width
            const riverWidth = this.getRiverWidth(zForSampling);

            const mouseSteer = this.mouse.x * 6.0;
            const desiredX = targetX + (Math.sin(t * 0.5) * 2.5) + mouseSteer;

            // Soft clamp to river width
            const clampX = THREE.MathUtils.clamp(desiredX, targetX - riverWidth + 3, targetX + riverWidth - 3);

            k.group.position.x = THREE.MathUtils.lerp(k.group.position.x, clampX, 0.05);

            // Sample Height
            const hCenter = this.getWaterHeight(k.group.position.x, zGlobal, elapsed);
            const hFront = this.getWaterHeight(k.group.position.x, zGlobal - 1.0, elapsed);
            const hBack = this.getWaterHeight(k.group.position.x, zGlobal + 1.0, elapsed);

            k.group.position.y = hCenter;

            // Stats for Camera
            avgX += k.group.position.x;
            avgY += k.group.position.y;

            // Paddle Animation (Rowing stroke)
            k.paddle.rotation.x = Math.sin(t * 3) * 0.8;
            k.paddle.rotation.z = Math.sin(t * 3) * 0.2;

            // Torso Animation (Leaning with the stroke)
            // Since paddle is a child of body, rotating body moves the paddle too!
            k.body.rotation.x = 0.15; // Base forward lean
            k.body.rotation.z = Math.cos(t * 3) * 0.15; // Lean left/right
            k.body.rotation.y = Math.cos(t * 3) * 0.2;  // Twist torso

            // Boat Physics (Pitch/Roll)
            const boatGroup = k.group.children[0];
            const pitch = Math.atan2(hFront - hBack, 2.0);
            const roll = (k.group.position.x - targetX) * -0.05 + Math.sin(t * 4) * 0.05;

            boatGroup.rotation.z = THREE.MathUtils.lerp(boatGroup.rotation.z, roll, 0.1);
            boatGroup.rotation.x = THREE.MathUtils.lerp(boatGroup.rotation.x, pitch, 0.1);
        });

        // Mode Switching
        if (this.isMouseDown && (elapsed - this.mouseDownTime > 2.0)) {
            this.cameraMode = 'default';
        }

        let camTargetX = 0;
        let camTargetY = 0;
        let camTargetZ = 0;
        let lookAtX = 0;
        let lookAtY = 0;
        let lookAtZ = 0;

        if (this.cameraMode === 'fpv' && this.kayakers.length >= 1) {
            // Very last kayaker (closest to camera in default view) is index 0
            const targetK = this.kayakers[0];
            
            // Hide the body and paddle of the kayaker we are "inside"
            this.kayakers.forEach((k, idx) => {
                k.body.visible = (idx !== 0);
            });
            
            // Get the hull group for rotation (pitch/roll)
            const boatGroup = targetK.group.children[0];
            
            // Eye position relative to boat center: Exactly where the head is
            const eyeOffset = new THREE.Vector3(0, -1.3, 1.3); 
            eyeOffset.applyEuler(boatGroup.rotation);
            
            camTargetX = targetK.group.position.x + eyeOffset.x;
            camTargetY = targetK.group.position.y + eyeOffset.y;
            camTargetZ = targetK.group.position.z + eyeOffset.z;
            
            // Look target follows boat rotation
            const lookOffset = new THREE.Vector3(0, -0.2, -15);
            lookOffset.applyEuler(boatGroup.rotation);
            
            lookAtX = camTargetX + lookOffset.x;
            lookAtY = camTargetY + lookOffset.y;
            lookAtZ = camTargetZ + lookOffset.z;
        } else {
            // Restore visibility for everyone
            this.kayakers.forEach(k => k.body.visible = true);
            
            // Default Camera
            avgX /= this.kayakers.length;
            avgY /= this.kayakers.length;
            
            // Lower camera height (reduced offset from previous 8 / 5)
            camTargetX = avgX * 0.5 + this.mouse.x * 5.0;
            camTargetY = Math.max(4 + avgY, avgY + 3.0) + this.mouse.y * 2.0;
            camTargetZ = 15;
            
            lookAtX = avgX * 0.5;
            lookAtY = avgY + 2;
            lookAtZ = -30;
        }

        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, camTargetX, 0.05);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, camTargetY, 0.05);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, camTargetZ, 0.05);

        // Safety check: Terrain Clipping
        // We sample terrain at current camera X/Z, adjusted for river speed
        const speed = this.uniforms.uSpeed.value;
        const zForSampling = this.camera.position.z - (speed * elapsed);
        const terrainH = this.getTerrainHeight(this.camera.position.x, zForSampling) - 5; // -5 is chunk base Y
        const minCamY = terrainH + 1.0; // 1.0 clearance

        if (this.camera.position.y < minCamY) {
            this.camera.position.y = minCamY;
        }

        this.camera.lookAt(lookAtX, lookAtY, lookAtZ);

        // Sky Position Lock (Skybox effect)
        // By following the camera 1:1, these objects appear at infinity (no parallax)
        const skyDist = 1500;
        this.sun.position.set(this.camera.position.x - 400, this.camera.position.y + 500, this.camera.position.z - skyDist);
        this.moon.position.set(this.camera.position.x + 400, this.camera.position.y + 550, this.camera.position.z - skyDist);
        
        this.moonLight.position.copy(this.moon.position).add(new THREE.Vector3(100, 100, 100));
        this.moonLight.target.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z - 200);
        this.moonLight.target.updateMatrixWorld();

        // Since star positions are already -500 to -2500 relative to their origin, 
        // setting the origin to the camera position puts them at the correct distance.
        this.stars.position.copy(this.camera.position);
        this.weatherSystem.position.y = this.camera.position.y - 20;
    }

    private updateChunks(delta: number) {
        const speed = this.uniforms.uSpeed.value;
        
        // Calculate the total drop for one full river cycle (300 units = 60 segments)
        let totalCycleDrop = 0;
        for (let i = 0; i < 60; i++) {
            const noise = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
            totalCycleDrop += 0.1 + noise * 0.4;
        }

        this.chunks.forEach(chunk => {
            chunk.mesh.position.z += speed * delta;
            // Recycling
            if (chunk.mesh.position.z > 90) {
                chunk.mesh.position.z -= TOTAL_RIVER_LENGTH;
                // Since distance is higher (flowing towards us), moving back 300 units 
                // means moving to a section that is HIGHER.
                chunk.mesh.position.y += totalCycleDrop;
            }
        });
    }

    private updateEntities(delta: number, elapsed: number) {
        // Plane Spawning (More frequent)
        if (this.planes.length < 3 && (elapsed - this.lastPlaneTime > 15 + Math.random() * 20)) {
            this.spawnPlane();
            this.lastPlaneTime = elapsed;
        }
        // Update Planes
        for (let i = this.planes.length - 1; i >= 0; i--) {
            const p = this.planes[i];
            p.mesh.position.x += p.speed * delta;
            if (Math.abs(p.mesh.position.x) > 200) {
                this.scene.remove(p.mesh);
                this.planes.splice(i, 1);
            }
        }

        // Bird Spawning
        if (this.birds.length < 8 && (elapsed - this.lastBirdTime > 4 + Math.random() * 6)) {
            this.spawnBird();
            this.lastBirdTime = elapsed;
        }
        // Update Birds
        for (let i = this.birds.length - 1; i >= 0; i--) {
            const b = this.birds[i];
            b.mesh.position.x += b.speed * delta;
            const wingAngle = Math.sin(elapsed * b.wingSpeed) * 0.8;
            b.mesh.children[0].rotation.z = wingAngle;
            b.mesh.children[1].rotation.z = -wingAngle;
            if (Math.abs(b.mesh.position.x) > 150) {
                this.scene.remove(b.mesh);
                this.birds.splice(i, 1);
            }
        }

        // Fish Spawning
        if (this.fish.length < 15 && (elapsed - this.lastFishTime > 1.0 + Math.random() * 2.0)) {
            this.spawnFish();
            this.lastFishTime = elapsed;
        }
        // Update Fish
        for (let i = this.fish.length - 1; i >= 0; i--) {
            const f = this.fish[i];
            const ud = f.userData;
            ud.age += delta;
            
            const waterY = -5.5 + this.getWaterHeight(f.position.x, f.position.z, elapsed);

            if (ud.state === 'jumping') {
                ud.velocity.y -= 25 * delta; // Gravity
                f.position.x += ud.velocity.x * delta;
                f.position.y += ud.velocity.y * delta;
                f.position.z += ud.velocity.z * delta;

                // Orientation: look in direction of velocity
                f.lookAt(f.position.x + ud.velocity.x, f.position.y + ud.velocity.y, f.position.z + ud.velocity.z);
                
                // Remove if it falls back into water
                if (f.position.y < waterY && ud.velocity.y < 0 && ud.age > 0.2) {
                    this.scene.remove(f);
                    this.fish.splice(i, 1);
                    continue;
                }
            } else {
                // Swimming logic
                ud.swimPhase += delta * 10;
                
                // Move upstream relative to water flow
                f.position.z += ud.velocity.z * delta;
                f.position.x += Math.sin(ud.swimPhase * 0.5) * 2 * delta;
                
                // Stay at water surface, slightly submerged
                f.position.y = THREE.MathUtils.lerp(f.position.y, waterY - 0.2, 0.1);
                
                // Orientation: look slightly side-to-side while swimming
                const targetLookAt = new THREE.Vector3(
                    f.position.x + Math.sin(ud.swimPhase * 0.5),
                    f.position.y,
                    f.position.z - 5
                );
                f.lookAt(targetLookAt);
            }

            // Tail wagging
            f.children[1].rotation.z = Math.sin(ud.age * 25) * 0.5;

            // Remove if too far behind or ahead
            if (f.position.z > this.camera.position.z + 20 || f.position.z < this.camera.position.z - 100) {
                this.scene.remove(f);
                this.fish.splice(i, 1);
            }
        }
    }

    private updateWeather(delta: number) {
        if (!this.weatherSystem.visible) return;

        const positions = this.weatherSystem.geometry.attributes.position.array as Float32Array;
        const vels = this.weatherSystem.geometry.attributes.velocity.array as Float32Array;
        const count = positions.length / 3;
        const fallSpeed = this.biome === 'rainy' ? 40 : 10;
        const windX = this.biome === 'rainy' ? -5 : 2;

        for (let i = 0; i < count; i++) {
            positions[i * 3] += windX * delta;
            positions[i * 3 + 1] -= fallSpeed * vels[i] * delta;
            if (positions[i * 3 + 1] < 0) {
                positions[i * 3 + 1] = 80;
                positions[i * 3] = (Math.random() - 0.5) * 140 + (this.camera.position.x - this.weatherSystem.position.x);
                positions[i * 3 + 2] = (Math.random() - 0.5) * 140 - 20 + (this.camera.position.z - this.weatherSystem.position.z);
            }
        }
        this.weatherSystem.geometry.attributes.position.needsUpdate = true;
    }

    dispose() {
        this.isDisposed = true;
        if (this.requestID) cancelAnimationFrame(this.requestID);
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('touchstart', this.handleMouseDown);
        window.removeEventListener('touchend', this.handleMouseUp);
        window.removeEventListener('dblclick', this.handleDoubleClick);
        if (this.container && this.renderer.domElement.parentNode === this.container) {
            this.container.removeChild(this.renderer.domElement);
        }
        this.renderer.dispose();
    }
}
