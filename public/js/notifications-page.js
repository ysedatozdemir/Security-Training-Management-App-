// =============================================================================
// BİLDİRİM SAYFASI YÖNETİMİ - notifications-page.js
// =============================================================================

// Global değişkenler
let allNotifications = [];
let filteredNotifications = [];
let currentNotificationFilters = {
    type: 'all',
    status: 'all', 
    priority: 'all',
    search: ''
};
let selectedNotificationIds = [];
let currentNotificationPage = 1;
let notificationsPerPage = 10;
let currentNotificationModal = null;

// =============================================================================
// BİLDİRİM SAYFA YÖNETİMİ
// =============================================================================

// Bildirim sayfası yüklendiğinde
async function loadNotificationsPage() {
    console.log('📧 Bildirimler sayfası yükleniyor...');
    
    try {
        // İstatistikleri yükle
        await loadNotificationStats();
        
        // Bildirimleri yükle
        await loadNotifications();
        
        // Filtreleri kur
        setupNotificationFilters();
        
        // Arama fonksiyonunu kur
        setupNotificationSearch();
        
        console.log('✅ Bildirimler sayfası hazır!');
        
    } catch (error) {
        console.error('❌ Bildirimler sayfası yüklenemedi:', error);
        showNotification('Bildirimler yüklenemedi', 'error');
    }
}

// İstatistikleri yükle
async function loadNotificationStats() {
    try {
        const stats = await window.db.getBildirimStats();
        
        if (stats) {
            document.getElementById('totalNotifications').textContent = stats.toplam || 0;
            document.getElementById('unreadNotifications').textContent = stats.okunmamis || 0;
            document.getElementById('urgentNotifications').textContent = stats.acil || 0;
            document.getElementById('todayNotifications').textContent = stats.bugun || 0;
            
            // Header'daki bildirim badge'ini güncelle
            updateNotificationBadge(stats.okunmamis || 0);
        }
        
    } catch (error) {
        console.error('❌ İstatistikler yüklenemedi:', error);
    }
}

// Tüm bildirimleri yükle
async function loadNotifications() {
    const loadingDiv = document.getElementById('notifications-loading');
    const tableDiv = document.getElementById('notifications-table');
    const emptyDiv = document.getElementById('notifications-empty');
    
    // Loading göster
    loadingDiv.style.display = 'block';
    tableDiv.style.display = 'none';
    emptyDiv.style.display = 'none';
    
    try {
        allNotifications = await window.db.getBildirimler();
        
        if (allNotifications && allNotifications.length > 0) {
            // Filtreleri uygula
            applyNotificationFilters();
            
            // Tabloyu göster
            loadingDiv.style.display = 'none';
            tableDiv.style.display = 'block';
            
        } else {
            // Boş durum göster
            loadingDiv.style.display = 'none';
            emptyDiv.style.display = 'block';
        }
        
    } catch (error) {
        console.error('❌ Bildirimler yüklenemedi:', error);
        loadingDiv.style.display = 'none';
        emptyDiv.style.display = 'block';
    }
}

// =============================================================================
// FİLTRELEME SİSTEMİ
// =============================================================================

// Filtre sistemini kur
function setupNotificationFilters() {
    const filterButtons = document.querySelectorAll('#notifications-content .filter-tab');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filterType = this.dataset.type;
            const filterValue = this.dataset.filter;
            
            // Aktif durumu güncelle
            document.querySelectorAll(`.filter-tab[data-type="${filterType}"]`).forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            // Filtreyi güncelle
            currentNotificationFilters[filterType] = filterValue;
            
            // Filtreleri uygula
            applyNotificationFilters();
        });
    });
}

// Arama sistemini kur
function setupNotificationSearch() {
    const searchInput = document.getElementById('notificationSearch');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentNotificationFilters.search = this.value.toLowerCase().trim();
            
            // Debounced search
            clearTimeout(window.notificationSearchTimeout);
            window.notificationSearchTimeout = setTimeout(() => {
                applyNotificationFilters();
            }, 300);
        });
    }
}

// Filtreleri uygula
function applyNotificationFilters() {
    if (!allNotifications) return;
    
    filteredNotifications = allNotifications.filter(notification => {
        // Tür filtresi
        if (currentNotificationFilters.type !== 'all' && 
            notification.turu !== currentNotificationFilters.type) {
            return false;
        }
        
        // Durum filtresi
        if (currentNotificationFilters.status === 'okunmamis' && notification.okundu) {
            return false;
        }
        if (currentNotificationFilters.status === 'okunmus' && !notification.okundu) {
            return false;
        }
        
        // Öncelik filtresi
        if (currentNotificationFilters.priority !== 'all' && 
            notification.oncelik !== currentNotificationFilters.priority) {
            return false;
        }
        
        // Arama filtresi
        if (currentNotificationFilters.search) {
            const searchText = currentNotificationFilters.search;
            return (
                notification.baslik.toLowerCase().includes(searchText) ||
                notification.mesaj.toLowerCase().includes(searchText) ||
                (notification.ogr_ad && notification.ogr_ad.toLowerCase().includes(searchText)) ||
                (notification.ogr_soyad && notification.ogr_soyad.toLowerCase().includes(searchText))
            );
        }
        
        return true;
    });
    
    // Sayfayı sıfırla
    currentNotificationPage = 1;
    
    // Tabloyu render et
    renderNotificationsList();
    
    // Sayıları güncelle
    updateNotificationCounts();
}

// =============================================================================
// TABLO RENDER
// =============================================================================

// Bildirimler listesini render et
function renderNotificationsList() {
    const listContainer = document.getElementById('notificationsList');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    // Sayfalama hesapla
    const startIndex = (currentNotificationPage - 1) * notificationsPerPage;
    const endIndex = startIndex + notificationsPerPage;
    const pageNotifications = filteredNotifications.slice(startIndex, endIndex);
    
    pageNotifications.forEach(notification => {
        const notificationElement = createNotificationElement(notification);
        listContainer.appendChild(notificationElement);
    });
    
    // Sayfalama kontrolleri
    updateNotificationsPagination();
}

// Tek bildirim elementi oluştur
function createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = `notification-item ${!notification.okundu ? 'unread' : ''} ${notification.oncelik}`;
    div.dataset.id = notification.id;
    
    // Öncelik ikonu
    const priorityIcons = {
        'acil': 'fas fa-exclamation-triangle text-red-600',
        'onemli': 'fas fa-exclamation-circle text-yellow-600',
        'bilgi': 'fas fa-info-circle text-blue-600'
    };
    
    // Tür ikonu
    const typeIcons = {
        'egitim': 'fas fa-graduation-cap',
        'odeme': 'fas fa-credit-card',
        'belge': 'fas fa-file-alt',
        'kimlik_suresi': 'fas fa-id-card'
    };
    
    // Tarih formatla
    const createdDate = new Date(notification.olusturma_tarihi);
    const timeAgo = formatTimeAgo(createdDate);
    
    div.innerHTML = `
        <div class="notification-checkbox">
            <input type="checkbox" id="notification_${notification.id}" 
                   onchange="toggleNotificationSelection(${notification.id})"
                   ${selectedNotificationIds.includes(notification.id) ? 'checked' : ''}>
        </div>
        
        <div class="notification-icon ${notification.oncelik}">
            <i class="${priorityIcons[notification.oncelik]}"></i>
        </div>
        
        <div class="notification-content">
            <div class="notification-header">
                <div class="notification-title">
                    <i class="${typeIcons[notification.turu]}" style="margin-right: 6px;"></i>
                    ${notification.baslik}
                </div>
                <div class="notification-meta">
                    <span class="notification-time">${timeAgo}</span>
                    ${!notification.okundu ? '<span class="unread-badge">Okunmadı</span>' : ''}
                </div>
            </div>
            
            <div class="notification-preview">
                ${truncateText(notification.mesaj, 150)}
            </div>
            
            ${notification.ogr_ad ? `
                <div class="notification-student">
                    <i class="fas fa-user" style="margin-right: 4px;"></i>
                    ${notification.ogr_ad} ${notification.ogr_soyad}
                    ${notification.ogr_TC ? `(${notification.ogr_TC})` : ''}
                </div>
            ` : ''}
            
            ${notification.donem_numara ? `
                <div class="notification-term">
                    <i class="fas fa-calendar-alt" style="margin-right: 4px;"></i>
                    Dönem: ${notification.donem_numara} (${notification.donem_turu || ''})
                </div>
            ` : ''}
        </div>
        
        <div class="notification-actions">
            <button class="action-btn view" onclick="viewNotificationDetail(${notification.id})" title="Detay Görüntüle">
                <i class="fas fa-eye"></i>
            </button>
            
            ${!notification.okundu ? `
                <button class="action-btn mark-read" onclick="markSingleNotificationAsRead(${notification.id})" title="Okundu İşaretle">
                    <i class="fas fa-check"></i>
                </button>
            ` : ''}
            
            <button class="action-btn delete" onclick="deleteSingleNotification(${notification.id})" title="Sil">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return div;
}

// =============================================================================
// YARDIMCI FONKSİYONLAR
// =============================================================================

// Zaman farkını hesapla (kaç dakika/saat/gün önce)
function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) return 'Şimdi';
    if (diffMinutes < 60) return `${diffMinutes} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR');
}

// Metni kısalt
function truncateText(text, length) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

// Bildirim sayılarını güncelle
function updateNotificationCounts() {
    const countElement = document.getElementById('notificationCount');
    if (countElement) {
        countElement.textContent = `${filteredNotifications.length} bildirim`;
    }
}

// Sayfalama kontrollerini güncelle
function updateNotificationsPagination() {
    const totalPages = Math.ceil(filteredNotifications.length / notificationsPerPage);
    const paginationContainer = document.getElementById('notificationsPagination');
    
    if (totalPages > 1) {
        paginationContainer.style.display = 'flex';
        document.getElementById('currentPageInfo').textContent = `Sayfa ${currentNotificationPage} / ${totalPages}`;
        document.getElementById('prevPageBtn').disabled = currentNotificationPage <= 1;
        document.getElementById('nextPageBtn').disabled = currentNotificationPage >= totalPages;
    } else {
        paginationContainer.style.display = 'none';
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

// =============================================================================
// SEÇME VE TOPLU İŞLEM FONKSİYONLARI
// =============================================================================

// Tüm bildirimleri seç/seçimi kaldır
function selectAllNotifications() {
    const selectAllCheckbox = document.getElementById('selectAllNotifications');
    const checkboxes = document.querySelectorAll('.notification-item input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        const notificationId = parseInt(checkbox.id.split('_')[1]);
        
        if (selectAllCheckbox.checked) {
            if (!selectedNotificationIds.includes(notificationId)) {
                selectedNotificationIds.push(notificationId);
            }
        } else {
            selectedNotificationIds = selectedNotificationIds.filter(id => id !== notificationId);
        }
    });
    
    console.log('📧 Seçili bildirimler:', selectedNotificationIds);
}

// Tekil bildirim seçimini toggle et
function toggleNotificationSelection(notificationId) {
    const checkbox = document.getElementById(`notification_${notificationId}`);
    
    if (checkbox.checked) {
        if (!selectedNotificationIds.includes(notificationId)) {
            selectedNotificationIds.push(notificationId);
        }
    } else {
        selectedNotificationIds = selectedNotificationIds.filter(id => id !== notificationId);
    }
    
    // Tümünü seç checkbox'ını güncelle
    const totalCheckboxes = document.querySelectorAll('.notification-item input[type="checkbox"]').length;
    const selectAllCheckbox = document.getElementById('selectAllNotifications');
    
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = selectedNotificationIds.length === totalCheckboxes;
        selectAllCheckbox.indeterminate = selectedNotificationIds.length > 0 && selectedNotificationIds.length < totalCheckboxes;
    }
    
    console.log('📧 Seçili bildirimler:', selectedNotificationIds);
}

// =============================================================================
// BİLDİRİM İŞLEMLERİ
// =============================================================================

// Bildirim detayını görüntüle
async function viewNotificationDetail(notificationId) {
    const notification = allNotifications.find(n => n.id === notificationId);
    if (!notification) return;
    
    const modal = document.getElementById('notificationDetailModal');
    const content = document.getElementById('notificationDetailContent');
    
    // Detay içeriğini oluştur
    content.innerHTML = `
        <div class="notification-detail">
            <div class="detail-header">
                <div class="detail-priority ${notification.oncelik}">
                    <i class="fas fa-${notification.oncelik === 'acil' ? 'exclamation-triangle' : 
                                      notification.oncelik === 'onemli' ? 'exclamation-circle' : 'info-circle'}"></i>
                    ${notification.oncelik.toUpperCase()}
                </div>
                <div class="detail-type">
                    <i class="fas fa-${notification.turu === 'egitim' ? 'graduation-cap' : 
                                     notification.turu === 'odeme' ? 'credit-card' :
                                     notification.turu === 'belge' ? 'file-alt' : 'id-card'}"></i>
                    ${notification.turu.replace('_', ' ').toUpperCase()}
                </div>
            </div>
            
            <div class="detail-title">
                <h3>${notification.baslik}</h3>
                <div class="detail-date">
                    <i class="fas fa-clock"></i>
                    ${new Date(notification.olusturma_tarihi).toLocaleString('tr-TR')}
                </div>
            </div>
            
            <div class="detail-message">
                <pre style="white-space: pre-wrap; font-family: inherit;">${notification.mesaj}</pre>
            </div>
            
            ${notification.ogr_ad || notification.donem_numara ? `
                <div class="detail-related">
                    <h4>İlgili Bilgiler:</h4>
                    ${notification.ogr_ad ? `
                        <div class="related-student">
                            <i class="fas fa-user"></i>
                            <strong>Öğrenci:</strong> ${notification.ogr_ad} ${notification.ogr_soyad}
                            ${notification.ogr_TC ? `<br><strong>TC:</strong> ${notification.ogr_TC}` : ''}
                            ${notification.ogr_ceptel ? `<br><strong>Telefon:</strong> ${notification.ogr_ceptel}` : ''}
                        </div>
                    ` : ''}
                    
                    ${notification.donem_numara ? `
                        <div class="related-term">
                            <i class="fas fa-calendar-alt"></i>
                            <strong>Dönem:</strong> ${notification.donem_numara} (${notification.donem_turu || ''})
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <div class="detail-status">
                <div class="status-item">
                    <strong>Durum:</strong>
                    <span class="status-badge ${notification.okundu ? 'read' : 'unread'}">
                        <i class="fas fa-${notification.okundu ? 'eye' : 'eye-slash'}"></i>
                        ${notification.okundu ? 'Okundu' : 'Okunmadı'}
                    </span>
                </div>
                
                ${notification.okunma_tarihi ? `
                    <div class="status-item">
                        <strong>Okunma Tarihi:</strong>
                        ${new Date(notification.okunma_tarihi).toLocaleString('tr-TR')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Modal butonunu güncelle
    const markAsReadBtn = document.getElementById('markAsReadBtn');
    if (notification.okundu) {
        markAsReadBtn.style.display = 'none';
    } else {
        markAsReadBtn.style.display = 'inline-flex';
        markAsReadBtn.onclick = () => markSingleNotificationAsRead(notificationId, true);
    }
    
    // Modal'ı aç
    currentNotificationModal = notificationId;
    modal.style.display = 'flex';
    
    // Eğer okunmamışsa, görüntüleme ile birlikte okundu işaretle
    if (!notification.okundu) {
        setTimeout(() => {
            markSingleNotificationAsRead(notificationId, false);
        }, 2000); // 2 saniye sonra otomatik okundu işaretle
    }
}

// Modal'ı kapat
function closeNotificationDetailModal() {
    const modal = document.getElementById('notificationDetailModal');
    modal.style.display = 'none';
    currentNotificationModal = null;
}

// Tekil bildirimi okundu işaretle
async function markSingleNotificationAsRead(notificationId, closeModal = false) {
    try {
        const result = await window.db.markBildirimOkundu(notificationId);
        
        if (!result.error) {
            // Yerel veriyi güncelle
            const notification = allNotifications.find(n => n.id === notificationId);
            if (notification) {
                notification.okundu = true;
                notification.okunma_tarihi = new Date().toISOString();
            }
            
            // Tabloyu yenile
            applyNotificationFilters();
            
            // İstatistikleri yenile
            await loadNotificationStats();
            
            showNotification('Bildirim okundu olarak işaretlendi', 'success');
            
            if (closeModal) {
                closeNotificationDetailModal();
            }
        } else {
            showNotification('Bildirim güncellenemedi', 'error');
        }
        
    } catch (error) {
        console.error('❌ Bildirim güncellenirken hata:', error);
        showNotification('Bildirim güncellenirken hata oluştu', 'error');
    }
}

// Tüm bildirimleri okundu işaretle
async function markAllNotificationsRead() {
    if (!confirm('Tüm bildirimler okundu olarak işaretlenecek. Emin misiniz?')) {
        return;
    }
    
    try {
        const result = await window.db.markAllBildirimlerOkundu();
        
        if (!result.error) {
            // Yerel veriyi güncelle
            allNotifications.forEach(notification => {
                notification.okundu = true;
                notification.okunma_tarihi = new Date().toISOString();
            });
            
            // Tabloyu yenile
            applyNotificationFilters();
            
            // İstatistikleri yenile
            await loadNotificationStats();
            
            showNotification('Tüm bildirimler okundu olarak işaretlendi', 'success');
            
        } else {
            showNotification('Bildirimler güncellenemedi', 'error');
        }
        
    } catch (error) {
        console.error('❌ Bildirimler güncellenirken hata:', error);
        showNotification('Bildirimler güncellenirken hata oluştu', 'error');
    }
}

// Tekil bildirimi sil
async function deleteSingleNotification(notificationId) {
    const notification = allNotifications.find(n => n.id === notificationId);
    if (!notification) return;
    
    if (!confirm(`"${notification.baslik}" bildirimini silmek istediğinizden emin misiniz?`)) {
        return;
    }
    
    try {
        const result = await window.db.deleteBildirim(notificationId);
        
        if (!result.error) {
            // Yerel veriden kaldır
            allNotifications = allNotifications.filter(n => n.id !== notificationId);
            selectedNotificationIds = selectedNotificationIds.filter(id => id !== notificationId);
            
            // Tabloyu yenile
            applyNotificationFilters();
            
            // İstatistikleri yenile
            await loadNotificationStats();
            
            showNotification('Bildirim silindi', 'success');
            
        } else {
            showNotification('Bildirim silinemedi', 'error');
        }
        
    } catch (error) {
        console.error('❌ Bildirim silinirken hata:', error);
        showNotification('Bildirim silinirken hata oluştu', 'error');
    }
}

// Seçili bildirimleri sil
async function deleteSelectedNotifications() {
    if (selectedNotificationIds.length === 0) {
        showNotification('Silinecek bildirim seçiniz', 'warning');
        return;
    }
    
    if (!confirm(`${selectedNotificationIds.length} bildirimi silmek istediğinizden emin misiniz?`)) {
        return;
    }
    
    try {
        const result = await window.db.deleteBildirimlerByIds(selectedNotificationIds);
        
        if (!result.error) {
            // Yerel veriden kaldır
            allNotifications = allNotifications.filter(n => !selectedNotificationIds.includes(n.id));
            selectedNotificationIds = [];
            
            // Tabloyu yenile
            applyNotificationFilters();
            
            // İstatistikleri yenile
            await loadNotificationStats();
            
            showNotification('Seçili bildirimler silindi', 'success');
            
        } else {
            showNotification('Bildirimler silinemedi', 'error');
        }
        
    } catch (error) {
        console.error('❌ Bildirimler silinirken hata:', error);
        showNotification('Bildirimler silinirken hata oluştu', 'error');
    }
}

// =============================================================================
// SAYFALAMA FONKSİYONLARI
// =============================================================================

// Sayfa değiştir
function changePage(direction) {
    const totalPages = Math.ceil(filteredNotifications.length / notificationsPerPage);
    
    if (direction === -1 && currentNotificationPage > 1) {
        currentNotificationPage--;
    } else if (direction === 1 && currentNotificationPage < totalPages) {
        currentNotificationPage++;
    }
    
    renderNotificationsList();
}

// =============================================================================
// OTOMATİK KONTROL FONKSİYONLARI
// =============================================================================

// Manuel bildirim kontrolü çalıştır
async function runManualNotificationCheck() {
    const button = event?.target?.closest('button');
    if (button) {
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kontrol Ediliyor...';
        
        try {
            const result = await window.db.manualNotificationCheck();
            
            if (result && !result.hata) {
                const totalNew = result.toplam || 0;
                
                if (totalNew > 0) {
                    showNotification(`${totalNew} yeni bildirim oluşturuldu`, 'success');
                    
                    // Sayfayı yenile
                    await loadNotifications();
                    await loadNotificationStats();
                } else {
                    showNotification('Yeni bildirim oluşturulmadı', 'info');
                }
                
                console.log('📧 Manuel kontrol sonuçları:', result);
                
            } else {
                showNotification('Kontrol sırasında hata oluştu', 'error');
            }
            
        } catch (error) {
            console.error('❌ Manuel kontrol hatası:', error);
            showNotification('Kontrol sırasında hata oluştu', 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.innerHTML = originalText;
            }
        }
    }
}

// =============================================================================
// GLOBAL FONKSİYONLAR - WINDOW'A EKLE
// =============================================================================

// Global fonksiyonları tanımla
window.loadNotificationsPage = loadNotificationsPage;
window.viewNotificationDetail = viewNotificationDetail;
window.closeNotificationDetailModal = closeNotificationDetailModal;
window.markSingleNotificationAsRead = markSingleNotificationAsRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.deleteSingleNotification = deleteSingleNotification;
window.deleteSelectedNotifications = deleteSelectedNotifications;
window.selectAllNotifications = selectAllNotifications;
window.toggleNotificationSelection = toggleNotificationSelection;
window.changePage = changePage;
window.runManualNotificationCheck = runManualNotificationCheck;
window.markNotificationAsRead = () => markSingleNotificationAsRead(currentNotificationModal, true);

console.log('✅ Bildirim sayfası JavaScript fonksiyonları hazır!');