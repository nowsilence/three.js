export default /* glsl */`
#ifdef USE_SKINNING
    // 本地坐标系->绑定空间，即转化为绑定空间的一点
    // mesh的transformed是本地坐标系的一点，并不是绑定空间下的点
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );

	vec4 skinned = vec4( 0.0 ); // 当前世界空间的一点
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
    // 转回本地坐标系
	transformed = ( bindMatrixInverse * skinned ).xyz;

#endif
`;
