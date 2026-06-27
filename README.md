# 🌊 SEAPEDIA Backend API
**Proyek Seleksi Software Engineering Academy - COMPFEST 18**

SEAPEDIA adalah sebuah *Application Programming Interface* (API) untuk platform *marketplace* komprehensif yang memfasilitasi transaksi multi-peran (Pembeli, Penjual, Kurir, dan Admin). Proyek ini dibangun dari nol untuk memenuhi seluruh *Business Rules* dan tantangan teknis dari Level 1 hingga Level 7.

---

## 🚀 Live Deployment (Bonus 15 Poin)
Backend API ini telah berhasil di-*deploy* secara *serverless* dan dapat diakses publik melalui:
👉 **[https://seapedia-app.vercel.app/](seapedia-app.vercel.app)**

*(Copy dan paste link ke chrome).*
*(Catatan: Gunakan base URL di atas untuk menggantikan `http://localhost:3000` saat melakukan pengujian menggunakan Postman, Thunder Client, atau saat integrasi dengan Frontend).*

---

## 🛠️ Tech Stack
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** PostgreSQL (Hosted on Neon.tech)
*   **ORM:** Prisma
*   **Authentication:** JSON Web Token (JWT) & bcrypt (Password Hashing)
*   **Security:** `xss` library untuk pencegahan Cross-Site Scripting
*   **Deployment:** Vercel

---

## 🎯 Fitur & Pencapaian Level
*   ✅ **Level 1:** Registrasi, Login JWT, Multi-Role, Katalog Produk, Ulasan Publik.
*   ✅ **Level 2:** Manajemen Toko dan CRUD Produk oleh *Seller*.
*   ✅ **Level 3:** Sistem Dompet (*Wallet*), Keranjang (*Cart*), Aturan *Single-Store Checkout*, dan Kalkulasi Transaksi.
*   ✅ **Level 4:** Sistem Diskon (Voucher/Promo) Admin, *Order Processing* Seller, & Laporan Keuangan.
*   ✅ **Level 5:** Alur Logistik Kurir (*Driver Workflow*) mulai dari ambil paket hingga selesai.
*   ✅ **Level 6:** Dasbor Pemantauan Admin & Sistem Pengembalian Dana Otomatis (*Auto-Refund/Overdue*).
*   ✅ **Level 7:** Keamanan (Anti SQL-Injection & Anti-XSS) serta Dokumentasi *End-to-End*.

---

## ⚙️ Cara Menjalankan di Lokal (Local Setup)

Jika ingin menjalankan kode ini di laptop lokal untuk pengembangan:

1.  **Clone repositori ini:**
    ```bash
    git clone [https://github.com/USERNAME_KAMU/SEAPEDIA.git](https://github.com/USERNAME_KAMU/SEAPEDIA.git)
    cd SEAPEDIA
    ```
2.  **Instal dependensi:**
    ```bash
    npm install
    ```
3.  **Siapkan Database:**
    *   Buat file `.env` di folder utama.
    *   Isi dengan: `DATABASE_URL="postgresql://user:password@host/db_name"`
4.  **Migrasi Prisma:**
    ```bash
    npx prisma migrate dev
    npx prisma generate
    ```
5.  **Jalankan Server:**
    ```bash
    npm start
    ```

---

## 📚 Dokumentasi API Singkat

Semua *endpoint* privat wajib menyertakan token di bagian header:
`Authorization: Bearer <TOKEN_JWT_SESUAI_PERAN>`

### 👤 Autentikasi & Akun
*   `POST /api/auth/register` - Daftar akun baru.
*   `POST /api/auth/login` - Masuk dan dapatkan Token (berlaku 1 hari).
*   `POST /api/auth/select-role` - Memilih/mengubah peran aktif (`activeRole`).
*   `GET /api/auth/me` - Lihat profil pengguna.

### 🏪 Fitur Publik & Buyer
*   `GET /api/products` - Lihat katalog publik.
*   `POST /api/reviews` - Kirim ulasan aplikasi (Aman dari XSS).
*   `GET /api/wallet` - Cek saldo dompet (Khusus BUYER).
*   `POST /api/wallet/topup` - Isi saldo dompet (Khusus BUYER).
*   `POST /api/cart` - Tambah produk ke keranjang.
*   `POST /api/checkout` - Eksekusi transaksi, hitung ongkir, PPN 12%, dan validasi Diskon.
*   `GET /api/buyer/report` - Laporan pengeluaran pembeli.

### 🛍️ Fitur Seller
*   `POST /api/stores` - Buka toko baru.
*   `POST /api/products` - Tambah produk ke toko.
*   `PUT /api/products/:id` - Edit produk.
*   `DELETE /api/products/:id` - Hapus produk.
*   `GET /api/seller/orders` - Lihat pesanan masuk.
*   `PUT /api/seller/orders/:orderId/process` - Proses pesanan ke kurir.
*   `GET /api/seller/report` - Laporan pendapatan bersih toko.

### 🛵 Fitur Driver (Kurir)
*   `GET /api/driver/jobs/available` - Cari paket siap kirim.
*   `PUT /api/driver/jobs/:jobId/take` - Ambil pekerjaan kiriman.
*   `PUT /api/driver/jobs/:jobId/complete` - Selesaikan pengiriman & terima upah.
*   `GET /api/driver/dashboard` - Dasbor riwayat dan total pendapatan.

### 👑 Fitur Admin
*   `POST /api/admin/vouchers` - Buat kuota diskon terbatas.
*   `POST /api/admin/promos` - Buat promo tanpa batas kuota.
*   `GET /api/admin/monitoring` - Lihat statistik *marketplace* secara *real-time*.
*   `POST /api/admin/simulate-overdue` - Picu mesin waktu untuk membatalkan pesanan yang telat (SLA) & *Auto-Refund*.

---

## 🛡️ Keamanan & Testing (Level 7)

### Catatan Keamanan
1.  **SQL Injection Prevention:** Seluruh interaksi *database* menggunakan Prisma ORM yang secara otomatis melakukan *parameterized queries* sehingga kebal terhadap serangan SQL Injection.
2.  **XSS (Cross-Site Scripting) Prevention:** Input publik, terutama pada komentar ulasan (*App Review*), telah disanitasi menggunakan pustaka `xss` sebelum disimpan ke *database*.
3.  **Role-Based Access Control (RBAC):** Autorisasi divalidasi secara ketat di level *backend* melalui JWT Payload (`activeRole`) dan *middleware*. Pengguna multi-peran hanya dapat mengakses *endpoint* privat yang sesuai dengan peran aktif mereka.
4.  **Data Ownership Validation:** Aksi operasional sensitif memiliki pengecekan lapis dua untuk memastikan entitas tersebut benar-benar milik *user* yang memintanya.

### Panduan Pengujian (End-to-End Demo Guide)
Untuk mengevaluasi alur lengkap sistem SEAPEDIA, ikuti siklus ini:
1.  **Guest & Auth:** Buka katalog publik (`GET /api/products`), buat akun (`POST /api/auth/register`), dan tinggalkan ulasan (`POST /api/reviews`).
2.  **Seller:** Login dan pilih peran `SELLER`. Buat toko (`POST /api/stores`), lalu tambahkan produk.
3.  **Buyer:** Beralih ke peran `BUYER`. Lakukan *top-up* (`POST /api/wallet/topup`), masukkan barang ke keranjang, dan lakukan *checkout* (`POST /api/checkout`) menggunakan kode voucher Admin.
4.  **Seller:** Kembali ke `SELLER`. Cek pesanan masuk, lalu proses pesanan (`PUT /api/seller/orders/:id/process`).
5.  **Driver:** Beralih ke peran `DRIVER`. Cari pekerjaan logistik (`GET /api/driver/jobs/available`), ambil pekerjaannya, dan selesaikan pengiriman untuk mendapat upah.
6.  **Admin:** Login sebagai `ADMIN`. Cek seluruh statistik di Dasbor (`GET /api/admin/monitoring`), atau lakukan *Auto-Refund* (`POST /api/admin/simulate-overdue`) pada pesanan yang sengaja didiamkan.

---
**✨ Backend Developed with ❤️ for COMPFEST 18 ✨**