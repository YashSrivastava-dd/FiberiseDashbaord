/**
 * Lightweight User-Agent parser — zero external dependencies.
 * Extracts browser, OS, and device type from a UA string using regex.
 */

export interface ParsedUserAgent {
  browser: string
  os: string
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown'
}

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' }

  const result: ParsedUserAgent = { browser: 'Unknown', os: 'Unknown', device: 'Unknown' }

  // ── OS Detection ──
  if (/Windows NT 10/i.test(ua)) result.os = 'Windows 10/11'
  else if (/Windows NT 6\.3/i.test(ua)) result.os = 'Windows 8.1'
  else if (/Windows NT 6\.2/i.test(ua)) result.os = 'Windows 8'
  else if (/Windows NT 6\.1/i.test(ua)) result.os = 'Windows 7'
  else if (/Windows/i.test(ua)) result.os = 'Windows'
  else if (/Mac OS X (\d+[._]\d+)/i.test(ua)) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/)
    result.os = `macOS ${match?.[1]?.replace(/_/g, '.') || ''}`
  }
  else if (/Macintosh|Mac OS/i.test(ua)) result.os = 'macOS'
  else if (/Android (\d+(\.\d+)?)/i.test(ua)) {
    const match = ua.match(/Android (\d+(\.\d+)?)/)
    result.os = `Android ${match?.[1] || ''}`
  }
  else if (/Android/i.test(ua)) result.os = 'Android'
  else if (/iPhone OS (\d+[._]\d+)/i.test(ua)) {
    const match = ua.match(/iPhone OS (\d+[._]\d+)/)
    result.os = `iOS ${match?.[1]?.replace(/_/g, '.') || ''}`
  }
  else if (/iPad/i.test(ua)) result.os = 'iPadOS'
  else if (/iPhone|iOS/i.test(ua)) result.os = 'iOS'
  else if (/CrOS/i.test(ua)) result.os = 'Chrome OS'
  else if (/Linux/i.test(ua)) result.os = 'Linux'
  else if (/Ubuntu/i.test(ua)) result.os = 'Ubuntu'

  // ── Browser Detection (order matters — more specific first) ──
  if (/Edg\/(\d+)/i.test(ua)) {
    const match = ua.match(/Edg\/(\d+)/)
    result.browser = `Edge ${match?.[1] || ''}`
  }
  else if (/OPR\/(\d+)/i.test(ua) || /Opera/i.test(ua)) {
    const match = ua.match(/OPR\/(\d+)/)
    result.browser = `Opera ${match?.[1] || ''}`
  }
  else if (/Brave/i.test(ua)) result.browser = 'Brave'
  else if (/Vivaldi\/(\d+)/i.test(ua)) {
    const match = ua.match(/Vivaldi\/(\d+)/)
    result.browser = `Vivaldi ${match?.[1] || ''}`
  }
  else if (/Firefox\/(\d+)/i.test(ua)) {
    const match = ua.match(/Firefox\/(\d+)/)
    result.browser = `Firefox ${match?.[1] || ''}`
  }
  else if (/Chrome\/(\d+)/i.test(ua) && !/Chromium/i.test(ua)) {
    const match = ua.match(/Chrome\/(\d+)/)
    result.browser = `Chrome ${match?.[1] || ''}`
  }
  else if (/Safari\/(\d+)/i.test(ua) && !/Chrome/i.test(ua)) {
    const vMatch = ua.match(/Version\/(\d+(\.\d+)?)/)
    result.browser = `Safari ${vMatch?.[1] || ''}`
  }
  else if (/MSIE|Trident/i.test(ua)) result.browser = 'Internet Explorer'

  // ── Device Type Detection ──
  if (/Mobi|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    result.device = 'Mobile'
  } else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) {
    result.device = 'Tablet'
  } else if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) {
    result.device = 'Desktop'
  }

  return result
}
