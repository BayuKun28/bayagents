/**
 * BayOffice - 3D Realistic Living Workspace Engine V2
 * Architecture: Dual-Engine Hybrid (Zero Homelab Server Overhead)
 * Technology: Three.js (r128) WebGL + OrbitControls (6-DoF)
 * Author: PRABOWO (Polyglot Frontend Engineer) - TASK-OPS-16 (PLAN-20261101-02)
 *
 * 🌟 V2 Epic Highlights:
 * 1. Dynamic Time Lighting Rig (5 Categories: Fajar, Siang, Sore, Malam, Larut Malam)
 *    synchronized to WIB (UTC+7) homelab time with interactive cycle preview.
 * 2. Architectural Cutaway Walls (1.4m height, neubrutalist trim, uninterrupted camera sightlines).
 * 3. Animated Interactive Pivot Doors with proximity auto-opening & manual click-to-toggle.
 * 4. Expressive Stylized 3D Avatars with procedural eye blinking, Habibie's peci & gold spectacles,
 *    Gibran's QA diagnostic visor, Luhut's executive tie & brows, Prabowo's headphones.
 * 5. Optimal 2D Photo Portrait Integration (3D Acrylic Desk Nameplates, Circular Bubble Badges,
 *    Wall of Fame Gallery with golden frames, and interactive Neubrutalist 2D Inspection Card HUD).
 * 6. Themed Room Furnishings: N-250 Gatotkaca tribute airplane model, billiard pool table,
 *    commercial espresso machine with rising steam particles, chalkboard cafe menu, pastry showcase,
 *    retro arcade cabinet, mini server rack with blinking LEDs, and World Operations Wall Map.
 * 7. Resource Guard: 60 FPS throttle, auto-pause on tab hidden, and safe WebGL memory disposal.
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
    this.hoveredObject = null;
    this.onAgentClick = null;

    // Atmosphere & 5 Time Categories
    this.ambientLight = null;
    this.sunLight = null;
    this.fillLight = null;
    this.interiorLights = [];
    this.accentNightLights = [];
    this.monitors = [];
    this.skyMesh = null;
    this.cityWindows = [];
    this.wallClock = { hourHand: null, minuteHand: null, secondHand: null };
    this.currentPeriod = 'day'; // 'dawn' | 'day' | 'sunset' | 'night' | 'midnight'
    this.forcedPeriod = null; // null for auto WIB, or 'dawn' | 'day' | 'sunset' | 'night' | 'midnight'

    // Interactive Doors
    this.doors = [];

    // Animated Steam Particles (Cafeteria Espresso Machine)
    this.steamParticles = [];

    // Animated Server Rack LEDs
    this.serverRackLeds = [];
    this.lastLedBlinkTime = 0;

    // Textures & Avatars
    this.textureLoader = new THREE.TextureLoader();
    this.avatarTextures = {};
    this.avatarImages = {};
    this.wallOfFamePortraits = {};

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
      this.loadAvatarAssets();
      this.buildOfficeEnvironment();
      this.initAgents();
      this.setupUIControls();
      this.setupEvents();
      this.updateDayNightAtmosphere();
      this.startLoop();

      console.log('[OfficeThree] BayOffice 3D V2 Realistic Themed Living Workspace initialized.');
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

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.outline = 'none';

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

      this.controls.minDistance = 6;
      this.controls.maxDistance = 38;
      this.controls.maxPolarAngle = 1.45; // ~83° clamp
      this.controls.target.copy(this.defaultCamTarget);

      this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    } else {
      console.warn('[OfficeThree] THREE.OrbitControls is not available.');
    }
  }

  // =========================================================================
  // ☀️ DAY / NIGHT DYNAMIC ATMOSPHERE & LIGHTING RIG (5 CATEGORIES)
  // =========================================================================

  initLightingAndAtmosphere() {
    // 1. Natural Ambient Light
    this.ambientLight = new THREE.AmbientLight(0xE2E8F0, 0.65);
    this.scene.add(this.ambientLight);

    // 2. Primary Directional Sunlight with Soft Shadows
    this.sunLight = new THREE.DirectionalLight(0xFFF9E6, 1.2);
    this.sunLight.position.set(28, 42, 22);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 100;
    const dLight = 30;
    this.sunLight.shadow.camera.left = -dLight;
    this.sunLight.shadow.camera.right = dLight;
    this.sunLight.shadow.camera.top = dLight;
    this.sunLight.shadow.camera.bottom = -dLight;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // 3. Soft Fill Light from Window Side
    this.fillLight = new THREE.DirectionalLight(0x93C5FD, 0.38);
    this.fillLight.position.set(-24, 25, -20);
    this.scene.add(this.fillLight);

    // 4. Ceiling Downlights for Each Room
    const downlightPositions = [
      { x: -15.5, y: 7.2, z: -6.5, color: 0xFDF4DC, intensity: 0.45 }, // Executive
      { x: -5.5, y: 7.2, z: -6.5, color: 0xFDF4DC, intensity: 0.45 },  // Architect
      { x: 3.5, y: 7.2, z: -6.5, color: 0xFDF4DC, intensity: 0.50 },   // Backend
      { x: 11.5, y: 7.2, z: -6.5, color: 0xFDF4DC, intensity: 0.50 },  // Frontend
      { x: 19.5, y: 7.2, z: -6.5, color: 0xFDF4DC, intensity: 0.50 },  // QA
      { x: -11.5, y: 7.2, z: 7.0, color: 0x38BDF8, intensity: 0.40 },  // Game Room
      { x: 12.5, y: 7.2, z: 7.0, color: 0xFDE68A, intensity: 0.45 }   // Cafeteria
    ];

    downlightPositions.forEach((dp) => {
      const pl = new THREE.PointLight(dp.color, dp.intensity, 24, 1.8);
      pl.position.set(dp.x, dp.y, dp.z);
      this.scene.add(pl);
      this.interiorLights.push(pl);
    });

    // 5. Cozy Night Shift Accent Lights (Architect Desk, Game Room Neon, Espresso Machine)
    const architectDeskLamp = new THREE.PointLight(0xFDE047, 0.2, 8, 2.0);
    architectDeskLamp.position.set(-4.4, 2.4, -6.9);
    this.scene.add(architectDeskLamp);
    this.accentNightLights.push({ light: architectDeskLamp, nightIntensity: 0.85, dayIntensity: 0.15 });

    const gameRoomNeon = new THREE.PointLight(0x8B5CF6, 0.2, 12, 1.8);
    gameRoomNeon.position.set(-17.0, 3.2, 5.5);
    this.scene.add(gameRoomNeon);
    this.accentNightLights.push({ light: gameRoomNeon, nightIntensity: 0.80, dayIntensity: 0.20 });

    const billiardLamp = new THREE.PointLight(0xFDE68A, 0.5, 10, 1.6);
    billiardLamp.position.set(-8.0, 4.0, 7.0);
    this.scene.add(billiardLamp);
    this.accentNightLights.push({ light: billiardLamp, nightIntensity: 0.90, dayIntensity: 0.35 });
  }

  getWIBTime() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 7));
  }

  updateDayNightAtmosphere() {
    const wib = this.getWIBTime();
    const hour = wib.getHours();
    const min = wib.getMinutes();
    const timeFormatted = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

    let period = this.forcedPeriod;
    if (!period) {
      // 5 Kategori Waktu Real-Time:
      // 1. Fajar: 05:00 - 06:29
      // 2. Siang: 06:30 - 15:29
      // 3. Sore (Golden Hour): 15:30 - 17:59
      // 4. Malam: 18:00 - 21:59
      // 5. Larut Malam: 22:00 - 04:59
      const totalMinutes = hour * 60 + min;
      if (totalMinutes >= 300 && totalMinutes < 390) {
        period = 'dawn';
      } else if (totalMinutes >= 390 && totalMinutes < 930) {
        period = 'day';
      } else if (totalMinutes >= 930 && totalMinutes < 1080) {
        period = 'sunset';
      } else if (totalMinutes >= 1080 && totalMinutes < 1320) {
        period = 'night';
      } else {
        period = 'midnight';
      }
    }

    let badgeText = `Siang (${timeFormatted} WIB)`;
    let badgeIcon = 'sun';

    if (period === 'dawn') {
      // 🌅 FAJAR / SUBUH (05:00 - 06:30)
      badgeText = `Fajar (${timeFormatted} WIB)`;
      badgeIcon = 'sunrise';

      this.scene.background.setHex(0x1E1B2E);
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0x7C8BA1);
        this.ambientLight.intensity = 0.45;
      }
      if (this.sunLight) {
        this.sunLight.color.setHex(0xFFD1A4);
        this.sunLight.intensity = 0.85;
        this.sunLight.position.set(32, 22, 18);
      }
      if (this.fillLight) {
        this.fillLight.color.setHex(0xC4B5FD);
        this.fillLight.intensity = 0.30;
      }
      if (this.skyMesh) {
        this.skyMesh.material.color.setHex(0xFDBA74);
      }
      this.interiorLights.forEach(l => l.intensity = 0.30);
      this.accentNightLights.forEach(a => a.light.intensity = a.dayIntensity);
      this.setCityWindowsGlow(true, 0.25);

    } else if (period === 'day') {
      // ☀️ SIANG CERAH (06:30 - 15:30)
      badgeText = `Siang (${timeFormatted} WIB)`;
      badgeIcon = 'sun';

      this.scene.background.setHex(0x13171C);
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0xE2E8F0);
        this.ambientLight.intensity = 0.65;
      }
      if (this.sunLight) {
        this.sunLight.color.setHex(0xFFF9E6);
        this.sunLight.intensity = 1.20;
        this.sunLight.position.set(28, 42, 22);
      }
      if (this.fillLight) {
        this.fillLight.color.setHex(0x93C5FD);
        this.fillLight.intensity = 0.38;
      }
      if (this.skyMesh) {
        this.skyMesh.material.color.setHex(0x38BDF8);
      }
      this.interiorLights.forEach(l => l.intensity = 0.20);
      this.accentNightLights.forEach(a => a.light.intensity = a.dayIntensity);
      this.setCityWindowsGlow(false, 0.05);

    } else if (period === 'sunset') {
      // 🌇 SORE / GOLDEN HOUR (15:30 - 18:00)
      badgeText = `Sore (${timeFormatted} WIB)`;
      badgeIcon = 'sunset';

      this.scene.background.setHex(0x24181A);
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0xFAD2A4);
        this.ambientLight.intensity = 0.50;
      }
      if (this.sunLight) {
        this.sunLight.color.setHex(0xF97316);
        this.sunLight.intensity = 1.05;
        this.sunLight.position.set(34, 18, 14); // Low angle long shadows
      }
      if (this.fillLight) {
        this.fillLight.color.setHex(0xFB7185);
        this.fillLight.intensity = 0.40;
      }
      if (this.skyMesh) {
        this.skyMesh.material.color.setHex(0xEA580C);
      }
      this.interiorLights.forEach(l => l.intensity = 0.50);
      this.accentNightLights.forEach(a => a.light.intensity = (a.dayIntensity + a.nightIntensity) / 2);
      this.setCityWindowsGlow(true, 0.45);

    } else if (period === 'night') {
      // 🌆 MALAM PRODUKTIF (18:00 - 22:00)
      badgeText = `Malam (${timeFormatted} WIB)`;
      badgeIcon = 'moon';

      this.scene.background.setHex(0x0B0F19);
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0x334155);
        this.ambientLight.intensity = 0.35;
      }
      if (this.sunLight) {
        this.sunLight.color.setHex(0x1E293B);
        this.sunLight.intensity = 0.15;
        this.sunLight.position.set(-20, 30, -25);
      }
      if (this.fillLight) {
        this.fillLight.color.setHex(0x1E1B4B);
        this.fillLight.intensity = 0.20;
      }
      if (this.skyMesh) {
        this.skyMesh.material.color.setHex(0x070B14);
      }
      this.interiorLights.forEach(l => {
        l.color.setHex(0xFFFBEB);
        l.intensity = 1.10;
      });
      this.accentNightLights.forEach(a => a.light.intensity = a.nightIntensity);
      this.setCityWindowsGlow(true, 0.90);

    } else {
      // 🌙 LARUT MALAM (NIGHT SHIFT: 22:00 - 05:00)
      badgeText = `Larut Malam (${timeFormatted} WIB)`;
      badgeIcon = 'moon';

      this.scene.background.setHex(0x06080E);
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0x0F172A);
        this.ambientLight.intensity = 0.20;
      }
      if (this.sunLight) {
        this.sunLight.color.setHex(0x0F172A);
        this.sunLight.intensity = 0.05;
        this.sunLight.position.set(-20, 30, -25);
      }
      if (this.fillLight) {
        this.fillLight.color.setHex(0x111827);
        this.fillLight.intensity = 0.15;
      }
      if (this.skyMesh) {
        this.skyMesh.material.color.setHex(0x050811);
      }
      // Main downlights dim for energy-saving, accents shine
      this.interiorLights.forEach(l => l.intensity = 0.15);
      this.accentNightLights.forEach(a => a.light.intensity = a.nightIntensity * 1.2);
      this.setCityWindowsGlow(true, 0.65);
    }

    this.currentPeriod = period;

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

  cycleAtmosphere() {
    const cycle = ['dawn', 'day', 'sunset', 'night', 'midnight', null];
    let nextIdx = 0;
    if (this.forcedPeriod !== null) {
      const curIdx = cycle.indexOf(this.forcedPeriod);
      nextIdx = (curIdx + 1) % cycle.length;
    }
    this.forcedPeriod = cycle[nextIdx];
    this.updateDayNightAtmosphere();
  }

  setCityWindowsGlow(enabled, opacity = 0.8) {
    this.cityWindows.forEach(mesh => {
      if (mesh && mesh.material) {
        mesh.material.opacity = enabled ? opacity : 0.05;
      }
    });
  }

  loadAvatarAssets() {
    const avatars = {
      LUHUT: '/static/assets/avatars/luhut.jpg',
      JOKOWI: '/static/assets/avatars/jokowi.jpg',
      PRABOWO: '/static/assets/avatars/prabowo.jpg',
      GIBRAN: '/static/assets/avatars/gibran.jpg',
      HABIBIE: '/static/assets/avatars/habibie.jpg'
    };

    for (const [name, url] of Object.entries(avatars)) {
      // 1. Texture for 3D meshes
      this.textureLoader.load(url, (texture) => {
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        this.avatarTextures[name] = texture;
        if (this.wallOfFamePortraits && this.wallOfFamePortraits[name]) {
          this.wallOfFamePortraits[name].material = new THREE.MeshBasicMaterial({
            map: texture
          });
        }
      });

      // 2. HTML Image for Canvas Speech Bubbles & Acrylic Plates
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = () => {
        this.avatarImages[name] = img;
        if (this.agentMeshes[name]) {
          this.refreshAgentBubble(name);
          this.refreshDeskNameplate(name);
        }
      };
    }
  }

  // =========================================================================
  // 🏢 3D ENVIRONMENT BUILDER (CUTAWAY WALLS, DOORS, SKYLINE & WORKSTATIONS)
  // =========================================================================

  buildOfficeEnvironment() {
    const envGroup = new THREE.Group();

    // 1. Base Floor Slab (Charcoal Slate)
    const floorGeo = new THREE.BoxGeometry(46, 1, 28);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x1E242B });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(1, -0.5, 0);
    floor.receiveShadow = true;
    envGroup.add(floor);

    // Floor Rim
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

    // 3. Perimeter Walls & Panoramic Windows (Back Wall + Left Wall)
    this.buildPerimeterAndWindows(envGroup);

    // 4. Architectural Cutaway Interior Walls & Animated Doors (1.4m height)
    this.buildCutawayWallsAndDoors(envGroup);

    // 5. Wall of Fame Gallery (Wall of Architects)
    this.buildWallOfFame(envGroup, 1, 3.8, -13.6);

    // 6. Real-time Analog Wall Clock
    this.buildAnalogWallClock(envGroup, -5.5, 3.4, -13.75);

    // 7. Themed Workstations
    this.buildExecutiveSuite(envGroup, -15.5, -6.5);
    this.buildArchitectStudio(envGroup, -5.5, -6.5);
    this.buildBackendStation(envGroup, 3.5, -6.5);
    this.buildFrontendStation(envGroup, 11.5, -6.5);
    this.buildQAStation(envGroup, 19.5, -6.5);

    // 8. Themed Breakout Zones (Game Room & Cafeteria Bar)
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
    const backWallGroup = new THREE.Group();
    backWallGroup.position.set(1, 0, -14);

    const lowerWall = new THREE.Mesh(
      new THREE.BoxGeometry(46, 1.8, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x1E242B })
    );
    lowerWall.position.set(0, 0.9, 0);
    lowerWall.receiveShadow = true;
    backWallGroup.add(lowerWall);

    const windowWidth = 8.5;
    const windowHeight = 4.2;
    const windowY = 3.9;
    const windowPositions = [-16, -6, 4, 14];

    windowPositions.forEach(wx => {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(windowWidth, windowHeight, 0.2),
        new THREE.MeshBasicMaterial({ color: 0x0F172A })
      );
      frame.position.set(wx, windowY, 0);
      backWallGroup.add(frame);

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

    // Exterior City Skyline
    this.buildCitySkyline(parent);
  }

  buildCitySkyline(parent) {
    const skylineGroup = new THREE.Group();
    skylineGroup.position.set(1, 0, -22);

    const skyGeo = new THREE.PlaneGeometry(70, 28);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x38BDF8, side: THREE.DoubleSide });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.skyMesh.position.set(0, 10, -8);
    skylineGroup.add(this.skyMesh);

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

      for (let wy = 3; wy < b.h - 2; wy += 2.2) {
        for (let wx = -b.w / 2 + 1; wx < b.w / 2 - 0.5; wx += 1.4) {
          const winMat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.3 ? 0xFDE047 : 0x38BDF8,
            transparent: true,
            opacity: 0.08
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

  // =========================================================================
  // 🚪 ARCHITECTURAL CUTAWAY WALLS & ANIMATED INTERACTIVE DOORS
  // =========================================================================

  buildCutawayWallsAndDoors(parent) {
    const wallGroup = new THREE.Group();

    // 1. Divider Wall between Executive Suite & Architect Studio (x = -9.8, z: -14 to 0)
    // Wall segment 1: z = -14 to -8.0 (length 6.0)
    this.addCutawayWallSegment(wallGroup, -9.8, -11.0, 0.32, 6.0);
    // Door opening at z = -6.8 (width 2.0)
    this.addInteractiveDoor(wallGroup, 'door_exec_arch', -9.8, -6.8, true, 'Ruang Eksekutif & Studio');
    // Wall segment 2: z = -5.6 to 0 (length 5.6)
    this.addCutawayWallSegment(wallGroup, -9.8, -2.8, 0.32, 5.6);

    // 2. Divider Wall between Architect Studio & Engineering Bay (x = -1.6, z: -14 to 0)
    // Wall segment 1: z = -14 to -8.0 (length 6.0)
    this.addCutawayWallSegment(wallGroup, -1.6, -11.0, 0.32, 6.0);
    // Door opening at z = -6.8 (width 2.0)
    this.addInteractiveDoor(wallGroup, 'door_arch_eng', -1.6, -6.8, true, 'Studio Arsitek & Engineering');
    // Wall segment 2: z = -5.6 to 0 (length 5.6)
    this.addCutawayWallSegment(wallGroup, -1.6, -2.8, 0.32, 5.6);

    // 3. Main Central Corridor Cutaway Wall (z = 0, x: -22 to +24)
    // Executive Suite entrance:
    this.addCutawayWallSegment(wallGroup, -19.5, 0, 5.0, 0.32);
    this.addInteractiveDoor(wallGroup, 'door_exec', -15.5, 0, false, 'Pintu Executive Suite');
    this.addCutawayWallSegment(wallGroup, -11.5, 0, 4.0, 0.32);

    // Architect Studio entrance:
    this.addInteractiveDoor(wallGroup, 'door_arch', -7.5, 0, false, 'Pintu Studio Arsitek');
    this.addCutawayWallSegment(wallGroup, -4.5, 0, 4.0, 0.32);

    // Engineering Bay entrance:
    this.addInteractiveDoor(wallGroup, 'door_eng', 0.5, 0, false, 'Pintu Engineering Bay');
    this.addCutawayWallSegment(wallGroup, 12.5, 0, 22.0, 0.32);

    // 4. Divider Wall between Game Room & Cafeteria (x = 0.5, z: 0 to +14)
    this.addCutawayWallSegment(wallGroup, 0.5, 3.5, 0.32, 7.0);
    this.addInteractiveDoor(wallGroup, 'door_game_cafe', 0.5, 8.5, true, 'Pintu Lounge & Kantin');
    this.addCutawayWallSegment(wallGroup, 0.5, 12.0, 0.32, 4.0);

    parent.add(wallGroup);
  }

  addCutawayWallSegment(parent, x, z, w, d) {
    const h = 1.4; // Chest-height architectural cutaway
    // Wall base body
    const wallGeo = new THREE.BoxGeometry(w, h, d);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x242E3B });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, h / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    parent.add(wall);

    // Top coping trim (Neubrutalist bold dark border)
    const capThickness = (w > d) ? { x: w + 0.1, z: d + 0.08 } : { x: w + 0.08, z: d + 0.1 };
    const capGeo = new THREE.BoxGeometry(capThickness.x, 0.08, capThickness.z);
    const capMat = new THREE.MeshBasicMaterial({ color: 0x0F172A });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(x, h + 0.04, z);
    parent.add(cap);
  }

  addInteractiveDoor(parent, doorId, x, z, isNorthSouthOriented, label) {
    const doorGroup = new THREE.Group();
    doorGroup.position.set(x, 0, z);

    const doorWidth = 1.6;
    const doorHeight = 1.65;
    const doorThickness = 0.08;

    // Doorway Frame Jambs
    const frameMat = new THREE.MeshBasicMaterial({ color: 0x0F172A });
    const postGeo = isNorthSouthOriented
      ? new THREE.BoxGeometry(0.36, doorHeight + 0.1, 0.12)
      : new THREE.BoxGeometry(0.12, doorHeight + 0.1, 0.36);

    // Post Left
    const postL = new THREE.Mesh(postGeo, frameMat);
    if (isNorthSouthOriented) {
      postL.position.set(0, (doorHeight + 0.1) / 2, -doorWidth / 2 - 0.06);
    } else {
      postL.position.set(-doorWidth / 2 - 0.06, (doorHeight + 0.1) / 2, 0);
    }
    doorGroup.add(postL);

    // Post Right
    const postR = new THREE.Mesh(postGeo, frameMat);
    if (isNorthSouthOriented) {
      postR.position.set(0, (doorHeight + 0.1) / 2, doorWidth / 2 + 0.06);
    } else {
      postR.position.set(doorWidth / 2 + 0.06, (doorHeight + 0.1) / 2, 0);
    }
    doorGroup.add(postR);

    // Top Header Lintol
    const lintolGeo = isNorthSouthOriented
      ? new THREE.BoxGeometry(0.38, 0.12, doorWidth + 0.24)
      : new THREE.BoxGeometry(doorWidth + 0.24, 0.12, 0.38);
    const lintol = new THREE.Mesh(lintolGeo, frameMat);
    lintol.position.set(0, doorHeight + 0.1, 0);
    doorGroup.add(lintol);

    // Pivot Group for smooth swinging animation
    const pivot = new THREE.Group();
    if (isNorthSouthOriented) {
      pivot.position.set(0, 0, -doorWidth / 2);
    } else {
      pivot.position.set(-doorWidth / 2, 0, 0);
    }

    // Door Leaf Mesh (Contemporary Warm Walnut Wood + Glass Inset)
    const leafGeo = isNorthSouthOriented
      ? new THREE.BoxGeometry(doorThickness, doorHeight, doorWidth)
      : new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x78350F });
    const leafMesh = new THREE.Mesh(leafGeo, leafMat);
    leafMesh.castShadow = true;

    if (isNorthSouthOriented) {
      leafMesh.position.set(0, doorHeight / 2, doorWidth / 2);
    } else {
      leafMesh.position.set(doorWidth / 2, doorHeight / 2, 0);
    }
    pivot.add(leafMesh);

    // Glass Vision Panel Inset
    const glassGeo = isNorthSouthOriented
      ? new THREE.PlaneGeometry(doorWidth * 0.45, doorHeight * 0.55)
      : new THREE.PlaneGeometry(doorWidth * 0.45, doorHeight * 0.55);
    const glassMat = new THREE.MeshLambertMaterial({
      color: 0x93C5FD,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    if (isNorthSouthOriented) {
      glass.rotation.y = Math.PI / 2;
      glass.position.set(0, doorHeight * 0.6, doorWidth / 2);
    } else {
      glass.position.set(doorWidth / 2, doorHeight * 0.6, 0.05);
    }
    pivot.add(glass);

    // Door Handle / Pull Bar
    const handleGeo = new THREE.BoxGeometry(0.04, 0.45, 0.04);
    const handleMat = new THREE.MeshLambertMaterial({ color: 0xF1F5F9 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    if (isNorthSouthOriented) {
      handle.position.set(0.08, doorHeight * 0.5, doorWidth * 0.85);
    } else {
      handle.position.set(doorWidth * 0.85, doorHeight * 0.5, 0.08);
    }
    pivot.add(handle);

    // Invisible Hit Box for Raycasting Click-to-Toggle
    const hitGeo = isNorthSouthOriented
      ? new THREE.BoxGeometry(1.2, doorHeight + 0.4, doorWidth + 0.4)
      : new THREE.BoxGeometry(doorWidth + 0.4, doorHeight + 0.4, 1.2);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitGeo, hitMat);
    hitBox.position.set(0, doorHeight / 2, 0);
    hitBox.userData = { isDoor: true, doorId: doorId, label: label };
    doorGroup.add(hitBox);
    this.interactiveObjects.push(hitBox);

    doorGroup.add(pivot);
    parent.add(doorGroup);

    // Door state tracker
    const doorObj = {
      id: doorId,
      label: label,
      worldX: x,
      worldZ: z,
      pivot: pivot,
      currentAngle: 0,
      targetAngle: 0,
      openAngle: -Math.PI / 2.2, // ~82° swing
      isOpen: false,
      isAutoOpen: false,
      isManualToggle: false
    };

    this.doors.push(doorObj);
  }

  toggleDoor(doorId) {
    const door = this.doors.find(d => d.id === doorId);
    if (!door) return;

    door.isManualToggle = !door.isManualToggle;
    if (window.soundFx && typeof window.soundFx.playDoorSwing === 'function') {
      window.soundFx.playDoorSwing();
    } else if (window.soundFx && typeof window.soundFx.playClick === 'function') {
      window.soundFx.playClick();
    }
  }

  // =========================================================================
  // 🖼️ WALL OF FAME (WALL OF ARCHITECTS 2D PORTRAITS GALLERY)
  // =========================================================================

  buildWallOfFame(parent, centerX, centerY, centerZ) {
    const galleryGroup = new THREE.Group();
    galleryGroup.position.set(centerX, centerY, centerZ);

    const frameList = [
      { name: 'LUHUT', title: 'Lead Orchestrator', x: -8.0, color: 0xEF4444 },
      { name: 'HABIBIE', title: 'Chief Architect', x: -4.0, color: 0x8B5CF6 },
      { name: 'JOKOWI', title: 'Backend Engineer', x: 0.0, color: 0x0EA5E9 },
      { name: 'PRABOWO', title: 'Frontend Engineer', x: 4.0, color: 0xF97316 },
      { name: 'GIBRAN', title: 'Universal QA', x: 8.0, color: 0x10B981 }
    ];

    frameList.forEach(item => {
      // Elegant Wooden / Golden Picture Frame
      const frameOuter = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 2.0, 0.12),
        new THREE.MeshLambertMaterial({ color: 0x451A03 })
      );
      frameOuter.position.set(item.x, 0, 0);
      galleryGroup.add(frameOuter);

      const frameGoldBevel = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.8, 0.14),
        new THREE.MeshLambertMaterial({ color: 0xD97706 })
      );
      frameGoldBevel.position.set(item.x, 0, 0.01);
      galleryGroup.add(frameGoldBevel);

      // Portrait Canvas / Texture Disc
      const portraitGeo = new THREE.PlaneGeometry(1.2, 1.5);
      const portraitMat = new THREE.MeshBasicMaterial({ color: item.color });
      const portrait = new THREE.Mesh(portraitGeo, portraitMat);
      portrait.position.set(item.x, 0, 0.09);
      galleryGroup.add(portrait);

      this.wallOfFamePortraits[item.name] = portrait;

      // Load texture onto portrait plane if ready
      if (this.avatarTextures[item.name]) {
        portrait.material = new THREE.MeshBasicMaterial({
          map: this.avatarTextures[item.name]
        });
      }

      // Engraved Brass Nameplate underneath
      const brassPlate = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.22, 0.04),
        new THREE.MeshBasicMaterial({ color: 0xF59E0B })
      );
      brassPlate.position.set(item.x, -1.15, 0.08);
      galleryGroup.add(brassPlate);
    });

    parent.add(galleryGroup);
  }

  // =========================================================================
  // ⏱️ REAL-TIME ANALOG WALL CLOCK
  // =========================================================================

  buildAnalogWallClock(parent, x, y, z) {
    const clockGroup = new THREE.Group();
    clockGroup.position.set(x, y, z);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.1, 24),
      new THREE.MeshBasicMaterial({ color: 0x0F172A })
    );
    rim.rotation.x = Math.PI / 2;
    clockGroup.add(rim);

    const face = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.82, 0.12, 24),
      new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
    );
    face.rotation.x = Math.PI / 2;
    clockGroup.add(face);

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

    const hourHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.38, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x0F172A })
    );
    hourHand.geometry.translate(0, 0.16, 0);
    hourHand.position.set(0, 0, 0.08);
    clockGroup.add(hourHand);

    const minHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.52, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x334155 })
    );
    minHand.geometry.translate(0, 0.22, 0);
    minHand.position.set(0, 0, 0.09);
    clockGroup.add(minHand);

    const secHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.58, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xEF4444 })
    );
    secHand.geometry.translate(0, 0.22, 0);
    secHand.position.set(0, 0, 0.10);
    clockGroup.add(secHand);

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

  // =========================================================================
  // 🏢 THEMED WORKSTATIONS (1. EXECUTIVE SUITE - LUHUT)
  // =========================================================================

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

    // Leather Desk Blotter
    const blotter = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.03, 1.4),
      new THREE.MeshLambertMaterial({ color: 0x1E1B18 })
    );
    blotter.position.set(0, 1.48, 0.1);
    group.add(blotter);

    // Triple Curved Commander Screens with Red HUD
    this.addMonitor(group, -1.1, 1.95, -0.2, 1.1, 0.75, 0x1E293B, 0xDC2626, 0.2);
    this.addMonitor(group, 0, 1.95, -0.3, 1.3, 0.85, 0x1E293B, 0xEF4444, 0);
    this.addMonitor(group, 1.1, 1.95, -0.2, 1.1, 0.75, 0x1E293B, 0xDC2626, -0.2);

    // Executive Laptop
    const laptop = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.05, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xCBD5E1 })
    );
    laptop.position.set(-0.6, 1.5, 0.4);
    group.add(laptop);

    // Miniature Indonesian Merah-Putih Desk Flag on Brass Pole
    const flagPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.02, 0.65),
      new THREE.MeshBasicMaterial({ color: 0xF59E0B })
    );
    flagPole.position.set(1.4, 1.78, 0.6);
    group.add(flagPole);

    const flagRed = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.08, 0.01),
      new THREE.MeshBasicMaterial({ color: 0xEF4444 })
    );
    flagRed.position.set(1.53, 2.04, 0.6);
    group.add(flagRed);

    const flagWhite = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.08, 0.01),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
    );
    flagWhite.position.set(1.53, 1.96, 0.6);
    group.add(flagWhite);

    // 3D Acrylic Desk Nameplate for LUHUT
    this.addAcrylicDeskNameplate(group, 'LUHUT', 'Lead Orchestrator', '#EF4444', 1.4, 1.48, 0.25);

    // World Operations Wall Map on Back Wall
    const mapFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 2.0, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x0F172A })
    );
    mapFrame.position.set(0, 3.8, -2.85);
    group.add(mapFrame);

    const mapCanvas = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.8),
      new THREE.MeshLambertMaterial({ color: 0x0284C7 })
    );
    mapCanvas.position.set(0, 3.8, -2.79);
    group.add(mapCanvas);

    // Credenza Bookcase behind desk
    const cred = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 2.2, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x2A180E })
    );
    cred.position.set(0, 1.1, -2.8);
    cred.castShadow = true;
    group.add(cred);

    // Executive Guest Lounge: Leather Sofa & Glass Coffee Table
    const sofaSeat = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.45, 1.1),
      new THREE.MeshLambertMaterial({ color: 0x451A03 })
    );
    sofaSeat.position.set(-3.2, 0.45, 1.2);
    group.add(sofaSeat);

    const sofaBack = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.9, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x311202 })
    );
    sofaBack.position.set(-3.2, 0.9, 0.7);
    group.add(sofaBack);

    // Glass Coffee Table
    const coffeeTable = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.4, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x0F172A })
    );
    coffeeTable.position.set(-3.2, 0.25, 2.4);
    group.add(coffeeTable);

    // Executive Tall Potted Fan Palm
    this.addPottedPlant(group, 3.2, -1.8, 1.5);

    parent.add(group);
  }

  // =========================================================================
  // 📐 THEMED WORKSTATIONS (2. ARCHITECT STUDIO - HABIBIE)
  // =========================================================================

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

    // Architectural Blueprint Paper Roll
    const bp = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.6),
      new THREE.MeshBasicMaterial({ color: 0x0284C7 })
    );
    bp.rotation.x = -0.35 - Math.PI / 2;
    bp.position.set(0, 1.79, 0.02);
    group.add(bp);

    // Technical Drawing Compass & Ruler on Blueprint
    const ruler = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.02, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xFDE047 })
    );
    ruler.rotation.x = -0.35;
    ruler.rotation.y = 0.3;
    ruler.position.set(0.6, 1.83, 0.1);
    group.add(ruler);

    // Architect Articulated Anglepoise Desk Lamp
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

    // 3D Acrylic Desk Nameplate for HABIBIE
    this.addAcrylicDeskNameplate(group, 'HABIBIE', 'Chief Architect', '#8B5CF6', 1.4, 1.75, 0.6);

    // Credenza Cabinet next to Drafting Table
    const cred = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.3, 0.9),
      new THREE.MeshLambertMaterial({ color: 0x3E2723 })
    );
    cred.position.set(-2.5, 0.65, -1.4);
    cred.castShadow = true;
    group.add(cred);

    // ✈️ MINIATURE AERODYNAMIC AIRPLANE MODEL (TRIBUTE TO N-250 GATOTKACA!)
    this.buildN250AirplaneModel(group, -2.5, 1.45, -1.4);

    // Grand Bookshelf with Architecture & Distributed Systems Volumes
    this.buildBookshelf(group, 0, 0, -2.8);

    parent.add(group);
  }

  buildN250AirplaneModel(parent, x, y, z) {
    const planeGroup = new THREE.Group();
    planeGroup.position.set(x, y, z);
    planeGroup.rotation.y = 0.45; // Sleek angled presentation

    // Chrome Stand
    const standBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.05, 12),
      new THREE.MeshLambertMaterial({ color: 0xCBD5E1 })
    );
    planeGroup.add(standBase);

    const standPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x94A3B8 })
    );
    standPost.position.set(0, 0.2, 0);
    planeGroup.add(standPost);

    // Airplane Body Group
    const airplane = new THREE.Group();
    airplane.position.set(0, 0.42, 0);

    // Fuselage (Sleek aerodynamic white body)
    const fuseGeo = new THREE.CylinderGeometry(0.10, 0.08, 1.35, 12);
    const fuseMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    const fuse = new THREE.Mesh(fuseGeo, fuseMat);
    fuse.rotation.x = Math.PI / 2;
    airplane.add(fuse);

    // Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.10, 0.25, 12);
    const nose = new THREE.Mesh(noseGeo, fuseMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 0, 0.78);
    airplane.add(nose);

    // Blue & Gold Livery Stripe
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.102, 0.102, 0.7, 12),
      new THREE.MeshBasicMaterial({ color: 0x1E3A8A })
    );
    stripe.rotation.x = Math.PI / 2;
    stripe.position.set(0, 0, 0.1);
    airplane.add(stripe);

    // High-Mounted Main Wings (N-250 Regional Turboprop signature)
    const wingGeo = new THREE.BoxGeometry(1.5, 0.03, 0.26);
    const wingMat = new THREE.MeshLambertMaterial({ color: 0xE2E8F0 });
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(0, 0.1, 0.15);
    airplane.add(wing);

    // Twin Turboprop Engine Nacelles
    [-0.45, 0.45].forEach(ex => {
      const nacelle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.32, 10),
        new THREE.MeshLambertMaterial({ color: 0x475569 })
      );
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(ex, 0.05, 0.2);
      airplane.add(nacelle);

      // 4-Blade Propeller Spinner
      const propSpinner = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.08, 8),
        new THREE.MeshBasicMaterial({ color: 0xF59E0B })
      );
      propSpinner.rotation.x = -Math.PI / 2;
      propSpinner.position.set(ex, 0.05, 0.38);
      airplane.add(propSpinner);

      const propBlades = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.02, 0.01),
        new THREE.MeshBasicMaterial({ color: 0x0F172A })
      );
      propBlades.position.set(ex, 0.05, 0.37);
      airplane.add(propBlades);
    });

    // T-Tail Vertical Fin
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.32, 0.22),
      new THREE.MeshLambertMaterial({ color: 0x1E3A8A })
    );
    fin.position.set(0, 0.18, -0.55);
    airplane.add(fin);

    // T-Tail Horizontal Stabilizer atop fin
    const stab = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.02, 0.14),
      new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
    );
    stab.position.set(0, 0.34, -0.6);
    airplane.add(stab);

    planeGroup.add(airplane);
    parent.add(planeGroup);
  }

  buildBookshelf(parent, x, y, z) {
    const shelf = new THREE.Group();
    shelf.position.set(x, y, z);

    // Shelving Unit Frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 2.4, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x2A180E })
    );
    frame.position.set(0, 1.2, 0);
    frame.castShadow = true;
    shelf.add(frame);

    // Colorful Multi-Volume Book Spines
    const bookColors = [0xEF4444, 0x3B82F6, 0x10B981, 0xF59E0B, 0x8B5CF6, 0xEC4899];
    [0.55, 1.15, 1.75].forEach(shelfY => {
      for (let bx = -1.4; bx <= 1.4; bx += 0.22) {
        const col = bookColors[Math.floor(Math.random() * bookColors.length)];
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.42, 0.45),
          new THREE.MeshLambertMaterial({ color: col })
        );
        b.position.set(bx, shelfY, 0.05);
        shelf.add(b);
      }
    });

    parent.add(shelf);
  }

  // =========================================================================
  // ⚙️ THEMED WORKSTATIONS (3. BACKEND BAY - JOKOWI)
  // =========================================================================

  buildBackendStation(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    this.addStandardDesk(group, 0x0284C7);

    // Triple Terminal Code Monitors
    this.addMonitor(group, -0.9, 1.85, -0.15, 0.95, 0.65, 0x0F172A, 0x10B981, 0.20);
    this.addMonitor(group, 0, 1.9, -0.25, 1.15, 0.75, 0x0F172A, 0x0EA5E9, 0);
    this.addMonitor(group, 0.9, 1.85, -0.15, 0.95, 0.65, 0x0F172A, 0x10B981, -0.20);

    // 3D Acrylic Desk Nameplate for JOKOWI
    this.addAcrylicDeskNameplate(group, 'JOKOWI', 'Backend Engineer', '#0EA5E9', 1.2, 1.45, 0.5);

    // Server Rack Cabinet with Interactive Blinking LEDs
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 3.8, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x0F172A })
    );
    rack.position.set(2.4, 1.9, -0.2);
    rack.castShadow = true;
    group.add(rack);

    // Blinking Server LEDs
    [-0.8, -0.4, 0, 0.4, 0.8, 1.2].forEach(ly => {
      for (let lx = -0.5; lx <= 0.5; lx += 0.25) {
        const ledMat = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.4 ? 0x10B981 : 0x0EA5E9
        });
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05), ledMat);
        led.position.set(2.4 + lx, 1.9 + ly, 0.62);
        group.add(led);
        this.serverRackLeds.push(led);
      }
    });

    this.addCoffeeMug(group, -1.1, 1.45, 0.3);

    parent.add(group);
  }

  // =========================================================================
  // 🎨 THEMED WORKSTATIONS (4. FRONTEND BAY - PRABOWO)
  // =========================================================================

  buildFrontendStation(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    this.addStandardDesk(group, 0xF97316);

    // Dual Ultra-Wide Curved Monitors (UI Mockups & CSS Artboards)
    this.addMonitor(group, -0.65, 1.85, -0.2, 1.1, 0.7, 0x1E293B, 0xF97316, 0.15);
    this.addMonitor(group, 0.65, 1.85, -0.2, 1.1, 0.7, 0x1E293B, 0xEC4899, -0.15);

    // Wacom Graphics Tablet & Stylus Pen
    const tab = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.04, 0.65),
      new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    tab.position.set(0, 1.42, 0.25);
    group.add(tab);

    const stylus = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xF97316 })
    );
    stylus.rotation.z = Math.PI / 3;
    stylus.position.set(0.3, 1.45, 0.35);
    group.add(stylus);

    // Pantone Color Swatch Fan Deck
    const swatch = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.03, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xF59E0B })
    );
    swatch.rotation.y = 0.4;
    swatch.position.set(-0.85, 1.44, 0.35);
    group.add(swatch);

    // Desk Partition Wireframe Pinboard
    const pinboard = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1.0, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    pinboard.position.set(0, 2.0, -1.02);
    group.add(pinboard);

    // Sticky Wireframe Post-It Notes on Pinboard
    [-1.2, -0.5, 0.3, 1.1].forEach(px => {
      const note = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, 0.28),
        new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xFDE047 : 0x38BDF8 })
      );
      note.position.set(px, 2.1, -0.98);
      group.add(note);
    });

    // 3D Acrylic Desk Nameplate for PRABOWO
    this.addAcrylicDeskNameplate(group, 'PRABOWO', 'Frontend Engineer', '#F97316', 1.2, 1.45, 0.5);

    this.addPottedPlant(group, 1.25, -0.3, 0.6);

    parent.add(group);
  }

  // =========================================================================
  // 🛡️ THEMED WORKSTATIONS (5. QA & SECURITY - GIBRAN)
  // =========================================================================

  buildQAStation(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    this.addStandardDesk(group, 0x10B981);

    // Dual Vertical Monitors for Testing & Inspect
    this.addMonitor(group, -0.65, 1.95, -0.2, 0.75, 1.15, 0x0F172A, 0x10B981, 0.15);
    this.addMonitor(group, 0.65, 1.95, -0.2, 0.75, 1.15, 0x0F172A, 0x34D399, -0.15);

    // Desktop Diagnostic Oscilloscope
    const oscBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.55, 0.65),
      new THREE.MeshLambertMaterial({ color: 0x1E293B })
    );
    oscBox.position.set(-1.1, 1.62, 0.3);
    group.add(oscBox);

    const oscScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.35),
      new THREE.MeshBasicMaterial({ color: 0x059669 })
    );
    oscScreen.position.set(-1.1, 1.62, 0.63);
    group.add(oscScreen);

    // Mini 3D Test Status Traffic Light
    const trafficLight = new THREE.Group();
    trafficLight.position.set(1.1, 1.8, -0.1);

    const tlBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.55, 0.18),
      new THREE.MeshLambertMaterial({ color: 0x0F172A })
    );
    trafficLight.add(tlBox);

    const greenLed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12),
      new THREE.MeshBasicMaterial({ color: 0x10B981 })
    );
    greenLed.rotation.x = Math.PI / 2;
    greenLed.position.set(0, -0.15, 0.1);
    trafficLight.add(greenLed);

    const amberLed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12),
      new THREE.MeshBasicMaterial({ color: 0x475569 })
    );
    amberLed.rotation.x = Math.PI / 2;
    amberLed.position.set(0, 0, 0.1);
    trafficLight.add(amberLed);

    const redLed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12),
      new THREE.MeshBasicMaterial({ color: 0x475569 })
    );
    redLed.rotation.x = Math.PI / 2;
    redLed.position.set(0, 0.15, 0.1);
    trafficLight.add(redLed);

    group.add(trafficLight);

    // Gold Security Shield Trophy on desk
    const shield = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.45, 3),
      new THREE.MeshLambertMaterial({ color: 0xF59E0B })
    );
    shield.rotation.z = Math.PI;
    shield.position.set(-1.2, 1.65, -0.3);
    group.add(shield);

    // 3D Acrylic Desk Nameplate for GIBRAN
    this.addAcrylicDeskNameplate(group, 'GIBRAN', 'Universal QA', '#10B981', 1.2, 1.45, 0.5);

    parent.add(group);
  }

  // =========================================================================
  // 🏷️ 3D ACRYLIC DESK NAMEPLATES (2D PHOTO + NAME IN 3D ACRYLIC BLOCK)
  // =========================================================================

  addAcrylicDeskNameplate(group, name, role, color, x, y, z) {
    const plateGroup = new THREE.Group();
    plateGroup.position.set(x, y, z);
    plateGroup.rotation.y = -0.35; // Angled toward viewer

    // Black Beveled Weighted Base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.06, 0.26),
      new THREE.MeshBasicMaterial({ color: 0x0F172A })
    );
    plateGroup.add(base);

    // Clear Acrylic Slab
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(0.80, 0.52, 0.05),
      new THREE.MeshLambertMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.85
      })
    );
    slab.position.set(0, 0.28, 0);
    plateGroup.add(slab);

    // Front Textured Plaque
    const plaqueGeo = new THREE.PlaneGeometry(0.76, 0.48);
    const plaqueCanvas = this.createNameplateCanvas(name, role, color);
    const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
    const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTex });
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(0, 0.28, 0.03);
    plateGroup.add(plaque);

    plateGroup.plaqueMesh = plaque;
    plateGroup.agentName = name;
    plateGroup.role = role;
    plateGroup.color = color;

    // Clickable hit box
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.6, 0.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(0, 0.28, 0);
    hitBox.userData = { agentName: name, isNameplate: true };
    plateGroup.add(hitBox);
    this.interactiveObjects.push(hitBox);

    group.add(plateGroup);
    if (!this.deskNameplates) this.deskNameplates = {};
    this.deskNameplates[name] = plateGroup;
  }

  createNameplateCanvas(name, role, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 384, 240);

    // Top Division Color Accent Strip
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 384, 16);

    // Border
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 378, 234);

    // 2D Avatar Portrait Circle
    const img = this.avatarImages[name];
    ctx.save();
    ctx.beginPath();
    ctx.arc(76, 128, 48, 0, Math.PI * 2);
    ctx.clip();
    if (img && img.complete) {
      ctx.drawImage(img, 28, 80, 96, 96);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(28, 80, 96, 96);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name[0], 76, 128);
    }
    ctx.restore();

    // Portrait Outer Ring
    ctx.beginPath();
    ctx.arc(76, 128, 48, 0, Math.PI * 2);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Agent Name
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name, 146, 115);

    // Agent Role
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(role, 146, 155);

    return canvas;
  }

  refreshDeskNameplate(name) {
    if (!this.deskNameplates || !this.deskNameplates[name]) return;
    const plate = this.deskNameplates[name];
    const newCanvas = this.createNameplateCanvas(name, plate.role, plate.color);
    if (plate.plaqueMesh) {
      if (plate.plaqueMesh.material.map) plate.plaqueMesh.material.map.dispose();
      plate.plaqueMesh.material.map = new THREE.CanvasTexture(newCanvas);
      plate.plaqueMesh.material.needsUpdate = true;
    }
  }

  // =========================================================================
  // 🕹️ BREAKOUT ZONE 1: GAME ROOM & RELAXATION LOUNGE
  // =========================================================================

  buildGameRoom(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // 1. CLASSIC BILLIARD / POOL TABLE
    this.buildBilliardTable(group, -8.0, 7.0);

    // 2. RETRO ARCADE CABINET (Neon Synthwave Marquee)
    this.buildArcadeCabinet(group, -17.0, 4.5);

    // 3. MUSTARD L-SHAPED LOUNGE SOFA
    const sofaSeatA = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.6, 1.6),
      new THREE.MeshLambertMaterial({ color: 0xD97706 })
    );
    sofaSeatA.position.set(-14.0, 0.45, 10.5);
    sofaSeatA.castShadow = true;
    group.add(sofaSeatA);

    const sofaSeatB = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.6, 3.2),
      new THREE.MeshLambertMaterial({ color: 0xD97706 })
    );
    sofaSeatB.position.set(-16.0, 0.45, 8.1);
    sofaSeatB.castShadow = true;
    group.add(sofaSeatB);

    // 4. 65" WALL SMART TV & CONSOLE
    const tvScreen = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 1.9, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x38BDF8 })
    );
    tvScreen.position.set(-14.0, 2.4, 13.8);
    group.add(tvScreen);

    const tvConsole = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.12, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x0F172A })
    );
    tvConsole.position.set(-14.0, 0.8, 13.5);
    group.add(tvConsole);

    parent.add(group);
  }

  buildBilliardTable(parent, x, z) {
    const tableGroup = new THREE.Group();
    tableGroup.position.set(x, 0, z);

    // Mahogany Legs & Frame
    const legGeo = new THREE.CylinderGeometry(0.2, 0.16, 1.2, 10);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x3E1E0F });
    [
      { lx: -2.2, lz: -1.2 }, { lx: 2.2, lz: -1.2 },
      { lx: -2.2, lz: 1.2 }, { lx: 2.2, lz: 1.2 }
    ].forEach(p => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(p.lx, 0.6, p.lz);
      tableGroup.add(leg);
    });

    // Table Under-Bed Frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.4, 3.0),
      new THREE.MeshLambertMaterial({ color: 0x2A140A })
    );
    frame.position.set(0, 1.2, 0);
    tableGroup.add(frame);

    // Vibrant Emerald Green Pool Felt Surface
    const felt = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.08, 2.6),
      new THREE.MeshLambertMaterial({ color: 0x15803D })
    );
    felt.position.set(0, 1.42, 0);
    tableGroup.add(felt);

    // Wood Cushions Rails
    const railMat = new THREE.MeshLambertMaterial({ color: 0x5C2B14 });
    const railT = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.15, 0.2), railMat);
    railT.position.set(0, 1.46, -1.3);
    tableGroup.add(railT);

    const railB = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.15, 0.2), railMat);
    railB.position.set(0, 1.46, 1.3);
    tableGroup.add(railB);

    // 6 Pockets (Black cylinders)
    [
      { px: -2.3, pz: -1.2 }, { px: 0, pz: -1.25 }, { px: 2.3, pz: -1.2 },
      { px: -2.3, pz: 1.2 }, { px: 0, pz: 1.25 }, { px: 2.3, pz: 1.2 }
    ].forEach(p => {
      const pocket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.16, 12),
        new THREE.MeshBasicMaterial({ color: 0x0F172A })
      );
      pocket.position.set(p.px, 1.44, p.pz);
      tableGroup.add(pocket);
    });

    // Racked Pool Balls Triangle
    const ballMat = new THREE.MeshBasicMaterial({ color: 0xEF4444 });
    const whiteBallMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col <= row; col++) {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), ballMat);
        ball.position.set(0.6 + row * 0.11, 1.5, (col - row / 2) * 0.13);
        tableGroup.add(ball);
      }
    }
    const cueBall = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), whiteBallMat);
    cueBall.position.set(-1.2, 1.5, 0);
    tableGroup.add(cueBall);

    // Overhead Brass Dual Pool Lamps
    const lampBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 2.2),
      new THREE.MeshLambertMaterial({ color: 0xD97706 })
    );
    lampBeam.rotation.z = Math.PI / 2;
    lampBeam.position.set(0, 3.5, 0);
    tableGroup.add(lampBeam);

    [-0.8, 0.8].forEach(lx => {
      const shade = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 0.4, 12),
        new THREE.MeshLambertMaterial({ color: 0x15803D })
      );
      shade.position.set(lx, 3.2, 0);
      tableGroup.add(shade);
    });

    parent.add(tableGroup);
  }

  buildArcadeCabinet(parent, x, z) {
    const arcade = new THREE.Group();
    arcade.position.set(x, 0, z);

    // Upright Cabinet Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 3.6, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x312E81 })
    );
    body.position.set(0, 1.8, 0);
    body.castShadow = true;
    arcade.add(body);

    // Glowing CRT Screen
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.9, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x06B6D4 })
    );
    screen.position.set(0, 2.3, 0.82);
    arcade.add(screen);

    // Glowing Neon Synthwave Marquee
    const marquee = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.35, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xF43F5E })
    );
    marquee.position.set(0, 3.2, 0.82);
    arcade.add(marquee);

    parent.add(arcade);
  }

  // =========================================================================
  // ☕ BREAKOUT ZONE 2: KANTIN & COMMERCIAL COFFEE BAR
  // =========================================================================

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

    // Commercial Stainless Steel Espresso Machine
    const machine = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.0, 0.9),
      new THREE.MeshLambertMaterial({ color: 0xDC2626 })
    );
    machine.position.set(-1.2, 1.95, -1.8);
    group.add(machine);

    // Chrome Group Heads & Cup Tray
    const cupTray = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.08, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xE2E8F0 })
    );
    cupTray.position.set(-1.2, 2.48, -1.8);
    group.add(cupTray);

    // Espresso Demitasse Cups on Top
    [-0.3, 0, 0.3].forEach(cx => {
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.06, 0.12, 8),
        new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
      );
      cup.position.set(-1.2 + cx, 2.58, -1.8);
      group.add(cup);
    });

    // 💨 RISING STEAM PARTICLES FROM ESPRESSO NOZZLE
    this.initEspressoSteam(group, -1.2, 2.2, -1.4);

    // Hanging Chalkboard Menu
    this.buildCafeChalkboard(group, -1.0, 3.8, -1.8);

    // Glass Pastry Showcase with Croissants & Doughnuts
    this.buildPastryShowcase(group, 0.8, 1.85, -1.8);

    // Cold Beverage Showcase Fridge
    this.buildBeverageCooler(group, 2.8, 1.8, -1.8);

    // Blue Water Gallon Dispenser
    this.buildWaterDispenser(group, 4.4, 0.9, -1.8);

    // Round Bistro Table & Stools
    const bistroTable = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 0.1, 16),
      new THREE.MeshLambertMaterial({ color: 0xF8FAFC })
    );
    bistroTable.position.set(-0.8, 1.1, 2.2);
    group.add(bistroTable);

    [-1.8, 0.2].forEach(cx => {
      const chairSeat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.08, 12),
        new THREE.MeshLambertMaterial({ color: 0xEA580C })
      );
      chairSeat.position.set(cx, 0.75, 2.2);
      group.add(chairSeat);
    });

    parent.add(group);
  }

  initEspressoSteam(parent, x, y, z) {
    this.steamOrigin = new THREE.Vector3(x, y, z);
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.35
    });

    for (let i = 0; i < 8; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), steamMat.clone());
      puff.position.set(x, y + Math.random() * 0.4, z);
      puff.userData = {
        vy: 0.008 + Math.random() * 0.006,
        vx: (Math.random() - 0.5) * 0.003,
        initialY: y,
        life: Math.random()
      };
      parent.add(puff);
      this.steamParticles.push(puff);
    }
  }

  buildCafeChalkboard(parent, x, y, z) {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(x, y, z);

    // Wooden Frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.4, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x451A03 })
    );
    boardGroup.add(frame);

    // Slate Chalkboard
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x1E293B })
    );
    board.position.set(0, 0, 0.05);
    boardGroup.add(board);

    parent.add(boardGroup);
  }

  buildPastryShowcase(parent, x, y, z) {
    const caseGroup = new THREE.Group();
    caseGroup.position.set(x, y, z);

    // Clear Glass Display Case
    const glassCase = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.65, 0.9),
      new THREE.MeshLambertMaterial({
        color: 0xBAE6FD,
        transparent: true,
        opacity: 0.4
      })
    );
    caseGroup.add(glassCase);

    // Bakery Items (Golden Croissants)
    [-0.35, 0.35].forEach(bx => {
      const croissant = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.05, 6, 10, Math.PI * 1.2),
        new THREE.MeshLambertMaterial({ color: 0xD97706 })
      );
      croissant.rotation.x = Math.PI / 2;
      croissant.position.set(bx, -0.15, 0);
      caseGroup.add(croissant);
    });

    parent.add(caseGroup);
  }

  buildBeverageCooler(parent, x, y, z) {
    const cooler = new THREE.Group();
    cooler.position.set(x, y, z);

    // Upright Refrigerator Cabinet
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.6, 1.1),
      new THREE.MeshLambertMaterial({ color: 0x0F172A })
    );
    cooler.add(body);

    // Illuminated Glass Door
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 2.3),
      new THREE.MeshBasicMaterial({
        color: 0x38BDF8,
        transparent: true,
        opacity: 0.5
      })
    );
    glass.position.set(0, 0, 0.56);
    cooler.add(glass);

    parent.add(cooler);
  }

  buildWaterDispenser(parent, x, y, z) {
    const disp = new THREE.Group();
    disp.position.set(x, y, z);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.4, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xE2E8F0 })
    );
    disp.add(base);

    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.7, 12),
      new THREE.MeshLambertMaterial({ color: 0x38BDF8, transparent: true, opacity: 0.75 })
    );
    bottle.position.set(0, 1.05, 0);
    disp.add(bottle);

    parent.add(disp);
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

    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.08),
      new THREE.MeshLambertMaterial({ color: bezelColor })
    );
    bezel.castShadow = true;
    monitor.add(bezel);

    const screenMat = new THREE.MeshBasicMaterial({ color: screenColor });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, h - 0.1), screenMat);
    screen.position.set(0, 0, 0.045);
    monitor.add(screen);
    this.monitors.push(screenMat);

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
  // 👥 5 REALISTIC EXPRESSIVE AVATARS & ERGONOMIC CHAIRS
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
      const agentGroup = this.createExpressiveSittingAgent(config);
      this.agentMeshes[name] = agentGroup;
      this.scene.add(agentGroup);
    }
  }

  createExpressiveSittingAgent(config) {
    const group = new THREE.Group();
    group.name = config.name;
    group.position.set(config.x, config.targetY, config.z);

    const colorHex = parseInt(config.color.replace('#', '0x'));

    // 1. Ergonomic Office Swivel Chair
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, -config.targetY, -0.75);

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

      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8),
        new THREE.MeshBasicMaterial({ color: 0x0F172A })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(Math.sin(angle) * 0.45, 0.04, Math.cos(angle) * 0.45);
      chairGroup.add(wheel);
    }

    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.65),
      new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    cylinder.position.set(0, 0.45, 0);
    chairGroup.add(cylinder);

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.16, 1.0),
      new THREE.MeshLambertMaterial({ color: 0x1E293B })
    );
    seat.position.set(0, 0.82, 0);
    chairGroup.add(seat);

    const backHeight = (config.name === 'LUHUT') ? 1.5 : 1.1;
    const backrest = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, backHeight, 0.14),
      new THREE.MeshLambertMaterial({ color: colorHex })
    );
    backrest.position.set(0, 0.85 + backHeight / 2, -0.42);
    chairGroup.add(backrest);

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
    const torsoGeo = new THREE.BoxGeometry(0.85, 0.95, 0.55);
    const torsoMat = new THREE.MeshLambertMaterial({ color: colorHex });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.set(0, 0.18, -0.42);
    torso.castShadow = true;
    group.add(torso);
    group.torsoMesh = torso;

    // Seated Legs
    const thighMat = new THREE.MeshLambertMaterial({ color: 0x1E293B });
    [-0.24, 0.24].forEach(lx => {
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.55), thighMat);
      thigh.position.set(lx, -0.22, -0.15);
      group.add(thigh);

      const lowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.58, 0.22), thighMat);
      lowerLeg.position.set(lx, -0.55, 0.14);
      group.add(lowerLeg);

      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.16, 0.38),
        new THREE.MeshLambertMaterial({ color: 0xF8FAFC })
      );
      shoe.position.set(lx, -0.80, 0.20);
      group.add(shoe);
    });

    // 3. Hands & Arms
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xFBD38D });
    const handL = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.15, 0.28), skinMat);
    handL.position.set(-0.35, 0.25, 0.28);
    group.add(handL);

    const handR = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.15, 0.28), skinMat);
    handR.position.set(0.35, 0.25, 0.28);
    group.add(handR);
    group.hands = [handL, handR];

    // 4. Stylized 3D Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.05, -0.42);

    const headGeo = new THREE.BoxGeometry(0.72, 0.72, 0.72);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.castShadow = true;
    headGroup.add(head);

    // Hair
    const hairGeo = new THREE.BoxGeometry(0.76, 0.26, 0.76);
    const hair = new THREE.Mesh(hairGeo, new THREE.MeshLambertMaterial({ color: 0x1F2937 }));
    hair.position.set(0, 0.28, 0);
    headGroup.add(hair);

    // Procedural Blinking Eyes
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0F172A });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.16, 0.04, 0.38);
    headGroup.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.16, 0.04, 0.38);
    headGroup.add(eyeR);
    group.eyes = [eyeL, eyeR];
    group.blinkState = { nextBlink: Math.random() * 3 + 2, isBlinking: false };

    // --- AGENT-SPECIFIC 3D ACCESSORIES ---
    if (config.name === 'HABIBIE') {
      // 1. Black Indonesian Peci (Songkok)
      const peci = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.32, 0.70),
        new THREE.MeshLambertMaterial({ color: 0x0A0A0A })
      );
      peci.position.set(0, 0.44, 0);
      headGroup.add(peci);

      // 2. Round Golden Spectacles (Glasses)
      const rimMat = new THREE.MeshBasicMaterial({ color: 0xF59E0B });
      [-0.16, 0.16].forEach(gx => {
        const glassRim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.11, 0.02, 12),
          rimMat
        );
        glassRim.rotation.x = Math.PI / 2;
        glassRim.position.set(gx, 0.04, 0.40);
        headGroup.add(glassRim);
      });
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.02), rimMat);
      bridge.position.set(0, 0.05, 0.40);
      headGroup.add(bridge);

    } else if (config.name === 'GIBRAN') {
      // Futuristic QA Diagnostic Visor
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.14, 0.06),
        new THREE.MeshBasicMaterial({ color: 0x10B981, transparent: true, opacity: 0.85 })
      );
      visor.position.set(0, 0.05, 0.40);
      headGroup.add(visor);

    } else if (config.name === 'PRABOWO') {
      // Designer Headphones around Neck
      const phoneBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.08, 16, 1, true, 0, Math.PI),
        new THREE.MeshLambertMaterial({ color: 0xEA580C })
      );
      phoneBand.rotation.x = Math.PI / 2;
      phoneBand.position.set(0, -0.36, 0);
      headGroup.add(phoneBand);

      [-0.42, 0.42].forEach(hx => {
        const ear = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10),
          new THREE.MeshLambertMaterial({ color: 0x1E293B })
        );
        ear.rotation.z = Math.PI / 2;
        ear.position.set(hx, -0.36, 0);
        headGroup.add(ear);
      });

    } else if (config.name === 'LUHUT') {
      // Executive Golden Tie Clip
      const tie = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.45, 0.04),
        new THREE.MeshBasicMaterial({ color: 0x881337 })
      );
      tie.position.set(0, -0.22, 0.28);
      group.add(tie);

      const tieClip = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.03, 0.02),
        new THREE.MeshBasicMaterial({ color: 0xF59E0B })
      );
      tieClip.position.set(0, -0.15, 0.31);
      group.add(tieClip);
    }

    group.add(headGroup);
    group.headMesh = headGroup;

    // 5. Floating 3D Nametag Pill
    const nametagSprite = this.createNametagSprite(config.name, config.color);
    nametagSprite.position.set(0, 2.05, -0.42);
    group.add(nametagSprite);
    group.nametag = nametagSprite;

    // 6. Floating 3D Speech/Status Bubble (Large & High Readability)
    const bubbleSprite = this.createHighReadabilityBubbleSprite(
      config.bubble || config.role,
      config.name,
      config.color
    );
    bubbleSprite.position.set(0, 2.85, -0.42);
    group.add(bubbleSprite);
    group.bubbleSprite = bubbleSprite;

    // 7. Raycasting Hit Box
    const hitGeo = new THREE.BoxGeometry(2.0, 3.2, 2.0);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitGeo, hitMat);
    hitBox.position.set(0, 0.75, -0.2);
    hitBox.userData = { agentName: config.name };
    group.add(hitBox);
    this.interactiveObjects.push(hitBox);

    return group;
  }

  createNametagSprite(name, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 72;
    const ctx = canvas.getContext('2d');

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

  // =========================================================================
  // 💬 LARGE & HIGH-READABILITY 3D SPEECH BUBBLES WITH AVATAR BADGE
  // =========================================================================

  createHighReadabilityBubbleSprite(text, agentName, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');

    // 1. Neubrutalist Hard Shadow
    ctx.fillStyle = '#000000';
    this.roundRect(ctx, 8, 8, 496, 110, 16);
    ctx.fill();

    // 2. Crisp White Bubble Background
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, 4, 4, 496, 110, 16);
    ctx.fill();

    // 3. Bold Neubrutalist Outline with Agent Division Color
    ctx.strokeStyle = color || '#0F172A';
    ctx.lineWidth = 6;
    ctx.stroke();

    // 4. Downward Triangle Tail Pointer
    ctx.beginPath();
    ctx.moveTo(246, 114);
    ctx.lineTo(266, 114);
    ctx.lineTo(256, 134);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = color || '#0F172A';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 5. Circular 2D Avatar Portrait Thumbnail on Left
    const img = this.avatarImages[agentName];
    ctx.save();
    ctx.beginPath();
    ctx.arc(62, 59, 40, 0, Math.PI * 2);
    ctx.clip();
    if (img && img.complete) {
      ctx.drawImage(img, 22, 19, 80, 80);
    } else {
      ctx.fillStyle = color || '#0F172A';
      ctx.fillRect(22, 19, 80, 80);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(agentName[0], 62, 59);
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(62, 59, 40, 0, Math.PI * 2);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 6. Agent Name Tag Above Speech
    ctx.fillStyle = color || '#0F172A';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(agentName, 120, 42);

    // 7. Speech / Status Text (Bold, High Contrast 26px)
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    const displayText = text.length > 22 ? text.substring(0, 20) + '...' : text;
    ctx.fillText(displayText, 120, 80);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.0, 0.82, 1);
    return sprite;
  }

  refreshAgentBubble(agentName) {
    const mesh = this.agentMeshes[agentName];
    if (!mesh || !mesh.bubbleSprite) return;
    const ag = this.agents[agentName];
    if (!ag) return;
    this.updateAgentBubble(agentName, ag.bubble);
  }

  updateAgentBubble(agentName, text) {
    const mesh = this.agentMeshes[agentName];
    if (!mesh || !mesh.bubbleSprite) return;

    const ag = this.agents[agentName];
    const newSprite = this.createHighReadabilityBubbleSprite(
      text,
      agentName,
      ag ? ag.color : '#0F172A'
    );
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

    const selectEl = document.getElementById('threeFocusSelect');
    if (selectEl && selectEl.value !== agentName) {
      selectEl.value = agentName;
    }

    // Show 2D Inspection Card HUD
    if (this.agents[agentName]) {
      this.showAgentInspectionCard(agentName);
    }
  }

  resetCamera() {
    this.startCameraTransition(this.defaultCamPos, this.defaultCamTarget, 800);
    const selectEl = document.getElementById('threeFocusSelect');
    if (selectEl) selectEl.value = '';
    this.hideAgentInspectionCard();
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
  // 📇 2D AGENT INSPECTION HUD CARD MODAL (INTERACTIVE OVERLAY)
  // =========================================================================

  showAgentInspectionCard(agentName) {
    const cardEl = document.getElementById('threeAgentCard');
    if (!cardEl) return;

    const ag = this.agents[agentName];
    if (!ag) return;

    const photoEl = document.getElementById('threeAgentCardPhoto');
    const nameEl = document.getElementById('threeAgentCardName');
    const roleBadgeEl = document.getElementById('threeAgentCardRoleBadge');
    const locationEl = document.getElementById('threeAgentCardLocation');
    const bubbleEl = document.getElementById('threeAgentCardBubble');
    const stateEl = document.getElementById('threeAgentCardState');
    const statusDotEl = document.getElementById('threeAgentCardStatusDot');

    if (photoEl) photoEl.src = `/static/assets/avatars/${agentName.toLowerCase()}.jpg`;
    if (nameEl) nameEl.textContent = agentName;
    if (roleBadgeEl) {
      roleBadgeEl.textContent = ag.role;
      roleBadgeEl.style.borderColor = ag.color;
      roleBadgeEl.style.color = ag.color;
    }

    const roomNames = {
      LUHUT: 'Executive Suite (Meja Pimpinan)',
      HABIBIE: "Architect's Studio (Drafting Desk)",
      JOKOWI: 'Engineering Bay (Backend Terminal)',
      PRABOWO: 'Engineering Bay (Frontend UI/UX)',
      GIBRAN: 'Engineering Bay (QA Terminal)'
    };
    if (locationEl) locationEl.textContent = roomNames[agentName] || 'Office Workspace';
    if (bubbleEl) bubbleEl.textContent = ag.bubble || ag.role;
    if (stateEl) {
      const stateMap = { working: 'Working', reviewing: 'QA Reviewing', sleeping: 'Sleeping', idle: 'Standby Pasif' };
      stateEl.innerHTML = `Status: <strong>${stateMap[ag.state] || 'Idle'}</strong>`;
    }
    if (statusDotEl) {
      statusDotEl.style.background = ag.state === 'working' ? '#10B981' : (ag.state === 'reviewing' ? '#F59E0B' : '#64748B');
    }

    cardEl.style.display = 'flex';
  }

  hideAgentInspectionCard() {
    const cardEl = document.getElementById('threeAgentCard');
    if (cardEl) cardEl.style.display = 'none';
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

        let target = ag.workPos;
        if (ag.state === 'working' || ag.state === 'reviewing') {
          target = ag.workPos;
        } else if (ag.state === 'sleeping') {
          target = ag.sleepPos;
        } else {
          target = ag.breakPos;
        }

        ag.targetX = target.x;
        ag.targetZ = target.z;
        ag.targetY = target.y || 1.15;
      }
    }
  }

  updateAnimations(time) {
    // 1. Smooth Camera Transition
    if (this.camTransition.active) {
      const elapsed = performance.now() - this.camTransition.startTime;
      const progress = Math.min(elapsed / this.camTransition.duration, 1);
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

    // 2. Real-time Wall Clock Hands Rotation
    if (this.wallClock.hourHand && this.wallClock.minuteHand && this.wallClock.secondHand) {
      const wib = this.getWIBTime();
      const hours = wib.getHours() % 12;
      const minutes = wib.getMinutes();
      const seconds = wib.getSeconds() + (wib.getMilliseconds() / 1000);

      this.wallClock.hourHand.rotation.z = -((hours + minutes / 60) / 12) * Math.PI * 2;
      this.wallClock.minuteHand.rotation.z = -((minutes + seconds / 60) / 60) * Math.PI * 2;
      this.wallClock.secondHand.rotation.z = -(seconds / 60) * Math.PI * 2;
    }

    // 3. Interactive Doors Proximity & Swing Logic
    this.doors.forEach(door => {
      // Check if any agent is near (< 2.2 units)
      let agentNear = false;
      for (const ag of Object.values(this.agents)) {
        const mesh = this.agentMeshes[ag.name];
        if (mesh) {
          const dist = Math.hypot(mesh.position.x - door.worldX, mesh.position.z - door.worldZ);
          if (dist < 2.2) {
            agentNear = true;
            break;
          }
        }
      }

      door.isAutoOpen = agentNear;
      const shouldOpen = door.isAutoOpen || door.isManualToggle;
      door.targetAngle = shouldOpen ? door.openAngle : 0;

      // Smooth swing interpolation
      door.currentAngle += (door.targetAngle - door.currentAngle) * 0.12;
      door.pivot.rotation.y = door.currentAngle;
    });

    // 4. Espresso Steam Particle Emitter
    if (this.steamParticles.length > 0) {
      this.steamParticles.forEach(p => {
        p.position.y += p.userData.vy;
        p.position.x += p.userData.vx;
        p.userData.life += 0.015;

        // Scale puff as it rises
        const sc = 1 + p.userData.life * 1.8;
        p.scale.set(sc, sc, sc);
        p.material.opacity = Math.max(0, 0.35 - p.userData.life * 0.35);

        // Reset particle to nozzle
        if (p.userData.life >= 1.0) {
          p.position.copy(this.steamOrigin);
          p.userData.life = 0;
          p.scale.set(1, 1, 1);
          p.material.opacity = 0.35;
        }
      });
    }

    // 5. Blinking Server Rack LEDs (Every 250ms)
    if (time - this.lastLedBlinkTime > 0.25) {
      this.lastLedBlinkTime = time;
      this.serverRackLeds.forEach(led => {
        if (Math.random() > 0.5) {
          led.material.color.setHex(Math.random() > 0.3 ? 0x10B981 : 0x0EA5E9);
        }
      });
    }

    // 6. Agent Figurines & Procedural Blinking
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

      // Procedural Eye Blinking (Every 3.5 - 6s for 150ms)
      if (mesh.eyes && mesh.blinkState) {
        if (!mesh.blinkState.isBlinking && time > mesh.blinkState.nextBlink) {
          mesh.blinkState.isBlinking = true;
          mesh.blinkState.blinkEnd = time + 0.14;
          mesh.eyes.forEach(e => e.scale.y = 0.1);
        } else if (mesh.blinkState.isBlinking && time > mesh.blinkState.blinkEnd) {
          mesh.blinkState.isBlinking = false;
          mesh.blinkState.nextBlink = time + Math.random() * 3 + 3;
          mesh.eyes.forEach(e => e.scale.y = 1.0);
        }
      }

      // State Specific Animations
      if (ag.state === 'working' || ag.state === 'reviewing') {
        if (mesh.hands && mesh.hands.length === 2) {
          mesh.hands[0].position.y = 0.25 + Math.sin(time * 14) * 0.04;
          mesh.hands[1].position.y = 0.25 + Math.cos(time * 14) * 0.04;
        }
        if (mesh.headMesh) {
          mesh.headMesh.rotation.x = 0.12 + Math.sin(time * 5) * 0.04;
        }
        mesh.position.y = ag.targetY + Math.sin(time * 6) * 0.02;

      } else if (ag.state === 'sleeping') {
        mesh.position.y = ag.targetY + Math.sin(time * 1.5) * 0.015;
        if (mesh.headMesh) {
          mesh.headMesh.rotation.x = 0.45;
        }
      } else {
        // Idle Standby
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
    const atmosphereBadge = document.getElementById('threeAtmosphereBadge');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomCamera(3));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomCamera(-3));
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetCamera());
    if (topDownBtn) topDownBtn.addEventListener('click', () => this.setTopDownView());

    // Click on atmosphere badge cycles through the 5 time schemes for live preview!
    if (atmosphereBadge) {
      atmosphereBadge.addEventListener('click', () => this.cycleAtmosphere());
    }

    if (focusSelect) {
      focusSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val) this.focusAgent(val);
      });
    }

    // Agent Inspection Card Modal Buttons
    const cardCloseBtn = document.getElementById('threeAgentCardCloseBtn');
    const cardFocusBtn = document.getElementById('threeAgentCardFocusBtn');
    const cardKanbanBtn = document.getElementById('threeAgentCardKanbanBtn');

    if (cardCloseBtn) cardCloseBtn.addEventListener('click', () => this.hideAgentInspectionCard());
    if (cardFocusBtn) {
      cardFocusBtn.addEventListener('click', () => {
        const nameEl = document.getElementById('threeAgentCardName');
        if (nameEl && nameEl.textContent) this.focusAgent(nameEl.textContent);
      });
    }
    if (cardKanbanBtn) {
      cardKanbanBtn.addEventListener('click', () => {
        const nameEl = document.getElementById('threeAgentCardName');
        if (nameEl && nameEl.textContent && typeof this.onAgentClick === 'function') {
          this.onAgentClick(nameEl.textContent);
        }
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
      const objData = intersects[0].object.userData;
      this.renderer.domElement.style.cursor = 'pointer';

      if (objData.agentName) {
        const mesh = this.agentMeshes[objData.agentName];
        if (mesh && mesh.bubbleSprite) {
          mesh.bubbleSprite.scale.set(3.4, 0.92, 1);
        }
      }
    } else {
      for (const mesh of Object.values(this.agentMeshes)) {
        if (mesh && mesh.bubbleSprite) {
          mesh.bubbleSprite.scale.set(3.0, 0.82, 1);
        }
      }
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  checkClick() {
    if (!this.camera) return;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects);

    if (intersects.length > 0) {
      const objData = intersects[0].object.userData;

      // 1. Click on Door: Toggle Open/Close
      if (objData.isDoor && objData.doorId) {
        this.toggleDoor(objData.doorId);
        return;
      }

      // 2. Click on Agent or Acrylic Nameplate: Focus & Show 2D Inspection Card HUD
      if (objData.agentName) {
        this.focusAgent(objData.agentName);
        if (typeof this.onAgentClick === 'function') {
          this.onAgentClick(objData.agentName);
        }
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
