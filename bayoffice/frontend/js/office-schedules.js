/**
 * BayOffice - Scheduled Tasks & Automation Manager Module
 * Menangani otomasi berbasis waktu: Cron, Interval, Once-off, Trigger instan, dan Pemantauan Worker.
 */

window.OfficeSchedules = (function () {
  let openSchedulesBtn;
  let kanbanSchedulesBtn;
  let schedulesModal;
  let closeSchedulesModalBtn;
  let schedulerWorkerBadge;
  let statTotalSchedules;
  let statActiveSchedules;
  let statNextRunSched;
  let toggleNewScheduleBtn;
  let toggleNewScheduleText;
  let refreshSchedulesBtn;
  let newScheduleFormContainer;
  let newScheduleForm;
  let schedTitle;
  let schedInstruction;
  let schedProject;
  let schedCategory;
  let schedEngine;
  let schedTypeBtns;
  let cronTypeField;
  let schedCronExpr;
  let schedPresetBtns;
  let intervalTypeField;
  let schedIntervalMin;
  let onceTypeField;
  let schedRunAt;
  let cancelNewScheduleBtn;
  let submitScheduleBtn;
  let schedulesListContainer;
  let currentScheduleType = 'cron';

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
        const isId = (window.I18n && window.I18n.currentLocale === 'id');
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
      schedulesListContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#EF4444; font-weight:700;">Error: ${escapeHtml(err.message)}</div>`;
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

    const isId = (window.I18n && window.I18n.currentLocale === 'id');
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
            <span class="neo-badge" style="background:var(--bg-main); font-weight:700;">Project: ${escapeHtml(s.project || 'bayoffice')}</span>
            <span class="neo-badge" style="background:var(--bg-main); font-weight:700;">Category: ${escapeHtml(s.category || 'auto')}</span>
            <span class="neo-badge" style="background:var(--bg-main); font-weight:700;">Engine: ${escapeHtml(s.engine || 'agy')}</span>
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
        if (window.soundFx) window.soundFx.playClick();

        try {
          const res = await fetch(`/api/schedules/${id}/run`, { method: 'POST' });
          const resJson = await res.json();
          if (res.ok && resJson.success) {
            if (window.soundFx) window.soundFx.playSuccess();
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
        if (window.soundFx) window.soundFx.playClick();

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
        if (window.soundFx) window.soundFx.playClick();

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

  function openModal() {
    if (!schedulesModal) return;
    if (window.soundFx) window.soundFx.playClick();
    schedulesModal.classList.add('active');
    fetchSchedules(true);
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function closeModal() {
    if (!schedulesModal) return;
    schedulesModal.classList.remove('active');
    if (newScheduleFormContainer) newScheduleFormContainer.style.display = 'none';
  }

  function init() {
    openSchedulesBtn = document.getElementById('openSchedulesBtn');
    kanbanSchedulesBtn = document.getElementById('kanbanSchedulesBtn');
    schedulesModal = document.getElementById('schedulesModal');
    closeSchedulesModalBtn = document.getElementById('closeSchedulesModalBtn');
    schedulerWorkerBadge = document.getElementById('schedulerWorkerBadge');
    statTotalSchedules = document.getElementById('statTotalSchedules');
    statActiveSchedules = document.getElementById('statActiveSchedules');
    statNextRunSched = document.getElementById('statNextRunSched');
    toggleNewScheduleBtn = document.getElementById('toggleNewScheduleBtn');
    toggleNewScheduleText = document.getElementById('toggleNewScheduleText');
    refreshSchedulesBtn = document.getElementById('refreshSchedulesBtn');
    newScheduleFormContainer = document.getElementById('newScheduleFormContainer');
    newScheduleForm = document.getElementById('newScheduleForm');
    schedTitle = document.getElementById('schedTitle');
    schedInstruction = document.getElementById('schedInstruction');
    schedProject = document.getElementById('schedProject');
    schedCategory = document.getElementById('schedCategory');
    schedEngine = document.getElementById('schedEngine');
    schedTypeBtns = document.querySelectorAll('.sched-type-btn');
    cronTypeField = document.getElementById('cronTypeField');
    schedCronExpr = document.getElementById('schedCronExpr');
    schedPresetBtns = document.querySelectorAll('.sched-preset-btn');
    intervalTypeField = document.getElementById('intervalTypeField');
    schedIntervalMin = document.getElementById('schedIntervalMin');
    onceTypeField = document.getElementById('onceTypeField');
    schedRunAt = document.getElementById('schedRunAt');
    cancelNewScheduleBtn = document.getElementById('cancelNewScheduleBtn');
    submitScheduleBtn = document.getElementById('submitScheduleBtn');
    schedulesListContainer = document.getElementById('schedulesListContainer');

    if (openSchedulesBtn) {
      openSchedulesBtn.addEventListener('click', openModal);
    }

    if (kanbanSchedulesBtn) {
      kanbanSchedulesBtn.addEventListener('click', openModal);
    }

    if (closeSchedulesModalBtn) {
      closeSchedulesModalBtn.addEventListener('click', closeModal);
    }

    if (refreshSchedulesBtn) {
      refreshSchedulesBtn.addEventListener('click', () => {
        if (window.soundFx) window.soundFx.playClick();
        fetchSchedules(true);
      });
    }

    if (schedulesModal) {
      schedulesModal.addEventListener('click', (e) => {
        if (e.target === schedulesModal) closeModal();
      });
    }

    // Toggle New Schedule Form
    if (toggleNewScheduleBtn) {
      toggleNewScheduleBtn.addEventListener('click', () => {
        if (window.soundFx) window.soundFx.playClick();
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
        if (window.soundFx) window.soundFx.playClick();

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
          if (window.soundFx) window.soundFx.playClick();
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
        if (window.soundFx) window.soundFx.playClick();

        try {
          const res = await fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const resJson = await res.json();
          if (res.ok && resJson.success) {
            if (window.soundFx) window.soundFx.playSuccess();
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
  }

  return {
    init,
    openModal,
    closeModal,
    fetchSchedules,
    updateSummaryUI: updateSchedulesSummaryUI
  };
})();
