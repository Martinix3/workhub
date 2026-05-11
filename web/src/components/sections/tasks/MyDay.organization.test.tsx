import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyDay } from './MyDay'
import type { MyDayData, Task } from './types'

vi.mock('../../../api/hooks/useWorkLinkSuggestions', () => ({
  useWorkLinkSuggestions: () => ({ suggestions: [], loading: false, error: null }),
}))

vi.mock('../../../api/services/tasks', () => ({
  tasksApi: {
    quickAdd: vi.fn(async (title: string, priority: string) => ({ name: 'WHT-TEST', title, priority })),
  },
}))

vi.mock('../../../api/services/worklink-suggestions', () => ({
  default: {
    acceptSuggestion: vi.fn(),
  },
}))

const baseTask: Task = {
  name: 'WHT-001',
  title: 'Preparar propuesta para Catering El Laurel',
  status: 'NEXT',
  priority: 'P1',
  department: 'SALES',
  due_date: '2026-05-10',
  assignees: [],
}

const data: MyDayData = {
  today: [baseTask],
  overdue: [baseTask],
  upcoming: [],
  blocked: [],
  blocking: [],
  inbox: [],
  summary: {
    total_today: 1,
    overdue_count: 1,
    blocked_count: 0,
    completed_today: 0,
  },
}

describe('MyDay task organization UX', () => {
  it('renders overdue work as a compact operational alert with an explicit action', () => {
    render(<MyDay data={data} />)

    expect(screen.getByText('Tienes 1 tarea vencida')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ver vencidas/i })).toBeInTheDocument()
  })

  it('quick-add modal has a visible task-name label, human priority labels, disabled submit, and closes on Escape', async () => {
    const user = userEvent.setup()
    render(<MyDay data={data} />)

    await user.click(screen.getByRole('button', { name: /nueva tarea/i }))

    expect(screen.getByLabelText(/nombre de la tarea/i)).toBeInTheDocument()
    expect(screen.getByText('P0 Alta')).toBeInTheDocument()
    expect(screen.getByText('P1 Media')).toBeInTheDocument()
    expect(screen.getByText('P2 Baja')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^agregar$/i })).toBeDisabled()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('heading', { name: /nueva tarea/i })).not.toBeInTheDocument()
  })
})
