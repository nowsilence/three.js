import {
	RGBAFormat,
	FloatType
} from '../constants.js';
import { Bone } from './Bone.js';
import { Matrix4 } from '../math/Matrix4.js';
import { DataTexture } from '../textures/DataTexture.js';
import * as MathUtils from '../math/MathUtils.js';

const _offsetMatrix = /*@__PURE__*/ new Matrix4();
const _identityMatrix = /*@__PURE__*/ new Matrix4();

class Skeleton {

	constructor( bones = [], boneInverses = [] ) {

		this.uuid = MathUtils.generateUUID();

		this.bones = bones.slice( 0 );
		this.boneInverses = boneInverses;
		this.boneMatrices = null;

		this.boneTexture = null;

		this.init();

	}

	init() {

		const bones = this.bones;
		const boneInverses = this.boneInverses;

		this.boneMatrices = new Float32Array( bones.length * 16 );

		// calculate inverse bone matrices if necessary

		if ( boneInverses.length === 0 ) {

			this.calculateInverses();

		} else {

			// handle special case

			if ( bones.length !== boneInverses.length ) {

				console.warn( 'THREE.Skeleton: Number of inverse bone matrices does not match amount of bones.' );

				this.boneInverses = [];

				for ( let i = 0, il = this.bones.length; i < il; i ++ ) {

					this.boneInverses.push( new Matrix4() );

				}

			}

		}

	}

	calculateInverses() {

		this.boneInverses.length = 0;

		for ( let i = 0, il = this.bones.length; i < il; i ++ ) {

			const inverse = new Matrix4();

			if ( this.bones[ i ] ) {

				inverse.copy( this.bones[ i ].matrixWorld ).invert();

			}

			this.boneInverses.push( inverse );

		}

	}

	pose() {

		// recover the bind-time world matrices 把骨骼恢复到"绑定姿态"（bind pose / rest pose），即模型绑定骨骼时的初始姿势

		for ( let i = 0, il = this.bones.length; i < il; i ++ ) {

			const bone = this.bones[ i ];

			if ( bone ) {

				bone.matrixWorld.copy( this.boneInverses[ i ] ).invert();

			}

		}

		// compute the local matrices, positions, rotations and scales

		for ( let i = 0, il = this.bones.length; i < il; i ++ ) {

			const bone = this.bones[ i ];

			if ( bone ) {

				if ( bone.parent && bone.parent.isBone ) {

					bone.matrix.copy( bone.parent.matrixWorld ).invert();
					bone.matrix.multiply( bone.matrixWorld );

				} else {

					bone.matrix.copy( bone.matrixWorld );

				}

				bone.matrix.decompose( bone.position, bone.quaternion, bone.scale );

			}

		}

	}

	update() {

		const bones = this.bones;
		const boneInverses = this.boneInverses;
		const boneMatrices = this.boneMatrices;
		const boneTexture = this.boneTexture;
        // 骨骼动画修改的是每个骨骼的：position、quaternion、scale
		// flatten bone matrices to array

		for ( let i = 0, il = bones.length; i < il; i ++ ) {

			// compute the offset between the current and the original transform
            /**
             * B_bind：把骨头本地坐标里的点，映射到世界坐标（绑定姿态下）。
             * B_now：把骨头本地坐标里的点，映射到世界坐标（当前姿态下）。
             * B_bind⁻¹（逆）：把世界坐标的点，退回骨头本地坐标——也就是「撤销」绑定姿态的变换。
             * 
             * 点 q，它死死焊在骨头上, 在骨头本地坐标里坐标永远不变。
             * 绑定姿态时，它的世界位置：p_bind = B_bind · q
             * 当前姿态时，它的世界位置：p_now  = B_now  · q
             * 
             * 从绑定姿态到当前姿态，这个点怎么动, 需要个变化M，使得 p_now = M · p_bind。
             * 从第一式解出 q = B_bind⁻¹ · p_bind，代入第二式
             * p_now = B_now · ( B_bind⁻¹ · p_bind )
             *       = ( B_now · B_bind⁻¹ ) · p_bind
             * M = B_now · B_bind⁻¹
             * 
             * // bindMatrix、bindMatrixInverse为SkinnedMesh属性
             * vec3 transformed = vec3( position ); // 【SkinnedMesh 本地空间】
             * mat4 boneMatX = getBoneMatrix( skinIndex.x );
	         * mat4 boneMatY = getBoneMatrix( skinIndex.y );
	         * mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	         * mat4 boneMatW = getBoneMatrix( skinIndex.w );
             * 
	         * vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 ); // 变成【绑定空间 = 绑定时的世界空间】
             * 
	         * vec4 skinned = vec4( 0.0 );
	         * skinned += boneMatX * skinVertex * skinWeight.x; // 当前帧的世界空间
	         * skinned += boneMatY * skinVertex * skinWeight.y;
	         * skinned += boneMatZ * skinVertex * skinWeight.z;
	         * skinned += boneMatW * skinVertex * skinWeight.w;
             * 
	         * transformed = ( bindMatrixInverse * skinned ).xyz; //  变回【SkinnedMesh 本地空间】
             * mvPosition = modelViewMatrix * mvPosition; 再执行这行代码之前，会根据权重
             */

           
			const matrix = bones[ i ] ? bones[ i ].matrixWorld : _identityMatrix;
            // _offsetMatrix的作用是输入绑定空间的一点p_bind输出当前姿态下世界坐标的点p_now
			_offsetMatrix.multiplyMatrices( matrix, boneInverses[ i ] );
			_offsetMatrix.toArray( boneMatrices, i * 16 );

		}

		if ( boneTexture !== null ) {

			boneTexture.needsUpdate = true;

		}

	}

	clone() {

		return new Skeleton( this.bones, this.boneInverses );

	}

	computeBoneTexture() {

		// layout (1 matrix = 4 pixels)
		//      RGBA RGBA RGBA RGBA (=> column1, column2, column3, column4)
		//  with  8x8  pixel texture max   16 bones * 4 pixels =  (8 * 8)
		//       16x16 pixel texture max   64 bones * 4 pixels = (16 * 16)
		//       32x32 pixel texture max  256 bones * 4 pixels = (32 * 32)
		//       64x64 pixel texture max 1024 bones * 4 pixels = (64 * 64)

		let size = Math.sqrt( this.bones.length * 4 ); // 4 pixels needed for 1 matrix
		size = Math.ceil( size / 4 ) * 4;
		size = Math.max( size, 4 );

		const boneMatrices = new Float32Array( size * size * 4 ); // 4 floats per RGBA pixel
		boneMatrices.set( this.boneMatrices ); // copy current values

		const boneTexture = new DataTexture( boneMatrices, size, size, RGBAFormat, FloatType );
		boneTexture.needsUpdate = true;

		this.boneMatrices = boneMatrices;
		this.boneTexture = boneTexture;

		return this;

	}

	getBoneByName( name ) {

		for ( let i = 0, il = this.bones.length; i < il; i ++ ) {

			const bone = this.bones[ i ];

			if ( bone.name === name ) {

				return bone;

			}

		}

		return undefined;

	}

	dispose( ) {

		if ( this.boneTexture !== null ) {

			this.boneTexture.dispose();

			this.boneTexture = null;

		}

	}

	fromJSON( json, bones ) {

		this.uuid = json.uuid;

		for ( let i = 0, l = json.bones.length; i < l; i ++ ) {

			const uuid = json.bones[ i ];
			let bone = bones[ uuid ];

			if ( bone === undefined ) {

				console.warn( 'THREE.Skeleton: No bone found with UUID:', uuid );
				bone = new Bone();

			}

			this.bones.push( bone );
			this.boneInverses.push( new Matrix4().fromArray( json.boneInverses[ i ] ) );

		}

		this.init();

		return this;

	}

	toJSON() {

		const data = {
			metadata: {
				version: 4.6,
				type: 'Skeleton',
				generator: 'Skeleton.toJSON'
			},
			bones: [],
			boneInverses: []
		};

		data.uuid = this.uuid;

		const bones = this.bones;
		const boneInverses = this.boneInverses;

		for ( let i = 0, l = bones.length; i < l; i ++ ) {

			const bone = bones[ i ];
			data.bones.push( bone.uuid );

			const boneInverse = boneInverses[ i ];
			data.boneInverses.push( boneInverse.toArray() );

		}

		return data;

	}

}

export { Skeleton };
