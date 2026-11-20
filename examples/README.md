# Examples

Contoh deck yang sama, dirender dalam beberapa kombinasi **design × theme**. Semua memakai satu set slide yang sama (`examples/slides/`, 12 slide = 12 layout), jadi beda yang Anda lihat murni dari design dan theme-nya.

## Demo fitur 2.0

`examples/features/` punya slide sendiri (`examples/features/slides/`, 11 slide) yang memakai sintaks `<slide layout>` + `<ph>`, autofit, `<chart>`, `<shape>`, `<connector>`, dan flowchart Mermaid. Hasil build: `examples/html/features.html`.

## Laporan kampus (campus-slide)

`examples/campus-slide/` (13 slide) adalah kerangka presentasi kampus (tugas kelompok / seminar) dengan design dan theme `campus-slide`. Isinya placeholder generik — sampul (mata kuliah, kelompok, anggota, dosen), latar belakang, rumusan masalah, metodologi, hasil, pembahasan, rekomendasi, kesimpulan — tinggal diganti. Gaya: kicker berjarak lebar, judul navy, panel biru muda, tabel header gelap + zebra, pita **Kesimpulan** (`<ph name="takeaway">`), bar footer merah, sampul abu. Tabel lebih dari 7 baris dipecah ke slide lanjutan. Hasil build: `examples/html/campus-slide.html`; `node pptx.js --root examples/campus-slide` menghasilkan .pptx dengan font Carlito ter-embed.

## Komponen dan diagram

`examples/components/` (16 slide, design `consulting` + theme `slate-rust`) memakai semua blok tata letak dan diagram baru: `.rows` bernomor dan berikon, `.is-key`, layout `content-aside`, `.bands` sebelum/sesudah, `.hero`, `.callout` / `.boxed` / `.chips`, kartu dengan `.push`, timeline dengan satu tahap disorot, dan `<diagram>` venn, matrix, cycle, funnel, pyramid, scale. Hasil build: `examples/html/components.html`.

## Build semua

```bash
node examples/build-all.js
```

Hasilnya masuk ke `examples/html/<nama>.html` — tinggal buka di browser, tanpa server.

## Kombinasi yang tersedia

| Folder | Design | Theme |
|---|---|---|
| `default-navy` | default | navy |
| `default-paper` | default | paper |
| `default-botanical` | default | botanical |
| `default-swiss` | default | swiss |
| `default-neon` | default | neon |
| `editorial-navy` | editorial | navy |
| `brutalist-navy` | brutalist | navy |
| `geometric-navy` | geometric | navy |
| `architectural-navy` | architectural | navy |
| `ribbon-navy` | ribbon | navy |
| `plate-navy` | plate | navy |
| `campus-paper` | campus | paper |
| `keynote-navy` | keynote | navy |
| `colloquium-paper` | colloquium | paper |
| `lesson-paper` | lesson | paper |
| `spotlight-navy` | spotlight | navy |
| `dark-academia-navy` | dark-academia | navy |
| `consulting-slate-rust` | consulting | slate-rust |
| `scholar-petrol-gold` | scholar | petrol-gold |
| `organic-petrol-gold` | organic | petrol-gold |
| `minimal-terracotta` | minimal | terracotta |
| `lineart-parchment-gold` | lineart | parchment-gold |

Lima baris pertama menunjukkan **perbedaan theme** (design sama). Enam belas baris terakhir menunjukkan **perbedaan design** (theme sama).

## Cara menambah contoh baru

```bash
mkdir -p examples/my-deck
```

Lalu buat `examples/my-deck/deck.json`:

```json
{
  "title": "Judul deck",
  "footer": "Footer kiri —",
  "output": "my-deck.html",
  "slides": "../slides",
  "design": "editorial",
  "theme": "paper",
  "motion": "cinematic"
}
```

`"slides": "../slides"` menunjuk ke set slide bersama. Kalau mau deck dengan slide sendiri, buat folder `slides/` di dalam folder contoh dan hapus key `slides`.

Jalankan ulang `node examples/build-all.js`.
