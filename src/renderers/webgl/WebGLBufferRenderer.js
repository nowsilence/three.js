function WebGLBufferRenderer( gl, extensions, info ) {

	let mode;

	function setMode( value ) {

		mode = value;

	}

	function render( start, count ) {

		gl.drawArrays( mode, start, count );

		info.update( count, mode, 1 );

	}

	function renderInstances( start, count, primcount ) {

		if ( primcount === 0 ) return;

		gl.drawArraysInstanced( mode, start, count, primcount );

		info.update( count, mode, primcount );

	}

	function renderMultiDraw( starts, counts, drawCount ) {

		if ( drawCount === 0 ) return;

		const extension = extensions.get( 'WEBGL_multi_draw' );

		if ( extension === null ) {

			for ( let i = 0; i < drawCount; i ++ ) {

				this.render( starts[ i ], counts[ i ] );

			}

		} else {
            // shader内有gl_DrawID对应当前是第几次渲染，一般不用，绘制数量变化gl_DrawID跟物体不同始终对应上（three不使用gl_DrawID的原因可能还有有些浏览器不支持，所以统一用了纹理）
            // three这里是使用的纹理，并把batchId作为顶点属性传入进去的
            // 这里的starts、counts数组每次渲染调用，都会重新上传数据，没有缓存，数量小（<100）无所谓。 数量大（>1000）每帧都有成本，且无法省略。
			extension.multiDrawArraysWEBGL(
                mode,
                starts, // 每段起始索引列表
                0, // starts 起始偏移
                counts, // 每段顶点数量列表 跟starts对应
                0, // counts 起始偏移
                drawCount // 取几组数组
            );

			let elementCount = 0;
			for ( let i = 0; i < drawCount; i ++ ) {

				elementCount += counts[ i ];

			}

			info.update( elementCount, mode, 1 );

		}

	}

	//

	this.setMode = setMode;
	this.render = render;
	this.renderInstances = renderInstances;
	this.renderMultiDraw = renderMultiDraw;

}


export { WebGLBufferRenderer };
