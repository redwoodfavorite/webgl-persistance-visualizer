precision mediump float;

attribute vec3 a_position;
attribute vec2 a_texCoord;

uniform mat4 u_transform;
uniform mat4 u_perspective;
uniform float u_scale;
uniform float u_useChunk;

varying vec2 v_texCoord;

void main(void) {
	if (u_useChunk == 0.0) {
		vec4 scaled_pos = vec4(a_position * u_scale, 1.0);
	    gl_Position = u_perspective * u_transform * scaled_pos;
	}
	else if (u_useChunk == 1.0) {
		v_texCoord = a_texCoord;
		gl_Position = vec4(a_position, 1.0);
	}
	else if (u_useChunk == 2.0) {
		v_texCoord = a_texCoord;
		gl_Position = vec4(a_position, 1.0);
	}
}