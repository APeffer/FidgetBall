'use client'

import { useEffect, useRef, useState } from 'react'
import { sdk } from '@farcaster/frame-sdk'

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
}

interface DeviceMotionData {
  x: number
  y: number
  z: number
}

interface CollisionZones {
  left: boolean
  right: boolean
  top: boolean
  bottom: boolean
}

export default function FidgetBall() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const [deviceMotion, setDeviceMotion] = useState<DeviceMotionData>({ x: 0, y: 0, z: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 400 })
  const [menuOpen, setMenuOpen] = useState(false)
  const [bounciness, setBounciness] = useState(0.9)
  const [gravity, setGravity] = useState(0.999)
  const [gravityDisplay, setGravityDisplay] = useState(1) // 0-20 scale, default to 1
  const [audioPitch, setAudioPitch] = useState(800)
  const [ballColor, setBallColor] = useState('#ff6b6b')
  const [useVibration, setUseVibration] = useState(false)
  const [hapticsSupported, setHapticsSupported] = useState(false)
  const [ball, setBall] = useState<Ball>({
    x: 200,
    y: 200,
    vx: 0,
    vy: 0,
    radius: 5,
    color: '#ff6b6b'
  })
  
  // Track which collision zones the ball is currently in
  const inZonesRef = useRef<CollisionZones>({ left: false, right: false, top: false, bottom: false })
  const audioPlayedRef = useRef<CollisionZones>({ left: false, right: false, top: false, bottom: false })

  const FRICTION = gravity      // User adjustable momentum retention
  const GRAVITY_SCALE = 0.0004 // Slightly less responsive to tilt
  const BOUNCE_DAMPING = bounciness // User adjustable bounciness
  const MAX_VELOCITY = 8       // Cap maximum velocity
  const COLLISION_ZONE_SIZE = 10 // Invisible zone extends 10px from walls

  const checkHapticCapabilities = async () => {
    try {
      const capabilities = await sdk.getCapabilities()
      const hasHaptics = capabilities.includes('haptics.impactOccurred')
      setHapticsSupported(hasHaptics)
      console.log('Haptics supported:', hasHaptics)
    } catch (error) {
      console.log('Could not check haptic capabilities:', error)
      setHapticsSupported(false)
    }
  }

  const triggerFeedback = async () => {
    if (useVibration && hapticsSupported) {
      try {
        await sdk.haptics.impactOccurred('medium')
      } catch (error) {
        console.log('Haptic feedback failed:', error)
      }
    } else {
      playBlip()
    }
  }

  const playBlip = () => {
    try {
      if (!audioContextRef.current) {
        return // Audio context not initialized yet
      }
      
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      // Create a blip sound with adjustable pitch
      oscillator.frequency.setValueAtTime(audioPitch, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(audioPitch * 0.5, ctx.currentTime + 0.1)
      
      const volume = 0.1 // Full volume - let user control with device volume
      gainNode.gain.setValueAtTime(volume, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.1)
    } catch (error) {
      console.log('Audio not available:', error)
    }
  }

  // Initialize canvas size based on viewport
  useEffect(() => {
    const updateCanvasSize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      setCanvasSize({ width, height })
      
      // Center ball on first load or update position if outside bounds
      setBall(prevBall => {
        const isFirstLoad = prevBall.x === 200 && prevBall.y === 200
        return {
          ...prevBall,
          x: isFirstLoad ? width / 2 : Math.min(prevBall.x, width - prevBall.radius),
          y: isFirstLoad ? height / 2 : Math.min(prevBall.y, height - prevBall.radius)
        }
      })
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [])

  const requestDeviceMotionPermission = async () => {
    if (typeof window === 'undefined') return
    
    setIsRequestingPermission(true)
    setPermissionDenied(false)
    
    try {
      // Check if we're on HTTPS or localhost
      const isSecureContext = window.location.protocol === 'https:' || 
                             window.location.hostname === 'localhost' ||
                             window.location.hostname === '127.0.0.1'
      
      if (!isSecureContext) {
        alert('Device motion requires HTTPS. Please access the app via HTTPS.')
        setIsRequestingPermission(false)
        return
      }

      if ('DeviceMotionEvent' in window) {
        // Check if permission API is available (iOS 13+)
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
          try {
            const permission = await (DeviceMotionEvent as any).requestPermission()
            if (permission === 'granted') {
              // Initialize audio context on user interaction
              try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
              } catch (error) {
                console.log('Audio context initialization failed:', error)
              }
              // Check haptic capabilities
              checkHapticCapabilities()
              setPermissionGranted(true)
              startDeviceMotionListening()
            } else {
              setPermissionDenied(true)
              console.log('Device motion permission denied')
            }
          } catch (error) {
            console.error('Error requesting device motion permission:', error)
            setPermissionDenied(true)
          }
        } else {
          // For Android devices and other browsers that don't require permission
          // Initialize audio context on user interaction
          try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
          } catch (error) {
            console.log('Audio context initialization failed:', error)
          }
          // Check haptic capabilities
          checkHapticCapabilities()
          setPermissionGranted(true)
          startDeviceMotionListening()
        }
      } else {
        alert('Device motion is not supported on this device')
        setPermissionDenied(true)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      setPermissionDenied(true)
    } finally {
      setIsRequestingPermission(false)
    }
  }

  const startDeviceMotionListening = () => {
    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      if (event.accelerationIncludingGravity) {
        setDeviceMotion({
          x: event.accelerationIncludingGravity.x || 0,
          y: event.accelerationIncludingGravity.y || 0,
          z: event.accelerationIncludingGravity.z || 0
        })
      }
    }

    window.addEventListener('devicemotion', handleDeviceMotion)
    
    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion)
    }
  }

  const updateBall = () => {
    setBall(prevBall => {
      // Calculate acceleration from device tilt
      let accelX = 0
      let accelY = 0

      if (permissionGranted) {
        // Tilt determines acceleration, not velocity directly
        accelX = deviceMotion.x * GRAVITY_SCALE
        accelY = -(deviceMotion.y) * GRAVITY_SCALE  // Add 4 units offset + invert Y axis
      } else {
        // Fallback: simulate gentle acceleration for demo
        accelX = Math.sin(Date.now() * 0.001) * 0.02
        accelY = Math.cos(Date.now() * 0.0015) * 0.02
      }

      // Apply acceleration to velocity
      let newVx = prevBall.vx + accelX
      let newVy = prevBall.vy + accelY

      // Apply friction to velocity
      newVx *= FRICTION
      newVy *= FRICTION

      // Cap maximum velocity for better control
      newVx = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, newVx))
      newVy = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, newVy))

      // Calculate new position
      let newX = prevBall.x + newVx
      let newY = prevBall.y + newVy

      // Check collision zones (extends 10px from walls)
      const newZones: CollisionZones = {
        left: newX <= prevBall.radius + COLLISION_ZONE_SIZE,
        right: newX >= canvasSize.width - prevBall.radius - COLLISION_ZONE_SIZE,
        top: newY <= prevBall.radius + COLLISION_ZONE_SIZE,
        bottom: newY >= canvasSize.height - prevBall.radius - COLLISION_ZONE_SIZE
      }

      // Check for zone entry and trigger feedback
      if ((newZones.left && !inZonesRef.current.left && !audioPlayedRef.current.left) ||
          (newZones.right && !inZonesRef.current.right && !audioPlayedRef.current.right) ||
          (newZones.top && !inZonesRef.current.top && !audioPlayedRef.current.top) ||
          (newZones.bottom && !inZonesRef.current.bottom && !audioPlayedRef.current.bottom)) {
        triggerFeedback()
        
        // Mark audio as played for zones we just entered
        if (newZones.left && !inZonesRef.current.left) audioPlayedRef.current.left = true
        if (newZones.right && !inZonesRef.current.right) audioPlayedRef.current.right = true
        if (newZones.top && !inZonesRef.current.top) audioPlayedRef.current.top = true
        if (newZones.bottom && !inZonesRef.current.bottom) audioPlayedRef.current.bottom = true
      }

      // Reset audio play state when leaving zones
      if (!newZones.left && inZonesRef.current.left) audioPlayedRef.current.left = false
      if (!newZones.right && inZonesRef.current.right) audioPlayedRef.current.right = false
      if (!newZones.top && inZonesRef.current.top) audioPlayedRef.current.top = false
      if (!newZones.bottom && inZonesRef.current.bottom) audioPlayedRef.current.bottom = false

      // Update zone tracking
      inZonesRef.current = newZones

      // Bounce off walls with better physics (actual collision, not zone)
      if (newX <= prevBall.radius || newX >= canvasSize.width - prevBall.radius) {
        newVx = -newVx * BOUNCE_DAMPING // Better bounce retention
        newX = Math.max(prevBall.radius, Math.min(canvasSize.width - prevBall.radius, newX))
        console.log('X collision detected!', { newX, radius: prevBall.radius, width: canvasSize.width })
      }

      if (newY <= prevBall.radius || newY >= canvasSize.height - prevBall.radius) {
        newVy = -newVy * BOUNCE_DAMPING // Better bounce retention
        newY = Math.max(prevBall.radius, Math.min(canvasSize.height - prevBall.radius, newY))
        console.log('Y collision detected!', { newY, radius: prevBall.radius, height: canvasSize.height })
      }

      return {
        ...prevBall,
        x: newX,
        y: newY,
        vx: newVx,
        vy: newVy
      }
    })
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Dark gray background
    ctx.fillStyle = '#2a2a2a'
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)
    
    // Draw "FidgetBall" text behind the ball
    ctx.fillStyle = '#4a4a4a'
    ctx.font = `${Math.min(canvasSize.width, canvasSize.height) / 12}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('FidgetBall', canvasSize.width / 2, canvasSize.height / 2)

    // Draw ball shadow
    ctx.beginPath()
    ctx.arc(ball.x + 3, ball.y + 3, ball.radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.fill()

    // Draw ball
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
    
    // Create gradient for 3D effect
    const gradient = ctx.createRadialGradient(
      ball.x - ball.radius * 0.3,
      ball.y - ball.radius * 0.3,
      0,
      ball.x,
      ball.y,
      ball.radius
    )
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.3, ballColor)
    gradient.addColorStop(1, ballColor)
    
    ctx.fillStyle = gradient
    ctx.fill()

    // Add highlight
    ctx.beginPath()
    ctx.arc(ball.x - ball.radius * 0.4, ball.y - ball.radius * 0.4, ball.radius * 0.3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.fill()
  }

  const gameLoop = () => {
    updateBall()
    draw()
    animationFrameRef.current = requestAnimationFrame(gameLoop)
  }

  useEffect(() => {
    gameLoop()
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [ball, deviceMotion, permissionGranted])

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="game-canvas"
      />
      
      <div className="controls">
        {!permissionGranted ? (
          <>
            <p>Tilt your device to control the ball!</p>
            {permissionDenied && (
              <p style={{ color: '#ff6b6b', fontSize: '12px', marginBottom: '8px' }}>
                Permission denied. Please refresh and try again.
              </p>
            )}
            <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
              For iOS: Requires HTTPS and user interaction
            </p>
            <button 
              className="permission-button"
              onClick={requestDeviceMotionPermission}
              disabled={isRequestingPermission}
            >
              {isRequestingPermission ? 'Requesting...' : 'Enable Motion'}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  width: '32px',
                  height: '32px',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div style={{ width: '14px', height: '2px', backgroundColor: '#fff', borderRadius: '1px' }}></div>
                <div style={{ width: '14px', height: '2px', backgroundColor: '#fff', borderRadius: '1px' }}></div>
                <div style={{ width: '14px', height: '2px', backgroundColor: '#fff', borderRadius: '1px' }}></div>
              </button>
            </div>
            
            {menuOpen && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', opacity: 0.8 }}>Motion: Active ✓</p>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                    Bounciness: {(bounciness * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.98"
                    step="0.02"
                    value={bounciness}
                    onChange={(e) => setBounciness(Number(e.target.value))}
                    style={{ width: '100%', height: '4px' }}
                  />
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                    Gravity: {gravityDisplay}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={gravityDisplay}
                    onChange={(e) => {
                      const displayValue = Number(e.target.value)
                      setGravityDisplay(displayValue)
                      // Convert display value (0-20) to gravity value (0.998-0.9999)
                      // 0 = 0.998 (high gravity), 20 = 0.9999 (low gravity)
                      const gravityValue = 0.998 + ((20 - displayValue) / 20) * 0.0019
                      setGravity(gravityValue)
                    }}
                    style={{ width: '100%', height: '4px' }}
                  />
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                    Audio Pitch: {audioPitch}Hz
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="2000"
                    step="50"
                    value={audioPitch}
                    onChange={(e) => setAudioPitch(Number(e.target.value))}
                    style={{ width: '100%', height: '4px' }}
                  />
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                    Ball Color
                  </label>
                  <input
                    type="color"
                    value={ballColor}
                    onChange={(e) => setBallColor(e.target.value)}
                    style={{ 
                      width: '100%', 
                      height: '32px', 
                      border: 'none', 
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                    Feedback Mode
                  </label>
                  <button
                    onClick={() => setUseVibration(!useVibration)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: useVibration ? '#4CAF50' : '#ff6b6b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}
                  >
                    {useVibration ? '📳 Vibration' : '🔊 Audio'}
                    {!hapticsSupported && useVibration && ' (Unsupported)'}
                  </button>
                </div>
                
                <button 
                  className="permission-button"
                  onClick={() => {
                    setPermissionGranted(false)
                    setPermissionDenied(false)
                  }}
                  style={{ fontSize: '12px', padding: '8px 16px', width: '100%' }}
                >
                  Reset Permissions
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 