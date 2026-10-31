/**
 * BayOffice - 3D Low-Poly Isometric Virtual Office Engine
 * Architecture: Dual-Engine Hybrid (Zero Homelab Server Overhead)
 * Technology: Three.js (r128) WebGL Procedural Meshes
 * Author: PRABOWO (Polyglot Frontend Engineer) - Sprint TASK-FS-03
 *
 * Core Features:
 * - 0 MB homelab server compute: 100% Client-Side WebGL rendering.
 * - Orthographic Isometric Camera with responsive frustum & auto-resize.
 * - 5 Distinct Agent Workstations with Procedural Low-Poly Props:
 *   1. Executive Suite (LUHUT - Red Commander Desk & Server Stack)
 *   2. Architect Studio (HABIBIE - Purple Drafting Table & Blueprints)
 *   3. Backend Bay (JOKOWI - Blue Dual-Monitor & Server Rack)
 *   4. Frontend Bay (PRABOWO - Orange Dual-Monitor & Design Tablet)
 *   5. QA & Security Bay (GIBRAN - Green Diagnostic Terminal & Shield)
 * - Breakout Zones: Game Room (Retro Arcade & Sofa), Cafeteria (Espresso Bar & Cafe Table)
 * - 5 Styled Low-Poly Figurines with circular avatar photo badges and animated states:
 *   * Breathing/bobbing when idle/standby
 *   * Typing/nodding when working/reviewing
 *   * Sleeping/lowered head with Zzz particles when sleeping
 * - Dynamic 3D Billboards for Speech Bubbles & Agent Status
 * - Raycaster Interactivity for hover glow, pointer cursor, and click handling
 * - Performance Guard: Auto-pause on document.hidden, 60fps frame rate cap
 * - Safe WebGL memory disposal (dispose geometries, materials, textures, renderer)
 */

class OfficeThree {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn('[OfficeThree] Container element not found:', containerId);
      return;
    }

    if (typeof THREE === 'undefined') {
      console.error('[OfficeThree] Three.js library not loaded. Falling back to 2D canvas.');
      return;
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    this.rafId = null;
    this.isPaused = false;
    this.isViewActive = true;
    this.lastTime = 0;
    this.fpsInterval = 1000 / 60; // 60 FPS cap

    this.agents = {};
    this.agentMeshes = {};
    this.interactiveObjects = [];
    this.hoveredAgent = null;
    this.onAgentClick = null;

    this.textureLoader = new THREE.TextureLoader();
    this.avatarTextures = {};

    this.init();
  }

  init() {
    try {
      this.initScene();
      this.initCamera();
      this.initRenderer();
      this.initLighting();
      this.loadAvatarTextures();
      this.buildOfficeEnvironment();
      this.initAgents();
      this.setupEvents();
      this.startLoop();
      console.log('[OfficeThree] 3D Low-Poly Isometric Office Engine initialized successfully.');
    } catch (err) {
      console.error('[OfficeThree] WebGL initialization failed:', err);
    }
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x13171C);
  }

  initCamera() {
    const width = this.container.clientWidth || 960;
    const height = this.container.clientHeight || 480;
    const aspect = width / height;
    const d = 21; // Frustum size

    this.camera = new THREE.OrthographicCamera(
      -d * aspect, d * aspect,
      d, -d,
      1, 1000
    );

    // Classic Front-Isometric diorama angle
    this.camera.position.set(24, 28, 24);
    this.camera.lookAt(1, 0, 0);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'default',
      alpha: false
    });

    const width = this.container.clientWidth || 960;
    const height = this.container.clientHeight || 480;

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Append canvas to container
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);
  }

  initLighting() {
    // Warm Ambient Light
    const ambientLight = new THREE.AmbientLight(0xE2E8F0, 0.72);
    this.scene.add(ambientLight);

    // Primary Directional Sun Light (Shadow Caster)
    const dirLight = new THREE.DirectionalLight(0xFFFBEB, 0.85);
    dirLight.position.set(28, 45, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 100;
    const dLight = 26;
    dirLight.shadow.camera.left = -dLight;
    dirLight.shadow.camera.right = dLight;
    dirLight.shadow.camera.top = dLight;
    dirLight.shadow.camera.bottom = -dLight;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Soft Cyan/Blue Fill Light from Opposite Angle
    const fillLight = new THREE.DirectionalLight(0x93C5FD, 0.35);
    fillLight.position.set(-20, 25, -20);
    this.scene.add(fillLight);
  }

  loadAvatarTextures() {
    const avatars = {
      LUHUT: '/static/assets/avatars/luhut.jpg',
      JOKOWI: '/static/assets/avatars/jokowi.jpg',
      PRABOWO: '/static/assets/avatars/prabowo.jpg',
      GIBRAN: '/static/assets/avatars/gibran.jpg',
      HABIBIE: '/static/assets/avatars/habibie.jpg'
    };

    for (const [name, url] of Object.entries(avatars)) {
      this.textureLoader.load(url, (texture) => {
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        this.avatarTextures[name] = texture;
        if (this.agentMeshes[name]) {
          this.attachAvatarDisc(this.agentMeshes[name], name, texture);
        }
      });
    }
  }

  // =========================================================================
  // 🏢 PROCEDURAL 3D LOW-POLY ENVIRONMENT BUILDER
  // =========================================================================

  buildOfficeEnvironment() {
    const envGroup = new THREE.Group();

    // 1. Base Floor Slab (Dark Charcoal Neubrutalist Slate)
    const floorGeo = new THREE.BoxGeometry(46, 1, 28);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x1E242B });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(1, -0.5, 0);
    floor.receiveShadow = true;
    envGroup.add(floor);

    // Floor Base Edge Rim (Deep black line)
    const rimGeo = new THREE.BoxGeometry(46.4, 0.4, 28.4);
    const rimMat = new THREE.MeshBasicMaterial({ color: 0x0F172A });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(1, -0.8, 0);
    envGroup.add(rim);

    // 2. Zone Floor Rugs / Carpets
    // Executive Suite (LUHUT): Crimson Red
    this.addCarpet(envGroup, -15.5, -6.5, 11, 11, 0x881337, 0xBE123C);
    // Architect Studio (HABIBIE): Royal Violet
    this.addCarpet(envGroup, -5.5, -6.5, 7.5, 11, 0x581C87, 0x7C3AED);
    // Engineering Bay (JOKOWI, PRABOWO, GIBRAN): Slate Tech Navy
    this.addCarpet(envGroup, 11.5, -6.5, 24.5, 11, 0x1E293B, 0x0284C7);
    // Game Room: Retro Teal
    this.addCarpet(envGroup, -11.5, 7, 19, 12, 0x115E59, 0x10B981);
    // Cafeteria & Coffee Bar: Warm Wooden Planks
    this.addCarpet(envGroup, 12.5, 7, 21, 12, 0x78350F, 0xB45309);

    // 3. Perimeter Boundary Walls (Low Ledge di Belakang & Sisi Kiri)
    const backWallGeo = new THREE.BoxGeometry(46, 3.2, 0.8);
    const backWallMat = new THREE.MeshLambertMaterial({ color: 0x242E3B });
    const backWall = new THREE.Mesh(backWallGeo, backWallMat);
    backWall.position.set(1, 1.6, -14);
    backWall.receiveShadow = true;
    envGroup.add(backWall);

    const leftWallGeo = new THREE.BoxGeometry(0.8, 3.2, 28);
    const leftWallMat = new THREE.MeshLambertMaterial({ color: 0x1F2732 });
    const leftWall = new THREE.Mesh(leftWallGeo, leftWallMat);
    leftWall.position.set(-22, 1.6, 0);
    leftWall.receiveShadow = true;
    envGroup.add(leftWall);

    // Wall Cap Border (Neubrutalist black trim)
    const wallCapGeo = new THREE.BoxGeometry(46.2, 0.25, 1);
    const wallCapMat = new THREE.MeshBasicMaterial({ color: 0x0F172A });
    const wallCap = new THREE.Mesh(wallCapGeo, wallCapMat);
    wallCap.position.set(1, 3.25, -14);
    envGroup.add(wallCap);

    // Wall Clock in Architect / Executive zone
    const clockGroup = new THREE.Group();
    const clockFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 0.12, 16),
      new THREE.MeshLambertMaterial({ color: 0xF8FAFC })
    );
    clockFace.rotation.x = Math.PI / 2;
    clockGroup.add(clockFace);
    const clockRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.08, 16),
      new THREE.MeshBasicMaterial({ color: 0x0F172A })
    );
    clockRim.rotation.x = Math.PI / 2;
    clockGroup.add(clockRim);
    clockGroup.position.set(-5.5, 2.2, -13.5);
    envGroup.add(clockGroup);

    // 4. Build Workstations
    this.buildExecutiveSuite(envGroup, -15.5, -6.5);
    this.buildArchitectStudio(envGroup, -5.5, -6.5);
    this.buildBackendStation(envGroup, 3.5, -6.5);
    this.buildFrontendStation(envGroup, 11.5, -6.5);
    this.buildQAStation(envGroup, 19.5, -6.5);

    // 5. Build Breakout Zones
    this.buildGameRoom(envGroup, -11.5, 7);
    this.buildCafeteria(envGroup, 12.5, 7);

    this.scene.add(envGroup);
  }

  addCarpet(parent, x, z, w, d, color, borderColor) {
    const rugGeo = new THREE.BoxGeometry(w, 0.04, d);
    const rugMat = new THREE.MeshLambertMaterial({ color: color });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.position.set(x, 0.02, z);
    rug.receiveShadow = true;
    parent.add(rug);

    // Subtle border outline
    const borderGeo = new THREE.BoxGeometry(w + 0.2, 0.02, d + 0.2);
    const borderMat = new THREE.MeshBasicMaterial({ color: borderColor });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(x, 0.01, z);
    parent.add(border);
  }

  // --- Executive Suite (LUHUT) ---
  buildExecutiveSuite(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Large Mahogany Executive Desk
    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.25, 2.4),
      new THREE.MeshLambertMaterial({ color: 0x451A03 })
    );
    deskTop.position.set(0, 1.4, 0);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    group.add(deskTop);

    // Desk Pedestals
    const pedGeo = new THREE.BoxGeometry(0.8, 1.3, 2.0);
    const pedMat = new THREE.MeshLambertMaterial({ color: 0x311202 });
    const pedL = new THREE.Mesh(pedGeo, pedMat);
    pedL.position.set(-1.6, 0.65, 0);
    pedL.castShadow = true;
    group.add(pedL);
    const pedR = new THREE.Mesh(pedGeo, pedMat);
    pedR.position.set(1.6, 0.65, 0);
    pedR.castShadow = true;
    group.add(pedR);

    // Commander Screens (Triple Curved Array with Red HUD)
    this.addMonitor(group, -1.1, 1.95, -0.2, 1.1, 0.75, 0x1E293B, 0xDC2626, 0.2);
    this.addMonitor(group, 0, 1.95, -0.3, 1.3, 0.85, 0x1E293B, 0xEF4444, 0);
    this.addMonitor(group, 1.1, 1.95, -0.2, 1.1, 0.75, 0x1E293B, 0xDC2626, -0.2);

    // Laptop & Executive Pen Tray
    const laptop = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.06, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xCBD5E1 })
    );
    laptop.position.set(0, 1.55, 0.4);
    group.add(laptop);

    // Executive Swivel Chair (High-Back Leather)
    this.addOfficeChair(group, 0, -1.0, 0x991B1B, true);

    // Credenza / Storage Bookcase behind desk
    const credGeo = new THREE.BoxGeometry(4.2, 2.2, 0.8);
    const credMat = new THREE.MeshLambertMaterial({ color: 0x2A180E });
    const cred = new THREE.Mesh(credGeo, credMat);
    cred.position.set(0, 1.1, -2.8);
    cred.castShadow = true;
    group.add(cred);

    // Large Executive Monstera Plant
    this.addPottedPlant(group, -3.2, -1.8, 1.4);

    parent.add(group);
  }

  // --- Architect Studio (HABIBIE) ---
  buildArchitectStudio(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Angled Drafting Table (Tilted 22 degrees)
    const tableTop = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.16, 2.4),
      new THREE.MeshLambertMaterial({ color: 0xBA7D42 })
    );
    tableTop.rotation.x = -0.35; // Angled tilt
    tableTop.position.set(0, 1.7, 0);
    tableTop.castShadow = true;
    group.add(tableTop);

    // Drafting Table Trestle Legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    [-1.5, 1.5].forEach(lx => {
      const legF = new THREE.Mesh(legGeo, legMat);
      legF.position.set(lx, 0.8, 0.7);
      group.add(legF);
      const legB = new THREE.Mesh(legGeo, legMat);
      legB.position.set(lx, 1.0, -0.6);
      group.add(legB);
    });

    // Blueprint Paper Roll on Drafting Table
    const bpGeo = new THREE.PlaneGeometry(2.4, 1.6);
    const bpMat = new THREE.MeshBasicMaterial({ color: 0x0284C7 });
    const bp = new THREE.Mesh(bpGeo, bpMat);
    bp.rotation.x = -0.35 - Math.PI / 2;
    bp.position.set(0, 1.79, 0.02);
    group.add(bp);

    // Architect Anglepoise Desk Lamp
    const lampBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x8B5CF6 })
    );
    lampBase.position.set(1.4, 1.9, -0.7);
    group.add(lampBase);
    const lampHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.35, 8),
      new THREE.MeshBasicMaterial({ color: 0xFDE047 })
    );
    lampHead.rotation.x = 0.8;
    lampHead.position.set(1.1, 2.3, -0.4);
    group.add(lampHead);

    // Drafting Stool
    const stoolSeat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16),
      new THREE.MeshLambertMaterial({ color: 0x7C3AED })
    );
    stoolSeat.position.set(0, 1.05, -1.0);
    group.add(stoolSeat);
    const stoolPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1.0),
      new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    stoolPost.position.set(0, 0.5, -1.0);
    group.add(stoolPost);

    // Architectural Miniature Model Stand
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    stand.position.set(-2.6, 0.6, -1.6);
    group.add(stand);
    const miniModel = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.9, 4),
      new THREE.MeshLambertMaterial({ color: 0xA78BFA })
    );
    miniModel.position.set(-2.6, 1.65, -1.6);
    group.add(miniModel);

    parent.add(group);
  }

  // --- Backend Station (JOKOWI) ---
  buildBackendStation(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Blue Trim Workstation Desk
    this.addStandardDesk(group, 0x1E3A5F);

    // Dual Monitors (Terminal Code)
    this.addMonitor(group, -0.65, 1.85, -0.2, 1.1, 0.7, 0x0F172A, 0x10B981, 0.15);
    this.addMonitor(group, 0.65, 1.85, -0.2, 1.1, 0.7, 0x0F172A, 0x0EA5E9, -0.15);

    // Ergonomic Chair (Sky Blue Trim)
    this.addOfficeChair(group, 0, -1.0, 0x0284C7, false);

    // Server Rack Cabinet beside desk
    const rackGeo = new THREE.BoxGeometry(1.6, 3.8, 1.6);
    const rackMat = new THREE.MeshLambertMaterial({ color: 0x0F172A });
    const rack = new THREE.Mesh(rackGeo, rackMat);
    rack.position.set(2.4, 1.9, -0.2);
    rack.castShadow = true;
    group.add(rack);

    // Blinking Server LEDs
    [-0.8, -0.4, 0, 0.4, 0.8, 1.2].forEach(ly => {
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.08, 0.05),
        new THREE.MeshBasicMaterial({ color: Math.random() > 0.4 ? 0x10B981 : 0x0EA5E9 })
      );
      led.position.set(2.4 + (Math.random() * 0.4 - 0.2), 1.9 + ly, 0.62);
      group.add(led);
    });

    // Coffee Mug
    this.addCoffeeMug(group, -1.1, 1.45, 0.3);

    parent.add(group);
  }

  // --- Frontend Station (PRABOWO) ---
  buildFrontendStation(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Vibrant Orange Trim Creative Desk
    this.addStandardDesk(group, 0x7C2D12);

    // Dual Curved Ultra-Wide Monitors (UI Design Mockup & Component Tree)
    this.addMonitor(group, -0.65, 1.85, -0.2, 1.1, 0.7, 0x1E293B, 0xF97316, 0.15);
    this.addMonitor(group, 0.65, 1.85, -0.2, 1.1, 0.7, 0x1E293B, 0xEC4899, -0.15);

    // Ergonomic Chair (Orange Trim)
    this.addOfficeChair(group, 0, -1.0, 0xEA580C, false);

    // Graphic Drawing Tablet & Stylus
    const tabGeo = new THREE.BoxGeometry(0.9, 0.04, 0.65);
    const tabMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const tab = new THREE.Mesh(tabGeo, tabMat);
    tab.position.set(0, 1.42, 0.25);
    group.add(tab);

    // Designer Orange Desk Lamp
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 0.6),
      new THREE.MeshLambertMaterial({ color: 0xF97316 })
    );
    lamp.position.set(-1.3, 1.7, -0.4);
    group.add(lamp);

    // Succulent Plant
    this.addPottedPlant(group, 1.25, -0.3, 0.6);

    parent.add(group);
  }

  // --- QA & Security Station (GIBRAN) ---
  buildQAStation(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Emerald Green Trim Diagnostic Desk
    this.addStandardDesk(group, 0x064E3B);

    // Triple Diagnostic Monitors (Testing Pipeline & Security Radar)
    this.addMonitor(group, -0.95, 1.85, -0.15, 0.95, 0.65, 0x0F172A, 0x10B981, 0.22);
    this.addMonitor(group, 0, 1.9, -0.25, 1.05, 0.75, 0x0F172A, 0x34D399, 0);
    this.addMonitor(group, 0.95, 1.85, -0.15, 0.95, 0.65, 0x0F172A, 0x059669, -0.22);

    // Ergonomic Chair (Emerald Green Trim)
    this.addOfficeChair(group, 0, -1.0, 0x059669, false);

    // Gold Security Shield Trophy on desk
    const shield = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.45, 3),
      new THREE.MeshLambertMaterial({ color: 0xF59E0B })
    );
    shield.rotation.z = Math.PI;
    shield.position.set(-1.2, 1.65, 0.3);
    group.add(shield);

    // Diagnostic Server Box with Antenna
    const diagBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.8, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x1E293B })
    );
    diagBox.position.set(2.2, 0.9, -0.2);
    group.add(diagBox);

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.0),
      new THREE.MeshBasicMaterial({ color: 0x10B981 })
    );
    antenna.position.set(2.2, 2.3, -0.2);
    group.add(antenna);

    parent.add(group);
  }

  // --- Game Room & Lounge ---
  buildGameRoom(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // 1. Retro Arcade Cabinet
    const arcadeGeo = new THREE.BoxGeometry(1.6, 3.6, 1.6);
    const arcadeMat = new THREE.MeshLambertMaterial({ color: 0x312E81 });
    const arcade = new THREE.Mesh(arcadeGeo, arcadeMat);
    arcade.position.set(-5.5, 1.8, -1.5);
    arcade.castShadow = true;
    group.add(arcade);

    // Arcade Marquee & Glowing Screen
    const screenGeo = new THREE.BoxGeometry(1.3, 0.9, 0.1);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x06B6D4 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(-5.5, 2.3, -0.65);
    group.add(screen);

    const marquee = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.35, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xF43F5E })
    );
    marquee.position.set(-5.5, 3.2, -0.65);
    group.add(marquee);

    // 2. Retro Lounge Couch (3-Seater Sofa in Mustard Amber)
    const sofaSeat = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.6, 1.8),
      new THREE.MeshLambertMaterial({ color: 0xD97706 })
    );
    sofaSeat.position.set(0.5, 0.5, 0.5);
    sofaSeat.castShadow = true;
    group.add(sofaSeat);

    const sofaBack = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 1.2, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xB45309 })
    );
    sofaBack.position.set(0.5, 1.2, -0.2);
    group.add(sofaBack);

    // Sofa Armrests
    [-1.9, 2.9].forEach(ax => {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.9, 1.8),
        new THREE.MeshLambertMaterial({ color: 0x92400E })
      );
      arm.position.set(ax, 0.75, 0.5);
      group.add(arm);
    });

    // 3. Low Coffee Table
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.35, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x1E293B })
    );
    table.position.set(0.5, 0.25, 2.4);
    group.add(table);

    // 4. Flat Screen TV Console on Stand
    const tvStand = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.8, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x0F172A })
    );
    tvStand.position.set(0.5, 0.4, 4.4);
    group.add(tvStand);

    const tvScreen = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.6, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x38BDF8 })
    );
    tvScreen.position.set(0.5, 1.7, 4.4);
    group.add(tvScreen);

    parent.add(group);
  }

  // --- Cafeteria & Coffee Bar ---
  buildCafeteria(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // 1. L-Shaped Espresso Counter Bar
    const counterA = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 1.4, 1.4),
      new THREE.MeshLambertMaterial({ color: 0x3B2515 })
    );
    counterA.position.set(-1.0, 0.7, -1.8);
    counterA.castShadow = true;
    group.add(counterA);

    const counterTopA = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, 0.12, 1.6),
      new THREE.MeshLambertMaterial({ color: 0xF1F5F9 })
    );
    counterTopA.position.set(-1.0, 1.45, -1.8);
    group.add(counterTopA);

    // Commercial Espresso Machine (Double Group with Chrome details)
    const machine = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.0, 0.9),
      new THREE.MeshLambertMaterial({ color: 0xDC2626 })
    );
    machine.position.set(-1.2, 1.95, -1.8);
    group.add(machine);

    // Shiny Chrome Group Heads
    const chrome = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.2, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xE2E8F0 })
    );
    chrome.position.set(-1.2, 1.7, -1.3);
    group.add(chrome);

    // 2. Water Cooler Dispenser
    const coolerBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.4, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xE2E8F0 })
    );
    coolerBase.position.set(2.2, 0.7, -1.8);
    group.add(coolerBase);

    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.7, 12),
      new THREE.MeshLambertMaterial({ color: 0x38BDF8, transparent: true, opacity: 0.75 })
    );
    bottle.position.set(2.2, 1.75, -1.8);
    group.add(bottle);

    // 3. Round Cafe Bistro Table & Chairs
    const bistroTable = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 0.1, 16),
      new THREE.MeshLambertMaterial({ color: 0xF8FAFC })
    );
    bistroTable.position.set(-0.8, 1.1, 2.0);
    group.add(bistroTable);

    const bistroPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1.1),
      new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    bistroPost.position.set(-0.8, 0.55, 2.0);
    group.add(bistroPost);

    // 2 Cafe Chairs around Bistro table
    [-1.8, 0.2].forEach(cx => {
      const chairSeat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.08, 12),
        new THREE.MeshLambertMaterial({ color: 0xEA580C })
      );
      chairSeat.position.set(cx, 0.75, 2.0);
      group.add(chairSeat);

      const chairLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.75),
        new THREE.MeshLambertMaterial({ color: 0x334155 })
      );
      chairLeg.position.set(cx, 0.38, 2.0);
      group.add(chairLeg);
    });

    // 4. Beverage Display Fridge (Glass front with beverage rows)
    const fridge = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 3.4, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x1E293B })
    );
    fridge.position.set(4.5, 1.7, -1.2);
    group.add(fridge);

    const fridgeGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 2.6),
      new THREE.MeshBasicMaterial({ color: 0x38BDF8, transparent: true, opacity: 0.65 })
    );
    fridgeGlass.position.set(4.5, 1.7, -0.58);
    group.add(fridgeGlass);

    parent.add(group);
  }

  // --- Shared Reusable Furniture Helpers ---
  addStandardDesk(group, trimColor) {
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.18, 2.0),
      new THREE.MeshLambertMaterial({ color: 0x1E242B })
    );
    top.position.set(0, 1.35, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // Front color trim stripe
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.06, 0.04),
      new THREE.MeshBasicMaterial({ color: trimColor })
    );
    stripe.position.set(0, 1.35, 1.01);
    group.add(stripe);

    // Desk Legs (Steel tubular)
    const legGeo = new THREE.BoxGeometry(0.12, 1.3, 1.8);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    [-1.65, 1.65].forEach(lx => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, 0.65, 0);
      leg.castShadow = true;
      group.add(leg);
    });
  }

  addMonitor(group, x, y, z, w, h, bezelColor, screenColor, rotY = 0) {
    const monitor = new THREE.Group();
    monitor.position.set(x, y, z);
    monitor.rotation.y = rotY;

    // Bezel
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.08),
      new THREE.MeshLambertMaterial({ color: bezelColor })
    );
    bezel.castShadow = true;
    monitor.add(bezel);

    // Screen
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(w - 0.1, h - 0.1),
      new THREE.MeshBasicMaterial({ color: screenColor })
    );
    screen.position.set(0, 0, 0.045);
    monitor.add(screen);

    // Stand
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    stand.position.set(0, -h / 2 - 0.25, 0);
    monitor.add(stand);

    group.add(monitor);
  }

  addOfficeChair(group, x, z, accentColor, isExecutive = false) {
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);

    // Seat
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.16, 1.0),
      new THREE.MeshLambertMaterial({ color: 0x1E293B })
    );
    seat.position.set(0, 0.85, 0);
    chair.add(seat);

    // Backrest
    const backHeight = isExecutive ? 1.6 : 1.1;
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, backHeight, 0.14),
      new THREE.MeshLambertMaterial({ color: accentColor })
    );
    back.position.set(0, 0.85 + backHeight / 2, -0.45);
    chair.add(back);

    // Post & Casters
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x0F172A })
    );
    post.position.set(0, 0.4, 0);
    chair.add(post);

    group.add(chair);
  }

  addPottedPlant(group, x, z, scale = 1.0) {
    const plant = new THREE.Group();
    plant.position.set(x, 0, z);
    plant.scale.set(scale, scale, scale);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.28, 0.65, 8),
      new THREE.MeshLambertMaterial({ color: 0xE2E8F0 })
    );
    pot.position.set(0, 0.32, 0);
    plant.add(pot);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x15803D })
    );
    stem.position.set(0, 0.8, 0);
    plant.add(stem);

    // Geometric Leaves
    [0, 1.2, 2.4, 3.6, 4.8].forEach(ang => {
      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.02, 0.6),
        new THREE.MeshLambertMaterial({ color: 0x16A34A })
      );
      leaf.rotation.y = ang;
      leaf.rotation.x = 0.4;
      leaf.position.set(Math.cos(ang) * 0.25, 0.95, Math.sin(ang) * 0.25);
      plant.add(leaf);
    });

    group.add(plant);
  }

  addCoffeeMug(group, x, y, z) {
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.22, 8),
      new THREE.MeshLambertMaterial({ color: 0xF8FAFC })
    );
    mug.position.set(x, y + 0.11, z);
    group.add(mug);
  }

  // =========================================================================
  // 👥 5 AGENT AVATARS (3D LOW-POLY FIGURINES & BILLBOARDS)
  // =========================================================================

  initAgents() {
    this.agents = {
      LUHUT: {
        name: 'LUHUT',
        role: 'Lead Orchestrator',
        color: '#EF4444',
        state: 'idle',
        bubble: 'Executive Suite',
        x: -15.5, z: -6.5,
        targetX: -15.5, targetZ: -6.5,
        targetY: 0.9,
        workPos: { x: -15.5, z: -6.5, y: 0.9 },
        breakPos: { x: -15.5, z: -2.0, y: 0.9 },
        sleepPos: { x: -11.0, z: 6.5, y: 0.9 }
      },
      HABIBIE: {
        name: 'HABIBIE',
        role: 'Chief Architect',
        color: '#8B5CF6',
        state: 'idle',
        bubble: 'Studio Arsitek',
        x: -5.5, z: -6.5,
        targetX: -5.5, targetZ: -6.5,
        targetY: 1.1,
        workPos: { x: -5.5, z: -6.5, y: 1.1 },
        breakPos: { x: -5.5, z: -2.0, y: 1.1 },
        sleepPos: { x: -5.5, z: -6.5, y: 1.1 } // Habibie remains in his studio
      },
      JOKOWI: {
        name: 'JOKOWI',
        role: 'Backend Engineer',
        color: '#0EA5E9',
        state: 'idle',
        bubble: 'Backend Bay',
        x: 3.5, z: -6.5,
        targetX: 3.5, targetZ: -6.5,
        targetY: 0.9,
        workPos: { x: 3.5, z: -6.5, y: 0.9 },
        breakPos: { x: 8.5, z: 7.0, y: 0.9 },
        sleepPos: { x: -13.0, z: 6.5, y: 0.9 }
      },
      PRABOWO: {
        name: 'PRABOWO',
        role: 'Frontend Engineer',
        color: '#F97316',
        state: 'idle',
        bubble: 'Frontend Bay',
        x: 11.5, z: -6.5,
        targetX: 11.5, targetZ: -6.5,
        targetY: 0.9,
        workPos: { x: 11.5, z: -6.5, y: 0.9 },
        breakPos: { x: -9.5, z: 6.5, y: 0.9 }, // Relaxing at arcade / couch
        sleepPos: { x: -8.0, z: 6.5, y: 0.9 }
      },
      GIBRAN: {
        name: 'GIBRAN',
        role: 'QA & Security',
        color: '#10B981',
        state: 'idle',
        bubble: 'QA Terminal',
        x: 19.5, z: -6.5,
        targetX: 19.5, targetZ: -6.5,
        targetY: 0.9,
        workPos: { x: 19.5, z: -6.5, y: 0.9 },
        breakPos: { x: 14.5, z: 7.0, y: 0.9 },
        sleepPos: { x: -6.0, z: 6.5, y: 0.9 }
      }
    };

    for (const [name, config] of Object.entries(this.agents)) {
      const agentGroup = this.createAgentMesh(config);
      this.agentMeshes[name] = agentGroup;
      this.scene.add(agentGroup);
    }
  }

  createAgentMesh(config) {
    const group = new THREE.Group();
    group.name = config.name;
    group.position.set(config.x, config.targetY, config.z);

    // 1. Torso / Jacket (Signature Team Color)
    const colorHex = parseInt(config.color.replace('#', '0x'));
    const torsoGeo = new THREE.BoxGeometry(0.85, 0.95, 0.55);
    const torsoMat = new THREE.MeshLambertMaterial({ color: colorHex });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.set(0, 0.5, 0);
    torso.castShadow = true;
    group.add(torso);

    // 2. Head (Clean Voxel Peach/Warm Sand)
    const headGeo = new THREE.BoxGeometry(0.72, 0.72, 0.72);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xFBD38D });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.35, 0);
    head.castShadow = true;
    group.add(head);
    group.headMesh = head;

    // Hair / Cap
    const hairGeo = new THREE.BoxGeometry(0.76, 0.28, 0.76);
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x1F2937 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.62, 0);
    group.add(hair);

    // 3. Hands (Resting on desk / typing)
    const handGeo = new THREE.BoxGeometry(0.2, 0.16, 0.26);
    const handMat = new THREE.MeshLambertMaterial({ color: 0xFBD38D });
    const handL = new THREE.Mesh(handGeo, handMat);
    handL.position.set(-0.35, 0.55, 0.45);
    group.add(handL);
    const handR = new THREE.Mesh(handGeo, handMat);
    handR.position.set(0.35, 0.55, 0.45);
    group.add(handR);
    group.hands = [handL, handR];

    // 4. Circular Avatar Portrait Disc (Chest / Floating Badge)
    const discGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 16);
    const discMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(0, 0.58, 0.3);
    group.add(disc);
    group.avatarDisc = disc;

    if (this.avatarTextures[config.name]) {
      this.attachAvatarDisc(group, config.name, this.avatarTextures[config.name]);
    }

    // 5. Floating 3D Nametag Pill
    const nametagSprite = this.createNametagSprite(config.name, config.color);
    nametagSprite.position.set(0, 2.2, 0);
    group.add(nametagSprite);
    group.nametag = nametagSprite;

    // 6. Floating 3D Speech/Status Bubble
    const bubbleSprite = this.createBubbleSprite(config.bubble || config.role, config.color);
    bubbleSprite.position.set(0, 2.85, 0);
    group.add(bubbleSprite);
    group.bubbleSprite = bubbleSprite;

    // 7. Raycasting Hit Box (Invisible slightly larger box for responsive clicks)
    const hitGeo = new THREE.BoxGeometry(1.6, 2.8, 1.6);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitGeo, hitMat);
    hitBox.position.set(0, 1.2, 0);
    hitBox.userData = { agentName: config.name };
    group.add(hitBox);
    this.interactiveObjects.push(hitBox);

    return group;
  }

  attachAvatarDisc(group, name, texture) {
    if (!group || !group.avatarDisc) return;
    group.avatarDisc.material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true
    });
  }

  createNametagSprite(name, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 72;
    const ctx = canvas.getContext('2d');

    // Draw Neubrutalist pill
    ctx.fillStyle = '#0F172A';
    this.roundRect(ctx, 6, 6, 244, 60, 14);
    ctx.fill();

    ctx.fillStyle = color;
    this.roundRect(ctx, 4, 4, 244, 60, 14);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 126, 34);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.5, 0.42, 1);
    return sprite;
  }

  createBubbleSprite(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');

    // Speech bubble box
    ctx.fillStyle = '#1E242B';
    this.roundRect(ctx, 8, 8, 368, 84, 16);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Text (truncated if long)
    const displayText = text.length > 28 ? text.substring(0, 26) + '...' : text;
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, 192, 50);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.4, 0.62, 1);
    return sprite;
  }

  updateAgentBubble(agentName, text) {
    const group = this.agentMeshes[agentName];
    const ag = this.agents[agentName];
    if (!group || !ag) return;

    if (group.bubbleSprite) {
      group.remove(group.bubbleSprite);
      if (group.bubbleSprite.material.map) group.bubbleSprite.material.map.dispose();
      group.bubbleSprite.material.dispose();
    }

    const newBubble = this.createBubbleSprite(text, ag.color);
    newBubble.position.set(0, 2.85, 0);
    group.add(newBubble);
    group.bubbleSprite = newBubble;
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // =========================================================================
  // ⚡ DYNAMIC STATE SYNCHRONIZATION & ANIMATIONS
  // =========================================================================

  updateAgents(agentsData) {
    if (!agentsData) return;

    for (const [name, data] of Object.entries(agentsData)) {
      if (this.agents[name]) {
        const ag = this.agents[name];
        ag.state = data.state || 'idle';
        ag.role = data.role || ag.role;

        if (data.bubble_text && data.bubble_text !== ag.bubble) {
          ag.bubble = data.bubble_text;
          this.updateAgentBubble(name, ag.bubble);
        }

        // Determine 3D target coordinates based on state
        let target = ag.workPos;
        if (ag.state === 'working' || ag.state === 'reviewing') {
          target = ag.workPos;
        } else if (ag.state === 'sleeping') {
          target = ag.sleepPos;
        } else {
          // Idle / Standby
          target = ag.breakPos;
        }

        ag.targetX = target.x;
        ag.targetZ = target.z;
        ag.targetY = target.y || 0.9;
      }
    }
  }

  updateAnimations(time) {
    for (const [name, ag] of Object.entries(this.agents)) {
      const mesh = this.agentMeshes[name];
      if (!mesh) continue;

      // Smooth Position Interpolation (Lerp)
      const dx = ag.targetX - mesh.position.x;
      const dz = ag.targetZ - mesh.position.z;
      if (Math.abs(dx) > 0.05 || Math.abs(dz) > 0.05) {
        mesh.position.x += dx * 0.06;
        mesh.position.z += dz * 0.06;
      } else {
        mesh.position.x = ag.targetX;
        mesh.position.z = ag.targetZ;
      }

      // State-Specific Animations
      if (ag.state === 'working' || ag.state === 'reviewing') {
        // Active typing & nodding
        mesh.position.y = ag.targetY + Math.sin(time * 7) * 0.03;
        if (mesh.headMesh) {
          mesh.headMesh.rotation.x = 0.15 + Math.sin(time * 4) * 0.06;
        }
        if (mesh.hands && mesh.hands.length === 2) {
          mesh.hands[0].position.y = 0.55 + Math.sin(time * 12) * 0.04;
          mesh.hands[1].position.y = 0.55 + Math.cos(time * 12) * 0.04;
        }
      } else if (ag.state === 'sleeping') {
        // Sleeping: Lowered head, subtle slow breathing
        mesh.position.y = ag.targetY + Math.sin(time * 1.5) * 0.02;
        if (mesh.headMesh) {
          mesh.headMesh.rotation.x = 0.45; // Head drooped down
        }
      } else {
        // Idle / Standby: Gentle breathing
        mesh.position.y = ag.targetY + Math.sin(time * 2.5) * 0.04;
        if (mesh.headMesh) {
          mesh.headMesh.rotation.x = Math.sin(time * 1.5) * 0.03;
        }
      }
    }
  }

  // =========================================================================
  // 🎯 RAYCASTING & INTERACTION EVENTS
  // =========================================================================

  setupEvents() {
    this.onPointerMove = (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.checkHover();
    };

    this.onPointerClick = (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.checkClick();
    };

    this.onWindowResize = () => {
      if (!this.container || !this.renderer || !this.camera) return;
      const width = this.container.clientWidth || 960;
      const height = this.container.clientHeight || 480;
      const aspect = width / height;
      const d = 21;

      this.camera.left = -d * aspect;
      this.camera.right = d * aspect;
      this.camera.top = d;
      this.camera.bottom = -d;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    };

    this.setupVisibilityHandler();

    this.renderer.domElement.addEventListener('mousemove', this.onPointerMove);
    this.renderer.domElement.addEventListener('click', this.onPointerClick);
    window.addEventListener('resize', this.onWindowResize);
  }

  setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopLoop();
      } else if (this.isViewActive) {
        this.startLoop();
      }
    });
  }

  checkHover() {
    if (!this.camera) return;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects);

    if (intersects.length > 0) {
      const agentName = intersects[0].object.userData.agentName;
      if (this.hoveredAgent !== agentName) {
        this.hoveredAgent = agentName;
        this.renderer.domElement.style.cursor = 'pointer';

        // Elevate hovered agent sprite
        const mesh = this.agentMeshes[agentName];
        if (mesh && mesh.bubbleSprite) {
          mesh.bubbleSprite.scale.set(2.7, 0.7, 1);
        }
      }
    } else {
      if (this.hoveredAgent) {
        const mesh = this.agentMeshes[this.hoveredAgent];
        if (mesh && mesh.bubbleSprite) {
          mesh.bubbleSprite.scale.set(2.4, 0.62, 1);
        }
        this.hoveredAgent = null;
        this.renderer.domElement.style.cursor = 'default';
      }
    }
  }

  checkClick() {
    if (!this.camera) return;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects);

    if (intersects.length > 0) {
      const agentName = intersects[0].object.userData.agentName;
      if (typeof this.onAgentClick === 'function') {
        this.onAgentClick(agentName);
      }
    }
  }

  // =========================================================================
  // 🔄 RENDER LOOP & RESOURCE GUARD
  // =========================================================================

  startLoop() {
    if (this.rafId) return;
    this.isPaused = false;
    this.lastTime = performance.now();

    const render = (currentTime) => {
      if (this.isPaused) {
        this.rafId = null;
        return;
      }

      this.rafId = requestAnimationFrame(render);

      // Frame rate throttle (60 FPS cap)
      const elapsed = currentTime - this.lastTime;
      if (elapsed > this.fpsInterval) {
        this.lastTime = currentTime - (elapsed % this.fpsInterval);
        const timeInSeconds = currentTime * 0.001;
        this.updateAnimations(timeInSeconds);
        this.renderer.render(this.scene, this.camera);
      }
    };

    this.rafId = requestAnimationFrame(render);
  }

  stopLoop() {
    this.isPaused = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  setViewActive(active) {
    this.isViewActive = !!active;
    if (this.isViewActive && !document.hidden) {
      this.startLoop();
      this.onWindowResize();
    } else {
      this.stopLoop();
    }
  }

  // =========================================================================
  // 🧹 WEBGL MEMORY CLEANUP (SAFE DISPOSAL)
  // =========================================================================

  dispose() {
    this.stopLoop();

    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.removeEventListener('mousemove', this.onPointerMove);
      this.renderer.domElement.removeEventListener('click', this.onPointerClick);
    }
    window.removeEventListener('resize', this.onWindowResize);

    // Dispose all scene meshes, materials, and textures
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (m.map) m.map.dispose();
              m.dispose();
            });
          } else {
            if (obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
          }
        }
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }

    console.log('[OfficeThree] WebGL memory safely disposed.');
  }
}

// Attach to window
window.OfficeThree = OfficeThree;
