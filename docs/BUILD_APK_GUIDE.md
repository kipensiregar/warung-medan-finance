# PANDUAN LENGKAP BUILD APK ANDROID: WARUNG MEDAN FINANCE

Aplikasi: **Warung Medan Finance**
Pemilik Usaha: **Warung Medan CT Catering**
Package ID: `com.warungmedan.finance`
Platform: **Android (API Level 24+ / Android 7.0 hingga Android 14+)**

---

## 1. Perbedaan APK Debug vs APK Release

| Aspek | APK Debug (`app-debug.apk`) | APK Release (`app-release.apk`) |
| :--- | :--- | :--- |
| **Tujuan** | Uji coba cepat pada HP pemilik & pengembang | Pemakaian jangka panjang, aman, dan siap distribusi |
| **Penandatanganan** | Keystore bawaan Android Studio | Keystore sertifikat pribadi pemilik dengan password |
| **Optimasi Ukuran** | Tanpa ProGuard/R8 (ukuran sedikit lebih besar) | Kode dioptimasi & dikompresi (R8 enabled) |
| **Keamanan** | Debuggable (bisa di-inspect di browser USB) | Non-debuggable, data keuangan lokal terlindungi |

---

## 2. Prasyarat Sistem

1. **Node.js**: Versi 18 atau 20 LTS.
2. **Android Studio**: Ladybug / Hedgehog atau versi terbaru.
3. **Android SDK & Build Tools**: Minimal Android SDK Platform 34.
4. **Java Development Kit (JDK)**: OpenJDK 17 atau 21.

---

## 3. Langkah Demi Langkah Membangun APK Debug

### Langkah A: Build Web Assets Vite
Buka terminal di root project:
```bash
npm install
npm run build
```
Perintah ini menghasilkan folder `/dist` yang berisi kode frontend terkompresi.

### Langkah B: Sinkronisasi Capacitor ke Project Android
```bash
npx cap sync android
```
*(Jika baru pertama kali dan belum ada folder android, jalankan: `npx cap add android`)*

### Langkah C: Menghasilkan APK Debug dengan Gradle
Jalankan di terminal:
```bash
cd android
./gradlew assembleDebug
```
(Pada Windows PowerShell, gunakan `.\gradlew.bat assembleDebug`).

Setelah proses selesai (`BUILD SUCCESSFUL`), file APK Anda berada di:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Langkah D: Instalasi ke HP Android Pemilik Usaha
1. Kirim file `app-debug.apk` ke HP via kabel data USB atau WhatsApp.
2. Buka file APK di HP Android.
3. Jika muncul peringatan keamanan, pilih **"Tetap Instal" / "Izinkan dari Sumber Ini"**.
4. Aplikasi Warung Medan Finance siap digunakan secara offline tanpa internet!

---

## 4. Langkah Membangun APK Release Bertanda Tangan (Signed APK)

### Langkah 1: Buat Keystore Sertifikat Rilis
Jalankan perintah ini sekali untuk menghasilkan file kunci:
```bash
keytool -genkey -v -keystore warung-medan-release.keystore \
  -alias warungmedan \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```
*Simpan file `warung-medan-release.keystore` dan password di tempat yang aman.*

### Langkah 2: Konfigurasi signingConfigs di `android/app/build.gradle`
Tambahkan konfigurasi signing:
```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file("../../warung-medan-release.keystore")
            storePassword "PASSWORD_KEYSTORE_ANDA"
            keyAlias "warungmedan"
            keyPassword "PASSWORD_KUNCI_ANDA"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Langkah 3: Build APK Release
```bash
cd android
./gradlew assembleRelease
```
File APK rilis siap didistribusikan di:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 5. Izin Android Minimum (Permissions)
Aplikasi hanya membutuhkan izin minimum:
- `android.permission.INTERNET` (untuk sinkronisasi cloud saat online)
- `android.permission.ACCESS_NETWORK_STATE` (untuk mendeteksi status offline/online otomatis)
- Penyimpanan lokal menggunakan IndexedDB/SQLite lokal terisolasi di sandbox aplikasi tanpa perlu izin penyimpanan eksternal yang rentan.
