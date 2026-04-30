function WebGLIndexedBufferRenderer( gl, extensions, info ) {

	let mode;

	function setMode( value ) {

		mode = value;

	}

	let type, bytesPerElement;

	function setIndex( value ) {

		type = value.type;
		bytesPerElement = value.bytesPerElement;

	}

	function render( start, count ) {

		gl.drawElements( mode, count, type, start * bytesPerElement );

		info.update( count, mode, 1 );

	}

	function renderInstances( start, count, primcount ) {

		if ( primcount === 0 ) return;

		gl.drawElementsInstanced( mode, count, type, start * bytesPerElement, primcount );

		info.update( count, mode, primcount );

	}

	function renderMultiDraw( starts, counts, drawCount ) {

		if ( drawCount === 0 ) return;

		const extension = extensions.get( 'WEBGL_multi_draw' );

		if ( extension === null ) {

			for ( let i = 0; i < drawCount; i ++ ) {

				this.render( starts[ i ] / bytesPerElement, counts[ i ] );

			}

		} else {
            // 注释参见 WebGLBufferRenderer
			extension.multiDrawElementsWEBGL( 
                mode, 
                counts, // counts 每个批次有多少索引需要绘制
                0, // countsOffset 从counts哪个位置开始渲染，countsOffset + drawCount < counts.length
                type, // 索引数据类型
                starts, // offsets 每段字节偏移，长度 ≥ drawCount
                0,  // offsetsOffset 从 offsets 第几个元素开始读，通常 0
                drawCount, // 渲染几个批次
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
	this.setIndex = setIndex;
	this.render = render;
	this.renderInstances = renderInstances;
	this.renderMultiDraw = renderMultiDraw;

}


export { WebGLIndexedBufferRenderer };
