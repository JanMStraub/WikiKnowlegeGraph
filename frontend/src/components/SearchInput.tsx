/**
 * Search input with autocomplete
 */

import { useRef, useState, useEffect } from 'react'
import { useSearch } from '../hooks/useSearch'
import type { AutocompleteResult } from '../types'
import './SearchInput.css'

interface SearchInputProps {
  placeholder?: string
  onSelect: (result: AutocompleteResult) => void
}

export default function SearchInput({ placeholder, onSelect }: SearchInputProps) {
  const { query, setQuery, results, isSearching } = useSearch()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLUListElement>(null)

  const handleSelect = (result: AutocompleteResult) => {
    onSelect(result)
    setQuery(result.label)
    setIsOpen(false)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Escape') {
        setQuery('')
        setIsOpen(false)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % results.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
      case 'Tab':
        // Allow normal tab behavior but close dropdown
        setIsOpen(false)
        break
    }
  }

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (results.length > 0) {
      setIsOpen(true)
      setSelectedIndex(0)
    } else {
      setIsOpen(false)
    }
  }, [results])

  return (
    <div className="search-input-container">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="search-input"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls="autocomplete-listbox"
      />
      {isSearching && <span className="search-loading">...</span>}

      {isOpen && results.length > 0 && (
        <ul ref={dropdownRef} className="autocomplete-dropdown" id="autocomplete-listbox" role="listbox">
          {results.map((result, index) => (
            <li
              key={result.qid}
              onClick={() => handleSelect(result)}
              className={index === selectedIndex ? 'selected' : ''}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div className="result-label">{result.label}</div>
              {result.description && <div className="result-description">{result.description}</div>}
              <div className="result-qid">{result.qid}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
