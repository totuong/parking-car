<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type Slot = {
  id: string
  occupied: boolean
  carType?: string
  carColor?: string
  timestamp?: number
}

const props = defineProps<{
  slots: Slot[]
}>()

const emit = defineEmits<{
  (e: 'select-slot', slot: Slot | null): void
  (e: 'hover-slot', slot: Slot | null): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const tooltipRef = ref<HTMLDivElement | null>(null)
const tooltipData = ref<Slot | null>(null)
const tooltipPos = ref({ x: 0, y: 0 })

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let animationFrameId: number | null = null

// Groups for organizing meshes
const slotsGroup = new THREE.Group()
const carsGroup = new THREE.Group()
const animCarsGroup = new THREE.Group()

// Interactive selection
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const slotBoundingBoxes = new Map<string, THREE.Mesh>()
const slotIndicatorPlanes = new Map<string, THREE.Mesh>()
const active3dCars = new Map<string, THREE.Group>()

// Animation state
interface ActiveAnimation {
  id: string
  carGroup: THREE.Group
  path: THREE.Vector3[]
  progress: number // 0 to 1
  speed: number
  slotId: string
  isEntering: boolean
  carData: { color: string; type: string }
}
const activeAnimations = ref<ActiveAnimation[]>([])

// Color maps
const colorMapHex: Record<string, number> = {
  black: 0x111111,
  white: 0xf3f4f6,
  silver: 0x9ca3af,
  blue: 0x2563eb,
  red: 0xdc2626,
  yellow: 0xeab308,
  green: 0x10b981
}

// Layout helper
function getSlotCoords(slotId: string): { x: number; y: number; z: number; rotY: number } {
  const row = slotId.charAt(0)
  const col = parseInt(slotId.substring(1), 10)
  
  // Columns 1..10 map to X = -14.5 + (col - 1) * 3.2
  const x = -14.4 + (col - 1) * 3.2
  const y = 0.05
  let z = 0
  let rotY = 0
  
  if (row === 'A') {
    z = -10
    rotY = 0 // facing south
  } else if (row === 'B') {
    z = -3.8
    rotY = Math.PI // facing north
  } else if (row === 'C') {
    z = 3.8
    rotY = 0 // facing south
  } else if (row === 'D') {
    z = 10
    rotY = Math.PI // facing north
  }
  
  return { x, y, z, rotY }
}

function getLaneZ(slotId: string): number {
  const row = slotId.charAt(0)
  return (row === 'A' || row === 'B') ? -6.9 : 6.9
}

// Procedural 3D Car Creator
function createProceduralCar(colorName: string, carType = 'Sedan'): THREE.Group {
  const group = new THREE.Group()
  const cleanColor = colorName.toLowerCase()
  const bodyColor = colorMapHex[cleanColor] ?? 0x9ca3af
  
  // Materials
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: bodyColor,
    metalness: 0.8,
    roughness: 0.15,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1
  })
  
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.7,
    roughness: 0.1
  })
  
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.8
  })
  
  const lightAmberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 })
  const lightRedMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
  const lightCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff })
  
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
  
  // 2. Cabin/Upper Body
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
  
  // 3. Wheels
  const wheelRadius = 0.32
  const wheelThickness = 0.22
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 16)
  wheelGeo.rotateZ(Math.PI / 2) // Orient cylinder horizontally
  
  const wheelPositions = [
    { x: -chassisW / 2 - 0.05, z: chassisL / 2 - 0.45 }, // Front Left
    { x: chassisW / 2 + 0.05, z: chassisL / 2 - 0.45 },  // Front Right
    { x: -chassisW / 2 - 0.05, z: -chassisL / 2 + 0.45 },// Rear Left
    { x: chassisW / 2 + 0.05, z: -chassisL / 2 + 0.45 }  // Rear Right
  ]
  
  for (const pos of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat)
    wheel.position.set(pos.x, wheelRadius, pos.z)
    wheel.castShadow = true
    group.add(wheel)
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
  }
  
  // Raise group slightly so tires sit on floor
  group.position.y = 0.02
  
  return group
}

// 3D Scene Initialization
function initThree() {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = 480

  // 1. Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020617) // Slate 950 (Perfect cyber dashboard background)
  scene.fog = new THREE.FogExp2(0x020617, 0.015)

  // 2. Camera
  camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
  camera.position.set(0, 24, 28) // High isometric angle view

  // 3. Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  containerRef.value.appendChild(renderer.domElement)

  // 4. Controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.maxPolarAngle = Math.PI / 2 - 0.05 // Don't let users go under the floor
  controls.minDistance = 10
  controls.maxDistance = 60
  controls.target.set(0, 0, 0)

  // 5. Lights
  const ambientLight = new THREE.AmbientLight(0x1e1b4b, 0.8) // Dark indigo base fill light
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0x0ea5e9, 1.5) // Sleek Cyan sky keylight
  dirLight.position.set(15, 30, 10)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  dirLight.shadow.camera.near = 0.5
  dirLight.shadow.camera.far = 80
  const d = 25
  dirLight.shadow.camera.left = -d
  dirLight.shadow.camera.right = d
  dirLight.shadow.camera.top = d
  dirLight.shadow.camera.bottom = -d
  dirLight.shadow.bias = -0.0005
  scene.add(dirLight)

  // Accent lights - Purple backlighting for industrial aesthetic
  const pointLight1 = new THREE.PointLight(0xd946ef, 3, 20)
  pointLight1.position.set(-16, 5, -8)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(0x06b6d4, 3, 20)
  pointLight2.position.set(16, 5, 8)
  scene.add(pointLight2)

  // 6. Ground & Infrastructure
  createGround()

  // 7. Add Groups
  scene.add(slotsGroup)
  scene.add(carsGroup)
  scene.add(animCarsGroup)

  // Create initial slot outlines
  buildParkingSlots()

  // Synchronize initial cars
  syncCars()

  // 8. Event Listeners
  window.addEventListener('resize', handleResize)
  containerRef.value.addEventListener('mousemove', onMouseMove)
  containerRef.value.addEventListener('click', onMouseClick)

  // 9. Start Loop
  animate()
}

// Draw concrete slab, roads, lanes
function createGround() {
  if (!scene) return

  // Concrete floor slab
  const floorGeo = new THREE.BoxGeometry(42, 0.4, 28)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a, // Dark slate
    roughness: 0.65,
    metalness: 0.2
  })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.position.y = -0.2
  floor.receiveShadow = true
  scene.add(floor)

  // Sleek Grid Helper for futuristic visual guidelines
  const gridHelper = new THREE.GridHelper(50, 50, 0x0ea5e9, 0x1e293b)
  gridHelper.position.y = 0.01
  gridHelper.material.opacity = 0.4
  gridHelper.material.transparent = true
  scene.add(gridHelper)

  // Main access roads markings
  const roadMarkingMat = new THREE.MeshBasicMaterial({
    color: 0x334155, // Slate 700
    transparent: true,
    opacity: 0.6
  })

  // Horizontal distributor lanes
  const lane1 = new THREE.Mesh(new THREE.PlaneGeometry(36, 0.1), roadMarkingMat)
  lane1.rotation.x = -Math.PI / 2
  lane1.position.set(0, 0.02, -6.9)
  scene.add(lane1)

  const lane2 = new THREE.Mesh(new THREE.PlaneGeometry(36, 0.1), roadMarkingMat)
  lane2.rotation.x = -Math.PI / 2
  lane2.position.set(0, 0.02, 6.9)
  scene.add(lane2)

  // Vertical connector lane on the left
  const connectorL = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 14), roadMarkingMat)
  connectorL.rotation.x = -Math.PI / 2
  connectorL.position.set(-17.5, 0.02, 0)
  scene.add(connectorL)

  // Entrance and Exit pathways
  const entranceRoad = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.08), roadMarkingMat)
  entranceRoad.rotation.x = -Math.PI / 2
  entranceRoad.position.set(-20, 0.02, 0)
  scene.add(entranceRoad)

  const exitRoad = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.08), roadMarkingMat)
  exitRoad.rotation.x = -Math.PI / 2
  exitRoad.position.set(20, 0.02, 0)
  scene.add(exitRoad)
}

// Draw neon-lit parking slots outlines
function buildParkingSlots() {
  slotsGroup.clear()
  slotBoundingBoxes.clear()
  slotIndicatorPlanes.clear()

  const emptyMat = new THREE.MeshBasicMaterial({
    color: 0x10b981, // Neon Emerald Green
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide
  })

  const emptyLineMat = new THREE.LineBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.7
  })

  const occupiedLineMat = new THREE.LineBasicMaterial({
    color: 0xf97316, // Orange warning / occupied
    transparent: true,
    opacity: 0.6
  })

  props.slots.forEach(slot => {
    const coords = getSlotCoords(slot.id)
    const slotW = 2.4
    const slotL = 4.8

    // Plane geometry representing slot surface
    const planeGeo = new THREE.PlaneGeometry(slotW - 0.2, slotL - 0.2)
    const plane = new THREE.Mesh(planeGeo, emptyMat)
    plane.rotation.x = -Math.PI / 2
    plane.position.set(coords.x, coords.y + 0.005, coords.z)
    plane.visible = !slot.occupied // Only glow if empty
    slotsGroup.add(plane)
    slotIndicatorPlanes.set(slot.id, plane)

    // Wireframe Box edges to show glowing boundaries
    const boxGeo = new THREE.BoxGeometry(slotW - 0.1, 0.15, slotL - 0.1)
    const edges = new THREE.EdgesGeometry(boxGeo)
    const line = new THREE.LineSegments(edges, slot.occupied ? occupiedLineMat : emptyLineMat)
    line.position.set(coords.x, coords.y + 0.07, coords.z)
    slotsGroup.add(line)

    // Raycast hit target box
    const hitGeo = new THREE.BoxGeometry(slotW, 1.2, slotL)
    const hitMat = new THREE.MeshBasicMaterial({
      visible: false // Hidden hit-box
    })
    const hitMesh = new THREE.Mesh(hitGeo, hitMat)
    hitMesh.position.set(coords.x, coords.y + 0.6, coords.z)
    hitMesh.name = `hit-${slot.id}`
    slotsGroup.add(hitMesh)
    slotBoundingBoxes.set(slot.id, hitMesh)
  })
}

// Synchronize permanent static cars
function syncCars() {
  // Clear any existing static cars
  carsGroup.clear()
  active3dCars.clear()

  props.slots.forEach(slot => {
    // Only place a static car if occupied AND there is no ongoing animation for it
    const isAnimating = activeAnimations.value.some(anim => anim.slotId === slot.id)
    if (slot.occupied && !isAnimating) {
      const coords = getSlotCoords(slot.id)
      const car = createProceduralCar(slot.carColor || 'silver', slot.carType || 'Sedan')
      
      car.position.set(coords.x, coords.y, coords.z)
      car.rotation.y = coords.rotY
      
      carsGroup.add(car)
      active3dCars.set(slot.id, car)
    }
  })
}

// React to slot property changes (Entrance / Departure animations)
watch(() => props.slots, (newSlots: Slot[], oldSlots: Slot[] | undefined) => {
  if (!oldSlots || oldSlots.length === 0) {
    buildParkingSlots()
    syncCars()
    return
  }

  // Detect differences
  newSlots.forEach((newSlot) => {
    const oldSlot = oldSlots.find(o => o.id === newSlot.id)
    if (!oldSlot) return

    // Empty -> Occupied (Car Enters!)
    if (!oldSlot.occupied && newSlot.occupied) {
      triggerEntryAnimation(newSlot)
    } 
    // Occupied -> Empty (Car Leaves!)
    else if (oldSlot.occupied && !newSlot.occupied) {
      triggerExitAnimation(oldSlot)
    }
    // Type or Color changed while occupied
    else if (newSlot.occupied && (oldSlot.carColor !== newSlot.carColor || oldSlot.carType !== newSlot.carType)) {
      // Re-spawn immediately or smooth transition
      syncCars()
    }
  })

  // Update neon indicators
  props.slots.forEach(slot => {
    const plane = slotIndicatorPlanes.get(slot.id)
    if (plane) {
      plane.visible = !slot.occupied
    }
  })
}, { deep: true })

// Set up entering path
function triggerEntryAnimation(slot: Slot) {
  const coords = getSlotCoords(slot.id)
  const laneZ = getLaneZ(slot.id)

  // Entrance Spawn: X=-21, Z=0
  const p0 = new THREE.Vector3(-21, 0.05, 0)
  const p1 = new THREE.Vector3(-17.5, 0.05, 0)
  const p2 = new THREE.Vector3(-17.5, 0.05, laneZ)
  const p3 = new THREE.Vector3(coords.x, 0.05, laneZ)
  const p4 = new THREE.Vector3(coords.x, 0.05, coords.z)

  const path = [p0, p1, p2, p3, p4]

  const car = createProceduralCar(slot.carColor || 'silver', slot.carType || 'Sedan')
  car.position.copy(p0)
  animCarsGroup.add(car)

  // Hide the plane slot indicator immediately
  const plane = slotIndicatorPlanes.get(slot.id)
  if (plane) plane.visible = false

  activeAnimations.value.push({
    id: `anim-in-${slot.id}-${Date.now()}`,
    carGroup: car,
    path,
    progress: 0,
    speed: 0.35, // progress increments per second
    slotId: slot.id,
    isEntering: true,
    carData: { color: slot.carColor || 'silver', type: slot.carType || 'Sedan' }
  })
}

// Set up leaving path
function triggerExitAnimation(slot: Slot) {
  // Find and remove static 3D car first
  const staticCar = active3dCars.get(slot.id)
  if (staticCar) {
    carsGroup.remove(staticCar)
    active3dCars.delete(slot.id)
  }

  const coords = getSlotCoords(slot.id)
  const laneZ = getLaneZ(slot.id)

  const p0 = new THREE.Vector3(coords.x, 0.05, coords.z)
  const p1 = new THREE.Vector3(coords.x, 0.05, laneZ)
  const p2 = new THREE.Vector3(17.5, 0.05, laneZ)
  const p3 = new THREE.Vector3(17.5, 0.05, 0)
  const p4 = new THREE.Vector3(21, 0.05, 0) // Exit disappearing point

  const path = [p0, p1, p2, p3, p4]

  const car = createProceduralCar(slot.carColor || 'silver', slot.carType || 'Sedan')
  car.position.copy(p0)
  car.rotation.y = coords.rotY
  animCarsGroup.add(car)

  activeAnimations.value.push({
    id: `anim-out-${slot.id}-${Date.now()}`,
    carGroup: car,
    path,
    progress: 0,
    speed: 0.38,
    slotId: slot.id,
    isEntering: false,
    carData: { color: slot.carColor || 'silver', type: slot.carType || 'Sedan' }
  })
}

// Handles mouse interactions
function onMouseMove(event: MouseEvent) {
  if (!renderer || !camera || !scene) return

  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  // Raycast
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(slotsGroup.children)

  let hoveredSlotId: string | null = null

  if (intersects.length > 0) {
    // Find the clicked target box
    const hitObj = intersects.find(i => i.object.name.startsWith('hit-'))
    if (hitObj) {
      hoveredSlotId = hitObj.object.name.replace('hit-', '')
    }
  }

  if (hoveredSlotId) {
    const slot = props.slots.find(s => s.id === hoveredSlotId)
    if (slot) {
      tooltipData.value = slot
      tooltipPos.value = { x: event.clientX + 15, y: event.clientY + 15 }
      emit('hover-slot', slot)
    }
  } else {
    tooltipData.value = null
    emit('hover-slot', null)
  }
}

function onMouseClick(event: MouseEvent) {
  if (!renderer || !camera || !scene) return

  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(slotsGroup.children)

  if (intersects.length > 0) {
    const hitObj = intersects.find(i => i.object.name.startsWith('hit-'))
    if (hitObj) {
      const slotId = hitObj.object.name.replace('hit-', '')
      const slot = props.slots.find(s => s.id === slotId)
      if (slot) {
        emit('select-slot', slot)
        
        // Brief camera focus on click
        const coords = getSlotCoords(slot.id)
        if (controls) {
          // Smoothly pan camera target to the slot
          new THREE.Vector3(coords.x, 0, coords.z)
          controls.target.set(coords.x, 0, coords.z)
        }
      }
    }
  }
}

// Window resize handler
function handleResize() {
  if (!containerRef.value || !renderer || !camera) return
  const width = containerRef.value.clientWidth
  const height = 480
  
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

// Main Frame loop
let lastTime = 0
function animate(time = 0) {
  animationFrameId = requestAnimationFrame(animate)

  const delta = (time - lastTime) / 1000
  lastTime = time

  // 1. Process active path animations
  updateCarAnimations(delta)

  // 2. Update camera controls
  if (controls) controls.update()

  // 3. Render
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

// Animating vehicles along multi-point paths
function updateCarAnimations(delta: number) {
  if (activeAnimations.value.length === 0) return

  const completedIds: string[] = []

  activeAnimations.value.forEach((anim) => {
    anim.progress += anim.speed * delta

    if (anim.progress >= 1.0) {
      // Completed!
      anim.progress = 1.0
      completedIds.push(anim.id)
      
      // Finalize
      animCarsGroup.remove(anim.carGroup)

      if (anim.isEntering) {
        // Place permanent static car in scene
        const coords = getSlotCoords(anim.slotId)
        const staticCar = createProceduralCar(anim.carData.color, anim.carData.type)
        staticCar.position.set(coords.x, coords.y, coords.z)
        staticCar.rotation.y = coords.rotY
        carsGroup.add(staticCar)
        active3dCars.set(anim.slotId, staticCar)
      } else {
        // Leaving car disappeared, restore empty green indicator glow
        const plane = slotIndicatorPlanes.get(anim.slotId)
        if (plane) plane.visible = true
      }
    } else {
      // Calculate interpolated point along path segments
      const numSegments = anim.path.length - 1
      const totalProgress = anim.progress * numSegments
      const currentSegment = Math.min(Math.floor(totalProgress), numSegments - 1)
      const segmentProgress = totalProgress - currentSegment

      const startPt = anim.path[currentSegment]!
      const endPt = anim.path[currentSegment + 1]!

      // Interpolate Position
      const newPos = new THREE.Vector3().lerpVectors(startPt, endPt, segmentProgress)
      anim.carGroup.position.copy(newPos)

      // Calculate Rotation Angle
      const dir = new THREE.Vector3().subVectors(endPt, startPt).normalize()
      if (dir.lengthSq() > 0.001) {
        let angle = Math.atan2(dir.x, dir.z)
        
        // Reverse direction rotation check when reverse backing
        if (anim.isEntering && currentSegment === numSegments - 1) {
          // Reversing into slot
          angle += Math.PI
        }
        
        // Smoothly rotate car mesh
        const currentRot = anim.carGroup.rotation.y
        // Handle wrapping angles
        let diff = angle - currentRot
        while (diff < -Math.PI) diff += Math.PI * 2
        while (diff > Math.PI) diff -= Math.PI * 2
        
        anim.carGroup.rotation.y += diff * 0.15 // dampening factor
      }
    }
  })

  // Cleanup completed animations
  if (completedIds.length > 0) {
    activeAnimations.value = activeAnimations.value.filter(a => !completedIds.includes(a.id))
  }
}

// Lifecycle Hooks
onMounted(() => {
  // Delay slightly to ensure layout container has width
  setTimeout(() => {
    initThree()
  }, 100)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (containerRef.value) {
    containerRef.value.removeEventListener('mousemove', onMouseMove)
    containerRef.value.removeEventListener('click', onMouseClick)
  }

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }

  // Dispose materials/geometries
  slotsGroup.clear()
  carsGroup.clear()
  animCarsGroup.clear()

  if (renderer) {
    renderer.dispose()
  }
})

// Camera preset controls helpers
function resetCamera() {
  if (controls && camera) {
    camera.position.set(0, 24, 28)
    controls.target.set(0, 0, 0)
    controls.update()
  }
}

function setTopDown() {
  if (controls && camera) {
    camera.position.set(0, 32, 0.01)
    controls.target.set(0, 0, 0)
    controls.update()
  }
}

function setEntranceView() {
  if (controls && camera) {
    camera.position.set(-23, 6, 8)
    controls.target.set(-14, 0, 0)
    controls.update()
  }
}
</script>

<template>
  <div class="relative w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl shadow-cyan-950/20 group">
    <!-- Camera controls shortcut bar -->
    <div class="absolute top-4 left-4 z-20 flex gap-2">
      <button 
        @click="resetCamera" 
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-cyan-900/60 border border-slate-700 hover:border-cyan-500 text-xs font-semibold text-slate-300 hover:text-white transition shadow backdrop-blur-md"
        title="Góc nhìn phối cảnh Isometric"
      >
        <i class="pi pi-compass text-cyan-400"></i> Perspective
      </button>
      <button 
        @click="setTopDown" 
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-cyan-900/60 border border-slate-700 hover:border-cyan-500 text-xs font-semibold text-slate-300 hover:text-white transition shadow backdrop-blur-md"
        title="Góc nhìn từ trên xuống"
      >
        <i class="pi pi-image text-cyan-400"></i> Top-down
      </button>
      <button 
        @click="setEntranceView" 
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-cyan-900/60 border border-slate-700 hover:border-cyan-500 text-xs font-semibold text-slate-300 hover:text-white transition shadow backdrop-blur-md"
        title="Góc nhìn từ cổng vào"
      >
        <i class="pi pi-sign-in text-cyan-400"></i> Entrance
      </button>
    </div>

    <!-- UI Overlay for instructions -->
    <div class="absolute bottom-4 right-4 z-20 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-[10px] text-slate-400 backdrop-blur-md shadow pointer-events-none">
      <div class="flex items-center gap-1.5 font-medium"><i class="pi pi-info-circle text-cyan-400"></i> <span>Drag to Rotate · Scroll to Zoom · Right Click to Pan</span></div>
      <div class="flex items-center gap-1.5 font-medium mt-1"><i class="pi pi-pointer text-cyan-400"></i> <span>Hover slot for data · Click slot to focus camera</span></div>
    </div>

    <!-- 3D Canvas Mounting Point -->
    <div ref="containerRef" class="w-full h-[480px] block cursor-grab active:cursor-grabbing"></div>

    <!-- Glowing futuristic Tooltip on hover -->
    <div 
      v-if="tooltipData" 
      ref="tooltipRef"
      class="fixed pointer-events-none z-50 px-4 py-3 rounded-xl border border-cyan-500/30 bg-slate-950/95 text-slate-200 shadow-xl shadow-cyan-950/50 backdrop-blur-lg flex flex-col gap-1 text-xs transition-opacity duration-150"
      :style="{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }"
    >
      <div class="flex items-center justify-between gap-6 border-b border-slate-800 pb-1.5">
        <span class="font-extrabold text-cyan-400 text-sm tracking-wide">SLOT {{ tooltipData.id }}</span>
        <span 
          class="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase"
          :class="tooltipData.occupied ? 'bg-orange-950 text-orange-400 border border-orange-500/20' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/20'"
        >
          {{ tooltipData.occupied ? 'Occupied' : 'Vacant' }}
        </span>
      </div>
      
      <template v-if="tooltipData.occupied">
        <div class="flex justify-between gap-4 mt-1"><span class="text-slate-500">Vehicle Type:</span><span class="font-bold text-white uppercase">{{ tooltipData.carType }}</span></div>
        <div class="flex justify-between gap-4"><span class="text-slate-500">Body Color:</span><span class="font-bold text-white uppercase" :style="{ color: tooltipData.carColor?.toLowerCase() }">{{ tooltipData.carColor }}</span></div>
        <div v-if="tooltipData.timestamp" class="flex justify-between gap-4 border-t border-slate-900 mt-1 pt-1.5"><span class="text-slate-500">Parked Since:</span><span class="font-mono text-cyan-300">{{ new Date(tooltipData.timestamp).toLocaleTimeString() }}</span></div>
      </template>
      <template v-else>
        <div class="text-slate-500 mt-1 italic flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Ready for vehicle parking</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Standard glassmorphic elements styling if required */
</style>
