// preload.js - TAM VE EKSİKSİZ VERSIYONU

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('db', {
  // =============================================================================
  // DÖNEM İŞLEMLERİ
  // =============================================================================
  getDonemler: () => ipcRenderer.invoke('get-donemler'),
  getDonemById: (donemId) => ipcRenderer.invoke('get-donem-by-id', donemId),

  // =============================================================================
  // TEMEL ÖĞRENCİ İŞLEMLERİ
  // =============================================================================
  getOgrencilerByDonem: (donemId) => ipcRenderer.invoke('get-ogrenciler-by-donem', donemId),
  getOgrenciById: (ogrenciId) => ipcRenderer.invoke('get-ogrenci-by-id', ogrenciId),
  addOgrenci: (ogrenciData) => ipcRenderer.invoke('add-ogrenci', ogrenciData),
  deleteOgrenci: (ogrenciId) => ipcRenderer.invoke('delete-ogrenci', ogrenciId),

  // =============================================================================
  // GELİŞMİŞ ÖĞRENCİ İŞLEMLERİ
  // =============================================================================

  // Öğrenci CRUD
  addOgrenciEnhanced: (ogrenciData) => ipcRenderer.invoke('add-ogrenci-enhanced', ogrenciData),
  updateOgrenci: (ogrenciId, ogrenciData) => ipcRenderer.invoke('update-ogrenci', ogrenciId, ogrenciData),

  // Sınav yönetimi
  updateOgrenciSinavPuan: (ogrenciId, sinavPuan) =>
    ipcRenderer.invoke('update-ogrenci-sinav-puan', ogrenciId, sinavPuan),

  // Belge yönetimi
  updateOgrenciBelge: (ogrenciId, belgeAdi, durum) =>
    ipcRenderer.invoke('update-ogrenci-belge', ogrenciId, belgeAdi, durum),
  updateOgrenciBelgeAdvanced: (ogrenciId, belgeAdi, durum) =>
    ipcRenderer.invoke('update-ogrenci-belge-advanced', ogrenciId, belgeAdi, durum),
  getOgrenciBelgeTamamlanma: (ogrenciId) =>
    ipcRenderer.invoke('get-ogrenci-belge-tamamlanma', ogrenciId),

  // Not ve ödeme yönetimi
  updateOgrenciNot: (ogrenciId, not) =>
    ipcRenderer.invoke('update-ogrenci-not', ogrenciId, not),
  updateOgrenciOdeme: (ogrenciId, odeme) =>
    ipcRenderer.invoke('update-ogrenci-odeme', ogrenciId, odeme),

  // =============================================================================
  // ARAMA VE FİLTRELEME
  // =============================================================================
  searchOgrencilerAdvanced: (searchTerm, donemId = null, durum = null, belgeFilter = null, silahDurum = null) =>
    ipcRenderer.invoke('search-ogrenciler-advanced', searchTerm, donemId, durum, belgeFilter, silahDurum),

  // =============================================================================
  // TOPLU İŞLEMLER
  // =============================================================================
  bulkUpdateBelgeler: (ogrenciIds, belgeAdi, durum) =>
    ipcRenderer.invoke('bulk-update-belgeler', ogrenciIds, belgeAdi, durum),
  bulkUpdateDurum: (ogrenciIds, yeniDurum) =>
    ipcRenderer.invoke('bulk-update-durum', ogrenciIds, yeniDurum),

  // =============================================================================
  // İSTATİSTİKLER VE RAPORLAMA
  // =============================================================================
  getOgrenciIstatistikleri: (donemId = null) =>
    ipcRenderer.invoke('get-ogrenci-istatistikleri', donemId),
  getOdemeIstatistikleri: (donemId = null) =>
    ipcRenderer.invoke('get-odeme-istatistikleri', donemId),
  getDonemRapor: (donemId) =>
    ipcRenderer.invoke('get-donem-rapor', donemId),

  // =============================================================================
  // VALİDASYON FONKSİYONLARI
  // =============================================================================
  validateTCKimlik: (tcNo) =>
    ipcRenderer.invoke('validate-tc-kimlik', tcNo),
  checkDuplicateStudent: (tcNo, donemId, excludeId = null) =>
    ipcRenderer.invoke('check-duplicate-student', tcNo, donemId, excludeId),

  // =============================================================================
  // GENEL VERİTABANI İŞLEMLERİ
  // =============================================================================
  runQuery: (query, params) => ipcRenderer.invoke('run-query', query, params),

  // =============================================================================
  // ÖDEMELER PRELOAD FONKSİYONLARI - preload.js'e eklenecek
  // =============================================================================

  // Ödemeler
  getOdemeler: () => ipcRenderer.invoke('getOdemeler'),
  getOdemelerByOgrenci: (ogrenciId) => ipcRenderer.invoke('getOdemelerByOgrenci', ogrenciId),
  getPaymentStats: () => ipcRenderer.invoke('getPaymentStats'),
  addOdeme: (odemeData) => ipcRenderer.invoke('addOdeme', odemeData),
  updateOdeme: (odemeId, odemeData) => ipcRenderer.invoke('updateOdeme', odemeId, odemeData),
  deleteOdeme: (odemeId) => ipcRenderer.invoke('deleteOdeme', odemeId),
  getOdemelerByDonem: (donemId) => ipcRenderer.invoke('getOdemelerByDonem', donemId),
  getOdemelerByDateRange: (startDate, endDate) => ipcRenderer.invoke('getOdemelerByDateRange', startDate, endDate),
  getOdemelerByDurum: (durum) => ipcRenderer.invoke('getOdemelerByDurum', durum),


  getOgrencilerWithPayments: (donemId) => ipcRenderer.invoke('get-ogrenciler-with-payments', donemId),

  // Bildirim CRUD işlemleri
  getBildirimler: () => ipcRenderer.invoke('getBildirimler'),
  getBildirimlerByTur: (tur) => ipcRenderer.invoke('getBildirimlerByTur', tur),
  getOkunmamisBildirimler: () => ipcRenderer.invoke('getOkunmamisBildirimler'),
  getBildirimStats: () => ipcRenderer.invoke('getBildirimStats'),
  addBildirim: (bildirimData) => ipcRenderer.invoke('addBildirim', bildirimData),
  markBildirimOkundu: (bildirimId) => ipcRenderer.invoke('markBildirimOkundu', bildirimId),
  markAllBildirimlerOkundu: () => ipcRenderer.invoke('markAllBildirimlerOkundu'),
  deleteBildirim: (bildirimId) => ipcRenderer.invoke('deleteBildirim', bildirimId),
  deleteBildirimlerByIds: (bildirimIds) => ipcRenderer.invoke('deleteBildirimlerByIds', bildirimIds),

  // Otomatik bildirim kontrolleri
  runDailyNotificationChecks: () => ipcRenderer.invoke('runDailyNotificationChecks'),
  manualNotificationCheck: () => ipcRenderer.invoke('manualNotificationCheck'),
  checkAndCreateKimlikSuresiBildirimleri: () => ipcRenderer.invoke('checkAndCreateKimlikSuresiBildirimleri'),
  checkAndCreateBelgeBildirimleri: () => ipcRenderer.invoke('checkAndCreateBelgeBildirimleri'),
  checkAndCreateOdemeBildirimleri: () => ipcRenderer.invoke('checkAndCreateOdemeBildirimleri'),
  checkAndCreateDonemBildirimleri: () => ipcRenderer.invoke('checkAndCreateDonemBildirimleri')
});

console.log('🔗 Tam öğrenci yönetimi API fonksiyonları hazır!');