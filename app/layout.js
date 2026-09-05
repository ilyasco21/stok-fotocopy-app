export const metadata = {
  title: 'Stok Opname Fotokopi',
  description: 'Sistem Manajemen Stok Sparepart Mesin Fotokopi',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
