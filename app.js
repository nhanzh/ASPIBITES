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

const auth = firebase.auth();
const db = firebase.database();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

let currentStudentUser = null;
let cartItems = [];
let selectedVendorUid = "";
let currentDeliveryFee = 6.00;
let currentMenuRef = null;

// Matriks Kadar Penghantaran Asal Mengikut Kolej
const KADAR_DELIVERY_KOLEJ = {
    'kab': 6.00,
    'kdo': 8.00,
    'kbh': 8.00,
    'kuo': 7.00,
    'krk': 9.00,
    'kiy': 8.00,
    'kkm': 7.00,
    'kpz': 10.00,
    'kiz': 8.00,
    'ktho': 9.00,
    'ktdi': 8.00,
    'ktsn': 10.00
};

// ==========================================
// 2. PEMANTAUAN AUTH STATE
// ==========================================
auth.onAuthStateChanged((user) => {
    const authBox = document.getElementById('student-auth-container');
    const mainContent = document.getElementById('student-main-content');
    const profileBadge = document.getElementById('user-profile-badge');
    const userEmailText = document.getElementById('student-display-email');

    if (user) {
        currentStudentUser = user;
        if (authBox) authBox.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
        if (profileBadge) profileBadge.style.display = 'block';
        if (userEmailText) userEmailText.innerText = user.email;

        setupPresenceTracker(user);
        mulaPantauOrderStatusStudent(user.uid);
        mulaPantauSejarahPesananStudent(user.uid);
        semakWaktuPembayaranLive();

        const selectedKolej = document.getElementById('kolej-select')?.value || "kbh";
        pantauPesananMengikutKolej(selectedKolej);
    } else {
        currentStudentUser = null;
        if (authBox) authBox.style.display = 'block';
        if (mainContent) mainContent.style.display = 'none';
        if (profileBadge) profileBadge.style.display = 'none';
    }
});

function logMasukStudent() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => auth.signInWithPopup(provider))
        .then((result) => console.log("Berjaya Log Masuk:", result.user.email))
        .catch((error) => alert("Gagal Log Masuk: " + error.message));
}

function logKeluarStudent() {
    auth.signOut().then(() => {
        alert("Anda telah log keluar.");
        window.location.reload();
    });
}

// ==========================================
// 3. PENGIRAAN HARGA & KOMISYEN
// ==========================================
function dapatkanPecahanBayaran(kolej) {
    const key = (kolej || '').trim().toLowerCase();
    const cajDikutip = KADAR_DELIVERY_KOLEJ[key] || 6.00;
    const komisyenAdmin = 1.00; 
    const bahagianRunner = Math.max(0, cajDikutip - komisyenAdmin);

    return { cajDikutip, komisyenAdmin, bahagianRunner };
}

// ==========================================
// 4. LOGIK BORANG, KOLEJ & VENDOR
// ==========================================
function kemaskiniStatusPilihKolej() {
    const name = document.getElementById('student-name')?.value.trim();
    const studentSet = document.getElementById('student-set')?.value;
    const kolejSection = document.getElementById('kolej-section');

    if (name && studentSet && kolejSection) {
        kolejSection.classList.remove('disabled-section');
    }
}

function tukarKolej() {
    const selectedKolej = document.getElementById('kolej-select')?.value;
    const menuContainer = document.getElementById('menu-container');
    const vendorSelect = document.getElementById('vendor-select');
    const qrContainer = document.getElementById('vendor-payment-info');

    if (menuContainer) menuContainer.innerHTML = '<p style="color: #888;">Sila pilih gerai untuk melihat menu.</p>';
    if (qrContainer) qrContainer.innerHTML = '';

    cartItems = [];

    if (!selectedKolej) {
        if (vendorSelect) {
            vendorSelect.innerHTML = '<option value="">-- Sila Pilih Kolej Dahulu --</option>';
            vendorSelect.disabled = true;
        }
        currentDeliveryFee = 6.00;
        kemaskiniRingkasanTroli();
        return;
    }

    const { cajDikutip } = dapatkanPecahanBayaran(selectedKolej);
    
    // Kemaskini Presence User dengan Kolej Pilihan
    if (currentStudentUser) {
        db.ref(`online_users/${currentStudentUser.uid}`).update({
            selectedCollege: selectedKolej.toLowerCase()
        });
    }

    pantauPesananMengikutKolej(selectedKolej);
    kiraDeliverySplitCheckout(selectedKolej, cajDikutip);

    if (vendorSelect) {
        vendorSelect.disabled = false;
        vendorSelect.innerHTML = '<option value="">Memuatkan gerai...</option>';
    }

    db.ref('vendors').once('value', (snapshot) => {
        if (!vendorSelect) return;
        vendorSelect.innerHTML = '<option value="">-- Pilih Gerai / Kafe --</option>';
        let vendorWujud = false;

        snapshot.forEach((childSnap) => {
            const vendor = childSnap.val();
            const vendorLoc = (vendor.cafeLocation || '').trim().toLowerCase();
            const selectedLoc = selectedKolej.trim().toLowerCase();

            if (vendorLoc && (vendorLoc === selectedLoc || vendorLoc.includes(selectedLoc) || selectedLoc.includes(vendorLoc))) {
                vendorWujud = true;
                vendorSelect.innerHTML += `<option value="${childSnap.key}">${vendor.shopName}</option>`;
            }
        });

        if (!vendorWujud) {
            vendorSelect.innerHTML = '<option value="">-- Tiada Gerai Berdaftar di Kolej Ini --</option>';
        }
    });
}

function tukarVendor() {
    selectedVendorUid = document.getElementById('vendor-select')?.value;
    const menuSection = document.getElementById('menu-section');
    const menuContainer = document.getElementById('menu-container');

    if (currentMenuRef) currentMenuRef.off();

    if (!selectedVendorUid) {
        if (menuContainer) menuContainer.innerHTML = '<p style="color: #888;">Sila pilih gerai untuk melihat menu.</p>';
        return;
    }

    if (menuSection) menuSection.classList.remove('disabled-section');

    paparkanMaklumatBayaranVendor(selectedVendorUid);

    currentMenuRef = db.ref(`vendors/${selectedVendorUid}/menu`);
    currentMenuRef.on('value', (snapshot) => {
        if (!menuContainer) return;
        menuContainer.innerHTML = '';

        if (!snapshot.exists()) {
            menuContainer.innerHTML = '<p style="color: #888;">Tiada menu ditawarkan oleh gerai ini lagi.</p>';
            return;
        }

        snapshot.forEach((childSnap) => {
            const item = childSnap.val();
            const itemId = childSnap.key;

            menuContainer.innerHTML += `
                <div style="border:1px solid #ddd; padding:10px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${item.name}</strong>
                        <p style="font-size:0.8em; color:#666; margin:2px 0 0 0;">RM ${(parseFloat(item.price) || 0).toFixed(2)}</p>
                    </div>
                    <button type="button" onclick="tambahKeTroli('${itemId}', '${item.name}', ${item.price})" class="btn-primary-action" style="padding: 4px 10px; font-size: 0.8em; width:auto;">
                        + Tambah
                    </button>
                </div>
            `;
        });
    });
}

function paparkanMaklumatBayaranVendor(vendorUid) {
    db.ref(`vendors/${vendorUid}`).once('value', (snapshot) => {
        const vendor = snapshot.val();
        const qrContainer = document.getElementById('vendor-payment-info');
        
        if (qrContainer && vendor) {
            qrContainer.innerHTML = `
                <div style="padding:12px; border:1px solid #fcd34d; background-color:#fffbeb; border-radius:8px; margin-top:15px; font-size:0.85em; text-align:center;">
                    <p style="font-weight:bold; color:#92400e; margin-bottom:4px;">💳 Maklumat Pembayaran Vendor:</p>
                    <p>Bank: <strong>${vendor.bankName || 'Maybank'}</strong></p>
                    <p>No. Akaun: <strong style="color:#2563eb;">${vendor.accountNo || vendor.bankAcc || '-'}</strong></p>
                    <p style="color:#4b5563;">Nama Akaun: ${vendor.accountHolder || vendor.bankHolder || vendor.shopName}</p>
                    ${vendor.qrUrl ? `<img src="${vendor.qrUrl}" style="width:130px; height:130px; margin:8px auto 0 auto; display:block; border:1px solid #ccc; border-radius:6px;"/>` : ''}
                </div>
            `;
        }
    });
}

// ==========================================
// 5. TROLI & PENGHANTARAN ORDER
// ==========================================
function tambahKeTroli(id, name, price) {
    const cartSection = document.getElementById('cart-section');
    if (cartSection) cartSection.classList.remove('disabled-section');

    const itemWujud = cartItems.find(i => i.id === id);
    if (itemWujud) {
        itemWujud.quantity += 1;
    } else {
        cartItems.push({ id, name, price, quantity: 1, vendorUid: selectedVendorUid });
    }

    kemaskiniRingkasanTroli();
}

function kemaskiniRingkasanTroli() {
    const cartItemsElem = document.getElementById('cart-items');
    const subtotalElem = document.getElementById('cart-subtotal');
    const deliveryFeeElem = document.getElementById('cart-delivery-fee');
    const totalPriceElem = document.getElementById('cart-total-price');

    if (!cartItemsElem) return;

    if (cartItems.length === 0) {
        cartItemsElem.innerHTML = '<p style="color: #888;">Troli anda masih kosong.</p>';
        if (subtotalElem) subtotalElem.innerText = 'RM 0.00';
        if (deliveryFeeElem) deliveryFeeElem.innerText = 'RM 0.00';
        if (totalPriceElem) totalPriceElem.innerText = 'RM 0.00';
        return;
    }

    cartItemsElem.innerHTML = '';
    let subtotal = 0;

    cartItems.forEach((item) => {
        const totalItem = item.price * item.quantity;
        subtotal += totalItem;

        cartItemsElem.innerHTML += `
            <div style="display:flex; justify-content:space-between; font-size:0.85em; margin-bottom:5px;">
                <span>${item.name} (x${item.quantity})</span>
                <strong>RM ${totalItem.toFixed(2)}</strong>
            </div>
        `;
    });

    const totalGrand = subtotal + currentDeliveryFee;

    if (subtotalElem) subtotalElem.innerText = `RM ${subtotal.toFixed(2)}`;
    if (deliveryFeeElem) deliveryFeeElem.innerText = `RM ${currentDeliveryFee.toFixed(2)}`;
    if (totalPriceElem) totalPriceElem.innerText = `RM ${totalGrand.toFixed(2)}`;
}

function hantarPesananPelajar() {
    if (!currentStudentUser) return alert("Sila log masuk dahulu.");
    if (cartItems.length === 0) return alert("Troli anda kosong.");

    const name = document.getElementById('student-name')?.value.trim();
    const setClass = document.getElementById('student-set')?.value;
    const kolej = document.getElementById('kolej-select')?.value;

    if (!name || !setClass || !kolej) {
        return alert("Sila lengkapkan maklumat nama, set, dan kolej.");
    }

    db.ref(`vendors/${selectedVendorUid}`).once('value', (snapVendor) => {
        const vendorData = snapVendor.val() || {};
        const { komisyenAdmin, bahagianRunner } = dapatkanPecahanBayaran(kolej);
        
        let subtotal = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        let totalGrand = subtotal + currentDeliveryFee;

        const newOrder = {
            studentUid: currentStudentUser.uid,
            studentEmail: currentStudentUser.email,
            studentName: name,
            studentSet: setClass,
            deliveryLocation: kolej,
            vendorUid: selectedVendorUid,
            vendorBankName: vendorData.bankName || 'Maybank',
            vendorAccountNo: vendorData.accountNo || vendorData.bankAcc || '-',
            items: cartItems,
            subtotalAmount: subtotal,
            deliveryFeeTotal: currentDeliveryFee,
            adminCommission: komisyenAdmin,
            runnerFeeNet: bahagianRunner,
            totalAmount: totalGrand,
            status: 'UNPAID',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        db.ref('orders').push(newOrder).then((docRef) => {
            alert("Pesanan berjaya dihantar! Sila lakukan pembayaran ke akaun vendor.");

            hantarNotifikasiEmel('ORDER_CREATED', {
                orderId: docRef.key,
                studentEmail: currentStudentUser.email,
                vendorUid: selectedVendorUid,
                totalAmount: totalGrand,
                items: cartItems
            });

            cartItems = [];
            kemaskiniRingkasanTroli();
        }).catch(err => alert("Gagal hantar pesanan: " + err.message));
    });
}

// ==========================================
// 6. PEMANTAUAN REAL-TIME DASHBOARD STUDENT
// ==========================================
function mulaPantauOrderStatusStudent(studentUid) {
    const statusContainer = document.getElementById('student-active-order-status');
    if (!statusContainer) return;

    db.ref('orders').orderByChild('studentUid').equalTo(studentUid).on('value', (snapshot) => {
        statusContainer.innerHTML = '';
        let adaActiveOrder = false;

        if (!snapshot.exists()) {
            statusContainer.innerHTML = `<p style="color:#888; font-size:0.85em;">Tiada pesanan aktif buat masa ini.</p>`;
            return;
        }

        snapshot.forEach((childSnap) => {
            const orderKey = childSnap.key;
            const order = childSnap.val();

            if (order.status !== 'COMPLETED' && order.status !== 'CANCELLED') {
                adaActiveOrder = true;
                let itemText = (order.items || []).map(i => `${i.name} (x${i.quantity || 1})`).join(', ');

                let infoBayaran = (order.status === 'UNPAID') ? `
                    <div style="margin-top:8px; padding:10px; background-color:#fffbeb; border:1px solid #fde68a; border-radius:6px; font-size:0.8em;">
                        <p style="font-weight:bold; color:#92400e; margin:0 0 4px 0;">📌 Status Pembayaran:</p>
                        <p style="margin:2px 0; color:#b45309;">Sila klik butang "Bayar Sekarang" di atas untuk membuat pembayaran FPX.</p>
                    </div>
                ` : '';

                let runnerInfo = (order.runnerName || order.runnerPhone) ? 
                    `<div style="margin-top:8px; padding:10px; background-color:#ecfdf5; border:1px solid #a7f3d0; border-radius:6px; font-size:0.8em;">
                        <p style="font-weight:bold; color:#065f46; margin:0 0 2px 0;">🛵 Maklumat Runner Penghantaran:</p>
                        <p style="margin:2px 0; color:#047857;">Nama: <strong>${order.runnerName || '-'}</strong></p>
                        <p style="margin:2px 0; color:#047857;">No. Tel: <a href="tel:${order.runnerPhone}" style="font-weight:bold; color:#2563eb; text-decoration:underline;">${order.runnerPhone || '-'}</a></p>
                     </div>` 
                     : `<p style="font-size:0.75em; color:#6b7280; margin-top:6px; font-style:italic;">⏳ Menunggu vendor menugaskan runner...</p>`;

                statusContainer.innerHTML += `
                    <div style="border:1px solid #e5e7eb; padding:12px; border-radius:8px; margin-bottom:10px; background-color:#fff; font-size:0.85em; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <div style="display:flex; justify-content:space-between; align-items:center; font-weight:bold;">
                            <span>Pesanan #${orderKey.slice(-5)}</span>
                            <span style="padding:4px 8px; border-radius:12px; font-size:0.75em;" class="${getStatusBadgeClass(order.status)}">${formatStatusLabel(order.status)}</span>
                        </div>
                        <p style="margin:6px 0 2px 0; color:#4b5563;"><strong>Item:</strong> ${itemText}</p>
                        <p style="margin:0; color:#4b5563;">Jumlah: <strong>RM ${(order.totalAmount || 0).toFixed(2)}</strong></p>
                        ${infoBayaran}
                        ${runnerInfo}
                        
                        <div style="margin-top:10px; text-align:right;">
                            <button onclick="batalPesananPelajar('${orderKey}')" style="background-color:#ef4444; color:white; border:none; padding:5px 10px; border-radius:5px; font-size:0.78em; font-weight:bold; cursor:pointer;">
                                ❌ Batal Pesanan
                            </button>
                        </div>
                    </div>
                `;
            }
        });

        if (!adaActiveOrder) {
            statusContainer.innerHTML = `<p style="color:#888; font-size:0.85em;">Tiada pesanan aktif buat masa ini.</p>`;
        }
    });
}

function formatStatusLabel(status) {
    switch (status) {
        case 'UNPAID': return 'Menunggu Bayaran';
        case 'PENDING_VERIFICATION': return '⏳ Pengesahan Bayaran';
        case 'PAID': return '✅ Bayaran Disahkan (FPX)';
        case 'COOKING': return '👨‍🍳 Tengah Masak';
        case 'PACKED': return '📦 Dah Siap Bungkus';
        case 'PICKED_UP': return '🛵 Runner Dah Pick Up';
        case 'DELIVERING': return '🚚 Dalam Perjalanan';
        case 'ARRIVED': return '📍 Order Dah Sampai';
        case 'COMPLETED': return '✅ Selesai';
        case 'CANCELLED': return '❌ Dibatalkan';
        default: return status;
    }
}

function mulaPantauSejarahPesananStudent(studentUid) {
    const historyContainer = document.getElementById('student-past-history-list');
    if (!historyContainer) return;

    db.ref('orders').orderByChild('studentUid').equalTo(studentUid).on('value', (snapshot) => {
        historyContainer.innerHTML = '';
        let adaSejarah = false;

        snapshot.forEach((childSnap) => {
            const orderKey = childSnap.key;
            const order = childSnap.val();

            if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
                adaSejarah = true;
                historyContainer.innerHTML += `
                    <div style="padding:8px 0; border-bottom:1px solid #eee; font-size:0.8em; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <p style="font-weight:bold; margin:0;">Pesanan #${orderKey.slice(-5)}</p>
                            <p style="color:#666; margin:2px 0 0 0;">${new Date(order.createdAt).toLocaleDateString()} | RM ${(order.totalAmount || 0).toFixed(2)}</p>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="padding:2px 6px; font-weight:bold; border-radius:4px;" class="${order.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}">
                                ${formatStatusLabel(order.status)}
                            </span>
                            <button onclick="padamSejarahPesananStudent('${orderKey}')" style="background:#dc2626; color:white; border:none; padding:3px 7px; border-radius:4px; font-size:0.75em; cursor:pointer;" title="Padam Sejarah">
                                🗑️ Padam
                            </button>
                        </div>
                    </div>
                `;
            }
        });

        if (!adaSejarah) {
            historyContainer.innerHTML = `<p style="color:#888; font-size:0.85em;">Tiada sejarah pesanan lalu.</p>`;
        }
    });
}

// ==========================================
// 7. TETINGKAP MASA & AUTOMATION
// ==========================================
function semakWaktuPembayaranLive() {
    setInterval(() => {
        const now = new Date();

        const countdownElem = document.getElementById('countdown-timer');
        if (countdownElem) {
            const formatTwoDigits = (num) => String(num).padStart(2, '0');
            countdownElem.innerText = `${formatTwoDigits(now.getHours())}:${formatTwoDigits(now.getMinutes())}:${formatTwoDigits(now.getSeconds())}`;
        }

        const paymentNotice = document.getElementById('payment-timer-notice');
        const payBtn = document.getElementById('btn-pay-now');

        if (!payBtn) return;

        payBtn.disabled = false;
        if (paymentNotice) {
            paymentNotice.innerHTML = `<span style="color:#059669; font-weight:bold;">✅ Mod Demonstrasi Aktif: Pembayaran & Tempahan Dibuka 24 Jam.</span>`;
        }
    }, 1000);
}

// ==========================================
// 8. SIMULASI FPX GATEWAY FUNCTIONS
// ==========================================
function prosesBayaranPelajar() {
    const fpxModal = document.getElementById('fpx-modal');
    if (fpxModal) {
        fpxModal.style.display = 'flex';
    }
}

function tutupFpxModal() {
    const fpxModal = document.getElementById('fpx-modal');
    const loading = document.getElementById('fpx-loading');
    if (fpxModal) fpxModal.style.display = 'none';
    if (loading) loading.style.display = 'none';
}

function prosesSimulasiFpx() {
    const bankSelect = document.getElementById('fpx-bank-select').value;
    const loading = document.getElementById('fpx-loading');

    if (!bankSelect) {
        alert("Sila pilih bank pilihan anda terlebih dahulu.");
        return;
    }

    if (loading) loading.style.display = 'block';

    setTimeout(() => {
        tutupFpxModal();
        
        if (currentStudentUser) {
            db.ref('orders').orderByChild('studentUid').equalTo(currentStudentUser.uid).once('value', (snapshot) => {
                if (snapshot.exists()) {
                    snapshot.forEach((childSnap) => {
                        const orderKey = childSnap.key;
                        const order = childSnap.val();

                        if (order.status === 'UNPAID') {
                            db.ref(`orders/${orderKey}`).update({
                                status: 'PAID',
                                paymentMethod: 'FPX - ' + bankSelect,
                                updatedAt: firebase.database.ServerValue.TIMESTAMP
                            }).then(() => {
                                alert(`✅ Transaksi FPX Berjaya melalui ${bankSelect}! Pembayaran anda telah disahkan.`);
                            });
                        }
                    });
                }
            });
        }
    }, 1500);
}

// ==========================================
// 9. NOTIFIKASI EMEL
// ==========================================
function hantarNotifikasiEmel(jenis, data) {
    if (typeof emailjs === 'undefined') return;

    db.ref(`vendors/${data.vendorUid}`).once('value', (snap) => {
        const vendorData = snap.val() || {};
        const vendorEmail = vendorData.email || '';

        const templateParams = {
            order_id: data.orderId ? data.orderId.slice(-5) : '',
            student_email: data.studentEmail,
            vendor_email: vendorEmail,
            total_price: `RM ${(data.totalAmount || 0).toFixed(2)}`,
            message: jenis === 'ORDER_CREATED' 
                ? 'Pesanan baharu telah berjaya dihantar dan sedia untuk penyediaan vendor.' 
                : `Status pesanan anda telah dikemaskini!`
        };

        if (data.studentEmail) emailjs.send('YOUR_SERVICE_ID', 'YOUR_STUDENT_TEMPLATE_ID', templateParams);
        if (vendorEmail) emailjs.send('YOUR_SERVICE_ID', 'YOUR_VENDOR_TEMPLATE_ID', templateParams);
    });
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

function batalPesananPelajar(orderId) {
    if (confirm("Adakah anda pasti mahu membatalkan pesanan ini?")) {
        db.ref(`orders/${orderId}`).update({
            status: 'CANCELLED',
            cancelReason: 'Dibatalkan oleh pelajar',
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        }).then(() => alert("Pesanan dibatalkan.")).catch(err => alert("Ralat: " + err.message));
    }
}

function padamSejarahPesananStudent(orderId) {
    if (confirm("Adakah anda pasti mahu memadam rekod sejarah ini?")) {
        db.ref(`orders/${orderId}`).remove().then(() => alert("Rekod sejarah dipadam."));
    }
}

// =======================================================
// 10. PRESENCE TRACKER (PENGESAN USERS LOGGED IN)
// =======================================================
function setupPresenceTracker(user) {
    if (!user) return;

    const userPresenceRef = db.ref(`online_users/${user.uid}`);
    const connectedRef = db.ref('.info/connected');

    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            userPresenceRef.onDisconnect().remove();

            const selectedKolej = document.getElementById('kolej-select')?.value || "";

            userPresenceRef.set({
                name: user.displayName || 'Pelajar',
                email: user.email,
                selectedCollege: selectedKolej.toLowerCase(),
                lastActive: firebase.database.ServerValue.TIMESTAMP
            });
        }
    });

    db.ref('online_users').on('value', (snapshot) => {
        const countElement = document.getElementById('online-user-count');
        if (countElement) {
            const totalOnline = snapshot.exists() ? snapshot.numChildren() : 1;
            countElement.innerText = totalOnline;
        }
    });
}

// =======================================================
// 11. DETECT ORDERS DARI KOLEJ PELAJAR (REAL-TIME)
// =======================================================
function pantauPesananMengikutKolej(kolejPelajar) {
    const collegeCountElement = document.getElementById('college-order-count');
    const collegeLabelElement = document.getElementById('college-name-label');

    if (!collegeCountElement) return;

    if (collegeLabelElement && kolejPelajar) {
        collegeLabelElement.innerText = `Aktif di ${kolejPelajar.toUpperCase()}`;
    }

    db.ref('orders').on('value', (snapshot) => {
        let count = 0;
        if (snapshot.exists()) {
            snapshot.forEach((childSnap) => {
                const order = childSnap.val();
                const orderKolej = (order.deliveryLocation || order.college || order.kolej || '').toLowerCase();
                const kolejMatch = orderKolej === (kolejPelajar || '').toLowerCase();
                const isAktif = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';

                if (kolejMatch && isAktif) {
                    count++;
                }
            });
        }
        collegeCountElement.innerText = count;
    });
}

// =======================================================
// 12. REAL-TIME AUTO-SPLIT DELIVERY FEE (PERBAIKAN UTAMA)
// =======================================================
function kiraDeliverySplitCheckout(kolejUser, baseDeliveryFee = 6.00) {
    if (!kolejUser) kolejUser = "kbh";

    // 1. Dengar perubahan pesanan aktif
    db.ref('orders').on('value', (snapshot) => {
        let activeOrdersCount = 0;

        if (snapshot.exists()) {
            snapshot.forEach((childSnap) => {
                const order = childSnap.val();
                const orderKolej = (order.deliveryLocation || order.college || order.kolej || '').toLowerCase();
                const kolejMatch = orderKolej === kolejUser.toLowerCase();
                const isAktif = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';

                if (kolejMatch && isAktif) {
                    activeOrdersCount++;
                }
            });
        }

        // 2. Dengar juga akaun pengguna online di kolej yang sama
        db.ref('online_users').on('value', (onlineSnap) => {
            let onlineUsersInCollege = 0;

            if (onlineSnap.exists()) {
                onlineSnap.forEach((userSnap) => {
                    const u = userSnap.val();
                    if ((u.selectedCollege || '').toLowerCase() === kolejUser.toLowerCase()) {
                        onlineUsersInCollege++;
                    }
                });
            }

            // Gabungkan pengguna aktif (Minimum 1 orang)
            const totalPayers = Math.max(1, activeOrdersCount, onlineUsersInCollege);
            
            // Kira caj pembahagian (Contoh KPZ: RM10.00 / 2 orang = RM5.00)
            const splitFee = (baseDeliveryFee / totalPayers);
            const savings = (baseDeliveryFee - splitFee).toFixed(2);

            currentDeliveryFee = splitFee;

            const countEl = document.getElementById('active-sharing-users');
            const savingsEl = document.getElementById('delivery-savings');
            const deliveryFeeElem = document.getElementById('cart-delivery-fee');

            if (countEl) countEl.innerText = `${totalPayers}`;
            if (deliveryFeeElem) deliveryFeeElem.innerText = `RM ${splitFee.toFixed(2)}`;

            if (savingsEl) {
                if (totalPayers > 1) {
                    savingsEl.innerText = `🎉 Auto-Split Active! Anda jimat RM ${savings} (Caj asal RM ${baseDeliveryFee.toFixed(2)} ÷ ${totalPayers} orang)!`;
                    savingsEl.style.display = 'block';
                } else {
                    savingsEl.style.display = 'none';
                }
            }

            kemaskiniRingkasanTroli();
        });
    });
}