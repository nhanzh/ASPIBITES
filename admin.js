// ==========================================
// 1. FIREBASE INITIALIZATION
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

const db = firebase.database();

// ==========================================
// 2. PEMANTAUAN LEJER & PESANAN (REAL-TIME)
// ==========================================
function mulaPantauAdminDashboard() {
    const ordersContainer = document.getElementById('admin-orders-list');
    const vendorsContainer = document.getElementById('admin-vendors-list');
    const countElem = document.getElementById('total-orders-count');
    const commissionElem = document.getElementById('total-admin-commission');

    // Pantau Pesanan & Pengiraan Komisyen Admin
    db.ref('orders').on('value', (snapshot) => {
        if (!ordersContainer) return;
        ordersContainer.innerHTML = '';

        let totalValidOrders = 0;
        let terkumpulKomisyen = 0;

        if (!snapshot.exists()) {
            ordersContainer.innerHTML = '<p style="color:#888;">Tiada rekod pesanan.</p>';
            if (countElem) countElem.innerText = '0';
            if (commissionElem) commissionElem.innerText = 'RM 0.00';
            return;
        }

        snapshot.forEach((childSnap) => {
            const orderKey = childSnap.key;
            const order = childSnap.val();

            if (order.status !== 'CANCELLED') {
                totalValidOrders++;
                terkumpulKomisyen += (order.adminCommission || 1.00);
            }

            ordersContainer.innerHTML += `
                <div style="border:1px solid #e5e7eb; padding:10px; border-radius:6px; margin-bottom:8px; font-size:0.85em; background: #fff;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold; align-items: center;">
                        <span>#${orderKey.slice(-5)} - ${order.studentName || 'Pelajar'} (${(order.deliveryLocation || '').toUpperCase()})</span>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span style="color:#2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 4px;">${order.status}</span>
                            <button onclick="padamPesananAdmin('${orderKey}')" style="background:#dc2626; color:white; border:none; padding:3px 6px; border-radius:4px; font-size:0.75em; cursor:pointer;" title="Padam Pesanan Ini">🗑️</button>
                        </div>
                    </div>
                    <p style="margin:4px 0 0 0; color:#4b5563;">Jumlah Bayaran: RM ${(order.totalAmount || 0).toFixed(2)} | Delivery: RM ${(order.deliveryFeeTotal || 0).toFixed(2)}</p>
                    <p style="margin:2px 0 0 0; color:#059669; font-size:0.8em;">🔒 Net Runner: RM ${(order.runnerFeeNet || 0).toFixed(2)} | <strong>Komisyen Admin: RM ${(order.adminCommission || 1.00).toFixed(2)}</strong></p>
                </div>
            `;
        });

        if (countElem) countElem.innerText = totalValidOrders;
        if (commissionElem) commissionElem.innerText = `RM ${terkumpulKomisyen.toFixed(2)}`;
    });

    // Pantau Senarai Vendor
    db.ref('vendors').on('value', (snapshot) => {
        if (!vendorsContainer) return;
        vendorsContainer.innerHTML = '';

        if (!snapshot.exists()) {
            vendorsContainer.innerHTML = '<p style="color:#888;">Tiada vendor berdaftar.</p>';
            return;
        }

        snapshot.forEach((childSnap) => {
            const vendorKey = childSnap.key;
            const vendor = childSnap.val();

            vendorsContainer.innerHTML += `
                <div style="padding:8px 0; border-bottom:1px solid #eee; font-size:0.85em; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${vendor.shopName}</strong> (${(vendor.cafeLocation || '').toUpperCase()})<br/>
                        <span style="color:#666; font-size:0.8em;">Bank: ${vendor.bankName || '-'} (${vendor.accountNo || '-'})</span>
                    </div>
                    <button onclick="padamVendorAdmin('${vendorKey}')" style="background:#dc2626; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.75em; cursor:pointer; font-weight: bold;">🗑️ Padam</button>
                </div>
            `;
        });
    });
}

// ==========================================
// 3. FUNGSI PEMADAMAN ADMIN (REAL-TIME)
// ==========================================
function padamPesananAdmin(orderKey) {
    if (confirm("Adakah anda pasti mahu memadam pesanan ini daripada sistem?")) {
        db.ref(`orders/${orderKey}`).remove()
            .then(() => alert("Pesanan berjaya dipadam."))
            .catch(err => alert("Ralat: " + err.message));
    }
}

function padamSemuaPesananSystem() {
    if (confirm("AMARAN: Anda pasti mahu memadam SEMUA rekod pesanan dalam sistem?")) {
        db.ref('orders').remove()
            .then(() => alert("Semua rekod pesanan telah dikosongkan."))
            .catch(err => alert("Ralat: " + err.message));
    }
}

function padamVendorAdmin(vendorKey) {
    if (confirm("Adakah anda pasti mahu memadam vendor ini dari senarai?")) {
        db.ref(`vendors/${vendorKey}`).remove()
            .then(() => alert("Vendor berjaya dipadam."))
            .catch(err => alert("Ralat: " + err.message));
    }
}

window.onload = mulaPantauAdminDashboard;
