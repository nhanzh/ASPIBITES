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

auth.onAuthStateChanged((user) => {
    const authBox = document.getElementById('vendor-auth-container');
    const mainContent = document.getElementById('vendor-main-content');
    const userEmailText = document.getElementById('vendor-display-email');
    const profileBadge = document.getElementById('vendor-profile-badge');

    if (user) {
        currentVendorUser = user;
        selectedVendorUid = user.uid;

        if (authBox) authBox.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
        if (profileBadge) profileBadge.style.display = 'flex';
        if (userEmailText) userEmailText.innerText = user.email;

        muatTurunProfilVendor(user.uid);
        mulaPantauMenuVendor(user.uid);
        mulaPantauPesananVendor(user.uid);
        mulaPantauLaporanVendor(user.uid);
    } else {
        currentVendorUser = null;
        selectedVendorUid = null;

        if (authBox) authBox.style.display = 'block';
        if (mainContent) mainContent.style.display = 'none';
        if (profileBadge) profileBadge.style.display = 'none';
    }
});

function logMasukVendor() {
    const email = document.getElementById('vendor-email-input')?.value.trim();
    const password = document.getElementById('vendor-password-input')?.value;

    if (!email || !password) return alert("Sila masukkan e-mel dan kata laluan vendor.");

    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => alert("Gagal Log Masuk Vendor: " + error.message));
}

function logMasukVendorGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    auth.signInWithPopup(provider)
        .catch((error) => alert("Gagal Log Masuk: " + error.message));
}

function logKeluarVendor() {
    auth.signOut().then(() => {
        alert("Anda telah log keluar dari portal vendor.");
        window.location.reload();
    });
}

function padamAkaunVendorPermanen() {
    if (confirm("AMARAN: Adakah anda pasti mahu memadam akaun vendor ini secara kekal?")) {
        const user = auth.currentUser;
        if (user) {
            db.ref(`vendors/${user.uid}`).remove().then(() => {
                user.delete().then(() => {
                    alert("Akaun vendor telah dipadam.");
                    window.location.reload();
                }).catch(err => alert("Ralat auth: " + err.message));
            }).catch(err => alert("Ralat database: " + err.message));
        }
    }
}

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
        return alert("Sila lengkapkan maklumat wajib.");
    }

    db.ref(`vendors/${selectedVendorUid}`).update({
        email: currentVendorUser.email,
        shopName, cafeLocation, bankName, accountNo, accountHolder, qrUrl,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => alert("✅ Profil Disimpan!"));
}

function mulaPantauMenuVendor(vendorUid) {
    const menuContainer = document.getElementById('vendor-menu-list');
    if (!menuContainer) return;

    db.ref(`vendors/${vendorUid}/menu`).on('value', (snapshot) => {
        menuContainer.innerHTML = '';
        if (!snapshot.exists()) {
            menuContainer.innerHTML = '<p style="color: #888; font-size:0.85em;">Belum ada menu ditawarkan.</p>';
            return;
        }

        snapshot.forEach((childSnap) => {
            const itemId = childSnap.key;
            const item = childSnap.val();
            menuContainer.innerHTML += `
                <div style="border:1px solid #e5e7eb; padding:10px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; background:#fff;">
                    <div>
                        <strong style="font-size:0.9em;">${item.name}</strong>
                        <p style="font-size:0.8em; color:#059669; font-weight:bold; margin:2px 0 0 0;">RM ${(parseFloat(item.price) || 0).toFixed(2)}</p>
                    </div>
                    <button onclick="padamMenuItem('${itemId}')" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.75em; cursor:pointer;">🗑️ Padam</button>
                </div>
            `;
        });
    });
}

function tambahMenuItem() {
    if (!selectedVendorUid) return;
    const name = document.getElementById('menu-item-name')?.value.trim();
    const price = parseFloat(document.getElementById('menu-item-price')?.value);
    if (!name || isNaN(price) || price <= 0) return alert("Masukkan nama dan harga sah.");

    db.ref(`vendors/${selectedVendorUid}/menu`).push({
        name, price, createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        document.getElementById('menu-item-name').value = '';
        document.getElementById('menu-item-price').value = '';
    });
}

function padamMenuItem(itemId) {
    if (confirm("Padam item menu ini?")) {
        db.ref(`vendors/${selectedVendorUid}/menu/${itemId}`).remove();
    }
}

function mulaPantauPesananVendor(vendorUid) {
    const ordersContainer = document.getElementById('vendor-active-orders');
    if (!ordersContainer) return;

    db.ref('orders').orderByChild('vendorUid').equalTo(vendorUid).on('value', (snapshot) => {
        ordersContainer.innerHTML = '';
        if (!snapshot.exists()) {
            ordersContainer.innerHTML = '<p style="color: #888; font-size:0.85em;">Tiada pesanan masuk.</p>';
            return;
        }

        const kolejAktifSet = new Set();
        snapshot.forEach((childSnap) => {
            const orderKey = childSnap.key;
            const order = childSnap.val();

            if (order.status !== 'COMPLETED' && order.status !== 'CANCELLED') {
                kolejAktifSet.add((order.deliveryLocation || 'Lain-lain').toUpperCase());
                let itemsHtml = (order.items || []).map(i => `<li>${i.name} <strong>x${i.quantity || 1}</strong></li>`).join('');

                ordersContainer.innerHTML += `
                    <div style="border:1px solid #d1d5db; background:#ffffff; padding:14px; border-radius:8px; margin-bottom:12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f3f4f6; padding-bottom:6px;">
                            <span style="font-weight:bold;">Order #${orderKey.slice(-5)}</span>
                            <span style="padding:4px 8px; border-radius:12px; font-size:0.75em;" class="${getStatusBadgeClass(order.status)}">${formatStatusLabel(order.status)}</span>
                        </div>
                        <p style="margin:6px 0; font-size:0.85em;">Pelajar: <strong>${order.studentName || '-'}</strong> | Kolej: <strong>${order.deliveryLocation || '-'}</strong></p>
                        <ul style="margin:0; padding-left:18px; font-size:0.82em; color:#4b5563;">${itemsHtml}</ul>
                        <div style="margin-top:10px;">
                            <select onchange="kemaskiniStatusOrder('${orderKey}', this.value)" style="padding:4px; font-size:0.8em; border:1px solid #ccc; border-radius:4px;">
                                <option value="UNPAID" ${order.status === 'UNPAID' ? 'selected' : ''}>Menunggu Bayaran</option>
                                <option value="PAID" ${order.status === 'PAID' ? 'selected' : ''}>Bayaran Disahkan</option>
                                <option value="COOKING" ${order.status === 'COOKING' ? 'selected' : ''}>Tengah Masak</option>
                                <option value="PACKED" ${order.status === 'PACKED' ? 'selected' : ''}>Siap Bungkus</option>
                                <option value="COMPLETED" ${order.status === 'COMPLETED' ? 'selected' : ''}>Selesai</option>
                                <option value="CANCELLED" ${order.status === 'CANCELLED' ? 'selected' : ''}>Batal</option>
                            </select>
                        </div>
                    </div>
                `;
            }
        });
        janapanelBatchKolej(Array.from(kolejAktifSet));
    });
}

function mulaPantauLaporanVendor(vendorUid) {
    const tableBody = document.getElementById('vendor-excel-history-body');
    const totalSalesDisplay = document.getElementById('vendor-total-sales-display');
    if (!tableBody) return;

    db.ref('orders').orderByChild('vendorUid').equalTo(vendorUid).on('value', (snapshot) => {
        tableBody.innerHTML = '';
        let cumulativeSales = 0;

        if (!snapshot.exists()) {
            tableBody.innerHTML = `<tr><td colspan="7" style="padding: 12px; text-align: center; color: #888;">Tiada rekod pesanan.</td></tr>`;
            if (totalSalesDisplay) totalSalesDisplay.innerText = "RM 0.00";
            return;
        }

        snapshot.forEach((childSnap) => {
            const orderKey = childSnap.key;
            const order = childSnap.val();
            let itemStr = (order.items || []).map(i => `${i.name} (x${i.quantity})`).join(', ');
            let tarikhMasa = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-';
            let hargaItem = order.subtotalAmount || order.totalAmount || 0;

            if (order.status === 'COMPLETED') cumulativeSales += hargaItem;

            tableBody.innerHTML += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px; font-weight: bold;">#${orderKey.slice(-5)}</td>
                    <td style="padding: 8px; color: #4b5563;">${tarikhMasa}</td>
                    <td style="padding: 8px;">${order.studentName || '-'}</td>
                    <td style="padding: 8px; color: #374151;">${itemStr}</td>
                    <td style="padding: 8px; text-align: right; font-weight: bold; color: #059669;">RM ${hargaItem.toFixed(2)}</td>
                    <td style="padding: 8px; text-align: center;"><span style="font-size: 0.75em; padding: 2px 6px; background: #e5e7eb; border-radius:4px;">${formatStatusLabel(order.status)}</span></td>
                    <td style="padding: 8px; text-align: center;"><button onclick="padamSejarahPesananVendor('${orderKey}')" style="background:#dc2626; color:white; border:none; padding:3px 6px; border-radius:4px; font-size:0.75em; cursor:pointer;">🗑️</button></td>
                </tr>
            `;
        });

        if (totalSalesDisplay) totalSalesDisplay.innerText = `RM ${cumulativeSales.toFixed(2)}`;
    });
}

function padamSejarahPesananVendor(orderKey) {
    if (confirm("Padam rekod sejarah ini?")) {
        db.ref(`orders/${orderKey}`).remove();
    }
}

function downloadExcelSejarahVendor() {
    if (!selectedVendorUid) return;
    db.ref('orders').orderByChild('vendorUid').equalTo(selectedVendorUid).once('value', (snapshot) => {
        if (!snapshot.exists()) return alert("Tiada data untuk dimuat turun.");

        let csvContent = "data:text/csv;charset=utf-8,\uFEFFID Pesanan,Tarikh,Nama Pelajar,Set,Lokasi,Jumlah (RM),Status\r\n";
        snapshot.forEach((childSnap) => {
            const order = childSnap.val();
            const orderId = childSnap.key.slice(-5);
            const tarikh = order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : '-';
            csvContent += `${orderId},${tarikh},"${order.studentName || '-'}","${order.studentSet || '-'}","${order.deliveryLocation || '-'}","${order.totalAmount || 0}","${order.status || '-'}"\r\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "laporan_jualan_aspibites.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

function janapanelBatchKolej(senaraiKolej) {
    const batchContainer = document.getElementById('vendor-batch-controls');
    if (!batchContainer) return;
    if (senaraiKolej.length === 0) {
        batchContainer.innerHTML = '';
        return;
    }

    batchContainer.innerHTML = '<p style="font-weight:bold; font-size:0.85em; margin:0 0 6px 0; color:#1e40af;">⚡ Pengurusan Pukal Kolej:</p>';
    senaraiKolej.forEach((kolej) => {
        const kLower = kolej.toLowerCase();
        batchContainer.innerHTML += `
            <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:8px; border-radius:6px; margin-bottom:6px; font-size:0.8em;">
                <span>Kolej: <strong>${kolej}</strong></span>
                <button onclick="kemaskiniStatusSemuaPesananKolej('COMPLETED', '${kLower}')" style="margin-left:8px; background:#16a34a; color:white; border:none; padding:3px 8px; border-radius:4px; cursor:pointer;">🎉 Selesai Semua</button>
            </div>
        `;
    });
}

function kemaskiniStatusSemuaPesananKolej(targetStatus, kolejTarget) {
    db.ref('orders').once('value', (snapshot) => {
        if (!snapshot.exists()) return;
        let updates = {};
        snapshot.forEach((childSnap) => {
            const orderKey = childSnap.key;
            const order = childSnap.val();
            if (order.vendorUid === selectedVendorUid && (order.deliveryLocation || '').toLowerCase() === kolejTarget.toLowerCase()) {
                updates[`orders/${orderKey}/status`] = targetStatus;
            }
        });
        db.ref().update(updates);
    });
}

function kemaskiniStatusOrder(orderId, newStatus) {
    db.ref(`orders/${orderId}`).update({ status: newStatus });
}

function formatStatusLabel(status) {
    switch (status) {
        case 'UNPAID': return 'Menunggu Bayaran';
        case 'PAID': return 'Bayaran Disahkan';
        case 'COOKING': return 'Tengah Masak';
        case 'PACKED': return 'Siap Bungkus';
        case 'COMPLETED': return 'Selesai';
        case 'CANCELLED': return 'Dibatalkan';
        default: return status;
    }
}

function getStatusBadgeClass(status) {
    return 'badge-secondary';
}
