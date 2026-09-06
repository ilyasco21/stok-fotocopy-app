'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [items, setItems] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // State User Sesi Login
  const [user, setUser] = useState(null)
  const [inputUsername, setInputUsername] = useState('')
  const [inputPassword, setInputPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // State Modals
  const [showLogModal, setShowLogModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)

  // State Transfer Stok
  const [transferItem, setTransferItem] = useState(null)
  const [targetArea, setTargetArea] = useState('Tangerang')
  const [transferQty, setTransferQty] = useState(1)

  // State Scanner Kamera
  const [showScanner, setShowScanner] = useState(false)

  // State Form Tambah Barang (Admin)
  const [namaBarang, setNamaBarang] = useState('')
  const [kodePart, setKodePart] = useState('')
  const [kategori, setKategori] = useState('Sparepart')
  const [stok, setStok] = useState(0)
  const [lokasi, setLokasi] = useState('')
  const [areaBarang, setAreaBarang] = useState('PIK 2')

  // State Form Tambah User Baru (Admin)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newNamaLengkap, setNewNamaLengkap] = useState('')
  const [newRole, setNewRole] = useState('teknisi')
  const [newArea, setNewArea] = useState('PIK 2')

  const listArea = ['PIK 2', 'Tangerang', 'Jakarta Pusat', 'Gading Serpong', 'Pusat']

  useEffect(() => {
    const savedUser = localStorage.getItem('stok_user_session')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    fetchItems()
  }, [])

  // Dynamic Import Scanner Kamera
  useEffect(() => {
    let html5QrcodeScanner = null

    if (showScanner) {
      import('html5-qrcode').then((module) => {
        const Html5QrcodeScanner = module.Html5QrcodeScanner
        html5QrcodeScanner = new Html5QrcodeScanner(
          'reader',
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        )

        html5QrcodeScanner.render(
          (decodedText) => {
            setSearch(decodedText)
            setShowScanner(false)
            if (html5QrcodeScanner) {
              html5QrcodeScanner.clear()
            }
          },
          () => {}
        )
      })
    }

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch((err) => console.error(err))
      }
    }
  }, [showScanner])

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
      .limit(100)

    if (!error) setLogs(data || [])
  }

  // Proses Login Verifikasi Database
  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', inputUsername.toLowerCase().trim())
      .eq('password', inputPassword)
      .single()

    if (error || !data) {
      setLoginError('Username atau Password salah!')
      return
    }

    const sessionData = {
      id: data.id,
      username: data.username,
      nama: data.nama_lengkap,
      role: data.role,
      area: data.area,
    }

    setUser(sessionData)
    localStorage.setItem('stok_user_session', JSON.stringify(sessionData))
    setInputUsername('')
    setInputPassword('')
  }

  function handleLogout() {
    localStorage.removeItem('stok_user_session')
    setUser(null)
  }

  // Tambah User/Akun Baru (Khusus Admin)
  async function handleCreateUser(e) {
    e.preventDefault()
    const { error } = await supabase.from('users').insert([
      {
        username: newUsername.toLowerCase().trim(),
        password: newPassword,
        nama_lengkap: newNamaLengkap,
        role: newRole,
        area: newArea,
      },
    ])

    if (error) {
      alert('Gagal buat akun: ' + error.message)
    } else {
      alert('Akun baru berhasil dibuat!')
      setNewUsername('')
      setNewPassword('')
      setNewNamaLengkap('')
      setShowAddUserModal(false)
    }
  }

  // Ekspor Excel
  function exportStokToExcel() {
    import('xlsx').then((XLSX) => {
      const dataToExport = filteredItems.map((item) => ({
        'Nama Barang': item.nama_barang,
        'Kode Part': item.kode_part || '-',
        'Kategori': item.kategori,
        'Area': item.area || 'Pusat',
        'Lokasi Rak': item.lokasi || '-',
        'Sisa Stok': item.stok,
      }))

      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Stok')
      XLSX.writeFile(workbook, `Laporan_Stok_${user?.area || 'Semua'}.xlsx`)
    })
  }

  function exportLogsToExcel() {
    import('xlsx').then((XLSX) => {
      const dataToExport = logs.map((log) => ({
        'Waktu': new Date(log.created_at).toLocaleString('id-ID'),
        'Nama Teknisi': log.nama_teknisi,
        'Area': log.area,
        'Nama Barang': log.nama_barang,
        'Aksi': log.aksi,
        'Jumlah': log.jumlah,
      }))

      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Transaksi')
      XLSX.writeFile(workbook, 'Riwayat_Transaksi_Stok.xlsx')
    })
  }

  // Transfer Stok
  async function handleTransferStok(e) {
    e.preventDefault()
    if (!transferItem || transferQty <= 0) return
    if (transferItem.stok < transferQty) return alert('Stok asal tidak mencukupi!')

    await supabase
      .from('inventory')
      .update({ stok: transferItem.stok - transferQty })
      .eq('id', transferItem.id)

    const { data: existing } = await supabase
      .from('inventory')
      .select('*')
      .eq('nama_barang', transferItem.nama_barang)
      .eq('area', targetArea)
      .single()

    if (existing) {
      await supabase
        .from('inventory')
        .update({ stok: existing.stok + parseInt(transferQty) })
        .eq('id', existing.id)
    } else {
      await supabase.from('inventory').insert([
        {
          nama_barang: transferItem.nama_barang,
          kode_part: transferItem.kode_part,
          kategori: transferItem.kategori,
          stok: parseInt(transferQty),
          lokasi: transferItem.lokasi,
          area: targetArea,
        },
      ])
    }

    await supabase.from('stock_logs').insert([
      {
        nama_barang: transferItem.nama_barang,
        kode_part: transferItem.kode_part,
        aksi: `MUTASI (${transferItem.area || 'Pusat'} -> ${targetArea})`,
        jumlah: transferQty,
        nama_teknisi: user?.nama || 'Admin',
        area: transferItem.area || 'Pusat',
      },
    ])

    setShowTransferModal(false)
    setTransferItem(null)
    fetchItems()
    alert('Transfer stok berhasil!')
  }

  // Tambah Barang (Admin)
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

  // Update Stok
  async function handleUpdateStok(item, amount) {
    const newStok = item.stok + amount
    if (newStok < 0) return alert('Stok tidak boleh minus!')

    const { error: updateErr } = await supabase
      .from('inventory')
      .update({ stok: newStok })
      .eq('id', item.id)

    if (updateErr) return alert('Gagal update stok: ' + updateErr.message)

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

  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.nama_barang?.toLowerCase().includes(search.toLowerCase()) ||
      item.kode_part?.toLowerCase().includes(search.toLowerCase())

    const matchArea = user?.role === 'admin' ? true : item.area === user?.area

    return matchSearch && matchArea
  })

  // HALAMAN LOGIN UTAMA
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
        <form onSubmit={handleLogin} style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '320px' }}>
          <h2 style={{ marginTop: 0, textAlign: 'center', color: '#0f172a' }}>🔐 Login Stok Opname</h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Masukkan Username & Password</p>
          
          {loginError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px', borderRadius: '6px', fontSize: '12px', marginBottom: '15px', textAlign: 'center' }}>
              {loginError}
            </div>
          )}

          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>USERNAME</label>
          <input
            type="text"
            placeholder="Contoh: tirta / admin"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
            style={{ width: '100%', padding: '10px', marginTop: '4px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            required
          />

          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>PASSWORD</label>
          <input
            type="password"
            placeholder="••••••••"
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
            style={{ width: '100%', padding: '10px', marginTop: '4px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            required
          />

          <button type="submit" style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Masuk Akun
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header Info User */}
      <div style={{ background: '#0f172a', color: '#fff', padding: '16px 20px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px' }}>📦 Stok Opname Fotokopi</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            User: <strong>{user.nama}</strong> ({user.role.toUpperCase()}) | Area: <span style={{ background: '#2563eb', padding: '2px 8px', borderRadius: '4px', color: '#fff' }}>{user.area}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {user.role === 'admin' && (
            <>
              <button onClick={() => setShowAddUserModal(true)} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                👤 +Akun User
              </button>
              <button onClick={() => { fetchLogs(); setShowLogModal(true); }} style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                📋 Log Transaksi
              </button>
              <button onClick={exportStokToExcel} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                📊 Excel Stok
              </button>
            </>
          )}
          <button onClick={handleLogout} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Modal Tambah Akun User Baru (Admin Only) */}
      {showAddUserModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form onSubmit={handleCreateUser} style={{ background: '#fff', padding: '25px', borderRadius: '8px', width: '320px' }}>
            <h3 style={{ marginTop: 0 }}>👤 Buat Akun User Baru</h3>
            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>NAMA LENGKAP</label>
            <input type="text" placeholder="Nama Teknisi" value={newNamaLengkap} onChange={(e) => setNewNamaLengkap(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />

            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>USERNAME</label>
            <input type="text" placeholder="Username login" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />

            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>PASSWORD</label>
            <input type="password" placeholder="Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />

            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>ROLE</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="teknisi">Teknisi</option>
              <option value="admin">Admin</option>
            </select>

            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>AREA TUGAS</label>
            <select value={newArea} onChange={(e) => setNewArea(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #ccc' }}>
              {listArea.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ flex: 1, background: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}>Simpan</button>
              <button type="button" onClick={() => setShowAddUserModal(false)} style={{ flex: 1, background: '#e2e8f0', color: '#334155', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}>Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Scanner Kamera */}
      {showScanner && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0 }}>📷 Scan Barcode / QR Code</h3>
            <div id="reader" style={{ width: '100%' }}></div>
            <button onClick={() => setShowScanner(false)} style={{ marginTop: '15px', background: '#ef4444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Modal Transfer Stok */}
      {showTransferModal && transferItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form onSubmit={handleTransferStok} style={{ background: '#fff', padding: '25px', borderRadius: '8px', width: '320px' }}>
            <h3 style={{ marginTop: 0 }}>🔄 Transfer Stok Barang</h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>{transferItem.nama_barang} (Stok Saat Ini: {transferItem.stok})</p>
            
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>AREA TUJUAN</label>
            <select value={targetArea} onChange={(e) => setTargetArea(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc' }}>
              {listArea.filter(a => a !== (transferItem.area || 'Pusat')).map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>JUMLAH TRANSFER</label>
            <input type="number" min="1" max={transferItem.stok} value={transferQty} onChange={(e) => setTransferQty(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ flex: 1, background: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}>Kirim</button>
              <button type="button" onClick={() => setShowTransferModal(false)} style={{ flex: 1, background: '#e2e8f0', color: '#334155', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}>Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Log Transaksi (Admin Only) */}
      {showLogModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>📋 Log Riwayat Transaksi</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={exportLogsToExcel} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>📊 Excel Log</button>
                <button onClick={() => setShowLogModal(false)} style={{ background: '#e2e8f0', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Tutup</button>
              </div>
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
      {user.role === 'admin' && (
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

      {/* Bar Pencarian & Tombol Scan Barcode Kamera */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder={`🔍 Cari barang/kode part di area ${user.role === 'admin' ? 'Semua Area' : user.area}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', boxSizing: 'border-box' }}
        />
        <button
          onClick={() => setShowScanner(true)}
          style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          📷 Scan Kamera
        </button>
      </div>

      {/* Tabel Data Stok */}
      {loading ? (
        <p style={{ textAlign: 'center' }}>Memuat data stok...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1e293b', color: '#fff', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Nama Barang</th>
              <th style={{ padding: '12px' }}>Kode Part</th>
              {user.role === 'admin' && <th style={{ padding: '12px' }}>Area</th>}
              <th style={{ padding: '12px' }}>Lokasi</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Stok</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Aksi Stok</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={user.role === 'admin' ? 6 : 5} style={{ textAlign: 'center', padding: '25px', color: '#94a3b8' }}>
                  Tidak ada barang untuk area ini.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isLowStock = item.stok <= 2

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', background: isLowStock ? '#fef2f2' : 'transparent' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>
                      {item.nama_barang}
                      {isLowStock && <span style={{ marginLeft: '8px', background: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>STOK TIPIS</span>}
                    </td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{item.kode_part || '-'}</td>
                    {user.role === 'admin' && <td style={{ padding: '12px', color: '#2563eb', fontWeight: 'bold' }}>{item.area || 'Pusat'}</td>}
                    <td style={{ padding: '12px', color: '#64748b' }}>{item.lokasi || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: isLowStock ? '#dc2626' : '#0f172a' }}>
                      {item.stok}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => handleUpdateStok(item, -1)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', marginRight: '5px', cursor: 'pointer', fontWeight: 'bold' }}>-1</button>
                      <button onClick={() => handleUpdateStok(item, 1)} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold' }}>+1</button>
                      {user.role === 'admin' && (
                        <button onClick={() => { setTransferItem(item); setShowTransferModal(true); }} style={{ background: '#eab308', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 8px', marginLeft: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>🔄 Transfer</button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
