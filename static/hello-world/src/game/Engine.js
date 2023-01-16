import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';
import { Controls } from './Controls';
import { Utils } from '../Utils';

export class Engine {
    GRAVITY = 30;
    NUM_SPHERES = 100;
    SPHERE_RADIUS = 0.2;
    STEPS_PER_FRAME = 5;

    sphereIdx = 0;
    clock;

    player;
    renderer;
    stats;
    scene;
    camera;
    world;
    controls;
    players;

    vectors = { 
        vector1: new THREE.Vector3(), 
        vector2: new THREE.Vector3(), 
        vector3: new THREE.Vector3() 
    };
    spheres;

    constructor(player, world) {
        this.clock = new THREE.Clock();
        this.player = player;
        this.world = world;

        this.renderer = this.startRenderer();
        this.stats = this.startStats();
        this.scene = this.startScene();

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.camera.rotation.order = 'YXZ';

        this.controls = new Controls(this.camera, this.player);

        this.world.loadWorld(this.scene, this.animate);

        this.spheres = [];
        this.createSpheres();

        // network players
        this.players = new Map();
    }

    createSpheres = () => {
        const sphereGeometry = new THREE.IcosahedronGeometry(this.SPHERE_RADIUS, 5);
        const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xbbbb44 });

        for (let i = 0; i < this.NUM_SPHERES; i++) {
            const sphere = Utils.createModel(sphereGeometry, sphereMaterial);
            this.scene.add(sphere);

            this.spheres.push({
                mesh: sphere,
                collider: new THREE.Sphere(new THREE.Vector3(0, - 100, 0), this.SPHERE_RADIUS),
                velocity: new THREE.Vector3()
            });
        }
    }

    startStats = () => {
        const stats = new (Stats)();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';
        return stats;
    }

    startScene = () => {
        const scene = new THREE.Scene();
        scene.background = this.world.background;
        scene.fog = this.world.fog;

        for (const light of this.world.lights) {
            scene.add(light);
        }
        return scene;
    }

    startRenderer = () => {
        const renderer = new THREE.WebGLRenderer( { antialias: true } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.VSMShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        return renderer;
    }

    teleportPlayerIfOob = () => {
        if (this.camera.position.y <= - 25) {
            this.player.initializeCollider();
            this.camera.position.copy(this.player.collider.end);
            this.camera.rotation.set(0, 0, 0);
        }
    }

    playerCollisions = (player) => {
        const result = this.world.octree.capsuleIntersect(player.collider);
        player.onFloor = false;
        if (result) {
            player.onFloor = result.normal.y > 0;
            if (!player.onFloor) {
                player.velocity.addScaledVector(result.normal, -result.normal.dot(player.velocity));
            }
            player.collider.translate(result.normal.multiplyScalar(result.depth));
        }
    }

    playerSphereCollision = (player, sphere, vectors) => {
        const center = vectors.vector1.addVectors(player.collider.start, player.collider.end).multiplyScalar(0.5);
        const sphere_center = sphere.collider.center;
        const r = player.collider.radius + sphere.collider.radius;
        const r2 = r * r;

        // approximation: player = 3 spheres
        for (const point of [player.collider.start, player.collider.end, center]) {
            const d2 = point.distanceToSquared(sphere_center);
            if (d2 < r2) {
                const normal = vectors.vector1.subVectors(point, sphere_center).normalize();
                const v1 = vectors.vector2.copy(normal).multiplyScalar(normal.dot(player.velocity));
                const v2 = vectors.vector3.copy(normal).multiplyScalar(normal.dot(sphere.velocity));

                player.velocity.add(v2).sub(v1);
                sphere.velocity.add(v1).sub(v2);

                const d = (r - Math.sqrt(d2)) / 2;
                sphere_center.addScaledVector(normal, -d);
            }
        }
    }

    spheresCollisions = (vectors) => {
        for (let i = 0, length = this.spheres.length; i < length; i++) {
            const s1 = this.spheres[i];
            for (let j = i + 1; j < length; j++) {
                const s2 = this.spheres[j];
                const d2 = s1.collider.center.distanceToSquared(s2.collider.center);
                const r = s1.collider.radius + s2.collider.radius;
                const r2 = r * r;
                if (d2 < r2) {
                    const normal = vectors.vector1.subVectors(s1.collider.center, s2.collider.center).normalize();
                    const v1 = vectors.vector2.copy(normal).multiplyScalar(normal.dot( s1.velocity));
                    const v2 = vectors.vector3.copy(normal).multiplyScalar(normal.dot( s2.velocity));

                    s1.velocity.add(v2).sub(v1);
                    s2.velocity.add(v1).sub(v2);

                    const d = (r - Math.sqrt(d2)) / 2;

                    s1.collider.center.addScaledVector(normal, d);
                    s2.collider.center.addScaledVector(normal, -d);
                }
            }
        }
    }

    updateSpheres = (deltaTime) => {
        this.spheres.forEach(sphere => {
            sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);
            const result = this.world.octree.sphereIntersect(sphere.collider);

            if (result) {
                sphere.velocity.addScaledVector(result.normal, -result.normal.dot(sphere.velocity) * 1.5);
                sphere.collider.center.add(result.normal.multiplyScalar(result.depth));
            } else {
                sphere.velocity.y -= this.GRAVITY * deltaTime;
            }

            const damping = Math.exp(-1.5 * deltaTime) - 1;
            sphere.velocity.addScaledVector(sphere.velocity, damping);

            this.playerSphereCollision(this.player, sphere, this.vectors);
        });

        this.spheresCollisions(this.vectors);

        for (const sphere of this.spheres) {
            sphere.mesh.position.copy(sphere.collider.center);
        }
    }

    animate = () => {
        const deltaTime = Math.min(0.05, this.clock.getDelta()) / this.STEPS_PER_FRAME;

        // we look for collisions in substeps to mitigate the risk of
        // an object traversing another too quickly for detection.
        for (let i = 0; i < this.STEPS_PER_FRAME; i++) {
            this.controls.controls(deltaTime);
            this.player.orientation.y = this.camera.rotation.y;
            this.player.updatePlayer(deltaTime, this.GRAVITY);
            this.playerCollisions(this.player);
            this.updatePlayers(deltaTime);
            this.camera.position.copy(this.player.collider.end);
            this.updateSpheres(deltaTime);
            this.teleportPlayerIfOob();
        }

        this.renderer.render(this.scene, this.camera);

        this.stats.update();
        requestAnimationFrame(this.animate);
    }

    updatePlayers = (deltaTime) => {
        for (let player of Array.from(this.players.values())) {
            player.updatePlayer(deltaTime, 0);
        }
    }

    throwBall = () => {
        const sphere = this.spheres[this.sphereIdx];
        this.camera.getWorldDirection(this.player.direction);
        sphere.collider.center.copy(this.player.collider.end).addScaledVector(this.player.direction, this.player.collider.radius * 1.5);

        // throw the ball with more force if we hold the button longer, and if we move forward
        const impulse = 15 + 30 * (1 - Math.exp((this.controls.mouseTime - performance.now()) * 0.001));

        sphere.velocity.copy(this.player.direction).multiplyScalar(impulse);
        sphere.velocity.addScaledVector(this.player.velocity, 2);

        this.sphereIdx = (this.sphereIdx + 1) % this.spheres.length;
    }

    createStateMessage = () => {
        return {
            playerID: this.player.playerID,
            position: Utils.createVectorJSON(this.player.collider.end),
            velocity: Utils.createVectorJSON(this.player.velocity),
            orientation: Utils.createVectorJSON(this.player.orientation),
            direction: Utils.createVectorJSON(this.player.direction)
        }
    }
}