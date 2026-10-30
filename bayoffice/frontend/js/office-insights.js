/**
 * BayOffice - Live Office Sprint & Squad Insights Module
 * Menangani kalkulasi metrik real-time, status agen, rasio penyelesaian, dan visual flow pipeline.
 */

window.OfficeInsights = (function () {
  let section;
  let openKanbanBtn;
  let openStudioBtn;
  let refreshBtn;
  let statTotalTasks;
  let statActiveTasks;
  let statActiveDetail;
  let statDoneTasks;
  let statDoneRate;
  let statDoneRateBar;
  let statCycleTime;
  let workloadContainer;
  let pipelineTotalBadge;
  let pipelineList;
  let projectsContainer;
  let plansMiniStat;

  function update(taskList) {
    if (!section) return;

    const tasks = taskList || (window.kanban && window.kanban.tasks) || [];
    const total = tasks.length;
    const isId = (window.I18n && window.I18n.currentLocale === 'id');

    const getStatus = (t) => {
      if (window.kanban && typeof window.kanban.normalizeStatus === 'function') {
        return window.kanban.normalizeStatus(t ? t.status : '');
      }
      const s = String(t && t.status ? t.status : '').toLowerCase().trim();
      if (s.includes('done') || s.includes('selesai') || s.includes('passed')) return 'Done';
      if (s.includes('qa') || s.includes('review') || s.includes('audit')) return 'QA-Review';
      if (s.includes('progress') || s.includes('working') || s.includes('jalan')) return 'In-Progress';
      return 'To-Do';
    };

    const escapeHtml = (text) => {
      if (!text) return '';
      return String(text).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
      })[m]);
    };

    const todoTasks = tasks.filter(t => getStatus(t) === 'To-Do');
    const inProgressTasks = tasks.filter(t => getStatus(t) === 'In-Progress');
    const qaTasks = tasks.filter(t => getStatus(t) === 'QA-Review');
    const doneTasks = tasks.filter(t => getStatus(t) === 'Done');

    const inFlightCount = inProgressTasks.length + qaTasks.length;
    const doneCount = doneTasks.length;
    const doneRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    // 1. KPI Numbers
    if (statTotalTasks) statTotalTasks.textContent = total;
    if (statActiveTasks) statActiveTasks.textContent = inFlightCount;
    if (statActiveDetail) {
      statActiveDetail.textContent = isId
        ? `${inProgressTasks.length} Pengerjaan • ${qaTasks.length} Audit QA`
        : `${inProgressTasks.length} Working • ${qaTasks.length} QA Audit`;
    }
    if (statDoneTasks) statDoneTasks.textContent = doneCount;
    if (statDoneRate) statDoneRate.textContent = `${doneRate}%`;
    if (statDoneRateBar) statDoneRateBar.style.width = `${doneRate}%`;

    // 2. Average Cycle Time
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
        statCycleTime.textContent = '-';
      }
    }

    // 3. Panel 1: Squad Workload & Active Focus
    if (workloadContainer) {
      const agents = [
        { name: 'LUHUT', role: isId ? 'DevOps / Lead' : 'DevOps / Lead', color: '#EF4444' },
        { name: 'JOKOWI', role: isId ? 'Backend Dev' : 'Backend Dev', color: '#0EA5E9' },
        { name: 'PRABOWO', role: isId ? 'Frontend Dev' : 'Frontend Dev', color: '#F97316' },
        { name: 'GIBRAN', role: isId ? 'QA Auditor' : 'QA Auditor', color: '#10B981' },
        { name: 'HABIBIE', role: isId ? 'Chief Architect' : 'Chief Architect', color: '#8B5CF6', isArchitect: true }
      ];

      let workloadHtml = '';
      const loadedStudioPlans = window.OfficePlans ? window.OfficePlans.getPlans() : (window.loadedStudioPlans || []);

      agents.forEach(ag => {
        let count = 0;
        let pct = 0;
        let detailText = '';

        if (ag.isArchitect) {
          const blueprintsCount = Array.isArray(loadedStudioPlans) ? loadedStudioPlans.length : 0;
          count = blueprintsCount;
          detailText = isId ? `${blueprintsCount} Blueprint` : `${blueprintsCount} Blueprints`;
        } else {
          const agTasks = tasks.filter(t => (t.assignee || '').toUpperCase() === ag.name);
          count = agTasks.length;
          pct = total > 0 ? Math.round((count / total) * 100) : 0;
          detailText = isId ? `${count} tugas (${pct}%)` : `${count} tasks (${pct}%)`;
        }

        const agentState = (window.latestAgentsData && window.latestAgentsData[ag.name] && window.latestAgentsData[ag.name].state) || 'idle';
        let stateBadge = `<span class="neo-badge badge-todo" style="font-size:0.62rem; padding: 1px 6px;">STANDBY</span>`;
        if (ag.isArchitect) {
          stateBadge = `<span class="neo-badge" style="background:#EDE9FE; color:#6D28D9; border-color:#8B5CF6; font-size:0.62rem; padding: 1px 6px;">ON-DEMAND</span>`;
        } else if (agentState === 'working') {
          stateBadge = `<span class="neo-badge badge-progress" style="font-size:0.62rem; padding: 1px 6px;">${isId ? 'BEKERJA' : 'WORKING'}</span>`;
        } else if (agentState === 'reviewing') {
          stateBadge = `<span class="neo-badge badge-qa" style="font-size:0.62rem; padding: 1px 6px;">${isId ? 'AUDIT QA' : 'AUDITING'}</span>`;
        } else if (agentState === 'sleeping') {
          stateBadge = `<span class="neo-badge" style="background:#E2E8F0; color:#64748B; font-size:0.62rem; padding: 1px 6px;">${isId ? 'TIDUR' : 'SLEEP'}</span>`;
        }

        const barWidth = ag.isArchitect ? Math.min(100, count * 25) : pct;

        workloadHtml += `
          <div class="office-workload-row" style="font-size:0.76rem; cursor: pointer; padding: 4px 6px; border-radius: 6px; border: 1px solid transparent;" data-agent="${ag.name}" title="${isId ? 'Klik untuk filter di Kanban / Plans' : 'Click to filter in Kanban / Plans'}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <img src="/static/assets/avatars/${ag.name.toLowerCase()}.jpg" alt="${ag.name}" style="width:20px; height:20px; border-radius:50%; border:1px solid var(--border-color); object-fit:cover;" onerror="this.style.display='none'">
                <span style="font-weight:800;">${ag.name}</span>
                <span style="font-size:0.68rem; color:#64748B;">• ${ag.role}</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                ${stateBadge}
                <span style="font-weight:800; font-family:var(--font-mono); font-size:0.72rem;">${detailText}</span>
              </div>
            </div>
            <div class="progress-bar-track" style="height:6px; background:var(--bg-main);">
              <div class="progress-bar-fill" style="width:${barWidth}%; background-color:${ag.color};"></div>
            </div>
          </div>
        `;
      });
      workloadContainer.innerHTML = workloadHtml;

      // Click to filter Kanban / Plans
      workloadContainer.querySelectorAll('.office-workload-row').forEach(row => {
        row.addEventListener('click', () => {
          const agName = row.getAttribute('data-agent');
          if (window.soundFx) window.soundFx.playClick();
          if (agName === 'HABIBIE') {
            if (typeof window.switchWorkspaceView === 'function') {
              window.switchWorkspaceView('plans');
            }
          } else {
            const fBtns = document.querySelectorAll('.filter-btn');
            fBtns.forEach(b => {
              if (b.getAttribute('data-assignee') === agName) {
                b.classList.add('neo-btn-primary');
                b.classList.remove('neo-btn-secondary');
              } else {
                b.classList.remove('neo-btn-primary');
                b.classList.add('neo-btn-secondary');
              }
            });
            if (window.kanban) window.kanban.setFilter(agName);
            if (typeof window.switchWorkspaceView === 'function') {
              window.switchWorkspaceView('kanban');
            }
          }
        });
      });
    }

    // 4. Panel 2: Sprint Pipeline Flow
    if (pipelineTotalBadge) {
      pipelineTotalBadge.textContent = isId ? `${total} Tugas` : `${total} Tasks`;
    }
    const todoPct = total > 0 ? (todoTasks.length / total) * 100 : 0;
    const inProgPct = total > 0 ? (inProgressTasks.length / total) * 100 : 0;
    const qaPct = total > 0 ? (qaTasks.length / total) * 100 : 0;
    const donePct = total > 0 ? (doneTasks.length / total) * 100 : 0;

    const segTodo = document.getElementById('segTodo');
    const segProgress = document.getElementById('segProgress');
    const segQa = document.getElementById('segQa');
    const segDone = document.getElementById('segDone');

    if (segTodo) segTodo.style.width = `${todoPct}%`;
    if (segProgress) segProgress.style.width = `${inProgPct}%`;
    if (segQa) segQa.style.width = `${qaPct}%`;
    if (segDone) segDone.style.width = `${donePct}%`;

    if (pipelineList) {
      const stages = [
        { key: 'To-Do', label: isId ? 'To-Do (Antrean)' : 'To-Do (Backlog)', count: todoTasks.length, pct: Math.round(todoPct), color: '#94A3B8' },
        { key: 'In-Progress', label: isId ? 'In-Progress (Pengerjaan)' : 'In-Progress (Dev)', count: inProgressTasks.length, pct: Math.round(inProgPct), color: '#F59E0B' },
        { key: 'QA-Review', label: isId ? 'QA-Review (Audit GIBRAN)' : 'QA-Review (QA Audit)', count: qaTasks.length, pct: Math.round(qaPct), color: '#8B5CF6' },
        { key: 'Done', label: isId ? 'Done (Selesai & Lulus)' : 'Done (Completed)', count: doneTasks.length, pct: Math.round(donePct), color: '#10B981' }
      ];

      let pipelineHtml = '';
      stages.forEach(st => {
        pipelineHtml += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 4px 6px; border-radius: 4px; background: var(--bg-main); border: 1px solid var(--border-color);">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${st.color};"></span>
              <span style="font-weight:700;">${st.label}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:800; font-family:var(--font-mono);">${st.count}</span>
              <span style="font-size:0.68rem; color:#64748B;">(${st.pct}%)</span>
            </div>
          </div>
        `;
      });
      pipelineList.innerHTML = pipelineHtml;
    }

    // 5. Panel 3: Active Projects & Blueprints
    if (projectsContainer) {
      const projectStats = {};
      tasks.forEach(t => {
        const p = (t.project || 'general').toLowerCase();
        if (!projectStats[p]) projectStats[p] = { total: 0, done: 0, active: 0 };
        projectStats[p].total++;
        if (getStatus(t) === 'Done') projectStats[p].done++;
        else projectStats[p].active++;
      });

      let projHtml = '';
      for (const [pName, pData] of Object.entries(projectStats)) {
        const rate = pData.total > 0 ? Math.round((pData.done / pData.total) * 100) : 0;
        projHtml += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 5px 8px; border-radius: 4px; background: var(--bg-main); border: 1px solid var(--border-color);">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="neo-badge" style="font-size:0.68rem; font-weight:800; background:var(--bg-card);">${escapeHtml(pName)}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px; font-size:0.72rem;">
              <span style="color:#10B981; font-weight:700;">${pData.done} ${isId ? 'Selesai' : 'Done'}</span>
              <span style="color:#F59E0B; font-weight:700;">${pData.active} ${isId ? 'Aktif' : 'Active'}</span>
              <span style="font-weight:800; font-family:var(--font-mono);">(${rate}%)</span>
            </div>
          </div>
        `;
      }
      projectsContainer.innerHTML = projHtml || `<div style="color:#64748B; font-size:0.75rem;">${isId ? 'Belum ada proyek tercatat' : 'No projects recorded'}</div>`;
    }

    // 6. Habibie Blueprints Mini Stat
    if (plansMiniStat) {
      const loadedStudioPlans = window.OfficePlans ? window.OfficePlans.getPlans() : (window.loadedStudioPlans || []);
      const blueprintsCount = Array.isArray(loadedStudioPlans) ? loadedStudioPlans.length : 0;
      const dispatched = Array.isArray(loadedStudioPlans) ? loadedStudioPlans.filter(p => p.status === 'dispatched').length : 0;
      plansMiniStat.textContent = isId
        ? `${blueprintsCount} Total • ${dispatched} di Kanban`
        : `${blueprintsCount} Total • ${dispatched} in Kanban`;
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function init() {
    section = document.getElementById('officeInsightsSection');
    openKanbanBtn = document.getElementById('officeInsightsOpenKanbanBtn');
    openStudioBtn = document.getElementById('officeInsightsOpenStudioBtn');
    refreshBtn = document.getElementById('officeInsightsRefreshBtn');
    statTotalTasks = document.getElementById('officeStatTotalTasks');
    statActiveTasks = document.getElementById('officeStatActiveTasks');
    statActiveDetail = document.getElementById('officeStatActiveDetail');
    statDoneTasks = document.getElementById('officeStatDoneTasks');
    statDoneRate = document.getElementById('officeStatDoneRate');
    statDoneRateBar = document.getElementById('officeStatDoneRateBar');
    statCycleTime = document.getElementById('officeStatCycleTime');
    workloadContainer = document.getElementById('officeWorkloadContainer');
    pipelineTotalBadge = document.getElementById('officePipelineTotalBadge');
    pipelineList = document.getElementById('officePipelineList');
    projectsContainer = document.getElementById('officeProjectsContainer');
    plansMiniStat = document.getElementById('officePlansMiniStat');

    if (openKanbanBtn) {
      openKanbanBtn.addEventListener('click', () => {
        if (typeof window.switchWorkspaceView === 'function') {
          window.switchWorkspaceView('kanban');
        }
      });
    }

    if (openStudioBtn) {
      openStudioBtn.addEventListener('click', () => {
        if (typeof window.switchWorkspaceView === 'function') {
          window.switchWorkspaceView('plans');
        }
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        if (window.soundFx) window.soundFx.playClick();
        fetch('/api/sync')
          .then(res => res.json())
          .then(data => {
            if (data && data.kanban && Array.isArray(data.kanban.tasks)) {
              if (window.kanban) window.kanban.setTasks(data.kanban.tasks);
            }
            if (data && data.agents && typeof window.updateAgentCards === 'function') {
              window.updateAgentCards(data.agents);
            }
            update();
          })
          .catch(err => console.error('Error refreshing insights:', err));
      });
    }
  }

  return {
    init,
    update
  };
})();

// Backward compatibility alias
window.updateOfficeLiveInsights = function(taskList) {
  if (window.OfficeInsights) {
    window.OfficeInsights.update(taskList);
  }
};
