import { auth, db, ref, set, get, update, remove, push, child, signOut, onAuthStateChanged } from './firebase-config.js';

// ===== GLOBAL VARIABLES =====
let currentUserSession = null;

// ===== CHECK AUTHENTICATION =====
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    const session = localStorage.getItem('userSession');
    if (session) {
        currentUserSession = JSON.parse(session);
        
        if (currentUserSession.role !== 'admin') {
            alert('Akses ditolak! Hanya admin yang bisa mengakses halaman ini.');
            window.location.href = 'dashboard.html';
            return;
        }
        
        document.getElementById('admin-nama').textContent = currentUserSession.nama;
        document.getElementById('admin-nis').textContent = currentUserSession.nis;
        
        // Load initial data
        loadAkun();
        loadMateri();
        loadSoal();
    }
});

// ===== LOGOUT =====
document.getElementById('logout-btn').addEventListener('click', async () => {
    if (confirm('Yakin ingin logout?')) {
        await signOut(auth);
        localStorage.removeItem('userSession');
        window.location.href = 'index.html';
    }
});

// ===== HELPER FUNCTIONS =====
function showAlert(elementId, message, type) {
    const alert = document.getElementById(elementId);
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'flex';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

function downloadBase64File(base64String, fileName) {
    const link = document.createElement('a');
    link.href = base64String;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== FILE INPUT HANDLERS =====
document.getElementById('materi-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const fileInfo = document.getElementById('materi-file-info');
    
    if (file) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        fileInfo.textContent = `${file.name} (${sizeMB} MB)`;
        
        if (file.size > 1024 * 1024) {
            fileInfo.style.color = 'var(--error)';
            fileInfo.textContent += ' - File terlalu besar! Maksimal 1 MB';
        } else {
            fileInfo.style.color = 'var(--success)';
        }
    }
});

document.getElementById('soal-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const fileInfo = document.getElementById('soal-file-info');
    
    if (file) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        fileInfo.textContent = `${file.name} (${sizeMB} MB)`;
        
        if (file.size > 1024 * 1024) {
            fileInfo.style.color = 'var(--error)';
            fileInfo.textContent += ' - File terlalu besar! Maksimal 1 MB';
        } else {
            fileInfo.style.color = 'var(--success)';
        }
    }
});

document.getElementById('csv-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const fileInfo = document.getElementById('csv-info');
    
    if (file) {
        fileInfo.textContent = `${file.name} siap diupload`;
        fileInfo.style.color = 'var(--success)';
    }
});

// ============================================
// SECTION 1: MANAJEMEN AKUN
// ============================================

// ===== TAMBAH AKUN =====
document.getElementById('form-tambah-akun').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nis = document.getElementById('akun-nis').value.trim();
    const nama = document.getElementById('akun-nama').value.trim();
    const password = document.getElementById('akun-password').value.trim();
    const role = document.getElementById('akun-role').value;
    const tingkatan = document.getElementById('akun-tingkatan').value;
    const kelas = document.getElementById('akun-kelas').value;
    
    try {
        // Check if NIS already exists
        const snapshot = await get(child(ref(db), `users/${nis}`));
        if (snapshot.exists()) {
            showAlert('alert-akun', 'NIS sudah terdaftar!', 'error');
            return;
        }
        
        // Save to Realtime Database
        await set(ref(db, 'users/' + nis), {
            nis: nis,
            nama: nama,
            password: password, // In production, hash this!
            role: role,
            tingkatan: tingkatan,
            kelas: parseInt(kelas),
            createdAt: Date.now(),
            createdBy: currentUserSession.nama
        });
        
        showAlert('alert-akun', 'Akun berhasil ditambahkan!', 'success');
        document.getElementById('form-tambah-akun').reset();
        loadAkun();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('alert-akun', 'Gagal menambahkan akun: ' + error.message, 'error');
    }
});

// ===== UPLOAD CSV =====
document.getElementById('btn-upload-csv').addEventListener('click', async () => {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    
    if (!file) {
        showAlert('alert-akun', 'Pilih file CSV terlebih dahulu!', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const line of lines) {
            const [nis, nama, password, role, tingkatan, kelas] = line.split(',').map(item => item.trim());
            
            if (!nis || !nama || !password || !role || !tingkatan || !kelas) {
                errorCount++;
                continue;
            }
            
            try {
                // Check if exists
                const snapshot = await get(child(ref(db), `users/${nis}`));
                if (snapshot.exists()) {
                    errorCount++;
                    continue;
                }
                
                await set(ref(db, 'users/' + nis), {
                    nis: nis,
                    nama: nama,
                    password: password,
                    role: role,
                    tingkatan: tingkatan,
                    kelas: parseInt(kelas),
                    createdAt: Date.now(),
                    createdBy: currentUserSession.nama
                });
                
                successCount++;
            } catch (error) {
                console.error('Error:', error);
                errorCount++;
            }
        }
        
        showAlert('alert-akun', `Berhasil: ${successCount} akun | Gagal: ${errorCount}`, 'success');
        fileInput.value = '';
        document.getElementById('csv-info').textContent = 'Belum ada file';
        loadAkun();
    };
    
    reader.readAsText(file);
});

// ===== LOAD AKUN =====
async function loadAkun() {
    const tbody = document.getElementById('table-akun');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Loading...</td></tr>';
    
    try {
        const snapshot = await get(ref(db, 'users'));
        
        if (!snapshot.exists()) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Belum ada akun terdaftar</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        const users = snapshot.val();
        
        Object.keys(users).forEach(nis => {
            const data = users[nis];
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${data.nis}</td>
                <td>${data.nama}</td>
                <td><span style="color: ${data.role === 'admin' ? 'var(--warning)' : 'var(--accent-cyan)'}">${data.role.toUpperCase()}</span></td>
                <td>${data.tingkatan}</td>
                <td>${data.kelas}</td>
                <td>
                    <button class="btn btn-secondary btn-small" onclick="editAkun('${data.nis}')">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteAkun('${data.nis}')">
                        <i class="fa-solid fa-trash"></i> Hapus
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: var(--error);">Gagal memuat data</td></tr>';
    }
}

// ===== EDIT AKUN =====
window.editAkun = async function(nis) {
    try {
        const snapshot = await get(child(ref(db), `users/${nis}`));
        
        if (!snapshot.exists()) {
            alert('Data tidak ditemukan!');
            return;
        }
        
        const data = snapshot.val();
        
        document.getElementById('edit-nis-old').value = nis;
        document.getElementById('edit-nis').value = data.nis;
        document.getElementById('edit-nama').value = data.nama;
        document.getElementById('edit-password').value = '';
        document.getElementById('edit-role').value = data.role;
        document.getElementById('edit-tingkatan').value = data.tingkatan;
        document.getElementById('edit-kelas').value = data.kelas;
        
        document.getElementById('modal-edit').classList.add('active');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal memuat data: ' + error.message);
    }
};

// ===== SAVE EDIT AKUN =====
document.getElementById('form-edit-akun').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nisOld = document.getElementById('edit-nis-old').value;
    const nama = document.getElementById('edit-nama').value.trim();
    const password = document.getElementById('edit-password').value.trim();
    const role = document.getElementById('edit-role').value;
    const tingkatan = document.getElementById('edit-tingkatan').value;
    const kelas = document.getElementById('edit-kelas').value;
    
    try {
        const updateData = {
            nama: nama,
            role: role,
            tingkatan: tingkatan,
            kelas: parseInt(kelas),
            updatedAt: Date.now(),
            updatedBy: currentUserSession.nama
        };
        
        if (password) {
            updateData.password = password;
        }
        
        await update(ref(db, 'users/' + nisOld), updateData);
        
        alert('Data berhasil diupdate!');
        document.getElementById('modal-edit').classList.remove('active');
        loadAkun();
        
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal update data: ' + error.message);
    }
});

// ===== DELETE AKUN =====
window.deleteAkun = async function(nis) {
    if (!confirm(`Yakin ingin menghapus akun dengan NIS: ${nis}?`)) return;
    
    try {
        await remove(ref(db, 'users/' + nis));
        alert('Akun berhasil dihapus!');
        loadAkun();
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menghapus akun: ' + error.message);
    }
};

// ============================================
// SECTION 2: UPLOAD MATERI
// ============================================

document.getElementById('form-upload-materi').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const judul = document.getElementById('materi-judul').value.trim();
    const deskripsi = document.getElementById('materi-deskripsi').value.trim();
    const tingkatan = document.getElementById('materi-tingkatan').value;
    const kelas = document.getElementById('materi-kelas').value;
    const fileInput = document.getElementById('materi-file');
    const file = fileInput.files[0];
    
    if (!file) {
        showAlert('alert-materi', 'Pilih file terlebih dahulu!', 'error');
        return;
    }
    
    if (file.size > 1024 * 1024) {
        showAlert('alert-materi', 'Ukuran file maksimal 1 MB!', 'error');
        return;
    }
    
    try {
        const base64String = await fileToBase64(file);
        
        // Push to Realtime Database (auto-generate ID)
        const newMateriRef = push(ref(db, 'materi'));
        await set(newMateriRef, {
            judul: judul,
            deskripsi: deskripsi,
            tingkatan: tingkatan,
            kelas: parseInt(kelas),
            fileBase64: base64String,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            uploadedAt: Date.now(),
            uploadedBy: currentUserSession.nama
        });
        
        showAlert('alert-materi', 'Materi berhasil diupload!', 'success');
        document.getElementById('form-upload-materi').reset();
        document.getElementById('materi-file-info').textContent = 'Belum ada file dipilih';
        document.getElementById('materi-file-info').style.color = 'var(--text-secondary)';
        loadMateri();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('alert-materi', 'Upload gagal: ' + error.message, 'error');
    }
});

// ===== LOAD MATERI =====
async function loadMateri() {
    const container = document.getElementById('list-materi');
    container.innerHTML = '<p class="text-muted">Loading...</p>';
    
    try {
        const snapshot = await get(ref(db, 'materi'));
        
        if (!snapshot.exists()) {
            container.innerHTML = '<p class="text-muted">Belum ada materi terupload</p>';
            return;
        }
        
        container.innerHTML = '';
        const materiData = snapshot.val();
        
        // Convert to array and sort by uploadedAt (descending)
        const materiArray = Object.keys(materiData).map(id => ({
            id: id,
            ...materiData[id]
        })).sort((a, b) => b.uploadedAt - a.uploadedAt);
        
        materiArray.forEach(data => {
            const card = createContentCard(data.id, data, 'materi');
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<p style="color: var(--error);">Gagal memuat data</p>';
    }
}

// ============================================
// SECTION 3: UPLOAD SOAL
// ============================================

document.getElementById('form-upload-soal').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const judul = document.getElementById('soal-judul').value.trim();
    const jenis = document.getElementById('soal-jenis').value;
    const deskripsi = document.getElementById('soal-deskripsi').value.trim();
    const tingkatan = document.getElementById('soal-tingkatan').value;
    const kelas = document.getElementById('soal-kelas').value;
    const fileInput = document.getElementById('soal-file');
    const file = fileInput.files[0];
    
    if (!file) {
        showAlert('alert-soal', 'Pilih file terlebih dahulu!', 'error');
        return;
    }
    
    if (file.size > 1024 * 1024) {
        showAlert('alert-soal', 'Ukuran file maksimal 1 MB!', 'error');
        return;
    }
    
    try {
        const base64String = await fileToBase64(file);
        
        const newSoalRef = push(ref(db, 'soal'));
        await set(newSoalRef, {
            judul: judul,
            jenis: jenis,
            deskripsi: deskripsi,
            tingkatan: tingkatan,
            kelas: parseInt(kelas),
            fileBase64: base64String,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            uploadedAt: Date.now(),
            uploadedBy: currentUserSession.nama
        });
        
        showAlert('alert-soal', 'Soal berhasil diupload!', 'success');
        document.getElementById('form-upload-soal').reset();
        document.getElementById('soal-file-info').textContent = 'Belum ada file dipilih';
        document.getElementById('soal-file-info').style.color = 'var(--text-secondary)';
        loadSoal();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('alert-soal', 'Upload gagal: ' + error.message, 'error');
    }
});

// ===== LOAD SOAL =====
async function loadSoal() {
    const container = document.getElementById('list-soal');
    container.innerHTML = '<p class="text-muted">Loading...</p>';
    
    try {
        const snapshot = await get(ref(db, 'soal'));
        
        if (!snapshot.exists()) {
            container.innerHTML = '<p class="text-muted">Belum ada soal terupload</p>';
            return;
        }
        
        container.innerHTML = '';
        const soalData = snapshot.val();
        
        const soalArray = Object.keys(soalData).map(id => ({
            id: id,
            ...soalData[id]
        })).sort((a, b) => b.uploadedAt - a.uploadedAt);
        
        soalArray.forEach(data => {
            const card = createContentCard(data.id, data, 'soal');
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<p style="color: var(--error);">Gagal memuat data</p>';
    }
}

// ===== CREATE CONTENT CARD =====
function createContentCard(id, data, type) {
    const card = document.createElement('div');
    card.className = 'content-card';
    
    const sizeMB = (data.fileSize / (1024 * 1024)).toFixed(2);
    const uploadDate = new Date(data.uploadedAt).toLocaleDateString('id-ID');
    
    card.innerHTML = `
        <h3>${data.judul}</h3>
        <p class="meta">
            ${data.tingkatan} Kelas ${data.kelas} • 
            ${data.fileName} (${sizeMB} MB)
            ${data.jenis ? `• ${data.jenis.toUpperCase()}` : ''}
        </p>
        <p class="text-muted">${data.deskripsi || 'Tidak ada deskripsi'}</p>
        <p class="text-muted" style="font-size: 0.8rem;">Upload: ${uploadDate} oleh ${data.uploadedBy || 'Admin'}</p>
        <div class="actions">
            <button class="btn btn-success btn-small" onclick="downloadContent('${id}', '${type}')">
                <i class="fa-solid fa-download"></i> Download
            </button>
            <button class="btn btn-danger btn-small" onclick="deleteContent('${id}', '${type}')">
                <i class="fa-solid fa-trash"></i> Hapus
            </button>
        </div>
    `;
    
    return card;
}

// ===== DOWNLOAD CONTENT =====
window.downloadContent = async function(id, type) {
    try {
        const snapshot = await get(child(ref(db), `${type}/${id}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            downloadBase64File(data.fileBase64, data.fileName);
        } else {
            alert('File tidak ditemukan!');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal download: ' + error.message);
    }
};

// ===== DELETE CONTENT =====
window.deleteContent = async function(id, type) {
    if (!confirm('Yakin ingin menghapus data ini?')) return;
    
    try {
        await remove(ref(db, `${type}/${id}`));
        alert('Data berhasil dihapus!');
        
        if (type === 'materi') {
            loadMateri();
        } else {
            loadSoal();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menghapus data: ' + error.message);
    }
};
