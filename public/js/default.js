if (!window.enhancedStudentFilters) {
    window.enhancedStudentFilters = {
        search: '',
        status: 'all',
        documents: 'all-docs',
        silah: 'all'
    };
}

// Application State
const appState = {
    activeTab: 'dashboard',
    sidebarCollapsed: false,
    currentStatusFilter: 'all',
    currentTypeFilter: 'all',
    currentSort: 'date_newest',
    currentSearch: '',
    currentTermId: null // Aktif dönem ID'si
};

// Global değişkenler
let allPayments = []; // Tüm ödemeler
let filteredPayments = []; // Filtrelenmiş ödemeler
let paymentsDatePicker = null; // Flatpickr instanc

// Terms Data Array (Database'den doldurulacak)
let termsData = [];

// DOM Elements
const sidebar = document.getElementById('sidebar');
const collapseBtn = document.getElementById('collapseBtn');
const navLinks = document.querySelectorAll('.nav-link');
const pageContents = document.querySelectorAll('.page-content');
const pageTitle = document.getElementById('pageTitle');
const pageDescription = document.getElementById('pageDescription');
const termsTableBody = document.getElementById('termsTableBody');
const filterTabs = document.querySelectorAll('.filter-tab');
const sortSelect = document.getElementById('sortSelect');
const termsSearchInput = document.getElementById('termsSearchInput');
const clearSearch = document.getElementById('clearSearch');

// Modal Elements
let addTermModalElement = null;
let addTermFormElement = null;

// Page Configuration
const pageConfig = {
    dashboard: {
        title: 'Dashboard',
        description: 'Genel sistem durumunu görüntüleyin'
    },
    students: {
        title: 'Öğrenciler',
        description: 'Öğrenci bilgilerini yönetin'
    },
    terms: {
        title: 'Dönemler',
        description: 'Eğitim dönemlerini yönetin'
    },
    'term-detail': {
        title: 'Dönem Detayları',
        description: 'Dönem öğrencilerini yönetin'
    },
    payments: {
        title: 'Ödemeler',
        description: 'Ödeme işlemlerini takip edin'
    },
    notifications: {
        title: 'Bildirimler',
        description: 'Bildirimlerinizi yönetin'
    },
    settings: {
        title: 'Ayarlar',
        description: 'Sistem ayarlarını yapılandırın'
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    await i18n.loadTranslations();
    
    const langContainer = document.getElementById('languageSelectorContainer');
    if (langContainer) {
        langContainer.appendChild(i18n.createLanguageSelector());
    }
    
    i18n.updatePageContent();
});

// =============================================================================
// BASIT VE ETKİLİ SAYFA YÖNETİMİ
// =============================================================================

function switchPage(pageId, termId = null) {
    console.log(`🔄 Sayfa geçiş: ${pageId}`, termId ? `Term: ${termId}` : '');

    // State güncelle
    appState.activeTab = pageId;
    appState.currentTermId = termId;

    // Tüm sayfaları gizle
    document.querySelectorAll('.page-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });

    // Navigation güncelle
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });

    // Header güncelle
    const config = pageConfig[pageId];
    if (config) {
        document.getElementById('pageTitle').textContent = config.title;
        document.getElementById('pageDescription').textContent = config.description;
    }

    // Özel sayfa işlemleri
    if (pageId === 'term-detail') {

        if (!window.appState) {
            window.appState = {};
        }
        window.appState.currentTermId = termId;
        console.log('🔄 Sayfa geçiş: term-detail Term:', termId);

        showTermDetailPage(termId);
    } else {
        // Normal sayfa göster
        const targetContent = document.getElementById(`${pageId}-content`);
        if (targetContent) {
            targetContent.style.display = 'block';
            targetContent.classList.add('active');

            // Content area'yı en üste kaydır
            const contentArea = document.querySelector('.content-area');
            if (contentArea) {
                contentArea.scrollTop = 0;
            }
        }

        // Sayfa özel işlemler
        if (pageId === 'terms') {
            renderTerms();
        } else if (pageId === 'dashboard') {
            updateDashboardStats();
        }
        else if (pageId === 'payments') {
            loadPayments(); // Bu satırı ekleyin

            // Flatpickr'ı başlat
            setTimeout(() => {
                initializePaymentDatePickers();
            }, 300);
        }
        else if (pageId === 'notifications') {
            loadNotificationsPage(); // Bildirim sayfasını yükle
        }
    }
}


// =============================================================================
// DÖNEM DETAY SAYFASI - YENİDEN YAZILDI
// =============================================================================

function showTermDetailPage(termId) {
    if (!termId) {
        console.error('❌ Term ID yok, dönemlere yönlendiriliyor');
        switchPage('terms');
        return;
    }

    const term = termsData.find(t => t.id == termId);
    if (!term) {
        console.error('❌ Dönem bulunamadı:', termId);
        switchPage('terms');
        return;
    }

    console.log('✅ Dönem detay sayfası oluşturuluyor:', term);

    // Term detail content'i oluştur veya güncelle
    createOrUpdateTermDetailContent(term);
}

function createOrUpdateTermDetailContent(term) {
    // Mevcut term-detail content'i kontrol et
    let termDetailContent = document.getElementById('term-detail-content');

    if (!termDetailContent) {
        // İlk kez oluşturuyoruz
        const contentArea = document.querySelector('.content-area');
        termDetailContent = document.createElement('div');
        termDetailContent.className = 'page-content';
        termDetailContent.id = 'term-detail-content';
        contentArea.appendChild(termDetailContent);
        console.log('📄 Yeni term-detail content oluşturuldu');
    }

    // İçeriği doldur
    termDetailContent.innerHTML = createTermDetailHTML(term);

    // Göster ve aktif yap
    termDetailContent.style.display = 'block';
    termDetailContent.classList.add('active');

    // Scroll en üste
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
        contentArea.scrollTop = 0;
    }

    // ÖNEMLİ: appState'i güncelle
    if (!window.appState) {
        window.appState = {};
    }
    window.appState.currentTermId = term.id;
    console.log('🎯 currentTermId ayarlandı:', term.id);

    // Event listener'ları ekle
    setupTermDetailEvents();

    // Öğrencileri yükle
    setTimeout(() => {
        loadTermStudents(term.id);
    }, 200);

    console.log('✅ Term detail sayfa hazır');
}

function createTermDetailHTML(term) {
    const currentStatus = calculateTermStatus(term.donem_baslangic_t, term.donem_bitis_t);
    const statusClass = currentStatus.toLowerCase().replace('ş', 's').replace('ı', 'i');

    return `
        <div class="term-detail-page">
            <!-- Header -->
            <div class="term-header" style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 24px; margin-bottom: 24px; border-radius: 12px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                    <div>
                        <div style="margin-bottom: 16px;">
                            <button class="back-to-terms-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-arrow-left"></i>
                                Dönemlere Dön
                            </button>
                        </div>
                        <h1 style="margin: 0 0 8px 0; font-size: 28px;">${term.donem_turu} Eğitim - Dönem ${term.donem_numara}</h1>
                        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                            <span><i class="fas fa-calendar"></i> ${formatDate(term.donem_baslangic_t)} - ${formatDate(term.donem_bitis_t)}</span>
                            <span><i class="fas fa-users"></i> ${term.donem_ogr_adedi} Öğrenci</span>
                            <span class="status-badge ${statusClass}" style="background: rgba(255,255,255,0.95); color: #16a34a; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 13px; border: 2px solid rgba(255,255,255,0.8); box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${currentStatus}</span>
                        </div>
                    </div>
                    <div>
                        <button class="add-student-btn-header" style="background: rgba(255,255,255,0.9); color: #16a34a; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                            <i class="fas fa-user-plus"></i> Öğrenci Ekle
                        </button>
                    </div>
                </div>
            </div>

            <!-- Stats -->
            <div class="term-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px;">
                <div class="stat-card" style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; text-align: center;">
                    <div style="font-size: 28px; font-weight: bold; color: #111827; margin-bottom: 4px;" id="totalStudents">${term.donem_ogr_adedi}</div>
                    <div style="font-size: 14px; color: #6b7280;">Toplam Öğrenci</div>
                </div>
                <div class="stat-card" style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; text-align: center;">
                    <div style="font-size: 28px; font-weight: bold; color: #111827; margin-bottom: 4px;" id="completedDocuments">-</div>
                    <div style="font-size: 14px; color: #6b7280;">Belge Tamamlanma %</div>
                </div>
                <div class="stat-card" style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; text-align: center;">
                    <div style="font-size: 28px; font-weight: bold; color: #111827; margin-bottom: 4px;" id="passedExams">-</div>
                    <div style="font-size: 14px; color: #6b7280;">Sınavdan Geçen</div>
                </div>
                <div class="stat-card" style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; text-align: center;">
                    <div style="font-size: 28px; font-weight: bold; color: #111827; margin-bottom: 4px;" id="averageScore">-</div>
                    <div style="font-size: 14px; color: #6b7280;">Ortalama Sınav Puanı</div>
                </div>
                <div class="stat-card" style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; text-align: center;">
                    <div style="font-size: 28px; font-weight: bold; color: #111827; margin-bottom: 4px;" id="completedPayments">-</div>
                    <div style="font-size: 14px; color: #6b7280;">Toplam Ödeme (₺)</div>
                </div>
            </div>

            <!-- Students Section -->
            <div class="students-section" style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
                    <h2 style="margin: 0; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-users"></i> 
                        Dönem Öğrencileri 
                        <span class="student-count" style="background: #16a34a; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">${term.donem_ogr_adedi} Öğrenci</span>
                    </h2>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn btn-refresh" onclick="refreshStudentList(${term.id})" title="Öğrenci listesini yenile" style="background: #f3f4f6; color: #6b7280; border: 1px solid #d1d5db; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;">
                            <i class="fas fa-sync-alt"></i> Yenile
                        </button>
                        <button class="btn btn-secondary" onclick="exportStudentsToCSV(${term.id})" style="background: #f3f4f6; color: #6b7280; border: 1px solid #d1d5db; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-download"></i> CSV
                        </button>
                        <button class="btn btn-secondary" onclick="generateTermReport(${term.id})" style="background: #f3f4f6; color: #6b7280; border: 1px solid #d1d5db; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-file-alt"></i> Rapor
                        </button>
                        <button class="add-student-btn-section" style="background: #16a34a; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer;">
                            <i class="fas fa-user-plus"></i> Yeni Öğrenci
                        </button>
                    </div>
                </div>

                <!-- Filters -->
                <!-- Durum Filtreleri -->
    <div class="filter-group" style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 14px; font-weight: 500; color: #374151; min-width: 60px;">Durum:</span>
        <div class="filter-tabs" style="display: flex; background-color: #f3f4f6; border-radius: 8px; padding: 4px;">
            <button class="filter-tab active" data-type="status" data-filter="all" style="padding: 6px 12px; border: none; background: white; color: #16a34a; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">Tümü</button>
            <button class="filter-tab" data-type="status" data-filter="aktif" style="padding: 6px 12px; border: none; background: none; color: #6b7280; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px;">Aktif</button>
            <button class="filter-tab" data-type="status" data-filter="pasif" style="padding: 6px 12px; border: none; background: none; color: #6b7280; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px;">Pasif</button>
            <button class="filter-tab" data-type="status" data-filter="mezun" style="padding: 6px 12px; border: none; background: none; color: #6b7280; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px;">Mezun</button>
        </div>
    </div>

    <!-- Belge Filtreleri -->
    <div class="filter-group" style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 14px; font-weight: 500; color: #374151; min-width: 60px;">Belgeler:</span>
        <div class="filter-tabs" style="display: flex; background-color: #f3f4f6; border-radius: 8px; padding: 4px;">
            <button class="filter-tab active" data-type="documents" data-filter="all-docs" style="padding: 6px 12px; border: none; background: white; color: #16a34a; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">Tümü</button>
            <button class="filter-tab" data-type="documents" data-filter="complete" style="padding: 6px 12px; border: none; background: none; color: #6b7280; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px;">Tamamlandı</button>
            <button class="filter-tab" data-type="documents" data-filter="incomplete" style="padding: 6px 12px; border: none; background: none; color: #6b7280; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px;">Eksik</button>
        </div>
    </div>

    <!-- Silah Filtreleri -->
    <div class="filter-group" style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 14px; font-weight: 500; color: #374151; min-width: 60px;">Silah:</span>
        <div class="filter-tabs" style="display: flex; background-color: #f3f4f6; border-radius: 8px; padding: 4px;">
            <button class="filter-tab active" data-type="silah" data-filter="all" style="padding: 6px 12px; border: none; background: white; color: #16a34a; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">Tümü</button>
            <button class="filter-tab" data-type="silah" data-filter="Silahlı" style="padding: 6px 12px; border: none; background: none; color: #6b7280; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px;">Silahlı</button>
            <button class="filter-tab" data-type="silah" data-filter="Silahsız" style="padding: 6px 12px; border: none; background: none; color: #6b7280; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px;">Silahsız</button>
        </div>
    </div>

    <!-- Arama Kutusu -->
    <div class="filter-group" style="display: flex; align-items: center; gap: 8px;">
        <div class="search-box" style="position: relative;">
            <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 14px;"></i>
            <input type="text" placeholder="Ad, soyad veya TC ile ara..." id="studentSearch" class="search-input" style="width: 250px; height: 36px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; display: block; visibility: visible; background: white; margin: 10px;">
        </div>
    </div>


                    <!-- Silah Durumu Filtresi -->
<!--<div class="filter-group" style="display: flex; align-items: center; gap: 8px;">
    <span style="font-size: 14px; font-weight: 500; color: #374151; min-width: 70px;">Eğitim Tipi:</span>
    <div class="filter-tabs" style="display: flex; background-color: #f3f4f6; border-radius: 8px; padding: 4px;">
        <button class="filter-tab active" data-filter="all" data-type="silah" style="padding: 6px 12px; border: none; background: white; color: #16a34a; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">Tümü</button>
        <button class="filter-tab" data-filter="Silahlı" data-type="silah" style="padding: 6px 12px; border: none; background: none; color: #6b7280; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px;">
            <i class="fas fa-shield-alt" style="margin-right: 4px;"></i>Silahlı
        </button>
        <button class="filter-tab" data-filter="Silahsız" data-type="silah" style="padding: 6px 12px; border: none; background: none; color: #6b7280; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px;">
            <i class="fas fa-user" style="margin-right: 4px;"></i>Silahsız
        </button>
    </div>
</div>-->
                

                <!-- Students Table Container -->
                <div class="students-table-wrapper">
                    <div id="students-loading" style="text-align: center; padding: 40px; color: #6b7280;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 12px;"></i>
                        <div>Öğrenci verileri yükleniyor...</div>
                    </div>
                    
                    <div id="students-table" style="display: none;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
        <tr style="background: #f9fafb;">
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Öğrenci Bilgileri</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">TC / Telefon</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Eğitim Tipi</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Belgeler</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Sınav Sonucu</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Ödeme</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Kayıt Tarihi</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">İşlemler</th>
        </tr>
    </thead>
                            <tbody id="students-tbody">
                                <!-- Öğrenciler buraya gelecek -->
                            </tbody>
                        </table>
                    </div>

                    <div id="students-empty" style="display: none; text-align: center; padding: 40px; color: #6b7280;">
                        <i class="fas fa-user-graduate" style="font-size: 48px; margin-bottom: 16px; color: #d1d5db;"></i>
                        <h3 style="margin-bottom: 8px;">Henüz öğrenci kaydı yok</h3>
                        <p style="margin-bottom: 20px;">Bu dönem için henüz öğrenci kaydı bulunmuyor.</p>
                        <button class="add-first-student-btn" style="background: #16a34a; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer;">
                            <i class="fas fa-user-plus"></i> İlk Öğrenciyi Ekle
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =============================================================================
// EVENT HANDLING - BASİTLEŞTİRİLDİ
// =============================================================================

function setupTermDetailEvents() {
    console.log('🎯 Term detail event listener\'lar kuruluyor...');

    // Dönemlere dön butonu
    const backBtn = document.querySelector('.back-to-terms-btn');
    if (backBtn) {
        backBtn.onclick = function () {
            console.log('⬅️ Dönemlere dönülüyor...');
            switchPage('terms');
        };
    }

    // Öğrenci ekle butonları
    const addStudentBtns = document.querySelectorAll('.add-student-btn-header, .add-student-btn-section, .add-first-student-btn');
    addStudentBtns.forEach(btn => {
        btn.onclick = function () {
            console.log('➕ Öğrenci ekleme modalı açılıyor...');
            openAddStudentModal(appState.currentTermId);
        };
    });

    // FİLTRE EVENT LISTENER'LARI - KALICI ÇÖZÜM
    setTimeout(() => {
        document.querySelectorAll('.filter-tab').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();

                // Aynı gruptaki butonları pasif yap
                const parentGroup = this.closest('.filter-tabs');
                if (parentGroup) {
                    parentGroup.querySelectorAll('.filter-tab').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'none';
                        b.style.color = '#6b7280';
                        b.style.boxShadow = 'none';
                    });

                    // Bu butonu aktif yap
                    this.classList.add('active');
                    this.style.background = 'white';
                    this.style.color = '#16a34a';
                    this.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';

                    // Filtreyi uygula
                    const filterType = this.dataset.type;
                    const filterValue = this.dataset.filter;

                    console.log(`🔧 Filtre tıklandı: ${filterType} = ${filterValue}`);

                    if (filterType && filterValue) {
                        // Global state güncelle
                        if (window.enhancedStudentFilters) {
                            window.enhancedStudentFilters[filterType] = filterValue;
                            console.log('📊 Filter state güncellendi:', window.enhancedStudentFilters);
                        }

                        // Filtrelemeyi uygula
                        if (window.applyEnhancedStudentFilters) {
                            window.applyEnhancedStudentFilters();
                        } else {
                            console.log('❌ applyEnhancedStudentFilters fonksiyonu bulunamadı');
                        }
                    } else {
                        console.log('⚠️ filterType veya filterValue eksik:', { filterType, filterValue });
                    }
                }
            });
        });

        console.log('✅ Filtre event listener\'ları kuruldu');
    }, 500);

    // ARAMA KUTUSUNU KUR
    setTimeout(() => {
        setupSearchFunctionPermanent();
    }, 600); // Filter'lardan biraz sonra çalışsın
}

// =============================================================================
// ÖĞRENCİ YÖNETİMİ
// =============================================================================

window.loadTermStudents = async function (termId) {
    console.log('📚 Gelişmiş öğrenci yükleme başlatılıyor...', termId);

    const loadingDiv = document.getElementById('students-loading');
    const tableDiv = document.getElementById('students-table');
    const emptyDiv = document.getElementById('students-empty');

    // Loading göster
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (tableDiv) tableDiv.style.display = 'none';
    if (emptyDiv) emptyDiv.style.display = 'none';

    try {
        const students = await window.db.getOgrencilerByDonem(termId);

        setTimeout(() => {
            if (students && students.length > 0) {
                if (window.renderStudentsTableEnhanced) {
                    window.renderStudentsTableEnhanced(students);
                } else {
                    renderStudentsTable(students);
                }

                if (loadingDiv) loadingDiv.style.display = 'none';
                if (tableDiv) tableDiv.style.display = 'block';
                if (emptyDiv) emptyDiv.style.display = 'none';

                // SADECE gelişmiş filtreleri kur
                setupEnhancedFilters();

                // Global filtreleme state'ini başlat
                if (!window.enhancedStudentFilters) {
                    window.enhancedStudentFilters = {
                        search: '',
                        status: 'all',
                        documents: 'all-docs',
                        silah: 'all'
                    };
                }

                // İstatistikleri güncelle ama filtreleme çağırma
                updateStudentStatistics(termId);

            } else {
                if (loadingDiv) loadingDiv.style.display = 'none';
                if (tableDiv) tableDiv.style.display = 'none';
                if (emptyDiv) emptyDiv.style.display = 'block';
            }
        }, 100);

    } catch (error) {
        console.error('❌ Öğrenci yükleme hatası:', error);
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (tableDiv) tableDiv.style.display = 'none';
        if (emptyDiv) emptyDiv.style.display = 'block';
    }
};

const originalRender = window.renderStudentsTableEnhanced;

window.renderStudentsTableEnhanced = function (students) {
    console.log('🔍 renderStudentsTableEnhanced çağrıldı!');
    console.log('📊 Gelen öğrenci sayısı:', students ? students.length : 'null');
    console.log('📋 Stack trace:');
    console.trace();

    if (students && students.length > 0) {
        console.log('👥 Öğrenciler:');
        students.forEach((s, i) => {
            console.log(`${i + 1}. ${s.ogr_ad} ${s.ogr_soyad} - Silah: "${s.ogr_silah_durum}"`);
        });
    }

    // Orijinal fonksiyonu çalıştır
    return originalRender(students);
};

console.log('✅ Tablo render debug aktif! Şimdi filtreleme yapın...');

function addSelectAllCheckbox() {
    const headerRow = document.querySelector('.students-table thead tr');
    if (!headerRow) return;

    // Eğer zaten checkbox varsa çıkar
    const existingCheckbox = headerRow.querySelector('.select-all-cell');
    if (existingCheckbox) {
        existingCheckbox.remove();
    }

    const selectAllCell = document.createElement('th');
    selectAllCell.className = 'select-all-cell';
    selectAllCell.style.width = '50px';
    selectAllCell.innerHTML = `
        <input type="checkbox" id="selectAllStudents" onchange="selectAllStudents()">
    `;

    // İlk sıraya ekle
    headerRow.insertBefore(selectAllCell, headerRow.firstChild);
}

function createStudentRowWithCheckbox(student) {
    const initials = (student.ogr_ad?.charAt(0) || '') + (student.ogr_soyad?.charAt(0) || '');

    // Belge tamamlanma oranını hesapla
    const belgeler = [
        student.ogr_gerek_foto,
        student.ogr_gerek_diploma,
        student.ogr_gerek_kimlik,
        student.ogr_gerek_yakakarti,
        student.ogr_gerek_saglik,
        student.ogr_gerek_ikamet
    ];
    const tamamlanan = belgeler.filter(b => b === 1).length;
    const completionPercentage = Math.round((tamamlanan / belgeler.length) * 100);

    // Sınav durumu
    let examDisplay = '';
    if (student.ogr_sinav_puan !== null && student.ogr_sinav_puan !== undefined) {
        const passed = student.ogr_sinav_puan >= 60;
        examDisplay = `
            <div class="exam-score">
                <span class="score-value ${passed ? 'passed' : 'failed'}">${student.ogr_sinav_puan}</span>
                <i class="fas fa-${passed ? 'check' : 'times'}-circle pass-icon ${passed ? 'passed' : 'failed'}"></i>
            </div>
        `;
    } else {
        examDisplay = `
            <div class="exam-score">
                <span class="score-value not-taken">Belirtilmedi</span>
                <i class="fas fa-clock pass-icon not-taken"></i>
            </div>
        `;
    }

    // Ödeme durumu
    const paymentStatus = student.ogr_odeme > 0 ? 'paid' : 'unpaid';
    const paymentText = student.ogr_odeme > 0 ? 'Ödendi' : 'Bekliyor';

    const row = document.createElement('tr');
    row.dataset.studentId = student.id;
    row.style.borderBottom = '1px solid #f3f4f6';

    row.innerHTML = `
        <td style="padding: 12px; width: 50px;">
            <input type="checkbox" class="student-checkbox" value="${student.id}" onchange="updateBulkActionButtons()">
        </td>
        <td style="padding: 12px;">
            <div class="student-info">
                <div class="student-avatar">${initials}</div>
                <div class="student-details">
                    <h4>${student.ogr_ad || ''} ${student.ogr_soyad || ''}</h4>
                    <p>Baba Adı: ${student.ogr_baba_ad || '-'}</p>
                </div>
            </div>
        </td>
        <td style="padding: 12px;">
            <div>${student.ogr_TC || '-'}</div>
            <div style="font-size: 12px; color: #6b7280;">${student.ogr_ceptel || '-'}</div>
        </td>
        <td style="padding: 12px;">
            <span class="status-badge ${(student.ogr_durum || 'aktif').toLowerCase()}">${student.ogr_durum || 'Aktif'}</span>
        </td>
        <td style="padding: 12px;">
            <div class="document-status">
                ${createDocumentIcon('foto', student.ogr_gerek_foto, student.id)}
                ${createDocumentIcon('diploma', student.ogr_gerek_diploma, student.id)}
                ${createDocumentIcon('kimlik', student.ogr_gerek_kimlik, student.id)}
                ${createDocumentIcon('yakakarti', student.ogr_gerek_yakakarti, student.id)}
                ${createDocumentIcon('saglik', student.ogr_gerek_saglik, student.id)}
                ${createDocumentIcon('ikamet', student.ogr_gerek_ikamet, student.id)}
            </div>
            <div class="completion-progress" style="margin-top: 8px;">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${completionPercentage}%"></div>
                </div>
                <span class="progress-text">${completionPercentage}%</span>
            </div>
        </td>
        <td style="padding: 12px;">${examDisplay}</td>
        <td style="padding: 12px;">
            <div class="payment-info">
                <div class="payment-amount ${paymentStatus}">${student.ogr_odeme || 0}₺</div>
                <div class="payment-status" style="color: ${paymentStatus === 'paid' ? '#16a34a' : '#dc2626'};">${paymentText}</div>
            </div>
        </td>
        <td style="padding: 12px;">${formatDate(student.ogr_kayit_tarihi)}</td>
        <td style="padding: 12px;">
            <div class="table-actions">
                <button class="action-btn view" onclick="viewStudentDetails(${student.id})" title="Görüntüle">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="editStudentDetails(${student.id})" title="Düzenle">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn" onclick="duplicateStudent(${student.id})" title="Kopyala" style="color: #f59e0b;">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="action-btn delete" onclick="deleteStudentConfirm(${student.id})" title="Sil">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </td>
    `;

    return row;
}

// Toplu işlem butonları göster/gizle
function selectAllStudents() {
    const checkboxes = document.querySelectorAll('.student-checkbox');
    const selectAllCheckbox = document.getElementById('selectAllStudents');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });

    updateBulkActionButtons();
}

function updateBulkActionButtons() {
    const selectedCount = document.querySelectorAll('.student-checkbox:checked').length;
    let bulkActions = document.getElementById('bulkActions');

    if (selectedCount > 0) {
        if (!bulkActions) {
            createBulkActionToolbar();
            bulkActions = document.getElementById('bulkActions');
        }
        bulkActions.style.display = 'flex';
        document.getElementById('selectedCount').textContent = selectedCount;
    } else if (bulkActions) {
        bulkActions.style.display = 'none';
    }
}

function createBulkActionToolbar() {
    const studentsSection = document.querySelector('.students-section');
    const filtersSection = document.querySelector('.students-filters');

    if (!studentsSection || !filtersSection) return;

    const bulkActionsHTML = `
        <div id="bulkActions" style="display: none; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin: 16px 0; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-check-square" style="color: #16a34a;"></i>
                <span style="font-weight: 600; color: #166534;"><span id="selectedCount">0</span> öğrenci seçildi</span>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary" onclick="openBulkEditModal()" style="font-size: 13px; padding: 6px 12px;">
                    <i class="fas fa-edit"></i> Toplu Düzenle
                </button>
                <button class="btn btn-secondary" onclick="bulkExportStudents()" style="font-size: 13px; padding: 6px 12px;">
                    <i class="fas fa-download"></i> Dışa Aktar
                </button>
                <button class="btn" style="background: #dc2626; color: white; font-size: 13px; padding: 6px 12px;" onclick="bulkDeleteStudents()">
                    <i class="fas fa-trash"></i> Sil
                </button>
                <button class="btn btn-secondary" onclick="clearSelection()" style="font-size: 13px; padding: 6px 12px;">
                    <i class="fas fa-times"></i> Temizle
                </button>
            </div>
        </div>
    `;

    filtersSection.insertAdjacentHTML('afterend', bulkActionsHTML);
}

function clearSelection() {
    document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('selectAllStudents').checked = false;
    updateBulkActionButtons();
}

function bulkDeleteStudents() {
    const selectedStudents = Array.from(document.querySelectorAll('.student-checkbox:checked'))
        .map(cb => parseInt(cb.value));

    if (selectedStudents.length === 0) return;

    if (confirm(`${selectedStudents.length} öğrenciyi silmek istediğinizden emin misiniz?`)) {
        Promise.all(selectedStudents.map(id => window.db.deleteOgrenci(id)))
            .then(async () => {
                showNotification(`${selectedStudents.length} öğrenci silindi`, 'success');

                // Hem listeyi hem dönem bilgilerini yenile
                await loadTermStudents(appState.currentTermId);
                await refreshTermInfo(appState.currentTermId);

                clearSelection();
            })
            .catch(error => {
                showNotification('Silme işlemi sırasında hata oluştu', 'error');
            });
    }
}

// Ödemeleri yenile
window.refreshPayments = function () {
    loadPayments();
    showNotification('Ödemeler yenilendi', 'success');
};

function bulkExportStudents() {
    const selectedStudents = Array.from(document.querySelectorAll('.student-checkbox:checked'))
        .map(cb => parseInt(cb.value));

    if (selectedStudents.length === 0) return;

    // Seçili öğrencileri CSV olarak dışa aktar
    exportSelectedStudentsToCSV(selectedStudents);
}

// Öğrenci kopyalama fonksiyonu
window.duplicateStudent = async function (studentId) {
    try {
        const student = await window.db.getOgrenciById(studentId);
        if (!student) {
            showNotification('Öğrenci bulunamadı', 'error');
            return;
        }

        // Kopyalama için yeni öğrenci modalını aç
        openAddStudentModal(student.ogr_donem);

        // Modal açıldıktan sonra form'u doldur
        setTimeout(() => {
            fillDuplicateForm(student);
        }, 500);

    } catch (error) {
        console.error('⚠️ Öğrenci kopyalama hatası:', error);
        showNotification('Öğrenci kopyalanırken hata oluştu', 'error');
    }
};

function fillDuplicateForm(student) {
    const form = document.getElementById('studentForm');
    if (!form) return;

    // Temel bilgileri kopyala
    const fields = [
        'ogr_turu', 'ogr_baba_ad', 'ogr_anne_ad', 'ogr_dogum_yeri',
        'ogr_ogrenim_durumu', 'ogr_kan_grubu', 'ogr_adres',
        'ogr_rapor_tarih_no', 'ogr_silah_durum'
    ];

    fields.forEach(field => {
        const input = form.querySelector(`[name="${field}"]`);
        if (input && student[field]) {
            input.value = student[field];
        }
    });

    // Adı "Kopya" ekleyerek kopyala
    const adInput = form.querySelector('[name="ogr_ad"]');
    if (adInput && student.ogr_ad) {
        adInput.value = student.ogr_ad + ' (Kopya)';
    }

    const soyadInput = form.querySelector('[name="ogr_soyad"]');
    if (soyadInput && student.ogr_soyad) {
        soyadInput.value = student.ogr_soyad;
    }

    // TC'yi temizle (benzersiz olmalı)
    const tcInput = form.querySelector('[name="ogr_TC"]');
    if (tcInput) {
        tcInput.value = '';
        tcInput.focus();
    }

    showNotification('Öğrenci bilgileri kopyalandı. TC Kimlik numarasını güncelleyin.', 'info');
}

// =============================================================================
// ÖĞRENCİ MODAL FONKSİYONLARI
// =============================================================================

function openAddStudentModal(termId) {
    if (!termId) {
        showNotification('Dönem bilgisi bulunamadı', 'error');
        return;
    }

    console.log('📝 Gelişmiş öğrenci ekleme modalı açılıyor:', termId);

    // Modal HTML'ini oluştur ve ekle
    const modalHTML = createAdvancedStudentModalHTML(termId);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    // Event listener'ları ekle
    setupAdvancedStudentModalEvents();

    // Dönem bilgilerini doldur
    fillTermInfoInModal(termId);

    // ÖNEMLİ: Dönem türüne göre eğitim türünü ayarla
    updateEducationTypeByTermType();

    // Flatpickr'ı başlat
    setTimeout(() => {
        initializeStudentBirthDatePicker();

        // İlk input'a focus
        const firstInput = document.querySelector('#addStudentModal input[name="ogr_ad"]');
        if (firstInput) firstInput.focus();
    }, 300);
}

function updateEducationTypeByTermType() {
    // Mevcut dönem bilgisini al
    const currentTermId = appState?.currentTermId;
    if (!currentTermId) return;

    // Dönem bilgilerini termsData'dan bul
    const term = termsData?.find(t => t.id == currentTermId);
    if (!term) return;

    console.log('🔄 Dönem türü:', term.donem_turu);

    // Modal içindeki eğitim türü select'ini bul
    const turSelect = document.querySelector('#addStudentModal select[name="ogr_turu"]') ||
        document.querySelector('#editStudentModal select[name="ogr_turu"]') ||
        document.querySelector('select[name="ogr_turu"]');

    if (!turSelect) {
        console.log('⚠️ Eğitim türü select elementi bulunamadı');
        return;
    }

    if (term.donem_turu === 'Yenileme') {
        // Yenileme döneminde sadece "Yenileme Eğitimi" seçeneği
        turSelect.innerHTML = `
            <option value="Yenileme" selected>Yenileme Eğitimi</option>
        `;
        turSelect.disabled = true;
        turSelect.style.background = '#f3f4f6';
        turSelect.style.color = '#6b7280';

        // Zorunluluk işaretini kaldır
        const label = turSelect.closest('.form-group')?.querySelector('label');
        if (label && label.innerHTML.includes(' *')) {
            label.innerHTML = label.innerHTML.replace(' *', ' (Otomatik)');
            label.style.color = '#16a34a';
        }

        console.log('✅ Eğitim türü yenileme olarak ayarlandı');

    } else if (term.donem_turu === 'Temel') {
        // Temel dönemde normal seçenekler
        turSelect.innerHTML = `
            <option value="">Seçiniz...</option>
            <option value="Temel" selected>Temel Eğitim</option>
            <option value="Silah Fark">Silah Fark Eğitimi</option>
        `;
        turSelect.disabled = false;
        turSelect.style.background = '';
        turSelect.style.color = '';

        // Zorunluluk işaretini geri ekle
        const label = turSelect.closest('.form-group')?.querySelector('label');
        if (label && !label.innerHTML.includes(' *')) {
            label.innerHTML = label.innerHTML.replace(' (Otomatik)', ' *');
            label.style.color = '';
        }

    } else {
        // Diğer durumlar için tüm seçenekler
        turSelect.innerHTML = `
            <option value="">Seçiniz...</option>
            <option value="Temel">Temel Eğitim</option>
            <option value="Yenileme">Yenileme Eğitimi</option>
            <option value="Silah Fark">Silah Fark Eğitimi</option>
        `;
        turSelect.disabled = false;
        turSelect.style.background = '';
        turSelect.style.color = '';

        // Zorunluluk işaretini geri ekle
        const label = turSelect.closest('.form-group')?.querySelector('label');
        if (label && !label.innerHTML.includes(' *')) {
            label.innerHTML = label.innerHTML.replace(' (Otomatik)', ' *');
            label.style.color = '';
        }
    }
}


function createAdvancedStudentModalHTML(termId) {
    return `
        <div class="modal-overlay active" id="addStudentModal">
            <div class="modal-container" style="max-width: 900px;">
                <div class="modal-header">
                    <h2>
                        <i class="fas fa-user-plus"></i>
                        Yeni Öğrenci Ekle
                    </h2>
                    <button class="modal-close" onclick="closeStudentModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="modal-body">
                    <form id="studentForm">
                        <input type="hidden" name="ogr_donem" value="${termId}">
                        <input type="hidden" name="ogr_durum" value="Aktif">
                        <input type="hidden" name="ogr_kayit_tarihi" value="${new Date().toISOString().split('T')[0]}">

                        <!-- Kişisel Bilgiler -->
                        <div class="form-section">
                            <h3 class="section-title-form">
                                <i class="fas fa-user"></i> Kişisel Bilgiler
                            </h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Ad *</label>
                                    <input type="text" class="form-input" name="ogr_ad" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Soyad *</label>
                                    <input type="text" class="form-input" name="ogr_soyad" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">TC Kimlik No *</label>
                                    <input type="text" class="form-input" name="ogr_TC" pattern="[0-9]{11}" maxlength="11" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Eğitim Türü *</label>
                                    <select class="form-select" name="ogr_turu" required>
                                        <option value="">Seçiniz...</option>
                                        <option value="Temel">Temel Eğitim</option>
                                        <option value="Yenileme">Yenileme Eğitimi</option>
                                        <option value="Silah Fark">Silah Fark Eğitimi</option>
                                    </select>
                                </div>
                            </div>
                            <!-- YENİ EKLENEN KURS ÜCRETİ BÖLÜMÜ -->
<div class="form-row">
    <div class="form-group">
        <label class="form-label">Kurs Ücreti *</label>
        <div style="position: relative;">
            <input type="number" 
                   class="form-input" 
                   name="ogr_odeme" 
                   placeholder="0.00"
                   min="0" 
                   step="0.01" 
                   required
                   style="padding-right: 40px;">
            <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #6b7280; font-weight: 500;">₺</span>
        </div>
        <small style="color: #6b7280; font-size: 12px; margin-top: 4px; display: block;">
            Bu öğrencinin kurs için ödeyeceği toplam tutar
        </small>
    </div>
    <div class="form-group">
        <label class="form-label">İlk Ödeme (Opsiyonel)</label>
        <div style="position: relative;">
            <input type="number" 
                   class="form-input" 
                   name="ilk_odeme" 
                   placeholder="0.00"
                   min="0" 
                   step="0.01"
                   style="padding-right: 40px;">
            <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #6b7280; font-weight: 500;">₺</span>
        </div>
        <small style="color: #6b7280; font-size: 12px; margin-top: 4px; display: block;">
            Kayıt sırasında alınan ödeme (varsa)
        </small>
    </div>
</div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Baba Adı</label>
                                    <input type="text" class="form-input" name="ogr_baba_ad">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Anne Adı</label>
                                    <input type="text" class="form-input" name="ogr_anne_ad">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Doğum Yeri</label>
                                    <input type="text" class="form-input" name="ogr_dogum_yeri">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Doğum Tarihi</label>
                                    <input type="text" class="form-input" id="studentBirthDate" name="ogr_dogum_tarihi" placeholder="Gün/Ay/Yıl" readonly>
                                </div>
                            </div>
                            
                            <!-- İletişim Bilgileri -->
                            <h3 class="section-title-form" style="margin-top: 24px;">
                                <i class="fas fa-phone"></i> İletişim Bilgileri
                            </h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Cep Telefonu *</label>
                                    <input type="tel" class="form-input" name="ogr_ceptel" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Yedek Telefon</label>
                                    <input type="tel" class="form-input" name="ogr_yedek_ceptel">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">E-posta</label>
                                    <input type="email" class="form-input" name="ogr_mail">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Kan Grubu</label>
                                    <select class="form-select" name="ogr_kan_grubu">
                                        <option value="">Seçiniz...</option>
                                        <option value="A Rh+">A Rh+</option>
                                        <option value="A Rh-">A Rh-</option>
                                        <option value="B Rh+">B Rh+</option>
                                        <option value="B Rh-">B Rh-</option>
                                        <option value="AB Rh+">AB Rh+</option>
                                        <option value="AB Rh-">AB Rh-</option>
                                        <option value="0 Rh+">0 Rh+</option>
                                        <option value="0 Rh-">0 Rh-</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group" style="grid-column: 1 / -1;">
                                    <label class="form-label">Adres</label>
                                    <textarea class="form-input" name="ogr_adres" rows="3" style="resize: vertical;"></textarea>
                                </div>
                            </div>

                            <!-- Diğer Bilgiler -->
                            <h3 class="section-title-form" style="margin-top: 24px;">
                                <i class="fas fa-clipboard-list"></i> Diğer Bilgiler
                            </h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Öğrenim Durumu</label>
                                    <select class="form-select" name="ogr_ogrenim_durumu">
                                        <option value="">Seçiniz...</option>
                                        <option value="İlkokul">İlkokul</option>
                                        <option value="Ortaokul">Ortaokul</option>
                                        <option value="Lise">Lise</option>
                                        <option value="Üniversite">Üniversite</option>
                                        <option value="Yüksek Lisans">Yüksek Lisans</option>
                                        <option value="Doktora">Doktora</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Rapor Tarih No</label>
                                    <input type="text" class="form-input" name="ogr_rapor_tarih_no">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Silah Durumu</label>
                                    <select class="form-select" name="ogr_silah_durum">
    <option value="">Seçiniz...</option>
    <option value="Silahlı">🛡️ Silahlı</option>
    <option value="Silahsız">👤 Silahsız</option>
</select>
                                </div>
                                <!--div class="form-group">
                                    <label class="form-label">Ödeme (₺)</label>
                                    <input type="number" class="form-input" name="ogr_odeme" min="0" step="0.01">
                                </div-->
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sınav Puanı (0-100)</label>
                                    <input type="number" class="form-input" name="ogr_sinav_puan" min="0" max="100" onkeyup="calculateExamResult(this)">
                                    <div id="examResult" style="display: none; margin-top: 8px;"></div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Notlar</label>
                                    <textarea class="form-input" name="ogr_not" rows="2" style="resize: vertical;" placeholder="Öğrenci hakkında ek notlar..."></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- Gerekli Belgeler -->
                        <div class="form-section">
                            <h3 class="section-title-form">
                                <i class="fas fa-file-alt"></i> Gerekli Belgeler
                            </h3>
                            <div class="documents-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                                <div class="doc-check-item" onclick="toggleDocumentCheck(this, 'ogr_gerek_foto')">
                                    <div class="doc-checkbox">
                                        <i class="fas fa-check" style="display: none;"></i>
                                    </div>
                                    <div class="doc-check-label">
                                        <i class="fas fa-camera doc-check-icon"></i>
                                        Fotoğraf
                                    </div>
                                    <input type="hidden" name="ogr_gerek_foto" value="0">
                                </div>
                                <div class="doc-check-item" onclick="toggleDocumentCheck(this, 'ogr_gerek_diploma')">
                                    <div class="doc-checkbox">
                                        <i class="fas fa-check" style="display: none;"></i>
                                    </div>
                                    <div class="doc-check-label">
                                        <i class="fas fa-graduation-cap doc-check-icon"></i>
                                        Diploma
                                    </div>
                                    <input type="hidden" name="ogr_gerek_diploma" value="0">
                                </div>
                                <div class="doc-check-item" onclick="toggleDocumentCheck(this, 'ogr_gerek_kimlik')">
                                    <div class="doc-checkbox">
                                        <i class="fas fa-check" style="display: none;"></i>
                                    </div>
                                    <div class="doc-check-label">
                                        <i class="fas fa-id-card doc-check-icon"></i>
                                        Kimlik
                                    </div>
                                    <input type="hidden" name="ogr_gerek_kimlik" value="0">
                                </div>
                                <div class="doc-check-item" onclick="toggleDocumentCheck(this, 'ogr_gerek_yakakarti')">
                                    <div class="doc-checkbox">
                                        <i class="fas fa-check" style="display: none;"></i>
                                    </div>
                                    <div class="doc-check-label">
                                        <i class="fas fa-id-badge doc-check-icon"></i>
                                        Yaka Kartı
                                    </div>
                                    <input type="hidden" name="ogr_gerek_yakakarti" value="0">
                                </div>
                                <div class="doc-check-item" onclick="toggleDocumentCheck(this, 'ogr_gerek_saglik')">
                                    <div class="doc-checkbox">
                                        <i class="fas fa-check" style="display: none;"></i>
                                    </div>
                                    <div class="doc-check-label">
                                        <i class="fas fa-heartbeat doc-check-icon"></i>
                                        Sağlık Raporu
                                    </div>
                                    <input type="hidden" name="ogr_gerek_saglik" value="0">
                                </div>
                                <div class="doc-check-item" onclick="toggleDocumentCheck(this, 'ogr_gerek_ikamet')">
                                    <div class="doc-checkbox">
                                        <i class="fas fa-check" style="display: none;"></i>
                                    </div>
                                    <div class="doc-check-label">
                                        <i class="fas fa-home doc-check-icon"></i>
                                        İkamet Belgesi
                                    </div>
                                    <input type="hidden" name="ogr_gerek_ikamet" value="0">
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeStudentModal()">
                        <i class="fas fa-times"></i>
                        İptal
                    </button>
                    <button type="submit" form="studentForm" class="btn btn-primary" id="saveStudentBtn">
                        <i class="fas fa-save"></i>
                        Öğrenci Ekle
                    </button>
                </div>
            </div>
        </div>
    `;
}

function setupAdvancedStudentModalEvents() {
    const form = document.getElementById('studentForm');
    if (form) {
        form.addEventListener('submit', handleStudentFormSubmit);
    }

    // ESC tuşu ile modal kapatma
    const handleEscape = function (e) {
        if (e.key === 'Escape') {
            closeStudentModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    // Modal overlay tıklama ile kapatma
    const modal = document.getElementById('addStudentModal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeStudentModal();
            }
        });
    }
}

function closeStudentModal() {
    const modal = document.getElementById('addStudentModal');
    if (modal) {
        // Flatpickr temizle
        const birthDateInput = document.getElementById('studentBirthDate');
        if (birthDateInput && birthDateInput._flatpickr) {
            birthDateInput._flatpickr.destroy();
        }

        modal.remove();
        document.body.style.overflow = '';
    }
}

// =============================================================================
// TERM ACTION FUNCTIONS - DÜZELTİLDİ
// =============================================================================

window.viewTerm = function (termId) {
    console.log('🔍 ViewTerm çağrıldı:', termId);

    // appState'i güncelle
    if (!window.appState) {
        window.appState = {};
    }
    window.appState.currentTermId = termId;

    switchPage('term-detail', termId);
};

window.editTerm = function (termId) {
    console.log('✏️ EditTerm çağrıldı:', termId);
    openEditTermModal(termId);
    setTimeout(() => {
        initializeEditTermModal();
    }, 100);
};

window.deleteTerm = async function (termId) {
    const term = termsData.find(t => t.id === termId);
    if (term && confirm(`${term.donem_turu} (Dönem No: ${term.donem_numara}) dönemini silmek istediğinizden emin misiniz?`)) {
        try {
            await deleteTermFromDatabase(termId);
            showNotification('Dönem başarıyla silindi', 'success');
            renderTerms();
        } catch (error) {
            showNotification('Dönem silinirken hata oluştu', 'error');
        }
    }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function calculateTermStatus(startDate, endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    if (today < start) {
        return 'Yaklaşan';
    } else if (today >= start && today <= end) {
        return 'Aktif';
    } else if (today > end) {
        return 'Tamamlandı';
    }

    return 'Yaklaşan';
}

function formatDate(dateString) {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        return date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

function getStatusColor(status) {
    const colors = {
        'Aktif': '#16a34a',
        'Yaklaşan': '#2563eb',
        'Tamamlandı': '#6b7280',
        'İptal': '#dc2626'
    };
    return colors[status] || '#6b7280';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    let iconClass = 'info-circle';
    if (type === 'success') iconClass = 'check-circle';
    if (type === 'error') iconClass = 'exclamation-circle';
    if (type === 'warning') iconClass = 'exclamation-triangle';

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-left: 4px solid ${type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#2563eb'};
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        min-width: 320px;
        max-width: 400px;
    `;

    notification.innerHTML = `
        <i class="fas fa-${iconClass}" style="color: ${type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#2563eb'}; font-size: 18px;"></i>
        <span style="flex: 1; font-weight: 500; color: #111827; font-size: 14px;">${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px; border-radius: 4px;">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// =============================================================================
// DATABASE FUNCTIONS - TEMEL
// =============================================================================

async function loadTermsFromDatabase() {
    try {
        console.log('📊 Veritabanından dönem verileri yükleniyor...');

        const dbTerms = await window.db.getDonemler();

        if (dbTerms && dbTerms.error) {
            console.error('❌ Veritabanı hatası:', dbTerms.error);
            showNotification('Dönem verileri yüklenirken hata oluştu', 'error');
            return;
        }

        if (dbTerms && Array.isArray(dbTerms)) {
            termsData = dbTerms.map(term => ({
                id: term.id,
                donem_numara: term.donem_numara,
                donem_turu: term.donem_turu,
                donem_durum: term.donem_durum,
                donem_ogr_adedi: term.donem_ogr_adedi,
                donem_baslangic_t: term.donem_baslangic_t,
                donem_bitis_t: term.donem_bitis_t
            }));

            window.termsData = termsData;

            console.log(`✅ ${termsData.length} dönem verisi yüklendi`);

            // Eğer dönemler sayfasındaysak, tabloyu güncelle
            if (appState.activeTab === 'terms') {
                renderTerms();
            }

            // Dashboard istatistiklerini güncelle
            updateDashboardStats();
        } else {
            console.warn('⚠️ Veritabanından veri dönemedi');
            termsData = [];
        }

    } catch (error) {
        console.error('❌ Dönem verileri yüklenirken hata:', error);
        showNotification('Veritabanı bağlantısı başarısız', 'error');
        termsData = [];
    }
}

async function deleteTermFromDatabase(termId) {
    try {
        const query = 'DELETE FROM donemler WHERE id = ?';
        const result = await window.db.runQuery(query, [termId]);

        if (result && result.error) {
            throw new Error(result.error);
        }

        // Verileri yeniden yükle
        await loadTermsFromDatabase();

    } catch (error) {
        console.error('❌ Dönem silinirken hata:', error);
        throw error;
    }
}

// =============================================================================
// SIDEBAR FUNCTIONS
// =============================================================================

function toggleSidebar() {
    appState.sidebarCollapsed = !appState.sidebarCollapsed;
    sidebar.classList.toggle('collapsed', appState.sidebarCollapsed);

    // Update collapse button icon
    const icon = collapseBtn.querySelector('i');
    if (appState.sidebarCollapsed) {
        icon.className = 'fas fa-chevron-right';
    } else {
        icon.className = 'fas fa-chevron-left';
    }
}

// =============================================================================
// TERMS FUNCTIONS
// =============================================================================

function renderTerms() {
    let filteredTerms = [...termsData];

    // Apply status filter
    if (appState.currentStatusFilter !== 'all') {
        filteredTerms = filteredTerms.filter(term => term.donem_durum === appState.currentStatusFilter);
    }

    // Apply type filter
    if (appState.currentTypeFilter !== 'all') {
        filteredTerms = filteredTerms.filter(term => term.donem_turu === appState.currentTypeFilter);
    }

    // Apply search filter
    if (appState.currentSearch) {
        filteredTerms = filteredTerms.filter(term =>
            term.donem_numara.toString().includes(appState.currentSearch) ||
            term.donem_turu.toLowerCase().includes(appState.currentSearch.toLowerCase()) ||
            term.donem_durum.toLowerCase().includes(appState.currentSearch.toLowerCase())
        );
    }

    // Apply sorting
    filteredTerms = sortTerms(filteredTerms, appState.currentSort);

    // Clear existing content
    if (termsTableBody) {
        termsTableBody.innerHTML = '';

        // Render terms
        filteredTerms.forEach(term => {
            const row = createTermRow(term);
            termsTableBody.appendChild(row);
        });

        // Show message if no terms
        if (filteredTerms.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="7" style="text-align: center; padding: 48px; color: #6b7280;">
                    <i class="fas fa-calendar-alt" style="font-size: 48px; margin-bottom: 16px; color: #d1d5db; display: block;"></i>
                    <strong>Dönem bulunamadı</strong><br>
                    ${appState.currentSearch ? 'Arama kriterlerinize uygun dönem yok.' : 'Bu kategoride henüz dönem bulunmuyor.'}
                </td>
            `;
            termsTableBody.appendChild(emptyRow);
        }
    }
}

function sortTerms(terms, sortType) {
    return terms.sort((a, b) => {
        switch (sortType) {
            case 'date_newest':
                return new Date(b.donem_baslangic_t) - new Date(a.donem_baslangic_t);
            case 'date_oldest':
                return new Date(a.donem_baslangic_t) - new Date(b.donem_baslangic_t);
            case 'students_desc':
                return b.donem_ogr_adedi - a.donem_ogr_adedi;
            case 'students_asc':
                return a.donem_ogr_adedi - b.donem_ogr_adedi;
            case 'term_number_desc':
                return b.donem_numara - a.donem_numara;
            case 'term_number_asc':
                return a.donem_numara - b.donem_numara;
            default:
                return 0;
        }
    });
}

function createTermRow(term) {
    // Gerçek zamanlı durum hesaplama
    const currentStatus = calculateTermStatus(term.donem_baslangic_t, term.donem_bitis_t);

    const row = document.createElement('tr');
    row.innerHTML = `
        <td><strong>${term.donem_numara}</strong></td>
        <td>
            <span class="term-type-icon" data-type="${term.donem_turu}">
                ${term.donem_turu}
            </span>
        </td>
        <td>
            <span class="status-badge ${currentStatus.toLowerCase()}" style="background-color: ${getStatusColor(currentStatus)}20; color: ${getStatusColor(currentStatus)}; border: 1px solid ${getStatusColor(currentStatus)}40;">
                ${currentStatus}
            </span>
        </td>
        <td>
            <div style="display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-users" style="color: #6b7280; font-size: 12px;"></i>
                <strong>${term.donem_ogr_adedi}</strong>
            </div>
        </td>
        <td>${formatDate(term.donem_baslangic_t)}</td>
        <td>${formatDate(term.donem_bitis_t)}</td>
        <td>
            <div class="table-actions">
                <button class="action-btn view" onclick="viewTerm(${term.id})" title="İncele">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="editTerm(${term.id})" title="Düzenle">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteTerm(${term.id})" title="Sil">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </td>
    `;
    return row;
}

function applyFilter(filterValue, filterType) {
    // Update app state
    if (filterType === 'status') {
        appState.currentStatusFilter = filterValue;
    } else if (filterType === 'type') {
        appState.currentTypeFilter = filterValue;
    }

    // Update active filter tabs
    if (filterTabs) {
        filterTabs.forEach(tab => {
            if (tab.dataset.type === filterType) {
                tab.classList.remove('active');
                if (tab.dataset.filter === filterValue) {
                    tab.classList.add('active');
                }
            }
        });
    }

    // Re-render terms
    renderTerms();
}

function applySorting(sortType) {
    appState.currentSort = sortType;
    renderTerms();
}

function applySearch(searchQuery) {
    appState.currentSearch = searchQuery;

    // Show/hide clear button
    const clearBtn = document.getElementById('clearSearch');
    if (clearBtn) {
        if (searchQuery) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }
    }

    renderTerms();
}

function clearSearchInput() {
    const searchInput = document.getElementById('termsSearchInput');
    if (searchInput) {
        searchInput.value = '';
        applySearch('');
    }
}

// =============================================================================
// DASHBOARD FUNCTIONS
// =============================================================================

function updateDashboardStats() {
    if (termsData.length === 0) return;

    try {
        const activeTerms = termsData.filter(term => term.donem_durum === 'Aktif').length;
        const activeTermsElement = document.querySelector('.stat-card:nth-child(2) .stat-value');
        if (activeTermsElement) {
            activeTermsElement.textContent = activeTerms;
        }

        const totalStudents = termsData
            .filter(term => term.donem_durum === 'Aktif')
            .reduce((sum, term) => sum + term.donem_ogr_adedi, 0);

        const totalStudentsElement = document.querySelector('.stat-card:first-child .stat-value');
        if (totalStudentsElement) {
            totalStudentsElement.textContent = totalStudents;
        }

        const upcomingTerms = termsData.filter(term => term.donem_durum === 'Yaklaşan').length;
        const upcomingTermsElement = document.querySelector('.stat-card:nth-child(3) .stat-value');
        if (upcomingTermsElement) {
            upcomingTermsElement.textContent = upcomingTerms;
        }

        console.log('✅ Dashboard istatistikleri güncellendi');
    } catch (error) {
        console.error('❌ Dashboard istatistikleri güncellenirken hata:', error);
    }
}

// =============================================================================
// SEARCH FUNCTIONALITY
// =============================================================================

function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const termsSearch = document.getElementById('termsSearchInput');
    const clearBtn = document.getElementById('clearSearch');

    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            const query = e.target.value.toLowerCase();
            if (appState.activeTab === 'terms') {
                applySearch(query);
            }
        });
    }

    if (termsSearch) {
        termsSearch.addEventListener('input', function (e) {
            const query = e.target.value;
            applySearch(query);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearSearchInput);
    }
}

// =============================================================================
// STUDENT ACTION PLACEHOLDER FUNCTIONS
// =============================================================================

window.viewStudent = function (studentId) {
    console.log('👁️ Öğrenci görüntüleniyor:', studentId);
    showNotification('Öğrenci detay sayfası yakında gelecek', 'info');
};

window.editStudent = function (studentId) {
    console.log('✏️ Öğrenci düzenleniyor:', studentId);
    showNotification('Öğrenci düzenleme modalı yakında gelecek', 'info');
};

window.deleteStudent = async function (studentId) {
    if (confirm('Bu öğrenciyi silmek istediğinizden emin misiniz?')) {
        try {
            // Öğrenciyi sil
            const result = await window.db.deleteOgrenci(studentId);

            if (result && !result.error) {
                showNotification('Öğrenci başarıyla silindi', 'success');

                // Hem öğrenci listesini hem de dönem bilgilerini yenile
                await loadTermStudents(appState.currentTermId);
                await refreshTermInfo(appState.currentTermId); // Bu fonksiyonu ekleyin

            } else {
                showNotification('Silme işlemi başarısız', 'error');
            }
        } catch (error) {
            console.error('Silme hatası:', error);
            showNotification('Bir hata oluştu', 'error');
        }
    }
};

// =============================================================================
// MODAL FUNCTIONS - DÖNEM EKLE/DÜZENLE - TAM FONKSİYONALİTE
// =============================================================================

function addNewTerm() {
    console.log('➕ Yeni dönem ekleme modalı açılıyor...');
    openAddTermModal();
}

function openAddTermModal() {
    addTermModalElement = document.getElementById('addTermModal');
    addTermFormElement = document.getElementById('addTermForm');

    if (addTermModalElement) {
        // Modal başlığını güncelle
        const modalTitle = addTermModalElement.querySelector('.modal-header h2');
        if (modalTitle) {
            modalTitle.innerHTML = `
                <i class="fas fa-plus-circle"></i>
                Yeni Dönem Ekle
            `;
        }

        // Form'u ekleme moduna al
        setupFormForAdd();

        // Modal'ı göster
        addTermModalElement.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Form'u temizle
        resetAddTermForm();

        setTimeout(() => {
            const firstInput = addTermFormElement.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 300);

        setupModalEvents();
    }
}

function openEditTermModal(termId) {
    const term = termsData.find(t => t.id === termId);
    if (!term) {
        showNotification('Dönem bulunamadı', 'error');
        return;
    }

    addTermModalElement = document.getElementById('addTermModal');
    addTermFormElement = document.getElementById('addTermForm');

    if (addTermModalElement) {
        // Modal başlığını güncelle
        const modalTitle = addTermModalElement.querySelector('.modal-header h2');
        if (modalTitle) {
            modalTitle.innerHTML = `
                <i class="fas fa-edit"></i>
                Dönem Düzenle
            `;
        }

        // Form'u düzenleme moduna al
        setupFormForEdit(term);

        // Modal'ı göster
        addTermModalElement.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Form'u term verileriyle doldur
        fillFormWithTermData(term);

        setupModalEvents();
    }
}

function setupFormForAdd() {
    const saveBtn = document.getElementById('saveTermBtn');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Dönem Ekle';
        saveBtn.onclick = null;
    }

    if (addTermFormElement) {
        addTermFormElement.dataset.mode = 'add';
        delete addTermFormElement.dataset.termId;
    }
}

function setupFormForEdit(term) {
    const saveBtn = document.getElementById('saveTermBtn');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Değişiklikleri Kaydet';
        saveBtn.onclick = null;
    }

    if (addTermFormElement) {
        addTermFormElement.dataset.mode = 'edit';
        addTermFormElement.dataset.termId = term.id;
    }
}

function fillFormWithTermData(term) {
    document.getElementById('termNumber').value = term.donem_numara;
    document.getElementById('termType').value = term.donem_turu;

    // Flatpickr input'larını doldur
    document.getElementById('startDate').value = formatDateForInput(term.donem_baslangic_t);
    document.getElementById('endDate').value = formatDateForInput(term.donem_bitis_t);

    // Flatpickr instance'larını güncelle
    setTimeout(() => {
        const startPicker = document.getElementById('startDate')._flatpickr;
        const endPicker = document.getElementById('endDate')._flatpickr;

        if (startPicker) {
            startPicker.setDate(formatDateForInput(term.donem_baslangic_t));
        }
        if (endPicker) {
            endPicker.setDate(formatDateForInput(term.donem_bitis_t));
        }
    }, 100);

    // Öğrenci sayısını göster ama disable et
    const studentCountInput = document.getElementById('studentCount');
    if (studentCountInput) {
        studentCountInput.value = term.donem_ogr_adedi;
        studentCountInput.disabled = true;
    }

    // Durum bilgisini göster
    showCurrentStatus(term);
}

function showCurrentStatus(term) {
    const currentStatus = calculateTermStatus(term.donem_baslangic_t, term.donem_bitis_t);

    // Eğer form info alanı varsa, mevcut durumu göster
    const formInfo = document.querySelector('.form-info');
    if (formInfo) {
        formInfo.innerHTML = `
            <div class="info-item">
                <i class="fas fa-info-circle"></i>
                <span>Mevcut Durum: <strong style="color: ${getStatusColor(currentStatus)}">${currentStatus}</strong></span>
            </div>
            <div class="info-item">
                <i class="fas fa-users"></i>
                <span>Kayıtlı Öğrenci Sayısı: <strong>${term.donem_ogr_adedi}</strong></span>
            </div>
            <div class="info-item">
                <i class="fas fa-lightbulb"></i>
                <span>Dönem durumu tarihlere göre otomatik hesaplanır</span>
            </div>
        `;
    }
}

function setupModalEvents() {
    if (addTermFormElement) {
        addTermFormElement.addEventListener('submit', handleTermSubmit);
    }

    document.addEventListener('keydown', handleModalEscape);
    if (addTermModalElement) {
        addTermModalElement.addEventListener('click', handleModalOverlayClick);
    }
}

function closeAddTermModal() {
    if (addTermModalElement) {
        addTermModalElement.classList.remove('active');
        document.body.style.overflow = '';

        // Event listener'ları temizle
        if (addTermFormElement) {
            addTermFormElement.removeEventListener('submit', handleTermSubmit);
        }
        document.removeEventListener('keydown', handleModalEscape);
        if (addTermModalElement) {
            addTermModalElement.removeEventListener('click', handleModalOverlayClick);
        }

        // Form mode ve ID bilgilerini temizle
        if (addTermFormElement) {
            delete addTermFormElement.dataset.mode;
            delete addTermFormElement.dataset.termId;
        }

        setTimeout(() => {
            resetAddTermForm();
        }, 300);
    }
}

function resetAddTermForm() {
    if (addTermFormElement) {
        addTermFormElement.reset();

        // Hata stillerini temizle
        const inputs = addTermFormElement.querySelectorAll('.form-input, .form-select');
        inputs.forEach(input => {
            input.classList.remove('error', 'valid');
            input.disabled = false;
        });

        // Flatpickr'ları temizle ve bugünün tarihini ayarla
        setTimeout(() => {
            const startPicker = document.getElementById('startDate')._flatpickr;
            const endPicker = document.getElementById('endDate')._flatpickr;

            if (startPicker) {
                startPicker.clear();
                startPicker.setDate(new Date());
            }

            if (endPicker) {
                endPicker.clear();
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 30);
                endPicker.setDate(futureDate);
            }
        }, 100);

        // Öğrenci sayısını gizle (sadece düzenlemede görünür)
        const studentCountGroup = document.getElementById('studentCount')?.closest('.form-group');
        if (studentCountGroup) {
            studentCountGroup.style.display = 'none';
        }

        // Form info'yu güncelle
        const formInfo = document.querySelector('.form-info');
        if (formInfo) {
            formInfo.innerHTML = `
                <div class="info-item">
                    <i class="fas fa-lightbulb"></i>
                    <span>Dönem durumu tarihlere göre otomatik hesaplanacak</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-users"></i>
                    <span>Öğrenci sayısı dönem içine kayıt yapıldıkça artacak</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-info-circle"></i>
                    <span>Aynı dönem numarasında farklı türde eğitimler açabilirsiniz</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Dönem numarası + tür kombinasyonu benzersiz olmalıdır</span>
                </div>
            `;
        }
    }
}

// =============================================================================
// FORM VALIDATION VE SUBMISSION
// =============================================================================

function validateTermForm() {
    if (!addTermFormElement) return ['Form bulunamadı'];

    const formData = new FormData(addTermFormElement);
    const errors = [];
    const isEditMode = addTermFormElement.dataset.mode === 'edit';
    const editingTermId = addTermFormElement.dataset.termId;

    // Dönem numarası kontrolü
    const termNumber = formData.get('donem_numara');
    if (!termNumber || termNumber < 1) {
        errors.push('Geçerli bir dönem numarası girin');
        markFieldAsError('termNumber');
    } else {
        // Dönem türü kontrolü
        const termType = formData.get('donem_turu');
        if (!termType) {
            errors.push('Dönem türü seçin');
            markFieldAsError('termType');
        } else {
            // DÖNEM NUMARASI + TÜR KOMBİNASYONU benzersizlik kontrolü
            const existingTerm = termsData.find(term =>
                term.donem_numara == termNumber &&
                term.donem_turu === termType &&
                (!isEditMode || term.id != editingTermId)
            );

            if (existingTerm) {
                errors.push(`Dönem ${termNumber} için ${termType} eğitimi zaten mevcut`);
                markFieldAsError('termNumber');
                markFieldAsError('termType');
            }
        }
    }

    // Tarih kontrolü - Flatpickr formatında
    const startDateStr = document.getElementById('startDate').value;
    const endDateStr = document.getElementById('endDate').value;

    if (!startDateStr) {
        errors.push('Başlangıç tarihi seçin');
        markFieldAsError('startDate');
    }

    if (!endDateStr) {
        errors.push('Bitiş tarihi seçin');
        markFieldAsError('endDate');
    }

    if (startDateStr && endDateStr) {
        const startDate = new Date(formatDateForDatabase(startDateStr));
        const endDate = new Date(formatDateForDatabase(endDateStr));
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (endDate <= startDate) {
            errors.push('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
            markFieldAsError('endDate');
        }

        // Geçmiş tarih kontrolü (sadece yeni dönemler için)
        if (!isEditMode && startDate < today) {
            errors.push('Başlangıç tarihi bugünden önce olamaz');
            markFieldAsError('startDate');
        }

        // Dönem süresi kontrolü
        const daysDifference = (endDate - startDate) / (1000 * 60 * 60 * 24);

        if (daysDifference < 7) {
            errors.push('Dönem süresi en az 7 gün olmalıdır');
            markFieldAsError('endDate');
        }

        if (daysDifference > 365) {
            errors.push('Dönem süresi 1 yıldan uzun olamaz');
            markFieldAsError('endDate');
        }
    }

    return errors;
}

function markFieldAsError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('error');
        setTimeout(() => {
            field.classList.remove('error');
        }, 3000);
    }
}

async function handleTermSubmit(e) {
    e.preventDefault();

    // Validasyon
    const errors = validateTermForm();
    if (errors.length > 0) {
        showNotification(errors.join(', '), 'error');
        return;
    }

    // Loading state
    const saveBtn = document.getElementById('saveTermBtn');
    if (!saveBtn) return;

    const originalText = saveBtn.innerHTML;
    saveBtn.classList.add('loading');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';

    try {
        const formData = new FormData(addTermFormElement);
        const isEditMode = addTermFormElement.dataset.mode === 'edit';

        // Flatpickr tarih değerlerini al ve veritabanı formatına çevir
        const startDateInput = document.getElementById('startDate').value;
        const endDateInput = document.getElementById('endDate').value;

        const startDate = formatDateForDatabase(startDateInput);
        const endDate = formatDateForDatabase(endDateInput);

        const calculatedStatus = calculateTermStatus(startDate, endDate);

        const termData = {
            donem_numara: parseInt(formData.get('donem_numara')),
            donem_turu: formData.get('donem_turu'),
            donem_durum: calculatedStatus,
            donem_ogr_adedi: isEditMode ?
                parseInt(document.getElementById('studentCount').value) : 0,
            donem_baslangic_t: startDate,
            donem_bitis_t: endDate
        };

        if (isEditMode) {
            const termId = addTermFormElement.dataset.termId;
            await updateTermInDatabase(termId, termData);
            showNotification(`Dönem başarıyla güncellendi (Durum: ${calculatedStatus})`, 'success');
        } else {
            await addNewTermToDatabase(termData);
            showNotification(`Yeni dönem eklendi (Durum: ${calculatedStatus})`, 'success');
        }

        // Başarı animasyonu
        showSuccessAnimation();

        // Modal'ı kapat
        setTimeout(() => {
            closeAddTermModal();
        }, 1500);

    } catch (error) {
        console.error('❌ Dönem işlemi hatası:', error);
        showNotification('İşlem sırasında bir hata oluştu', 'error');
    } finally {
        saveBtn.classList.remove('loading');
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

// Doğum tarihi validasyonu
function validateBirthDate(dateStr) {
    if (!dateStr) return { valid: true }; // Opsiyonel alan

    const today = new Date();
    const birthDate = new Date(formatDateForDatabase(dateStr));

    // Geçerli tarih kontrolü
    if (isNaN(birthDate.getTime())) {
        return { valid: false, message: 'Geçerli bir doğum tarihi girin' };
    }

    // Gelecek tarih kontrolü
    if (birthDate > today) {
        return { valid: false, message: 'Doğum tarihi gelecekte olamaz' };
    }

    // Yaş kontrolü (minimum 18, maksimum 100)
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    let calculatedAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        calculatedAge--;
    }

    if (calculatedAge < 18) {
        return { valid: false, message: 'Öğrenci en az 18 yaşında olmalıdır' };
    }

    if (calculatedAge > 100) {
        return { valid: false, message: 'Geçerli bir doğum tarihi girin (maksimum 100 yaş)' };
    }

    return { valid: true, age: calculatedAge };
}

// Form validasyonuna doğum tarihi kontrolü ekle
function validateStudentForm() {
    const errors = [];

    // Mevcut validasyonlar...

    // Doğum tarihi validasyonu
    const birthDateInput = document.getElementById('studentBirthDate') || document.getElementById('editStudentBirthDate');
    if (birthDateInput && birthDateInput.value) {
        const birthDateValidation = validateBirthDate(birthDateInput.value);
        if (!birthDateValidation.valid) {
            errors.push(birthDateValidation.message);
            birthDateInput.classList.add('error');
        }
    }

    return errors;
}

// 12. CLEANUP FONKSİYONLARI

// Modal kapatılırken Flatpickr instance'larını temizle
function cleanupStudentDatePickers() {
    const birthDateInput = document.getElementById('studentBirthDate');
    const editBirthDateInput = document.getElementById('editStudentBirthDate');

    if (birthDateInput && birthDateInput._flatpickr) {
        birthDateInput._flatpickr.destroy();
    }

    if (editBirthDateInput && editBirthDateInput._flatpickr) {
        editBirthDateInput._flatpickr.destroy();
    }
}

// closeStudentModal ve closeEditStudentModal fonksiyonlarına cleanup ekle
function closeStudentModal() {
    cleanupStudentDatePickers();

    const modal = document.getElementById('addStudentModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

function closeEditStudentModal() {
    console.log('🔄 Edit student modal kapatılıyor...');

    const modal = document.getElementById('editStudentModal');
    if (modal) {
        // Flatpickr temizle
        const birthDateInput = document.getElementById('editStudentBirthDate');
        if (birthDateInput && birthDateInput._flatpickr) {
            console.log('🧹 Edit modal Flatpickr temizleniyor...');
            birthDateInput._flatpickr.destroy();
        }

        modal.remove();
        document.body.style.overflow = '';
        window.currentEditingStudent = null;

        console.log('✅ Edit student modal kapatıldı');
    }
}

// 13. DEBUGGİNG VE TEST FONKSİYONLARI

// Test fonksiyonu - geliştirme sırasında kullanmak için
function testStudentDatePicker() {
    console.log('🧪 Öğrenci doğum tarihi picker test ediliyor...');

    // Test verileri
    const testDates = [
        '15.03.1990',
        '01.01.2000',
        '25.12.1985'
    ];

    testDates.forEach(date => {
        const validation = validateBirthDate(date);
        console.log(`Tarih: ${date}, Geçerli: ${validation.valid}, Yaş: ${validation.age || 'N/A'}`);
    });

    console.log('✅ Test tamamlandı');
}


function showSuccessAnimation() {
    if (!addTermModalElement) return;

    const successElement = document.createElement('div');
    successElement.className = 'form-success';
    successElement.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(22, 163, 74, 0.9);
        color: white;
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        opacity: 0;
        animation: successPulse 2s ease-in-out;
        z-index: 10001;
    `;

    successElement.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 24px; margin-bottom: 8px;"></i>
        <br>
        <strong>Başarılı!</strong><br>
        İşlem tamamlandı
    `;

    // CSS animasyon tanımla
    const style = document.createElement('style');
    style.textContent = `
        @keyframes successPulse {
            0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
    `;
    document.head.appendChild(style);

    addTermModalElement.appendChild(successElement);

    setTimeout(() => {
        successElement.remove();
        style.remove();
    }, 2000);
}

function handleModalEscape(e) {
    if (e.key === 'Escape') {
        closeAddTermModal();
    }
}

function handleModalOverlayClick(e) {
    if (e.target === addTermModalElement) {
        closeAddTermModal();
    }
}

// =============================================================================
// DATABASE FUNCTIONS - DÖNEM EKLE/GÜNCELLE
// =============================================================================

async function addNewTermToDatabase(termData) {
    try {
        const query = `
            INSERT INTO donemler (donem_numara, donem_turu, donem_durum, donem_ogr_adedi, donem_baslangic_t, donem_bitis_t)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const params = [
            termData.donem_numara,
            termData.donem_turu,
            termData.donem_durum,
            termData.donem_ogr_adedi,
            termData.donem_baslangic_t,
            termData.donem_bitis_t
        ];

        const result = await window.db.runQuery(query, params);

        if (result && result.error) {
            throw new Error(result.error);
        }

        // Verileri yeniden yükle
        await loadTermsFromDatabase();

    } catch (error) {
        console.error('❌ Dönem eklenirken hata:', error);
        throw error;
    }
}

async function updateTermInDatabase(termId, termData) {
    try {
        const query = `
            UPDATE donemler 
            SET donem_numara = ?, donem_turu = ?, donem_durum = ?, 
                donem_ogr_adedi = ?, donem_baslangic_t = ?, donem_bitis_t = ?
            WHERE id = ?
        `;

        const params = [
            termData.donem_numara,
            termData.donem_turu,
            termData.donem_durum,
            termData.donem_ogr_adedi,
            termData.donem_baslangic_t,
            termData.donem_bitis_t,
            termId
        ];

        const result = await window.db.runQuery(query, params);

        if (result && result.error) {
            throw new Error(result.error);
        }

        // Verileri yeniden yükle
        await loadTermsFromDatabase();

    } catch (error) {
        console.error('❌ Dönem güncellenirken hata:', error);
        throw error;
    }
}

// =============================================================================
// DATE UTILITY FUNCTIONS
// =============================================================================

function isValidDateString(dateValue) {
    return dateValue &&
        dateValue !== null &&
        dateValue !== undefined &&
        dateValue !== 'null' &&
        dateValue !== 'undefined' &&
        typeof dateValue === 'string' &&
        dateValue.trim() !== '';
}

// Flatpickr formatını veritabanı formatına çevir
function formatDateForDatabase(dateStr) {
    if (!isValidDateString(dateStr)) return null;

    try {
        const cleanDateStr = dateStr.trim();

        // "dd.mm.yyyy" formatından "yyyy-mm-dd" formatına çevir
        const parts = cleanDateStr.split('.');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

            // Geçerli tarih kontrolü
            const testDate = new Date(formattedDate);
            if (testDate.getFullYear() == year &&
                testDate.getMonth() == (month - 1) &&
                testDate.getDate() == day) {
                return formattedDate;
            }
        }
    } catch (error) {
        console.warn('Tarih formatlama hatası:', error);
    }

    return null;
}


// Veritabanı formatını Flatpickr formatına çevir
function formatDateForInput(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
}

// =============================================================================
// EVENT LISTENERS - BASIT VE TEMİZ
// =============================================================================

document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 Basitleştirilmiş Güvenlik Okulu Sistemi başlatılıyor...');

    // Sidebar collapse button
    if (collapseBtn) {
        collapseBtn.addEventListener('click', toggleSidebar);
    }

    // Navigation links - Basitleştirilmiş
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const pageId = this.dataset.page;
            console.log('📄 Sayfa değişimi:', pageId);
            switchPage(pageId);
        });
    });

    // Filter tabs
    if (filterTabs) {
        filterTabs.forEach(tab => {
            tab.addEventListener('click', function () {
                const filter = this.dataset.filter;
                const filterType = this.dataset.type;
                applyFilter(filter, filterType);
            });
        });
    }

    // Sort select
    if (sortSelect) {
        sortSelect.addEventListener('change', function () {
            applySorting(this.value);
        });
    }

    // "Yeni Dönem" butonuna event listener ekle
    const addTermButton = document.querySelector('[onclick="addNewTerm()"]');
    if (addTermButton) {
        addTermButton.removeAttribute('onclick');
        addTermButton.addEventListener('click', addNewTerm);
    }

    // Initialize search
    initializeSearch();

    // Veritabanından dönem verilerini yükle
    if (typeof window.db !== 'undefined') {
        await loadTermsFromDatabase();
        console.log('✅ Veritabanı verileri yüklendi');
    } else {
        console.warn('⚠️ Veritabanı bağlantısı bulunamadı');
    }


    updateNotificationBadgeOnLoad();
    console.log('✨ Sistem başarıyla başlatıldı - Scroll problemi çözüldü!');
});

// =============================================================================
// KEYBOARD SHORTCUTS - BASİTLEŞTİRİLDİ
// =============================================================================

document.addEventListener('keydown', function (e) {
    // ESC tuşu ile modal kapatma
    if (e.key === 'Escape') {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            closeAddStudentModal();
            closeAddTermModal();
        }
    }

    // Input aktifken kısayolları devre dışı bırak
    const activeElement = document.activeElement;
    const isInputActive = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT'
    );

    if (isInputActive) return;

    // Number keys for quick navigation
    if (e.key >= '1' && e.key <= '6') {
        const modal = document.querySelector('.modal-overlay');
        if (modal) return; // Modal açıkken navigasyon yapma

        e.preventDefault();
        const pages = ['dashboard', 'students', 'terms', 'payments', 'courses', 'settings'];
        const pageIndex = parseInt(e.key) - 1;
        if (pages[pageIndex]) {
            switchPage(pages[pageIndex]);
        }
    }
});

// =============================================================================
// WINDOW RESIZE HANDLER
// =============================================================================

window.addEventListener('resize', function () {
    if (window.innerWidth <= 768) {
        if (!appState.sidebarCollapsed) {
            toggleSidebar();
        }
    }
});

// =============================================================================
// FORM VALIDATION SETUP
// =============================================================================

function setupDateValidation() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    if (startDateInput && endDateInput) {
        startDateInput.lang = 'tr-TR';
        endDateInput.lang = 'tr-TR';

        startDateInput.addEventListener('change', function () {
            endDateInput.min = this.value;
            if (endDateInput.value && new Date(endDateInput.value) <= new Date(this.value)) {
                endDateInput.value = '';
            }
            showStatusPreview();
        });

        endDateInput.addEventListener('change', function () {
            if (startDateInput.value && new Date(this.value) <= new Date(startDateInput.value)) {
                this.value = '';
                showNotification('Bitiş tarihi başlangıç tarihinden sonra olmalıdır', 'warning');
            }
            showStatusPreview();
        });
    }
}

function setupTermNumberValidation() {
    const termNumberInput = document.getElementById('termNumber');

    if (termNumberInput) {
        termNumberInput.addEventListener('blur', function () {
            validateTermNumber(this);
        });

        termNumberInput.addEventListener('input', function () {
            if (this.value && !isNaN(this.value) && this.value > 0) {
                setTimeout(() => {
                    validateTermNumber(this);
                }, 300);
            }
        });
    }
}

function validateTermNumber(input) {
    const termNumber = parseInt(input.value);
    const isEditMode = addTermFormElement && addTermFormElement.dataset.mode === 'edit';
    const editingTermId = addTermFormElement && addTermFormElement.dataset.termId;

    const termTypeSelect = document.getElementById('termType');
    const termType = termTypeSelect ? termTypeSelect.value : '';

    if (termNumber && termsData.length > 0) {
        const existingTerm = termsData.find(term =>
            term.donem_numara === termNumber &&
            term.donem_turu === termType &&
            (!isEditMode || term.id != editingTermId)
        );

        if (existingTerm && termType) {
            input.classList.add('error');
            input.classList.remove('valid');
            showNotification(`Dönem ${termNumber} için ${termType} eğitimi zaten mevcut`, 'warning');
        } else if (termType) {
            input.classList.remove('error');
            input.classList.add('valid');

            const otherTypeTerms = termsData.filter(term =>
                term.donem_numara === termNumber &&
                term.donem_turu !== termType &&
                (!isEditMode || term.id != editingTermId)
            );

            if (otherTypeTerms.length > 0) {
                const otherTypes = otherTypeTerms.map(t => t.donem_turu).join(', ');
                showNotification(`Dönem ${termNumber} için zaten ${otherTypes} eğitimi mevcut`, 'info');
            }
        }
    }
}

function showStatusPreview() {
    const startDateInput = document.getElementById('startDate').value;
    const endDateInput = document.getElementById('endDate').value;
    const formInfo = document.querySelector('.form-info');

    if (startDateInput && endDateInput && formInfo) {
        const startDate = formatDateForDatabase(startDateInput);
        const endDate = formatDateForDatabase(endDateInput);

        const predictedStatus = calculateTermStatus(startDate, endDate);

        let previewElement = formInfo.querySelector('.auto-status-indicator');
        if (!previewElement) {
            previewElement = document.createElement('div');
            previewElement.className = 'auto-status-indicator';
            previewElement.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 12px;
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border: 1px solid #bbf7d0;
                border-radius: 8px;
                font-size: 13px;
                color: #166534;
                margin-top: 8px;
            `;
            formInfo.appendChild(previewElement);
        }

        previewElement.innerHTML = `
            <i class="fas fa-magic"></i>
            <span>Hesaplanan durum: <strong style="color: ${getStatusColor(predictedStatus)}">${predictedStatus}</strong></span>
        `;
    }
}

function initializeAddTermModal() {
    setupDateValidation();
    setupTermNumberValidation();
    setupTermTypeValidation();
}

function initializeEditTermModal() {
    setupDateValidation();
    setupTermNumberValidation();
    setupTermTypeValidation();

    const studentCountGroup = document.getElementById('studentCount')?.closest('.form-group');
    if (studentCountGroup) {
        studentCountGroup.style.display = 'block';
    }
}

function setupTermTypeValidation() {
    const termTypeSelect = document.getElementById('termType');
    const termNumberInput = document.getElementById('termNumber');

    if (termTypeSelect && termNumberInput) {
        termTypeSelect.addEventListener('change', function () {
            if (termNumberInput.value) {
                validateTermNumber(termNumberInput);
            }
        });
    }
}

console.log('🔧 Basitleştirilmiş ve optimize edilmiş sistem yüklendi!');

// =============================================================================
// GELİŞMİŞ ÖĞRENCİ YÖNETİMİ - ÇALIŞAN FONKSİYONLAR
// =============================================================================

// Global değişkenler
let currentStudents = [];
let studentFilters = {
    search: '',
    status: 'all',
    documents: 'all',
    exam: 'all'
};

// =============================================================================
// ÖĞRENCİ MODAL YÖNETİMİ
// =============================================================================

function createStudentModalHTML(termId) {
    return `
        <div class="modal-overlay active" id="addStudentModal">
            <div class="modal-container" style="max-width: 900px;">
                <div class="modal-header">
                    <h2>
                        <i class="fas fa-user-plus"></i>
                        Yeni Öğrenci Ekle
                    </h2>
                    <button class="modal-close" onclick="closeStudentModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="modal-body">
                    <form id="studentForm">
                        <input type="hidden" name="ogr_donem" value="${termId}">
                        <input type="hidden" name="ogr_durum" value="Aktif">
                        <input type="hidden" name="ogr_kayit_tarihi" value="${new Date().toISOString().split('T')[0]}">

                        <!-- Kişisel Bilgiler -->
                        <div class="form-section">
                            <h3 class="section-title-form">
                                <i class="fas fa-user"></i> Kişisel Bilgiler
                            </h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Ad *</label>
                                    <input type="text" class="form-input" name="ogr_ad" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Soyad *</label>
                                    <input type="text" class="form-input" name="ogr_soyad" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">TC Kimlik No *</label>
                                    <input type="text" class="form-input" name="ogr_TC" pattern="[0-9]{11}" maxlength="11" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Eğitim Türü *</label>
                                    <select class="form-select" name="ogr_turu" required>
                                        <option value="">Seçiniz...</option>
                                        <option value="Temel">Temel Eğitim</option>
                                        <option value="Yenileme">Yenileme Eğitimi</option>
                                        <option value="Silah Fark">Silah Fark Eğitimi</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Baba Adı</label>
                                    <input type="text" class="form-input" name="ogr_baba_ad">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Anne Adı</label>
                                    <input type="text" class="form-input" name="ogr_anne_ad">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Doğum Yeri</label>
                                    <input type="text" class="form-input" name="ogr_dogum_yeri">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Doğum Tarihi</label>
                                    <!-- FLATPICKR İLE DEĞİŞTİRİLDİ -->
                                    <input type="text" class="form-input" id="studentBirthDate" name="ogr_dogum_tarihi" placeholder="Gün/Ay/Yıl" readonly>
                                </div>
                            </div>
                            
                            <!-- İletişim Bilgileri -->
                            <h3 class="section-title-form" style="margin-top: 24px;">
                                <i class="fas fa-phone"></i> İletişim Bilgileri
                            </h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Cep Telefonu</label>
                                    <input type="tel" class="form-input" name="ogr_ceptel">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Yedek Telefon</label>
                                    <input type="tel" class="form-input" name="ogr_yedek_ceptel">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">E-posta</label>
                                    <input type="email" class="form-input" name="ogr_mail">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Kan Grubu</label>
                                    <select class="form-select" name="ogr_kan_grubu">
                                        <option value="">Seçiniz...</option>
                                        <option value="A Rh+">A Rh+</option>
                                        <option value="A Rh-">A Rh-</option>
                                        <option value="B Rh+">B Rh+</option>
                                        <option value="B Rh-">B Rh-</option>
                                        <option value="AB Rh+">AB Rh+</option>
                                        <option value="AB Rh-">AB Rh-</option>
                                        <option value="0 Rh+">0 Rh+</option>
                                        <option value="0 Rh-">0 Rh-</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group" style="grid-column: 1 / -1;">
                                    <label class="form-label">Adres</label>
                                    <textarea class="form-input" name="ogr_adres" rows="3" style="resize: vertical;"></textarea>
                                </div>
                            </div>

                            <!-- Diğer Bilgiler -->
                            <h3 class="section-title-form" style="margin-top: 24px;">
                                <i class="fas fa-clipboard-list"></i> Diğer Bilgiler
                            </h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Öğrenim Durumu</label>
                                    <select class="form-select" name="ogr_ogrenim_durumu">
                                        <option value="">Seçiniz...</option>
                                        <option value="İlkokul">İlkokul</option>
                                        <option value="Ortaokul">Ortaokul</option>
                                        <option value="Lise">Lise</option>
                                        <option value="Üniversite">Üniversite</option>
                                        <option value="Yüksek Lisans">Yüksek Lisans</option>
                                        <option value="Doktora">Doktora</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Rapor Tarih No</label>
                                    <input type="text" class="form-input" name="ogr_rapor_tarih_no">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Silah Durumu</label>
                                    <select class="form-select" name="ogr_silah_durum">
    <option value="">Seçiniz...</option>
    <option value="Silahlı">🛡️ Silahlı</option>
    <option value="Silahsız">👤 Silahsız</option>
</select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Ödeme (₺)</label>
                                    <input type="number" class="form-input" name="ogr_odeme" min="0" step="0.01">
                                </div>
                            </div>
                        </div>

                        <!-- Gerekli Belgeler -->
                        <div class="form-section">
                            <h3 class="section-title-form">
                                <i class="fas fa-file-alt"></i> Gerekli Belgeler
                            </h3>
                            <div class="documents-grid">
                                <div class="doc-check-item" onclick="toggleDocumentCheck(this)">
                                    <div class="doc-checkbox">
                                        <i class="fas fa-check" style="display: none;"></i>
                                    </div>
                                    <div class="doc-check-label">
                                        <i class="fas fa-camera doc-check-icon"></i>
                                        Fotoğraf
                                    </div>
                                    <input type="hidden" name="ogr_gerek_foto" value="0">
                                </div>
                                <div class="doc-check-item" onclick="toggleDocumentCheck(this)">
                                    <div class="doc-checkbox">
                                        <i class="fas fa-check" style="display: none;"></i>
                                    </div>
                                    <div class="doc-check-label">
                                        <i class="fas fa-graduation-cap doc-check-icon"></i>
                                        Diploma
                                    </div>
                                    <input type="hidden" name="ogr_gerek_diploma" value="0">
                                </div>
                                <div class="doc-check-item" onclick="toggleDocumentCheck(this)">
                                    <div class="doc-checkbox">
                                        <i class="fas fa-check" style="display: none;"></i>
                                    </div>
                                    <div class="doc-check-label">
                                        <i class="fas fa-id-card doc-check-icon"></i>
                                        Kimlik
                                    </div>
                                    <input type="hidden" name="ogr_gerek_kimlik" value="0">
                                </div>
                                <div class="doc-check-item" onclick="toggleDocumentCheck(this)">
                                    <div class="doc-checkbox">
                                        <i class="fas fa-check" style="display: none;"></i>
                                    </div>
                                    <div class="doc-check-label">
                                        <i class="fas fa-id-badge doc-check-icon"></i>
                                        Yaka Kartı
                                    </div>
                                    <input type="hidden" name="ogr_gerek_yakakarti" value="0">
                                </div>
                                <div class="doc-check-item" onclick="toggleDocumentCheck(this)">
                                    <div class="doc-checkbox">
                                        <i class="fas fa-check" style="display: none;"></i>
                                    </div>
                                    <div class="doc-check-label">
                                        <i class="fas fa-heartbeat doc-check-icon"></i>
                                        Sağlık Raporu
                                    </div>
                                    <input type="hidden" name="ogr_gerek_saglik" value="0">
                                </div>
                                <div class="doc-check-item" onclick="toggleDocumentCheck(this)">
                                    <div class="doc-checkbox">
                                        <i class="fas fa-check" style="display: none;"></i>
                                    </div>
                                    <div class="doc-check-label">
                                        <i class="fas fa-home doc-check-icon"></i>
                                        İkamet Belgesi
                                    </div>
                                    <input type="hidden" name="ogr_gerek_ikamet" value="0">
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeStudentModal()">
                        <i class="fas fa-times"></i>
                        İptal
                    </button>
                    <button type="submit" form="studentForm" class="btn btn-primary">
                        <i class="fas fa-save"></i>
                        Öğrenci Ekle
                    </button>
                </div>
            </div>
        </div>
    `;
}

function closeStudentModal() {
    console.log('🔄 Add student modal kapatılıyor...');

    const modal = document.getElementById('addStudentModal');
    if (modal) {
        // Flatpickr temizle
        const birthDateInput = document.getElementById('studentBirthDate');
        if (birthDateInput && birthDateInput._flatpickr) {
            console.log('🧹 Add modal Flatpickr temizleniyor...');
            birthDateInput._flatpickr.destroy();
        }

        modal.remove();
        document.body.style.overflow = '';

        console.log('✅ Add student modal kapatıldı');
    }
}

// Öğrenci doğum tarihi için özel Flatpickr konfigürasyonu
const studentBirthDateConfig = {
    locale: "tr",
    dateFormat: "d.m.Y",
    allowInput: false,
    clickOpens: true,
    disableMobile: false,
    monthSelectorType: "dropdown",
    yearSelectorType: "dropdown",
    showMonths: 1,
    animate: true,
    theme: "material_green",
    // Doğum tarihi için geçmiş tarihler seçilebilir
    maxDate: "today", // Bugünden sonraki tarihler seçilemez
    // En eski tarih (100 yaş)
    minDate: new Date(new Date().getFullYear() - 100, 0, 1),
    // Başlangıç yılı (daha hızlı seçim için)
    defaultDate: new Date(new Date().getFullYear() - 30, 0, 1),
    onReady: function (selectedDates, dateStr, instance) {
        instance.input.placeholder = "Gün/Ay/Yıl";
    }
};

// Öğrenci ekleme modalı için Flatpickr başlatma
function initializeStudentBirthDatePicker() {
    console.log('🔧 Student birth date picker başlatılıyor...');

    const birthDateInput = document.getElementById('studentBirthDate');
    if (!birthDateInput) {
        console.warn('⚠️ studentBirthDate input bulunamadı');
        return null;
    }

    if (birthDateInput._flatpickr) {
        console.log('🔄 Mevcut flatpickr temizleniyor...');
        birthDateInput._flatpickr.destroy();
    }

    try {
        const picker = flatpickr(birthDateInput, {
            ...studentBirthDateConfig,
            appendTo: document.body,
            onReady: function (selectedDates, dateStr, instance) {
                console.log('✅ Student Flatpickr hazır');
            }
        });

        console.log('✅ Student birth date picker başarıyla oluşturuldu');
        return picker;
    } catch (error) {
        console.error('❌ Student Flatpickr oluşturma hatası:', error);
        return null;
    }
}
// Öğrenci düzenleme modalı için Flatpickr başlatma
function initializeEditStudentBirthDatePicker(existingDate = null) {
    console.log('🔧 Edit student birth date picker başlatılıyor, mevcut tarih:', existingDate, typeof existingDate);

    const birthDateInput = document.getElementById('editStudentBirthDate');
    if (!birthDateInput) {
        console.warn('⚠️ editStudentBirthDate input bulunamadı');
        return null;
    }

    if (birthDateInput._flatpickr) {
        console.log('🔄 Mevcut flatpickr temizleniyor...');
        birthDateInput._flatpickr.destroy();
    }

    const config = { ...studentBirthDateConfig };

    // Mevcut tarih varsa güvenli şekilde ayarla
    if (isValidDateString(existingDate)) {
        try {
            console.log('📅 Mevcut tarih işleniyor:', existingDate);

            // Database formatından (YYYY-MM-DD) Flatpickr formatına çevir
            const dateParts = existingDate.trim().split('-');
            if (dateParts.length === 3) {
                const [year, month, day] = dateParts;
                const displayDate = `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
                config.defaultDate = displayDate;

                console.log('✅ Tarih başarıyla ayarlandı:', displayDate);
            }
        } catch (error) {
            console.warn('⚠️ Doğum tarihi ayarlama hatası:', error);
            // Hata durumunda default tarih kullan
            config.defaultDate = new Date(new Date().getFullYear() - 30, 0, 1);
        }
    } else {
        console.log('ℹ️ Mevcut tarih yok, default tarih kullanılacak');
        config.defaultDate = new Date(new Date().getFullYear() - 30, 0, 1);
    }

    try {
        const picker = flatpickr(birthDateInput, {
            ...config,
            appendTo: document.body,
            onReady: function (selectedDates, dateStr, instance) {
                console.log('✅ Flatpickr hazır, seçili tarih:', dateStr);
            },
            onChange: function (selectedDates, dateStr, instance) {
                console.log('📅 Tarih değişti:', dateStr);
            }
        });

        console.log('✅ Edit student birth date picker başarıyla oluşturuldu');
        return picker;
    } catch (error) {
        console.error('❌ Flatpickr oluşturma hatası:', error);
        return null;
    }
}

// =============================================================================
// FORM YÖNETİMİ VE VALİDASYON
// =============================================================================

function setupStudentModalEvents() {
    const form = document.getElementById('studentForm');
    if (form) {
        form.addEventListener('submit', handleStudentFormSubmit);
    }

    // ESC tuşu ile modal kapatma
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeStudentModal();
        }
    });

    // Modal overlay tıklama ile kapatma
    const modal = document.getElementById('addStudentModal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeStudentModal();
            }
        });
    }

    if (form) {
        // Flatpickr'ı başlat
        setTimeout(() => {
            initializeStudentBirthDatePicker();
        }, 100);

        // Form submit eventi
        form.addEventListener('submit', handleStudentSubmit);

        // Document toggle eventi
        document.querySelectorAll('.doc-check-item').forEach(item => {
            item.addEventListener('click', () => toggleDocumentCheck(item));
        });
    }
}

function toggleDocumentCheck(element, inputName) {
    const checkbox = element.querySelector('.doc-checkbox');
    const checkIcon = checkbox.querySelector('i');
    const hiddenInput = element.querySelector(`input[name="${inputName}"]`);

    const isChecked = checkbox.classList.contains('checked');

    if (isChecked) {
        checkbox.classList.remove('checked');
        checkIcon.style.display = 'none';
        hiddenInput.value = '0';
        element.classList.remove('completed');
    } else {
        checkbox.classList.add('checked');
        checkIcon.style.display = 'block';
        hiddenInput.value = '1';
        element.classList.add('completed');
    }
}

function calculateExamResult(input) {
    const score = parseInt(input.value);
    const resultDiv = document.getElementById('examResult');

    if (score >= 0 && score <= 100) {
        resultDiv.style.display = 'block';

        if (score >= 60) {
            resultDiv.className = 'score-result passed';
            resultDiv.innerHTML = '<i class="fas fa-check-circle"></i> GEÇTİ';
        } else {
            resultDiv.style.display = 'none';
        }
    }
}

async function validateTCNumber(input) {
    const tcNo = input.value;

    if (tcNo.length !== 11) {
        input.style.borderColor = '#dc2626';
        showNotification('TC Kimlik numarası 11 haneli olmalıdır', 'warning');
        return false;
    }

    // TC Kimlik numarası algoritması kontrolü
    if (!isValidTCNumber(tcNo)) {
        input.style.borderColor = '#dc2626';
        showNotification('Geçersiz TC Kimlik numarası', 'error');
        return false;
    }

    // Veritabanında aynı TC var mı kontrol et
    try {
        const termId = document.querySelector('input[name="ogr_donem"]').value;
        const isDuplicate = await window.db.checkDuplicateStudent(tcNo, termId);

        if (isDuplicate) {
            input.style.borderColor = '#dc2626';
            showNotification('Bu TC Kimlik numarası ile zaten bir öğrenci kayıtlı', 'error');
            return false;
        }
    } catch (error) {
        console.error('TC kontrol hatası:', error);
    }

    input.style.borderColor = '#16a34a';
    return true;
}

function isValidTCNumber(tc) {
    if (tc.length !== 11) return false;

    const digits = tc.split('').map(Number);

    // İlk hane 0 olamaz
    if (digits[0] === 0) return false;

    // 10. hane kontrolü
    const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
    const control10 = ((oddSum * 7) - evenSum) % 10;

    if (control10 !== digits[9]) return false;

    // 11. hane kontrolü
    const totalSum = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0);
    const control11 = totalSum % 10;

    if (control11 !== digits[10]) return false;

    return true;
}

// =============================================================================
// FORM SUBMIT VE VERİTABANI İŞLEMLERİ
// =============================================================================

async function handleStudentFormSubmit(e) {
    e.preventDefault();

    console.log('📝 Yeni öğrenci form submit başlıyor...');

    const form = e.target;
    const formData = new FormData(form);

    // Flatpickr tarihini güvenli şekilde database formatına çevir
    const birthDateInput = document.getElementById('studentBirthDate');
    let processedBirthDate = null;

    if (birthDateInput && isValidDateString(birthDateInput.value)) {
        const birthDateValue = birthDateInput.value.trim(); // "dd.mm.yyyy" formatında
        processedBirthDate = formatDateForDatabase(birthDateValue);

        console.log('📅 Yeni öğrenci doğum tarihi işlendi:', {
            input: birthDateValue,
            output: processedBirthDate
        });
    }

    // Form verilerini güvenli şekilde nesneye dönüştür
    const studentData = {};
    for (let [key, value] of formData.entries()) {
        if (key === 'ogr_dogum_tarihi') {
            studentData[key] = processedBirthDate;
        } else {
            // Diğer alanlar için güvenli dönüştürme
            studentData[key] = (value && typeof value === 'string' && value.trim() !== '') ? value.trim() : null;
        }
    }

    console.log('📊 Yeni öğrenci verisi:', studentData);

    // VALIDATION - TÜM KONTROLLER BURADA
    const errors = [];
    if (!studentData.ogr_ad) errors.push('Ad alanı zorunludur');
    if (!studentData.ogr_soyad) errors.push('Soyad alanı zorunludur');
    if (!studentData.ogr_TC) errors.push('TC Kimlik numarası zorunludur');

    // Kurs ücreti kontrolü
    /*if (!studentData.ogr_odeme || parseFloat(studentData.ogr_odeme) <= 0) {
        errors.push('Kurs ücreti zorunludur ve 0\'dan büyük olmalıdır');
    }*/

    // Dönem türü kontrolü ve otomatik düzeltme
    const currentTermId = appState?.currentTermId;
    const term = termsData?.find(t => t.id == currentTermId);

    if (term && term.donem_turu === 'Yenileme') {
        // Yenileme döneminde eğitim türünü otomatik ayarla
        studentData.ogr_turu = 'Yenileme';
        console.log('✅ Yenileme dönemi - Eğitim türü otomatik ayarlandı:', studentData.ogr_turu);
    } else if (!studentData.ogr_turu) {
        // Diğer dönemlerde eğitim türü zorunlu
        errors.push('Eğitim türü seçimi zorunludur');
    }

    // Eğer validasyon hatası varsa burada dur
    if (errors.length > 0) {
        showNotification(errors.join(', '), 'error');
        return;
    }

    // Loading durumu
    const submitBtn = document.getElementById('saveStudentBtn');
    if (submitBtn) {
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';

        try {
            // 1. ÖNCELİKLE ÖĞRENCİYİ KAYDET
            const result = await window.db.addOgrenciEnhanced(studentData);

            if (result && !result.error) {
                console.log('✅ Öğrenci kaydedildi, ID:', result.insertId);

                // 2. İLK ÖDEME VARSA KAYDET
                const ilkOdeme = parseFloat(studentData.ilk_odeme);
                if (ilkOdeme > 0) {
                    try {
                        const odemeData = {
                            ogr_id: result.insertId, // Yeni eklenen öğrencinin ID'si
                            odenen_tutar: ilkOdeme,
                            odeme_tarihi: new Date().toISOString().split('T')[0],
                            odeme_yontemi: 'nakit', // Varsayılan
                            durum: 'odendi',
                            notlar: 'Kayıt sırasında alınan ilk ödeme'
                        };

                        const paymentResult = await window.db.addOdeme(odemeData);
                        if (paymentResult && !paymentResult.error) {
                            console.log('✅ İlk ödeme kaydedildi:', ilkOdeme, '₺');
                        } else {
                            console.warn('⚠️ İlk ödeme kaydedilemedi:', paymentResult?.error);
                        }
                    } catch (paymentError) {
                        console.error('❌ İlk ödeme kaydetme hatası:', paymentError);
                        // Ödeme hatası öğrenci kaydını etkilemesin
                    }
                }

                // 3. BAŞARI MESAJI VE MODAL KAPAMA
                showNotification('Öğrenci başarıyla kaydedildi!', 'success');
                showStudentSuccessAnimation();

                // 1.5 saniye sonra modal'ı kapat ve listeyi yenile
                setTimeout(() => {
                    closeStudentModal();

                    // Eğer dönem detay sayfasındaysak, öğrenci listesini yenile
                    if (appState.activeTab === 'term-detail' && appState.currentTermId) {
                        loadTermStudents(appState.currentTermId);
                    }

                    // Dönem verilerini ve istatistikleri yenile
                    loadTermsFromDatabase();
                }, 1500);

            } else {
                throw new Error(result?.error || 'Bilinmeyen hata');
            }

        } catch (error) {
            console.error('❌ Öğrenci kaydetme hatası:', error);
            showNotification('Öğrenci kaydedilirken hata oluştu: ' + error.message, 'error');
        } finally {
            // Loading durumunu kapat
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

async function validateStudentForm(studentData) {
    const errors = [];

    // Zorunlu alanlar kontrolü
    if (!studentData.ogr_ad) errors.push('Ad alanı zorunludur');
    if (!studentData.ogr_soyad) errors.push('Soyad alanı zorunludur');
    if (!studentData.ogr_TC) errors.push('TC Kimlik numarası zorunludur');
    if (!studentData.ogr_ceptel) errors.push('Cep telefonu zorunludur');

    // EĞİTİM TÜRÜ KONTROLÜ - DÖNEM TÜRÜNE GÖRE
    const currentTermId = appState?.currentTermId;
    const term = termsData?.find(t => t.id == currentTermId);

    if (term && term.donem_turu === 'Yenileme') {
        // Yenileme döneminde eğitim türü otomatik "Yenileme" olmalı
        if (!studentData.ogr_turu || studentData.ogr_turu !== 'Yenileme') {
            studentData.ogr_turu = 'Yenileme'; // Otomatik düzelt
        }
    } else {
        // Diğer dönemlerde eğitim türü seçimi zorunlu
        if (!studentData.ogr_turu) {
            errors.push('Eğitim türü seçimi zorunludur');
        }
    }

    // TC Kimlik numarası kontrolü
    if (studentData.ogr_TC && !isValidTCNumber(studentData.ogr_TC)) {
        errors.push('Geçersiz TC Kimlik numarası');
    }

    // Sınav puanı kontrolü
    if (studentData.ogr_sinav_puan) {
        const puan = parseInt(studentData.ogr_sinav_puan);
        if (puan < 0 || puan > 100) {
            errors.push('Sınav puanı 0-100 arasında olmalıdır');
        }
    }

    // Ödeme tutarı kontrolü
    if (studentData.ogr_odeme) {
        const odeme = parseFloat(studentData.ogr_odeme);
        if (odeme < 0) {
            errors.push('Ödeme tutarı negatif olamaz');
        }
    }

    if (errors.length > 0) {
        showNotification(errors.join(', '), 'error');
        return false;
    }

    return true;
}

function formatDateForDatabase(dateStr) {
    if (!dateStr) return null;

    // "dd.mm.yyyy" formatından "yyyy-mm-dd" formatına çevir
    const parts = dateStr.split('.');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
}

// Tarih formatı gösterme fonksiyonu
function formatDateForDisplay(dateStr) {
    if (!isValidDateString(dateStr)) return '';

    try {
        const cleanDateStr = dateStr.trim();

        // "yyyy-mm-dd" formatından "dd.mm.yyyy" formatına çevir
        const parts = cleanDateStr.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
        }
    } catch (error) {
        console.warn('Tarih görüntüleme hatası:', error);
    }

    return '';
}

function showSuccessAnimation() {
    const modal = document.getElementById('addStudentModal');
    if (!modal) return;

    const successElement = document.createElement('div');
    successElement.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
        color: white;
        padding: 24px 32px;
        border-radius: 16px;
        text-align: center;
        opacity: 0;
        animation: successPulse 2s ease-in-out;
        box-shadow: 0 10px 25px rgba(22, 163, 74, 0.3);
        z-index: 20000;
    `;

    successElement.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 32px; margin-bottom: 12px;"></i>
        <br>
        <strong style="font-size: 18px;">Başarılı!</strong><br>
        <span style="font-size: 14px;">Öğrenci kaydedildi</span>
    `;

    modal.appendChild(successElement);

    setTimeout(() => {
        successElement.remove();
    }, 2000);
}

// =============================================================================
// BELGE YÖNETİMİ - CANLI GÜNCELLEMELER
// =============================================================================

async function toggleDocumentInTable(element, studentId, documentType) {
    const isCompleted = element.classList.contains('completed');
    const newStatus = !isCompleted;

    try {
        // Veritabanını güncelle
        const result = await window.db.updateOgrenciBelgeAdvanced(studentId, documentType, newStatus);

        if (result && !result.error) {
            // UI'yi güncelle
            if (newStatus) {
                element.classList.remove('missing');
                element.classList.add('completed');
                element.querySelector('.tooltip').textContent = element.querySelector('.tooltip').textContent.replace('Eksik', 'Tamamlandı');
            } else {
                element.classList.remove('completed');
                element.classList.add('missing');
                element.querySelector('.tooltip').textContent = element.querySelector('.tooltip').textContent.replace('Tamamlandı', 'Eksik');
            }

            // Progress bar'ı güncelle
            if (result.completion) {
                updateProgressBar(studentId, result.completion.oran);
            }

            showNotification(`Belge durumu güncellendi`, 'success');
        } else {
            throw new Error(result?.error || 'Güncelleme başarısız');
        }

    } catch (error) {
        console.error('❌ Belge güncelleme hatası:', error);
        showNotification('Belge durumu güncellenirken hata oluştu', 'error');
    }
}

function updateProgressBar(studentId, completionPercentage) {
    const progressFill = document.querySelector(`tr[data-student-id="${studentId}"] .progress-fill`);
    const progressText = document.querySelector(`tr[data-student-id="${studentId}"] .progress-text`);

    if (progressFill && progressText) {
        progressFill.style.width = `${completionPercentage}%`;
        progressText.textContent = `${completionPercentage}%`;
    }
}

// =============================================================================
// SINAV PUAN YÖNETİMİ
// =============================================================================

async function updateExamScore(studentId, newScore) {
    try {
        const result = await window.db.updateOgrenciSinavPuan(studentId, newScore);

        if (result && !result.error) {
            // UI'yi güncelle
            updateExamScoreInTable(studentId, newScore);
            showNotification(`Sınav puanı güncellendi: ${newScore}`, 'success');
        } else {
            throw new Error(result?.error || 'Güncelleme başarısız');
        }

    } catch (error) {
        console.error('❌ Sınav puanı güncelleme hatası:', error);
        showNotification('Sınav puanı güncellenirken hata oluştu', 'error');
    }
}

function updateExamScoreInTable(studentId, score) {
    const scoreElement = document.querySelector(`tr[data-student-id="${studentId}"] .score-value`);
    const passIcon = document.querySelector(`tr[data-student-id="${studentId}"] .pass-icon`);

    if (scoreElement && passIcon) {
        scoreElement.textContent = score;

        if (score >= 60) {
            scoreElement.className = 'score-value passed';
            passIcon.className = 'fas fa-check-circle pass-icon passed';
        } else {
            scoreElement.className = 'score-value failed';
            passIcon.className = 'fas fa-times-circle pass-icon failed';
        }
    }
}

// =============================================================================
// ÖĞRENCİ LİSTESİ YÖNETİMİ
// =============================================================================

async function renderStudentsTableEnhanced(students) {
    const tbody = document.getElementById('students-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    students.forEach(student => {
        const row = createStudentRowEnhanced(student);
        tbody.appendChild(row);
    });

    console.log(`✅ ${students.length} öğrenci tabloya eklendi`);
}

function createStudentRowEnhanced(student) {
    const initials = (student.ogr_ad?.charAt(0) || '') + (student.ogr_soyad?.charAt(0) || '');

    // Belge tamamlanma oranını hesapla
    const belgeler = [
        student.ogr_gerek_foto,
        student.ogr_gerek_diploma,
        student.ogr_gerek_kimlik,
        student.ogr_gerek_yakakarti,
        student.ogr_gerek_saglik,
        student.ogr_gerek_ikamet
    ];
    const tamamlanan = belgeler.filter(b => b === 1).length;
    const completionPercentage = Math.round((tamamlanan / belgeler.length) * 100);

    // Sınav durumu
    let examDisplay = '';
    if (student.ogr_sinav_puan !== null && student.ogr_sinav_puan !== undefined) {
        const passed = student.ogr_sinav_puan >= 60;
        examDisplay = `
            <div class="exam-score">
                <span class="score-value ${passed ? 'passed' : 'failed'}">${student.ogr_sinav_puan}</span>
                <i class="fas fa-${passed ? 'check' : 'times'}-circle pass-icon ${passed ? 'passed' : 'failed'}"></i>
            </div>
            ${student.ogr_sinav_puan_tarih ? `<div style="font-size: 11px; color: #6b7280;">${formatDate(student.ogr_sinav_puan_tarih)}</div>` : ''}
        `;
    } else {
        examDisplay = `
            <div class="exam-score">
                <span class="score-value not-taken">Belirtilmedi</span>
                <i class="fas fa-clock pass-icon not-taken"></i>
            </div>
        `;
    }

    // YENİ: Gelişmiş ödeme durumu hesaplama
    const totalFee = parseFloat(student.ogr_odeme) || 0;
    const totalPaid = parseFloat(student.toplam_odenen) || 0;
    const remaining = totalFee - totalPaid;
    const percentage = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 0;

    // Ödeme durumu belirleme
    let paymentStatusClass = '';
    let paymentStatusIcon = '';
    let paymentStatusText = '';

    if (totalFee <= 0) {
        paymentStatusClass = 'no-fee';
        paymentStatusIcon = 'fa-question-circle';
        paymentStatusText = 'Ücret Belirtilmedi';
    } else if (remaining <= 0) {
        paymentStatusClass = 'completed';
        paymentStatusIcon = 'fa-check-circle';
        paymentStatusText = 'Tam Ödendi';
    } else if (totalPaid > 0) {
        paymentStatusClass = 'partial';
        paymentStatusIcon = 'fa-clock';
        paymentStatusText = 'Kısmi Ödeme';
    } else {
        paymentStatusClass = 'unpaid';
        paymentStatusIcon = 'fa-times-circle';
        paymentStatusText = 'Ödeme Yok';
    }

    // Gelişmiş ödeme görünümü
    const paymentDisplay = `
        <div class="payment-status ${paymentStatusClass}">
            <div class="payment-amounts">
                <div class="amount-paid">₺${totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                <div class="amount-separator">/</div>
                <div class="amount-total">₺${totalFee.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
            </div>
            
            <div class="payment-progress">
                <div class="progress-bar">
                    <div class="progress-fill ${paymentStatusClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <span class="progress-percentage">${percentage}%</span>
            </div>
            
            <div class="payment-status-info">
                <i class="fas ${paymentStatusIcon} status-icon ${paymentStatusClass}"></i>
                <span class="status-text">${paymentStatusText}</span>
            </div>
            
            ${remaining > 0 ? `
                <div class="remaining-amount">
                    <small>Kalan: ₺${remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</small>
                </div>
            ` : ''}
            
            ${student.odeme_sayisi > 0 ? `
                <div class="payment-count">
                    <small>${student.odeme_sayisi} ödeme yapıldı</small>
                </div>
            ` : ''}
        </div>
    `;

    const row = document.createElement('tr');
    row.dataset.studentId = student.id;
    row.style.borderBottom = '1px solid #f3f4f6';

    row.innerHTML = `
        <td>
            <div class="student-info">
                <div class="student-avatar">${initials}</div>
                <div class="student-details">
                    <h4>${student.ogr_ad || ''} ${student.ogr_soyad || ''}</h4>
                    <p>Baba Adı: ${student.ogr_baba_ad || '-'}</p>
                </div>
            </div>
        </td>
        <td>
            <div>${student.ogr_TC || '-'}</div>
            <div style="font-size: 12px; color: #6b7280;">${student.ogr_ceptel || '-'}</div>
        </td>
        <td>
            <span class="education-type-badge ${(student.ogr_silah_durum || 'belirtilmedi').toLowerCase().replace('ı', 'i').replace('ş', 's')}">
                ${student.ogr_silah_durum === 'Silahlı' ? '🛡️ Silahlı' :
            student.ogr_silah_durum === 'Silahsız' ? '👤 Silahsız' :
                'Belirtilmedi'}
            </span>
        </td>
        <td>
            <div class="document-status">
                ${createDocumentIcon('foto', student.ogr_gerek_foto, student.id)}
                ${createDocumentIcon('diploma', student.ogr_gerek_diploma, student.id)}
                ${createDocumentIcon('kimlik', student.ogr_gerek_kimlik, student.id)}
                ${createDocumentIcon('yakakarti', student.ogr_gerek_yakakarti, student.id)}
                ${createDocumentIcon('saglik', student.ogr_gerek_saglik, student.id)}
                ${createDocumentIcon('ikamet', student.ogr_gerek_ikamet, student.id)}
            </div>
            <div class="completion-progress" style="margin-top: 8px;">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${completionPercentage}%"></div>
                </div>
                <span class="progress-text">${completionPercentage}%</span>
            </div>
        </td>
        <td>${examDisplay}</td>
        <td>
            ${paymentDisplay}
        </td>
        <td>${formatDate(student.ogr_kayit_tarihi)}</td>
        <td>
            <div class="table-actions">
                <button class="action-btn view" onclick="viewStudentDetails(${student.id})" title="Görüntüle">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="editStudentDetails(${student.id})" title="Düzenle">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn payment" onclick="openPaymentModal(${student.id})" title="Ödeme İşlemleri">
                    <i class="fas fa-credit-card"></i>
                </button>
                <button class="action-btn delete" onclick="deleteStudentConfirm(${student.id})" title="Sil">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </td>
    `;

    return row;
}

// 4. Ödeme durumu görünümü oluşturma fonksiyonu
function createPaymentStatusDisplay(student) {
    const totalFee = parseFloat(student.ogr_odeme) || 0;
    const totalPaid = parseFloat(student.toplam_odenen) || 0;
    const remaining = totalFee - totalPaid;
    const percentage = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 0;

    // Durum belirleme
    let statusClass = '';
    let statusIcon = '';
    let statusText = '';

    if (totalFee <= 0) {
        statusClass = 'no-fee';
        statusIcon = 'fa-question-circle';
        statusText = 'Ücret Belirtilmedi';
    } else if (remaining <= 0) {
        statusClass = 'completed';
        statusIcon = 'fa-check-circle';
        statusText = 'Tam Ödendi';
    } else if (totalPaid > 0) {
        statusClass = 'partial';
        statusIcon = 'fa-clock';
        statusText = 'Kısmi Ödeme';
    } else {
        statusClass = 'unpaid';
        statusIcon = 'fa-times-circle';
        statusText = 'Ödeme Yok';
    }

    return `
        <div class="payment-status ${statusClass}">
            <div class="payment-amounts">
                <div class="amount-paid">₺${totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                <div class="amount-separator">/</div>
                <div class="amount-total">₺${totalFee.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
            </div>
            
            <div class="payment-progress">
                <div class="progress-bar">
                    <div class="progress-fill ${statusClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <span class="progress-percentage">${percentage}%</span>
            </div>
            
            <div class="payment-status-info">
                <i class="fas ${statusIcon} status-icon ${statusClass}"></i>
                <span class="status-text">${statusText}</span>
            </div>
            
            ${remaining > 0 ? `
                <div class="remaining-amount">
                    <small>Kalan: ₺${remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</small>
                </div>
            ` : ''}
            
            ${student.odeme_sayisi > 0 ? `
                <div class="payment-count">
                    <small>${student.odeme_sayisi} ödeme yapıldı</small>
                </div>
            ` : ''}
        </div>
    `;
}

// 5. Tablo başlığını güncelleme
function updateStudentsTableHeader() {
    const thead = document.querySelector('.students-table thead tr');
    if (!thead) return;

    // Mevcut başlıkları temizle ve yenilerini ekle
    thead.innerHTML = `
        <th>Öğrenci</th>
        <th>Durum</th>
        <th>Belgeler</th>
        <th>Sınav</th>
        <th>Ödeme Durumu</th>
        <th>İşlemler</th>
    `;
}

function createDocumentIcon(type, status, studentId) {
    const icons = {
        foto: 'camera',
        diploma: 'graduation-cap',
        kimlik: 'id-card',
        yakakarti: 'badge',
        saglik: 'heartbeat',
        ikamet: 'home'
    };

    const names = {
        foto: 'Fotoğraf',
        diploma: 'Diploma',
        kimlik: 'Kimlik',
        yakakarti: 'Yaka Kartı',
        saglik: 'Sağlık Raporu',
        ikamet: 'İkamet'
    };

    const statusClass = status === 1 ? 'completed' : 'missing';
    const statusText = status === 1 ? 'Tamamlandı' : 'Eksik';

    return `
        <div class="doc-icon ${statusClass}" onclick="toggleDocumentInTable(this, ${studentId}, 'ogr_gerek_${type}')">
            <i class="fas fa-${icons[type]}"></i>
            <div class="tooltip">${names[type]} - ${statusText}</div>
        </div>
    `;
}

// =============================================================================
// ÖĞRENCİ DETAY İŞLEMLERİ
// =============================================================================

window.viewStudentDetails = async function (studentId) {
    try {
        const student = await window.db.getOgrenciById(studentId);
        if (student) {
            openCompleteStudentDetailModal(student);
        } else {
            showNotification('Öğrenci bulunamadı', 'error');
        }
    } catch (error) {
        console.error('⚠️ Öğrenci detay hatası:', error);
        showNotification('Öğrenci bilgileri yüklenirken hata oluştu', 'error');
    }
};

function openCompleteStudentDetailModal(student) {
    const modalHTML = createCompleteStudentDetailModalHTML(student);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
}

function createCompleteStudentDetailModalHTML(student) {
    // Belge completion hesapla
    const belgeler = [
        student.ogr_gerek_foto, student.ogr_gerek_diploma, student.ogr_gerek_kimlik,
        student.ogr_gerek_yakakarti, student.ogr_gerek_saglik, student.ogr_gerek_ikamet
    ];
    const tamamlanan = belgeler.filter(b => b === 1).length;
    const completionPercentage = Math.round((tamamlanan / belgeler.length) * 100);

    return `
        <div class="modal-overlay active" id="studentDetailModal">
            <div class="modal-container" style="max-width: 1200px; max-height: 90vh;">
                <div class="modal-header">
                    <h2>
                        <i class="fas fa-user-graduate"></i>
                        ${student.ogr_ad} ${student.ogr_soyad} - Detaylı Profil
                    </h2>
                    <button class="modal-close" onclick="closeStudentDetailModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="modal-body" style="overflow-y: auto; max-height: 70vh;">
                    
                    <!-- ÜST BAŞLIK -->
                    <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 24px; border-radius: 16px; margin-bottom: 28px;">
                        <div style="display: flex; align-items: center; gap: 24px;">
                            <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold;">
                                ${(student.ogr_ad?.charAt(0) || '') + (student.ogr_soyad?.charAt(0) || '')}
                            </div>
                            <div style="flex: 1;">
                                <h2 style="font-size: 28px; margin: 0 0 12px 0;">${student.ogr_ad} ${student.ogr_soyad}</h2>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; opacity: 0.95; font-size: 15px;">
                                    <div><i class="fas fa-id-card"></i> <strong>TC:</strong> ${student.ogr_TC || '-'}</div>
                                    <div><i class="fas fa-graduation-cap"></i> <strong>Eğitim:</strong> ${student.ogr_turu || '-'}</div>
                                    <div><i class="fas fa-info-circle"></i> <strong>Durum:</strong> ${student.ogr_durum || 'Aktif'}</div>
                                    <div><i class="fas fa-calendar"></i> <strong>Kayıt:</strong> ${formatDate(student.ogr_kayit_tarihi)}</div>
                                </div>
                            </div>
                            <div style="text-align: center; background: rgba(255,255,255,0.15); padding: 20px; border-radius: 12px;">
                                <div style="font-size: 36px; font-weight: bold; margin-bottom: 8px;">${completionPercentage}%</div>
                                <div style="font-size: 14px; opacity: 0.9;">Belge Tamamlanma</div>
                            </div>
                        </div>
                    </div>

                    <!-- ANA İÇERİK GRID -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px;">
                        
                        <!-- SOL KOLON -->
                        <div>
                            <!-- Kişisel Bilgiler -->
                            <div class="detail-card" style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                                <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px; font-weight: 700; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
                                    <i class="fas fa-user" style="color: #16a34a; margin-right: 8px;"></i>
                                    Kişisel Bilgiler
                                </h3>
                                ${createDetailRow('Ad Soyad', `${student.ogr_ad || ''} ${student.ogr_soyad || ''}`)}
                                ${createDetailRow('TC Kimlik No', student.ogr_TC)}
                                ${createDetailRow('Baba Adı', student.ogr_baba_ad)}
                                ${createDetailRow('Anne Adı', student.ogr_anne_ad)}
                                ${createDetailRow('Doğum Yeri', student.ogr_dogum_yeri)}
                                ${createDetailRow('Doğum Tarihi', formatDate(student.ogr_dogum_tarihi))}
                                ${createDetailRow('Öğrenim Durumu', student.ogr_ogrenim_durumu)}
                                ${createDetailRow('Kan Grubu', student.ogr_kan_grubu)}
                            </div>

                            <!-- İletişim Bilgileri -->
                            <div class="detail-card" style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                                <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px; font-weight: 700; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
                                    <i class="fas fa-phone" style="color: #3b82f6; margin-right: 8px;"></i>
                                    İletişim Bilgileri
                                </h3>
                                ${createDetailRow('Cep Telefonu', student.ogr_ceptel)}
                                ${createDetailRow('Yedek Telefon', student.ogr_yedek_ceptel)}
                                ${createDetailRow('E-posta', student.ogr_mail)}
                                ${createDetailRow('Adres', student.ogr_adres, true)}
                            </div>

                            <!-- Eğitim ve Diğer Bilgiler -->
                            <div class="detail-card" style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                                <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px; font-weight: 700; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
                                    <i class="fas fa-graduation-cap" style="color: #7c3aed; margin-right: 8px;"></i>
                                    Eğitim ve Diğer Bilgiler
                                </h3>
                                ${createDetailRow('Eğitim Türü', student.ogr_turu)}
                                ${createDetailRow('Rapor Tarih No', student.ogr_rapor_tarih_no)}
                                ${createDetailRow('Silah Durumu', student.ogr_silah_durum)}
                                ${createDetailRow('Durum', student.ogr_durum)}
                            </div>
                        </div>

                        <!-- SAĞ KOLON -->
                        <div>
                            <!-- Belge Durumları -->
                            <div class="detail-card" style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                                <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px; font-weight: 700; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
                                    <i class="fas fa-file-alt" style="color: #f59e0b; margin-right: 8px;"></i>
                                    Belge Durumları
                                </h3>
                                ${createBelgeGrid(student)}
                                
                                <!-- Progress Bar -->
                                <div style="margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                        <span style="font-weight: 600; color: #374151;">Tamamlanma Oranı</span>
                                        <span style="font-weight: bold; color: #1f2937; font-size: 16px;">${tamamlanan}/${belgeler.length} (${completionPercentage}%)</span>
                                    </div>
                                    <div style="height: 12px; background: #e5e7eb; border-radius: 6px; overflow: hidden;">
                                        <div style="height: 100%; width: ${completionPercentage}%; background: linear-gradient(90deg, #dc2626 0%, #f59e0b 50%, #16a34a 100%); border-radius: 6px; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Sınav ve Ödeme -->
                            <div class="detail-card" style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                                <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px; font-weight: 700; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
                                    <i class="fas fa-chart-line" style="color: #06b6d4; margin-right: 8px;"></i>
                                    Sınav ve Ödeme Bilgileri
                                </h3>
                                
                                <!-- Sınav Kartları -->
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                                    <div style="text-align: center; padding: 20px; background: ${student.ogr_sinav_puan >= 60 ? '#dcfce7' : student.ogr_sinav_puan !== null ? '#fef2f2' : '#f3f4f6'}; border-radius: 12px; border: 2px solid ${student.ogr_sinav_puan >= 60 ? '#16a34a' : student.ogr_sinav_puan !== null ? '#dc2626' : '#9ca3af'};">
                                        <div style="font-size: 32px; font-weight: bold; color: ${student.ogr_sinav_puan >= 60 ? '#16a34a' : student.ogr_sinav_puan !== null ? '#dc2626' : '#6b7280'}; margin-bottom: 8px;">
                                            ${student.ogr_sinav_puan !== null ? student.ogr_sinav_puan : '?'}
                                        </div>
                                        <div style="font-size: 13px; color: #6b7280; font-weight: 500; margin-bottom: 8px;">SINAV PUANI</div>
                                        ${student.ogr_sinav_puan !== null ? `
                                            <div style="font-size: 14px; font-weight: 600; color: ${student.ogr_sinav_puan >= 60 ? '#16a34a' : '#dc2626'};">
                                                ${student.ogr_sinav_puan >= 60 ? '✓ GEÇTİ' : '✗ KALDI'}
                                            </div>
                                        ` : `
                                            <div style="font-size: 14px; color: #6b7280;">Henüz girilmedi</div>
                                        `}
                                    </div>
                                    
                                    <div style="text-align: center; padding: 20px; background: ${student.ogr_odeme > 0 ? '#dcfce7' : '#fef2f2'}; border-radius: 12px; border: 2px solid ${student.ogr_odeme > 0 ? '#16a34a' : '#dc2626'};">
                                        <div style="font-size: 28px; font-weight: bold; color: ${student.ogr_odeme > 0 ? '#16a34a' : '#dc2626'}; margin-bottom: 8px;">
                                            ${student.ogr_odeme || 0}₺
                                        </div>
                                        <div style="font-size: 13px; color: #6b7280; font-weight: 500; margin-bottom: 8px;">ÖDEME TUTARI</div>
                                        <div style="font-size: 14px; font-weight: 600; color: ${student.ogr_odeme > 0 ? '#16a34a' : '#dc2626'};">
                                            ${student.ogr_odeme > 0 ? '✓ ÖDENDİ' : '○ BEKLİYOR'}
                                        </div>
                                    </div>
                                </div>

                                <!-- Detay Bilgileri -->
                                ${createDetailRow('Sınav Puanı', student.ogr_sinav_puan || 'Girilmedi')}
                                ${createDetailRow('Sınav Tarihi', formatDate(student.ogr_sinav_puan_tarih) || 'Bilinmiyor')}
                                ${createDetailRow('Ödeme Tutarı', student.ogr_odeme ? `${student.ogr_odeme}₺` : '0₺')}
                                ${createDetailRow('Geçme Durumu', student.ogr_sinav_puan >= 60 ? 'Geçti' : student.ogr_sinav_puan !== null ? 'Kaldı' : 'Henüz sınava girmedi')}
                            </div>

                            <!-- Notlar -->
                            ${student.ogr_not ? `
                                <div class="detail-card" style="background: #fffbeb; padding: 24px; border-radius: 12px; border: 2px solid #fed7aa; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                                    <h3 style="color: #92400e; margin: 0 0 16px 0; font-size: 18px; font-weight: 700;">
                                        <i class="fas fa-sticky-note" style="margin-right: 8px;"></i>
                                        Özel Notlar
                                    </h3>
                                    <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #fed7aa;">
                                        <p style="margin: 0; color: #92400e; line-height: 1.6; font-size: 15px;">${student.ogr_not}</p>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <div class="modal-footer" style="border-top: 1px solid #e5e7eb; padding: 20px 24px; background: #f9fafb;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="color: #6b7280; font-size: 14px;">
                            <i class="fas fa-info-circle"></i> Son güncelleme: ${new Date().toLocaleDateString('tr-TR')}
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <button type="button" class="btn btn-secondary" onclick="closeStudentDetailModal()">
                                <i class="fas fa-times"></i> Kapat
                            </button>
                            <button type="button" class="btn" style="background: #f59e0b; color: white;" onclick="window.duplicateStudent(${student.id})">
                                <i class="fas fa-copy"></i> Kopyala
                            </button>
                            <button class="btn btn-success" onclick="generateExcelForm(${student.id})" style="background: #16a34a; color: white; border-color: #16a34a;">
                                <i class="fas fa-file-excel"></i>
                                Kursiyer Kayıt Formu
                            </button>
                            <button type="button" class="btn btn-primary" onclick="editStudentFromDetail(${student.id})">
                                <i class="fas fa-edit"></i> Düzenle
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createBelgeGrid(student) {
    const belgeler = [
        { key: 'ogr_gerek_foto', label: 'Fotoğraf', icon: 'camera' },
        { key: 'ogr_gerek_diploma', label: 'Diploma', icon: 'graduation-cap' },
        { key: 'ogr_gerek_kimlik', label: 'Kimlik', icon: 'id-card' },
        { key: 'ogr_gerek_yakakarti', label: 'Yaka Kartı', icon: 'id-badge' },
        { key: 'ogr_gerek_saglik', label: 'Sağlık Raporu', icon: 'heartbeat' },
        { key: 'ogr_gerek_ikamet', label: 'İkamet Belgesi', icon: 'home' }
    ];

    return `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            ${belgeler.map(belge => {
        const durum = student[belge.key] === 1;
        const bgColor = durum ? '#dcfce7' : '#fef2f2';
        const borderColor = durum ? '#16a34a' : '#dc2626';
        const textColor = durum ? '#16a34a' : '#dc2626';
        const icon = durum ? 'check-circle' : 'times-circle';

        return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: ${bgColor}; border: 2px solid ${borderColor}; border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-${belge.icon}" style="color: ${textColor}; font-size: 16px;"></i>
                            <span style="font-size: 14px; font-weight: 500; color: #374151;">${belge.label}</span>
                        </div>
                        <i class="fas fa-${icon}" style="color: ${textColor}; font-size: 18px;"></i>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

function openStudentDetailModal(student) {
    const modalHTML = createStudentDetailModalHTML(student);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
}

function createStudentDetailModalHTML(student) {
    const belgeler = [
        { name: 'Fotoğraf', field: 'ogr_gerek_foto', icon: 'camera' },
        { name: 'Diploma', field: 'ogr_gerek_diploma', icon: 'graduation-cap' },
        { name: 'Kimlik', field: 'ogr_gerek_kimlik', icon: 'id-card' },
        { name: 'Yaka Kartı', field: 'ogr_gerek_yakakarti', icon: 'badge' },
        { name: 'Sağlık Raporu', field: 'ogr_gerek_saglik', icon: 'heartbeat' },
        { name: 'İkamet', field: 'ogr_gerek_ikamet', icon: 'home' }
    ];

    const tamamlanan = belgeler.filter(b => student[b.field] === 1).length;
    const completionPercentage = Math.round((tamamlanan / belgeler.length) * 100);

    return `
        <div class="modal-overlay active" id="studentDetailModal">
            <div class="modal-container" style="max-width: 1000px;">
                <div class="modal-header">
                    <h2>
                        <i class="fas fa-user"></i>
                        ${student.ogr_ad} ${student.ogr_soyad} - Detay Bilgileri
                    </h2>
                    <button class="modal-close" onclick="closeStudentDetailModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="modal-body">
                    <!-- Öğrenci Özet Kartı -->
                    <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold;">
                                ${(student.ogr_ad?.charAt(0) || '') + (student.ogr_soyad?.charAt(0) || '')}
                            </div>
                            <div style="flex: 1;">
                                <h3 style="font-size: 24px; margin-bottom: 8px;">${student.ogr_ad} ${student.ogr_soyad}</h3>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; opacity: 0.9;">
                                    <div><i class="fas fa-id-card"></i> TC: ${student.ogr_TC || '-'}</div>
                                    <div><i class="fas fa-phone"></i> Tel: ${student.ogr_ceptel || '-'}</div>
                                    <div><i class="fas fa-graduation-cap"></i> Tür: ${student.ogr_turu || '-'}</div>
                                    <div><i class="fas fa-calendar"></i> Kayıt: ${formatDate(student.ogr_kayit_tarihi)}</div>
                                </div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 32px; font-weight: bold;">${completionPercentage}%</div>
                                <div style="font-size: 14px; opacity: 0.9;">Tamamlanma</div>
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                        <!-- Sol Kolon: Kişisel Bilgiler -->
                        <div>
                            <h3 style="margin-bottom: 16px; color: #374151; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-user"></i> Kişisel Bilgiler
                            </h3>
                            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb;">
                                ${createDetailRow('Ad Soyad', `${student.ogr_ad || ''} ${student.ogr_soyad || ''}`)}
                                ${createDetailRow('TC Kimlik No', student.ogr_TC)}
                                ${createDetailRow('Baba Adı', student.ogr_baba_ad)}
                                ${createDetailRow('Anne Adı', student.ogr_anne_ad)}
                                ${createDetailRow('Doğum Yeri', student.ogr_dogum_yeri)}
                                ${createDetailRow('Doğum Tarihi', formatDate(student.ogr_dogum_tarihi))}
                                ${createDetailRow('Öğrenim Durumu', student.ogr_ogrenim_durumu)}
                                ${createDetailRow('Kan Grubu', student.ogr_kan_grubu)}
                            </div>

                            <h3 style="margin: 24px 0 16px 0; color: #374151; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-phone"></i> İletişim Bilgileri
                            </h3>
                            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb;">
                                ${createDetailRow('Cep Telefonu', student.ogr_ceptel)}
                                ${createDetailRow('Yedek Telefon', student.ogr_yedek_ceptel)}
                                ${createDetailRow('E-posta', student.ogr_mail)}
                                ${createDetailRow('Adres', student.ogr_adres)}
                            </div>
                        </div>

                        <!-- Sağ Kolon: Belge ve Sınav Bilgileri -->
                        <div>
                            <h3 style="margin-bottom: 16px; color: #374151; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-file-alt"></i> Belge Durumu
                            </h3>
                            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                    ${belgeler.map(belge => `
                                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                                            <div style="display: flex; align-items: center; gap: 8px;">
                                                <i class="fas fa-${belge.icon}" style="color: #6b7280;"></i>
                                                <span style="font-size: 14px;">${belge.name}</span>
                                            </div>
                                            <div class="doc-checkbox ${student[belge.field] === 1 ? 'checked' : ''}" 
                                                 onclick="toggleDocumentInDetail(this, ${student.id}, '${belge.field}')"
                                                 style="width: 20px; height: 20px; border: 2px solid #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; ${student[belge.field] === 1 ? 'background: #16a34a; border-color: #16a34a; color: white;' : ''}">
                                                <i class="fas fa-check" style="display: ${student[belge.field] === 1 ? 'block' : 'none'};"></i>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                                <div style="margin-top: 16px; padding: 12px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                                    <div style="display: flex; align-items: center; justify-content: between; gap: 12px;">
                                        <span style="font-weight: 600;">Tamamlanma Oranı:</span>
                                        <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
                                            <div style="flex: 1; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden;">
                                                <div style="height: 100%; width: ${completionPercentage}%; background: linear-gradient(90deg, #dc2626, #f59e0b, #16a34a); border-radius: 4px; transition: width 0.3s ease;"></div>
                                            </div>
                                            <span style="font-weight: bold; color: #374151;">${completionPercentage}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <h3 style="margin-bottom: 16px; color: #374151; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-clipboard-check"></i> Sınav ve Ödeme
                            </h3>
                            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                                    <div style="text-align: center; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                                        <div style="font-size: 24px; font-weight: bold; color: ${student.ogr_sinav_puan >= 60 ? '#16a34a' : student.ogr_sinav_puan !== null ? '#dc2626' : '#6b7280'};">
                                            ${student.ogr_sinav_puan !== null ? student.ogr_sinav_puan : '-'}
                                        </div>
                                        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Sınav Puanı</div>
                                        ${student.ogr_sinav_puan !== null ? `
                                            <div style="margin-top: 8px;">
                                                <span style="padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; ${student.ogr_sinav_puan >= 60 ? 'background: #dcfce7; color: #16a34a;' : 'background: #fef2f2; color: #dc2626;'}">
                                                    ${student.ogr_sinav_puan >= 60 ? 'GEÇTİ' : 'KALDI'}
                                                </span>
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div style="text-align: center; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                                        <div style="font-size: 24px; font-weight: bold; color: ${student.ogr_odeme > 0 ? '#16a34a' : '#dc2626'};">
                                            ${student.ogr_odeme || 0}₺
                                        </div>
                                        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Ödeme Tutarı</div>
                                        <div style="margin-top: 8px;">
                                            <span style="padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; ${student.ogr_odeme > 0 ? 'background: #dcfce7; color: #16a34a;' : 'background: #fef2f2; color: #dc2626;'}">
                                                ${student.ogr_odeme > 0 ? 'ÖDENDİ' : 'BEKLİYOR'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Hızlı Güncelleme Alanları -->
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                    <div>
                                        <label style="display: block; font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 6px;">Sınav Puanı Güncelle:</label>
                                        <div style="display: flex; gap: 8px;">
                                            <input type="number" id="examScoreInput" min="0" max="100" 
                                                   value="${student.ogr_sinav_puan || ''}"
                                                   style="flex: 1; padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 6px; font-size: 14px;">
                                            <button onclick="updateExamScoreFromModal(${student.id})" 
                                                    style="background: #16a34a; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">
                                                <i class="fas fa-save"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label style="display: block; font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 6px;">Ödeme Tutarı Güncelle:</label>
                                        <div style="display: flex; gap: 8px;">
                                            <input type="number" id="paymentAmountInput" min="0" step="0.01"
                                                   value="${student.ogr_odeme || ''}"
                                                   style="flex: 1; padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 6px; font-size: 14px;">
                                            <button onclick="updatePaymentFromModal(${student.id})" 
                                                    style="background: #16a34a; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">
                                                <i class="fas fa-save"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            ${student.ogr_not ? `
                                <h3 style="margin: 24px 0 16px 0; color: #374151; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-sticky-note"></i> Notlar
                                </h3>
                                <div style="background: #fffbeb; padding: 16px; border-radius: 12px; border: 1px solid #fed7aa;">
                                    <p style="margin: 0; color: #92400e; line-height: 1.6;">${student.ogr_not}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeStudentDetailModal()">
                        <i class="fas fa-times"></i>
                        Kapat
                    </button>
                    <button class="btn btn-success" onclick="generateExcelForm(${student.id})" style="background: #16a34a; border-color: #16a34a;">
                        <i class="fas fa-file-excel"></i>
                        Excel Form Doldur
                    </button>
                    <button type="button" class="btn btn-primary" onclick="editStudentFromDetail(${student.id})">
                        <i class="fas fa-edit"></i>
                        Düzenle
                    </button>
                </div>
            </div>
        </div>
    `;
}

function createDetailRow(label, value, isTextArea = false) {
    const displayValue = value || '-';

    return `
        <div style="display: flex; ${isTextArea ? 'flex-direction: column' : 'justify-content: space-between'}; align-items: ${isTextArea ? 'stretch' : 'center'}; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
            <span style="font-size: 14px; color: #6b7280; font-weight: 500; ${isTextArea ? 'margin-bottom: 8px;' : ''}">${label}:</span>
            <span style="font-size: 14px; font-weight: 600; color: #111827; ${isTextArea ? 'background: #f9fafb; padding: 8px; border-radius: 6px; min-height: 40px;' : 'text-align: right;'}">${displayValue}</span>
        </div>
    `;
}


function closeStudentDetailModal() {
    const modal = document.getElementById('studentDetailModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

async function toggleDocumentInDetail(element, studentId, documentField) {
    const isChecked = element.classList.contains('checked');
    const newStatus = !isChecked;

    try {
        const result = await window.db.updateOgrenciBelgeAdvanced(studentId, documentField, newStatus);

        if (result && !result.error) {
            // UI'yi güncelle
            if (newStatus) {
                element.classList.add('checked');
                element.style.cssText += 'background: #16a34a; border-color: #16a34a; color: white;';
                element.querySelector('i').style.display = 'block';
            } else {
                element.classList.remove('checked');
                element.style.cssText = element.style.cssText.replace(/background: #16a34a; border-color: #16a34a; color: white;/g, '');
                element.querySelector('i').style.display = 'none';
            }

            // Progress bar'ı güncelle
            if (result.completion) {
                const progressBar = document.querySelector('#studentDetailModal .progress-fill');
                const progressText = document.querySelector('#studentDetailModal .progress-text');
                const headerProgress = document.querySelector('#studentDetailModal div[style*="font-size: 32px"]');

                if (progressBar && progressText && headerProgress) {
                    progressBar.style.width = `${result.completion.oran}%`;
                    progressText.textContent = `${result.completion.oran}%`;
                    headerProgress.textContent = `${result.completion.oran}%`;
                }

                // Ana tabloda da güncelle
                updateProgressBar(studentId, result.completion.oran);
            }

            showNotification('Belge durumu güncellendi', 'success');
        } else {
            throw new Error(result?.error || 'Güncelleme başarısız');
        }

    } catch (error) {
        console.error('❌ Belge güncelleme hatası:', error);
        showNotification('Belge durumu güncellenirken hata oluştu', 'error');
    }
}

async function updateExamScoreFromModal(studentId) {
    const input = document.getElementById('examScoreInput');
    const score = parseInt(input.value);

    if (score < 0 || score > 100) {
        showNotification('Sınav puanı 0-100 arasında olmalıdır', 'warning');
        return;
    }

    try {
        await updateExamScore(studentId, score);

        // Modal içindeki puanı güncelle
        const scoreDisplay = document.querySelector('#studentDetailModal div[style*="font-size: 24px"]:first-child');
        const statusBadge = scoreDisplay.parentElement.querySelector('span[style*="padding: 4px 12px"]');

        if (scoreDisplay && statusBadge) {
            scoreDisplay.textContent = score;
            scoreDisplay.style.color = score >= 60 ? '#16a34a' : '#dc2626';

            statusBadge.textContent = score >= 60 ? 'GEÇTİ' : 'KALDI';
            statusBadge.style.cssText = score >= 60 ?
                'padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: #dcfce7; color: #16a34a;' :
                'padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: #fef2f2; color: #dc2626;';
        }

    } catch (error) {
        console.error('❌ Sınav puanı güncelleme hatası:', error);
    }
}

async function updatePaymentFromModal(studentId) {
    const input = document.getElementById('paymentAmountInput');
    const amount = parseFloat(input.value) || 0;

    if (amount < 0) {
        showNotification('Ödeme tutarı negatif olamaz', 'warning');
        return;
    }

    try {
        const result = await window.db.runQuery(
            'UPDATE ogrenciler SET ogr_odeme = ? WHERE id = ?',
            [amount, studentId]
        );

        if (result && !result.error) {
            showNotification('Ödeme tutarı güncellendi', 'success');

            // Modal içindeki ödeme tutarını güncelle
            const paymentDisplay = document.querySelector('#studentDetailModal div[style*="font-size: 24px"]:last-child');
            const paymentBadge = paymentDisplay.parentElement.querySelector('span[style*="padding: 4px 12px"]');

            if (paymentDisplay && paymentBadge) {
                paymentDisplay.textContent = `${amount}₺`;
                paymentDisplay.style.color = amount > 0 ? '#16a34a' : '#dc2626';

                paymentBadge.textContent = amount > 0 ? 'ÖDENDİ' : 'BEKLİYOR';
                paymentBadge.style.cssText = amount > 0 ?
                    'padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: #dcfce7; color: #16a34a;' :
                    'padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: #fef2f2; color: #dc2626;';
            }

            // Ana tabloda da güncelle
            const paymentCell = document.querySelector(`tr[data-student-id="${studentId}"] .payment-amount`);
            const paymentStatus = document.querySelector(`tr[data-student-id="${studentId}"] .payment-status`);

            if (paymentCell && paymentStatus) {
                paymentCell.textContent = `${amount}₺`;
                paymentCell.className = `payment-amount ${amount > 0 ? 'paid' : 'unpaid'}`;
                paymentStatus.textContent = amount > 0 ? 'Ödendi' : 'Bekliyor';
                paymentStatus.style.color = amount > 0 ? '#16a34a' : '#dc2626';
            }
        } else {
            throw new Error(result?.error || 'Güncelleme başarısız');
        }

    } catch (error) {
        console.error('❌ Ödeme güncelleme hatası:', error);
        showNotification('Ödeme tutarı güncellenirken hata oluştu', 'error');
    }
}

async function updatePayment(event, paymentId) {
    event.preventDefault();

    try {
        const paymentData = {
            id: paymentId,
            odenen_tutar: parseFloat(document.getElementById('editPaymentAmount').value),
            odeme_tarihi: document.getElementById('editPaymentDate').value,
            odeme_yontemi: document.getElementById('editPaymentMethod').value,
            notlar: document.getElementById('editPaymentNote').value.trim()
        };

        showNotification('Ödeme güncelleniyor...', 'info');

        const result = await window.db.updateOdeme(paymentData);

        if (result && !result.error) {
            showNotification('Ödeme başarıyla güncellendi', 'success');
            closeModal(document.getElementById('editPaymentModal'));
            loadPayments(); // Tabloyu yenile
        } else {
            showNotification('Ödeme güncellenirken hata oluştu', 'error');
        }

    } catch (error) {
        console.error('Ödeme güncellenirken hata:', error);
        showNotification('Ödeme güncellenirken hata oluştu', 'error');
    }
}

// Ödeme sayısını güncelle
function updatePaymentsCount() {
    const countElement = document.getElementById('paymentsCount');
    if (countElement) {
        countElement.textContent = `(${filteredPayments.length})`;
    }
}

// =============================================================================
// ÖĞRENCİ SİLME VE DÜZENLEMEÖĞRENCİ SİLME VE DÜZENLEME
// =============================================================================

async function deleteStudentConfirm(studentId) {
    if (confirm('Bu öğrenciyi silmek istediğinizden emin misiniz?')) {
        try {
            const result = await window.db.deleteOgrenci(studentId);
            if (result && !result.error) {
                showNotification('Öğrenci başarıyla silindi', 'success');

                // Tablodan satırı kaldır
                const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
                if (row) {
                    row.remove();
                }

                // İstatistikleri güncelle
                if (appState.currentTermId) {
                    await loadTermStudents(appState.currentTermId);
                    await loadTermsFromDatabase();
                }
            } else {
                throw new Error(result?.error || 'Bilinmeyen hata');
            }
        } catch (error) {
            console.error('❌ Öğrenci silinirken hata:', error);
            showNotification('Öğrenci silinirken hata oluştu', 'error');
        }
    }
}

window.editStudentDetails = async function (studentId) {
    console.log('✏️ Öğrenci düzenleniyor:', studentId);

    try {
        // Öğrenci bilgilerini al
        const student = await window.db.getOgrenciById(studentId);

        if (!student) {
            showNotification('Öğrenci bulunamadı', 'error');
            return;
        }

        // Düzenleme modalını aç
        openEditStudentModal(student);

    } catch (error) {
        console.error('⚠️ Öğrenci bilgileri yüklenirken hata:', error);
        showNotification('Öğrenci bilgileri yüklenirken hata oluştu', 'error');
    }
};

function editStudentFromDetail(studentId) {
    closeStudentDetailModal();
    setTimeout(() => {
        window.editStudentDetails(studentId);
    }, 300);
}

// =============================================================================
// FİLTRELEME VE ARAMA SİSTEMİ
// =============================================================================

function setupStudentFilters() {
    // Arama inputu
    const searchInput = document.getElementById('studentSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            studentFilters.search = e.target.value;
            applyStudentFilters();
        });
    }

    // Filtre butonları
    const filterButtons = document.querySelectorAll('.filter-tab');
    filterButtons.forEach(button => {
        button.addEventListener('click', function () {
            const filterType = this.parentElement.previousElementSibling.textContent.toLowerCase();
            const filterValue = this.dataset.filter;

            // Aktif sınıfını güncelle
            this.parentElement.querySelectorAll('.filter-tab').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Filtreyi uygula
            if (filterType.includes('durum')) {
                studentFilters.status = filterValue;
            } else if (filterType.includes('belge')) {
                studentFilters.documents = filterValue;
            } else if (filterType.includes('sınav')) {
                studentFilters.exam = filterValue;
            }

            applyStudentFilters();
        });
    });
}

async function applyStudentFilters() {
    if (!appState.currentTermId) return;

    try {
        const students = await window.db.searchOgrencilerAdvanced(
            studentFilters.search,
            appState.currentTermId,
            studentFilters.status === 'all' ? null : studentFilters.status,
            studentFilters.documents === 'all' ? null : studentFilters.documents
        );

        // Sınav filtresini uygula
        let filteredStudents = students;
        if (studentFilters.exam !== 'all') {
            filteredStudents = students.filter(student => {
                if (studentFilters.exam === 'passed') {
                    return student.ogr_sinav_puan >= 60;
                } else if (studentFilters.exam === 'failed') {
                    return student.ogr_sinav_puan !== null && student.ogr_sinav_puan < 60;
                } else if (studentFilters.exam === 'not-taken') {
                    return student.ogr_sinav_puan === null;
                }
                return true;
            });
        }

        renderStudentsTableEnhanced(filteredStudents);

    } catch (error) {
        console.error('❌ Filtreleme hatası:', error);
        showNotification('Filtreleme sırasında hata oluştu', 'error');
    }
}

// =============================================================================
// İSTATİSTİKLER VE DASHBOARD GÜNCELLEMELERİ
// =============================================================================

async function updateStudentStatistics(termId = null) {
    try {
        const stats = await window.db.getOgrenciIstatistikleri(termId);

        // Ana istatistikleri güncelle
        const statElements = {
            totalStudents: document.getElementById('totalStudents'),
            completedDocuments: document.getElementById('completedDocuments'),
            passedExams: document.getElementById('passedExams'),
            completedPayments: document.getElementById('completedPayments'),
        };

        if (statElements.totalStudents) {
            statElements.totalStudents.textContent = stats.toplam || 0;
        }
        if (statElements.completedDocuments) {
            statElements.completedDocuments.textContent = stats.belgeTamam || 0;
        }
        if (statElements.passedExams) {
            statElements.passedExams.textContent = stats.gecenler || 0;
        }
        if (statElements.completedPayments) {
            statElements.completedPayments.textContent = stats.odemeTamam || 0;
        }

        console.log('📊 İstatistikler güncellendi:', stats);

        // ÖNEMLİ: Burada filtreleme çağırma!
        // applyStudentFilters(); <- Bu satırı kaldır/yorum yap

    } catch (error) {
        console.error('⚠️ İstatistik güncelleme hatası:', error);
    }
}

// 5. İstatistik güncelleme fonksiyonunu tekrar tanımla
window.updateStudentStatistics = updateStudentStatistics;

// 6. Event listener çakışmalarını önle
function preventDuplicateListeners() {
    // Eski event listener'ları temizle
    const oldFilterButtons = document.querySelectorAll('.filter-tab:not([data-type])');
    oldFilterButtons.forEach(button => {
        // Clone yaparak tüm event listener'ları temizle
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });
}

// 7. Sayfada setupEnhancedFilters'dan önce eski listener'ları temizle
const originalSetupEnhancedFilters = setupEnhancedFilters;
function setupEnhancedFilters() {
    // Önce çakışmaları önle
    preventDuplicateListeners();

    // Sonra gelişmiş filtreleri kur
    return originalSetupEnhancedFilters();
}

console.log('✅ Çift filtreleme sorunu düzeltildi!');

// =============================================================================
// TOPLU İŞLEMLER
// =============================================================================

function selectAllStudents() {
    const checkboxes = document.querySelectorAll('.student-checkbox');
    const selectAllCheckbox = document.getElementById('selectAllStudents');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });

    updateBulkActionButtons();
}

function updateBulkActionButtons() {
    const selectedCount = document.querySelectorAll('.student-checkbox:checked').length;
    const bulkActions = document.getElementById('bulkActions');

    if (selectedCount > 0) {
        bulkActions.style.display = 'flex';
        document.getElementById('selectedCount').textContent = selectedCount;
    } else {
        bulkActions.style.display = 'none';
    }
}

async function bulkUpdateDocuments(documentType, status) {
    const selectedStudents = Array.from(document.querySelectorAll('.student-checkbox:checked'))
        .map(checkbox => parseInt(checkbox.value));

    if (selectedStudents.length === 0) {
        showNotification('Lütfen öğrenci seçin', 'warning');
        return;
    }

    try {
        const promises = selectedStudents.map(studentId =>
            window.db.updateOgrenciBelgeAdvanced(studentId, documentType, status)
        );

        await Promise.all(promises);

        showNotification(`${selectedStudents.length} öğrencinin ${documentType.replace('ogr_gerek_', '')} belgesi güncellendi`, 'success');

        // Sayfayı yenile
        if (appState.currentTermId) {
            await loadTermStudents(appState.currentTermId);
        }

    } catch (error) {
        console.error('❌ Toplu belge güncelleme hatası:', error);
        showNotification('Toplu güncelleme sırasında hata oluştu', 'error');
    }
}

async function bulkUpdateStatus(newStatus) {
    const selectedStudents = Array.from(document.querySelectorAll('.student-checkbox:checked'))
        .map(checkbox => parseInt(checkbox.value));

    if (selectedStudents.length === 0) {
        showNotification('Lütfen öğrenci seçin', 'warning');
        return;
    }

    if (confirm(`${selectedStudents.length} öğrencinin durumunu "${newStatus}" olarak değiştirmek istediğinizden emin misiniz?`)) {
        try {
            const promises = selectedStudents.map(studentId =>
                window.db.runQuery('UPDATE ogrenciler SET ogr_durum = ? WHERE id = ?', [newStatus, studentId])
            );

            await Promise.all(promises);

            showNotification(`${selectedStudents.length} öğrencinin durumu güncellendi`, 'success');

            // Sayfayı yenile
            if (appState.currentTermId) {
                await loadTermStudents(appState.currentTermId);
            }

        } catch (error) {
            console.error('❌ Toplu durum güncelleme hatası:', error);
            showNotification('Toplu güncelleme sırasında hata oluştu', 'error');
        }
    }
}

// =============================================================================
// RAPOR VE DIŞA AKTARMA FONKSİYONLARI
// =============================================================================

async function exportStudentsToCSV(termId) {
    try {
        const students = await window.db.getOgrencilerByDonem(termId);

        if (!students || students.length === 0) {
            showNotification('Dışa aktarılacak öğrenci bulunamadı', 'warning');
            return;
        }

        // CSV başlıkları
        const headers = [
            'Ad', 'Soyad', 'TC Kimlik', 'Telefon', 'E-posta', 'Eğitim Türü', 'Durum',
            'Kayıt Tarihi', 'Fotoğraf', 'Diploma', 'Kimlik', 'Yaka Kartı', 'Sağlık', 'İkamet',
            'Sınav Puanı', 'Geçti/Kaldı', 'Ödeme Tutarı', 'Not'
        ];

        // CSV verileri
        const csvData = students.map(student => [
            student.ogr_ad || '',
            student.ogr_soyad || '',
            student.ogr_TC || '',
            student.ogr_ceptel || '',
            student.ogr_mail || '',
            student.ogr_turu || '',
            student.ogr_durum || '',
            formatDate(student.ogr_kayit_tarihi),
            student.ogr_gerek_foto ? 'Tamam' : 'Eksik',
            student.ogr_gerek_diploma ? 'Tamam' : 'Eksik',
            student.ogr_gerek_kimlik ? 'Tamam' : 'Eksik',
            student.ogr_gerek_yakakarti ? 'Tamam' : 'Eksik',
            student.ogr_gerek_saglik ? 'Tamam' : 'Eksik',
            student.ogr_gerek_ikamet ? 'Tamam' : 'Eksik',
            student.ogr_sinav_puan || '',
            student.ogr_sinav_puan >= 60 ? 'Geçti' : student.ogr_sinav_puan !== null ? 'Kaldı' : '',
            student.ogr_odeme || '0',
            student.ogr_not || ''
        ]);

        // CSV formatında birleştir
        const csvContent = [headers, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        // Dosyayı indir
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `ogrenciler_donem_${termId}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification(`${students.length} öğrenci CSV formatında dışa aktarıldı`, 'success');

    } catch (error) {
        console.error('❌ CSV dışa aktarma hatası:', error);
        showNotification('Dışa aktarma sırasında hata oluştu', 'error');
    }
}

async function generateTermReport(termId) {
    try {
        const report = await window.db.getDonemRapor(termId);

        if (!report || !report.donem) {
            showNotification('Rapor oluşturulamadı', 'error');
            return;
        }

        // Rapor HTML'i oluştur
        const reportHTML = createTermReportHTML(report);

        // Yeni pencerede aç
        const reportWindow = window.open('', '_blank');
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
        reportWindow.print();

    } catch (error) {
        console.error('❌ Rapor oluşturma hatası:', error);
        showNotification('Rapor oluşturulurken hata oluştu', 'error');
    }
}

function createTermReportHTML(report) {
    const { donem, ogrenciler, istatistikler } = report;

    return `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <title>Dönem Raporu - ${donem.donem_numara}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
                .stat-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .completed { color: green; }
                .missing { color: red; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>GÜVENLİK OKULU DÖNEM RAPORU</h1>
                <h2>${donem.donem_turu} Eğitim - Dönem ${donem.donem_numara}</h2>
                <p>Tarih: ${formatDate(donem.donem_baslangic_t)} - ${formatDate(donem.donem_bitis_t)}</p>
                <p>Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <h3>Toplam Öğrenci</h3>
                    <p style="font-size: 24px; font-weight: bold;">${istatistikler.toplam}</p>
                </div>
                <div class="stat-card">
                    <h3>Aktif Öğrenci</h3>
                    <p style="font-size: 24px; font-weight: bold;">${istatistikler.aktif}</p>
                </div>
                <div class="stat-card">
                    <h3>Mezun Öğrenci</h3>
                    <p style="font-size: 24px; font-weight: bold;">${istatistikler.mezun}</p>
                </div>
                <div class="stat-card">
                    <h3>Sınavdan Geçen</h3>
                    <p style="font-size: 24px; font-weight: bold;">${istatistikler.gecenler}</p>
                </div>
                <div class="stat-card">
                    <h3>Ortalama Puan</h3>
                    <p style="font-size: 24px; font-weight: bold;">${istatistikler.ortalamaPuan}</p>
                </div>
                <div class="stat-card">
                    <h3>Toplam Ödeme</h3>
                    <p style="font-size: 24px; font-weight: bold;">${istatistikler.toplamOdeme}₺</p>
                </div>
            </div>
            
            <h3>Öğrenci Listesi</h3>
            <table>
                <thead>
    <tr>
        <th>Sıra</th>
        <th>Ad Soyad</th>
        <th>TC Kimlik</th>
        <th>Telefon</th>
        <th>Eğitim Tipi</th>  <!-- Durum yerine -->
        <th>Belge Durumu</th>
        <th>Sınav Puanı</th>
        <th>Ödeme</th>
    </tr>
</thead>
                <tbody>
                    ${ogrenciler.map((student, index) => {
        const belgeler = [
            student.ogr_gerek_foto,
            student.ogr_gerek_diploma,
            student.ogr_gerek_kimlik,
            student.ogr_gerek_yakakarti,
            student.ogr_gerek_saglik,
            student.ogr_gerek_ikamet
        ];
        const tamamlanan = belgeler.filter(b => b === 1).length;
        const belgeOrani = Math.round((tamamlanan / belgeler.length) * 100);

        return `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${student.ogr_ad} ${student.ogr_soyad}</td>
                                <td>${student.ogr_TC}</td>
                                <td>${student.ogr_ceptel}</td>
                                <td>
    <span class="education-type-badge ${(student.ogr_silah_durum || 'belirtilmedi').toLowerCase().replace('ı', 'i').replace('ş', 's')}">
        ${student.ogr_silah_durum === 'Silahlı' ? '🛡️ Silahlı' :
                student.ogr_silah_durum === 'Silahsız' ? '👤 Silahsız' :
                    'Belirtilmedi'}
    </span>
</td>
                                <td>${belgeOrani}%</td>
                                <td>${student.ogr_sinav_puan || '-'}</td>
                                <td>${student.ogr_odeme || 0}₺</td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;
}

async function refreshTermInfo(termId) {
    try {
        // Dönem bilgilerini yeniden getir
        const termInfo = await window.db.getDonemById(termId);

        if (termInfo) {
            // Sayfadaki dönem bilgilerini güncelle
            updateTermInfoDisplay(termInfo);

            // Ücret ve istatistik bilgilerini güncelle
            updateTermStatistics(termInfo);
        }
    } catch (error) {
        console.error('Dönem bilgileri güncellenirken hata:', error);
    }
}

function updateTermInfoDisplay(termInfo) {
    // Öğrenci sayısını güncelle
    const studentCountElements = document.querySelectorAll('[data-student-count]');
    studentCountElements.forEach(el => {
        el.textContent = termInfo.donem_ogr_adedi || 0;
    });

    // Ücret bilgilerini güncelle
    const totalFeeElements = document.querySelectorAll('[data-total-fee]');
    totalFeeElements.forEach(el => {
        const totalFee = (termInfo.donem_ogr_adedi || 0) * (termInfo.donem_ucret || 0);
        el.textContent = `${totalFee}₺`;
    });
}

// =============================================================================
// YENİ FONKSİYONLARI ANA SİSTEME ENTEGRE ETME
// =============================================================================

// Mevcut loadTermStudents fonksiyonunu güncelle
window.loadTermStudents = async function (termId) {
    console.log('📚 Gelişmiş öğrenci yükleme başlatılıyor...', termId);

    const loadingDiv = document.getElementById('students-loading');
    const tableDiv = document.getElementById('students-table');
    const emptyDiv = document.getElementById('students-empty');

    // Loading göster
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (tableDiv) tableDiv.style.display = 'none';
    if (emptyDiv) emptyDiv.style.display = 'none';

    try {
        // YENİ: Ödeme bilgileriyle birlikte öğrencileri getir
        const students = await window.db.getOgrencilerWithPayments(termId);

        setTimeout(() => {
            if (students && students.length > 0) {
                // Tablo başlığını güncelle
                updateStudentsTableHeader();

                // Öğrencileri render et
                renderStudentsTableEnhanced(students);

                if (loadingDiv) loadingDiv.style.display = 'none';
                if (tableDiv) tableDiv.style.display = 'block';
                if (emptyDiv) emptyDiv.style.display = 'none';

                setupEnhancedFilters();
                updateStudentStatistics(termId);

            } else {
                if (loadingDiv) loadingDiv.style.display = 'none';
                if (tableDiv) tableDiv.style.display = 'none';
                if (emptyDiv) emptyDiv.style.display = 'block';
            }
        }, 100);

    } catch (error) {
        console.error('❌ Öğrenci yükleme hatası:', error);
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (tableDiv) tableDiv.style.display = 'none';
        if (emptyDiv) emptyDiv.style.display = 'block';
    }
};

console.log('✅ Öğrenci düzenleme sistemi tamamen entegre edildi!');

// 1. addStudentDatePickerStyles fonksiyonu
function addStudentDatePickerStyles() {
    const studentDatePickerCSS = `
        /* Öğrenci doğum tarihi picker için özel stiller */
        #studentBirthDate,
        #editStudentBirthDate,
        #donemDetailBirthDate {
            cursor: pointer;
            background-color: #ffffff;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'%3e%3c/path%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right 12px center;
            background-size: 16px;
            padding-right: 40px;
        }

        #studentBirthDate:focus,
        #editStudentBirthDate:focus,
        #donemDetailBirthDate:focus {
            border-color: #16a34a;
            box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
        }

        /* Flatpickr override for student forms */
        .flatpickr-calendar.student-birth-date {
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            border: 1px solid #e5e7eb;
        }

        .flatpickr-calendar.student-birth-date .flatpickr-day.selected {
            background: #16a34a;
            border-color: #16a34a;
        }

        .flatpickr-calendar.student-birth-date .flatpickr-day.selected:hover {
            background: #15803d;
            border-color: #15803d;
        }
    `;

    const existingStyle = document.getElementById('student-date-picker-styles');
    if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'student-date-picker-styles';
        style.textContent = studentDatePickerCSS;
        document.head.appendChild(style);
    }
}

// 2. handleStudentSubmit fonksiyonu
async function handleStudentSubmit(e) {
    e.preventDefault();

    console.log('📝 Öğrenci form gönderiliyor...');

    const form = e.target;
    const formData = new FormData(form);

    // Flatpickr tarihini database formatına çevir
    const birthDateInput = document.getElementById('studentBirthDate');
    if (birthDateInput && birthDateInput.value) {
        const birthDateValue = birthDateInput.value; // "dd.mm.yyyy" formatında
        const databaseDate = formatDateForDatabase(birthDateValue);
        formData.set('ogr_dogum_tarihi', databaseDate);
        console.log('📅 Doğum tarihi dönüştürüldü:', birthDateValue, '=>', databaseDate);
    }

    // Form verilerini nesneye dönüştür
    const studentData = {};
    for (let [key, value] of formData.entries()) {
        studentData[key] = value;
    }

    console.log('📊 Gönderilecek öğrenci verisi:', studentData);

    // Basit validasyon
    const errors = [];
    if (!studentData.ogr_ad) errors.push('Ad alanı zorunludur');
    if (!studentData.ogr_soyad) errors.push('Soyad alanı zorunludur');
    if (!studentData.ogr_TC) errors.push('TC Kimlik numarası zorunludur');
    if (!studentData.ogr_turu) errors.push('Eğitim türü seçimi zorunludur');

    if (errors.length > 0) {
        showNotification(errors.join(', '), 'error');
        return;
    }

    // Loading durumu
    const submitBtn = form.querySelector('button[type="submit"]') || document.querySelector('button[form="studentForm"]');
    if (submitBtn) {
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';

        try {
            // Veritabanına kaydet
            const result = await window.db.addOgrenciEnhanced(studentData);

            if (result && !result.error) {
                showNotification('Öğrenci başarıyla kaydedildi!', 'success');

                // Başarı animasyonu
                showStudentSuccessAnimation();

                // 1.5 saniye sonra modal'ı kapat ve listeyi yenile
                setTimeout(() => {
                    closeStudentModal();

                    // Eğer dönem detay sayfasındaysak, öğrenci listesini yenile
                    if (appState.activeTab === 'term-detail' && appState.currentTermId) {
                        loadTermStudents(appState.currentTermId);
                    }

                    // Dönem verilerini ve istatistikleri yenile
                    loadTermsFromDatabase();
                }, 1500);

            } else {
                throw new Error(result?.error || 'Bilinmeyen hata');
            }

        } catch (error) {
            console.error('❌ Öğrenci kaydetme hatası:', error);
            showNotification('Öğrenci kaydedilirken hata oluştu: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

// 3. showStudentSuccessAnimation fonksiyonu
function showStudentSuccessAnimation() {
    const modal = document.getElementById('addStudentModal');
    if (!modal) return;

    const successElement = document.createElement('div');
    successElement.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
        color: white;
        padding: 24px 32px;
        border-radius: 16px;
        text-align: center;
        opacity: 0;
        animation: successPulse 2s ease-in-out;
        box-shadow: 0 10px 25px rgba(22, 163, 74, 0.3);
        z-index: 20000;
    `;

    successElement.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 32px; margin-bottom: 12px;"></i>
        <br>
        <strong style="font-size: 18px;">Başarılı!</strong><br>
        <span style="font-size: 14px;">Öğrenci kaydedildi</span>
    `;

    modal.appendChild(successElement);

    setTimeout(() => {
        successElement.remove();
    }, 2000);
}

// 5. student-edit.js'teki hatalı button referansını düzelt
// handleEditStudentFormSubmit fonksiyonundaki updateStudentBtn hatası için:
function fixEditStudentButtonReference() {
    // Bu fonksiyonu student-edit.js'te çağırın veya default.js'ye taşıyın
    const originalFunction = window.handleEditStudentFormSubmit;

    async function handleEditStudentFormSubmit(e) {
        e.preventDefault();

        console.log('📤 Edit form submit başlıyor...');

        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]') ||
            document.querySelector('button[form="editStudentForm"]') ||
            document.querySelector('#editStudentModal .btn-primary');

        if (!submitBtn) {
            console.error('❌ Submit button bulunamadı');
            return;
        }

        const originalText = submitBtn.innerHTML;

        // Loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Güncelleniyor...';

        try {
            const formData = new FormData(form);

            // Flatpickr tarihini güvenli şekilde database formatına çevir
            const birthDateInput = document.getElementById('editStudentBirthDate');
            let processedBirthDate = null;

            if (birthDateInput && isValidDateString(birthDateInput.value)) {
                const birthDateValue = birthDateInput.value.trim(); // "dd.mm.yyyy" formatında
                processedBirthDate = formatDateForDatabase(birthDateValue);

                console.log('📅 Doğum tarihi işlendi:', {
                    input: birthDateValue,
                    output: processedBirthDate
                });
            }

            // Form verilerini güvenli şekilde nesneye dönüştür
            const studentData = {};
            for (let [key, value] of formData.entries()) {
                if (key !== 'student_id') {
                    if (key === 'ogr_dogum_tarihi') {
                        studentData[key] = processedBirthDate;
                    } else {
                        // Diğer alanlar için güvenli dönüştürme
                        studentData[key] = (value && typeof value === 'string' && value.trim() !== '') ? value.trim() : null;
                    }
                }
            }

            const studentId = formData.get('student_id');

            console.log('📊 İşlenmiş öğrenci verisi:', {
                id: studentId,
                dogumTarihi: studentData.ogr_dogum_tarihi,
                toplam: Object.keys(studentData).length
            });

            // Validasyon
            if (!await validateEditStudentForm(studentData)) {
                return;
            }

            // Veritabanına güncelle
            const result = await window.db.updateOgrenci(studentId, studentData);

            if (result && !result.error) {
                showNotification('Öğrenci bilgileri başarıyla güncellendi!', 'success');

                // Başarı animasyonu
                showEditSuccessAnimation();

                // 1.5 saniye sonra modal'ı kapat ve listeyi yenile
                setTimeout(() => {
                    closeEditStudentModal();

                    // Eğer dönem detay sayfasındaysak, öğrenci listesini yenile
                    if (window.appState && window.appState.activeTab === 'term-detail' && window.appState.currentTermId) {
                        window.loadTermStudents(window.appState.currentTermId);
                    }

                    // Detay modalı açıksa onu da yenile
                    const detailModal = document.getElementById('studentDetailModal');
                    if (detailModal) {
                        window.closeStudentDetailModal();
                        setTimeout(() => {
                            window.viewStudentDetails(studentId);
                        }, 500);
                    }

                }, 1500);

            } else {
                throw new Error(result?.error || 'Bilinmeyen hata');
            }

        } catch (error) {
            console.error('❌ Öğrenci güncelleme hatası:', error);
            showNotification('Öğrenci güncellenirken hata oluştu: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

// 6. showEditSuccessAnimation fonksiyonu
function showEditSuccessAnimation() {
    const modal = document.getElementById('editStudentModal');
    if (!modal) return;

    const successElement = document.createElement('div');
    successElement.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: white;
        padding: 24px 32px;
        border-radius: 16px;
        text-align: center;
        opacity: 0;
        animation: successPulse 2s ease-in-out;
        box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3);
        z-index: 20000;
    `;

    successElement.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 32px; margin-bottom: 12px;"></i>
        <br>
        <strong style="font-size: 18px;">Güncellendi!</strong><br>
        <span style="font-size: 14px;">Değişiklikler kaydedildi</span>
    `;

    modal.appendChild(successElement);

    setTimeout(() => {
        successElement.remove();
    }, 2000);
}

function fillTermInfoInModal(termId) {
    const term = termsData.find(t => t.id == termId);
    if (!term) return;

    // Eğitim türü select'i al
    const turSelect = document.querySelector('#addStudentModal select[name="ogr_turu"]');
    if (turSelect) {
        turSelect.innerHTML = ''; // önce boşalt

        if (term.donem_turu === 'Temel') {
            // Eğer dönem "Temel Eğitim" ise
            turSelect.innerHTML = `
                <option value="Temel">Temel Eğitim</option>
                <option value="Silah Fark">Silah Fark Eğitimi</option>
            `;
        } else if (term.donem_turu === 'Yenileme') {
            // Eğer dönem "Yenileme" ise
            turSelect.innerHTML = `
                <option value="Yenileme" selected>Yenileme Eğitimi</option>
            `;
            turSelect.disabled = true; // kullanıcı değiştiremesin
        } else {
            // Varsayılan (her ihtimale karşı)
            turSelect.innerHTML = `
                <option value="Temel">Temel Eğitim</option>
                <option value="Yenileme">Yenileme Eğitimi</option>
                <option value="Silah Fark">Silah Fark Eğitimi</option>
            `;
        }
    }
}


window.applyEnhancedStudentFilters = async function () {
    if (!appState.currentTermId) return;

    try {
        console.log('🔍 Filtreler uygulanıyor:', window.enhancedStudentFilters);

        // Silah durumu filtresini düzelt
        let silahFilter = null;
        const silahValue = window.enhancedStudentFilters.silah;

        if (silahValue && silahValue !== 'all' && silahValue !== '') {
            silahFilter = silahValue; // Değer değiştirmeden direkt kullan
        }

        console.log(`🔧 Silah filtresi: "${silahValue}" → "${silahFilter}"`);

        // Ana arama fonksiyonunu çağır
        let students = await window.db.searchOgrencilerAdvanced(
            window.enhancedStudentFilters.search || '',
            appState.currentTermId,
            window.enhancedStudentFilters.status === '' || window.enhancedStudentFilters.status === 'all' ? null : window.enhancedStudentFilters.status,
            window.enhancedStudentFilters.documents === '' || window.enhancedStudentFilters.documents === 'all-docs' ? null : window.enhancedStudentFilters.documents,
            silahFilter
        );

        if (!students) students = [];

        console.log(`✅ Filtreleme sonucu: ${students.length} öğrenci bulundu`);

        // Debug: Öğrencilerin silah durumlarını logla
        if (silahFilter) {
            console.log('📋 Filtrelenen öğrenciler:');
            students.forEach((s, i) => {
                console.log(`${i + 1}. ${s.ogr_ad} ${s.ogr_soyad} - Silah: "${s.ogr_silah_durum}"`);
            });
        }

        // Tabloyu güncelle
        if (window.renderStudentsTableEnhanced) {
            window.renderStudentsTableEnhanced(students);
        } else if (window.renderStudentsTable) {
            window.renderStudentsTable(students);
        }

    } catch (error) {
        console.error('⚠️ Filtreleme hatası:', error);
        showNotification('Filtreleme sırasında hata oluştu', 'error');
    }
};

function setupEnhancedFilters() {
    // Eğer zaten kurulduysa tekrar kurma
    if (window.enhancedFiltersSetup) {
        console.log('⏭️ Filtreler zaten kurulu, atlaniyor...');
        return;
    }

    setTimeout(() => {
        console.log('🔧 Gelişmiş filtre kurulumu başlıyor...');

        // Arama inputu için event listener
        const searchInput = document.getElementById('studentSearch');
        if (searchInput) {
            // Önce eski listener'ları temizle
            searchInput.removeEventListener('input', window.searchInputHandler);

            // Yeni handler tanımla
            window.searchInputHandler = function (e) {
                window.enhancedStudentFilters.search = e.target.value;

                // Debounce ile arama yap
                clearTimeout(window.searchTimeout);
                window.searchTimeout = setTimeout(() => {
                    window.applyEnhancedStudentFilters();
                }, 300);
            };

            searchInput.addEventListener('input', window.searchInputHandler);
            console.log('✅ Arama input listener kuruldu');
        }

        // Filtre butonları için event listener
        const filterTabs = document.querySelectorAll('.filter-tab[data-type]');
        console.log(`🔍 ${filterTabs.length} filtre butonu bulundu`);

        filterTabs.forEach((button, index) => {
            const filterType = button.dataset.type;
            const filterValue = button.dataset.filter;

            console.log(`🔲 Buton ${index + 1}: type="${filterType}", value="${filterValue}"`);

            // Önce eski listener'ları temizle
            button.removeEventListener('click', button.clickHandler);

            // Yeni handler tanımla
            button.clickHandler = function (e) {
                e.preventDefault();
                e.stopPropagation();

                console.log(`🎯 Filtre buton tıklandı: ${filterType} = ${filterValue}`);

                // Aynı gruptaki diğer butonları pasif yap
                const sameTypeButtons = document.querySelectorAll(`[data-type="${filterType}"]`);
                sameTypeButtons.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'none';
                    b.style.color = '#6b7280';
                    b.style.boxShadow = 'none';
                });

                // Bu butonu aktif yap
                this.classList.add('active');
                this.style.background = 'white';
                this.style.color = '#16a34a';
                this.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';

                // Global state güncelle
                window.enhancedStudentFilters[filterType] = filterValue;

                console.log('📊 Güncellenen filter state:', window.enhancedStudentFilters);

                // Filtrelemeyi uygula
                window.applyEnhancedStudentFilters();
            };

            button.addEventListener('click', button.clickHandler);
        });

        // Silah filtresi olmayan butonlar için (status, documents)
        const otherFilterTabs = document.querySelectorAll('.filter-tab:not([data-type])');
        console.log(`🔍 ${otherFilterTabs.length} diğer filtre butonu bulundu`);

        otherFilterTabs.forEach(button => {
            const filterValue = button.dataset.filter;
            const parentText = button.parentElement.previousElementSibling?.textContent?.toLowerCase() || '';

            let filterType = '';
            if (parentText.includes('durum')) filterType = 'status';
            else if (parentText.includes('belge')) filterType = 'documents';

            if (filterType) {
                // Önce eski listener'ları temizle
                button.removeEventListener('click', button.clickHandler);

                // Yeni handler tanımla
                button.clickHandler = function (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    console.log(`🎯 Diğer filtre tıklandı: ${filterType} = ${filterValue}`);

                    // Aynı gruptaki diğer butonları pasif yap
                    this.parentElement.querySelectorAll('.filter-tab').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'none';
                        b.style.color = '#6b7280';
                        b.style.boxShadow = 'none';
                    });

                    // Bu butonu aktif yap
                    this.classList.add('active');
                    this.style.background = 'white';
                    this.style.color = '#16a34a';
                    this.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';

                    // Global state güncelle
                    window.enhancedStudentFilters[filterType] = filterValue;

                    console.log('📊 Güncellenen filter state:', window.enhancedStudentFilters);

                    // Filtrelemeyi uygula
                    window.applyEnhancedStudentFilters();
                };

                button.addEventListener('click', button.clickHandler);
            }
        });

        console.log('✅ Tüm filtre event listener\'ları kuruldu');

        // Kurulum bayrağını ayarla
        window.enhancedFiltersSetup = true;

    }, 500);
}

function resetFiltersOnPageChange() {
    // Sadece terms sayfasından çıkılırken filtreleri sıfırla
    window.enhancedStudentFilters = {
        search: '',
        status: 'all',
        documents: 'all-docs',
        silah: 'all'
    };
    window.enhancedFiltersSetup = false;
    window.filtersInitialized = false;
}

const originalShowPage = window.showPage;
window.showPage = function (pageId, ...args) {
    // Eğer terms sayfasından çıkılıyorsa filtreleri sıfırla
    if (window.currentPage === 'term-detail' && pageId !== 'term-detail') {
        resetFiltersOnPageChange();
    }

    // Orijinal fonksiyonu çalıştır
    originalShowPage(pageId, ...args);
};

// =============================================================================
// SAYFA YÜKLENDİĞİNDE ÇALIŞACAK FONKSİYONLAR
// =============================================================================

// Mevcut DOMContentLoaded event listener'ına ekleme yapın
document.addEventListener('DOMContentLoaded', function () {

    addStudentDatePickerStyles();

    fixEditStudentButtonReference();

    console.log('✅ Eksik fonksiyonlar düzeltildi ve eklendi!');

    // Gelişmiş öğrenci yönetimi fonksiyonlarını etkinleştir
    console.log('🎓 Gelişmiş öğrenci yönetim sistemi aktif!');

    // Global fonksiyonları tanımla
    window.openAddStudentModal = openAddStudentModal;
    window.closeStudentModal = closeStudentModal;
    window.toggleDocumentInTable = toggleDocumentInTable;
    window.viewStudentDetails = viewStudentDetails;
    window.editStudentDetails = editStudentDetails;
    window.deleteStudentConfirm = deleteStudentConfirm;
    window.exportStudentsToCSV = exportStudentsToCSV;
    window.generateTermReport = generateTermReport;
    window.updateExamScore = updateExamScore;
    window.bulkUpdateDocuments = bulkUpdateDocuments;
    window.bulkUpdateStatus = bulkUpdateStatus;
    window.initializeStudentBirthDatePicker = initializeStudentBirthDatePicker;
    window.initializeEditStudentBirthDatePicker = initializeEditStudentBirthDatePicker;
    window.testStudentDatePicker = testStudentDatePicker;
    window.addStudentDatePickerStyles = addStudentDatePickerStyles;
    window.handleStudentSubmit = handleStudentSubmit;
    window.showStudentSuccessAnimation = showStudentSuccessAnimation;
    window.formatDateForDatabase = formatDateForDatabase;
    window.fixEditStudentButtonReference = fixEditStudentButtonReference;
    window.showEditSuccessAnimation = showEditSuccessAnimation;

    window.fillTermInfoInModal = fillTermInfoInModal;
    window.toggleDocumentCheck = toggleDocumentCheck;
    window.handleStudentFormSubmit = handleStudentFormSubmit;
    window.formatDateForDisplay = formatDateForDisplay;

    window.handleEditStudentFormSubmit = handleEditStudentFormSubmit;
    window.createAdvancedStudentModalHTML = createAdvancedStudentModalHTML;
    window.setupAdvancedStudentModalEvents = setupAdvancedStudentModalEvents;
    window.calculateExamResult = calculateExamResult;

    window.isValidDateString = isValidDateString;
    window.closeEditStudentModal = closeEditStudentModal;
});

console.log('🚀 Gelişmiş öğrenci yönetim sistemi hazır - Tüm özellikler aktif!');

//
// DEBUG TEST

// 1. Mevcut silah durumlarını kontrol et
async function debugSilahDurumlari() {
    try {
        const query = `
            SELECT DISTINCT ogr_silah_durum, COUNT(*) as count 
            FROM ogrenciler 
            WHERE ogr_donem = ? 
            GROUP BY ogr_silah_durum
        `;

        const result = await window.db.runQuery(query, [appState.currentTermId]);

        console.log('📊 Mevcut silah durumları:');
        result.forEach(row => {
            console.log(`- "${row.ogr_silah_durum}": ${row.count} öğrenci`);
        });

        return result;

    } catch (error) {
        console.error('❌ Debug hatası:', error);
    }
}

// 2. Tüm öğrencilerin silah durumlarını detaylı göster
async function showAllStudentsSilahDurum() {
    try {
        const students = await window.db.getOgrencilerByDonem(appState.currentTermId);

        console.log('👥 Tüm öğrencilerin silah durumları:');
        students.forEach((student, index) => {
            console.log(`${index + 1}. ${student.ogr_ad} ${student.ogr_soyad} - Silah: "${student.ogr_silah_durum}"`);
        });

        return students;

    } catch (error) {
        console.error('❌ Öğrenci listesi hatası:', error);
    }
}

// 3. Filtreleme state'ini kontrol et
function checkFilterState() {
    console.log('🔍 Mevcut filter state:', window.enhancedStudentFilters);

    // Silah butonlarını kontrol et
    const silahButtons = document.querySelectorAll('[data-type="silah"]');
    console.log('🔲 Silah filter butonları:');
    silahButtons.forEach(button => {
        console.log(`- "${button.dataset.filter}" - Aktif: ${button.classList.contains('active')}`);
    });
}

// 4. Filtreleme fonksiyonunu test et
async function testFilterFunction(silahValue) {
    console.log(`🧪 "${silahValue}" filtresi test ediliyor...`);

    // State'i manuel olarak ayarla
    window.enhancedStudentFilters.silah = silahValue;

    // Filtrelemeyi çalıştır
    await window.applyEnhancedStudentFilters();

    console.log('✅ Test tamamlandı');
}

// Bu komutları console'da sırayla çalıştırın:
console.log('🔧 Debug komutları hazır! Şimdi şunları çalıştırın:');
console.log('1. debugSilahDurumlari()');
console.log('2. showAllStudentsSilahDurum()');
console.log('3. checkFilterState()');
console.log('4. testFilterFunction("SilahlÄ±")');
console.log('5. testFilterFunction("SilahsÄ±z")');

// Cakisan fonk iyilestirme

const originalApplyStudentFilters = applyStudentFilters;
window.applyStudentFilters = function () {
    // Gelişmiş filtreleme aktifse eski sistemi kullanma
    if (window.enhancedStudentFilters && appState.currentTermId) {
        console.log('⏭️ Eski filtreleme sistemi atlanıyor, gelişmiş sistem aktif');
        return;
    }

    // Eğer gelişmiş sistem aktif değilse eski sistemi kullan
    return originalApplyStudentFilters.apply(this, arguments);
};

// 2. setupStudentFilters fonksiyonunu da devre dışı bırak
const originalSetupStudentFilters = setupStudentFilters;
window.setupStudentFilters = function () {
    // Gelişmiş filtreleme aktifse eski sistemi kurma
    if (window.enhancedStudentFilters) {
        console.log('⏭️ Eski filtre kurulumu atlanıyor, gelişmiş sistem aktif');
        return;
    }

    return originalSetupStudentFilters.apply(this, arguments);
};

// Payments page functions
window.openAddPaymentModal = function () {
    console.log('Ödeme ekleme modalı açılacak');
    showNotification('Ödeme ekleme özelliği yakında gelecek', 'info');
};

// Ödeme tablosunu render et
function renderPaymentsTable(payments) {
    const tbody = document.querySelector('#payments-content .payments-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!payments || payments.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="9" style="text-align: center; padding: 40px; color: #6b7280;">
                <i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; color: #d1d5db; display: block;"></i>
                <strong>Ödeme bulunamadı</strong><br>
                Filtreleri değiştirerek tekrar deneyin.
            </td>
        `;
        tbody.appendChild(emptyRow);
        return;
    }

    payments.forEach(payment => {
        const row = createPaymentRow(payment);
        tbody.appendChild(row);
    });
}

// Ödeme satırı oluştur
function createPaymentRow(payment) {
    const row = document.createElement('tr');
    const initials = (payment.ogr_ad?.charAt(0) || '') + (payment.ogr_soyad?.charAt(0) || '');

    // Durum badge'i
    const statusBadge = getPaymentStatusBadge(payment.durum);

    // Ödeme türü badge'i
    const typeBadge = getPaymentTypeBadge(payment.odeme_turu);

    row.innerHTML = `
        <td>
            <div class="student-info">
                <div class="student-avatar">${initials}</div>
                <div class="student-details">
                    <h4>${payment.ogr_ad} ${payment.ogr_soyad}</h4>
                    <p>TC: ${payment.ogr_TC}</p>
                </div>
            </div>
        </td>
        <td>
            <div class="term-info">
                <strong>${payment.donem_numara}</strong><br>
                <small>${payment.donem_turu}</small>
            </div>
        </td>
        <td>
            <div class="amount-display">
                <strong>₺${parseFloat(payment.odenen_tutar || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong>
            </div>
        </td>
        <td>${formatDate(payment.odeme_tarihi)}</td>
        <td>
            <span class="payment-method-badge ${payment.odeme_yontemi}">
                ${getPaymentMethodText(payment.odeme_yontemi)}
            </span>
        </td>
        <td>${typeBadge}</td>
        <td>
            <div class="notes-cell">
                ${payment.notlar ? `<span title="${payment.notlar}">${payment.notlar.substring(0, 30)}${payment.notlar.length > 30 ? '...' : ''}</span>` : '-'}
            </div>
        </td>
        <td>
            <div class="table-actions-cell">
                <button class="action-btn view" onclick="viewPaymentHistory(${payment.ogr_id})" title="Ödeme Geçmişi">
                    <i class="fas fa-history"></i>
                </button>
                <button class="action-btn edit" onclick="editPaymentFromPaymentsPage(${payment.id})" title="Düzenle">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deletePaymentFromPaymentsPage(${payment.id})" title="Ödeme Kaldır">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;

    return row;
}

// Ödeme sil
window.deletePayment = async function (paymentId) {
    const payment = allPayments.find(p => p.id === paymentId);
    if (!payment) {
        showNotification('Ödeme bulunamadı', 'error');
        return;
    }

    const confirmed = confirm(`${payment.ogr_ad} ${payment.ogr_soyad} isimli öğrencinin ₺${parseFloat(payment.odenen_tutar).toLocaleString('tr-TR')} tutarındaki ödemesini kaldırmak istediğinizden emin misiniz?`);

    if (confirmed) {
        try {
            const result = await window.db.deleteOdeme(paymentId);

            if (result && !result.error) {
                showNotification('Ödeme başarıyla kaldırıldı', 'success');
                loadPayments(); // Listeyi yenile
            } else {
                showNotification('Ödeme kaldırılırken hata oluştu', 'error');
            }
        } catch (error) {
            console.error('Ödeme silinirken hata:', error);
            showNotification('Ödeme kaldırılırken hata oluştu', 'error');
        }
    }
};

// Ödeme durumu badge'i
function getPaymentStatusBadge(durum) {
    const badges = {
        'odendi': '<span class="status-badge paid"><i class="fas fa-check"></i> Ödendi</span>',
        'bekliyor': '<span class="status-badge pending"><i class="fas fa-clock"></i> Bekliyor</span>',
        'geciken': '<span class="status-badge overdue"><i class="fas fa-exclamation-triangle"></i> Geciken</span>'
    };
    return badges[durum] || '<span class="status-badge pending">Bekliyor</span>';
}

// Ödeme türü badge'i
function getPaymentTypeBadge(turu) {
    const badges = {
        'pesin': '<span class="type-badge pesin">Peşin</span>',
        'taksit': '<span class="type-badge taksit">Taksit</span>',
        'kurs_ucreti': '<span class="type-badge kurs">Kurs Ücreti</span>'
    };
    return badges[turu] || '<span class="type-badge default">Ödeme</span>';
}

console.log('✅ Ödemeler sayfası butonları Faz 3 fonksiyonlarına bağlandı!');

// Ödeme yöntemi metni
function getPaymentMethodText(yontem) {
    const methods = {
        'nakit': 'Nakit',
        'kart': 'Kart',
        'havale': 'Havale'
    };
    return methods[yontem] || yontem;
}


// Yardımcı fonksiyonlar
function getPaymentStatus(payment) {
    const kalan = payment.kalan_borc || 0;
    const odenen = payment.toplam_odenen || 0;

    if (kalan <= 0) return 'paid';
    if (odenen > 0) return 'partial';
    return 'pending';
}

function getPaymentStatusText(status) {
    const texts = {
        'paid': 'Tamamlandı',
        'partial': 'Kısmi Ödendi',
        'pending': 'Bekliyor'
    };
    return texts[status] || 'Bekliyor';
}

function getPaymentStatusClass(status) {
    const classes = {
        'paid': 'paid',
        'partial': 'pending',
        'pending': 'overdue'
    };
    return classes[status] || 'overdue';
}

// Flatpickr tarih seçiciyi başlat
function initializePaymentDatePickers() {
    paymentsDatePicker = flatpickr("#dateRange", {
        locale: "tr",
        dateFormat: "d.m.Y",
        mode: "range",
        allowInput: false,
        clickOpens: true,
        disableMobile: false,
        monthSelectorType: "dropdown",
        yearSelectorType: "dropdown",
        showMonths: 1,
        animate: true,
        theme: "material_green",
        placeholder: "Tarih aralığı seçin...",
        onReady: function (selectedDates, dateStr, instance) {
            instance.input.placeholder = "Tarih aralığı seçin...";
        },
        onChange: function (selectedDates, dateStr, instance) {
            applyPaymentFilters();
        }
    });

    return paymentsDatePicker;
}

// Filtreleri uygula
function applyPaymentFilters() {
    const studentSearch = document.getElementById('studentSearch')?.value.toLowerCase() || '';
    const termFilter = document.getElementById('termFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const paymentTypeFilter = document.getElementById('paymentTypeFilter')?.value || '';
    const paymentMethodFilter = document.getElementById('paymentMethodFilter')?.value || '';
    const dateRange = document.getElementById('dateRange')?.value || '';

    filteredPayments = allPayments.filter(payment => {
        // Öğrenci arama
        if (studentSearch) {
            const fullName = `${payment.ogr_ad} ${payment.ogr_soyad}`.toLowerCase();
            const firstName = payment.ogr_ad.toLowerCase();
            const lastName = payment.ogr_soyad.toLowerCase();
            const tcNo = payment.ogr_TC;

            // Arama terimi tam isimde, sadece isimde, sadece soyisimde veya TC'de var mı?
            const matchesSearch =
                fullName.includes(studentSearch) ||           // "sedat ozdemir"
                firstName.includes(studentSearch) ||          // "sedat"
                lastName.includes(studentSearch) ||           // "ozdemir"
                tcNo.includes(studentSearch);                 // TC numarası

            if (!matchesSearch) {
                return false;
            }
        }

        // Dönem filtresi
        if (termFilter && payment.donem_numara !== termFilter) {
            return false;
        }

        // Durum filtresi
        if (statusFilter && payment.durum !== statusFilter) {
            return false;
        }

        // Ödeme türü filtresi
        if (paymentTypeFilter && payment.odeme_turu !== paymentTypeFilter) {
            return false;
        }

        // Ödeme yöntemi filtresi
        if (paymentMethodFilter && payment.odeme_yontemi !== paymentMethodFilter) {
            return false;
        }

        // Tarih aralığı filtresi
        if (dateRange && paymentsDatePicker) {
            const selectedDates = paymentsDatePicker.selectedDates;
            if (selectedDates.length === 2) {
                const paymentDate = new Date(payment.odeme_tarihi);
                const startDate = selectedDates[0];
                const endDate = selectedDates[1];

                if (paymentDate < startDate || paymentDate > endDate) {
                    return false;
                }
            }
        }

        return true;
    });

    renderPaymentsTable(filteredPayments);
    updatePaymentsCount();
}

// Loading durumunu göster/gizle
function showPaymentsLoading(show) {
    const loadingDiv = document.getElementById('payments-loading');
    const tableDiv = document.querySelector('#payments-content .payments-table-section');
    const emptyDiv = document.getElementById('payments-empty');

    if (show) {
        if (!loadingDiv) {
            const loading = document.createElement('div');
            loading.id = 'payments-loading';
            loading.className = 'payments-loading';
            loading.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                Ödemeler yükleniyor...
            `;
            const container = document.getElementById('payments-content');
            container.appendChild(loading);
        } else {
            loadingDiv.style.display = 'flex';
        }

        if (tableDiv) tableDiv.style.display = 'none';
        if (emptyDiv) emptyDiv.style.display = 'none';
    } else {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}

// Boş durum göster
function showPaymentsEmpty() {
    const emptyDiv = document.getElementById('payments-empty');
    const tableDiv = document.querySelector('#payments-content .payments-table-section');

    if (!emptyDiv) {
        const empty = document.createElement('div');
        empty.id = 'payments-empty';
        empty.className = 'empty-state';
        empty.innerHTML = `
            <i class="fas fa-credit-card"></i>
            <h3>Henüz ödeme kaydı yok</h3>
            <p>Öğrenci ödemeleri burada görüntülenecek.</p>
        `;
        const container = document.getElementById('payments-content');
        container.appendChild(empty);
    } else {
        emptyDiv.style.display = 'block';
    }

    if (tableDiv) tableDiv.style.display = 'none';
}

// Hata durumu göster
function showPaymentsError() {
    showNotification('Ödemeler yüklenirken hata oluştu', 'error');
}


// İstatistikleri güncelle
function updatePaymentStats(stats) {
    if (!stats) return;

    const elements = {
        total: document.querySelector('#payments-content .stat-card:nth-child(1) .stat-value'),
        pending: document.querySelector('#payments-content .stat-card:nth-child(2) .stat-value'),
        completed: document.querySelector('#payments-content .stat-card:nth-child(3) .stat-value'),
        overdue: document.querySelector('#payments-content .stat-card:nth-child(4) .stat-value')
    };

    if (elements.total) elements.total.textContent = `₺${parseFloat(stats.toplam_odenen || 0).toLocaleString('tr-TR')}`;
    if (elements.pending) elements.pending.textContent = `₺${parseFloat(stats.bekleyen_tutar || 0).toLocaleString('tr-TR')}`;
    if (elements.completed) elements.completed.textContent = `₺${parseFloat(stats.toplam_odenen || 0).toLocaleString('tr-TR')}`;
    if (elements.overdue) elements.overdue.textContent = `${stats.geciken_sayisi || 0}`;
}


// Filtreleri temizle
function clearPaymentFilters() {
    document.getElementById('studentSearch').value = '';
    document.getElementById('termFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('paymentTypeFilter').value = '';
    document.getElementById('paymentMethodFilter').value = '';
    document.getElementById('dateRange').value = '';

    if (paymentsDatePicker) {
        paymentsDatePicker.clear();
    }

    filteredPayments = [...allPayments];
    renderPaymentsTable(filteredPayments);
    updatePaymentsCount();
}

// Ödeme geçmişini görüntüle
window.viewPaymentHistory = async function (studentId) {
    try {
        console.log('📄 Ödeme geçmişi açılıyor...', studentId);

        // Öğrenci bilgilerini getir
        const student = await window.db.getOgrenciById(studentId);
        if (!student) {
            showNotification('Öğrenci bulunamadı', 'error');
            return;
        }

        // Faz 3'te yaptığımız tam ödeme modalını aç
        await window.openPaymentModal(studentId);

        // Modal açıldıktan sonra geçmiş tabına geç
        setTimeout(() => {
            window.switchPaymentTab('history');
        }, 300);

    } catch (error) {
        console.error('❌ Ödeme geçmişi hatası:', error);
        showNotification('Ödeme geçmişi açılırken hata oluştu', 'error');
    }
};

window.editPaymentFromPaymentsPage = async function (paymentId) {
    try {
        console.log('✏️ Ödeme düzenleniyor...', paymentId);

        // Ödeme bilgilerini bul
        const payment = allPayments.find(p => p.id === paymentId);
        if (!payment) {
            showNotification('Ödeme bulunamadı', 'error');
            return;
        }

        // Öğrenci ID'sini al
        const studentId = payment.ogr_id;

        // Tam ödeme modalını aç
        await window.openPaymentModal(studentId);

        // Modal açıldıktan sonra geçmiş tabına geç
        setTimeout(() => {
            window.switchPaymentTab('history');

            // Biraz daha bekle ve düzenleme modalını aç
            setTimeout(() => {
                window.editPayment(paymentId);
            }, 500);
        }, 300);

    } catch (error) {
        console.error('❌ Ödeme düzenleme hatası:', error);
        showNotification('Ödeme düzenleme açılırken hata oluştu', 'error');
    }
};

window.deletePaymentFromPaymentsPage = async function (paymentId) {
    try {
        console.log('🗑️ Ödeme siliniyor...', paymentId);

        // Ödeme bilgilerini bul
        const payment = allPayments.find(p => p.id === paymentId);
        if (!payment) {
            showNotification('Ödeme bulunamadı', 'error');
            return;
        }

        // Onay al
        const confirmed = confirm(`${payment.ogr_ad} ${payment.ogr_soyad} öğrencisinin ₺${parseFloat(payment.odenen_tutar).toLocaleString('tr-TR')} tutarındaki ödemesini silmek istediğinizden emin misiniz?`);

        if (confirmed) {
            // Faz 3'teki silme fonksiyonunu kullan
            const result = await window.db.deleteOdeme(paymentId);

            if (result && !result.error) {
                showNotification('Ödeme başarıyla silindi', 'success');

                // Ödemeler sayfasını yenile
                if (appState.activeTab === 'payments') {
                    await window.loadPayments();
                }

                // Eğer dönem detay sayfası açıksa onu da yenile
                if (appState.currentTermId) {
                    await window.loadTermStudents(appState.currentTermId);
                }
            } else {
                throw new Error(result?.error || 'Silme hatası');
            }
        }

    } catch (error) {
        console.error('❌ Ödeme silme hatası:', error);
        showNotification('Ödeme silinirken hata oluştu', 'error');
    }
};


// Ödeme geçmişi modalını göster
function showPaymentHistoryModal(student, payments) {
    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.odenen_tutar) || 0), 0);
    const expectedAmount = parseFloat(student.ogr_odeme) || 0;
    const remaining = expectedAmount - totalPaid;

    const modalHtml = `
        <div class="modal-overlay" id="paymentHistoryModal" onclick="closeModal(this)">
            <div class="modal-container" style="max-width: 800px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-history"></i> Ödeme Geçmişi</h2>
                    <button class="modal-close" onclick="closeModal(document.getElementById('paymentHistoryModal'))">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <!-- Öğrenci Bilgileri -->
                    <div class="payment-history-header" style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div class="student-avatar" style="width: 50px; height: 50px; font-size: 18px;">
                                ${(student.ogr_ad?.charAt(0) || '') + (student.ogr_soyad?.charAt(0) || '')}
                            </div>
                            <div>
                                <h3 style="margin: 0 0 4px 0; color: #1f2937; font-size: 18px;">${student.ogr_ad} ${student.ogr_soyad}</h3>
                                <p style="margin: 0; color: #6b7280; font-size: 14px;">TC: ${student.ogr_TC}</p>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; margin-top: 20px;">
                            <div style="text-align: center; background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
                                <div style="font-size: 20px; font-weight: 700; color: #059669;">₺${totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Toplam Ödenen</div>
                            </div>
                            <div style="text-align: center; background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
                                <div style="font-size: 20px; font-weight: 700; color: #374151;">₺${expectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Beklenen Tutar</div>
                            </div>
                            <div style="text-align: center; background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
                                <div style="font-size: 20px; font-weight: 700; color: ${remaining <= 0 ? '#059669' : '#dc2626'};">₺${Math.abs(remaining).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">${remaining <= 0 ? 'Fazla Ödeme' : 'Kalan Borç'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Ödeme Tablosu -->
                    <div style="background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
                        <div style="background: #f9fafb; padding: 16px; border-bottom: 1px solid #e5e7eb;">
                            <h4 style="margin: 0; color: #374151; font-size: 16px; font-weight: 600;">
                                <i class="fas fa-list"></i> Ödeme Detayları (${payments.length} adet)
                            </h4>
                        </div>
                        
                        ${payments.length > 0 ? `
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead style="background: #f9fafb;">
                                        <tr>
                                            <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Tarih</th>
                                            <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Tutar</th>
                                            <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Yöntem</th>
                                            <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Not</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${payments.map(payment => `
                                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                                <td style="padding: 12px; font-size: 14px; color: #111827;">${formatDate(payment.odeme_tarihi)}</td>
                                                <td style="padding: 12px; font-size: 14px; font-weight: 600; color: #059669; text-align: right; font-family: monospace;">₺${parseFloat(payment.odenen_tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                                <td style="padding: 12px; text-align: center;">
                                                    <span style="padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd;">
                                                        ${getPaymentMethodText(payment.odeme_yontemi)}
                                                    </span>
                                                </td>
                                                <td style="padding: 12px; font-size: 14px; color: #6b7280;">${payment.notlar || '-'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : `
                            <div style="text-align: center; padding: 40px; color: #6b7280;">
                                <i class="fas fa-receipt" style="font-size: 48px; color: #d1d5db; margin-bottom: 16px; display: block;"></i>
                                <h4 style="margin: 0 0 8px 0; color: #374151;">Henüz ödeme yapılmamış</h4>
                                <p style="margin: 0;">Bu öğrenci için henüz ödeme kaydı bulunmuyor.</p>
                            </div>
                        `}
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal(document.getElementById('paymentHistoryModal'))">
                        <i class="fas fa-times"></i> Kapat
                    </button>
                    <button class="btn btn-primary" onclick="downloadPaymentReport(${student.id}, '${student.ogr_ad}', '${student.ogr_soyad}')">
                        <i class="fas fa-download"></i> Rapor İndir
                    </button>
                    ${remaining > 0 ? `
                        <button class="btn btn-success" onclick="addPaymentForStudent(${student.id})">
                            <i class="fas fa-plus"></i> Ödeme Ekle
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('paymentHistoryModal').style.display = 'flex';
}

// Ödeme ekleme
window.addPayment = function (studentId) {
    console.log('Ödeme ekleniyor:', studentId);
    showNotification('Ödeme ekleme özelliği yakında gelecek', 'info');
};

// Ödeme düzenle
window.editPayment = function (paymentId) {
    const payment = allPayments.find(p => p.id === paymentId || p.ogr_id === paymentId);
    if (payment) {
        showEditPaymentModal(payment);
    } else {
        showNotification('Ödeme bulunamadı', 'error');
    }
};

// Ödeme düzenleme modalını göster
function showEditPaymentModal(payment) {
    const modalHtml = `
        <div class="modal-overlay" id="editPaymentModal" onclick="closeModal(this)">
            <div class="modal-container" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-edit"></i> Ödeme Düzenle</h2>
                    <button class="modal-close" onclick="closeModal(document.getElementById('editPaymentModal'))">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <form id="editPaymentForm" onsubmit="updatePayment(event, ${payment.id || payment.ogr_id})">
                        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                            <h4 style="margin: 0 0 8px 0; color: #374151;">Öğrenci: ${payment.ogr_ad} ${payment.ogr_soyad}</h4>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">TC: ${payment.ogr_TC}</p>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-money-bill"></i> Ödeme Tutarı
                                </label>
                                <input type="number" id="editPaymentAmount" class="form-input" 
                                       value="${payment.odenen_tutar || ''}" min="0" step="0.01" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-calendar"></i> Ödeme Tarihi
                                </label>
                                <input type="date" id="editPaymentDate" class="form-input" 
                                       value="${payment.odeme_tarihi || new Date().toISOString().split('T')[0]}" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-credit-card"></i> Ödeme Yöntemi
                                </label>
                                <select id="editPaymentMethod" class="form-input" required>
                                    <option value="nakit" ${payment.odeme_yontemi === 'nakit' ? 'selected' : ''}>Nakit</option>
                                    <option value="kart" ${payment.odeme_yontemi === 'kart' ? 'selected' : ''}>Kredi/Banka Kartı</option>
                                    <option value="havale" ${payment.odeme_yontemi === 'havale' ? 'selected' : ''}>Havale/EFT</option>
                                    <option value="cek" ${payment.odeme_yontemi === 'cek' ? 'selected' : ''}>Çek</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-sticky-note"></i> Not (Opsiyonel)
                            </label>
                            <textarea id="editPaymentNote" class="form-input" rows="3" 
                                      placeholder="Ödeme ile ilgili not...">${payment.notlar || ''}</textarea>
                        </div>
                    </form>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal(document.getElementById('editPaymentModal'))">
                        <i class="fas fa-times"></i> İptal
                    </button>
                    <button class="btn btn-primary" onclick="document.getElementById('editPaymentForm').requestSubmit()">
                        <i class="fas fa-save"></i> Güncelle
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('editPaymentModal').style.display = 'flex';
}

// Ödemeler sayfasını yükle
window.loadPayments = async function () {
    if (appState.activeTab !== 'payments') return;

    try {
        showPaymentsLoading(true);

        // Backend'den ödemeleri getir
        const payments = await window.db.getOdemeler();
        const stats = await window.db.getPaymentStats();

        if (payments && !payments.error) {
            allPayments = payments;
            filteredPayments = [...allPayments];

            renderPaymentsTable(filteredPayments);
            updatePaymentStats(stats);
            populateTermFilter(); // Dönem filtresini doldur
            updatePaymentsCount();

            // Tabloyu göster
            const tableDiv = document.querySelector('#payments-content .payments-table-section');
            if (tableDiv) tableDiv.style.display = 'block';
        } else {
            showPaymentsEmpty();
        }
    } catch (error) {
        console.error('Ödemeler yüklenirken hata:', error);
        showPaymentsError();
    } finally {
        showPaymentsLoading(false);
    }
};

// Dönem filtresini doldur
function populateTermFilter() {
    const termFilter = document.getElementById('termFilter');
    if (!termFilter) return;

    // Mevcut seçenekleri temizle (ilk option hariç)
    const firstOption = termFilter.firstElementChild;
    termFilter.innerHTML = '';
    termFilter.appendChild(firstOption);

    // Benzersiz dönemleri al
    const uniqueTerms = [...new Set(allPayments.map(p => p.donem_numara))];

    uniqueTerms.sort().forEach(termNumber => {
        const option = document.createElement('option');
        option.value = termNumber;
        option.textContent = termNumber;
        termFilter.appendChild(option);
    });
}

function createPaymentRowAdvanced(payment) {
    const row = document.createElement('tr');
    const initials = (payment.ogr_ad?.charAt(0) || '') + (payment.ogr_soyad?.charAt(0) || '');

    // Ödeme durumu hesapla
    const status = getPaymentStatus(payment);
    const statusText = getPaymentStatusText(status);
    const statusClass = getPaymentStatusClass(status);

    row.innerHTML = `
        <td>
            <div class="student-info">
                <div class="student-avatar">${initials}</div>
                <div class="student-details">
                    <h4>${payment.ogr_ad} ${payment.ogr_soyad}</h4>
                    <p>TC: ${payment.ogr_TC}</p>
                </div>
            </div>
        </td>
        <td>${payment.donem_numara} - ${payment.donem_turu}</td>
        <td>
            <div class="payment-breakdown">
                <div class="amount-display ${statusClass}">${payment.toplam_odenen}₺ / ${payment.toplam_ucret}₺</div>
                <div class="remaining-amount" style="font-size: 12px; color: #6b7280;">Kalan: ${payment.kalan_borc}₺</div>
            </div>
        </td>
        <td>
            <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
        <td>${payment.son_odeme_tarihi ? formatDate(payment.son_odeme_tarihi) : '-'}</td>
        <td>${payment.last_payment_date ? formatDate(payment.last_payment_date) : '-'}</td>
        <td>
            <div class="table-actions-cell">
                <button class="action-btn view" onclick="viewPaymentHistory(${payment.ogr_id})" title="Ödeme Geçmişi">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="editPaymentFromPaymentsPage(${payment.id})" title="Düzenle" style="color: #f59e0b;">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deletePaymentFromPaymentsPage(${payment.id})" title="Sil" style="color: #dc2626;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;

    return row;
}

// Yardımcı fonksiyonlar
function getPaymentStatus(payment) {
    const kalan = payment.kalan_borc || 0;
    const odenen = payment.toplam_odenen || 0;

    if (kalan <= 0) return 'paid';
    if (odenen > 0) return 'partial';
    return 'pending';
}

function getPaymentStatusText(status) {
    const texts = {
        'paid': 'Tamamlandı',
        'partial': 'Kısmi Ödendi',
        'pending': 'Bekliyor'
    };
    return texts[status] || 'Bekliyor';
}

function getPaymentStatusClass(status) {
    const classes = {
        'paid': 'paid',
        'partial': 'pending',
        'pending': 'overdue'
    };
    return classes[status] || 'overdue';
}


// ==============================
// RAPOR İNDİRME FONKSİYONU
// ==============================

window.downloadPaymentReport = async function (studentId, firstName, lastName) {
    try {
        showNotification('Rapor hazırlanıyor...', 'info');

        const [student, payments] = await Promise.all([
            window.db.getOgrenciById(studentId),
            window.db.getOdemelerByOgrenci(studentId)
        ]);

        if (!student || !payments) {
            showNotification('Rapor oluşturulamadı', 'error');
            return;
        }

        generatePaymentReportPDF(student, payments);

    } catch (error) {
        console.error('Rapor oluşturma hatası:', error);
        showNotification('Rapor oluşturulurken hata oluştu', 'error');
    }
};

function generatePaymentReportPDF(student, payments) {
    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.odenen_tutar) || 0), 0);
    const expectedAmount = parseFloat(student.ogr_odeme) || 0;
    const remaining = expectedAmount - totalPaid;

    // HTML raporu oluştur
    const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Ödeme Raporu - ${student.ogr_ad} ${student.ogr_soyad}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
                .header { text-align: center; border-bottom: 2px solid #16a34a; padding-bottom: 20px; margin-bottom: 30px; }
                .company-name { font-size: 24px; font-weight: bold; color: #16a34a; margin-bottom: 10px; }
                .report-title { font-size: 18px; color: #666; }
                .student-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                .info-label { font-weight: bold; }
                .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .summary-card { background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }
                .summary-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
                .paid { color: #16a34a; }
                .pending { color: #dc2626; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #f9fafb; font-weight: bold; }
                .amount { text-align: right; font-family: monospace; font-weight: bold; }
                .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-name">EĞİTİM MERKEZİ</div>
                <div class="report-title">Öğrenci Ödeme Raporu</div>
            </div>
            
            <div class="student-info">
                <h3 style="margin-top: 0;">Öğrenci Bilgileri</h3>
                <div class="info-row">
                    <span class="info-label">Ad Soyad:</span>
                    <span>${student.ogr_ad} ${student.ogr_soyad}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">TC Kimlik:</span>
                    <span>${student.ogr_TC}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Telefon:</span>
                    <span>${student.ogr_ceptel || '-'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Rapor Tarihi:</span>
                    <span>${new Date().toLocaleDateString('tr-TR')}</span>
                </div>
            </div>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-value paid">₺${totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                    <div class="summary-label">Toplam Ödenen</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">₺${expectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                    <div class="summary-label">Beklenen Tutar</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value ${remaining <= 0 ? 'paid' : 'pending'}">₺${Math.abs(remaining).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                    <div class="summary-label">${remaining <= 0 ? 'Fazla Ödeme' : 'Kalan Borç'}</div>
                </div>
            </div>
            
            <h3>Ödeme Detayları</h3>
            ${payments.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Tarih</th>
                            <th>Tutar</th>
                            <th>Yöntem</th>
                            <th>Not</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(payment => `
                            <tr>
                                <td>${formatDate(payment.odeme_tarihi)}</td>
                                <td class="amount paid">₺${parseFloat(payment.odenen_tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                <td>${getPaymentMethodText(payment.odeme_yontemi)}</td>
                                <td>${payment.notlar || '-'}</td>
                            </tr>
                        `).join('')}
                        <tr style="border-top: 2px solid #16a34a; font-weight: bold;">
                            <td>TOPLAM</td>
                            <td class="amount paid">₺${totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                            <td colspan="2"></td>
                        </tr>
                    </tbody>
                </table>
            ` : `
                <p style="text-align: center; color: #666; font-style: italic;">Henüz ödeme kaydı bulunmuyor.</p>
            `}
            
            <div class="footer">
                <p>Bu rapor ${new Date().toLocaleString('tr-TR')} tarihinde otomatik olarak oluşturulmuştur.</p>
            </div>
        </body>
        </html>
    `;

    // Yeni pencerede aç ve yazdır
    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportHTML);
    printWindow.document.close();

    // Dosya adı oluştur
    const fileName = `odeme_raporu_${student.ogr_ad}_${student.ogr_soyad}_${new Date().toISOString().split('T')[0]}.html`;

    // İndirme linki oluştur
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = fileName;
    downloadLink.click();
    URL.revokeObjectURL(url);

    showNotification('Rapor başarıyla indirildi', 'success');
}

// ==============================
// YARDIMCI FONKSİYONLAR
// ==============================

function closeModal(modal) {
    if (modal) {
        modal.style.display = 'none';
        setTimeout(() => modal.remove(), 300);
    }
}

// Ödeme ekleme fonksiyonu (bonus)
window.addPaymentForStudent = function (studentId) {
    closeModal(document.getElementById('paymentHistoryModal'));
    // Burada ödeme ekleme modalını açabilirsiniz
    showNotification('Ödeme ekleme özelliği yakında gelecek', 'info');
};

console.log('✅ Ödeme butonları aktif hale getirildi!');

// HTML'deki exportPayments() çağrısı için
window.exportPayments = function () {
    // Tüm ödemeler için genel rapor oluştur
    if (!filteredPayments || filteredPayments.length === 0) {
        showNotification('İndirilecek ödeme kaydı bulunamadı', 'warning');
        return;
    }

    generateAllPaymentsReport();
};

// Tüm ödemeler için toplu rapor fonksiyonu
function generateAllPaymentsReport() {
    try {
        showNotification('Genel ödeme raporu hazırlanıyor...', 'info');

        const totalAmount = filteredPayments.reduce((sum, p) => sum + (parseFloat(p.odenen_tutar) || 0), 0);
        const uniqueStudents = [...new Set(filteredPayments.map(p => p.ogr_id))].length;

        const reportHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Genel Ödeme Raporu - ${new Date().toLocaleDateString('tr-TR')}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
                    .header { text-align: center; border-bottom: 2px solid #16a34a; padding-bottom: 20px; margin-bottom: 30px; }
                    .company-name { font-size: 24px; font-weight: bold; color: #16a34a; margin-bottom: 10px; }
                    .report-title { font-size: 18px; color: #666; }
                    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
                    .summary-card { background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }
                    .summary-value { font-size: 28px; font-weight: bold; margin-bottom: 8px; color: #16a34a; }
                    .summary-label { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; font-size: 14px; }
                    th { background: #f9fafb; font-weight: bold; color: #374151; }
                    .amount { text-align: right; font-family: monospace; font-weight: bold; color: #16a34a; }
                    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
                    tbody tr:hover { background: #f8fafc; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">EĞİTİM MERKEZİ</div>
                    <div class="report-title">Genel Ödeme Raporu</div>
                </div>
                
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-value">${filteredPayments.length}</div>
                        <div class="summary-label">Toplam Ödeme</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value">${uniqueStudents}</div>
                        <div class="summary-label">Ödeme Yapan Öğrenci</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value">₺${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                        <div class="summary-label">Toplam Tutar</div>
                    </div>
                </div>
                
                <h3>Ödeme Detayları</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Öğrenci</th>
                            <th>TC Kimlik</th>
                            <th>Dönem</th>
                            <th>Tarih</th>
                            <th>Tutar</th>
                            <th>Yöntem</th>
                            <th>Not</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredPayments.map(payment => `
                            <tr>
                                <td>${payment.ogr_ad} ${payment.ogr_soyad}</td>
                                <td>${payment.ogr_TC}</td>
                                <td>${payment.donem_numara} - ${payment.donem_turu}</td>
                                <td>${formatDate(payment.odeme_tarihi)}</td>
                                <td class="amount">₺${parseFloat(payment.odenen_tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                <td>${getPaymentMethodText(payment.odeme_yontemi)}</td>
                                <td>${payment.notlar || '-'}</td>
                            </tr>
                        `).join('')}
                        <tr style="border-top: 2px solid #16a34a; font-weight: bold; background: #f0fdf4;">
                            <td colspan="4" style="text-align: right; font-size: 16px;">GENEL TOPLAM:</td>
                            <td class="amount" style="font-size: 18px;">₺${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                            <td colspan="2"></td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>Bu rapor ${new Date().toLocaleString('tr-TR')} tarihinde otomatik olarak oluşturulmuştur.</p>
                    <p>Raporda ${filteredPayments.length} ödeme kaydı yer almaktadır.</p>
                </div>
            </body>
            </html>
        `;

        // Yeni pencerede aç
        const printWindow = window.open('', '_blank');
        printWindow.document.write(reportHTML);
        printWindow.document.close();

        // İndirme linki oluştur
        const fileName = `genel_odeme_raporu_${new Date().toISOString().split('T')[0]}.html`;
        const blob = new Blob([reportHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = fileName;
        downloadLink.click();
        URL.revokeObjectURL(url);

        showNotification('Genel ödeme raporu başarıyla indirildi', 'success');

    } catch (error) {
        console.error('Genel rapor oluşturma hatası:', error);
        showNotification('Rapor oluşturulurken hata oluştu', 'error');
    }
}

function setupSearchFunctionPermanent() {
    // Hem ana sayfa hem dönem detay arama kutularını kur
    const searchSelectors = [
        '#studentSearch',
        '#term-detail-content #studentSearch'
    ];

    searchSelectors.forEach(selector => {
        const searchBox = document.querySelector(selector);

        if (!searchBox) {
            console.log(`Arama kutusu bulunamadı: ${selector}`);
            return;
        }

        console.log(`Kalıcı arama sistemi kuruluyor: ${selector}`);

        // Yanlış attribute'ları temizle
        searchBox.removeAttribute('onkeyup');
        searchBox.removeAttribute('onclick');
        searchBox.className = 'search-input';

        // Event listener'ları temizle ve yeniden kur
        const cleanSearchBox = searchBox.cloneNode(true);
        searchBox.parentNode.replaceChild(cleanSearchBox, searchBox);

        // Yeni referansı al
        const finalSearchBox = document.querySelector(selector);

        // CSS düzeltmesi
        /*
        finalSearchBox.style.cssText = `
            width: 250px !important;
            height: 36px !important;
            padding: 8px 12px !important;
            border: 1px solid #d1d5db !important;
            border-radius: 8px !important;
            font-size: 14px !important;
            display: block !important;
            visibility: visible !important;
            background: white !important;
            margin: 10px !important;
        `;*/

        // Input event listener ekle
        finalSearchBox.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            console.log(`Arama yapılıyor (${selector}):`, searchTerm);

            // Global filter state'i güncelle
            if (window.enhancedStudentFilters) {
                window.enhancedStudentFilters.search = searchTerm;

                // Debounced search uygula
                clearTimeout(window.searchTimeout);
                window.searchTimeout = setTimeout(() => {
                    if (window.applyEnhancedStudentFilters) {
                        window.applyEnhancedStudentFilters();
                    }
                }, 300);
            }
        });

        console.log(`Kalıcı arama sistemi kuruldu: ${selector}`);
    });
}

// Ödeme durumu hesaplama fonksiyonu
function calculatePaymentStatus(student) {
    const totalFee = parseFloat(student.ogr_odeme) || 0;
    const totalPaid = parseFloat(student.toplam_odenen) || 0;
    const remaining = totalFee - totalPaid;

    if (totalFee <= 0) return 'no-fee'; // Ücret belirtilmemiş
    if (remaining <= 0) return 'completed'; // Tam ödendi
    if (totalPaid > 0) return 'partial'; // Kısmi ödeme
    return 'unpaid'; // Ödeme yok
}

// =============================================================================
// ÖDEME MODAL FONKSİYONU - FAZ 3 İÇİN PLACEHOLDER (DÜZELTİLMİŞ)
// =============================================================================

// Ödeme yönetimi için global değişkenler
let currentPaymentStudent = null;
let flatpickrPaymentDate = null;

// =============================================================================
// 1. ÖDEME EKLEME MODAL SİSTEMİ
// =============================================================================

window.openPaymentModal = async function (studentId) {
    console.log('💰 Ödeme modalı açılıyor...', studentId);

    try {
        // Öğrenci bilgilerini getir
        const student = await window.db.getOgrenciById(studentId);
        if (!student) {
            showNotification('Öğrenci bulunamadı', 'error');
            return;
        }

        // Mevcut ödemeleri getir
        const payments = await window.db.getOdemelerByOgrenci(studentId);
        const totalPaid = payments ? payments.reduce((sum, p) => sum + (parseFloat(p.odenen_tutar) || 0), 0) : 0;
        const totalFee = parseFloat(student.ogr_odeme) || 0;
        const remaining = totalFee - totalPaid;

        currentPaymentStudent = student;

        const modalHTML = `
            <div class="modal-overlay active" id="paymentManagementModal">
                <div class="modal-container" style="max-width: 800px;">
                    <div class="modal-header">
                        <h2>
                            <i class="fas fa-credit-card"></i>
                            ${student.ogr_ad} ${student.ogr_soyad} - Ödeme Yönetimi
                        </h2>
                        <button class="modal-close" onclick="closePaymentModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <!-- Ödeme Özeti -->
                        <div class="payment-summary">
                            <div class="summary-grid">
                                <div class="summary-card">
                                    <div class="summary-value paid">₺${totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                                    <div class="summary-label">Ödenen</div>
                                </div>
                                <div class="summary-card">
                                    <div class="summary-value ${remaining <= 0 ? 'paid' : 'pending'}">₺${Math.abs(remaining).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                                    <div class="summary-label">${remaining <= 0 ? 'Fazla Ödeme' : 'Kalan Borç'}</div>
                                </div>
                                <div class="summary-card">
                                    <div class="summary-value total">₺${totalFee.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                                    <div class="summary-label">Toplam Ücret</div>
                                </div>
                            </div>
                        </div>

                        <!-- Tab Navigation -->
                        <div class="payment-tabs">
                            <button class="payment-tab active" onclick="switchPaymentTab('add')">
                                <i class="fas fa-plus"></i> Yeni Ödeme
                            </button>
                            <button class="payment-tab" onclick="switchPaymentTab('history')">
                                <i class="fas fa-history"></i> Ödeme Geçmişi
                            </button>
                        </div>

                        <!-- Yeni Ödeme Ekleme Tab -->
                        <div id="add-payment-tab" class="payment-tab-content active">
                            <form id="addPaymentForm" onsubmit="submitNewPayment(event)">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Ödeme Tutarı *</label>
                                        <div style="position: relative;">
                                            <input type="number" 
                                                   id="paymentAmount" 
                                                   class="form-input" 
                                                   placeholder="0.00"
                                                   min="0.01" 
                                                   step="0.01" 
                                                   required
                                                   style="padding-right: 40px;">
                                            <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #6b7280; font-weight: 500;">₺</span>
                                        </div>
                                        ${remaining > 0 ? `
                                            <div class="quick-amounts">
                                                <button type="button" class="quick-amount-btn" onclick="setQuickAmount(${remaining})">
                                                    Kalan Tamamı (₺${remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                                                </button>
                                                ${remaining >= 1000 ? `
                                                    <button type="button" class="quick-amount-btn" onclick="setQuickAmount(${Math.round(remaining / 2)})">
                                                        Yarısı (₺${Math.round(remaining / 2).toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                                                    </button>
                                                ` : ''}
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Ödeme Tarihi *</label>
                                        <input type="text" 
                                               id="paymentDate" 
                                               class="form-input" 
                                               placeholder="Tarih seçin..."
                                               required>
                                    </div>
                                </div>

                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Ödeme Yöntemi *</label>
                                        <select id="paymentMethod" class="form-select" required>
                                            <option value="">Seçiniz...</option>
                                            <option value="nakit">Nakit</option>
                                            <option value="kart">Kredi/Banka Kartı</option>
                                            <option value="havale">Havale/EFT</option>
                                            <option value="cek">Çek</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Durum</label>
                                        <select id="paymentStatus" class="form-select">
                                            <option value="odendi">Ödendi</option>
                                            <option value="bekliyor">Bekliyor</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Not (Opsiyonel)</label>
                                    <textarea id="paymentNote" 
                                              class="form-input" 
                                              rows="3" 
                                              placeholder="Ödeme ile ilgili not..."></textarea>
                                </div>

                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-save"></i>
                                        Ödemeyi Kaydet
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- Ödeme Geçmişi Tab -->
                        <div id="history-payment-tab" class="payment-tab-content">
                            <div id="paymentHistoryContent">
                                <div class="loading-placeholder">
                                    <i class="fas fa-spinner fa-spin"></i> Ödeme geçmişi yükleniyor...
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closePaymentModal()">
                            <i class="fas fa-times"></i>
                            Kapat
                        </button>
                        <button type="button" class="btn btn-info" onclick="generatePaymentReport(${studentId})">
                            <i class="fas fa-file-pdf"></i>
                            PDF Rapor
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Modal'ı sayfaya ekle
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden';

        // Flatpickr'ı başlat
        initializePaymentDatePicker();

        // Ödeme geçmişini yükle
        loadPaymentHistory(studentId);

        // ESC tuşu ile kapatma
        document.addEventListener('keydown', handlePaymentModalEscape);

    } catch (error) {
        console.error('❌ Ödeme modal hatası:', error);
        showNotification('Ödeme modalı açılırken hata oluştu', 'error');
    }
};


// Modal kapatma fonksiyonu
window.closePaymentInfoModal = function () {
    const modal = document.getElementById('paymentInfoModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handlePaymentModalEscape);
    }
};

// ESC tuşu ile modal kapatma
function handlePaymentModalEscape(e) {
    if (e.key === 'Escape') {
        closePaymentInfoModal();
    }
}

// Modal overlay'e tıklayınca kapatma
document.addEventListener('click', function (e) {
    if (e.target && e.target.classList.contains('modal-overlay') && e.target.id === 'paymentInfoModal') {
        closePaymentInfoModal();
    }
});

// CSS'i head'e ekle (bir kez)
if (!document.getElementById('payment-button-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'payment-button-styles';
    styleElement.innerHTML = `
        .action-btn.payment {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            border: none;
            transition: all 0.2s ease;
            border-radius: 6px;
            padding: 8px 12px;
        }

        .action-btn.payment:hover {
            background: linear-gradient(135deg, #2563eb, #1e40af);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .action-btn.payment:active {
            transform: translateY(0);
        }

        #paymentInfoModal .modal-container {
            animation: slideInUp 0.3s ease-out;
        }

        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(styleElement);
}

console.log('✅ Ödeme modal placeholder fonksiyonu eklendi!');

// =============================================================================
// 2. ÖDEME YÖNETİM FONKSİYONLARI
// =============================================================================

// Tab değiştirme
window.switchPaymentTab = function (tabName) {
    // Tab butonları
    document.querySelectorAll('.payment-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[onclick="switchPaymentTab('${tabName}')"]`).classList.add('active');

    // Tab içerikleri
    document.querySelectorAll('.payment-tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-payment-tab`).classList.add('active');

    // Geçmiş tabına geçildiğinde verileri yenile
    if (tabName === 'history' && currentPaymentStudent) {
        loadPaymentHistory(currentPaymentStudent.id);
    }
};

// Hızlı tutar ayarlama
window.setQuickAmount = function (amount) {
    document.getElementById('paymentAmount').value = amount.toFixed(2);
};

// Ödeme tarihi picker'ı başlat
function initializePaymentDatePicker() {
    if (flatpickrPaymentDate) {
        flatpickrPaymentDate.destroy();
    }

    flatpickrPaymentDate = flatpickr('#paymentDate', {
        dateFormat: 'd.m.Y',
        defaultDate: new Date(),
        locale: 'tr',
        allowInput: true,
        clickOpens: true
    });
}

// Yeni ödeme kaydetme (makbuz seçeneği ile)
window.submitNewPayment = async function (event) {
    event.preventDefault();

    if (!currentPaymentStudent) {
        showNotification('Öğrenci bilgisi bulunamadı', 'error');
        return;
    }

    const form = event.target;
    const paymentData = {
        ogr_id: currentPaymentStudent.id,
        odenen_tutar: parseFloat(document.getElementById('paymentAmount').value),
        odeme_tarihi: flatpickrPaymentDate ?
            flatpickrPaymentDate.formatDate(flatpickrPaymentDate.selectedDates[0], 'Y-m-d') :
            new Date().toISOString().split('T')[0],
        odeme_yontemi: document.getElementById('paymentMethod').value,
        durum: document.getElementById('paymentStatus').value,
        notlar: document.getElementById('paymentNote').value.trim() || null
    };

    // Validasyon
    if (!paymentData.odenen_tutar || paymentData.odenen_tutar <= 0) {
        showNotification('Geçerli bir ödeme tutarı girin', 'error');
        return;
    }

    if (!paymentData.odeme_yontemi) {
        showNotification('Ödeme yöntemi seçin', 'error');
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';

    try {
        const result = await window.db.addOdeme(paymentData);

        if (result && !result.error) {
            showNotification('Ödeme başarıyla kaydedildi!', 'success');

            // MAKBUZ ÇIKTISI SOR
            const printReceipt = confirm('Ödeme kaydedildi! Makbuz çıktısı almak ister misiniz?');

            if (printReceipt) {
                const receiptData = {
                    ...paymentData,
                    id: result.insertId || Date.now(),
                    makbuz_no: generateReceiptNumber(),
                    tarih: new Date().toLocaleDateString('tr-TR'),
                    saat: new Date().toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                };

                await generatePaymentReceipt(receiptData, currentPaymentStudent);
            }

            // Formu temizle
            form.reset();
            if (flatpickrPaymentDate) {
                flatpickrPaymentDate.setDate(new Date());
            }

            await refreshPaymentSummary();
            await loadPaymentHistory(currentPaymentStudent.id);

            if (appState.activeTab === 'term-detail') {
                await window.loadTermStudents(appState.currentTermId);
            }

        } else {
            throw new Error(result?.error || 'Bilinmeyen hata');
        }

    } catch (error) {
        console.error('Ödeme kaydetme hatası:', error);
        showNotification('Ödeme kaydedilirken hata oluştu: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
};

// Ödeme özetini yenile
async function refreshPaymentSummary() {
    if (!currentPaymentStudent) return;

    try {
        const payments = await window.db.getOdemelerByOgrenci(currentPaymentStudent.id);
        const totalPaid = payments ? payments.reduce((sum, p) => sum + (parseFloat(p.odenen_tutar) || 0), 0) : 0;
        const totalFee = parseFloat(currentPaymentStudent.ogr_odeme) || 0;
        const remaining = totalFee - totalPaid;

        // Özet kartlarını güncelle
        const summaryCards = document.querySelectorAll('.summary-card .summary-value');
        if (summaryCards[0]) summaryCards[0].textContent = `₺${totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
        if (summaryCards[1]) {
            summaryCards[1].textContent = `₺${Math.abs(remaining).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
            summaryCards[1].className = `summary-value ${remaining <= 0 ? 'paid' : 'pending'}`;
        }

        // Hızlı tutar butonlarını güncelle
        const quickAmounts = document.querySelector('.quick-amounts');
        if (quickAmounts && remaining > 0) {
            quickAmounts.innerHTML = `
                <button type="button" class="quick-amount-btn" onclick="setQuickAmount(${remaining})">
                    Kalan Tamamı (₺${remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                </button>
                ${remaining >= 1000 ? `
                    <button type="button" class="quick-amount-btn" onclick="setQuickAmount(${Math.round(remaining / 2)})">
                        Yarısı (₺${Math.round(remaining / 2).toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                    </button>
                ` : ''}
            `;
        } else if (quickAmounts) {
            quickAmounts.innerHTML = '<p style="color: #16a34a; font-weight: 500;">✅ Ödeme tamamlandı!</p>';
        }

    } catch (error) {
        console.error('❌ Ödeme özeti yenileme hatası:', error);
    }
}

// =============================================================================
// 3. ÖDEME GEÇMİŞİ YÖNETİMİ
// =============================================================================

// Ödeme geçmişini yükle
async function loadPaymentHistory(studentId) {
    const historyContent = document.getElementById('paymentHistoryContent');
    if (!historyContent) return;

    historyContent.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Ödeme geçmişi yükleniyor...</div>';

    try {
        const payments = await window.db.getOdemelerByOgrenci(studentId);

        if (!payments || payments.length === 0) {
            historyContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt" style="font-size: 48px; color: #d1d5db; margin-bottom: 16px;"></i>
                    <h3>Henüz ödeme kaydı yok</h3>
                    <p>Bu öğrenci için henüz ödeme kaydı bulunmuyor.</p>
                </div>
            `;
            return;
        }

        // Ödemeleri tarihe göre sırala (en yeni en üstte)
        payments.sort((a, b) => new Date(b.odeme_tarihi) - new Date(a.odeme_tarihi));

        const historyHTML = `
            <div class="payment-history-list">
                ${payments.map(payment => createPaymentHistoryItem(payment)).join('')}
            </div>
        `;

        historyContent.innerHTML = historyHTML;

    } catch (error) {
        console.error('❌ Ödeme geçmişi yükleme hatası:', error);
        historyContent.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc2626; margin-bottom: 16px;"></i>
                <h3>Ödeme geçmişi yüklenemedi</h3>
                <p>Bir hata oluştu. Lütfen sayfayı yenileyin.</p>
            </div>
        `;
    }
}

// Ödeme geçmişi öğesi (makbuz butonu ile)
function createPaymentHistoryItem(payment) {
    const statusClass = payment.durum === 'odendi' ? 'paid' : 'pending';
    const statusText = payment.durum === 'odendi' ? 'Ödendi' : 'Bekliyor';

    return `
        <div class="payment-history-item">
            <div class="payment-item-header">
                <div class="payment-amount ${statusClass}">
                    ₺${parseFloat(payment.odenen_tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
                <div class="payment-status ${statusClass}">
                    <i class="fas fa-${payment.durum === 'odendi' ? 'check-circle' : 'clock'}"></i>
                    ${statusText}
                </div>
            </div>
            <div class="payment-item-details">
                <div class="payment-detail">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(payment.odeme_tarihi)}</span>
                </div>
                <div class="payment-detail">
                    <i class="fas fa-credit-card"></i>
                    <span>${getPaymentMethodText(payment.odeme_yontemi)}</span>
                </div>
                ${payment.notlar ? `
                    <div class="payment-detail">
                        <i class="fas fa-sticky-note"></i>
                        <span>${payment.notlar}</span>
                    </div>
                ` : ''}
            </div>
            <div class="payment-item-actions">
                <button class="btn-sm btn-outline" onclick="editPayment(${payment.id})">
                    <i class="fas fa-edit"></i> Düzenle
                </button>
                <button class="btn-sm" onclick="printReceiptFromHistory(${payment.id})" style="background: #059669; border-color: #059669; color: white; margin: 0 4px;">
                    <i class="fas fa-receipt"></i> Makbuz
                </button>
                <button class="btn-sm btn-danger" onclick="deletePayment(${payment.id})">
                    <i class="fas fa-trash"></i> Sil
                </button>
            </div>
        </div>
    `;
}

// =============================================================================
// 4. ÖDEME DÜZENLEME VE SİLME
// =============================================================================

// Ödeme düzenle
window.editPayment = async function (paymentId) {
    try {
        // Ödeme bilgilerini getir
        const payments = await window.db.getOdemelerByOgrenci(currentPaymentStudent.id);
        const payment = payments.find(p => p.id == paymentId);

        if (!payment) {
            showNotification('Ödeme bulunamadı', 'error');
            return;
        }

        // Düzenleme modalını aç
        showEditPaymentModal(payment);

    } catch (error) {
        console.error('❌ Ödeme düzenleme hatası:', error);
        showNotification('Ödeme bilgileri alınırken hata oluştu', 'error');
    }
};

// Ödeme düzenleme modalı
function showEditPaymentModal(payment) {
    const modalHTML = `
        <div class="modal-overlay active" id="editPaymentModal">
            <div class="modal-container" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>
                        <i class="fas fa-edit"></i>
                        Ödeme Düzenle
                    </h2>
                    <button class="modal-close" onclick="closeEditPaymentModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="modal-body">
                    <form id="editPaymentForm" onsubmit="updatePayment(event, ${payment.id})">
                        <div class="form-group">
                            <label class="form-label">Ödeme Tutarı *</label>
                            <div style="position: relative;">
                                <input type="number" 
                                       class="form-input" 
                                       value="${payment.odenen_tutar}"
                                       min="0.01" 
                                       step="0.01" 
                                       required
                                       style="padding-right: 40px;">
                                <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #6b7280; font-weight: 500;">₺</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Ödeme Tarihi *</label>
                            <input type="text" 
                                   id="editPaymentDate"
                                   class="form-input" 
                                   value="${formatDateForInput(payment.odeme_tarihi)}"
                                   required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Ödeme Yöntemi *</label>
                            <select class="form-select" required>
                                <option value="nakit" ${payment.odeme_yontemi === 'nakit' ? 'selected' : ''}>Nakit</option>
                                <option value="kart" ${payment.odeme_yontemi === 'kart' ? 'selected' : ''}>Kredi/Banka Kartı</option>
                                <option value="havale" ${payment.odeme_yontemi === 'havale' ? 'selected' : ''}>Havale/EFT</option>
                                <option value="cek" ${payment.odeme_yontemi === 'cek' ? 'selected' : ''}>Çek</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Durum</label>
                            <select class="form-select">
                                <option value="odendi" ${payment.durum === 'odendi' ? 'selected' : ''}>Ödendi</option>
                                <option value="bekliyor" ${payment.durum === 'bekliyor' ? 'selected' : ''}>Bekliyor</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Not (Opsiyonel)</label>
                            <textarea class="form-input" rows="3">${payment.notlar || ''}</textarea>
                        </div>
                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeEditPaymentModal()">
                        <i class="fas fa-times"></i>
                        İptal
                    </button>
                    <button type="submit" form="editPaymentForm" class="btn btn-primary">
                        <i class="fas fa-save"></i>
                        Güncelle
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Tarih picker'ı başlat
    flatpickr('#editPaymentDate', {
        dateFormat: 'd.m.Y',
        locale: 'tr',
        allowInput: true
    });
}

// Ödeme güncelle
window.updatePayment = async function (event, paymentId) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const updateData = {
        odenen_tutar: parseFloat(formData.get('odenen_tutar')),
        odeme_tarihi: formData.get('odeme_tarihi'),
        odeme_yontemi: formData.get('odeme_yontemi'),
        durum: formData.get('durum'),
        notlar: formData.get('notlar')
    };

    try {
        const result = await window.db.updateOdeme(paymentId, updateData);

        if (result && !result.error) {
            showNotification('Ödeme başarıyla güncellendi!', 'success');
            closeEditPaymentModal();
            await refreshPaymentSummary();
            await loadPaymentHistory(currentPaymentStudent.id);
        } else {
            throw new Error(result?.error || 'Güncelleme hatası');
        }
    } catch (error) {
        console.error('❌ Ödeme güncelleme hatası:', error);
        showNotification('Ödeme güncellenirken hata oluştu', 'error');
    }
};

// Ödeme sil
window.deletePayment = async function (paymentId) {
    const confirmed = confirm('Bu ödeme kaydını silmek istediğinizden emin misiniz?');

    if (confirmed) {
        try {
            const result = await window.db.deleteOdeme(paymentId);

            if (result && !result.error) {
                showNotification('Ödeme başarıyla silindi', 'success');
                await refreshPaymentSummary();
                await loadPaymentHistory(currentPaymentStudent.id);

                // Ana tablodaki ödeme durumunu güncelle
                if (appState.activeTab === 'term-detail') {
                    await window.loadTermStudents(appState.currentTermId);
                }
            } else {
                throw new Error(result?.error || 'Silme hatası');
            }
        } catch (error) {
            console.error('❌ Ödeme silme hatası:', error);
            showNotification('Ödeme silinirken hata oluştu', 'error');
        }
    }
};

// =============================================================================
// 5. MODAL YÖNETİM FONKSİYONLARI
// =============================================================================

// Ana ödeme modalını kapat
window.closePaymentModal = function () {
    const modal = document.getElementById('paymentManagementModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handlePaymentModalEscape);

        if (flatpickrPaymentDate) {
            flatpickrPaymentDate.destroy();
            flatpickrPaymentDate = null;
        }

        currentPaymentStudent = null;
    }
};

// Ödeme düzenleme modalını kapat
window.closeEditPaymentModal = function () {
    const modal = document.getElementById('editPaymentModal');
    if (modal) {
        modal.remove();
    }
};

// ESC tuşu ile modal kapatma
function handlePaymentModalEscape(e) {
    if (e.key === 'Escape') {
        closePaymentModal();
    }
}

// =============================================================================
// 6. YARDIMCI FONKSİYONLAR
// =============================================================================

// Ödeme yöntemi metni
function getPaymentMethodText(method) {
    const methods = {
        'nakit': 'Nakit',
        'kart': 'Kredi/Banka Kartı',
        'havale': 'Havale/EFT',
        'cek': 'Çek'
    };
    return methods[method] || method || 'Belirtilmedi';
}

// Tarih formatlama (input için)
function formatDateForInput(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
}

// Tarih formatlama (görüntüleme için)
function formatDate(dateString) {
    if (!dateString) return '-';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// PDF rapor oluştur
window.generatePaymentReport = async function (studentId) {
    try {
        showNotification('PDF rapor hazırlanıyor...', 'info');

        const [student, payments] = await Promise.all([
            window.db.getOgrenciById(studentId),
            window.db.getOdemelerByOgrenci(studentId)
        ]);

        if (!student) {
            showNotification('Öğrenci bilgileri alınamadı', 'error');
            return;
        }

        const totalPaid = payments ? payments.reduce((sum, p) => sum + (parseFloat(p.odenen_tutar) || 0), 0) : 0;
        const totalFee = parseFloat(student.ogr_odeme) || 0;
        const remaining = totalFee - totalPaid;

        const reportHTML = `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Ödeme Raporu - ${student.ogr_ad} ${student.ogr_soyad}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
                    .header { text-align: center; border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
                    .company-name { font-size: 28px; font-weight: bold; color: #059669; margin-bottom: 10px; }
                    .report-title { font-size: 20px; color: #666; margin-bottom: 20px; }
                    .student-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #059669; }
                    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .summary-card { background: white; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }
                    .summary-value { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
                    .summary-value.paid { color: #059669; }
                    .summary-value.pending { color: #dc2626; }
                    .summary-value.total { color: #374151; }
                    .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
                    .payments-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    .payments-table th, .payments-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                    .payments-table th { background: #f9fafb; font-weight: 600; color: #374151; }
                    .amount { font-weight: 600; }
                    .amount.paid { color: #059669; }
                    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
                    .no-payments { text-align: center; color: #6b7280; font-style: italic; padding: 40px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">Pergamon Özel Güvenlik Eğitim Kurumu</div>
                    <div class="report-title">Ödeme Raporu</div>
                    <div style="color: #6b7280; font-size: 14px;">Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}</div>
                </div>

                <div class="student-info">
                    <h3 style="margin: 0 0 10px 0; color: #374151;">Öğrenci Bilgileri</h3>
                    <p style="margin: 5px 0;"><strong>Ad Soyad:</strong> ${student.ogr_ad} ${student.ogr_soyad}</p>
                    <p style="margin: 5px 0;"><strong>TC Kimlik:</strong> ${student.ogr_TC}</p>
                    <p style="margin: 5px 0;"><strong>Telefon:</strong> ${student.ogr_ceptel || '-'}</p>
                    <p style="margin: 5px 0;"><strong>Kayıt Tarihi:</strong> ${formatDate(student.ogr_kayit_tarihi)}</p>
                </div>

                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-value paid">₺${totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                        <div class="summary-label">Ödenen Tutar</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value ${remaining <= 0 ? 'paid' : 'pending'}">₺${Math.abs(remaining).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                        <div class="summary-label">${remaining <= 0 ? 'Fazla Ödeme' : 'Kalan Borç'}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value total">₺${totalFee.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                        <div class="summary-label">Toplam Ücret</div>
                    </div>
                </div>

                <h3>Ödeme Detayları</h3>
                ${payments && payments.length > 0 ? `
                    <table class="payments-table">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Tutar</th>
                                <th>Yöntem</th>
                                <th>Durum</th>
                                <th>Not</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${payments.map(payment => `
                                <tr>
                                    <td>${formatDate(payment.odeme_tarihi)}</td>
                                    <td class="amount paid">₺${parseFloat(payment.odenen_tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                    <td>${getPaymentMethodText(payment.odeme_yontemi)}</td>
                                    <td>${payment.durum === 'odendi' ? 'Ödendi' : 'Bekliyor'}</td>
                                    <td>${payment.notlar || '-'}</td>
                                </tr>
                            `).join('')}
                            <tr style="border-top: 2px solid #059669; font-weight: bold;">
                                <td>TOPLAM</td>
                                <td class="amount paid">₺${totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                <td colspan="3"></td>
                            </tr>
                        </tbody>
                    </table>
                ` : `
                    <div class="no-payments">Henüz ödeme kaydı bulunmuyor.</div>
                `}

                <div class="footer">
                    <p>Bu rapor ${new Date().toLocaleString('tr-TR')} tarihinde otomatik olarak oluşturulmuştur.</p>
                    <p>Güvenlik Okulu Yönetim Sistemi</p>
                </div>
            </body>
            </html>
        `;

        // Yeni pencerede aç
        const printWindow = window.open('', '_blank');
        printWindow.document.write(reportHTML);
        printWindow.document.close();

        // Yazdırma dialogunu aç
        printWindow.onload = function () {
            printWindow.print();
        };

        showNotification('PDF rapor hazırlandı', 'success');

    } catch (error) {
        console.error('PDF rapor hatası:', error);
        showNotification('PDF rapor oluşturulurken hata oluştu', 'error');
    }
};

// =============================================================================
// 7. CSS STİLLERİ
// =============================================================================

// Ödeme modal stillerini ekle
if (!document.getElementById('payment-modal-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'payment-modal-styles';
    styleElement.innerHTML = `
        /* Ödeme Modal Stilleri */
        .payment-summary {
            margin-bottom: 24px;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 20px;
        }

        .summary-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }

        .summary-value {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 4px;
        }

        .summary-value.paid { color: #059669; }
        .summary-value.pending { color: #dc2626; }
        .summary-value.total { color: #374151; }

        .summary-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Tab Navigation */
        .payment-tabs {
            display: flex;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 20px;
        }

        .payment-tab {
            padding: 12px 20px;
            border: none;
            background: none;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            color: #6b7280;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .payment-tab:hover {
            color: #374151;
            background: #f9fafb;
        }

        .payment-tab.active {
            color: #059669;
            border-bottom-color: #059669;
            background: #f0fdf4;
        }

        /* Tab Content */
        .payment-tab-content {
            display: none;
        }

        .payment-tab-content.active {
            display: block;
        }

        /* Quick Amount Buttons */
        .quick-amounts {
            margin-top: 8px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .quick-amount-btn {
            padding: 6px 12px;
            border: 1px solid #d1d5db;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            color: #374151;
            transition: all 0.2s ease;
        }

        .quick-amount-btn:hover {
            background: #f3f4f6;
            border-color: #9ca3af;
        }

        /* Payment History */
        .payment-history-list {
            max-height: 400px;
            overflow-y: auto;
        }

        .payment-history-item {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            background: white;
        }

        .payment-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .payment-amount {
            font-size: 18px;
            font-weight: bold;
        }

        .payment-amount.paid { color: #059669; }
        .payment-amount.pending { color: #f59e0b; }

        .payment-status {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .payment-status.paid { color: #059669; }
        .payment-status.pending { color: #f59e0b; }

        .payment-item-details {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 12px;
        }

        .payment-detail {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            color: #6b7280;
        }

        .payment-detail i {
            width: 16px;
            color: #9ca3af;
        }

        .payment-item-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }

        .btn-sm {
            padding: 6px 12px;
            font-size: 12px;
            border-radius: 4px;
            border: 1px solid;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-outline {
            background: white;
            border-color: #d1d5db;
            color: #374151;
        }

        .btn-outline:hover {
            background: #f3f4f6;
            border-color: #9ca3af;
        }

        .btn-danger {
            background: #dc2626;
            border-color: #dc2626;
            color: white;
        }

        .btn-danger:hover {
            background: #b91c1c;
            border-color: #b91c1c;
        }

        /* Empty States */
        .empty-state, .error-state, .loading-placeholder {
            text-align: center;
            padding: 40px;
            color: #6b7280;
        }

        .loading-placeholder i {
            font-size: 24px;
            margin-bottom: 12px;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .summary-grid {
                grid-template-columns: 1fr;
            }
            
            .payment-item-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            
            .payment-item-details {
                flex-direction: column;
                gap: 8px;
            }
            
            .payment-item-actions {
                justify-content: flex-start;
            }
        }
    `;
    document.head.appendChild(styleElement);
}

console.log('✅ Faz 3: Tam işlevsel ödeme yönetim sistemi hazır!');

// =============================================================================
// ÖDEME MAKBUZU PDF SİSTEMİ - EKLENECEK KOD
// =============================================================================

// Makbuz oluşturma fonksiyonu
window.generatePaymentReceipt = async function (paymentData, studentData) {
    try {
        const receiptHTML = createReceiptHTML(paymentData, studentData);

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(receiptHTML);
        printWindow.document.close();

        printWindow.onload = function () {
            printWindow.print();
        };

        return true;
    } catch (error) {
        console.error('Makbuz oluşturma hatası:', error);
        return false;
    }
};

// Makbuz numarası oluştur
function generateReceiptNumber() {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const time = today.getTime().toString().slice(-4);

    return `${year}${month}${day}-${time}`;
}

// Sayıyı yazıya çevir
function numberToWords(number) {
    const num = Math.floor(parseFloat(number));

    const ones = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
    const tens = ['', '', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
    const teens = ['On', 'On Bir', 'On İki', 'On Üç', 'On Dört', 'On Beş', 'On Altı', 'On Yedi', 'On Sekiz', 'On Dokuz'];

    if (num === 0) return 'Sıfır';
    if (num < 10) return ones[num];
    if (num >= 10 && num < 20) return teens[num - 10];
    if (num >= 20 && num < 100) {
        const ten = Math.floor(num / 10);
        const one = num % 10;
        return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
    }
    if (num >= 100 && num < 1000) {
        const hundred = Math.floor(num / 100);
        const remainder = num % 100;
        let result = (hundred === 1 ? 'Yüz' : ones[hundred] + ' Yüz');
        if (remainder > 0) {
            result += ' ' + numberToWords(remainder);
        }
        return result;
    }
    if (num >= 1000 && num < 10000) {
        const thousand = Math.floor(num / 1000);
        const remainder = num % 1000;
        let result = (thousand === 1 ? 'Bin' : ones[thousand] + ' Bin');
        if (remainder > 0) {
            result += ' ' + numberToWords(remainder);
        }
        return result;
    }

    return num.toString();
}

// Makbuz HTML'i oluştur
function createReceiptHTML(paymentData, studentData) {
    const receiptNumber = paymentData.makbuz_no || generateReceiptNumber();
    const today = new Date();
    const receiptDate = paymentData.tarih || today.toLocaleDateString('tr-TR');
    const receiptTime = paymentData.saat || today.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ödeme Makbuzu - ${receiptNumber}</title>
    <style>
        @page { size: A5; margin: 10mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: white;
            width: 148mm;
            height: 210mm;
            margin: 0 auto;
            padding: 10mm;
        }
        .receipt-container {
            width: 100%;
            height: 100%;
            border: 2px solid #000;
            padding: 8mm;
            position: relative;
        }
        .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
        }
        .company-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .receipt-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 8px;
            text-decoration: underline;
        }
        .receipt-number, .receipt-date { font-size: 11px; margin-bottom: 3px; }
        .content { margin-top: 15px; }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 2px 0;
        }
        .info-row.border-bottom {
            border-bottom: 1px dotted #666;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        .label { font-weight: bold; width: 40%; }
        .value { width: 58%; text-align: right; }
        .amount-section {
            margin: 20px 0;
            padding: 10px;
            border: 1px solid #000;
            background: #f9f9f9;
        }
        .amount-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 13px;
        }
        .total-amount {
            font-size: 16px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 8px;
            margin-top: 8px;
        }
        .signature-section {
            position: absolute;
            bottom: 15mm;
            left: 8mm;
            right: 8mm;
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
        }
        .signature-box { text-align: center; width: 45%; }
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 25px;
            padding-top: 5px;
            font-size: 10px;
        }
        .footer {
            position: absolute;
            bottom: 5mm;
            left: 8mm;
            right: 8mm;
            text-align: center;
            font-size: 8px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 3px;
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="header">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                <img src="./public/img/bergama-logo-gray.png" alt="Bergama Logo" style="width: 60px; height: 60px; margin-right: 15px;">
                <div style="text-align: left;">
                    <div class="company-name">PERGAMON</div>
                    <div style="font-size: 12px; font-weight: normal; margin-top: 2px;">ÖZEL GÜVENLİK OKULU</div>
                </div>
            </div>
            <div class="receipt-title">PARA MAKBUZU</div>
            <div class="receipt-number">Seri No: ${receiptNumber}</div>
            <div class="receipt-date">Tarih: ${receiptDate} - ${receiptTime}</div>
        </div>
        
        <div class="content">
            <div class="info-row">
                <span class="label">Öğrenci Adı:</span>
                <span class="value">${studentData.ogr_ad} ${studentData.ogr_soyad}</span>
            </div>
            <div class="info-row">
                <span class="label">TC Kimlik:</span>
                <span class="value">${studentData.ogr_TC}</span>
            </div>
            <div class="info-row">
                <span class="label">Telefon:</span>
                <span class="value">${studentData.ogr_ceptel || '-'}</span>
            </div>
            <div class="info-row border-bottom">
                <span class="label">Ödeme Tarihi:</span>
                <span class="value">${formatDateForReceipt(paymentData.odeme_tarihi)}</span>
            </div>
            
            <div class="amount-section">
                <div class="amount-row">
                    <span>Ödeme Yöntemi:</span>
                    <span>${getPaymentMethodText(paymentData.odeme_yontemi)}</span>
                </div>
                <div class="amount-row total-amount">
                    <span>TOPLAM TUTAR:</span>
                    <span>₺${parseFloat(paymentData.odenen_tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
            
            <div class="info-row">
                <span class="label">Yazı ile:</span>
                <span class="value">${numberToWords(paymentData.odenen_tutar)} TL</span>
            </div>
        </div>
        
        <div class="signature-section">
            <div style="text-align: center; width: 100%;">
                <div class="signature-line">ALAN</div>
            </div>
        </div>
        
        <div class="footer">
            Bu makbuz geçerli bir ödeme belgesidir.
        </div>
    </div>
</body>
</html>`;
}

function formatDateForReceipt(dateString) {
    if (!dateString) return new Date().toLocaleDateString('tr-TR');
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return new Date().toLocaleDateString('tr-TR');
    return date.toLocaleDateString('tr-TR');
}

// Ödeme geçmişinden makbuz çıkar
window.printReceiptFromHistory = async function (paymentId) {
    try {
        if (!currentPaymentStudent) {
            showNotification('Öğrenci bilgisi bulunamadı', 'error');
            return;
        }

        const payments = await window.db.getOdemelerByOgrenci(currentPaymentStudent.id);
        const payment = payments.find(p => p.id == paymentId);

        if (!payment) {
            showNotification('Ödeme bulunamadı', 'error');
            return;
        }

        const receiptData = {
            ...payment,
            makbuz_no: generateReceiptNumber(),
            tarih: new Date().toLocaleDateString('tr-TR'),
            saat: new Date().toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        await generatePaymentReceipt(receiptData, currentPaymentStudent);
        showNotification('Makbuz hazırlandı', 'success');

    } catch (error) {
        console.error('Makbuz çıktısı hatası:', error);
        showNotification('Makbuz çıktısı alınırken hata oluştu', 'error');
    }
};

window.refreshTermData = async function (termId) {
    try {
        console.log('🔄 Dönem verileri yenileniyor...', termId);

        // Butona loading durumu ekle
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            const originalHTML = refreshBtn.innerHTML;
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yenileniyor...';

            // Dönem bilgilerini yenile
            await loadTermsFromDatabase();

            // Öğrenci listesini yenile
            await window.loadTermStudents(termId);

            showNotification('Dönem verileri yenilendi', 'success');

            // Butonu eski haline döndür
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = originalHTML;
            }, 1000);
        }
    } catch (error) {
        console.error('❌ Dönem verileri yenilenirken hata:', error);
        showNotification('Veriler yenilenirken hata oluştu', 'error');
    }
};

window.refreshTermStudents = async function (termId) {
    try {
        console.log('🔄 Öğrenci listesi yenileniyor...', termId);

        // Öğrenci listesini yenile
        await window.loadTermStudents(termId);

        showNotification('Öğrenci listesi yenilendi', 'success');
    } catch (error) {
        console.error('❌ Öğrenci listesi yenilenirken hata:', error);
        showNotification('Liste yenilenirken hata oluştu', 'error');
    }
};

// 3. CSS stilleri ekle
if (!document.getElementById('refresh-button-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'refresh-button-styles';
    styleElement.innerHTML = `
        .refresh-btn {
            background: white;
            border: 1px solid #d1d5db;
            color: #374151;
            transition: all 0.2s ease;
        }

        .refresh-btn:hover {
            background: #f9fafb;
            border-color: #9ca3af;
            transform: translateY(-1px);
        }

        .refresh-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .refresh-btn i {
            margin-right: 6px;
        }

        .filter-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .filter-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .filter-header h3 {
            margin: 0;
            color: #374151;
            font-size: 18px;
            font-weight: 600;
        }

        .btn-sm {
            padding: 6px 12px;
            font-size: 14px;
            border-radius: 6px;
        }

        .term-actions {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        /* Yenile butonu animasyonu */
        .refresh-btn:not(:disabled):hover i {
            animation: spin 0.5s ease-in-out;
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(styleElement);
}

// 4. Keyboard shortcut ekle (F5 veya Ctrl+R)
document.addEventListener('keydown', function (e) {
    // F5 tuşu
    if (e.key === 'F5' && appState.activeTab === 'term-detail' && appState.currentTermId) {
        e.preventDefault();
        refreshTermData(appState.currentTermId);
    }

    // Ctrl+R
    if (e.ctrlKey && e.key === 'r' && appState.activeTab === 'term-detail' && appState.currentTermId) {
        e.preventDefault();
        refreshTermStudents(appState.currentTermId);
    }
});

console.log('✅ Dönem detay sayfasına yenile butonu eklendi!');

// refreshStudentList fonksiyonunu tanımlayın
window.refreshStudentList = async function (termId) {
    try {
        console.log('🔄 Öğrenci listesi yenileniyor...', termId);

        // Butona loading durumu ekle
        const refreshBtn = document.querySelector('.btn-refresh');
        if (refreshBtn) {
            const originalHTML = refreshBtn.innerHTML;
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yenileniyor...';

            // Öğrenci listesini yenile
            await window.loadTermStudents(termId);

            // İstatistikleri güncelle (öğrenci sayısı vs.)
            await loadTermsFromDatabase();

            showNotification('Öğrenci listesi yenilendi', 'success');

            // Butonu eski haline döndür
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = originalHTML;
            }, 1000);
        }
    } catch (error) {
        console.error('❌ Öğrenci listesi yenilenirken hata:', error);
        showNotification('Liste yenilenirken hata oluştu', 'error');

        // Hata durumunda da butonu eski haline döndür
        const refreshBtn = document.querySelector('.btn-refresh');
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Yenile';
        }
    }
};

// =============================================================================
// EXCELJS İLE GELİŞMİŞ EXCEL İŞLEME
// =============================================================================

/**
 * ExcelJS kütüphanesini yükle
 */
async function loadExcelJS() {
    if (window.ExcelJS) {
        return window.ExcelJS;
    }

    try {
        // ExcelJS kütüphanesini dinamik olarak yükle
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';

        return new Promise((resolve, reject) => {
            script.onload = () => {
                window.ExcelJS = ExcelJS;
                console.log('✅ ExcelJS yüklendi');
                resolve(ExcelJS);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    } catch (error) {
        console.error('❌ ExcelJS yüklenemedi:', error);
        throw error;
    }
}

/**
 * ExcelJS ile Excel dosyasını işle
 */
async function fillExcelWithExcelJS(student) {
    try {
        const ExcelJS = await loadExcelJS();
        const workbook = new ExcelJS.Workbook();

        // Excel dosyasını oku
        const response = await fetch('./public/xlsx/kursiyer_kayit_form.xlsx');
        if (!response.ok) throw new Error('Template dosyası bulunamadı');

        const arrayBuffer = await response.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);

        console.log('✅ ExcelJS ile dosya yüklendi');

        // Ana çalışma sayfasını al
        const worksheet = workbook.getWorksheet('Sayfa1') || workbook.getWorksheet(1);
        if (!worksheet) throw new Error('Çalışma sayfası bulunamadı');

        // Öğrenci bilgilerini yerleştir
        fillStudentDataWithExcelJS(worksheet, student);

        // Dosyayı indir
        await downloadWithExcelJS(workbook, student);

        showNotification('Excel formu başarıyla oluşturuldu (formatlar korundu)!', 'success');

    } catch (error) {
        console.error('❌ ExcelJS hatası:', error);
        throw error;
    }
}

/**
 * ExcelJS ile veri doldurma
 */
function fillStudentDataWithExcelJS(worksheet, student) {
    console.log('📝 ExcelJS ile veri doldurma...');

    // Helper: Tarih formatla
    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('tr-TR');
        } catch {
            return dateStr;
        }
    }

    // Kişisel bilgiler
    worksheet.getCell('L4').value = student.ogr_TC || '';
    worksheet.getCell('L5').value = `${student.ogr_ad || ''} ${student.ogr_soyad || ''}`.trim();
    worksheet.getCell('H6').value = student.ogr_baba_ad || '';
    worksheet.getCell('H7').value = student.ogr_anne_ad || '';
    worksheet.getCell('L8').value = student.ogr_dogum_yeri || '';
    worksheet.getCell('L9').value = formatDate(student.ogr_dogum_tarihi);
    worksheet.getCell('L10').value = student.ogr_ogrenim_durumu || '';
    worksheet.getCell('J11').value = student.ogr_ceptel || '';
    worksheet.getCell('J12').value = student.ogr_kan_grubu || '';

    worksheet.getCell('J2').value = student.ogr_rapor_tarih_no || '';
    worksheet.getCell('G2').value = student.ogr_donem || '';

    // İletişim bilgileri
    worksheet.getCell('C10').value = student.ogr_mail || '';
    worksheet.getCell('C11').value = student.ogr_yedek_ceptel || '';
    worksheet.getCell('C12').value = formatDate(student.ogr_kayit_tarihi);
    worksheet.getCell('C13').value = student.ogr_adres || '';

    // Belge işaretleri
    const belgeler = [
        { cell: 'C15', durum: student.ogr_gerek_foto },
        { cell: 'E15', durum: student.ogr_gerek_diploma },
        { cell: 'G15', durum: student.ogr_gerek_kimlik },
        { cell: 'I15', durum: student.ogr_gerek_yakakarti },
        { cell: 'K15', durum: student.ogr_gerek_saglik },
        { cell: 'L15', durum: student.ogr_gerek_ikamet }
    ];

    belgeler.forEach(belge => {
        const isaret = belge.durum === 1 ? '✓' : '✗';
        worksheet.getCell(belge.cell).value = isaret;
    });

    // Kurs türü işaretleri
    if (student.ogr_turu && student.ogr_turu.includes('Yenileme')) {
        worksheet.getCell('E2').value = 'X';
    } else if (student.ogr_turu && student.ogr_turu.includes('Temel')) {
        worksheet.getCell('C2').value = 'X';
    }

    if (student.ogr_silah_durum === 'Silahlı') {
        worksheet.getCell('I3').value = 'X';
    } else if (student.ogr_silah_durum === 'Silahsız') {
        worksheet.getCell('G3').value = 'X';
    } else if (student.ogr_silah_durum === 'Siah Fark') {
        worksheet.getCell('K3').value = 'X';
    }

    console.log('✅ ExcelJS ile veriler yerleştirildi');
}

/**
 * ExcelJS ile dosya indirme
 */
async function downloadWithExcelJS(workbook, student) {
    try {
        // Dosya adı oluştur
        const cleanName = (name) => name.replace(/[çÇğĞıİöÖşŞüÜ]/g, (match) => {
            const map = {
                'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G',
                'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O',
                'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
            };
            return map[match] || match;
        }).replace(/[^a-zA-Z0-9_-]/g, '_');

        const studentName = cleanName(`${student.ogr_ad || 'ogrenci'}_${student.ogr_soyad || ''}`.trim());
        const tarih = new Date().toISOString().split('T')[0];
        const fileName = `kursiyer_kayit_formu_${studentName}_${tarih}.xlsx`;

        // Buffer oluştur
        const buffer = await workbook.xlsx.writeBuffer();

        // İndir
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = fileName;

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        console.log(`✅ ExcelJS dosya indirildi: ${fileName}`);

    } catch (error) {
        console.error('❌ ExcelJS indirme hatası:', error);
        throw error;
    }
}

// Ana fonksiyonu güncelle
window.generateExcelForm = async function (studentId) {
    try {
        console.log('📄 Excel form oluşturuluyor (ExcelJS):', studentId);
        showNotification('Excel formu hazırlanıyor (gelişmiş format)...', 'info');

        const student = await window.db.getOgrenciById(studentId);
        if (!student) {
            showNotification('Öğrenci bulunamadı', 'error');
            return;
        }

        // ExcelJS ile işle
        await fillExcelWithExcelJS(student);

    } catch (error) {
        console.error('❌ Excel form hatası:', error);
        showNotification('Excel formu oluşturulamadı: ' + error.message, 'error');
    }
};

// Bildirim badge güncelleme fonksiyonu (sayfa yüklenince)
async function updateNotificationBadgeOnLoad() {
    try {
        if (window.db && window.db.getBildirimStats) {
            const stats = await window.db.getBildirimStats();
            if (stats && stats.okunmamis > 0) {
                updateNotificationBadge(stats.okunmamis);
            }
        }
    } catch (error) {
        console.log('Bildirim badge güncellenemedi:', error);
    }
}

// Header'daki bildirim badge'ini güncelle
function updateNotificationBadge(count) {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

