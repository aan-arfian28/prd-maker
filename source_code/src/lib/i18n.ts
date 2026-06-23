"use client";

import { useState, useEffect, useCallback } from "react";

export type Lang = "id" | "en";

/* ------------------------------------------------------------------ */
/*  All translations                                                   */
/* ------------------------------------------------------------------ */

type TranslationMap = Record<string, { id: string; en: string }>;

const T: TranslationMap = {
  // ── Header ─────────────────────────────────────────────────────
  "app.title":    { id: "AI PRD Maker",           en: "AI PRD Maker" },
  "app.subtitle": { id: "Multi-AI Powered PRD Generator", en: "Multi-AI Powered PRD Generator" },
  "app.reset":    { id: "Reset",                  en: "Reset" },
  "app.settings": { id: "Pengaturan",             en: "Settings" },

  // ── Hero ───────────────────────────────────────────────────────
  "hero.badge":   { id: "✨ Multi-AI: OpenAI · DeepSeek · Gemini · Grok · Claude", en: "✨ Multi-AI: OpenAI · DeepSeek · Gemini · Grok · Claude" },
  "hero.heading": { id: "Buat PRD Profesional dengan AI", en: "Create Professional PRDs with AI" },
  "hero.desc":    { id: "Deskripsikan aplikasi yang ingin Anda bangun, dan AI akan membuatkan <strong>Product Requirements Document</strong> lengkap dengan diagram UML, database schema, user flow, dan spesifikasi teknis — menggunakan pipeline modular untuk hasil yang sangat detail.",
                     en: "Describe the application you want to build, and AI will generate a complete <strong>Product Requirements Document</strong> with UML diagrams, database schemas, user flows, and technical specifications — using a modular pipeline for highly detailed results." },
  "hero.example": { id: "Lihat Contoh PRD",       en: "View Example PRD" },

  // ── Error ──────────────────────────────────────────────────────
  "error.title":      { id: "Gagal membuat PRD",         en: "Failed to generate PRD" },
  "error.openSettings":{ id: "Buka Pengaturan untuk memasukkan API Key", en: "Open Settings to enter your API Key" },

  // ── Loading / Phases ───────────────────────────────────────────
  "loading.heading":   { id: "Membuat PRD Anda...",           en: "Generating Your PRD..." },
  "phase.analysis":    { id: "Menganalisis ide produk",       en: "Analyzing product idea" },
  "phase.features":    { id: "Merancang fitur inti",          en: "Designing core features" },
  "phase.userflow":    { id: "Merancang alur pengguna",       en: "Designing user flows" },
  "phase.architecture":{ id: "Merancang arsitektur sistem",   en: "Designing system architecture" },
  "phase.database":    { id: "Merancang skema database",      en: "Designing database schema" },
  "phase.techreq":     { id: "Mendefinisikan persyaratan teknis", en: "Defining technical requirements" },
  "phase.assembly":    { id: "Menyusun PRD final",            en: "Assembling final PRD" },

  // ── Prompt Input ───────────────────────────────────────────────
  "input.placeholder": { id: "Deskripsikan aplikasi yang ingin Anda buat PRD-nya...\n\nContoh: Aplikasi inventaris gudang dengan pencatatan stok masuk/keluar, manajemen batch, dan peringatan stok rendah untuk admin tunggal",
                          en: "Describe the application you want a PRD for...\n\nExample: Warehouse inventory app with stock tracking, batch management, and low-stock alerts for a single admin" },
  "input.ctrlHint":    { id: "Ctrl+Enter untuk kirim",         en: "Ctrl+Enter to submit" },
  "input.featureHint": { id: "✨ AI akan membuatkan PRD lengkap dengan diagram Mermaid", en: "✨ AI will generate a complete PRD with Mermaid diagrams" },
  "input.submit":      { id: "Buat PRD",                       en: "Generate PRD" },
  "input.loading":     { id: "Membuat PRD...",                 en: "Generating PRD..." },
  "input.examples":    { id: "💡 Contoh prompt:",              en: "💡 Example prompts:" },
  "input.detailedExamples":    { id: "💡 Contoh prompt detail:",              en: "💡 Example detailed prompts:" },

  // ── Example Prompts ────────────────────────────────────────────
  "example.1": { id: "Aplikasi inventaris gudang dengan pencatatan stok masuk/keluar, manajemen batch, dan peringatan stok rendah untuk admin tunggal",
                  en: "Warehouse inventory app with inbound/outbound stock tracking, batch management, and low-stock alerts for a single admin" },
  "example.2": { id: "Aplikasi manajemen proyek dengan fitur Kanban board, time tracking, dan laporan progres untuk tim kecil 5-10 orang",
                  en: "Project management app with Kanban board, time tracking, and progress reports for a small team of 5-10 people" },
  "example.3": { id: "Aplikasi e-learning dengan fitur kursus video, kuis interaktif, dan sertifikat kelulusan untuk platform pendidikan online",
                  en: "E-learning app with video courses, interactive quizzes, and completion certificates for an online education platform" },
  "example.4": {
    id: `Aplikasi platform SaaS klinik pratama dan apotek all-in-one bernama "Cliniva" untuk multi-tenant web based Clinic Information System (CIS) & Pharmacy POS.

**MODEL BISNIS & GO-TO-MARKET**
- Model: Software-as-a-Service (SaaS) berbasis langganan bulanan/tahunan.
- Target: Klinik pratama, klinik gigi, dokter praktik mandiri, dan apotek lokal di Indonesia.
- Strategi Monetisasi: 3 Tier (Starter/Praktik Mandiri: Rp 399.000/bln, Professional/Klinik Pratama: Rp 899.000/bln, Enterprise/Klinik Multi-Poli: Rp 1.999.000/bln) + Hardware Bundle (Queue Display TV, Barcode Scanner, Printer Label Farmasi).
- Unique Selling Point (USP): Alur kerja terintegrasi dari pendaftaran, rekam medis elektronik (EMR), hingga resep otomatis ke apotek, bridging BPJS (untuk tier Pro/Enterprise), standar keamanan data medis tingkat tinggi.

**STRATEGI HARDWARE & LOGISTIK**
- Spesifikasi hardware direkomendasikan: Mini PC untuk pendaftaran, Smart TV 32" (untuk antrean), Printer Thermal Label (untuk etiket obat), Barcode Scanner (farmasi). Hardware Bundle sekitar Rp 7-10 Juta.
- Rincian biaya pokok hardware: Margin minim (5-10%) pada hardware, fokus sebagai *enabler* agar SaaS tetap dipakai jangka panjang.
- Proses fulfillment: TV Display Antrean dilengkapi Android TV Box yang sudah ter-install aplikasi Kiosk Cliniva. Auto-provisioning menggunakan kode pairing (seperti YouTube TV) untuk menghubungkan layar ke tenant yang tepat.

**TEKNOLOGI & ARSITEKTUR INFRASTRUKTUR (KRUSIAL)**
- **Tech Stack**: Backend Go (Fiber), PostgreSQL (Enkripsi Data Sensitif), Redis (Cache), RabbitMQ, ReactJS (Dashboard Dokter/Admin), ElectronJS (Aplikasi Desktop Pendaftaran untuk integrasi pembaca kartu lokal).
- **Arsitektur Awal (Startup Mode)**: (Budget ~$40/bulan). VPS 1 untuk Data (PostgreSQL, Redis, RabbitMQ) dan VPS 2 untuk Application Services. Desain terpisah untuk mencegah antrean pasien melambat jika modul Farmasi sedang melakukan komputasi laporan stok bulanan.
- **Prinsip Database per Service**: Modul EMR (Rekam Medis), Antrean, Billing, dan Farmasi dipisah secara logis. EMR memiliki aturan enkripsi (*Encryption at Rest*) yang lebih ketat dibanding modul Billing.
- **Penanganan SPOF (Single Point of Failure)**: Karena data medis sangat kritikal, VPS Data (PostgreSQL) diamankan dengan replikasi *Point-in-Time Recovery* (PITR) harian via script cron, sebelum mampu migrasi ke Managed Database yang tersertifikasi (AWS/Google Cloud dengan standar HIPAA/SatuSehat) di bulan ke-6.
- **Skalabilitas Horizontal**: Go service yang ringan memudahkan *scale-up* di jam sibuk (misal: pagi hari saat pendaftaran membeludak).

Berikut adalah daftar spesifikasi fitur wajib (Core Features):

**FITUR SPESIFIK UNTUK SAAS (WAJIB)**
- **Multi-Tenancy**: Isolasi data ketat. Data pasien Klinik A tidak boleh bisa diakses/bocor ke Klinik B dalam kondisi apa pun (wajib *Row-Level Security* atau schema per tenant).
- **Subscription & Billing**: Manajemen langganan, auto-renewal, penangguhan akun (dengan mode *Read-Only* untuk rekam medis jika gagal bayar, demi kepatuhan regulasi).
- **IoT & Device Management**: Manajemen layar antrean pintar (refresh otomatis, push video promosi klinik ke layar).
- **Multi-Outlet**: Fitur untuk grup klinik (berbagi rekam medis pasien di bawah payung grup klinik yang sama).
- **Helpdesk Terintegrasi**: Live chat dan panduan bridging SatuSehat/BPJS.

**Manajemen Antrean & Pendaftaran (Queue & Admission)**
* Pendaftaran pasien baru/lama (Umum & Asuransi/BPJS).
* Layar antrean digital (Pemanggilan suara otomatis Text-to-Speech).
* Routing pasien (Pendaftaran -> Poli Umum -> Poli Gigi -> Kasir/Apotek).
* Booking jadwal dokter via online/WhatsApp.

**Manajemen Layanan, Tindakan & EMR (Electronic Medical Record)**
* Katalog tindakan medis dan biayanya.
* Form EMR berbasis template SOAP (Subjective, Objective, Assessment, Plan).
* Upload berkas penunjang (hasil lab, foto rontgen).
* Pengiriman resep digital (*e-prescription*) langsung dari layar dokter ke modul apotek.
* Riwayat alergi obat pasien dengan sistem *alert* merah di dashboard dokter.

**Transaksi & Pembayaran Kasir**
* Tagihan gabungan otomatis (Biaya Konsultasi + Tindakan + Obat Farmasi).
* Metode pembayaran Tunai, QRIS, Kartu, dan piutang Asuransi/Perusahaan.
* Split bill (Pasien bayar selisih biaya (exces) yang tidak dicover asuransi).
* Cetak struk dan rincian biaya pengobatan.

**Manajemen Farmasi & Resep (Pharmacy POS)**
* Penerimaan e-Resep dari dokter, dengan opsi substitusi obat generik oleh apoteker.
* POS khusus untuk apotek jualan obat bebas (OTC) tanpa resep dokter.
* Cetak stiker etiket obat (Nama pasien, dosis, aturan pakai otomatis).
* Peringatan interaksi obat (Drug Interaction Alert) - Tahap Lanjut.

**Manajemen Inventaris & Stok Obat**
* Manajemen batch number dan tanggal kedaluwarsa (Expired Date/ED) dengan sistem FIFO/FEFO.
* Alert otomatis untuk obat hampir habis atau mendekati ED (H-90 hari).
* Modul pengadaan obat (Purchase Order) ke PBF (Pedagang Besar Farmasi).
* Stock opname parsial (per rak obat).

**Manajemen Pasien (CRM & Komunikasi)**
* Rekam jejak demografi pasien.
* Reminder otomatis via WhatsApp untuk jadwal kontrol ulang atau vaksinasi.
* Kampanye promosi untuk layanan estetik/gigi.

**Manajemen Karyawan & Keamanan**
* Role-based access yang ketat (Staf pendaftaran tidak bisa melihat diagnosa detail EMR, Dokter hanya melihat pasiennya).
* Audit log wajib secara hukum (Siapa yang mengubah/menghapus rekam medis dan jam berapa).
* Perhitungan bagi hasil/jasa medis dokter otomatis.

**Pelaporan & Analitik Data**
* Laporan morbiditas (Penyakit terbanyak bulan ini - 10 Besar Penyakit).
* Laporan penggunaan obat dan psikotropika (wajib untuk Dinas Kesehatan).
* Laporan Laba/Rugi Harian dan Piutang Asuransi.

RENCANA IMPLEMENTASI (ROADMAP)
**BABAK 1: MVP (Bulan 1-3) - "Closed Beta 2 Klinik Pilot"**
*Goal:* Sistem stabil untuk pendaftaran, rekam medis dasar, dan kasir tanpa antrean digital rumit.
- **Fokus Teknis:** Keamanan data (Enkripsi database), arsitektur 2 VPS.
- **Fitur WAJIB MVP:**
  - Pendaftaran pasien manual (kertas ditiadakan).
  - Rekam Medis (SOAP) sederhana bentuk teks.
  - Peresepan internal ke Apotek.
  - POS Farmasi & Kasir Gabungan.
  - Manajemen stok obat dasar (tanpa batch/ED complex).
- **Ditunda:** Bridging BPJS/SatuSehat, Antrean Suara (TTS), Cetak Etiket Printer Thermal, Booking Online.

**BABAK 2: Improvement Sprints (Bulan 4-12)**
**Sprint 1 (Bulan 4-6): "Farmasi Canggih & Antrean Digital"**
- Implementasi Manajemen Batch & Kedaluwarsa (FEFO) di modul farmasi.
- Integrasi Printer Thermal untuk cetak etiket aturan pakai obat.
- Rilis Kiosk App untuk TV Antrean dengan pemanggilan suara.
- Integrasi QRIS & Payment Gateway.

**Sprint 2 (Bulan 7-9): "Kepatuhan & Integrasi Pemerintah"**
- Bridging dengan API Kemenkes (SatuSehat) untuk rekam medis terintegrasi.
- Bridging API BPJS Kesehatan (P-Care) untuk validasi rujukan/kepesertaan.
- Modul perhitungan jasa medis (komisi) dokter.
- Audit trail lengkap untuk EMR.

**Sprint 3 (Bulan 10-12): "Hardening, Security & Scale"**
- Migrasi Data Medis ke Managed Database tersertifikasi (AWS/GCP).
- Penetration testing pihak ketiga (wajib untuk data medis).
- Fitur Multi-Klinik / Manajemen Grup.
- Public Launch dengan dukungan on-site training.

**METRIK KEBERHASILAN (OKR)**
- Waktu rata-rata pendaftaran s/d selesai pelayanan: Turun 30%.
- Kepatuhan pelaporan dinas kesehatan/SatuSehat: 100% tereksekusi tanpa manual excel.
- Zero Data Breach incidents (Krusial).
- CAC: < Rp 5 juta per tenant.`,
    en: `An all-in-one primary clinic and pharmacy SaaS platform named "Cliniva" for a multi-tenant web-based Clinic Information System (CIS) & Pharmacy POS.

**BUSINESS MODEL & GO-TO-MARKET**
- Model: Software-as-a-Service (SaaS) based on monthly/annual subscriptions.
- Target: Primary clinics, dental clinics, independent doctors, and local pharmacies in Indonesia.
- Monetization Strategy: 3 Tiers (Starter/Independent Practice: IDR 399,000/mo, Professional/Primary Clinic: IDR 899,000/mo, Enterprise/Multi-Poly Clinic: IDR 1,999,000/mo) + Hardware Bundle (Queue Display TV, Barcode Scanner, Pharmacy Label Printer).
- Unique Selling Point (USP): Integrated workflow from admission, Electronic Medical Records (EMR), to automated prescriptions to the pharmacy, BPJS bridging (for Pro/Enterprise tiers), high-level medical data security standards.

**HARDWARE & LOGISTICS STRATEGY**
- Recommended hardware specs: Mini PC for admission, 32" Smart TV (for queues), Thermal Label Printer (for drug labels), Barcode Scanner (pharmacy). Hardware Bundle is around IDR 7-10 Million.
- Hardware cost breakdown: Minimal margin (5-10%) on hardware, focusing on it as an enabler to ensure long-term SaaS usage.
- Fulfillment process: The Queue Display TV is equipped with an Android TV Box pre-installed with the Cliniva Kiosk app. Auto-provisioning uses a pairing code (like YouTube TV) to connect the screen to the correct tenant.

**TECHNOLOGY & INFRASTRUCTURE ARCHITECTURE (CRUCIAL)**
- **Tech Stack**: Go Backend (Fiber), PostgreSQL (Sensitive Data Encryption), Redis (Cache), RabbitMQ, ReactJS (Doctor/Admin Dashboard), ElectronJS (Desktop Admission App for local card reader integration).
- **Initial Architecture (Startup Mode)**: (Budget ~$40/month). VPS 1 for Data (PostgreSQL, Redis, RabbitMQ) and VPS 2 for Application Services. Separated design to prevent patient queues from slowing down if the Pharmacy module is computing monthly stock reports.
- **Database per Service Principle**: EMR (Medical Records), Queue, Billing, and Pharmacy modules are logically separated. EMR has stricter Encryption at Rest rules compared to the Billing module.
- **SPOF (Single Point of Failure) Handling**: Because medical data is highly critical, the Data VPS (PostgreSQL) is secured with daily Point-in-Time Recovery (PITR) replication via a cron script, before scaling to a certified Managed Database (AWS/Google Cloud with HIPAA/SatuSehat standards) in month 6.
- **Horizontal Scalability**: Lightweight Go services facilitate scaling up during peak hours (e.g., mornings when admissions are flooded).

Here is the list of mandatory core features that MUST be in this PRD:

**SAAS-SPECIFIC FEATURES (MANDATORY)**
- **Multi-Tenancy**: Strict data isolation. Clinic A's patient data must never be accessible/leaked to Clinic B under any circumstances (requires Row-Level Security or schema per tenant).
- **Subscription & Billing**: Subscription management, auto-renewal, account suspension (with a Read-Only mode for medical records upon payment failure, for regulatory compliance).
- **IoT & Device Management**: Smart queue display management (auto-refresh, push clinic promotional videos to the screen).
- **Multi-Outlet**: Feature for clinic groups (sharing patient medical records under the same clinic group umbrella).
- **Integrated Helpdesk**: Live chat and SatuSehat/BPJS bridging guides.

**Queue & Admission Management**
* New/returning patient registration (General & Insurance/BPJS).
* Digital queue screen (Automated Text-to-Speech voice calling).
* Patient routing (Admission -> General Poly -> Dental Poly -> Cashier/Pharmacy).
* Doctor schedule booking via online/WhatsApp.

**Service, Procedure & EMR (Electronic Medical Record) Management**
* Medical procedures catalog and pricing.
* EMR forms based on SOAP (Subjective, Objective, Assessment, Plan) templates.
* Supporting document uploads (lab results, X-rays).
* Digital prescription (e-prescription) delivery directly from the doctor's screen to the pharmacy module.
* Patient drug allergy history with red alert systems on the doctor's dashboard.

**Cashier & Payment Transactions**
* Automated combined billing (Consultation Fees + Procedures + Pharmacy Drugs).
* Payment methods: Cash, QRIS, Cards, and Insurance/Corporate receivables.
* Split bill (Patients pay the excess difference not covered by insurance).
* Receipt and medical cost breakdown printing.

**Pharmacy POS & Prescription Management**
* Receiving e-Prescriptions from doctors, with generic drug substitution options by pharmacists.
* Dedicated POS for pharmacies selling Over-the-Counter (OTC) drugs without prescriptions.
* Drug label sticker printing (Patient name, dosage, usage instructions automatically).
* Drug Interaction Alerts - Advanced Stage.

**Drug Inventory & Stock Management**
* Batch number and Expired Date (ED) management with FIFO/FEFO systems.
* Automated alerts for low stock or nearing ED (90 days prior).
* Drug procurement module (Purchase Orders) to Pharmaceutical Wholesalers (PBF).
* Partial stock opname (per drug rack).

**Patient Management (CRM & Communication)**
* Patient demographic tracking.
* Automated WhatsApp reminders for follow-up schedules or vaccinations.
* Promotional campaigns for aesthetic/dental services.

**Employee & Security Management**
* Strict role-based access (Admission staff cannot view detailed EMR diagnoses, Doctors only see their patients).
* Legally required audit logs (Who modified/deleted a medical record and at what time).
* Automated doctor medical fee/revenue sharing calculation.

**Reporting & Data Analytics**
* Morbidity reports (Most frequent diseases this month - Top 10 Diseases).
* Drug and psychotropic usage reports (mandatory for the Health Department).
* Daily Profit/Loss and Insurance Receivables reports.

IMPLEMENTATION PLAN (ROADMAP)
**PHASE 1: MVP (Months 1-3) - "Closed Beta for 2 Pilot Clinics"**
*Goal:* Stable system for admission, basic medical records, and cashier without complex digital queues.
- **Technical Focus:** Data security (Database encryption), 2 VPS architecture.
- **MANDATORY MVP Features:**
  - Manual patient admission (eliminating paper).
  - Simple text-based Medical Records (SOAP).
  - Internal prescribing to the Pharmacy.
  - Combined Pharmacy POS & Cashier.
  - Basic drug stock management (no complex batch/ED tracking).
- **Postponed:** BPJS/SatuSehat Bridging, Voice Queues (TTS), Thermal Label Printing, Online Booking.

**PHASE 2: Improvement Sprints (Months 4-12)**
**Sprint 1 (Months 4-6): "Advanced Pharmacy & Digital Queues"**
- Batch & Expiry Management (FEFO) implementation in the pharmacy module.
- Thermal Printer integration to print drug usage instruction labels.
- Kiosk App release for Queue TVs with voice calling.
- QRIS & Payment Gateway integration.

**Sprint 2 (Months 7-9): "Compliance & Government Integration"**
- API Bridging with the Ministry of Health (SatuSehat) for integrated medical records.
- API Bridging with National Health Insurance / BPJS (P-Care) for referral/membership validation.
- Doctor medical fee (commission) calculation module.
- Full audit trails for EMR.

**Sprint 3 (Months 10-12): "Hardening, Security & Scale"**
- Medical Data Migration to a certified Managed Database (AWS/GCP).
- Third-party penetration testing (mandatory for medical data).
- Multi-Clinic / Group Management features.
- Public Launch with on-site training support.

**SUCCESS METRICS (OKR)**
- Average time from admission to service completion: Decreased by 30%.
- Health Department/SatuSehat reporting compliance: 100% executed without manual Excel.
- Zero Data Breach incidents (Crucial).
- CAC: < IDR 5 million per tenant.`
  },
  "example.5": {
    id: `Aplikasi platform SaaS gym & pusat kebugaran all-in-one bernama "FitNexus" untuk multi-tenant web based Management System & Access Control.

**MODEL BISNIS & GO-TO-MARKET**
- Model: Software-as-a-Service (SaaS) berbasis langganan bulanan/tahunan.
- Target: Gym independen, studio yoga, dan pusat kebugaran skala menengah di Indonesia.
- Strategi Monetisasi: 3 Tier langganan (Starter: Rp 499.000/bln, Professional: Rp 999.000/bln, Enterprise: Rp 2.499.000/bln) + Penjualan paket hardware terintegrasi (RFID Gate Bundle, POS Retail Bundle) baik secara one-time purchase maupun cicilan/sewa.
- Unique Selling Point (USP): Integrasi langsung dengan *turnstile gate* (pintu akses RFID/Biometrik) tanpa middleware tambahan, booking kelas mandiri via aplikasi member, dan manajemen recurring billing.

**STRATEGI HARDWARE & LOGISTIK**
- Spesifikasi hardware yang direkomendasikan: POS 15" Touchscreen (untuk resepsionis/retail), RFID/Barcode Scanner (desktop), Smart Turnstile Gate (dengan controller IoT), Printer Thermal Epson TM-T82X. Perkiraan harga bundel: Starter POS (Rp 4-5 Juta), Access Gate Bundle (Rp 15-20 Juta).
- Rincian biaya pokok hardware dan strategi markup: Markup 15-20% untuk menutupi biaya garansi tukar baru (RMA) tahun pertama.
- Proses fulfillment: Setiap RFID Reader dan IoT Gate Controller dikonfigurasi dengan MAC address khusus di gudang. Saat tiba di gym dan terhubung ke internet, sistem melakukan auto-provisioning untuk mengunduh kredensial akses spesifik milik tenant tersebut.

**TEKNOLOGI & ARSITEKTUR INFRASTRUKTUR (KRUSIAL)**
- **Tech Stack**: Backend Go (Fiber) dengan arsitektur Microservices, PostgreSQL, Redis (Cache & Pub/Sub), RabbitMQ (Message Broker), ReactJS (Dashboard Admin), React Native (Aplikasi Member & POS Resepsionis).
- **Arsitektur Awal (Startup Mode)**: Budget ketat (~$35/bulan). Pemisahan Data Layer (PostgreSQL, Redis, RabbitMQ) di VPS 1 (RAM 4GB), dan Application Layer (Go Services + API Gateway) di VPS 2 (RAM 4GB) untuk mengurangi resource contention saat pemrosesan check-in massal di jam sibuk.
- **Prinsip Database per Service**: Isolasi domain (Membership, Billing, Access Control) dengan schema terpisah di dalam satu instance PostgreSQL untuk menghemat biaya di awal, namun mematuhi batas *bounded context* microservice.
- **Penanganan SPOF (Single Point of Failure)**: VPS Database adalah SPOF saat MVP. Roadmap mewajibkan migrasi ke Managed PostgreSQL (DigitalOcean/AWS RDS) setelah mencapai 30+ tenant agar data akses dan *billing* memiliki auto-backup dan failover otomatis.
- **Skalabilitas Horizontal**: Aplikasi Go dibuat *stateless* (session admin/member di Redis) sehingga saat traffic booking kelas melonjak, VPS Application dapat digandakan di belakang Load Balancer.

Berikut adalah daftar spesifikasi fitur wajib (Core Features) yang HARUS ada dalam PRD ini:

**FITUR SPESIFIK UNTUK SAAS (WAJIB)**
- **Multi-Tenancy**: Isolasi data antar gym (schema per tenant). Onboarding otomatis untuk gym baru (< 15 menit).
- **Subscription & Billing**: Auto-renewal langganan gym, *grace period* 7 hari, suspensi otomatis jika gagal bayar, *automated invoicing*.
- **IoT & Device Management**: Monitor status online/offline gate akses, pembaruan firmware remote untuk IoT controller, dan alert jika pintu mengalami *force open*.
- **Multi-Outlet**: Mendukung gym dengan banyak cabang (Enterprise tier), akses member lintas cabang (roaming).
- **Helpdesk Terintegrasi**: Sistem tiket, knowledge base (cara setup gate), live chat in-app.

**Manajemen Membership & Check-In (Membership Management)**
* Pendaftaran member baru (Walk-in atau via aplikasi).
* Penjualan paket membership (Harian, Bulanan, Tahunan, *Pay-per-visit*).
* Sistem Check-In terintegrasi (Scan Barcode di HP, Kartu RFID, atau Biometrik).
* Validasi akses: Memblokir pintu *turnstile* otomatis jika membership kedaluwarsa.
* Cuti membership (*Freeze account*) karena alasan medis atau liburan.

**Manajemen Kelas & Layanan**
* Pembuatan jadwal kelas (Yoga, Zumba, HIIT) dengan kapasitas maksimal ruangan.
* Booking kelas oleh member (via aplikasi) & pembatalan dengan penalti/batas waktu.
* Manajemen Personal Trainer (PT): Jadwal sesi, kuota sesi PT per member, dan pelacakan jam mengajar PT.
* Dynamic pricing untuk kelas premium atau jam sibuk (Peak Hours).

**Transaksi & Pembayaran Kasir**
* Penerimaan pembayaran multi-metode (Tunai, Kartu Kredit, QRIS, Auto-debit untuk membership).
* Penjualan retail (Suplemen, Minuman, Merchandise) di kasir resepsionis.
* Cetak struk termal dan e-receipt (WhatsApp/Email).
* Laporan rekonsiliasi kas resepsionis (Shift buka/tutup).

**Manajemen Fasilitas & Alat (Facility Management)**
* Pencatatan jadwal pemeliharaan (maintenance) alat-alat berat gym.
* Sistem pelaporan alat rusak oleh staf/member via aplikasi (menandai alat "Out of Order").
* Manajemen penyewaan loker (Harian/Bulanan).

**Manajemen Inventaris & Stok**
* Stok barang retail (Suplemen, Minuman).
* Alert otomatis jika stok suplemen mencapai batas minimum.
* Pencatatan Purchase Orders (PO) ke supplier suplemen.
* Stock opname rutin untuk barang dagangan.

**Manajemen Pelanggan (CRM)**
* Profil kesehatan dasar member (Tinggi, Berat, Golongan Darah - opsional/terenkripsi).
* Pengingat otomatis via WA H-3 sebelum membership habis.
* Kampanye promo untuk member yang sudah tidak aktif > 3 bulan (Win-back campaign).

**Manajemen Karyawan & Keamanan**
* Kontrol akses (Pemilik, Manajer, Resepsionis, Trainer).
* Sistem absensi staf dan Trainer.
* Perhitungan komisi Personal Trainer berdasarkan sesi yang selesai.
* Audit trail untuk aktivitas sensitif (pembatalan tagihan, override pintu akses manual).

**Pelaporan & Analitik Data**
* Dashboard Pertumbuhan Member (Acquisition vs Churn).
* Analitik Jam Sibuk (Peak Hour) berdasarkan data scan pintu akses.
* Laporan Penjualan Retail vs Pendapatan Membership.
* Laporan Laba/Rugi operasional gym harian/bulanan.

RENCANA IMPLEMENTASI (ROADMAP)
**BABAK 1: MVP (Bulan 1-3) - "Closed Beta untuk 1-3 Gym Pilot"**
*Goal:* Menggantikan pencatatan manual dan sistem akses *standalone* di gym pilot.
- **Fokus Teknis:** 2 VPS Architecture, *stateless application*.
- **Fitur WAJIB MVP:**
  - Multi-tenant dasar (onboarding manual).
  - Pendaftaran member & penjualan paket dasar.
  - Integrasi dengan 1 merk/tipe RFID Reader (desktop/USB) untuk check-in resepsionis (belum terhubung ke Turnstile Gate fisik).
  - Kasir sederhana untuk jualan air mineral/suplemen.
  - Jadwal kelas (tapi booking masih dilakukan admin di meja resepsionis).
- **Ditunda:** Integrasi Turnstile Hardware, Aplikasi Mobile Member, Auto-debit kartu kredit.

**BABAK 2: Improvement Sprints (Bulan 4-12)**
**Sprint 1 (Bulan 4-6): "Otomatisasi Akses & Mobile App"**
- Integrasi IoT Controller untuk membuka Turnstile Gate secara otomatis dari cloud/LAN.
- Rilis Aplikasi Mobile Member (React Native) untuk melihat barcode check-in mandiri.
- Fitur Booking Kelas mandiri via aplikasi.

**Sprint 2 (Bulan 7-9): "Ekspansi Pembayaran & Retensi"**
- Integrasi QRIS dinamis & Payment Gateway (Midtrans/Xendit) untuk Auto-debit kartu kredit.
- Fitur CRM (Pengingat perpanjangan otomatis via WhatsApp API).
- Manajemen Multi-Cabang untuk tenant Enterprise.

**Sprint 3 (Bulan 10-12): "Hardening & Scale"**
- Migrasi Database ke Managed Service.
- Implementasi sistem komisi Personal Trainer.
- Public Launch, program kemitraan dengan distributor alat gym.

**METRIK KEBERHASILAN (OKR)**
- Churn Rate Tenant: < 4% per bulan.
- Persentase check-in mandiri (tanpa resepsionis): > 70%.
- Uptime API Gate Access: 99.99% (Sangat krusial agar member tidak terkunci).
- CAC: < Rp 4 Juta.`,
    en: `An all-in-one gym & fitness center SaaS platform named "FitNexus" for a multi-tenant web-based Management System & Access Control.

**BUSINESS MODEL & GO-TO-MARKET**
- Model: Software-as-a-Service (SaaS) based on monthly/annual subscriptions.
- Target: Independent gyms, yoga studios, and mid-sized fitness centers in Indonesia.
- Monetization Strategy: 3 Subscription Tiers (Starter: IDR 499,000/mo, Professional: IDR 999,000/mo, Enterprise: IDR 2,499,000/mo) + Integrated hardware package sales (RFID Gate Bundle, POS Retail Bundle) either as a one-time purchase or installment/lease.
- Unique Selling Point (USP): Direct integration with turnstile gates (RFID/Biometric access doors) without additional middleware, self-service class booking via a member app, and recurring billing management.

**HARDWARE & LOGISTICS STRATEGY**
- Recommended hardware specifications: 15" Touchscreen POS (for receptionist/retail), RFID/Barcode Scanner (desktop), Smart Turnstile Gate (with IoT controller), Epson TM-T82X Thermal Printer. Estimated bundle prices: Starter POS (IDR 4-5 Million), Access Gate Bundle (IDR 15-20 Million).
- Hardware cost breakdown and markup strategy: 15-20% markup to cover first-year Return Merchandise Authorization (RMA) / replacement warranty costs.
- Fulfillment process: Each RFID Reader and IoT Gate Controller is configured with a specific MAC address in the warehouse. Upon arrival at the gym and connecting to the internet, the system performs auto-provisioning to download the specific access credentials of that tenant.

**TECHNOLOGY & INFRASTRUCTURE ARCHITECTURE (CRUCIAL)**
- **Tech Stack**: Go Backend (Fiber) with Microservices architecture, PostgreSQL, Redis (Cache & Pub/Sub), RabbitMQ (Message Broker), ReactJS (Admin Dashboard), React Native (Member App & Receptionist POS).
- **Initial Architecture (Startup Mode)**: Tight budget (~$35/month). Separation of Data Layer (PostgreSQL, Redis, RabbitMQ) on VPS 1 (4GB RAM), and Application Layer (Go Services + API Gateway) on VPS 2 (4GB RAM) to reduce resource contention during massive check-in processing at peak hours.
- **Database per Service Principle**: Domain isolation (Membership, Billing, Access Control) with separate schemas within a single PostgreSQL instance to save costs initially, while adhering to microservice bounded context boundaries.
- **SPOF (Single Point of Failure) Handling**: The Database VPS is a SPOF during MVP. The roadmap mandates migration to Managed PostgreSQL (DigitalOcean/AWS RDS) after reaching 30+ tenants so that access and billing data have auto-backup and automated failover.
- **Horizontal Scalability**: The Go application is made stateless (admin/member sessions in Redis) so that when class booking traffic spikes, the Application VPS can be easily duplicated behind a Load Balancer.

Here is the list of mandatory core features that MUST be in this PRD:

**SAAS-SPECIFIC FEATURES (MANDATORY)**
- **Multi-Tenancy**: Strict data isolation between gyms (schema per tenant). Automated onboarding for new gyms (< 15 minutes).
- **Subscription & Billing**: Gym subscription auto-renewal, 7-day grace period, automatic suspension on payment failure, automated invoicing.
- **IoT & Device Management**: Monitor online/offline status of access gates, remote firmware updates for IoT controllers, and alerts if a door experiences a force open.
- **Multi-Outlet**: Support for gyms with multiple branches (Enterprise tier), cross-branch member access (roaming).
- **Integrated Helpdesk**: Ticketing system, knowledge base (how to set up gates), in-app live chat.

**Membership & Check-In Management**
* New member registration (Walk-in or via app).
* Membership package sales (Daily, Monthly, Annual, Pay-per-visit).
* Integrated Check-In system (Barcode scan on Phone, RFID Card, or Biometric).
* Access validation: Automatically blocking turnstile doors if the membership is expired.
* Membership freeze (leave of absence) due to medical reasons or holidays.

**Class & Service Management**
* Class schedule creation (Yoga, Zumba, HIIT) with maximum room capacity.
* Class booking by members (via app) & cancellation with penalties/time limits.
* Personal Trainer (PT) Management: Session schedules, PT session quotas per member, and tracking PT teaching hours.
* Dynamic pricing for premium classes or peak hours.

**Cashier & Payment Transactions**
* Multi-payment method acceptance (Cash, Credit Card, QRIS, Auto-debit for memberships).
* Retail sales (Supplements, Beverages, Merchandise) at the receptionist cashier.
* Thermal receipt printing and e-receipts (WhatsApp/Email).
* Receptionist cash reconciliation reports (Shift open/close).

**Facility & Equipment Management**
* Maintenance schedule tracking for heavy gym equipment.
* Broken equipment reporting system by staff/members via the app (tagging equipment as "Out of Order").
* Locker rental management (Daily/Monthly).

**Inventory & Stock Management**
* Retail goods stock (Supplements, Beverages).
* Automated alerts if supplement stock reaches the minimum limit.
* Purchase Orders (PO) logging to supplement suppliers.
* Routine stock opname for merchandise.

**Customer Relationship Management (CRM)**
* Basic member health profile (Height, Weight, Blood Type - optional/encrypted).
* Automated WhatsApp reminders 3 days before membership expiration.
* Promo campaigns for inactive members > 3 months (Win-back campaigns).

**Employee & Security Management**
* Role-based access control (Owner, Manager, Receptionist, Trainer).
* Staff and Trainer attendance system.
* Personal Trainer commission calculation based on completed sessions.
* Audit trail for sensitive activities (billing cancellations, manual access door overrides).

**Reporting & Data Analytics**
* Member Growth Dashboard (Acquisition vs. Churn).
* Peak Hour Analytics based on access door scan data.
* Retail Sales vs. Membership Revenue Reports.
* Gym operational Profit/Loss reports (daily/monthly).

IMPLEMENTATION PLAN (ROADMAP)
**PHASE 1: MVP (Months 1-3) - "Closed Beta for 1-3 Pilot Gyms"**
*Goal:* Replace manual logging and standalone access systems in pilot gyms.
- **Technical Focus:** 2 VPS Architecture, stateless application.
- **MANDATORY MVP Features:**
  - Basic multi-tenant (manual onboarding).
  - Member registration & basic package sales.
  - Integration with 1 brand/type of RFID Reader (desktop/USB) for receptionist check-in (not yet connected to physical Turnstile Gates).
  - Simple cashier for selling mineral water/supplements.
  - Class scheduling (but booking is still done by the admin at the reception desk).
- **Postponed:** Turnstile Hardware Integration, Member Mobile App, Credit card auto-debit.

**PHASE 2: Improvement Sprints (Months 4-12)**
**Sprint 1 (Months 4-6): "Access Automation & Mobile App"**
- IoT Controller integration to automatically open Turnstile Gates from cloud/LAN.
- Release Member Mobile App (React Native) to view self-service check-in barcodes.
- Self-service class booking feature via the app.

**Sprint 2 (Months 7-9): "Payment Expansion & Retention"**
- Dynamic QRIS & Payment Gateway integration (Midtrans/Xendit) for credit card auto-debit.
- CRM Features (Automated renewal reminders via WhatsApp API).
- Multi-Branch Management for Enterprise tenants.

**Sprint 3 (Months 10-12): "Hardening & Scale"**
- Database Migration to a Managed Service.
- Implementation of the Personal Trainer commission system.
- Public Launch, partnership programs with gym equipment distributors.

**SUCCESS METRICS (OKR)**
- Tenant Churn Rate: < 4% per month.
- Percentage of self-service check-ins (without receptionist): > 70%.
- Gate Access API Uptime: 99.99% (Crucial so members are not locked out).
- CAC: < IDR 4 Million.`
  },


  // ── Features Grid ──────────────────────────────────────────────
  "features.mdprd":       { id: "Markdown PRD",           en: "Markdown PRD" },
  "features.mdprdDesc":   { id: "Dokumen PRD terstruktur dalam format Markdown profesional", en: "Structured PRD documents in professional Markdown format" },
  "features.diagram":     { id: "Diagram UML",            en: "UML Diagrams" },
  "features.diagramDesc": { id: "Sequence diagram & ERD otomatis dalam format Mermaid", en: "Auto-generated sequence diagrams & ERDs in Mermaid format" },
  "features.chat":        { id: "Chat Revisi",            en: "Chat Revision" },
  "features.chatDesc":    { id: "Diskusikan & revisi PRD melalui chat interaktif dengan AI", en: "Discuss & revise PRDs through interactive AI chat" },

  // ── PRD Viewer ─────────────────────────────────────────────────
  "viewer.ready":    { id: "PRD Siap",                    en: "PRD Ready" },
  "viewer.copy":     { id: "Salin MD",                    en: "Copy MD" },
  "viewer.copied":   { id: "Tersalin!",                   en: "Copied!" },
  "viewer.download": { id: "Download .md",                en: "Download .md" },
  "viewer.downloaded":{ id: "Terdownload!",               en: "Downloaded!" },
  "viewer.save":     { id: "Simpan",                      en: "Save" },
  "viewer.saving":   { id: "Menyimpan...",                en: "Saving..." },
  "viewer.saved":    { id: "Tersimpan!",                  en: "Saved!" },
  "viewer.chat":     { id: "Chat Revisi",                 en: "Chat Revision" },

  // ── Chat Panel ─────────────────────────────────────────────────
  "chat.title":       { id: "💬 Chat Revisi PRD",         en: "💬 PRD Revision Chat" },
  "chat.placeholder": { id: "Minta revisi atau tanyakan sesuatu tentang PRD...", en: "Request revisions or ask about the PRD..." },
  "chat.send":        { id: "Kirim",                       en: "Send" },
  "chat.thinking":    { id: "AI sedang berpikir...",       en: "AI is thinking..." },
  "chat.empty":       { id: "Tanyakan revisi atau klarifikasi tentang PRD Anda di sini", en: "Ask for revisions or clarifications about your PRD here" },

  // ── History Drawer ─────────────────────────────────────────────
  "history.title":        { id: "📋 Riwayat PRD",         en: "📋 PRD History" },
  "history.openFile":     { id: "Buka File .md",          en: "Open .md File" },
  "history.empty":        { id: "Belum ada PRD tersimpan", en: "No saved PRDs yet" },
  "history.emptyHint":    { id: "Buat PRD baru dan simpan untuk melihatnya di sini", en: "Generate a new PRD and save it to see it here" },
  "history.retry":        { id: "Coba lagi",              en: "Retry" },
  "history.open":         { id: "📖 Buka",                en: "📖 Open" },
  "history.storageLabel": { id: "{count} PRD · {size} tersimpan di browser ini", en: "{count} PRDs · {size} stored in this browser" },

  // ── Settings ───────────────────────────────────────────────────
  "settings.title":          { id: "Pengaturan AI",            en: "AI Settings" },
  "settings.provider":       { id: "Penyedia AI",              en: "AI Provider" },
  "settings.apiKeyLabel":    { id: "API Key",                  en: "API Key" },
  "settings.apiKeyPlaceholder":{ id: "Masukkan {provider} API Key...", en: "Enter {provider} API Key..." },
  "settings.apiKeyHelpPrefix":{ id: "Dapatkan API Key",        en: "Get API Key" },
  "settings.apiKeyHelpSuffix":{ id: "dari {provider}. Key disimpan di browser Anda.", en: "from {provider}. Key is stored in your browser." },
  "settings.apiKeyHelpWarning":{ id: "API key harus dimasukkan terlebih dahulu untuk fetch model.", en: "API key must be entered first to fetch models." },
  "settings.model":          { id: "Model AI",                 en: "AI Model" },
  "settings.customPrompt":   { id: "Customize Prompts",        en: "Customize Prompts" },
  "settings.customPromptDesc":{ id: "Edit system prompts untuk setiap tahap pipeline AI", en: "Edit system prompts for each AI pipeline stage" },
  "settings.statusSaved":    { id: "API Key {provider} tersimpan", en: "{provider} API Key saved" },
  "settings.statusNotSet":   { id: "API Key belum diatur — menggunakan key dari server (.env)", en: "API Key not set — using server key (.env)" },
  "settings.clearAll":       { id: "Hapus Semua",              en: "Clear All" },
  "settings.cancel":         { id: "Batal",                    en: "Cancel" },
  "settings.save":           { id: "Simpan",                   en: "Save" },
  "settings.saved":          { id: "Tersimpan",                en: "Saved" },
  "settings.close":          { id: "Tutup",                    en: "Close" },

  // ── Prompt Editor ──────────────────────────────────────────────
  "promptEditor.title":        { id: "Customize System Prompts", en: "Customize System Prompts" },
  "promptEditor.desc":         { id: "Edit system prompt untuk setiap tahap pipeline. Placeholder {placeholder} akan diganti otomatis.", en: "Edit system prompts for each pipeline stage. {placeholder} placeholders are replaced automatically." },
  "promptEditor.reset":        { id: "Reset ke default",        en: "Reset to default" },
  "promptEditor.default":      { id: "(default)",               en: "(default)" },
  "promptEditor.custom":       { id: "(custom)",                en: "(custom)" },
  "promptEditor.save":         { id: "Simpan",                  en: "Save" },
  "promptEditor.cancel":       { id: "Batal",                   en: "Cancel" },

  // ── Language Switch ────────────────────────────────────────────
  "lang.switch": { id: "English", en: "Bahasa Indonesia" },
  "lang.label":  { id: "Bahasa",  en: "Language" },

  // ── Storage Warning ────────────────────────────────────────────
  "storageWarning.title":  { id: "Data disimpan di browser ini", en: "Data stored in this browser" },
  "storageWarning.body":   { id: "PRD, API key, dan pengaturan disimpan di localStorage & IndexedDB browser Anda. Menghapus data browsing, menggunakan incognito mode, atau berganti profil browser akan menghilangkan semua data. Gunakan tombol Download untuk backup PRD Anda. Kamu juga bisa meng-host app ini sendiri jika mau ",
                               en: "PRDs, API keys, and settings are stored in your browser's localStorage & IndexedDB. Clearing browsing data, using incognito mode, or switching browser profiles will erase all data. Use the Download button to back up your PRDs. You can also host the app yourself if you want " },
  "storageWarning.repo":   { id: "dengan repo ini.", en: "with this repo." },
  "storageWarning.dismiss":{ id: "Mengerti",                    en: "Got it" },

  // ── Footer ─────────────────────────────────────────────────────
  "footer": { id: "AI PRD Maker — Multi-AI Powered PRD Generator (OpenAI · DeepSeek · Gemini · Grok · Claude)", en: "AI PRD Maker — Multi-AI Powered PRD Generator (OpenAI · DeepSeek · Gemini · Grok · Claude)" },
};

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "ai-prd-maker-lang";

function getStoredLang(): Lang {
  if (typeof window === "undefined") return "id";
  return (localStorage.getItem(STORAGE_KEY) as Lang) || "id";
}

const listeners = new Set<() => void>();
let cachedLang: Lang | null = null;

export function getCurrentLang(): Lang {
  if (cachedLang === null) cachedLang = getStoredLang();
  return cachedLang;
}

export function useLanguage() {
  // Always start with "id" to match server render — sync from localStorage after mount
  const [lang, setLangState] = useState<Lang>("id");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLangState(getCurrentLang());
    setHydrated(true);
    const handler = () => setLangState(getCurrentLang());
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const setLang = useCallback((l: Lang) => {
    cachedLang = l;
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
    listeners.forEach((fn) => fn());
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "id" ? "en" : "id");
  }, [lang, setLang]);

  const t = useCallback((key: string, vars?: Record<string, string>): string => {
    const entry = T[key];
    let text = entry ? entry[lang] : key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, v);
      }
    }
    return text;
  }, [lang]);

  return { lang, setLang, toggleLang, t, hydrated };
}

/** Non-hook version for use in callbacks where hooks can't be called */
export function tStatic(key: string, vars?: Record<string, string>): string {
  const entry = T[key];
  let text = entry ? entry[getCurrentLang()] : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}
