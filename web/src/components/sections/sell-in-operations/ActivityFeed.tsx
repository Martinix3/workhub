import type { Activity } from './types'
import { ShoppingCart, ArrowRight, Truck, UserPlus, CreditCard } from 'lucide-react'

interface ActivityFeedProps {
  activities: Activity[]
}

const activityIcons: Record<string, React.ReactNode> = {
  order_created: <ShoppingCart size={16} />,
  opportunity_moved: <ArrowRight size={16} />,
  delivery_completed: <Truck size={16} />,
  customer_created: <UserPlus size={16} />,
  payment_received: <CreditCard size={16} />,
}

const activityColors: Record<string, string> = {
  order_created: 'bg-gold-light text-gold-dark dark:bg-gold-dark dark:text-gold',
  opportunity_moved: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  delivery_completed: 'bg-success-light text-success-text dark:bg-success-dark dark:text-success',
  customer_created: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  payment_received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `hace ${days}d`
    if (hours > 0) return `hace ${hours}h`
    return 'ahora'
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100 p-4 lg:p-6">
      <h3 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
        Actividad Reciente
      </h3>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-700 last:border-0 last:pb-0"
          >
            {/* Icon */}
            <div className={`
              w-8 h-8 flex items-center justify-center flex-shrink-0
              ${activityColors[activity.type] || 'bg-neutral-100 text-neutral-600'}
            `}>
              {activityIcons[activity.type]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-2">
                {activity.description}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-neutral-400 font-mono">
                  {formatTime(activity.timestamp)}
                </span>
                <span className="text-xs text-neutral-400">•</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {activity.user}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
