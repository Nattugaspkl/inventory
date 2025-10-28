// ============ CONFIG =============
const API_URL = "https://script.google.com/macros/s/AKfycbwHWIpnKRc9am3GR-YrRFGi52Il5OZnfr3UFD1E2SYtmcz1MVnQ40c5gY1sifGVZZng/exec";
// ============ END CONFIG =========

// local cache of items (kept in sync with sheet)
let items = [];

// UI refs
const refs = {
  pageTitle: document.getElementById('pageTitle'),
  listArea: document.getElementById('listArea'),
  detailArea: document.getElementById('detailArea'),
  totalCount: document.getElementById('totalCount'),
  alatCount: document.getElementById('alatCount'),
  matCount: document.getElementById('matCount'),
  alatCategories: document.getElementById('alatCategories'),
  matCategories: document.getElementById('matCategories'),
  quickSearch: document.getElementById('quickSearch'),
  modalBack: document.getElementById('modalBack'),
  modalContent: document.getElementById('modalContent'),
  csvFile: document.getElementById('csvFile')
};

// ----------------- utilities -----------------
async function apiGet() {
  const r = await fetch(API_URL);
  if (!r.ok) throw new Error('API get failed');
  return r.json();
}
async function apiPost(payload){
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if(!r.ok) throw new Error('API post failed');
  return r.json();
}

function showModal(html){
  refs.modalContent.innerHTML = html + `<div style="margin-top:12px;text-align:right"><button class="btn" onclick="closeModal()">Tutup</button></div>`;
  refs.modalBack.style.display = 'flex';
}
function closeModal(){ refs.modalBack.style.display = 'none'; refs.modalContent.innerHTML = ''; }

// ----------------- render / state -----------------
function updateStats(){
  refs.totalCount.innerText = items.length || 0;
  refs.alatCount.innerText = items.filter(i=>i.Jenis && i.Jenis.toLowerCase()==='alat').length;
  refs.matCount.innerText = items.filter(i=>i.Jenis && i.Jenis.toLowerCase()==='material').length;
}

function renderList(data){
  refs.listArea.innerHTML = '';
  const arr = data || items;
  if(!arr.length){ refs.listArea.innerHTML = '<div class="muted">Tidak ada produk.</div>'; return; }
  arr.forEach(it=>{
    const el = document.createElement('div'); el.className = 'itemCard';
    el.innerHTML = `
      <div class="thumb">${(it.Jenis||'').toLowerCase()==='alat'?'🔧':'🧱'}</div>
      <div style="flex:1">
        <h4>${it.Nama} <small class="muted">(${it.Part||''})</small></h4>
        <p class="muted">ID: ${it.ID} • Kategori: ${it.Kategori} • ${it.Jumlah || 0} ${it.Satuan || ''}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn" data-id="${it.ID}">Detail</button>
        <button class="muted editBtn" data-edit="${it.ID}" style="background:transparent;border:none;cursor:pointer">Edit</button>
      </div>
    `;
    refs.listArea.appendChild(el);
  });
  refs.listArea.querySelectorAll('button[data-id]').forEach(b => b.addEventListener('click', e=> showDetail(e.target.dataset.id)));
  refs.listArea.querySelectorAll('button[data-edit]').forEach(b => b.addEventListener('click', e=> openEditModal(e.target.dataset.edit)));
}

function showDetail(id){
  const it = items.find(x=>x.ID===id); if(!it){ return; }
  refs.detailArea.innerHTML = `
    <div style="display:flex;gap:12px;align-items:flex-start">
      <div style="width:80px;height:80px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:30px;background:linear-gradient(135deg,#f8fafc,#eef6f8)">${(it.Jenis||'').toLowerCase()==='alat'?'🔧':'🧱'}</div>
      <div style="flex:1">
        <h3 style="margin:0">${it.Nama} <small class="muted">(${it.Part||''})</small></h3>
        <p class="muted" style="margin:6px 0">ID: ${it.ID} • Kategori: ${it.Kategori}</p>
        <p style="margin:6px 0">${it.Keterangan || '-'}</p>
        <p><strong>Jumlah:</strong> ${it.Jumlah || 0} ${it.Satuan || ''}</p>
        <div style="margin-top:10px;display:flex;gap:8px">
          <button class="btn" onclick="openEditModal('${it.ID}')">Edit</button>
          <button onclick="confirmDelete('${it.ID}','${it.Nama}')" style="padding:8px 12px;border-radius:8px">Hapus</button>
        </div>
      </div>
    </div>
  `;
}

// ----------------- categories builder -----------------
function buildCategories(){
  const alatCats = Array.from(new Set(items.filter(i=> (i.Jenis||'').toLowerCase()==='alat').map(i=>i.Kategori))).filter(Boolean);
  const matCats = Array.from(new Set(items.filter(i=> (i.Jenis||'').toLowerCase()==='material').map(i=>i.Kategori))).filter(Boolean);
  const ac = document.getElementById('alatCategories'); ac.innerHTML = '';
  alatCats.forEach(c=>{
    const d = document.createElement('div'); d.className='item sub'; d.style.background='transparent';
    d.innerHTML = `<div class="icon">📁</div><div class="label">${c}</div>`;
    d.addEventListener('click', ()=> {
      refs.pageTitle.innerText = `Alat • ${c}`;
      renderList(items.filter(it=> (it.Jenis||'').toLowerCase()==='alat' && it.Kategori===c));
    });
    ac.appendChild(d);
  });
  const mc = document.getElementById('matCategories'); mc.innerHTML = '';
  matCats.forEach(c=>{
    const d = document.createElement('div'); d.className='item sub'; d.style.background='transparent';
    d.innerHTML = `<div class="icon">📁</div><div class="label">${c}</div>`;
    d.addEventListener('click', ()=> {
      refs.pageTitle.innerText = `Material • ${c}`;
      renderList(items.filter(it=> (it.Jenis||'').toLowerCase()==='material' && it.Kategori===c));
    });
    mc.appendChild(d);
  });
}

// ----------------- CRUD (client -> API) -----------------
async function refreshData(){
  try {
    const data = await apiGet();
    items = Array.isArray(data) ? data : [];
    renderList();
    updateStats();
    buildCategories();
  } catch (err) {
    console.error(err);
    refs.listArea.innerHTML = `<div class="muted">Gagal muat data: ${err.message}</div>`;
  }
}

async function openAddModal(defaultJenis){
  const html = `
    <h3>Tambah Produk</h3>
    <label>ID</label><input id="m_id" />
    <label>Nama</label><input id="m_nama" />
    <label>Jenis</label>
    <select id="m_jenis">
      <option value="Alat" ${defaultJenis==='Alat'?'selected':''}>Alat</option>
      <option value="Material" ${defaultJenis==='Material'?'selected':''}>Material</option>
    </select>
    <label>Kategori</label><input id="m_kat" />
    <label>Part / Part Number</label><input id="m_part" />
    <label>Jumlah</label><input id="m_jumlah" type="number" value="1" />
    <label>Satuan</label><input id="m_satuan" value="pcs" />
    <label>Keterangan</label><textarea id="m_ket"></textarea>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" id="m_save">Simpan</button>
    </div>
  `;
  showModal(html);
  document.getElementById('m_save').addEventListener('click', async ()=>{
    const payload = {
      action: 'add',
      ID: document.getElementById('m_id').value.trim(),
      Nama: document.getElementById('m_nama').value.trim(),
      Jenis: document.getElementById('m_jenis').value,
      Kategori: document.getElementById('m_kat').value.trim(),
      Part: document.getElementById('m_part').value.trim(),
      Jumlah: Number(document.getElementById('m_jumlah').value) || 0,
      Satuan: document.getElementById('m_satuan').value.trim(),
      Keterangan: document.getElementById('m_ket').value.trim()
    };
    try {
      await apiPost(payload);
      closeModal();
      await refreshData();
    } catch (e) { alert('Gagal tambah: '+e.message); }
  });
}

function openEditModal(id){
  const it = items.find(x=>x.ID===id); if(!it) return;
  const html = `
    <h3>Edit Produk</h3>
    <label>ID (readonly)</label><input id="m_id" value="${it.ID}" readonly />
    <label>Nama</label><input id="m_nama" value="${it.Nama}" />
    <label>Kategori</label><input id="m_kat" value="${it.Kategori}" />
    <label>Part</label><input id="m_part" value="${it.Part}" />
    <label>Jumlah</label><input id="m_jumlah" type="number" value="${it.Jumlah||0}" />
    <label>Satuan</label><input id="m_satuan" value="${it.Satuan||''}" />
    <label>Keterangan</label><textarea id="m_ket">${it.Keterangan||''}</textarea>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" id="m_update">Simpan Perubahan</button>
    </div>
  `;
  showModal(html);
  document.getElementById('m_update').addEventListener('click', async ()=>{
    const payload = {
      action: 'update',
      ID: document.getElementById('m_id').value.trim(),
      Nama: document.getElementById('m_nama').value.trim(),
      Kategori: document.getElementById('m_kat').value.trim(),
      Part: document.getElementById('m_part').value.trim(),
      Jumlah: Number(document.getElementById('m_jumlah').value) || 0,
      Satuan: document.getElementById('m_satuan').value.trim(),
      Keterangan: document.getElementById('m_ket').value.trim()
    };
    try {
      await apiPost(payload);
      closeModal();
      await refreshData();
    } catch (e) { alert('Gagal update: '+e.message); }
  });
}

async function confirmDelete(id, nama){
  if (!confirm(`Hapus ${nama} (${id}) ?`)) return;
  try {
    await apiPost({ action: 'delete', ID: id, Nama: nama });
    await refreshData();
  } catch (e) { alert('Gagal hapus: '+e.message); }
}

// ----------------- search -----------------
function performSearch(q){
  if(!q){ renderList(); refs.pageTitle.innerText = 'Home'; return; }
  const lq = q.toLowerCase();
  const res = items.filter(i => (i.Nama||'').toLowerCase().includes(lq) || (i.ID||'').toLowerCase()===lq || (i.Part||'').toLowerCase()===lq );
  refs.pageTitle.innerText = `Search: ${q}`;
  renderList(res);
}

// ----------------- import/export CSV -----------------
async function exportCSV(){
  // request CSV from API ?action=export
  const url = API_URL + '?action=export';
  const r = await fetch(url);
  if(!r.ok){ alert('Gagal export'); return; }
  const csv = await r.text();
  // download as file
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'inventory_export.csv'; document.body.appendChild(a); a.click(); a.remove();
}

function bindFileImport(){
  refs.csvFile.addEventListener('change', async (ev)=>{
    const f = ev.target.files[0]; if(!f) return;
    const txt = await f.text();
    // send CSV to API for import
    try {
      await apiPost({ action: 'import_csv', csv: txt, Note: `Import file ${f.name}` });
      alert('Import berhasil');
      await refreshData();
    } catch (e) { alert('Import gagal: '+e.message); }
  });
}

// ----------------- wiring UI -----------------
document.getElementById('homeBtn').addEventListener('click', ()=>{
  refs.pageTitle.innerText = 'Home';
  renderList();
});
document.getElementById('barangBtn').addEventListener('click', ()=> {
  const el = document.getElementById('barangNested');
  el.style.display = el.style.display==='none' ? 'block' : 'none';
});
document.querySelectorAll('#barangNested .item[data-type]').forEach(el=>{
  el.addEventListener('click', ()=>{
    const type = el.dataset.type;
    const nested = type==='alat' ? document.getElementById('alatNested') : document.getElementById('matNested');
    nested.style.display = nested.style.display==='none' ? 'block' : 'none';
  });
});

document.getElementById('addBtn').addEventListener('click', ()=> openAddModal());
document.getElementById('searchBtn').addEventListener('click', ()=> performSearch(refs.quickSearch.value.trim()));
refs.quickSearch.addEventListener('keydown', e=> { if(e.key==='Enter') performSearch(refs.quickSearch.value.trim()); });

document.getElementById('tutorialBtn').addEventListener('click', ()=> {
  showModal(`<h3>Tutorial Singkat</h3>
    <ol>
      <li>Klik <strong>Barang</strong> → <em>Alat</em> / <em>Material</em> untuk lihat kategori.</li>
      <li>Klik salah satu kategori untuk lihat produk terkait.</li>
      <li>Klik <strong>Tambah Produk</strong> untuk menambah, atau klik produk → Edit/Hapus.</li>
      <li>Gunakan <strong>Import CSV</strong> untuk masukkan banyak data; gunakan Export untuk download CSV.</li>
      <li>Data disimpan di Google Sheets (sheet Data) dan semua aktivitas dicatat di sheet Log.</li>
    </ol>`);
});

document.getElementById('searchPanelBtn').addEventListener('click', ()=> { refs.quickSearch.focus(); });
document.getElementById('importBtn').addEventListener('click', ()=> refs.csvFile.click());
document.getElementById('exportBtn').addEventListener('click', exportCSV);
bindFileImport();

// logo info
document.getElementById('logoBtn').addEventListener('click', ()=> {
  showModal(`<h3>PT. CONTOH</h3><p>Inventory & Asset Management — versi demo.</p>`);
});

// modal close on outside click
refs.modalBack.addEventListener('click', e=> { if(e.target===refs.modalBack) closeModal(); });

// init
refreshData();
