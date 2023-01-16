import * as THREE from 'three';

export class Utils {
    static now = () => {
        return new Date();
    }

    static offsetTime = (date, offset) => {
        return new Date(date.getTime() + offset);
    }

    static delay = async (duration) => {
        return new Promise(resolve => {
            setTimeout(resolve, duration);
        });
    }

    static createVectorJSON = (vector) => {
        return {
            x: vector.x,
            y: vector.y,
            z: vector.z,
        }
    }

    static createModel = (geometry, material) => {
        const model = new THREE.Mesh(geometry, material);
        model.castShadow = true;
        model.receiveShadow = true;
        return model;
    }

    static setVector = (vector, simple) => {
        vector.set(simple.x, simple.y, simple.z);
    }
}