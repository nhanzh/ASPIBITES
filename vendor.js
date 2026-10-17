// ==========================================
// 1. FIREBASE INITIALIZATION (VENDOR)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyC39UI_RUWR7uPahaiQhSRybJE0U9ae8e8",
    authDomain: "aspi-bites.firebaseapp.com",
    databaseURL: "https://aspi-bites-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "aspi-bites",
    storageBucket: "aspi-bites.firebasestorage.app",
    messagingSenderId: "734788545912",
    appId: "1:734788545912:web:57028c06f0eecbe58d2c8d",
    measurementId: "G-X5Y68HJP2N"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

let currentVendorUser = null;
let selectedVendorUid = null;

// ==========================================
// 2. PEMANTAUAN AUTH STATE VENDOR
// ==========================================
auth.onAuthStateChanged((user) => {
    const authBox = document.getElementById('vendor-auth-container');
    const mainContent = document.getElementById('vendor-main-content');
    const userEmailText = document.getElementById('vendor-display-email');

    if (user) {
        currentVendorUser = user;
        selectedVendorUid = user.uid;

        if (authBox) authBox.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
        if (userEmailText) userEmailText.innerText = user.email;

        // Muat turun data vendor & mula pantau pesanan, menu, dan laporan jualan
        muatTurunProfilVendor(user.uid);
        mulaPantauMenuVendor(user.uid);
        mulaPantauPesananVendor(user.uid);
        mulaPantauLaporanVendor(user.uid);
    } else {
        currentVendorUser = null;
        selectedVendorUid = null;

        if (authBox) authBox.style.display = 'block';
        if (mainContent) mainContent.style.display = 'none';
    }
});

function logMasukVendor() {
    const email = document.getElementById('vendor-email-input')?.value.trim();
    const password = document.getElementById('vendor-password-input')?.value;

    if (!email || !password) {
        return alert("Sila masukkan e-mel dan kata laluan vendor.");
    }

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log("Berjaya log masuk Vendor:", userCredential.user.email);
        })
        .catch((error) => {
            alert("Gagal Log Masuk Vendor: " + error.message);
        });
}

function logMasukVendorGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Berjaya Log Masuk Vendor via Google:", result.user.email);
        })
        .catch((error) => {
            alert("Gagal Log Masuk: " + error.message);
        });
}

function logKeluarVendor() {
    auth.signOut().then(() => {
        alert("Anda telah log keluar dari portal vendor.");
        window.location.reload();
    });
}

// ==========================================
// 3. PROFIL & MAKLUMAT AKAUN BANK VENDOR
// ==========================================
function muatTurunProfilVendor(vendorUid) {
    db.ref(`vendors/${vendorUid}`).on('value', (snapshot) => {
        const vendor = snapshot.val() || {};

        const shopNameInput = document.getElementById('vendor-shop-name');
        const cafeLocInput = document.getElementById('vendor-cafe-location');
        const bankNameInput = document.getElementById('vendor-bank-name');
        const accountNoInput = document.getElementById('vendor-account-no');
        const accountHolderInput = document.getElementById('vendor-account-holder');
        const qrUrlInput = document.getElementById('vendor-qr-url');

        if (shopNameInput) shopNameInput.value = vendor.shopName || '';
        if (cafeLocInput) cafeLocInput.value = vendor.cafeLocation || '';
        if (bankNameInput) bankNameInput.value = vendor.bankName || 'Maybank';
        if (accountNoInput) accountNoInput.value = vendor.accountNo || vendor.bankAcc || '';
        if (accountHolderInput) accountHolderInput.value = vendor.accountHolder || '';
        if (qrUrlInput) qrUrlInput.value = vendor.qrUrl || '';
    });
}

function simpanProfilVendor() {
    if (!selectedVendorUid) return alert("Sila log masuk dahulu.");

    const shopName = document.getElementById('vendor-shop-name')?.value.trim();
    const cafeLocation = document.getElementById('vendor-cafe-location')?.value.trim().toLowerCase();
    const bankName = document.getElementById('vendor-bank-name')?.value.trim();
    const accountNo = document.getElementById('vendor-account-no')?.value.trim();
    const accountHolder = document.getElementById('vendor-account-holder')?.value.trim();
    const qrUrl = document.getElementById('vendor-qr-url')?.value.trim();

    if (!shopName || !cafeLocation || !bankName || !accountNo) {
        return alert("Sila lengkapkan nama kedai, lokasi kolej, nama bank, dan nombor akaun.");
    }

    const updatedProfile = {
        email: currentVendorUser.email,
        shopName: shopName,
        cafeLocation: cafeLocation,
        bankName: bankName,
        accountNo: accountNo,
        accountHolder: accountHolder,
        qrUrl: qrUrl,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    db.ref(`vendors/${selectedVendorUid}`).update(updatedProfile)
        .then(() => {
            alert("✅ Profil & Maklumat Pembayaran Vendor Berjaya Disimpan!");
        })
        .catch(err => alert("Gagal menyimpan profil: " + err.message));
}

// ==========================================
// 4. PENGURUSAN MENU (TAMBAH & PADAM)
// ==========================================
function mulaPantauMenuVendor(vendorUid) {
    const menuContainer = document.getElementById('vendor-menu-list');
    if (!menuContainer) return;

    db.ref(`vendors/${vendorUid}/menu`).on('value', (snapshot) => {
        menuContainer.innerHTML = '';

        if (!snapshot.exists()) {
            menuContainer.innerHTML = '<p style="color: #888; font-size:0.85em;">Belum ada menu ditawarkan. Sila tambah menu baharu di bawah.</p>';
            return;
        }

        snapshot.forEach((childSnap) => {
            const itemId = childSnap.key;
            const item = childSnap.val();

            menuContainer.innerHTML += `
                <div style="border:1px solid #e5e7eb; padding:10px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; background:#fff;">
                    <div>
                        <strong style="font-size:0.9em; color:#1f2937;">${item.name}</strong>
                        <p style="font-size:0.8em; color:#059669; font-weight:bold; margin:2px 0 0 0;">RM ${(parseFloat(item.price) || 0).toFixed(2)}</p>
                    </div>
                    <button onclick="padamMenuItem('${itemId}')" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.75em; cursor:pointer;">
                        🗑️ Padam
                    </button>
                </div>
            `;
        });
    });
}

function tambahMenuItem() {
    if (!selectedVendorUid) return alert("Sila log masuk dahulu.");

    const nameInput = document.getElementById('menu-item-name');
    const priceInput = document.getElementById('menu-item-price');

    const name = nameInput?.value.trim();
    const price = parseFloat(priceInput?.value);

    if (!name || isNaN(price) || price <= 0) {
        return alert("Sila masukkan nama item dan harga yang sah.");
    }

    const newItem = {
        name: name,
        price: price,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    db.ref(`vendors/${selectedVendorUid}/menu`).push(newItem)
        .then(() => {
            if (nameInput) nameInput.value = '';
            if (priceInput) priceInput.value = '';
            alert("✅ Menu baharu berjaya ditambah!");
        })
        .catch(err => alert("Gagal menambah menu: " + err.message));
}

function padamMenuItem(itemId) {
    if (confirm("Adakah anda pasti mahu memadam item menu ini?")) {
        db.ref(`vendors/${selectedVendorUid}/menu/${itemId}`).remove()
            .then(() => alert("Item menu telah dipadam."))
            .catch(err => alert("Gagal memadam menu: " + err.message));
    }
}

// ==========================================
// 5. PEMANTAUAN & SYNC PESANAN REAL-TIME
// ==========================================
function mulaPantauPesananVendor(vendorUid) {
    const ordersContainer = document.getElementById('vendor-active-orders');
    if (!ordersContainer) return;

    db.ref('orders').orderByChild('vendorUid').equalTo(vendorUid).on('value', (snapshot) => {
        ordersContainer.innerHTML = '';

        if (!snapshot.exists()) {
            ordersContainer.innerHTML = '<p style="color: #888; font-size:0.85em;">Tiada pesanan masuk buat masa ini.</p>';
            return;
        }

        const kolejAktifSet = new Set();

        snapshot.forEach((childSnap) => {
            const orderKey = childSnap.key;
            const order = childSnap.val();

            if (order.status !== 'COMPLETED' && order.status !== 'CANCELLED') {
                const orderKolej = (order.deliveryLocation || order.college || order.kolej || 'Lain-lain').toUpperCase();
                kolejAktifSet.add(orderKolej);

                let itemsHtml = (order.items || []).map(i => `<li>${i.name} <strong>x${i.quantity || 1}</strong> - RM ${(i.price * i.quantity).toFixed(2)}</li>`).join('');

                ordersContainer.innerHTML += `
                    <div style="border:1px solid #d1d5db; background:#ffffff; padding:14px; border-radius:8px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f3f4f6; padding-bottom:6px;">
                            <span style="font-weight:bold; color:#111827;">Order #${orderKey.slice(-5)}</span>
                            <span style="padding:4px 8px; border-radius:12px; font-size:0.75em;" class="${getStatusBadgeClass(order.status)}">
                                ${formatStatusLabel(order.status)}
                            </span>
                        </div>

                        <div style="margin:8px 0; font-size:0.85em; color:#374151;">
                            <p style="margin:2px 0;">Pelajar: <strong>${order.studentName || '-'}</strong> (${order.studentSet || '-'})</p>
                            <p style="margin:2px 0;">Lokasi: <strong style="color:#2563eb; text-transform:uppercase;">${order.deliveryLocation || '-'}</strong></p>
                            <p style="margin:2px 0;">E-mel: ${order.studentEmail || '-'}</p>
                        </div>

                        <div style="background:#f9fafb; padding:8px; border-radius:6px; font-size:0.82em; margin:8px 0;">
                            <p style="margin:0 0 4px 0; font-weight:bold;">Senarai Pesanan:</p>
                            <ul style="margin:0; padding-left:18px; color:#4b5563;">${itemsHtml}</ul>
                            <div style="margin-top:6px; border-top:1px dashed #e5e7eb; padding-top:4px; display:flex; justify-content:space-between; font-weight:bold;">
                                <span>Jumlah Keseluruhan:</span>
                                <span style="color:#059669;">RM ${(order.totalAmount || 0).toFixed(2)}</span>
                            </div>
                        </div>

                        <div style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                            <label style="font-size:0.78em; font-weight:bold;">Status:</label>
                            <select onchange="kemaskiniStatusOrder('${orderKey}', this.value)" style="padding:4px 8px; border-radius:4px; font-size:0.8em; border:1px solid #ccc;">
                                <option value="UNPAID" ${order.status === 'UNPAID' ? 'selected' : ''}>Menunggu Bayaran</option>
                                <option value="PENDING_VERIFICATION" ${order.status === 'PENDING_VERIFICATION' ? 'selected' : ''}>⏳ Pengesahan Bayaran</option>
                                <option value="PAID" ${order.status === 'PAID' ? 'selected' : ''}>✅ Bayaran Disahkan</option>
                                <option value="COOKING" ${order.status === 'COOKING' ? 'selected' : ''}>👨‍🍳 Tengah Masak</option>
                                <option value="PACKED" ${order.status === 'PACKED' ? 'selected' : ''}>📦 Siap Bungkus</option>
                                <option value="PICKED_UP" ${order.status === 'PICKED_UP' ? 'selected' : ''}>🛵 Runner Dah Pick Up</option>
                                <option value="DELIVERING" ${order.status === 'DELIVERING' ? 'selected' : ''}>🚚 Dalam Perjalanan</option>
                                <option value="COMPLETED" ${order.status === 'COMPLETED' ? 'selected' : ''}>🎉 Selesai</option>
                                <option value="CANCELLED" ${order.status === 'CANCELLED' ? 'selected' : ''}>❌ Batal</option>
                            </select>
                        </div>

                        <div style="margin-top:10px; padding:8px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; font-size:0.8em;">
                            <p style="margin:0 0 4px 0; font-weight:bold; color:#166534;">🛵 Info Runner Penghantaran:</p>
                            <div style="display:flex; gap:6px; margin-bottom:4px;">
                                <input type="text" id="runner-name-${orderKey}" placeholder="Nama Runner" value="${order.runnerName || ''}" style="flex:1; padding:4px; font-size:0.85em; border:1px solid #ccc; border-radius:4px;"/>
                                <input type="text" id="runner-phone-${orderKey}" placeholder="No. Tel Runner" value="${order.runnerPhone || ''}" style="flex:1; padding:4px; font-size:0.85em; border:1px solid #ccc; border-radius:4px;"/>
                            </div>
                            <button onclick="simpanMaklumatRunner('${orderKey}')" style="background:#15803d; color:white; border:none; padding:4px 8px; border-radius:4px; font-weight:bold; cursor:pointer; width:100%;">
                                💾 Simpan Info Runner
                            </button>
                        </div>
                    </div>
                `;
            }
        });

        janapanelBatchKolej(Array.from(kolejAktifSet));
    });
}

// ==========================================
// 6. LAPORAN JUALAN & SEJARAH EXCEL VIEW
// ==========================================
function mulaPantauLaporanVendor(vendorUid) {
    const tableBody = document.getElementById('vendor-excel-history-body');
    const totalSalesDisplay = document.getElementById('vendor-total-sales-display');

    if (!tableBody) return;

    db.ref('orders').orderByChild('vendorUid').equalTo(vendorUid).on('value', (snapshot) => {
        tableBody.innerHTML = '';
        let cumulativeSales = 0;

        if (!snapshot.exists()) {
            tableBody.innerHTML = `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #888;">Tiada rekod pesanan lagi.</td></tr>`;
            if (totalSalesDisplay) totalSalesDisplay.innerText = "RM 0.00";
            return;
        }

        snapshot.forEach((childSnap) => {
            const orderKey = childSnap.key;
            const order = childSnap.val();

            let itemStr = (order.items || []).map(i => `${i.name} (x${i.quantity})`).join(', ');
            let tarikhMasa = order.createdAt ? new Date(order.createdAt).toLocaleString() : '-';
            let hargaItem = order.subtotalAmount || order.totalAmount || 0;

            // Masukkan dalam kiraan Total Sales jika status COMPLETED
            if (order.status === 'COMPLETED') {
                cumulativeSales += hargaItem;
            }

            tableBody.innerHTML += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">#${orderKey.slice(-5)}</td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb; color: #4b5563;">${tarikhMasa}</td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${order.studentName || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb; color: #374151;">${itemStr}</td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #059669;">RM ${hargaItem.toFixed(2)}</td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">
                        <span style="font-size: 0.75em; padding: 2px 6px; border-radius: 4px; background: #e5e7eb;">${formatStatusLabel(order.status)}</span>
                    </td>
                </tr>
            `;
        });

        if (totalSalesDisplay) {
            totalSalesDisplay.innerText = `RM ${cumulativeSales.toFixed(2)}`;
        }
    });
}

// =======================================================
// 7. SYNC MULTI-ACCOUNT (BATCH UPDATE SECARA SERENTAK)
// =======================================================
function janapanelBatchKolej(senaraiKolej) {
    const batchContainer = document.getElementById('vendor-batch-controls');
    if (!batchContainer) return;

    if (senaraiKolej.length === 0) {
        batchContainer.innerHTML = '<p style="color:#888; font-size:0.8em;">Tiada pesanan aktif untuk dikemaskini secara serentak.</p>';
        return;
    }

    batchContainer.innerHTML = '<p style="font-weight:bold; font-size:0.85em; margin:0 0 6px 0; color:#1e40af;">⚡ Pengurusan Pukal (Multi-Sync Sekaligus):</p>';

    senaraiKolej.forEach((kolej) => {
        const kLower = kolej.toLowerCase();
        batchContainer.innerHTML += `
            <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:8px; border-radius:6px; margin-bottom:8px; font-size:0.8em;">
                <p style="margin:0 0 6px 0; font-weight:bold; color:#1d4ed8;">🏫 Kolej: ${kolej}</p>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button onclick="kemaskiniStatusSemuaPesananKolej('PAID', '${kLower}')" style="background:#059669; color:white; border:none; padding:5px 8px; border-radius:4px; font-weight:bold; cursor:pointer;">
                        ✅ Sahkan Bayaran
                    </button>
                    <button onclick="kemaskiniStatusSemuaPesananKolej('COOKING', '${kLower}')" style="background:#8b5cf6; color:white; border:none; padding:5px 8px; border-radius:4px; font-weight:bold; cursor:pointer;">
                        👨‍🍳 Tengah Masak
                    </button>
                    <button onclick="kemaskiniStatusSemuaPesananKolej('PACKED', '${kLower}')" style="background:#d97706; color:white; border:none; padding:5px 8px; border-radius:4px; font-weight:bold; cursor:pointer;">
                        📦 Siap Bungkus
                    </button>
                    <button onclick="kemaskiniStatusSemuaPesananKolej('DELIVERING', '${kLower}')" style="background:#2563eb; color:white; border:none; padding:5px 8px; border-radius:4px; font-weight:bold; cursor:pointer;">
                        🚚 Dalam Perjalanan
                    </button>
                    <button onclick="kemaskiniStatusSemuaPesananKolej('COMPLETED', '${kLower}')" style="background:#16a34a; color:white; border:none; padding:5px 8px; border-radius:4px; font-weight:bold; cursor:pointer;">
                        🎉 Selesai
                    </button>
                </div>
            </div>
        `;
    });
}

function kemaskiniStatusSemuaPesananKolej(targetStatus, kolejTarget) {
    if (!selectedVendorUid) return alert("Sila log masuk vendor terlebih dahulu.");

    db.ref('orders').once('value', (snapshot) => {
        if (!snapshot.exists()) return;

        let updates = {};
        let count = 0;

        snapshot.forEach((childSnap) => {
            const orderKey = childSnap.key;
            const order = childSnap.val();

            const isVendorMatch = order.vendorUid === selectedVendorUid;
            const isKolejMatch = (order.deliveryLocation || order.college || order.kolej || '').toLowerCase() === kolejTarget.toLowerCase();
            const isNotDone = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';

            if (isVendorMatch && isKolejMatch && isNotDone) {
                updates[`orders/${orderKey}/status`] = targetStatus;
                updates[`orders/${orderKey}/updatedAt`] = firebase.database.ServerValue.TIMESTAMP;
                count++;
            }
        });

        if (count > 0) {
            db.ref().update(updates).then(() => {
                alert(`✅ Berjaya! Status bagi ${count} pesanan di ${kolejTarget.toUpperCase()} telah dikemaskini secara serentak ke: ${formatStatusLabel(targetStatus)}`);
            }).catch(err => alert("Gagal kemaskini: " + err.message));
        } else {
            alert("Tiada pesanan aktif dijumpai untuk kolej ini.");
        }
    });
}

function kemaskiniStatusOrder(orderId, newStatus) {
    db.ref(`orders/${orderId}`).update({
        status: newStatus,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        console.log(`Order #${orderId} status updated to: ${newStatus}`);
    }).catch(err => alert("Gagal kemaskini status: " + err.message));
}

function simpanMaklumatRunner(orderId) {
    const runnerName = document.getElementById(`runner-name-${orderId}`)?.value.trim();
    const runnerPhone = document.getElementById(`runner-phone-${orderId}`)?.value.trim();

    if (!runnerName || !runnerPhone) {
        return alert("Sila masukkan nama dan nombor telefon runner.");
    }

    db.ref(`orders/${orderId}`).update({
        runnerName: runnerName,
        runnerPhone: runnerPhone,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert("✅ Maklumat runner berjaya dikemaskini!");
    }).catch(err => alert("Gagal menyimpan maklumat runner: " + err.message));
}

// ==========================================
// 8. HELPER STATUS BADGE & LABEL
// ==========================================
function formatStatusLabel(status) {
    switch (status) {
        case 'UNPAID': return 'Menunggu Bayaran';
        case 'PENDING_VERIFICATION': return '⏳ Pengesahan Bayaran';
        case 'PAID': return 'Bayaran Disahkan';
        case 'COOKING': return '👨‍🍳 Tengah Masak';
        case 'PACKED': return '📦 Siap Bungkus';
        case 'PICKED_UP': return '🛵 Runner Dah Pick Up';
        case 'DELIVERING': return '🚚 Dalam Perjalanan';
        case 'COMPLETED': return '✅ Selesai';
        case 'CANCELLED': return '❌ Dibatalkan';
        default: return status;
    }
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'UNPAID': return 'badge-warning';
        case 'PENDING_VERIFICATION': return 'badge-warning';
        case 'PAID': return 'badge-info';
        case 'COOKING': return 'badge-purple';
        case 'DELIVERING': return 'badge-success';
        case 'COMPLETED': return 'badge-success';
        case 'CANCELLED': return 'badge-danger';
        default: return 'badge-secondary';
    }
}
