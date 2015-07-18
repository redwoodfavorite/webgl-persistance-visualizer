var Thug = require('thuglife-webgl');
var glMatrix = require('gl-matrix');
var mat4 = glMatrix.mat4;
var Geometries = require('./Geometries');
var AudioSampler = require('./AudioSampler');
var OBJLoader = require('./OBJLoader');
var fSource,
	vSource,
	buffers;

function ready() {
	Thug.AssetLoader.load({
		fromURL: [
			'./glsl/fragment.glsl',
			'./glsl/vertex.glsl',
			'./obj/judah.obj'
		]
	})
	.then(initialize);
}

function initialize(assets) {
	var fSource = assets[0];
	var vSource = assets[1];
	var buffers = OBJLoader.format(assets[2]);
	console.log(buffers)

	/* Create renderer */

	var renderer = new Thug.Renderer({
		parentEl: document.body,
		fragmentShader: fSource,
		vertexShader: vSource,
		attributes: ['a_position', 'a_texCoord'],
		uniforms: [
			'u_transform',
			'u_perspective',
			'u_scale',
			'u_useChunk',
			'u_persistance',
			'u_textureCurr',
			'u_texturePrev',
			'u_opacity',
			'u_color'
		],
		arrayBuffers: ['star_positions', 'screen_uv', 'plane_positions'],
		indexBuffers: ['star_index'],
		framebuffers: [
			{ name: 'fb_curr', size: [innerWidth, innerHeight] },
			{ name: 'fb_prev0', size: [innerWidth, innerHeight] },
			{ name: 'fb_prev1', size: [innerWidth, innerHeight] }
		],
		clearColor: [0.0, 0.0, 0.0, 1.0]
	});

	/* Config options */

	var options = {
		tubeRadius: 3,
		tubeDuration: 90000,
		numTwists: 13,
		numStars: 200
	}

	/* Configure Sampler */

	var audioTag = document.createElement('audio');
		audioTag.src = "./audio/Caribou - Your Love Will Set You Free.mp3";

	var sampler = new AudioSampler();
		sampler.sampleFrom(audioTag);
		audioTag.play();

	/* Initialize Stars */

	var stars = createStars(options.numStars);
	var rootTransform = mat4.create();
	var perspectiveMat = mat4.create();
	var starsTransform = mat4.create();

	/* Populate Buffers */

	buffers.indices = Thug.GeometryHelper.trianglesToLines(buffers.indices);

	renderer.setBufferData('star_positions', buffers.vertices, 3);
	renderer.setBufferData('star_index', buffers.indices, 1);
	renderer.setBufferData('plane_positions', Geometries.Plane.vertices, 3);
	renderer.setBufferData('star_positions', buffers.vertices, 3);

	renderer.setBufferData('screen_uv', Geometries.Plane.texCoords, 2);
	renderer.setAttribute('a_texCoord');

	mat4.rotate(rootTransform, rootTransform, Math.PI, [0, 1, 0]);
	mat4.translate(starsTransform, rootTransform, [0, 0, 25]);

	renderer.setUniform('u_persistance', 'uniform1f', 0.95);

	renderer.ctx.lineWidth(3.0);
	renderer.ctx.enable(renderer.ctx.BLEND);
	renderer.ctx.blendFunc(renderer.ctx.SRC_ALPHA, renderer.ctx.ONE_MINUS_SRC_ALPHA);

	renderer.samplerToTextureSlot('u_textureCurr', 0);
	renderer.samplerToTextureSlot('u_texturePrev', 1);

	/* Draw loop */

	var index = [0, 1];

	var startColor = [1.0, 0.0, 0.0];
	var endColor = [1.0, 1.0, 0.0];
	var outColor = [];

	function draw() {

		/* 
		 * Sample Audio
		 */

		var frequencyData = sampler.sample();
		var bassFrequency = frequencyData[80] / 100;
		renderer.setUniform('u_scale', 'uniform1f', bassFrequency);
		index.reverse();

		/* 
		 * Update transforms
		 */

		mat4.perspective(perspectiveMat,
			Math.PI / 1.4,
			renderer.width / renderer.height,
			0.1,
			400.0
		);
		renderer.setUniform('u_perspective', 'uniformMatrix4fv', perspectiveMat);

		/* 
		 * Begin draw
		 */

		renderer.bindFramebuffer('fb_curr');
		renderer.clear();

		/* 
		 * Draw stars
		 */

		renderer.bindBuffer('star_positions');
		renderer.setAttribute('a_position');
		renderer.disableAttribute('a_texCoord');
		renderer.unbindTexture('fb_prev' + index[1], 0);
		renderer.setUniform('u_useChunk', 'uniform1f', 0);

		// mat4.rotate(rootTransform, rootTransform, Math.sin(Date.now() * 0.001) * 0.01, [1, 1, 0]);
		// mat4.translate(starsTransform, rootTransform, [0, 0, 25]);

		updateStarMatrices(stars);
		var time = Date.now();
		var dist;
		for (var i = 0; i < stars.length; i++) {
			dist = (time % options.tubeDuration / options.tubeDuration * 50 - (50 * stars[i].offset + 100)) % 25 / -50;
			renderer.setUniform('u_transform', 'uniformMatrix4fv', stars[i].transform);
			renderer.setUniform('u_color', 'uniform3fv', mix(outColor, startColor, endColor, dist));
			renderer.setUniform('u_opacity', 'uniform1f', 1.0);
			renderer.drawElements('LINES');
		}

		/*
		 * Draw fullscreen quad for PP
		 */
		renderer.bindFramebuffer('fb_prev' + index[0]);

		renderer.bindTexture('fb_curr', 0);
		renderer.bindTexture('fb_prev' + index[1], 1);
		renderer.bindBuffer('plane_positions');
		renderer.setAttribute('a_position');
		renderer.enableAttribute('a_texCoord');
		renderer.setUniform('u_useChunk', 'uniform1f', 1);
		renderer.drawArrays('TRIANGLE_STRIP');

		/*
		 * Draw to screen
		 */
		renderer.bindFramebuffer(null);

		renderer.bindTexture('fb_prev' + index[0], 0);
		renderer.setUniform('u_useChunk', 'uniform1f', 2);
		renderer.drawArrays('TRIANGLE_STRIP');

		requestAnimationFrame(draw);
	}

	draw();

	function updateStarMatrices(stars) {
		var time = Date.now();

		for (var i = 0; i < stars.length; i++) {
			mat4.translate(
				stars[i].transform,
				starsTransform,
				[
					Math.sin(time * 0.001 + 2 * Math.PI * options.numTwists * stars[i].offset) * options.tubeRadius,
					Math.cos(time * 0.001 + 2 * Math.PI * options.numTwists * stars[i].offset) * options.tubeRadius,
					(time % options.tubeDuration / options.tubeDuration * 50 - (50 * stars[i].offset + 100)) % 25
				]
			);
			
			mat4.rotate(stars[i].transform, stars[i].transform, stars[i].rotation += 0.01, [ 1, 1, 1 ]);
		}
	}
}

function mix(out, in1, in2, blend) {
	for (var i = 0, len = in1.length; i < len; i++) {
		out[i] = blend * in1[i] + 1 - blend * in2[i];
	}

	return out;
}

function createStars (nStars) {
	var stars = [];

	for (var i = 0; i < nStars; i++) {
		stars.push({ offset: i / nStars, transform: mat4.create(), rotation: 0 });
	}

	return stars;
}

window.onload = ready;
