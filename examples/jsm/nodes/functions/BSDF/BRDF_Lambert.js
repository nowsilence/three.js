import { tslFn } from '../../shadernode/ShaderNode.js';

const BRDF_Lambert = tslFn( ( inputs ) => {
    // inputs 材质的反照率（表面固有的颜色，如物体的基础色）
    // 朗伯模型的BRDF值 = 反照率 / π
    // 除以π是为了能量守恒（确保反射光总能量不超过入射光）
	return inputs.diffuseColor.mul( 1 / Math.PI ); // punctual light 精确光源
    // 输出：朗伯 BRDF 的计算结果，用于后续与入射光强度、光线与法线夹角的余弦值（dot(normal, lightDir)）相乘，得到最终的漫反射贡献
} ); // validated

export default BRDF_Lambert;
