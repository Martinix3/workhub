// AssigneeAvatarGroup - Stacked avatars for multiple assignees (GitHub-style)
import { User, Crown } from 'lucide-react'
import type { TaskAssignee } from '../sections/tasks/types'

interface AssigneeAvatarGroupProps {
  assignees: TaskAssignee[]
  maxVisible?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeConfig = {
  sm: {
    avatar: 'w-6 h-6',
    icon: 14,
    badge: 'w-3 h-3',
    badgeIcon: 8,
    overflow: 'text-[10px]',
  },
  md: {
    avatar: 'w-8 h-8',
    icon: 16,
    badge: 'w-4 h-4',
    badgeIcon: 10,
    overflow: 'text-xs',
  },
  lg: {
    avatar: 'w-10 h-10',
    icon: 20,
    badge: 'w-5 h-5',
    badgeIcon: 12,
    overflow: 'text-sm',
  },
}

export function AssigneeAvatarGroup({
  assignees,
  maxVisible = 3,
  size = 'sm',
  className = '',
}: AssigneeAvatarGroupProps) {
  if (assignees.length === 0) {
    return null
  }

  const config = sizeConfig[size]
  const visibleAssignees = assignees.slice(0, maxVisible)
  const remainingCount = Math.max(0, assignees.length - maxVisible)
  const owner = assignees.find(a => a.role === 'Owner')

  return (
    <div data-testid="assignee-group" className={`relative inline-flex items-center ${className}`}>
      {/* Stacked avatars */}
      <div className="flex -space-x-2">
        {visibleAssignees.map((assignee, index) => {
          const isOwner = assignee.role === 'Owner'
          const displayName = assignee.user_name || assignee.user_email || assignee.user

          return (
            <div
              key={assignee.user}
              data-testid={`assignee-avatar-${index}`}
              className="group relative"
              style={{ zIndex: visibleAssignees.length - index }}
            >
              {/* Avatar */}
              <div
                data-testid={`avatar-${assignee.user}`}
                className={`
                  ${config.avatar}
                  bg-white border-2 border-stone-400
                  flex items-center justify-center
                  relative
                  transition-transform hover:scale-110 hover:z-50
                `}
              >
                <User size={config.icon} className="text-stone-500" />

                {/* Owner badge */}
                {isOwner && (
                  <div
                    data-testid={`owner-badge-${index}`}
                    className={`
                      absolute -top-1 -right-1
                      ${config.badge}
                      bg-amber-400 border border-stone-900
                      flex items-center justify-center
                    `}
                  >
                    <Crown size={config.badgeIcon} className="text-stone-900" />
                  </div>
                )}
              </div>

              {/* Tooltip */}
              <div
                className="
                  absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  px-2 py-1
                  bg-stone-900 text-white text-xs
                  whitespace-nowrap
                  opacity-0 pointer-events-none
                  group-hover:opacity-100
                  transition-opacity
                  z-50
                "
              >
                {displayName}
                {isOwner && (
                  <span className="ml-1 text-amber-400 font-medium">(Owner)</span>
                )}
                {/* Tooltip arrow */}
                <div
                  className="
                    absolute top-full left-1/2 -translate-x-1/2
                    w-0 h-0
                    border-l-4 border-l-transparent
                    border-r-4 border-r-transparent
                    border-t-4 border-t-stone-900
                  "
                />
              </div>
            </div>
          )
        })}

        {/* Overflow indicator */}
        {remainingCount > 0 && (
          <div data-testid="assignee-overflow" className="group relative" style={{ zIndex: 0 }}>
            <div
              className={`
                ${config.avatar}
                bg-stone-200 border-2 border-stone-400
                flex items-center justify-center
                transition-transform hover:scale-110 hover:z-50
              `}
            >
              <span className={`${config.overflow} font-medium text-stone-600`}>
                +{remainingCount}
              </span>
            </div>

            {/* Tooltip showing all remaining assignees */}
            <div
              className="
                absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                px-2 py-1
                bg-stone-900 text-white text-xs
                opacity-0 pointer-events-none
                group-hover:opacity-100
                transition-opacity
                z-50
                max-w-[200px]
              "
            >
              <div className="whitespace-normal">
                {assignees.slice(maxVisible).map((assignee, index) => {
                  const displayName = assignee.user_name || assignee.user_email || assignee.user
                  const isOwner = assignee.role === 'Owner'
                  return (
                    <div key={assignee.user} className={index > 0 ? 'mt-1' : ''}>
                      {displayName}
                      {isOwner && (
                        <span className="ml-1 text-amber-400 font-medium">(Owner)</span>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Tooltip arrow */}
              <div
                className="
                  absolute top-full left-1/2 -translate-x-1/2
                  w-0 h-0
                  border-l-4 border-l-transparent
                  border-r-4 border-r-transparent
                  border-t-4 border-t-stone-900
                "
              />
            </div>
          </div>
        )}
      </div>

      {/* Full list tooltip on hover over entire group */}
      {assignees.length > 1 && (
        <div
          className="
            absolute bottom-full left-0 mb-2
            px-3 py-2
            bg-stone-900 text-white text-xs
            opacity-0 pointer-events-none
            hover:opacity-100
            transition-opacity
            z-40
            max-w-[250px]
            hidden group-hover:block
          "
        >
          <div className="font-medium mb-1 text-amber-400">
            {assignees.length} Assignee{assignees.length !== 1 ? 's' : ''}
          </div>
          {owner && (
            <div className="mb-2 pb-2 border-b border-stone-700">
              <div className="flex items-center gap-1">
                <Crown size={10} className="text-amber-400" />
                <span className="font-medium">Owner:</span>
              </div>
              <div className="ml-4 mt-0.5">
                {owner.user_name || owner.user_email || owner.user}
              </div>
            </div>
          )}
          {assignees.filter(a => a.role === 'Collaborator').length > 0 && (
            <div>
              <div className="font-medium mb-1">Collaborators:</div>
              {assignees
                .filter(a => a.role === 'Collaborator')
                .map((assignee, index) => (
                  <div key={assignee.user} className={`ml-4 ${index > 0 ? 'mt-0.5' : ''}`}>
                    {assignee.user_name || assignee.user_email || assignee.user}
                  </div>
                ))}
            </div>
          )}
          {/* Tooltip arrow */}
          <div
            className="
              absolute top-full left-4
              w-0 h-0
              border-l-4 border-l-transparent
              border-r-4 border-r-transparent
              border-t-4 border-t-stone-900
            "
          />
        </div>
      )}
    </div>
  )
}

export default AssigneeAvatarGroup
