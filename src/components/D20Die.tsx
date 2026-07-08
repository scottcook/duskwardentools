import { useEffect, useRef } from 'react'

/**
 * Decorative 3D d20 rendered with three.js in a tiny transparent WebGL canvas.
 * Idles with a slow rotation; tumbles fast while `rolling`, then eases back.
 * three.js is dynamically imported so it lands in its own lazy chunk.
 */
export function D20Die({ rolling, size = 44 }: { rolling: boolean; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rollingRef = useRef(rolling)
  rollingRef.current = rolling

  useEffect(() => {
    let disposed = false
    let cleanup: (() => void) | undefined

    ;(async () => {
      const THREE = await import('three')
      const canvas = canvasRef.current
      if (disposed || !canvas) return

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(size, size, false)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 10)
      camera.position.z = 4

      const geo = new THREE.IcosahedronGeometry(1, 0)
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1a1409,
        flatShading: true,
        roughness: 0.5,
        metalness: 0.4,
      })
      const die = new THREE.Mesh(geo, mat)
      const edgeGeo = new THREE.EdgesGeometry(geo)
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xd4a017 })
      die.add(new THREE.LineSegments(edgeGeo, edgeMat))
      scene.add(die)

      const key = new THREE.DirectionalLight(0xffe0a0, 2.4)
      key.position.set(2, 3, 4)
      scene.add(key)
      const rim = new THREE.DirectionalLight(0xd4a017, 1.1)
      rim.position.set(-3, -1.5, 2)
      scene.add(rim)
      scene.add(new THREE.AmbientLight(0x8a7a55, 0.6))

      die.rotation.set(0.4, 0.75, 0.1)

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      let raf = 0
      let vel = 0.35
      let last = performance.now()

      const tick = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.05)
        last = now
        const target = rollingRef.current ? 16 : 0.35
        vel += (target - vel) * Math.min(1, dt * 9)
        die.rotation.x += vel * dt * 0.7
        die.rotation.y += vel * dt
        die.rotation.z += vel * dt * 0.4
        renderer.render(scene, camera)
        raf = requestAnimationFrame(tick)
      }

      if (reducedMotion) {
        renderer.render(scene, camera)
      } else {
        raf = requestAnimationFrame(tick)
      }

      cleanup = () => {
        cancelAnimationFrame(raf)
        geo.dispose()
        edgeGeo.dispose()
        mat.dispose()
        edgeMat.dispose()
        renderer.dispose()
      }
    })()

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [size])

  return <canvas ref={canvasRef} className="die-canvas" />
}
