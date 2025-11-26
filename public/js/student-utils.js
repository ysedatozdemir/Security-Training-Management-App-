// TC Kimlik doğrulama algoritması
function isValidTCNumber(tc) {
    if (!tc || tc.length !== 11) return false;
    
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

// Öğrenci kopyalama fonksiyonu
window.duplicateStudent = async function(studentId) {
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
    
    // Doğum tarihini kopyala (Flatpickr için özel işlem)
    if (student.ogr_dogum_tarihi) {
        setTimeout(() => {
            const birthDatePicker = document.getElementById('studentBirthDate')._flatpickr;
            if (birthDatePicker) {
                // Database formatından Flatpickr formatına çevir
                const dateParts = student.ogr_dogum_tarihi.split('-');
                if (dateParts.length === 3) {
                    const formattedDate = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
                    birthDatePicker.setDate(formattedDate);
                }
            }
        }, 200);
    }
    
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

// Tarih formatlama yardımcı fonksiyonu
function formatDate(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Bildirim gösterme fonksiyonu (eğer yoksa)
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

// Global fonksiyonları tanımla
window.isValidTCNumber = isValidTCNumber;
window.fillDuplicateForm = fillDuplicateForm;
window.formatDate = formatDate;
window.showNotification = showNotification;

console.log('✅ Öğrenci utility fonksiyonları yüklendi!');