
function WebGLRenderer(options) {
	this.canvas = document.createElement('canvas');
	this.canvas.width = innerWidth;
	this.canvas.height = innerHeight;

	options.parentEl.appendChild(this.canvas);

	this.ctx = this.canvas.getContext('webgl');

	this.shaderProgram = createProgram.call(this, options.fragmentShader, options.vertexShader);
	if (options.attributes) this.attributeLocations = initAttributes.call(this, options.attributes);
	if (options.uniforms) this.uniformLocations = initUniforms.call(this, options.uniforms);

	this.buffers = createBuffers.call(this, options.arrayBuffers, options.indexBuffers);

	this.framebuffers = {};
	this.renderbuffers = {};
	this.textures = {};

	if (options.framebuffers) this.initFrameBuffers(options.framebuffers);

	this.boundArrayBuffer;
	this.boundIndexBuffer;

	if (options.clearColor) this.ctx.clearColor.apply(this.ctx, options.clearColor);

	this.updateSize(innerWidth, innerHeight);
}

WebGLRenderer.prototype.clear = function clear() {
	this.ctx.clear(this.ctx.COLOR_BUFFER_BIT | this.ctx.DEPTH_BUFFER_BIT);
};

WebGLRenderer.prototype.drawArrays = function drawArrays(drawType, stride) {
	this.ctx.drawArrays(this.ctx[drawType], stride || 0, this.boundArrayBuffer.numItems);
};

WebGLRenderer.prototype.drawElements = function drawElements(drawType, offset) {
	this.ctx.drawElements(this.ctx[drawType], this.boundIndexBuffer.numItems, this.ctx.UNSIGNED_SHORT, offset || 0);
};

WebGLRenderer.prototype.disableAttribute = function disableAttribute(key) {
    this.ctx.disableVertexAttribArray(this.attributeLocations[key]);
};

WebGLRenderer.prototype.enableAttribute = function enableAttribute(key) {
    this.ctx.enableVertexAttribArray(this.attributeLocations[key]);
};

WebGLRenderer.prototype.createTexture = function createTexture(size, format, type, target, filters) {

	// Create texture

	var texture = this.ctx.createTexture();
		texture.width = size[0];
		texture.height = size[1];
		texture.format = format ? this.ctx[format] : this.ctx['RGBA'];
		texture.type = type ? this.ctx[type] : this.ctx['UNSIGNED_BYTE'];
		texture.target = target ? this.ctx[target] : this.ctx['TEXTURE_2D'];


	// Bind texture

    this.ctx.bindTexture(texture.target, texture);

    // Set texture options

    this.ctx.texParameteri(texture.target, this.ctx.TEXTURE_MAG_FILTER, this.ctx[filters && filters.mag ? filters.mag : 'LINEAR']);
    this.ctx.texParameteri(texture.target, this.ctx.TEXTURE_MIN_FILTER, this.ctx[filters && filters.min ? filters.min : 'LINEAR']);

    if (!isPowerOfTwo(size[0], size[1])) {
	    this.ctx.texParameteri(texture.target, this.ctx.TEXTURE_WRAP_S, this.ctx.CLAMP_TO_EDGE);
	    this.ctx.texParameteri(texture.target, this.ctx.TEXTURE_WRAP_T, this.ctx.CLAMP_TO_EDGE);
    }

    // Set texture width and height

    this.ctx.texImage2D(texture.target, 0, texture.format, texture.width, texture.height, 0, texture.format, texture.type, null);

    // Unbind texture

    this.ctx.bindTexture(texture.target, null);

	return texture;
}

WebGLRenderer.prototype.initFrameBuffers = function initFrameBuffers(framebuffers) {
	var accessor;
	var size;

	for (var i = 0; i < framebuffers.length; i++) {
		accessor = framebuffers[i].name;
		size = framebuffers[i].size;

	    this.framebuffers[accessor] = this.ctx.createFramebuffer();
	    this.renderbuffers[accessor] = this.ctx.createRenderbuffer();
	    this.textures[accessor] = this.createTexture(size);

    	this.bindFramebuffer(accessor);

    	this.ctx.framebufferTexture2D(this.ctx.FRAMEBUFFER, this.ctx.COLOR_ATTACHMENT0, this.ctx.TEXTURE_2D, this.textures[accessor], 0);
	    this.ctx.framebufferRenderbuffer(this.ctx.FRAMEBUFFER, this.ctx.DEPTH_ATTACHMENT, this.ctx.RENDERBUFFER, this.renderbuffers[accessor]);
    	this.ctx.renderbufferStorage(this.ctx.RENDERBUFFER, this.ctx.DEPTH_COMPONENT16, size[0], size[1]);
	}

	this.bindFramebuffer(null);
};

WebGLRenderer.prototype.unbindTexture = function unbindTexture(key, active) {
	var texture = this.textures[key];

	if (active !== undefined) this.ctx.activeTexture(this.ctx.TEXTURE0 + active);

	this.ctx.bindTexture(texture.target, null);	
}

WebGLRenderer.prototype.samplerToTextureSlot = function samplerToTextureSlot (uniformName, textureSlot) {
	var uniformLocation = this.uniformLocations[uniformName];

	if (uniformLocation === undefined) throw 'Sampler ' + uniformName + ' not found!';

	return this.ctx.uniform1i(this.uniformLocations[uniformName], textureSlot);
}

WebGLRenderer.prototype.bindTexture = function bindTexture(key, active) {
	var texture = this.textures[key];

	if (active !== undefined) this.ctx.activeTexture(this.ctx.TEXTURE0 + active);

	this.ctx.bindTexture(texture.target, texture);
}

WebGLRenderer.prototype.bindFramebuffer = function bindFramebuffer(key) {
	var framebuffer = this.framebuffers[key];
	var renderbuffer = this.renderbuffers[key];

    this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, framebuffer || null);
    this.ctx.bindRenderbuffer(this.ctx.RENDERBUFFER, renderbuffer || null);
};

WebGLRenderer.prototype.viewport = function viewport(width, height, offsetX, offsetY) {
	return this.ctx.viewport(offsetX || 0, offsetY || 0, width, height);
}

WebGLRenderer.prototype.setAttribute = function setAttribute(attributeKey) {
	if (this.attributeLocations[attributeKey] === -1) throw 'ATTRIBUTE LOCATION NOT FOUND';
	else if (!this.boundArrayBuffer) throw 'NO BOUND ARRAY_BUFFER';

	return this.ctx.vertexAttribPointer(
		this.attributeLocations[attributeKey],
		this.boundArrayBuffer.itemSize,
		this.ctx.FLOAT,
		false, 0, 0
	);
}

WebGLRenderer.prototype.setBufferData = function setBufferData(key, data, size) {
	var buffer = this.bindBuffer(key);
	var data = buffer.isIndex ? new Uint16Array(data) : new Float32Array(data);

	this.ctx.bufferData(buffer.target, data, this.ctx.STATIC_DRAW);

	buffer.itemSize = size;
	buffer.numItems = data.length / size;
}

WebGLRenderer.prototype.bindBuffer = function bindBuffer(key) {
	var buffer = this.buffers[key];
	this.ctx.bindBuffer(buffer.target, buffer);

	if (buffer.isIndex) this.boundIndexBuffer = buffer;
	else this.boundArrayBuffer = buffer;

	return buffer;
}

WebGLRenderer.prototype.setDrawState = function setDrawState(funcName, value) {
	return this.ctx[funcName](value);
}

WebGLRenderer.prototype.setUniform = function setUniform(uniformName, type, value) {
	var location = this.uniformLocations[uniformName];

    switch (type) {
        case 'uniform4fv': return this.ctx.uniform4fv(location, value); break;
        case 'uniform3fv': return this.ctx.uniform3fv(location, value); break;
        case 'uniform2fv': return this.ctx.uniform2fv(location, value); break;
        case 'uniform1fv': return this.ctx.uniform1fv(location, value); break;
        case 'uniform1f' : return this.ctx.uniform1f(location, value);  break;
        case 'uniformMatrix3fv': return this.ctx.uniformMatrix3fv(location, false, value); break;
        case 'uniformMatrix4fv': return this.ctx.uniformMatrix4fv(location, false, value); break;
    }
	// if (type === 'uniform1f' || type === 'uniform1i') return this.ctx[type](location, value);

	// return this.ctx[type](location, false, value);
}

WebGLRenderer.prototype.updateSize = function updateSize(width, height) {
	//fix later
    this.ctx.viewport(0, 0, width, height);

	this.canvas.width = width;
	this.canvas.height = height;

	this.width = width;
	this.height = height;
}

function initAttributes(attributes) {
	var locations = {};
	var attributeName;
	var location;

	for (var i = 0; i < attributes.length; i++) {
		attributeName = attributes[i];
		location = this.ctx.getAttribLocation(this.shaderProgram, attributeName);
		this.ctx.enableVertexAttribArray(location);
		if (location === null || location === -1) throw 'INVALID ATTRIBUTE LOCATION' + attributeName;
		else locations[attributeName] = location;
	}

	return locations;
}

function initUniforms(uniforms) {
	var locations = {};
	var uniformName;
	var location;

	for (var i = 0; i < uniforms.length; i++) {
		uniformName = uniforms[i];
		location = this.ctx.getUniformLocation(this.shaderProgram, uniformName);
		if (location === null || location === -1) throw 'INVALID UNIFORM LOCATION FOR ' + uniformName;
		else locations[uniformName] = location;
	}

	return locations;
}

function createProgram(fSource, vSource) {
	var shaderProgram;
	var ctx = this.ctx;

    vertexShader = ctx.createShader(ctx.VERTEX_SHADER);
    fragmentShader = ctx.createShader(ctx.FRAGMENT_SHADER);

    ctx.shaderSource(vertexShader, vSource);
    ctx.compileShader(vertexShader);
    checkCompileStatus.call(this, vertexShader);

    ctx.shaderSource(fragmentShader, fSource);
    ctx.compileShader(fragmentShader);
    checkCompileStatus.call(this, fragmentShader);

    shaderProgram = ctx.createProgram();
    ctx.attachShader(shaderProgram, vertexShader);
    ctx.attachShader(shaderProgram, fragmentShader);
    ctx.linkProgram(shaderProgram);

    if (!ctx.getProgramParameter(shaderProgram, ctx.LINK_STATUS))
    	throw 'Link error: ' + this.ctx.getProgramInfoLog(shaderProgram);

    ctx.useProgram(shaderProgram);

    return shaderProgram;
}

function createBuffers(arrayBuffers, indexBuffers) {
	var buffers = {};

	for (var i = 0; i < arrayBuffers.length; i++) {
		buffers[arrayBuffers[i]] = this.ctx.createBuffer();
		buffers[arrayBuffers[i]].isIndex = false;
		buffers[arrayBuffers[i]].target = this.ctx.ARRAY_BUFFER;
	}

	for (var i = 0; i < indexBuffers.length; i++) {
		buffers[indexBuffers[i]] = this.ctx.createBuffer();
		buffers[indexBuffers[i]].isIndex = true;
		buffers[indexBuffers[i]].target = this.ctx.ELEMENT_ARRAY_BUFFER;
	}

	return buffers;
}

/* Thanks Adnan */
function checkCompileStatus(shader) {
    if (!this.ctx.getShaderParameter(shader, this.ctx.COMPILE_STATUS)) {
        console.error('compile error: ' + this.ctx.getShaderInfoLog(shader));
        console.error('1: ' + source.replace(/\n/g, function () { return '\n' + (i+=1) + ': '; }));
    }
}

function isPowerOfTwo(width, height) {
    return (width & width - 1) === 0 
        && (height & height - 1) === 0;
};