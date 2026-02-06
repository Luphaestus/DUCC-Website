import * as THREE from 'three';

type Theme = 'light' | 'dark';
type BiomeType = 'forest' | 'canyon' | 'snow';

interface KayakerState {
    group: THREE.Group;
    paddle: THREE.Group;
    offset: number;
}

interface ChunkState {
    mesh: THREE.Group;
    index: number;
    biome: BiomeType;
    isRapids: boolean;
}

export class RiverScene {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    container: HTMLElement;
    
    theme: Theme = 'dark';
    chunks: ChunkState[] = [];
    kayakers: KayakerState[] = [];
    
    clock: THREE.Clock;
    requestID: number | null = null;
    
    // Theme-specific materials/lights
    lights: {
        ambient: THREE.AmbientLight;
        directional: THREE.DirectionalLight;
        point: THREE.PointLight;
    };
    
    fog: THREE.Fog;

    constructor(container: HTMLElement, theme: Theme = 'dark') {
        this.container = container;
        this.theme = theme;
        this.clock = new THREE.Clock();
        
        // Scene Setup
        this.scene = new THREE.Scene();
        this.fog = new THREE.Fog(0x020617, 20, 160);
        this.scene.fog = this.fog;

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 6, 15);
        this.camera.lookAt(0, 0, -30);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            alpha: true, 
            antialias: true, 
            powerPreference: "high-performance",
            premultipliedAlpha: false,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.setClearColor(0x000000, 0); // Transparent clear color
        this.container.appendChild(this.renderer.domElement);

        // Lights
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

        // Initial Content
        this.initChunks();
        this.initKayakers();
        this.updateTheme(theme);

        // Bind events
        window.addEventListener('resize', this.handleResize);
        
        // Start Loop
        this.animate();
    }

    private getRandomBiome(index: number): BiomeType {
        const types: BiomeType[] = ['forest', 'canyon', 'snow'];
        return types[index % 3];
    }

    private createRiverChunk(zOffset: number, index: number): ChunkState {
        const CHUNK_SIZE = 60;
        const biome = this.getRandomBiome(index);
        const isRapids = Math.random() > 0.6;
        
        const group = new THREE.Group();
        group.position.set(0, -5, zOffset);

        // 1. Terrain Geometry
        const geometry = new THREE.PlaneGeometry(60, 60, 50, 50);
        const posAttribute = geometry.getAttribute('position');
        const vertex = new THREE.Vector3();

        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);
            const x = vertex.x;
            const y = vertex.y; // Local Y is World -Z (due to rotation)
            
            const distFromCenter = Math.abs(x);
            let height = 0;
            
            const noise = Math.sin(x * 0.3) + Math.cos(y * 0.2);

            // River Bed
            if (distFromCenter < 10) {
                height = -4; 
                if (isRapids) {
                    height += Math.random() * 1.5;
                } else {
                    height += Math.sin(x) * 0.5;
                }
            } 
            // Banks
            else {
                height = 2 + (distFromCenter - 10) * 1.5;
                if (biome === 'canyon') height += Math.abs(noise) * 5;
                else if (biome === 'forest') height += Math.sin(x) * 2;
                else height += noise * 1.5;
            }

            posAttribute.setZ(i, height);
        }
        geometry.computeVertexNormals();

        // 2. Materials
        const terrainMat = new THREE.MeshStandardMaterial({ 
            flatShading: true,
            roughness: biome === 'snow' ? 0.3 : 1
        });
        const terrain = new THREE.Mesh(geometry, terrainMat);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        terrain.castShadow = true;
        group.add(terrain);

        // 3. Water Surface
        const waterGeo = new THREE.PlaneGeometry(20, 60, 20, 20);
        const waterMat = new THREE.MeshPhysicalMaterial({
            transparent: true,
            opacity: 0.8,
            roughness: isRapids ? 0.4 : 0.1,
            metalness: 0.6,
            clearcoat: 1
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = -0.5;
        group.add(water);

        // 4. Props (Simplified for vanilla)
        // Add some random blocks for trees/rocks
        if (biome === 'forest') {
             for(let k=0; k<5; k++) {
                 const tree = new THREE.Mesh(
                     new THREE.ConeGeometry(1, 4, 8),
                     new THREE.MeshStandardMaterial({ color: 0x064e3b })
                 );
                 tree.position.set(
                     (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 10),
                     2,
                     (Math.random() - 0.5) * 50
                 );
                 group.add(tree);
             }
        }

        this.scene.add(group);
        
        return {
            mesh: group,
            index,
            biome,
            isRapids
        };
    }

    private initChunks() {
        for (let i = 0; i < 4; i++) {
            this.chunks.push(this.createRiverChunk(-i * 60, i));
        }
    }

    private createKayaker(pos: [number, number, number], color: string, paddlerColor: string, offset: number) {
        const group = new THREE.Group();
        group.position.set(...pos);
        
        // Boat Hull
        const hullGeo = new THREE.CapsuleGeometry(0.35, 2.5, 4, 12);
        const hullMat = new THREE.MeshStandardMaterial({ color, roughness: 0.1 });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.rotation.z = Math.PI / 2;
        hull.position.y = 0.2;
        hull.castShadow = true;
        group.add(hull);

        // Paddler Body
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.22, 0.5, 8),
            new THREE.MeshStandardMaterial({ color: paddlerColor })
        );
        body.position.set(0, 0.6, 0);
        group.add(body);

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xf5d0a9 })
        );
        head.position.set(0, 1.0, 0);
        group.add(head);

        // Paddle Group
        const paddleGroup = new THREE.Group();
        paddleGroup.position.set(0, 0.8, 0);
        
        const shaft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8),
            new THREE.MeshStandardMaterial({ color: 0x111111 })
        );
        shaft.rotation.z = Math.PI / 2;
        paddleGroup.add(shaft);

        const bladeGeo = new THREE.BoxGeometry(0.5, 0.25, 0.05);
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
        
        const leftBlade = new THREE.Mesh(bladeGeo, bladeMat);
        leftBlade.position.set(-1.3, 0, 0);
        paddleGroup.add(leftBlade);

        const rightBlade = new THREE.Mesh(bladeGeo, bladeMat);
        rightBlade.position.set(1.3, 0, 0);
        rightBlade.rotation.x = Math.PI / 4; // Feathered
        paddleGroup.add(rightBlade);

        group.add(paddleGroup);

        // Wrapper to handle global position relative to water
        const wrapper = new THREE.Group();
        wrapper.add(group);
        // Initial position adjustment to sit on water
        // The river chunk is at Y = -5, water at -0.5 relative to chunk -> -5.5
        // We put this wrapper at -5.5 in initKayakers
        
        return { wrapper, paddle: paddleGroup };
    }

    private initKayakers() {
        const wrapper = new THREE.Group();
        wrapper.position.y = -5.5; 
        wrapper.position.z = -4; // Shift back a bit
        
        const k1 = this.createKayaker([3, 0, -5], '#D97706', '#ef4444', 0);
        const k2 = this.createKayaker([-2, 0, -2], '#68246D', '#22c55e', 2);
        const k3 = this.createKayaker([0.5, 0, -8], '#0ea5e9', '#f59e0b', 4);

        wrapper.add(k1.wrapper);
        wrapper.add(k2.wrapper);
        wrapper.add(k3.wrapper);

        this.scene.add(wrapper);

        this.kayakers.push({ group: k1.wrapper.children[0] as THREE.Group, paddle: k1.paddle, offset: 0 });
        this.kayakers.push({ group: k2.wrapper.children[0] as THREE.Group, paddle: k2.paddle, offset: 2 });
        this.kayakers.push({ group: k3.wrapper.children[0] as THREE.Group, paddle: k3.paddle, offset: 4 });
    }

    public updateTheme(theme: Theme) {
        this.theme = theme;
        const isDark = theme === 'dark';

        // Update Fog & Background
        const fogColor = new THREE.Color(isDark ? '#020617' : '#e0f2fe');
        this.fog.color = fogColor;
        this.scene.background = fogColor;

        // Update Lights
        this.lights.ambient.intensity = isDark ? 0.2 : 0.8;
        this.lights.directional.intensity = isDark ? 0.5 : 1.5;
        this.lights.directional.color.set(isDark ? '#818cf8' : '#ffffff');

        // Update Terrain Colors
        this.chunks.forEach(chunk => {
            const terrain = chunk.mesh.children[0] as THREE.Mesh;
            const water = chunk.mesh.children[1] as THREE.Mesh;
            
            let bankColor = '';
            let waterColor = '';

            if (isDark) {
                if (chunk.biome === 'canyon') { bankColor = '#4a1e1e'; waterColor = '#2d1b4e'; }
                else if (chunk.biome === 'snow') { bankColor = '#94a3b8'; waterColor = '#1e293b'; }
                else { bankColor = '#064e3b'; waterColor = '#0f172a'; } // Forest
            } else {
                if (chunk.biome === 'canyon') { bankColor = '#c2410c'; waterColor = '#0ea5e9'; }
                else if (chunk.biome === 'snow') { bankColor = '#f1f5f9'; waterColor = '#bae6fd'; }
                else { bankColor = '#22c55e'; waterColor = '#00A8CC'; } // Forest
            }

            (terrain.material as THREE.MeshStandardMaterial).color.set(bankColor);
            (water.material as THREE.MeshPhysicalMaterial).color.set(waterColor);
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
        const elapsed = this.clock.getElapsedTime();

        // 1. Move River Chunks
        const speed = 12;
        const CHUNK_SIZE = 60;
        
        this.chunks.forEach(chunk => {
            chunk.mesh.position.z += speed * delta;
            if (chunk.mesh.position.z > CHUNK_SIZE) {
                chunk.mesh.position.z -= (CHUNK_SIZE * 4);
            }
        });

        // 2. Animate Kayakers
        this.kayakers.forEach(k => {
            const t = elapsed + k.offset;
            
            // Paddle
            k.paddle.rotation.x = Math.sin(t * 3) * 0.5;
            k.paddle.rotation.y = Math.cos(t * 3) * 0.4;
            k.paddle.position.y = 0.8 + Math.sin(t * 6) * 0.05;
            
            // Boat
            k.group.position.y = Math.sin(t * 2) * 0.05;
            k.group.rotation.z = Math.sin(t * 1.5) * 0.05;
            k.group.rotation.x = Math.sin(t * 2) * 0.02;
        });

        // 3. Mouse Parallax (simplified)
        // We'd need to track mouse position globally, skipping for now to keep it simple
        
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        if (this.requestID) cancelAnimationFrame(this.requestID);
        window.removeEventListener('resize', this.handleResize);
        this.container.removeChild(this.renderer.domElement);
        this.renderer.dispose();
    }
}
