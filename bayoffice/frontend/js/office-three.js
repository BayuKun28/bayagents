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

    // 📺 V3 Animated Screen Canvases & Shader Textures
    this.screenCanvases = {};
    this.screenTextures = {};
    this.screenCtxs = {};
    this.lastScreenUpdate = 0;

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
      this.initAnimatedScreenTextures();
      this.loadAvatarAssets();
      this.buildOfficeEnvironment();
      this.initAgents();
      this.setupUIControls();
      this.setupEvents();
      this.updateDayNightAtmosphere();
      this.startLoop();

      console.log('[OfficeThree] BayOffice 3D V3 Ultra-Realistic Living Workspace initialized.');
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

  // =========================================================================
  // 📺 V3 ANIMATED SCREEN SHADERS & CANVAS TEXTURES (CANVAS-TO-TEXTURE ENGINE)
  // =========================================================================

  initAnimatedScreenTextures() {
    const screens = [
      { id: 'backend', w: 320, h: 200 },
      { id: 'frontend_ui', w: 320, h: 200 },
      { id: 'frontend_code', w: 320, h: 200 },
      { id: 'qa_scope', w: 200, h: 320 },
      { id: 'qa_matrix', w: 200, h: 320 },
      { id: 'commander_radar', w: 320, h: 200 },
      { id: 'commander_gauges', w: 320, h: 200 },
      { id: 'tv_synthwave', w: 320, h: 180 },
      { id: 'arcade_crt', w: 220, h: 220 }
    ];

    screens.forEach(s => {
      const canvas = document.createElement('canvas');
      canvas.width = s.w;
      canvas.height = s.h;
      const ctx = canvas.getContext('2d');
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      this.screenCanvases[s.id] = canvas;
      this.screenCtxs[s.id] = ctx;
      this.screenTextures[s.id] = texture;
    });

    this.updateAnimatedScreens(0);
  }

  drawBackendScreen(ctx, time) {
    ctx.fillStyle = '#05080C';
    ctx.fillRect(0, 0, 320, 200);

    // Titlebar
    ctx.fillStyle = '#0E1726';
    ctx.fillRect(0, 0, 320, 18);
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.arc(10, 9, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath(); ctx.arc(20, 9, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#10B981';
    ctx.beginPath(); ctx.arc(30, 9, 3.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '9px "Courier New", monospace';
    ctx.fillText('jokowi@homelab:~ (FastAPI + PostgreSQL 17)', 45, 12);

    // Log Stream
    const allLogs = [
      '[0.120] KERNEL: Linux 6.8.0-amd64 boot OK',
      '[0.840] POSTGRES: Listening on 127.0.0.1:5432',
      '[1.205] REDIS: Ping latency <0.4ms (Healthy)',
      '[2.110] UVICORN: Started worker process [2801]',
      '[2.890] SANCTUM: Token auth verified (user: bay)',
      '[3.402] GET /api/v1/biodata 200 OK (1.1ms)',
      '[4.105] POST /api/v1/portfolios 201 Created',
      '[5.008] KANBAN: State sync In-Progress [PASS]',
      '[5.890] BACKUP: Snapshot archived to /backups',
      '[6.412] SYSTEM: Memory pressure 0.0% (ZRAM ON)'
    ];

    const offset = Math.floor(time * 1.5) % allLogs.length;
    ctx.font = '10px "Courier New", monospace';
    for (let i = 0; i < 9; i++) {
      const line = allLogs[(offset + i) % allLogs.length];
      const isGreen = i % 2 === 0;
      ctx.fillStyle = isGreen ? '#10B981' : '#34D399';
      ctx.fillText(line, 10, 34 + i * 16);
    }

    // Active Shell Prompt
    ctx.fillStyle = '#38BDF8';
    const cursor = (Math.floor(time * 3) % 2 === 0) ? '█' : ' ';
    ctx.fillText(`jokowi@homelab:~$ ./run_tests.sh --watch ${cursor}`, 10, 188);
  }

  drawFrontendUIScreen(ctx, time) {
    ctx.fillStyle = '#0B1120';
    ctx.fillRect(0, 0, 320, 200);

    // Modern Header Bar
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, 320, 26);

    ctx.fillStyle = '#F97316';
    ctx.fillRect(10, 6, 14, 14);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('BayOffice Studio', 30, 16);

    // Nav pills
    const tabs = ['Home', 'Kanban', 'System', 'Deploy'];
    tabs.forEach((t, idx) => {
      ctx.fillStyle = idx === 1 ? '#0284C7' : '#334155';
      ctx.fillRect(140 + idx * 42, 6, 38, 14);
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '8px sans-serif';
      ctx.fillText(t, 148 + idx * 42, 16);
    });

    // Content Grid (Neubrutalism Cards)
    // Card A: Sprint Status
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 1.5;
    ctx.fillRect(12, 38, 140, 72);
    ctx.strokeRect(12, 38, 140, 72);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('SPRINT V3 ACTIVE', 20, 52);

    // Mini Progress Bar
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(20, 60, 120, 8);
    const progW = (Math.sin(time * 1.5) * 0.3 + 0.7) * 120;
    ctx.fillStyle = '#10B981';
    ctx.fillRect(20, 60, progW, 8);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '8px sans-serif';
    ctx.fillText('UI Wireframe • Tailwind 4.0', 20, 82);
    ctx.fillText('CSS Hard Shadows 4px 4px', 20, 96);

    // Card B: Metrics View
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#F97316';
    ctx.fillRect(164, 38, 144, 72);
    ctx.strokeRect(164, 38, 144, 72);

    ctx.fillStyle = '#F97316';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('PERFORMANCE 60 FPS', 172, 52);

    // Sparkline Bars
    for (let b = 0; b < 10; b++) {
      const bh = Math.sin(time * 3 + b * 0.8) * 15 + 20;
      ctx.fillStyle = b > 7 ? '#EC4899' : '#06B6D4';
      ctx.fillRect(174 + b * 12, 100 - bh, 8, bh);
    }

    // Lower Action Panel
    ctx.fillStyle = '#111827';
    ctx.fillRect(12, 120, 296, 70);
    ctx.fillStyle = '#475569';
    ctx.strokeRect(12, 120, 296, 70);

    ctx.fillStyle = '#EC4899';
    ctx.fillRect(20, 132, 70, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('BUILD DIST', 32, 145);

    ctx.fillStyle = '#10B981';
    ctx.fillRect(100, 132, 70, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('VITE LIVE', 114, 145);

    // Dynamic Mouse Cursor Moving & Clicking
    const curX = 140 + Math.sin(time * 2.0) * 80;
    const curY = 100 + Math.cos(time * 2.5) * 45;
    const isClick = Math.sin(time * 4) > 0.8;

    if (isClick) {
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(curX, curY, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Mouse Arrow
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(curX, curY);
    ctx.lineTo(curX + 8, curY + 8);
    ctx.lineTo(curX + 3, curY + 9);
    ctx.lineTo(curX + 5, curY + 14);
    ctx.lineTo(curX + 2, curY + 15);
    ctx.lineTo(curX, curY + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawFrontendCodeScreen(ctx, time) {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 320, 200);

    // Code Editor Tab Bar
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, 320, 22);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(10, 2, 90, 20);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('OfficeThree.jsx', 18, 15);

    const code = [
      { n: '1', t: 'import { Canvas, useFrame } from "three";', c: '#93C5FD' },
      { n: '2', t: 'export const LivingWorkspace = () => {', c: '#F472B6' },
      { n: '3', t: '  const [status, setStatus] = useState("V3");', c: '#FBBF24' },
      { n: '4', t: '  useFrame(({ clock }) => {', c: '#A78BFA' },
      { n: '5', t: '    animateScreenGlow(clock.getElapsedTime());', c: '#34D399' },
      { n: '6', t: '    syncAgentPathing({ target: "Kantin" });', c: '#38BDF8' },
      { n: '7', t: '  });', c: '#A78BFA' },
      { n: '8', t: '  return <Workspace3D atmosphere="WIB" />;', c: '#FB923C' },
      { n: '9', t: '}; // Zero Homelab CPU Overhead', c: '#64748B' },
      { n: '10', t: 'export default LivingWorkspace;', c: '#F472B6' }
    ];

    ctx.font = '10px "Courier New", monospace';
    code.forEach((cd, idx) => {
      ctx.fillStyle = '#475569';
      ctx.fillText(cd.n.padStart(2, ' '), 8, 40 + idx * 15);
      ctx.fillStyle = cd.c;
      ctx.fillText(cd.t, 32, 40 + idx * 15);
    });

    // Blinking Code Cursor
    if (Math.floor(time * 3) % 2 === 0) {
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(235, 120, 7, 12);
    }
  }

  drawQAScopeScreen(ctx, time) {
    ctx.fillStyle = '#03171B';
    ctx.fillRect(0, 0, 200, 320);

    // Scope Header
    ctx.fillStyle = '#06292E';
    ctx.fillRect(0, 0, 200, 24);
    ctx.fillStyle = '#06B6D4';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('DIGITAL OSCILLOSCOPE CH1', 12, 16);

    // Reticle Grid
    ctx.strokeStyle = '#083E46';
    ctx.lineWidth = 0.5;
    for (let x = 10; x < 200; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 26); ctx.lineTo(x, 220); ctx.stroke();
    }
    for (let y = 30; y < 220; y += 20) {
      ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(190, y); ctx.stroke();
    }

    // Glowing Realtime Waveform
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 2.0;
    ctx.shadowColor = '#06B6D4';
    ctx.shadowBlur = 6;
    ctx.beginPath();

    const centerY = 125;
    for (let x = 10; x <= 190; x += 2) {
      const rad = (x - 10) * 0.09 + time * 8;
      const y = centerY + Math.sin(rad) * 35 + Math.sin(rad * 2.3 + time * 4) * 10;
      if (x === 10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Lower Signal Stats
    ctx.fillStyle = '#041F23';
    ctx.fillRect(0, 226, 200, 94);

    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('TRACE LOCK: 60.00 Hz', 12, 246);
    ctx.fillStyle = '#38BDF8';
    ctx.font = '9px monospace';
    ctx.fillText('Vpp: 3.30V | RMS: 1.17V', 12, 264);
    ctx.fillText('JITTER: 0.12ms (NOMINAL)', 12, 280);

    ctx.fillStyle = '#10B981';
    ctx.fillRect(12, 292, 176, 16);
    ctx.fillStyle = '#022C22';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('AUDIT STATUS: PASSED', 34, 304);
  }

  drawQAMatrixScreen(ctx, time) {
    ctx.fillStyle = '#03171B';
    ctx.fillRect(0, 0, 200, 320);

    // Matrix Header
    ctx.fillStyle = '#064E3B';
    ctx.fillRect(0, 0, 200, 26);
    ctx.fillStyle = '#A7F3D0';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('QA TEST SUITE MATRIX', 14, 17);

    const tests = [
      'PHPUnit Feature (26/26)',
      'Sanctum Auth Guards',
      'XSS Filter & Sanitizer',
      'WCAG AAA High Contrast',
      'Mobile 360px Adaptive',
      'Zero Infinite Loops',
      'RAM-Pressure (0% OOM)',
      'Vite Production Build'
    ];

    ctx.font = '9px monospace';
    tests.forEach((t, i) => {
      const y = 46 + i * 28;
      ctx.fillStyle = '#06292E';
      ctx.fillRect(10, y - 11, 180, 22);
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(10, y - 11, 180, 22);

      ctx.fillStyle = '#10B981';
      ctx.fillText('✔ ' + t, 16, y + 4);
    });

    // Bottom Animated Pulse
    const pulse = Math.floor(time * 2.5) % 2 === 0;
    ctx.fillStyle = pulse ? '#10B981' : '#047857';
    ctx.fillRect(10, 280, 180, 26);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('CERTIFIED 100% PASSED', 26, 296);
  }

  drawCommanderRadar(ctx, time) {
    ctx.fillStyle = '#140508';
    ctx.fillRect(0, 0, 320, 200);

    // Titlebar
    ctx.fillStyle = '#2A080C';
    ctx.fillRect(0, 0, 320, 18);
    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('HOMELAB CLUSTER TOPOLOGY RADAR', 10, 13);

    const cx = 160;
    const cy = 108;

    // Range rings
    ctx.strokeStyle = '#450A0A';
    ctx.lineWidth = 1;
    [30, 60, 85].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - 85, cy); ctx.lineTo(cx + 85, cy);
    ctx.moveTo(cx, cy - 85); ctx.lineTo(cx, cy + 85);
    ctx.stroke();

    // Rotating Radar Sweep
    const angle = (time * 1.8) % (Math.PI * 2);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * 85, cy + Math.sin(angle) * 85);
    ctx.stroke();

    // Node Blips
    const nodes = [
      { name: 'SRV-145', x: cx - 45, y: cy - 35, color: '#10B981' },
      { name: 'SRV-146', x: cx + 50, y: cy - 25, color: '#38BDF8' },
      { name: 'ROUTER', x: cx, y: cy + 45, color: '#F59E0B' }
    ];

    nodes.forEach(n => {
      ctx.fillStyle = n.color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '8px monospace';
      ctx.fillText(n.name, n.x + 6, n.y + 3);
    });

    // Bottom Stats
    ctx.fillStyle = '#F87171';
    ctx.font = '9px monospace';
    ctx.fillText('STATUS: SYNCHRONIZED • LATENCY: 0.4ms • DUAL-SERVER MIRROR', 10, 194);
  }

  drawCommanderGauges(ctx, time) {
    ctx.fillStyle = '#140508';
    ctx.fillRect(0, 0, 320, 200);

    // Titlebar
    ctx.fillStyle = '#2A080C';
    ctx.fillRect(0, 0, 320, 18);
    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('EXECUTIVE COMMAND DASHBOARD', 10, 13);

    const drawDial = (x, y, r, val, label, color) => {
      ctx.strokeStyle = '#371014';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI * 0.8, Math.PI * 2.2);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI * 0.8, Math.PI * 0.8 + val * (Math.PI * 1.4));
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(Math.round(val * 100) + '%', x - 12, y + 4);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '8px sans-serif';
      ctx.fillText(label, x - 14, y + 22);
    };

    const cpuVal = 0.22 + Math.sin(time * 2) * 0.08;
    const ramVal = 0.45;
    const netVal = 0.15 + Math.cos(time * 1.5) * 0.05;

    drawDial(60, 75, 30, cpuVal, 'CPU AMD', '#EF4444');
    drawDial(160, 75, 30, ramVal, 'RAM 8GB', '#F59E0B');
    drawDial(260, 75, 30, netVal, 'LAN 1Gbps', '#10B981');

    // Horizontal Core Bars
    ctx.fillStyle = '#1F0A0E';
    ctx.fillRect(20, 125, 280, 58);
    ctx.strokeStyle = '#450A0A';
    ctx.strokeRect(20, 125, 280, 58);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '9px monospace';
    ctx.fillText('CORE 0: [||||||||||..........] 1.8 GHz', 30, 145);
    ctx.fillText('CORE 1: [||||||..............] 1.5 GHz', 30, 165);

    ctx.fillStyle = '#EF4444';
    ctx.fillText('ORCHESTRATOR: LUHUT ON PASSIVE STANDBY', 30, 194);
  }

  drawTVSynthwave(ctx, time) {
    ctx.fillStyle = '#12072B';
    ctx.fillRect(0, 0, 320, 180);

    // Stars in sky
    ctx.fillStyle = '#FFFFFF';
    for (let s = 0; s < 25; s++) {
      const sx = (s * 37) % 320;
      const sy = (s * 23) % 90;
      const sa = Math.sin(time * 3 + s) * 0.5 + 0.5;
      ctx.globalAlpha = sa;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.globalAlpha = 1.0;

    // Glowing Synthwave Sun
    const sunY = 95;
    const sunGrad = ctx.createLinearGradient(160, 30, 160, 110);
    sunGrad.addColorStop(0, '#FACC15');
    sunGrad.addColorStop(1, '#EC4899');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(160, sunY, 40, Math.PI, 0, false);
    ctx.fill();

    // Horizontal scanline cuts through sun
    ctx.fillStyle = '#12072B';
    for (let cut = 0; cut < 5; cut++) {
      ctx.fillRect(115, sunY - 8 - cut * 7, 90, 2 + cut * 0.6);
    }

    // Neon Wireframe Mountains
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 95);
    ctx.lineTo(60, 60);
    ctx.lineTo(120, 95);
    ctx.lineTo(200, 50);
    ctx.lineTo(270, 95);
    ctx.lineTo(320, 75);
    ctx.stroke();

    // 3D Moving Perspective Ground Grid
    ctx.fillStyle = '#090317';
    ctx.fillRect(0, 95, 320, 85);

    ctx.strokeStyle = '#D946EF';
    ctx.lineWidth = 1.0;

    // Vanishing perspective lines
    for (let vx = -100; vx <= 420; vx += 35) {
      ctx.beginPath();
      ctx.moveTo(160, 95);
      ctx.lineTo(vx, 180);
      ctx.stroke();
    }

    // Horizontal moving grid lines
    const gridOffset = (time * 35) % 20;
    for (let gz = 0; gz < 5; gz++) {
      const gy = 95 + Math.pow((gz * 20 + gridOffset) / 100, 2) * 85;
      if (gy <= 180) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(320, gy);
        ctx.stroke();
      }
    }

    // Retro Logo Title
    ctx.fillStyle = '#06B6D4';
    ctx.font = 'bold 12px sans-serif';
    ctx.shadowColor = '#06B6D4';
    ctx.shadowBlur = 8;
    ctx.fillText('BAYOFFICE 3D V3', 105, 30);
    ctx.fillStyle = '#F43F5E';
    ctx.fillText('GAMING & LOUNGE CLUB', 82, 45);
    ctx.shadowBlur = 0;
  }

  drawArcadeCRT(ctx, time) {
    ctx.fillStyle = '#0A0A23';
    ctx.fillRect(0, 0, 220, 220);

    // CRT Scanline Vignette
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 208, 208);

    // Header scores
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('1UP  2840', 16, 24);
    ctx.fillStyle = '#FACC15';
    ctx.fillText('HIGH 193328', 120, 24);

    // Maze Corridor
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 36, 180, 140);
    ctx.strokeRect(45, 60, 130, 90);

    // Food Dots
    ctx.fillStyle = '#FDE68A';
    for (let d = 32; d <= 188; d += 16) {
      ctx.fillRect(d, 48, 3, 3);
      ctx.fillRect(d, 164, 3, 3);
    }

    // Animated Pac-Agent
    const pacX = 60 + ((time * 30) % 100);
    const pacY = 105;
    const mouth = Math.abs(Math.sin(time * 12)) * 0.35;

    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(pacX, pacY, 9, mouth * Math.PI, (2 - mouth) * Math.PI);
    ctx.lineTo(pacX, pacY);
    ctx.fill();

    // Red Ghost Chasing
    const ghostX = pacX - 25;
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(ghostX, pacY - 1, 8, Math.PI, 0, false);
    ctx.lineTo(ghostX + 8, pacY + 8);
    ctx.lineTo(ghostX + 4, pacY + 5);
    ctx.lineTo(ghostX, pacY + 8);
    ctx.lineTo(ghostX - 4, pacY + 5);
    ctx.lineTo(ghostX - 8, pacY + 8);
    ctx.fill();

    // Ghost Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ghostX - 5, pacY - 4, 3, 4);
    ctx.fillRect(ghostX + 1, pacY - 4, 3, 4);
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(ghostX - 4, pacY - 3, 2, 2);
    ctx.fillRect(ghostX + 2, pacY - 3, 2, 2);

    // Blinking "INSERT COIN"
    if (Math.floor(time * 2) % 2 === 0) {
      ctx.fillStyle = '#EC4899';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('INSERT COIN (0/2)', 58, 200);
    }
  }

  updateAnimatedScreens(time) {
    if (!this.screenCtxs || !this.screenCanvases) return;

    if (this.screenCtxs['backend']) {
      this.drawBackendScreen(this.screenCtxs['backend'], time);
      if (this.screenTextures['backend']) this.screenTextures['backend'].needsUpdate = true;
    }
    if (this.screenCtxs['frontend_ui']) {
      this.drawFrontendUIScreen(this.screenCtxs['frontend_ui'], time);
      if (this.screenTextures['frontend_ui']) this.screenTextures['frontend_ui'].needsUpdate = true;
    }
    if (this.screenCtxs['frontend_code']) {
      this.drawFrontendCodeScreen(this.screenCtxs['frontend_code'], time);
      if (this.screenTextures['frontend_code']) this.screenTextures['frontend_code'].needsUpdate = true;
    }
    if (this.screenCtxs['qa_scope']) {
      this.drawQAScopeScreen(this.screenCtxs['qa_scope'], time);
      if (this.screenTextures['qa_scope']) this.screenTextures['qa_scope'].needsUpdate = true;
    }
    if (this.screenCtxs['qa_matrix']) {
      this.drawQAMatrixScreen(this.screenCtxs['qa_matrix'], time);
      if (this.screenTextures['qa_matrix']) this.screenTextures['qa_matrix'].needsUpdate = true;
    }
    if (this.screenCtxs['commander_radar']) {
      this.drawCommanderRadar(this.screenCtxs['commander_radar'], time);
      if (this.screenTextures['commander_radar']) this.screenTextures['commander_radar'].needsUpdate = true;
    }
    if (this.screenCtxs['commander_gauges']) {
      this.drawCommanderGauges(this.screenCtxs['commander_gauges'], time);
      if (this.screenTextures['commander_gauges']) this.screenTextures['commander_gauges'].needsUpdate = true;
    }
    if (this.screenCtxs['tv_synthwave']) {
      this.drawTVSynthwave(this.screenCtxs['tv_synthwave'], time);
      if (this.screenTextures['tv_synthwave']) this.screenTextures['tv_synthwave'].needsUpdate = true;
    }
    if (this.screenCtxs['arcade_crt']) {
      this.drawArcadeCRT(this.screenCtxs['arcade_crt'], time);
      if (this.screenTextures['arcade_crt']) this.screenTextures['arcade_crt'].needsUpdate = true;
    }
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

    // Triple Curved Commander Screens with Red HUD & Animated Topology
    this.addMonitor(group, -1.1, 1.95, -0.2, 1.1, 0.75, 0x1E293B, 0xDC2626, 0.2, 'commander_radar', true, 0xDC2626);
    this.addMonitor(group, 0, 1.95, -0.3, 1.3, 0.85, 0x1E293B, 0xEF4444, 0, 'commander_gauges', true, 0xEF4444);
    this.addMonitor(group, 1.1, 1.95, -0.2, 1.1, 0.75, 0x1E293B, 0xDC2626, -0.2, 'commander_radar', true, 0xDC2626);

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

    // Triple Terminal Code Monitors with Live Matrix / Log Canvas Shader
    this.addMonitor(group, -0.9, 1.85, -0.15, 0.95, 0.65, 0x0F172A, 0x10B981, 0.20, 'backend', true, 0x10B981);
    this.addMonitor(group, 0, 1.9, -0.25, 1.15, 0.75, 0x0F172A, 0x0EA5E9, 0, 'backend', true, 0x0EA5E9);
    this.addMonitor(group, 0.9, 1.85, -0.15, 0.95, 0.65, 0x0F172A, 0x10B981, -0.20, 'backend', true, 0x10B981);

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
    this.addMonitor(group, -0.65, 1.85, -0.2, 1.1, 0.7, 0x1E293B, 0xF97316, 0.15, 'frontend_ui', true, 0xF97316);
    this.addMonitor(group, 0.65, 1.85, -0.2, 1.1, 0.7, 0x1E293B, 0xEC4899, -0.15, 'frontend_code', true, 0xEC4899);

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
    this.addMonitor(group, -0.65, 1.95, -0.2, 0.75, 1.15, 0x0F172A, 0x10B981, 0.15, 'qa_scope', true, 0x06B6D4);
    this.addMonitor(group, 0.65, 1.95, -0.2, 0.75, 1.15, 0x0F172A, 0x34D399, -0.15, 'qa_matrix', true, 0x10B981);

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

    // 1. CLASSIC BILLIARD / POOL TABLE (Positioned under billiard lamp at world -8.0, 7.0)
    this.buildBilliardTable(group, 3.5, 0.0);

    // 2. RETRO ARCADE CABINET (Positioned under neon light at world -17.0, 5.5)
    this.buildArcadeCabinet(group, -5.5, -1.5);

    // 3. SNACK & SODA VENDING MACHINE (Next to arcade cabinet)
    this.buildVendingMachine(group, -7.5, -1.5);

    // 4. MUSTARD & CHARCOAL L-SHAPED LOUNGE SOFA
    const sofaSeatA = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.6, 1.6),
      new THREE.MeshLambertMaterial({ color: 0xD97706 })
    );
    sofaSeatA.position.set(-2.5, 0.45, 3.2);
    sofaSeatA.castShadow = true;
    group.add(sofaSeatA);

    const sofaSeatB = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.6, 3.0),
      new THREE.MeshLambertMaterial({ color: 0xD97706 })
    );
    sofaSeatB.position.set(-4.5, 0.45, 1.2);
    sofaSeatB.castShadow = true;
    group.add(sofaSeatB);

    // Sofa Backrest A
    const sofaBackA = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.8, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xB45309 })
    );
    sofaBackA.position.set(-2.5, 0.85, 3.9);
    group.add(sofaBackA);

    // Sofa Backrest B
    const sofaBackB = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.8, 3.0),
      new THREE.MeshLambertMaterial({ color: 0xB45309 })
    );
    sofaBackB.position.set(-5.2, 0.85, 1.2);
    group.add(sofaBackB);

    // 5. GLASS COFFEE TABLE WITH RETRO GAMEPADS
    const coffeeTable = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.1, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x94A3B8, transparent: true, opacity: 0.85 })
    );
    coffeeTable.position.set(-2.5, 0.45, 1.5);
    group.add(coffeeTable);

    [-0.5, 0.5].forEach(gx => {
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.06, 0.22),
        new THREE.MeshBasicMaterial({ color: gx < 0 ? 0x06B6D4 : 0xEC4899 })
      );
      pad.position.set(-2.5 + gx, 0.53, 1.5);
      group.add(pad);
    });

    // 6. 65" WALL SMART TV & CONSOLE
    const tvMat = (this.screenTextures && this.screenTextures['tv_synthwave'])
      ? new THREE.MeshBasicMaterial({ map: this.screenTextures['tv_synthwave'] })
      : new THREE.MeshBasicMaterial({ color: 0x38BDF8 });
    const tvScreen = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 2.0, 0.15),
      tvMat
    );
    tvScreen.position.set(-2.5, 2.4, 5.6);
    group.add(tvScreen);

    const tvLight = new THREE.PointLight(0x38BDF8, 0.65, 5.0, 1.6);
    tvLight.position.set(-2.5, 2.4, 5.1);
    group.add(tvLight);
    this.accentNightLights.push({ light: tvLight, nightIntensity: 0.80, dayIntensity: 0.30 });

    const tvConsole = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.3, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x0F172A })
    );
    tvConsole.position.set(-2.5, 0.4, 5.3);
    group.add(tvConsole);

    // 7. CYBERPUNK BEANBAG HIBERNATION REST ZONE
    const beanbagColors = [0x8B5CF6, 0x06B6D4, 0xEC4899];
    [-1.0, 0, 1.0].forEach((bx, idx) => {
      const beanbag = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 12, 10),
        new THREE.MeshLambertMaterial({ color: beanbagColors[idx] })
      );
      beanbag.scale.set(1.0, 0.6, 1.1);
      beanbag.position.set(5.5 + bx * 1.3, 0.35, 4.2);
      beanbag.castShadow = true;
      group.add(beanbag);
    });

    // 8. CORNER MONSTERA PLANT
    this.buildMonsteraPlant(group, -7.8, 4.8);

    parent.add(group);
  }

  buildVendingMachine(parent, x, z) {
    const vend = new THREE.Group();
    vend.position.set(x, 0, z);

    // Main Body (Vibrant Red)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 3.4, 1.4),
      new THREE.MeshLambertMaterial({ color: 0xDC2626 })
    );
    body.position.set(0, 1.7, 0);
    body.castShadow = true;
    vend.add(body);

    // Glowing Glass Display
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.8, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x38BDF8, transparent: true, opacity: 0.9 })
    );
    glass.position.set(0, 2.1, 0.72);
    vend.add(glass);

    // Drink Cans Row
    const canColors = [0xFACC15, 0x10B981, 0x3B82F6, 0xEC4899];
    for (let r = 0; r < 3; r++) {
      canColors.forEach((cc, cIdx) => {
        const can = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8),
          new THREE.MeshBasicMaterial({ color: cc })
        );
        can.position.set(-0.4 + cIdx * 0.26, 1.5 + r * 0.5, 0.65);
        vend.add(can);
      });
    }

    // Dispenser Slot at Bottom
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.45, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x1E293B })
    );
    slot.position.set(0, 0.5, 0.72);
    vend.add(slot);

    parent.add(vend);
  }

  buildMonsteraPlant(parent, x, z) {
    const plant = new THREE.Group();
    plant.position.set(x, 0, z);

    // Terracotta Pot
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.3, 0.9, 12),
      new THREE.MeshLambertMaterial({ color: 0xEA580C })
    );
    pot.position.set(0, 0.45, 0);
    pot.castShadow = true;
    plant.add(pot);

    // Lush Monstera Leaves
    const leafGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x15803D });
    leafGeo.scale(1.2, 0.25, 1.5);

    [
      { rx: 0.3, ry: 0, rz: 0.3, px: 0.2, py: 1.0, pz: 0.2 },
      { rx: -0.3, ry: 1.2, rz: -0.2, px: -0.2, py: 1.1, pz: -0.1 },
      { rx: 0.2, ry: 2.4, rz: -0.3, px: -0.2, py: 1.2, pz: 0.2 },
      { rx: -0.1, ry: 3.6, rz: 0.4, px: 0.1, py: 1.3, pz: -0.2 }
    ].forEach(lp => {
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(lp.px, lp.py, lp.pz);
      leaf.rotation.set(lp.rx, lp.ry, lp.rz);
      plant.add(leaf);
    });

    parent.add(plant);
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

    // Glowing CRT Screen with Live 8-Bit Retro Arcade Canvas
    const arcadeMat = (this.screenTextures && this.screenTextures['arcade_crt'])
      ? new THREE.MeshBasicMaterial({ map: this.screenTextures['arcade_crt'] })
      : new THREE.MeshBasicMaterial({ color: 0x06B6D4 });
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.9, 0.1),
      arcadeMat
    );
    screen.position.set(0, 2.3, 0.82);
    arcade.add(screen);

    const arcadeLight = new THREE.PointLight(0xEC4899, 0.60, 3.5, 1.6);
    arcadeLight.position.set(0, 2.3, 1.3);
    arcade.add(arcadeLight);
    this.accentNightLights.push({ light: arcadeLight, nightIntensity: 0.80, dayIntensity: 0.30 });

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

  addMonitor(group, x, y, z, w, h, bezelColor, screenColor, rotY = 0, screenType = null, addBounceLight = false, bounceColor = 0xFFFFFF) {
    const monitor = new THREE.Group();
    monitor.position.set(x, y, z);
    monitor.rotation.y = rotY;

    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.08),
      new THREE.MeshLambertMaterial({ color: bezelColor })
    );
    bezel.castShadow = true;
    monitor.add(bezel);

    let screenMat;
    if (screenType && this.screenTextures && this.screenTextures[screenType]) {
      screenMat = new THREE.MeshBasicMaterial({ map: this.screenTextures[screenType] });
    } else {
      screenMat = new THREE.MeshBasicMaterial({ color: screenColor });
    }

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, h - 0.1), screenMat);
    screen.position.set(0, 0, 0.045);
    monitor.add(screen);
    this.monitors.push(screenMat);

    // Subtle soft emissive bounce point light illuminating desk surface & avatar face
    if (addBounceLight) {
      const bounce = new THREE.PointLight(bounceColor, 0.50, 3.2, 1.8);
      bounce.position.set(0, 0, 0.55);
      monitor.add(bounce);
      this.accentNightLights.push({ light: bounce, nightIntensity: 0.70, dayIntensity: 0.30 });
    }

    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    stand.position.set(0, -h / 2 - 0.25, 0);
    monitor.add(stand);

    group.add(monitor);
    return monitor;
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
        socialStatus: 'at_desk',
        bubble: 'Executive Suite',
        x: -15.5, z: -6.5,
        targetX: -15.5, targetZ: -6.5,
        targetY: 1.15,
        workPos: { x: -15.5, z: -6.5, y: 1.15 },
        breakPos: { x: -15.5, z: -2.0, y: 1.15 },
        sleepPos: { x: -14.0, z: 10.2, y: 1.15 },
        waypointsToBreak: [
          { x: -15.5, z: -4.0 },
          { x: -15.5, z: -2.0 }
        ],
        waypointsToDesk: [
          { x: -15.5, z: -4.0 },
          { x: -15.5, z: -6.5 }
        ],
        breakBubble: 'Executive review & santai sejenak 📋',
        deskBubble: 'Executive Suite',
        activePath: null,
        nextSocialTimer: 35 + Math.random() * 25,
        breakDuration: 0,
        lastTypeSound: 0,
        lastAmbientSound: 0
      },
      HABIBIE: {
        name: 'HABIBIE',
        role: 'Chief Architect',
        color: '#8B5CF6',
        state: 'idle',
        socialStatus: 'at_desk',
        bubble: 'Studio Arsitek',
        x: -5.5, z: -6.5,
        targetX: -5.5, targetZ: -6.5,
        targetY: 1.25,
        workPos: { x: -5.5, z: -6.5, y: 1.25 },
        breakPos: { x: -5.5, z: -2.0, y: 1.25 },
        sleepPos: { x: -5.5, z: -6.5, y: 1.25 },
        waypointsToBreak: [
          { x: -5.5, z: -4.0 },
          { x: -5.5, z: -2.0 }
        ],
        waypointsToDesk: [
          { x: -5.5, z: -4.0 },
          { x: -5.5, z: -6.5 }
        ],
        breakBubble: 'Merancang arsitektur N-250 Gatotkaca ✈️',
        deskBubble: 'Studio Arsitek',
        activePath: null,
        nextSocialTimer: 45 + Math.random() * 30,
        breakDuration: 0,
        lastTypeSound: 0,
        lastAmbientSound: 0
      },
      JOKOWI: {
        name: 'JOKOWI',
        role: 'Backend Engineer',
        color: '#0EA5E9',
        state: 'idle',
        socialStatus: 'at_desk',
        bubble: 'Backend Bay',
        x: 3.5, z: -6.5,
        targetX: 3.5, targetZ: -6.5,
        targetY: 1.15,
        workPos: { x: 3.5, z: -6.5, y: 1.15 },
        breakPos: { x: 11.5, z: 6.5, y: 1.15 }, // Kantin espresso bar
        sleepPos: { x: -14.0, z: 10.2, y: 1.15 }, // Game room lounge sofa
        waypointsToBreak: [
          { x: 3.5, z: -3.5 },
          { x: 0.5, z: -1.2 },
          { x: 0.5, z: 1.2 },
          { x: 6.0, z: 2.2 },
          { x: 11.5, z: 6.5 }
        ],
        waypointsToDesk: [
          { x: 6.0, z: 2.2 },
          { x: 0.5, z: 1.2 },
          { x: 0.5, z: -1.2 },
          { x: 3.5, z: -3.5 },
          { x: 3.5, z: -6.5 }
        ],
        breakBubble: 'Sedang rehat sejenak menikmati espresso homelab ☕',
        deskBubble: 'Backend Bay',
        activePath: null,
        nextSocialTimer: 25 + Math.random() * 20,
        breakDuration: 0,
        lastTypeSound: 0,
        lastAmbientSound: 0
      },
      PRABOWO: {
        name: 'PRABOWO',
        role: 'Frontend Engineer',
        color: '#F97316',
        state: 'idle',
        socialStatus: 'at_desk',
        bubble: 'Frontend Bay',
        x: 11.5, z: -6.5,
        targetX: 11.5, targetZ: -6.5,
        targetY: 1.15,
        workPos: { x: 11.5, z: -6.5, y: 1.15 },
        breakPos: { x: -17.0, z: 5.5, y: 1.15 }, // Game Room arcade cabinet
        sleepPos: { x: -6.0, z: 11.2, y: 1.15 }, // Game room beanbag
        waypointsToBreak: [
          { x: 11.5, z: -3.5 },
          { x: 0.5, z: -1.2 },
          { x: 0.5, z: 1.2 },
          { x: -6.0, z: 2.2 },
          { x: -17.0, z: 5.5 }
        ],
        waypointsToDesk: [
          { x: -6.0, z: 2.2 },
          { x: 0.5, z: 1.2 },
          { x: 0.5, z: -1.2 },
          { x: 11.5, z: -3.5 },
          { x: 11.5, z: -6.5 }
        ],
        breakBubble: 'Mencoba rekor baru di Pac-Man arcade 🕹️',
        deskBubble: 'Frontend Bay',
        activePath: null,
        nextSocialTimer: 30 + Math.random() * 25,
        breakDuration: 0,
        lastTypeSound: 0,
        lastAmbientSound: 0
      },
      GIBRAN: {
        name: 'GIBRAN',
        role: 'QA & Security',
        color: '#10B981',
        state: 'idle',
        socialStatus: 'at_desk',
        bubble: 'QA Terminal',
        x: 19.5, z: -6.5,
        targetX: 19.5, targetZ: -6.5,
        targetY: 1.15,
        workPos: { x: 19.5, z: -6.5, y: 1.15 },
        breakPos: { x: -8.0, z: 8.5, y: 1.15 }, // Billiard table side
        sleepPos: { x: -6.0, z: 11.2, y: 1.15 }, // Game room beanbag
        waypointsToBreak: [
          { x: 19.5, z: -3.5 },
          { x: 0.5, z: -1.2 },
          { x: 0.5, z: 1.2 },
          { x: -4.0, z: 2.2 },
          { x: -8.0, z: 8.5 }
        ],
        waypointsToDesk: [
          { x: -4.0, z: 2.2 },
          { x: 0.5, z: 1.2 },
          { x: 0.5, z: -1.2 },
          { x: 19.5, z: -3.5 },
          { x: 19.5, z: -6.5 }
        ],
        breakBubble: 'Rehat biliar trickshot & cek keamanan 🎱',
        deskBubble: 'QA Terminal',
        activePath: null,
        nextSocialTimer: 35 + Math.random() * 30,
        breakDuration: 0,
        lastTypeSound: 0,
        lastAmbientSound: 0
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
        const prevState = ag.state;
        ag.state = data.state || 'idle';
        ag.role = data.role || ag.role;

        // Custom bubble update
        if (data.bubble_text && ag.socialStatus === 'at_desk' && data.bubble_text !== ag.bubble) {
          ag.bubble = data.bubble_text;
          ag.deskBubble = data.bubble_text;
          this.updateAgentBubble(name, ag.bubble);
        }

        // Active task assignment: working or reviewing
        if (ag.state === 'working' || ag.state === 'reviewing') {
          if (ag.socialStatus !== 'at_desk' && ag.socialStatus !== 'walking_to_desk') {
            // Abort break and path directly back to desk
            ag.socialStatus = 'walking_to_desk';
            ag.activePath = (ag.waypointsToDesk && ag.waypointsToDesk.length) ? ag.waypointsToDesk.slice() : null;
          }
          if (data.bubble_text) {
            ag.bubble = data.bubble_text;
            this.updateAgentBubble(name, ag.bubble);
          }
        } else if (ag.state === 'sleeping') {
          ag.socialStatus = 'sleeping';
          ag.targetX = ag.sleepPos.x;
          ag.targetZ = ag.sleepPos.z;
          ag.targetY = ag.sleepPos.y || 1.15;
          ag.activePath = null;
        } else if (ag.state === 'idle') {
          if (prevState === 'sleeping') {
            ag.socialStatus = 'at_desk';
            ag.targetX = ag.workPos.x;
            ag.targetZ = ag.workPos.z;
            ag.targetY = ag.workPos.y || 1.15;
            ag.activePath = null;
          }
        }
      }
    }
  }

  updateAnimations(time) {
    // 0. Update Animated Screen Textures (~12 FPS Throttle)
    if (time - this.lastScreenUpdate > 0.08) {
      this.lastScreenUpdate = time;
      this.updateAnimatedScreens(time);
    }

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
      // Check if any agent is near (< 2.4 units)
      let agentNear = false;
      for (const ag of Object.values(this.agents)) {
        const mesh = this.agentMeshes[ag.name];
        if (mesh) {
          const dist = Math.hypot(mesh.position.x - door.worldX, mesh.position.z - door.worldZ);
          if (dist < 2.4) {
            agentNear = true;
            break;
          }
        }
      }

      if (!door.isAutoOpen && agentNear) {
        if (window.soundFx && typeof window.soundFx.playDoorSwing === 'function') {
          window.soundFx.playDoorSwing();
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

    // 6. Agent Figurines, Autonomous Social Pathing & Procedural Animations
    for (const [name, ag] of Object.entries(this.agents)) {
      const mesh = this.agentMeshes[name];
      if (!mesh) continue;

      // Autonomous Social Pathing Transition for Idle Agents
      if (ag.state === 'idle') {
        if (ag.socialStatus === 'at_desk') {
          if (time > ag.nextSocialTimer) {
            ag.socialStatus = 'walking_to_break';
            ag.activePath = (ag.waypointsToBreak && ag.waypointsToBreak.length) ? ag.waypointsToBreak.slice() : null;
          }
        } else if (ag.socialStatus === 'at_break') {
          if (time > ag.breakDuration) {
            ag.socialStatus = 'walking_to_desk';
            ag.activePath = (ag.waypointsToDesk && ag.waypointsToDesk.length) ? ag.waypointsToDesk.slice() : null;
          }
        }
      }

      // Waypoint Navigation
      if (ag.activePath && ag.activePath.length > 0) {
        const nextPt = ag.activePath[0];
        const dx = nextPt.x - mesh.position.x;
        const dz = nextPt.z - mesh.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.15) {
          const walkSpeed = 0.065;
          mesh.position.x += (dx / dist) * walkSpeed;
          mesh.position.z += (dz / dist) * walkSpeed;

          // Rotate to face movement direction
          const targetRot = Math.atan2(dx, dz);
          let diff = targetRot - mesh.rotation.y;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          mesh.rotation.y += diff * 0.15;

          // Walking body bob & arm swing
          mesh.position.y = ag.targetY + Math.abs(Math.sin(time * 11)) * 0.08;
          if (mesh.hands && mesh.hands.length === 2) {
            mesh.hands[0].position.z = Math.sin(time * 11) * 0.14;
            mesh.hands[1].position.z = -Math.sin(time * 11) * 0.14;
            mesh.hands[0].position.y = 0.22;
            mesh.hands[1].position.y = 0.22;
          }
        } else {
          // Waypoint reached
          ag.activePath.shift();
          if (ag.activePath.length === 0) {
            ag.activePath = null;
            if (ag.socialStatus === 'walking_to_break') {
              ag.socialStatus = 'at_break';
              ag.breakDuration = time + 25 + Math.random() * 20; // 25-45s break
              this.updateAgentBubble(name, ag.breakBubble);
            } else if (ag.socialStatus === 'walking_to_desk') {
              ag.socialStatus = 'at_desk';
              ag.nextSocialTimer = time + 35 + Math.random() * 35;
              mesh.rotation.y = 0; // face desk monitors
              this.updateAgentBubble(name, ag.deskBubble);
            }
          }
        }
      } else if (ag.socialStatus === 'at_desk') {
        mesh.position.x = ag.workPos.x;
        mesh.position.z = ag.workPos.z;
        mesh.rotation.y = 0; // face desk monitors

        if (ag.state === 'working' || ag.state === 'reviewing') {
          if (mesh.hands && mesh.hands.length === 2) {
            mesh.hands[0].position.y = 0.25 + Math.sin(time * 14) * 0.04;
            mesh.hands[1].position.y = 0.25 + Math.cos(time * 14) * 0.04;
            mesh.hands[0].position.z = 0.25;
            mesh.hands[1].position.z = 0.25;
          }
          if (mesh.headMesh) {
            mesh.headMesh.rotation.x = 0.12 + Math.sin(time * 5) * 0.04;
          }
          mesh.position.y = ag.targetY + Math.sin(time * 6) * 0.02;

          // Keyboard clicks
          if (window.soundFx && typeof window.soundFx.playKeyboardClick === 'function') {
            if (!ag.lastTypeSound || time - ag.lastTypeSound > 2.5 + Math.random() * 2.0) {
              ag.lastTypeSound = time;
              window.soundFx.playKeyboardClick();
            }
          }
        } else {
          // Idle sitting at desk
          mesh.position.y = ag.targetY + Math.sin(time * 2.2) * 0.03;
          if (mesh.headMesh) {
            mesh.headMesh.rotation.x = Math.sin(time * 1.2) * 0.02;
            mesh.headMesh.rotation.y = Math.sin(time * 0.6) * 0.08;
          }
          if (mesh.hands && mesh.hands.length === 2) {
            mesh.hands[0].position.y = 0.22;
            mesh.hands[1].position.y = 0.22;
            mesh.hands[0].position.z = 0.22;
            mesh.hands[1].position.z = 0.22;
          }
        }
      } else if (ag.socialStatus === 'at_break') {
        mesh.position.y = ag.targetY + Math.sin(time * 1.8) * 0.025;
        if (mesh.headMesh) {
          mesh.headMesh.rotation.x = Math.sin(time * 1.0) * 0.04;
          mesh.headMesh.rotation.y = Math.sin(time * 0.8) * 0.12;
        }

        // Ambient soundscapes when at break
        if (window.soundFx && window.soundFx.isEnabled()) {
          if (name === 'JOKOWI' && (!ag.lastAmbientSound || time - ag.lastAmbientSound > 16.0)) {
            ag.lastAmbientSound = time;
            if (typeof window.soundFx.playEspressoHiss === 'function') window.soundFx.playEspressoHiss();
          } else if (name === 'PRABOWO' && (!ag.lastAmbientSound || time - ag.lastAmbientSound > 12.0)) {
            ag.lastAmbientSound = time;
            if (typeof window.soundFx.playArcadeBeep === 'function') window.soundFx.playArcadeBeep();
          } else if (name === 'GIBRAN' && (!ag.lastAmbientSound || time - ag.lastAmbientSound > 15.0)) {
            ag.lastAmbientSound = time;
            if (typeof window.soundFx.playBilliardClack === 'function') window.soundFx.playBilliardClack();
          }
        }
      } else if (ag.state === 'sleeping') {
        mesh.position.x += (ag.sleepPos.x - mesh.position.x) * 0.06;
        mesh.position.z += (ag.sleepPos.z - mesh.position.z) * 0.06;
        mesh.position.y = ag.targetY + Math.sin(time * 1.5) * 0.015;
        if (mesh.headMesh) {
          mesh.headMesh.rotation.x = 0.45;
        }
      }

      // Procedural Eye Blinking (Every 3.5 - 6s for 140ms)
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

    if (this.screenTextures) {
      Object.values(this.screenTextures).forEach(t => {
        if (t && typeof t.dispose === 'function') t.dispose();
      });
      this.screenTextures = {};
      this.screenCanvases = {};
      this.screenCtxs = {};
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
