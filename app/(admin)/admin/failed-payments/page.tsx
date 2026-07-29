'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle, CheckCircle, Clock, Download,
  MessageCircle, RefreshCw, Search, UserX,
} from 'lucide-react'

interface MatchedFailure {
  creatorId: string
  creatorName: string
  email: string
  instagramHandle: string | null
  joinedAt: string
  membershipStatus: string
  amount: number
  currency: string
  failedAt: number
  status: 'retrying' | 'failed' | 'resolved'
  attemptCount: number
  subscriptionId: string | null
  stripeCustomerId: string
  matched: true
}

interface UnmatchedFailure {
  email: string | null
  amount: number
  currency: string
  failedAt: number
  status: string
  attemptCount: number
  stripeCustomerId: string
  matched: false
}

interface Summary {
  total: number
  matchedCount: number
  unmatchedCount: number
  activeFailures: number
  resolved: number
  totalOutstanding: number
}

interface CreatorLite {
  id: string
  firstName: string
  lastName: string
  email: string
}

const STATUS_CONFIG = {
  retrying: { label: 'Retrying', colour: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: Clock },
  failed: { label: 'Failed', colour: '#C0392B', bg: 'rgba(192,57,43,0.1)', icon: AlertCircle },
  resolved: { label: 'Resolved', colour: '#27AE60', bg: 'rgba(39,174,96,0.1)', icon: CheckCircle },
} as const

// Prevent CSV formula injection: a cell starting with = + - @ is executed by
// spreadsheet apps. Prefix those with a quote, and always quote-escape.
function csvCell(value: string | number): string {
  const s = String(value ?? '')
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}

export default function FailedPaymentsPage() {
  const router = useRouter()
  const [matched, setMatched] = useState<MatchedFailure[]>([])
  const [unmatched, setUnmatched] = useState<UnmatchedFailure[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [stripeConfigured, setStripeConfigured] = useState(true)
  const [range, setRange] = useState('30')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [matchingCustomerId, setMatchingCustomerId] = useState<string | null>(null)
  const [matchResults, setMatchResults] = useState<CreatorLite[]>([])
  const [matchSearchTerm, setMatchSearchTerm] = useState('')
  const [sendingDM, setSendingDM] = useState<string | null>(null)

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/failed-payments?range=${range}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMatched(data.matched || [])
      setUnmatched(data.unmatched || [])
      setSummary(data.summary || null)
      setStripeConfigured(data.stripeConfigured !== false)
    } catch {
      setError('Failed to load payment data. Check your Stripe API key is configured correctly.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [range])

  useEffect(() => { fetchData() }, [fetchData])

  // Manual-match creator search hits the server so it searches ALL creators,
  // not just the first page (the app has ~1,000). Debounced lightly.
  useEffect(() => {
    if (!matchingCustomerId) return
    const term = matchSearchTerm.trim()
    const id = setTimeout(() => {
      fetch(`/api/admin/creators?search=${encodeURIComponent(term)}`)
        .then(r => r.json())
        .then(d => setMatchResults((d.creators || []).slice(0, 8)))
        .catch(() => setMatchResults([]))
    }, 200)
    return () => clearTimeout(id)
  }, [matchSearchTerm, matchingCustomerId])

  const filtered = matched.filter(f => {
    const q = search.toLowerCase()
    const matchesSearch = !search ||
      f.creatorName.toLowerCase().includes(q) ||
      f.email.toLowerCase().includes(q) ||
      (f.instagramHandle?.toLowerCase().includes(q) ?? false)
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' }).format(amount)

  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const handleExport = () => {
    const rows = [
      ['Creator Name', 'Email', 'Instagram', 'Amount', 'Currency', 'Status', 'Failed Date', 'Retry Attempts', 'Joined App', 'Membership Status'].map(csvCell).join(','),
      ...filtered.map(f => [
        f.creatorName, f.email, f.instagramHandle || '', f.amount, f.currency, f.status,
        new Date(f.failedAt * 1000).toLocaleDateString('en-GB'), f.attemptCount,
        new Date(f.joinedAt).toLocaleDateString('en-GB'), f.membershipStatus,
      ].map(csvCell).join(',')),
    ].join('\n')

    const blob = new Blob([rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wgy-failed-payments-${range}days-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleSendDM = async (failure: MatchedFailure) => {
    setSendingDM(failure.creatorId)
    try {
      const firstName = failure.creatorName.split(' ')[0]
      const draftMessage = `Hi ${firstName}, we noticed your recent payment didn't go through. Please update your payment details to keep your WGY membership active. If you need any help, just reply to this message and we'll sort it out for you.`
      // Admin -> creator send is /api/chat/dm/admin (creatorId + body). The
      // plain /api/chat/dm posts into the CALLER's own thread and ignores
      // creatorId, so it would have messaged nobody useful.
      const res = await fetch('/api/chat/dm/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: failure.creatorId, body: draftMessage }),
      })
      if (!res.ok) throw new Error()
      router.push('/admin/inbox')
    } catch {
      alert('Failed to send DM. Please try again.')
    } finally {
      setSendingDM(null)
    }
  }

  const handleManualMatch = async (stripeCustomerId: string, creatorId: string) => {
    try {
      const res = await fetch('/api/admin/failed-payments/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId, stripeCustomerId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Match failed')
        return
      }
      setMatchingCustomerId(null)
      setMatchSearchTerm('')
      setMatchResults([])
      fetchData(true)
    } catch {
      alert('Failed to link creator.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>ADMIN</p>
          <p style={{ color: 'white', fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: 32, margin: '4px 0 4px' }}>Failed Payments</p>
          <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 13, margin: 0 }}>Pulled live from Stripe. No card details are stored or shown.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={range} onChange={e => setRange(e.target.value)}
            style={{ background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 14px', color: 'white', fontFamily: 'Montserrat, sans-serif', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="365">Last 12 months</option>
          </select>
          <button onClick={() => fetchData(true)} disabled={refreshing}
            style={{ background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 14px', color: refreshing ? '#706b6b' : '#e4dcd1', fontFamily: 'Montserrat, sans-serif', fontSize: 13, cursor: refreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={handleExport} disabled={filtered.length === 0}
            style={{ background: '#e4dcd1', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#222222', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 13, cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: filtered.length === 0 ? 0.4 : 1 }}>
            <Download size={14} />Export CSV
          </button>
        </div>
      </div>

      {!stripeConfigured && !error && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '14px 20px', marginBottom: 24 }}>
          <p style={{ color: '#F59E0B', fontFamily: 'Montserrat, sans-serif', fontSize: 13, margin: 0 }}>
            Stripe isn&apos;t connected yet, so there&apos;s no live payment data. Add STRIPE_SECRET_KEY in Vercel to enable this page.
          </p>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={16} color="#C0392B" />
          <p style={{ color: '#C0392B', fontFamily: 'Montserrat, sans-serif', fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e4dcd1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {!loading && !error && summary && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'ACTIVE FAILURES', value: summary.activeFailures, colour: '#C0392B', bg: 'rgba(192,57,43,0.1)' },
              { label: 'RETRYING', value: matched.filter(m => m.status === 'retrying').length, colour: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
              { label: 'RESOLVED', value: summary.resolved, colour: '#27AE60', bg: 'rgba(39,174,96,0.1)' },
              { label: 'OUTSTANDING', value: formatAmount(summary.totalOutstanding, 'GBP'), colour: '#e4dcd1', bg: 'rgba(228,220,209,0.08)' },
            ].map(card => (
              <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.colour}30`, borderRadius: 12, padding: '16px 20px' }}>
                <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }}>{card.label}</p>
                <p style={{ color: card.colour, fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 24, margin: 0 }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#706b6b' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
                style={{ width: '100%', background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 14px 8px 34px', color: 'white', fontFamily: 'Montserrat, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {['all', 'retrying', 'failed', 'resolved'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ background: statusFilter === s ? '#e4dcd1' : '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 14px', color: statusFilter === s ? '#222222' : '#706b6b', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}>
                {s === 'all' ? `All (${matched.length})` : s}
              </button>
            ))}
          </div>

          {/* Matched table */}
          <div style={{ background: '#2a2a2a', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 80px 100px 140px', background: '#1a1a1a', padding: '12px 20px', gap: 12 }}>
              {['CREATOR', 'AMOUNT', 'STATUS', 'ATTEMPTS', 'FAILED DATE', 'ACTIONS'].map(h => (
                <span key={h} style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{h}</span>
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <CheckCircle size={32} color="#27AE60" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: 'white', fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: 18, margin: '0 0 6px' }}>No failed payments</p>
                <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 13, margin: 0 }}>
                  {search || statusFilter !== 'all' ? 'No results match your filters' : `No payment failures in the last ${range} days`}
                </p>
              </div>
            )}

            {filtered.map((failure, index) => {
              const statusCfg = STATUS_CONFIG[failure.status]
              const Icon = statusCfg.icon
              return (
                <div key={`${failure.creatorId}-${failure.failedAt}`}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 80px 100px 140px', padding: '16px 20px', gap: 12, borderBottom: index < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center', background: failure.status === 'failed' ? 'rgba(192,57,43,0.03)' : 'transparent' }}>
                  <div>
                    <p style={{ color: 'white', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 13, margin: '0 0 2px' }}>{failure.creatorName}</p>
                    <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 11, margin: '0 0 2px' }}>{failure.email}</p>
                    {failure.instagramHandle && <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 10, margin: 0 }}>{failure.instagramHandle}</p>}
                  </div>
                  <p style={{ color: 'white', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14, margin: 0 }}>{formatAmount(failure.amount, failure.currency)}</p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: statusCfg.bg, border: `1px solid ${statusCfg.colour}40`, borderRadius: 20, padding: '4px 10px', width: 'fit-content' }}>
                    <Icon size={10} color={statusCfg.colour} />
                    <span style={{ color: statusCfg.colour, fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 10 }}>{statusCfg.label}</span>
                  </div>
                  <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 13, margin: 0, textAlign: 'center' }}>{failure.attemptCount}</p>
                  <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 12, margin: 0 }}>{formatDate(failure.failedAt)}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {failure.status !== 'resolved' && (
                      <button onClick={() => handleSendDM(failure)} disabled={sendingDM === failure.creatorId}
                        style={{ background: 'rgba(228,220,209,0.1)', border: '1px solid rgba(228,220,209,0.2)', borderRadius: 6, padding: '5px 10px', color: '#e4dcd1', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: sendingDM === failure.creatorId ? 0.5 : 1 }}
                        title="Send payment reminder DM">
                        <MessageCircle size={10} />{sendingDM === failure.creatorId ? 'Sending...' : 'DM'}
                      </button>
                    )}
                    <button onClick={() => router.push(`/admin/creators?search=${encodeURIComponent(failure.email)}`)}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 10px', color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 10, cursor: 'pointer' }}
                      title="View creator profile">View</button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Unmatched */}
          {unmatched.length > 0 && (
            <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserX size={16} color="#F59E0B" />
                <div>
                  <p style={{ color: '#F59E0B', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 12, margin: 0 }}>
                    {unmatched.length} Unmatched Payment{unmatched.length !== 1 ? 's' : ''}
                  </p>
                  <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 11, margin: '2px 0 0' }}>
                    These Stripe customers could not be automatically matched to an app creator by email. Please link them manually.
                  </p>
                </div>
              </div>

              {unmatched.map((failure, index) => (
                <div key={failure.stripeCustomerId}
                  style={{ padding: '16px 20px', borderBottom: index < unmatched.length - 1 ? '1px solid rgba(245,158,11,0.08)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div>
                      <p style={{ color: 'white', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 13, margin: '0 0 4px' }}>
                        {failure.email || 'No email on Stripe record'}
                      </p>
                      <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 11, margin: 0 }}>
                        {formatAmount(failure.amount, failure.currency)} · {formatDate(failure.failedAt)} · {failure.attemptCount} attempt{failure.attemptCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button onClick={() => { setMatchingCustomerId(failure.stripeCustomerId); setMatchSearchTerm(''); setMatchResults([]) }}
                      style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '6px 14px', color: '#F59E0B', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                      Link to Creator
                    </button>
                  </div>

                  {matchingCustomerId === failure.stripeCustomerId && (
                    <div style={{ marginTop: 12, background: '#1a1a1a', borderRadius: 8, padding: 12 }}>
                      <input value={matchSearchTerm} onChange={e => setMatchSearchTerm(e.target.value)} placeholder="Search creator by name or email..." autoFocus
                        style={{ width: '100%', background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 12px', color: 'white', fontFamily: 'Montserrat, sans-serif', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {matchResults.map(creator => (
                          <button key={creator.id} onClick={() => handleManualMatch(failure.stripeCustomerId, creator.id)}
                            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 12px', color: 'white', fontFamily: 'Montserrat, sans-serif', fontSize: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{creator.firstName} {creator.lastName}</span>
                            <span style={{ color: '#706b6b', fontSize: 11 }}>{creator.email}</span>
                          </button>
                        ))}
                        {matchResults.length === 0 && (
                          <p style={{ color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 12, textAlign: 'center', padding: '8px 0', margin: 0 }}>
                            {matchSearchTerm ? 'No creators found' : 'Type to search creators'}
                          </p>
                        )}
                      </div>
                      <button onClick={() => { setMatchingCustomerId(null); setMatchSearchTerm(''); setMatchResults([]) }}
                        style={{ background: 'none', border: 'none', color: '#706b6b', fontFamily: 'Montserrat, sans-serif', fontSize: 11, cursor: 'pointer', marginTop: 8, padding: 0 }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
