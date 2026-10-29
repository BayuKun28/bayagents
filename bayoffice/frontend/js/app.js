/**
 * BayOffice - Main Application Controller
 * Design Standards: Zero Emoji, Anti AI Slop, Lucide SVG Icons, Full i18n
 */

document.addEventListener('DOMContentLoaded', () => {
  // 0. Inisialisasi I18n
  if (window.I18n) {
    window.I18n.init();
  }

  // 1. Inisialisasi Canvas & Kanban
  const canvas = new OfficeCanvas('officeCanvas');
  const kanban = new KanbanBoard('kanbanContainer');

  // Cache data terakhir untuk re-render saat bahasa berubah
  window.latestAgentsData = null;
  window.latestSystemData = null;

  // 2. DOM Elements
  const tmuxBadge = document.getElementById('tmuxBadge');
  const ramMetric = document.getElementById('ramMetric');
  const cpuMetric = document.getElementById('cpuMetric');
  const agentsGrid = document.getElementById('agentsGrid');
  const taskModal = document.getElementById('taskModal');
  const openTaskBtn = document.getElementById('openTaskBtn');
  const closeTaskBtn = document.getElementById('closeTaskBtn');
  const taskForm = document.getElementById('taskForm');
  const submitTaskBtn = document.getElementById('submitTaskBtn');
  const taskAlert = document.getElementById('taskAlert');
  const searchInput = document.getElementById('searchInput');
  const logoutBtn = document.getElementById('logoutBtn');
  const langToggle = document.getElementById('langToggle');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectFilterSelect = document.getElementById('projectFilterSelect');
  const taskProjectSelect = document.getElementById('taskProject');
  const customProjectContainer = document.getElementById('customProjectContainer');
  const customProjectInput = document.getElementById('customProjectInput');

  // Detail Modal DOM
  const taskDetailModal = document.getElementById('taskDetailModal');
  const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
  const detailTaskId = document.getElementById('detailTaskId');
  const detailTaskProject = document.getElementById('detailTaskProject');
  const detailTaskStatus = document.getElementById('detailTaskStatus');
  const detailTaskTitle = document.getElementById('detailTaskTitle');
  const detailTaskAssignee = document.getElementById('detailTaskAssignee');
  const detailTaskDir = document.getElementById('detailTaskDir');
  const detailTaskDesc = document.getElementById('detailTaskDesc');
  const detailTaskSkills = document.getElementById('detailTaskSkills');
  const detailSkillsContainer = document.getElementById('detailSkillsContainer');
  const detailTaskNotes = document.getElementById('detailTaskNotes');
  const detailNotesContainer = document.getElementById('detailNotesContainer');
  const detailTaskQA = document.getElementById('detailTaskQA');
  const detailQAContainer = document.getElementById('detailQAContainer');
  const detailCreatedAt = document.getElementById('detailCreatedAt');
  const detailCompletedAt = document.getElementById('detailCompletedAt');

  // Render icons initially
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // 3. Setup Server-Sent Events (SSE)
  let evtSource = null;

  function connectSSE() {
    evtSource = new EventSource('/api/stream');

    evtSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'sync') {
          window.latestAgentsData = payload.agents;
          window.latestSystemData = payload.system;

          // Update Canvas
          canvas.updateAgents(payload.agents);

          // Update Kanban
          kanban.setTasks(payload.kanban.tasks);

          // Update Header Metrics
          updateMetrics(payload.system);

          // Update Agent Cards
          updateAgentCards(payload.agents);
        }
      } catch (err) {
        console.error('Error parsing SSE payload:', err);
      }
    };

    evtSource.onerror = (err) => {
      console.warn('SSE stream disconnected, reconnecting in 3s...');
      evtSource.close();
      setTimeout(connectSSE, 3000);
    };
  }

  function updateMetrics(sys) {
    if (!sys) return;
    
    // Tmux Status (Zero Emoji) with Desktop & Mobile Dual Text
    if (sys.tmux_active) {
      tmuxBadge.className = 'neo-badge badge-done telemetry-badge';
      const activeDesk = window.I18n ? window.I18n.t('telemetry.active') : 'AGENTS ACTIVE';
      const activeMob = window.I18n ? window.I18n.t('telemetry.active_short') : 'ACTIVE';
      tmuxBadge.innerHTML = `<span class="status-dot dot-active"></span><span class="desk-txt">${activeDesk}</span><span class="mob-txt">${activeMob}</span>`;
    } else {
      tmuxBadge.className = 'neo-badge badge-todo telemetry-badge';
      const sleepDesk = window.I18n ? window.I18n.t('telemetry.sleep') : 'AUTO-SLEEP (RAM SAVER)';
      const sleepMob = window.I18n ? window.I18n.t('telemetry.sleep_short') : 'SLEEP';
      tmuxBadge.innerHTML = `<span class="status-dot dot-sleep"></span><span class="desk-txt">${sleepDesk}</span><span class="mob-txt">${sleepMob}</span>`;
    }

    // RAM Dual Text (Desktop: 1.1 GiB / 3.2 GiB (35%) | Mobile: 1.1 GiB (35%))
    ramMetric.innerHTML = `<span class="desk-txt">${sys.ram_used} / ${sys.ram_total} (${sys.ram_percent}%)</span><span class="mob-txt">${sys.ram_used} (${sys.ram_percent}%)</span>`;

    // CPU Dual Text (Desktop: 0.22, 0.31, 0.24 | Mobile: 0.22)
    if (sys.load_avg) {
      cpuMetric.innerHTML = `<span class="desk-txt">${sys.load_avg.join(', ')}</span><span class="mob-txt">${sys.load_avg[0]}</span>`;
    }
  }

  function updateAgentCards(agents) {
    if (!agents || !agentsGrid) return;

    let html = '';
    const agentList = ['LUHUT', 'JOKOWI', 'PRABOWO', 'GIBRAN'];

    const txtStandby = window.I18n ? window.I18n.t('agents.state_standby') : 'STANDBY';
    const txtSleep = window.I18n ? window.I18n.t('agents.state_sleep') : 'SLEEP';
    const txtWorking = window.I18n ? window.I18n.t('agents.state_working') : 'WORKING';
    const txtReviewing = window.I18n ? window.I18n.t('agents.state_reviewing') : 'REVIEWING';
    const defaultBubble = window.I18n ? window.I18n.t('agents.default_bubble') : 'Ready for duty.';

    agentList.forEach(name => {
      const a = agents[name] || {};
      const state = a.state || 'idle';
      
      let stateBadge = `<span class="neo-badge badge-todo" style="font-size:0.68rem;">${txtStandby}</span>`;
      if (state === 'sleeping') {
        stateBadge = `<span class="neo-badge" style="background:#E2E8F0; color:#64748B; font-size:0.68rem;">${txtSleep}</span>`;
      } else if (state === 'working') {
        stateBadge = `<span class="neo-badge badge-progress" style="font-size:0.68rem;">${txtWorking}</span>`;
      } else if (state === 'reviewing') {
        stateBadge = `<span class="neo-badge badge-qa" style="font-size:0.68rem;">${txtReviewing}</span>`;
      }

      html += `
        <div class="neo-box-sm" style="padding: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="/static/assets/avatars/${name.toLowerCase()}.jpg" alt="${name}" 
                   style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--border-color); object-fit: cover; box-shadow: 2px 2px 0px var(--shadow-color);" 
                   onerror="this.style.display='none'">
              <div>
                <div style="font-weight: 800; font-size: 0.95rem;">${name}</div>
                <div style="font-size: 0.72rem; color: #64748B; font-weight: 600;">${a.role || 'AI Agent'}</div>
              </div>
            </div>
            ${stateBadge}
          </div>
          <div class="agent-bubble-box" style="font-size: 0.78rem; padding: 6px 10px; border-radius: 6px; min-height: 40px; display: flex; align-items: center; line-height: 1.35; border: 1px solid var(--border-color);">
            <i>${a.bubble_text || defaultBubble}</i>
          </div>
        </div>
      `;
    });

    agentsGrid.innerHTML = html;
  }

  // 4. Dynamic Project Registry Loader & Filters
  if (taskProjectSelect) {
    taskProjectSelect.addEventListener('change', () => {
      if (customProjectContainer) {
        customProjectContainer.style.display = (taskProjectSelect.value === '__custom__') ? 'block' : 'none';
        if (taskProjectSelect.value === '__custom__' && customProjectInput) {
          customProjectInput.focus();
        }
      }
    });
  }

  async function loadProjects() {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) return;
      const data = await res.json();
      const projects = data.projects || {};

      const allProjectsText = window.I18n ? window.I18n.t('kanban.all_projects') : 'All Projects';
      const autoDetectText = window.I18n ? window.I18n.t('modal_task.project_auto') : 'Auto Detect Project';
      const customProjectText = window.I18n ? window.I18n.t('modal_task.project_custom') : 'New Project / Custom Folder...';

      // 1. Update Kanban Filter Select
      if (projectFilterSelect) {
        const cur = projectFilterSelect.value;
        let optHtml = `<option value="ALL">${allProjectsText}</option>`;
        for (const [pId, pData] of Object.entries(projects)) {
          optHtml += `<option value="${pId}">${pData.name || pId}</option>`;
        }
        projectFilterSelect.innerHTML = optHtml;
        projectFilterSelect.value = cur || 'ALL';
      }

      // 2. Update Modal Project Select
      if (taskProjectSelect) {
        let cur = taskProjectSelect.value;
        let modalHtml = `<option value="auto">${autoDetectText}</option>`;
        for (const [pId, pData] of Object.entries(projects)) {
          modalHtml += `<option value="${pId}">${pData.name || pId}</option>`;
        }
        modalHtml += `<option value="__custom__">${customProjectText}</option>`;
        taskProjectSelect.innerHTML = modalHtml;
        if (cur && cur !== '__custom__') taskProjectSelect.value = cur;
      }
    } catch (e) {
      console.warn('Gagal memuat registry proyek:', e);
    }
  }

  loadProjects();

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('neo-btn-primary'));
      btn.classList.add('neo-btn-primary');
      const assignee = btn.getAttribute('data-assignee');
      kanban.setFilter(assignee);
    });
  });

  if (projectFilterSelect) {
    projectFilterSelect.addEventListener('change', (e) => {
      kanban.setProjectFilter(e.target.value);
    });
  }

  // 5. Search Bar
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      kanban.setSearch(e.target.value);
    });
  }

  // 6. Task Dispatcher Modal
  if (openTaskBtn) {
    openTaskBtn.addEventListener('click', () => {
      taskAlert.style.display = 'none';
      taskModal.classList.add('active');
      document.getElementById('taskInstruction').focus();
      if (window.lucide) window.lucide.createIcons();
    });
  }

  if (closeTaskBtn) {
    closeTaskBtn.addEventListener('click', () => {
      taskModal.classList.remove('active');
    });
  }

  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) {
      taskModal.classList.remove('active');
    }
  });

  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      taskAlert.style.display = 'none';
      submitTaskBtn.disabled = true;

      const txtSubmitting = window.I18n ? window.I18n.t('modal_task.submitting') : 'Dispatching Task...';
      const txtSubmitBtn = window.I18n ? window.I18n.t('modal_task.submit_btn') : 'Send to Agent Team';
      submitTaskBtn.innerHTML = `<span>${txtSubmitting}</span>`;

      const instruction = document.getElementById('taskInstruction').value.trim();
      const category = document.getElementById('taskCategory').value;
      const engine = document.getElementById('taskEngine') ? document.getElementById('taskEngine').value : 'agy';
      let project = taskProjectSelect ? taskProjectSelect.value : 'auto';

      if (project === '__custom__') {
        const customVal = customProjectInput ? customProjectInput.value.trim() : '';
        if (!customVal) {
          taskAlert.className = 'neo-box-sm';
          taskAlert.style.background = '#FEE2E2';
          taskAlert.style.color = '#991B1B';
          taskAlert.style.padding = '10px 14px';
          taskAlert.style.display = 'block';
          taskAlert.textContent = window.I18n ? window.I18n.t('modal_task.custom_project_empty') : 'Please enter a new folder/project name.';
          submitTaskBtn.disabled = false;
          submitTaskBtn.innerHTML = `<span>${txtSubmitBtn}</span>`;
          return;
        }
        project = customVal;
      }

      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instruction, category, project, engine })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          taskAlert.className = 'neo-box-sm';
          taskAlert.style.background = '#DCFCE7';
          taskAlert.style.color = '#166534';
          taskAlert.style.padding = '10px 14px';
          taskAlert.style.display = 'block';

          if (window.I18n) {
            taskAlert.innerHTML = window.I18n.t('modal_task.success_msg', {
              task_id: data.task_id,
              project: data.project || 'Project',
              target_agent: data.target_agent
            });
          } else {
            taskAlert.innerHTML = `<b>${data.task_id}</b> [${data.project || 'Project'}] successfully dispatched to <b>${data.target_agent}</b>.`;
          }

          document.getElementById('taskInstruction').value = '';
          if (customProjectInput) customProjectInput.value = '';
          loadProjects();

          setTimeout(() => {
            taskModal.classList.remove('active');
            submitTaskBtn.disabled = false;
            submitTaskBtn.innerHTML = `<span>${txtSubmitBtn}</span>`;
          }, 1400);
        } else {
          taskAlert.className = 'neo-box-sm';
          taskAlert.style.background = '#FEE2E2';
          taskAlert.style.color = '#991B1B';
          taskAlert.style.padding = '10px 14px';
          taskAlert.style.display = 'block';
          taskAlert.textContent = data.detail || data.error || (window.I18n ? window.I18n.t('modal_task.failed_msg') : 'Failed to dispatch task.');
          submitTaskBtn.disabled = false;
          submitTaskBtn.innerHTML = `<span>${txtSubmitBtn}</span>`;
        }
      } catch (err) {
        taskAlert.style.display = 'block';
        taskAlert.textContent = window.I18n ? window.I18n.t('modal_task.failed_msg') : 'Failed to connect to server.';
        submitTaskBtn.disabled = false;
        submitTaskBtn.innerHTML = `<span>${txtSubmitBtn}</span>`;
      }
    });
  }

  // 7. Task Detail Modal Handler (Klik Kartu Kanban)
  window.openTaskDetail = function(task) {
    if (!task || !taskDetailModal) return;

    detailTaskId.textContent = task.id || 'TASK';
    detailTaskProject.textContent = (task.project || 'infobay').toUpperCase();
    
    // Status Badge
    const status = kanban.normalizeStatus(task.status);
    let statusClass = 'badge-todo';
    if (status === 'In-Progress') statusClass = 'badge-progress';
    else if (status === 'QA-Review') statusClass = 'badge-qa';
    else if (status === 'Done') statusClass = 'badge-done';

    detailTaskStatus.className = `neo-badge ${statusClass}`;
    detailTaskStatus.textContent = status.toUpperCase();

    // Sesuai aturan: user input & detail tugas TIDAK DIUBAH (tetap teks asli)
    detailTaskTitle.textContent = task.title || 'Untitled Task';
    detailTaskAssignee.textContent = (task.assignee || 'AGENT').toUpperCase();
    detailTaskDir.textContent = task.target_dir ? task.target_dir.replace('/home/bay', '~') : '~/infobay';
    detailTaskDesc.textContent = task.description || (window.I18n ? window.I18n.t('modal_detail.no_desc') : 'No description provided.');

    // Skills
    if (Array.isArray(task.skills_required) && task.skills_required.length > 0) {
      detailSkillsContainer.style.display = 'block';
      detailTaskSkills.innerHTML = task.skills_required.map(s => 
        `<span class="neo-badge" style="font-size:0.7rem; background: var(--bg-card); color: var(--border-color);">${s}</span>`
      ).join('');
    } else {
      detailSkillsContainer.style.display = 'none';
    }

    // Notes
    if (task.notes) {
      detailNotesContainer.style.display = 'block';
      detailTaskNotes.textContent = task.notes;
    } else {
      detailNotesContainer.style.display = 'none';
    }

    // QA Review
    const qa = task.qa_certification || task.qa_review;
    if (qa) {
      detailQAContainer.style.display = 'block';
      if (typeof qa === 'object') {
        let qaText = '';
        if (qa.status) qaText += `Status: ${qa.status}\n`;
        if (qa.auditor) qaText += `Auditor: ${qa.auditor}\n`;
        for (const [k, v] of Object.entries(qa)) {
          if (k !== 'status' && k !== 'auditor') {
            qaText += `• ${k}: ${v}\n`;
          }
        }
        detailTaskQA.textContent = qaText.trim();
      } else {
        detailTaskQA.textContent = String(qa);
      }
    } else {
      detailQAContainer.style.display = 'none';
    }

    // Timestamps
    const isId = (window.I18n && window.I18n.getLanguage() === 'id');
    const locale = isId ? 'id-ID' : 'en-US';
    const formatTime = (ts) => ts ? new Date(ts).toLocaleString(locale) : '-';

    if (window.I18n) {
      detailCreatedAt.textContent = window.I18n.t('modal_detail.created_at', { time: formatTime(task.created_at || task.started_at) });
      detailCompletedAt.textContent = window.I18n.t('modal_detail.completed_at', { time: formatTime(task.completed_at) });
    } else {
      detailCreatedAt.textContent = `Created: ${formatTime(task.created_at || task.started_at)}`;
      detailCompletedAt.textContent = `Completed: ${formatTime(task.completed_at)}`;
    }

    taskDetailModal.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
  };

  if (closeDetailModalBtn) {
    closeDetailModalBtn.addEventListener('click', () => {
      taskDetailModal.classList.remove('active');
    });
  }

  taskDetailModal.addEventListener('click', (e) => {
    if (e.target === taskDetailModal) {
      taskDetailModal.classList.remove('active');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (taskDetailModal.classList.contains('active')) taskDetailModal.classList.remove('active');
      if (taskModal.classList.contains('active')) taskModal.classList.remove('active');
    }
  });

  // 8. Logout Action
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const confirmMsg = window.I18n ? window.I18n.t('actions.logout_confirm') : 'Are you sure you want to log out from BayOffice?';
      if (confirm(confirmMsg)) {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      }
    });
  }

  // 9. Dark Mode Handler (Zero Emoji - Lucide SVG)
  const darkModeToggle = document.getElementById('darkModeToggle');
  const darkModeIcon = document.getElementById('darkModeIcon');

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      if (darkModeIcon) darkModeIcon.innerHTML = '<i data-lucide="sun"></i>';
      if (darkModeToggle) {
        darkModeToggle.title = window.I18n ? window.I18n.t('actions.theme_light') : 'Switch to Light Mode';
      }
    } else {
      document.body.classList.remove('dark-mode');
      if (darkModeIcon) darkModeIcon.innerHTML = '<i data-lucide="moon"></i>';
      if (darkModeToggle) {
        darkModeToggle.title = window.I18n ? window.I18n.t('actions.theme_dark') : 'Switch to Dark Mode';
      }
    }
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  const savedTheme = localStorage.getItem('bayoffice_theme') || 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.contains('dark-mode');
      const newTheme = isDark ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('bayoffice_theme', newTheme);
    });
  }

  // 10. Language Toggle Handler (EN / ID)
  if (langToggle && window.I18n) {
    langToggle.addEventListener('click', () => {
      window.I18n.toggleLanguage();
    });
  }

  window.addEventListener('bayoffice_language_changed', () => {
    // Re-render kanban
    kanban.render();
    // Re-load projects options in selects
    loadProjects();
    // Re-render agent cards
    if (window.latestAgentsData) {
      updateAgentCards(window.latestAgentsData);
    }
    // Update header metrics
    if (window.latestSystemData) {
      updateMetrics(window.latestSystemData);
    }
    // Update theme toggle tooltip
    const isDark = document.body.classList.contains('dark-mode');
    applyTheme(isDark ? 'dark' : 'light');
    // Update engine description
    if (taskEngineSelect && engineDesc) {
      engineDesc.innerHTML = taskEngineSelect.value === '9router'
        ? (window.I18n ? window.I18n.t('modal_task.engine_9router_desc') : '')
        : (window.I18n ? window.I18n.t('modal_task.engine_agy_desc') : '');
    }
    // Re-create icons
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  });

  // 11. Fullscreen Canvas Handler (Mobile Landscape Lock)
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const canvasContainer = document.getElementById('canvasContainer');
  const canvasOverlayControls = document.getElementById('canvasOverlayControls');
  const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (canvasContainer && canvasContainer.requestFullscreen) {
        try {
          await canvasContainer.requestFullscreen();
          if (screen.orientation && typeof screen.orientation.lock === 'function') {
            try {
              await screen.orientation.lock('landscape');
            } catch (err) {
              console.log('Screen orientation lock notice:', err);
            }
          }
        } catch (err) {
          console.error('Error attempting to enable fullscreen:', err);
        }
      }
    } else {
      if (document.exitFullscreen) {
        try {
          if (screen.orientation && typeof screen.orientation.unlock === 'function') {
            try { screen.orientation.unlock(); } catch (e) {}
          }
          await document.exitFullscreen();
        } catch (err) {
          console.error('Error attempting to exit fullscreen:', err);
        }
      }
    }
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
  }

  if (exitFullscreenBtn) {
    exitFullscreenBtn.addEventListener('click', toggleFullscreen);
  }

  document.addEventListener('fullscreenchange', () => {
    const isFs = !!document.fullscreenElement;
    if (!isFs && screen.orientation && typeof screen.orientation.unlock === 'function') {
      try { screen.orientation.unlock(); } catch (e) {}
    }
    if (fullscreenBtn) {
      const exitTxt = window.I18n ? window.I18n.t('canvas.exit_fullscreen') : 'Exit Fullscreen';
      const fsTxt = window.I18n ? window.I18n.t('canvas.fullscreen') : 'Fullscreen';
      fullscreenBtn.innerHTML = isFs 
        ? `<i data-lucide="minimize-2" class="lucide-sm"></i> <span>${exitTxt}</span>` 
        : `<i data-lucide="maximize-2" class="lucide-sm"></i> <span>${fsTxt}</span>`;
    }
    if (canvasOverlayControls) {
      canvasOverlayControls.style.display = isFs ? 'flex' : 'none';
    }
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  });

  // 12. Task Engine Selector Listener
  const taskEngineSelect = document.getElementById('taskEngine');
  const engineDesc = document.getElementById('engineDesc');
  if (taskEngineSelect && engineDesc) {
    taskEngineSelect.addEventListener('change', () => {
      if (taskEngineSelect.value === '9router') {
        engineDesc.innerHTML = window.I18n ? window.I18n.t('modal_task.engine_9router_desc') : '<b>9Router:</b> Virtual Squad...';
      } else {
        engineDesc.innerHTML = window.I18n ? window.I18n.t('modal_task.engine_agy_desc') : '<b>Antigravity:</b> Sesi Tmux...';
      }
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    });
  }

  // Mulai koneksi real-time
  connectSSE();
});
