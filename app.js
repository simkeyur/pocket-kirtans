/**
 * Pocket Kirtans - Minimalist PWA Engine
 * Offline-first, distraction-free Swaminarayan Kirtan & Nitya Niyam reader
 */

// Application State
const state = {
  tab: 'nitya',
  theme: localStorage.getItem('pk_theme') || 'dark',
  scriptMode: localStorage.getItem('pk_script') || 'both', // 'gu', 'en', 'both'
  fontSize: parseFloat(localStorage.getItem('pk_font_size') || '1.15'),
  savedIds: new Set(JSON.parse(localStorage.getItem('pk_saved') || '[]')),
  
  // Data caches
  aartiDoc: null,
  nityaKriyaDoc: null,
  indexList: null,
  authorCache: new Map(),

  // Reader state
  readerItem: null,
  readerQueue: [],
  readerIndex: -1,

  // Selected saint for browsing
  selectedSaintFile: null,
  selectedSaintName: null
};

// DOM References
const DOM = {
  themeBtn: document.getElementById('theme-btn'),
  themeIcon: document.getElementById('theme-icon'),
  fontSizeBtn: document.getElementById('fontsize-btn'),
  scriptPills: document.querySelectorAll('.script-pill'),
  navTabs: document.querySelectorAll('.nav-tab'),
  tabViews: document.querySelectorAll('.tab-view'),
  
  // Container targets
  nityaContainer: document.getElementById('nitya-container'),
  shayanContainer: document.getElementById('shayan-container'),
  saintsContainer: document.getElementById('saints-container'),
  saintDetailContainer: document.getElementById('saint-detail-container'),
  saintDetailView: document.getElementById('saint-detail-view'),
  searchContainer: document.getElementById('search-container'),
  savedContainer: document.getElementById('saved-container'),
  
  // Search inputs
  searchInput: document.getElementById('search-input'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  
  // Reader elements
  readerView: document.getElementById('reader-view'),
  readerBackBtn: document.getElementById('reader-back-btn'),
  readerBookmarkBtn: document.getElementById('reader-bookmark-btn'),
  readerBookmarkIcon: document.getElementById('reader-bookmark-icon'),
  readerFontSizeBtn: document.getElementById('reader-fontsize-btn'),
  readerScriptPills: document.querySelectorAll('.reader-script-pill'),
  readerTags: document.getElementById('reader-tags'),
  readerTitleGu: document.getElementById('reader-title-gu'),
  readerTitleEn: document.getElementById('reader-title-en'),
  readerAuthor: document.getElementById('reader-author'),
  readerLyrics: document.getElementById('reader-lyrics'),
  readerPrevBtn: document.getElementById('reader-prev-btn'),
  readerNextBtn: document.getElementById('reader-next-btn')
};

// Initialize App
async function init() {
  applyTheme(state.theme);
  applyFontSize(state.fontSize);
  updateScriptPills();
  setupEventListeners();

  // Load initial tab
  switchTab(state.tab);

  // Pre-load data in background
  loadAartiData();
  loadNityaKriyaData();
  loadSearchIndex();

  // Register PWA service worker
  registerServiceWorker();
}

// Service Worker Registration
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('PWA Service Worker active'))
        .catch(err => console.log('SW registration error:', err));
    });
  }
}

// Setup Event Handlers
function setupEventListeners() {
  // Theme Toggle
  DOM.themeBtn.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('pk_theme', state.theme);
    applyTheme(state.theme);
  });

  // Font Size Cycle (1.0, 1.15, 1.3, 1.45)
  const cycleFontSize = () => {
    const sizes = [1.0, 1.15, 1.3, 1.45];
    const currentIndex = sizes.findIndex(s => Math.abs(s - state.fontSize) < 0.05);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    state.fontSize = nextSize;
    localStorage.setItem('pk_font_size', nextSize);
    applyFontSize(nextSize);
  };
  DOM.fontSizeBtn.addEventListener('click', cycleFontSize);
  DOM.readerFontSizeBtn.addEventListener('click', cycleFontSize);

  // Script Mode Toggles
  DOM.scriptPills.forEach(pill => {
    pill.addEventListener('click', () => {
      setScriptMode(pill.dataset.script);
    });
  });
  DOM.readerScriptPills.forEach(pill => {
    pill.addEventListener('click', () => {
      setScriptMode(pill.dataset.script);
    });
  });

  // Bottom Nav Tabs
  DOM.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  // Search Input
  let searchTimer;
  DOM.searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    DOM.clearSearchBtn.style.display = query ? 'block' : 'none';
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      performSearch(query);
    }, 180);
  });

  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    DOM.clearSearchBtn.style.display = 'none';
    performSearch('');
    DOM.searchInput.focus();
  });

  // Reader Events
  DOM.readerBackBtn.addEventListener('click', closeReader);
  DOM.readerBookmarkBtn.addEventListener('click', toggleBookmark);

  DOM.readerPrevBtn.addEventListener('click', () => {
    if (state.readerIndex > 0) {
      openReaderFromQueue(state.readerIndex - 1);
    }
  });

  DOM.readerNextBtn.addEventListener('click', () => {
    if (state.readerIndex < state.readerQueue.length - 1) {
      openReaderFromQueue(state.readerIndex + 1);
    }
  });

  // Saint Detail Back
  const saintBackBtn = document.getElementById('saint-back-btn');
  if (saintBackBtn) {
    saintBackBtn.addEventListener('click', () => {
      DOM.saintDetailView.style.display = 'none';
      document.getElementById('saints-list-view').style.display = 'block';
    });
  }

  // Keyboard navigation for reader
  window.addEventListener('keydown', (e) => {
    if (!DOM.readerView.classList.contains('active')) return;
    if (e.key === 'Escape') closeReader();
    if (e.key === 'ArrowLeft') DOM.readerPrevBtn.click();
    if (e.key === 'ArrowRight') DOM.readerNextBtn.click();
  });
}

// Theme Application (True OLED Dark & Crisp Pure Light)
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const isDark = theme === 'dark';
  // Minimalist icons
  DOM.themeIcon.innerHTML = isDark
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

function applyFontSize(size) {
  document.documentElement.style.setProperty('--reader-size', `${size}rem`);
}

function setScriptMode(mode) {
  state.scriptMode = mode;
  localStorage.setItem('pk_script', mode);
  updateScriptPills();
  if (state.readerItem) {
    renderReaderLyrics();
  }
}

function updateScriptPills() {
  const updatePills = (pills) => {
    pills.forEach(p => {
      p.classList.toggle('active', p.dataset.script === state.scriptMode);
    });
  };
  updatePills(DOM.scriptPills);
  updatePills(DOM.readerScriptPills);
}

// Tab Switching
function switchTab(tabName) {
  state.tab = tabName;
  DOM.navTabs.forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });
  DOM.tabViews.forEach(v => {
    v.style.display = v.id === `tab-${tabName}` ? 'block' : 'none';
  });

  window.scrollTo({ top: 0, behavior: 'instant' });

  if (tabName === 'nitya') renderNityaView();
  else if (tabName === 'shayan') renderShayanView();
  else if (tabName === 'saints') renderSaintsListView();
  else if (tabName === 'search') {
    renderSearchIndex();
    setTimeout(() => DOM.searchInput.focus(), 50);
  } else if (tabName === 'saved') renderSavedView();
}

// --------------------------------------------------------------------------
// DATA LOADERS
// --------------------------------------------------------------------------

async function loadAartiData() {
  if (state.aartiDoc) return state.aartiDoc;
  try {
    const res = await fetch('data/original_aarti_and_ashtak.json');
    state.aartiDoc = await res.json();
    return state.aartiDoc;
  } catch (e) {
    console.error('Failed loading original aarti:', e);
  }
}

async function loadNityaKriyaData() {
  if (state.nityaKriyaDoc) return state.nityaKriyaDoc;
  try {
    const res = await fetch('data/nitya_kriya.json');
    state.nityaKriyaDoc = await res.json();
    return state.nityaKriyaDoc;
  } catch (e) {
    console.error('Failed loading nitya kriya:', e);
  }
}

async function loadSearchIndex() {
  if (state.indexList) return state.indexList;
  try {
    const res = await fetch('data/kirtan_index.json');
    state.indexList = await res.json();
    return state.indexList;
  } catch (e) {
    console.error('Failed loading index:', e);
  }
}

async function loadAuthorFile(filename) {
  if (state.authorCache.has(filename)) {
    return state.authorCache.get(filename);
  }
  try {
    const res = await fetch(filename);
    const data = await res.json();
    state.authorCache.set(filename, data);
    return data;
  } catch (e) {
    console.error(`Failed loading ${filename}:`, e);
    return [];
  }
}

// --------------------------------------------------------------------------
// VIEW RENDERERS
// --------------------------------------------------------------------------

// 1. Nitya Niyam View
async function renderNityaView() {
  const aartiDoc = await loadAartiData();
  if (!aartiDoc) return;

  const coreAarti = aartiDoc.original_aarti;
  const dhun = aartiDoc.original_dhun;
  const radhikaAshtak = aartiDoc.radhika_krishna_ashtak;
  const shriHariStotra = aartiDoc.shri_hari_prarthana_stotram;
  const nirvikalp = aartiDoc.nirvikalp_uttam_ati;
  const dandvat = aartiDoc.dandvat_shlok;
  const mandirAartis = aartiDoc.mandir_five_aartis;
  const classicalAshtaks = aartiDoc.traditional_sanskrit_ashtaks;

  // Build Queue for navigation
  const nityaQueue = [
    {
      id: 'aarti_orig',
      title_gu: coreAarti.title_gu,
      title_en: coreAarti.title_en,
      writer_gu: coreAarti.composer_gu,
      writer_en: coreAarti.composer_en,
      category_gu: 'નિત્ય આરતી',
      category_en: 'Sandhya Aarti',
      lyrics_gu: coreAarti.lyrics_gu,
      lyrics_en: coreAarti.lyrics_en,
      stanzas_gu: coreAarti.stanzas.map(s => s.gujarati),
      stanzas_en: coreAarti.stanzas.map(s => s.english),
      meanings: coreAarti.stanzas.map(s => s.meaning_en)
    },
    {
      id: 'dhun_orig',
      title_gu: dhun.title_gu,
      title_en: dhun.title_en,
      writer_gu: 'પરંપરાગત ધૂન્ય',
      writer_en: 'Traditional Swaminarayan Dhun',
      category_gu: 'મહામંત્ર ધૂન',
      category_en: 'Mahamantra Dhun',
      lyrics_gu: dhun.lyrics_gu,
      lyrics_en: dhun.lyrics_en,
      stanzas_gu: dhun.lyrics_gu.split('\n\n'),
      stanzas_en: dhun.lyrics_en.split('\n\n')
    },
    {
      id: 'radhika_ashtak',
      title_gu: radhikaAshtak.title_gu,
      title_en: radhikaAshtak.title_en,
      writer_gu: 'પરંપરાગત સંસ્કૃત અષ્ટક',
      writer_en: 'Traditional Sanskrit Ashtakam',
      category_gu: 'આરતી અષ્ટક',
      category_en: 'Aarti Ashtak',
      lyrics_gu: radhikaAshtak.lyrics_gu,
      lyrics_en: radhikaAshtak.lyrics_en,
      stanzas_gu: radhikaAshtak.lyrics_gu.split('\n\n'),
      stanzas_en: radhikaAshtak.lyrics_en.split('\n\n')
    },
    {
      id: 'nirvikalp_prarthana',
      title_gu: nirvikalp.title_gu,
      title_en: nirvikalp.title_en,
      writer_gu: nirvikalp.composer_gu,
      writer_en: nirvikalp.composer_en,
      category_gu: 'નિત્ય સ્તુતિ',
      category_en: 'Daily Stuti & Prayer',
      lyrics_gu: nirvikalp.lyrics_gu,
      lyrics_en: nirvikalp.lyrics_en,
      stanzas_gu: nirvikalp.lyrics_gu.split('\n\n'),
      stanzas_en: nirvikalp.lyrics_en.split('\n\n')
    },
    {
      id: 'dandvat_jaynad',
      title_gu: dandvat.title_gu,
      title_en: dandvat.title_en,
      writer_gu: 'પરંપરાગત શ્લોક & જયનાદ',
      writer_en: 'Dandvat Shlok & Jaynad',
      category_gu: 'દંડવત્ શ્લોક',
      category_en: 'Dandvat & Jaynad',
      lyrics_gu: dandvat.lyrics_gu,
      lyrics_en: dandvat.lyrics_en,
      stanzas_gu: dandvat.lyrics_gu.split('\n\n'),
      stanzas_en: dandvat.lyrics_en.split('\n\n')
    }
  ];

  let html = `
    <div class="section-title-wrap">
      <div class="section-label">Original Sampraday</div>
      <h1 class="section-title">Nitya Niyam</h1>
    </div>

    <!-- Core Sandhya Aarti Routine -->
    <div class="card-group">
      <div class="glass-card" onclick="openReaderItemDirect('aarti_orig')">
        <div class="card-info">
          <div class="card-title-gu">${coreAarti.title_gu}</div>
          <div class="card-title-en">${coreAarti.title_en}</div>
          <div class="card-meta">
            <span class="card-meta-chip">Aarti</span>
            <span>${coreAarti.composer_en}</span>
          </div>
        </div>
        <div class="card-arrow">›</div>
      </div>

      <div class="glass-card" onclick="openReaderItemDirect('dhun_orig')">
        <div class="card-info">
          <div class="card-title-gu">${dhun.title_gu}</div>
          <div class="card-title-en">${dhun.title_en}</div>
          <div class="card-meta">
            <span class="card-meta-chip">Dhun</span>
            <span>Rām-Kṛuṣhṇa Govind...</span>
          </div>
        </div>
        <div class="card-arrow">›</div>
      </div>

      <div class="glass-card" onclick="openReaderItemDirect('radhika_ashtak')">
        <div class="card-info">
          <div class="card-title-gu">${radhikaAshtak.title_gu}</div>
          <div class="card-title-en">${radhikaAshtak.title_en}</div>
          <div class="card-meta">
            <span class="card-meta-chip">Ashtak</span>
            <span>Navīna-jīmūta samāna...</span>
          </div>
        </div>
        <div class="card-arrow">›</div>
      </div>

      <div class="glass-card" onclick="openReaderItemDirect('nirvikalp_prarthana')">
        <div class="card-info">
          <div class="card-title-gu">${nirvikalp.title_gu}</div>
          <div class="card-title-en">${nirvikalp.title_en}</div>
          <div class="card-meta">
            <span class="card-meta-chip">Prayer</span>
            <span>Nishchaya tava Ghanshyāma...</span>
          </div>
        </div>
        <div class="card-arrow">›</div>
      </div>

      <div class="glass-card" onclick="openReaderItemDirect('dandvat_jaynad')">
        <div class="card-info">
          <div class="card-title-gu">${dandvat.title_gu}</div>
          <div class="card-title-en">${dandvat.title_en}</div>
          <div class="card-meta">
            <span class="card-meta-chip">Shlok</span>
            <span>Tvameva mātā cha pitā...</span>
          </div>
        </div>
        <div class="card-arrow">›</div>
      </div>
    </div>

    <!-- 5 Daily Mandir Aartis Grid -->
    <div class="section-title-wrap" style="margin-top: 28px;">
      <div class="section-label">Temple Rituals</div>
      <h2 style="font-size: 1.25rem; font-weight: 700;">5 Daily Mandir Aartis</h2>
    </div>
    <div class="grid-2">
  `;

  mandirAartis.forEach((ma, idx) => {
    const queueItem = {
      id: `mandir_aarti_${idx}`,
      title_gu: ma.title_gu,
      title_en: ma.title_en,
      writer_gu: 'મંદિર આરતી',
      writer_en: ma.time,
      category_gu: 'મંદિર આરતી',
      category_en: ma.time,
      lyrics_gu: ma.lyrics_gu,
      lyrics_en: ma.lyrics_en,
      stanzas_gu: ma.lyrics_gu.split('\n\n'),
      stanzas_en: ma.lyrics_en.split('\n\n')
    };
    nityaQueue.push(queueItem);

    html += `
      <div class="saint-card" onclick="openReaderItemDirect('mandir_aarti_${idx}')">
        <div>
          <div class="card-meta-chip" style="margin-bottom: 6px; display:inline-block;">${ma.time}</div>
          <div class="saint-name">${ma.title_gu}</div>
        </div>
        <div class="saint-count">${ma.title_en.split('-')[0]}</div>
      </div>
    `;
  });

  html += `</div>`;
  DOM.nityaContainer.innerHTML = html;
  state.currentNityaQueue = nityaQueue;
}

// 2. Shayan (Chesta & Sleep) View
async function renderShayanView() {
  const nityaKriyaDoc = await loadNityaKriyaData();
  if (!nityaKriyaDoc) return;

  const fullChesta = nityaKriyaDoc.sections.full_chesta;
  const shayanKirtans = nityaKriyaDoc.sections.shayan_kirtans;
  const dhyan = nityaKriyaDoc.sections.dhyan_chintamani;
  const godi = nityaKriyaDoc.sections.godi_padas;

  // Build full shayan queue for continuous sequential reading
  const shayanQueue = [
    ...fullChesta.padas,
    ...shayanKirtans.kirtans,
    ...dhyan.padas
  ];
  state.currentShayanQueue = shayanQueue;

  let html = `
    <div class="section-title-wrap">
      <div class="section-label">Bedtime Rituals</div>
      <h1 class="section-title">Chesta & Shayan</h1>
    </div>

    <!-- Shayan (Sleep) Kirtans -->
    <div class="section-title-wrap">
      <div class="section-label">Sleep Kirtans</div>
      <h2 style="font-size: 1.2rem; font-weight: 700;">પોઢવાના કીર્તનો</h2>
    </div>
    <div class="card-group">
  `;

  shayanKirtans.kirtans.forEach(item => {
    html += `
      <div class="glass-card" onclick="openReaderItemQueue('${item.id}', 'shayan')">
        <div class="card-info">
          <div class="card-title-gu">${item.title_gu}</div>
          <div class="card-title-en">${item.title_en}</div>
          <div class="card-meta">
            <span class="card-meta-chip">Shayan</span>
            <span>${item.writer_en}</span>
          </div>
        </div>
        <div class="card-arrow">›</div>
      </div>
    `;
  });

  html += `
    </div>

    <!-- Full Chesta Header -->
    <div class="section-title-wrap" style="margin-top: 24px;">
      <div class="section-label">13 Sequential Padas</div>
      <h2 style="font-size: 1.2rem; font-weight: 700;">નર્તન ચેષ્ટા (સ્વાભાવિક લીલા)</h2>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Recited nightly by devotees before sleep.</p>
    </div>
    <div class="card-group">
  `;

  fullChesta.padas.forEach((pad, idx) => {
    html += `
      <div class="glass-card" onclick="openReaderItemQueue('${pad.id}', 'shayan')">
        <div class="card-info">
          <div class="card-title-gu">${pad.title_gu}</div>
          <div class="card-title-en">${pad.title_en}</div>
          <div class="card-meta">
            <span class="card-meta-chip">Pad ${idx + 1}</span>
            <span>${pad.writer_en}</span>
          </div>
        </div>
        <div class="card-arrow">›</div>
      </div>
    `;
  });

  html += `
    </div>

    <!-- Dhyan Chintamani (8 Padas) -->
    <div class="section-title-wrap" style="margin-top: 24px;">
      <div class="section-label">Murti Dhyan (8 Padas)</div>
      <h2 style="font-size: 1.2rem; font-weight: 700;">ધ્યાન ચિન્તામણિ</h2>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Premanand Swami's meditation on the divine form from head to feet.</p>
    </div>
    <div class="card-group">
  `;

  dhyan.padas.forEach((pad, idx) => {
    html += `
      <div class="glass-card" onclick="openReaderItemQueue('${pad.id}', 'shayan')">
        <div class="card-info">
          <div class="card-title-gu">${pad.title_gu}</div>
          <div class="card-title-en">${pad.title_en}</div>
          <div class="card-meta">
            <span class="card-meta-chip">Dhyan ${idx + 1}</span>
            <span>Premanand Swami</span>
          </div>
        </div>
        <div class="card-arrow">›</div>
      </div>
    `;
  });

  html += `</div>`;
  DOM.shayanContainer.innerHTML = html;
}

// 3. Saints Catalog View
function renderSaintsListView() {
  const saints = [
    {
      name_en: "Sadguru Premanand Swami",
      name_gu: "સદ્‍ગુરુ પ્રેમાનંદ સ્વામી",
      epithet: "Premsakhi • Murti & Leela Padas",
      file: "data/premanand_swami_kirtans.json",
      count: 689
    },
    {
      name_en: "Sadguru Brahmanand Swami",
      name_gu: "સદ્‍ગુરુ બ્રહ્માનંદ સ્વામી",
      epithet: "Brahmamuni • Vraj & Dingal Poetry",
      file: "data/brahmanand_swami_kirtans.json",
      count: 269
    },
    {
      name_en: "Sadguru Muktanand Swami",
      name_gu: "સદ્‍ગુરુ મુક્તાનંદ સ્વામી",
      epithet: "Mother of Satsang • Aarti & Thals",
      file: "data/muktanand_swami_kirtans.json",
      count: 173
    },
    {
      name_en: "Sadguru Nishkulanand Swami",
      name_gu: "સદ્‍ગુરુ નિષ્કુળાનંદ સ્વામી",
      epithet: "Vairagyamurti • Chosath Padi & Tyag",
      file: "data/nishkulanand_swami_kirtans.json",
      count: 172
    },
    {
      name_en: "Sadguru Devanand Swami",
      name_gu: "સદ્‍ગુરુ દેવાનંદ સ્વામી",
      epithet: "Cheti Le Manva • Renunciation Hymns",
      file: "data/devanand_swami_kirtans.json",
      count: 64
    },
    {
      name_en: "Other Nand Santos & Paramhansas",
      name_gu: "અન્ય નંદ સંતો & પરમહંસો",
      epithet: "Krushnanand, Bhoomanand, Shatanand, etc.",
      file: "data/other_paramhansas_kirtans.json",
      count: 87
    },
    {
      name_en: "Acharya Parampara",
      name_gu: "આચાર્ય પરંપરા",
      epithet: "Acharya Viharilalji & Ayodhyaprasadji",
      file: "data/acharya_parampara_kirtans.json",
      count: 20
    }
  ];

  let html = `
    <div class="section-title-wrap">
      <div class="section-label">Paramhansas of Bhagwan Swaminarayan</div>
      <h1 class="section-title">Saints & Authors</h1>
    </div>
    <div class="card-group">
  `;

  saints.forEach(s => {
    html += `
      <div class="glass-card" onclick="openSaintDetail('${s.file}', '${s.name_en}', '${s.name_gu}')">
        <div class="card-info">
          <div class="card-title-gu">${s.name_gu}</div>
          <div class="card-title-en">${s.name_en}</div>
          <div class="card-meta">
            <span class="card-meta-chip">${s.count} Kirtans</span>
            <span>${s.epithet}</span>
          </div>
        </div>
        <div class="card-arrow">›</div>
      </div>
    `;
  });

  html += `</div>`;
  DOM.saintsContainer.innerHTML = html;
}

// Saint Detail View
async function openSaintDetail(file, nameEn, nameGu) {
  state.selectedSaintFile = file;
  state.selectedSaintName = nameEn;

  document.getElementById('saints-list-view').style.display = 'none';
  DOM.saintDetailView.style.display = 'block';

  document.getElementById('saint-detail-title-gu').textContent = nameGu;
  document.getElementById('saint-detail-title-en').textContent = nameEn;
  DOM.saintDetailContainer.innerHTML = '<div class="spinner"></div>';

  window.scrollTo({ top: 0, behavior: 'instant' });

  const kirtans = await loadAuthorFile(file);
  state.currentSaintQueue = kirtans;

  let html = `<div class="card-group">`;
  kirtans.forEach((k, idx) => {
    html += `
      <div class="glass-card" onclick="openReaderItemQueue('${k.id}', 'saint')">
        <div class="card-info">
          <div class="card-title-gu">${k.title_gu}</div>
          <div class="card-title-en">${k.title_en}</div>
          <div class="card-meta">
            <span class="card-meta-chip">#${idx + 1}</span>
            <span>${k.category_en || 'Kirtan'}</span>
            ${k.raag_en ? `<span>• ${k.raag_en}</span>` : ''}
          </div>
        </div>
        <div class="card-arrow">›</div>
      </div>
    `;
  });
  html += `</div>`;
  DOM.saintDetailContainer.innerHTML = html;
}

// 4. Search View
async function renderSearchIndex() {
  const index = await loadSearchIndex();
  if (!index) return;
  performSearch(DOM.searchInput.value.trim());
}

async function performSearch(query) {
  const index = await loadSearchIndex();
  if (!index) return;

  if (!query) {
    // Show sample popular or first items
    renderSearchResults(index.slice(0, 35), `All Kirtans (${index.length} Indexed)`);
    return;
  }

  const q = query.toLowerCase();
  const matched = index.filter(item => {
    return (
      (item.title_gu && item.title_gu.includes(query)) ||
      (item.title_en && item.title_en.toLowerCase().includes(q)) ||
      (item.writer_en && item.writer_en.toLowerCase().includes(q)) ||
      (item.category_en && item.category_en.toLowerCase().includes(q))
    );
  });

  renderSearchResults(matched.slice(0, 50), `${matched.length} result${matched.length === 1 ? '' : 's'} for "${query}"`);
}

function renderSearchResults(items, headerText) {
  state.currentSearchQueue = items;

  let html = `
    <div class="section-title-wrap">
      <div class="section-label">${headerText}</div>
    </div>
    <div class="card-group">
  `;

  if (items.length === 0) {
    html += `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>No kirtans found matching your query.</p>
        <p style="font-size: 0.8rem; margin-top: 4px;">Try searching in English transliteration or Gujarati script.</p>
      </div>
    `;
  } else {
    items.forEach(k => {
      html += `
        <div class="glass-card" onclick="openSearchItem('${k.id}', '${k.dataset_file}')">
          <div class="card-info">
            <div class="card-title-gu">${k.title_gu}</div>
            <div class="card-title-en">${k.title_en}</div>
            <div class="card-meta">
              <span class="card-meta-chip">${k.category_en || 'Kirtan'}</span>
              <span>${k.writer_en}</span>
            </div>
          </div>
          <div class="card-arrow">›</div>
        </div>
      `;
    });
  }

  html += `</div>`;
  DOM.searchContainer.innerHTML = html;
}

// 5. Saved / Bookmarks View
async function renderSavedView() {
  const index = await loadSearchIndex();
  const savedList = Array.from(state.savedIds);

  let html = `
    <div class="section-title-wrap">
      <div class="section-label">Offline Favorites</div>
      <h1 class="section-title">Saved Kirtans</h1>
    </div>
  `;

  if (savedList.length === 0) {
    html += `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <p>No saved kirtans yet.</p>
        <p style="font-size: 0.8rem; margin-top: 4px;">Tap the heart icon in any kirtan to save it for offline travel reading.</p>
      </div>
    `;
    DOM.savedContainer.innerHTML = html;
    return;
  }

  // Look up details from index or saved cache
  const items = [];
  if (index) {
    savedList.forEach(id => {
      const match = index.find(x => x.id === id);
      if (match) items.push(match);
    });
  }

  html += `<div class="card-group">`;
  items.forEach(k => {
    html += `
      <div class="glass-card" onclick="openSearchItem('${k.id}', '${k.dataset_file}')">
        <div class="card-info">
          <div class="card-title-gu">${k.title_gu}</div>
          <div class="card-title-en">${k.title_en}</div>
          <div class="card-meta">
            <span class="card-meta-chip">${k.category_en || 'Kirtan'}</span>
            <span>${k.writer_en}</span>
          </div>
        </div>
        <div class="card-arrow">›</div>
      </div>
    `;
  });
  html += `</div>`;
  DOM.savedContainer.innerHTML = html;
}

// --------------------------------------------------------------------------
// READER ENGINE
// --------------------------------------------------------------------------

function openReader(item, queue = [], index = -1) {
  state.readerItem = item;
  state.readerQueue = queue;
  state.readerIndex = index;

  // Header Details
  DOM.readerTitleGu.textContent = item.title_gu || '';
  DOM.readerTitleEn.textContent = item.title_en || '';
  DOM.readerAuthor.textContent = item.writer_en ? `Composed by ${item.writer_en}` : '';

  // Tags
  let tagsHtml = '';
  if (item.category_en) tagsHtml += `<span class="reader-chip">${item.category_en}</span>`;
  if (item.raag_en) tagsHtml += `<span class="reader-chip">Raag: ${item.raag_en}</span>`;
  DOM.readerTags.innerHTML = tagsHtml;

  // Bookmark icon update
  updateBookmarkIcon();

  // Prev / Next button states
  DOM.readerPrevBtn.disabled = index <= 0;
  DOM.readerNextBtn.disabled = index < 0 || index >= queue.length - 1;

  // Render Stanzas
  renderReaderLyrics();

  // Display overlay
  DOM.readerView.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderReaderLyrics() {
  const item = state.readerItem;
  if (!item) return;

  const mode = state.scriptMode; // 'gu', 'en', 'both'
  const stanzasGu = item.stanzas_gu || (item.lyrics_gu ? [item.lyrics_gu] : []);
  const stanzasEn = item.stanzas_en || (item.lyrics_en ? [item.lyrics_en] : []);
  const meanings = item.meanings || [];

  const maxLen = Math.max(stanzasGu.length, stanzasEn.length);
  let html = '';

  for (let i = 0; i < maxLen; i++) {
    const sGu = stanzasGu[i] || '';
    const sEn = stanzasEn[i] || '';
    const meaning = meanings[i] || '';

    html += `
      <div class="stanza-card">
        <span class="stanza-num">${i + 1}</span>
        ${(mode === 'gu' || mode === 'both') && sGu ? `<div class="stanza-gu">${sGu}</div>` : ''}
        ${(mode === 'en' || mode === 'both') && sEn ? `<div class="stanza-en">${sEn}</div>` : ''}
        ${meaning ? `<div class="stanza-meaning">${meaning}</div>` : ''}
      </div>
    `;
  }

  DOM.readerLyrics.innerHTML = html;
}

function closeReader() {
  DOM.readerView.classList.remove('active');
  state.readerItem = null;
}

function openReaderFromQueue(index) {
  if (index >= 0 && index < state.readerQueue.length) {
    const item = state.readerQueue[index];
    openReader(item, state.readerQueue, index);
  }
}

// Helpers for opening from views
window.openReaderItemDirect = function(id) {
  const queue = state.currentNityaQueue || [];
  const index = queue.findIndex(x => x.id === id);
  if (index !== -1) {
    openReader(queue[index], queue, index);
  }
};

window.openReaderItemQueue = function(id, queueType) {
  let queue = [];
  if (queueType === 'shayan') queue = state.currentShayanQueue || [];
  else if (queueType === 'saint') queue = state.currentSaintQueue || [];

  const index = queue.findIndex(x => x.id === id);
  if (index !== -1) {
    openReader(queue[index], queue, index);
  }
};

window.openSearchItem = async function(id, fileRef) {
  // If fileRef provided, fetch full text
  if (fileRef) {
    const list = await loadAuthorFile(fileRef);
    const item = list.find(x => x.id === id);
    if (item) {
      openReader(item, list, list.indexOf(item));
      return;
    }
  }
  // Fallback check
  const allQueues = [
    ...(state.currentNityaQueue || []),
    ...(state.currentShayanQueue || []),
    ...(state.currentSaintQueue || [])
  ];
  const item = allQueues.find(x => x.id === id);
  if (item) {
    openReader(item, [item], 0);
  }
};

// Bookmarks
function toggleBookmark() {
  if (!state.readerItem) return;
  const id = state.readerItem.id;
  if (state.savedIds.has(id)) {
    state.savedIds.delete(id);
  } else {
    state.savedIds.add(id);
  }
  localStorage.setItem('pk_saved', JSON.stringify(Array.from(state.savedIds)));
  updateBookmarkIcon();
}

function updateBookmarkIcon() {
  if (!state.readerItem) return;
  const isSaved = state.savedIds.has(state.readerItem.id);
  DOM.readerBookmarkIcon.innerHTML = isSaved
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
