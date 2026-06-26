# SEAPEDIA Backend API - COMPFEST 18
Ini adalah repositori backend untuk tugas seleksi Software Engineering Academy COMPFEST 18.

## 🛠️ Teknologi yang Digunakan
* **Framework:** Node.js + Express.js
* **Database:** PostgreSQL
* **ORM:** Prisma
* **Keamanan:** JWT & Bcrypt

## 🚀 Cara Menjalankan Proyek Secara Lokal
1. **Clone repository ini:**
   ```bash
   git clone [https://github.com/AbidahPrasetyo/SEAPEDIA.git](https://github.com/AbidahPrasetyo/SEAPEDIA.git)
   cd seapedia-backend
2. **Install semua dependensi:**
   ```bash
   npm install
3. **Siapkan Environtment Variables:**
Buat file `.env` di root folder dan isi dengan konfigurasi database PostgreSQL kamu:
   ```Code snippet
   DATABASE_URL="postgresql://[USER]:[PASSWORD]@localhost:5432/seapedia_db?schema=public"
   ```
4. **Jalankan Migrasi Database (Prisma):**
   ```bash
   npx prisma migrate dev
   npx prisma generate
5. **Jalankan Server:**
   ```bash
   node index.js
   ```
   Server akan berjalan di `http://localhost:3000`
   
## Level 1: Welcome to SEAPEDIA! (Autentikasi & Publik)
Fitur pada level ini mencakup akses publik (tanpa login) dan sistem autentikasi dasar yang mendukung pemilihan peran aktif (*active role*).

---

### 1. Registrasi Akun Baru
Mendaftarkan pengguna baru ke dalam sistem. Satu akun dapat memiliki lebih dari satu peran.

*   **URL:** `/api/auth/register`
*   **Method:** `POST`
```json
    {
  "username": "sasa",
  "email": "sasa@example.com",
  "password": "passwordrahasia",
  "roles": ["BUYER", "SELLER"]
   }
```
**Response Sukses (201 Created):**
```json
    {
  "message": "Registrasi berhasil!",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "username": "sasa",
    "email": "sasa@example.com",
    "roles": ["BUYER", "SELLER"]
      }
   }
```
### 2. Login Akun
Mengautentikasi pengguna menggunakan email/username dan password. Mengembalikan Token JWT awal yang belum memiliki *active role*.

*   **URL:** `/api/auth/login`
*   **Method:** `POST`
```json
    {
  "username": "sasa",
  "password": "passwordrahasia"
   }
```
**Response Sukses (200 OK):**
```json
{
  "message": "Login berhasil!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5c...",
  "availableRoles": ["BUYER", "SELLER"]
}
```

### 3. Memilih Peran Aktif (Select Role)
Mengaktifkan salah satu peran untuk sesi saat ini. Wajib dilakukan sebelum mengakses dashboard privat. Membutuhkan Token JWT dari proses Login.

*   **URL:** `/api/auth/select-role`
*   **Method:** `POST`
*   **Header Wajib:** `Authorization: Bearer <TOKEN_DARI_LOGIN>`
```json
    {
  "role": "SELLER"
   }
```
**Response Sukses (200 OK):**
```json
{
  "message": "Sesi berhasil diubah. Peran aktif saat ini: SELLER",
  "token": "eyJhbGciOiJIUzI1NiIsInR5c... (TOKEN BARU)",
  "activeRole": "SELLER"
}
```

### 4. Melihat Profil & Peran Aktif
Mengambil data profil pengguna yang sedang *login* beserta peran yang sedang aktif.

*   **URL:** `/api/auth/me`
*   **Method:** `GET`
*   **Header Wajib:** `Authorization: Bearer <TOKEN_DARI_LOGIN>`
**Response Sukses (200 OK):**
```json
    {
  "profile": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "username": "sasa",
    "email": "sasa@example.com",
    "roles": ["BUYER", "SELLER"]
  },
  "activeRole": "SELLER"
   }
```

### 5. Katalog Produk Publik
Menampilkan daftar produk yang tersedia di marketplace. Dapat diakses oleh tamu (tanpa _login_).

*   **URL:** `/api/products`
*   **Method:** `GET`
*   **Body:** (Kosong)
**Response Sukses (200 OK):**
```json
    {
  "data": [
    {
      "id": "987fcdeb-51a2-43d7-9012-426614174000",
      "name": "Buku Pemrograman Node.js",
      "price": 50000,
      "stock": 10,
      "storeId": "123e4567-e89b-12d3-a456-426614174000",
      "store": {
        "name": "Toko Vokasi Sasa"
      }
    }
  ]
}
```

### 6. Submit Review Aplikasi Publik
Mengirimkan ulasan terkait pengalaman menggunakan aplikasi SEAPEDIA. Dapat dilakukan oleh tamu.

*   **URL:** `/api/reviews`
*   **Method:** `POST`
*   **Body JSON:**
```json
    {
  "name": "Pengunjung",
  "rating": 5,
  "comment": "Aplikasi marketplace yang sangat responsif!"
}
```
**Response Sukses (201 Created):**
```json
{
  "message": "Terima kasih atas ulasanmu!",
  "review": {
    "id": "111a222b-333c-444d-555e-666f777g888h",
    "name": "Pengunjung",
    "rating": 5,
    "comment": "Aplikasi marketplace yang sangat responsif!",
    "createdAt": "2026-06-24T10:00:00.000Z"
  }
}
```

## Level 2: Fitur Seller (Manajemen Toko & Produk)

Fitur pada level ini dikhususkan untuk pengguna dengan peran aktif (`activeRole`) sebagai `SELLER`. Semua *endpoint* di bawah ini mewajibkan autentikasi token JWT.

**Header Wajib:**
`Authorization: Bearer <TOKEN_JWT_DARI_LOGIN_ATAU_SELECT_ROLE>`

---

### 1. Melihat Dasbor Toko Sendiri
Mengambil informasi toko milik pengguna beserta daftar produk (buku) yang dijual di toko tersebut.

*   **URL:** `/api/stores/me`
*   **Method:** `GET`
*   **Body:** (Kosong)
*   **Response Sukses (200 OK):**
```json
    {
      "data": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Nama Toko Sasa",
        "ownerId": "id-user-seller",
        "products": [
          {
            "id": "987fcdeb-51a2-43d7-9012-426614174000",
            "name": "Buku Pemrograman Node.js",
            "price": 50000,
            "stock": 10
          }
        ]
      }
    }
```

### 2. Update Data Produk
Mengubah detail informasi produk yang ada di dalam toko milik *seller*. Hanya pemilik toko yang dapat mengedit produknya sendiri.

*   **URL:** `/api/products/:id` *(ganti `:id` dengan ID produk)*
*   **Method:** `PUT`
*   **Body JSON (Kirimkan field yang ingin diubah saja):**
```json
    {
      "price": 55000,
      "stock": 8
    }
```
*   **Response Sukses (200 OK):**
```json
    {
      "message": "Produk berhasil diupdate!",
      "product": {
        "id": "987fcdeb-51a2-43d7-9012-426614174000",
        "name": "Buku Pemrograman Node.js",
        "price": 55000,
        "stock": 8
      }
    }
```

### 3. Menghapus Produk
Menghapus produk dari *database* toko. Sistem akan memvalidasi bahwa produk tersebut benar-benar milik *seller* yang sedang *login*.

*   **URL:** `/api/products/:id` *(ganti `:id` dengan ID produk)*
*   **Method:** `DELETE`
*   **Body:** (Kosong)
*   **Response Sukses (200 OK):**
```json
    {
      "message": "Produk berhasil dihapus!"
    }
```

### Penanganan Error (Error Handling) Level 2:
*   **403 Forbidden:** Muncul jika token valid, tetapi `activeRole` pengguna saat ini bukanlah `SELLER`, atau jika pengguna mencoba mengedit/menghapus produk yang bukan milik tokonya.
*   **404 Not Found:** Muncul jika pengguna `SELLER` belum membuat toko, atau ID produk yang di-*request* tidak ditemukan di *database*.
*   **500 Internal Server Error:** Muncul jika terjadi kegagalan pada server atau koneksi *database* Prisma.

---

## Level 3: Buyer Experience (Dompet, Keranjang, & Checkout)

Fitur pada level ini dikhususkan untuk pengguna dengan peran aktif (`activeRole`) sebagai `BUYER`. Fitur ini mencakup logika *Single-Store Checkout* dan *Database Transaction*.

**Header Wajib:**
`Authorization: Bearer <TOKEN_JWT_DARI_SELECT_ROLE>`

### 1. Cek Saldo Dompet
Melihat jumlah saldo dompet virtual pembeli. Jika pembeli belum memiliki dompet, sistem akan otomatis membuatkannya dengan saldo Rp 0.

**URL:** `/api/wallet`
**Method:** `GET`
**Body:** (Kosong)

**Response Sukses (200 OK):**
```json
{
  "data": {
    "id": "dompet-id-123",
    "balance": 0,
    "userId": "buyer-id-456",
    "updatedAt": "2026-06-24T12:00:00.000Z"
  }
}
```

### 2. Top-Up Saldo Dompet

Menambahkan saldo ke dompet pembeli untuk persiapan *checkout*.

**URL:** `/api/wallet/topup`
**Method:** `POST`

**Body JSON:**

```json
{
  "amount": 500000
}

```

**Response Sukses (200 OK):**

```json
{
  "message": "Top-up sebesar Rp 500000 berhasil!",
  "wallet": {
    "id": "dompet-id-123",
    "balance": 500000,
    "userId": "buyer-id-456",
    "updatedAt": "2026-06-24T12:05:00.000Z"
  }
}

```

### 3. Lihat Isi Keranjang

Menampilkan isi keranjang belanja pembeli saat ini beserta detail produk dan toko.

**URL:** `/api/cart`
**Method:** `GET`
**Body:** (Kosong)

### 4. Tambah Produk ke Keranjang (Single-Store Rule)

Memasukkan produk ke dalam keranjang. Sistem akan menolak secara otomatis jika pembeli mencoba memasukkan produk dari toko yang berbeda dengan produk yang sudah ada di dalam keranjang.

**URL:** `/api/cart`
**Method:** `POST`

**Body JSON:**

```json
{
  "productId": "id-produk-buku-123",
  "quantity": 2
}

```

**Response Sukses (201 Created):**

```json
{
  "message": "Produk berhasil ditambahkan ke keranjang!",
  "item": {
    "id": "item-id-123",
    "cartId": "cart-id-456",
    "productId": "id-produk-buku-123",
    "quantity": 2
  }
}

```

### 5. Hapus Produk dari Keranjang

Menghapus spesifik item dari keranjang belanja.

**URL:** `/api/cart/:itemId` *(ganti `:itemId` dengan ID dari CartItem)*
**Method:** `DELETE`
**Body:** (Kosong)

### 6. Checkout Pesanan (Transaksi)

Memproses pembelian seluruh barang di keranjang. Sistem akan memvalidasi stok, memotong saldo dompet, menghitung PPN 12% dan ongkos kirim, membuat rekaman pesanan, mengurangi stok toko, dan mengosongkan keranjang.

**URL:** `/api/checkout`
**Method:** `POST`
**Body:** (Kosong, membaca langsung dari keranjang database)

**Response Sukses (200 OK):**

```json
{
  "message": "Checkout berhasil! Pesanan sedang diproses.",
  "receipt": {
    "id": "order-id-789",
    "userId": "buyer-id-456",
    "storeId": "store-id-123",
    "subtotal": 100000,
    "tax": 12000,
    "shippingCost": 15000,
    "totalAmount": 127000,
    "status": "PAID",
    "createdAt": "2026-06-24T12:15:00.000Z"
  }
}

```

---

## Level 4: Discounts and Seller Order Processing

Fitur pada level ini mencakup manajemen diskon (Voucher & Promo) oleh Admin, pemrosesan pesanan oleh Seller, serta rekapitulasi laporan transaksi.

### 1. Buat Voucher Baru (Khusus ADMIN)
Membuat diskon tipe Voucher dengan batas kedaluwarsa dan batas kuota penggunaan.

**URL:** `/api/admin/vouchers`
**Method:** `POST`
**Header:** `Authorization: Bearer <TOKEN_ADMIN>`

**Body JSON:**
```json
{
  "code": "COMPFEST18",
  "discount": 20000,
  "quota": 100,
  "expiresAt": "2026-12-31"
}

```

### 2. Buat Promo Baru (Khusus ADMIN)

Membuat diskon tipe Promo dengan batas kedaluwarsa tanpa batas kuota penggunaan.

**URL:** `/api/admin/promos`
**Method:** `POST`
**Header:** `Authorization: Bearer <TOKEN_ADMIN>`

**Body JSON:**

```json
{
  "code": "ONGKIRMURAH",
  "discount": 10000,
  "expiresAt": "2026-12-31"
}

```

### 3. Lihat Semua Diskon (Khusus ADMIN)

Mengambil seluruh data Voucher dan Promo yang tersedia di dalam sistem.

**URL:** `/api/admin/discounts`
**Method:** `GET`
**Header:** `Authorization: Bearer <TOKEN_ADMIN>`

### 4. Proses Pesanan (Khusus SELLER)

Mengubah status pesanan masuk dari `"Sedang Dikemas"` menjadi `"Menunggu Pengirim"`.

**URL:** `/api/seller/orders/:orderId/process`
**Method:** `PUT`
**Header:** `Authorization: Bearer <TOKEN_SELLER>`

### 5. Laporan Pengeluaran Buyer

Mengambil seluruh riwayat belanja pembeli beserta total kalkulasi uang yang telah dihabiskan.

**URL:** `/api/buyer/report`
**Method:** `GET`
**Header:** `Authorization: Bearer <TOKEN_BUYER>`

### 6. Laporan Pendapatan Seller

Mengambil seluruh riwayat pesanan yang masuk ke toko beserta total estimasi pendapatan bersih. Pendapatan dihitung dari subtotal setelah diskon (tidak termasuk ongkos kirim dan PPN).

**URL:** `/api/seller/report`
**Method:** `GET`
**Header:** `Authorization: Bearer <TOKEN_SELLER>`

---

## 📌 Level 5: Delivery and Driver Workflow

Fitur pada level ini dikhususkan untuk pengguna dengan peran aktif (`activeRole`) sebagai `DRIVER`. Fitur ini mencakup pencarian pekerjaan logistik, pengambilan pesanan, hingga penyelesaian pengiriman.

**Header Wajib:**
`Authorization: Bearer <TOKEN_DRIVER>`

### 1. Cari Pekerjaan Pengiriman
Menampilkan daftar pesanan dengan status "Menunggu Pengirim" yang belum diambil oleh kurir manapun.

**URL:** `/api/driver/jobs/available`
**Method:** `GET`
**Body:** (Kosong)

### 2. Ambil Pekerjaan (Take Job)
Mengambil pekerjaan pengiriman. Sistem akan mengunci pesanan ini untuk kurir yang mengambilnya dan mengubah status pesanan menjadi "Sedang Dikirim".

**URL:** `/api/driver/jobs/:jobId/take` *(ganti `:jobId` dengan ID DeliveryJob)*
**Method:** `PUT`
**Body:** (Kosong)

### 3. Selesaikan Pekerjaan (Complete Job)
Menandai bahwa barang telah sampai ke tangan pembeli. Status pesanan berubah menjadi "Pesanan Selesai" dan kurir mendapatkan upah pengiriman.

**URL:** `/api/driver/jobs/:jobId/complete`
**Method:** `PUT`
**Body:** (Kosong)

### 4. Dasbor Kurir & Riwayat Pendapatan
Mengambil rekapitulasi data pekerjaan kurir, termasuk pekerjaan yang sedang aktif (belum selesai), riwayat pekerjaan selesai, dan total pendapatan (*earnings*).

**URL:** `/api/driver/dashboard`
**Method:** `GET`
**Body:** (Kosong)