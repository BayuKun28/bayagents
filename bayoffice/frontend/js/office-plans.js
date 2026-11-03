/**
 * BayOffice - Dedicated Plans Studio & Architectural Blueprints Module
 * Menangani Habibie Plans Studio: Markdown parsing, Blueprint generation, Dispatching ke Kanban, dan Penyaringan.
 */

window.OfficePlans = (function () {
  let plansStudioView;
  let studioPlansListContainer;
  let navPlansCountBadge;
  let studioStatBadge;
  let studioViewerHeader;
  let studioViewerPlanId;
  let studioViewerPlanProject;
  let studioViewerPlanStatus;
  let studioViewerPlanDate;
  let studioViewerPlanTitle;
  let studioViewerContent;
  let studioDispatchPlanBtn;
  let studioCopyPlanBtn;
  let studioDeletePlanBtn;
  let studioNewPlanFormContainer;
  let studioToggleNewPlanBtn;
  let studioToggleNewPlanText;
  let studioPlanIdeaInput;
  let studioPlanProjectSelect;
  let studioCustomProjectContainer;
  let studioCustomProjectInput;
  let studioPlanEngineSelect;
  let studioAgyModelContainer;
  let studioPlanAgyModel;
  let studioViewerPlanModel;
  let studioSubmitPlanBtn;
  let studioSubmitPlanBtnText;
  let studioSearchInput;
  let studioProjectSelect;
  let studioPeriodSelect;
  let studioRefreshBtn;
  let studioDraftingBanner;
  let studioDraftingModelBadge;
  let studioDraftingProjectText;
  let studioDraftingIdeaPreview;
  let studioDraftingTimer;
  let studioRevisePlanBtn;
  let studioReviseModal;
  let closeStudioReviseModalBtn;
  let cancelStudioReviseModalBtn;
  let studioReviseForm;
  let studioReviseTargetTitle;
  let studioReviseFeedbackInput;
  let studioReviseEngineSelect;
  let studioReviseModelSelect;
  let submitStudioReviseBtn;
  let submitStudioReviseBtnText;

  let activeDraftingJob = null;
  let draftingTimerInterval = null;
  let draftingPollInterval = null;

  let loadedStudioPlans = [];
  let currentSelectedStudioPlan = null;
  let currentStudioProject = 'ALL';
  let currentStudioPeriod = 'ALL';
  let studioSearchQuery = '';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Markdown Parser Engine
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

  function isPlanInPeriod(plan, period) {
    if (!period || period === 'ALL') return true;
    if (!plan || !plan.created_at) return true;
    const planDate = new Date(plan.created_at);
    if (isNaN(planDate.getTime())) return true;
    const now = new Date();

    if (period === 'THIS_MONTH') {
      return planDate.getFullYear() === now.getFullYear() && planDate.getMonth() === now.getMonth();
    }
    if (period === 'TODAY') {
      return planDate.getFullYear() === now.getFullYear() && planDate.getMonth() === now.getMonth() && planDate.getDate() === now.getDate();
    }
    if (period === 'THIS_WEEK') {
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return planDate >= startOfWeek && planDate <= endOfWeek;
    }
    if (period === 'LAST_MONTH') {
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      return planDate.getFullYear() === lastMonthYear && planDate.getMonth() === lastMonth;
    }
    return true;
  }

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
        const isId = (window.I18n && window.I18n.currentLocale === 'id');
        studioStatBadge.innerHTML = isId
          ? `<span style="color: #8B5CF6; font-weight: 800;">Total: ${total}</span> <span style="opacity: 0.4;">•</span> <span style="color: #0284C7; font-weight: 800;">Draf: ${drafts}</span> <span style="opacity: 0.4;">•</span> <span style="color: #10B981; font-weight: 800;">Kanban: ${dispatched}</span>`
          : `<span style="color: #8B5CF6; font-weight: 800;">Total Plans: ${total}</span> <span style="opacity: 0.4;">•</span> <span style="color: #0284C7; font-weight: 800;">Drafts: ${drafts}</span> <span style="opacity: 0.4;">•</span> <span style="color: #10B981; font-weight: 800;">Kanban: ${dispatched}</span>`;
      }

      renderStudioPlansList();

      if (window.OfficeInsights && typeof window.OfficeInsights.update === 'function') {
        window.OfficeInsights.update();
      }

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

    // Filter by project, period and search query
    let filtered = loadedStudioPlans.slice();
    if (currentStudioProject && currentStudioProject !== 'ALL') {
      filtered = filtered.filter(p => (p.project || '').toLowerCase() === currentStudioProject.toLowerCase());
    }
    if (currentStudioPeriod && currentStudioPeriod !== 'ALL') {
      filtered = filtered.filter(p => isPlanInPeriod(p, currentStudioPeriod));
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
            <span class="plan-id-text">${escapeHtml(p.id)}</span>
            <div style="display:flex; align-items:center; gap:4px;">
              <span class="neo-badge plan-badge-project" style="font-size:0.65rem;">${escapeHtml(p.project || 'general')}</span>
              <span class="neo-badge ${statusClass}" style="font-size:0.65rem;">${statusText}</span>
            </div>
          </div>
          <div class="plan-title-text" style="font-weight:700; font-size:0.86rem; line-height:1.25; margin-top:3px;">
            ${escapeHtml(p.title || p.id)}
          </div>
          <div class="plan-meta-text" style="display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; color:#64748B; margin-top:4px;">
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
        if (window.soundFx) window.soundFx.playClick();
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

      if (studioViewerPlanModel) {
        if (plan.model) {
          studioViewerPlanModel.style.display = 'inline-block';
          studioViewerPlanModel.textContent = plan.model;
        } else if (plan.engine) {
          studioViewerPlanModel.style.display = 'inline-block';
          studioViewerPlanModel.textContent = plan.engine.toUpperCase();
        } else {
          studioViewerPlanModel.style.display = 'none';
        }
      }

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

      if (studioRevisePlanBtn) {
        studioRevisePlanBtn.disabled = isDispatched;
        studioRevisePlanBtn.style.opacity = isDispatched ? '0.5' : '1';
        studioRevisePlanBtn.style.cursor = isDispatched ? 'not-allowed' : 'pointer';
        studioRevisePlanBtn.title = isDispatched
          ? 'Dokumen sudah didelegasikan ke Kanban.'
          : (window.I18n && window.I18n.currentLocale === 'id' ? 'Beri masukan, respon opsi, atau revisi dokumen ini ke Habibie' : "Provide feedback, answer options, or revise this plan with Habibie");
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

  // ==========================================================
  // HABIBIE ASYNC BACKGROUND DRAFTING & LIVE MONITORING
  // ==========================================================
  function showDraftingBanner(job) {
    if (!studioDraftingBanner) return;
    studioDraftingBanner.style.display = 'flex';

    if (studioDraftingProjectText) {
      studioDraftingProjectText.textContent = job.project || 'bayoffice';
    }
    if (studioDraftingIdeaPreview) {
      const rawIdea = job.idea || '';
      studioDraftingIdeaPreview.textContent = rawIdea.length > 60 ? (rawIdea.slice(0, 60) + '...') : rawIdea;
    }
    if (studioDraftingModelBadge) {
      const isAgy = (job.engine === 'agy');
      const modelLabel = isAgy ? `AGY • ${(job.model || 'flash').replace(/^gemini-3.8-/, '').replace(/-high/, ' (High)')}` : '9Router';
      studioDraftingModelBadge.textContent = modelLabel;
    }

    if (draftingTimerInterval) clearInterval(draftingTimerInterval);
    const startMs = job.started_at ? new Date(job.started_at).getTime() : Date.now();
    const updateTimer = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      if (studioDraftingTimer) studioDraftingTimer.textContent = `${m}:${s}`;
    };
    updateTimer();
    draftingTimerInterval = setInterval(updateTimer, 1000);

    if (studioToggleNewPlanText) {
      studioToggleNewPlanText.textContent = window.I18n ? window.I18n.t('plans.generating') : 'HABIBIE is Drafting Plan...';
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function hideDraftingBanner() {
    if (studioDraftingBanner) studioDraftingBanner.style.display = 'none';
    if (draftingTimerInterval) {
      clearInterval(draftingTimerInterval);
      draftingTimerInterval = null;
    }
    if (studioToggleNewPlanText) {
      studioToggleNewPlanText.textContent = window.I18n ? window.I18n.t('studio.new_plan_btn') : '+ Draft Architecture Plan';
    }
    if (studioSubmitPlanBtn) studioSubmitPlanBtn.disabled = false;
    if (studioSubmitPlanBtnText) {
      studioSubmitPlanBtnText.textContent = window.I18n ? window.I18n.t('plans.generate_btn') : 'Ask HABIBIE';
    }
  }

  function startDraftingMonitoring() {
    if (draftingPollInterval) clearInterval(draftingPollInterval);
    draftingPollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/plans/status');
        if (!res.ok) return;
        const data = await res.json();
        handlePlanJobSync(data);
      } catch (err) {
        // silent retry
      }
    }, 3000);
  }

  function stopDraftingMonitoring() {
    if (draftingPollInterval) {
      clearInterval(draftingPollInterval);
      draftingPollInterval = null;
    }
    if (draftingTimerInterval) {
      clearInterval(draftingTimerInterval);
      draftingTimerInterval = null;
    }
  }

  async function onDraftingCompleted(job) {
    hideDraftingBanner();
    stopDraftingMonitoring();

    if (window.soundFx) window.soundFx.playSuccess();

    // Reset status di backend
    fetch('/api/plans/clear-status', { method: 'POST' }).catch(() => {});

    // Reload project list jika ada custom project
    if (typeof window.loadProjects === 'function') {
      window.loadProjects();
    }

    // Refresh blueprints list
    await fetchStudioPlans(false);

    const newPlan = job.result ? (job.result.plan || job.result) : null;
    const newPlanId = newPlan ? newPlan.id : null;
    const planTitle = newPlan ? (newPlan.title || newPlanId) : 'New Blueprint';

    // Show floating toast notification
    if (window.showOfficeToast) {
      window.showOfficeToast({
        title: window.I18n ? window.I18n.t('plans.drafting_toast_done_title') : 'Implementation Plan Ready!',
        message: `HABIBIE: [${newPlanId || 'PLAN'}] "${planTitle}"`,
        type: 'success',
        icon: 'check-circle',
        actionText: window.I18n ? window.I18n.t('plans.drafting_toast_open_btn') : 'Open Blueprint',
        actionCallback: () => {
          const navPlansBtn = document.getElementById('navPlansBtn');
          if (navPlansBtn) navPlansBtn.click();
          if (newPlanId) selectStudioPlan(newPlanId);
        },
        duration: 12000
      });
    }

    // Browser Desktop Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Plan Studio - HABIBIE', {
          body: `Blueprint [${newPlanId || 'PLAN'}] "${planTitle}" selesai dirancang!`,
          icon: '/static/assets/avatars/habibie.jpg'
        });
      } catch (e) {}
    }

    // Auto-select and show
    if (newPlanId) {
      selectStudioPlan(newPlanId);
    }
  }

  function onDraftingFailed(job) {
    hideDraftingBanner();
    stopDraftingMonitoring();

    if (window.soundFx) window.soundFx.playError();
    fetch('/api/plans/clear-status', { method: 'POST' }).catch(() => {});

    if (window.showOfficeToast) {
      window.showOfficeToast({
        title: 'Drafting Plan Gagal',
        message: job.error || 'Terjadi kesalahan sistem saat menghubungi model AI.',
        type: 'error',
        icon: 'alert-triangle',
        duration: 8000
      });
    } else {
      alert(`Drafting Plan Gagal: ${job.error || 'Terjadi kesalahan'}`);
    }
  }

  function handlePlanJobSync(job) {
    if (!job) return;

    if (job.status === 'generating' || job.is_generating) {
      activeDraftingJob = job;
      showDraftingBanner(job);
      if (!draftingPollInterval) startDraftingMonitoring();

      // Sinkronisasi avatar HABIBIE di 3D Live Office saat status generating
      if (window.officeThree && window.officeThree.agents && window.officeThree.agents['HABIBIE']) {
        const ag = window.officeThree.agents['HABIBIE'];
        ag.state = 'working';
        ag.socialStatus = 'at_desk';
        ag.activePath = null;
        ag.targetX = ag.workPos.x;
        ag.targetZ = ag.workPos.z;
        ag.targetY = ag.workPos.y || 1.25;
        const rawIdea = job.idea || '';
        const draftingBubble = rawIdea ? `Merancang blueprint: ${rawIdea.slice(0, 32)}... 📐` : 'Merancang blueprint arsitektur... 📐';
        ag.bubble = draftingBubble;
        ag.deskBubble = draftingBubble;
        if (typeof window.officeThree.updateAgentBubble === 'function') {
          window.officeThree.updateAgentBubble('HABIBIE', draftingBubble);
        }
      }
    } else if (job.status === 'completed') {
      if (activeDraftingJob || job.result) {
        const completedJob = Object.assign({}, job);
        activeDraftingJob = null;
        onDraftingCompleted(completedJob);
      }
    } else if (job.status === 'failed') {
      if (activeDraftingJob) {
        const failedJob = Object.assign({}, job);
        activeDraftingJob = null;
        onDraftingFailed(failedJob);
      }
    } else if (job.status === 'idle') {
      if (activeDraftingJob) {
        activeDraftingJob = null;
        hideDraftingBanner();
        stopDraftingMonitoring();
      }
    }
  }

  function hideStudioNewPlanForm() {
    if (studioNewPlanFormContainer) studioNewPlanFormContainer.style.display = 'none';
    if (studioCustomProjectContainer) studioCustomProjectContainer.style.display = 'none';
    if (studioCustomProjectInput) studioCustomProjectInput.value = '';
    if (studioPlanProjectSelect && studioPlanProjectSelect.value === '__custom__') {
      studioPlanProjectSelect.value = studioPlanProjectSelect.options[0]?.value || 'bayoffice';
    }
    if (studioPlanEngineSelect) {
      studioPlanEngineSelect.value = 'agy';
    }
    if (studioAgyModelContainer) {
      studioAgyModelContainer.style.display = 'block';
    }
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

  function init() {
    plansStudioView = document.getElementById('plansStudioView');
    studioPlansListContainer = document.getElementById('studioPlansListContainer');
    navPlansCountBadge = document.getElementById('navPlansCountBadge');
    studioStatBadge = document.getElementById('studioStatBadge');
    studioViewerHeader = document.getElementById('studioViewerHeader');
    studioViewerPlanId = document.getElementById('studioViewerPlanId');
    studioViewerPlanProject = document.getElementById('studioViewerPlanProject');
    studioViewerPlanStatus = document.getElementById('studioViewerPlanStatus');
    studioViewerPlanDate = document.getElementById('studioViewerPlanDate');
    studioViewerPlanTitle = document.getElementById('studioViewerPlanTitle');
    studioViewerContent = document.getElementById('studioViewerContent');
    studioDispatchPlanBtn = document.getElementById('studioDispatchPlanBtn');
    studioRevisePlanBtn = document.getElementById('studioRevisePlanBtn');
    studioReviseModal = document.getElementById('studioReviseModal');
    closeStudioReviseModalBtn = document.getElementById('closeStudioReviseModalBtn');
    cancelStudioReviseModalBtn = document.getElementById('cancelStudioReviseModalBtn');
    studioReviseForm = document.getElementById('studioReviseForm');
    studioReviseTargetTitle = document.getElementById('studioReviseTargetTitle');
    studioReviseFeedbackInput = document.getElementById('studioReviseFeedbackInput');
    studioReviseEngineSelect = document.getElementById('studioReviseEngineSelect');
    studioReviseModelSelect = document.getElementById('studioReviseModelSelect');
    submitStudioReviseBtn = document.getElementById('submitStudioReviseBtn');
    submitStudioReviseBtnText = document.getElementById('submitStudioReviseBtnText');
    studioCopyPlanBtn = document.getElementById('studioCopyPlanBtn');
    studioDeletePlanBtn = document.getElementById('studioDeletePlanBtn');
    studioNewPlanFormContainer = document.getElementById('studioNewPlanFormContainer');
    studioToggleNewPlanBtn = document.getElementById('studioToggleNewPlanBtn');
    studioToggleNewPlanText = document.getElementById('studioToggleNewPlanText');
    studioPlanIdeaInput = document.getElementById('studioPlanIdeaInput');
    studioPlanProjectSelect = document.getElementById('studioPlanProjectSelect');
    studioCustomProjectContainer = document.getElementById('studioCustomProjectContainer');
    studioCustomProjectInput = document.getElementById('studioCustomProjectInput');
    studioPlanEngineSelect = document.getElementById('studioPlanEngineSelect');
    studioAgyModelContainer = document.getElementById('studioAgyModelContainer');
    studioPlanAgyModel = document.getElementById('studioPlanAgyModel');
    studioViewerPlanModel = document.getElementById('studioViewerPlanModel');
    studioSubmitPlanBtn = document.getElementById('studioSubmitPlanBtn');
    studioSubmitPlanBtnText = document.getElementById('studioSubmitPlanBtnText');
    studioSearchInput = document.getElementById('studioSearchInput');
    studioProjectSelect = document.getElementById('studioProjectSelect');
    studioPeriodSelect = document.getElementById('studioPeriodSelect');
    studioRefreshBtn = document.getElementById('studioRefreshBtn');
    studioDraftingBanner = document.getElementById('studioDraftingBanner');
    studioDraftingModelBadge = document.getElementById('studioDraftingModelBadge');
    studioDraftingProjectText = document.getElementById('studioDraftingProjectText');
    studioDraftingIdeaPreview = document.getElementById('studioDraftingIdeaPreview');
    studioDraftingTimer = document.getElementById('studioDraftingTimer');

    // Request notification permission if supported
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission();
      } catch (e) {}
    }

    // Check background drafting status on load
    fetch('/api/plans/status')
      .then(r => r.ok ? r.json() : null)
      .then(st => {
        if (st && (st.status === 'generating' || st.is_generating)) {
          handlePlanJobSync(st);
        }
      })
      .catch(() => {});

    if (studioPeriodSelect) {
      currentStudioPeriod = studioPeriodSelect.value || 'ALL';
    }
    if (studioProjectSelect) {
      currentStudioProject = studioProjectSelect.value || 'ALL';
    }

    if (studioPlanProjectSelect) {
      studioPlanProjectSelect.addEventListener('change', () => {
        const isCustom = studioPlanProjectSelect.value === '__custom__';
        if (studioCustomProjectContainer) {
          studioCustomProjectContainer.style.display = isCustom ? 'block' : 'none';
        }
        if (isCustom && studioCustomProjectInput) {
          studioCustomProjectInput.focus();
        }
      });
    }

    if (studioPlanEngineSelect) {
      studioPlanEngineSelect.addEventListener('change', () => {
        const isAgy = studioPlanEngineSelect.value === 'agy';
        if (studioAgyModelContainer) {
          studioAgyModelContainer.style.display = isAgy ? 'block' : 'none';
        }
      });
    }

    // Toggle Form button
    if (studioToggleNewPlanBtn) {
      studioToggleNewPlanBtn.addEventListener('click', () => {
        if (window.soundFx) window.soundFx.playClick();
        if (activeDraftingJob) {
          if (window.showOfficeToast) {
            window.showOfficeToast({
              title: 'Drafting in Progress',
              message: 'HABIBIE saat ini sedang merancang plan di latar belakang. Silakan tunggu hingga selesai.',
              type: 'info',
              icon: 'loader',
              duration: 4000
            });
          } else {
            alert('HABIBIE saat ini sedang merancang plan di latar belakang. Silakan tunggu hingga selesai.');
          }
          return;
        }
        if (!studioNewPlanFormContainer) return;
        const isVisible = studioNewPlanFormContainer.style.display === 'flex' || studioNewPlanFormContainer.style.display === 'block';
        if (isVisible) {
          hideStudioNewPlanForm();
        } else {
          showStudioNewPlanForm();
        }
      });
    }

    const cancelBtn1 = document.getElementById('studioCancelNewPlanBtn');
    const cancelBtn2 = document.getElementById('studioCancelNewPlanBtn2');
    [cancelBtn1, cancelBtn2].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          if (window.soundFx) window.soundFx.playClick();
          hideStudioNewPlanForm();
        });
      }
    });

    const form = document.getElementById('studioNewPlanForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idea = studioPlanIdeaInput ? studioPlanIdeaInput.value.trim() : '';
        let project = studioPlanProjectSelect ? studioPlanProjectSelect.value : 'infobay';
        const engine = studioPlanEngineSelect ? studioPlanEngineSelect.value : 'agy';
        const model = (engine === 'agy' && studioPlanAgyModel) ? studioPlanAgyModel.value : null;

        if (!idea) return;

        if (project === '__custom__') {
          const customProject = studioCustomProjectInput ? studioCustomProjectInput.value.trim().toLowerCase().replace(/\s+/g, '-') : '';
          if (!customProject) {
            alert(window.I18n ? window.I18n.t('modal_task.project_custom_placeholder') : 'Please enter a valid project name.');
            if (studioCustomProjectInput) studioCustomProjectInput.focus();
            return;
          }
          project = customProject;
        }

        if (activeDraftingJob) {
          alert('HABIBIE saat ini sedang merancang plan lain di latar belakang. Silakan tunggu hingga selesai.');
          return;
        }

        if (window.soundFx) window.soundFx.playClick();

        // 1. Segera tutup formulir agar user dapat beralih ke Kanban / Live Office
        form.reset();
        hideStudioNewPlanForm();

        // Optimistic locking avatar HABIBIE di 3D Live Office (Drafting Desk)
        if (window.officeThree && window.officeThree.agents && window.officeThree.agents['HABIBIE']) {
          const ag = window.officeThree.agents['HABIBIE'];
          ag.state = 'working';
          ag.socialStatus = 'at_desk';
          ag.activePath = null;
          ag.targetX = ag.workPos.x;
          ag.targetZ = ag.workPos.z;
          ag.targetY = ag.workPos.y || 1.25;
          const draftingBubble = `Merancang blueprint arsitektur: ${idea.slice(0, 32)}... 📐`;
          ag.bubble = draftingBubble;
          ag.deskBubble = draftingBubble;
          if (typeof window.officeThree.updateAgentBubble === 'function') {
            window.officeThree.updateAgentBubble('HABIBIE', draftingBubble);
          }
        }

        // 2. Tampilkan status sedang dibuat di bagian atas
        showDraftingBanner({
          idea,
          project,
          engine,
          model,
          started_at: new Date().toISOString()
        });

        // 3. Kirim ke API background generator secara asinkron
        try {
          const res = await fetch('/api/plans/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea, project, engine, model, background: true })
          });

          const text = await res.text();
          let resJson;
          try {
            resJson = JSON.parse(text);
          } catch (jsonErr) {
            throw new Error(`Server returned non-JSON response (HTTP ${res.status}): ${text.slice(0, 100)}`);
          }

          if (!res.ok || !resJson.success) {
            throw new Error(resJson.error || resJson.detail || 'Gagal memulai perancangan plan');
          }

          activeDraftingJob = {
            idea,
            project,
            engine,
            model,
            started_at: resJson.started_at || new Date().toISOString(),
            status: 'generating'
          };

          startDraftingMonitoring();

          if (window.showOfficeToast) {
            window.showOfficeToast({
              title: window.I18n ? window.I18n.t('plans.drafting_toast_started_title') : 'HABIBIE Drafting in Background',
              message: window.I18n ? window.I18n.t('plans.drafting_toast_started_msg') : 'Architecture blueprint is being formulated. You can freely switch to Live Office or Kanban.',
              type: 'info',
              icon: 'compass',
              duration: 6000
            });
          }
        } catch (err) {
          hideDraftingBanner();
          if (window.soundFx) window.soundFx.playError();
          alert(`Gagal merancang plan: ${err.message}`);
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
        if (window.soundFx) window.soundFx.playClick();

        try {
          const res = await fetch(`/api/plans/${currentSelectedStudioPlan.id}/dispatch`, {
            method: 'POST'
          });
          const resJson = await res.json();
          if (res.ok && resJson.success) {
            if (window.soundFx) window.soundFx.playSuccess();
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

    // Revise / Respond Plan Dialog & Submission
    if (studioRevisePlanBtn) {
      studioRevisePlanBtn.addEventListener('click', () => {
        if (!currentSelectedStudioPlan) return;
        if (studioReviseTargetTitle) {
          studioReviseTargetTitle.textContent = `[${currentSelectedStudioPlan.id}] ${currentSelectedStudioPlan.title || ''}`;
        }
        if (studioReviseFeedbackInput) {
          studioReviseFeedbackInput.value = '';
        }
        if (studioReviseEngineSelect) {
          studioReviseEngineSelect.value = currentSelectedStudioPlan.engine || 'agy';
        }
        if (studioReviseModelSelect && currentSelectedStudioPlan.model) {
          studioReviseModelSelect.value = currentSelectedStudioPlan.model;
        }
        if (studioReviseModal) {
          studioReviseModal.style.display = 'flex';
          setTimeout(() => {
            if (studioReviseFeedbackInput) studioReviseFeedbackInput.focus();
          }, 60);
        }
        if (window.soundFx) window.soundFx.playClick();
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
      });
    }

    const closeReviseModal = () => {
      if (studioReviseModal) studioReviseModal.style.display = 'none';
    };

    if (closeStudioReviseModalBtn) {
      closeStudioReviseModalBtn.addEventListener('click', closeReviseModal);
    }
    if (cancelStudioReviseModalBtn) {
      cancelStudioReviseModalBtn.addEventListener('click', closeReviseModal);
    }
    if (studioReviseModal) {
      studioReviseModal.addEventListener('click', (e) => {
        if (e.target === studioReviseModal) closeReviseModal();
      });
    }

    if (studioReviseForm) {
      studioReviseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentSelectedStudioPlan) return;
        const feedback = (studioReviseFeedbackInput ? studioReviseFeedbackInput.value : '').trim();
        if (!feedback) {
          alert('Harap masukkan catatan atau masukan revisi untuk Habibie.');
          return;
        }

        const engine = studioReviseEngineSelect ? studioReviseEngineSelect.value : 'agy';
        const model = studioReviseModelSelect ? studioReviseModelSelect.value : null;

        if (submitStudioReviseBtn) submitStudioReviseBtn.disabled = true;
        const origSubmitText = submitStudioReviseBtnText ? submitStudioReviseBtnText.textContent : 'Sempurnakan Rencana';
        if (submitStudioReviseBtnText) {
          submitStudioReviseBtnText.textContent = window.I18n ? window.I18n.t('plans.revising') : 'HABIBIE is Refining Plan...';
        }
        if (window.soundFx) window.soundFx.playClick();

        try {
          const res = await fetch(`/api/plans/${currentSelectedStudioPlan.id}/revise`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback, engine, model })
          });
          const resJson = await res.json();
          if (res.ok && resJson.success) {
            closeReviseModal();
            if (window.soundFx) window.soundFx.playSuccess();
            const successMsg = window.I18n
              ? window.I18n.t('plans.revise_success', { planId: currentSelectedStudioPlan.id })
              : `Plan ${currentSelectedStudioPlan.id} was refined successfully!`;
            alert(successMsg);
            await fetchStudioPlans(false);
            selectStudioPlan(currentSelectedStudioPlan.id);
          } else {
            alert(`Gagal merevisi plan: ${resJson.error || resJson.detail || 'Terjadi kesalahan sistem'}`);
          }
        } catch (err) {
          alert(`Error: ${err.message}`);
        } finally {
          if (submitStudioReviseBtn) submitStudioReviseBtn.disabled = false;
          if (submitStudioReviseBtnText) submitStudioReviseBtnText.textContent = origSubmitText;
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
          if (window.soundFx) window.soundFx.playSuccess();
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
        if (window.soundFx) window.soundFx.playClick();

        try {
          const res = await fetch(`/api/plans/${currentSelectedStudioPlan.id}`, { method: 'DELETE' });
          const resJson = await res.json();
          if (res.ok && resJson.success) {
            if (window.soundFx) window.soundFx.playSuccess();
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

        if (window.OfficeInsights && typeof window.OfficeInsights.update === 'function') {
          window.OfficeInsights.update();
        }
      });
    }

    if (studioProjectSelect) {
      studioProjectSelect.addEventListener('change', (e) => {
        currentStudioProject = e.target.value;
        if (window.soundFx) window.soundFx.playClick();
        renderStudioPlansList();

        if (window.OfficeInsights && typeof window.OfficeInsights.update === 'function') {
          window.OfficeInsights.update();
        }
      });
    }

    if (studioPeriodSelect) {
      studioPeriodSelect.addEventListener('change', (e) => {
        currentStudioPeriod = e.target.value;
        if (window.soundFx) window.soundFx.playClick();
        renderStudioPlansList();

        if (window.OfficeInsights && typeof window.OfficeInsights.update === 'function') {
          window.OfficeInsights.update();
        }
      });
    }

    if (studioRefreshBtn) {
      studioRefreshBtn.addEventListener('click', () => {
        if (window.soundFx) window.soundFx.playClick();
        fetchStudioPlans(true);
      });
    }

    // Initial Fetch for Plans badge count
    fetchStudioPlans(false);
  }

  return {
    init,
    fetchPlans: fetchStudioPlans,
    getPlans: () => loadedStudioPlans,
    renderList: renderStudioPlansList,
    selectPlan: selectStudioPlan,
    showNewPlanForm: showStudioNewPlanForm,
    hideNewPlanForm: hideStudioNewPlanForm,
    handlePlanJobSync,
    renderMarkdownToHtml
  };
})();
