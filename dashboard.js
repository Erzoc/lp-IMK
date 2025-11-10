import { auth, db, signOut, onAuthStateChanged, collection, getDocs, query, orderBy, where } from './firebase-config.js';

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let allMateri = [];
let allSoal = [];

// ===== CHECK AUTHENTICATION =====
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    const session = localStorage.getItem('userSession');
    if (session) {
        currentUser = JSON.parse(session);
        
        // Populate user info
        document.getElementById('user-nama').textContent = currentUser.nama;
        document.getElementById('user-nis').textContent = currentUser.nis;
        document.getElementById('user-tingkatan').textContent = currentUser.tingkatan;
        document.getElementById('user-kelas').textContent = currentUser.kelas;
        document.getElementById('welcome-nama').textContent = currentUser.nama;
        
        // Load data
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

// ===== SECTION NAVIGATION =====
window.showSection = function(section) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.remove('active'));
    
    if (section === 'main') {
        document.getElementById('main-menu').classList.add('active');
    } else if (section === 'materi') {
        document.getElementById('materi-section').classList.add('active');
        filterMateri();
    } else if (section === 'praktikum') {
        document.getElementById('praktikum-section').classList.add('active');
        filterPraktikum();
    } else if (section === 'ujian') {
        document.getElementById('ujian-section').classList.add('active');
        filterUjian();
    }
};

// ===== DOWNLOAD HELPER =====
function downloadBase64File(base64String, fileName) {
    const link = document.createElement('a');
    link.href = base64String;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================
// MATERI PEMBELAJARAN
// ============================================

async function loadMateri() {
    try {
        const q = query(collection(db, 'materi'), orderBy('uploadedAt', 'desc'));
        const snapshot = await getDocs(q);
        
        allMateri = [];
        snapshot.forEach(doc => {
            allMateri.push({ id: doc.id, ...doc.data() });
        });
        
    } catch (error) {
        console.error('Error loading materi:', error);
    }
}

window.filterMateri = function() {
    const tingkatan = document.getElementById('filter-materi-tingkatan').value;
    const kelas = document.getElementById('filter-materi-kelas').value;
    const container = document.getElementById('materi-list');
    
    let filtered = allMateri;
    
    // Filter by tingkatan
    if (tingkatan) {
        filtered = filtered.filter(m => m.tingkatan === tingkatan);
    }
    
    // Filter by kelas
    if (kelas) {
        filtered = filtered.filter(m => m.kelas === parseInt(kelas));
    }
    
    // Display
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-folder-open"></i>
                <p>Belum ada materi tersedia</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    filtered.forEach(materi => {
        const card = createContentCard(materi, 'materi');
        container.appendChild(card);
    });
};

// ============================================
// PRAKTIKUM & UJIAN
// ============================================

async function loadSoal() {
    try {
        const q = query(collection(db, 'soal'), orderBy('uploadedAt', 'desc'));
        const snapshot = await getDocs(q);
        
        allSoal = [];
        snapshot.forEach(doc => {
            allSoal.push({ id: doc.id, ...doc.data() });
        });
        
    } catch (error) {
        console.error('Error loading soal:', error);
    }
}

window.filterPraktikum = function() {
    const tingkatan = document.getElementById('filter-praktikum-tingkatan').value;
    const kelas = document.getElementById('filter-praktikum-kelas').value;
    const container = document.getElementById('praktikum-list');
    
    let filtered = allSoal.filter(s => s.jenis === 'praktikum');
    
    if (tingkatan) {
        filtered = filtered.filter(s => s.tingkatan === tingkatan);
    }
    
    if (kelas) {
        filtered = filtered.filter(s => s.kelas === parseInt(kelas));
    }
    
    displaySoal(container, filtered, 'praktikum');
};

window.filterUjian = function() {
    const tingkatan = document.getElementById('filter-ujian-tingkatan').value;
    const kelas = document.getElementById('filter-ujian-kelas').value;
    const container = document.getElementById('ujian-list');
    
    let filtered = allSoal.filter(s => s.jenis === 'ujian');
    
    if (tingkatan) {
        filtered = filtered.filter(s => s.tingkatan === tingkatan);
    }
    
    if (kelas) {
        filtered = filtered.filter(s => s.kelas === parseInt(kelas));
    }
    
    displaySoal(container, filtered, 'ujian');
};

function displaySoal(container, soalList, type) {
    if (soalList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-folder-open"></i>
                <p>Belum ada soal ${type} tersedia</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    soalList.forEach(soal => {
        const card = createContentCard(soal, type);
        container.appendChild(card);
    });
}

// ============================================
// CREATE CONTENT CARD
// ============================================

function createContentCard(data, type) {
    const card = document.createElement('div');
    card.className = 'content-item';
    
    const sizeMB = (data.fileSize / (1024 * 1024)).toFixed(2);
    const uploadDate = data.uploadedAt?.toDate().toLocaleDateString('id-ID');
    
    let icon = 'fa-book';
    if (type === 'praktikum') icon = 'fa-laptop-code';
    if (type === 'ujian') icon = 'fa-file-lines';
    
    card.innerHTML = `
        <div class="content-item-header">
            <div class="content-item-icon">
                <i class="fa-solid ${icon}"></i>
            </div>
            <div class="content-item-info">
                <h4>${data.judul}</h4>
                <div class="content-item-meta">
                    ${data.tingkatan} Kelas ${data.kelas} • ${sizeMB} MB
                    ${data.jenis ? `• ${data.jenis.toUpperCase()}` : ''}
                </div>
            </div>
        </div>
        <p class="content-item-description">${data.deskripsi || 'Tidak ada deskripsi'}</p>
        <div class="content-item-meta" style="margin-bottom: 1rem;">
            <i class="fa-solid fa-calendar"></i> ${uploadDate}
        </div>
        <div class="content-item-actions">
            <button class="btn btn-primary btn-small" onclick="downloadFile('${data.id}', '${type}')">
                <i class="fa-solid fa-download"></i>
                Download ${data.fileName}
            </button>
        </div>
    `;
    
    return card;
}

// ===== DOWNLOAD FILE =====
window.downloadFile = function(id, type) {
    let data;
    
    if (type === 'materi') {
        data = allMateri.find(m => m.id === id);
    } else {
        data = allSoal.find(s => s.id === id);
    }
    
    if (data && data.fileBase64) {
        downloadBase64File(data.fileBase64, data.fileName);
    } else {
        alert('File tidak ditemukan!');
    }
};
