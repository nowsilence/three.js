import { Light } from './Light.js';
import { Color } from '../math/Color.js';
import { Object3D } from '../core/Object3D.js';

/**
 * HemisphereLight（半球光） 是一种模拟「上下两个半球环境光照」的光源，核心作用是快速实现贴近现实的「天空 + 地面」基础环境光效果（比如天空的蓝色光照 + 地面的灰色反射光），本质是对真实环境光照的「简化模拟」，兼顾易用性和基础真实感。
 * 可以模拟天空。地面 
*/
class HemisphereLight extends Light {

	constructor( skyColor, groundColor, intensity ) {

		super( skyColor, intensity );

		this.isHemisphereLight = true;

		this.type = 'HemisphereLight';

		this.position.copy( Object3D.DEFAULT_UP );
		this.updateMatrix();

		this.groundColor = new Color( groundColor );

	}

	copy( source, recursive ) {

		super.copy( source, recursive );

		this.groundColor.copy( source.groundColor );

		return this;

	}

}

export { HemisphereLight };
