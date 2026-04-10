import { Camera } from './Camera.js';
import * as MathUtils from '../math/MathUtils.js';
import { Vector2 } from '../math/Vector2.js';
import { Vector3 } from '../math/Vector3.js';

const _v3 = /*@__PURE__*/ new Vector3();
const _minTarget = /*@__PURE__*/ new Vector2();
const _maxTarget = /*@__PURE__*/ new Vector2();


class PerspectiveCamera extends Camera {

	constructor( fov = 50, aspect = 1, near = 0.1, far = 2000 ) {

		super();

		this.isPerspectiveCamera = true;

		this.type = 'PerspectiveCamera';
        // 垂直视场角（有的开放平台fov可能是水平视场角，如cesium）
		this.fov = fov;
		this.zoom = 1;

		this.near = near;
		this.far = far;
       
        /**
         * 为景深（Depth of Field / Bokeh）效果提供对焦距离，不影响普通透视投影本身。
         * 表示相机对焦在多少距离的物体上，这个距离上的物体最清晰，离得越远越模糊。
         * 配合 EffectComposer + DepthOfField 后期效果使用
         */
		this.focus = 10;

		this.aspect = aspect;
        /**
         * {
         *      offsetX: number,
         *      offsetY: number,
         *      width: number
         *      height: number,
         *      fullWidth: number,
         *      fullHeight: number,
         * }
         */
		this.view = null;
        // 胶片宽度，默认 35mm 全画幅
		this.filmGauge = 35;	// width of the film (default in millimeters)
		this.filmOffset = 0;	// horizontal film offset (same unit as gauge)

		this.updateProjectionMatrix();

	}

	copy( source, recursive ) {

		super.copy( source, recursive );

		this.fov = source.fov;
		this.zoom = source.zoom;

		this.near = source.near;
		this.far = source.far;
		this.focus = source.focus;

		this.aspect = source.aspect;
		this.view = source.view === null ? null : Object.assign( {}, source.view );

		this.filmGauge = source.filmGauge;
		this.filmOffset = source.filmOffset;

		return this;

	}

	/**
	 * Sets the FOV by focal length in respect to the current .filmGauge.
	 * 根据物理相机的「焦距 (mm)」，自动算出并设置相机的 fov（视场角）。它是物理相机 → 3D 相机的桥梁。
	 * The default film gauge is 35, so that the focal length can be specified for
	 * a 35mm (full frame) camera.
	 * 设置焦距
	 * Values for focal length and film gauge must have the same unit.
	 */
	setFocalLength( focalLength ) {
        // 焦距越长 → fov 越小（望远、拉近）
        // 焦距越短 → fov 越大（广角、视野宽）
		/** see {@link http://www.bobatkins.com/photography/technical/field_of_view.html} */
        // const vExtentSlope = 0.5 * 胶片高度 / 焦距;
        // fov变小，看的区域变小，显示到同一个画布上，就变大了，显得看得远了
		const vExtentSlope = 0.5 * this.getFilmHeight() / focalLength;

		this.fov = MathUtils.RAD2DEG * 2 * Math.atan( vExtentSlope );
		this.updateProjectionMatrix();

	}

	/**
	 * Calculates the focal length from the current .fov and .filmGauge.
	 */
	getFocalLength() {

		const vExtentSlope = Math.tan( MathUtils.DEG2RAD * 0.5 * this.fov );

		return 0.5 * this.getFilmHeight() / vExtentSlope;

	}

	getEffectiveFOV() {

		return MathUtils.RAD2DEG * 2 * Math.atan(
			Math.tan( MathUtils.DEG2RAD * 0.5 * this.fov ) / this.zoom );

	}

	getFilmWidth() {

		// film not completely covered in portrait format (aspect < 1)
		return this.filmGauge * Math.min( this.aspect, 1 );

	}

	getFilmHeight() {

		// film not completely covered in landscape format (aspect > 1)
		return this.filmGauge / Math.max( this.aspect, 1 );

	}

	/**
	 * Computes the 2D bounds of the camera's viewable rectangle at a given distance along the viewing direction.
	 * Sets minTarget and maxTarget to the coordinates of the lower-left and upper-right corners of the view rectangle.
	 */
	getViewBounds( distance, minTarget, maxTarget ) {

		_v3.set( - 1, - 1, 0.5 ).applyMatrix4( this.projectionMatrixInverse );

		minTarget.set( _v3.x, _v3.y ).multiplyScalar( - distance / _v3.z );

		_v3.set( 1, 1, 0.5 ).applyMatrix4( this.projectionMatrixInverse );

		maxTarget.set( _v3.x, _v3.y ).multiplyScalar( - distance / _v3.z );

	}

	/**
	 * Computes the width and height of the camera's viewable rectangle at a given distance along the viewing direction.
	 * Copies the result into the target Vector2, where x is width and y is height.
	 */
	getViewSize( distance, target ) {

		this.getViewBounds( distance, _minTarget, _maxTarget );

		return target.subVectors( _maxTarget, _minTarget );

	}

	/**
     * 主要用于多显示器、多窗口
     * 比如一个大屏由很多块物理小屏幕组成，每个屏幕配一台物理机，
     * fullWidth/fullHeight就是这个大屏的虚拟大小，w/h为每个小屏幕的宽高，绘制小屏幕的时候要加上在大屏内的偏移
     * 每台物理都要运行同一个程序，分别设置viewOffset，如何控制视图变化，通常有一个主机把相机状态同步到其他物理机上
     * 
     * vr/xr 也是有两个物理屏幕的，但是比较特殊。
     * AR/VR 设备（如 Meta、Varjo、Pico、Hololens）的渲染机制 = 单画布双视角。
     * 但驱动它们的是同一个渲染上下文（WebXR/VR 环境）
     * 浏览器 / 引擎给你的是 一块大 Canvas
     * 但是也需要两个camera，并设置不同的viewoffet，配合viewport，左半屏对应左眼镜，右半屏对应右眼镜
     * 
	 * Sets an offset in a larger frustum. This is useful for multi-window or
	 * multi-monitor/multi-machine setups.
	 *
	 * For example, if you have 3x2 monitors and each monitor is 1920x1080 and
	 * the monitors are in grid like this
	 *
	 *   +---+---+---+
	 *   | A | B | C |
	 *   +---+---+---+
	 *   | D | E | F |
	 *   +---+---+---+
	 *
	 * then for each monitor you would call it like this
	 *
	 *   const w = 1920;
	 *   const h = 1080;
	 *   const fullWidth = w * 3;
	 *   const fullHeight = h * 2;
	 *
	 *   --A--
	 *   camera.setViewOffset( fullWidth, fullHeight, w * 0, h * 0, w, h );
	 *   --B--
	 *   camera.setViewOffset( fullWidth, fullHeight, w * 1, h * 0, w, h );
	 *   --C--
	 *   camera.setViewOffset( fullWidth, fullHeight, w * 2, h * 0, w, h );
	 *   --D--
	 *   camera.setViewOffset( fullWidth, fullHeight, w * 0, h * 1, w, h );
	 *   --E--
	 *   camera.setViewOffset( fullWidth, fullHeight, w * 1, h * 1, w, h );
	 *   --F--
	 *   camera.setViewOffset( fullWidth, fullHeight, w * 2, h * 1, w, h );
	 *
	 *   Note there is no reason monitors have to be the same size or in a grid.
	 */
	setViewOffset( fullWidth, fullHeight, x, y, width, height ) {

		this.aspect = fullWidth / fullHeight;

		if ( this.view === null ) {

			this.view = {
				enabled: true,
				fullWidth: 1,
				fullHeight: 1,
				offsetX: 0,
				offsetY: 0,
				width: 1,
				height: 1
			};

		}

		this.view.enabled = true;
		this.view.fullWidth = fullWidth;
		this.view.fullHeight = fullHeight;
		this.view.offsetX = x;
		this.view.offsetY = y;
		this.view.width = width;
		this.view.height = height;

		this.updateProjectionMatrix();

	}

	clearViewOffset() {

		if ( this.view !== null ) {

			this.view.enabled = false;

		}

		this.updateProjectionMatrix();

	}

	updateProjectionMatrix() {

		const near = this.near;
		let top = near * Math.tan( MathUtils.DEG2RAD * 0.5 * this.fov ) / this.zoom;
		let height = 2 * top;
		let width = this.aspect * height;
		let left = - 0.5 * width;
		const view = this.view;

		if ( this.view !== null && this.view.enabled ) {

			const fullWidth = view.fullWidth,
				fullHeight = view.fullHeight;

			left += view.offsetX * width / fullWidth;
			top -= view.offsetY * height / fullHeight;
			width *= view.width / fullWidth;
			height *= view.height / fullHeight;

		}

		const skew = this.filmOffset;
		if ( skew !== 0 ) left += near * skew / this.getFilmWidth();
        // 这里的left、right、top、bottom指的是近裁剪面
		this.projectionMatrix.makePerspective( left, left + width, top, top - height, near, this.far, this.coordinateSystem );

		this.projectionMatrixInverse.copy( this.projectionMatrix ).invert();

	}

	toJSON( meta ) {

		const data = super.toJSON( meta );

		data.object.fov = this.fov;
		data.object.zoom = this.zoom;

		data.object.near = this.near;
		data.object.far = this.far;
		data.object.focus = this.focus;

		data.object.aspect = this.aspect;

		if ( this.view !== null ) data.object.view = Object.assign( {}, this.view );

		data.object.filmGauge = this.filmGauge;
		data.object.filmOffset = this.filmOffset;

		return data;

	}

}

export { PerspectiveCamera };
