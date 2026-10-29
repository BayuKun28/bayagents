/**
 * BayOffice - Internationalization (i18n) Module
 * Design Standards: Best Practice, Zero Emoji, Clean Architecture
 * Supported Languages: English ('en' - Default), Indonesian ('id')
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'bayoffice_lang';
  const DEFAULT_LANG = 'en';

  const translations = {
    en: {
      app: {
        title: 'BayOffice — Virtual Workspace AI Agents',
        subtitle: 'Multi-Agent Workspace • Port 8888',
        version: 'v2.2'
      },
      telemetry: {
        loading: 'LOADING STATUS...',
        loading_short: 'LOADING',
        active: 'AGENTS ACTIVE',
        active_short: 'ACTIVE',
        sleep: 'AUTO-SLEEP (RAM SAVER)',
        sleep_short: 'SLEEP',
        ram: 'RAM:',
        cpu: 'CPU:'
      },
      actions: {
        theme_dark: 'Switch to Dark Mode',
        theme_light: 'Switch to Light Mode',
        lang_toggle: 'Switch Language',
        new_task: 'New Task',
        new_task_short: 'Task',
        logout: 'Logout',
        logout_title: 'Log out of session',
        logout_confirm: 'Are you sure you want to log out from BayOffice?'
      },
      canvas: {
        title: '2D Virtual Office',
        live_view: 'Live View',
        rooms_subtitle: '4 Rooms: Executive Suite • Engineering Bay • Game Room • Cafeteria Bar',
        fullscreen: 'Fullscreen',
        exit_fullscreen: 'Exit Fullscreen',
        room_executive: 'EXECUTIVE SUITE - LUHUT (ORCHESTRATOR)',
        room_engineering: 'ENGINEERING BAY - WORKSTATIONS',
        room_game: 'GAME ROOM & ARCADE LOUNGE',
        room_cafeteria: 'CAFETERIA & COFFEE BAR'
      },
      agents: {
        state_standby: 'STANDBY',
        state_sleep: 'SLEEP',
        state_working: 'WORKING',
        state_reviewing: 'REVIEWING',
        default_bubble: 'Ready for duty.'
      },
      kanban: {
        title: 'Task Kanban Board',
        source_badge: 'kanban.json',
        all_projects: 'All Projects',
        all_assignees: 'All',
        search_placeholder: 'Search tasks...',
        loading: 'Loading kanban board data...',
        no_tasks: 'No tasks',
        card_click_hint: 'Click to view full details',
        col_todo: 'To-Do',
        col_progress: 'In-Progress',
        col_qa: 'QA-Review',
        col_done: 'Done'
      },
      modal_task: {
        header: 'Dispatch New Task to Agent Team',
        instruction_label: 'Task Instructions',
        instruction_placeholder: 'Example: Add category filter buttons on portfolio page...',
        project_label: 'Target Project',
        project_auto: 'Auto Detect Project',
        project_custom: 'New Project / Custom Folder...',
        project_custom_placeholder: 'Type new project folder name (e.g., baydev, crm, chatbot)...',
        project_custom_hint: 'This project will be automatically registered in projects.json at /home/bay/<name>',
        category_label: 'Category / Target Assignee',
        cat_auto: 'Auto Detect Keywords',
        cat_frontend: 'Frontend Engineer (PRABOWO)',
        cat_backend: 'Backend Engineer (JOKOWI)',
        cat_fullstack: 'Fullstack (LUHUT Orchestrator)',
        cat_ops: 'DevOps & System (LUHUT)',
        engine_label: 'Agent Brain / AI Engine',
        engine_agy_option: '🧠 Antigravity (agy) — 4-Agent Team Tmux Session (Default)',
        engine_9router_option: '⚡ 9Router (gemini-free-smart) — Server 146 (Fast & Quota-Saver)',
        engine_agy_desc: '<b>Antigravity:</b> Interactive Tmux session with Google Antigravity (Luhut, Jokowi, Prabowo, Gibran).',
        engine_9router_desc: '<b>9Router:</b> Virtual Squad (Luhut, Jokowi, Prabowo, Gibran) powered by 9Router proxy on server 146 (Zero quota cost, fast response).',
        fasttrack_notice: '<b>Fast-Track Flow:</b> Tasks will be immediately recorded in <code>kanban.json</code>, waking up agent tmux sessions if sleeping, and broadcasting notifications to Telegram.',
        submit_btn: 'Send to Agent Team',
        submitting: 'Dispatching Task...',
        custom_project_empty: 'Please enter a new folder/project name.',
        success_msg: '<b>{task_id}</b> [{project}] successfully dispatched to <b>{target_agent}</b>.',
        failed_msg: 'Failed to dispatch task.'
      },
      modal_detail: {
        close_title: 'Close',
        assignee_label: 'Assignee',
        workdir_label: 'Working Directory',
        desc_label: 'Description & Instructions',
        no_desc: 'No description provided.',
        skills_label: 'Skills Required',
        notes_label: 'Implementation Notes',
        qa_label: 'QA Audit & Review (GIBRAN)',
        created_at: 'Created: {time}',
        completed_at: 'Completed: {time}'
      },
      login: {
        title: 'BayOffice',
        subtitle: 'Virtual Workspace for 4 AI Agents',
        secured_badge: 'Port 8888 • Secured',
        username_label: 'Username',
        username_placeholder: 'Enter username',
        password_label: 'Password',
        password_placeholder: '••••••••',
        submit_btn: 'Enter Office',
        verifying: 'Verifying...',
        invalid_credentials: 'Incorrect username or password.',
        conn_error: 'Failed to connect to BayOffice server.',
        orchestrator_footer: 'Orchestrators: LUHUT • JOKOWI • PRABOWO • GIBRAN'
      }
    },
    id: {
      app: {
        title: 'BayOffice — Ruang Kerja Virtual Agen AI',
        subtitle: 'Ruang Kerja Multi-Agen • Port 8888',
        version: 'v2.2'
      },
      telemetry: {
        loading: 'MEMUAT STATUS...',
        loading_short: 'MEMUAT',
        active: 'AGEN AKTIF',
        active_short: 'AKTIF',
        sleep: 'AUTO-SLEEP (HEMAT RAM)',
        sleep_short: 'SLEEP',
        ram: 'RAM:',
        cpu: 'CPU:'
      },
      actions: {
        theme_dark: 'Beralih ke Mode Gelap',
        theme_light: 'Beralih ke Mode Terang',
        lang_toggle: 'Ganti Bahasa (EN / ID)',
        new_task: 'Beri Tugas Baru',
        new_task_short: 'Tugas',
        logout: 'Keluar',
        logout_title: 'Keluar dari Sesi',
        logout_confirm: 'Yakin ingin logout dari BayOffice?'
      },
      canvas: {
        title: 'Kantor Virtual 2D',
        live_view: 'Live View',
        rooms_subtitle: '4 Ruangan: Executive Suite • Engineering Bay • Game Room • Kantin Bar',
        fullscreen: 'Fullscreen',
        exit_fullscreen: 'Keluar Fullscreen',
        room_executive: 'EXECUTIVE SUITE - LUHUT (ORCHESTRATOR)',
        room_engineering: 'ENGINEERING BAY - WORKSTATIONS',
        room_game: 'GAME ROOM & ARCADE LOUNGE',
        room_cafeteria: 'KANTIN & COFFEE BAR'
      },
      agents: {
        state_standby: 'STANDBY',
        state_sleep: 'SLEEP',
        state_working: 'WORKING',
        state_reviewing: 'REVIEWING',
        default_bubble: 'Siap bertugas.'
      },
      kanban: {
        title: 'Papan Kanban Tugas',
        source_badge: 'kanban.json',
        all_projects: 'Semua Proyek',
        all_assignees: 'Semua',
        search_placeholder: 'Cari tugas...',
        loading: 'Memuat data papan kanban...',
        no_tasks: 'Tidak ada tugas',
        card_click_hint: 'Klik untuk melihat detail lengkap',
        col_todo: 'To-Do',
        col_progress: 'In-Progress',
        col_qa: 'QA-Review',
        col_done: 'Done'
      },
      modal_task: {
        header: 'Beri Tugas Baru ke Tim Agen',
        instruction_label: 'Instruksi Tugas',
        instruction_placeholder: 'Contoh: Tambahkan tombol filter kategori di halaman portofolio...',
        project_label: 'Target Proyek',
        project_auto: 'Otomatis Deteksi Proyek',
        project_custom: 'Proyek Baru / Folder Kustom...',
        project_custom_placeholder: 'Ketik nama folder proyek baru (misal: baydev, crm, chatbot)...',
        project_custom_hint: 'Proyek ini akan otomatis didaftarkan ke projects.json di /home/bay/<nama>',
        category_label: 'Target Kategori / Pelaksana',
        cat_auto: 'Otomatis Deteksi Kata Kunci',
        cat_frontend: 'Frontend Engineer (PRABOWO)',
        cat_backend: 'Backend Engineer (JOKOWI)',
        cat_fullstack: 'Fullstack (LUHUT Orchestrator)',
        cat_ops: 'DevOps & System (LUHUT)',
        engine_label: 'Otak Agen / Engine AI',
        engine_agy_option: '🧠 Antigravity (agy) — Sesi Tmux Tim 4 Agen (Default)',
        engine_9router_option: '⚡ 9Router (gemini-free-smart) — Server 146 (Hemat Kuota & Cepat)',
        engine_agy_desc: '<b>Antigravity:</b> Sesi Tmux interaktif Google Antigravity (Luhut, Jokowi, Prabowo, Gibran).',
        engine_9router_desc: '<b>9Router:</b> Virtual Squad (Luhut, Jokowi, Prabowo, Gibran) ditenagai proxy 9Router di server 146 (Zero kuota agy, respon cepat).',
        fasttrack_notice: '<b>Alur Fast-Track:</b> Tugas akan langsung dicatat ke <code>kanban.json</code>, membangunkan sesi tmux agen jika sedang tidur, dan menyiarkan notifikasi ke Telegram.',
        submit_btn: 'Kirim ke Tim Agen',
        submitting: 'Menerbitkan Tugas...',
        custom_project_empty: 'Harap masukkan nama folder/proyek baru.',
        success_msg: '<b>{task_id}</b> [{project}] berhasil diteruskan ke <b>{target_agent}</b>.',
        failed_msg: 'Gagal menerbitkan tugas.'
      },
      modal_detail: {
        close_title: 'Tutup',
        assignee_label: 'Pelaksana (Assignee)',
        workdir_label: 'Direktori Kerja',
        desc_label: 'Deskripsi & Instruksi',
        no_desc: 'Tidak ada deskripsi.',
        skills_label: 'Keahlian Dibutuhkan',
        notes_label: 'Catatan Implementasi',
        qa_label: 'Audit & Review QA (GIBRAN)',
        created_at: 'Dibuat: {time}',
        completed_at: 'Selesai: {time}'
      },
      login: {
        title: 'BayOffice',
        subtitle: 'Virtual Workspace 4 Agen AI',
        secured_badge: 'Port 8888 • Secured',
        username_label: 'Username',
        username_placeholder: 'Masukkan username',
        password_label: 'Password',
        password_placeholder: '••••••••',
        submit_btn: 'Masuk ke Kantor',
        verifying: 'Memverifikasi...',
        invalid_credentials: 'Username atau password salah.',
        conn_error: 'Gagal terhubung ke server BayOffice.',
        orchestrator_footer: 'Orchestrator: LUHUT • JOKOWI • PRABOWO • GIBRAN'
      }
    }
  };

  class I18nManager {
    constructor() {
      // Default to English as explicitly requested
      this.currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
      if (!translations[this.currentLang]) {
        this.currentLang = DEFAULT_LANG;
      }
    }

    init() {
      this.updateHtmlLang();
      this.applyDOM();
    }

    getLanguage() {
      return this.currentLang;
    }

    setLanguage(lang) {
      if (!translations[lang]) return;
      this.currentLang = lang;
      localStorage.setItem(STORAGE_KEY, lang);
      this.updateHtmlLang();
      this.applyDOM();

      window.dispatchEvent(new CustomEvent('bayoffice_language_changed', {
        detail: { lang: this.currentLang }
      }));
    }

    toggleLanguage() {
      const nextLang = this.currentLang === 'en' ? 'id' : 'en';
      this.setLanguage(nextLang);
      return nextLang;
    }

    updateHtmlLang() {
      document.documentElement.lang = this.currentLang;
    }

    t(path, params = {}) {
      const keys = path.split('.');
      let val = translations[this.currentLang];
      for (const k of keys) {
        if (val && typeof val === 'object' && k in val) {
          val = val[k];
        } else {
          // Fallback to English
          let fallback = translations[DEFAULT_LANG];
          for (const fk of keys) {
            if (fallback && typeof fallback === 'object' && fk in fallback) {
              fallback = fallback[fk];
            } else {
              fallback = null;
              break;
            }
          }
          val = (fallback !== null && fallback !== undefined) ? fallback : path;
          break;
        }
      }

      if (typeof val === 'string') {
        return val.replace(/\{(\w+)\}/g, (match, p1) => {
          return params[p1] !== undefined ? params[p1] : match;
        });
      }
      return (val !== undefined && val !== null) ? val : path;
    }

    applyDOM(root = document) {
      // 1. Plain text elements
      const elements = root.querySelectorAll('[data-i18n]');
      elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
          const translated = this.t(key);
          if (translated !== key) {
            el.textContent = translated;
          }
        }
      });

      // 2. HTML formatted elements
      const htmlElements = root.querySelectorAll('[data-i18n-html]');
      htmlElements.forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (key) {
          const translated = this.t(key);
          if (translated !== key) {
            el.innerHTML = translated;
          }
        }
      });

      // 3. Input placeholders
      const placeholderElements = root.querySelectorAll('[data-i18n-placeholder]');
      placeholderElements.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) {
          el.placeholder = this.t(key);
        }
      });

      // 4. Element titles (tooltips)
      const titleElements = root.querySelectorAll('[data-i18n-title]');
      titleElements.forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) {
          el.title = this.t(key);
        }
      });

      // 5. Update language toggle button label
      const langLabel = document.getElementById('langLabel');
      if (langLabel) {
        langLabel.textContent = this.currentLang.toUpperCase();
      }

      const langToggle = document.getElementById('langToggle');
      if (langToggle) {
        langToggle.title = `${this.t('actions.lang_toggle')} (${this.currentLang === 'en' ? 'English' : 'Indonesia'})`;
      }
    }
  }

  window.I18n = new I18nManager();

})(window);
