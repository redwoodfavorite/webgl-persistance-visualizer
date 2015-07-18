precision mediump float;

uniform sampler2D u_textureCurr;
uniform sampler2D u_texturePrev;
uniform float u_persistance;
uniform float u_useChunk;
uniform float u_opacity;
uniform vec3 u_color;

varying vec2 v_texCoord;

void main(void) {
	if (u_useChunk == 0.0) {
		gl_FragColor = vec4(u_color, u_opacity);
	}
	else if (u_useChunk == 1.0) {
		gl_FragColor = mix(
			texture2D(u_textureCurr, v_texCoord),
			texture2D(u_texturePrev, v_texCoord),
			u_persistance
		);
	}
	else if (u_useChunk == 2.0) {
		gl_FragColor = texture2D(u_textureCurr, v_texCoord);
	}
}