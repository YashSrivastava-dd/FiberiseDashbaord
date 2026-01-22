'use client'

import { useUsers } from '@/hooks/useUsers'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { User, Phone, Calendar, ArrowRight } from 'lucide-react'

export function UsersTable() {
  const { users, loading, error } = useUsers()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredUsers = users.filter((user: any) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      user.name?.toLowerCase().includes(search) ||
      user.phone?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    )
  })

  const handleUserClick = (userId: string) => {
    router.push(`/user/${encodeURIComponent(userId)}`)
  }

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    if (date.toDate) {
      return date.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    if (date instanceof Date) {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    return String(date)
  }

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-white/10">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-48"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-red-500/50">
        <p className="text-red-400 text-sm">Error loading users: {error}</p>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-white/10">
        <p className="text-white/60 text-sm text-center py-8">No users found</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-semibold text-xl mb-1">All Users</h3>
          <p className="text-white/60 text-sm">{filteredUsers.length} of {users.length} users</p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:border-purple-500/50 w-64"
          />
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Name</th>
              <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Phone</th>
              <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Gender</th>
              <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Age</th>
              <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">BMI</th>
              <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Created</th>
              <th className="text-right py-3 px-4 text-white/60 text-sm font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user: any) => (
              <tr
                key={user.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => handleUserClick(user.id)}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.name || 'N/A'}</p>
                      {user.email && (
                        <p className="text-white/40 text-xs">{user.email}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <Phone className="w-4 h-4 text-white/40" />
                    {user.phone || 'N/A'}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    user.gender === 'MALE' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : user.gender === 'FEMALE'
                      ? 'bg-pink-500/20 text-pink-400'
                      : 'bg-white/10 text-white/60'
                  }`}>
                    {user.gender || 'N/A'}
                  </span>
                </td>
                <td className="py-4 px-4 text-white/80 text-sm">
                  {user.age ? `${user.age} years` : 'N/A'}
                </td>
                <td className="py-4 px-4">
                  <span className="text-white/80 text-sm font-medium">
                    {user.bmi ? parseFloat(user.bmi).toFixed(2) : 'N/A'}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2 text-white/60 text-xs">
                    <Calendar className="w-3 h-3" />
                    {formatDate(user.createdAt)}
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUserClick(user.id)
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/80 hover:text-white text-xs font-medium transition-colors"
                  >
                    View
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && searchTerm && (
        <div className="text-center py-8">
          <p className="text-white/60 text-sm">No users found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  )
}
