# Examples

Contoh deck yang sama, dirender dalam beberapa kombinasi **design × theme**. Semua memakai satu set slide yang sama (`examples/slides/`, 12 slide = 12 layout), jadi beda yang Anda lihat murni dari design dan theme-nya.

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

Lima baris pertama menunjukkan **perbedaan theme** (design sama). Tujuh baris terakhir menunjukkan **perbedaan design** (theme sama).

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
