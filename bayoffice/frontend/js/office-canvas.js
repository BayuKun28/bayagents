/**
 * BayOffice - Multi-Room 2D Virtual Office Canvas Engine
 * Design Standards: Anti AI Slop, Zero Emoji, Clean Architecture Geometry
 * Features:
 * - 4 Themed Rooms: Executive Suite (Luhut), Engineering Bay, Game Room, Kantin & Coffee Bar
 * - Enhanced Kantin with Commercial Espresso Machine, Menu Chalkboard, Pastry Case & Cooler
 * - Smooth Agent Pathing / Interpolation (Lerp) between rooms based on state
 * - Real Profile Photo Avatar rendering (Circular clipped with status-coded borders)
 * - Dynamic Status Badges, Speech Bubbles, and High-Contrast Dark Mode compatibility
 */

class OfficeCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = 960;
    this.canvas.height = 480;
    
    this.animationFrame = 0;
    this.images = {};
    this.loadedImagesCount = 0;

    // Preload SVG & Avatar images
    this.loadAssets({
      poster: '/static/assets/poster_art.svg',
      arcade: '/static/assets/arcade.svg',
      serverRack: '/static/assets/server_cabinet.svg',
      workstationDesk: '/static/assets/workstation_desk.svg',
      executiveDesk: '/static/assets/executive_desk.svg',
      monsteraPlant: '/static/assets/plant_monstera.svg',
      plantSnake: '/static/assets/plant_snake.svg',
      coffeeMachine: '/static/assets/coffee_machine.svg',
      whiteboard: '/static/assets/whiteboard.svg',
      waterCooler: '/static/assets/water_cooler.svg',
      sofaLounge: '/static/assets/sofa_lounge.svg',
      coolerFridge: '/static/assets/cooler_fridge.svg',
      vendingMachine: '/static/assets/vending_machine.svg',
      diningLongTable: '/static/assets/dining_long_table.svg',
      cafeTable: '/static/assets/cafe_table.svg',
      tvGaming: '/static/assets/tv_gaming.svg',
      officeWindow: '/static/assets/office_window.svg',
      officeChair: '/static/assets/office_chair.svg',
      executiveChair: '/static/assets/executive_chair.svg',
      bookshelfCredenza: '/static/assets/bookshelf_credenza.svg',
      wallClock: '/static/assets/wall_clock.svg',
      avatar_LUHUT: '/static/assets/avatars/luhut.jpg',
      avatar_JOKOWI: '/static/assets/avatars/jokowi.jpg',
      avatar_PRABOWO: '/static/assets/avatars/prabowo.jpg',
      avatar_GIBRAN: '/static/assets/avatars/gibran.jpg',
      avatar_HABIBIE: '/static/assets/avatars/habibie.jpg'
    });
    
    // Posisi awal dan state agen (Termasuk HABIBIE - Chief Architect)
    this.agents = {
      LUHUT: {
        name: 'LUHUT',
        role: 'Lead Orchestrator',
        color: '#EF4444',
        x: 112, y: 150,
        targetX: 112, targetY: 150,
        state: 'idle',
        bubble: 'Memantau sprint dari Executive Suite.'
      },
      JOKOWI: {
        name: 'JOKOWI',
        role: 'Backend Engineer',
        color: '#0EA5E9',
        x: 620, y: 385,
        targetX: 620, targetY: 385,
        state: 'idle',
        bubble: 'Santai di kantin, backend siap.'
      },
      PRABOWO: {
        name: 'PRABOWO',
        role: 'Frontend Engineer',
        color: '#F97316',
        x: 205, y: 385,
        targetX: 205, targetY: 385,
        state: 'idle',
        bubble: 'Tanam Sawitt!'
      },
      GIBRAN: {
        name: 'GIBRAN',
        role: 'QA & Security',
        color: '#10B981',
        x: 770, y: 385,
        targetX: 770, targetY: 385,
        state: 'idle',
        bubble: 'Standby di kantin, siap audit QA.'
      },
      HABIBIE: {
        name: 'HABIBIE',
        role: 'Chief Architect',
        color: '#8B5CF6',
        x: 334, y: 150,
        targetX: 334, targetY: 150,
        state: 'idle',
        bubble: 'Cinta Sejati'
      }
    };

    this.hoveredAgent = null;
    this.onAgentClick = null;
    this.rafId = null;
    this.isPaused = false;
    this.isViewActive = true;

    this.setupHitDetection();
    this.setupVisibilityHandler();
    this.startLoop();
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

  setViewActive(active) {
    this.isViewActive = !!active;
    if (this.isViewActive && !document.hidden) {
      this.startLoop();
    } else {
      this.stopLoop();
    }
  }

  setupHitDetection() {
    if (!this.canvas) return;

    const getCanvasCoords = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const getAgentAt = (x, y) => {
      const hitRadius = 35;
      for (const [name, ag] of Object.entries(this.agents)) {
        if (!ag) continue;
        const dist = Math.hypot(x - ag.x, y - ag.y);
        if (dist <= hitRadius) {
          return name;
        }
      }
      return null;
    };

    this.canvas.addEventListener('mousemove', (e) => {
      const coords = getCanvasCoords(e);
      const targetAgent = getAgentAt(coords.x, coords.y);
      if (targetAgent) {
        this.canvas.style.cursor = 'pointer';
        this.hoveredAgent = targetAgent;
      } else {
        this.canvas.style.cursor = 'default';
        this.hoveredAgent = null;
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.canvas.style.cursor = 'default';
      this.hoveredAgent = null;
    });

    this.canvas.addEventListener('click', (e) => {
      const coords = getCanvasCoords(e);
      const targetAgent = getAgentAt(coords.x, coords.y);
      if (targetAgent && typeof this.onAgentClick === 'function') {
        this.onAgentClick(targetAgent);
      }
    });
  }

  loadAssets(assetList) {
    for (const [key, src] of Object.entries(assetList)) {
      const img = new Image();
      img.onload = () => {
        this.images[key] = img;
        this.loadedImagesCount++;
      };
      img.onerror = () => {
        console.warn(`Gagal memuat aset: ${src}`);
      };
      img.src = src;
    }
  }

  getGameRoomSpots() {
    return [
      { x: 62, y: 380, label: 'Arcade Pac-Man' },        // Main Arcade Pac-Man
      { x: 215, y: 380, label: 'Sofa Gaming' },          // Duduk di Sofa Gaming
      { x: 125, y: 405, label: 'Pojok TV & Monstera' },  // Pojok Santai TV & Meja Kopi
      { x: 355, y: 395, label: 'Hibernation Rest Zone' } // Kasur Beanbag Rest Zone
    ];
  }

  getAgentTargetPosition(name, state) {
    // 1. Khusus HABIBIE: Chief Architect selalu di ruangannya sendiri (Architect Studio)
    // Tidak pernah ikut ke Game Room saat agen lain tidur/hibernasi
    if (name === 'HABIBIE') {
      if (state === 'working' || state === 'reviewing') {
        return { x: 334, y: 88 }; // Meja gambar arsitek
      }
      return { x: 334, y: 150 };  // Kursi santai studio arsitek
    }

    // 2. Jika mode SLEEP (Auto-Sleep / Hemat RAM) -> Agen lain tersebar di Game Room dengan rotasi dinamis 15s
    if (state === 'sleeping') {
      const gameRoomSpots = this.getGameRoomSpots();
      const agentNames = ['PRABOWO', 'JOKOWI', 'GIBRAN', 'LUHUT'];
      const idx = agentNames.indexOf(name);
      const rotationIndex = Math.floor(this.animationFrame / 900);
      const spotIdx = ((idx >= 0 ? idx : 0) + rotationIndex) % gameRoomSpots.length;
      return gameRoomSpots[spotIdx];
    }

    // 3. Jika mode KERJA (Working / Reviewing) -> Pindah ke Meja Kerja
    if (state === 'working' || state === 'reviewing') {
      const workDesks = {
        LUHUT:   { x: 112, y: 88 }, // Kursi eksekutif pimpinan
        JOKOWI:  { x: 540, y: 82 }, // Workstation backend
        PRABOWO: { x: 700, y: 82 }, // Workstation frontend
        GIBRAN:  { x: 860, y: 82 }  // Workstation QA & Security
      };
      return workDesks[name] || { x: 540, y: 82 };
    }

    // 4. Jika mode STANDBY (Idle) -> Santai di Ruangan masing-masing
    const standbySpots = {
      LUHUT:   { x: 112, y: 150 }, // Santai di Ruang Pimpinan
      JOKOWI:  { x: 670, y: 395 }, // Duduk santai di Meja Kafe 1 Kantin
      PRABOWO: { x: 205, y: 385 }, // Santai di Sofa Game Room
      GIBRAN:  { x: 790, y: 395 }  // Duduk santai di Meja Kafe 2 Kantin
    };
    return standbySpots[name] || { x: 480, y: 240 };
  }

  updateDynamicTargets() {
    // Rotasi spot Game Room setiap 15 detik (900 frame @ 60 FPS) secara halus
    const gameRoomSpots = this.getGameRoomSpots();
    const rotationIndex = Math.floor(this.animationFrame / 900);
    const agentNames = ['PRABOWO', 'JOKOWI', 'GIBRAN', 'LUHUT', 'HABIBIE'];

    agentNames.forEach((name, idx) => {
      const ag = this.agents[name];
      if (!ag) return;

      // Khusus HABIBIE: Selalu di studio sendiri
      if (name === 'HABIBIE') {
        const target = this.getAgentTargetPosition('HABIBIE', ag.state);
        ag.targetX = target.x;
        ag.targetY = target.y;
        return;
      }

      // 1. Jika mode KERJA -> Selalu di workstation
      if (ag.state === 'working' || ag.state === 'reviewing') {
        const target = this.getAgentTargetPosition(name, ag.state);
        ag.targetX = target.x;
        ag.targetY = target.y;
      } 
      // 2. Jika mode SLEEPING (Auto-Sleep) -> Berada di Game Room dan rotasi 15 detik sekali
      else if (ag.state === 'sleeping') {
        const spotIdx = (idx + rotationIndex) % gameRoomSpots.length;
        ag.targetX = gameRoomSpots[spotIdx].x;
        ag.targetY = gameRoomSpots[spotIdx].y;
      } 
      // 3. Jika mode STANDBY (Idle)
      else {
        // Khusus Prabowo di Game Room: Berotasi santai antara Arcade, Sofa, dan Pojok TV
        if (name === 'PRABOWO') {
          const prabowoSpots = [gameRoomSpots[0], gameRoomSpots[1], gameRoomSpots[2]];
          const pSpotIdx = rotationIndex % prabowoSpots.length;
          ag.targetX = prabowoSpots[pSpotIdx].x;
          ag.targetY = prabowoSpots[pSpotIdx].y;
        } else {
          const target = this.getAgentTargetPosition(name, ag.state);
          ag.targetX = target.x;
          ag.targetY = target.y;
        }
      }
    });
  }

  updateAgents(agentsData) {
    if (!agentsData) return;

    for (const [name, data] of Object.entries(agentsData)) {
      if (this.agents[name]) {
        const ag = this.agents[name];
        ag.state = data.state || 'idle';
        ag.bubble = data.bubble_text || ag.bubble;
        ag.role = data.role || ag.role;

        const target = this.getAgentTargetPosition(name, ag.state);
        ag.targetX = target.x;
        ag.targetY = target.y;
      }
    }
  }

  startLoop() {
    if (this.rafId) return;
    this.isPaused = false;
    const loop = () => {
      if (this.isPaused) {
        this.rafId = null;
        return;
      }
      this.animationFrame++;
      this.updateDynamicTargets();
      this.updatePositions();
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stopLoop() {
    this.isPaused = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  updatePositions() {
    // Smooth Interpolation (Lerp) untuk perpindahan antar-ruangan
    for (const ag of Object.values(this.agents)) {
      const dx = ag.targetX - ag.x;
      const dy = ag.targetY - ag.y;
      
      if (Math.abs(dx) > 0.5) ag.x += dx * 0.06;
      else ag.x = ag.targetX;

      if (Math.abs(dy) > 0.5) ag.y += dy * 0.06;
      else ag.y = ag.targetY;
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const isDark = document.body.classList.contains('dark-mode');

    // 0. Bersihkan Canvas
    ctx.fillStyle = isDark ? '#0B0F17' : '#1E232A';
    ctx.fillRect(0, 0, w, h);

    // 1. Gambar 5 Ruangan Berbeda (Termasuk Dedicated Studio Arsitek HABIBIE)
    this.drawExecutiveSuite(ctx, 10, 10, 210, 225, isDark);
    this.drawArchitectStudio(ctx, 228, 10, 212, 225, isDark);
    this.drawEngineeringBay(ctx, 450, 10, 500, 225, isDark);
    this.drawGameRoom(ctx, 10, 245, 430, 225, isDark);
    this.drawKantinPantry(ctx, 450, 245, 500, 225, isDark);

    // 2. Gambar Pembatas Lorong Tengah
    ctx.strokeStyle = isDark ? '#2D3748' : '#3E4C5E';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    // 3. Render 5 Agen dengan Avatar Asli & Chat Bubble
    this.renderAgents(ctx, isDark);
  }

  // ==========================================================
  // RUANGAN 1: EXECUTIVE SUITE (LUHUT - LEAD ORCHESTRATOR)
  // ==========================================================
  drawExecutiveSuite(ctx, x, y, w, h, isDark) {
    // 1. Dinding Atas & Plin Lantai (Architectural Wall & Skirting)
    const wallH = 68;
    ctx.fillStyle = isDark ? '#1F1116' : '#331920';
    ctx.fillRect(x, y, w, wallH);
    ctx.fillStyle = isDark ? '#3D1520' : '#4E212B';
    ctx.fillRect(x, y + wallH - 4, w, 4);

    // 2. Lantai Karpet Wol Merah Mewah (Burgundy Wool Carpet with Subtle Grid)
    ctx.fillStyle = isDark ? '#351016' : '#521920';
    ctx.fillRect(x, y + wallH, w, h - wallH);
    // Subtle Carpet Weave Grid
    ctx.strokeStyle = isDark ? 'rgba(74, 29, 36, 0.4)' : 'rgba(120, 40, 50, 0.3)';
    ctx.lineWidth = 1;
    for (let lx = x + 20; lx < x + w; lx += 20) {
      ctx.beginPath();
      ctx.moveTo(lx, y + wallH);
      ctx.lineTo(lx, y + h);
      ctx.stroke();
    }

    // 3. Border Ruangan
    ctx.strokeStyle = isDark ? '#4A1D24' : '#782832';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // 4. Papan Label Ruangan (Zero Emoji)
    const execLabel = (window.I18n && window.I18n.t) ? window.I18n.t('canvas.room_executive') : 'EXECUTIVE SUITE - LUHUT';
    this.drawRoomLabel(ctx, x + 8, y + 18, execLabel, '#FCA5A5', isDark);

    // 5. Dinding Belakang: Jendela Panorama & Credenza
    if (this.images.officeWindow && this.images.officeWindow.complete) {
      ctx.drawImage(this.images.officeWindow, x + 98, y + 18, 96, 44);
    }
    if (this.images.bookshelfCredenza && this.images.bookshelfCredenza.complete) {
      ctx.drawImage(this.images.bookshelfCredenza, x + 14, y + 26, 76, 32);
    }

    // 6. Tanaman Hias Sudut
    if (this.images.monsteraPlant && this.images.monsteraPlant.complete) {
      ctx.drawImage(this.images.monsteraPlant, x + 165, y + 160, 36, 44);
    }
    if (this.images.plantSnake && this.images.plantSnake.complete) {
      ctx.drawImage(this.images.plantSnake, x + 12, y + 160, 22, 44);
    }

    // 7. Area Meja Pimpinan (Executive Desk & Chair)
    const deskX = x + 44;
    const deskY = y + 96;

    // Kursi Kulit Direktur Pimpinan
    if (this.images.executiveChair && this.images.executiveChair.complete) {
      ctx.drawImage(this.images.executiveChair, deskX + 36, deskY - 28, 48, 48);
    } else {
      ctx.fillStyle = '#7F1D1D';
      ctx.fillRect(deskX + 38, deskY - 24, 44, 22);
      ctx.strokeStyle = '#B91C1C';
      ctx.strokeRect(deskX + 38, deskY - 24, 44, 22);
    }

    // Meja Pimpinan Kayu Jati Besar
    if (this.images.executiveDesk && this.images.executiveDesk.complete) {
      ctx.drawImage(this.images.executiveDesk, deskX, deskY, 120, 60);
    } else {
      ctx.fillStyle = '#451A03';
      ctx.fillRect(deskX, deskY, 115, 52);
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2;
      ctx.strokeRect(deskX, deskY, 115, 52);
    }

    // Spotlight Warm Glow di atas Meja Pimpinan
    const grad = ctx.createRadialGradient(deskX + 60, deskY + 30, 8, deskX + 60, deskY + 30, 75);
    grad.addColorStop(0, 'rgba(254, 243, 199, 0.12)');
    grad.addColorStop(1, 'rgba(254, 243, 199, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(deskX + 60, deskY + 30, 75, 0, Math.PI * 2);
    ctx.fill();
  }

  // ==========================================================
  // RUANGAN 2: ARCHITECT STUDIO (HABIBIE - CHIEF ARCHITECT)
  // ==========================================================
  drawArchitectStudio(ctx, x, y, w, h, isDark) {
    // 1. Dinding Atas & Plin Lantai (Royal Blueprint Indigo)
    const wallH = 68;
    ctx.fillStyle = isDark ? '#191228' : '#2A1B3D';
    ctx.fillRect(x, y, w, wallH);
    ctx.fillStyle = isDark ? '#3C2460' : '#4E2C7D';
    ctx.fillRect(x, y + wallH - 4, w, 4);

    // 2. Lantai Karpet Blueprint Studio (Deep Purple with Blueprint Grid)
    ctx.fillStyle = isDark ? '#23153A' : '#371F54';
    ctx.fillRect(x, y + wallH, w, h - wallH);

    // Blueprint Architectural Grid Lines
    ctx.strokeStyle = isDark ? 'rgba(167, 139, 250, 0.16)' : 'rgba(139, 92, 246, 0.22)';
    ctx.lineWidth = 1;
    for (let lx = x + 18; lx < x + w; lx += 18) {
      ctx.beginPath();
      ctx.moveTo(lx, y + wallH);
      ctx.lineTo(lx, y + h);
      ctx.stroke();
    }
    for (let ly = y + wallH + 18; ly < y + h; ly += 18) {
      ctx.beginPath();
      ctx.moveTo(x, ly);
      ctx.lineTo(x + w, ly);
      ctx.stroke();
    }

    // 3. Border Ruangan
    ctx.strokeStyle = isDark ? '#4C2882' : '#6D28D9';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // 4. Papan Label Ruangan (Zero Emoji)
    const archLabel = (window.I18n && window.I18n.t) ? window.I18n.t('canvas.room_architect') : 'ARCHITECT STUDIO - HABIBIE';
    this.drawRoomLabel(ctx, x + 8, y + 18, archLabel, '#C4B5FD', isDark);

    // 5. Dinding Belakang: Poster Blueprint Pesawat N-250 & Rak Tabung Blueprint
    // Frame Poster N-250 Aerospace
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(x + 12, y + 22, 88, 40);
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 12, y + 22, 88, 40);
    // Skema Aerodinamis N-250 (Vector Lines)
    ctx.strokeStyle = '#93C5FD';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Fuselage
    ctx.moveTo(x + 20, y + 42);
    ctx.lineTo(x + 88, y + 42);
    // Wings
    ctx.moveTo(x + 45, y + 42);
    ctx.lineTo(x + 36, y + 28);
    ctx.moveTo(x + 45, y + 42);
    ctx.lineTo(x + 36, y + 56);
    // Tail
    ctx.moveTo(x + 82, y + 42);
    ctx.lineTo(x + 92, y + 32);
    ctx.stroke();
    // Label Mini
    ctx.fillStyle = '#E0F2FE';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N-250 AEROSPACE', x + 56, y + 33);

    // Rak Tabung Blueprint & Buku Teknik
    if (this.images.bookshelfCredenza && this.images.bookshelfCredenza.complete) {
      ctx.drawImage(this.images.bookshelfCredenza, x + 108, y + 24, 60, 36);
    } else {
      ctx.fillStyle = '#312E81';
      ctx.fillRect(x + 108, y + 24, 60, 36);
      ctx.strokeStyle = '#6366F1';
      ctx.strokeRect(x + 108, y + 24, 60, 36);
    }

    // Tanaman Snake Plant di Sudut
    if (this.images.plantSnake && this.images.plantSnake.complete) {
      ctx.drawImage(this.images.plantSnake, x + 178, y + 20, 24, 46);
    }

    // 6. Meja Gambar Arsitek Miring (Drafting Table & Chair)
    const draftX = x + 35;
    const draftY = y + 96;

    // Kursi Putar Arsitek (Drafting Stool/Chair di belakang meja)
    if (this.images.executiveChair && this.images.executiveChair.complete) {
      ctx.drawImage(this.images.executiveChair, draftX + 48, draftY - 26, 44, 44);
    } else {
      ctx.fillStyle = '#4C1D95';
      ctx.fillRect(draftX + 50, draftY - 22, 40, 20);
      ctx.strokeStyle = '#8B5CF6';
      ctx.strokeRect(draftX + 50, draftY - 22, 40, 20);
    }

    // Meja Gambar Arsitek (Papan gambar miring neobrutalist ungu)
    ctx.fillStyle = isDark ? '#2E1065' : '#4C1D95';
    ctx.fillRect(draftX, draftY, 138, 58);
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(draftX, draftY, 138, 58);

    // Blueprint Mat di atas meja
    ctx.fillStyle = isDark ? '#3B0764' : '#EDE9FE';
    ctx.fillRect(draftX + 12, draftY + 8, 114, 42);
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 1;
    ctx.strokeRect(draftX + 12, draftY + 8, 114, 42);

    // Garis Skematik Blueprint Teknis
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(draftX + 22, draftY + 18);
    ctx.lineTo(draftX + 105, draftY + 18);
    ctx.moveTo(draftX + 22, draftY + 26);
    ctx.lineTo(draftX + 85, draftY + 26);
    ctx.moveTo(draftX + 22, draftY + 34);
    ctx.lineTo(draftX + 112, draftY + 34);
    // T-Square Ruler
    ctx.moveTo(draftX + 16, draftY + 12);
    ctx.lineTo(draftX + 16, draftY + 44);
    ctx.stroke();

    // Lampu Arsitek (Architect Desk Lamp dengan glow hangat)
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(draftX + 122, draftY + 14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Spotlight Warm Golden Glow di atas meja arsitek
    const archGlow = ctx.createRadialGradient(draftX + 70, draftY + 28, 8, draftX + 70, draftY + 28, 80);
    archGlow.addColorStop(0, 'rgba(253, 224, 71, 0.14)');
    archGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = archGlow;
    ctx.beginPath();
    ctx.arc(draftX + 70, draftY + 28, 80, 0, Math.PI * 2);
    ctx.fill();
  }

  // ==========================================================
  // RUANGAN 2: ENGINEERING BAY (JOKOWI, PRABOWO, GIBRAN)
  // ==========================================================
  drawEngineeringBay(ctx, x, y, w, h, isDark) {
    // 1. Dinding Atas & Plin Lantai (Slate Navy Wall & Baseboard)
    const wallH = 68;
    ctx.fillStyle = isDark ? '#0F1622' : '#1A2332';
    ctx.fillRect(x, y, w, wallH);
    ctx.fillStyle = isDark ? '#1E293B' : '#334155';
    ctx.fillRect(x, y + wallH - 4, w, 4);

    // 2. Lantai Kotak Teknologi (Checkered Slate Floor)
    const tileSize = 25;
    for (let py = y + wallH; py < y + h; py += tileSize) {
      for (let px = x; px < x + w; px += tileSize) {
        const isEven = (Math.floor((px - x) / tileSize) + Math.floor((py - y) / tileSize)) % 2 === 0;
        ctx.fillStyle = isEven 
          ? (isDark ? '#131C26' : '#222F3E') 
          : (isDark ? '#0F161E' : '#1C2632');
        ctx.fillRect(px, py, tileSize, tileSize);
      }
    }

    // 3. Border Ruangan
    ctx.strokeStyle = isDark ? '#1E293B' : '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // 4. Papan Label Ruangan (Zero Emoji)
    const engLabel = (window.I18n && window.I18n.t) ? window.I18n.t('canvas.room_engineering') : 'ENGINEERING BAY - WORKSTATIONS';
    this.drawRoomLabel(ctx, x + 12, y + 18, engLabel, '#93C5FD', isDark);

    // 5. Dinding Belakang: Rak Server Datacenter, Jam Dinding, Whiteboard, Jendela Skyline
    // Rak Server Datacenter 42U
    if (this.images.serverRack && this.images.serverRack.complete) {
      ctx.drawImage(this.images.serverRack, x + 14, y + 25, 44, 72);
    } else {
      this.drawServerFallback(ctx, x + 14, y + 25);
    }

    // Water Cooler Dispenser
    if (this.images.waterCooler && this.images.waterCooler.complete) {
      ctx.drawImage(this.images.waterCooler, x + 64, y + 28, 24, 48);
    }

    // Jam Dinding Minimalis Modern
    if (this.images.wallClock && this.images.wallClock.complete) {
      ctx.drawImage(this.images.wallClock, x + 98, y + 22, 28, 28);
    }

    // Whiteboard Arsitektur Sistem
    if (this.images.whiteboard && this.images.whiteboard.complete) {
      ctx.drawImage(this.images.whiteboard, x + 138, y + 18, 135, 46);
    } else {
      this.drawWhiteboard(ctx, x + 138, y + 22, 135, 40);
    }

    // Jendela Kaca Panorama Pencakar Langit Kota
    if (this.images.officeWindow && this.images.officeWindow.complete) {
      ctx.drawImage(this.images.officeWindow, x + 288, y + 18, 120, 46);
    }

    // Snake Plant Pot Tinggi di Pojok Kanan
    if (this.images.plantSnake && this.images.plantSnake.complete) {
      ctx.drawImage(this.images.plantSnake, x + 445, y + 20, 26, 48);
    }

    // 6. 3 Workstations: JOKOWI (Backend), PRABOWO (Frontend), GIBRAN (QA)
    const workstations = [
      { name: 'JOKOWI (BE)', x: x + 90, color: '#38BDF8' },
      { name: 'PRABOWO (FE)', x: x + 250, color: '#FB923C' },
      { name: 'GIBRAN (QA)', x: x + 410, color: '#34D399' }
    ];

    workstations.forEach(ws => {
      // Kursi Kerja Ergonomis Mesh (Aset SVG Herman Miller style)
      if (this.images.officeChair && this.images.officeChair.complete) {
        ctx.drawImage(this.images.officeChair, ws.x - 24, y + 62, 48, 48);
      } else {
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(ws.x - 18, y + 74, 36, 22);
        ctx.strokeStyle = ws.color;
        ctx.strokeRect(ws.x - 18, y + 74, 36, 22);
      }

      // Gambar Meja Workstation Modern Realistis (Aset SVG Dual Curved Monitor)
      if (this.images.workstationDesk && this.images.workstationDesk.complete) {
        ctx.drawImage(this.images.workstationDesk, ws.x - 48, y + 96, 96, 62);
      } else {
        ctx.fillStyle = '#334155';
        ctx.fillRect(ws.x - 45, y + 105, 90, 52);
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 2;
        ctx.strokeRect(ws.x - 45, y + 105, 90, 52);
      }

      // Lampu Gantung Plafon Modern (Linear Office Pendant Light) & Glow
      ctx.fillStyle = '#475569';
      ctx.fillRect(ws.x - 24, y + 84, 48, 2.5);
      // Soft Light Cone dari Plafon
      const lampGlow = ctx.createRadialGradient(ws.x, y + 120, 5, ws.x, y + 120, 60);
      lampGlow.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
      lampGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = lampGlow;
      ctx.beginPath();
      ctx.arc(ws.x, y + 120, 60, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ==========================================================
  // RUANGAN 3: GAME ROOM & LOUNGE
  // ==========================================================
  drawGameRoom(ctx, x, y, w, h, isDark) {
    // 1. Dinding Atas & Plin Lantai Neon Cyberpunk
    const wallH = 68;
    ctx.fillStyle = isDark ? '#140A1C' : '#220D2E';
    ctx.fillRect(x, y, w, wallH);
    ctx.fillStyle = isDark ? '#4A1D6D' : '#6B21A8';
    ctx.fillRect(x, y + wallH - 4, w, 4);

    // 2. Lantai Karpet Neon Retro
    ctx.fillStyle = isDark ? '#1E112A' : '#311747';
    ctx.fillRect(x, y + wallH, w, h - wallH);

    // Subtle Neon Grid Lines di Lantai
    ctx.strokeStyle = 'rgba(217, 70, 239, 0.12)';
    ctx.lineWidth = 1;
    for (let lx = x + 25; lx < x + w; lx += 25) {
      ctx.beginPath();
      ctx.moveTo(lx, y + wallH);
      ctx.lineTo(lx, y + h);
      ctx.stroke();
    }

    // 3. Border Ruangan
    ctx.strokeStyle = isDark ? '#3B1A56' : '#58217D';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // 4. Papan Label Ruangan (Zero Emoji)
    const gameLabel = (window.I18n && window.I18n.t) ? window.I18n.t('canvas.room_game') : 'GAME ROOM & ARCADE LOUNGE';
    this.drawRoomLabel(ctx, x + 12, y + 18, gameLabel, '#D8B4FE', isDark);

    // 5. Layar TV Gaming 65" OLED Bezelless di Dinding
    if (this.images.tvGaming && this.images.tvGaming.complete) {
      ctx.drawImage(this.images.tvGaming, x + 140, y + 18, 96, 52);
    }

    // Poster Game Populer (Cyberpunk 2077) di Dinding Kanan
    if (this.images.poster && this.images.poster.complete) {
      ctx.drawImage(this.images.poster, x + 265, y + 20, 85, 44);
    }

    // Snake plant di pojok dinding
    if (this.images.plantSnake && this.images.plantSnake.complete) {
      ctx.drawImage(this.images.plantSnake, x + 380, y + 20, 24, 48);
    }

    // 6. Mesin Arcade Retro (Pac-Man)
    if (this.images.arcade && this.images.arcade.complete) {
      ctx.drawImage(this.images.arcade, x + 30, y + 78, 55, 95);
    } else {
      this.drawArcadeFallback(ctx, x + 30, y + 78);
    }

    // Efek Layar Arcade Berpendar Neon di Lantai
    const glowPhase = Math.sin(this.animationFrame * 0.1) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(217, 70, 239, ${glowPhase * 0.25})`;
    ctx.fillRect(x + 20, y + 150, 75, 45);

    // 7. Sofa Gaming Empuk Kulit Modern
    if (this.images.sofaLounge && this.images.sofaLounge.complete) {
      ctx.drawImage(this.images.sofaLounge, x + 150, y + 130, 115, 54);
    }

    // Meja Kopi Kaca di Depan Sofa Game
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x + 172, y + 115, 70, 18);
    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 172, y + 115, 70, 18);
    // Gamepad controller di atas meja kopi
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(x + 195, y + 118, 14, 8);
    ctx.fillStyle = '#EC4899';
    ctx.fillRect(x + 198, y + 120, 2, 2);

    // Tanaman Hias Pot Monstera di Samping Sofa
    if (this.images.monsteraPlant && this.images.monsteraPlant.complete) {
      ctx.drawImage(this.images.monsteraPlant, x + 105, y + 135, 38, 48);
    }

    // 8. Area Kasur Beanbag Santai (REST ZONE untuk Auto-Sleep)
    ctx.fillStyle = isDark ? '#2E1A47' : '#4C2475';
    ctx.fillRect(x + 295, y + 125, 115, 65);
    ctx.strokeStyle = '#9333EA';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 295, y + 125, 115, 65);
    // Bantal empuk di rest zone
    ctx.fillStyle = '#C084FC';
    ctx.fillRect(x + 305, y + 135, 25, 16);
    ctx.fillRect(x + 340, y + 135, 25, 16);
    ctx.fillRect(x + 375, y + 135, 25, 16);
    ctx.fillStyle = '#E9D5FF';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('HIBERNATION ZONE', x + 305, y + 175);
  }

  // ==========================================================
  // RUANGAN 4: ENHANCED KANTIN & COFFEE BAR
  // ==========================================================
  drawKantinPantry(ctx, x, y, w, h, isDark) {
    // 1. Dinding Atas & Plin Lantai Kafe (Warm Espresso Accent Wall)
    const wallH = 68;
    ctx.fillStyle = isDark ? '#1F110B' : '#331B10';
    ctx.fillRect(x, y, w, wallH);
    ctx.fillStyle = isDark ? '#442817' : '#5D331B';
    ctx.fillRect(x, y + wallH - 4, w, 4);

    // 2. Lantai Parket Kayu Kafe Checkered
    const tileSize = 25;
    for (let py = y + wallH; py < y + h; py += tileSize) {
      for (let px = x; px < x + w; px += tileSize) {
        const isEven = (Math.floor((px - x) / tileSize) + Math.floor((py - y) / tileSize)) % 2 === 0;
        ctx.fillStyle = isEven 
          ? (isDark ? '#2A1810' : '#4A2E1B') 
          : (isDark ? '#22130C' : '#3D2415');
        ctx.fillRect(px, py, tileSize, tileSize);
      }
    }

    // 3. Border Ruangan
    ctx.strokeStyle = isDark ? '#442817' : '#6A3C23';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // 4. Papan Label Ruangan (Zero Emoji)
    const cafeLabel = (window.I18n && window.I18n.t) ? window.I18n.t('canvas.room_cafeteria') : 'CAFETERIA & COFFEE BAR';
    this.drawRoomLabel(ctx, x + 12, y + 18, cafeLabel, '#FCD34D', isDark);

    // 5. Dinding Belakang: Chalkboard Menu, Jam Dinding, Dispenser, Kulkas, Vending Machine
    // Chalkboard Menu Kafe
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(x + 14, y + 24, 135, 24);
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 14, y + 24, 135, 24);
    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 7.5px monospace';
    ctx.fillText('MENU: ESPRESSO • LATTE • TUBRUK • MATCHA', x + 18, y + 39);

    // Jam Dinding Kafe Minimalis
    if (this.images.wallClock && this.images.wallClock.complete) {
      ctx.drawImage(this.images.wallClock, x + 155, y + 22, 28, 28);
    }

    // Dispenser Air Galon Biru
    if (this.images.waterCooler && this.images.waterCooler.complete) {
      ctx.drawImage(this.images.waterCooler, x + 190, y + 20, 24, 48);
    }

    // Kulkas Showcase Minuman Dingin (Aset SVG)
    if (this.images.coolerFridge && this.images.coolerFridge.complete) {
      ctx.drawImage(this.images.coolerFridge, x + 222, y + 14, 48, 62);
    }

    // Mesin Penjual Snack Otomatis (Snack Vending Machine SVG)
    if (this.images.vendingMachine && this.images.vendingMachine.complete) {
      ctx.drawImage(this.images.vendingMachine, x + 276, y + 14, 46, 62);
    }

    // Tempat Sampah Pilah Daur Ulang Modern (Biru, Kuning, Merah)
    const binColors = ['#0284C7', '#F59E0B', '#DC2626'];
    binColors.forEach((bc, bi) => {
      ctx.fillStyle = bc;
      ctx.fillRect(x + 332 + (bi * 12), y + 42, 10, 18);
      ctx.strokeStyle = '#1E293B';
      ctx.strokeRect(x + 332 + (bi * 12), y + 42, 10, 18);
    });

    // 6. Bar Counter Espresso & Pastry
    ctx.fillStyle = '#78350F';
    ctx.fillRect(x + 15, y + 54, 165, 48);
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 15, y + 54, 165, 48);

    // 7. Mesin Kopi Espresso Komersial Mewah (Double-Group SVG)
    if (this.images.coffeeMachine && this.images.coffeeMachine.complete) {
      ctx.drawImage(this.images.coffeeMachine, x + 18, y + 20, 52, 42);
    } else {
      this.drawCoffeeMachineFallback(ctx, x + 20, y + 28);
    }

    // Animasi Uap Kopi Mengepul Halus
    for (let s = 0; s < 3; s++) {
      const sOffset = (this.animationFrame * 0.8 + s * 14) % 35;
      const sOpacity = Math.max(0, 1 - (sOffset / 35));
      ctx.fillStyle = `rgba(255, 255, 255, ${sOpacity * 0.6})`;
      ctx.beginPath();
      ctx.arc(x + 35 + (s * 8), y + 23 - sOffset, 2.5 + (sOffset * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. Etalase Kaca Pastry & Kue (Croissant, Donut)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x + 85, y + 30, 56, 26);
    ctx.strokeStyle = '#94A3B8';
    ctx.strokeRect(x + 85, y + 30, 56, 26);
    ctx.strokeStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(x + 85, y + 43);
    ctx.lineTo(x + 141, y + 43);
    ctx.stroke();
    // Donat Cokelat & Stroberi
    ctx.fillStyle = '#78350F';
    ctx.beginPath();
    ctx.arc(x + 96, y + 37, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#EC4899';
    ctx.beginPath();
    ctx.arc(x + 110, y + 37, 4, 0, Math.PI * 2);
    ctx.fill();
    // Croissant
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.ellipse(x + 126, y + 38, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 9. Meja Bar Kayu Panjang Komunal (Dining Long Table SVG)
    if (this.images.diningLongTable && this.images.diningLongTable.complete) {
      ctx.drawImage(this.images.diningLongTable, x + 16, y + 140, 145, 54);
    }

    // 10. Dua Meja Kafe Bundar & Kursi Bistro Realistis (Aset SVG)
    // Meja Kafe 1 (Tengah)
    if (this.images.cafeTable && this.images.cafeTable.complete) {
      ctx.drawImage(this.images.cafeTable, x + 175, y + 105, 95, 95);
    } else {
      this.drawCafeTableFallback(ctx, x - 110, y);
    }

    // Meja Kafe 2 (Kanan)
    if (this.images.cafeTable && this.images.cafeTable.complete) {
      ctx.drawImage(this.images.cafeTable, x + 295, y + 105, 95, 95);
    } else {
      this.drawCafeTableFallback(ctx, x + 10, y);
    }

    // 11. Area Wastafel Cuci Tangan & Hand Dryer di Dinding Kanan
    ctx.fillStyle = isDark ? '#1E293B' : '#E2E8F0';
    ctx.fillRect(x + 415, y + 85, 30, 36);
    ctx.strokeStyle = '#94A3B8';
    ctx.strokeRect(x + 415, y + 85, 30, 36);
    // Cermin
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(x + 418, y + 88, 24, 18);
    // Sink Basin
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 418, y + 108, 24, 10);
    // Faucet
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 430, y + 107);
    ctx.lineTo(x + 430, y + 103);
    ctx.stroke();

    // 12. Tanaman Hias Sudut Kantin (Monstera & Snake Plant)
    if (this.images.monsteraPlant && this.images.monsteraPlant.complete) {
      ctx.drawImage(this.images.monsteraPlant, x + 440, y + 20, 42, 50);
    }
    if (this.images.plantSnake && this.images.plantSnake.complete) {
      ctx.drawImage(this.images.plantSnake, x + 455, y + 155, 24, 48);
    }
  }

  // ==========================================================
  // RENDER AGENTS DENGAN AVATAR & SPEECH BUBBLE
  // ==========================================================
  renderAgents(ctx, isDark) {
    const agentList = ['LUHUT', 'HABIBIE', 'JOKOWI', 'PRABOWO', 'GIBRAN'];

    agentList.forEach(name => {
      const ag = this.agents[name];
      if (!ag) return;

      // Animasi langkah jalan (gentle bobbing) jika sedang bergerak
      const isMoving = Math.abs(ag.targetX - ag.x) > 1 || Math.abs(ag.targetY - ag.y) > 1;
      const walkBob = isMoving ? Math.sin(this.animationFrame * 0.35) * 3 : 0;
      const drawX = ag.x;
      const drawY = ag.y + walkBob;

      // Shadow di bawah agen
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(drawX, drawY + 22, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Avatar Foto Profil Melingkar
      const avatarImg = this.images[`avatar_${name}`];
      const radius = 22;

      ctx.save();
      ctx.beginPath();
      ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
      ctx.clip();

      if (avatarImg && avatarImg.complete) {
        try {
          ctx.drawImage(avatarImg, drawX - radius, drawY - radius, radius * 2, radius * 2);
        } catch (e) {
          ctx.fillStyle = ag.color;
          ctx.fill();
        }
      } else {
        ctx.fillStyle = ag.color;
        ctx.fill();
      }
      ctx.restore();

      // Border Status Cincin Avatar (Zero Emoji)
      let statusBorder = '#F59E0B'; // Standby = Amber
      let statusBadgeText = 'STANDBY';

      if (name === 'HABIBIE') {
        statusBorder = '#8B5CF6';
        statusBadgeText = (ag.state === 'working') ? 'WORKING' : 'ARCHITECT';
      } else if (ag.state === 'working') {
        statusBorder = '#22C55E';
        statusBadgeText = 'WORKING';
      } else if (ag.state === 'reviewing') {
        statusBorder = '#A855F7';
        statusBadgeText = 'QA AUDIT';
      } else if (ag.state === 'sleeping') {
        statusBorder = '#64748B';
        statusBadgeText = 'SLEEP';
      }

      ctx.beginPath();
      ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = statusBorder;
      ctx.stroke();

      // Visual Glow Ring saat Hover Kursor
      if (this.hoveredAgent === name) {
        ctx.beginPath();
        ctx.arc(drawX, drawY, radius + 5, 0, Math.PI * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#38BDF8';
        ctx.stroke();
      }

      // Label Nama Agen di bawah Avatar
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(drawX - 32, drawY + 25, 64, 16);
      ctx.strokeStyle = statusBorder;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(drawX - 32, drawY + 25, 64, 16);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(name, drawX, drawY + 36);

      // Quote Ikonik Spesial jika Agen berada di Game Room
      const gameRoomQuotes = {
        PRABOWO: 'Tanam Sawitt!',
        JOKOWI: 'YO NDAK TAU KOK TANYA SAYA',
        GIBRAN: '19jt LAPANGAN PEKERJAAN !',
        LUHUT: 'KAMU YANG GELAP !'
      };

      const inGameRoom = (drawX >= 10 && drawX <= 440 && drawY >= 240 && drawY <= 470);
      let activeBubble = ag.bubble;
      let badgeLabel = statusBadgeText;

      // Khusus HABIBIE: Saat tidak ada kegiatan (idle / sleeping) selalu tampilkan "Cinta Sejati"
      if (name === 'HABIBIE') {
        if (!ag.state || ag.state === 'idle' || ag.state === 'sleeping') {
          activeBubble = 'Cinta Sejati';
        }
      } else if (inGameRoom && gameRoomQuotes[name]) {
        activeBubble = gameRoomQuotes[name];
        badgeLabel = 'GAME ROOM';
      }

      // Solusi Anti-Overlap Tabrakan Bubble di Game Room:
      // Di Game Room, agen berbicara bergantian (Dialogue Turn-Taking) setiap 180 frame (~3 detik)
      // Siklus percakapan: PRABOWO -> JOKOWI -> GIBRAN -> LUHUT
      const speakerCycle = ['PRABOWO', 'JOKOWI', 'GIBRAN', 'LUHUT'];
      const activeSpeakerIndex = Math.floor(this.animationFrame / 180) % speakerCycle.length;
      const isCurrentSpeaker = (speakerCycle[activeSpeakerIndex] === name);

      // Jika di Game Room: Hanya tampilkan agen yang sedang gilirannya berbicara sehingga 0% overlap
      // Jika di ruangan lain (Executive, Workstation, Kantin, Architect Studio): selalu tampilkan normal
      // Khusus HABIBIE: Selalu tampilkan bubble "Cinta Sejati"
      const shouldShowBubble = (name === 'HABIBIE') ? true : (inGameRoom ? isCurrentSpeaker : (ag.state !== 'sleeping'));

      if (activeBubble && shouldShowBubble) {
        this.drawSpeechBubble(ctx, drawX, drawY - 30, activeBubble, badgeLabel, isDark);
      }
    });
  }

  drawSpeechBubble(ctx, x, y, text, badgeText, isDark) {
    let cleanText = text;
    if (cleanText.length > 36) {
      cleanText = cleanText.substring(0, 34) + '...';
    }

    ctx.font = 'bold 9.5px sans-serif';
    const textWidth = ctx.measureText(cleanText).width;
    const bubbleWidth = Math.max(textWidth + 24, 110);
    const bubbleHeight = 32;
    const bx = Math.max(10, Math.min(x - (bubbleWidth / 2), this.canvas.width - bubbleWidth - 10));
    const by = y - bubbleHeight;

    // Background Bubble
    ctx.fillStyle = isDark ? '#1E2633' : '#FFFFFF';
    ctx.strokeStyle = isDark ? '#4B5563' : '#1A1A1A';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(bx, by, bubbleWidth, bubbleHeight, 6);
    ctx.fill();
    ctx.stroke();

    // Segitiga Pointer Bubble
    ctx.fillStyle = isDark ? '#1E2633' : '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(x - 5, by + bubbleHeight);
    ctx.lineTo(x, by + bubbleHeight + 6);
    ctx.lineTo(x + 5, by + bubbleHeight);
    ctx.fill();

    // Teks di dalam Bubble (Clean Typography)
    ctx.fillStyle = isDark ? '#E5E7EB' : '#111827';
    ctx.textAlign = 'center';
    ctx.font = '10px sans-serif';
    ctx.fillText(cleanText, bx + (bubbleWidth / 2), by + 18);
  }

  // ==========================================================
  // HELPER GRAPHICS & DECORATIONS
  // ==========================================================
  drawRoomLabel(ctx, x, y, title, tagColor, isDark) {
    ctx.font = 'bold 9.5px monospace';
    const textWidth = ctx.measureText(title).width;
    ctx.fillStyle = isDark ? '#111827' : '#0F172A';
    ctx.fillRect(x, y - 14, textWidth + 16, 20);
    ctx.strokeStyle = tagColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y - 14, textWidth + 16, 20);

    ctx.fillStyle = tagColor;
    ctx.textAlign = 'left';
    ctx.fillText(title, x + 8, y);
  }

  drawWhiteboard(ctx, x, y, w, h) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    // Diagram arsitektur coret-coretan
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 12, y + 10, 24, 16);
    ctx.strokeStyle = '#10B981';
    ctx.strokeRect(x + 60, y + 10, 24, 16);
    ctx.strokeStyle = '#EF4444';
    ctx.strokeRect(x + 108, y + 10, 24, 16);
    // Garis koneksi
    ctx.beginPath();
    ctx.moveTo(x + 36, y + 18);
    ctx.lineTo(x + 60, y + 18);
    ctx.moveTo(x + 84, y + 18);
    ctx.lineTo(x + 108, y + 18);
    ctx.stroke();
  }

  drawServerFallback(ctx, x, y) {
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(x, y, 40, 70);
    ctx.strokeStyle = '#0EA5E9';
    ctx.strokeRect(x, y, 40, 70);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = (this.animationFrame + i * 10) % 20 < 10 ? '#22C55E' : '#EF4444';
      ctx.fillRect(x + 6, y + 12 + (i * 14), 6, 6);
    }
  }

  drawArcadeFallback(ctx, x, y) {
    ctx.fillStyle = '#7C3AED';
    ctx.fillRect(x, y, 48, 80);
    ctx.strokeStyle = '#F43F5E';
    ctx.strokeRect(x, y, 48, 80);
    ctx.fillStyle = '#06B6D4';
    ctx.fillRect(x + 8, y + 12, 32, 24);
  }

  drawPlant(ctx, x, y) {
    ctx.fillStyle = '#B45309';
    ctx.fillRect(x - 8, y + 10, 16, 16);
    ctx.fillStyle = '#15803D';
    ctx.beginPath();
    ctx.arc(x, y + 6, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.arc(x - 4, y + 4, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCafeChair(ctx, x, y) {
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.stroke();
  }

  drawFridgeFallback(ctx, x, y) {
    ctx.fillStyle = '#475569';
    ctx.fillRect(x, y, 45, 45);
    ctx.strokeStyle = '#94A3B8';
    ctx.strokeRect(x, y, 45, 45);
  }

  drawCoffeeMachineFallback(ctx, x, y) {
    ctx.fillStyle = '#E2E8F0'; // Bodi Stainless Steel
    ctx.fillRect(x, y, 46, 30);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, 46, 30);
    // Pressure gauge & panel
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(x + 5, y + 4, 10, 6);
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(x + 19, y + 4, 4, 4);
    // Dual Portafilter chrome
    ctx.fillStyle = '#334155';
    ctx.fillRect(x + 7, y + 18, 6, 12);
    ctx.fillRect(x + 25, y + 18, 6, 12);
  }

  drawCafeTableFallback(ctx, x, y) {
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(x + 340, y + 145, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

window.OfficeCanvas = OfficeCanvas;
