const jwt = require('jsonwebtoken');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
// jwt akan kita pakai nanti saat pembuatan fitur Login
// const jwt = require('jsonwebtoken'); 

const prisma = new PrismaClient();
const app = express();

// Middleware wajib agar Express bisa membaca data JSON yang dikirim ke server
app.use(express.json());

// ==========================================
// MIDDLEWARE: SATPAM PENGECEK TOKEN
// ==========================================
const verifyToken = (req, res, next) => {
  // 1. Ambil token dari header request
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format standar: "Bearer <token>"

  // 2. Jika tidak ada token, tolak akses
  if (!token) {
    return res.status(401).json({ error: "Akses ditolak. Token tidak ditemukan!" });
  }

  // 3. Verifikasi keaslian token
  const SECRET_KEY = "RahasiaTokenIniSangatKuat"; // Harus sama dengan yang di rute Login
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Token tidak valid atau sudah kedaluwarsa!" });
    
    // 4. Jika valid, simpan data payload token ke dalam request (req.user)
    req.user = user; 
    next(); // Lanjut ke rute tujuan
  });
};

// ==========================================
// ROUTE: REGISTRASI USER
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  try {
    // 1. Tangkap data yang dikirim oleh user
    const { username, email, password, roles } = req.body;

    // 2. Cek apakah username atau email sudah pernah terdaftar
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email }, { username: username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: "Username atau Email sudah terdaftar!" });
    }

    // 3. Enkripsi (Hash) password demi keamanan
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Simpan data user baru ke database PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword,
        roles: roles // Contoh nilai: ["BUYER", "SELLER"]
      }
    });

    // 5. Kembalikan respons sukses (tanpa mengembalikan password!)
    res.status(201).json({
      message: "Registrasi berhasil!",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        roles: newUser.roles
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan internal pada server" });
  }
});

// ==========================================
// ROUTE: LOGIN USER
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. Cari user berdasarkan email ATAU username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: email }, { username: username }]
      }
    });

    // Jika user tidak ditemukan
    if (!user) {
      return res.status(401).json({ error: "Akun tidak ditemukan!" });
    }

    // 2. Cocokkan password yang diketik dengan yang ada di database (yang di-hash)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Password salah!" });
    }

    // 3. Buat JWT (Tiket Masuk)
    // RahasiaTokenIni harusnya ditaruh di file .env, tapi kita taruh di sini dulu agar mudah
    const SECRET_KEY = "RahasiaTokenIniSangatKuat"; 
    
    // Perhatikan: Kita HANYA memasukkan data yang tidak sensitif ke dalam token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        roles: user.roles
      }, 
      SECRET_KEY, 
      { expiresIn: '1d' } // Token hangus dalam 1 hari
    );

    // 4. Kirim balasan sukses beserta token dan daftar peran yang dimiliki
    res.status(200).json({
      message: "Login berhasil!",
      token: token,
      availableRoles: user.roles // Penting untuk Level 1 COMPFEST: Biar user tahu dia punya role apa saja
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan saat login" });
  }
});

// ==========================================
// ROUTE: MEMILIH PERAN AKTIF (ACTIVE ROLE)
// ==========================================
app.post('/api/auth/select-role', verifyToken, async (req, res) => {
  try {
    const { role } = req.body; // Contoh input: "SELLER"
    const userId = req.user.userId; // Didapat dari payload token awal

    // 1. Cek data pengguna terbaru di database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // 2. Validasi: Apakah pengguna ini benar-benar memiliki peran yang dia minta?
    if (!user.roles.includes(role)) {
      return res.status(403).json({ error: `Kamu tidak terdaftar sebagai ${role}!` });
    }

    // 3. Buat Token BARU yang sekarang menyertakan 'activeRole'
    const SECRET_KEY = "RahasiaTokenIniSangatKuat";
    const newToken = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        roles: user.roles,
        activeRole: role // <--- INI KUNCI UTAMA LEVEL 1
      }, 
      SECRET_KEY, 
      { expiresIn: '1d' } 
    );

    // 4. Kirim token baru ke klien
    res.status(200).json({
      message: `Sesi berhasil diubah. Peran aktif saat ini: ${role}`,
      token: newToken,
      activeRole: role
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan saat mengubah peran aktif" });
  }
});

// ==========================================
// ROUTE: PROFIL USER (GET /api/auth/me)
// ==========================================
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, username: true, email: true, roles: true } // Jangan ambil password!
    });
    
    res.status(200).json({
      profile: user,
      activeRole: req.user.activeRole || "Belum memilih peran aktif"
    });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil profil" });
  }
});

// // ==========================================
// // ROUTE: KATALOG PRODUK PUBLIK (DUMMY)
// // ==========================================
// // Sesuai syarat Level 1: Menggunakan data dummy karena backend produk belum terintegrasi
// app.get('/api/products', (req, res) => {
//   const dummyProducts = [
//     { id: 1, name: "Kaos Polos", price: 50000, store: "Toko Sasa" },
//     { id: 2, name: "Kacamata Hitam", price: 35000, store: "Kacamata Jaya" }
//   ];
//   res.status(200).json({ data: dummyProducts });
// });

// ==========================================
// ROUTE: KATALOG PRODUK PUBLIK (ASLI DARI DATABASE)
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    // Mengambil semua produk beserta nama toko pembuatnya
    const products = await prisma.product.findMany({
      include: {
        store: {
          select: { name: true } // Hanya ambil nama toko untuk ditampilkan
        }
      },
      orderBy: { createdAt: 'desc' } // Urutkan dari yang terbaru
    });
    res.status(200).json({ data: products });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil data produk" });
  }
});

// 3. Lihat Dasbor Toko Sendiri (GET /api/stores/me)
app.get('/api/stores/me', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'SELLER') {
      return res.status(403).json({ error: "Akses ditolak. Peran aktif bukan SELLER." });
    }

    // Cari toko milik user beserta daftar produknya
    const store = await prisma.store.findUnique({
      where: { ownerId: req.user.userId },
      include: { products: true } // Mengambil sekalian data produk yang ada di toko ini
    });

    if (!store) {
      return res.status(404).json({ error: "Kamu belum memiliki toko." });
    }

    res.status(200).json({ data: store });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil data toko." });
  }
});

// 4. Update Data Produk (PUT /api/products/:id)
app.put('/api/products/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'SELLER') {
      return res.status(403).json({ error: "Akses ditolak." });
    }

    const productId = req.params.id;
    const { name, description, price, stock } = req.body;

    // Pastikan user punya toko
    const store = await prisma.store.findUnique({
      where: { ownerId: req.user.userId }
    });
    if (!store) return res.status(404).json({ error: "Toko tidak ditemukan." });

    // Cek apakah produk ada dan memang milik toko user ini
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: "Produk tidak ditemukan." });
    if (product.storeId !== store.id) return res.status(403).json({ error: "Ini bukan produk tokomu!" });

    // Update produk
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: name || product.name,
        description: description || product.description,
        price: price ? parseFloat(price) : product.price,
        stock: stock !== undefined ? parseInt(stock) : product.stock
      }
    });

    res.status(200).json({ message: "Produk berhasil diupdate!", product: updatedProduct });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengupdate produk." });
  }
});

// 5. Hapus Produk (DELETE /api/products/:id)
app.delete('/api/products/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'SELLER') {
      return res.status(403).json({ error: "Akses ditolak." });
    }

    const productId = req.params.id;

    // Pastikan user punya toko dan produk tersebut milik mereka
    const store = await prisma.store.findUnique({ where: { ownerId: req.user.userId } });
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!store || !product || product.storeId !== store.id) {
      return res.status(403).json({ error: "Akses ditolak atau produk tidak ditemukan." });
    }

    // Hapus produk
    await prisma.product.delete({ where: { id: productId } });

    res.status(200).json({ message: "Produk berhasil dihapus!" });
  } catch (error) {
    res.status(500).json({ error: "Gagal menghapus produk." });
  }
});

// ==========================================
// ROUTE: REVIEW APLIKASI PUBLIK
// ==========================================
// 1. Submit Review (Bisa oleh Guest)
app.post('/api/reviews', async (req, res) => {
  try {
    const { name, rating, comment } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating harus antara 1 sampai 5" });
    }

    const newReview = await prisma.appReview.create({
      data: { name: name || "Guest", rating, comment }
    });

    res.status(201).json({ message: "Terima kasih atas ulasanmu!", review: newReview });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengirim ulasan" });
  }
});

// 2. Tampilkan semua review publik
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await prisma.appReview.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ data: reviews });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil data ulasan" });
  }
});

// ==========================================
// LEVEL 2: SELLER EXPERIENCE
// ==========================================

// 1. Buat Toko Baru (POST /api/stores)
app.post('/api/stores', verifyToken, async (req, res) => {
  try {
    // Validasi: Pastikan role aktif adalah SELLER
    if (req.user.activeRole !== 'SELLER') {
      return res.status(403).json({ error: "Akses ditolak. Peran aktifmu saat ini bukan SELLER." });
    }

    const { name, description } = req.body;

    // Validasi: Cek apakah user sudah punya toko (1 User = 1 Toko)
    const existingStore = await prisma.store.findUnique({
      where: { ownerId: req.user.userId }
    });

    if (existingStore) {
      return res.status(400).json({ error: "Kamu sudah memiliki toko!" });
    }

    // Buat toko
    const newStore = await prisma.store.create({
      data: {
        name,
        description,
        ownerId: req.user.userId
      }
    });

    res.status(201).json({ message: "Toko berhasil dibuat!", store: newStore });
  } catch (error) {
    // Tangani error jika nama toko sudah dipakai (Unique Constraint)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Nama toko sudah digunakan, pilih nama lain." });
    }
    res.status(500).json({ error: "Gagal membuat toko." });
  }
});

// 2. Tambah Produk Baru ke Toko (POST /api/products)
app.post('/api/products', verifyToken, async (req, res) => {
  try {
    // Validasi: Pastikan role aktif adalah SELLER
    if (req.user.activeRole !== 'SELLER') {
      return res.status(403).json({ error: "Akses ditolak. Peran aktifmu saat ini bukan SELLER." });
    }

    // Cari toko milik user yang sedang login
    const store = await prisma.store.findUnique({
      where: { ownerId: req.user.userId }
    });

    if (!store) {
      return res.status(404).json({ error: "Kamu belum membuat toko. Buat toko terlebih dahulu!" });
    }

    const { name, description, price, stock } = req.body;

    // Validasi input
    if (!name || !price) {
      return res.status(400).json({ error: "Nama dan harga produk wajib diisi." });
    }

    // Buat produk yang terhubung dengan toko
    const newProduct = await prisma.product.create({
      data: {
        name,
        description: description || "",
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        storeId: store.id
      }
    });

    res.status(201).json({ message: "Produk berhasil ditambahkan!", product: newProduct });
  } catch (error) {
    res.status(500).json({ error: "Gagal menambahkan produk." });
  }
});

// ==========================================
// LEVEL 3: BUYER EXPERIENCE (WALLET & CART)
// ==========================================

// 1. Cek Saldo Dompet (GET /api/wallet)
app.get('/api/wallet', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'BUYER') {
      return res.status(403).json({ error: "Akses ditolak. Peran aktifmu harus BUYER." });
    }

    // Cari dompet user. Jika belum ada, sistem otomatis membuatkannya dengan saldo Rp 0
    let wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.userId }
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId: req.user.userId, balance: 0 }
      });
    }

    res.status(200).json({ data: wallet });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil data dompet." });
  }
});

// 2. Top-Up Saldo Dompet (POST /api/wallet/topup)
app.post('/api/wallet/topup', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'BUYER') {
      return res.status(403).json({ error: "Akses ditolak. Peran aktifmu harus BUYER." });
    }

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Jumlah top-up harus lebih dari Rp 0!" });
    }

    // Upsert: Update saldo jika dompet sudah ada, atau buat dompet baru jika belum ada
    const wallet = await prisma.wallet.upsert({
      where: { userId: req.user.userId },
      update: { balance: { increment: amount } }, // Menambahkan saldo yang ada dengan amount baru
      create: { userId: req.user.userId, balance: amount }
    });

    res.status(200).json({ message: `Top-up sebesar Rp ${amount} berhasil!`, wallet });
  } catch (error) {
    res.status(500).json({ error: "Gagal melakukan top-up." });
  }
});

// ==========================================
// ROUTE: KERANJANG BELANJA (SINGLE-STORE RULE)
// ==========================================

// 1. Lihat Isi Keranjang (GET /api/cart)
app.get('/api/cart', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'BUYER') return res.status(403).json({ error: "Akses ditolak." });

    // Cari keranjang user beserta isi produk dan info tokonya
    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.userId },
      include: {
        items: {
          include: { 
            product: {
              include: { store: true }
            } 
          }
        }
      }
    });

    // Jika belum punya keranjang, buatkan kosong
    if (!cart) {
      cart = await prisma.cart.create({ 
        data: { userId: req.user.userId }, 
        include: { items: true } 
      });
    }

    res.status(200).json({ data: cart });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil keranjang." });
  }
});

// 2. Tambah Produk ke Keranjang (POST /api/cart)
app.post('/api/cart', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'BUYER') return res.status(403).json({ error: "Akses ditolak." });

    const { productId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;

    // Cek apakah produknya ada dan stoknya cukup
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: "Produk tidak ditemukan." });
    if (product.stock < qty) return res.status(400).json({ error: "Stok tidak mencukupi." });

    // Cari atau buat keranjang
    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.userId },
      include: { items: { include: { product: true } } }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user.userId },
        include: { items: { include: { product: true } } }
      });
    }

    // ==========================================
    // LOGIKA SINGLE-STORE CHECKOUT
    // ==========================================
    if (cart.items.length > 0) {
      // Ambil ID toko dari barang pertama yang ada di keranjang
      const existingStoreId = cart.items[0].product.storeId;
      
      // Jika toko barang baru berbeda dengan toko barang di keranjang, TOLAK!
      if (existingStoreId !== product.storeId) {
        return res.status(400).json({ 
          error: "Keranjang hanya boleh berisi produk dari 1 toko yang sama. Checkout atau kosongkan keranjangmu dulu!" 
        });
      }
    }

    // Cek apakah barang sudah ada di keranjang. Jika ada, tambah jumlahnya
    const existingItem = cart.items.find(item => item.productId === productId);

    if (existingItem) {
      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + qty }
      });
      return res.status(200).json({ message: "Kuantitas produk di keranjang ditambahkan!", item: updatedItem });
    }

    // Jika barang belum ada di keranjang, buat item baru
    const newItem = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: productId,
        quantity: qty
      }
    });

    res.status(201).json({ message: "Produk berhasil ditambahkan ke keranjang!", item: newItem });
  } catch (error) {
    res.status(500).json({ error: "Gagal menambahkan ke keranjang." });
  }
});

// 3. Hapus Produk dari Keranjang (DELETE /api/cart/:itemId)
app.delete('/api/cart/:itemId', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'BUYER') return res.status(403).json({ error: "Akses ditolak." });
    
    await prisma.cartItem.delete({
      where: { id: req.params.itemId }
    });

    res.status(200).json({ message: "Produk dihapus dari keranjang." });
  } catch (error) {
    res.status(500).json({ error: "Gagal menghapus produk." });
  }
});

// // ==========================================
// // ROUTE: CHECKOUT & TRANSAKSI (level 3 awal)
// // ==========================================
// app.post('/api/checkout', verifyToken, async (req, res) => {
//   try {
//     if (req.user.activeRole !== 'BUYER') return res.status(403).json({ error: "Akses ditolak." });

//     // 1. Ambil data keranjang beserta barang dan tokonya
//     const cart = await prisma.cart.findUnique({
//       where: { userId: req.user.userId },
//       include: { items: { include: { product: true } } }
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ error: "Keranjang belanjamu kosong!" });
//     }

//     const storeId = cart.items[0].product.storeId;

//     // 2. Hitung Rincian Biaya (Subtotal, Ongkir Tetap, dan PPN 12%)
//     let subtotal = 0;
//     for (const item of cart.items) {
//       // Cek stok secara real-time
//       if (item.product.stock < item.quantity) {
//         return res.status(400).json({ error: `Stok produk ${item.product.name} tidak mencukupi!` });
//       }
//       subtotal += item.product.price * item.quantity;
//     }

//     const shippingCost = 15000; // Contoh ongkir flat Rp 15.000
//     const tax = subtotal * 0.12; // PPN 12% 
//     const grandTotal = subtotal + shippingCost + tax;

//     // 3. Cek Saldo Dompet Pembeli
//     const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.userId } });
//     if (!wallet || wallet.balance < grandTotal) {
//       return res.status(400).json({ 
//         error: "Saldo dompet tidak mencukupi.",
//         required: grandTotal,
//         currentBalance: wallet ? wallet.balance : 0
//       });
//     }

//     // 4. EKSEKUSI TRANSAKSI DATABASE (All or Nothing)
//     // prisma.$transaction memastikan jika salah satu gagal, semua dibatalkan!
//     const transactionResult = await prisma.$transaction(async (prisma) => {
      
//       // a. Potong saldo dompet
//       await prisma.wallet.update({
//         where: { userId: req.user.userId },
//         data: { balance: { decrement: grandTotal } }
//       });

//       // b. Buat Rekaman Pesanan (Order)
//       const newOrder = await prisma.order.create({
//         data: {
//           userId: req.user.userId,
//           storeId: storeId,
//           subtotal: subtotal,
//           tax: tax,
//           shippingCost: shippingCost,
//           totalAmount: grandTotal,
//           status: "PAID",
//           items: {
//             create: cart.items.map(item => ({
//               productId: item.productId,
//               quantity: item.quantity,
//               price: item.product.price // Kunci harga saat ini
//             }))
//           }
//         }
//       });

//       // c. Kurangi stok barang di toko
//       for (const item of cart.items) {
//         await prisma.product.update({
//           where: { id: item.productId },
//           data: { stock: { decrement: item.quantity } }
//         });
//       }

//       // d. Kosongkan keranjang (Hapus CartItem)
//       await prisma.cartItem.deleteMany({
//         where: { cartId: cart.id }
//       });

//       return newOrder;
//     });

//     res.status(200).json({ 
//       message: "Checkout berhasil! Pesanan sedang diproses.", 
//       receipt: transactionResult 
//     });

//   } catch (error) {
//     console.error("Checkout Error:", error);
//     res.status(500).json({ error: "Terjadi kesalahan sistem saat memproses transaksi." });
//   }
// });

// ==========================================
// LEVEL 3 & 4: CHECKOUT (WITH DISCOUNT LOGIC) -- modified for Level 4
// ==========================================
app.post('/api/checkout', verifyToken, async (req, res) => {
  try {
    // 1. Validasi Role
    if (req.user.activeRole !== 'BUYER') {
      return res.status(403).json({ error: "Akses ditolak. Fitur ini khusus BUYER." });
    }

    // [PERBAIKAN 1]: Gunakan req.user.userId sesuai isi token JWT kita
    const userId = req.user.userId; 
    const { deliveryMethod, discountCode } = req.body; 

    // 2. Cek Keranjang
    // [PERBAIKAN 2]: Cari Cart berdasarkan userId, lalu ambil items-nya
    const cart = await prisma.cart.findUnique({
      where: { userId: userId },
      include: { items: { include: { product: true } } }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Keranjang kosong!" });
    }

    const cartItems = cart.items;
    const storeId = cartItems[0].product.storeId;

    // 3. Hitung Subtotal
    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += item.product.price * item.quantity;
    }

    // 4. Tentukan Ongkos Kirim (Delivery Fee)
    let shippingCost = 0;
    if (deliveryMethod === 'Instant') shippingCost = 20000;
    else if (deliveryMethod === 'Next Day') shippingCost = 15000;
    else if (deliveryMethod === 'Regular') shippingCost = 10000;
    else return res.status(400).json({ error: "Metode pengiriman tidak valid!" });

    // 5. LOGIKA DISKON (LEVEL 4)
    let discountAmount = 0;
    let voucherUsed = null;
    let promoUsed = null;
    let discountTypeMessage = "Tidak ada diskon";

    if (discountCode) {
      const codeUpper = discountCode.toUpperCase();
      const now = new Date();

      voucherUsed = await prisma.voucher.findUnique({ where: { code: codeUpper } });
      promoUsed = await prisma.promo.findUnique({ where: { code: codeUpper } });

      if (!voucherUsed && !promoUsed) {
        return res.status(400).json({ error: "Kode diskon tidak ditemukan!" });
      }

      if (voucherUsed) {
        if (voucherUsed.expiresAt < now) return res.status(400).json({ error: "Voucher sudah kedaluwarsa!" });
        if (voucherUsed.quota <= 0) return res.status(400).json({ error: "Kuota voucher habis!" });
        discountAmount = voucherUsed.discount;
        discountTypeMessage = "Voucher digunakan";
      } 
      else if (promoUsed) {
        if (promoUsed.expiresAt < now) return res.status(400).json({ error: "Promo sudah kedaluwarsa!" });
        discountAmount = promoUsed.discount;
        discountTypeMessage = "Promo digunakan";
      }

      // Cegah diskon minus 
      if (discountAmount > subtotal) {
        discountAmount = subtotal; 
      }
    }

    // 6. Hitung PPN 12% dan Total Akhir
    const taxBase = subtotal - discountAmount; 
    const tax = taxBase * 0.12; 
    const finalTotalAmount = taxBase + tax + shippingCost;

    // 7. Cek Saldo Buyer
    // [PERBAIKAN 3]: Cek ke tabel WALLET, bukan tabel USER
    const wallet = await prisma.wallet.findUnique({ where: { userId: userId } });
    if (!wallet || wallet.balance < finalTotalAmount) {
      return res.status(400).json({ error: "Saldo wallet tidak mencukupi untuk checkout ini!" });
    }

    // 8. Eksekusi Database Transaction (Jalur Aman)
    const result = await prisma.$transaction(async (tx) => {
      
      const order = await tx.order.create({
        data: {
          userId: userId,
          storeId: storeId,
          subtotal: subtotal,
          discount: discountAmount,
          tax: tax,
          shippingCost: shippingCost,
          totalAmount: finalTotalAmount,
          status: "Sedang Dikemas", 
          items: {
            create: cartItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price
            }))
          },
          history: {
            create: [{ status: "Sedang Dikemas" }] 
          }
        },
        include: { items: true, history: true }
      });

      // [PERBAIKAN 4]: Potong saldo dari tabel WALLET
      await tx.wallet.update({
        where: { userId: userId },
        data: { balance: { decrement: finalTotalAmount } }
      });

      // Kurangi Stok Produk
      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // [PERBAIKAN 5]: Kosongkan Keranjang menggunakan cartId
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      // Kurangi Kuota Voucher
      if (voucherUsed) {
        await tx.voucher.update({
          where: { id: voucherUsed.id },
          data: { quota: { decrement: 1 } }
        });
      }

      return order;
    });

    res.status(200).json({ 
      message: "Checkout berhasil!", 
      summary: {
        discountType: discountTypeMessage,
        subtotal: subtotal,
        discount: discountAmount,
        shippingCost: shippingCost,
        tax_PPN_12: tax,
        finalTotal: finalTotalAmount
      },
      order: result 
    });

  } catch (error) {
    // Menambahkan console.error agar jika terjadi error lagi, terminal akan memberi tahu penyebab pastinya!
    console.error("Checkout Error Log:", error);
    res.status(500).json({ error: "Gagal memproses checkout." });
  }
});

// ==========================================
// LEVEL 4: ADMIN (VOUCHER & PROMO MANAGEMENT)
// ==========================================

// 1. Buat Voucher Baru (Diskon dengan Kuota & Waktu)
app.post('/api/admin/vouchers', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'ADMIN') {
      return res.status(403).json({ error: "Akses ditolak. Fitur ini khusus ADMIN." });
    }

    const { code, discount, quota, expiresAt } = req.body;

    if (!code || !discount || !quota || !expiresAt) {
      return res.status(400).json({ error: "Data voucher tidak lengkap!" });
    }

    const newVoucher = await prisma.voucher.create({
      data: {
        code: code.toUpperCase(), // Pastikan kode selalu huruf besar
        discount: parseFloat(discount),
        quota: parseInt(quota),
        expiresAt: new Date(expiresAt) // Konversi string tanggal menjadi format Date
      }
    });

    res.status(201).json({ message: "Voucher berhasil dibuat!", data: newVoucher });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Kode voucher sudah pernah digunakan!" });
    }
    res.status(500).json({ error: "Gagal membuat voucher." });
  }
});

// 2. Buat Promo Baru (Diskon hanya dengan Waktu)
app.post('/api/admin/promos', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'ADMIN') {
      return res.status(403).json({ error: "Akses ditolak. Fitur ini khusus ADMIN." });
    }

    const { code, discount, expiresAt } = req.body;

    if (!code || !discount || !expiresAt) {
      return res.status(400).json({ error: "Data promo tidak lengkap!" });
    }

    const newPromo = await prisma.promo.create({
      data: {
        code: code.toUpperCase(),
        discount: parseFloat(discount),
        expiresAt: new Date(expiresAt)
      }
    });

    res.status(201).json({ message: "Promo berhasil dibuat!", data: newPromo });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Kode promo sudah pernah digunakan!" });
    }
    res.status(500).json({ error: "Gagal membuat promo." });
  }
});

// 3. Lihat Daftar Semua Diskon (Voucher & Promo)
app.get('/api/admin/discounts', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'ADMIN') {
      return res.status(403).json({ error: "Akses ditolak. Fitur ini khusus ADMIN." });
    }

    // Mengambil semua data secara paralel agar lebih cepat
    const [vouchers, promos] = await Promise.all([
      prisma.voucher.findMany(),
      prisma.promo.findMany()
    ]);

    res.status(200).json({ data: { vouchers, promos } });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil data diskon." });
  }
});

// ==========================================
// LEVEL 4: SELLER ORDER PROCESSING
// ==========================================

// 1. Lihat Daftar Pesanan Masuk di Toko Seller
app.get('/api/seller/orders', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'SELLER') {
      return res.status(403).json({ error: "Akses ditolak. Fitur ini khusus SELLER." });
    }

    // Cari ID toko milik Seller yang sedang login
    const store = await prisma.store.findUnique({
      where: { ownerId: req.user.userId }
    });

    if (!store) {
      return res.status(404).json({ error: "Kamu belum memiliki toko." });
    }

    // Ambil semua pesanan yang masuk ke toko tersebut
    const orders = await prisma.order.findMany({
      where: { storeId: store.id },
      include: { 
        items: { include: { product: true } },
        history: true 
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ data: orders });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil data pesanan." });
  }
});

// 2. Proses Pesanan (Ubah status menjadi "Menunggu Pengirim" & Buat Delivery Job)
app.put('/api/seller/orders/:orderId/process', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'SELLER') {
      return res.status(403).json({ error: "Akses ditolak. Fitur ini khusus SELLER." });
    }

    const orderId = req.params.orderId;
    const userId = req.user.userId;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true }
    });

    if (!order) return res.status(404).json({ error: "Pesanan tidak ditemukan." });

    if (order.store.ownerId !== userId) {
      return res.status(403).json({ error: "Akses ditolak. Ini bukan pesanan tokomu!" });
    }

    if (order.status !== "Sedang Dikemas") {
      return res.status(400).json({ error: `Pesanan tidak bisa diproses karena status saat ini: ${order.status}` });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Ubah status Order
      const result = await tx.order.update({
        where: { id: orderId },
        data: { status: "Menunggu Pengirim" }
      });

      // 2. Catat riwayat
      await tx.orderHistory.create({
        data: { orderId: orderId, status: "Menunggu Pengirim" }
      });

      // 3. Buat Delivery Job agar bisa dicari oleh Driver (Upah kurir = 80% dari ongkir)
      await tx.deliveryJob.create({
        data: {
          orderId: orderId,
          earning: order.shippingCost * 0.8 
        }
      });

      return result;
    });

    res.status(200).json({ message: "Pesanan berhasil diproses dan masuk ke bursa kurir!", data: updatedOrder });

  } catch (error) {
    console.error("Process Order Error:", error);
    res.status(500).json({ error: "Gagal memproses pesanan." });
  }
});

// ==========================================
// LEVEL 4: BUYER & SELLER REPORTS
// ==========================================

// 1. Laporan Pengeluaran Buyer (Spending Report)
app.get('/api/buyer/report', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'BUYER') {
      return res.status(403).json({ error: "Akses ditolak. Fitur ini khusus BUYER." });
    }

    // Ambil semua riwayat pesanan si pembeli
    const orders = await prisma.order.findMany({
      where: { userId: req.user.userId },
      include: { 
        items: { include: { product: true } },
        history: true 
      },
      orderBy: { createdAt: 'desc' }
    });

    // Hitung total uang yang sudah dikeluarkan
    let totalSpent = 0;
    orders.forEach(order => {
      totalSpent += order.totalAmount;
    });

    res.status(200).json({ 
      message: "Laporan pengeluaran berhasil diambil",
      summary: {
        totalOrders: orders.length,
        totalSpent: totalSpent
      },
      data: orders 
    });

  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil laporan Buyer." });
  }
});

// 2. Laporan Pendapatan Seller (Income Report)
app.get('/api/seller/report', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'SELLER') {
      return res.status(403).json({ error: "Akses ditolak. Fitur ini khusus SELLER." });
    }

    const store = await prisma.store.findUnique({
      where: { ownerId: req.user.userId }
    });

    if (!store) {
      return res.status(404).json({ error: "Kamu belum memiliki toko." });
    }

    // Ambil semua pesanan yang masuk ke toko ini
    const orders = await prisma.order.findMany({
      where: { storeId: store.id },
      include: { 
        items: { include: { product: true } },
        history: true 
      },
      orderBy: { createdAt: 'desc' }
    });

    // Hitung pendapatan bersih Seller (Subtotal dikurangi diskon)
    // Ongkir dan PPN tidak masuk ke kantong Seller
    let totalIncome = 0;
    orders.forEach(order => {
      // Asumsi dasar: Pesanan yang dikembalikan uangnya tidak dihitung (persiapan Level 6)
      if (order.status !== 'Dikembalikan') {
        totalIncome += (order.subtotal - order.discount);
      }
    });

    res.status(200).json({
      message: "Laporan pendapatan toko berhasil diambil",
      summary: {
        storeName: store.name,
        totalOrders: orders.length,
        totalIncome: totalIncome
      },
      data: orders
    });

  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil laporan Seller." });
  }
});

// ==========================================
// LEVEL 5: DRIVER WORKFLOW & DASHBOARD
// ==========================================

// 1. Cari Pekerjaan yang Tersedia (Find Jobs)
app.get('/api/driver/jobs/available', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'DRIVER') {
      return res.status(403).json({ error: "Akses ditolak. Fitur ini khusus DRIVER." });
    }

    // Cari pekerjaan yang driverId-nya masih kosong dan pesanan berstatus "Menunggu Pengirim"
    const availableJobs = await prisma.deliveryJob.findMany({
      where: {
        driverId: null,
        order: { status: "Menunggu Pengirim" }
      },
      include: {
        order: {
          include: { 
            store: { select: { name: true } }, 
            user: { select: { username: true } } 
          }
        }
      }
    });

    res.status(200).json({ message: "Bursa pekerjaan kurir", data: availableJobs });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil daftar pekerjaan." });
  }
});

// 2. Ambil Pekerjaan (Take Job)
app.put('/api/driver/jobs/:jobId/take', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'DRIVER') {
      return res.status(403).json({ error: "Akses ditolak. Fitur ini khusus DRIVER." });
    }

    const jobId = req.params.jobId;
    const driverId = req.user.userId;

    // Pastikan pekerjaan ada dan belum diambil kurir lain
    const job = await prisma.deliveryJob.findUnique({
      where: { id: jobId },
      include: { order: true }
    });

    if (!job) return res.status(404).json({ error: "Pekerjaan tidak ditemukan." });
    if (job.driverId !== null) return res.status(400).json({ error: "Maaf, pekerjaan ini sudah diambil kurir lain." });
    if (job.order.status !== "Menunggu Pengirim") {
      return res.status(400).json({ error: "Pesanan ini belum siap untuk dikirim." });
    }

    // Eksekusi Transaction
    const takenJob = await prisma.$transaction(async (tx) => {
      // a. Tandai job dengan ID kurir ini
      const updatedJob = await tx.deliveryJob.update({
        where: { id: jobId },
        data: { driverId: driverId }
      });

      // b. Ubah status pesanan
      await tx.order.update({
        where: { id: job.orderId },
        data: { status: "Sedang Dikirim" }
      });

      // c. Catat riwayat pesanan
      await tx.orderHistory.create({
        data: { orderId: job.orderId, status: "Sedang Dikirim" }
      });

      return updatedJob;
    });

    res.status(200).json({ message: "Pekerjaan berhasil diambil! Selamat mengantar.", data: takenJob });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil pekerjaan." });
  }
});

// 3. Selesaikan Pekerjaan (Confirm Completed)
app.put('/api/driver/jobs/:jobId/complete', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'DRIVER') return res.status(403).json({ error: "Akses ditolak." });

    const job = await prisma.deliveryJob.findUnique({
      where: { id: req.params.jobId },
      include: { order: true }
    });

    if (!job) return res.status(404).json({ error: "Pekerjaan tidak ditemukan." });
    if (job.driverId !== req.user.userId) return res.status(403).json({ error: "Ini bukan pekerjaanmu!" });
    if (job.order.status !== "Sedang Dikirim") return res.status(400).json({ error: "Pesanan ini tidak sedang dalam pengiriman." });

    const completedJob = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: job.orderId },
        data: { status: "Pesanan Selesai" }
      });

      await tx.orderHistory.create({
        data: { orderId: job.orderId, status: "Pesanan Selesai" }
      });

      return job;
    });

    res.status(200).json({ message: "Pengiriman selesai! Upah telah masuk ke riwayatmu.", data: completedJob });
  } catch (error) {
    res.status(500).json({ error: "Gagal menyelesaikan pekerjaan." });
  }
});

// 4. Dasbor Kurir & Riwayat Pendapatan (Driver Dashboard)
app.get('/api/driver/dashboard', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'DRIVER') return res.status(403).json({ error: "Akses ditolak." });

    // Ambil semua pekerjaan yang pernah/sedang dikerjakan oleh driver ini
    const myJobs = await prisma.deliveryJob.findMany({
      where: { driverId: req.user.userId },
      include: { order: true },
      orderBy: { updatedAt: 'desc' }
    });

    let activeJob = null;
    let totalEarnings = 0;
    const history = [];

    // Pisahkan mana pekerjaan yang sedang aktif, dan mana yang sudah selesai
    myJobs.forEach(job => {
      if (job.order.status === "Sedang Dikirim") {
        activeJob = job;
      } else if (job.order.status === "Pesanan Selesai") {
        totalEarnings += job.earning;
        history.push(job);
      }
    });

    res.status(200).json({
      message: "Dasbor Kurir",
      summary: {
        totalCompletedJobs: history.length,
        totalEarnings: totalEarnings
      },
      activeJob: activeJob,
      history: history
    });

  } catch (error) {
    res.status(500).json({ error: "Gagal memuat dasbor kurir." });
  }
});

// ==========================================
// LEVEL 6: ADMIN MONITORING DASHBOARD
// ==========================================

// 1. Dasbor Pemantauan Keseluruhan (Monitoring Marketplace)
app.get('/api/admin/monitoring', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'ADMIN') {
      return res.status(403).json({ error: "Akses ditolak. Fitur ini khusus ADMIN." });
    }

    // Gunakan Promise.all agar database mencari semua data secara paralel (lebih cepat)
    const [
      totalUsers,
      totalStores,
      totalProducts,
      totalOrders,
      totalDeliveryJobs,
      ordersByStatus
    ] = await Promise.all([
      prisma.user.count(),
      prisma.store.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.deliveryJob.count(),
      // Mengelompokkan pesanan berdasarkan statusnya
      prisma.order.groupBy({
        by: ['status'],
        _count: { status: true }
      })
    ]);

    res.status(200).json({
      message: "Data Dasbor Pemantauan Admin",
      data: {
        users: totalUsers,
        stores: totalStores,
        products: totalProducts,
        orders: totalOrders,
        deliveryJobs: totalDeliveryJobs,
        orderStatistics: ordersByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        }))
      }
    });

  } catch (error) {
    console.error("Monitoring Error:", error);
    res.status(500).json({ error: "Gagal memuat data pemantauan." });
  }
});

// 2. Simulasi Waktu & Trigger Overdue (Auto-Refund)
app.post('/api/admin/simulate-overdue', verifyToken, async (req, res) => {
  try {
    if (req.user.activeRole !== 'ADMIN') {
      return res.status(403).json({ error: "Akses ditolak. Fitur ini khusus ADMIN." });
    }

    // Default simulasi: memajukan waktu sistem sebanyak 1 hari ke depan
    const { simulateDays = 1 } = req.body; 
    
    // Hitung batas waktu (Waktu saat ini dikurangi jumlah hari simulasi)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - simulateDays);

    // Cari pesanan yang "nyangkut" (Sedang Dikemas / Menunggu Pengirim) yang dibuat SEBELUM targetDate
    const overdueOrders = await prisma.order.findMany({
      where: {
        status: { in: ["Sedang Dikemas", "Menunggu Pengirim"] },
        createdAt: { lt: targetDate } // 'lt' = less than (lebih tua dari targetDate)
      },
      include: { items: true }
    });

    if (overdueOrders.length === 0) {
      return res.status(200).json({ 
        message: `Waktu dimajukan ${simulateDays} hari. Semua pesanan aman, tidak ada yang terlambat!` 
      });
    }

    const refundedOrders = [];

    // Eksekusi Refund untuk setiap pesanan yang telat
    for (const order of overdueOrders) {
      await prisma.$transaction(async (tx) => {
        // a. Ubah status jadi Dikembalikan
        await tx.order.update({
          where: { id: order.id },
          data: { status: "Dikembalikan" }
        });

        // b. Catat history
        await tx.orderHistory.create({
          data: { orderId: order.id, status: "Dikembalikan" }
        });

        // c. Refund saldo pembeli secara utuh
        await tx.wallet.update({
          where: { userId: order.userId },
          data: { balance: { increment: order.totalAmount } }
        });

        // d. Kembalikan stok toko
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
        }
        
        // e. Tarik mundur pekerjaan kurir (jika belum sempat diambil)
        if (order.status === "Menunggu Pengirim") {
          await tx.deliveryJob.deleteMany({
            where: { orderId: order.id, driverId: null }
          });
        }
      });
      
      refundedOrders.push(order.id);
    }

    res.status(200).json({ 
      message: `Simulasi waktu maju ${simulateDays} hari selesai. ${refundedOrders.length} pesanan dibatalkan otomatis dan uang direfund.`,
      refundedOrderIds: refundedOrders
    });

  } catch (error) {
    console.error("Overdue Error:", error);
    res.status(500).json({ error: "Gagal memproses overdue otomatis." });
  }
});

// ==========================================
// MENJALANKAN SERVER
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server SEAPEDIA berjalan dengan aman di http://localhost:${PORT}`);
});