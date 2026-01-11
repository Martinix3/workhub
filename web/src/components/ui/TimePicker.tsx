// TimePicker - A mobile-friendly 24-hour time picker component
import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface TimePickerProps {
  value: string // HH:MM:SS format
  onChange: (value: string) => void
  label?: string
  className?: string
}

export function TimePicker({ value, onChange, label, className = '' }: TimePickerProps) {
  // Parse the HH:MM:SS value into hours and minutes
  const [hours, setHours] = useState('00')
  const [minutes, setMinutes] = useState('00')

  useEffect(() => {
    const parts = value.split(':')
    if (parts.length >= 2) {
      setHours(parts[0].padStart(2, '0'))
      setMinutes(parts[1].padStart(2, '0'))
    }
  }, [value])

  const handleHoursChange = (newHours: string) => {
    setHours(newHours)
    onChange(`${newHours}:${minutes}:00`)
  }

  const handleMinutesChange = (newMinutes: string) => {
    setMinutes(newMinutes)
    onChange(`${hours}:${newMinutes}:00`)
  }

  // Generate options for hours (00-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0')
  )

  // Generate options for minutes in 15-minute increments
  const minuteOptions = ['00', '15', '30', '45']

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-stone-700 mb-2">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 flex-1">
          <Clock size={16} className="text-stone-400 flex-shrink-0" />
          <select
            value={hours}
            onChange={(e) => handleHoursChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none bg-white text-center font-mono"
            aria-label="Horas"
          >
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <span className="text-stone-500 font-medium">:</span>
          <select
            value={minutes}
            onChange={(e) => handleMinutesChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none bg-white text-center font-mono"
            aria-label="Minutos"
          >
            {minuteOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
