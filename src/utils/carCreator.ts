import * as THREE from 'three'

// Highly vibrant glossy metallic colors map
const colorMapHex: Record<string, number> = {
  black: 0x1f232b, // sleek carbon black
  white: 0xffffff, // pure brilliant white
  silver: 0xe2e8f0, // bright metallic chrome silver
  blue: 0x00d2ff, // vivid glossy cyan blue
  red: 0xff1e1e, // hot racing red
  yellow: 0xffea00, // sunburst yellow
  green: 0x00ff66 // neon emerald green
}

/**
 * Procedural 3D Car Creator with high premium details
 * @param colorName The color key
 * @param carType The model type (Sedan, SUV, Truck, EV)
 * @param isNight Whether night mode is active (triggers headlight beams)
 * @returns THREE.Group containing the full car mesh
 */
export function createProceduralCar(colorName: string, carType = 'Sedan', isNight = false): THREE.Group {
  const group = new THREE.Group()
  const cleanColor = colorName.toLowerCase()
  const bodyColor = colorMapHex[cleanColor] ?? 0x9ca3af

  // Premium highly-reflective metallic paint material
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: bodyColor,
    metalness: 0.9,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    reflectivity: 0.95
  })

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.75,
    roughness: 0.05
  })

  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.8
  })

  // Alloy rim material (shiny chrome/steel)
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.9,
    roughness: 0.15
  })

  const lightAmberMat = new THREE.MeshBasicMaterial({ color: isNight ? 0xfff3a1 : 0xdd9900 })
  const lightRedMat = new THREE.MeshBasicMaterial({ color: isNight ? 0xff1e1e : 0x990000 })
  const lightCyanMat = new THREE.MeshBasicMaterial({ color: isNight ? 0x00ffff : 0x0099cc })

  let chassisW = 1.3, chassisH = 0.5, chassisL = 2.4
  let cabinW = 1.0, cabinH = 0.4, cabinL = 1.2
  let cabinY = 0.45, cabinZ = -0.1

  const type = carType.toLowerCase()

  if (type === 'suv') {
    chassisW = 1.4
    chassisH = 0.7
    chassisL = 2.5
    cabinW = 1.15
    cabinH = 0.55
    cabinL = 1.7
    cabinY = 0.6
    cabinZ = -0.2
  } else if (type === 'truck') {
    chassisW = 1.45
    chassisH = 0.6
    chassisL = 2.9
    // Truck has cab at front, flatbed in back
    cabinW = 1.2
    cabinH = 0.65
    cabinL = 1.0
    cabinY = 0.6
    cabinZ = 0.7
  } else if (type === 'ev') {
    chassisW = 1.3
    chassisH = 0.45
    chassisL = 2.45
    cabinW = 1.05
    cabinH = 0.4
    cabinL = 1.5
    cabinY = 0.4
    cabinZ = -0.1
  }

  // 1. Chassis/Lower Body
  const chassisGeo = new THREE.BoxGeometry(chassisW, chassisH, chassisL)
  const chassisMesh = new THREE.Mesh(chassisGeo, bodyMat)
  chassisMesh.position.y = chassisH / 2
  chassisMesh.castShadow = true
  chassisMesh.receiveShadow = true
  group.add(chassisMesh)

  // 2. Cabin/Upper Body & Unique Features
  if (type === 'truck') {
    // Cab
    const cabGeo = new THREE.BoxGeometry(cabinW, cabinH, cabinL)
    const cabMesh = new THREE.Mesh(cabGeo, bodyMat)
    cabMesh.position.set(0, cabinY + cabinH / 2, cabinZ)
    cabMesh.castShadow = true
    group.add(cabMesh)

    // Windshield cutout helper
    const windGeo = new THREE.BoxGeometry(cabinW - 0.05, cabinH - 0.1, 0.4)
    const windMesh = new THREE.Mesh(windGeo, glassMat)
    windMesh.position.set(0, cabinY + cabinH / 2 + 0.05, cabinZ + 0.3)
    group.add(windMesh)

    // Bed
    const bedGeo = new THREE.BoxGeometry(chassisW, 0.3, 1.6)
    const bedMesh = new THREE.Mesh(bedGeo, bodyMat)
    bedMesh.position.set(0, 0.35, -0.5)
    bedMesh.castShadow = true
    group.add(bedMesh)

    // Bed inner cutout (black plate)
    const bedInnerGeo = new THREE.BoxGeometry(chassisW - 0.15, 0.05, 1.45)
    const bedInnerMesh = new THREE.Mesh(bedInnerGeo, wheelMat)
    bedInnerMesh.position.set(0, 0.48, -0.5)
    group.add(bedInnerMesh)

  } else if (type === 'ev') {
    // Sleek continuous wedge shape cabin
    const cabinGeo = new THREE.BoxGeometry(cabinW, cabinH, cabinL)
    const cabinMesh = new THREE.Mesh(cabinGeo, bodyMat)
    cabinMesh.position.set(0, cabinY + cabinH / 2, cabinZ)
    cabinMesh.castShadow = true
    group.add(cabinMesh)

    // Cyan neon glowing strip around the body (Cyberpunk EV look!)
    const neonGeo = new THREE.BoxGeometry(chassisW + 0.02, 0.04, chassisL + 0.02)
    const neonMesh = new THREE.Mesh(neonGeo, lightCyanMat)
    neonMesh.position.y = 0.3
    group.add(neonMesh)

    // Windshield
    const windGeo = new THREE.BoxGeometry(cabinW - 0.1, cabinH - 0.05, cabinL - 0.2)
    const windMesh = new THREE.Mesh(windGeo, glassMat)
    windMesh.position.set(0, cabinY + cabinH / 2 + 0.02, cabinZ)
    group.add(windMesh)

  } else {
    // Standard Sedan/Coupe cabin
    const cabinGeo = new THREE.BoxGeometry(cabinW, cabinH, cabinL)
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMat)
    cabinMesh.position.set(0, cabinY + cabinH / 2, cabinZ)
    cabinMesh.castShadow = true
    group.add(cabinMesh)

    // Colored roof plate
    const roofGeo = new THREE.BoxGeometry(cabinW - 0.1, 0.05, cabinL - 0.2)
    const roofMesh = new THREE.Mesh(roofGeo, bodyMat)
    roofMesh.position.set(0, cabinY + cabinH, cabinZ)
    group.add(roofMesh)
  }

  // A. Add Side Mirror Wings (For high premium automotive detail!)
  const mirrorGeo = new THREE.BoxGeometry(0.12, 0.08, 0.18)
  const mirrorL = new THREE.Mesh(mirrorGeo, bodyMat)
  mirrorL.position.set(-chassisW / 2 - 0.04, chassisH - 0.02, 0.4)
  const mirrorR = new THREE.Mesh(mirrorGeo, bodyMat)
  mirrorR.position.set(chassisW / 2 + 0.04, chassisH - 0.02, 0.4)
  group.add(mirrorL)
  group.add(mirrorR)

  // B. Add Sporty Aerodynamic Rear Spoiler/Wing (For Sedan and EV sports look!)
  if (type === 'sedan' || type === 'ev') {
    const wingSupportGeo = new THREE.BoxGeometry(0.08, 0.15, 0.08)
    const wingSupportL = new THREE.Mesh(wingSupportGeo, bodyMat)
    wingSupportL.position.set(-chassisW / 2 + 0.18, chassisH, -chassisL / 2 + 0.18)
    const wingSupportR = new THREE.Mesh(wingSupportGeo, bodyMat)
    wingSupportR.position.set(chassisW / 2 - 0.18, chassisH, -chassisL / 2 + 0.18)
    group.add(wingSupportL)
    group.add(wingSupportR)

    const wingBladeGeo = new THREE.BoxGeometry(chassisW - 0.1, 0.03, 0.22)
    const wingBlade = new THREE.Mesh(wingBladeGeo, bodyMat)
    wingBlade.position.set(0, chassisH + 0.15, -chassisL / 2 + 0.18)
    group.add(wingBlade)
  }

  // 3. Wheels with Shiny Steel Alloy Rims
  const wheelRadius = 0.32
  const wheelThickness = 0.22
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 16)
  wheelGeo.rotateZ(Math.PI / 2) // Orient cylinder horizontally

  // Rim geometry (slightly thinner and sitting inside the rubber tire)
  const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.6, wheelRadius * 0.6, wheelThickness + 0.01, 12)
  rimGeo.rotateZ(Math.PI / 2)
  
  const wheelPositions = [
    { x: -chassisW / 2 - 0.05, z: chassisL / 2 - 0.45 }, // Front Left
    { x: chassisW / 2 + 0.05, z: chassisL / 2 - 0.45 },  // Front Right
    { x: -chassisW / 2 - 0.05, z: -chassisL / 2 + 0.45 },// Rear Left
    { x: chassisW / 2 + 0.05, z: -chassisL / 2 + 0.45 }  // Rear Right
  ]

  for (const pos of wheelPositions) {
    // Rubber Tire Mesh
    const wheel = new THREE.Mesh(wheelGeo, wheelMat)
    wheel.position.set(pos.x, wheelRadius, pos.z)
    wheel.castShadow = true
    group.add(wheel)

    // Shiny Alloy Hubcap/Rim Mesh
    const rim = new THREE.Mesh(rimGeo, rimMat)
    rim.position.set(pos.x, wheelRadius, pos.z)
    group.add(rim)
  }

  // 4. Lights
  if (type === 'ev') {
    // Front glowing bar
    const barGeo = new THREE.BoxGeometry(chassisW - 0.15, 0.04, 0.05)
    const frontBar = new THREE.Mesh(barGeo, lightCyanMat)
    frontBar.position.set(0, 0.38, chassisL / 2)
    group.add(frontBar)

    // Rear glowing red bar
    const rearBar = new THREE.Mesh(barGeo, lightRedMat)
    rearBar.position.set(0, 0.38, -chassisL / 2)
    group.add(rearBar)

    if (isNight) {
      // Cast glow forward
      const headlightBeam = new THREE.SpotLight(0x00ffff, 5.0, 10, Math.PI / 4, 0.5, 1.0)
      headlightBeam.position.set(0, 0.4, chassisL / 2)
      const targetObj = new THREE.Object3D()
      targetObj.position.set(0, 0, chassisL / 2 + 3)
      group.add(targetObj)
      headlightBeam.target = targetObj
      group.add(headlightBeam)
    }
  } else {
    // Left/Right Headlights
    const lightGeo = new THREE.SphereGeometry(0.08, 8, 8)

    const headL = new THREE.Mesh(lightGeo, lightAmberMat)
    headL.position.set(-chassisW / 2 + 0.2, 0.35, chassisL / 2)
    const headR = new THREE.Mesh(lightGeo, lightAmberMat)
    headR.position.set(chassisW / 2 - 0.2, 0.35, chassisL / 2)

    group.add(headL)
    group.add(headR)

    // Rear Tail lights (Red)
    const tailL = new THREE.Mesh(lightGeo, lightRedMat)
    tailL.position.set(-chassisW / 2 + 0.25, 0.35, -chassisL / 2)
    const tailR = new THREE.Mesh(lightGeo, lightRedMat)
    tailR.position.set(chassisW / 2 - 0.25, 0.35, -chassisL / 2)

    group.add(tailL)
    group.add(tailR)

    if (isNight) {
      // Cast forward glow
      const headlightBeam = new THREE.SpotLight(0xfff7d6, 6.0, 12, Math.PI / 4, 0.5, 1.0)
      headlightBeam.position.set(0, 0.4, chassisL / 2)
      const targetObj = new THREE.Object3D()
      targetObj.position.set(0, 0, chassisL / 2 + 3)
      group.add(targetObj)
      headlightBeam.target = targetObj
      group.add(headlightBeam)
    }
  }

  // Raise group slightly so tires sit on floor
  group.position.y = 0.02

  return group
}
