/**
 * PaymentHistory
 * ==============
 * Shows list of payments received for order invoices.
 */

import { CheckCircle } from 'lucide-react'
import type { LinkedPayment } from './types'

interface PaymentHistoryProps {
  payments: LinkedPayment[]
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-[#78716C] uppercase tracking-wide">
        Pagos recibidos
      </p>
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="flex items-center justify-between p-3 bg-[#E8F5EE] rounded-sm"
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-[#4CAF7A]" />
            <div>
              <p className="text-sm font-medium text-[#44403C]">
                {formatCurrency(payment.amount)}
              </p>
              <p className="text-[10px] text-[#78716C]">
                {payment.method} · {formatDate(payment.date)}
              </p>
            </div>
          </div>
          <span className="font-mono text-[10px] text-[#A8A29E]">
            {payment.id}
          </span>
        </div>
      ))}
    </div>
  )
}
