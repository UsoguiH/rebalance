import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import MeshGridMaterial, { MeshGridMaterialLine } from '../Materials/MeshGridMaterial.js'
import { float, mix, normalWorld, positionWorld, sin, smoothstep, vec3, vec4 } from 'three/tsl'
import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'
import { Fn } from 'three/tsl'

export class Grid
{
    constructor()
    {
        this.game = Game.getInstance()

        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '🌐 Grid',
                expanded: false,
            })
        }

        this.setVisual()
    }

    setVisual()
    {
        const lines = [
            // new MeshGridMaterialLine(0x705df2, 1, 0.03, 0.2),
            // new MeshGridMaterialLine(0xffffff, 10, 0.003, 1),
            new MeshGridMaterialLine('#8d55ff', 10, 0.02, 0.2),
            new MeshGridMaterialLine('#675369', 100, 0.002, 1),
        ]

        const uvGridMaterial = new MeshGridMaterial({
            color: 0x1b191f,
            scale: 0.001,
            antialiased: true,
            reference: 'uv', // uv | world
            side: THREE.DoubleSide,
            lines
        })

        // Desert void: wind-shaped dune ridges instead of the grid marks.
        // Wavy bands along X, bent by slow sine warps along Z, with soft
        // golden crests and dark troughs.
        const dunePosition = positionWorld.xz
        const duneWarp = sin(dunePosition.y.mul(0.11)).mul(2.6).add(sin(dunePosition.x.mul(0.05).add(dunePosition.y.mul(0.03))).mul(3.4))
        const duneWave = sin(dunePosition.x.mul(0.55).add(duneWarp)).mul(0.5).add(0.5)
        const duneRipple = sin(dunePosition.x.mul(3.2).add(duneWarp.mul(4.0))).mul(0.5).add(0.5)
        const duneShade = smoothstep(0.0, 1.0, duneWave)
        const duneCrest = smoothstep(0.86, 0.985, duneWave)
        const duneColor = mix(vec3(0.05, 0.035, 0.07), vec3(0.42, 0.27, 0.22), duneShade)
            .add(vec3(0.95, 0.66, 0.38).mul(duneCrest).mul(0.8))
            .add(vec3(0.08, 0.05, 0.04).mul(duneRipple).mul(duneShade))

        const defaultMaterial = new MeshDefaultMaterial({
            colorNode: duneColor,
            hasWater: false,
            hasReveal: false,
            hasLightBounce: false
        })
        
        uvGridMaterial.outputNode = Fn(() =>
        {
            const distanceToCenter = positionWorld.xz.sub(this.game.reveal.position2Uniform).length()
            distanceToCenter.lessThan(this.game.reveal.distance).discard()

            return defaultMaterial.outputNode
        })()

        this.mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            uvGridMaterial
        )
        this.mesh.position.y = 0
        this.mesh.rotation.x = - Math.PI * 0.5

        const defaultRespawn = this.game.respawns.getDefault()
        this.mesh.position.x = defaultRespawn.position.x
        this.mesh.position.z = defaultRespawn.position.z
        
        this.game.scene.add(this.mesh)

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel.addBinding(uvGridMaterial, 'scale', { min: 0, max: 0.002, step: 0.0001 })

            for(const line of lines)
            {
                const lineDebugPanel = this.debugPanel.addFolder({
                    title: 'Line',
                    expanded: false,
                })
                lineDebugPanel.addBinding(line.scale, 'value', { label: 'scale', min: 0, max: 1, step: 0.001 })
                lineDebugPanel.addBinding(line.thickness, 'value', { label: 'thickness', min: 0, max: 1, step: 0.001 })
                lineDebugPanel.addBinding(line.offset, 'value', { label: 'offset', min: 0, max: 1, step: 0.001 })
                lineDebugPanel.addBinding(line.cross, 'value', { label: 'cross', min: 0, max: 1, step: 0.001 })
                lineDebugPanel.addBinding({ color: '#' + line.color.value.getHexString(THREE.SRGBColorSpace) }, 'color').on('change', tweak => line.color.value.set(tweak.value))
            }
        }
    }

    show()
    {
        this.game.scene.add(this.mesh)
    }

    destroy()
    {
        this.mesh.material.dispose()
        this.mesh.geometry.dispose()
        this.mesh.removeFromParent()
    }
}