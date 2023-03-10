import * as THREE from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule';
import { AnimatedModel } from './AnimatedModel';

export class Player {
    playerID;
    collider;
    position;
    velocity;
    direction;
    orientation;
    onFloor;
    model;

    height = 1.66;

    constructor(playerID, modelPath) {
        this.playerID = playerID;
        this.collider = new Capsule();
        this.initializeCollider();
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.orientation = new THREE.Euler();
        this.onFloor = false;
        if (modelPath) {
            this.model = new AnimatedModel(modelPath);
        }
    }

    initializeCollider = () => {
        this.collider.start.set(0, 0.35, 0);
        this.collider.end.set(0, this.height, 0);
        this.collider.radius = 0.35;
    }

    get speed() {
        return Math.sqrt(this.velocity.dot(this.velocity));
    }

    translateColliderToPosition = () => {
        this.position.x = this.collider.end.x;
        this.position.y = this.collider.end.y - this.height;
        this.position.z = this.collider.end.z;
    }

    updatePlayer = (deltaTime, GRAVITY) => {
        let damping = Math.exp(-4 * deltaTime) - 1;
        if (!this.onFloor) {
            this.velocity.y -= GRAVITY * deltaTime;
            // small air resistance
            damping *= 0.1;
        }
        this.velocity.addScaledVector(this.velocity, damping);
        const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
        this.collider.translate(deltaPosition);
        if (this.model) {
            this.translateColliderToPosition();
            this.model.updateModel(this.position, this.orientation, this.speed, deltaTime);
        }
    }
}