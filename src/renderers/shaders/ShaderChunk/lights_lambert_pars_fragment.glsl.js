export default /* glsl */`
varying vec3 vViewPosition;

// 漫反射光强 = 环境光强 + 漫反射系数 × 光源强度 × max (0, 法向量与光线方向的点积)
// 数学表达式：I_d = I_a + K_d * I_l * max(0, n · l)
// I_d：最终漫反射光强，仅包含环境光和漫反射光。
// I_a：环境光强，场景的基础光照（无直接光源时的亮度）。
// K_d：漫反射系数（0~1），由物体材质决定，越粗糙的材质K_d越接近 1。
// I_l：光源强度，直接光源的发光能力。
// n：物体表面单位法向量（垂直于表面，需归一化）。
// l：表面点指向光源的单位向量（需归一化）。
// max(0, n · l)：过滤光线照射不到的表面（点积 < 0 时取 0，避免背面受光）。
struct LambertMaterial {

	vec3 diffuseColor; // 漫反射颜色（基础色）物体的基础漫反射颜色（如红色布料的vec3(1.0, 0.0, 0.0)），替代了经典 Lambert 公式中的漫反射系数Kd（本质是Kd与基础色的结合）；
	float specularStrength;

};

void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
    // 公式：(I_d = I_l *  K_d * max(0, n · l)); // n l 为向量
    // I_l: directLight.color
    // max(0, n·l): dotNL
    // K_d: diffuseColor 即 BRDF_Lambert(material.diffuseColor)
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
    // 2. 计算直接光源的辐照度（ irradiance = 光源颜色 × 入射角余弦 ）
	vec3 irradiance = dotNL * directLight.color;

    // 3. 累加直接漫反射光：辐照度 × Lambert BRDF（漫反射颜色）
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );

}

// 间接漫反射（环境漫反射）模拟「环境光照射产生的漫反射」（对应经典 Lambert 公式中的I_a环境光）
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
    // / 累加间接漫反射光：环境辐照度 × Lambert BRDF irradiance通常指的是光照
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );

}

#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert
`;
