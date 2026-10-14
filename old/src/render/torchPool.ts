import {PointLight, type Scene, Vector3} from 'three';

const COLOR = 0xffab5d;
const INTENSITY = 2.5;
const DISTANCE = 8;
const PARKED_Y = -1000;

/**
 * A fixed handful of real lights that hop between the torches nearest to the
 * party. The renderer's cost grows with the number of lights, and changing that
 * number forces shader recompiles, so the count never changes.
 */
export class TorchPool {
  private readonly lights: PointLight[];

  constructor(
    private readonly scene: Scene,
    private readonly sites: readonly Vector3[],
    size = 6,
  ) {
    this.lights = Array.from({length: Math.min(size, sites.length)}, () => {
      const light = new PointLight(COLOR, INTENSITY, DISTANCE);
      light.position.set(0, PARKED_Y, 0);
      scene.add(light);
      return light;
    });
  }

  /** Moves the lights onto the torches closest to `focus`. */
  update(focus: Vector3): void {
    const nearest = this.sites
      .map(site => ({site, d: site.distanceToSquared(focus)}))
      .sort((a, b) => a.d - b.d)
      .slice(0, this.lights.length);
    this.lights.forEach((light, i) => {
      const entry = nearest[i];
      if (entry) light.position.copy(entry.site);
    });
  }

  dispose(): void {
    for (const light of this.lights) {
      this.scene.remove(light);
      light.dispose();
    }
    this.lights.length = 0;
  }
}
