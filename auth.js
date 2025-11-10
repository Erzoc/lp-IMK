import { auth, db, ref, set, get, child, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from './firebase-config.js';

// ===== HELPER =====
function showAlert(message, type) {
    const alert = document.getElementById('alert-message');
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'flex';
    setTimeout(() => { alert.style.display = 'none'; }, 4000);
}

// ===== REGISTER =====
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nis = document.getElementById('register-nis').value.trim();
    const nama = document.getElementById('register-nama').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const tingkatan = document.getElementById('register-tingkatan').value;
    const kelas = document.getElementById('register-kelas').value;
    
    if (!nis || !nama || !password || !tingkatan || !kelas) {
        showAlert('Semua field harus diisi!', 'error');
        return;
    }
    
    try {
        const email = `${nis}@portal.com`;
        
        // Create auth user
        await createUserWithEmailAndPassword(auth, email, password);
        
        // Save to Realtime Database
        await set(ref(db, 'users/' + nis), {
            nis: nis,
            nama: nama,
            role: 'siswa',
            tingkatan: tingkatan,
            kelas: parseInt(kelas),
            createdAt: Date.now()
        });
        
        showAlert('Registrasi berhasil! Silakan login.', 'success');
        setTimeout(() => {
            document.querySelector('[data-tab="login"]').click();
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        if (error.code === 'auth/email-already-in-use') {
            showAlert('NIS sudah terdaftar!', 'error');
        } else if (error.code === 'auth/weak-password') {
            showAlert('Password minimal 6 karakter!', 'error');
        } else {
            showAlert('Registrasi gagal: ' + error.message, 'error');
        }
    }
});

// ===== LOGIN =====
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nis = document.getElementById('login-nis').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if (!nis || !password) {
        showAlert('NIS dan Password harus diisi!', 'error');
        return;
    }
    
    try {
        const email = `${nis}@portal.com`;
        await signInWithEmailAndPassword(auth, email, password);
        
        // Get user data from Realtime Database
        const snapshot = await get(child(ref(db), `users/${nis}`));
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            
            // Save session
            localStorage.setItem('userSession', JSON.stringify({
                nis: userData.nis,
                nama: userData.nama,
                role: userData.role,
                tingkatan: userData.tingkatan,
                kelas: userData.kelas
            }));
            
            showAlert('Login berhasil! Mengalihkan...', 'success');
            
            setTimeout(() => {
                if (userData.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1500);
        } else {
            showAlert('Data user tidak ditemukan!', 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            showAlert('NIS atau Password salah!', 'error');
        } else {
            showAlert('Login gagal: ' + error.message, 'error');
        }
    }
});

// ===== CHECK AUTH =====
onAuthStateChanged(auth, (user) => {
    if (user) {
        const session = localStorage.getItem('userSession');
        if (session) {
            const userData = JSON.parse(session);
            if (userData.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        }
    }
});
