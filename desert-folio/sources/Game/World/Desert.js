import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { Game } from '../Game.js'
import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'

// A small desert (صحراء) on the dry, flat plain in the north-west of the world: low-poly sand dunes
// you can drive over, date palms and rocks. Colours come only from the game's
// palette, and everything uses the same lighting material as the rest of the
// world, so it sits in the same art style. Every piece is placed on the terrain
// by casting a ray down once the ground collider exists.

const PALETTE = {
    sand: '#ebd1a3',
    sandWarm: '#e49a78',
    bark: '#b36d45',
    barkDark: '#988165',
    stone: '#a49876',
    stoneDark: '#574e37',
    leaf: '#91ad78',
    date: '#e4a90c',
}

// Chosen from a height probe: dry, flat ground away from the other areas and rivers.
const CENTER = { x: -56, z: -40 }

// Seeded random so the layout is the same on every visit.
let seed = 11
function random()
{
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
}

export class Desert
{
    constructor()
    {
        this.game = Game.getInstance()

        this.group = new THREE.Group()
        this.group.name = 'desert'
        this.game.scene.add(this.group)

        this.materials = {}
        for(const [name, hex] of Object.entries(PALETTE))
        {
            const material = new MeshDefaultMaterial({ colorNode: color(hex) })
            material.flatShading = true
            this.materials[name] = material
        }

        this.items = []
        this.setDunes()
        this.setPalms()
        this.setRocks()

        // Seat everything on the ground as soon as the terrain collider answers.
        this.pending = true
        this.tries = 0
        this.tickCallback = () => this.place()
        this.game.ticker.events.on('tick', this.tickCallback, 10)
    }

    addItem(object, x, z, collider)
    {
        object.traverse((child) =>
        {
            if(child.isMesh)
            {
                child.castShadow = true
                child.receiveShadow = true
            }
        })
        object.visible = false
        this.group.add(object)
        this.items.push({ object, x: CENTER.x + x, z: CENTER.z + z, collider })
    }

    setDunes()
    {
        const layout = [
            [0, 0, 11, 2.2, 6, 0.3],
            [-12, 7, 8, 1.7, 5, -0.4],
            [10, 9, 9, 1.9, 5.5, 0.6],
            [-8, -10, 7, 1.4, 4.5, 1.1],
            [13, -8, 8, 1.6, 4, -0.2],
            [-20, -3, 6, 1.2, 4, 0.8],
            [3, 18, 7, 1.3, 4, -0.7],
            [-16, 16, 6, 1.3, 4, 0.2],
            [18, 14, 7, 1.5, 4.5, -1.0],
            [-4, -20, 6, 1.2, 4, 0.4],
        ]
        for(const [x, z, sx, sy, sz, rotation] of layout)
        {
            const geometry = new THREE.IcosahedronGeometry(1, 1)
            // Flatten the underside and push one flank up for a wind-shaped crest.
            const position = geometry.attributes.position
            for(let i = 0; i < position.count; i++)
            {
                let vx = position.getX(i), vy = position.getY(i)
                vy = Math.max(vy, -0.1)
                if(vy > 0)
                    vy *= 1 + Math.max(0, vx) * 0.35
                position.setXYZ(i, vx, vy, position.getZ(i))
            }
            geometry.computeVertexNormals()

            const dune = new THREE.Mesh(geometry, random() > 0.5 ? this.materials.sand : this.materials.sandWarm)
            dune.scale.set(sx * 0.8, sy * 0.9, sz * 0.8)
            dune.rotation.y = rotation

            // Convex hull collider from the scaled, rotated vertices.
            const points = []
            const v = new THREE.Vector3()
            for(let i = 0; i < position.count; i++)
            {
                v.fromBufferAttribute(position, i).multiply(dune.scale).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation)
                points.push(v.x, v.y, v.z)
            }
            this.addItem(dune, x, z, { type: 'hull', points: new Float32Array(points) })
        }
    }

    palm(height)
    {
        const palm = new THREE.Group()
        const segments = 6
        let top = new THREE.Vector3()
        for(let i = 0; i < segments; i++)
        {
            const t0 = i / segments, t1 = (i + 1) / segments
            const p0 = new THREE.Vector3(t0 * t0 * 0.9, t0 * height, 0)
            const p1 = new THREE.Vector3(t1 * t1 * 0.9, t1 * height, 0)
            const direction = p1.clone().sub(p0)
            const segment = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2 - t1 * 0.06, 0.24 - t0 * 0.06, direction.length() * 1.05, 5),
                i % 2 ? this.materials.bark : this.materials.barkDark
            )
            segment.position.copy(p0).lerp(p1, 0.5)
            segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
            palm.add(segment)
            top = p1
        }
        // Fronds: flat, drooping leaves.
        const fronds = 7
        for(let k = 0; k < fronds; k++)
        {
            const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.6, 4), this.materials.leaf)
            leaf.scale.set(1, 1, 0.25)
            const pivot = new THREE.Group()
            pivot.position.copy(top)
            pivot.rotation.y = (k / fronds) * Math.PI * 2
            leaf.position.set(1.1, -0.35, 0)
            leaf.rotation.z = - Math.PI * 0.5 - 0.35
            pivot.add(leaf)
            palm.add(pivot)
        }
        for(let d = 0; d < 5; d++)
        {
            const date = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), this.materials.date)
            const angle = d * 1.3
            date.position.set(top.x + Math.cos(angle) * 0.28, top.y - 0.28, top.z + Math.sin(angle) * 0.28)
            palm.add(date)
        }
        return palm
    }

    setPalms()
    {
        for(const [x, z, height] of [[-4, 12, 5.2], [6, 14, 4.4], [-16, 14, 4.8], [18, 2, 5], [-2, -16, 4.2], [-22, -12, 4.6], [22, 20, 5.1]])
        {
            const palm = this.palm(height)
            palm.rotation.y = random() * Math.PI * 2
            this.addItem(palm, x, z, { type: 'cylinder', halfHeight: height * 0.5, radius: 0.3 })
        }
    }

    setRocks()
    {
        for(let i = 0; i < 9; i++)
        {
            const angle = random() * Math.PI * 2
            const radius = 6 + random() * 18
            const size = 0.5 + random() * 1.1
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), random() > 0.5 ? this.materials.stone : this.materials.stoneDark)
            rock.scale.set(size, size * (0.6 + random() * 0.4), size)
            rock.rotation.set(random(), random() * 6, random())
            this.addItem(rock, Math.cos(angle) * radius, Math.sin(angle) * radius, { type: 'ball', radius: size * 0.8 })
        }
    }

    groundAt(x, z)
    {
        const RAPIER = this.game.RAPIER
        const world = this.game.physics?.world
        if(!RAPIER || !world)
            return null
        const ray = new RAPIER.Ray({ x, y: 60, z }, { x: 0, y: -1, z: 0 })
        const hit = world.castRay(ray, 120, true)
        return hit ? 60 - hit.timeOfImpact : null
    }

    place()
    {
        if(!this.pending)
            return

        this.tries++
        const probe = this.groundAt(CENTER.x, CENTER.z)
        if(probe === null && this.tries < 120)
            return

        const RAPIER = this.game.RAPIER
        const world = this.game.physics.world
        for(const item of this.items)
        {
            const y = this.groundAt(item.x, item.z) ?? 0
            item.object.position.set(item.x, y, item.z)
            item.object.visible = true

            const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(item.x, y, item.z))
            let description = null
            if(item.collider.type === 'hull')
                description = RAPIER.ColliderDesc.convexHull(item.collider.points)
            else if(item.collider.type === 'cylinder')
                description = RAPIER.ColliderDesc.cylinder(item.collider.halfHeight, item.collider.radius).setTranslation(0, item.collider.halfHeight, 0)
            else if(item.collider.type === 'ball')
                description = RAPIER.ColliderDesc.ball(item.collider.radius)
            if(description)
                world.createCollider(description, body)
        }

        this.pending = false
        this.game.ticker.events.off('tick', this.tickCallback)
    }
}
