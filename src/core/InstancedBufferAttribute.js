import { BufferAttribute } from './BufferAttribute.js';

class InstancedBufferAttribute extends BufferAttribute {

    /**
     * 
     * @param {*} array 
     * @param {*} itemSize 一个属性的大小，
     * @param {*} normalized 
     * @param {*} meshPerAttribute 每个属性给多少个mesh用，比如array里面存了4个颜色，每一个颜色给多少个mesh使用
     */
	constructor( array, itemSize, normalized, meshPerAttribute = 1 ) {

		super( array, itemSize, normalized );

		this.isInstancedBufferAttribute = true;

		this.meshPerAttribute = meshPerAttribute;

	}

	copy( source ) {

		super.copy( source );

		this.meshPerAttribute = source.meshPerAttribute;

		return this;

	}

	toJSON() {

		const data = super.toJSON();

		data.meshPerAttribute = this.meshPerAttribute;

		data.isInstancedBufferAttribute = true;

		return data;

	}

}

export { InstancedBufferAttribute };
