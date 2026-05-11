import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { KanbanPage } from './KanbanPage'
import type { KanbanColumn, Task } from '../../components/sections/tasks/types'

const nextTask: Task = {
  name: 'WHT-002',
  title: 'Responder correo duty-free',
  status: 'NEXT',
  priority: 'P0',
  department: 'SALES',
  due_date: '2026-05-10',
  assignees: [],
}

const columns: KanbanColumn[] = [
  { status: 'BACKLOG', label: 'Backlog', tasks: [] },
  { status: 'NEXT', label: 'Next', tasks: [nextTask] },
  { status: 'DOING', label: 'En curso', tasks: [] },
  { status: 'BLOCKED', label: 'Bloqueado', tasks: [] },
  { status: 'DONE', label: 'Completado', tasks: [] },
]

vi.mock('../../api', () => ({
  useKanban: () => ({
    data: columns,
    loading: false,
    error: null,
    refetch: vi.fn(),
    moveTask: vi.fn(),
  }),
  useTaskMutations: () => ({ quickAdd: vi.fn() }),
}))

describe('Kanban task organization UX', () => {
  it('labels board KPIs and uses explicit selection-mode copy', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/tareas/kanban']}>
        <KanbanPage />
      </MemoryRouter>
    )

    expect(screen.getByText('pendiente')).toBeInTheDocument()
    expect(screen.getByText('urgente')).toBeInTheDocument()
    expect(screen.getByText('total')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /seleccionar tareas/i }))

    expect(screen.getByText(/Modo selección activo/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salir de selección/i })).toBeInTheDocument()
  })
})
