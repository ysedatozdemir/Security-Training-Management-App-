// Global değişkenleri sadece bir kez tanımla
if (typeof window.currentEditingStudent === 'undefined') {
    window.currentEditingStudent = null;
}

// =============================================================================
// DÜZENLEMİ MODAL AÇMA VE KAPATMA
// =============================================================================

async function editStudentDetails(studentId) {
    console.log('✏️ Öğrenci düzenleniyor:', studentId);

    try {
        const student = await window.db.getOgrenciById(studentId);

        if (!student) {
            showNotification('Öğrenci bulunamadı', 'error');
            return;
        }

        window.currentEditingStudent = student;
        openEditStudentModal(student);

    } catch (error) {
        console.error('⚠️ Öğrenci bilgileri yüklenirken hata:', error);
        showNotification('Öğrenci bilgileri yüklenirken hata oluştu', 'error');
    }
}

function openEditStudentModal(student) {
    const modalHTML = createEditStudentModalHTML(student);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    setupEditStudentModalEvents();
    fillEditFormWithStudentData(student);

    console.log('📝 Düzenleme modalı açıldı');
}

function createEditStudentModalHTML(student) {
    return `
        <div class="modal-overlay active" id="editStudentModal">
            <div class="modal-container" style="max-width: 900px;">
                <div class="modal-header">
                    <h2>
                        <i class="fas fa-edit"></i>
                        Öğrenci Düzenle
                    </h2>
                    <button class="modal-close" onclick="closeEditStudentModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="modal-body">
                    <!-- Öğrenci Özet Bilgisi -->
                    <div class="student-summary" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 24px; display: flex; align-items: center; gap: 16px;">
                        <div class="student-avatar" style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); font-size: 18px;">
                            ${(student.ogr_ad?.charAt(0) || '') + (student.ogr_soyad?.charAt(0) || '')}
                        </div>
                        <div>
                            <h3 style="margin: 0 0 8px 0; font-size: 20px;">${student.ogr_ad} ${student.ogr_soyad}</h3>
                            <div class="student-info" style="display: flex; gap: 16px; font-size: 14px; opacity: 0.9;">
                                <span><i class="fas fa-id-card"></i> ${student.ogr_TC || '-'}</span>
                                <span><i class="fas fa-graduation-cap"></i> ${student.ogr_turu || '-'}</span>
                                <span><i class="fas fa-calendar"></i> ${formatDate(student.ogr_kayit_tarihi)}</span>
                            </div>
                        </div>
                    </div>

                    <form id="editStudentForm">
                        <input type="hidden" name="student_id" value="${student.id}">
                        <input type="hidden" name="ogr_donem" value="${student.ogr_donem}">

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
                                    <input type="text" class="form-input" name="ogr_TC" pattern="[0-9]{11}" maxlength="11" required onblur="validateTCNumberForEdit(this)">
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
                            <!-- KURS ÜCRETİ VE İLK ÖDEME ALANLARI -->
<div class="form-section">
    <h3 class="section-title-form">
        <i class="fas fa-money-bill-wave"></i> Ödeme Bilgileri
    </h3>
    <div class="form-row">
        <div class="form-group">
            <label class="form-label">Kurs Ücreti *</label>
            <div style="position: relative;">
                <input type="number" 
                       id="editKursUcreti"
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
            <label class="form-label">Mevcut Toplam Ödeme</label>
            <div style="position: relative;">
                <input type="number" 
                       id="editToplamOdeme"
                       class="form-input" 
                       placeholder="0.00"
                       readonly
                       style="padding-right: 40px; background: #f3f4f6; color: #6b7280;">
                <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #6b7280; font-weight: 500;">₺</span>
            </div>
            <small style="color: #6b7280; font-size: 12px; margin-top: 4px; display: block;">
                Bu öğrencinin şu ana kadar yaptığı toplam ödeme (salt okunur)
            </small>
        </div>
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
                                    <input type="text" class="form-input" id="editStudentBirthDate" name="ogr_dogum_tarihi" placeholder="Gün/Ay/Yıl" readonly>
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
                                <div class="form-group">
                                    <label class="form-label">Durum</label>
                                    <select class="form-select" name="ogr_durum">
                                        <option value="Aktif">Aktif</option>
                                        <option value="Pasif">Pasif</option>
                                        <option value="Mezun">Mezun</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Sınav Puanı (0-100)</label>
                                    <input type="number" class="form-input" name="ogr_sinav_puan" min="0" max="100" onkeyup="calculateExamResultEdit(this)">
                                    <div id="examResultEdit" style="display: none; margin-top: 8px;"></div>
                                </div>
                                <!--div class="form-group">
                                    <label class="form-label">Ödeme (₺)</label>
                                    <input type="number" class="form-input" name="ogr_odeme" min="0" step="0.01">
                                </div-->
                            </div>
                            <div class="form-row">
                                <div class="form-group" style="grid-column: 1 / -1;">
                                    <label class="form-label">Notlar</label>
                                    <textarea class="form-input" name="ogr_not" rows="3" style="resize: vertical;" placeholder="Öğrenci hakkında ek notlar..."></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- Gerekli Belgeler -->
                        <div class="form-section">
                            <h3 class="section-title-form">
                                <i class="fas fa-file-alt"></i> Gerekli Belgeler
                            </h3>
                            <div class="documents-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                                ${createDocumentChecklistForEdit()}
                            </div>
                        </div>
                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeEditStudentModal()">
                        <i class="fas fa-times"></i>
                        İptal
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="resetStudentForm()" style="background: #f59e0b; color: white;">
                        <i class="fas fa-undo"></i>
                        Sıfırla
                    </button>
                    <button type="submit" form="editStudentForm" class="btn btn-primary">
                        <i class="fas fa-save"></i>
                        Değişiklikleri Kaydet
                    </button>
                </div>
            </div>
        </div>
    `;
}

function createDocumentChecklistForEdit() {
    const belgeler = [
        { name: 'Fotoğraf', field: 'ogr_gerek_foto', icon: 'camera' },
        { name: 'Diploma', field: 'ogr_gerek_diploma', icon: 'graduation-cap' },
        { name: 'Kimlik Fotokopisi', field: 'ogr_gerek_kimlik', icon: 'id-card' },
        { name: 'Yaka Kartı', field: 'ogr_gerek_yakakarti', icon: 'badge' },
        { name: 'Sağlık Raporu', field: 'ogr_gerek_saglik', icon: 'heartbeat' },
        { name: 'İkamet Belgesi', field: 'ogr_gerek_ikamet', icon: 'home' }
    ];

    return belgeler.map(belge => `
        <div class="doc-check-item" onclick="toggleDocumentCheckEdit(this, '${belge.field}')">
            <div class="doc-checkbox">
                <i class="fas fa-check" style="display: none;"></i>
            </div>
            <div class="doc-check-label">
                <i class="fas fa-${belge.icon} doc-check-icon"></i>
                ${belge.name}
            </div>
            <input type="hidden" name="${belge.field}" value="0">
        </div>
    `).join('');
}

function closeEditStudentModal() {
    const modal = document.getElementById('editStudentModal');
    if (modal) {
        // Flatpickr temizle
        const birthDateInput = document.getElementById('editStudentBirthDate');
        if (birthDateInput && birthDateInput._flatpickr) {
            birthDateInput._flatpickr.destroy();
        }

        modal.remove();
        document.body.style.overflow = '';
        window.currentEditingStudent = null;
    }
}

// =============================================================================
// FORM DOLDURMA VE YARDIMCI FONKSİYONLAR
// =============================================================================

function fillEditFormWithStudentData(student) {
    const form = document.getElementById('editStudentForm');
    if (!form) return;

    // Basit alan doldurma
    const fields = [
        'ogr_ad', 'ogr_soyad', 'ogr_TC', 'ogr_turu', 'ogr_baba_ad', 'ogr_anne_ad',
        'ogr_dogum_yeri', 'ogr_ogrenim_durumu', 'ogr_ceptel',
        'ogr_yedek_ceptel', 'ogr_mail', 'ogr_kan_grubu', 'ogr_adres', 'ogr_durum',
        'ogr_rapor_tarih_no', 'ogr_silah_durum', 'ogr_sinav_puan', 'ogr_not'
    ];

    fields.forEach(fieldName => {
        const input = form.querySelector(`[name="${fieldName}"]`);
        if (input && student[fieldName] !== undefined && student[fieldName] !== null) {
            input.value = student[fieldName];
        }
    });

    // Ödeme bilgilerini doldur
    document.getElementById('editKursUcreti').value = student.ogr_odeme || '';

    // Toplam ödeme bilgisini getir ve göster
    if (student.id) {
        window.db.getOdemelerByOgrenci(student.id).then(payments => {
            const totalPaid = payments ? payments.reduce((sum, p) => sum + (parseFloat(p.odenen_tutar) || 0), 0) : 0;
            document.getElementById('editToplamOdeme').value = totalPaid.toFixed(2);
        }).catch(error => {
            console.error('Ödeme bilgileri yüklenemedi:', error);
            document.getElementById('editToplamOdeme').value = '0.00';
        });
    }

    // Doğum tarihi için özel işlem - GÜVENLİ HANDLİNG
    setTimeout(() => {
        const birthDatePicker = initializeEditStudentBirthDatePicker(student.ogr_dogum_tarihi);
        if (birthDatePicker && student.ogr_dogum_tarihi) {

            // GÜVENLİ TARİH İŞLEME - Date objesi veya string olabilir
            let formattedDate = null;

            if (student.ogr_dogum_tarihi instanceof Date) {
                // Date objesi ise, doğrudan formatla
                const day = String(student.ogr_dogum_tarihi.getDate()).padStart(2, '0');
                const month = String(student.ogr_dogum_tarihi.getMonth() + 1).padStart(2, '0');
                const year = student.ogr_dogum_tarihi.getFullYear();
                formattedDate = `${day}.${month}.${year}`;
            } else if (typeof student.ogr_dogum_tarihi === 'string') {
                // String ise split kullanabilir
                if (student.ogr_dogum_tarihi.includes('-')) {
                    // YYYY-MM-DD formatından dd.mm.yyyy formatına
                    const dateParts = student.ogr_dogum_tarihi.split('-');
                    if (dateParts.length === 3) {
                        formattedDate = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
                    }
                } else if (student.ogr_dogum_tarihi.includes('.')) {
                    // Zaten dd.mm.yyyy formatında
                    formattedDate = student.ogr_dogum_tarihi;
                }
            }

            if (formattedDate) {
                birthDatePicker.setDate(formattedDate);
                console.log('✅ Doğum tarihi set edildi:', formattedDate);
            }
        }
    }, 100);

    // Belge durumlarını doldur
    const belgeler = [
        'ogr_gerek_foto', 'ogr_gerek_diploma', 'ogr_gerek_kimlik',
        'ogr_gerek_yakakarti', 'ogr_gerek_saglik', 'ogr_gerek_ikamet'
    ];

    belgeler.forEach(belgeAdi => {
        const hiddenInput = form.querySelector(`[name="${belgeAdi}"]`);
        const checkItem = hiddenInput?.closest('.doc-check-item');

        if (hiddenInput && checkItem) {
            const isChecked = student[belgeAdi] === 1;
            const checkbox = checkItem.querySelector('.doc-checkbox');
            const checkIcon = checkbox.querySelector('i');

            hiddenInput.value = isChecked ? '1' : '0';
            checkbox.classList.toggle('checked', isChecked);
            if (checkIcon) {
                checkIcon.style.display = isChecked ? 'block' : 'none';
            }
        }
    });
}

function setupEditStudentModalEvents() {
    const form = document.getElementById('editStudentForm');
    if (form) {
        form.addEventListener('submit', handleEditStudentFormSubmit);
    }

    // ESC tuşu ile modal kapatma
    const handleEscape = function (e) {
        if (e.key === 'Escape') {
            closeEditStudentModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    // Modal overlay tıklama ile kapatma
    const modal = document.getElementById('editStudentModal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeEditStudentModal();
            }
        });
    }
}

// =============================================================================
// FORM VALİDASYON VE YARDIMCI FONKSİYONLAR
// =============================================================================

function toggleDocumentCheckEdit(element, inputName) {
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

function calculateExamResultEdit(input) {
    const score = parseInt(input.value);
    const resultDiv = document.getElementById('examResultEdit');

    if (score >= 0 && score <= 100) {
        resultDiv.style.display = 'block';

        if (score >= 60) {
            resultDiv.className = 'score-result passed';
            resultDiv.innerHTML = '<i class="fas fa-check-circle"></i> GEÇTİ';
        } else {
            resultDiv.className = 'score-result failed';
            resultDiv.innerHTML = '<i class="fas fa-times-circle"></i> KALDI';
        }
    } else {
        resultDiv.style.display = 'none';
    }
}

async function validateTCNumberForEdit(input) {
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

    // Veritabanında aynı TC var mı kontrol et (kendisi hariç)
    try {
        const termId = window.currentEditingStudent.ogr_donem;
        const isDuplicate = await window.db.checkDuplicateStudent(tcNo, termId, window.currentEditingStudent.id);

        if (isDuplicate) {
            input.style.borderColor = '#dc2626';
            showNotification('Bu TC Kimlik numarası ile başka bir öğrenci kayıtlı', 'error');
            return false;
        }
    } catch (error) {
        console.error('TC kontrol hatası:', error);
    }

    input.style.borderColor = '#16a34a';
    return true;
}

function resetStudentForm() {
    if (confirm('Tüm değişiklikleri sıfırlamak istediğinizden emin misiniz?')) {
        fillEditFormWithStudentData(window.currentEditingStudent);
        showNotification('Form sıfırlandı', 'info');
    }
}

// =============================================================================
// FORM SUBMIT VE VERİTABANI İŞLEMLERİ
// =============================================================================

async function handleEditStudentFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]') ||
        document.querySelector('button[form="editStudentForm"]') ||
        document.querySelector('#editStudentModal .btn-primary');

    if (!submitBtn) {
        console.error('Submit button bulunamadı');
        return;
    }

    const originalText = submitBtn.innerHTML;

    // Loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Güncelleniyor...';

    try {
        const formData = new FormData(form);

        // Flatpickr tarihini database formatına çevir
        const birthDateInput = document.getElementById('editStudentBirthDate');
        if (birthDateInput && birthDateInput.value) {
            const birthDateValue = birthDateInput.value; // "dd.mm.yyyy" formatında
            const databaseDate = formatDateForDatabase(birthDateValue);
            formData.set('ogr_dogum_tarihi', databaseDate);
        }

        const studentData = {};

        // Form verilerini nesneye dönüştür
        for (let [key, value] of formData.entries()) {
            if (key !== 'student_id') {
                studentData[key] = value;
            }
        }

        const studentId = formData.get('student_id');

        // Validasyon
        if (!await validateEditStudentForm(studentData)) {
            return;
        }

        console.log('💾 Öğrenci güncelleniyor:', studentId, studentData);

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
        console.error('⚠️ Öğrenci güncelleme hatası:', error);
        showNotification('Öğrenci güncellenirken hata oluştu: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function validateEditStudentForm(studentData) {
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
        // Dönem türü kontrolü - Yenileme döneminde eğitim türü zorunlu değil  
        const currentTermId = appState?.currentTermId;
        const term = termsData?.find(t => t.id == currentTermId);

        if (term && term.donem_turu === 'Yenileme') {
            // Yenileme döneminde eğitim türünü otomatik ayarla
            studentData.ogr_turu = 'Yenileme';
            console.log('✅ Yenileme dönemi düzenleme - Eğitim türü otomatik ayarlandı:', studentData.ogr_turu);
        } else if (!studentData.ogr_turu) {
            // Diğer dönemlerde eğitim türü zorunlu
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

// Detay modalindan düzenleme geçişi
function editStudentFromDetail(studentId) {
    if (window.closeStudentDetailModal) {
        window.closeStudentDetailModal();
    }
    setTimeout(() => {
        editStudentDetails(studentId);
    }, 300);
}

// Global fonksiyonları tanımla
window.editStudentDetails = editStudentDetails;
window.closeEditStudentModal = closeEditStudentModal;
window.editStudentFromDetail = editStudentFromDetail;
window.toggleDocumentCheckEdit = toggleDocumentCheckEdit;
window.calculateExamResultEdit = calculateExamResultEdit;
window.validateTCNumberForEdit = validateTCNumberForEdit;
window.resetStudentForm = resetStudentForm;
window.handleEditStudentFormSubmit = handleEditStudentFormSubmit;

console.log('✅ Öğrenci düzenleme sistemi hazır!');

//
// Yardımcı Ek
//

function createStudentDetailModal(student) {
    return `
        <div class="student-detail-modal" id="studentDetailModal">
            <div class="modal-backdrop"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h2><i class="fas fa-user-graduate"></i> Öğrenci Detayları</h2>
                    <button class="close-btn" onclick="closeStudentDetailModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <!-- Öğrenci Başlık Bilgileri -->
                    <div class="student-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                         color: white; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); 
                                 border-radius: 50%; display: flex; align-items: center; justify-content: center; 
                                 font-weight: bold; font-size: 18px;">
                                ${(student.ogr_ad?.charAt(0) || '') + (student.ogr_soyad?.charAt(0) || '')}
                            </div>
                            <div>
                                <h3 style="margin: 0 0 8px 0; font-size: 24px;">${student.ogr_ad} ${student.ogr_soyad}</h3>
                                <div style="display: flex; gap: 20px; font-size: 14px; opacity: 0.9;">
                                    <span><i class="fas fa-id-card"></i> ${student.ogr_TC || '-'}</span>
                                    <span><i class="fas fa-graduation-cap"></i> ${student.ogr_turu || '-'}</span>
                                    <span><i class="fas fa-info-circle"></i> ${student.ogr_durum || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Detay Bilgiler Grid -->
                    <div class="detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                        
                        <!-- Kişisel Bilgiler -->
                        <div class="detail-section">
                            <h4 style="color: #374151; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
                                <i class="fas fa-user"></i> Kişisel Bilgiler
                            </h4>
                            <div class="detail-item">
                                <strong>Baba Adı:</strong> ${student.ogr_baba_ad || '-'}
                            </div>
                            <div class="detail-item">
                                <strong>Anne Adı:</strong> ${student.ogr_anne_ad || '-'}
                            </div>
                            <div class="detail-item">
                                <strong>Doğum Yeri:</strong> ${student.ogr_dogum_yeri || '-'}
                            </div>
                            <div class="detail-item">
                                <strong>Doğum Tarihi:</strong> ${formatDate(student.ogr_dogum_tarihi) || '-'}
                            </div>
                            <div class="detail-item">
                                <strong>Öğrenim Durumu:</strong> ${student.ogr_ogrenim_durumu || '-'}
                            </div>
                            <div class="detail-item">
                                <strong>Kan Grubu:</strong> ${student.ogr_kan_grubu || '-'}
                            </div>
                        </div>

                        <!-- İletişim Bilgileri -->
                        <div class="detail-section">
                            <h4 style="color: #374151; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
                                <i class="fas fa-phone"></i> İletişim Bilgileri
                            </h4>
                            <div class="detail-item">
                                <strong>Cep Telefonu:</strong> ${student.ogr_ceptel || '-'}
                            </div>
                            <div class="detail-item">
                                <strong>Yedek Telefon:</strong> ${student.ogr_yedek_ceptel || '-'}
                            </div>
                            <div class="detail-item">
                                <strong>E-posta:</strong> ${student.ogr_mail || '-'}
                            </div>
                            <div class="detail-item">
                                <strong>Adres:</strong> ${student.ogr_adres || '-'}
                            </div>
                        </div>

                        <!-- Eğitim ve Ödeme Bilgileri -->
                        <div class="detail-section">
                            <h4 style="color: #374151; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
                                <i class="fas fa-graduation-cap"></i> Eğitim Bilgileri
                            </h4>
                            <div class="detail-item">
                                <strong>Rapor Tarih No:</strong> ${student.ogr_rapor_tarih_no || '-'}
                            </div>
                            <div class="detail-item">
                                <strong>Silah Durumu:</strong> ${student.ogr_silah_durum || '-'}
                            </div>
                            <div class="detail-item">
                                <strong>Ödeme:</strong> ${student.ogr_odeme ? student.ogr_odeme + ' TL' : '-'}
                            </div>
                            <div class="detail-item">
                                <strong>Sınav Puanı:</strong> ${student.ogr_sinav_puan || '-'}
                            </div>
                            <div class="detail-item">
                                <strong>Kayıt Tarihi:</strong> ${formatDate(student.ogr_kayit_tarihi) || '-'}
                            </div>
                        </div>

                        <!-- Belgeler -->
                        <div class="detail-section">
                            <h4 style="color: #374151; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
                                <i class="fas fa-file-alt"></i> Belge Durumları
                            </h4>
                            ${createBelgeStatusHTML(student)}
                        </div>
                    </div>

                    <!-- Not -->
                    ${student.ogr_not ? `
                        <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
                            <h4 style="margin: 0 0 8px 0; color: #374151;">
                                <i class="fas fa-sticky-note"></i> Notlar
                            </h4>
                            <p style="margin: 0; color: #6b7280; line-height: 1.5;">${student.ogr_not}</p>
                        </div>
                    ` : ''}
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeStudentDetailModal()">
                        <i class="fas fa-times"></i> Kapat
                    </button>
                    <button class="btn btn-primary" onclick="editStudentDetails(${student.id})">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Belge durumu HTML helper
function createBelgeStatusHTML(student) {
    const belgeler = [
        { key: 'ogr_gerek_foto', label: 'Fotoğraf' },
        { key: 'ogr_gerek_diploma', label: 'Diploma' },
        { key: 'ogr_gerek_kimlik', label: 'Kimlik' },
        { key: 'ogr_gerek_yakakarti', label: 'Yaka Kartı' },
        { key: 'ogr_gerek_saglik', label: 'Sağlık Raporu' },
        { key: 'ogr_gerek_ikamet', label: 'İkamet' }
    ];

    return belgeler.map(belge => {
        const durum = student[belge.key] === 1;
        const icon = durum ? 'check-circle' : 'times-circle';
        const color = durum ? '#16a34a' : '#dc2626';
        const text = durum ? 'Tamamlandı' : 'Eksik';

        return `
            <div class="detail-item" style="display: flex; align-items: center; justify-content: space-between;">
                <strong>${belge.label}:</strong>
                <span style="color: ${color};">
                    <i class="fas fa-${icon}"></i> ${text}
                </span>
            </div>
        `;
    }).join('');
}

// Modal kapatma fonksiyonu
function closeStudentDetailModal() {
    const modal = document.getElementById('studentDetailModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// Tarih formatlama helper
function formatDate(dateString) {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return dateString; // Hata durumunda orijinal değeri döndür
    }
}

// CSS ekleme fonksiyonu
function addDetailModalStyles() {
    const styles = `
        .detail-item {
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .detail-item:last-child {
            border-bottom: none;
        }
        
        .detail-section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .student-detail-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .student-detail-modal .modal-container {
            background: white;
            border-radius: 16px;
            width: 90%;
            max-width: 1000px;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        }
    `;

    // Stil zaten eklenmişse tekrar ekleme
    if (!document.querySelector('#detailModalStyles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'detailModalStyles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }
}