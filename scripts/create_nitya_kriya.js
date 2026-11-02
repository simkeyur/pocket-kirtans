/**
 * Generates data/nitya_kriya.json
 * Extracts full Chesta (Lila Chintamani), core Shayan (sleep) kirtans,
 * Dhyan Chintamani, and Godi padas for bedtime and evening devotional rituals.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.anirdesh.com/kirtan';

async function fetchKirtanDetails(part, no, retries = 3) {
  const url = `${BASE_URL}/getkirtan.php?part=${part}&no=${no}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 400 * attempt));
    }
  }
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
    lyrics_gu: raw.gujarati || '',
    lyrics_en: raw.english || '',
    stanzas_gu: stanzasGu,
    stanzas_en: stanzasEn
  };
}

async function run() {
  console.log('Fetching Nitya Kriya components (Full Chesta, Shayan, Dhyan Chintamani, Godi)...');

  // 1. Full Chesta (1-170 to 1-182)
  console.log('Fetching Full Chesta (13 padas)...');
  const chestaNumbers = [170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182];
  const chestaItems = [];
  for (const no of chestaNumbers) {
    const raw = await fetchKirtanDetails(1, no);
    chestaItems.push(formatKirtan(raw));
  }

  // 2. Shayan / Sleep Kirtans
  console.log('Fetching Sleep (Shayan) Kirtans...');
  const shayanNumbers = [183, 184, 197, 198];
  const shayanItems = [];
  for (const no of shayanNumbers) {
    const raw = await fetchKirtanDetails(1, no);
    const item = formatKirtan(raw);
    if (no === 183) item.writer_en = 'Sadguru Muktanand Swami';
    if (no === 184) item.writer_en = 'Sadguru Brahmanand Swami';
    if (no === 197) item.writer_en = 'Sadguru Premanand Swami';
    if (no === 198) item.writer_en = 'Sadguru Brahmanand Swami';
    shayanItems.push(item);
  }

  // 3. Dhyan Chintamani (1-185 to 1-192)
  console.log('Fetching Dhyan Chintamani (8 padas)...');
  const dhyanNumbers = [185, 186, 187, 188, 189, 190, 191, 192];
  const dhyanItems = [];
  for (const no of dhyanNumbers) {
    const raw = await fetchKirtanDetails(1, no);
    dhyanItems.push(formatKirtan(raw));
  }

  // 4. Godi Padas (1-142 to 1-153)
  console.log('Fetching Godi Padas (12 padas)...');
  const godiNumbers = [142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153];
  const godiItems = [];
  for (const no of godiNumbers) {
    const raw = await fetchKirtanDetails(1, no);
    godiItems.push(formatKirtan(raw));
  }

  const nityaKriyaDoc = {
    metadata: {
      title: "Swaminarayan Nitya Kriya, Full Chesta & Shayan (Sleep) Kirtans",
      tradition: "Original Swaminarayan Sampraday (Shree Swaminarayan Gurukul Rajkot, Bhuj Mandir, Vadtal Dham)",
      description: "Complete daily evening and bedtime devotional rituals including the Full 13-Pad Chesta (Swabhavik Leela Chintamani), iconic Shayan (Sleep) Kirtans, 8-Pad Murti Dhyan Chintamani, and Godi Padas.",
      generatedAt: new Date().toISOString()
    },
    sections: {
      full_chesta: {
        title_gu: "શ્રીહરિ સ્વાભાવિક ચેષ્ટા (નર્તન ચેષ્ટા - લીલા ચિન્તામણિ)",
        title_en: "Shree Hari Swabhavik Chesta (Lila Chintamani)",
        composer_gu: "સદ્‍ગુરુ પ્રેમાનંદ સ્વામી & સદ્‍ગુરુ નિષ્કુળાનંદ સ્વામી",
        composer_en: "Sadguru Premanand Swami & Sadguru Nishkulanand Swami",
        description: "Recited every night by devotees before sleeping. In 13 padas, it paints an intimate word-picture of every gesture, gait, laughter, food, clothes, and divine habits of Bhagwan Swaminarayan.",
        total_padas: chestaItems.length,
        padas: chestaItems
      },
      shayan_kirtans: {
        title_gu: "મુખ્ય શયન અને પોઢવાના કીર્તનો",
        title_en: "Core Shayan & Bedtime (Sleep) Kirtans",
        description: "Hymns sung at bedtime to lovingly put the Lord and deities to sleep.",
        total_kirtans: shayanItems.length,
        kirtans: shayanItems
      },
      dhyan_chintamani: {
        title_gu: "ધ્યાન ચિન્તામણિ (મૂર્તિ ધ્યાનના પદો)",
        title_en: "Dhyan Chintamani (Murti Meditation Hymns)",
        composer_gu: "સદ્‍ગુરુ પ્રેમાનંદ સ્વામી",
        composer_en: "Sadguru Premanand Swami",
        description: "8 consecutive padas meditating upon Bhagwan Swaminarayan's divine form from crown to lotus feet, traditionally contemplated before falling asleep.",
        total_padas: dhyanItems.length,
        padas: dhyanItems
      },
      godi_padas: {
        title_gu: "ગોડીનાં પદો (સંધ્યા / રાત્રિ સભા પદો)",
        title_en: "Godi Padas (Evening Assembly Hymns)",
        description: "12 padas composed by Brahmanand Swami and Premanand Swami (including 'Chhel chhogalo', 'Sant samagam kije', etc.) traditionally sung in evening assemblies.",
        total_padas: godiItems.length,
        padas: godiItems
      }
    }
  };

  const outputPath = path.join(__dirname, '..', 'data', 'nitya_kriya.json');
  fs.writeFileSync(outputPath, JSON.stringify(nityaKriyaDoc, null, 2), 'utf-8');
  console.log(`\nSuccessfully created ${outputPath}!`);
  console.log(`- Full Chesta Padas: ${chestaItems.length}`);
  console.log(`- Shayan (Sleep) Kirtans: ${shayanItems.length}`);
  console.log(`- Dhyan Chintamani Padas: ${dhyanItems.length}`);
  console.log(`- Godi Padas: ${godiItems.length}`);
  console.log(`- Total Ritual Items: ${chestaItems.length + shayanItems.length + dhyanItems.length + godiItems.length}`);
}

run().catch(console.error);

