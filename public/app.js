/**
 * Rescue Vault - Frontend Controller
 * Web Crypto (SHA-256 + PBKDF2 AES-GCM), Declarative Safe DOM, Drag & Drop
 */

const MAGIC = new Uint8Array([0x45, 0x4e, 0x43, 0x30]); // "ENC0"
const SALT_LEN = 16;
const IV_LEN = 12;
const PBKDF2_ITERATIONS = 100_000;

// Dynamic Workers API Base URL
function getApiBase() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return '';
  }
  if (host === 'gdrive.gnn.tr') {
    return 'https://gdrive-api.gnn.tr';
  }
  if (host === 'gdrive-frontend.pages.dev') {
    return 'https://gdrive-api.bigdesigner.workers.dev';
  }
  return 'https://gdrive-api.gnn.tr';
}
const API_BASE = getApiBase();

function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = sessionStorage.getItem('rescue_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

let isUploading = false;
const uploadQueue = [];
const uploadedHistory = [];

// DOM Elementleri
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const adminPasswordInput = document.getElementById('adminPassword');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');

const panicBtn = document.getElementById('panicBtn');
const accountBadge = document.getElementById('accountBadge');
const quotaText = document.getElementById('quotaText');
const quotaBar = document.getElementById('quotaBar');

const encryptToggle = document.getElementById('encryptToggle');
const encryptStatusText = document.getElementById('encryptStatusText');
const encryptionKeyContainer = document.getElementById('encryptionKeyContainer');
const encryptionPasswordInput = document.getElementById('encryptionPassword');
const toggleEncPassBtn = document.getElementById('toggleEncPassBtn');
const generatePassBtn = document.getElementById('generatePassBtn');

const dropzoneArea = document.getElementById('dropzoneArea');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');

const uploadProgressCard = document.getElementById('uploadProgressCard');
const uploadingFileName = document.getElementById('uploadingFileName');
const uploadingFileSize = document.getElementById('uploadingFileSize');
const uploadProgressBar = document.getElementById('uploadProgressBar');
const uploadPercentText = document.getElementById('uploadPercentText');
const uploadingShaText = document.getElementById('uploadingShaText');
const uploadStatusBadge = document.getElementById('uploadStatusBadge');

const historyCountBadge = document.getElementById('historyCountBadge');
const historyEmpty = document.getElementById('historyEmpty');
const historyList = document.getElementById('historyList');

// Lucide ikonlarını yenile
function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Byte Biçimlendirme
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// SHA-256 Adli Özet Hesaplayıcı (Web Crypto)
async function calculateSha256(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Zero-Knowledge AES-256-GCM Şifreleme (Web Crypto)
async function encryptPayload(arrayBuffer, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));

  // 1. PBKDF2 ile Anahtar Türet
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // 2. AES-GCM ile Şifrele
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    arrayBuffer
  );

  // 3. Paket Oluştur: [MAGIC (4B)][SALT (16B)][IV (12B)][CIPHERTEXT (N B)]
  const ciphertextBytes = new Uint8Array(ciphertextBuffer);
  const totalLength = MAGIC.length + SALT_LEN + IV_LEN + ciphertextBytes.length;
  const packageBytes = new Uint8Array(totalLength);

  packageBytes.set(MAGIC, 0);
  packageBytes.set(salt, MAGIC.length);
  packageBytes.set(iv, MAGIC.length + SALT_LEN);
  packageBytes.set(ciphertextBytes, MAGIC.length + SALT_LEN + IV_LEN);

  return packageBytes.buffer;
}

// Rastgele Güçlü Parola Üret
function generateSecurePassphrase() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+-=';
  const randomValues = new Uint8Array(24);
  crypto.getRandomValues(randomValues);
  let res = '';
  for (let i = 0; i < randomValues.length; i++) {
    res += chars[randomValues[i] % chars.length];
  }
  return res;
}

// ================= OTURUM & GİRİŞ KONTROLÜ =================

async function checkAuth() {
  try {
    const res = await fetch(`${API_BASE}/api/check-auth`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (data.authenticated) {
      showDashboard();
      fetchStatus();
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin();
  }
}

function showLogin() {
  loginSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  refreshIcons();
}

function showDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  refreshIcons();
}

// Giriş Formu
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  loginError.textContent = '';
  loginBtn.disabled = true;
  loginBtn.classList.add('opacity-70');

  const password = adminPasswordInput.value.trim();
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      credentials: 'include',
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (data.token) {
        sessionStorage.setItem('rescue_token', data.token);
      }
      adminPasswordInput.value = '';
      showDashboard();
      fetchStatus();
    } else {
      loginError.textContent = data.error || 'Giriş başarısız oldu.';
      loginError.classList.remove('hidden');
    }
  } catch (err) {
    loginError.textContent = 'Bağlantı hatası: ' + err.message;
    loginError.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
    loginBtn.classList.remove('opacity-70');
  }
});

togglePasswordBtn.addEventListener('click', () => {
  const type = adminPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  adminPasswordInput.setAttribute('type', type);
});

// Panic Wipe (Acil Durum Çıkışı)
panicBtn.addEventListener('click', async () => {
  if (confirm('DİKKAT: Oturum kapatılacak ve tüm yerel geçmiş temizlenecektir. Onaylıyor musunuz?')) {
    try {
      await fetch(`${API_BASE}/api/logout`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
    } catch {}
    // Yerel verileri yok et
    sessionStorage.clear();
    localStorage.clear();
    uploadedHistory.length = 0;
    renderHistory();
    showLogin();
  }
});

// Sistem & Drive Durumu Çek
async function fetchStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    const json = await res.json();
    if (res.ok && json.success) {
      const data = json.data;
      if (data.account) {
        accountBadge.textContent = `${data.account.name} (${data.account.email})`;
      } else {
        accountBadge.textContent = 'Google Hesabı Aktif';
      }

      if (data.storageQuota) {
        const sq = data.storageQuota;
        quotaText.textContent = `${sq.usageFormatted} / ${sq.limitFormatted} (%${sq.percentUsed})`;
        quotaBar.style.width = `${Math.min(100, sq.percentUsed)}%`;
      }
    }
  } catch (e) {
    console.error('Status fetch error:', e);
  }
}

// ================= ŞİFRELEME AYARLARI =================

encryptToggle.addEventListener('change', () => {
  if (encryptToggle.checked) {
    encryptStatusText.textContent = 'AÇIK (Zero-Knowledge)';
    encryptStatusText.classList.remove('text-slate-400');
    encryptStatusText.classList.add('text-cyan-400', 'font-bold');
    encryptionKeyContainer.classList.remove('hidden');
    if (!encryptionPasswordInput.value) {
      encryptionPasswordInput.value = generateSecurePassphrase();
    }
  } else {
    encryptStatusText.textContent = 'KAPALI';
    encryptStatusText.classList.add('text-slate-400');
    encryptStatusText.classList.remove('text-cyan-400', 'font-bold');
    encryptionKeyContainer.classList.add('hidden');
  }
  refreshIcons();
});

toggleEncPassBtn.addEventListener('click', () => {
  const type = encryptionPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  encryptionPasswordInput.setAttribute('type', type);
});

generatePassBtn.addEventListener('click', () => {
  encryptionPasswordInput.value = generateSecurePassphrase();
});

// ================= SÜRÜKLE - BIRAK VE YÜKLEME =================

selectFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

dropzoneArea.addEventListener('click', () => {
  fileInput.click();
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropzoneArea.addEventListener(
    eventName,
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneArea.classList.add('drag-over');
    },
    false
  );
});

['dragleave', 'drop'].forEach((eventName) => {
  dropzoneArea.addEventListener(
    eventName,
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneArea.classList.remove('drag-over');
    },
    false
  );
});

dropzoneArea.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    handleFiles(files);
  }
});

fileInput.addEventListener('change', (e) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    handleFiles(files);
  }
  fileInput.value = ''; // Sıfırla
});

function handleFiles(fileList) {
  for (const file of fileList) {
    uploadQueue.push(file);
  }
  processNextInQueue();
}

async function processNextInQueue() {
  if (isUploading || uploadQueue.length === 0) return;

  isUploading = true;
  const file = uploadQueue.shift();

  try {
    await uploadSingleFile(file);
  } catch (err) {
    console.error('Yükleme hatası:', err);
    alert(`Yükleme başarısız: ${file.name}\n${err.message}`);
  } finally {
    isUploading = false;
    processNextInQueue();
  }
}

async function uploadSingleFile(file) {
  // 100 MB Limit Kontrolü
  if (file.size > 100 * 1024 * 1024) {
    throw new Error('Dosya boyutu Cloudflare Pages limiti olan 100 MB sınırını aşıyor.');
  }

  // Yükleme Kartını Aç
  uploadProgressCard.classList.remove('hidden');
  uploadingFileName.textContent = file.name;
  uploadingFileSize.textContent = `(${formatBytes(file.size)})`;
  uploadProgressBar.style.width = '0%';
  uploadPercentText.textContent = '0%';
  uploadingShaText.textContent = 'SHA-256 Hesaplanıyor...';
  uploadStatusBadge.textContent = 'Hazırlanıyor';
  uploadStatusBadge.className = 'px-2 py-0.5 rounded bg-amber-950 text-amber-300 shrink-0';

  // Dosya Verisini Oku
  const rawArrayBuffer = await file.arrayBuffer();

  // SHA-256 Delil Özeti Hesapla (Her halükarda orijinal dosyanın özeti)
  const originalSha256 = await calculateSha256(rawArrayBuffer);
  uploadingShaText.textContent = originalSha256.substring(0, 16) + '...';

  let finalBuffer = rawArrayBuffer;
  let finalFileName = file.name;
  let isEncrypted = false;

  // Sıfır Bilgi AES Şifreleme Aktif mi?
  if (encryptToggle.checked) {
    const encPass = encryptionPasswordInput.value.trim();
    if (!encPass) {
      throw new Error('Şifreleme açık fakat parola girilmedi.');
    }
    uploadStatusBadge.textContent = 'AES-256 ile Şifreleniyor';
    finalBuffer = await encryptPayload(rawArrayBuffer, encPass);
    finalFileName = file.name + '.enc';
    isEncrypted = true;
  }

  uploadStatusBadge.textContent = 'Google Drive Yükleniyor';
  uploadStatusBadge.className = 'px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 shrink-0';

  // FormData Hazırla
  const formData = new FormData();
  const uploadBlob = new Blob([finalBuffer], { type: isEncrypted ? 'application/octet-stream' : file.type });
  formData.append('file', uploadBlob, finalFileName);
  formData.append('sha256', originalSha256);
  formData.append('encrypted', isEncrypted ? 'true' : 'false');

  // XHR ile Yükleme ve Canlı İlerleme Çubuğu
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/upload`);
    xhr.withCredentials = true;

    const token = sessionStorage.getItem('rescue_token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        uploadProgressBar.style.width = percent + '%';
        uploadPercentText.textContent = percent + '%';
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && res.file) {
            uploadStatusBadge.textContent = 'Tamamlandı';
            uploadStatusBadge.className = 'px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 shrink-0';
            uploadedHistory.unshift(res.file);
            renderHistory();
            fetchStatus(); // Kotayı güncelle
            setTimeout(() => {
              if (!isUploading) {
                uploadProgressCard.classList.add('hidden');
              }
            }, 3000);
            resolve(res);
          } else {
            reject(new Error(res.error || 'Bilinmeyen hata'));
          }
        } catch (e) {
          reject(new Error('Sunucu geçersiz yanıt verdi: ' + xhr.responseText));
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          reject(new Error(res.error || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Ağ bağlantı hatası oluştu.'));
    xhr.send(formData);
  });
}

// ================= ADLİ AKTİVİTE GEÇMİŞİ (DECLARATIVE SAFE DOM) =================
// Anti-String-DOM & DOM-XSS Guard: Kesinlikle innerHTML kullanılmaz!

function renderHistory() {
  historyCountBadge.textContent = `${uploadedHistory.length} dosya`;

  if (uploadedHistory.length === 0) {
    historyEmpty.classList.remove('hidden');
    historyList.innerHTML = '';
    return;
  }

  historyEmpty.classList.add('hidden');
  historyList.innerHTML = '';

  uploadedHistory.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs';

    // Sol Blok: Dosya Bilgileri
    const leftBlock = document.createElement('div');
    leftBlock.className = 'space-y-1.5 min-w-0';

    const titleRow = document.createElement('div');
    titleRow.className = 'flex items-center gap-2 flex-wrap';

    const fileNameSpan = document.createElement('span');
    fileNameSpan.className = 'font-mono font-bold text-slate-100 truncate';
    fileNameSpan.textContent = item.name;

    const sizeSpan = document.createElement('span');
    sizeSpan.className = 'font-mono text-[11px] text-slate-400';
    sizeSpan.textContent = `(${item.sizeFormatted || formatBytes(item.size)})`;

    const encBadge = document.createElement('span');
    encBadge.className = item.isEncrypted
      ? 'px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
      : 'px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400';
    encBadge.textContent = item.isEncrypted ? 'AES-256 ŞİFRELİ' : 'DÜZ VERİ';

    titleRow.appendChild(fileNameSpan);
    titleRow.appendChild(sizeSpan);
    titleRow.appendChild(encBadge);

    // SHA-256 Satırı
    const hashRow = document.createElement('div');
    hashRow.className = 'flex items-center gap-2 text-[11px] text-slate-400';

    const hashLabel = document.createElement('span');
    hashLabel.textContent = 'SHA-256:';

    const hashCode = document.createElement('code');
    hashCode.className = 'font-mono text-cyan-300 select-all';
    hashCode.textContent = item.sha256;

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono transition';
    copyBtn.textContent = 'Kopyala';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(item.sha256);
      copyBtn.textContent = 'Kopyalandı!';
      setTimeout(() => (copyBtn.textContent = 'Kopyala'), 1500);
    });

    hashRow.appendChild(hashLabel);
    hashRow.appendChild(hashCode);
    hashRow.appendChild(copyBtn);

    leftBlock.appendChild(titleRow);
    leftBlock.appendChild(hashRow);

    // Sağ Blok: Aksiyonlar (Drive Linki)
    const rightBlock = document.createElement('div');
    rightBlock.className = 'flex items-center gap-2 self-start md:self-center shrink-0';

    if (item.webViewLink) {
      const driveLink = document.createElement('a');
      driveLink.href = item.webViewLink;
      driveLink.target = '_blank';
      driveLink.rel = 'noopener noreferrer';
      driveLink.className = 'px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] flex items-center gap-1.5 transition';
      driveLink.textContent = 'Drive\'da Aç ↗';
      rightBlock.appendChild(driveLink);
    }

    card.appendChild(leftBlock);
    card.appendChild(rightBlock);
    historyList.appendChild(card);
  });
}

// Uygulama Başlatma
checkAuth();
refreshIcons();
