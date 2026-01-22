'use client'

import { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react'
import Map, { Marker, Popup } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { User, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserMapProps {
  users: any[]
  selectedState: string | null
  selectedCity: string | null
  onMarkerClick?: (userId: string) => void
  highlightedUserId?: string | null
}

// Default India view state
const DEFAULT_VIEW_STATE = {
  longitude: 77.2090, // Default to India center
  latitude: 28.6139,
  zoom: 5,
}

function UserMapComponent({
  users,
  selectedState,
  selectedCity,
  onMarkerClick,
  highlightedUserId,
}: UserMapProps) {
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [viewState, setViewState] = useState(DEFAULT_VIEW_STATE)
  const [zoomEnabled, setZoomEnabled] = useState(true)
  const mapRef = useRef<any>(null)

  // Helper to extract coordinates from user document (memoized)
  const getUserCoordinates = useCallback((user: any): { latitude: number; longitude: number } | null => {
    // Case 1: separate latitude / longitude fields
    if (typeof user.latitude === 'number' && typeof user.longitude === 'number') {
      return { latitude: user.latitude, longitude: user.longitude }
    }

    // Case 2: string field like "28.536761, 77.381319"
    if (typeof user.userLocation === 'string') {
      const parts = user.userLocation.split(',')
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim())
        const lng = parseFloat(parts[1].trim())
        if (!isNaN(lat) && !isNaN(lng)) {
          return { latitude: lat, longitude: lng }
        }
      }
    }

    return null
  }, [])

  // Filter users based on state, city, and coordinates (memoized)
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Check if user has valid coordinates (either lat/long or userLocation string)
      const coords = getUserCoordinates(user)
      if (!coords) return false

      const userState = user.resolvedState || user.state
      const userCity = user.resolvedCity || user.city

      // Filter by state
      if (selectedState && userState !== selectedState) return false

      // Filter by city
      if (selectedCity && userCity !== selectedCity) return false

      return true
    })
  }, [users, selectedState, selectedCity, getUserCoordinates])

  // Update map view when filters change
  useEffect(() => {
    if (filteredUsers.length > 0 && mapRef.current?.getMap) {
      const map = mapRef.current.getMap()
      if (map) {
        try {
          // Calculate bounds from filtered users
          const lngs: number[] = []
          const lats: number[] = []

          filteredUsers.forEach((u) => {
            const coords = getUserCoordinates(u)
            if (coords) {
              lngs.push(coords.longitude)
              lats.push(coords.latitude)
            }
          })

          if (lngs.length > 0 && lats.length > 0) {
            const minLng = Math.min(...lngs)
            const maxLng = Math.max(...lngs)
            const minLat = Math.min(...lats)
            const maxLat = Math.max(...lats)

            map.fitBounds(
              [
                [minLng, minLat],
                [maxLng, maxLat],
              ],
              {
                padding: { top: 50, bottom: 50, left: 50, right: 50 },
                duration: 1000,
              }
            )
          }
        } catch (err) {
          console.error('Error fitting bounds:', err)
        }
      }
    }
    // When there are no filtered users, keep the current viewState;
    // don't call setViewState here to avoid update loops.
  }, [filteredUsers])

  // Close popup when highlighted user changes externally
  useEffect(() => {
    if (highlightedUserId && highlightedUserId !== selectedUser?.id) {
      const user = filteredUsers.find((u) => u.id === highlightedUserId)
      if (user) {
        setSelectedUser(user)
      }
    }
  }, [highlightedUserId, filteredUsers])

  // Handle marker click
  const handleMarkerClick = useCallback((user: any, e: any) => {
    if (e?.originalEvent) {
      e.originalEvent.stopPropagation()
    }
    setSelectedUser(user)
    if (onMarkerClick) {
      onMarkerClick(user.id)
    }
  }, [onMarkerClick])

  // Reset map to default India position
  const handleReset = useCallback(() => {
    setViewState(DEFAULT_VIEW_STATE)
    if (mapRef.current?.getMap) {
      const map = mapRef.current.getMap()
      if (map) {
        map.flyTo({
          center: [DEFAULT_VIEW_STATE.longitude, DEFAULT_VIEW_STATE.latitude],
          zoom: DEFAULT_VIEW_STATE.zoom,
          duration: 1000,
        })
      }
    }
  }, [])

  // Toggle zoom
  const handleToggleZoom = useCallback(() => {
    setZoomEnabled((prev) => !prev)
  }, [])

  const MAPBOX_TOKEN = 'pk.eyJ1IjoieWFzaDk5MDAiLCJhIjoiY21rbWNpYWdrMGMzdTNlczViemgwNTY0bCJ9.6j36Iy_Q8lh2nBXKjGVsew'

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden border border-white/10">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        attributionControl={false}
        reuseMaps={true}
        interactive={zoomEnabled}
        scrollZoom={zoomEnabled}
        doubleClickZoom={zoomEnabled}
        dragPan={zoomEnabled}
        dragRotate={zoomEnabled}
        keyboard={zoomEnabled}
        touchZoomRotate={zoomEnabled}
      >
        {filteredUsers.map((user) => {
          const coords = getUserCoordinates(user)
          if (!coords) return null

          const isHighlighted = highlightedUserId === user.id

          return (
            <Marker
              key={user.id}
              longitude={coords.longitude}
              latitude={coords.latitude}
              anchor="bottom"
              onClick={(e) => handleMarkerClick(user, e)}
            >
              <div
                className={`relative cursor-pointer transition-all ${
                  isHighlighted ? 'scale-125 z-50' : 'hover:scale-110'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center bg-purple-500 shadow-lg shadow-purple-500/50 ${
                    isHighlighted ? 'ring-4 ring-purple-500/50' : ''
                  }`}
                >
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>
            </Marker>
          )
        })}

        {selectedUser && (
          (() => {
            const coords = getUserCoordinates(selectedUser)
            if (!coords) return null
            return (
              <Popup
                longitude={coords.longitude}
                latitude={coords.latitude}
                anchor="bottom"
                onClose={() => setSelectedUser(null)}
                closeButton={true}
                closeOnClick={false}
                className="custom-popup"
              >
                <div className="p-2 text-white">
                  <h3 className="font-semibold text-sm mb-1">{selectedUser.name || 'Unknown'}</h3>
                  <p className="text-xs text-white/60">
                    {(selectedUser.resolvedCity || selectedUser.city || 'N/A')},{' '}
                    {selectedUser.resolvedState || selectedUser.state || 'N/A'}
                  </p>
                </div>
              </Popup>
            )
          })()
        )}
      </Map>

      {/* User Count Badge */}
      <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10 z-10">
        <span className="text-white text-sm font-medium">
          {filteredUsers.length} User{filteredUsers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Map Controls - Top Right */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        {/* Zoom Toggle Button */}
        <button
          onClick={handleToggleZoom}
          className={cn(
            'bg-card/90 backdrop-blur-sm rounded-lg p-2.5 border transition-all',
            zoomEnabled
              ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
              : 'border-white/10 text-white/60 hover:text-white hover:bg-white/10'
          )}
          title={zoomEnabled ? 'Disable Zoom' : 'Enable Zoom'}
        >
          {zoomEnabled ? (
            <ZoomIn className="w-4 h-4" />
          ) : (
            <ZoomOut className="w-4 h-4" />
          )}
        </button>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="bg-card/90 backdrop-blur-sm rounded-lg p-2.5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
          title="Reset to Default India View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export const UserMap = memo(UserMapComponent)
