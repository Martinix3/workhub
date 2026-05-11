import type {
  Task,
  TaskStatus,
  TaskPriority,
  Department,
  TaskAssignee,
  TaskDependency,
  Project,
  ProjectStatus,
  ProjectHealth,
} from '../../src/components/sections/tasks/types'
import type { User } from '../../src/components/shell/types'
import type { SavedFilter, FilterCriteria } from '../../src/api/services/saved-filters'
import type {
  Notification,
  NotificationType,
  NotificationPriority,
} from '../../src/api/types/notifications'

/**
 * Test Data Fixtures for E2E Tests
 * Provides reusable mock data for tasks, users, filters, notifications, and dependencies
 *
 * Usage:
 * import { mockUsers, mockTasks, createMockTask, generateTestNotifications } from '../fixtures/test-data.fixture'
 */

// =============================================================================
// Mock Users
// =============================================================================

export const mockUsers: Record<string, User> = {
  alice: {
    name: 'alice@workhub.test',
    email: 'alice@workhub.test',
    role: 'Sales Manager',
    roles: ['Sales Manager', 'Viewer'],
  },
  bob: {
    name: 'bob@workhub.test',
    email: 'bob@workhub.test',
    role: 'Operations Manager',
    roles: ['Operations Manager', 'Viewer'],
  },
  charlie: {
    name: 'charlie@workhub.test',
    email: 'charlie@workhub.test',
    role: 'Marketing Manager',
    roles: ['Marketing Manager', 'Viewer'],
  },
  diana: {
    name: 'diana@workhub.test',
    email: 'diana@workhub.test',
    role: 'Production Manager',
    roles: ['Production Manager', 'Viewer'],
  },
  admin: {
    name: 'admin@workhub.test',
    email: 'admin@workhub.test',
    role: 'System Manager',
    roles: ['System Manager'],
  },
} as const

export const mockUsersList = Object.values(mockUsers)

// =============================================================================
// Mock Task Assignees
// =============================================================================

export const mockAssignees: Record<string, TaskAssignee> = {
  alice_owner: {
    user: 'alice@workhub.test',
    role: 'Owner',
    user_name: 'Alice Cooper',
    user_email: 'alice@workhub.test',
  },
  bob_owner: {
    user: 'bob@workhub.test',
    role: 'Owner',
    user_name: 'Bob Smith',
    user_email: 'bob@workhub.test',
  },
  charlie_collaborator: {
    user: 'charlie@workhub.test',
    role: 'Collaborator',
    user_name: 'Charlie Brown',
    user_email: 'charlie@workhub.test',
  },
  diana_collaborator: {
    user: 'diana@workhub.test',
    role: 'Collaborator',
    user_name: 'Diana Prince',
    user_email: 'diana@workhub.test',
  },
} as const

// =============================================================================
// Mock Tasks
// =============================================================================

export const mockTasks: Record<string, Task> = {
  singleAssignee: {
    name: 'WHT-2024-00001',
    title: 'Single Assignee Task',
    description: 'Task with single owner',
    status: 'DOING',
    priority: 'P1',
    department: 'SALES',
    assignees: [mockAssignees.alice_owner],
    primary_owner: 'alice@workhub.test',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  multiAssignee: {
    name: 'WHT-2024-00002',
    title: 'Multi-Assignee Task',
    description: 'Task with multiple assignees',
    status: 'NEXT',
    priority: 'P0',
    department: 'OPS',
    assignees: [
      mockAssignees.bob_owner,
      mockAssignees.charlie_collaborator,
      mockAssignees.diana_collaborator,
    ],
    primary_owner: 'bob@workhub.test',
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  blocked: {
    name: 'WHT-2024-00003',
    title: 'Blocked Task',
    description: 'Task blocked by dependencies',
    status: 'BLOCKED',
    priority: 'P2',
    department: 'MKT',
    assignees: [mockAssignees.alice_owner],
    primary_owner: 'alice@workhub.test',
    blocked_reason: 'Waiting for design approval',
    blocked_by_count: 2,
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  blocker: {
    name: 'WHT-2024-00004',
    title: 'Blocker Task',
    description: 'Task that blocks others',
    status: 'DOING',
    priority: 'P0',
    department: 'OPS',
    assignees: [mockAssignees.bob_owner],
    primary_owner: 'bob@workhub.test',
    blocks_count: 2,
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  completed: {
    name: 'WHT-2024-00005',
    title: 'Completed Task',
    description: 'Successfully completed task',
    status: 'DONE',
    priority: 'P1',
    department: 'SALES',
    assignees: [mockAssignees.alice_owner, mockAssignees.charlie_collaborator],
    primary_owner: 'alice@workhub.test',
    completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completion_notes: 'All requirements met',
  },
  overdue: {
    name: 'WHT-2024-00006',
    title: 'Overdue Task',
    description: 'Past due date',
    status: 'DOING',
    priority: 'P0',
    department: 'OPS',
    assignees: [mockAssignees.bob_owner],
    primary_owner: 'bob@workhub.test',
    due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
} as const

export const mockTasksList = Object.values(mockTasks)

// =============================================================================
// Mock Projects
// =============================================================================

export const mockProjects: Record<string, Project> = {
  activeProject: {
    name: 'WHP-2024-00001',
    title: 'Active Sales Project',
    description: 'Ongoing sales initiative',
    department: 'SALES',
    owner_user: 'alice@workhub.test',
    owner_name: 'Alice Cooper',
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'ACTIVE',
    health: 'GREEN',
    progress_pct: 45,
    total_tasks: 20,
    completed_tasks: 9,
    blocked_tasks: 1,
    overdue_tasks: 0,
  },
  atRiskProject: {
    name: 'WHP-2024-00002',
    title: 'At-Risk Operations Project',
    description: 'Project with high risk factors',
    department: 'OPS',
    owner_user: 'bob@workhub.test',
    owner_name: 'Bob Smith',
    start_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    target_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'ACTIVE',
    health: 'RED',
    health_reason: 'Multiple blocked tasks and overdue items',
    progress_pct: 60,
    total_tasks: 30,
    completed_tasks: 18,
    blocked_tasks: 4,
    overdue_tasks: 5,
  },
} as const

export const mockProjectsList = Object.values(mockProjects)

// =============================================================================
// Mock Task Dependencies
// =============================================================================

export const mockDependencies: Record<string, TaskDependency> = {
  dep1: {
    name: 'WHTD-2024-00001',
    predecessor: 'WHT-2024-00004',
    predecessor_title: 'Blocker Task',
    successor: 'WHT-2024-00003',
    successor_title: 'Blocked Task',
    dependency_type: 'FS',
    lag_days: 0,
    is_critical: true,
    is_active: true,
  },
  dep2: {
    name: 'WHTD-2024-00002',
    predecessor: 'WHT-2024-00001',
    predecessor_title: 'Single Assignee Task',
    successor: 'WHT-2024-00002',
    successor_title: 'Multi-Assignee Task',
    dependency_type: 'FS',
    lag_days: 2,
    is_critical: false,
    is_active: true,
  },
} as const

export const mockDependenciesList = Object.values(mockDependencies)

// =============================================================================
// Mock Saved Filters
// =============================================================================

export const mockFilterCriteria: Record<string, FilterCriteria> = {
  myHighPriority: {
    priority: ['P0', 'P1'],
    assigned_to: '$current_user',
    status: 'DOING',
  },
  salesOverdue: {
    department: 'SALES',
    due_date_op: '<',
    due_date_value: '$today',
    status: ['DOING', 'NEXT', 'BLOCKED'],
  },
  blocked: {
    status: 'BLOCKED',
  },
  thisWeekDue: {
    due_date_op: 'in_range',
    due_date_value: '$this_week',
  },
} as const

export const mockSavedFilters: Record<string, SavedFilter> = {
  myHighPriority: {
    name: 'SF-2024-00001',
    title: 'My High Priority Tasks',
    entity_type: 'task',
    filter_json: mockFilterCriteria.myHighPriority,
    is_shared: false,
    is_preset: false,
    icon: '🔥',
    sort_order: 1,
    count: 5,
  },
  salesOverdue: {
    name: 'SF-2024-00002',
    title: 'Sales Overdue',
    entity_type: 'task',
    filter_json: mockFilterCriteria.salesOverdue,
    is_shared: true,
    is_preset: false,
    icon: '⚠️',
    sort_order: 2,
    count: 3,
  },
  blocked: {
    name: 'SF-2024-00003',
    title: 'Blocked Tasks',
    entity_type: 'task',
    filter_json: mockFilterCriteria.blocked,
    is_shared: false,
    is_preset: true,
    icon: '🚫',
    sort_order: 3,
    count: 7,
  },
} as const

export const mockSavedFiltersList = Object.values(mockSavedFilters)

// =============================================================================
// Mock Notifications
// =============================================================================

export const mockNotifications: Record<string, Notification> = {
  taskAssigned: {
    id: 'NTF-2024-00001',
    user: 'alice@workhub.test',
    type: 'TASK_ASSIGNED',
    priority: 'MEDIUM',
    title: 'New Task Assigned',
    message: 'You have been assigned to "Multi-Assignee Task"',
    read: false,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    reference_doctype: 'WH Task',
    reference_name: 'WHT-2024-00002',
    action_url: '/tasks/WHT-2024-00002',
  },
  blocked: {
    id: 'NTF-2024-00002',
    user: 'alice@workhub.test',
    type: 'BLOCKED',
    priority: 'HIGH',
    title: 'Task Blocked',
    message: 'Your task "Single Assignee Task" is blocked by dependencies',
    read: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reference_doctype: 'WH Task',
    reference_name: 'WHT-2024-00001',
    action_url: '/tasks/WHT-2024-00001',
  },
  overdue: {
    id: 'NTF-2024-00003',
    user: 'bob@workhub.test',
    type: 'OVERDUE',
    priority: 'HIGH',
    title: 'Task Overdue',
    message: 'Task "Overdue Task" is past its due date',
    read: false,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    reference_doctype: 'WH Task',
    reference_name: 'WHT-2024-00006',
    action_url: '/tasks/WHT-2024-00006',
  },
  dependency: {
    id: 'NTF-2024-00004',
    user: 'alice@workhub.test',
    type: 'DEPENDENCY',
    priority: 'MEDIUM',
    title: 'Dependency Added',
    message: 'A new dependency was added to your task',
    read: true,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    reference_doctype: 'WH Task',
    reference_name: 'WHT-2024-00003',
    action_url: '/tasks/WHT-2024-00003',
  },
  projectRisk: {
    id: 'NTF-2024-00005',
    user: 'bob@workhub.test',
    type: 'PROJECT_RISK',
    priority: 'HIGH',
    title: 'Project at Risk',
    message: 'Project "At-Risk Operations Project" health status changed to RED',
    read: false,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    reference_doctype: 'WH Project',
    reference_name: 'WHP-2024-00002',
    action_url: '/projects/WHP-2024-00002',
  },
  mention: {
    id: 'NTF-2024-00006',
    user: 'charlie@workhub.test',
    type: 'MENTION',
    priority: 'LOW',
    title: 'You were mentioned',
    message: 'Alice mentioned you in a comment',
    read: true,
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    reference_doctype: 'WH Task',
    reference_name: 'WHT-2024-00002',
    action_url: '/tasks/WHT-2024-00002#comment-123',
  },
  completed: {
    id: 'NTF-2024-00007',
    user: 'alice@workhub.test',
    type: 'COMPLETED',
    priority: 'LOW',
    title: 'Task Completed',
    message: 'Bob completed the task "Blocker Task"',
    read: true,
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    reference_doctype: 'WH Task',
    reference_name: 'WHT-2024-00004',
    action_url: '/tasks/WHT-2024-00004',
  },
} as const

export const mockNotificationsList = Object.values(mockNotifications)

// =============================================================================
// Helper Functions - Dynamic Test Data Generation
// =============================================================================

/**
 * Create a mock task with custom properties
 */
export function createMockTask(overrides: Partial<Task> = {}): Task {
  const id = Math.random().toString(36).substring(7)
  return {
    name: `WHT-TEST-${id}`,
    title: `Test Task ${id}`,
    description: `Test task created for E2E testing`,
    status: 'BACKLOG',
    priority: 'P2',
    department: 'SALES',
    assignees: [mockAssignees.alice_owner],
    primary_owner: 'alice@workhub.test',
    ...overrides,
  }
}

/**
 * Create a mock project with custom properties
 */
export function createMockProject(overrides: Partial<Project> = {}): Project {
  const id = Math.random().toString(36).substring(7)
  return {
    name: `WHP-TEST-${id}`,
    title: `Test Project ${id}`,
    description: `Test project created for E2E testing`,
    department: 'SALES',
    owner_user: 'alice@workhub.test',
    start_date: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    health: 'GREEN',
    ...overrides,
  }
}

/**
 * Create a mock notification with custom properties
 */
export function createMockNotification(overrides: Partial<Notification> = {}): Notification {
  const id = Math.random().toString(36).substring(7)
  return {
    id: `NTF-TEST-${id}`,
    user: 'alice@workhub.test',
    type: 'TASK_ASSIGNED',
    priority: 'MEDIUM',
    title: `Test Notification ${id}`,
    message: `Test notification message`,
    read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create a mock saved filter with custom properties
 */
export function createMockSavedFilter(overrides: Partial<SavedFilter> = {}): SavedFilter {
  const id = Math.random().toString(36).substring(7)
  return {
    name: `SF-TEST-${id}`,
    title: `Test Filter ${id}`,
    entity_type: 'task',
    filter_json: { status: 'DOING' },
    is_shared: false,
    is_preset: false,
    ...overrides,
  }
}

/**
 * Generate multiple test tasks with varying properties
 */
export function generateTestTasks(count: number, baseOverrides: Partial<Task> = {}): Task[] {
  return Array.from({ length: count }, (_, i) =>
    createMockTask({
      title: `Test Task ${i + 1}`,
      ...baseOverrides,
    })
  )
}

/**
 * Generate multiple test notifications grouped by type
 */
export function generateTestNotifications(
  counts: Partial<Record<NotificationType, number>> = {}
): Notification[] {
  const notifications: Notification[] = []
  const types: NotificationType[] = [
    'TASK_ASSIGNED',
    'BLOCKED',
    'OVERDUE',
    'DEPENDENCY',
    'PROJECT_RISK',
    'MENTION',
    'COMPLETED',
  ]

  types.forEach((type) => {
    const count = counts[type] ?? 0
    for (let i = 0; i < count; i++) {
      notifications.push(
        createMockNotification({
          type,
          title: `${type} Notification ${i + 1}`,
          created_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
        })
      )
    }
  })

  return notifications
}

/**
 * Create a task with many assignees for overflow testing
 */
export function createTaskWithManyAssignees(count: number): Task {
  const assignees: TaskAssignee[] = Array.from({ length: count }, (_, i) => ({
    user: `user${i + 1}@workhub.test`,
    role: i === 0 ? 'Owner' : 'Collaborator',
    user_name: `User ${i + 1}`,
    user_email: `user${i + 1}@workhub.test`,
  }))

  return createMockTask({
    title: `Task with ${count} Assignees`,
    assignees,
    primary_owner: assignees[0].user,
  })
}

/**
 * Create a dependency chain for testing
 */
export function createDependencyChain(taskCount: number): {
  tasks: Task[]
  dependencies: TaskDependency[]
} {
  const tasks = generateTestTasks(taskCount)
  const dependencies: TaskDependency[] = []

  for (let i = 0; i < taskCount - 1; i++) {
    dependencies.push({
      name: `WHTD-TEST-${i}`,
      predecessor: tasks[i].name,
      predecessor_title: tasks[i].title,
      successor: tasks[i + 1].name,
      successor_title: tasks[i + 1].title,
      dependency_type: 'FS',
      lag_days: 0,
      is_critical: false,
      is_active: true,
    })
  }

  return { tasks, dependencies }
}

/**
 * Get task statuses for filtering tests
 */
export function getAllTaskStatuses(): TaskStatus[] {
  return ['BACKLOG', 'NEXT', 'DOING', 'BLOCKED', 'DONE']
}

/**
 * Get task priorities for filtering tests
 */
export function getAllTaskPriorities(): TaskPriority[] {
  return ['P0', 'P1', 'P2']
}

/**
 * Get departments for filtering tests
 */
export function getAllDepartments(): Department[] {
  return ['SALES', 'OPS', 'MKT', 'PRODUCTION']
}

/**
 * Get all notification types for digest testing
 */
export function getAllNotificationTypes(): NotificationType[] {
  return ['TASK_ASSIGNED', 'BLOCKED', 'OVERDUE', 'DEPENDENCY', 'PROJECT_RISK', 'MENTION', 'COMPLETED']
}

/**
 * Get notification priorities for filtering
 */
export function getAllNotificationPriorities(): NotificationPriority[] {
  return ['LOW', 'MEDIUM', 'HIGH']
}
