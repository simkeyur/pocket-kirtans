# Pocket Kirtans

[![Live Web App](https://img.shields.io/badge/Live%20App-simkeyur.github.io%2Fpocket--kirtans-black?style=for-the-badge&logo=pwa)](https://simkeyur.github.io/pocket-kirtans/)

Minimalist, distraction-free Swaminarayan Kirtans, Aarti, Chesta & Nitya Niyam Progressive Web App (PWA) with full offline support for traveling and daily devotional reading.

- **Live URL**: https://simkeyur.github.io/pocket-kirtans/
- **GitHub Repo**: https://github.com/simkeyur/pocket-kirtans

---

## ✨ Design & Features

- **Strictly Two Colors**: True OLED Black (`#000000`) and Pure White (`#ffffff`) with automatic toggle.
- **Glassmorphism UX**: Floating translucent glass bottom bar inspired by the latest iOS release.
- **Script Switcher**: Toggle between **ગુજરાતી** (Gujarati script), **English** (transliteration), or **Both** side by side.
- **Reader Controls**: Font size cycling (`A±`), verse indicators, and one-touch sequential pad navigation (`← Previous` / `Next →`).
- **100% Offline PWA**: Installable on iPhone/Android Home Screen; service worker precaches all core files and kirtan texts so you can use it mid-flight with zero cellular signal.
- **Offline Bookmarks**: Tap the heart icon on any kirtan to save it to your **Saved** tab.

---

## 📁 Dataset Inventory (1,487 Total Kirtans & Prayers)

| Dataset File | Saint / Category | Records | Description |
| :--- | :--- | :---: | :--- |
| [`data/nitya_kriya.json`](file:///Users/simkeyur/src/Apps/pocketkirtan/data/nitya_kriya.json) | **Nitya Kriya & Shayan (Sleep)** | **37** | **Full Chesta (13 padas)**, **Core Bedtime/Sleep Kirtans** (*Poḍhe Prabhu*, *Re Shyam*, *Poḍho Poḍho*, *Meetha Vahala*), **Dhyan Chintamani (8 padas)**, and **Godi Padas (12 padas)**. |
| [`data/original_aarti_and_ashtak.json`](file:///Users/simkeyur/src/Apps/pocketkirtan/data/original_aarti_and_ashtak.json) | **Original Aarti & Nitya Niyam** | **24** | **The authentic original Aarti ("Jay Sadguru Swami")** composed by Muktanand Swami, **Traditional Dhun**, **Radhika-Krishna Ashtakam** (*Navinajimut Samanvarnam*), **Nirvikalp Uttam Ati**, **Dandvat Shloks**, and the **5 Daily Mandir Aartis**. |
| [`data/premanand_swami_kirtans.json`](file:///Users/simkeyur/src/Apps/pocketkirtan/data/premanand_swami_kirtans.json) | **Sadguru Premanand Swami** | **689** | Murti varnan, leela padas, prabhatiya, and prem-lakshana bhakti kirtans by Premsakhi. |
| [`data/brahmanand_swami_kirtans.json`](file:///Users/simkeyur/src/Apps/pocketkirtan/data/brahmanand_swami_kirtans.json) | **Sadguru Brahmanand Swami** | **269** | Devotional songs, Dingal/Vraj poetry, utsav padas, and stutis by Brahmamuni. |
| [`data/muktanand_swami_kirtans.json`](file:///Users/simkeyur/src/Apps/pocketkirtan/data/muktanand_swami_kirtans.json) | **Sadguru Muktanand Swami** | **173** | Aarti, thals, padas, and philosophical bhakti compositions. |
| [`data/nishkulanand_swami_kirtans.json`](file:///Users/simkeyur/src/Apps/pocketkirtan/data/nishkulanand_swami_kirtans.json) | **Sadguru Nishkulanand Swami** | **172** | Vairagya padas, Chosath Padi, Updesh, and spiritual determination hymns by Vairagya Murti. |
| [`data/devanand_swami_kirtans.json`](file:///Users/simkeyur/src/Apps/pocketkirtan/data/devanand_swami_kirtans.json) | **Sadguru Devanand Swami** | **64** | Cheti le manva, human-birth guidance, and deep renunciation hymns. |
| [`data/other_paramhansas_kirtans.json`](file:///Users/simkeyur/src/Apps/pocketkirtan/data/other_paramhansas_kirtans.json) | **Other Nand Santos & Paramhansas** | **87** | Compositions by Krushnanand Swami, Bhoomanand Swami, Manjukeshanand Swami, Dayanand Swami, Akhandanand Muni, Jeram Brahmachari, Shatanand Muni, Sukhanand Swami, Nityanand Swami, etc. |
| [`data/acharya_parampara_kirtans.json`](file:///Users/simkeyur/src/Apps/pocketkirtan/data/acharya_parampara_kirtans.json) | **Acharya Parampara** | **20** | Hymns and prayer compositions by Acharya Viharilalji Maharaj and Acharya Ayodhyaprasadji Maharaj. |
| [`data/kirtan_index.json`](file:///Users/simkeyur/src/Apps/pocketkirtan/data/kirtan_index.json) | **Master Unified Search Index** | **1,487** | Ultra-fast in-memory index of all 1,487 kirtans (contains IDs, titles in Gujarati & English, author, category, raag) for instant search and browsing. |

---

## 📱 Installing on iPhone / Android (PWA)

1. Open **https://simkeyur.github.io/pocket-kirtans/** in **Safari** (iOS) or **Chrome** (Android).
2. Tap the **Share** button (iOS Safari) or **⋮ Menu** (Android).
3. Select **Add to Home Screen**.
4. The app will launch with a standalone, full-screen display with the custom black and white Pocket Kirtans icon.
