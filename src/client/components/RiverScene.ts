import * as THREE from 'three';

type Theme = 'light' | 'dark';
export type Biome = 'sunny' | 'rainy' | 'winter' | 'autumn';

interface KayakerState {
    group: THREE.Group;
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
        this.fog = new THREE.Fog(0x020617, 20, 180);
        this.scene.fog = this.fog;

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 250);
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
        
        this.animate();
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
        const dropPerUnit = 0.2;
        // "Pool and Drop" river profile.
        // Base linear slope + Sine wave = Staircase-like effect
        // High variation creates "flats" (pools) and "steeps" (drops/rapids).
        // Period 60 matches the chunk size nicely.
        const k = 2 * Math.PI / 60;
        const organicSteps = Math.sin(z * k) * 3.0;
        
        return z * dropPerUnit + organicSteps;
    }

    private getIsRapids(z: number): number {
        // Calculate slope derivative to find rapids
        // h(z) = 0.2z + 3sin(kz)
        // h'(z) = 0.2 + 3k*cos(kz)
        const k = 2 * Math.PI / 60;
        // 3 * k approx 0.31. 
        // Slope ranges from 0.2 - 0.31 (-0.11, upstream/eddy) to 0.2 + 0.31 (0.51, steep).
        
        const slope = 0.2 + 3.0 * k * Math.cos(z * k);
        
        // If slope > 0.35, it's a rapid.
        const rapidIntensity = THREE.MathUtils.smoothstep(slope, 0.3, 0.5);
        
        // Add some noise rapids in other areas
        const noise = Math.sin(z * 0.5) * Math.cos(z * 0.1);
        const texture = Math.max(0, noise * 0.3);
        
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
        const kw = 2 * Math.PI / 300;

        const slopeHeight = this.getRiverSlopeHeight(zForSampling);
        const rapids = this.getIsRapids(zForSampling);
        const riverX = this.getPathX(zForSampling);
        const xLocal = xGlobal - riverX;

        // Static noise (standing waves)
        const staticIntensity = 0.5 + rapids * 3.0;
        let staticNoise = Math.sin(xLocal * 0.8) * 0.15 + Math.cos(zForSampling * kw * 30.0) * 0.15;
        staticNoise += Math.cos(xLocal * 0.4 - zForSampling * kw * 15.0) * 0.1;

        // Dynamic waves
        const waveIntensity = 0.4 + (rapids * 2.0);
        let dynamicWave = Math.sin(xGlobal * 0.8 + zForSampling * 0.2 + elapsed * 2.0) * 0.15;
        dynamicWave += Math.cos(zForSampling * (kw * 30.0) + elapsed * 1.5) * 0.15;
        
        // Match Shader Curvature
        const zRel = zGlobal - 15.0;
        let curveDrop = 0;
        if (zRel < 0) {
            curveDrop = (zRel * zRel * 0.00003) * 3.0; // 3.0 match shader multiplier
        }

        return slopeHeight + (staticNoise * staticIntensity) + (dynamicWave * waveIntensity) - curveDrop;
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
                ${shader.vertexShader}
            `;

            const waveCode = isWater ? `
                float k_s = 2.0 * 3.14159 / 60.0; // Matches physical period
                float kw = 2.0 * 3.14159 / 300.0;
                float zRiver = worldPos.z - uTime * uSpeed;
                
                // Rapids logic: based on slope derivative approx (cosine)
                // We want foam where slope is steep.
                // Our height function has sin(z * k). Slope has cos(z * k).
                // Max slope at cos = 1.
                
                float slope_deriv = 0.2 + 0.3 * cos(zRiver * k_s);
                float r_val = smoothstep(0.35, 0.5, slope_deriv);
                
                float waveIntensity = 0.4 + (r_val * 2.5);

                // Waves
                float wave = sin(worldPos.x * 0.8 + zRiver * 0.2 + uTime * 2.0) * 0.15;
                wave += cos(zRiver * (kw * 30.0) + uTime * 1.5) * 0.15;
                wave += sin(worldPos.x * 1.5 + zRiver * (kw * 60.0) + uTime * 3.0) * 0.05;
                
                transformed.z += wave * waveIntensity;
                
                // Foam Base
                float foamBase = 0.4 + smoothstep(0.1, 0.25, wave * waveIntensity) * 0.6;
                vFoam = r_val * foamBase;
            ` : '';

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vec4 worldPos = modelMatrix * vec4(transformed, 1.0);
                float zRel = worldPos.z - 15.0; 
                if (zRel < 0.0) {
                    float curveFactor = zRel * zRel * 0.00003; 
                    transformed.z -= curveFactor * (2.0 + uCurve.y); 
                    transformed.x += curveFactor * uCurve.x * 20.0;
                }
                ${waveCode}
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
                    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), vFoam * 0.6);
                    diffuseColor.a = mix(diffuseColor.a, 1.0, vFoam * 0.5);
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
            
            // Place rocks either in river or on banks
            const inRiver = Math.random() > 0.4;
            const offset = inRiver 
                ? (Math.random() - 0.5) * width * 0.8 
                : (Math.random() > 0.5 ? 1 : -1) * (width + 2 + Math.random() * 5);
                
            const pX = riverX + offset;

            const rockGeo = new THREE.DodecahedronGeometry(Math.random() * 0.8 + 0.5, 0);
            const rockMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.8 });
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

        // Hull
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

        // Cockpit
        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(0.25, 0.03, 8, 16),
            new THREE.MeshStandardMaterial({ color: 0x111111 })
        );
        rim.rotation.x = -Math.PI / 2;
        rim.position.set(0, 0.45, 0);
        rim.scale.set(1, 1.5, 1);
        group.add(rim);

        // Paddler
        const bodyMat = new THREE.MeshStandardMaterial({ color: paddlerColor });
        this.modifyMaterial(bodyMat);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.55, 8), bodyMat);
        body.position.set(0, 0.6, 0);
        group.add(body);

        const headMat = new THREE.MeshStandardMaterial({ color: 0xf5d0a9 });
        this.modifyMaterial(headMat);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), headMat);
        head.position.set(0, 1.0, 0);
        group.add(head);

        // Paddle - Fixed Geometry
        const paddleGroup = new THREE.Group();
        // Lowered position to be closer to hands/water. Adjusted Z to be in front of body.
        paddleGroup.position.set(0, 0.7, 0.3);

        const shaftMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        this.modifyMaterial(shaftMat);
        // Thicker shaft
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 8), shaftMat);
        shaft.rotation.z = Math.PI / 2;
        paddleGroup.add(shaft);

        const bladeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.DoubleSide });
        this.modifyMaterial(bladeMat);
        const bladeGeo = new THREE.BoxGeometry(0.6, 0.35, 0.05);

        const leftBlade = new THREE.Mesh(bladeGeo, bladeMat);
        leftBlade.position.set(-1.4, 0, 0);
        paddleGroup.add(leftBlade);

        const rightBlade = new THREE.Mesh(bladeGeo, bladeMat);
        rightBlade.position.set(1.4, 0, 0);
        rightBlade.rotation.x = Math.PI / 2; // Feathered
        paddleGroup.add(rightBlade);

        group.add(paddleGroup);

        const wrapper = new THREE.Group();
        wrapper.position.set(...pos); 
        wrapper.add(group);
        return { wrapper, paddle: paddleGroup, offset };
    }

    private initKayakers() {
        const wrapper = new THREE.Group();
        wrapper.position.y = -5.5; // Base water level

        const colors = [
            ['#D97706', '#ef4444'], ['#68246D', '#22c55e'], ['#0ea5e9', '#f59e0b'],
            ['#be185d', '#f472b6'], ['#15803d', '#86efac'], ['#b91c1c', '#fca5a5']
        ];

        for (let i = 0; i < 6; i++) {
            const z = -2 - (i * 3);
            const x = (i % 2 === 0 ? 1 : -1) * (1.5 + Math.random());
            const c = colors[i % colors.length];
            // Offset logic for animation phase
            const k = this.createKayaker([x, 0, z], c[0], c[1], i * 1.5);
            wrapper.add(k.wrapper);
            this.kayakers.push({ group: k.wrapper, paddle: k.paddle, offset: i * 1.5 });
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
        const bodyGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const fishMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });
        const body = new THREE.Mesh(bodyGeo, fishMat);
        body.scale.set(0.6, 1, 1.8);
        group.add(body);

        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 3), fishMat);
        tail.position.z = 0.4;
        tail.rotation.x = Math.PI / 2;
        group.add(tail);

        const z = this.camera.position.z - 15 - Math.random() * 30; // Closer spawn range
        const x = this.getPathX(z) + (Math.random() - 0.5) * 4;
        group.position.set(x, -2, z); // Start slightly submerged

        const userData = { velocity: new THREE.Vector3(0, 12, 0), age: 0 }; // Higher jump
        group.userData = userData;

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
        const sunGeo = new THREE.SphereGeometry(3, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
        this.sun = new THREE.Mesh(sunGeo, sunMat);
        this.scene.add(this.sun);

        // Moon
        const moonGeo = new THREE.SphereGeometry(2, 32, 32);
        const moonMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.1 });
        this.moon = new THREE.Mesh(moonGeo, moonMat);
        this.scene.add(this.moon);

        // Light for Moon
        this.moonLight = new THREE.DirectionalLight(0xffffff, 2.0);
        this.scene.add(this.moonLight);

        // Stars
        const starCount = 500;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 300;
            positions[i * 3 + 1] = Math.random() * 100 + 10;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 300 - 50;
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true }));
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
        this.requestID = requestAnimationFrame(this.animate);
        const delta = this.clock.getDelta();
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

            // Paddle Animation
            k.paddle.rotation.x = Math.sin(t * 3) * 0.8;
            k.paddle.rotation.z = Math.sin(t * 3) * 0.2;

            // Boat Physics (Pitch/Roll)
            const boatGroup = k.group.children[0];
            const pitch = Math.atan2(hFront - hBack, 2.0);
            const roll = (k.group.position.x - targetX) * -0.05 + Math.sin(t * 4) * 0.05;

            boatGroup.rotation.z = THREE.MathUtils.lerp(boatGroup.rotation.z, roll, 0.1);
            boatGroup.rotation.x = THREE.MathUtils.lerp(boatGroup.rotation.x, pitch, 0.1);
        });

        // Camera Follow
        avgX /= this.kayakers.length;
        avgY /= this.kayakers.length;
        
        const camTargetX = avgX * 0.5 + this.mouse.x * 5.0;
        const camTargetY = Math.max(8 + avgY, avgY + 5.0) + this.mouse.y * 2.0;
        
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, camTargetX, 0.05);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, camTargetY, 0.05);
        this.camera.lookAt(avgX * 0.5, avgY + 2, -30);

        // Sky Position Lock (Skybox effect)
        this.sun.position.set(this.camera.position.x - 20, this.camera.position.y + 25, this.camera.position.z - 80);
        this.moon.position.set(this.camera.position.x + 20, this.camera.position.y + 30, this.camera.position.z - 80);
        this.moonLight.position.copy(this.moon.position).add(new THREE.Vector3(5, 5, 5));
        this.moonLight.target = this.moon;
        this.stars.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z - 20);
        this.weatherSystem.position.y = this.camera.position.y - 20;
    }

    private updateChunks(delta: number) {
        const speed = this.uniforms.uSpeed.value;
        this.chunks.forEach(chunk => {
            chunk.mesh.position.z += speed * delta;
            // Recycling
            if (chunk.mesh.position.z > 90) {
                chunk.mesh.position.z -= TOTAL_RIVER_LENGTH;
                // Since our slope is relative to z, we just move it back.
                // But the mesh slope height is baked in `getRiverSlopeHeight(zInitial)`.
                // When we recycle, we are NOT regenerating the mesh geometry.
                // We are just moving the group.
                // BUT the terrain function `0.2 * z` is linear.
                // Moving back 300 units means the "physical" height at new Z is lower.
                // The mesh group needs to be lowered to match the continuity.
                // Drop over 300 units = 300 * 0.2 = 60.
                chunk.mesh.position.y -= 60;
            }
        });
    }

    private updateEntities(delta: number, elapsed: number) {
        // Plane Spawning (More frequent)
        if (elapsed - this.lastPlaneTime > 15 + Math.random() * 20) {
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
        if (elapsed - this.lastBirdTime > 4 + Math.random() * 6) {
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
        if (elapsed - this.lastFishTime > 1.0 + Math.random() * 2.0) {
            this.spawnFish();
            this.lastFishTime = elapsed;
        }
        // Update Fish
        for (let i = this.fish.length - 1; i >= 0; i--) {
            const f = this.fish[i];
            const ud = f.userData;
            ud.age += delta;
            ud.velocity.y -= 25 * delta; // Gravity
            f.position.y += ud.velocity.y * delta;
            
            f.lookAt(f.position.x, f.position.y + ud.velocity.y, f.position.z - 5);
            f.children[1].rotation.z = Math.sin(elapsed * 25) * 0.5; // Tail

            // Remove if deep underwater
            const waterY = -5.5 + this.getWaterHeight(f.position.x, f.position.z, elapsed);
            if (f.position.y < waterY - 2.0 && ud.velocity.y < 0) {
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
        if (this.requestID) cancelAnimationFrame(this.requestID);
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('scroll', this.handleScroll);
        if (this.container && this.renderer.domElement.parentNode === this.container) {
            this.container.removeChild(this.renderer.domElement);
        }
        this.renderer.dispose();
    }
}
