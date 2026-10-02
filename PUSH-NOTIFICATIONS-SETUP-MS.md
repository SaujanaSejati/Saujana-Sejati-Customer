# Push Notification Booking — Saujana Sejati Ent

Kod ini menyediakan asas Web Push untuk dua penerima (Hairi dan Amirul). Ia belum aktif sehingga langkah konfigurasi Supabase di bawah selesai.

## Apa yang diperlukan

- HTTPS website (GitHub Pages sudah menggunakan HTTPS).
- Supabase Edge Function bernama `saujana-web-push`.
- Web Push VAPID key pair.
- Dua peranti didaftarkan melalui halaman pendaftaran push yang selamat.
- iPhone: iOS/iPadOS 16.4 atau lebih baharu, website ditambah ke Home Screen, kemudian kebenaran notifikasi diberi daripada aplikasi web tersebut.
- Bunyi notifikasi tertakluk kepada tetapan peranti, Focus/Silent mode, browser dan sistem operasi.

## 1. Jana VAPID keys

Pada komputer yang mempunyai Node.js:
```bash
npx web-push generate-vapid-keys
```
Simpan public/private key dengan selamat. Jangan masukkan private key ke dalam fail HTML/JavaScript awam.

## 2. Deploy Edge Function

Pasang Supabase CLI dan log masuk:
```bash
supabase login
supabase link --project-ref wvxaiojnxwzcdrczbdup
supabase functions deploy saujana-web-push --no-verify-jwt
``

Tetapkan secrets (gantikan nilai contoh dengan nilai sebenar; jangan commit nilai rahsia):
```bash
supabase secrets set VAPID_PUBLIC_KEY="PUBLIC_KEY_ANDA"
supabase secrets set VAPID_PRIVATE_KEY="PRIVATE_KEY_ANDA"
supabase secrets set VAPID_SUBJECT="mailto:EMAIL_ADMIN_ANDA"
supabase secrets set SAUJANA_PUSH_WEBHOOK_SECRET="RAHSIA_RAWAK_PANJANG"
supabase secrets set SAUJANA_PUSH_ENROLLMENT_CODE="KOD_PENDAFTARAN_RAHsia_PANJANG"
``
Function juga memerlukan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`, yang biasanya tersedia sebagai environment secrets terbina dalam Edge Functions.

## 3. Sediakan pangkalan data

Jalankan fail `supabase/migrations/20261002_web_push.sql` dalam Supabase SQL Editor. Ia mewujudkan jadual langganan yang tiada akses awam dan trigger selepas booking baru dimasukkan.

Kemudian buka Supabase Dashboard → SQL Editor dan simpan dua nilai dalam Vault (jangan letak dalam jadual awam):
- `saujana_push_function_url` = `https://wvxaiojnxwzcdrczbdup.supabase.co/functions/v1/saujana-web-push`
- `saujana_push_webhook_secret` = nilai sama dengan `SAUJANA_PUSH_WEBHOOK_SECRET`

Jika Vault UI meminta SQL, gunakan:
```sql
select vault.create_secret(
  'https://wvxaiojnxwzcdrczbdup.supabase.co/functions/v1/saujana-web-push',
  'saujana_push_function_url',
  'Saujana push function URL'
);
select vault.create_secret(
  'GANTIKAN_DENGAN_SECRET_YANG_SAMA',
  'saujana_push_webhook_secret',
  'Saujana push webhook secret'
);
``
Jalankan hanya sekali bagi setiap nama secret. Jika sudah wujud, kemas kini secret melalui Vault UI, jangan cipta nama pendua.

## 4. Daftar dua telefon

Halaman pendaftaran telah disediakan di:
`https://saujanasejati.github.io/Saujana-Sejati-Customer/push-register.html`

1. Tetapkan secret `SAUJANA_PUSH_ENROLLMENT_CODE` di Edge Function menggunakan kod rawak yang panjang.
2. Simpan kod itu secara peribadi; jangan hantar dalam chat kumpulan atau letak dalam repo.
3. Pastikan migration SQL sudah dijalankan dan dua secret Vault sudah disimpan.
4. Buka halaman pendaftaran di telefon Hairi. Pada iPhone, buka menggunakan Safari, tekan Share → Add to Home Screen, buka ikon Home Screen, kemudian buka halaman pendaftaran dari situ.
5. Pilih Hairi, masukkan kod pendaftaran, tekan Aktifkan dan benarkan notifikasi.
6. Ulang pada telefon Amirul, pilih Amirul.
7. Buat satu booking ujian sebenar dan sahkan kedua-dua telefon menerima notifikasi.

Jika guna Android, buka melalui Chrome dan benarkan notifikasi. Bunyi masih tertakluk pada tetapan sistem telefon.

**Jangan benarkan halaman awam menulis terus ke jadual langganan.** Halaman pendaftaran menghantar subscription ke Edge Function yang menyemak kod di server.

## Nota keselamatan dan tingkah laku

- Trigger tidak menghalang booking daripada disimpan jika push gagal.
- Jangan dedahkan service-role key atau VAPID private key dalam HTML, repo awam atau screenshot.
- Kandungan push hanya ringkasan minimum; buka dashboard yang dilindungi login untuk butiran pelanggan.
- Jika mahu butiran booking lengkap dalam notifikasi, pertimbangkan implikasi privasi terlebih dahulu.
