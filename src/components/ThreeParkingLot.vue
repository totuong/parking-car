<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, inject } from 'vue'
import * as THREE from 'three'
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createProceduralCar } from '../utils/carCreator'

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

const isDark = inject<any>('isDark')
const locale = inject<any>('locale')
const t = inject<any>('t')

// Simulation of hours in a day
const timeOfDay = ref(12.0) // ranges from 0.00 to 23.99
const autoSyncTime = ref(true)

function formatHour(val: number): string {
  const h = Math.floor(val)
  const m = Math.floor((val - h) * 60)
  return `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`
}

function setTime(hour: number) {
  autoSyncTime.value = false
  timeOfDay.value = hour
}

const containerRef = ref<HTMLDivElement | null>(null)
const tooltipRef = ref<HTMLDivElement | null>(null)
const tooltipData = ref<Slot | null>(null)
const tooltipPos = ref({ x: 0, y: 0 })

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let animationFrameId: number | null = null

// Ambient and key lighting references
let ambientLight: THREE.AmbientLight | null = null
let dirLight: THREE.DirectionalLight | null = null
let pointLight1: THREE.PointLight | null = null
let pointLight2: THREE.PointLight | null = null

// Barrier gate mesh and animation state references
let barrierArmMesh: THREE.Mesh | null = null
let barrierAngleTarget = 0.0
let barrierAngleCurrent = 0.0

// Exit barrier gate mesh and animation state references
let exitBarrierArmMesh: THREE.Mesh | null = null
let exitBarrierAngleTarget = 0.0
let exitBarrierAngleCurrent = 0.0

// Dynamic entrance & exit gate lights references
let guardBoothLightRef: THREE.PointLight | null = null
let archSpotlightRef: THREE.SpotLight | null = null
let exitBoothLightRef: THREE.PointLight | null = null
let exitArchSpotlightRef: THREE.SpotLight | null = null
let floorMesh: THREE.Mesh | null = null

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
const slotSensorMeshes = new Map<string, THREE.Mesh>()
const lastOccupiedStates = new Map<string, boolean>()

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
  waitingAtGate?: boolean
  gateWaitTime?: number
}
const activeAnimations = ref<ActiveAnimation[]>([])

// Layout helper
function getSlotCoords(slotId: string): { x: number; y: number; z: number; rotY: number } {
  const row = slotId.charAt(0)
  const col = parseInt(slotId.substring(1), 10)
  
  // Columns 1..14 map to X centered symmetrically around 0
  const x = (col - 7.5) * 3.2
  const y = 0.05
  let z = 0
  let rotY = 0
  
  if (row === 'A') {
    z = -10.5
    rotY = 0 // facing south
  } else if (row === 'B') {
    z = -2.5
    rotY = Math.PI // facing north
  } else if (row === 'C') {
    z = 2.5
    rotY = 0 // facing south
  } else if (row === 'D') {
    z = 10.5
    rotY = Math.PI // facing north
  } else if (row === 'E') {
    z = 15.5
    rotY = 0 // facing south
  }
  
  return { x, y, z, rotY }
}

function getLaneZ(slotId: string): number {
  const row = slotId.charAt(0)
  if (row === 'A' || row === 'B') return -6.5
  if (row === 'C' || row === 'D') return 6.5
  if (row === 'E') return 19.5
  return 6.5
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
  camera.position.set(0, 32, 42) // High isometric angle view
 
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
  controls.target.set(0, 0, 2.5)

  // 5. Lights
  ambientLight = new THREE.AmbientLight(0x1e1b4b, 0.8) // Dark indigo base fill light
  scene.add(ambientLight)

  dirLight = new THREE.DirectionalLight(0x0ea5e9, 1.5) // Sleek Cyan sky keylight
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
  pointLight1 = new THREE.PointLight(0xd946ef, 3, 20)
  pointLight1.position.set(-16, 5, -8)
  scene.add(pointLight1)

  pointLight2 = new THREE.PointLight(0x06b6d4, 3, 20)
  pointLight2.position.set(16, 5, 8)
  scene.add(pointLight2)

  // 6. Ground & Infrastructure
  createGround()
  buildLampposts()
  buildEntranceGate()
  buildExitGate()
  buildCompanyBuilding()

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

  // Concrete floor slab (expanded to 61x50 for spacious 5-row visual design, centered at Z=2.5)
  const floorGeo = new THREE.BoxGeometry(61, 0.4, 50)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a, // Dark slate
    roughness: 0.65,
    metalness: 0.2
  })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.position.set(0, -0.2, 2.5)
  floor.receiveShadow = true
  scene.add(floor)
  floorMesh = floor

  // Sleek Grid Helper for futuristic visual guidelines
  const gridHelper = new THREE.GridHelper(70, 70, 0x0ea5e9, 0x1e293b)
  gridHelper.position.set(0, 0.01, 2.5)
  gridHelper.material.opacity = 0.3
  gridHelper.material.transparent = true
  scene.add(gridHelper)

  // Asphalt road material (premium high-friction look)
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x0b0f19, // Slate-black asphalt
    roughness: 0.85,
    metalness: 0.1
  })

  // Yellow center line material (neon glowing paint)
  const yellowLineMat = new THREE.MeshBasicMaterial({
    color: 0xeab308, // Glowing yellow
    transparent: true,
    opacity: 0.85
  })

  // White border line material
  const whiteLineMat = new THREE.MeshBasicMaterial({
    color: 0xf8fafc, // Slate 50 white
    transparent: true,
    opacity: 0.6
  })

  // 1. Horizontal Roads (distributors, 3.2m wide, length 48m to span between connector roads)
  const road0 = new THREE.Mesh(new THREE.PlaneGeometry(48, 3.2), asphaltMat)
  road0.rotation.x = -Math.PI / 2
  road0.position.set(0, 0.012, -14.5)
  road0.receiveShadow = true
  scene.add(road0)

  const road1 = new THREE.Mesh(new THREE.PlaneGeometry(48, 3.2), asphaltMat)
  road1.rotation.x = -Math.PI / 2
  road1.position.set(0, 0.012, -6.5)
  road1.receiveShadow = true
  scene.add(road1)

  const road2 = new THREE.Mesh(new THREE.PlaneGeometry(48, 3.2), asphaltMat)
  road2.rotation.x = -Math.PI / 2
  road2.position.set(0, 0.012, 6.5)
  road2.receiveShadow = true
  scene.add(road2)

  const road3 = new THREE.Mesh(new THREE.PlaneGeometry(48, 3.2), asphaltMat)
  road3.rotation.x = -Math.PI / 2
  road3.position.set(0, 0.012, 19.5)
  road3.receiveShadow = true
  scene.add(road3)

  // 2. Vertical Connector Roads (3.2m wide, length 37.2m to span from Road 0 to Road 3)
  const connectorL = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 37.2), asphaltMat)
  connectorL.rotation.x = -Math.PI / 2
  connectorL.position.set(-24.0, 0.012, 2.5)
  connectorL.receiveShadow = true
  scene.add(connectorL)

  const connectorR = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 37.2), asphaltMat)
  connectorR.rotation.x = -Math.PI / 2
  connectorR.position.set(24.0, 0.012, 2.5)
  connectorR.receiveShadow = true
  scene.add(connectorR)

  // 3. Entrance and Exit pathways (shifted outwards because connector roads shifted)
  const entranceRoad = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 3.2), asphaltMat)
  entranceRoad.rotation.x = -Math.PI / 2
  entranceRoad.position.set(-26.75, 0.012, 2.0)
  entranceRoad.receiveShadow = true
  scene.add(entranceRoad)

  const exitRoad = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 3.2), asphaltMat)
  exitRoad.rotation.x = -Math.PI / 2
  exitRoad.position.set(26.75, 0.012, -2.0)
  exitRoad.receiveShadow = true
  scene.add(exitRoad)

  // 4. Yellow Dashed Center Line Markings
  // Road 0
  for (let x = -22.5; x <= 22.5; x += 3.0) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.06), yellowLineMat)
    dash.rotation.x = -Math.PI / 2
    dash.position.set(x, 0.015, -14.5)
    scene.add(dash)
  }
  // Road 1
  for (let x = -22.5; x <= 22.5; x += 3.0) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.06), yellowLineMat)
    dash.rotation.x = -Math.PI / 2
    dash.position.set(x, 0.015, -6.5)
    scene.add(dash)
  }
  // Road 2
  for (let x = -22.5; x <= 22.5; x += 3.0) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.06), yellowLineMat)
    dash.rotation.x = -Math.PI / 2
    dash.position.set(x, 0.015, 6.5)
    scene.add(dash)
  }
  // Road 3
  for (let x = -22.5; x <= 22.5; x += 3.0) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.06), yellowLineMat)
    dash.rotation.x = -Math.PI / 2
    dash.position.set(x, 0.015, 19.5)
    scene.add(dash)
  }
  // Connector Left
  for (let z = -14.5; z <= 19.5; z += 3.0) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.2), yellowLineMat)
    dash.rotation.x = -Math.PI / 2
    dash.position.set(-24.0, 0.015, z)
    scene.add(dash)
  }
  // Connector Right
  for (let z = -14.5; z <= 19.5; z += 3.0) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.2), yellowLineMat)
    dash.rotation.x = -Math.PI / 2
    dash.position.set(24.0, 0.015, z)
    scene.add(dash)
  }

  // 5. White Border Line Markings
  // Road 0 Borders
  const border0A = new THREE.Mesh(new THREE.PlaneGeometry(48, 0.05), whiteLineMat)
  border0A.rotation.x = -Math.PI / 2
  border0A.position.set(0, 0.014, -16.1)
  scene.add(border0A)

  const border0B = new THREE.Mesh(new THREE.PlaneGeometry(48, 0.05), whiteLineMat)
  border0B.rotation.x = -Math.PI / 2
  border0B.position.set(0, 0.014, -12.9)
  scene.add(border0B)

  // Road 1 Borders
  const border1A = new THREE.Mesh(new THREE.PlaneGeometry(48, 0.05), whiteLineMat)
  border1A.rotation.x = -Math.PI / 2
  border1A.position.set(0, 0.014, -8.1)
  scene.add(border1A)

  const border1B = new THREE.Mesh(new THREE.PlaneGeometry(48, 0.05), whiteLineMat)
  border1B.rotation.x = -Math.PI / 2
  border1B.position.set(0, 0.014, -4.9)
  scene.add(border1B)

  // Road 2 Borders
  const border2A = new THREE.Mesh(new THREE.PlaneGeometry(48, 0.05), whiteLineMat)
  border2A.rotation.x = -Math.PI / 2
  border2A.position.set(0, 0.014, 4.9)
  scene.add(border2A)

  const border2B = new THREE.Mesh(new THREE.PlaneGeometry(48, 0.05), whiteLineMat)
  border2B.rotation.x = -Math.PI / 2
  border2B.position.set(0, 0.014, 8.1)
  scene.add(border2B)

  // Road 3 Borders
  const border3A = new THREE.Mesh(new THREE.PlaneGeometry(48, 0.05), whiteLineMat)
  border3A.rotation.x = -Math.PI / 2
  border3A.position.set(0, 0.014, 17.9)
  scene.add(border3A)

  const border3B = new THREE.Mesh(new THREE.PlaneGeometry(48, 0.05), whiteLineMat)
  border3B.rotation.x = -Math.PI / 2
  border3B.position.set(0, 0.014, 21.1)
  scene.add(border3B)
}

// Global groups and references for dynamic lampposts
const lamppostsGroup = new THREE.Group()
const lamppostLights: { spotlight: THREE.SpotLight; bulb: THREE.Mesh }[] = []

function buildLampposts() {
  if (!scene) return
  lamppostsGroup.clear()
  lamppostLights.length = 0

  // 8 positions for lampposts shifted symmetrically on our wider and deeper deck
  const positions = [
    { x: -24, z: -16.5 },
    { x: 0, z: -16.5 },
    { x: 24, z: -16.5 },
    { x: -24, z: 2.5 },
    { x: 24, z: 2.5 },
    { x: -24, z: 21.5 },
    { x: 0, z: 21.5 },
    { x: 24, z: 21.5 }
  ]

  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Slate 600
    metalness: 0.8,
    roughness: 0.2
  })

  const bulbMat = new THREE.MeshBasicMaterial({
    color: 0xffea75
  })

  positions.forEach((pos) => {
    const post = new THREE.Group()
    post.position.set(pos.x, 0, pos.z)

    // 1. Pole (cylinder)
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 5.0, 8)
    const pole = new THREE.Mesh(poleGeo, poleMat)
    pole.position.y = 2.5
    pole.castShadow = true
    post.add(pole)

    // 2. Horizontal Arm (extending inward towards the center road)
    const armLength = 1.2
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, armLength, 8)
    const arm = new THREE.Mesh(armGeo, poleMat)
    arm.rotation.x = Math.PI / 2
    // Rotate arm inward
    if (pos.z < 0) {
      arm.position.set(0, 5.0, armLength / 2)
    } else {
      arm.position.set(0, 5.0, -armLength / 2)
      arm.rotation.x = -Math.PI / 2
    }
    post.add(arm)

    // 3. Lamp Head
    const headGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.25, 8)
    const head = new THREE.Mesh(headGeo, poleMat)
    const headZ = pos.z < 0 ? armLength : -armLength
    head.position.set(0, 4.9, headZ)
    post.add(head)

    // 4. Glowing Bulb sphere
    const bulbGeo = new THREE.SphereGeometry(0.15, 8, 8)
    const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat)
    bulbMesh.position.set(0, 4.75, headZ)
    post.add(bulbMesh)

    // 5. Spotlight pointing down onto the lanes (brightened and widened)
    const spotlight = new THREE.SpotLight(0xfff7d6, 0, 32, Math.PI / 3.0, 0.6, 1.0)
    spotlight.position.set(0, 4.7, headZ)
    
    // Target pointing directly down
    const target = new THREE.Object3D()
    target.position.set(0, 0, headZ + (pos.z < 0 ? 1 : -1))
    post.add(target)
    spotlight.target = target
    
    spotlight.castShadow = true
    spotlight.shadow.mapSize.width = 512
    spotlight.shadow.mapSize.height = 512
    spotlight.shadow.bias = -0.002
    post.add(spotlight)

    lamppostsGroup.add(post)
    lamppostLights.push({ spotlight, bulb: bulbMesh })
  })

  scene.add(lamppostsGroup)
}

// Global building cores references
let buildingCoreMesh: THREE.Mesh | null = null

function buildEntranceGate() {
  if (!scene) return

  const gateGroup = new THREE.Group()
  gateGroup.position.set(-26.0, 0, 0) // Placement next to entrance road

  const isNight = timeOfDay.value < 6.0 || timeOfDay.value > 18.0

  // 1. Technical Cabinet Box (Yellow/Orange barie box)
  const cabinetGeo = new THREE.BoxGeometry(0.55, 1.0, 0.55)
  const cabinetMat = new THREE.MeshStandardMaterial({
    color: 0xf97316, // Orange/Yellow cabinet
    metalness: 0.7,
    roughness: 0.3
  })
  const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat)
  cabinet.position.set(0, 0.5, 0)
  cabinet.castShadow = true
  cabinet.receiveShadow = true
  gateGroup.add(cabinet)

  // 2. Concrete Pillar on the opposite side of the road
  const pillarGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.8, 8)
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Slate 600
    metalness: 0.2,
    roughness: 0.8
  })
  const pillar = new THREE.Mesh(pillarGeo, pillarMat)
  pillar.position.set(0, 0.4, 4.0) // Positioned across the road lane
  pillar.castShadow = true
  gateGroup.add(pillar)

  // 3. Security Guard Booth (Nhà Bảo Vệ)
  const boothGroup = new THREE.Group()
  boothGroup.position.set(0, 0, -1.5) // Placed on the left side, behind the cabinet

  // Booth cabin base
  const boothBaseGeo = new THREE.BoxGeometry(1.2, 0.1, 1.2)
  const boothBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
  const boothBase = new THREE.Mesh(boothBaseGeo, boothBaseMat)
  boothBase.position.y = 0.05
  boothBase.receiveShadow = true
  boothGroup.add(boothBase)

  // Glass cabin body
  const boothBodyGeo = new THREE.BoxGeometry(1.0, 1.8, 1.0)
  const boothBodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0ea5e9,
    transparent: true,
    opacity: 0.4,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.8
  })
  const boothBody = new THREE.Mesh(boothBodyGeo, boothBodyMat)
  boothBody.position.y = 1.0
  boothBody.castShadow = true
  boothGroup.add(boothBody)

  // Booth Flat Roof
  const boothRoofGeo = new THREE.BoxGeometry(1.3, 0.1, 1.3)
  const boothRoof = new THREE.Mesh(boothRoofGeo, boothBaseMat)
  boothRoof.position.y = 1.95
  boothRoof.castShadow = true
  boothGroup.add(boothRoof)

  // Guard character seat simulator (small box inside booth)
  const seatGeo = new THREE.BoxGeometry(0.4, 0.5, 0.4)
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b })
  const seat = new THREE.Mesh(seatGeo, seatMat)
  seat.position.set(0, 0.35, 0)
  boothGroup.add(seat)

  // Booth Interior Light (PointLight) glowing at night
  const boothLight = new THREE.PointLight(0xfff7d6, isNight ? 2.0 : 0.0, 4)
  boothLight.position.set(0, 1.5, 0)
  boothLight.castShadow = true
  boothGroup.add(boothLight)
  
  guardBoothLightRef = boothLight
  gateGroup.add(boothGroup)

  // 4. Modern Archway Structure (Cổng chào) - Beautiful & Prominent
  const archGroup = new THREE.Group()
  const columnMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Slate 800 dark metallic
    metalness: 0.8,
    roughness: 0.2
  })

  // Left Column
  const leftColGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.6, 8)
  const leftCol = new THREE.Mesh(leftColGeo, columnMat)
  leftCol.position.set(0, 1.8, -0.6)
  leftCol.castShadow = true
  archGroup.add(leftCol)

  // Right Column
  const rightColGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.6, 8)
  const rightCol = new THREE.Mesh(rightColGeo, columnMat)
  rightCol.position.set(0, 1.8, 4.6)
  rightCol.castShadow = true
  archGroup.add(rightCol)

  // Overhead cross-beam
  const beamGeo = new THREE.BoxGeometry(0.3, 0.3, 5.2)
  const beam = new THREE.Mesh(beamGeo, columnMat)
  beam.position.set(0, 3.65, 2.0)
  beam.castShadow = true
  archGroup.add(beam)

  // LED signage plate on cross-beam
  const signageGeo = new THREE.BoxGeometry(0.05, 0.6, 3.0)
  const signageMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5
  })
  const signage = new THREE.Mesh(signageGeo, signageMat)
  signage.position.set(0.15, 3.65, 2.0)
  archGroup.add(signage)

  // Glowing Text Board representing "ENTERPRISE GATE" - cyan glow bar
  const textBarGeo = new THREE.BoxGeometry(0.02, 0.2, 2.5)
  const textBarMat = new THREE.MeshBasicMaterial({
    color: 0x00f3ff, // glowing cyan
    transparent: true,
    opacity: 0.95
  })
  const textBar = new THREE.Mesh(textBarGeo, textBarMat)
  textBar.position.set(0.19, 3.65, 2.0)
  archGroup.add(textBar)

  // Arch Down-Spotlight (illuminates the car stopping at the barie)
  const archSpotlight = new THREE.SpotLight(0xffffff, isNight ? 8.0 : 0.0, 15, Math.PI / 4, 0.5, 1.0)
  archSpotlight.position.set(0, 3.4, 2.0)
  const archTarget = new THREE.Object3D()
  archTarget.position.set(0, 0, 2.0)
  archGroup.add(archTarget)
  archSpotlight.target = archTarget
  archSpotlight.castShadow = true
  archGroup.add(archSpotlight)
  
  archSpotlightRef = archSpotlight
  gateGroup.add(archGroup)

  // 5. LED Welcome standee monolith
  const monolithGroup = new THREE.Group()
  monolithGroup.position.set(0.3, 0, 4.5)

  const monolithGeo = new THREE.BoxGeometry(0.15, 1.1, 0.4)
  const monolith = new THREE.Mesh(monolithGeo, columnMat)
  monolith.position.y = 0.55
  monolith.castShadow = true
  monolithGroup.add(monolith)

  // Green welcome screen
  const welcomeScreenGeo = new THREE.BoxGeometry(0.04, 0.3, 0.3)
  const welcomeScreenMat = new THREE.MeshBasicMaterial({
    color: 0x10b981 // glowing green
  })
  const welcomeScreen = new THREE.Mesh(welcomeScreenGeo, welcomeScreenMat)
  welcomeScreen.position.set(-0.06, 0.85, 0)
  monolithGroup.add(welcomeScreen)

  gateGroup.add(monolithGroup)

  // 6. Rotational Pivot for the barrier arm
  const pivot = new THREE.Group()
  pivot.position.set(0, 0.85, 0.25) // Mounted on the side of cabinet

  // 7. Barrier Arm (Red-White striped bar)
  const armGroup = new THREE.Group()
  const armLength = 3.6
  const segmentLength = armLength / 6
  
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 })
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })

  for (let i = 0; i < 6; i++) {
    const segmentGeo = new THREE.BoxGeometry(0.06, 0.08, segmentLength - 0.01)
    const segment = new THREE.Mesh(segmentGeo, (i % 2 === 0) ? redMat : whiteMat)
    // Offset segment along Z axis
    segment.position.set(0, 0, segmentLength / 2 + i * segmentLength)
    segment.castShadow = true
    armGroup.add(segment)
  }

  pivot.add(armGroup)
  gateGroup.add(pivot)
  
  barrierArmMesh = pivot as any

  scene.add(gateGroup)
}

function buildExitGate() {
  if (!scene) return

  const gateGroup = new THREE.Group()
  gateGroup.position.set(26.0, 0, 0) // Placement next to exit road

  const isNightVal = timeOfDay.value < 6.0 || timeOfDay.value > 18.0

  // 1. Technical Cabinet Box (Yellow/Orange barie box)
  const cabinetGeo = new THREE.BoxGeometry(0.55, 1.0, 0.55)
  const cabinetMat = new THREE.MeshStandardMaterial({
    color: 0xf97316, // Orange/Yellow cabinet
    metalness: 0.7,
    roughness: 0.3
  })
  const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat)
  cabinet.position.set(0, 0.5, 0)
  cabinet.castShadow = true
  cabinet.receiveShadow = true
  gateGroup.add(cabinet)

  // 2. Concrete Pillar on the opposite side of the road (at Z = -4.0)
  const pillarGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.8, 8)
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Slate 600
    metalness: 0.2,
    roughness: 0.8
  })
  const pillar = new THREE.Mesh(pillarGeo, pillarMat)
  pillar.position.set(0, 0.4, -4.0) // Positioned across the road lane
  pillar.castShadow = true
  gateGroup.add(pillar)

  // 3. Automated Terminal (Bốt Quét Thẻ / Thanh Toán Tự Động)
  const boothGroup = new THREE.Group()
  boothGroup.position.set(0, 0, 1.5) // Placed on positive Z, behind the cabinet

  // Terminal base
  const boothBaseGeo = new THREE.BoxGeometry(1.0, 0.1, 1.0)
  const boothBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 })
  const boothBase = new THREE.Mesh(boothBaseGeo, boothBaseMat)
  boothBase.position.y = 0.05
  boothBase.receiveShadow = true
  boothGroup.add(boothBase)

  // High-tech terminal body (cyan metallic shell)
  const boothBodyGeo = new THREE.BoxGeometry(0.8, 1.8, 0.8)
  const boothBodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0ea5e9, // Glowing Cyan
    transparent: true,
    opacity: 0.45,
    metalness: 0.4,
    roughness: 0.1,
    transmission: 0.75
  })
  const boothBody = new THREE.Mesh(boothBodyGeo, boothBodyMat)
  boothBody.position.y = 1.0
  boothBody.castShadow = true
  boothGroup.add(boothBody)

  // Terminal flat roof
  const boothRoofGeo = new THREE.BoxGeometry(1.1, 0.1, 1.1)
  const boothRoof = new THREE.Mesh(boothRoofGeo, boothBaseMat)
  boothRoof.position.y = 1.95
  boothRoof.castShadow = true
  boothGroup.add(boothRoof)

  // Glowing Screen simulator
  const screenGeo = new THREE.BoxGeometry(0.02, 0.4, 0.5)
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff })
  const screen = new THREE.Mesh(screenGeo, screenMat)
  screen.position.set(-0.41, 1.3, 0)
  boothGroup.add(screen)

  // Terminal Interior Light
  const boothLight = new THREE.PointLight(0x00f3ff, isNightVal ? 2.0 : 0.0, 4)
  boothLight.position.set(0, 1.5, 0)
  boothLight.castShadow = true
  boothGroup.add(boothLight)
  
  exitBoothLightRef = boothLight
  gateGroup.add(boothGroup)

  // 4. Modern Archway Structure (Cổng chào lối ra)
  const archGroup = new THREE.Group()
  const columnMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Slate 800 dark metallic
    metalness: 0.8,
    roughness: 0.2
  })

  // Left Column
  const leftColGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.6, 8)
  const leftCol = new THREE.Mesh(leftColGeo, columnMat)
  leftCol.position.set(0, 1.8, 0.6)
  leftCol.castShadow = true
  archGroup.add(leftCol)

  // Right Column
  const rightColGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.6, 8)
  const rightCol = new THREE.Mesh(rightColGeo, columnMat)
  rightCol.position.set(0, 1.8, -4.6)
  rightCol.castShadow = true
  archGroup.add(rightCol)

  // Overhead cross-beam
  const beamGeo = new THREE.BoxGeometry(0.3, 0.3, 5.2)
  const beam = new THREE.Mesh(beamGeo, columnMat)
  beam.position.set(0, 3.65, -2.0)
  beam.castShadow = true
  archGroup.add(beam)

  // LED signage plate on cross-beam
  const signageGeo = new THREE.BoxGeometry(0.05, 0.6, 3.0)
  const signageMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5
  })
  const signage = new THREE.Mesh(signageGeo, signageMat)
  signage.position.set(-0.15, 3.65, -2.0)
  archGroup.add(signage)

  // Glowing Text Board representing "EXIT GATE" - neon red/orange glow bar
  const textBarGeo = new THREE.BoxGeometry(0.02, 0.2, 2.5)
  const textBarMat = new THREE.MeshBasicMaterial({
    color: 0xff3b30, // glowing red-orange
    transparent: true,
    opacity: 0.95
  })
  const textBar = new THREE.Mesh(textBarGeo, textBarMat)
  textBar.position.set(-0.19, 3.65, -2.0)
  archGroup.add(textBar)

  // Arch Down-Spotlight
  const archSpotlight = new THREE.SpotLight(0xffffff, isNightVal ? 8.0 : 0.0, 15, Math.PI / 4, 0.5, 1.0)
  archSpotlight.position.set(0, 3.4, -2.0)
  const archTarget = new THREE.Object3D()
  archTarget.position.set(0, 0, -2.0)
  archGroup.add(archTarget)
  archSpotlight.target = archTarget
  archSpotlight.castShadow = true
  archGroup.add(archSpotlight)
  
  exitArchSpotlightRef = archSpotlight
  gateGroup.add(archGroup)

  // 5. LED Welcome standee monolith
  const monolithGroup = new THREE.Group()
  monolithGroup.position.set(-0.3, 0, -4.5)

  const monolithGeo = new THREE.BoxGeometry(0.15, 1.1, 0.4)
  const monolith = new THREE.Mesh(monolithGeo, columnMat)
  monolith.position.y = 0.55
  monolith.castShadow = true
  monolithGroup.add(monolith)

  // Green welcome screen showing "THANK YOU / GO"
  const welcomeScreenGeo = new THREE.BoxGeometry(0.04, 0.3, 0.3)
  const welcomeScreenMat = new THREE.MeshBasicMaterial({
    color: 0x10b981 // glowing emerald green
  })
  const welcomeScreen = new THREE.Mesh(welcomeScreenGeo, welcomeScreenMat)
  welcomeScreen.position.set(0.06, 0.85, 0)
  monolithGroup.add(welcomeScreen)

  gateGroup.add(monolithGroup)

  // 6. Rotational Pivot for the barrier arm
  const pivot = new THREE.Group()
  pivot.position.set(0, 0.85, -0.25) // Mounted on the side of cabinet

  // 7. Barrier Arm (Red-White striped bar)
  const armGroup = new THREE.Group()
  const armLength = 3.6
  const segmentLength = armLength / 6
  
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 })
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })

  for (let i = 0; i < 6; i++) {
    const segmentGeo = new THREE.BoxGeometry(0.06, 0.08, segmentLength - 0.01)
    const segment = new THREE.Mesh(segmentGeo, (i % 2 === 0) ? redMat : whiteMat)
    // Offset segment along negative Z axis
    segment.position.set(0, 0, -(segmentLength / 2 + i * segmentLength))
    segment.castShadow = true
    armGroup.add(segment)
  }

  pivot.add(armGroup)
  gateGroup.add(pivot)
  
  exitBarrierArmMesh = pivot as any

  scene.add(gateGroup)
}

function buildCompanyBuilding() {
  if (!scene) return

  const buildingGroup = new THREE.Group()
  // Main office building shifted further back to Z = -25.5 (instead of -28.5) to give spacious spacing
  const bW = 34, bH = 10, bD = 6
  buildingGroup.position.set(0, 0, -25.5)

  // 1. Steel structural frame (Black pillars and horizontal beams)
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a, // Slate 900
    metalness: 0.95,
    roughness: 0.1
  })

  // 2. Reflective Sky Glass sheets (physical glass shader)
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0ea5e9, // Cyan glass hue
    metalness: 0.1,
    roughness: 0.03,
    transparent: true,
    opacity: 0.45,
    transmission: 0.75,
    ior: 1.5,
    side: THREE.DoubleSide
  })

  // Main glass structure block
  const structureGeo = new THREE.BoxGeometry(bW, bH, bD)
  const structureMesh = new THREE.Mesh(structureGeo, glassMat)
  structureMesh.position.y = bH / 2
  structureMesh.castShadow = true
  structureMesh.receiveShadow = true
  buildingGroup.add(structureMesh)

  // Office floors partitions (draw horizontal floor levels)
  const floorHeight = bH / 4
  for (let i = 1; i <= 3; i++) {
    const slabGeo = new THREE.BoxGeometry(bW + 0.1, 0.15, bD + 0.1)
    const slab = new THREE.Mesh(slabGeo, frameMat)
    slab.position.set(0, i * floorHeight, 0)
    buildingGroup.add(slab)
  }

  // Vertical facade columns (modern architectural derrick columns)
  for (let i = -5; i <= 5; i++) {
    const colGeo = new THREE.CylinderGeometry(0.1, 0.1, bH, 8)
    const col = new THREE.Mesh(colGeo, frameMat)
    col.position.set((i * bW) / 10.5, bH / 2, bD / 2 + 0.05)
    col.castShadow = true
    buildingGroup.add(col)
  }

  // Glowing core interior plate (simulates illuminated office windows at night)
  const coreGeo = new THREE.BoxGeometry(bW - 1.0, bH - 0.5, bD - 1.0)
  const coreMesh = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({
    color: 0xfff0b8, // warm light yellow
    transparent: true,
    opacity: 0.08
  }))
  coreMesh.position.set(0, bH / 2, 0)
  buildingGroup.add(coreMesh)
  buildingCoreMesh = coreMesh

  // High-tech logo on top: "PARKING TWIN CORP"
  const logoBarGeo = new THREE.BoxGeometry(10, 0.5, 0.1)
  const logoBar = new THREE.Mesh(logoBarGeo, frameMat)
  logoBar.position.set(0, bH + 0.35, bD / 2 - 0.2)
  buildingGroup.add(logoBar)

  const logoTextMat = new THREE.MeshBasicMaterial({
    color: 0x00f3ff // glowing cyan
  })
  const letterGeo = new THREE.BoxGeometry(8.5, 0.25, 0.12)
  const letterMesh = new THREE.Mesh(letterGeo, logoTextMat)
  letterMesh.position.set(0, bH + 0.35, bD / 2)
  buildingGroup.add(letterMesh)

  scene.add(buildingGroup)
}


function updateSystemTime() {
  if (autoSyncTime.value) {
    const now = new Date()
    timeOfDay.value = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
  }
}

// Rebuild static cars when simulated time transitions day/night
let wasNight = timeOfDay.value < 6.0 || timeOfDay.value > 18.0
watch(timeOfDay, (newVal) => {
  const isNightNow = newVal < 6.0 || newVal > 18.0
  if (isNightNow !== wasNight) {
    wasNight = isNightNow
    syncCars()
  }
})

function updateEnvironmentLighting() {
  if (!scene || !renderer) return

  const hour = timeOfDay.value
  const angle = ((hour - 6) / 24) * Math.PI * 2
  const isDay = hour >= 6.0 && hour <= 18.0

  let skyColor: THREE.Color
  let ambientColor: THREE.Color
  let sunColor: THREE.Color
  let sunIntensity: number
  let ambientIntensity: number

  if (isDay) {
    let t = 0
    if (hour < 8.0) {
      t = (hour - 6.0) / 2.0
      skyColor = new THREE.Color().lerpColors(new THREE.Color(0x1a1235), new THREE.Color(0xfdba74), t)
      ambientColor = new THREE.Color(0xddb4f0)
      sunColor = new THREE.Color(0xfdbb2d)
      sunIntensity = 1.0 * t + 0.2
      ambientIntensity = 0.5 * t + 0.3
    } else if (hour > 16.0) {
      t = (18.0 - hour) / 2.0
      skyColor = new THREE.Color().lerpColors(new THREE.Color(0x1a1235), new THREE.Color(0xfc6767), t)
      ambientColor = new THREE.Color(0xf0abfc)
      sunColor = new THREE.Color(0xf59e0b)
      sunIntensity = 1.0 * t + 0.2
      ambientIntensity = 0.5 * t + 0.3
    } else {
      skyColor = new THREE.Color(0xf1f5f9)
      ambientColor = new THREE.Color(0xe0f2fe)
      sunColor = new THREE.Color(0xffffff)
      sunIntensity = 2.0
      ambientIntensity = 0.9
    }
  } else {
    // Night/Evening brightened for perfect legibility (as requested)
    skyColor = new THREE.Color(0x0c1630)
    ambientColor = new THREE.Color(0x2f2a6f) // warmer and brighter indigo
    sunColor = new THREE.Color(0xa5cbf7)
    sunIntensity = 0.55 // increased intensity
    ambientIntensity = 0.75 // increased ambient fill light
  }

  // Update floor concrete slab color dynamically based on time of day
  if (floorMesh) {
    const mat = floorMesh.material as THREE.MeshStandardMaterial
    if (isDay) {
      let t = 1.0
      if (hour < 8.0) {
        t = (hour - 6.0) / 2.0
      } else if (hour > 16.0) {
        t = (18.0 - hour) / 2.0
      }
      mat.color.copy(new THREE.Color(0x0f172a).lerp(new THREE.Color(0xcbd5e1), t))
    } else {
      mat.color.setHex(0x0f172a)
    }
  }

  scene.background = skyColor
  if (scene.fog) {
    scene.fog.color = skyColor
  }

  if (ambientLight) {
    ambientLight.color = ambientColor
    ambientLight.intensity = ambientIntensity
  }

  if (dirLight) {
    dirLight.color = sunColor
    dirLight.intensity = sunIntensity
    const sunY = Math.max(25 * Math.sin(angle), -5)
    dirLight.position.set(25 * Math.cos(angle), sunY, 10)
    dirLight.castShadow = sunY > 0
  }

  const lamppostsActive = !isDay
  lamppostLights.forEach(({ spotlight, bulb }) => {
    if (lamppostsActive) {
      bulb.material.color.setHex(0xfff7d6)
      // Pulse brightened for vibrant night aesthetics
      const pulse = 9.0 + Math.sin(Date.now() * 0.003) * 1.5
      spotlight.intensity = pulse
      spotlight.visible = true
    } else {
      bulb.material.color.setHex(0x555555)
      spotlight.intensity = 0
      spotlight.visible = false
    }
  })

  // 5. Update Company office windows light emission
  if (buildingCoreMesh) {
    const isNightTime = !isDay
    const material = buildingCoreMesh.material as THREE.MeshBasicMaterial
    material.opacity = isNightTime ? 0.35 : 0.08
  }

  // 6. Update Entrance & Exit Gate Security booth and Arch lights
  if (guardBoothLightRef) {
    guardBoothLightRef.intensity = !isDay ? 2.0 : 0.0
  }
  if (archSpotlightRef) {
    archSpotlightRef.intensity = !isDay ? 8.0 : 0.0
  }
  if (exitBoothLightRef) {
    exitBoothLightRef.intensity = !isDay ? 2.0 : 0.0
  }
  if (exitArchSpotlightRef) {
    exitArchSpotlightRef.intensity = !isDay ? 8.0 : 0.0
  }
}

// Draw neon-lit parking slots outlines
function buildParkingSlots() {
  slotsGroup.clear()
  slotBoundingBoxes.clear()
  slotIndicatorPlanes.clear()
  slotSensorMeshes.clear()

  const emptyMat = new THREE.MeshBasicMaterial({
    color: 0x10b981, // Neon Emerald Green
    transparent: true,
    opacity: 0.02, // Match ground color perfectly by keeping it almost completely transparent
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

    // Add small glowing circular IoT sensor disk in the center of the slot
    const sensorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.02, 16)
    const sensorMat = new THREE.MeshBasicMaterial({
      color: 0x10b981, // Glowing emerald green
      transparent: true,
      opacity: 0.8
    })
    const sensor = new THREE.Mesh(sensorGeo, sensorMat)
    sensor.position.set(coords.x, coords.y + 0.01, coords.z)
    sensor.visible = !slot.occupied
    slotsGroup.add(sensor)
    slotSensorMeshes.set(slot.id, sensor)

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

  const isNightVal = timeOfDay.value < 6.0 || timeOfDay.value > 18.0

  props.slots.forEach(slot => {
    // Only place a static car if occupied AND there is no ongoing animation for it
    const isAnimating = activeAnimations.value.some(anim => anim.slotId === slot.id)
    if (slot.occupied && !isAnimating) {
      const coords = getSlotCoords(slot.id)
      const car = createProceduralCar(slot.carColor || 'silver', slot.carType || 'Sedan', isNightVal)
      
      car.position.set(coords.x, coords.y, coords.z)
      car.rotation.y = coords.rotY
      
      carsGroup.add(car)
      active3dCars.set(slot.id, car)
    }

    // Update IoT sensor disk and indicator plane visibility
    const sensor = slotSensorMeshes.get(slot.id)
    if (sensor) {
      sensor.visible = !slot.occupied
    }
  })
}

// React to slot property changes (Entrance / Departure animations)
watch(() => props.slots, (newSlots: Slot[]) => {
  // Check if this is the first execution (initialize states)
  if (lastOccupiedStates.size === 0) {
    newSlots.forEach(s => {
      lastOccupiedStates.set(s.id, s.occupied)
    })
    buildParkingSlots()
    syncCars()
    return
  }

  // Detect differences based on cached last occupied states
  newSlots.forEach((newSlot) => {
    const wasOccupied = lastOccupiedStates.get(newSlot.id)
    if (wasOccupied === undefined) {
      // New slot found, initialize it
      lastOccupiedStates.set(newSlot.id, newSlot.occupied)
      return
    }

    // Empty -> Occupied (Car Enters!)
    if (!wasOccupied && newSlot.occupied) {
      triggerEntryAnimation(newSlot)
      lastOccupiedStates.set(newSlot.id, true)
    } 
    // Occupied -> Empty (Car Leaves!)
    else if (wasOccupied && !newSlot.occupied) {
      triggerExitAnimation(newSlot)
      lastOccupiedStates.set(newSlot.id, false)
    }
    // Color/Type changed while occupied
    else if (newSlot.occupied) {
      const staticCar = active3dCars.get(newSlot.id)
      if (staticCar) {
        // If static car parameters don't match, reload cars
        syncCars()
      }
    }
  })

  // Synchronize indicator plane and sensor disk visibilities
  props.slots.forEach(slot => {
    const plane = slotIndicatorPlanes.get(slot.id)
    if (plane) {
      plane.visible = !slot.occupied
    }
    const sensor = slotSensorMeshes.get(slot.id)
    if (sensor) {
      sensor.visible = !slot.occupied
    }
  })
}, { deep: true })

// Helper to immediately cancel and clear slot active elements
function clearSlotStatus(slotId: string) {
  // 1. Remove static car
  const staticCar = active3dCars.get(slotId)
  if (staticCar) {
    carsGroup.remove(staticCar)
    active3dCars.delete(slotId)
  }

  // 2. Cancel and remove any ongoing animations for this slot to prevent overlapping duplicate cars
  const ongoing = activeAnimations.value.filter(a => a.slotId === slotId)
  ongoing.forEach(anim => {
    animCarsGroup.remove(anim.carGroup)
  })
  activeAnimations.value = activeAnimations.value.filter(a => a.slotId !== slotId)
}

// Set up entering path
function triggerEntryAnimation(slot: Slot) {
  // Cancel any lingering animations or static cars for this slot first
  clearSlotStatus(slot.id)

  const coords = getSlotCoords(slot.id)
  const laneZ = getLaneZ(slot.id)

  // Entrance Spawn: X=-29.5, Z=2.0 (aligned with entry gate road centered at Z=2.0)
  const p0 = new THREE.Vector3(-29.5, 0.05, 2.0)
  const p1 = new THREE.Vector3(-24.0, 0.05, 2.0) // Connector road center
  const p2 = new THREE.Vector3(-24.0, 0.05, laneZ)
  const p3 = new THREE.Vector3(coords.x, 0.05, laneZ)
  const p4 = new THREE.Vector3(coords.x, 0.05, coords.z)

  const path = [p0, p1, p2, p3, p4]

  const isNightVal = timeOfDay.value < 6.0 || timeOfDay.value > 18.0
  const car = createProceduralCar(slot.carColor || 'silver', slot.carType || 'Sedan', isNightVal)
  car.position.copy(p0)
  animCarsGroup.add(car)

  // Hide the plane slot indicator and circular sensor immediately
  const plane = slotIndicatorPlanes.get(slot.id)
  if (plane) plane.visible = false
  const sensor = slotSensorMeshes.get(slot.id)
  if (sensor) sensor.visible = false

  activeAnimations.value.push({
    id: `anim-in-${slot.id}-${Date.now()}`,
    carGroup: car,
    path,
    progress: 0,
    speed: 0.14, // progress increments per second (reduced from 0.35 for smooth realistic motion)
    slotId: slot.id,
    isEntering: true,
    carData: { color: slot.carColor || 'silver', type: slot.carType || 'Sedan' }
  })
}

// Set up leaving path
function triggerExitAnimation(slot: Slot) {
  // Cancel any lingering animations or static cars for this slot first
  clearSlotStatus(slot.id)

  const coords = getSlotCoords(slot.id)
  const laneZ = getLaneZ(slot.id)

  const p0 = new THREE.Vector3(coords.x, 0.05, coords.z)
  const p1 = new THREE.Vector3(coords.x, 0.05, laneZ)
  const p2 = new THREE.Vector3(24.0, 0.05, laneZ)
  const p3 = new THREE.Vector3(24.0, 0.05, -2.0) // Connector road center to exit gate Z=-2.0
  const p4 = new THREE.Vector3(29.5, 0.05, -2.0) // Exit disappearing point at X=29.5

  const path = [p0, p1, p2, p3, p4]

  const isNightVal = timeOfDay.value < 6.0 || timeOfDay.value > 18.0
  const car = createProceduralCar(slot.carColor || 'silver', slot.carType || 'Sedan', isNightVal)
  car.position.copy(p0)
  car.rotation.y = coords.rotY
  animCarsGroup.add(car)

  // Show indicator plane and circular sensor disk immediately
  const plane = slotIndicatorPlanes.get(slot.id)
  if (plane) plane.visible = true
  const sensor = slotSensorMeshes.get(slot.id)
  if (sensor) sensor.visible = true

  activeAnimations.value.push({
    id: `anim-out-${slot.id}-${Date.now()}`,
    carGroup: car,
    path,
    progress: 0,
    speed: 0.15, // Reduced from 0.38 for smooth realistic motion
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

  // Update clock simulation
  updateSystemTime()

  // Update environmental lighting animations
  updateEnvironmentLighting()

  // 1. Process active path animations
  updateCarAnimations(delta)

  // Smoothly interpolate entrance barrier gate arm rotation
  if (barrierArmMesh) {
    const diff = barrierAngleTarget - barrierAngleCurrent
    if (Math.abs(diff) > 0.01) {
      barrierAngleCurrent += diff * 4.0 * delta // Rotate arm at 4 rad/sec speed
      barrierArmMesh.rotation.x = barrierAngleCurrent
    }
  }

  // Smoothly interpolate exit barrier gate arm rotation
  if (exitBarrierArmMesh) {
    const diff = exitBarrierAngleTarget - exitBarrierAngleCurrent
    if (Math.abs(diff) > 0.01) {
      exitBarrierAngleCurrent += diff * 4.0 * delta // Rotate arm at 4 rad/sec speed
      exitBarrierArmMesh.rotation.x = exitBarrierAngleCurrent
    }
  }

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
    // 1. Calculate segment-level values first to know our speed profile
    const numSegments = anim.path.length - 1
    const totalProgress = anim.progress * numSegments
    const currentSegment = Math.min(Math.floor(totalProgress), numSegments - 1)
    const segmentProgress = totalProgress - currentSegment

    let currentSpeed = anim.speed

    // 2. Automated Entrance Barrier Control (Contactless RFID entry - no halt required!)
    if (anim.isEntering && currentSegment === 0) {
      const carX = anim.carGroup.position.x
      if (carX >= -28.0 && carX <= -24.5) {
        barrierAngleTarget = -Math.PI / 2 // Lift barrier up as car approaches
      } else if (carX > -24.5) {
        barrierAngleTarget = 0.0 // Close barrier after car passes
      }
    }

    // Automated Exit Barrier Control (Contactless RFID exit - no halt required!)
    if (!anim.isEntering && currentSegment === 3) {
      const carX = anim.carGroup.position.x
      if (carX >= 24.5 && carX <= 28.0) {
        exitBarrierAngleTarget = Math.PI / 2 // Lift barrier up as car approaches
      } else if (carX > 28.0) {
        exitBarrierAngleTarget = 0.0 // Close barrier after car passes
      }
    }

    // 3. Life-like Physics Speed Profiling based on path segments
    if (anim.waitingAtGate) {
      // already profiled
    } else if (currentSegment === numSegments - 1) {
      if (anim.isEntering) {
        // Decelerate smoothly while backing/parking into slot
        currentSpeed = anim.speed * Math.max(0.18, 0.95 * (1.0 - segmentProgress))
      } else {
        // Exiting cars maintain speed and leave cleanly (do not decelerate at the end of the road!)
        currentSpeed = anim.speed * 1.2
      }
    } else if (currentSegment === 1 || currentSegment === 3) {
      // Slow down at curves (reduced from 0.42 to 0.25 for extremely smooth transitions)
      currentSpeed = anim.speed * 0.25
    } else if (currentSegment === 2) {
      // Accelerate on straight lanes!
      currentSpeed = anim.speed * 1.25
    }

    // 4. Progress increment
    anim.progress += currentSpeed * delta

    if (anim.progress >= 1.0) {
      // Completed!
      anim.progress = 1.0
      completedIds.push(anim.id)
      
      // Finalize and remove mesh from anim group and scene
      animCarsGroup.remove(anim.carGroup)
      if (scene) scene.remove(anim.carGroup)

      // Fail-safe: Hide mesh deep under the floor and set invisible so it can NEVER be seen
      anim.carGroup.position.set(0, -100, 0)
      anim.carGroup.visible = false

      // Dispose of geometries and materials to avoid WebGL memory leaks
      anim.carGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          } else if (child.material) {
            child.material.dispose()
          }
        }
      })

      if (anim.isEntering) {
        // Place permanent static car in scene
        const coords = getSlotCoords(anim.slotId)
        const isNightVal = timeOfDay.value < 6.0 || timeOfDay.value > 18.0
        const staticCar = createProceduralCar(anim.carData.color, anim.carData.type, isNightVal)
        staticCar.position.set(coords.x, coords.y, coords.z)
        staticCar.rotation.y = coords.rotY
        carsGroup.add(staticCar)
        active3dCars.set(anim.slotId, staticCar)
      } else {
        // Leaving car disappeared, restore empty green indicator glow and circular sensor
        const plane = slotIndicatorPlanes.get(anim.slotId)
        if (plane) plane.visible = true
        const sensor = slotSensorMeshes.get(anim.slotId)
        if (sensor) sensor.visible = true
      }
    } else {
      // Recalculate segment variables in case progress updated
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
        
        anim.carGroup.rotation.y += diff * 0.08 // damped steering wheel factor (smooth, heavy feel)
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
    camera.position.set(0, 32, 42)
    controls.target.set(0, 0, 2.5)
    controls.update()
  }
}

function setTopDown() {
  if (controls && camera) {
    camera.position.set(0, 48, 2.51)
    controls.target.set(0, 0, 2.5)
    controls.update()
  }
}

function setEntranceView() {
  if (controls && camera) {
    camera.position.set(-29, 8, 8)
    controls.target.set(-20, 0, 2)
    controls.update()
  }
}
</script>

<template>
  <div 
    class="relative w-full rounded-xl overflow-hidden border transition-all duration-300 shadow-2xl group"
    :class="isDark 
      ? 'border-slate-800 bg-slate-950 shadow-cyan-950/20' 
      : 'border-slate-200 bg-white shadow-[0_4px_25px_rgba(0,0,0,0.015)]'"
  >
    <!-- Camera controls shortcut bar -->
    <div class="absolute top-4 left-4 z-20 flex gap-2">
      <button 
        @click="resetCamera" 
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow backdrop-blur-md cursor-pointer"
        :class="isDark 
          ? 'bg-slate-900/80 hover:bg-cyan-900/60 border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-white' 
          : 'bg-white/90 hover:bg-cyan-50/50 border-slate-200 hover:border-cyan-500 text-slate-600 hover:text-cyan-600'"
        :title="t('perspective_view')"
      >
        <i class="pi pi-compass text-cyan-500"></i> {{ t('perspective_view').split(' ')[0] }}
      </button>
      <button 
        @click="setTopDown" 
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow backdrop-blur-md cursor-pointer"
        :class="isDark 
          ? 'bg-slate-900/80 hover:bg-cyan-900/60 border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-white' 
          : 'bg-white/90 hover:bg-cyan-50/50 border-slate-200 hover:border-cyan-500 text-slate-600 hover:text-cyan-600'"
        :title="t('top_down_view')"
      >
        <i class="pi pi-image text-cyan-500"></i> {{ t('top_down_view').split(' ')[0] }}
      </button>
      <button 
        @click="setEntranceView" 
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow backdrop-blur-md cursor-pointer"
        :class="isDark 
          ? 'bg-slate-900/80 hover:bg-cyan-900/60 border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-white' 
          : 'bg-white/90 hover:bg-cyan-50/50 border-slate-200 hover:border-cyan-500 text-slate-600 hover:text-cyan-600'"
        :title="t('entrance_view')"
      >
        <i class="pi pi-sign-in text-cyan-500"></i> {{ t('entrance_view') }}
      </button>
    </div>

    <!-- Time of Day Control Panel in Top Right -->
    <div 
      class="absolute top-4 right-4 z-20 flex flex-col gap-2 p-3 rounded-xl border backdrop-blur-md transition-all duration-300 shadow-lg text-xs"
      :class="isDark 
        ? 'bg-slate-950/80 border-slate-800 text-slate-200 shadow-cyan-950/10' 
        : 'bg-white/90 border-slate-200 text-slate-850 shadow-[0_4px_25px_rgba(0,0,0,0.03)]'"
    >
      <div class="flex items-center justify-between gap-6 font-bold uppercase tracking-wider text-[10px]">
        <span class="flex items-center gap-1.5 text-cyan-600"><i class="pi pi-clock"></i> {{ t('time_of_day') }}</span>
        <label class="flex items-center gap-1 cursor-pointer select-none">
          <input type="checkbox" v-model="autoSyncTime" class="rounded accent-cyan-500 border-slate-300 w-3.5 h-3.5" />
          <span class="text-[9px] uppercase tracking-normal" :class="isDark ? 'text-slate-400' : 'text-slate-500'">Auto</span>
        </label>
      </div>

      <!-- Time Slider -->
      <div class="flex items-center gap-2 mt-1">
        <input 
          type="range" 
          min="0" 
          max="23.99" 
          step="0.1" 
          v-model.number="timeOfDay" 
          :disabled="autoSyncTime"
          class="w-24 h-1 bg-slate-400 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-40" 
        />
        <span class="font-mono font-black shrink-0 w-10 text-right">
          {{ formatHour(timeOfDay) }}
        </span>
      </div>

      <!-- Quick Day/Night toggles -->
      <div class="flex gap-1.5 mt-1.5">
        <button 
          @click="setTime(12.0)"
          class="flex-1 py-1 rounded border text-[9px] font-black uppercase text-center cursor-pointer select-none transition"
          :class="Math.abs(timeOfDay - 12) < 2
            ? 'bg-cyan-500/10 border-cyan-500 text-cyan-600 font-extrabold'
            : (isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100')"
        >
          {{ t('noon') }}
        </button>
        <button 
          @click="setTime(22.0)"
          class="flex-1 py-1 rounded border text-[9px] font-black uppercase text-center cursor-pointer select-none transition"
          :class="Math.abs(timeOfDay - 22) < 2 || timeOfDay < 4
            ? 'bg-cyan-500/10 border-cyan-500 text-cyan-600 font-extrabold'
            : (isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100')"
        >
          {{ t('night') }}
        </button>
      </div>
    </div>

    <!-- UI Overlay for instructions -->
    <div 
      class="absolute bottom-4 right-4 z-20 border rounded-lg px-3 py-2 text-[10px] backdrop-blur-md shadow pointer-events-none transition-all duration-300"
      :class="isDark 
        ? 'bg-slate-900/80 border-slate-800 text-slate-400' 
        : 'bg-white/90 border-slate-200 text-slate-550 text-slate-500'"
    >
      <div class="flex items-center gap-1.5 font-medium"><i class="pi pi-info-circle text-cyan-500"></i> <span>{{ t('instructions_rotate') }}</span></div>
      <div class="flex items-center gap-1.5 font-medium mt-1"><i class="pi pi-pointer text-cyan-500"></i> <span>{{ t('instructions_focus') }}</span></div>
    </div>

    <!-- 3D Canvas Mounting Point -->
    <div ref="containerRef" class="w-full h-[480px] block cursor-grab active:cursor-grabbing"></div>

    <!-- Glowing futuristic Tooltip on hover -->
    <div 
      v-if="tooltipData" 
      ref="tooltipRef"
      class="fixed pointer-events-none z-50 px-4 py-3 rounded-xl border backdrop-blur-lg flex flex-col gap-1 text-xs transition-all duration-150 shadow-xl"
      :class="isDark 
        ? 'border-cyan-500/30 bg-slate-950/95 text-slate-200 shadow-cyan-950/50' 
        : 'border-slate-250 bg-white/95 text-slate-800 shadow-[0_4px_25px_rgba(0,0,0,0.08)]'"
      :style="{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }"
    >
      <div class="flex items-center justify-between gap-6 border-b pb-1.5" :class="isDark ? 'border-slate-800' : 'border-slate-200'">
        <span class="font-extrabold text-cyan-500 text-sm tracking-wide">SLOT {{ tooltipData.id }}</span>
        <span 
          class="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase border"
          :class="tooltipData.occupied ? 'bg-orange-950 text-orange-400 border-orange-500/20' : 'bg-emerald-950 text-emerald-400 border-emerald-500/20'"
        >
          {{ tooltipData.occupied ? t('occupied') : t('vacant') }}
        </span>
      </div>
      
      <template v-if="tooltipData.occupied">
        <div class="flex justify-between gap-4 mt-1"><span class="text-slate-500">{{ t('vehicle_telemetry') === 'Thông Số Phương Tiện' ? 'Loại xe:' : 'Vehicle Type:' }}</span><span class="font-bold uppercase" :class="isDark ? 'text-white' : 'text-slate-700'">{{ tooltipData.carType }}</span></div>
        <div class="flex justify-between gap-4"><span class="text-slate-500">{{ t('vehicle_telemetry') === 'Thông Số Phương Tiện' ? 'Màu xe:' : 'Body Color:' }}</span><span class="font-bold uppercase" :style="{ color: tooltipData.carColor?.toLowerCase() }">{{ tooltipData.carColor }}</span></div>
        <div v-if="tooltipData.timestamp" class="flex justify-between gap-4 border-t mt-1 pt-1.5" :class="isDark ? 'border-slate-900' : 'border-slate-100'"><span class="text-slate-500">{{ t('parked_at') }}:</span><span class="font-mono text-cyan-600">{{ new Date(tooltipData.timestamp).toLocaleTimeString() }}</span></div>
      </template>
      <template v-else>
        <div class="text-slate-500 mt-1 italic flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {{ t('space_empty_desc') }}</div>
      </template>
    </div>

  </div>
</template>

<style scoped>
/* Standard glassmorphic elements styling if required */
</style>
