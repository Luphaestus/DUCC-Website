import * as THREE from 'three';

type Theme = 'light' | 'dark';

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
    chunks: ChunkState[] = [];
    kayakers: KayakerState[] = [];
    
    clock: THREE.Clock;
    requestID: number | null = null;
    
    uniforms: {
        uTime: { value: number };
        uCurve: { value: THREE.Vector2 };
    };
    
    lights: {
        ambient: THREE.AmbientLight;
        directional: THREE.DirectionalLight;
        point: THREE.PointLight;
    };
    
    fog: THREE.Fog;
    materials: THREE.Shader[] = [];

    // Mouse state for parallax
    mouse: { x: number; y: number } = { x: 0, y: 0 };
    targetCameraOffset: { x: number; y: number } = { x: 0, y: 0 };

    constructor(container: HTMLElement, theme: Theme = 'dark') {
        this.container = container;
        this.theme = theme;
        this.clock = new THREE.Clock();
        
        this.uniforms = {
            uTime: { value: 0 },
            uCurve: { value: new THREE.Vector2(0, 0) }
        };

        this.scene = new THREE.Scene();
        this.fog = new THREE.Fog(0x020617, 20, 180);
        this.scene.fog = this.fog;

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 250);
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

        this.initChunks();
        this.initKayakers();
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

    private modifyMaterial(material: THREE.Material) {
        material.dithering = true;
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.uniforms.uTime;
            shader.uniforms.uCurve = this.uniforms.uCurve;
            this.materials.push(shader);

            shader.vertexShader = `
                uniform float uTime;
                uniform vec2 uCurve;
                ${shader.vertexShader}
            `;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vec4 worldPos = modelMatrix * vec4(transformed, 1.0);
                float zRel = worldPos.z - 15.0; 
                if (zRel < 0.0) {
                    float curveFactor = zRel * zRel * 0.00003; 
                    transformed.y -= curveFactor * (2.0 + uCurve.y); 
                }
                `
            );
        };
    }

    private getPathX(z: number): number {
        const k = 2 * Math.PI / 300;
        return Math.sin(z * k * 2) * 6.0 + Math.cos(z * k) * 3.0;
    }

    private getIsRapids(z: number): number {
        const k = 2 * Math.PI / 300;
        const r = Math.sin(z * k * 3) * Math.cos(z * k);
        return THREE.MathUtils.clamp((r - 0.2) * 2.0, 0, 1);
    }

    private getTerrainHeight(x: number, z: number): number {
        const k = 2 * Math.PI / 300;
        const riverCenterX = this.getPathX(z);
        const distFromCenter = Math.abs(x - riverCenterX);
        const rapids = this.getIsRapids(z);
        
        let height = 0;
        if (distFromCenter < 14) {
            height = -4; 
            height += (Math.sin(x * 1.5) * 0.8 + Math.cos(z * k * 75) * 0.8) * rapids;
            height += Math.sin(x * 0.5 + z * k * 5) * 0.2;
        } else {
            const slope = 0.8;
            height = 2 + (distFromCenter - 14) * slope;
            const noise = Math.sin(x * 0.3) + Math.cos(z * k * 10);
            const biomeMix = Math.sin(z * k) * 0.5 + 0.5;
            height += noise * THREE.MathUtils.lerp(1.5, 4.0, biomeMix);
        }
        return height;
    }

    private createRiverChunk(zOffset: number): ChunkState {
        const group = new THREE.Group();
        group.position.set(0, -5, zOffset);

        const width = 120;
        const length = 60;
        const widthSegments = 64;
        const lengthSegments = 48;
        
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
        
        const waterGeo = new THREE.PlaneGeometry(28, 60, 32, 32);
        const waterPos = waterGeo.getAttribute('position');
        for (let i = 0; i < waterPos.count; i++) {
            const zGlobal = zOffset - waterPos.getY(i);
            const riverCenterX = this.getPathX(zGlobal);
            waterPos.setX(i, waterPos.getX(i) + riverCenterX);
        }
        const waterMat = new THREE.MeshPhysicalMaterial({
            transparent: true,
            opacity: 0.8,
            metalness: 0.5,
            clearcoat: 1
        });
        this.modifyMaterial(waterMat);
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

    private createKayaker(pos: [number, number, number], color: string, paddlerColor: string, offset: number) {
        const group = new THREE.Group();
        group.position.set(...pos);
        
        const hullMat = new THREE.MeshStandardMaterial({ color, roughness: 0.1 });
        this.modifyMaterial(hullMat);
        const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 2.5, 4, 12), hullMat);
        hull.rotation.z = Math.PI / 2;
        hull.position.y = 0.2;
        hull.castShadow = true;
        group.add(hull);

        const bodyMat = new THREE.MeshStandardMaterial({ color: paddlerColor });
        this.modifyMaterial(bodyMat);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.5, 8), bodyMat);
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

    public updateTheme(theme: Theme) {
        this.theme = theme;
        const isDark = theme === 'dark';
        const fogColor = new THREE.Color(isDark ? '#020617' : '#e0f2fe');
        this.fog.color = fogColor;
        this.scene.background = fogColor;
        this.lights.ambient.intensity = isDark ? 0.2 : 0.8;
        this.lights.directional.intensity = isDark ? 0.5 : 1.5;
        this.lights.directional.color.set(isDark ? '#818cf8' : '#ffffff');

        this.chunks.forEach(chunk => {
            const terrain = chunk.mesh.children[0] as THREE.Mesh;
            const water = chunk.mesh.children[1] as THREE.Mesh;
            (terrain.material as THREE.MeshStandardMaterial).color.set(isDark ? '#064e3b' : '#22c55e');
            (water.material as THREE.MeshPhysicalMaterial).color.set(isDark ? '#0f172a' : '#00A8CC');
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
        this.uniforms.uTime.value = elapsed;

        const speed = 12;
        const CHUNK_SIZE = 60;
        const TOTAL_SIZE = CHUNK_SIZE * 5;
        
        this.chunks.forEach(chunk => {
            chunk.mesh.position.z += speed * delta;
             if (chunk.mesh.position.z > 90) { 
                chunk.mesh.position.z -= TOTAL_SIZE;
            }
        });

        let avgX = 0;
        this.kayakers.forEach(k => {
            const t = elapsed + k.offset;
            const zGlobal = k.group.position.z - 4; 
            const pathOffset = speed * elapsed;
            const targetX = this.getPathX(zGlobal - pathOffset);
            
            k.group.position.x = THREE.MathUtils.lerp(k.group.position.x, targetX + (Math.sin(t * 0.5) * 2.5), 0.05);
            avgX += k.group.position.x;

            k.paddle.rotation.x = Math.sin(t * 3) * 0.5;
            k.paddle.rotation.y = Math.cos(t * 3) * 0.4;
            k.paddle.position.y = 0.8 + Math.sin(t * 6) * 0.05;
            
            const boatGroup = k.group.children[0];
            boatGroup.position.y = Math.sin(t * 2) * 0.05;
            const futureTargetX = this.getPathX(zGlobal - pathOffset - 2);
            const turnDir = (futureTargetX - targetX);
            boatGroup.rotation.z = THREE.MathUtils.lerp(boatGroup.rotation.z, turnDir * -0.5, 0.1);
        });

        avgX /= this.kayakers.length;

        // --- Parallax Logic ---
        // We gently shift the camera based on mouse position
        // X: +/- 5 units based on mouse X (lateral shift)
        // Y: +1 to +3 based on mouse Y (vertical tilt/height)
        
        const parallaxX = this.mouse.x * 5.0;
        const parallaxY = this.mouse.y * 2.0;

        // Smoothly interpolate current parallax offset
        this.targetCameraOffset.x = THREE.MathUtils.lerp(this.targetCameraOffset.x, parallaxX, 0.05);
        this.targetCameraOffset.y = THREE.MathUtils.lerp(this.targetCameraOffset.y, parallaxY, 0.05);

        // Combine river following (avgX) with parallax offset
        // We dampen avgX (0.5) to keep it stable, then add the user's mouse influence
        const finalCamX = (avgX * 0.5) + this.targetCameraOffset.x;
        const finalCamY = 6 + this.targetCameraOffset.y; // Base height 6

        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, finalCamX, 0.05);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, finalCamY, 0.05);
        
        // Look slightly ahead of the pack, but also react to height changes
        this.camera.lookAt((avgX * 0.5), 2 + (this.targetCameraOffset.y * 0.5), -30);

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