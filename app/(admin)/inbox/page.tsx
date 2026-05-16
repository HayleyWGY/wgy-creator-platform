export default function AdminInboxPage() {
  return (
    <div style={{ padding: 32, background: '#222222', minHeight: '100vh' }}>
      <p style={{
        color: '#706b6b', fontFamily: 'Montserrat, sans-serif',
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0,
      }}>
        INBOX
      </p>
      <p style={{
        color: 'white', fontFamily: 'Playfair Display, serif',
        fontStyle: 'italic', fontSize: 32, margin: '4px 0 24px',
      }}>
        Creator Messages
      </p>
      <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 14 }}>
        Messaging system coming soon.
      </p>
    </div>
  )
}
