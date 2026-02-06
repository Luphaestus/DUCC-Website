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

export class RiverScene {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    container: HTMLElement;
    
    theme: Theme = 'dark';
    biome: Biome = 'sunny';

    chunks: ChunkState[] = [];
    kayakers: KayakerState[] = [];
    planes: { mesh: THREE.Group, speed: number }[] = [];
    birds: { mesh: THREE.Group, speed: number, wingSpeed: number }[] = [];
    lastPlaneTime: number = 0;
    lastBirdTime: number = 0;
    
    clock: THREE.Clock;
    requestID: number | null = null;
    
    uniforms: {
        uTime: { value: number };
        uCurve: { value: THREE.Vector2 };
        uSpeed: { value: number };
        uWeather: { value: number };
    };
    
    lights: {
        ambient: THREE.AmbientLight;
        directional: THREE.DirectionalLight;
        point: THREE.PointLight;
    };
    
    fog: THREE.Fog;
    materials: THREE.Shader[] = [];

    // Sky Elements
    sun!: THREE.Mesh;
    moon!: THREE.Mesh;
    moonLight!: THREE.DirectionalLight;
    stars!: THREE.Points;
    weatherSystem!: THREE.Points;
    
    // Mouse state for parallax
    mouse: { x: number; y: number } = { x: 0, y: 0 };
    targetCameraOffset: { x: number; y: number } = { x: 0, y: 0 };

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

        this.scene = new THREE.Scene();
        this.fog = new THREE.Fog(0x020617, 20, 180);
        this.scene.fog = this.fog;

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 250);
        this.camera.position.set(0, 6, 15);
        this.camera.lookAt(0, 2, -30);

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

        this.lights = {
            ambient: new THREE.AmbientLight(0xffffff, 0.2),
            directional: new THREE.DirectionalLight(0x818cf8, 0.5),
            point: new THREE.PointLight(0x00A8CC, 0.8, 20)
        };
        
        this.lights.directional.position.set(-10, 20, -5);
        this.lights.directional.castShadow = true;
        this.lights.point.position.set(-10, 5, 0);

        this.scene.add(this.lights.ambient);
        this.scene.add(this.lights.directional);
        this.scene.add(this.lights.point);

        this.initSky();
        this.initWeather();
        this.initChunks();
        this.initKayakers();
        
        // Initial setup
        this.updateTheme(theme);

        window.addEventListener('resize', this.handleResize);
        window.addEventListener('mousemove', this.handleMouseMove);
        this.animate();
    }

    handleMouseMove = (event: MouseEvent) => {
        // Normalize mouse position from -1 to 1
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

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
                float k_s = 2.0 * 3.14159 / 100.0;
                float kw = 2.0 * 3.14159 / 300.0;
                float zRiver = worldPos.z - uTime * uSpeed;
                
                // Rapids logic locked to terrain
                float s_val = abs(0.2 + 0.2 * cos(zRiver * k_s));
                float r_val = clamp((s_val - 0.2) * 5.0, 0.0, 1.0);
                float waveIntensity = 0.4 + (r_val * 2.0);

                // Waves relative to flow
                float wave = sin(worldPos.x * 0.8 + zRiver * 0.2 + uTime * 2.0) * 0.15;
                wave += cos(zRiver * (kw * 30.0) + uTime * 1.5) * 0.15;
                wave += sin(worldPos.x * 1.5 + zRiver * (kw * 60.0) + uTime * 3.0) * 0.05;
                wave += cos(worldPos.x * 0.4 - zRiver * (kw * 15.0) + uTime * 1.0) * 0.1;
                transformed.z += wave * waveIntensity;
                
                // Foam is only visible on rapids (steep downslopes)
                // We use r_val as a mask for the wave-based foam
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
                    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), vFoam * 0.5);
                    diffuseColor.a = mix(diffuseColor.a, 1.0, vFoam * 0.4);
                    `
                );
            }
        };
    }

    private getPathX(z: number): number {
        const k = 2 * Math.PI / 300;
        return Math.sin(z * k * 2) * 6.0 + Math.cos(z * k) * 3.0;
    }

    private getRiverSlopeHeight(z: number): number {
        const k = 2 * Math.PI / 100; // Period 100
        const dropPerUnit = 0.2;
        // Monotonic descent: h(z) = -0.2z + (0.2/k)sin(kz)
        // h'(z) = -0.2 + 0.2cos(kz). Range [-0.4, 0].
        return z * dropPerUnit + Math.sin(z * k) * (dropPerUnit / k);
    }

    private getIsRapids(z: number): number {
        const k = 2 * Math.PI / 100;
        const dropPerUnit = 0.2;
        // Derivative of (0.2z + A*sin(kz)) is 0.2 + A*k*cos(kz).
        // With A = 0.2/k, deriv = 0.2 + 0.2*cos(kz).
        // Range: 0.0 to 0.4.
        const slope = dropPerUnit + dropPerUnit * Math.cos(z * k);
        return THREE.MathUtils.clamp((slope - 0.2) * 5.0, 0, 1);
    }

    private getTerrainHeight(x: number, z: number): number {
        const k = 2 * Math.PI / 300;
        const riverCenterX = this.getPathX(z);
        const distFromCenter = Math.abs(x - riverCenterX);
        const rapids = this.getIsRapids(z);
        const slopeHeight = this.getRiverSlopeHeight(z);
        
        let height = 0;
        if (distFromCenter < 14) {
            height = -4; 
            // Turbulence correlated with rapids
            height += (Math.sin(x * 1.5) * 1.0 + Math.cos(z * k * 120) * 1.0) * rapids;
            // Small constant ripples
            height += Math.sin(x * 0.5 + z * k * 10) * 0.1;
        } else {
            const slope = 0.8;
            height = 2 + (distFromCenter - 14) * slope;
            const noise = Math.sin(x * 0.3) + Math.cos(z * k * 10);
            const biomeMix = Math.sin(z * k) * 0.5 + 0.5;
            height += noise * THREE.MathUtils.lerp(1.5, 4.0, biomeMix);
        }
        return height + slopeHeight;
    }

    private createRiverChunk(zOffset: number): ChunkState {
        const group = new THREE.Group();
        group.position.set(0, -5, zOffset);

        const width = 120;
        const length = 60;
        const widthSegments = 64;
        const lengthSegments = 120; 
        
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
        
        const waterGeo = new THREE.PlaneGeometry(28, 60, 32, 60);
        const waterPos = waterGeo.getAttribute('position');
        for (let i = 0; i < waterPos.count; i++) {
            const zGlobal = zOffset - waterPos.getY(i);
            const xLocal = waterPos.getX(i);
            const riverCenterX = this.getPathX(zGlobal);
            const slopeHeight = this.getRiverSlopeHeight(zGlobal);
            const rapids = this.getIsRapids(zGlobal);
            
            waterPos.setX(i, xLocal + riverCenterX);
            
            // Wavier on steep drops, smoother on flat water
            const kw = 2 * Math.PI / 300;
            const waveIntensity = 0.5 + rapids * 3.0;
            let noise = Math.sin(xLocal * 0.8) * 0.15 + Math.cos(zGlobal * kw * 30.0) * 0.15;
            noise += Math.sin(xLocal * 1.5 + zGlobal * kw * 60.0) * 0.05;
            noise += Math.cos(xLocal * 0.4 - zGlobal * kw * 15.0) * 0.1;
            
            waterPos.setZ(i, slopeHeight + noise * waveIntensity);
        }
        const waterMat = new THREE.MeshPhysicalMaterial({
            transparent: true,
            opacity: 0.8,
            metalness: 0.5,
            clearcoat: 1
        });
        this.modifyMaterial(waterMat, true);
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = -0.5;
        group.add(water);

        for (let k = 0; k < 12; k++) {
            const pZLocal = (Math.random() - 0.5) * 60;
            const pZGlobal = pZLocal + zOffset;
            const pX = this.getPathX(pZGlobal) + (Math.random() > 0.5 ? 1 : -1) * (22 + Math.random() * 20);
            
            const h = this.getTerrainHeight(pX, pZGlobal);
            const treeMat = new THREE.MeshStandardMaterial({ color: 0x064e3b });
            this.modifyMaterial(treeMat);
            const tree = new THREE.Mesh(new THREE.ConeGeometry(1.5, 6, 8), treeMat);
            tree.position.set(pX, h + 3, pZLocal);
            group.add(tree);
        }

        this.scene.add(group);
        return { mesh: group, zInitial: zOffset };
    }

    private initChunks() {
        const CHUNK_SIZE = 60;
        const NUM_CHUNKS = 5; 
        for (let i = 0; i < NUM_CHUNKS; i++) {
            this.chunks.push(this.createRiverChunk(-i * CHUNK_SIZE));
        }
    }

    private getMoonPhase(): number {
        const now = new Date();
        let year = now.getFullYear();
        let month = now.getMonth();
        const day = now.getDate();
        
        let c = 0;
        let e = 0;
        let jd = 0;
        let b = 0;

        if (month < 3) {
            year--;
            month += 12;
        }

        ++month;
        c = 365.25 * year;
        e = 30.6 * month;
        jd = c + e + day - 694039.09; 
        jd /= 29.5305882; 
        b = parseInt(jd.toString()); 
        jd -= b; 
        b = Math.round(jd * 8); 

        if (b >= 8 ) b = 0; 
        return jd * Math.PI * 2;
    }

    private initSky() {
        // Sun
        const sunGeo = new THREE.SphereGeometry(3, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
        this.sun = new THREE.Mesh(sunGeo, sunMat);
        this.sun.position.set(-20, 25, -60);
        this.scene.add(this.sun);

        // Moon
        const moonGeo = new THREE.SphereGeometry(2, 32, 32);
        const moonMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, 
            roughness: 0.9,
            metalness: 0.1 
        });
        this.moon = new THREE.Mesh(moonGeo, moonMat);
        this.moon.position.set(20, 30, -50);
        this.scene.add(this.moon);

        // Light for Moon Phase
        this.moonLight = new THREE.DirectionalLight(0xffffff, 2.0);
        this.scene.add(this.moonLight);
        const phaseAngle = this.getMoonPhase();
        this.moonLight.position.set(
            this.moon.position.x + Math.sin(phaseAngle) * 10,
            this.moon.position.y,
            this.moon.position.z + Math.cos(phaseAngle) * 10
        );
        this.moonLight.target = this.moon;

        // Stars
        const starCount = 500;
        const starGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        for(let i = 0; i < starCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 300;
            positions[i * 3 + 1] = Math.random() * 100 + 10;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 300 - 50;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.8 });
        this.stars = new THREE.Points(starGeo, starMat);
        this.scene.add(this.stars);
    }

    private initWeather() {
        const count = 1500;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const vels = new Float32Array(count);

        for(let i = 0; i < count; i++) {
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
            wingSpeed: 5 + Math.random() * 5
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

    private createKayaker(pos: [number, number, number], color: string, paddlerColor: string, offset: number) {
        const group = new THREE.Group();
        group.position.set(...pos);
        const points = [];
        points.push(new THREE.Vector2(0, -2.2)); 
        points.push(new THREE.Vector2(0.25, -1.5));
        points.push(new THREE.Vector2(0.35, 0)); 
        points.push(new THREE.Vector2(0.25, 1.5));
        points.push(new THREE.Vector2(0, 2.2)); 
        const hullGeo = new THREE.LatheGeometry(points, 12);
        const hullMat = new THREE.MeshStandardMaterial({ color, roughness: 0.1 });
        this.modifyMaterial(hullMat);
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.rotation.x = -Math.PI / 2; 
        hull.scale.set(1, 1, 0.5); 
        hull.position.y = 0.2;
        hull.castShadow = true;
        group.add(hull);
        const rimGeo = new THREE.TorusGeometry(0.25, 0.03, 8, 16);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = -Math.PI / 2;
        rim.position.set(0, 0.45, 0);
        rim.scale.set(1, 1.5, 1);
        group.add(rim);
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
        const paddleGroup = new THREE.Group();
        paddleGroup.position.set(0, 0.8, 0);
        const shaftMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        this.modifyMaterial(shaftMat);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8), shaftMat);
        shaft.rotation.z = Math.PI / 2;
        paddleGroup.add(shaft);
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
        this.modifyMaterial(bladeMat);
        const leftBlade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.05), bladeMat);
        leftBlade.position.set(-1.3, 0, 0);
        paddleGroup.add(leftBlade);
        const rightBlade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.05), bladeMat);
        rightBlade.position.set(1.3, 0, 0);
        rightBlade.rotation.x = Math.PI / 4;
        paddleGroup.add(rightBlade);
        group.add(paddleGroup);
        const wrapper = new THREE.Group();
        wrapper.add(group);
        return { wrapper, paddle: paddleGroup, offset };
    }

    private initKayakers() {
        const wrapper = new THREE.Group();
        wrapper.position.y = -5.5; 
        const k1 = this.createKayaker([3, 0, -5], '#D97706', '#ef4444', 0);
        const k2 = this.createKayaker([-2, 0, -2], '#68246D', '#22c55e', 2);
        const k3 = this.createKayaker([1.5, 0, -8], '#0ea5e9', '#f59e0b', 4);
        wrapper.add(k1.wrapper);
        wrapper.add(k2.wrapper);
        wrapper.add(k3.wrapper);
        this.scene.add(wrapper);
        this.kayakers.push({ group: k1.wrapper, paddle: k1.paddle, offset: 0 });
        this.kayakers.push({ group: k2.wrapper, paddle: k2.paddle, offset: 2 });
        this.kayakers.push({ group: k3.wrapper, paddle: k3.paddle, offset: 4 });
    }

    private getAutoBiome(): Biome {
        const now = new Date();
        const month = now.getMonth(); 
        const day = now.getDate();
        if (month === 10 && day >= 15) return 'winter';
        if (month === 11 || month === 0 || month === 1) return 'winter';
        if (month === 8 || month === 9) return 'autumn';
        if (month === 10 && day < 15) return 'autumn';
        return 'sunny';
    }

    public updateTheme(theme: Theme) {
        this.theme = theme;
        const seasonalBiome = this.getAutoBiome();
        if (theme === 'dark' && seasonalBiome === 'sunny') {
            this.updateBiome('rainy');
        } else {
            this.updateBiome(seasonalBiome);
        }
    }
    
    public updateBiome(biome: Biome) {
        this.biome = biome;
        const isDark = biome !== 'sunny';
        const isWinter = biome === 'winter';
        const isAutumn = biome === 'autumn';
        
        let bgColor = '#e0f2fe'; 
        if (biome === 'rainy') bgColor = '#1e293b';
        if (biome === 'winter') bgColor = '#f8fafc'; 
        if (biome === 'autumn') bgColor = '#fef3c7'; 
        if (this.theme === 'dark' && biome === 'winter') bgColor = '#0f172a'; 
        if (this.theme === 'dark' && biome === 'autumn') bgColor = '#451a03'; 

        const fogColor = new THREE.Color(bgColor);
        this.fog.color = fogColor;
        this.scene.background = fogColor;
        this.lights.ambient.intensity = isDark ? 0.3 : 0.8;
        this.lights.directional.intensity = isDark ? 0.5 : 1.5;
        this.lights.directional.color.set(isWinter ? '#cceeff' : (isAutumn ? '#fbbf24' : (isDark ? '#818cf8' : '#fff7ed')));

        if (biome === 'sunny' || (biome === 'autumn' && this.theme === 'light')) {
            this.sun.visible = true;
            this.moon.visible = false;
            this.moonLight.visible = false;
            this.stars.visible = false;
        } else {
            this.sun.visible = false;
            this.moon.visible = true;
            this.moonLight.visible = true;
            this.stars.visible = true;
        }

        this.weatherSystem.visible = biome === 'rainy' || biome === 'winter';
        const weatherMat = this.weatherSystem.material as THREE.PointsMaterial;
        if (biome === 'rainy') {
            weatherMat.color.set(0x94a3b8);
            weatherMat.size = 0.5;
            weatherMat.opacity = 0.6;
        } else if (biome === 'winter') {
            weatherMat.color.set(0xffffff);
            weatherMat.size = 0.8;
            weatherMat.opacity = 0.8;
        }

        this.chunks.forEach(chunk => {
            const terrain = chunk.mesh.children[0] as THREE.Mesh;
            const water = chunk.mesh.children[1] as THREE.Mesh;
            let tColor = '#22c55e'; 
            if (biome === 'rainy') tColor = '#14532d'; 
            if (biome === 'winter') tColor = '#f1f5f9'; 
            if (biome === 'autumn') tColor = '#92400e'; 
            if (this.theme === 'dark' && biome === 'winter') tColor = '#cbd5e1'; 
            if (this.theme === 'dark' && biome === 'autumn') tColor = '#78350f'; 
            
            let wColor = '#00A8CC';
            if (biome === 'rainy') wColor = '#0f172a'; 
            if (biome === 'winter') wColor = '#38bdf8'; 
            if (biome === 'autumn') wColor = '#0369a1'; 

            (terrain.material as THREE.MeshStandardMaterial).color.set(tColor);
            (water.material as THREE.MeshPhysicalMaterial).color.set(wColor);
            
            for(let i=2; i<chunk.mesh.children.length; i++) {
                const tree = chunk.mesh.children[i] as THREE.Mesh;
                if (!tree || !tree.material) continue;
                const mat = tree.material as THREE.MeshStandardMaterial;
                if (!mat.color) continue;
                if (biome === 'winter') mat.color.set(0xffffff); 
                else if (biome === 'autumn') {
                    const colors = [0xb91c1c, 0xc2410c, 0xd97706, 0xeab308];
                    mat.color.set(colors[Math.floor(Math.random() * colors.length)]);
                }
                else if (biome === 'rainy') mat.color.set(0x064e3b);
                else mat.color.set(0x15803d);
            }
        });
    }

    handleResize = () => {
        if (!this.container) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate = () => {
        this.requestID = requestAnimationFrame(this.animate);
        const delta = this.clock.getDelta();
        const elapsed = this.clock.elapsedTime;
        this.uniforms.uTime.value = elapsed;

        const speed = this.uniforms.uSpeed.value;
        const CHUNK_SIZE = 60;
        const TOTAL_SIZE = CHUNK_SIZE * 5;
        
        if (elapsed - this.lastPlaneTime > 20 + Math.random() * 40) {
            this.spawnPlane();
            this.lastPlaneTime = elapsed;
        }
        for (let i = this.planes.length - 1; i >= 0; i--) {
            const p = this.planes[i];
            p.mesh.position.x += p.speed * delta;
            if (Math.abs(p.mesh.position.x) > 200) {
                this.scene.remove(p.mesh);
                this.planes.splice(i, 1);
            }
        }

        if (elapsed - this.lastBirdTime > 5 + Math.random() * 10) {
            this.spawnBird();
            this.lastBirdTime = elapsed;
        }
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

        this.chunks.forEach(chunk => {
            chunk.mesh.position.z += speed * delta;
             if (chunk.mesh.position.z > 90) { 
                chunk.mesh.position.z -= TOTAL_SIZE;
                chunk.mesh.position.y -= TOTAL_SIZE * 0.2;
            }
        });
        
        if (this.weatherSystem.visible) {
            const positions = this.weatherSystem.geometry.attributes.position.array as Float32Array;
            const vels = this.weatherSystem.geometry.attributes.velocity.array as Float32Array;
            const count = positions.length / 3;
            const fallSpeed = this.biome === 'rainy' ? 40 : 10; 
            const windX = this.biome === 'rainy' ? -5 : 2; 

            for(let i=0; i<count; i++) {
                positions[i*3] += windX * delta; 
                positions[i*3 + 1] -= fallSpeed * vels[i] * delta; 
                if (positions[i*3 + 1] < 0) {
                    positions[i*3 + 1] = 80;
                    positions[i*3] = (Math.random() - 0.5) * 140 + (this.camera.position.x - this.weatherSystem.position.x);
                    positions[i*3 + 2] = (Math.random() - 0.5) * 140 - 20 + (this.camera.position.z - this.weatherSystem.position.z);
                }
            }
            this.weatherSystem.geometry.attributes.position.needsUpdate = true;
        }

        let avgX = 0;
        let avgY = 0;
        this.kayakers.forEach(k => {
            const t = elapsed + k.offset;
            const zGlobal = k.group.position.z - 4; 
            const pathOffset = speed * elapsed;
            const zForSampling = zGlobal - pathOffset;
            const targetX = this.getPathX(zForSampling);
            const targetY = this.getRiverSlopeHeight(zForSampling);
            k.group.position.x = THREE.MathUtils.lerp(k.group.position.x, targetX + (Math.sin(t * 0.5) * 2.5), 0.05);
            const kw = 2 * Math.PI / 300;
            const xPos = k.group.position.x;
            const zPos = k.group.position.z;
            const rapids = this.getIsRapids(zForSampling);
            const dynIntensity = 1.0 - (rapids * 0.8);
            let dynamicWave = Math.sin(xPos * 0.8 + elapsed * 3.0) * 0.15;
            dynamicWave += Math.cos(zPos * (kw * 30.0) + elapsed * 2.0) * 0.15;
            dynamicWave += Math.sin(xPos * 1.5 + zPos * (kw * 60.0) + elapsed * 4.5) * 0.05;
            dynamicWave += Math.cos(xPos * 0.4 - zPos * (kw * 15.0) + elapsed * 1.5) * 0.1;
            const staticIntensity = 0.5 + rapids * 3.0; 
            let staticNoise = Math.sin(xPos * 0.8) * 0.15 + Math.cos(zForSampling * kw * 30.0) * 0.15;
            staticNoise += Math.sin(xPos * 1.5 + zForSampling * kw * 60.0) * 0.05;
            staticNoise += Math.cos(xPos * 0.4 - zForSampling * kw * 15.0) * 0.1;
            const waveHeight = dynamicWave * dynIntensity + staticNoise * staticIntensity;
            k.group.position.y = targetY + waveHeight;
            avgX += k.group.position.x;
            avgY += k.group.position.y;
            k.paddle.rotation.x = Math.sin(t * 3) * 0.5;
            k.paddle.rotation.y = Math.cos(t * 3) * 0.4;
            k.paddle.position.y = 0.8 + Math.sin(t * 6) * 0.05;
            const boatGroup = k.group.children[0];
            const futureTargetX = this.getPathX(zForSampling - 2);
            const futureTargetY = this.getRiverSlopeHeight(zForSampling - 2);
            const turnDir = (futureTargetX - targetX);
            const angle = Math.atan2(futureTargetY - targetY, 2.0); 
            const roll = Math.sin(xPos * 1.2 + elapsed * 4.0) * 0.1 * dynIntensity;
            boatGroup.rotation.z = THREE.MathUtils.lerp(boatGroup.rotation.z, turnDir * -0.5 + roll, 0.1);
            boatGroup.rotation.x = THREE.MathUtils.lerp(boatGroup.rotation.x, angle, 0.1);
        });

        avgX /= this.kayakers.length;
        avgY /= this.kayakers.length;
        const parallaxX = this.mouse.x * 5.0;
        const parallaxY = this.mouse.y * 2.0;
        this.targetCameraOffset.x = THREE.MathUtils.lerp(this.targetCameraOffset.x, parallaxX, 0.05);
        this.targetCameraOffset.y = THREE.MathUtils.lerp(this.targetCameraOffset.y, parallaxY, 0.05);
        const finalCamX = (avgX * 0.5) + this.targetCameraOffset.x;
        const finalCamY = 8 + avgY + this.targetCameraOffset.y;
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, finalCamX, 0.05);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, finalCamY, 0.05);
        this.camera.lookAt((avgX * 0.5), avgY + 2 + (this.targetCameraOffset.y * 0.5), -30);
        this.sun.position.y = this.camera.position.y + 20;
        this.moon.position.y = this.camera.position.y + 30;
        this.moonLight.position.y = this.camera.position.y + 30;
        this.stars.position.y = this.camera.position.y;
        this.weatherSystem.position.y = this.camera.position.y - 20;
        const weatherCycle = (Math.sin(elapsed * 0.2) + 1.0) * 0.5;
        const weatherOpacity = THREE.MathUtils.clamp((weatherCycle - 0.2) * 1.5, 0, 1);
        (this.weatherSystem.material as THREE.PointsMaterial).opacity = weatherOpacity * 0.8;
        this.weatherSystem.visible = this.biome !== 'sunny' && this.biome !== 'autumn' && weatherOpacity > 0.01;
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        if (this.requestID) cancelAnimationFrame(this.requestID);
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('mousemove', this.handleMouseMove);
        this.container.removeChild(this.renderer.domElement);
        this.renderer.dispose();
    }
}
