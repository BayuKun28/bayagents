/**
 * BayOffice - Main Application Controller
 * Design Standards: Zero Emoji, Anti AI Slop, Lucide SVG Icons, Full i18n
 */

document.addEventListener('DOMContentLoaded', () => {
  // 0. Inisialisasi I18n
  if (window.I18n) {
    window.I18n.init();
  }

  // 1. Inisialisasi Canvas, Kanban & Audio Synth
  const soundFx = (typeof SoundFX === 'function') ? new SoundFX() : null;
  const canvas = new OfficeCanvas('officeCanvas');
  const kanban = new KanbanBoard('kanbanContainer');

  // 1b. Canvas 2D Hit Detection Callback
  if (canvas) {
    canvas.onAgentClick = (agentName) => {
      if (soundFx) soundFx.playClick();

      // Khusus klik Agen HABIBIE: Langsung alihkan ke Plans Studio
      if (agentName === 'HABIBIE') {
        switchWorkspaceView('plans');
        return;
      }

      // Filter kanban to agent
      const fBtns = document.querySelectorAll('.filter-btn');
      fBtns.forEach(b => {
        if (b.getAttribute('data-assignee') === agentName) {
          b.classList.add('neo-btn-primary');
          b.classList.remove('neo-btn-secondary');
        } else {
          b.classList.remove('neo-btn-primary');
          b.classList.add('neo-btn-secondary');
        }
      });
      kanban.setFilter(agentName);

      // Smooth scroll to Kanban board
      const kanbanSection = document.getElementById('kanbanContainer');
      if (kanbanSection) {
        kanbanSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Visual pulse pada kartu agen di bawah canvas
      const cards = document.querySelectorAll('#agentsGrid .neo-box-sm');
      cards.forEach(card => {
        if (card.textContent.includes(agentName)) {
          card.style.outline = '3px solid var(--border-color)';
          setTimeout(() => { card.style.outline = 'none'; }, 1500);
        }
      });
    };
  }

  // Cache data terakhir untuk re-render saat bahasa berubah
  window.latestAgentsData = null;
  window.latestSystemData = null;
  let prevDoneTaskIds = null;
  let currentDetailTaskId = null;
  let currentDetailTask = null;

  // 2. DOM Elements
  const tmuxBadge = document.getElementById('tmuxBadge');
  const telemetryDeck = document.getElementById('telemetryDeck');
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
  const audioToggleBtn = document.getElementById('audioToggleBtn');
  const audioIcon = document.getElementById('audioIcon');
  const openLogsBtn = document.getElementById('openLogsBtn');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectFilterSelect = document.getElementById('projectFilterSelect');
  const periodFilterSelect = document.getElementById('periodFilterSelect');
  const customDateContainer = document.getElementById('customDateContainer');
  const customStartDate = document.getElementById('customStartDate');
  const customEndDate = document.getElementById('customEndDate');
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

  // Detail Action Controls
  const detailStatusSelect = document.getElementById('detailStatusSelect');
  const detailUpdateStatusBtn = document.getElementById('detailUpdateStatusBtn');
  const detailRetryBtn = document.getElementById('detailRetryBtn');
  const detailDeleteBtn = document.getElementById('detailDeleteBtn');
  const taskActionFeedback = document.getElementById('taskActionFeedback');

  // Live Logs Modal DOM
  const logsModal = document.getElementById('logsModal');
  const closeLogsBtn = document.getElementById('closeLogsBtn');
  const logActiveBadge = document.getElementById('logActiveBadge');
  const logAgentTabs = document.querySelectorAll('.log-tab-btn');
  const autoRefreshLogsCheckbox = document.getElementById('autoRefreshLogsCheckbox');
  const refreshLogsBtn = document.getElementById('refreshLogsBtn');
  const copyLogsBtn = document.getElementById('copyLogsBtn');
  const terminalLogContent = document.getElementById('terminalLogContent');
  const logTimestamp = document.getElementById('logTimestamp');

  // Analytics & Export DOM
  const openAnalyticsBtn = document.getElementById('openAnalyticsBtn');
  const analyticsModal = document.getElementById('analyticsModal');
  const closeAnalyticsModalBtn = document.getElementById('closeAnalyticsModalBtn');
  const statTotalTasks = document.getElementById('statTotalTasks');
  const statDoneTasks = document.getElementById('statDoneTasks');
  const statActiveTasks = document.getElementById('statActiveTasks');
  const statCompletionRate = document.getElementById('statCompletionRate');
  const workloadBarsContainer = document.getElementById('workloadBarsContainer');
  const projectsBreakdownContainer = document.getElementById('projectsBreakdownContainer');
  const statCycleTime = document.getElementById('statCycleTime');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');

  // Workspace Navigation & Views
  const navOfficeBtn = document.getElementById('navOfficeBtn');
  const navKanbanBtn = document.getElementById('navKanbanBtn');
  const navPlansBtn = document.getElementById('navPlansBtn');
  const navKanbanCountBadge = document.getElementById('navKanbanCountBadge');
  const navPlansCountBadge = document.getElementById('navPlansCountBadge');
  const mainDashboardView = document.getElementById('mainDashboardView');
  const kanbanBoardView = document.getElementById('kanbanBoardView');
  const plansStudioView = document.getElementById('plansStudioView');
  const kanbanTotalTasksBadge = document.getElementById('kanbanTotalTasksBadge');
  const kanbanBackToOfficeBtn = document.getElementById('kanbanBackToOfficeBtn');
  const kanbanNewTaskBtn = document.getElementById('kanbanNewTaskBtn');
  const kanbanRefreshBtn = document.getElementById('kanbanRefreshBtn');

  // Ops Hub Dropdown DOM
  const opsDropdownBtn = document.getElementById('opsDropdownBtn');
  const opsDropdownMenu = document.getElementById('opsDropdownMenu');
  const opsDropdownWrapper = document.getElementById('opsDropdownWrapper');

  // Workspace Views & Studio Shortcuts
  const studioBackToOfficeBtn = document.getElementById('studioBackToOfficeBtn');
  const studioProjectSelect = document.getElementById('studioProjectSelect');
  const studioPlanProjectSelect = document.getElementById('studioPlanProjectSelect');
  const openPlansBtn = document.getElementById('openPlansBtn');
  const kanbanPlansBtn = document.getElementById('kanbanPlansBtn');

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

          // Detect newly completed tasks for audio chime
          if (payload.kanban && Array.isArray(payload.kanban.tasks)) {
            const currentDoneIds = payload.kanban.tasks
              .filter(t => t && (t.status === 'Done' || t.status === 'done'))
              .map(t => t.id);

            if (prevDoneTaskIds !== null) {
              const newlyDone = currentDoneIds.filter(id => !prevDoneTaskIds.includes(id));
              if (newlyDone.length > 0 && soundFx) {
                soundFx.playSuccess();
              }
            }
            prevDoneTaskIds = currentDoneIds;
          }

          // Update Canvas
          canvas.updateAgents(payload.agents);

          // Update Kanban
          kanban.setTasks(payload.kanban.tasks);

          // Update Nav Kanban Count Badge & Sprint Header Badge
          if (payload.kanban && Array.isArray(payload.kanban.tasks)) {
            const tasks = payload.kanban.tasks;
            if (navKanbanCountBadge) {
              navKanbanCountBadge.textContent = tasks.length;
              navKanbanCountBadge.style.display = tasks.length > 0 ? 'inline-block' : 'none';
            }
            if (kanbanTotalTasksBadge) {
              const inProg = tasks.filter(t => (t.status || '').toLowerCase() === 'in-progress').length;
              const qa = tasks.filter(t => (t.status || '').toLowerCase() === 'qa-review').length;
              const done = tasks.filter(t => (t.status || '').toLowerCase() === 'done').length;
              kanbanTotalTasksBadge.textContent = `TOTAL: ${tasks.length} • PROG: ${inProg} • QA: ${qa} • DONE: ${done}`;
            }
          }

          // Update Header Metrics
          updateMetrics(payload.system);

          // Update Agent Cards
          updateAgentCards(payload.agents);

          // Update Live Office Insights
          if (typeof updateOfficeLiveInsights === 'function') {
            updateOfficeLiveInsights(payload.kanban ? payload.kanban.tasks : null);
          }

          // Update Schedules Summary
          if (payload.schedules) {
            if (window.OfficeSchedules && typeof window.OfficeSchedules.updateSummaryUI === 'function') {
              window.OfficeSchedules.updateSummaryUI(payload.schedules);
            }
            const schedModal = document.getElementById('schedulesModal');
            if (schedModal && schedModal.classList.contains('active')) {
              if (window.OfficeSchedules && typeof window.OfficeSchedules.fetchSchedules === 'function') {
                window.OfficeSchedules.fetchSchedules(false);
              }
            }
          }
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
    const agentList = ['LUHUT', 'JOKOWI', 'PRABOWO', 'GIBRAN', 'HABIBIE'];

    const txtStandby = window.I18n ? window.I18n.t('agents.state_standby') : 'STANDBY';
    const txtSleep = window.I18n ? window.I18n.t('agents.state_sleep') : 'SLEEP';
    const txtWorking = window.I18n ? window.I18n.t('agents.state_working') : 'WORKING';
    const txtReviewing = window.I18n ? window.I18n.t('agents.state_reviewing') : 'REVIEWING';
    const defaultBubble = window.I18n ? window.I18n.t('agents.default_bubble') : 'Ready for duty.';

    agentList.forEach(name => {
      // Khusus HABIBIE: Chief Architect On-Demand Card
      if (name === 'HABIBIE') {
        const habibieRole = window.I18n ? window.I18n.t('agents.role_habibie') : 'Chief Architect (On-Demand)';
        const habibieBubble = window.I18n ? window.I18n.t('agents.habibie_bubble') : 'Cinta Sejati';
        const openStudioText = window.I18n ? window.I18n.t('agents.open_studio') : 'Open Plans Studio';
        html += `
          <div class="neo-box-sm" style="padding: 12px; display: flex; flex-direction: column; gap: 8px; border: 2px solid #8B5CF6;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="/static/assets/avatars/habibie.jpg" alt="HABIBIE" 
                     style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid #8B5CF6; object-fit: cover; box-shadow: 2px 2px 0px var(--shadow-color);" 
                     onerror="this.src='/static/assets/avatars/habibie.jpg'">
                <div>
                  <div style="font-weight: 800; font-size: 0.95rem; color: #8B5CF6;">HABIBIE</div>
                  <div style="font-size: 0.72rem; color: #64748B; font-weight: 600;">${habibieRole}</div>
                </div>
              </div>
              <span class="neo-badge" style="background:#8B5CF6; color:#FFFFFF; font-size:0.68rem; font-weight:800;">STANDBY (0 MB)</span>
            </div>
            <div class="agent-bubble-box" style="font-size: 0.78rem; padding: 6px 10px; border-radius: 6px; min-height: 40px; display: flex; align-items: center; line-height: 1.35; border: 1px solid var(--border-color); background: rgba(139, 92, 246, 0.05);">
              <i>${habibieBubble}</i>
            </div>
            <button class="neo-btn neo-btn-secondary habibie-open-studio-btn" style="padding: 4px 8px; font-size: 0.72rem; display: flex; align-items: center; justify-content: center; gap: 5px; font-weight: 700; width: 100%;">
              <i data-lucide="compass" class="lucide-xs" style="color: #8B5CF6;"></i>
              <span>${openStudioText}</span>
            </button>
          </div>
        `;
        return;
      }

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

      const txtViewTasks = (window.I18n && window.I18n.t('agents.view_tasks')) || 'View Tasks';

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
          <button class="neo-btn neo-btn-secondary agent-open-kanban-btn" data-agent="${name}" style="padding: 4px 8px; font-size: 0.72rem; display: flex; align-items: center; justify-content: center; gap: 5px; font-weight: 700; width: 100%; margin-top: 2px;">
            <i data-lucide="kanban" class="lucide-xs" style="color: #0284C7;"></i>
            <span>${txtViewTasks}</span>
          </button>
        </div>
      `;
    });

    agentsGrid.innerHTML = html;

    // Attach click listener ke tombol Lihat Tugas pada kartu agen pelaksana
    agentsGrid.querySelectorAll('.agent-open-kanban-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const agent = btn.getAttribute('data-agent');
        if (soundFx) soundFx.playClick();
        
        // Filter kanban to agent
        const fBtns = document.querySelectorAll('.filter-btn');
        fBtns.forEach(b => {
          if (b.getAttribute('data-assignee') === agent) {
            b.classList.add('neo-btn-primary');
            b.classList.remove('neo-btn-secondary');
          } else {
            b.classList.remove('neo-btn-primary');
            b.classList.add('neo-btn-secondary');
          }
        });
        if (kanban) kanban.setFilter(agent);
        switchWorkspaceView('kanban');
      });
    });

    // Attach click listener ke tombol Buka Studio Rencana pada kartu HABIBIE
    agentsGrid.querySelectorAll('.habibie-open-studio-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (soundFx) soundFx.playClick();
        switchWorkspaceView('plans');
      });
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
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

      // 3. Update Studio Project Filter Select
      if (studioProjectSelect) {
        const cur = studioProjectSelect.value;
        let optHtml = `<option value="ALL">${allProjectsText}</option>`;
        for (const [pId, pData] of Object.entries(projects)) {
          optHtml += `<option value="${pId}">${pData.name || pId}</option>`;
        }
        studioProjectSelect.innerHTML = optHtml;
        studioProjectSelect.value = cur || 'ALL';
      }

      // 4. Update Studio Form Project Select
      if (studioPlanProjectSelect) {
        const cur = studioPlanProjectSelect.value;
        let formOptHtml = '';
        for (const [pId, pData] of Object.entries(projects)) {
          formOptHtml += `<option value="${pId}">${pData.name || pId}</option>`;
        }
        formOptHtml += `<option value="__custom__">${customProjectText}</option>`;
        studioPlanProjectSelect.innerHTML = formOptHtml;
        if (cur && cur !== '__custom__') {
          studioPlanProjectSelect.value = cur;
        }
      }
    } catch (e) {
      console.warn('Gagal memuat registry proyek:', e);
    }
  }

  window.loadProjects = loadProjects;

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

  // 4b. Date Period Filter (Default: THIS_MONTH)
  if (periodFilterSelect) {
    periodFilterSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'CUSTOM') {
        if (customDateContainer) customDateContainer.style.display = 'inline-flex';
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        if (customStartDate && !customStartDate.value) {
          customStartDate.value = `${yyyy}-${mm}-01`;
        }
        if (customEndDate && !customEndDate.value) {
          customEndDate.value = `${yyyy}-${mm}-${dd}`;
        }
        kanban.setPeriodFilter('CUSTOM');
        kanban.setCustomDateRange(customStartDate ? customStartDate.value : null, customEndDate ? customEndDate.value : null);
      } else {
        if (customDateContainer) customDateContainer.style.display = 'none';
        kanban.setPeriodFilter(val);
      }
    });
  }

  if (customStartDate) {
    customStartDate.addEventListener('change', () => {
      kanban.setCustomDateRange(customStartDate.value, customEndDate ? customEndDate.value : null);
    });
  }

  if (customEndDate) {
    customEndDate.addEventListener('change', () => {
      kanban.setCustomDateRange(customStartDate ? customStartDate.value : null, customEndDate.value);
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
          if (soundFx) soundFx.playDispatch();
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

    // Populate Task Action Controls
    currentDetailTaskId = task.id;
    currentDetailTask = task;
    if (detailStatusSelect) {
      detailStatusSelect.value = status;
    }
    if (taskActionFeedback) {
      taskActionFeedback.style.display = 'none';
      taskActionFeedback.textContent = '';
    }

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

  // 7b. Task Action Listeners (Status Change, Retry, Delete)
  if (detailUpdateStatusBtn) {
    detailUpdateStatusBtn.addEventListener('click', async () => {
      if (!currentDetailTaskId) return;
      const newStatus = detailStatusSelect.value;
      detailUpdateStatusBtn.disabled = true;
      try {
        const res = await fetch(`/api/tasks/${currentDetailTaskId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (soundFx) {
            if (newStatus === 'Done') soundFx.playSuccess();
            else soundFx.playClick();
          }
          let statusClass = 'badge-todo';
          if (newStatus === 'In-Progress') statusClass = 'badge-progress';
          else if (newStatus === 'QA-Review') statusClass = 'badge-qa';
          else if (newStatus === 'Done') statusClass = 'badge-done';
          detailTaskStatus.className = `neo-badge ${statusClass}`;
          detailTaskStatus.textContent = newStatus.toUpperCase();

          if (taskActionFeedback) {
            taskActionFeedback.style.color = '#166534';
            taskActionFeedback.textContent = window.I18n 
              ? window.I18n.t('modal_detail.status_updated', { status: newStatus }) 
              : `Status updated to ${newStatus}`;
            taskActionFeedback.style.display = 'inline-block';
          }
        } else {
          if (taskActionFeedback) {
            taskActionFeedback.style.color = '#991B1B';
            taskActionFeedback.textContent = data.error || 'Failed to update';
            taskActionFeedback.style.display = 'inline-block';
          }
        }
      } catch (err) {
        if (taskActionFeedback) {
          taskActionFeedback.style.color = '#991B1B';
          taskActionFeedback.textContent = 'Network error';
          taskActionFeedback.style.display = 'inline-block';
        }
      } finally {
        detailUpdateStatusBtn.disabled = false;
      }
    });
  }

  if (detailRetryBtn) {
    detailRetryBtn.addEventListener('click', async () => {
      if (!currentDetailTaskId) return;
      const assignee = (currentDetailTask && currentDetailTask.assignee) ? currentDetailTask.assignee : 'AGENT';
      const confirmMsg = window.I18n 
        ? window.I18n.t('modal_detail.retry_confirm', { task_id: currentDetailTaskId, assignee })
        : `Do you want to retry task ${currentDetailTaskId} and notify ${assignee}?`;

      if (!confirm(confirmMsg)) return;

      detailRetryBtn.disabled = true;
      try {
        const res = await fetch(`/api/tasks/${currentDetailTaskId}/retry`, { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
          if (soundFx) soundFx.playDispatch();
          taskDetailModal.classList.remove('active');
          alert(window.I18n ? window.I18n.t('modal_detail.task_retried', { task_id: currentDetailTaskId }) : `Task ${currentDetailTaskId} retried.`);
        } else {
          alert(data.error || 'Failed to retry task');
        }
      } catch (e) {
        alert('Server connection error');
      } finally {
        detailRetryBtn.disabled = false;
      }
    });
  }

  if (detailDeleteBtn) {
    detailDeleteBtn.addEventListener('click', async () => {
      if (!currentDetailTaskId) return;
      const confirmMsg = window.I18n 
        ? window.I18n.t('modal_detail.delete_confirm', { task_id: currentDetailTaskId })
        : `Are you sure you want to permanently delete task ${currentDetailTaskId}?`;

      if (!confirm(confirmMsg)) return;

      detailDeleteBtn.disabled = true;
      try {
        const res = await fetch(`/api/tasks/${currentDetailTaskId}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
          if (soundFx) soundFx.playClick();
          taskDetailModal.classList.remove('active');
          alert(window.I18n ? window.I18n.t('modal_detail.task_deleted', { task_id: currentDetailTaskId }) : `Task ${currentDetailTaskId} deleted.`);
        } else {
          alert(data.error || 'Failed to delete task');
        }
      } catch (e) {
        alert('Server connection error');
      } finally {
        detailDeleteBtn.disabled = false;
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (taskDetailModal && taskDetailModal.classList.contains('active')) taskDetailModal.classList.remove('active');
      if (taskModal && taskModal.classList.contains('active')) taskModal.classList.remove('active');
      if (logsModal && logsModal.classList.contains('active')) closeLogsModal();
      if (serverHealthModal && serverHealthModal.classList.contains('active')) serverHealthModal.classList.remove('active');
      if (analyticsModal && analyticsModal.classList.contains('active')) analyticsModal.classList.remove('active');
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
    // Update audio button tooltip
    updateAudioButtonUI();
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
    // Update Plans Studio list & summary badge if plans loaded
    if (window.OfficePlans && typeof window.OfficePlans.fetchPlans === 'function') {
      window.OfficePlans.fetchPlans(false);
    }
    // Update Live Office Insights
    if (typeof updateOfficeLiveInsights === 'function') {
      updateOfficeLiveInsights();
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

  // ==========================================================
  // 13. 8-Bit Retro Sound Effects & Audio Toggle
  // ==========================================================
  function updateAudioButtonUI() {
    if (!audioToggleBtn || !audioIcon || !soundFx) return;
    const isEn = soundFx.isEnabled();
    audioIcon.innerHTML = isEn 
      ? '<i data-lucide="volume-2" class="lucide-sm"></i>' 
      : '<i data-lucide="volume-x" class="lucide-sm"></i>';
    
    const tip = window.I18n 
      ? (isEn ? window.I18n.t('actions.audio_mute') : window.I18n.t('actions.audio_unmute'))
      : (isEn ? 'Mute 8-Bit Audio' : 'Unmute 8-Bit Audio');
    audioToggleBtn.title = tip;
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      if (soundFx) {
        soundFx.toggle();
        updateAudioButtonUI();
      }
    });
  }
  updateAudioButtonUI();

  // ==========================================================
  // 14. Live Agent Terminal Logs Viewer
  // ==========================================================
  let selectedLogAgent = 'LUHUT';
  let logsRefreshInterval = null;

  async function fetchAgentLogs(agentName) {
    if (!terminalLogContent) return;
    try {
      const res = await fetch(`/api/agents/${agentName}/logs?lines=120`);
      const data = await res.json();
      if (res.ok && data.success) {
        terminalLogContent.textContent = data.logs || '(No logs returned)';
        if (logActiveBadge) {
          logActiveBadge.textContent = data.pane || `PANE :0.${['LUHUT', 'GIBRAN', 'JOKOWI', 'PRABOWO'].indexOf(agentName)}`;
          logActiveBadge.className = data.active ? 'neo-badge badge-done' : 'neo-badge badge-todo';
        }
        if (logTimestamp) {
          logTimestamp.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
        const logSourceNotice = document.getElementById('logSourceNotice');
        if (logSourceNotice) {
          logSourceNotice.textContent = (agentName === 'HABIBIE')
            ? 'Source: Standalone on-demand & plans studio'
            : 'Source: tmux capture-pane (agy_agents)';
        }
        // Auto scroll to bottom of logs
        terminalLogContent.scrollTop = terminalLogContent.scrollHeight;
      } else {
        terminalLogContent.textContent = data.error || 'Failed to fetch logs';
      }
    } catch (e) {
      terminalLogContent.textContent = `Network error fetching logs: ${e.message}`;
    }
  }

  function openLogsModal() {
    if (!logsModal) return;
    if (soundFx) soundFx.playClick();
    logsModal.classList.add('active');
    fetchAgentLogs(selectedLogAgent);

    if (logsRefreshInterval) clearInterval(logsRefreshInterval);
    logsRefreshInterval = setInterval(() => {
      if (logsModal.classList.contains('active') && autoRefreshLogsCheckbox && autoRefreshLogsCheckbox.checked) {
        fetchAgentLogs(selectedLogAgent);
      }
    }, 3000);

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function closeLogsModal() {
    if (!logsModal) return;
    logsModal.classList.remove('active');
    if (logsRefreshInterval) {
      clearInterval(logsRefreshInterval);
      logsRefreshInterval = null;
    }
  }

  if (openLogsBtn) {
    openLogsBtn.addEventListener('click', openLogsModal);
  }

  if (closeLogsBtn) {
    closeLogsBtn.addEventListener('click', closeLogsModal);
  }

  if (logsModal) {
    logsModal.addEventListener('click', (e) => {
      if (e.target === logsModal) closeLogsModal();
    });
  }

  logAgentTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      logAgentTabs.forEach(t => {
        t.classList.remove('neo-btn-primary');
        t.classList.add('neo-btn-secondary');
      });
      tab.classList.add('neo-btn-primary');
      tab.classList.remove('neo-btn-secondary');
      selectedLogAgent = tab.getAttribute('data-agent');
      if (soundFx) soundFx.playClick();
      fetchAgentLogs(selectedLogAgent);
    });
  });

  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', () => {
      if (soundFx) soundFx.playClick();
      fetchAgentLogs(selectedLogAgent);
    });
  }

  if (copyLogsBtn && terminalLogContent) {
    copyLogsBtn.addEventListener('click', () => {
      const text = terminalLogContent.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const origHtml = copyLogsBtn.innerHTML;
        const copiedTxt = window.I18n ? window.I18n.t('logs.copied') : 'Copied!';
        copyLogsBtn.innerHTML = `<i data-lucide="check" class="lucide-sm"></i> <span>${copiedTxt}</span>`;
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
        setTimeout(() => {
          copyLogsBtn.innerHTML = origHtml;
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
          }
        }, 1800);
      });
    });
  }

  // ==========================================================
  // 15. Server Health Guardian Modal (Modularized in office-health.js)
  // ==========================================================

  // ==========================================================
  // 16. Kanban Insights & Analytics Modal
  // ==========================================================
  function openAnalyticsModal() {
    if (!analyticsModal) return;
    if (soundFx) soundFx.playClick();

    const tasks = kanban.tasks || [];
    const total = tasks.length;
    const doneTasks = tasks.filter(t => kanban.normalizeStatus(t.status) === 'Done');
    const activeTasks = tasks.filter(t => kanban.normalizeStatus(t.status) === 'In-Progress');
    const doneCount = doneTasks.length;
    const activeCount = activeTasks.length;
    const completionRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    if (statTotalTasks) statTotalTasks.textContent = total;
    if (statDoneTasks) statDoneTasks.textContent = doneCount;
    if (statActiveTasks) statActiveTasks.textContent = activeCount;
    if (statCompletionRate) statCompletionRate.textContent = `${completionRate}%`;

    // Workload Distribution
    if (workloadBarsContainer) {
      const agents = ['LUHUT', 'JOKOWI', 'PRABOWO', 'GIBRAN'];
      const agentColors = { LUHUT: '#EF4444', JOKOWI: '#0EA5E9', PRABOWO: '#F97316', GIBRAN: '#10B981' };
      let workloadHtml = '';

      agents.forEach(ag => {
        const agTasks = tasks.filter(t => (t.assignee || '').toUpperCase() === ag);
        const count = agTasks.length;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        workloadHtml += `
          <div style="font-size:0.78rem;">
            <div style="display:flex; justify-content:space-between; margin-bottom:3px; font-weight:700;">
              <span>${ag}</span>
              <span>${count} tasks (${pct}%)</span>
            </div>
            <div class="progress-bar-track" style="height:8px;">
              <div class="progress-bar-fill" style="width:${pct}%; background-color:${agentColors[ag]};"></div>
            </div>
          </div>
        `;
      });
      workloadBarsContainer.innerHTML = workloadHtml;
    }

    // Projects Breakdown
    if (projectsBreakdownContainer) {
      const projectCounts = {};
      tasks.forEach(t => {
        const p = t.project || 'unknown';
        projectCounts[p] = (projectCounts[p] || 0) + 1;
      });
      let projHtml = '';
      for (const [p, c] of Object.entries(projectCounts)) {
        projHtml += `
          <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed var(--border-color);">
            <span style="font-weight:700;">${p}</span>
            <span class="neo-badge" style="font-size:0.7rem; background:var(--bg-main);">${c}</span>
          </div>
        `;
      }
      projectsBreakdownContainer.innerHTML = projHtml || '<div style="color:#64748B;">No projects</div>';
    }

    // Average Cycle Time
    if (statCycleTime) {
      let totalMinutes = 0;
      let validCount = 0;
      doneTasks.forEach(t => {
        const startRaw = t.created_at || t.started_at;
        const endRaw = t.completed_at;
        if (startRaw && endRaw) {
          const s = new Date(startRaw).getTime();
          const e = new Date(endRaw).getTime();
          if (!isNaN(s) && !isNaN(e) && e > s) {
            totalMinutes += (e - s) / 60000;
            validCount++;
          }
        }
      });

      if (validCount > 0) {
        const avgMin = totalMinutes / validCount;
        if (avgMin >= 60) {
          statCycleTime.textContent = `${(avgMin / 60).toFixed(1)} hrs`;
        } else {
          statCycleTime.textContent = `${Math.round(avgMin)} mins`;
        }
      } else {
        statCycleTime.textContent = window.I18n ? window.I18n.t('analytics.cycle_none') : 'N/A';
      }
    }

    analyticsModal.classList.add('active');
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  if (openAnalyticsBtn) {
    openAnalyticsBtn.addEventListener('click', openAnalyticsModal);
  }

  if (closeAnalyticsModalBtn) {
    closeAnalyticsModalBtn.addEventListener('click', () => {
      analyticsModal.classList.remove('active');
    });
  }

  if (analyticsModal) {
    analyticsModal.addEventListener('click', (e) => {
      if (e.target === analyticsModal) analyticsModal.classList.remove('active');
    });
  }

  // ==========================================================
  // 16b. Live Office Sprint & Squad Insights (Modularized in office-insights.js)
  // ==========================================================
  function updateOfficeLiveInsights(taskList) {
    if (window.OfficeInsights && typeof window.OfficeInsights.update === 'function') {
      window.OfficeInsights.update(taskList);
    }
  }
  window.updateOfficeLiveInsights = updateOfficeLiveInsights;

  // ==========================================================
  // 17. Kanban Data Export (CSV & JSON)
  // ==========================================================
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      if (soundFx) soundFx.playClick();
      window.location.href = '/api/kanban/export?format=csv';
    });
  }

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      if (soundFx) soundFx.playClick();
      window.location.href = '/api/kanban/export?format=json';
    });
  }

  // ==========================================================
  // 18. Scheduled Tasks & Automation Manager (Modularized in office-schedules.js)
  // ==========================================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================
  // 19. Dedicated Plans Studio & Ops Hub Controller
  // ==========================================================

  // A. Workspace View Switcher (Live Office <-> Kanban Board <-> Plans Studio)
  function switchWorkspaceView(viewName) {
    if (soundFx) soundFx.playClick();

    // Reset all tabs active state
    if (navOfficeBtn) navOfficeBtn.classList.remove('active');
    if (navKanbanBtn) navKanbanBtn.classList.remove('active');
    if (navPlansBtn) navPlansBtn.classList.remove('active');

    // Hide all views
    if (mainDashboardView) mainDashboardView.style.display = 'none';
    if (kanbanBoardView) kanbanBoardView.style.display = 'none';
    if (plansStudioView) plansStudioView.style.display = 'none';

    if (viewName === 'kanban') {
      if (navKanbanBtn) navKanbanBtn.classList.add('active');
      if (kanbanBoardView) kanbanBoardView.style.display = 'flex';
      window.location.hash = 'kanban';
      if (kanban) kanban.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewName === 'plans') {
      if (navPlansBtn) navPlansBtn.classList.add('active');
      if (plansStudioView) plansStudioView.style.display = 'block';
      window.location.hash = 'plans';
      if (window.OfficePlans && typeof window.OfficePlans.fetchPlans === 'function') {
        window.OfficePlans.fetchPlans(true);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Default: 'office'
      if (navOfficeBtn) navOfficeBtn.classList.add('active');
      if (mainDashboardView) mainDashboardView.style.display = 'flex';
      if (window.location.hash === '#plans' || window.location.hash === '#kanban') {
        history.replaceState(null, null, ' ');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  if (navOfficeBtn) {
    navOfficeBtn.addEventListener('click', () => switchWorkspaceView('office'));
  }

  if (navKanbanBtn) {
    navKanbanBtn.addEventListener('click', () => switchWorkspaceView('kanban'));
  }

  if (navPlansBtn) {
    navPlansBtn.addEventListener('click', () => switchWorkspaceView('plans'));
  }

  if (studioBackToOfficeBtn) {
    studioBackToOfficeBtn.addEventListener('click', () => switchWorkspaceView('office'));
  }

  if (kanbanBackToOfficeBtn) {
    kanbanBackToOfficeBtn.addEventListener('click', () => switchWorkspaceView('office'));
  }

  if (kanbanNewTaskBtn) {
    kanbanNewTaskBtn.addEventListener('click', () => {
      if (soundFx) soundFx.playClick();
      taskAlert.style.display = 'none';
      taskModal.classList.add('active');
      document.getElementById('taskInstruction').focus();
      if (window.lucide) window.lucide.createIcons();
    });
  }

  if (kanbanRefreshBtn) {
    kanbanRefreshBtn.addEventListener('click', () => {
      if (soundFx) soundFx.playClick();
      fetch('/api/sync')
        .then(res => res.json())
        .then(data => {
          if (data && data.kanban && Array.isArray(data.kanban.tasks)) {
            kanban.setTasks(data.kanban.tasks);
          }
        })
        .catch(err => console.error('Error refreshing kanban:', err));
    });
  }

  if (kanbanPlansBtn) {
    kanbanPlansBtn.addEventListener('click', () => switchWorkspaceView('plans'));
  }

  if (openPlansBtn) {
    openPlansBtn.addEventListener('click', () => switchWorkspaceView('plans'));
  }

  // Handle URL hash on page load
  if (window.location.hash === '#plans') {
    switchWorkspaceView('plans');
  } else if (window.location.hash === '#kanban') {
    switchWorkspaceView('kanban');
  }

  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#plans') {
      switchWorkspaceView('plans');
    } else if (window.location.hash === '#kanban') {
      switchWorkspaceView('kanban');
    } else if (window.location.hash === '#office' || !window.location.hash) {
      switchWorkspaceView('office');
    }
  });

  // B. Ops Hub Dropdown Menu Handlers
  if (opsDropdownBtn && opsDropdownMenu) {
    opsDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = opsDropdownMenu.style.display !== 'none';
      opsDropdownMenu.style.display = isVisible ? 'none' : 'flex';
      opsDropdownBtn.setAttribute('aria-expanded', isVisible ? 'false' : 'true');
      if (soundFx) soundFx.playClick();
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    });

    // Auto-close on click outside
    document.addEventListener('click', (e) => {
      if (opsDropdownWrapper && !opsDropdownWrapper.contains(e.target)) {
        opsDropdownMenu.style.display = 'none';
        opsDropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && opsDropdownMenu.style.display !== 'none') {
        opsDropdownMenu.style.display = 'none';
        opsDropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ==========================================================
  // 20. Module Initializations & Real-time SSE Connection
  // ==========================================================
  if (window.OfficeHealth && typeof window.OfficeHealth.init === 'function') {
    window.OfficeHealth.init();
  }
  if (window.OfficeInsights && typeof window.OfficeInsights.init === 'function') {
    window.OfficeInsights.init();
  }
  if (window.OfficeSchedules && typeof window.OfficeSchedules.init === 'function') {
    window.OfficeSchedules.init();
  }
  if (window.OfficePlans && typeof window.OfficePlans.init === 'function') {
    window.OfficePlans.init();
  }

  // Initial Render for Live Office Insights
  updateOfficeLiveInsights();

  // Mulai koneksi real-time
  connectSSE();
});
