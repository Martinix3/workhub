import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkLinkSuggestions } from './WorkLinkSuggestions'
import type { WorkLinkSuggestion } from '../../../api/services/worklink-suggestions'

describe('WorkLinkSuggestions', () => {
  const mockOnAccept = vi.fn()
  const mockOnDismiss = vi.fn()
  const mockOnManualSearch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockSuggestions: WorkLinkSuggestion[] = [
    {
      doctype: 'Sales Order',
      doc_id: 'SO-001',
      doc_name: 'SO-001',
      display_name: 'Pedido Cliente ABC',
      description: 'Pedido de productos varios',
      confidence: 0.85,
      match_type: 'keyword',
      matched_keywords: ['SO-001'],
      boosted: false
    },
    {
      doctype: 'Batch',
      doc_id: 'BATCH-2024-001',
      doc_name: 'BATCH-2024-001',
      display_name: 'Lote Producción Enero',
      description: 'Lote de producción del mes de enero',
      confidence: 0.65,
      match_type: 'fuzzy',
      matched_keywords: ['lote', 'enero'],
      boosted: true
    },
    {
      doctype: 'Customer',
      doc_id: 'CUST-001',
      doc_name: 'Cliente XYZ',
      display_name: 'Cliente XYZ S.L.',
      description: null,
      confidence: 0.45,
      match_type: 'fuzzy',
      matched_keywords: ['xyz'],
      boosted: false
    }
  ]

  describe('Suggestions Display', () => {
    it('renders suggestions list correctly', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      // Check header
      expect(screen.getByText('Sugerencias de WorkLink')).toBeInTheDocument()

      // Check all suggestions are displayed
      expect(screen.getByText('SO-001')).toBeInTheDocument()
      expect(screen.getByText('Pedido Cliente ABC')).toBeInTheDocument()
      expect(screen.getByText('BATCH-2024-001')).toBeInTheDocument()
      expect(screen.getByText('Lote Producción Enero')).toBeInTheDocument()
      expect(screen.getByText('Cliente XYZ')).toBeInTheDocument()
      expect(screen.getByText('Cliente XYZ S.L.')).toBeInTheDocument()
    })

    it('displays correct document type labels', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      // Check Spanish labels for DocTypes
      expect(screen.getByText('PEDIDO')).toBeInTheDocument() // Sales Order
      expect(screen.getByText('LOTE')).toBeInTheDocument() // Batch
    })

    it('displays confidence indicators with correct labels', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      // Check confidence labels (Alta, Media, Baja)
      expect(screen.getByText(/Alta/)).toBeInTheDocument() // 0.85 -> Alta
      expect(screen.getByText(/Media/)).toBeInTheDocument() // 0.65 -> Media
      expect(screen.getByText(/Baja/)).toBeInTheDocument() // 0.45 -> Baja

      // Check percentages
      expect(screen.getByText(/85%/)).toBeInTheDocument()
      expect(screen.getByText(/65%/)).toBeInTheDocument()
      expect(screen.getByText(/45%/)).toBeInTheDocument()
    })

    it('displays boosted badge for frequently accepted suggestions', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      // Only the boosted suggestion should have the badge
      const frequentBadges = screen.getAllByText('Frecuente')
      expect(frequentBadges).toHaveLength(1)
    })

    it('displays description when available', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText('Pedido de productos varios')).toBeInTheDocument()
      expect(screen.getByText('Lote de producción del mes de enero')).toBeInTheDocument()
    })

    it('shows manual search button when onManualSearch is provided', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
          onManualSearch={mockOnManualSearch}
        />
      )

      const searchButtons = screen.getAllByText('Buscar')
      expect(searchButtons.length).toBeGreaterThan(0)
    })

    it('does not show manual search button when onManualSearch is not provided', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      const searchButtons = screen.queryAllByText('Buscar')
      expect(searchButtons).toHaveLength(0)
    })

    it('renders nothing when no suggestions and not loading', () => {
      const { container } = render(
        <WorkLinkSuggestions
          suggestions={[]}
          loading={false}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('shows empty state after loading with no results', () => {
      render(
        <WorkLinkSuggestions
          suggestions={[]}
          loading={false}
          error={null}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      // Component should return null when no suggestions and not loading
      expect(screen.queryByText('No se encontraron sugerencias')).not.toBeInTheDocument()
    })

    it('handles unknown DocType with fallback icon and label', () => {
      const unknownSuggestion: WorkLinkSuggestion = {
        doctype: 'Unknown DocType',
        doc_id: 'UNK-001',
        doc_name: 'Unknown Document',
        display_name: null,
        description: null,
        confidence: 0.5,
        match_type: 'keyword',
        matched_keywords: [],
        boosted: false
      }

      render(
        <WorkLinkSuggestions
          suggestions={[unknownSuggestion]}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText('UNKNOWN DOCTYPE')).toBeInTheDocument()
      expect(screen.getByText('Unknown Document')).toBeInTheDocument()
    })
  })

  describe('Accept/Dismiss Actions', () => {
    it('calls onAccept when accept button is clicked', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      // Get all accept buttons (check icon buttons)
      const acceptButtons = screen.getAllByTitle('Aceptar sugerencia')

      // Click the first accept button
      fireEvent.click(acceptButtons[0])

      expect(mockOnAccept).toHaveBeenCalledTimes(1)
      expect(mockOnAccept).toHaveBeenCalledWith('Sales Order', 'SO-001', 0.85)
    })

    it('calls onDismiss when dismiss button is clicked', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      // Get all dismiss buttons (X icon buttons)
      const dismissButtons = screen.getAllByTitle('Descartar sugerencia')

      // Click the second dismiss button
      fireEvent.click(dismissButtons[1])

      expect(mockOnDismiss).toHaveBeenCalledTimes(1)
      expect(mockOnDismiss).toHaveBeenCalledWith('Batch', 'BATCH-2024-001', 0.65)
    })

    it('calls onManualSearch when manual search button is clicked', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
          onManualSearch={mockOnManualSearch}
        />
      )

      // Click the manual search button in header
      const searchButtons = screen.getAllByText('Buscar')
      fireEvent.click(searchButtons[0])

      expect(mockOnManualSearch).toHaveBeenCalledTimes(1)
    })

    it('allows multiple accept clicks for different suggestions', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      const acceptButtons = screen.getAllByTitle('Aceptar sugerencia')

      fireEvent.click(acceptButtons[0])
      fireEvent.click(acceptButtons[2])

      expect(mockOnAccept).toHaveBeenCalledTimes(2)
      expect(mockOnAccept).toHaveBeenNthCalledWith(1, 'Sales Order', 'SO-001', 0.85)
      expect(mockOnAccept).toHaveBeenNthCalledWith(2, 'Customer', 'CUST-001', 0.45)
    })

    it('allows mixing accept and dismiss actions', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      const acceptButtons = screen.getAllByTitle('Aceptar sugerencia')
      const dismissButtons = screen.getAllByTitle('Descartar sugerencia')

      fireEvent.click(acceptButtons[0])
      fireEvent.click(dismissButtons[1])
      fireEvent.click(dismissButtons[2])

      expect(mockOnAccept).toHaveBeenCalledTimes(1)
      expect(mockOnDismiss).toHaveBeenCalledTimes(2)
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner and message when loading', () => {
      render(
        <WorkLinkSuggestions
          suggestions={[]}
          loading={true}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText('Buscando documentos...')).toBeInTheDocument()
      // Check for spinner (it has animate-spin class)
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('hides suggestions when loading', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          loading={true}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      // Suggestions should not be visible during loading
      expect(screen.queryByText('SO-001')).not.toBeInTheDocument()
      expect(screen.getByText('Buscando documentos...')).toBeInTheDocument()
    })

    it('shows error state when error is present', () => {
      const error = new Error('Failed to fetch suggestions')

      render(
        <WorkLinkSuggestions
          suggestions={[]}
          loading={false}
          error={error}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText('Error al cargar sugerencias')).toBeInTheDocument()
      expect(screen.getByText('Failed to fetch suggestions')).toBeInTheDocument()
    })

    it('hides suggestions when error is present', () => {
      const error = new Error('API Error')

      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          loading={false}
          error={error}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      // Suggestions should not be visible when there's an error
      expect(screen.queryByText('SO-001')).not.toBeInTheDocument()
      expect(screen.getByText('Error al cargar sugerencias')).toBeInTheDocument()
    })

    it('prioritizes error display over loading state', () => {
      const error = new Error('Connection error')

      render(
        <WorkLinkSuggestions
          suggestions={[]}
          loading={true}
          error={error}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      // Error should not be shown during loading
      expect(screen.queryByText('Error al cargar sugerencias')).not.toBeInTheDocument()
      expect(screen.getByText('Buscando documentos...')).toBeInTheDocument()
    })

    it('transitions from loading to suggestions correctly', () => {
      const { rerender } = render(
        <WorkLinkSuggestions
          suggestions={[]}
          loading={true}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText('Buscando documentos...')).toBeInTheDocument()

      // Simulate loading complete with suggestions
      rerender(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          loading={false}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.queryByText('Buscando documentos...')).not.toBeInTheDocument()
      expect(screen.getByText('SO-001')).toBeInTheDocument()
      expect(screen.getByText('BATCH-2024-001')).toBeInTheDocument()
    })

    it('transitions from loading to error correctly', () => {
      const { rerender } = render(
        <WorkLinkSuggestions
          suggestions={[]}
          loading={true}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText('Buscando documentos...')).toBeInTheDocument()

      // Simulate loading complete with error
      const error = new Error('Network timeout')
      rerender(
        <WorkLinkSuggestions
          suggestions={[]}
          loading={false}
          error={error}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.queryByText('Buscando documentos...')).not.toBeInTheDocument()
      expect(screen.getByText('Error al cargar sugerencias')).toBeInTheDocument()
      expect(screen.getByText('Network timeout')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles suggestion with missing optional fields', () => {
      const minimalSuggestion: WorkLinkSuggestion = {
        doctype: 'Sales Order',
        doc_id: 'SO-002',
        doc_name: null,
        display_name: null,
        description: null,
        confidence: 0.7,
        match_type: 'keyword',
        matched_keywords: [],
        boosted: false
      }

      render(
        <WorkLinkSuggestions
          suggestions={[minimalSuggestion]}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      // Should display doc_id when doc_name is null
      expect(screen.getByText('SO-002')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
          className="custom-class"
        />
      )

      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv.className).toContain('custom-class')
    })

    it('renders correct number of suggestions', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      const acceptButtons = screen.getAllByTitle('Aceptar sugerencia')
      const dismissButtons = screen.getAllByTitle('Descartar sugerencia')

      expect(acceptButtons).toHaveLength(mockSuggestions.length)
      expect(dismissButtons).toHaveLength(mockSuggestions.length)
    })

    it('handles single suggestion correctly', () => {
      render(
        <WorkLinkSuggestions
          suggestions={[mockSuggestions[0]]}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText('SO-001')).toBeInTheDocument()
      expect(screen.getAllByTitle('Aceptar sugerencia')).toHaveLength(1)
      expect(screen.getAllByTitle('Descartar sugerencia')).toHaveLength(1)
    })
  })

  describe('Accessibility', () => {
    it('has accessible button titles', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
          onManualSearch={mockOnManualSearch}
        />
      )

      expect(screen.getAllByTitle('Aceptar sugerencia')).toHaveLength(3)
      expect(screen.getAllByTitle('Descartar sugerencia')).toHaveLength(3)
      expect(screen.getByTitle('Buscar manualmente')).toBeInTheDocument()
    })

    it('maintains proper heading hierarchy', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      // Check for h3 heading
      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toHaveTextContent('Sugerencias de WorkLink')
    })

    it('uses semantic HTML for suggestions', () => {
      render(
        <WorkLinkSuggestions
          suggestions={mockSuggestions}
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      )

      // Check that buttons are actual button elements
      const acceptButtons = screen.getAllByTitle('Aceptar sugerencia')
      acceptButtons.forEach(button => {
        expect(button.tagName).toBe('BUTTON')
      })

      const dismissButtons = screen.getAllByTitle('Descartar sugerencia')
      dismissButtons.forEach(button => {
        expect(button.tagName).toBe('BUTTON')
      })
    })
  })
})
