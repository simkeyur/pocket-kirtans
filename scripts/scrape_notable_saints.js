/**
 * Scraper for Notable Swaminarayan Nand Santos & Paramhansas
 * Extracts kirtans for:
 * - Sadguru Brahmanand Swami (269)
 * - Sadguru Nishkulanand Swami (172)
 * - Sadguru Devanand Swami (64)
 * - Other Nand Santos (Krushnanand, Bhoomanand, Manjukeshanand, Dayanand, Akhandanand Muni, etc.)
 * - Acharya Parampara (Viharilalji Maharaj, Ayodhyaprasadji Maharaj)
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
            if (completed % 25 === 0 || completed === items.length) {
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
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) {
        console.error(`Failed to fetch part=${part}&no=${no}:`, err.message);
        return null;
      }
      await new Promise((r) => setTimeout(r, 400 * attempt));
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

function formatKirtan(raw) {
  if (!raw) return null;

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
    category_gu: raw.category_gu || '',
    category_en: raw.category_en || '',
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

async function scrapeWriter(writerName, outputFilename, dataDir) {
  console.log(`\nFetching ${writerName}...`);
  const list = await fetchWriterList(writerName);
  console.log(`Found ${list.length} kirtans. Fetching lyrics...`);

  const rawItems = await mapConcurrent(list, 8, async (item) => {
    return await fetchKirtanDetails(item.Part, item.No);
  });
  console.log('');

  const formatted = rawItems.filter(Boolean).map(formatKirtan);
  const filePath = path.join(dataDir, outputFilename);
  fs.writeFileSync(filePath, JSON.stringify(formatted, null, 2), 'utf-8');
  console.log(`Saved ${formatted.length} items to ${outputFilename}`);
  return formatted;
}

async function run() {
  const dataDir = path.join(__dirname, '..', 'data');

  console.log('=== SCRAPING NOTABLE PARAMHANSAS & SAINTS ===\n');

  // 1. Sadguru Brahmanand Swami
  const brahmanandKirtans = await scrapeWriter('Sadguru Brahmanand Swami', 'brahmanand_swami_kirtans.json', dataDir);

  // 2. Sadguru Nishkulanand Swami
  const nishkulanandKirtans = await scrapeWriter('Sadguru Nishkulanand Swami', 'nishkulanand_swami_kirtans.json', dataDir);

  // 3. Sadguru Devanand Swami
  const devanandKirtans = await scrapeWriter('Sadguru Devanand Swami', 'devanand_swami_kirtans.json', dataDir);

  // 4. Other Nand Santos collection
  console.log('\nFetching other Nand Santos (Krushnanand, Bhoomanand, Manjukeshanand, Dayanand, Akhandanand Muni, etc.)...');
  const otherSantosWriters = [
    'Sadguru Krushnanand Swami',
    'Sadguru Bhoomanand Swami',
    'Sadguru Manjukeshanand Swami',
    'Sadguru Dayanand Swami',
    'Akhandanand Muni',
    'Jeram Brahmachari',
    'Sadguru Avinashanand Swami',
    'Sadguru Jagdishanand Swami',
    'Sadguru Yoganand Swami',
    'Sadguru Nishkamanand Brahmachari',
    'Sadguru Swetvaikunth Swami',
    'Sadguru Vaishnavanand Swami',
    'Sadguru Nityanand Swami',
    'Sadguru Shatanand Muni',
    'Sadguru Sukhanand Swami',
    'Sadguru Trikamanand Swami'
  ];

  const allOtherSantosList = [];
  for (const writer of otherSantosWriters) {
    try {
      const list = await fetchWriterList(writer);
      allOtherSantosList.push(...list.map(item => ({ ...item, requestedWriter: writer })));
    } catch (e) {
      console.error(`Error listing ${writer}:`, e.message);
    }
  }

  // De-duplicate
  const uniqueOtherMap = new Map();
  for (const item of allOtherSantosList) {
    uniqueOtherMap.set(`${item.Part}_${item.No}`, item);
  }
  const uniqueOtherList = Array.from(uniqueOtherMap.values());
  console.log(`Found ${uniqueOtherList.length} kirtans across ${otherSantosWriters.length} Nand Santos. Fetching lyrics...`);

  const otherSantosRaw = await mapConcurrent(uniqueOtherList, 8, async (item) => {
    return await fetchKirtanDetails(item.Part, item.No);
  });
  console.log('');
  const otherSantosFormatted = otherSantosRaw.filter(Boolean).map(formatKirtan);
  fs.writeFileSync(path.join(dataDir, 'other_paramhansas_kirtans.json'), JSON.stringify(otherSantosFormatted, null, 2), 'utf-8');
  console.log(`Saved ${otherSantosFormatted.length} items to other_paramhansas_kirtans.json`);

  // 5. Acharya Parampara (Viharilalji Maharaj, Ayodhyaprasadji Maharaj)
  console.log('\nFetching Acharya Parampara compositions (Viharilalji Maharaj, Ayodhyaprasadji Maharaj)...');
  const acharyaWriters = [
    'Acharya Viharilalji Maharaj',
    'Acharya Ayodhyaprasadji Maharaj'
  ];
  const acharyaList = [];
  for (const w of acharyaWriters) {
    const list = await fetchWriterList(w);
    acharyaList.push(...list);
  }
  const acharyaRaw = await mapConcurrent(acharyaList, 8, async (item) => {
    return await fetchKirtanDetails(item.Part, item.No);
  });
  console.log('');
  const acharyaFormatted = acharyaRaw.filter(Boolean).map(formatKirtan);
  fs.writeFileSync(path.join(dataDir, 'acharya_parampara_kirtans.json'), JSON.stringify(acharyaFormatted, null, 2), 'utf-8');
  console.log(`Saved ${acharyaFormatted.length} items to acharya_parampara_kirtans.json`);

  // 6. Rebuild Master Index and Summary
  console.log('\nRebuilding Master Search Index...');
  const filesToIndex = [
    { file: 'data/all_aarti_ashtak_collection.json' },
    { file: 'data/muktanand_swami_kirtans.json' },
    { file: 'data/premanand_swami_kirtans.json' },
    { file: 'data/brahmanand_swami_kirtans.json' },
    { file: 'data/nishkulanand_swami_kirtans.json' },
    { file: 'data/devanand_swami_kirtans.json' },
    { file: 'data/other_paramhansas_kirtans.json' },
    { file: 'data/acharya_parampara_kirtans.json' }
  ];

  const index = [];
  const seenIds = new Set();

  for (const entry of filesToIndex) {
    const fullPath = path.join(__dirname, '..', entry.file);
    if (!fs.existsSync(fullPath)) continue;
    const items = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    for (const it of items) {
      if (!it || seenIds.has(it.id)) continue;
      seenIds.add(it.id);
      index.push({
        id: it.id,
        part: it.part,
        no: it.no,
        title_gu: it.title_gu,
        title_en: it.title_en,
        writer_gu: it.writer_gu,
        writer_en: it.writer_en,
        category_gu: it.category_gu,
        category_en: it.category_en,
        raag_en: it.raag_en,
        is_hindi: it.is_hindi,
        dataset_file: entry.file
      });
    }
  }

  fs.writeFileSync(path.join(dataDir, 'kirtan_index.json'), JSON.stringify(index, null, 2), 'utf-8');

  // Summary
  const summary = {
    appName: 'pocketkirtan',
    tradition: 'Original Swaminarayan Sampraday',
    lastUpdated: new Date().toISOString(),
    datasets: {
      original_aarti_and_ashtak: {
        file: 'data/original_aarti_and_ashtak.json',
        description: 'Authentic Original Aarti (Jay Sadguru Swami), Mahamantra Dhun, Radhika-Krishna Ashtak, Nirvikalp Uttam Ati, Dandvat Shloks, and 5 Mandir Aartis.',
        itemCount: 24
      },
      premanand_swami_kirtans: {
        file: 'data/premanand_swami_kirtans.json',
        author: 'Sadguru Premanand Swami (સદ્‍ગુરુ પ્રેમાનંદ સ્વામી / પ્રેમસખી)',
        itemCount: 689
      },
      brahmanand_swami_kirtans: {
        file: 'data/brahmanand_swami_kirtans.json',
        author: 'Sadguru Brahmanand Swami (સદ્‍ગુરુ બ્રહ્માનંદ સ્વામી / બ્રહ્મમુનિ)',
        itemCount: brahmanandKirtans.length
      },
      muktanand_swami_kirtans: {
        file: 'data/muktanand_swami_kirtans.json',
        author: 'Sadguru Muktanand Swami (સદ્‍ગુરુ મુક્તાનંદ સ્વામી)',
        itemCount: 173
      },
      nishkulanand_swami_kirtans: {
        file: 'data/nishkulanand_swami_kirtans.json',
        author: 'Sadguru Nishkulanand Swami (સદ્‍ગુરુ નિષ્કુળાનંદ સ્વામી)',
        itemCount: nishkulanandKirtans.length
      },
      devanand_swami_kirtans: {
        file: 'data/devanand_swami_kirtans.json',
        author: 'Sadguru Devanand Swami (સદ્‍ગુરુ દેવાનંદ સ્વામી)',
        itemCount: devanandKirtans.length
      },
      other_paramhansas_kirtans: {
        file: 'data/other_paramhansas_kirtans.json',
        description: 'Compositions of Krushnanand Swami, Bhoomanand Swami, Manjukeshanand Swami, Dayanand Swami, Akhandanand Muni, Jeram Brahmachari, Shatanand Muni, Sukhanand Swami, Nityanand Swami, etc.',
        itemCount: otherSantosFormatted.length
      },
      acharya_parampara_kirtans: {
        file: 'data/acharya_parampara_kirtans.json',
        description: 'Compositions by Acharya Viharilalji Maharaj and Acharya Ayodhyaprasadji Maharaj.',
        itemCount: acharyaFormatted.length
      },
      all_aarti_ashtak_collection: {
        file: 'data/all_aarti_ashtak_collection.json',
        itemCount: 24
      }
    },
    totalKirtansIndexed: index.length
  };

  fs.writeFileSync(path.join(dataDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf-8');

  console.log('\n=============================================');
  console.log(`Extraction complete! Total kirtans indexed: ${index.length}`);
  console.log('=============================================\n');
}

run().catch(console.error);

