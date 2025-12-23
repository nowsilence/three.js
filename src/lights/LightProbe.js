import { SphericalHarmonics3 } from '../math/SphericalHarmonics3.js';
import { Light } from './Light.js';

/**
 * 物体能 “采样” 周围环境的光照信息，反射出环境的颜色（比如白色立方体在红色环境中，侧面会染上红色，更贴近现实）。
 * 用 “球面谐波” 存储环境光照
 * LightProbe 本质是对周围环境的光照信息进行预采样，并将这些信息压缩存储在一种叫 “球面谐波（Spherical Harmonics, SH）” 的数据结构中（Three.js 用 SphericalHarmonics3 类存储）。

 */
class LightProbe extends Light {

	constructor( sh = new SphericalHarmonics3(), intensity = 1 ) {

		super( undefined, intensity );

		this.isLightProbe = true;

		this.sh = sh;

	}

	copy( source ) {

		super.copy( source );

		this.sh.copy( source.sh );

		return this;

	}

	fromJSON( json ) {

		this.intensity = json.intensity; // TODO: Move this bit to Light.fromJSON();
		this.sh.fromArray( json.sh );

		return this;

	}

	toJSON( meta ) {

		const data = super.toJSON( meta );

		data.object.sh = this.sh.toArray();

		return data;

	}

}

export { LightProbe };
