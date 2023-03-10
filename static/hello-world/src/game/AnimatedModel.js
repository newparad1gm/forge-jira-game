import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class AnimatedModel {
    model;
    skeleton;
    animations;
    mixer;
    actions;
    meshPath;
    action;

    get idleAction() {
        return this.actions[0];
    }

    get walkAction() {
        return this.actions[1];
    }

    get runAction() {
        return this.actions[2];
    }

    constructor(meshPath) {
        this.meshPath = meshPath;
        this.actions = [];
    }

    loadModel = (scene) => {
        const loader = new GLTFLoader().setPath('/gltf/');

        loader.load(this.meshPath, (gltf) => {
            const model = gltf.scene;
            scene.add(model);
            model.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            this.model = model;

            const skeleton = new THREE.SkeletonHelper(this.model);
            skeleton.visible = false;
            scene.add(skeleton);
            this.skeleton = skeleton;

            const animations = gltf.animations;
            this.animations = animations;
            const mixer = new THREE.AnimationMixer(model);
            this.mixer = mixer;
            const idleAction = mixer.clipAction(animations[0]);
            const walkAction = mixer.clipAction(animations[3]);
            const runAction = mixer.clipAction(animations[1]);
            this.actions = [idleAction, walkAction, runAction];

            this.activateAllActions();
        });
    }

    activateAllActions = () => {
        this.setWeight(this.idleAction, 1);
        this.setWeight(this.walkAction, 0);
        this.setWeight(this.runAction, 0);

        this.actions.forEach(action => action.play());
    }

    pauseAllActions = (pause) => {
        this.actions.forEach(action => {
            action.paused = pause;
        });
    }

    deactivateAllActions = () => {
        this.actions.forEach(action => action.stop());
    }

    pauseContinue = () => {
        if (this.idleAction.paused) {
            this.pauseAllActions(false);
        } else {
            this.pauseAllActions(true);
        }
    }

    modifyTimeScale = (speed) => {
        if (this.mixer) {
            this.mixer.timeScale = speed;
        }
    }

    updateAction = (speed) => {
        if (this.actions.length) {
            speed = speed > 6 ? 6 : speed;
            this.setWeight(this.idleAction, (6 - speed) / 6);
            this.setWeight(this.runAction, speed / 6);
        }
    }

    setWeight = (action, weight) => {
        action.enabled = true;
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(weight);
    }

    updateModel = (position, orientation, speed, deltaTime) => {
        this.model?.position.copy(position);
        this.model?.quaternion.setFromEuler(orientation);
        this.updateAction(speed);
        this.mixer?.update(deltaTime);
    }
}