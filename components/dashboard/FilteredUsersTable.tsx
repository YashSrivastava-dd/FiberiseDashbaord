'use client'

import { useMemo, useState, useEffect, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { User, Phone, MapPin, ArrowRight } from 'lucide-react'

interface FilteredUsersTableProps {
  users: any[]
  selectedState: string | null
  selectedCity: string | null
  searchQuery?: string
  sortBy?: 'name' | 'state' | 'city'
  sortOrder?: 'asc' | 'desc'
  highlightedUserId?: string | null
  onRowClick?: (userId: string) => void
}

function FilteredUsersTableComponent({
  users,
  selectedState,
  selectedCity,
  searchQuery = '',
  sortBy = 'name',
  sortOrder = 'asc',
  highlightedUserId,
  onRowClick,
}: FilteredUsersTableProps) {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = users.filter((user) => {
      const userState = user.resolvedState || user.state
      const userCity = user.resolvedCity || user.city

      // Filter by state
      if (selectedState && userState !== selectedState) return false

      // Filter by city
      if (selectedCity && userCity !== selectedCity) return false

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = user.name?.toLowerCase().includes(query)
        const matchesEmail = user.email?.toLowerCase().includes(query)
        const matchesPhone = user.phone?.toLowerCase().includes(query)
        
        if (!matchesName && !matchesEmail && !matchesPhone) return false
      }

      return true
    })

    // Sort users
    result.sort((a, b) => {
      let aValue: string = ''
      let bValue: string = ''

      switch (sortBy) {
        case 'name':
          aValue = (a.name || '').toLowerCase()
          bValue = (b.name || '').toLowerCase()
          break
        case 'state':
          aValue = ((a.resolvedState || a.state || '') as string).toLowerCase()
          bValue = ((b.resolvedState || b.state || '') as string).toLowerCase()
          break
        case 'city':
          aValue = ((a.resolvedCity || a.city || '') as string).toLowerCase()
          bValue = ((b.resolvedCity || b.city || '') as string).toLowerCase()
          break
      }

      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue)
      } else {
        return bValue.localeCompare(aValue)
      }
    })

    return result
  }, [users, selectedState, selectedCity, searchQuery, sortBy, sortOrder])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedState, selectedCity, searchQuery, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredUsers.slice(start, start + itemsPerPage)
  }, [filteredUsers, currentPage])

  // Handle user click
  const handleUserClick = useCallback((userId: string) => {
    if (onRowClick) {
      onRowClick(userId)
    }
    router.push(`/user/${encodeURIComponent(userId)}`)
  }, [onRowClick, router])


  if (filteredUsers.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 border border-white/10 text-center">
        <p className="text-white/60 text-sm">
          {selectedState || selectedCity
            ? 'No users found matching the selected filters'
            : 'No users found'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-xl mb-1">Users</h3>
            <p className="text-white/60 text-sm">
              Showing {paginatedUsers.length} of {filteredUsers.length} users
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-6 text-white/60 text-sm font-medium">Name</th>
              <th className="text-left py-3 px-6 text-white/60 text-sm font-medium">Email</th>
              <th className="text-left py-3 px-6 text-white/60 text-sm font-medium">Phone</th>
              <th className="text-left py-3 px-6 text-white/60 text-sm font-medium">State</th>
              <th className="text-left py-3 px-6 text-white/60 text-sm font-medium">City</th>
              <th className="text-right py-3 px-6 text-white/60 text-sm font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((user) => {
              const isHighlighted = highlightedUserId === user.id

              return (
                <tr
                  id={`user-row-${user.id}`}
                  key={user.id}
                  className={`border-b border-white/5 transition-all cursor-pointer ${
                    isHighlighted
                      ? 'bg-purple-500/20 hover:bg-purple-500/30'
                      : 'hover:bg-white/5'
                  }`}
                  onClick={() => handleUserClick(user.id)}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.name || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-white/80 text-sm">{user.email || 'N/A'}</p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-white/80 text-sm">
                      <Phone className="w-4 h-4 text-white/40" />
                      {user.phone || 'N/A'}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-white/80 text-sm">
                      <MapPin className="w-4 h-4 text-white/40" />
                      {user.resolvedState || user.state || 'N/A'}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-white/80 text-sm">
                      {user.resolvedCity || user.city || 'N/A'}
                    </p>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUserClick(user.id)
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/80 hover:text-white text-xs font-medium transition-colors"
                    >
                      View Dashboard
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 border-t border-white/10 flex items-center justify-between">
          <p className="text-white/60 text-sm">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export const FilteredUsersTable = memo(FilteredUsersTableComponent)
