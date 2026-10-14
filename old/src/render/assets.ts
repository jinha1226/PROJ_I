import {GLTFLoader, type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import type {ActorName} from '../types';

export interface ModelLibrary {
  load(name: ActorName): Promise<GLTF>;
}

/** Loads each KayKit character GLB once and shares the parsed result. */
export class KayKitLibrary implements ModelLibrary {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Promise<GLTF>>();

  constructor(private readonly baseUrl: string = `${import.meta.env.BASE_URL}assets/kaykit/`) {}

  load(name: ActorName): Promise<GLTF> {
    let model = this.cache.get(name);
    if (!model) {
      model = this.loader.loadAsync(`${this.baseUrl}${name}.glb`);
      this.cache.set(name, model);
    }
    return model;
  }
}
