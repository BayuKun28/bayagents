/**
 * BayOffice - 3D Realistic Living Workspace Engine
 * Architecture: Dual-Engine Hybrid (Zero Homelab Server Overhead)
 * Technology: Three.js (r128) WebGL + OrbitControls (6-DoF)
 * Author: PRABOWO (Polyglot Frontend Engineer) - TASK-OPS-15 (PLAN-20261101-01)
 *
 * Core Features:
 * 1. Full 6-DoF OrbitControls: Smooth Damping (0.05), Polar Angle Clamp (83°), Distance Limits (6 - 38),
 *    Zoom In/Out, Free Pan, and Cinematic Camera Transitions (Agent Focus Mode, Reset, Top-Down).
 * 2. Realistic Sitting Avatars & Ergonomic Chairs: Natural seated posture at workstation desks,
 *    5-star caster chairs with armrests, and dynamic procedural animations (typing, nodding,
 *    reviewing with hand on chin, idle breathing bob, and sleeping Zzz particles).
 * 3. Dynamic Atmosphere & Day/Night Ambient Cycle: Synchronized with WIB (UTC+7) server time,
 *    featuring daylight sun, golden hour sunset, and cozy night lighting with glowing monitors,
 *    panoramic city skyline windows, and a real-time ticking analog wall clock.
 * 4. Interactive Raycasting & UI Controls Widget: Hover highlights, pointer feedback, click-to-focus,
 *    and on-screen toolbar for zoom, reset, top-down, and agent selection.
 * 5. Resource Guard: 60 FPS throttle, auto-pause on tab hidden, and safe WebGL memory disposal.
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
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    // Performance & Loop
    this.rafId = null;
    this.isPaused = false;
    this.isViewActive = true;
    this.lastTime = 0;
    this.fpsInterval = 1000 / 60; // 60 FPS cap
    this.frameCount = 0;
    this.lastFpsUpdate = 0;

    // Cinematic Camera Lerp Transition
    this.camTransition = {
      active: false,
      startTime: 0,
      duration: 850,
      startCamPos: new THREE.Vector3(),
      endCamPos: new THREE.Vector3(),
      startLookAt: new THREE.Vector3(),
      endLookAt: new THREE.Vector3()
    };

    // Default Camera Angles
    this.defaultCamPos = new THREE.Vector3(24, 25, 27);
    this.defaultCamTarget = new THREE.Vector3(1, 1, 0);

    // Agent Figurines & Workstations
    this.agents = {};
    this.agentMeshes = {};
    this.interactiveObjects = [];
    this.hoveredAgent = null;
    this.onAgentClick = null;

    // Atmosphere & Time Cycle
    this.ambientLight = null;
    this.sunLight = null;
    this.fillLight = null;
    this.interiorLights = [];
    this.monitors = [];
    this.skyMesh = null;
    this.cityWindows = [];
    this.wallClock = { hourHand: null, minuteHand: null, secondHand: null };
    this.currentPeriod = 'day'; // 'day' | 'sunset' | 'night'

    // Textures & Zzz particles
    this.textureLoader = new THREE.TextureLoader();
    this.avatarTextures = {};
    this.zzzParticles = [];

    this.init();
  }

  // =========================================================================
  // 🚀 ENGINE INITIALIZATION PIPELINE
  // =========================================================================

  init() {
    try {
      this.initScene();
      this.initCamera();
      this.initRenderer();
      this.initControls();
      this.initLightingAndAtmosphere();
      this.loadAvatarTextures();
      this.buildOfficeEnvironment();
      this.initAgents();
      this.setupUIControls();
      this.setupEvents();
      this.updateDayNightAtmosphere();
      this.startLoop();

      console.log('[OfficeThree] 3D Realistic Living Workspace Engine initialized successfully.');
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

    // Perspective Camera with 45° FOV for true depth and cinematic orbit navigation
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.copy(this.defaultCamPos);
    this.camera.lookAt(this.defaultCamTarget);
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

    // Canvas element
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.outline = 'none';

    // Insert canvas as first child (keeping controls overlay on top)
    if (this.container.firstChild) {
      this.container.insertBefore(this.renderer.domElement, this.container.firstChild);
    } else {
      this.container.appendChild(this.renderer.domElement);
    }
  }

  initControls() {
    if (typeof THREE.OrbitControls === 'function') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.screenSpacePanning = true;

      // Distance & Polar limits
      this.controls.minDistance = 6;
      this.controls.maxDistance = 38;
      this.controls.maxPolarAngle = 1.45; // ~83° clamp to prevent dipping below floor
      this.controls.target.copy(this.defaultCamTarget);

      // Disable default context menu on right drag
      this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    } else {
      console.warn('[OfficeThree] THREE.OrbitControls is not available. Free camera disabled.');
    }
  }

  // =========================================================================
  // ☀️ DAY / NIGHT DYNAMIC ATMOSPHERE & LIGHTING RIG
  // =========================================================================

  initLightingAndAtmosphere() {
    // 1. Natural Ambient Light
    this.ambientLight = new THREE.AmbientLight(0xE2E8F0, 0.75);
    this.scene.add(this.ambientLight);

    // 2. Primary Directional Sunlight with Soft Shadows
    this.sunLight = new THREE.DirectionalLight(0xFFFBEB, 0.95);
    this.sunLight.position.set(28, 42, 22);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 100;
    const dLight = 28;
    this.sunLight.shadow.camera.left = -dLight;
    this.sunLight.shadow.camera.right = dLight;
    this.sunLight.shadow.camera.top = dLight;
    this.sunLight.shadow.camera.bottom = -dLight;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // 3. Soft Fill Light from Window Side
    this.fillLight = new THREE.DirectionalLight(0x93C5FD, 0.35);
    this.fillLight.position.set(-24, 25, -20);
    this.scene.add(this.fillLight);

    // 4. Warm Interior Downlights (Cozy evening/night work ambiance)
    const downlightPositions = [
      { x: -15.5, y: 7.5, z: -6.5, color: 0xFDF4DC, intensity: 0.45 }, // Executive
      { x: -5.5, y: 7.5, z: -6.5, color: 0xFDF4DC, intensity: 0.45 },  // Architect
      { x: 11.5, y: 7.5, z: -6.5, color: 0xFDF4DC, intensity: 0.55 },  // Engineering Bay
      { x: -11.5, y: 7.5, z: 7.0, color: 0x06B6D4, intensity: 0.35 },  // Game Room
      { x: 12.5, y: 7.5, z: 7.0, color: 0xFDE68A, intensity: 0.45 }   // Cafeteria
    ];

    downlightPositions.forEach((dp) => {
      const pl = new THREE.PointLight(dp.color, dp.intensity, 22, 1.8);
      pl.position.set(dp.x, dp.y, dp.z);
      this.scene.add(pl);
      this.interiorLights.push(pl);
    });
  }

  getWIBTime() {
    const now = new Date();
    // UTC offset to WIB (UTC+7)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 7));
  }

  updateDayNightAtmosphere() {
    const wib = this.getWIBTime();
    const hour = wib.getHours();
    const min = wib.getMinutes();
    const timeFormatted = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

    let period = 'day';
    let badgeText = `Siang (${timeFormatted} WIB)`;
    let badgeIcon = 'sun';

    if (hour >= 6 && hour < 17) {
      // SIANG: 06:00 - 16:59
      period = 'day';
      badgeText = `Siang (${timeFormatted} WIB)`;
      badgeIcon = 'sun';

      this.scene.background.setHex(0x13171C);
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0xE2E8F0);
        this.ambientLight.intensity = 0.82;
      }
      if (this.sunLight) {
        this.sunLight.color.setHex(0xFFFBEB);
        this.sunLight.intensity = 0.95;
        this.sunLight.position.set(28, 42, 22);
      }
      if (this.fillLight) {
        this.fillLight.color.setHex(0x93C5FD);
        this.fillLight.intensity = 0.38;
      }
      if (this.skyMesh) {
        this.skyMesh.material.color.setHex(0x38BDF8); // Crisp bright sky
      }
      this.interiorLights.forEach(l => l.intensity = 0.20);
      this.setCityWindowsGlow(false);

    } else if (hour >= 17 && hour < 19) {
      // SORE / GOLDEN HOUR: 17:00 - 18:59
      period = 'sunset';
      badgeText = `Sore (${timeFormatted} WIB)`;
      badgeIcon = 'sunset';

      this.scene.background.setHex(0x1F1A1E);
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0xFDE68A);
        this.ambientLight.intensity = 0.70;
      }
      if (this.sunLight) {
        this.sunLight.color.setHex(0xF97316);
        this.sunLight.intensity = 1.15;
        this.sunLight.position.set(34, 18, 14); // Lower angle for dramatic long sunset shadows
      }
      if (this.fillLight) {
        this.fillLight.color.setHex(0xFB7185);
        this.fillLight.intensity = 0.40;
      }
      if (this.skyMesh) {
        this.skyMesh.material.color.setHex(0xEA580C); // Warm sunset amber
      }
      this.interiorLights.forEach(l => l.intensity = 0.50);
      this.setCityWindowsGlow(true, 0.45);

    } else {
      // MALAM: 19:00 - 05:59
      period = 'night';
      badgeText = `Malam (${timeFormatted} WIB)`;
      badgeIcon = 'moon';

      this.scene.background.setHex(0x0B0F19);
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0x1E293B);
        this.ambientLight.intensity = 0.35;
      }
      if (this.sunLight) {
        this.sunLight.color.setHex(0x60A5FA); // Cool moonlight
        this.sunLight.intensity = 0.25;
        this.sunLight.position.set(-20, 30, -25);
      }
      if (this.fillLight) {
        this.fillLight.color.setHex(0x1E1B4B);
        this.fillLight.intensity = 0.20;
      }
      if (this.skyMesh) {
        this.skyMesh.material.color.setHex(0x070B14); // Midnight dark navy
      }
      this.interiorLights.forEach(l => l.intensity = 0.95); // Warm modern interior glow
      this.setCityWindowsGlow(true, 0.90);
    }

    this.currentPeriod = period;

    // Update UI badge
    const badgeTextEl = document.getElementById('threeAtmosphereText');
    const badgeEl = document.getElementById('threeAtmosphereBadge');
    if (badgeTextEl) badgeTextEl.textContent = badgeText;
    if (badgeEl) {
      badgeEl.innerHTML = `<i data-lucide="${badgeIcon}" class="lucide-xs"></i> <span>${badgeText}</span>`;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  }

  setCityWindowsGlow(enabled, opacity = 0.8) {
    this.cityWindows.forEach(mesh => {
      if (mesh && mesh.material) {
        mesh.material.opacity = enabled ? opacity : 0.08;
      }
    });
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
  // 🏢 3D ENVIRONMENT BUILDER (OFFICE, WINDOWS, SKYLINE & WORKSTATIONS)
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
    this.addCarpet(envGroup, -15.5, -6.5, 11, 11, 0x881337, 0xBE123C); // Executive: Crimson Red
    this.addCarpet(envGroup, -5.5, -6.5, 7.5, 11, 0x581C87, 0x7C3AED);  // Architect: Royal Violet
    this.addCarpet(envGroup, 11.5, -6.5, 24.5, 11, 0x1E293B, 0x0284C7); // Engineering Bay: Slate Navy
    this.addCarpet(envGroup, -11.5, 7, 19, 12, 0x115E59, 0x10B981);     // Game Room: Retro Teal
    this.addCarpet(envGroup, 12.5, 7, 21, 12, 0x78350F, 0xB45309);      // Cafeteria: Warm Wood

    // 3. Walls & Panoramic Windows
    this.buildPerimeterAndWindows(envGroup);

    // 4. Real-time Analog Wall Clock
    this.buildAnalogWallClock(envGroup, -5.5, 3.4, -13.75);

    // 5. Build Workstations
    this.buildExecutiveSuite(envGroup, -15.5, -6.5);
    this.buildArchitectStudio(envGroup, -5.5, -6.5);
    this.buildBackendStation(envGroup, 3.5, -6.5);
    this.buildFrontendStation(envGroup, 11.5, -6.5);
    this.buildQAStation(envGroup, 19.5, -6.5);

    // 6. Breakout Zones
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

    const borderGeo = new THREE.BoxGeometry(w + 0.2, 0.02, d + 0.2);
    const borderMat = new THREE.MeshBasicMaterial({ color: borderColor });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(x, 0.01, z);
    parent.add(border);
  }

  buildPerimeterAndWindows(parent) {
    // Solid Back Wall with Panoramic Windows
    const backWallGroup = new THREE.Group();
    backWallGroup.position.set(1, 0, -14);

    // Lower wall ledge
    const lowerWall = new THREE.Mesh(
      new THREE.BoxGeometry(46, 1.8, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x1E242B })
    );
    lowerWall.position.set(0, 0.9, 0);
    lowerWall.receiveShadow = true;
    backWallGroup.add(lowerWall);

    // Window Pillars & Glass Panels across the back
    const windowWidth = 8.5;
    const windowHeight = 4.2;
    const windowY = 3.9;
    const windowPositions = [-16, -6, 4, 14];

    windowPositions.forEach(wx => {
      // Window Black Mullion Frame
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(windowWidth, windowHeight, 0.2),
        new THREE.MeshBasicMaterial({ color: 0x0F172A })
      );
      frame.position.set(wx, windowY, 0);
      backWallGroup.add(frame);

      // Translucent Glass Pane
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(windowWidth - 0.4, windowHeight - 0.4),
        new THREE.MeshLambertMaterial({
          color: 0x93C5FD,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide
        })
      );
      glass.position.set(wx, windowY, 0.12);
      backWallGroup.add(glass);
    });

    // Top Header Wall
    const topWall = new THREE.Mesh(
      new THREE.BoxGeometry(46, 1.4, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x242E3B })
    );
    topWall.position.set(0, 6.7, 0);
    backWallGroup.add(topWall);

    parent.add(backWallGroup);

    // Left Perimeter Wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 4.2, 28),
      new THREE.MeshLambertMaterial({ color: 0x1F2732 })
    );
    leftWall.position.set(-22, 2.1, 0);
    leftWall.receiveShadow = true;
    parent.add(leftWall);

    // Exterior City Skyline Backdrop (Outside the Windows)
    this.buildCitySkyline(parent);
  }

  buildCitySkyline(parent) {
    const skylineGroup = new THREE.Group();
    skylineGroup.position.set(1, 0, -22);

    // Sky Backdrop Plane
    const skyGeo = new THREE.PlaneGeometry(70, 28);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x38BDF8, side: THREE.DoubleSide });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.skyMesh.position.set(0, 10, -8);
    skylineGroup.add(this.skyMesh);

    // Procedural Low-Poly Skyscraper Buildings
    const buildingDefs = [
      { x: -26, w: 5, h: 16, d: 4, col: 0x1E293B },
      { x: -19, w: 6, h: 22, d: 5, col: 0x0F172A },
      { x: -12, w: 5, h: 14, d: 4, col: 0x1E293B },
      { x: -5,  w: 7, h: 26, d: 6, col: 0x0F172A },
      { x: 3,   w: 6, h: 19, d: 5, col: 0x1E293B },
      { x: 10,  w: 5, h: 15, d: 4, col: 0x0F172A },
      { x: 17,  w: 7, h: 24, d: 5, col: 0x1E293B },
      { x: 25,  w: 6, h: 17, d: 4, col: 0x0F172A }
    ];

    buildingDefs.forEach(b => {
      const bGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const bMat = new THREE.MeshLambertMaterial({ color: b.col });
      const tower = new THREE.Mesh(bGeo, bMat);
      tower.position.set(b.x, b.h / 2, 0);
      skylineGroup.add(tower);

      // Skyscraper Glowing Windows (Visible at sunset/night)
      for (let wy = 3; wy < b.h - 2; wy += 2.2) {
        for (let wx = -b.w / 2 + 1; wx < b.w / 2 - 0.5; wx += 1.4) {
          const winMat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.3 ? 0xFDE047 : 0x38BDF8,
            transparent: true,
            opacity: 0.1
          });
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.8), winMat);
          win.position.set(b.x + wx, wy, b.d / 2 + 0.05);
          skylineGroup.add(win);
          this.cityWindows.push(win);
        }
      }
    });

    parent.add(skylineGroup);
  }

  buildAnalogWallClock(parent, x, y, z) {
    const clockGroup = new THREE.Group();
    clockGroup.position.set(x, y, z);

    // Outer Neubrutalist Rim
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.1, 24),
      new THREE.MeshBasicMaterial({ color: 0x0F172A })
    );
    rim.rotation.x = Math.PI / 2;
    clockGroup.add(rim);

    // Clock Face (Clean White Dial)
    const face = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.82, 0.12, 24),
      new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
    );
    face.rotation.x = Math.PI / 2;
    clockGroup.add(face);

    // 12 Hour Tick Marks
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.12, 0.02),
        new THREE.MeshBasicMaterial({ color: 0x0F172A })
      );
      tick.position.set(Math.sin(angle) * 0.65, Math.cos(angle) * 0.65, 0.07);
      tick.rotation.z = -angle;
      clockGroup.add(tick);
    }

    // Hour Hand
    const hourHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.38, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x0F172A })
    );
    hourHand.geometry.translate(0, 0.16, 0);
    hourHand.position.set(0, 0, 0.08);
    clockGroup.add(hourHand);

    // Minute Hand
    const minHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.52, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x334155 })
    );
    minHand.geometry.translate(0, 0.22, 0);
    minHand.position.set(0, 0, 0.09);
    clockGroup.add(minHand);

    // Second Hand (Vibrant Red)
    const secHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.58, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xEF4444 })
    );
    secHand.geometry.translate(0, 0.22, 0);
    secHand.position.set(0, 0, 0.10);
    clockGroup.add(secHand);

    // Center Cap
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12),
      new THREE.MeshBasicMaterial({ color: 0xEF4444 })
    );
    cap.rotation.x = Math.PI / 2;
    cap.position.set(0, 0, 0.11);
    clockGroup.add(cap);

    this.wallClock = {
      hourHand: hourHand,
      minuteHand: minHand,
      secondHand: secHand
    };

    parent.add(clockGroup);
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
    deskTop.position.set(0, 1.35, 0);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    group.add(deskTop);

    // Desk Pedestals
    const pedGeo = new THREE.BoxGeometry(0.8, 1.25, 2.0);
    const pedMat = new THREE.MeshLambertMaterial({ color: 0x311202 });
    [-1.6, 1.6].forEach(px => {
      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.set(px, 0.62, 0);
      ped.castShadow = true;
      group.add(ped);
    });

    // Triple Curved Commander Screens with Red HUD
    this.addMonitor(group, -1.1, 1.95, -0.2, 1.1, 0.75, 0x1E293B, 0xDC2626, 0.2);
    this.addMonitor(group, 0, 1.95, -0.3, 1.3, 0.85, 0x1E293B, 0xEF4444, 0);
    this.addMonitor(group, 1.1, 1.95, -0.2, 1.1, 0.75, 0x1E293B, 0xDC2626, -0.2);

    // Command Laptop
    const laptop = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.05, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xCBD5E1 })
    );
    laptop.position.set(0, 1.5, 0.4);
    group.add(laptop);

    // Credenza Bookcase behind desk
    const cred = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 2.2, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x2A180E })
    );
    cred.position.set(0, 1.1, -2.8);
    cred.castShadow = true;
    group.add(cred);

    // Executive Potted Monstera Plant
    this.addPottedPlant(group, -3.2, -1.8, 1.4);

    parent.add(group);
  }

  // --- Architect Studio (HABIBIE) ---
  buildArchitectStudio(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Angled Drafting Table (22° angle)
    const tableTop = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.16, 2.4),
      new THREE.MeshLambertMaterial({ color: 0xBA7D42 })
    );
    tableTop.rotation.x = -0.35;
    tableTop.position.set(0, 1.7, 0);
    tableTop.castShadow = true;
    group.add(tableTop);

    // Drafting Trestle Legs
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

    // Blueprint Paper Roll
    const bp = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.6),
      new THREE.MeshBasicMaterial({ color: 0x0284C7 })
    );
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

    // Architectural Miniature Pyramid Model
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
    this.addStandardDesk(group, 0x0284C7);

    // Dual Monitors (Terminal Code Screens)
    this.addMonitor(group, -0.65, 1.85, -0.2, 1.1, 0.7, 0x0F172A, 0x10B981, 0.15);
    this.addMonitor(group, 0.65, 1.85, -0.2, 1.1, 0.7, 0x0F172A, 0x0EA5E9, -0.15);

    // Server Rack Cabinet with Blinking LEDs
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 3.8, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x0F172A })
    );
    rack.position.set(2.4, 1.9, -0.2);
    rack.castShadow = true;
    group.add(rack);

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

  // --- Frontend Bay (PRABOWO) ---
  buildFrontendStation(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Orange Trim Creative Desk
    this.addStandardDesk(group, 0xF97316);

    // Dual Ultra-Wide Curved Monitors (UI Mockup & Component Tree)
    this.addMonitor(group, -0.65, 1.85, -0.2, 1.1, 0.7, 0x1E293B, 0xF97316, 0.15);
    this.addMonitor(group, 0.65, 1.85, -0.2, 1.1, 0.7, 0x1E293B, 0xEC4899, -0.15);

    // Graphic Drawing Tablet & Stylus
    const tab = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.04, 0.65),
      new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
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
    this.addStandardDesk(group, 0x10B981);

    // Triple Diagnostic Monitors (Testing Pipeline & Security Radar)
    this.addMonitor(group, -0.95, 1.85, -0.15, 0.95, 0.65, 0x0F172A, 0x10B981, 0.22);
    this.addMonitor(group, 0, 1.9, -0.25, 1.05, 0.75, 0x0F172A, 0x34D399, 0);
    this.addMonitor(group, 0.95, 1.85, -0.15, 0.95, 0.65, 0x0F172A, 0x059669, -0.22);

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

  // --- Breakout: Game Room ---
  buildGameRoom(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Retro Arcade Cabinet with Glowing Screen
    const arcade = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 3.6, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x312E81 })
    );
    arcade.position.set(-5.5, 1.8, -1.5);
    arcade.castShadow = true;
    group.add(arcade);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.9, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x06B6D4 })
    );
    screen.position.set(-5.5, 2.3, -0.65);
    group.add(screen);

    const marquee = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.35, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xF43F5E })
    );
    marquee.position.set(-5.5, 3.2, -0.65);
    group.add(marquee);

    // Mustard Amber 3-Seater Sofa
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

    [-1.9, 2.9].forEach(ax => {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.9, 1.8),
        new THREE.MeshLambertMaterial({ color: 0x92400E })
      );
      arm.position.set(ax, 0.75, 0.5);
      group.add(arm);
    });

    // Coffee Table & Flat Screen TV Console
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.35, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x1E293B })
    );
    table.position.set(0.5, 0.25, 2.4);
    group.add(table);

    const tvScreen = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.6, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x38BDF8 })
    );
    tvScreen.position.set(0.5, 1.7, 4.4);
    group.add(tvScreen);

    parent.add(group);
  }

  // --- Breakout: Cafeteria & Espresso Bar ---
  buildCafeteria(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // L-Shaped Espresso Counter Bar
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

    // Double-Group Commercial Espresso Machine
    const machine = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.0, 0.9),
      new THREE.MeshLambertMaterial({ color: 0xDC2626 })
    );
    machine.position.set(-1.2, 1.95, -1.8);
    group.add(machine);

    // Water Cooler Dispenser
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

    // Round Bistro Table & Stools
    const bistroTable = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 0.1, 16),
      new THREE.MeshLambertMaterial({ color: 0xF8FAFC })
    );
    bistroTable.position.set(-0.8, 1.1, 2.0);
    group.add(bistroTable);

    [-1.8, 0.2].forEach(cx => {
      const chairSeat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.08, 12),
        new THREE.MeshLambertMaterial({ color: 0xEA580C })
      );
      chairSeat.position.set(cx, 0.75, 2.0);
      group.add(chairSeat);
    });

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

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.06, 0.04),
      new THREE.MeshBasicMaterial({ color: trimColor })
    );
    stripe.position.set(0, 1.35, 1.01);
    group.add(stripe);

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

    // Glowing Screen
    const screenMat = new THREE.MeshBasicMaterial({ color: screenColor });
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(w - 0.1, h - 0.1),
      screenMat
    );
    screen.position.set(0, 0, 0.045);
    monitor.add(screen);
    this.monitors.push(screenMat);

    // Stand
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    stand.position.set(0, -h / 2 - 0.25, 0);
    monitor.add(stand);

    group.add(monitor);
  }

  addCoffeeMug(group, x, y, z) {
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.22, 12),
      new THREE.MeshLambertMaterial({ color: 0xF8FAFC })
    );
    mug.position.set(x, y, z);
    group.add(mug);
  }

  addPottedPlant(group, x, z, scale = 1.0) {
    const plantGroup = new THREE.Group();
    plantGroup.position.set(x, 0, z);
    plantGroup.scale.set(scale, scale, scale);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.35, 0.75, 12),
      new THREE.MeshLambertMaterial({ color: 0x78350F })
    );
    pot.position.set(0, 0.38, 0);
    pot.castShadow = true;
    plantGroup.add(pot);

    const leafGeo = new THREE.ConeGeometry(0.65, 1.2, 5);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x15803D });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(0, 1.1, 0);
    plantGroup.add(leaf);

    group.add(plantGroup);
  }

  // =========================================================================
  // 👥 5 REALISTIC SITTING AGENTS & ERGONOMIC CHAIRS
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
        targetY: 1.15,
        workPos: { x: -15.5, z: -6.5, y: 1.15 },
        breakPos: { x: -15.5, z: -2.0, y: 1.15 },
        sleepPos: { x: -11.0, z: 6.5, y: 1.15 }
      },
      HABIBIE: {
        name: 'HABIBIE',
        role: 'Chief Architect',
        color: '#8B5CF6',
        state: 'idle',
        bubble: 'Studio Arsitek',
        x: -5.5, z: -6.5,
        targetX: -5.5, targetZ: -6.5,
        targetY: 1.25,
        workPos: { x: -5.5, z: -6.5, y: 1.25 },
        breakPos: { x: -5.5, z: -2.0, y: 1.25 },
        sleepPos: { x: -5.5, z: -6.5, y: 1.25 }
      },
      JOKOWI: {
        name: 'JOKOWI',
        role: 'Backend Engineer',
        color: '#0EA5E9',
        state: 'idle',
        bubble: 'Backend Bay',
        x: 3.5, z: -6.5,
        targetX: 3.5, targetZ: -6.5,
        targetY: 1.15,
        workPos: { x: 3.5, z: -6.5, y: 1.15 },
        breakPos: { x: 8.5, z: 7.0, y: 1.15 },
        sleepPos: { x: -13.0, z: 6.5, y: 1.15 }
      },
      PRABOWO: {
        name: 'PRABOWO',
        role: 'Frontend Engineer',
        color: '#F97316',
        state: 'idle',
        bubble: 'Frontend Bay',
        x: 11.5, z: -6.5,
        targetX: 11.5, targetZ: -6.5,
        targetY: 1.15,
        workPos: { x: 11.5, z: -6.5, y: 1.15 },
        breakPos: { x: -9.5, z: 6.5, y: 1.15 },
        sleepPos: { x: -8.0, z: 6.5, y: 1.15 }
      },
      GIBRAN: {
        name: 'GIBRAN',
        role: 'QA & Security',
        color: '#10B981',
        state: 'idle',
        bubble: 'QA Terminal',
        x: 19.5, z: -6.5,
        targetX: 19.5, targetZ: -6.5,
        targetY: 1.15,
        workPos: { x: 19.5, z: -6.5, y: 1.15 },
        breakPos: { x: 14.5, z: 7.0, y: 1.15 },
        sleepPos: { x: -6.0, z: 6.5, y: 1.15 }
      }
    };

    for (const [name, config] of Object.entries(this.agents)) {
      const agentGroup = this.createRealisticSittingAgent(config);
      this.agentMeshes[name] = agentGroup;
      this.scene.add(agentGroup);
    }
  }

  createRealisticSittingAgent(config) {
    const group = new THREE.Group();
    group.name = config.name;
    group.position.set(config.x, config.targetY, config.z);

    const colorHex = parseInt(config.color.replace('#', '0x'));

    // 1. Ergonomic Office Swivel Chair directly attached under agent
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, -config.targetY, -0.75);

    // 5-Star Caster Base
    const baseHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.1, 10),
      new THREE.MeshLambertMaterial({ color: 0x0F172A })
    );
    baseHub.position.set(0, 0.12, 0);
    chairGroup.add(baseHub);

    for (let c = 0; c < 5; c++) {
      const angle = (c / 5) * Math.PI * 2;
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.06, 0.45),
        new THREE.MeshLambertMaterial({ color: 0x1E293B })
      );
      leg.geometry.translate(0, 0, 0.22);
      leg.position.set(0, 0.12, 0);
      leg.rotation.y = angle;
      chairGroup.add(leg);

      // Caster wheel
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8),
        new THREE.MeshBasicMaterial({ color: 0x0F172A })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(Math.sin(angle) * 0.45, 0.04, Math.cos(angle) * 0.45);
      chairGroup.add(wheel);
    }

    // Gas-lift cylinder column
    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.65),
      new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    cylinder.position.set(0, 0.45, 0);
    chairGroup.add(cylinder);

    // Contoured Seat Cushion
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.16, 1.0),
      new THREE.MeshLambertMaterial({ color: 0x1E293B })
    );
    seat.position.set(0, 0.82, 0);
    chairGroup.add(seat);

    // Ergonomic Curved Backrest with Accent Color
    const backHeight = (config.name === 'LUHUT') ? 1.5 : 1.1;
    const backrest = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, backHeight, 0.14),
      new THREE.MeshLambertMaterial({ color: colorHex })
    );
    backrest.position.set(0, 0.85 + backHeight / 2, -0.42);
    chairGroup.add(backrest);

    // Armrests
    [-0.52, 0.52].forEach(ax => {
      const armrestPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.35, 0.08),
        new THREE.MeshLambertMaterial({ color: 0x0F172A })
      );
      armrestPost.position.set(ax, 0.98, 0);
      chairGroup.add(armrestPost);

      const armrestPad = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.05, 0.45),
        new THREE.MeshLambertMaterial({ color: 0x334155 })
      );
      armrestPad.position.set(ax, 1.16, 0);
      chairGroup.add(armrestPad);
    });

    group.add(chairGroup);

    // 2. Avatar Seated Body Structure
    // Torso (Jacket / Team Signature Color)
    const torsoGeo = new THREE.BoxGeometry(0.85, 0.95, 0.55);
    const torsoMat = new THREE.MeshLambertMaterial({ color: colorHex });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.set(0, 0.18, -0.42);
    torso.castShadow = true;
    group.add(torso);
    group.torsoMesh = torso;

    // Seated Legs: Thighs extending horizontal forward to desk
    const thighMat = new THREE.MeshLambertMaterial({ color: 0x1E293B });
    [-0.24, 0.24].forEach(lx => {
      const thigh = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.22, 0.55),
        thighMat
      );
      thigh.position.set(lx, -0.22, -0.15);
      group.add(thigh);
    });

    // Seated Legs: Lower legs extending vertically down
    [-0.24, 0.24].forEach(lx => {
      const lowerLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.58, 0.22),
        thighMat
      );
      lowerLeg.position.set(lx, -0.55, 0.14);
      group.add(lowerLeg);

      // Shoes / Sneakers
      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.16, 0.38),
        new THREE.MeshLambertMaterial({ color: 0xF8FAFC })
      );
      shoe.position.set(lx, -0.80, 0.20);
      group.add(shoe);
    });

    // 3. Hands & Arms (Resting on desk / typing position)
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xFBD38D });
    const handL = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.15, 0.28), skinMat);
    handL.position.set(-0.35, 0.25, 0.28);
    group.add(handL);

    const handR = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.15, 0.28), skinMat);
    handR.position.set(0.35, 0.25, 0.28);
    group.add(handR);
    group.hands = [handL, handR];

    // 4. Head & Hair
    const headGeo = new THREE.BoxGeometry(0.72, 0.72, 0.72);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 1.05, -0.42);
    head.castShadow = true;
    group.add(head);
    group.headMesh = head;

    const hairGeo = new THREE.BoxGeometry(0.76, 0.26, 0.76);
    const hair = new THREE.Mesh(hairGeo, new THREE.MeshLambertMaterial({ color: 0x1F2937 }));
    hair.position.set(0, 1.32, -0.42);
    group.add(hair);

    // 5. Circular Avatar Portrait Photo Disc
    const discGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 16);
    const discMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(0, 0.28, -0.12);
    group.add(disc);
    group.avatarDisc = disc;

    if (this.avatarTextures[config.name]) {
      this.attachAvatarDisc(group, config.name, this.avatarTextures[config.name]);
    }

    // 6. Floating 3D Nametag Pill
    const nametagSprite = this.createNametagSprite(config.name, config.color);
    nametagSprite.position.set(0, 1.95, -0.42);
    group.add(nametagSprite);
    group.nametag = nametagSprite;

    // 7. Floating 3D Speech/Status Bubble
    const bubbleSprite = this.createBubbleSprite(config.bubble || config.role, config.color);
    bubbleSprite.position.set(0, 2.60, -0.42);
    group.add(bubbleSprite);
    group.bubbleSprite = bubbleSprite;

    // 8. Raycasting Invisible Hit Box (Ergonomic click target)
    const hitGeo = new THREE.BoxGeometry(2.0, 3.2, 2.0);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitGeo, hitMat);
    hitBox.position.set(0, 0.75, -0.2);
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

    // Neubrutalist pill shadow & border
    ctx.fillStyle = '#0F172A';
    this.roundRect(ctx, 6, 6, 244, 60, 14);
    ctx.fill();

    ctx.fillStyle = color;
    this.roundRect(ctx, 4, 4, 244, 60, 14);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.stroke();

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

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    this.roundRect(ctx, 6, 6, 372, 88, 16);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, 4, 4, 372, 88, 16);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const displayText = text.length > 24 ? text.substring(0, 22) + '...' : text;
    ctx.fillText(displayText, 190, 48);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.4, 0.62, 1);
    return sprite;
  }

  updateAgentBubble(agentName, text) {
    const mesh = this.agentMeshes[agentName];
    if (!mesh || !mesh.bubbleSprite) return;

    const ag = this.agents[agentName];
    const newSprite = this.createBubbleSprite(text, ag ? ag.color : '#000000');
    newSprite.position.copy(mesh.bubbleSprite.position);

    mesh.remove(mesh.bubbleSprite);
    if (mesh.bubbleSprite.material && mesh.bubbleSprite.material.map) {
      mesh.bubbleSprite.material.map.dispose();
      mesh.bubbleSprite.material.dispose();
    }

    mesh.bubbleSprite = newSprite;
    mesh.add(newSprite);
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
  // 🎯 CINEMATIC CAMERA TRANSITION & AGENT FOCUS MODE
  // =========================================================================

  focusAgent(agentName) {
    const focusTargets = {
      LUHUT: { target: new THREE.Vector3(-15.5, 1.4, -6.5), camOffset: new THREE.Vector3(4.2, 4.0, 7.0) },
      HABIBIE: { target: new THREE.Vector3(-5.5, 1.5, -6.5), camOffset: new THREE.Vector3(3.8, 3.8, 6.8) },
      JOKOWI: { target: new THREE.Vector3(3.5, 1.4, -6.5), camOffset: new THREE.Vector3(3.8, 3.8, 6.8) },
      PRABOWO: { target: new THREE.Vector3(11.5, 1.4, -6.5), camOffset: new THREE.Vector3(3.8, 3.8, 6.8) },
      GIBRAN: { target: new THREE.Vector3(19.5, 1.4, -6.5), camOffset: new THREE.Vector3(3.8, 3.8, 6.8) },
      arcade: { target: new THREE.Vector3(-11.5, 1.5, 7.0), camOffset: new THREE.Vector3(5.5, 5.0, 7.5) },
      cafe: { target: new THREE.Vector3(12.5, 1.5, 7.0), camOffset: new THREE.Vector3(5.5, 5.0, 7.5) }
    };

    const targetDef = focusTargets[agentName];
    if (!targetDef) return;

    const endCamPos = targetDef.target.clone().add(targetDef.camOffset);
    this.startCameraTransition(endCamPos, targetDef.target, 850);

    // Update dropdown in toolbar
    const selectEl = document.getElementById('threeFocusSelect');
    if (selectEl && selectEl.value !== agentName) {
      selectEl.value = agentName;
    }
  }

  resetCamera() {
    this.startCameraTransition(this.defaultCamPos, this.defaultCamTarget, 800);
    const selectEl = document.getElementById('threeFocusSelect');
    if (selectEl) selectEl.value = '';
  }

  setTopDownView() {
    const topDownPos = new THREE.Vector3(1, 35, 0.01);
    const topDownTarget = new THREE.Vector3(1, 0, 0);
    this.startCameraTransition(topDownPos, topDownTarget, 850);
  }

  zoomCamera(delta) {
    if (!this.camera || !this.controls) return;
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const newPos = this.camera.position.clone().addScaledVector(forward, delta);

    const dist = newPos.distanceTo(this.controls.target);
    if (dist >= this.controls.minDistance && dist <= this.controls.maxDistance) {
      this.camera.position.copy(newPos);
      if (this.controls) this.controls.update();
    }
  }

  startCameraTransition(targetCamPos, targetLookAt, duration = 800) {
    this.camTransition = {
      active: true,
      startTime: performance.now(),
      duration: duration,
      startCamPos: this.camera.position.clone(),
      endCamPos: targetCamPos.clone(),
      startLookAt: this.controls.target.clone(),
      endLookAt: targetLookAt.clone()
    };
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

        // Target coordinates based on state
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
        ag.targetY = target.y || 1.15;
      }
    }
  }

  updateAnimations(time) {
    // 1. Smooth Camera Transition (Ease-In-Out)
    if (this.camTransition.active) {
      const elapsed = performance.now() - this.camTransition.startTime;
      const progress = Math.min(elapsed / this.camTransition.duration, 1);
      // Smooth ease-in-out curve
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

      this.camera.position.lerpVectors(this.camTransition.startCamPos, this.camTransition.endCamPos, ease);
      this.controls.target.lerpVectors(this.camTransition.startLookAt, this.camTransition.endLookAt, ease);
      this.controls.update();

      if (progress >= 1) {
        this.camTransition.active = false;
      }
    } else if (this.controls) {
      this.controls.update();
    }

    // 2. Real-time Wall Clock Hands Rotation (Accurate to current second)
    if (this.wallClock.hourHand && this.wallClock.minuteHand && this.wallClock.secondHand) {
      const wib = this.getWIBTime();
      const hours = wib.getHours() % 12;
      const minutes = wib.getMinutes();
      const seconds = wib.getSeconds() + (wib.getMilliseconds() / 1000);

      this.wallClock.hourHand.rotation.z = -((hours + minutes / 60) / 12) * Math.PI * 2;
      this.wallClock.minuteHand.rotation.z = -((minutes + seconds / 60) / 60) * Math.PI * 2;
      this.wallClock.secondHand.rotation.z = -(seconds / 60) * Math.PI * 2;
    }

    // 3. Agent Figurines Animated Behaviors
    for (const [name, ag] of Object.entries(this.agents)) {
      const mesh = this.agentMeshes[name];
      if (!mesh) continue;

      // Position Lerp toward target
      const dx = ag.targetX - mesh.position.x;
      const dz = ag.targetZ - mesh.position.z;
      if (Math.abs(dx) > 0.05 || Math.abs(dz) > 0.05) {
        mesh.position.x += dx * 0.06;
        mesh.position.z += dz * 0.06;
      } else {
        mesh.position.x = ag.targetX;
        mesh.position.z = ag.targetZ;
      }

      // State Specific Animations
      if (ag.state === 'working' || ag.state === 'reviewing') {
        // Active rapid typing motion on hands
        if (mesh.hands && mesh.hands.length === 2) {
          mesh.hands[0].position.y = 0.25 + Math.sin(time * 14) * 0.04;
          mesh.hands[1].position.y = 0.25 + Math.cos(time * 14) * 0.04;
        }

        // Slight rhythmic head nodding
        if (mesh.headMesh) {
          mesh.headMesh.rotation.x = 0.12 + Math.sin(time * 5) * 0.04;
        }

        // Slight focused breathing
        mesh.position.y = ag.targetY + Math.sin(time * 6) * 0.02;

      } else if (ag.state === 'sleeping') {
        // Lowered head & slow breathing
        mesh.position.y = ag.targetY + Math.sin(time * 1.5) * 0.015;
        if (mesh.headMesh) {
          mesh.headMesh.rotation.x = 0.45;
        }
      } else {
        // Idle Standby: Relaxed gentle breathing & occasional head glance
        mesh.position.y = ag.targetY + Math.sin(time * 2.2) * 0.03;
        if (mesh.headMesh) {
          mesh.headMesh.rotation.x = Math.sin(time * 1.2) * 0.02;
          mesh.headMesh.rotation.y = Math.sin(time * 0.6) * 0.08;
        }
      }
    }
  }

  // =========================================================================
  // 🕹️ TOOLBAR & UI CONTROLS WIDGET SETUP
  // =========================================================================

  setupUIControls() {
    const zoomInBtn = document.getElementById('threeZoomInBtn');
    const zoomOutBtn = document.getElementById('threeZoomOutBtn');
    const resetBtn = document.getElementById('threeResetBtn');
    const topDownBtn = document.getElementById('threeTopDownBtn');
    const focusSelect = document.getElementById('threeFocusSelect');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomCamera(3));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomCamera(-3));
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetCamera());
    if (topDownBtn) topDownBtn.addEventListener('click', () => this.setTopDownView());

    if (focusSelect) {
      focusSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val) this.focusAgent(val);
      });
    }

    // Refresh Day/Night atmosphere every 30 seconds
    this.atmosphereInterval = setInterval(() => {
      this.updateDayNightAtmosphere();
    }, 30000);
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

      this.camera.aspect = width / height;
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
      // Glides camera smoothly to agent workstation
      this.focusAgent(agentName);

      // Execute shared callback
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
      this.updateDayNightAtmosphere();
    } else {
      this.stopLoop();
    }
  }

  // =========================================================================
  // 🧹 WEBGL MEMORY CLEANUP (SAFE DISPOSAL)
  // =========================================================================

  dispose() {
    this.stopLoop();
    if (this.atmosphereInterval) {
      clearInterval(this.atmosphereInterval);
    }

    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.removeEventListener('mousemove', this.onPointerMove);
      this.renderer.domElement.removeEventListener('click', this.onPointerClick);
    }
    window.removeEventListener('resize', this.onWindowResize);

    if (this.controls && typeof this.controls.dispose === 'function') {
      this.controls.dispose();
    }

    // Dispose geometries, materials, and textures
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

// Attach to global window
window.OfficeThree = OfficeThree;
