'use client'

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import { ChevronDown } from 'lucide-react'

interface CustomDropdownProps {
  options: string[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  icon?: React.ReactNode
  className?: string
}

function CustomDropdownComponent({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  icon,
  className = '',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputValue, setInputValue] = useState(value || '')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemsPerView = 5

  // Update input value when external value changes
  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Focus input when dropdown opens
      setTimeout(() => inputRef.current?.focus(), 0)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Filter options based on search query (memoized)
  const filteredOptions = useMemo(() => {
    return options.filter((option) =>
      option.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [options, searchQuery])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setSearchQuery(newValue)
    setIsOpen(true)
    
    // If user types a value that matches an option exactly, select it
    if (options.includes(newValue)) {
      onChange(newValue)
    } else if (newValue === '') {
      onChange(null)
    } else {
      // Allow free text input - user can type any value
      onChange(newValue)
    }
  }, [options, onChange])

  const handleSelect = useCallback((option: string) => {
    onChange(option === '' ? null : option)
    setInputValue(option === '' ? '' : option)
    setSearchQuery('')
    setIsOpen(false)
  }, [onChange])

  const handleInputFocus = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleInputBlur = useCallback(() => {
    // Delay closing to allow option click
    setTimeout(() => {
      setIsOpen(false)
      setSearchQuery('')
    }, 200)
  }, [])

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
            {icon}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${
            isOpen ? 'border-purple-500/50' : ''
          }`}
        />
        <ChevronDown
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40 transition-transform pointer-events-none ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-white/10 rounded-lg shadow-xl overflow-hidden">
          <div
            className="overflow-y-auto custom-dropdown-scroll"
            style={{
              maxHeight: `${itemsPerView * 2.5}rem`, // Approximately 5 items
            }}
          >
            {searchQuery && !options.includes(searchQuery) && (
              <button
                type="button"
                onClick={() => handleSelect(searchQuery)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors text-purple-400 bg-purple-500/10"
              >
                Use "{searchQuery}"
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${
                !value ? 'bg-purple-500/20 text-purple-400' : 'text-white/80'
              }`}
            >
              {placeholder}
            </button>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${
                    value === option ? 'bg-purple-500/20 text-purple-400' : 'text-white/80'
                  }`}
                >
                  {option}
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-white/60">
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export const CustomDropdown = memo(CustomDropdownComponent)
