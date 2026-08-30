# SURVIVE 60 SECONDS

Game survival mobile-first berbasis web. Bertahan hidup selama 60 detik sambil menghindari musuh yang terus berdatangan — jangan sampai keluar arena, dan jangan sampai tertangkap.

## Cara Menjalankan

1. Pastikan tiga file ini ada dalam satu folder: `index.html`, `style.css`, `script.js`
2. Buka `index.html` langsung di browser (double-click), atau host lewat static server apa pun (GitHub Pages, Netlify, dll)
3. Butuh koneksi internet saat pertama dibuka (font diambil dari Google Fonts)

## Cara Main

- **Geser jari (mobile) atau mouse (desktop)** di area permainan untuk menggerakkan orb — orb otomatis terkunci di dalam canvas, tidak bisa keluar arena
- **Hindari musuh** (lingkaran magenta/oranye) yang datang dari segala arah — kena satu kali = game over
- **Mepet musuh dari jarak dekat tanpa nabrak** memicu bonus **GRAZE (+15 poin)** — mekanik risk-and-reward buat ngejar skor tinggi
- **Bertahan penuh 60 detik** = bonus **SURVIVOR (+200 poin)** dan ditandai bintang (★) di leaderboard

## Sistem Skor

| Sumber | Poin |
|---|---|
| Waktu bertahan | 10 poin / detik |
| Graze (nyerempet musuh) | +15 poin / graze |
| Survive 60 detik penuh | +200 poin (bonus) |

## Leaderboard

- Top 10 skor tertinggi disimpan **lokal di browser** pemain (`localStorage`), tidak perlu server/database
- Kalau skor akhir masuk top 10, muncul form untuk isi nama (maks 12 karakter)
- Leaderboard bisa diakses dari menu awal maupun layar game over

## Difficulty Curve

Musuh spawn makin sering dan makin cepat seiring waktu berjalan:
- Interval spawn awal ~950ms, terus mengecil sampai batas minimum ~260ms
- Kecepatan musuh naik bertahap dari waktu ke waktu
- Setelah detik ke-30, ada peluang musuh spawn ganda dalam satu waktu

Arah musuh diacak dengan sedikit bias ke posisi pemain saat spawn, lalu bergerak lurus (tidak mengejar/tracking) — supaya tetap adil dan bisa dihindari.

## Struktur File

```
mini-game-survive-60-seconds/
├── index.html   # struktur & layar (start, game over, leaderboard)
├── style.css    # tema neon arcade, layout mobile-first
├── script.js    # game loop, input, collision, leaderboard
└── README.md
```

## Teknologi

Vanilla HTML5 Canvas + CSS + JavaScript — tanpa framework, tanpa build step, tanpa dependency backend.

## Kustomisasi Cepat

Semua parameter utama gameplay ada di bagian atas `script.js`:
- `GAME_LENGTH` — durasi permainan (detik)
- `MAX_ENTRIES` — jumlah slot leaderboard
- `spawnInterval(t)`, `enemySpeed(t)`, `enemyRadius(t)` — kurva kesulitan
