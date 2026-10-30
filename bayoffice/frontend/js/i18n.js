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
      nav: {
        workspace: 'Live Office',
        workspace_short: 'Office',
        kanban: 'Kanban Board',
        kanban_short: 'Kanban',
        plans_studio: 'Plans Studio (HABIBIE)',
        plans_studio_short: 'Plans'
      },
      actions: {
        theme_dark: 'Switch to Dark Mode',
        theme_light: 'Switch to Light Mode',
        lang_toggle: 'Switch Language',
        audio_toggle: 'Toggle 8-Bit Audio Effects',
        audio_mute: 'Mute 8-Bit Audio',
        audio_unmute: 'Unmute 8-Bit Audio',
        ops_hub: 'Ops Hub',
        ops_hub_title: 'Operations & Agent Tools',
        plans_desc: 'HABIBIE blueprints & roadmaps',
        schedules_desc: 'Autonomous cron routines',
        logs_desc: 'Live agent console streams',
        logs: 'Logs',
        logs_title: 'Live Agent Terminal Logs',
        schedules: 'Schedules',
        schedules_title: 'Scheduled Tasks & Automation',
        plans: 'Plans',
        plans_title: 'Implementation Plans by HABIBIE',
        new_task: 'New Task',
        new_task_short: 'Task',
        logout: 'Logout',
        logout_title: 'Log out of session',
        logout_confirm: 'Are you sure you want to log out from BayOffice?'
      },
      canvas: {
        title: '2D Virtual Office',
        live_view: 'Live View',
        rooms_subtitle: '5 Rooms: Executive Suite • Architect Studio • Engineering Bay • Game Room • Cafeteria Bar',
        fullscreen: 'Fullscreen',
        exit_fullscreen: 'Exit Fullscreen',
        room_executive: 'EXECUTIVE SUITE - LUHUT',
        room_architect: 'ARCHITECT STUDIO - HABIBIE',
        room_engineering: 'ENGINEERING BAY - WORKSTATIONS',
        room_game: 'GAME ROOM & ARCADE LOUNGE',
        room_cafeteria: 'CAFETERIA & COFFEE BAR'
      },
      agents: {
        state_standby: 'STANDBY',
        state_sleep: 'SLEEP',
        state_working: 'WORKING',
        state_reviewing: 'REVIEWING',
        default_bubble: 'Ready for duty.',
        role_habibie: 'Chief Architect (On-Demand)',
        role_habibie_badge: 'ARCHITECT',
        habibie_bubble: 'Cinta Sejati',
        open_studio: 'Open Plans Studio',
        view_tasks: 'View Tasks'
      },
      studio: {
        title: 'Implementation Plans Studio',
        subtitle: 'Technical architecture blueprints drafted by HABIBIE',
        new_plan_btn: '+ Draft Architecture Plan',
        search_placeholder: 'Search blueprints, concepts, or IDs...',
        filter_all: 'All Projects',
        empty_title: 'Select a Blueprint to Read',
        empty_hint: 'Select an architectural blueprint on the left or click "+ Draft Architecture Plan" to create one with HABIBIE.',
        no_plans: 'No implementation plans found.',
        author_badge: 'HABIBIE • CHIEF ARCHITECT',
        back_to_office: 'Back to Office'
      },
      kanban: {
        title: 'Task Kanban Board',
        subtitle: 'Multi-agent task orchestration, sprint pipeline & live status',
        source_badge: 'kanban.json',
        back_to_office: 'Back to Office',
        all_projects: 'All Projects',
        all_assignees: 'All',
        search_placeholder: 'Search tasks...',
        loading: 'Loading kanban board data...',
        no_tasks: 'No tasks',
        card_click_hint: 'Click to view full details',
        insights_btn: 'Insights',
        insights_title: 'View Sprint Metrics & Analytics',
        schedules_btn: 'Schedules',
        schedules_title: 'Manage Scheduled Tasks & Automation',
        plans_btn: 'Plans',
        plans_title: 'Architecture & Implementation Plans',
        export_csv_title: 'Export Tasks to CSV',
        export_json_title: 'Export Tasks to JSON',
        period_this_month: 'This Month',
        period_today: 'Today',
        period_this_week: 'This Week',
        period_last_month: 'Last Month',
        period_all: 'All Time',
        period_custom: 'Custom Range...',
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
        project_none: '🌐 General / Homelab (No Project)',
        project_custom: 'New Project / Custom Folder...',
        project_custom_placeholder: 'Type new project folder name (e.g., baydev, crm, chatbot)...',
        project_custom_hint: 'This project will be automatically registered in projects.json at /home/bay/<name>',
        category_label: 'Category / Target Assignee',
        cat_auto: 'Auto Detect Keywords',
        cat_reminder: '🔔 Reminder & Weather (HABIBIE)',
        cat_frontend: 'Frontend Engineer (PRABOWO)',
        cat_backend: 'Backend Engineer (JOKOWI)',
        cat_fullstack: 'Fullstack (LUHUT Orchestrator)',
        cat_ops: 'DevOps & System (LUHUT)',
        engine_label: 'Agent Brain / AI Engine',
        model_label: 'Reasoning Model (AGY)',
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
        actions_title: 'Task Actions',
        retry_btn: 'Retry',
        retry_title: 'Retry this task to assigned agent',
        retry_confirm: 'Do you want to retry task {task_id} and notify {assignee}?',
        delete_btn: 'Delete',
        delete_title: 'Permanently delete this task',
        delete_confirm: 'Are you sure you want to permanently delete task {task_id}?',
        save_btn: 'Save',
        update_status: 'Update status',
        status_updated: 'Status updated to {status}',
        task_deleted: 'Task {task_id} deleted successfully',
        task_retried: 'Task {task_id} successfully queued for retry',
        created_at: 'Created: {time}',
        completed_at: 'Completed: {time}'
      },
      logs: {
        modal_title: 'Live Agent Terminal Logs',
        auto_refresh: 'Auto-refresh (3s)',
        refresh_title: 'Refresh Logs Now',
        copy_btn: 'Copy',
        copy_title: 'Copy logs to clipboard',
        copied: 'Logs copied to clipboard!',
        loading: 'Loading terminal logs...',
        tmux_capture_notice: 'Source: tmux capture-pane (agy_agents)'
      },
      health: {
        modal_title: 'Server Health Guardian',
        modal_subtitle: 'Debian Linux • AMD E2-9000 Homelab (192.168.100.145)',
        bar_title: 'HEALTH GUARDIAN',
        click_hint: 'Open Diagnostics',
        ram_label: 'Physical RAM',
        swap_label: 'Swap / ZRAM Health',
        cpu_temp_label: 'APU Temp',
        cpu_load_label: 'Load Average',
        disk_label: 'Root Storage (/dev/sda2)',
        services_label: 'Vital Services',
        refresh_btn: 'Refresh Metrics',
        last_checked: 'Last updated: {time}',
        active: 'Active',
        inactive: 'Inactive'
      },
      analytics: {
        modal_title: 'Kanban Sprint Insights',
        modal_subtitle: 'Task Metrics & Agent Workload Distribution',
        total_tasks: 'Total Tasks',
        done_tasks: 'Completed',
        active_tasks: 'In-Progress',
        rate: 'Done Rate',
        workload_title: 'Agent Workload Distribution',
        projects_title: 'Tasks by Project',
        cycle_title: 'Cycle Time Avg',
        cycle_hint: 'Average duration from task creation to QA completion',
        cycle_none: 'N/A (No completed tasks with timestamps)'
      },
      office_insights: {
        title: 'Office Sprint & Squad Insights',
        subtitle: 'Live workload analytics, pipeline velocity & project distribution',
        live_badge: 'LIVE SYNCED',
        total_tasks: 'Total Tasks',
        total_tasks_hint: 'All sprint tasks',
        in_flight: 'In Flight',
        in_flight_hint: 'In-Progress & QA Audit',
        completed: 'Completed',
        completed_hint: 'QA Passed & Verified',
        done_rate: 'Done Rate',
        done_rate_hint: 'Sprint completion ratio',
        cycle_time: 'Cycle Time',
        cycle_time_hint: 'Avg lead time to Done',
        workload_title: 'Squad Workload & Active Focus',
        workload_hint: 'Task distribution across 5 AI agents',
        pipeline_title: 'Sprint Pipeline Stages',
        pipeline_hint: 'Distribution across workflow statuses',
        projects_title: 'Active Projects & Architecture',
        projects_hint: 'Tasks & blueprints per repository',
        habibie_plans_title: 'Habibie Blueprints',
        habibie_plans_hint: 'High-level system implementation blueprints & roadmaps',
        view_kanban: 'Open Kanban Board',
        view_studio: 'Open Plans Studio'
      },
      schedules: {
        modal_title: 'Scheduled Tasks & Automation',
        modal_subtitle: 'Cron schedules, recurring intervals, and automated background jobs',
        worker_active: 'SCHEDULER RUNNING',
        worker_idle: 'SCHEDULER STANDBY',
        total: 'Total Schedules',
        active: 'Active Jobs',
        next_run: 'Next Run',
        no_schedules: 'No scheduled tasks registered yet. Click "+ New Schedule" to create one!',
        new_schedule_btn: '+ New Schedule',
        hide_form_btn: 'Close Form',
        form_title: 'Create Scheduled Task',
        title_label: 'Schedule Title',
        title_placeholder: 'e.g. Daily PostgreSQL Backup & Vacuum',
        instruction_label: 'Prompt / Instruction for Agents',
        instruction_placeholder: 'e.g. Run database backup script and verify integrity...',
        project_label: 'Target Project',
        project_none: '🌐 General / Homelab (No Project)',
        category_label: 'Agent Category',
        cat_reminder: '🔔 Reminder & Weather (HABIBIE)',
        engine_label: 'Execution Engine',
        type_label: 'Schedule Type',
        type_cron: 'Cron Expression (5-field or preset)',
        type_interval: 'Recurring Interval (minutes)',
        type_once: 'One-off (Specific Date & Time)',
        cron_expr_label: 'Cron Expression',
        cron_expr_placeholder: '0 2 * * * (At 02:00 every day)',
        cron_presets: 'Quick Presets:',
        interval_label: 'Repeat Every (minutes)',
        interval_placeholder: '60 (Every 1 hour)',
        run_at_label: 'Execute At (Date & Time)',
        submit_btn: 'Save Scheduled Task',
        cancel_btn: 'Cancel',
        run_now: 'Run Now',
        running: 'Running...',
        pause: 'Pause',
        resume: 'Resume',
        delete: 'Delete',
        delete_confirm: 'Are you sure you want to delete scheduled task "{title}"?',
        delete_success: 'Scheduled task deleted.',
        run_success: 'Scheduled task triggered manually: {taskId}',
        toggle_success: 'Scheduled task updated.',
        created_success: 'Scheduled task successfully created.',
        status_active: 'Active',
        status_paused: 'Paused',
        last_run: 'Last Run:',
        next_run_label: 'Next Run:',
        runs_count: '{count} runs',
        never_run: 'Never'
      },
      plans: {
        modal_title: 'Implementation Plans (HABIBIE)',
        modal_subtitle: 'Technical architecture blueprints, task breakdowns & roadmaps',
        author_badge: 'CHIEF ARCHITECT',
        total_plans: 'Total Plans',
        dispatched_plans: 'Dispatched to Kanban',
        draft_plans: 'Drafts',
        new_plan_btn: '+ New Plan',
        hide_form_btn: 'Close Form',
        refresh_btn: 'Refresh',
        form_title: 'Draft Architecture Plan with HABIBIE',
        idea_label: 'Feature Concept / Scope Description',
        idea_placeholder: 'e.g. Implement dynamic portfolio categories with filter buttons and admin CRUD...',
        project_label: 'Target Project',
        engine_label: 'Architect Brain',
        model_label: 'Reasoning Model (AGY)',
        generate_btn: 'Ask HABIBIE to Draft Plan',
        generating: 'HABIBIE is Drafting Plan...',
        cancel_btn: 'Cancel',
        select_hint: 'Select a plan on the left to read architecture details',
        no_plans: 'No implementation plans found yet. Click "+ New Plan" or type /plan in Telegram!',
        dispatch_btn: 'Dispatch to Kanban',
        dispatching: 'Dispatching...',
        dispatched_notice: 'This plan was dispatched to Kanban as {taskId}',
        copy_btn: 'Copy Plan',
        copied: 'Plan Copied!',
        delete_btn: 'Delete',
        delete_confirm: 'Are you sure you want to delete plan "{title}"?',
        delete_success: 'Plan deleted successfully.',
        status_draft: 'Draft',
        status_dispatched: 'Dispatched',
        author: 'Author: {name}',
        created: 'Created: {time}'
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
      nav: {
        workspace: 'Kantor Live',
        workspace_short: 'Kantor',
        kanban: 'Papan Kanban',
        kanban_short: 'Kanban',
        plans_studio: 'Studio Rencana (HABIBIE)',
        plans_studio_short: 'Rencana'
      },
      actions: {
        theme_dark: 'Beralih ke Mode Gelap',
        theme_light: 'Beralih ke Mode Terang',
        lang_toggle: 'Ganti Bahasa (EN / ID)',
        audio_toggle: 'Toggle Efek Suara 8-Bit',
        audio_mute: 'Bisukan Suara 8-Bit',
        audio_unmute: 'Nyalakan Suara 8-Bit',
        ops_hub: 'Pusat Operasi',
        ops_hub_title: 'Peralatan & Operasi Agen',
        plans_desc: 'Blueprint arsitektur & peta jalan',
        schedules_desc: 'Rutinitas otomasi cron',
        logs_desc: 'Pantau live log terminal agen',
        logs: 'Logs',
        logs_title: 'Terminal Log Agen Real-Time',
        schedules: 'Jadwal',
        schedules_title: 'Tugas Terjadwal & Otomatisasi',
        plans: 'Rencana',
        plans_title: 'Rencana Implementasi oleh HABIBIE',
        new_task: 'Beri Tugas Baru',
        new_task_short: 'Tugas',
        logout: 'Keluar',
        logout_title: 'Keluar dari Sesi',
        logout_confirm: 'Yakin ingin logout dari BayOffice?'
      },
      canvas: {
        title: 'Kantor Virtual 2D',
        live_view: 'Live View',
        rooms_subtitle: '5 Ruangan: Ruang Pimpinan • Studio Arsitek • Lab Engineer • Game Room • Kantin Kafe',
        fullscreen: 'Fullscreen',
        exit_fullscreen: 'Keluar Fullscreen',
        room_executive: 'RUANG PIMPINAN - LUHUT',
        room_architect: 'STUDIO ARSITEK - HABIBIE',
        room_engineering: 'ENGINEERING BAY - WORKSTATIONS',
        room_game: 'GAME ROOM & ARCADE LOUNGE',
        room_cafeteria: 'KANTIN & COFFEE BAR'
      },
      agents: {
        state_standby: 'STANDBY',
        state_sleep: 'SLEEP',
        state_working: 'WORKING',
        state_reviewing: 'REVIEWING',
        default_bubble: 'Siap bertugas.',
        role_habibie: 'Kepala Arsitek (On-Demand)',
        role_habibie_badge: 'ARSITEK',
        habibie_bubble: 'Cinta Sejati',
        open_studio: 'Buka Studio Rencana',
        view_tasks: 'Lihat Tugas'
      },
      studio: {
        title: 'Studio Rencana Implementasi',
        subtitle: 'Blueprint arsitektur teknis yang dirancang oleh HABIBIE',
        new_plan_btn: '+ Rancang Blueprint Baru',
        search_placeholder: 'Cari blueprint, konsep, atau ID...',
        filter_all: 'Semua Proyek',
        empty_title: 'Pilih Blueprint untuk Dibaca',
        empty_hint: 'Pilih salah satu dokumen blueprint di sebelah kiri atau klik "+ Rancang Blueprint Baru" untuk menyusun arsitektur bersama HABIBIE.',
        no_plans: 'Belum ada dokumen rencana implementasi.',
        author_badge: 'HABIBIE • KEPALA ARSITEK',
        back_to_office: 'Kembali ke Kantor'
      },
      kanban: {
        title: 'Papan Kanban Tugas',
        subtitle: 'Orkestrasi tugas multi-agen, pipeline sprint & status langsung',
        source_badge: 'kanban.json',
        back_to_office: 'Kembali ke Kantor',
        all_projects: 'Semua Proyek',
        all_assignees: 'Semua',
        search_placeholder: 'Cari tugas...',
        loading: 'Memuat data papan kanban...',
        no_tasks: 'Tidak ada tugas',
        card_click_hint: 'Klik untuk melihat detail lengkap',
        insights_btn: 'Wawasan',
        insights_title: 'Lihat Metrik & Analisis Sprint',
        schedules_btn: 'Jadwal',
        schedules_title: 'Kelola Tugas Terjadwal & Otomatisasi',
        plans_btn: 'Rencana',
        plans_title: 'Rencana Arsitektur & Implementasi',
        export_csv_title: 'Ekspor Tugas ke CSV',
        export_json_title: 'Ekspor Tugas ke JSON',
        period_this_month: 'Bulan Ini',
        period_today: 'Hari Ini',
        period_this_week: 'Minggu Ini',
        period_last_month: 'Bulan Lalu',
        period_all: 'Semua Waktu',
        period_custom: 'Kustom Tanggal...',
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
        project_none: '🌐 Umum / Homelab (Tanpa Proyek)',
        project_custom: 'Proyek Baru / Folder Kustom...',
        project_custom_placeholder: 'Ketik nama folder proyek baru (misal: baydev, crm, chatbot)...',
        project_custom_hint: 'Proyek ini akan otomatis didaftarkan ke projects.json di /home/bay/<nama>',
        category_label: 'Target Kategori / Pelaksana',
        cat_auto: 'Otomatis Deteksi Kata Kunci',
        cat_reminder: '🔔 Reminder & Cuaca (HABIBIE)',
        cat_frontend: 'Frontend Engineer (PRABOWO)',
        cat_backend: 'Backend Engineer (JOKOWI)',
        cat_fullstack: 'Fullstack (LUHUT Orchestrator)',
        cat_ops: 'DevOps & System (LUHUT)',
        engine_label: 'Otak Agen / Engine AI',
        model_label: 'Model Penalaran (AGY)',
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
        actions_title: 'Aksi Tugas',
        retry_btn: 'Jalankan Ulang',
        retry_title: 'Jalankan ulang tugas ini ke agen pelaksana',
        retry_confirm: 'Yakin ingin menjalankan ulang tugas {task_id} untuk {assignee}?',
        delete_btn: 'Hapus',
        delete_title: 'Hapus tugas ini secara permanen',
        delete_confirm: 'Yakin ingin menghapus permanen tugas {task_id}?',
        save_btn: 'Simpan',
        update_status: 'Perbarui status',
        status_updated: 'Status diperbarui menjadi {status}',
        task_deleted: 'Tugas {task_id} berhasil dihapus',
        task_retried: 'Tugas {task_id} berhasil di-retry',
        created_at: 'Dibuat: {time}',
        completed_at: 'Selesai: {time}'
      },
      logs: {
        modal_title: 'Terminal Log Agen Real-Time',
        auto_refresh: 'Auto-refresh (3d)',
        refresh_title: 'Segarkan Log Sekarang',
        copy_btn: 'Salin',
        copy_title: 'Salin log ke clipboard',
        copied: 'Log berhasil disalin ke clipboard!',
        loading: 'Memuat log terminal agen...',
        tmux_capture_notice: 'Sumber: tmux capture-pane (agy_agents)'
      },
      health: {
        modal_title: 'Server Health Guardian',
        modal_subtitle: 'Debian Linux • AMD E2-9000 Homelab (192.168.100.145)',
        bar_title: 'HEALTH GUARDIAN',
        click_hint: 'Buka Diagnostik',
        ram_label: 'RAM Fisik',
        swap_label: 'Kesehatan Swap / ZRAM',
        cpu_temp_label: 'Suhu APU',
        cpu_load_label: 'Beban Rata-rata CPU',
        disk_label: 'Penyimpanan Root (/dev/sda2)',
        services_label: 'Layanan Vital',
        refresh_btn: 'Segarkan Metrik',
        last_checked: 'Terakhir diperbarui: {time}',
        active: 'Aktif',
        inactive: 'Tidak Aktif'
      },
      analytics: {
        modal_title: 'Wawasan Sprint Kanban',
        modal_subtitle: 'Metrik Tugas & Distribusi Beban Kerja Agen',
        total_tasks: 'Total Tugas',
        done_tasks: 'Selesai',
        active_tasks: 'Sedang Berjalan',
        rate: 'Rasio Selesai',
        workload_title: 'Distribusi Beban Kerja Agen',
        projects_title: 'Tugas per Proyek',
        cycle_title: 'Rata-rata Waktu Siklus',
        cycle_hint: 'Rata-rata durasi dari pembuatan tugas hingga audit QA lulus',
        cycle_none: 'N/A (Belum ada tugas selesai bertanggal)'
      },
      office_insights: {
        title: 'Wawasan Sprint & Beban Kerja Squad',
        subtitle: 'Analitik beban kerja live, kecepatan alur kerja & distribusi proyek',
        live_badge: 'TERSINKRONISASI LIVE',
        total_tasks: 'Total Tugas',
        total_tasks_hint: 'Semua tugas sprint',
        in_flight: 'Sedang Berjalan',
        in_flight_hint: 'Pengerjaan & Audit QA',
        completed: 'Selesai',
        completed_hint: 'Lulus Audit QA & Teruji',
        done_rate: 'Rasio Selesai',
        done_rate_hint: 'Tingkat penyelesaian sprint',
        cycle_time: 'Waktu Siklus',
        cycle_time_hint: 'Rata-rata waktu ke Selesai',
        workload_title: 'Beban Kerja Squad & Fokus Agen',
        workload_hint: 'Distribusi tugas di 5 agen AI',
        pipeline_title: 'Tahapan Alur Kerja Sprint',
        pipeline_hint: 'Distribusi status alur kerja',
        projects_title: 'Proyek Aktif & Arsitektur',
        projects_hint: 'Tugas & blueprint per repositori',
        habibie_plans_title: 'Blueprint Habibie',
        habibie_plans_hint: 'Cetak biru arsitektur teknis & peta tugas implementasi',
        view_kanban: 'Buka Kanban Board',
        view_studio: 'Buka Plans Studio'
      },
      schedules: {
        modal_title: 'Tugas Terjadwal & Otomatisasi',
        modal_subtitle: 'Jadwal cron, interval berulang, dan eksekusi background otomatis',
        worker_active: 'SCHEDULER AKTIF',
        worker_idle: 'SCHEDULER STANDBY',
        total: 'Total Jadwal',
        active: 'Jadwal Aktif',
        next_run: 'Eksekusi Berikutnya',
        no_schedules: 'Belum ada tugas terjadwal. Klik "+ Tambah Jadwal" untuk membuat baru!',
        new_schedule_btn: '+ Tambah Jadwal',
        hide_form_btn: 'Tutup Formulir',
        form_title: 'Buat Tugas Terjadwal Baru',
        title_label: 'Judul Jadwal',
        title_placeholder: 'Contoh: Backup Harian & Verifikasi PostgreSQL',
        instruction_label: 'Instruksi Tugas untuk Agen',
        instruction_placeholder: 'Contoh: Jalankan skrip backup database dan cek kapasitas disk...',
        project_label: 'Target Proyek',
        project_none: '🌐 Umum / Homelab (Tanpa Proyek)',
        category_label: 'Target Kategori / Pelaksana',
        cat_reminder: '🔔 Reminder & Cuaca (HABIBIE)',
        engine_label: 'Mesin Eksekusi',
        type_label: 'Tipe Jadwal',
        type_cron: 'Ekspresi Cron (5-field atau preset)',
        type_interval: 'Interval Berulang (menit)',
        type_once: 'Satu Kali (Waktu & Tanggal Tertentu)',
        cron_expr_label: 'Ekspresi Cron',
        cron_expr_placeholder: '0 2 * * * (Setiap hari pukul 02:00)',
        cron_presets: 'Preset Cepat:',
        interval_label: 'Ulangi Setiap (menit)',
        interval_placeholder: '60 (Setiap 1 jam)',
        run_at_label: 'Jalankan Pada (Tanggal & Waktu)',
        submit_btn: 'Simpan Tugas Terjadwal',
        cancel_btn: 'Batal',
        run_now: 'Jalankan Sekarang',
        running: 'Menjalankan...',
        pause: 'Jeda',
        resume: 'Aktifkan',
        delete: 'Hapus',
        delete_confirm: 'Apakah Anda yakin ingin menghapus tugas terjadwal "{title}"?',
        delete_success: 'Tugas terjadwal berhasil dihapus.',
        run_success: 'Tugas terjadwal berhasil dipicu secara manual: {taskId}',
        toggle_success: 'Status tugas terjadwal diperbarui.',
        created_success: 'Tugas terjadwal berhasil dibuat.',
        status_active: 'Aktif',
        status_paused: 'Dijeda',
        last_run: 'Terakhir:',
        next_run_label: 'Berikutnya:',
        runs_count: '{count} kali dieksekusi',
        never_run: 'Belum pernah'
      },
      plans: {
        modal_title: 'Rencana Implementasi (HABIBIE)',
        modal_subtitle: 'Blueprint arsitektur teknis, dekomposisi tugas & peta jalan',
        author_badge: 'CHIEF ARCHITECT',
        total_plans: 'Total Rencana',
        dispatched_plans: 'Terdireksi ke Kanban',
        draft_plans: 'Draf',
        new_plan_btn: '+ Rancang Baru',
        hide_form_btn: 'Tutup Formulir',
        refresh_btn: 'Segarkan',
        form_title: 'Rancang Rencana Arsitektur Baru bersama HABIBIE',
        idea_label: 'Konsep Fitur / Ruang Lingkup Tugas',
        idea_placeholder: 'Contoh: Implementasi filter kategori portofolio dinamis dengan tombol aksi dan CRUD admin...',
        project_label: 'Target Proyek',
        engine_label: 'Otak Arsitek',
        model_label: 'Model Penalaran (AGY)',
        generate_btn: 'Minta HABIBIE Merancang Rencana',
        generating: 'HABIBIE Sedang Merancang...',
        cancel_btn: 'Batal',
        select_hint: 'Pilih salah satu rencana di sebelah kiri untuk membaca detail arsitektur',
        no_plans: 'Belum ada rencana implementasi. Klik "+ Rancang Baru" atau ketik /plan di Telegram!',
        dispatch_btn: 'Eksekusi ke Kanban',
        dispatching: 'Menerbitkan...',
        dispatched_notice: 'Rencana ini telah diteruskan ke Kanban sebagai {taskId}',
        copy_btn: 'Salin Rencana',
        copied: 'Tersalin!',
        delete_btn: 'Hapus',
        delete_confirm: 'Apakah Anda yakin ingin menghapus rencana "{title}"?',
        delete_success: 'Rencana berhasil dihapus.',
        status_draft: 'Draf',
        status_dispatched: 'Terdireksi',
        author: 'Penulis: {name}',
        created: 'Dibuat: {time}'
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
