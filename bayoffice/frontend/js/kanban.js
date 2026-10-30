/**
 * BayOffice - Interactive Kanban Board Component
 * Design Standards: Zero Emoji, Anti AI Slop, High-Contrast Neubrutalism
 */

class KanbanBoard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.tasks = [];
    this.selectedAssignee = 'ALL';
    this.selectedProject = 'ALL';
    this.selectedPeriod = 'THIS_MONTH';
    this.customStartDate = null;
    this.customEndDate = null;
    this.searchQuery = '';
    
    this.columns = [
      { key: 'To-Do', label: 'To-Do', icon: '<i data-lucide="circle-dashed" class="lucide-sm"></i>', badgeClass: 'badge-todo' },
      { key: 'In-Progress', label: 'In-Progress', icon: '<i data-lucide="play-circle" class="lucide-sm"></i>', badgeClass: 'badge-progress' },
      { key: 'QA-Review', label: 'QA-Review', icon: '<i data-lucide="shield-check" class="lucide-sm"></i>', badgeClass: 'badge-qa' },
      { key: 'Done', label: 'Done', icon: '<i data-lucide="check-circle-2" class="lucide-sm"></i>', badgeClass: 'badge-done' }
    ];

    if (this.container) {
      this.container.addEventListener('click', (e) => {
        const card = e.target.closest('.kanban-task-card');
        if (card) {
          const taskId = card.getAttribute('data-task-id');
          const task = this.tasks.find(t => t && t.id === taskId);
          if (task && typeof window.openTaskDetail === 'function') {
            window.openTaskDetail(task);
          }
        }
      });
    }
  }

  setTasks(tasks) {
    this.tasks = tasks || [];
    this.render();
    if (typeof window.updateOfficeLiveInsights === 'function') {
      window.updateOfficeLiveInsights(this.tasks);
    }
  }

  setFilter(assignee) {
    this.selectedAssignee = assignee;
    this.render();
  }

  setProjectFilter(project) {
    this.selectedProject = project;
    this.render();
  }

  setPeriodFilter(period) {
    this.selectedPeriod = period || 'THIS_MONTH';
    this.render();
  }

  setCustomDateRange(startDate, endDate) {
    this.customStartDate = startDate || null;
    this.customEndDate = endDate || null;
    this.render();
  }

  getTaskDate(task) {
    if (!task) return null;
    const raw = task.created_at || task.started_at || task.completed_at;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
    // Fallback for legacy sprint tasks created before timestamp logging
    return new Date('2026-10-25T08:00:00+07:00');
  }

  isTaskInPeriod(task) {
    if (this.selectedPeriod === 'ALL') return true;

    const taskDate = this.getTaskDate(task);
    if (!taskDate) return true;

    const now = new Date();

    if (this.selectedPeriod === 'THIS_MONTH') {
      return taskDate.getFullYear() === now.getFullYear() &&
             taskDate.getMonth() === now.getMonth();
    }

    if (this.selectedPeriod === 'TODAY') {
      return taskDate.getFullYear() === now.getFullYear() &&
             taskDate.getMonth() === now.getMonth() &&
             taskDate.getDate() === now.getDate();
    }

    if (this.selectedPeriod === 'THIS_WEEK') {
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return taskDate >= startOfWeek && taskDate <= endOfWeek;
    }

    if (this.selectedPeriod === 'LAST_MONTH') {
      const prevMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      return taskDate.getFullYear() === prevMonthYear &&
             taskDate.getMonth() === prevMonth;
    }

    if (this.selectedPeriod === 'CUSTOM') {
      if (this.customStartDate) {
        const start = new Date(this.customStartDate);
        start.setHours(0, 0, 0, 0);
        if (taskDate < start) return false;
      }
      if (this.customEndDate) {
        const end = new Date(this.customEndDate);
        end.setHours(23, 59, 59, 999);
        if (taskDate > end) return false;
      }
      return true;
    }

    return true;
  }

  setSearch(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.render();
  }

  getFilteredTasks() {
    return this.tasks.filter(t => {
      if (!t || typeof t !== 'object') return false;
      
      // Filter assignee
      if (this.selectedAssignee !== 'ALL') {
        const a = (t.assignee || '').toUpperCase();
        if (a !== this.selectedAssignee) return false;
      }

      // Filter project
      if (this.selectedProject !== 'ALL') {
        const p = (t.project || 'infobay').toLowerCase();
        if (p !== this.selectedProject.toLowerCase()) return false;
      }

      // Filter date period (Default: THIS_MONTH)
      if (!this.isTaskInPeriod(t)) {
        return false;
      }

      // Filter search
      if (this.searchQuery) {
        const id = (t.id || '').toLowerCase();
        const title = (t.title || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const notes = (t.notes || '').toLowerCase();
        const match = id.includes(this.searchQuery) || 
                      title.includes(this.searchQuery) || 
                      desc.includes(this.searchQuery) || 
                      notes.includes(this.searchQuery);
        if (!match) return false;
      }

      return true;
    });
  }

  normalizeStatus(statusStr) {
    const s = String(statusStr || '').toLowerCase().trim();
    if (s.includes('done') || s.includes('selesai') || s.includes('passed')) return 'Done';
    if (s.includes('qa') || s.includes('review') || s.includes('audit')) return 'QA-Review';
    if (s.includes('progress') || s.includes('working') || s.includes('jalan')) return 'In-Progress';
    return 'To-Do';
  }

  getAssigneeBadgeClass(assignee) {
    const a = String(assignee || '').toUpperCase();
    if (a === 'LUHUT') return 'badge-luhut';
    if (a === 'JOKOWI') return 'badge-jokowi';
    if (a === 'PRABOWO') return 'badge-prabowo';
    if (a === 'GIBRAN') return 'badge-gibran';
    if (a === 'HABIBIE') return 'badge-habibie';
    return 'badge-todo';
  }

  render() {
    if (!this.container) return;

    const filtered = this.getFilteredTasks();
    const grouped = {
      'To-Do': [],
      'In-Progress': [],
      'QA-Review': [],
      'Done': []
    };

    filtered.forEach(task => {
      const norm = this.normalizeStatus(task.status);
      grouped[norm].push(task);
    });

    let html = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 18px;">
    `;

    this.columns.forEach(col => {
      const colTasks = grouped[col.key] || [];
      if (col.key === 'Done') {
        colTasks.reverse();
      }

      const colKey = col.key === 'To-Do' ? 'todo' : col.key === 'In-Progress' ? 'progress' : col.key === 'QA-Review' ? 'qa' : 'done';
      const colTitle = window.I18n ? window.I18n.t(`kanban.col_${colKey}`) : col.label;

      html += `
        <div class="neo-box kanban-col-box" style="padding: 16px; display: flex; flex-direction: column; max-height: 680px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px dashed var(--border-color);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: flex; align-items: center;">${col.icon}</span>
              <span style="font-weight: 800; font-size: 0.95rem; text-transform: uppercase;">${colTitle}</span>
            </div>
            <span class="neo-badge ${col.badgeClass}" style="font-size: 0.8rem;">${colTasks.length}</span>
          </div>

          <div style="overflow-y: auto; flex: 1; padding-right: 4px; display: flex; flex-direction: column; gap: 12px;">
      `;

      if (colTasks.length === 0) {
        const emptyLabel = window.I18n ? window.I18n.t('kanban.no_tasks') : 'No tasks';
        html += `
          <div style="text-align: center; padding: 32px 16px; color: #94A3B8; font-size: 0.85rem; font-weight: 600;">
            ${emptyLabel}
          </div>
        `;
      } else {
        const isId = (window.I18n && window.I18n.getLanguage() === 'id');
        const cardTitleHint = window.I18n ? window.I18n.t('kanban.card_click_hint') : 'Click to view full details';
        colTasks.forEach(task => {
          const assigneeClass = this.getAssigneeBadgeClass(task.assignee);
          const notesText = task.notes ? `<div class="kanban-task-notes" style="margin-top: 8px; font-size: 0.78rem; padding: 6px 8px; border-radius: 4px; border-left: 3px solid var(--border-color); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${this.escapeHtml(task.notes)}</div>` : '';
          const timeText = task.started_at || task.created_at || task.completed_at || '';
          let displayTime = '';
          if (timeText) {
            const tDate = new Date(timeText);
            if (!isNaN(tDate.getTime())) {
              const isToday = tDate.toDateString() === new Date().toDateString();
              if (isToday) {
                displayTime = tDate.toLocaleTimeString(isId ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' }) + (isId ? ' WIB' : '');
              } else {
                displayTime = tDate.toLocaleDateString(isId ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric' }) + ' ' +
                              tDate.toLocaleTimeString(isId ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' });
              }
            }
          }

          html += `
            <div class="neo-box-sm kanban-task-card" data-task-id="${this.escapeHtml(task.id)}" style="padding: 12px; cursor: pointer;" title="${cardTitleHint}">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="display: flex; gap: 4px; align-items: center;">
                  <span class="neo-badge badge-task-id" style="font-size: 0.7rem;">${task.id || 'TASK'}</span>
                  ${task.project ? `<span class="neo-badge badge-project" style="font-size: 0.65rem;">${(task.project === 'none' || task.project === 'general') ? '🌐 Umum' : this.escapeHtml(task.project)}</span>` : ''}
                </div>
                <span class="neo-badge ${assigneeClass}" style="font-size: 0.7rem;">${task.assignee || 'AGENT'}</span>
              </div>
              <h4 style="font-weight: 700; font-size: 0.9rem; line-height: 1.35; margin-bottom: 6px;">
                ${this.escapeHtml(task.title || 'Untitled Task')}
              </h4>
              ${notesText}
              <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: #94A3B8; font-weight: 600;">
                <span style="display: flex; align-items: center; gap: 4px;">
                  <i data-lucide="folder" class="lucide-sm"></i>
                  ${task.target_dir ? task.target_dir.replace('/home/bay', '~') : ''}
                </span>
                <span style="display: flex; align-items: center; gap: 4px;">
                  <i data-lucide="clock" class="lucide-sm"></i>
                  ${displayTime}
                </span>
              </div>
            </div>
          `;
        });
      }

      html += `
          </div>
        </div>
      `;
    });

    html += `</div>`;
    this.container.innerHTML = html;

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.KanbanBoard = KanbanBoard;
