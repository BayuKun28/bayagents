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

  // Server Health Modal DOM
  const serverHealthModal = document.getElementById('serverHealthModal');
  const closeHealthModalBtn = document.getElementById('closeHealthModalBtn');
  const refreshHealthBtn = document.getElementById('refreshHealthBtn');
  const healthRamText = document.getElementById('healthRamText');
  const healthRamBar = document.getElementById('healthRamBar');
  const healthSwapText = document.getElementById('healthSwapText');
  const healthSwapBar = document.getElementById('healthSwapBar');
  const healthCpuTemp = document.getElementById('healthCpuTemp');
  const healthCpuLoad = document.getElementById('healthCpuLoad');
  const healthDiskText = document.getElementById('healthDiskText');
  const healthDiskBar = document.getElementById('healthDiskBar');
  const healthServicesContainer = document.getElementById('healthServicesContainer');
  const healthLastChecked = document.getElementById('healthLastChecked');

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

  // Scheduled Tasks Modal DOM
  const openSchedulesBtn = document.getElementById('openSchedulesBtn');
  const kanbanSchedulesBtn = document.getElementById('kanbanSchedulesBtn');
  const schedulesModal = document.getElementById('schedulesModal');
  const closeSchedulesModalBtn = document.getElementById('closeSchedulesModalBtn');
  const schedulerWorkerBadge = document.getElementById('schedulerWorkerBadge');
  const statTotalSchedules = document.getElementById('statTotalSchedules');
  const statActiveSchedules = document.getElementById('statActiveSchedules');
  const statNextRunSched = document.getElementById('statNextRunSched');
  const toggleNewScheduleBtn = document.getElementById('toggleNewScheduleBtn');
  const toggleNewScheduleText = document.getElementById('toggleNewScheduleText');
  const refreshSchedulesBtn = document.getElementById('refreshSchedulesBtn');
  const newScheduleFormContainer = document.getElementById('newScheduleFormContainer');
  const newScheduleForm = document.getElementById('newScheduleForm');
  const schedTitle = document.getElementById('schedTitle');
  const schedInstruction = document.getElementById('schedInstruction');
  const schedProject = document.getElementById('schedProject');
  const schedCategory = document.getElementById('schedCategory');
  const schedEngine = document.getElementById('schedEngine');
  const schedTypeBtns = document.querySelectorAll('.sched-type-btn');
  const cronTypeField = document.getElementById('cronTypeField');
  const schedCronExpr = document.getElementById('schedCronExpr');
  const schedPresetBtns = document.querySelectorAll('.sched-preset-btn');
  const intervalTypeField = document.getElementById('intervalTypeField');
  const schedIntervalMin = document.getElementById('schedIntervalMin');
  const onceTypeField = document.getElementById('onceTypeField');
  const schedRunAt = document.getElementById('schedRunAt');
  const cancelNewScheduleBtn = document.getElementById('cancelNewScheduleBtn');
  const submitScheduleBtn = document.getElementById('submitScheduleBtn');
  const schedulesListContainer = document.getElementById('schedulesListContainer');
  let currentScheduleType = 'cron';

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

  // Dedicated Plans Studio Workspace DOM
  const studioBackToOfficeBtn = document.getElementById('studioBackToOfficeBtn');
  const studioToggleNewPlanBtn = document.getElementById('studioToggleNewPlanBtn');
  const studioToggleNewPlanText = document.getElementById('studioToggleNewPlanText');
  const studioNewPlanFormContainer = document.getElementById('studioNewPlanFormContainer');
  const studioNewPlanForm = document.getElementById('studioNewPlanForm');
  const studioPlanIdeaInput = document.getElementById('studioPlanIdeaInput');
  const studioPlanProjectSelect = document.getElementById('studioPlanProjectSelect');
  const studioPlanEngineSelect = document.getElementById('studioPlanEngineSelect');
  const studioCancelNewPlanBtn = document.getElementById('studioCancelNewPlanBtn');
  const studioSubmitPlanBtn = document.getElementById('studioSubmitPlanBtn');
  const studioSubmitPlanBtnText = document.getElementById('studioSubmitPlanBtnText');
  const studioSearchInput = document.getElementById('studioSearchInput');
  const studioFilterBtns = document.querySelectorAll('.studio-filter-btn');
  const studioRefreshBtn = document.getElementById('studioRefreshBtn');
  const studioStatBadge = document.getElementById('studioStatBadge');
  const studioPlansListContainer = document.getElementById('studioPlansListContainer');
  const studioViewerHeader = document.getElementById('studioViewerHeader');
  const studioViewerPlanId = document.getElementById('studioViewerPlanId');
  const studioViewerPlanProject = document.getElementById('studioViewerPlanProject');
  const studioViewerPlanStatus = document.getElementById('studioViewerPlanStatus');
  const studioViewerPlanDate = document.getElementById('studioViewerPlanDate');
  const studioViewerPlanTitle = document.getElementById('studioViewerPlanTitle');
  const studioViewerContent = document.getElementById('studioViewerContent');
  const studioDispatchPlanBtn = document.getElementById('studioDispatchPlanBtn');
  const studioCopyPlanBtn = document.getElementById('studioCopyPlanBtn');
  const studioDeletePlanBtn = document.getElementById('studioDeletePlanBtn');

  // Legacy/Modal DOM fallback references
  const openPlansBtn = document.getElementById('openPlansBtn');
  const kanbanPlansBtn = document.getElementById('kanbanPlansBtn');
  const plansModal = document.getElementById('plansModal');
  const closePlansModalBtn = document.getElementById('closePlansModalBtn');

  let loadedStudioPlans = [];
  let currentSelectedStudioPlan = null;
  let currentStudioFilter = 'ALL';
  let studioSearchQuery = '';

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

          // Update Schedules Summary
          if (payload.schedules) {
            updateSchedulesSummaryUI(payload.schedules);
            if (schedulesModal && schedulesModal.classList.contains('active')) {
              fetchSchedules(false);
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
  // 15. Server Health Guardian Modal
  // ==========================================================
  async function fetchHealthMetrics() {
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
        const isId = (window.I18n && window.I18n.getLanguage() === 'id');
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

  function openHealthModal() {
    if (!serverHealthModal) return;
    if (soundFx) soundFx.playClick();
    serverHealthModal.classList.add('active');
    fetchHealthMetrics();
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  if (telemetryDeck) {
    telemetryDeck.addEventListener('click', openHealthModal);
  }

  if (closeHealthModalBtn) {
    closeHealthModalBtn.addEventListener('click', () => {
      serverHealthModal.classList.remove('active');
    });
  }

  if (serverHealthModal) {
    serverHealthModal.addEventListener('click', (e) => {
      if (e.target === serverHealthModal) serverHealthModal.classList.remove('active');
    });
  }

  if (refreshHealthBtn) {
    refreshHealthBtn.addEventListener('click', () => {
      if (soundFx) soundFx.playClick();
      fetchHealthMetrics();
    });
  }

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
  // 18. Scheduled Tasks & Automation Manager
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

  function updateSchedulesSummaryUI(summary) {
    if (!summary) return;
    if (statTotalSchedules) statTotalSchedules.textContent = summary.total !== undefined ? summary.total : 0;
    if (statActiveSchedules) statActiveSchedules.textContent = summary.active !== undefined ? summary.active : 0;
    if (statNextRunSched) {
      if (summary.upcoming && summary.upcoming.length > 0) {
        const next = summary.upcoming[0];
        const isId = (window.I18n && window.I18n.getLanguage() === 'id');
        const locale = isId ? 'id-ID' : 'en-US';
        const formatted = new Date(next.next_run_at).toLocaleString(locale, {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        statNextRunSched.textContent = `${next.title} (${formatted})`;
        statNextRunSched.title = `${next.title} at ${formatted}`;
      } else {
        statNextRunSched.textContent = window.I18n ? window.I18n.t('schedules.never_run') : 'None';
      }
    }
  }

  async function fetchSchedules(showLoading = true) {
    if (!schedulesListContainer) return;
    if (showLoading) {
      schedulesListContainer.innerHTML = `
        <div style="text-align:center; padding:30px; color:#94A3B8; font-weight:700;">
          ${window.I18n ? window.I18n.t('kanban.loading') : 'Loading scheduled tasks...'}
        </div>
      `;
    }

    try {
      const res = await fetch('/api/schedules');
      if (!res.ok) {
        schedulesListContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#EF4444; font-weight:700;">Failed to load schedules (HTTP ${res.status})</div>`;
        return;
      }
      const data = await res.json();
      const schedules = data.schedules || [];
      const summary = data.summary || {};

      updateSchedulesSummaryUI(summary);
      renderSchedulesList(schedules);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      schedulesListContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#EF4444; font-weight:700;">Error: ${err.message}</div>`;
    }
  }

  function renderSchedulesList(schedules) {
    if (!schedulesListContainer) return;

    if (!Array.isArray(schedules) || schedules.length === 0) {
      const emptyTxt = window.I18n ? window.I18n.t('schedules.no_schedules') : 'No scheduled tasks registered yet. Click "+ New Schedule" to create one!';
      schedulesListContainer.innerHTML = `
        <div class="neo-box-sm" style="text-align:center; padding:36px 20px; color:#64748B; background:var(--bg-main);">
          <i data-lucide="calendar-clock" class="lucide-lg" style="margin-bottom:8px; display:inline-block; opacity:0.6;"></i>
          <p style="font-weight:700; margin:0; font-size:0.9rem;">${emptyTxt}</p>
        </div>
      `;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
      return;
    }

    const isId = (window.I18n && window.I18n.getLanguage() === 'id');
    const locale = isId ? 'id-ID' : 'en-US';
    const formatTime = (ts) => ts ? new Date(ts).toLocaleString(locale) : (window.I18n ? window.I18n.t('schedules.never_run') : 'Never');

    let html = '';
    schedules.forEach(s => {
      const isPaused = !s.enabled;
      const statusBadgeClass = s.enabled ? 'badge-done' : 'badge-todo';
      const statusLabel = s.enabled
        ? (window.I18n ? window.I18n.t('schedules.status_active') : 'Active')
        : (window.I18n ? window.I18n.t('schedules.status_paused') : 'Paused');

      // Schedule Type Pill
      let typeLabel = '';
      if (s.schedule_type === 'cron') {
        typeLabel = `CRON: ${s.cron_expression || '-'}`;
      } else if (s.schedule_type === 'interval') {
        typeLabel = `EVERY ${s.interval_minutes}m`;
      } else if (s.schedule_type === 'once') {
        typeLabel = `ONCE: ${formatTime(s.run_at)}`;
      }

      const runsLabel = window.I18n
        ? window.I18n.t('schedules.runs_count', { count: s.run_count || 0 })
        : `${s.run_count || 0} runs`;

      const pauseResumeText = s.enabled
        ? (window.I18n ? window.I18n.t('schedules.pause') : 'Pause')
        : (window.I18n ? window.I18n.t('schedules.resume') : 'Resume');

      const pauseResumeIcon = s.enabled ? 'pause' : 'play';
      const runNowText = window.I18n ? window.I18n.t('schedules.run_now') : 'Run Now';
      const deleteText = window.I18n ? window.I18n.t('schedules.delete') : 'Delete';

      let lastStatusHtml = '';
      if (s.last_status) {
        const isSuccess = s.last_status === 'success';
        const color = isSuccess ? '#16A34A' : '#DC2626';
        const bg = isSuccess ? '#DCFCE7' : '#FEE2E2';
        const taskLink = s.last_task_id ? `<span style="text-decoration:underline; font-weight:800; margin-left:4px;">${s.last_task_id}</span>` : '';
        lastStatusHtml = `
          <div style="font-size:0.75rem; padding:4px 8px; border-radius:4px; background:${bg}; color:${color}; font-weight:700; display:inline-flex; align-items:center; gap:4px; margin-top:4px;">
            <i data-lucide="${isSuccess ? 'check-circle' : 'alert-circle'}" class="lucide-sm"></i>
            <span>${isSuccess ? 'Last run passed' : 'Last run failed'}</span>
            ${taskLink}
          </div>
        `;
      }

      html += `
        <div class="schedule-card ${isPaused ? 'paused' : ''}" data-id="${s.id}">
          <!-- Top Row: Title, ID, Badges -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span class="neo-badge" style="background:#1A1A1A; color:#FFFFFF; font-size:0.72rem; font-weight:800;">${s.id}</span>
              <h4 style="font-weight:800; font-size:0.98rem; margin:0; letter-spacing:-0.2px;">${escapeHtml(s.title)}</h4>
              <span class="neo-badge badge-progress" style="font-size:0.7rem; font-family:monospace;">${typeLabel}</span>
            </div>
            <div>
              <span class="neo-badge ${statusBadgeClass}" style="font-size:0.72rem;">${statusLabel}</span>
            </div>
          </div>

          <!-- Instruction / Description -->
          <p style="font-size:0.85rem; margin:0; color:#334155; line-height:1.45; word-break:break-word;">
            ${escapeHtml(s.instruction)}
          </p>

          <!-- Metadata Tags -->
          <div style="display:flex; gap:6px; flex-wrap:wrap; font-size:0.72rem;">
            <span class="neo-badge" style="background:var(--bg-main); font-weight:700;">Project: ${s.project || 'bayoffice'}</span>
            <span class="neo-badge" style="background:var(--bg-main); font-weight:700;">Category: ${s.category || 'auto'}</span>
            <span class="neo-badge" style="background:var(--bg-main); font-weight:700;">Engine: ${s.engine || 'agy'}</span>
            <span class="neo-badge" style="background:var(--bg-main); font-weight:700;">${runsLabel}</span>
          </div>

          <!-- Execution Schedule Timestamps & Last Result -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:6px; font-size:0.75rem; color:#64748B; border-top:1px dashed var(--border-color); padding-top:8px;">
            <div>
              <span style="font-weight:700;" data-i18n="schedules.last_run">Last Run:</span>
              <span>${formatTime(s.last_run_at)}</span>
            </div>
            <div>
              <span style="font-weight:700;" data-i18n="schedules.next_run_label">Next Run:</span>
              <span style="color:#2563EB; font-weight:700;">${s.next_run_at ? formatTime(s.next_run_at) : '-'}</span>
            </div>
          </div>
          ${lastStatusHtml}

          <!-- Action Buttons Bar -->
          <div style="display:flex; justify-content:flex-end; align-items:center; gap:8px; border-top:1px solid var(--border-color); padding-top:10px; margin-top:2px; flex-wrap:wrap;">
            <button class="neo-btn neo-btn-secondary sched-run-btn" data-id="${s.id}" style="padding:5px 10px; font-size:0.75rem; display:flex; align-items:center; gap:4px;">
              <i data-lucide="play" class="lucide-sm"></i>
              <span>${runNowText}</span>
            </button>
            <button class="neo-btn neo-btn-secondary sched-toggle-btn" data-id="${s.id}" data-enabled="${s.enabled}" style="padding:5px 10px; font-size:0.75rem; display:flex; align-items:center; gap:4px;">
              <i data-lucide="${pauseResumeIcon}" class="lucide-sm"></i>
              <span>${pauseResumeText}</span>
            </button>
            <button class="neo-btn neo-btn-danger sched-delete-btn" data-id="${s.id}" data-title="${escapeHtml(s.title)}" style="padding:5px 10px; font-size:0.75rem; display:flex; align-items:center; gap:4px; color:#DC2626;">
              <i data-lucide="trash-2" class="lucide-sm"></i>
              <span>${deleteText}</span>
            </button>
          </div>
        </div>
      `;
    });

    schedulesListContainer.innerHTML = html;

    // Attach listeners to card action buttons
    schedulesListContainer.querySelectorAll('.sched-run-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        const origHtml = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader" class="lucide-sm"></i> <span>Running...</span>`;
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
        if (soundFx) soundFx.playClick();

        try {
          const res = await fetch(`/api/schedules/${id}/run`, { method: 'POST' });
          const resJson = await res.json();
          if (res.ok && resJson.success) {
            if (soundFx) soundFx.playSuccess();
            alert(window.I18n ? window.I18n.t('schedules.run_success', { taskId: resJson.task_id }) : `Task triggered: ${resJson.task_id}`);
            fetchSchedules(false);
          } else {
            alert(`Failed: ${resJson.error || resJson.detail || 'Unknown error'}`);
          }
        } catch (err) {
          alert(`Error: ${err.message}`);
        } finally {
          btn.disabled = false;
          btn.innerHTML = origHtml;
          if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
        }
      });
    });

    schedulesListContainer.querySelectorAll('.sched-toggle-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const wasEnabled = btn.getAttribute('data-enabled') === 'true';
        btn.disabled = true;
        if (soundFx) soundFx.playClick();

        try {
          const res = await fetch(`/api/schedules/${id}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: !wasEnabled })
          });
          const resJson = await res.json();
          if (res.ok && resJson.success) {
            fetchSchedules(false);
          } else {
            alert(`Failed: ${resJson.error || resJson.detail || 'Unknown error'}`);
          }
        } catch (err) {
          alert(`Error: ${err.message}`);
        } finally {
          btn.disabled = false;
        }
      });
    });

    schedulesListContainer.querySelectorAll('.sched-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');
        const confirmMsg = window.I18n
          ? window.I18n.t('schedules.delete_confirm', { title: title || id })
          : `Are you sure you want to delete scheduled task "${title || id}"?`;

        if (!confirm(confirmMsg)) return;

        btn.disabled = true;
        if (soundFx) soundFx.playClick();

        try {
          const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
          const resJson = await res.json();
          if (res.ok && resJson.success) {
            fetchSchedules(false);
          } else {
            alert(`Failed: ${resJson.error || resJson.detail || 'Unknown error'}`);
          }
        } catch (err) {
          alert(`Error: ${err.message}`);
        } finally {
          btn.disabled = false;
        }
      });
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function openSchedulesModal() {
    if (!schedulesModal) return;
    if (soundFx) soundFx.playClick();
    schedulesModal.classList.add('active');
    fetchSchedules(true);
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function closeSchedulesModal() {
    if (!schedulesModal) return;
    schedulesModal.classList.remove('active');
    if (newScheduleFormContainer) newScheduleFormContainer.style.display = 'none';
  }

  // Toggle New Schedule Form
  if (toggleNewScheduleBtn) {
    toggleNewScheduleBtn.addEventListener('click', () => {
      if (soundFx) soundFx.playClick();
      if (!newScheduleFormContainer) return;
      const isHidden = newScheduleFormContainer.style.display === 'none';
      newScheduleFormContainer.style.display = isHidden ? 'block' : 'none';
      if (toggleNewScheduleText) {
        toggleNewScheduleText.textContent = isHidden
          ? (window.I18n ? window.I18n.t('schedules.hide_form_btn') : 'Close Form')
          : (window.I18n ? window.I18n.t('schedules.new_schedule_btn') : '+ New Schedule');
      }
      if (isHidden && schedTitle) {
        schedTitle.focus();
      }
    });
  }

  if (cancelNewScheduleBtn) {
    cancelNewScheduleBtn.addEventListener('click', () => {
      if (newScheduleFormContainer) newScheduleFormContainer.style.display = 'none';
      if (toggleNewScheduleText) {
        toggleNewScheduleText.textContent = window.I18n ? window.I18n.t('schedules.new_schedule_btn') : '+ New Schedule';
      }
    });
  }

  // Switch Schedule Type Tabs (Cron / Interval / Once)
  schedTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      schedTypeBtns.forEach(b => {
        b.classList.remove('neo-btn-primary');
        b.classList.add('neo-btn-secondary');
      });
      btn.classList.add('neo-btn-primary');
      btn.classList.remove('neo-btn-secondary');
      currentScheduleType = btn.getAttribute('data-type');
      if (soundFx) soundFx.playClick();

      if (cronTypeField) cronTypeField.style.display = (currentScheduleType === 'cron') ? 'block' : 'none';
      if (intervalTypeField) intervalTypeField.style.display = (currentScheduleType === 'interval') ? 'block' : 'none';
      if (onceTypeField) onceTypeField.style.display = (currentScheduleType === 'once') ? 'block' : 'none';
    });
  });

  // Preset Cron buttons
  schedPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const cronVal = btn.getAttribute('data-cron');
      if (schedCronExpr && cronVal) {
        schedCronExpr.value = cronVal;
        if (soundFx) soundFx.playClick();
      }
    });
  });

  // Submit New Schedule Form
  if (newScheduleForm) {
    newScheduleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = schedTitle ? schedTitle.value.trim() : '';
      const instruction = schedInstruction ? schedInstruction.value.trim() : '';
      const project = schedProject ? schedProject.value : 'bayoffice';
      const category = schedCategory ? schedCategory.value : 'auto';
      const engine = schedEngine ? schedEngine.value : 'agy';

      if (!title || !instruction) return;

      const payload = {
        title,
        instruction,
        project,
        category,
        engine,
        schedule_type: currentScheduleType
      };

      if (currentScheduleType === 'cron') {
        payload.cron_expression = schedCronExpr ? schedCronExpr.value.trim() : '0 2 * * *';
      } else if (currentScheduleType === 'interval') {
        payload.interval_minutes = schedIntervalMin ? parseInt(schedIntervalMin.value, 10) : 60;
      } else if (currentScheduleType === 'once') {
        const val = schedRunAt ? schedRunAt.value : '';
        if (!val) {
          alert('Please select date and time for one-off task execution');
          return;
        }
        payload.run_at = new Date(val).toISOString();
      }

      if (submitScheduleBtn) submitScheduleBtn.disabled = true;
      if (soundFx) soundFx.playClick();

      try {
        const res = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const resJson = await res.json();
        if (res.ok && resJson.success) {
          if (soundFx) soundFx.playSuccess();
          alert(window.I18n ? window.I18n.t('schedules.created_success') : 'Scheduled task created!');
          newScheduleForm.reset();
          if (newScheduleFormContainer) newScheduleFormContainer.style.display = 'none';
          if (toggleNewScheduleText) {
            toggleNewScheduleText.textContent = window.I18n ? window.I18n.t('schedules.new_schedule_btn') : '+ New Schedule';
          }
          fetchSchedules(false);
        } else {
          alert(`Failed: ${resJson.error || resJson.detail || 'Unknown error'}`);
        }
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        if (submitScheduleBtn) submitScheduleBtn.disabled = false;
      }
    });
  }

  if (openSchedulesBtn) {
    openSchedulesBtn.addEventListener('click', openSchedulesModal);
  }

  if (kanbanSchedulesBtn) {
    kanbanSchedulesBtn.addEventListener('click', openSchedulesModal);
  }

  if (closeSchedulesModalBtn) {
    closeSchedulesModalBtn.addEventListener('click', closeSchedulesModal);
  }

  if (refreshSchedulesBtn) {
    refreshSchedulesBtn.addEventListener('click', () => {
      if (soundFx) soundFx.playClick();
      fetchSchedules(true);
    });
  }

  if (schedulesModal) {
    schedulesModal.addEventListener('click', (e) => {
      if (e.target === schedulesModal) closeSchedulesModal();
    });
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
      fetchStudioPlans(true);
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

  // C. Markdown Parser Engine
  function renderMarkdownToHtml(md) {
    if (!md) return '';
    let text = String(md);

    // 1. Remove YAML frontmatter if present (--- ... ---)
    text = text.replace(/^---[\r\n]+[\s\S]*?[\r\n]+---[\r\n]*/, '');

    // 2. Escape HTML
    text = escapeHtml(text);

    // 3. Process Code blocks (```lang\n...```)
    const codeBlocks = [];
    text = text.replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (match, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push(`<pre><code class="language-${lang}">${code.trim()}</code></pre>`);
      return `@@CODE_BLOCK_${idx}@@`;
    });

    // 4. Process Inline code (`...`)
    text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // 5. Process Headings
    text = text.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 6. Horizontal Rules (--- or ***)
    text = text.replace(/^(?:---|\*\*\*|___)\s*$/gim, '<hr style="border:none; border-top:1px dashed var(--border-color); margin:16px 0;">');

    // 7. Blockquotes (> ...)
    text = text.replace(/^>\s?(.*$)/gim, '<blockquote style="border-left:3px solid #8B5CF6; padding-left:12px; margin:10px 0; color:#64748B; font-style:italic; background:rgba(139, 92, 246, 0.04); border-radius:0 4px 4px 0;">$1</blockquote>');

    // 8. Bold and Italic
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 9. Task checkboxes
    text = text.replace(/\[ \]/g, '<span style="font-family:monospace; margin-right:4px;">☐</span>');
    text = text.replace(/\[x\]/gi, '<span style="font-family:monospace; margin-right:4px; color:#10B981;">☑</span>');

    // 10. Process Lists (unordered and ordered)
    const lines = text.split('\n');
    let inUl = false;
    let inOl = false;
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
      const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);

      if (ulMatch) {
        if (inOl) { processedLines.push('</ol>'); inOl = false; }
        if (!inUl) { processedLines.push('<ul>'); inUl = true; }
        processedLines.push(`<li>${ulMatch[1]}</li>`);
      } else if (olMatch) {
        if (inUl) { processedLines.push('</ul>'); inUl = false; }
        if (!inOl) { processedLines.push('<ol>'); inOl = true; }
        processedLines.push(`<li>${olMatch[1]}</li>`);
      } else {
        if (inUl) { processedLines.push('</ul>'); inUl = false; }
        if (inOl) { processedLines.push('</ol>'); inOl = false; }
        processedLines.push(line);
      }
    }
    if (inUl) processedLines.push('</ul>');
    if (inOl) processedLines.push('</ol>');
    text = processedLines.join('\n');

    // 11. Paragraphs: convert line breaks
    text = text.replace(/\n\n+/g, '<br><br>');
    text = text.replace(/\n/g, '<br>');

    // Clean up excessive br around tags
    text = text.replace(/(<\/(?:h[1-4]|ul|ol|pre|blockquote)>)<br>/gi, '$1');
    text = text.replace(/<br>(<(?:h[1-4]|ul|ol|pre|blockquote))/gi, '$1');

    // 12. Restore code blocks
    text = text.replace(/@@CODE_BLOCK_(\d+)@@/g, (match, idx) => {
      return codeBlocks[parseInt(idx, 10)] || '';
    });

    return `<div class="plan-markdown-body">${text}</div>`;
  }

  // D. Plans Studio Data Loader & Filtering
  async function fetchStudioPlans(showLoading = false) {
    if (showLoading && studioPlansListContainer) {
      studioPlansListContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: #94A3B8; font-weight: 700;">
          <i data-lucide="loader" class="lucide-md" style="margin-bottom: 8px; animation: spin 1s linear infinite;"></i>
          <div>Loading blueprints...</div>
        </div>
      `;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }

    try {
      const res = await fetch('/api/plans');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      loadedStudioPlans = data.plans || [];

      // Update Nav Count Badge
      if (navPlansCountBadge) {
        navPlansCountBadge.textContent = loadedStudioPlans.length;
        navPlansCountBadge.style.display = loadedStudioPlans.length > 0 ? 'inline-block' : 'none';
      }

      // Update Studio Summary Badge
      if (studioStatBadge) {
        const total = loadedStudioPlans.length;
        const dispatched = loadedStudioPlans.filter(p => p.status === 'dispatched').length;
        const drafts = total - dispatched;
        studioStatBadge.textContent = window.I18n
          ? `${window.I18n.t('plans.total_plans')}: ${total} • ${window.I18n.t('plans.draft_plans')}: ${drafts} • ${window.I18n.t('plans.dispatched_plans')}: ${dispatched}`
          : `Total: ${total} • Drafts: ${drafts} • Dispatched: ${dispatched}`;
      }

      renderStudioPlansList();

      // Auto-select plan
      if (loadedStudioPlans.length > 0) {
        const stillExists = currentSelectedStudioPlan ? loadedStudioPlans.find(p => p.id === currentSelectedStudioPlan.id) : null;
        if (stillExists) {
          selectStudioPlan(stillExists.id, false);
        } else if (!currentSelectedStudioPlan) {
          selectStudioPlan(loadedStudioPlans[0].id, false);
        }
      } else {
        currentSelectedStudioPlan = null;
        if (studioViewerHeader) studioViewerHeader.style.display = 'none';
        if (studioViewerContent) {
          studioViewerContent.innerHTML = `
            <div style="text-align: center; padding: 120px 20px; color: #64748B;">
              <div style="width: 64px; height: 64px; border-radius: 50%; background: #EDE9FE; color: #8B5CF6; border: 2px solid var(--border-color); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; box-shadow: 3px 3px 0px var(--shadow-color);">
                <i data-lucide="compass" class="lucide-lg"></i>
              </div>
              <h4 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 6px;">${window.I18n ? window.I18n.t('studio.empty_title') : 'Select a Blueprint to Read'}</h4>
              <p style="font-size: 0.85rem; max-width: 480px; margin: 0 auto; color: #64748B;">${window.I18n ? window.I18n.t('studio.empty_hint') : 'Select an architectural blueprint on the left or click "+ Draft Architecture Plan" to create one with HABIBIE.'}</p>
            </div>
          `;
          if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
        }
      }
    } catch (err) {
      console.error('Failed to fetch studio plans:', err);
      if (studioPlansListContainer) {
        studioPlansListContainer.innerHTML = `
          <div style="text-align: center; padding: 20px; color: #DC2626; font-size: 0.82rem;">
            Failed to load plans: ${escapeHtml(err.message)}
          </div>
        `;
      }
    }
  }

  function renderStudioPlansList() {
    if (!studioPlansListContainer) return;

    // Filter by project and search query
    let filtered = loadedStudioPlans.slice();
    if (currentStudioFilter && currentStudioFilter !== 'ALL') {
      filtered = filtered.filter(p => (p.project || '').toLowerCase() === currentStudioFilter.toLowerCase());
    }
    if (studioSearchQuery) {
      const q = studioSearchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        (p.title || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q) ||
        (p.summary || '').toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      studioPlansListContainer.innerHTML = `
        <div style="text-align: center; padding: 30px 10px; color: #94A3B8; font-size: 0.82rem;">
          ${window.I18n ? window.I18n.t('studio.no_plans') : 'No implementation plans found.'}
        </div>
      `;
      return;
    }

    const locale = (window.I18n && window.I18n.currentLocale === 'id') ? 'id-ID' : 'en-US';
    const formatTime = (ts) => ts ? new Date(ts).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' }) : '-';

    let html = '';
    filtered.forEach(p => {
      const isSelected = currentSelectedStudioPlan && currentSelectedStudioPlan.id === p.id;
      const isDispatched = p.status === 'dispatched';
      const statusClass = isDispatched ? 'badge-done' : 'badge-todo';
      const statusText = isDispatched
        ? (window.I18n ? window.I18n.t('plans.status_dispatched') : 'Dispatched')
        : (window.I18n ? window.I18n.t('plans.status_draft') : 'Draft');

      html += `
        <div class="plan-card ${isSelected ? 'active' : ''}" data-id="${p.id}">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
            <span style="font-weight:800; font-size:0.75rem; color:#8B5CF6;">${escapeHtml(p.id)}</span>
            <div style="display:flex; align-items:center; gap:4px;">
              <span class="neo-badge" style="background:var(--bg-main); font-size:0.65rem;">${escapeHtml(p.project || 'general')}</span>
              <span class="neo-badge ${statusClass}" style="font-size:0.65rem;">${statusText}</span>
            </div>
          </div>
          <div style="font-weight:700; font-size:0.86rem; color:var(--text-color); line-height:1.25; margin-top:3px;">
            ${escapeHtml(p.title || p.id)}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; color:#64748B; margin-top:4px;">
            <span>${escapeHtml(p.author || 'HABIBIE')}</span>
            <span>${formatTime(p.created_at)}</span>
          </div>
        </div>
      `;
    });

    studioPlansListContainer.innerHTML = html;

    // Attach click listeners to cards
    studioPlansListContainer.querySelectorAll('.plan-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        if (soundFx) soundFx.playClick();
        selectStudioPlan(id);
      });
    });
  }

  async function selectStudioPlan(planId, playSound = true) {
    if (!planId) return;

    // Highlight card immediately
    if (studioPlansListContainer) {
      studioPlansListContainer.querySelectorAll('.plan-card').forEach(card => {
        if (card.getAttribute('data-id') === planId) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });
    }

    try {
      const res = await fetch(`/api/plans/${planId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const plan = data.plan || data;
      if (!plan) return;

      currentSelectedStudioPlan = plan;

      // Sembunyikan form drafting saat menampilkan dokumen blueprint
      if (studioNewPlanFormContainer) studioNewPlanFormContainer.style.display = 'none';
      if (studioToggleNewPlanText) {
        studioToggleNewPlanText.textContent = window.I18n ? window.I18n.t('studio.new_plan_btn') : '+ Draft Architecture Plan';
      }

      // Update Reader Header
      if (studioViewerHeader) studioViewerHeader.style.display = 'flex';
      if (studioViewerPlanId) studioViewerPlanId.textContent = plan.id;
      if (studioViewerPlanProject) studioViewerPlanProject.textContent = plan.project || 'general';

      const isDispatched = plan.status === 'dispatched';
      if (studioViewerPlanStatus) {
        studioViewerPlanStatus.className = 'neo-badge ' + (isDispatched ? 'badge-done' : 'badge-todo');
        studioViewerPlanStatus.textContent = isDispatched
          ? (window.I18n ? window.I18n.t('plans.status_dispatched') : 'Dispatched')
          : (window.I18n ? window.I18n.t('plans.status_draft') : 'Draft');
      }

      if (studioViewerPlanDate) {
        const locale = (window.I18n && window.I18n.currentLocale === 'id') ? 'id-ID' : 'en-US';
        studioViewerPlanDate.textContent = plan.created_at ? new Date(plan.created_at).toLocaleString(locale) : '';
      }

      if (studioViewerPlanTitle) {
        studioViewerPlanTitle.textContent = plan.title || plan.id;
      }

      // Configure Action Buttons
      if (studioDispatchPlanBtn) {
        if (isDispatched) {
          studioDispatchPlanBtn.disabled = true;
          studioDispatchPlanBtn.innerHTML = `<i data-lucide="check" class="lucide-sm"></i> <span>${window.I18n ? window.I18n.t('plans.status_dispatched') : 'Dispatched'} (${escapeHtml(plan.dispatched_task_id || '')})</span>`;
        } else {
          studioDispatchPlanBtn.disabled = false;
          studioDispatchPlanBtn.innerHTML = `<i data-lucide="send" class="lucide-sm"></i> <span>${window.I18n ? window.I18n.t('plans.dispatch_btn') : 'Dispatch to Kanban'}</span>`;
        }
      }

      // Render Markdown Content into Studio Pane
      if (studioViewerContent) {
        studioViewerContent.innerHTML = renderMarkdownToHtml(plan.content || '');
      }

      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    } catch (err) {
      console.error('Failed to select studio plan:', err);
      if (studioViewerContent) {
        studioViewerContent.innerHTML = `
          <div style="color: #DC2626; padding: 20px; font-weight: 700;">
            Failed to load plan details: ${escapeHtml(err.message)}
          </div>
        `;
      }
    }
  }

  // Toggle & Submit New Plan Form (HABIBIE AI Generation - Right Pane)
  function hideStudioNewPlanForm() {
    if (studioNewPlanFormContainer) studioNewPlanFormContainer.style.display = 'none';
    if (studioToggleNewPlanText) {
      studioToggleNewPlanText.textContent = window.I18n ? window.I18n.t('studio.new_plan_btn') : '+ Draft Architecture Plan';
    }
    if (currentSelectedStudioPlan) {
      if (studioViewerHeader) studioViewerHeader.style.display = 'flex';
      if (studioViewerContent) studioViewerContent.style.display = 'block';
    } else {
      if (studioViewerHeader) studioViewerHeader.style.display = 'none';
      if (studioViewerContent) studioViewerContent.style.display = 'block';
    }
  }

  function showStudioNewPlanForm() {
    if (studioViewerHeader) studioViewerHeader.style.display = 'none';
    if (studioViewerContent) studioViewerContent.style.display = 'none';
    if (studioNewPlanFormContainer) studioNewPlanFormContainer.style.display = 'flex';
    if (studioToggleNewPlanText) {
      studioToggleNewPlanText.textContent = window.I18n ? window.I18n.t('plans.hide_form_btn') : 'Close Drafting Form';
    }
    if (studioPlanIdeaInput) {
      setTimeout(() => studioPlanIdeaInput.focus(), 80);
    }
  }

  if (studioToggleNewPlanBtn) {
    studioToggleNewPlanBtn.addEventListener('click', () => {
      if (soundFx) soundFx.playClick();
      if (!studioNewPlanFormContainer) return;
      const isVisible = studioNewPlanFormContainer.style.display === 'flex' || studioNewPlanFormContainer.style.display === 'block';
      if (isVisible) {
        hideStudioNewPlanForm();
      } else {
        showStudioNewPlanForm();
      }
    });
  }

  const studioCancelBtn1 = document.getElementById('studioCancelNewPlanBtn');
  const studioCancelBtn2 = document.getElementById('studioCancelNewPlanBtn2');
  [studioCancelBtn1, studioCancelBtn2].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        if (soundFx) soundFx.playClick();
        hideStudioNewPlanForm();
      });
    }
  });

  if (studioNewPlanForm) {
    studioNewPlanForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const idea = studioPlanIdeaInput ? studioPlanIdeaInput.value.trim() : '';
      const project = studioPlanProjectSelect ? studioPlanProjectSelect.value : 'infobay';
      const engine = studioPlanEngineSelect ? studioPlanEngineSelect.value : '9router';

      if (!idea) return;

      if (studioSubmitPlanBtn) studioSubmitPlanBtn.disabled = true;
      if (studioSubmitPlanBtnText) {
        studioSubmitPlanBtnText.textContent = window.I18n ? window.I18n.t('plans.generating') : 'HABIBIE is Drafting Plan...';
      }
      if (soundFx) soundFx.playClick();

      try {
        const res = await fetch('/api/plans/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea, project, engine })
        });
        const resJson = await res.json();
        if (res.ok && resJson.success) {
          if (soundFx) soundFx.playSuccess();
          studioNewPlanForm.reset();
          hideStudioNewPlanForm();
          await fetchStudioPlans(false);
          const newPlanId = (resJson.plan && resJson.plan.id) || resJson.id;
          if (newPlanId) {
            selectStudioPlan(newPlanId);
          }
        } else {
          alert(`Failed: ${resJson.error || resJson.detail || 'Unknown error'}`);
        }
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        if (studioSubmitPlanBtn) studioSubmitPlanBtn.disabled = false;
        if (studioSubmitPlanBtnText) {
          studioSubmitPlanBtnText.textContent = window.I18n ? window.I18n.t('plans.generate_btn') : 'Ask HABIBIE';
        }
      }
    });
  }

  // Dispatch Plan to Kanban
  if (studioDispatchPlanBtn) {
    studioDispatchPlanBtn.addEventListener('click', async () => {
      if (!currentSelectedStudioPlan) return;
      const confirmMsg = `Dispatch plan "${currentSelectedStudioPlan.title || currentSelectedStudioPlan.id}" to Kanban backlog?`;
      if (!confirm(confirmMsg)) return;

      studioDispatchPlanBtn.disabled = true;
      const origHtml = studioDispatchPlanBtn.innerHTML;
      studioDispatchPlanBtn.innerHTML = `<i data-lucide="loader" class="lucide-sm"></i> <span>${window.I18n ? window.I18n.t('plans.dispatching') : 'Dispatching...'}</span>`;
      if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
      if (soundFx) soundFx.playClick();

      try {
        const res = await fetch(`/api/plans/${currentSelectedStudioPlan.id}/dispatch`, {
          method: 'POST'
        });
        const resJson = await res.json();
        if (res.ok && resJson.success) {
          if (soundFx) soundFx.playSuccess();
          const taskNotice = window.I18n
            ? window.I18n.t('plans.dispatched_notice', { taskId: resJson.task_id })
            : `Plan dispatched to Kanban backlog as ${resJson.task_id}!`;
          alert(taskNotice);
          await fetchStudioPlans(false);
          selectStudioPlan(currentSelectedStudioPlan.id);
        } else {
          alert(`Failed: ${resJson.error || resJson.detail || 'Unknown error'}`);
          studioDispatchPlanBtn.disabled = false;
          studioDispatchPlanBtn.innerHTML = origHtml;
          if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
        }
      } catch (err) {
        alert(`Error: ${err.message}`);
        studioDispatchPlanBtn.disabled = false;
        studioDispatchPlanBtn.innerHTML = origHtml;
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
      }
    });
  }

  // Copy Plan Content
  if (studioCopyPlanBtn) {
    studioCopyPlanBtn.addEventListener('click', async () => {
      if (!currentSelectedStudioPlan || !currentSelectedStudioPlan.content) return;
      try {
        await navigator.clipboard.writeText(currentSelectedStudioPlan.content);
        if (soundFx) soundFx.playSuccess();
        const copySpan = studioCopyPlanBtn.querySelector('span');
        const origText = copySpan ? copySpan.textContent : 'Copy';
        if (copySpan) copySpan.textContent = window.I18n ? window.I18n.t('plans.copied') : 'Copied!';
        setTimeout(() => {
          if (copySpan) copySpan.textContent = origText;
        }, 1800);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    });
  }

  // Delete Plan
  if (studioDeletePlanBtn) {
    studioDeletePlanBtn.addEventListener('click', async () => {
      if (!currentSelectedStudioPlan) return;
      const title = currentSelectedStudioPlan.title || currentSelectedStudioPlan.id;
      const confirmMsg = window.I18n
        ? window.I18n.t('plans.delete_confirm', { title })
        : `Are you sure you want to delete plan "${title}"?`;

      if (!confirm(confirmMsg)) return;

      studioDeletePlanBtn.disabled = true;
      if (soundFx) soundFx.playClick();

      try {
        const res = await fetch(`/api/plans/${currentSelectedStudioPlan.id}`, { method: 'DELETE' });
        const resJson = await res.json();
        if (res.ok && resJson.success) {
          if (soundFx) soundFx.playSuccess();
          currentSelectedStudioPlan = null;
          if (studioViewerHeader) studioViewerHeader.style.display = 'none';
          if (studioViewerContent) {
            studioViewerContent.innerHTML = `
              <div style="text-align: center; padding: 120px 20px; color: #64748B;">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: #EDE9FE; color: #8B5CF6; border: 2px solid var(--border-color); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; box-shadow: 3px 3px 0px var(--shadow-color);">
                  <i data-lucide="compass" class="lucide-lg"></i>
                </div>
                <h4 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 6px;">${window.I18n ? window.I18n.t('studio.empty_title') : 'Select a Blueprint to Read'}</h4>
                <p style="font-size: 0.85rem; max-width: 480px; margin: 0 auto; color: #64748B;">${window.I18n ? window.I18n.t('studio.empty_hint') : 'Select an architectural blueprint on the left or click "+ Draft Architecture Plan" to create one with HABIBIE.'}</p>
              </div>
            `;
            if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
          }
          await fetchStudioPlans(false);
        } else {
          alert(`Failed: ${resJson.error || resJson.detail || 'Unknown error'}`);
        }
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        studioDeletePlanBtn.disabled = false;
      }
    });
  }

  // Search & Filter listeners
  if (studioSearchInput) {
    studioSearchInput.addEventListener('input', (e) => {
      studioSearchQuery = e.target.value.trim();
      renderStudioPlansList();
    });
  }

  studioFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      studioFilterBtns.forEach(b => {
        b.classList.remove('neo-btn-primary');
        b.classList.add('neo-btn-secondary');
      });
      btn.classList.add('neo-btn-primary');
      btn.classList.remove('neo-btn-secondary');
      currentStudioFilter = btn.getAttribute('data-filter') || 'ALL';
      if (soundFx) soundFx.playClick();
      renderStudioPlansList();
    });
  });

  if (studioRefreshBtn) {
    studioRefreshBtn.addEventListener('click', () => {
      if (soundFx) soundFx.playClick();
      fetchStudioPlans(true);
    });
  }

  // Initial Fetch for Plans badge count
  fetchStudioPlans(false);

  // Mulai koneksi real-time
  connectSSE();
});
