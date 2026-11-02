/**
 * pocketkirtan Scraper & Dataset Generator
 * Extracts authentic kirtans, aartis, and ashtaks for the pocketkirtan mobile app.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.anirdesh.com/kirtan';

// Concurrency pool helper
async function mapConcurrent(items, concurrency, fn) {
  const results = new Array(items.length);
  let index = 0;
  let activeWorkers = 0;
  let completed = 0;

  return new Promise((resolve, reject) => {
    function next() {
      if (completed === items.length) {
        return resolve(results);
      }

      while (activeWorkers < concurrency && index < items.length) {
        const currentIndex = index++;
        activeWorkers++;

        fn(items[currentIndex], currentIndex)
          .then((res) => {
            results[currentIndex] = res;
            completed++;
            activeWorkers--;
            if (completed % 50 === 0 || completed === items.length) {
              process.stdout.write(`Progress: ${completed}/${items.length} items (${Math.round((completed / items.length) * 100)}%)\r`);
            }
            next();
          })
          .catch((err) => {
            console.error(`\nError fetching item at index ${currentIndex}:`, err);
            results[currentIndex] = null;
            completed++;
            activeWorkers--;
            next();
          });
      }
    }

    next();
  });
}

// Fetch single kirtan with retry
async function fetchKirtanDetails(part, no, retries = 3) {
  const url = `${BASE_URL}/getkirtan.php?part=${part}&no=${no}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url}`);
      }
      const data = await res.json();
      return data;
    } catch (err) {
      if (attempt === retries) {
        console.error(`Failed to fetch part=${part}&no=${no} after ${retries} attempts:`, err.message);
        return null;
      }
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

// Fetch list for a specific writer
async function fetchWriterList(writerName) {
  const form = new URLSearchParams();
  form.append('writer', writerName);
  form.append('order', 'No');
  form.append('lang', 'en');

  const res = await fetch(`${BASE_URL}/getWriters-Kirtan-List.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: form.toString()
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching writer ${writerName}`);
  return await res.json();
}

// Fetch list for a specific category
async function fetchCategoryList(categoryName) {
  const form = new URLSearchParams();
  form.append('category', categoryName);
  form.append('order', 'No');
  form.append('lang', 'en');

  const res = await fetch(`${BASE_URL}/getCats-Kirtan-List.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: form.toString()
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching category ${categoryName}`);
  return await res.json();
}

// Format kirtan item for pocketkirtan schema
function formatKirtan(raw, extraCategory = null) {
  if (!raw) return null;

  // Split lyrics into stanzas
  const stanzasGu = raw.gujarati ? raw.gujarati.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean) : [];
  const stanzasEn = raw.english ? raw.english.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean) : [];

  return {
    id: `pk_${raw.part}_${raw.no}`,
    source_kid: raw.kid,
    part: raw.part,
    no: raw.no,
    title_gu: raw.title_gu || '',
    title_en: raw.title_en || '',
    writer_gu: raw.writer_gu || '',
    writer_en: raw.writer_en || '',
    category_gu: raw.category_gu || (extraCategory ? extraCategory.gu : ''),
    category_en: raw.category_en || (extraCategory ? extraCategory.en : ''),
    raag_gu: raw.raags_gu || '',
    raag_en: raw.raags_en || '',
    is_hindi: raw.hindi === 1 || raw.hindi === '1',
    has_audio: raw.is_audio === 1,
    audio_url: raw.audio_url || null,
    audio_artist: raw.audio_artist || null,
    lyrics_gu: raw.gujarati || '',
    lyrics_en: raw.english || '',
    stanzas_gu: stanzasGu,
    stanzas_en: stanzasEn
  };
}

async function run() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log('=== POCKETKIRTAN DATASET EXTRACTOR ===\n');

  // 1. Fetch Aarti and Ashtak collections
  console.log('[1/4] Fetching Aarti & Ashtak items...');
  const aartiCat = await fetchCategoryList('Nityavidhi - Arti');
  const vividhAartiCat = await fetchCategoryList('Vividh Arti');
  const vadharanaAshtakoCat = await fetchCategoryList('Vadharana Ashtako');
  const sanskrutStotroCat = await fetchCategoryList('Sanskrut Stotro');

  const aartiAshtakMeta = [
    ...aartiCat.map(x => ({ ...x, group: 'nitya_aarti' })),
    ...vividhAartiCat.map(x => ({ ...x, group: 'mandir_aarti' })),
    ...vadharanaAshtakoCat.map(x => ({ ...x, group: 'ashtak' })),
    ...sanskrutStotroCat.map(x => ({ ...x, group: 'sanskrit_stotra_ashtak' }))
  ];

  // Unique by Part + No
  const uniqueAartiAshtakMap = new Map();
  for (const item of aartiAshtakMeta) {
    const key = `${item.Part}_${item.No}`;
    if (!uniqueAartiAshtakMap.has(key)) {
      uniqueAartiAshtakMap.set(key, item);
    }
  }

  const aartiAshtakList = Array.from(uniqueAartiAshtakMap.values());
  console.log(`Found ${aartiAshtakList.length} distinct Aarti & Ashtak items. Fetching full details...`);

  const aartiAshtakRaw = await mapConcurrent(aartiAshtakList, 6, async (item) => {
    return await fetchKirtanDetails(item.Part, item.No);
  });
  console.log('\nAarti & Ashtak fetch complete.');

  const aartiAshtakFormatted = aartiAshtakRaw
    .filter(Boolean)
    .map(raw => formatKirtan(raw));

  // Extract specifically the Original Aarti & Traditional Ashtakam (Part 1 No 154)
  const originalAartiItem = aartiAshtakFormatted.find(x => x.part === 1 && x.no === 154);
  const prayerStutiItem = aartiAshtakFormatted.find(x => x.part === 1 && x.no === 155);
  const aksharpurushottamAartiItem = aartiAshtakFormatted.find(x => x.part === 2 && x.no === 1066);

  // Dedicated clean JSON for Original Aarti & Ashtak
  const originalAartiAshtakDoc = {
    metadata: {
      title: "Original Swaminarayan Aarti, Dhun & Swaminarayan Ashtakam",
      history: "The original Aarti 'Jay Sadguru Swami' was composed by Sadguru Muktanand Swami in VS 1859 (November 1802 CE) at Kalvani village, Junagadh, after witnessing the supreme divine manifestation of Bhagwan Swaminarayan. It is traditionally followed by the Mahamantra Dhun and the Sanskrit Swaminarayan Ashtakam ('Anant-koti-indu-ravi-prakashe').",
      composer_aarti: "Sadguru Muktanand Swami",
      composer_ashtak: "Traditional Sanskrit Composition",
      year: "VS 1859 (1802 CE)",
      location: "Kalvani, Gujarat"
    },
    original_aarti: originalAartiItem,
    prarthana_stuti_ashtak: prayerStutiItem,
    swaminarayan_aarti_baps: aksharpurushottamAartiItem,
    all_nitya_and_mandir_aartis: aartiAshtakFormatted.filter(x => x.category_en.includes('Arti') || x.title_en.includes('Arti')),
    all_ashtaks: aartiAshtakFormatted.filter(x => x.category_en.includes('Ashtak') || x.title_en.includes('aṣhṭak') || x.title_en.includes('Aṣhṭak') || x.title_en.includes('Ashtak'))
  };

  fs.writeFileSync(
    path.join(dataDir, 'original_aarti_and_ashtak.json'),
    JSON.stringify(originalAartiAshtakDoc, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(dataDir, 'all_aarti_ashtak_collection.json'),
    JSON.stringify(aartiAshtakFormatted, null, 2),
    'utf-8'
  );
  console.log(`Saved: data/original_aarti_and_ashtak.json & data/all_aarti_ashtak_collection.json (${aartiAshtakFormatted.length} items)`);

  // 2. Fetch Sadguru Muktanand Swami Kirtans
  console.log('\n[2/4] Fetching Sadguru Muktanand Swami kirtan catalog...');
  const muktanandList = await fetchWriterList('Sadguru Muktanand Swami');
  console.log(`Found ${muktanandList.length} kirtans by Sadguru Muktanand Swami. Fetching full details...`);

  const muktanandRaw = await mapConcurrent(muktanandList, 8, async (item) => {
    return await fetchKirtanDetails(item.Part, item.No);
  });
  console.log('\nMuktanand Swami fetch complete.');

  const muktanandFormatted = muktanandRaw
    .filter(Boolean)
    .map(raw => formatKirtan(raw));

  fs.writeFileSync(
    path.join(dataDir, 'muktanand_swami_kirtans.json'),
    JSON.stringify(muktanandFormatted, null, 2),
    'utf-8'
  );
  console.log(`Saved: data/muktanand_swami_kirtans.json (${muktanandFormatted.length} kirtans)`);

  // 3. Fetch Sadguru Premanand Swami Kirtans
  console.log('\n[3/4] Fetching Sadguru Premanand Swami kirtan catalog...');
  const premanandList = await fetchWriterList('Sadguru Premanand Swami');
  console.log(`Found ${premanandList.length} kirtans by Sadguru Premanand Swami. Fetching full details...`);

  const premanandRaw = await mapConcurrent(premanandList, 8, async (item) => {
    return await fetchKirtanDetails(item.Part, item.No);
  });
  console.log('\nPremanand Swami fetch complete.');

  const premanandFormatted = premanandRaw
    .filter(Boolean)
    .map(raw => formatKirtan(raw));

  fs.writeFileSync(
    path.join(dataDir, 'premanand_swami_kirtans.json'),
    JSON.stringify(premanandFormatted, null, 2),
    'utf-8'
  );
  console.log(`Saved: data/premanand_swami_kirtans.json (${premanandFormatted.length} kirtans)`);

  // 4. Create Master Summary & Index
  console.log('\n[4/4] Generating Master Summary & Index...');
  const summary = {
    appName: "pocketkirtan",
    generatedAt: new Date().toISOString(),
    datasets: {
      original_aarti_and_ashtak: {
        file: "data/original_aarti_and_ashtak.json",
        description: "The original 'Jay Sadguru Swami' Aarti composed by Muktanand Swami, traditional Dhun, Sanskrit Swaminarayan Ashtakam, and mandir aartis.",
        itemCount: aartiAshtakFormatted.length
      },
      muktanand_swami_kirtans: {
        file: "data/muktanand_swami_kirtans.json",
        author: "Sadguru Muktanand Swami (મુક્તાનંદ સ્વામી)",
        description: "Complete collection of kirtans, padas, thals, and stutis authored by Sadguru Muktanand Swami.",
        itemCount: muktanandFormatted.length
      },
      premanand_swami_kirtans: {
        file: "data/premanand_swami_kirtans.json",
        author: "Sadguru Premanand Swami (પ્રેમાનંદ સ્વામી / પ્રેમાનંદ સખી)",
        description: "Complete collection of kirtans, murti leela, prem-lakshana bhakti padas, and prabhatiya authored by Premsakhi Premanand Swami.",
        itemCount: premanandFormatted.length
      },
      all_aarti_ashtak_collection: {
        file: "data/all_aarti_ashtak_collection.json",
        description: "Complete set of nitya aartis, mandir aartis, stutis, and Sanskrit ashtaks.",
        itemCount: aartiAshtakFormatted.length
      }
    },
    totalKirtansExtracted: muktanandFormatted.length + premanandFormatted.length + aartiAshtakFormatted.length
  };

  fs.writeFileSync(
    path.join(dataDir, 'summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );

  console.log('\n=============================================');
  console.log('Extraction successfully completed!');
  console.log(`- Aarti & Ashtak items: ${aartiAshtakFormatted.length}`);
  console.log(`- Muktanand Swami Kirtans: ${muktanandFormatted.length}`);
  console.log(`- Premanand Swami Kirtans: ${premanandFormatted.length}`);
  console.log(`- Total Records: ${summary.totalKirtansExtracted}`);
  console.log('=============================================\n');
}

run().catch(console.error);

