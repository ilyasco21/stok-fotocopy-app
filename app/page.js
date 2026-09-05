'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Form State untuk Tambah Barang Baru
  const [namaBarang, setNamaBarang] = useState('')
  const [kodePart, setKodePart] = useState('')
  const [kategori, setKategori] = useState('Sparepart')
  const [stok, setStok] = useState(0)
  const [lokasi, setLokasi] = useState('')

  // Fetch Data dari Supabase
  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching data:', error)
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }

  // Tambah Barang Baru
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
    }
  }

  // Update Stok (Tambah / Kurang)
  async function handleUpdateStok(id, currentStok, amount) {
    const newStok = currentStok + amount
    if (newStok < 0) return alert('Stok tidak boleh minus!')

    const { error } = await supabase
      .from('inventory')
      .update({ stok: newStok })
      .eq('id', id)

    if (error) {
      alert('Gagal update stok: ' + error.message)
    } else {
      fetchItems()
    }
  }

  // Filter Search
  const filteredItems = items.filter(
    (item) =>
      item.nama_barang?.toLowerCase().includes(search.toLowerCase()) ||
      item.kode_part?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#1e293b' }}>📦 Stok Opname Fotokopi</h1>
      <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '30px' }}>
        Sistem Manajemen & Opname Sparepart / Toner Mesin Fotokopi
      </p>

      {/* Form Tambah Barang */}
      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, color: '#334155' }}>Tambah Barang Baru</h3>
        <form onSubmit={handleAddItem} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <input
            type="text"
            placeholder="Nama Barang (contoh: Drum Canon iR)"
            value={namaBarang}
            onChange={(e) => setNamaBarang(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            required
          />
          <input
            type="text"
            placeholder="Kode Part / OEM"
            value={kodePart}
            onChange={(e) => setKodePart(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="Sparepart">Sparepart</option>
            <option value="Toner">Toner / Tinta</option>

            <option value="Consumable">Consumable</option>
            <option value="Aksesoris">Aksesoris / Lainnya</option>
          </select>
          <input
            type="number"
            placeholder="Stok Awal"
            value={stok}
            onChange={(e) => setStok(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="text"
            placeholder="Lokasi Rak / Gudang"
            value={lokasi}
            onChange={(e) => setLokasi(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button
            type="submit"
            style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            + Simpan
          </button>
        </form>
      </div>

      {/* Bar Pencarian */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Cari nama barang atau kode part..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
        />
      </div>

      {/* Tabel Data Stok */}
      {loading ? (
        <p style={{ textAlign: 'center' }}>Memuat data stok...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#fff', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Nama Barang</th>
              <th style={{ padding: '12px' }}>Kode Part</th>
              <th style={{ padding: '12px' }}>Kategori</th>
              <th style={{ padding: '12px' }}>Lokasi</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Stok</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Aksi Stok</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  Belum ada data barang.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#1e293b' }}>{item.nama_barang}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{item.kode_part || '-'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      {item.kategori}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{item.lokasi || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                    {item.stok}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleUpdateStok(item.id, item.stok, -1)}
                      style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', marginRight: '5px', cursor: 'pointer' }}
                    >
                      -1
                    </button>
                    <button
                      onClick={() => handleUpdateStok(item.id, item.stok, 1)}
                      style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer' }}
                    >
                      +1
                    </button>
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
