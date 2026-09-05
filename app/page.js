'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [items, setItems] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // State Identitas User / Teknisi
  const [user, setUser] = useState(null) // { nama: '', area: '' }
  const [inputNama, setInputNama] = useState('')
  const [selectedArea, setSelectedArea] = useState('PIK 2')

  // State Admin & PIN
  const [isAdmin, setIsAdmin] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [showPinModal, setShowPinModal] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)

  // State Form Tambah Barang (Admin)
  const [namaBarang, setNamaBarang] = useState('')
  const [kodePart, setKodePart] = useState('')
  const [kategori, setKategori] = useState('Sparepart')
  const [stok, setStok] = useState(0)
  const [lokasi, setLokasi] = useState('')
  const [areaBarang, setAreaBarang] = useState('PIK 2')

  const listArea = ['PIK 2', 'Tangerang', 'Jakarta Pusat', 'Gading Serpong', 'Pusat']

  useEffect(() => {
    // Cek session teknisi di localStorage
    const savedUser = localStorage.getItem('stok_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    fetchItems()
  }, [])

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setItems(data || [])
    setLoading(false)
  }

  async function fetchLogs() {
    const { data, error } = await supabase
      .from('stock_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (!error) setLogs(data || [])
  }

  // Simpan Sesi Login Teknisi
  function handleSetUser(e) {
    e.preventDefault()
    if (!inputNama) return alert('Masukkan nama kamu!')
    const userData = { nama: inputNama, area: selectedArea }
    setUser(userData)
    localStorage.setItem('stok_user', JSON.stringify(userData))
  }

  function handleLogoutUser() {
    localStorage.removeItem('stok_user')
    setUser(null)
    setIsAdmin(false)
  }

  // Verifikasi PIN Admin
  function handleLoginAdmin(e) {
    e.preventDefault()
    if (pinInput === '1234') {
      setIsAdmin(true)
      setShowPinModal(false)
      setPinInput('')
    } else {
      alert('PIN Admin Salah!')
    }
  }

  // Tambah Master Barang (Admin)
  async function handleAddItem(e) {
    e.preventDefault()
    if (!namaBarang) return alert('Nama barang wajib diisi!')

    const { error } = await supabase.from('inventory').insert([
      {
        nama_barang: namaBarang,
        kode_part: kodePart,
        kategori: kategori,
        stok: parseInt(stok) || 0,
        lokasi: lokasi,
        area: areaBarang,
      },
    ])

    if (error) {
      alert('Gagal menambah barang: ' + error.message)
    } else {
      setNamaBarang('')
      setKodePart('')
      setStok(0)
      setLokasi('')
      fetchItems()
      alert('Barang berhasil ditambahkan!')
    }
  }

  // Update Stok & Catat Log Transaksi
  async function handleUpdateStok(item, amount) {
    const newStok = item.stok + amount
    if (newStok < 0) return alert('Stok tidak boleh minus!')

    // 1. Update Stok di Inventory
    const { error: updateErr } = await supabase
      .from('inventory')
      .update({ stok: newStok })
      .eq('id', item.id)

    if (updateErr) return alert('Gagal update stok: ' + updateErr.message)

    // 2. Catat Riwayat di Stock Logs
    await supabase.from('stock_logs').insert([
      {
        nama_barang: item.nama_barang,
        kode_part: item.kode_part,
        aksi: amount > 0 ? 'RESTOCK (+1)' : 'AMBIL (-1)',
        jumlah: Math.abs(amount),
        nama_teknisi: user?.nama || 'Anonim',
        area: user?.area || item.area || 'Pusat',
      },
    ])

    fetchItems()
  }

  // Filter Barang Berdasarkan Area & Pencarian
  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.nama_barang?.toLowerCase().includes(search.toLowerCase()) ||
      item.kode_part?.toLowerCase().includes(search.toLowerCase())

    // Admin bisa lihat semua, Teknisi hanya area miliknya
    const matchArea = isAdmin ? true : item.area === user?.area

    return matchSearch && matchArea
  })

  // JIKA BELUM LOGIN TEKNISI
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
        <form onSubmit={handleSetUser} style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '320px' }}>
          <h2 style={{ marginTop: 0, textAlign: 'center', color: '#0f172a' }}>🔑 Login Teknisi</h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Masukan nama dan area tugas kamu</p>
          
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>NAMA TEKNISI</label>
          <input
            type="text"
            placeholder="Contoh: Budi / Tirta"
            value={inputNama}
            onChange={(e) => setInputNama(e.target.value)}
            style={{ width: '100%', padding: '10px', marginTop: '4px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            required
          />

          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>AREA TUGAS</label>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            style={{ width: '100%', padding: '10px', marginTop: '4px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
          >
            {listArea.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <button type="submit" style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Masuk Aplikasi
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header Info User & Area */}
      <div style={{ background: '#0f172a', color: '#fff', padding: '16px 20px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px' }}>📦 Stok Opname Fotokopi</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Teknisi: <strong>{user.nama}</strong> | Area: <span style={{ background: '#2563eb', padding: '2px 8px', borderRadius: '4px', color: '#fff' }}>{user.area}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin ? (
            <>
              <button onClick={() => { fetchLogs(); setShowLogModal(true); }} style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                📋 Log Transaksi
              </button>
              <button onClick={() => setIsAdmin(false)} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                Exit Admin
              </button>
            </>
          ) : (
            <button onClick={() => setShowPinModal(true)} style={{ background: '#1e293b', border: '1px solid #475569', color: '#fff', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
              🔒 Mode Admin
            </button>
          )}
          <button onClick={handleLogoutUser} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
            Ganti User
          </button>
        </div>
      </div>

      {/* Modal Input PIN Admin */}
      {showPinModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form onSubmit={handleLoginAdmin} style={{ background: '#fff', padding: '25px', borderRadius: '8px', width: '300px', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0 }}>PIN Admin Gudang</h3>
            <input
              type="password"
              placeholder="Default: 1234"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center', fontSize: '18px' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ flex: 1, background: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}>Masuk</button>
              <button type="button" onClick={() => setShowPinModal(false)} style={{ flex: 1, background: '#e2e8f0', color: '#334155', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}>Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Log Transaksi (Admin Only) */}
      {showLogModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>📋 Log Riwayat Transaksi (30 Terakhir)</h3>
              <button onClick={() => setShowLogModal(false)} style={{ background: '#e2e8f0', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Tutup</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Waktu</th>
                  <th style={{ padding: '8px' }}>Teknisi</th>
                  <th style={{ padding: '8px' }}>Area</th>
                  <th style={{ padding: '8px' }}>Barang</th>
                  <th style={{ padding: '8px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', color: '#64748b' }}>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{log.nama_teknisi}</td>
                    <td style={{ padding: '8px' }}>{log.area}</td>
                    <td style={{ padding: '8px' }}>{log.nama_barang}</td>
                    <td style={{ padding: '8px', color: log.aksi.includes('AMBIL') ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>{log.aksi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Tambah Barang (Khusus Admin) */}
      {isAdmin && (
        <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '25px' }}>
          <h3 style={{ marginTop: 0, color: '#1e40af' }}>🛠️ Tambah Master Barang Baru</h3>
          <form onSubmit={handleAddItem} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            <input type="text" placeholder="Nama Barang" value={namaBarang} onChange={(e) => setNamaBarang(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} required />
            <input type="text" placeholder="Kode Part / OEM" value={kodePart} onChange={(e) => setKodePart(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <select value={kategori} onChange={(e) => setKategori(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="Sparepart">Sparepart</option>
              <option value="Toner">Toner / Tinta</option>
              <option value="Consumable">Consumable</option>
              <option value="Aksesoris">Aksesoris</option>
            </select>
            <select value={areaBarang} onChange={(e) => setAreaBarang(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
              {listArea.map((a) => <option key={a} value={a}>Area: {a}</option>)}
            </select>
            <input type="number" placeholder="Stok Awal" value={stok} onChange={(e) => setStok(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="text" placeholder="Lokasi Rak" value={lokasi} onChange={(e) => setLokasi(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', padding: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Simpan</button>
          </form>
        </div>
      )}

      {/* Bar Pencarian */}
      <input
        type="text"
        placeholder={`🔍 Cari barang/kode part di area ${isAdmin ? 'Semua Area (Mode Admin)' : user.area}...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', boxSizing: 'border-box', marginBottom: '20px' }}
      />

      {/* Tabel Data Stok */}
      {loading ? (
        <p style={{ textAlign: 'center' }}>Memuat data stok...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1e293b', color: '#fff', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Nama Barang</th>
              <th style={{ padding: '12px' }}>Kode Part</th>
              {isAdmin && <th style={{ padding: '12px' }}>Area</th>}
              <th style={{ padding: '12px' }}>Lokasi</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Stok</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Aksi Stok</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '25px', color: '#94a3b8' }}>
                  Tidak ada barang untuk area ini.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{item.nama_barang}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{item.kode_part || '-'}</td>
                  {isAdmin && <td style={{ padding: '12px', color: '#2563eb', fontWeight: 'bold' }}>{item.area || 'Pusat'}</td>}
                  <td style={{ padding: '12px', color: '#64748b' }}>{item.lokasi || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>{item.stok}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button onClick={() => handleUpdateStok(item, -1)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', marginRight: '5px', cursor: 'pointer', fontWeight: 'bold' }}>-1</button>
                    <button onClick={() => handleUpdateStok(item, 1)} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold' }}>+1</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
