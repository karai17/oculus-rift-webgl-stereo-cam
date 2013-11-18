// Cross Browser Bullshit
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;

// Log Errors
function error(e) {
	console.log(e);
}

// Get Contents From File
function getContentsFromFile(url) {
	return $.ajax({
		type		: "GET",
		url			: url,
		dataType	: "string",
		async		: false,
		success		: function(data) {
			shader = data;
		}
	}).responseText;
}

// Successfully Get Left Camera
function successLeft(stream, left, right) {
	left.stream.src = window.URL.createObjectURL(stream);
	navigator.getUserMedia({video: true}, function(stream){ successRight(stream, left, right) }, error);
}

// Successfully Get Right Camera
function successRight(stream, left, right) {
	right.stream.src = window.URL.createObjectURL(stream);
	left.stream.play();
	right.stream.play();
}

// Create Shader
function createShader(gl, str, type) {
	var shader = gl.createShader(type);
	gl.shaderSource(shader, str);
	gl.compileShader(shader);
	
	return shader;
}

// Create Program
function createProgram(gl, vstr, fstr) {
	var program = gl.createProgram();
	var vshader = createShader(gl, vstr, gl.VERTEX_SHADER);
	var fshader = createShader(gl, fstr, gl.FRAGMENT_SHADER);
	
	gl.attachShader(program, vshader);
	gl.attachShader(program, fshader);
	gl.linkProgram(program);
	
	return program;
}

// Initialize Texture
function initTexture(gl) {
	var texture = gl.createTexture();
	
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	return texture;
}

// Initialize Position
function initPosition(gl) {
	// Initialize Vertex Buffer
	var buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

	// Vertex Data
	var vertices = [
		-1.0, -1.0, 0, 0,
		 0.0, -1.0, 1, 0,
		-1.0,  1.0, 0, 1,
		 0.0,  1.0, 1, 1,
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	
	// Create Program
	var texVs = getContentsFromFile("shaders/texture.vs");
	var texFs = getContentsFromFile("shaders/texture.fs");
	var program = createProgram(gl, texVs, texFs);
	gl.useProgram(program);
	
	program.vertexPosAttrib = gl.getAttribLocation(program, 'pos');
	gl.enableVertexAttribArray(program.vertexPosAttrib);
	gl.vertexAttribPointer(program.vertexPosAttrib, 2, gl.FLOAT, false, 16, 0);

	program.vertexCoordAttrib = gl.getAttribLocation(program, 'coord');
	gl.enableVertexAttribArray(program.vertexCoordAttrib);
	gl.vertexAttribPointer(program.vertexCoordAttrib, 2, gl.FLOAT, false, 16, 8);

	gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
	
	return program;
}

// Initialize Distortion
function initDistortion(gl) {
	// Initialize Frame Buffer
	var buffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
	
	// Initialize Texture
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	var w = 1280;
	var h = 800;
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	
	// Create Program
	var vs = getContentsFromFile("shaders/rift.vs");
	var fs = getContentsFromFile("shaders/rift.fs");
	var program = createProgram(gl, vs, fs);
	gl.useProgram(program);
	
	program.vertexCoordAttrib = gl.getAttribLocation(program, 'coord');
	gl.enableVertexAttribArray(program.vertexCoordAttrib);
	gl.vertexAttribPointer(program.vertexCoordAttrib, 2, gl.FLOAT, false, 16, 8);
	
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
	
	return {
		buffer	: buffer,
		texture	: texture,
		program	: program,
	};
}

// Update Eye
function updateEye(gl, eye) {
	gl.bindTexture(gl.TEXTURE_2D, eye.texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, eye.stream);
}

// Update Loop
function update(gl, left, right, position, distortion) {
	// Loop
	requestAnimationFrame(function(){ update(gl, left, right, position, distortion) });
	
	updateEye(gl, left);
	updateEye(gl, right);
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, distortion.buffer);
	gl.useProgram(position);
	
	gl.uniform2f(gl.getUniformLocation(position, "offset"), 0, 0);
	gl.bindTexture(gl.TEXTURE_2D, left.texture);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	
	gl.uniform2f(gl.getUniformLocation(position, "offset"), 1, 0);
	gl.bindTexture(gl.TEXTURE_2D, right.texture);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	gl.useProgram(distortion.program);
	gl.bindTexture(gl.TEXTURE_2D, distortion.texture);
	
	gl.uniform2f(gl.getUniformLocation(distortion.program, "Scale"), 0.1469278, 0.2350845);
	gl.uniform2f(gl.getUniformLocation(distortion.program, "ScaleIn"), 4, 2.5);
	gl.uniform4f(gl.getUniformLocation(distortion.program, "HmdWarpParam"), 1, 0.22, 0.24, 0);
	
	// Scissors
	gl.enable(gl.SCISSOR_TEST);
	
	// Left Eye
	gl.scissor(0, 0, 640, 800);
	gl.uniform2f(gl.getUniformLocation(distortion.program, "LensCenter"), 0.2863248, 0.5);
	gl.uniform2f(gl.getUniformLocation(distortion.program, "ScreenCenter"), 0.25, 0.5);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	
	// Right Eye
	gl.scissor(640, 0, 640, 800);
	gl.uniform2f(gl.getUniformLocation(distortion.program, "LensCenter"), 0.7136753, 0.5);
	gl.uniform2f(gl.getUniformLocation(distortion.program, "ScreenCenter"), 0.75, 0.5);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	gl.disable(gl.SCISSOR_TEST);
}

$(function(){
	// Initialize WebGL Context
	var canvas = $("#rift")[0];
	var gl = canvas.getContext("experimental-webgl");
	
	// Initialize Left Eye
	var left = {
		stream	: $("#left")[0],
		texture	: initTexture(gl),
	};
	
	// Initialize Right Eye
	var right = {
		stream	: $("#right")[0],
		texture	: initTexture(gl),
	};
	
	// Initialize Camera Streams
	if (navigator.getUserMedia) {
		navigator.getUserMedia({video: true}, function(stream){ successLeft(stream, left, right) }, error);
	}
	
	// Initialize Programs
	var position = initPosition(gl);
	var distortion = initDistortion(gl);
	
	// Update Loop
	update(gl, left, right, position, distortion);
});