import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'

// A camel built from simple shapes, used as the visual for the player vehicle.
// Local axes follow the physical vehicle: +X is forward, +Y is up. Feet rest at y = 0.
// Legs are animated from the vehicle's forward speed with a pacing gait
// (both legs on the same side move together, like a real camel).

const PALETTE = {
    fur: '#c9965a',
    furDark: '#a8743e',
    furLight: '#dcb27a',
    dark: '#1d140e',
    white: '#fff8ec',
    blanket: '#b5473a',
    trim: '#f2c14e',
    teal: '#2f6f73',
}

export class Camel
{
    constructor()
    {
        this.group = new THREE.Group()
        this.group.name = 'camel'
        this.materials = {}
        for(const [name, hex] of Object.entries(PALETTE))
            this.materials[name] = new MeshDefaultMaterial({ colorNode: color(hex) })

        this.phase = 0
        this.gait = 0
        this.time = 0

        this.sphere = new THREE.SphereGeometry(1, 14, 10)
        this.cylinder = new THREE.CylinderGeometry(1, 1, 1, 10)

        this.build()
    }

    mesh(geometry, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0])
    {
        const mesh = new THREE.Mesh(geometry, this.materials[material])
        mesh.position.set(...position)
        mesh.scale.set(...scale)
        mesh.rotation.set(...rotation)
        mesh.castShadow = true
        mesh.receiveShadow = true
        return mesh
    }

    build()
    {
        // Body pivot at hip height; it bobs and sways with the gait.
        this.body = new THREE.Group()
        this.body.position.y = 1.5
        this.group.add(this.body)

        this.body.add(this.mesh(this.sphere, 'fur', [0, 0, 0], [1.15, 0.52, 0.55]))
        this.body.add(this.mesh(this.sphere, 'furLight', [0.1, -0.16, 0], [0.95, 0.4, 0.48]))
        this.body.add(this.mesh(this.sphere, 'furDark', [-0.05, 0.46, 0], [0.55, 0.5, 0.42]))

        // Saddle blanket over the hump, with a gold trim and tassels.
        this.body.add(this.mesh(this.sphere, 'blanket', [-0.05, 0.3, 0], [0.62, 0.36, 0.58]))
        this.body.add(this.mesh(this.cylinder, 'trim', [-0.05, 0.1, 0], [0.64, 0.06, 0.6]))
        for(let i = 0; i < 6; i++)
        {
            const side = i < 3 ? 1 : -1
            const x = -0.4 + (i % 3) * 0.35
            this.body.add(this.mesh(this.sphere, i % 2 ? 'teal' : 'trim', [x, -0.12, side * 0.6], [0.05, 0.1, 0.05]))
        }

        // Tail.
        this.tail = new THREE.Group()
        this.tail.position.set(-1.1, 0.15, 0)
        this.tail.add(this.mesh(this.cylinder, 'furDark', [0, -0.35, 0], [0.04, 0.7, 0.04]))
        this.tail.add(this.mesh(this.sphere, 'dark', [0, -0.72, 0], [0.07, 0.12, 0.07]))
        this.tail.rotation.z = 0.3
        this.body.add(this.tail)

        // Neck in two segments (the camel's S-curve), then the head.
        this.neck = new THREE.Group()
        this.neck.position.set(0.95, 0.12, 0)
        this.neck.rotation.z = -0.95
        this.body.add(this.neck)
        this.neck.add(this.mesh(this.cylinder, 'fur', [0, 0.42, 0], [0.24, 0.9, 0.2]))
        this.neck.add(this.mesh(this.sphere, 'fur', [0, 0, 0], [0.3, 0.3, 0.26]))

        this.neck2 = new THREE.Group()
        this.neck2.position.y = 0.85
        this.neck2.rotation.z = 1.05
        this.neck.add(this.neck2)
        this.neck2.add(this.mesh(this.sphere, 'fur', [0, 0, 0], [0.19, 0.19, 0.17]))
        this.neck2.add(this.mesh(this.cylinder, 'fur', [0, 0.34, 0], [0.18, 0.7, 0.16]))

        this.head = new THREE.Group()
        this.head.position.y = 0.74
        this.head.rotation.z = -0.25
        this.neck2.add(this.head)
        this.head.add(this.mesh(this.sphere, 'fur', [0.08, 0.04, 0], [0.33, 0.22, 0.21]))
        this.head.add(this.mesh(this.sphere, 'furLight', [0.42, -0.04, 0], [0.24, 0.16, 0.16]))
        for(const side of [-1, 1])
        {
            this.head.add(this.mesh(this.sphere, 'white', [0.2, 0.12, side * 0.18], [0.07, 0.07, 0.05]))
            this.head.add(this.mesh(this.sphere, 'dark', [0.23, 0.12, side * 0.2], [0.045, 0.05, 0.03]))
            this.head.add(this.mesh(this.cylinder, 'fur', [-0.05, 0.28, side * 0.12], [0.04, 0.16, 0.04], [side * 0.4, 0, 0]))
        }
        // Red halter.
        this.head.add(this.mesh(this.cylinder, 'blanket', [0.36, 0, 0], [0.18, 0.05, 0.18], [0, 0, Math.PI * 0.5]))

        // Legs: hip -> upper -> knee -> lower -> foot. Pacing gait by side.
        this.legs = []
        for(const [x, z] of [[0.7, 0.28], [0.7, -0.28], [-0.72, 0.28], [-0.72, -0.28]])
        {
            const hip = new THREE.Group()
            hip.position.set(x, -0.2, z)
            this.body.add(hip)
            hip.add(this.mesh(this.sphere, 'fur', [0, -0.05, 0], [0.24, 0.3, 0.2]))
            hip.add(this.mesh(this.cylinder, 'fur', [0, -0.35, 0], [0.12, 0.7, 0.12]))

            const knee = new THREE.Group()
            knee.position.y = -0.7
            hip.add(knee)
            knee.add(this.mesh(this.sphere, 'furDark', [0, 0, 0], [0.11, 0.11, 0.11]))
            knee.add(this.mesh(this.cylinder, 'fur', [0, -0.3, 0], [0.08, 0.6, 0.08]))
            knee.add(this.mesh(this.sphere, 'furDark', [0.04, -0.6, 0], [0.18, 0.06, 0.15]))

            this.legs.push({ hip, knee, offset: z > 0 ? 0 : Math.PI })
        }
    }

    // forwardSpeed in units per second (negative when reversing).
    update(delta, forwardSpeed, steering = 0)
    {
        this.time += delta
        const speed = Math.abs(forwardSpeed)
        this.gait += (Math.min(1, speed / 4) - this.gait) * Math.min(1, delta * 6)
        const running = Math.min(1, Math.max(0, (speed - 5) / 6))
        const stride = 2.2 + running * 1.4
        this.phase += (forwardSpeed / stride) * Math.PI * 2 * delta

        const g = this.gait
        const amplitude = 0.35 + running * 0.2
        for(const leg of this.legs)
        {
            const p = this.phase + leg.offset
            const swing = Math.max(0, Math.cos(p))
            leg.hip.rotation.z = Math.sin(p) * amplitude * g
            leg.knee.rotation.z = - swing * (0.55 + running * 0.4) * g
        }

        const breathe = Math.sin(this.time * 1.8) * 0.01
        this.body.position.y = 1.5 + Math.cos(this.phase * 2) * 0.05 * g + breathe
        this.body.rotation.x = Math.sin(this.phase) * 0.05 * g
        this.body.rotation.z = - running * 0.05
        this.neck.rotation.z = -0.95 - Math.sin(this.phase * 2) * 0.06 * g - running * 0.25
        this.neck.rotation.x = - steering * 0.25
        this.tail.rotation.x = Math.sin(this.time * 2 + this.phase) * (0.15 + g * 0.2)
    }
}
