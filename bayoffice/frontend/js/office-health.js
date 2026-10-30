/**
 * BayOffice - Server Health Guardian Module
 * Menangani diagnostik mendalam homelab: RAM, Swap, Suhu APU, Load, Root Disk, dan Vital Services.
 */

window.OfficeHealth = (function () {
  let serverHealthModal;
  let closeHealthModalBtn;
  let refreshHealthBtn;
  let telemetryDeck;
  let healthRamText;
  let healthRamBar;
  let healthSwapText;
  let healthSwapBar;
  let healthCpuTemp;
  let healthCpuLoad;
  let healthDiskText;
  let healthDiskBar;
  let healthServicesContainer;
  let healthLastChecked;

  async function fetchMetrics() {
    if (!serverHealthModal) return;
    try {
      const res = await fetch('/api/system/health');
      if (!res.ok) return;
      const data = await res.json();

      // RAM
      if (healthRamText) healthRamText.textContent = `${data.ram_used} / ${data.ram_total} (${data.ram_percent}%)`;
      if (healthRamBar) {
        healthRamBar.style.width = `${data.ram_percent}%`;
        healthRamBar.style.backgroundColor = (data.ram_percent > 85) ? '#EF4444' : (data.ram_percent > 70) ? '#F59E0B' : '#2563EB';
      }

      // Swap
      if (healthSwapText) healthSwapText.textContent = `${data.swap_used} / ${data.swap_total} (${data.swap_percent}%)`;
      if (healthSwapBar) {
        healthSwapBar.style.width = `${data.swap_percent}%`;
        healthSwapBar.style.backgroundColor = (data.swap_percent > 80) ? '#EF4444' : (data.swap_percent > 50) ? '#F59E0B' : '#10B981';
      }

      // CPU Temp
      if (healthCpuTemp) {
        healthCpuTemp.textContent = data.cpu_temp || '-';
        const cVal = data.cpu_temp_val || 0;
        healthCpuTemp.style.color = (cVal > 75) ? '#EF4444' : (cVal > 60) ? '#F59E0B' : '#16A34A';
      }

      // CPU Load Avg
      if (healthCpuLoad) {
        healthCpuLoad.textContent = (data.load_avg || []).join(', ') || '-';
      }

      // Disk Root
      if (healthDiskText) healthDiskText.textContent = `${data.disk_used} / ${data.disk_total} (${data.disk_percent}%)`;
      if (healthDiskBar) {
        healthDiskBar.style.width = `${data.disk_percent}%`;
        healthDiskBar.style.backgroundColor = (data.disk_percent > 85) ? '#EF4444' : '#8B5CF6';
      }

      // Vital Services
      if (healthServicesContainer && data.services) {
        let svcsHtml = '';
        const isId = (window.I18n && window.I18n.currentLocale === 'id');
        for (const [sName, sStatus] of Object.entries(data.services)) {
          const isActive = (sStatus === 'active');
          const badgeClass = isActive ? 'badge-done' : 'badge-todo';
          const label = isActive ? (isId ? 'AKTIF' : 'ACTIVE') : (isId ? 'MATI' : 'INACTIVE');
          svcsHtml += `
            <div class="service-pill">
              <span>${sName}</span>
              <span class="neo-badge ${badgeClass}" style="font-size:0.68rem;">${label}</span>
            </div>
          `;
        }
        healthServicesContainer.innerHTML = svcsHtml;
      }

      if (healthLastChecked) {
        healthLastChecked.textContent = `Last checked: ${new Date().toLocaleTimeString()}`;
      }
    } catch (e) {
      console.warn('Gagal memuat telemetri kesehatan server:', e);
    }
  }

  function openModal() {
    if (!serverHealthModal) return;
    if (window.soundFx) window.soundFx.playClick();
    serverHealthModal.classList.add('active');
    fetchMetrics();
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function closeModal() {
    if (serverHealthModal) {
      serverHealthModal.classList.remove('active');
    }
  }

  function init() {
    serverHealthModal = document.getElementById('serverHealthModal');
    closeHealthModalBtn = document.getElementById('closeHealthModalBtn');
    refreshHealthBtn = document.getElementById('refreshHealthBtn');
    telemetryDeck = document.getElementById('telemetryDeck');
    healthRamText = document.getElementById('healthRamText');
    healthRamBar = document.getElementById('healthRamBar');
    healthSwapText = document.getElementById('healthSwapText');
    healthSwapBar = document.getElementById('healthSwapBar');
    healthCpuTemp = document.getElementById('healthCpuTemp');
    healthCpuLoad = document.getElementById('healthCpuLoad');
    healthDiskText = document.getElementById('healthDiskText');
    healthDiskBar = document.getElementById('healthDiskBar');
    healthServicesContainer = document.getElementById('healthServicesContainer');
    healthLastChecked = document.getElementById('healthLastChecked');

    if (telemetryDeck) {
      telemetryDeck.addEventListener('click', openModal);
    }

    if (closeHealthModalBtn) {
      closeHealthModalBtn.addEventListener('click', closeModal);
    }

    if (serverHealthModal) {
      serverHealthModal.addEventListener('click', (e) => {
        if (e.target === serverHealthModal) closeModal();
      });
    }

    if (refreshHealthBtn) {
      refreshHealthBtn.addEventListener('click', () => {
        if (window.soundFx) window.soundFx.playClick();
        fetchMetrics();
      });
    }
  }

  return {
    init,
    openModal,
    closeModal,
    fetchMetrics
  };
})();
