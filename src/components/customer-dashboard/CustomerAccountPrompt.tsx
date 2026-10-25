import { User } from 'lucide-react'
import { ACCENT, DARK } from './constants'

interface CustomerAccountPromptProps {
  onViewChange: (view: string) => void
}

export default function CustomerAccountPrompt({
  onViewChange,
}: CustomerAccountPromptProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 460, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '36px 28px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, margin: '0 auto 18px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={24} color={ACCENT} />
        </div>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 22, fontWeight: 800, color: DARK, margin: '0 0 10px' }}>Your account starts with your first order</h1>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, margin: '0 0 24px' }}>
          Complete checkout once and we’ll automatically create your account, order history, and customer statistics from the details you provide.
        </p>
        <button onClick={() => onViewChange('landing')} style={{ width: '100%', padding: 12, border: 0, borderRadius: 8, background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
          Start Shopping
        </button>
      </div>
    </div>
  )
}
