// Cross Browser Bullshit
navigator.getUserMedia =
	navigator.getUserMedia ||
	navigator.webkitGetUserMedia ||
	navigator.mozGetUserMedia ||
	navigator.msGetUserMedia ||
	navigator.oGetUserMedia;

var requestAnimationFrame =
	window.requestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.msRequestAnimationFrame;

window.requestAnimationFrame = requestAnimationFrame;

// Functions! \o/
function successLeft(stream) {
	left.src = window.URL.createObjectURL(stream);
	navigator.getUserMedia({video: true}, successRight, error);
}

function successRight(stream) {
	right.src = window.URL.createObjectURL(stream);
	left.play();
	right.play();
}

function error(e) {
	console.log(e);
}

function createProgram(vstr, fstr) {
	var program = gl.createProgram();
	var vshader = createShader(vstr, gl.VERTEX_SHADER);
	var fshader = createShader(fstr, gl.FRAGMENT_SHADER);
	
	gl.attachShader(program, vshader);
	gl.attachShader(program, fshader);
	gl.linkProgram(program);
	
	return program;
}

function createShader(str, type) {
	var shader = gl.createShader(type);
	gl.shaderSource(shader, str);
	gl.compileShader(shader);
	
	return shader;
}

function initTexture() {
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	return texture;
}

function updateTextures() {
	gl.bindTexture(gl.TEXTURE_2D, leftTex);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, left);
	
	gl.bindTexture(gl.TEXTURE_2D, rightTex);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, right);
}

function initDistortion() {
	var riftVS = getShader(gl, "riftVS");
	var riftFS = getShader(gl, "riftFS");
	
	// framebuffer setup
	distortion = {}
	
	distortion.buffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, distortion.buffer);
	distortion.width = 1280;
	distortion.height = 800;
	
	// framebuffer texture
	distortion.texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, distortion.texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, distortion.width, distortion.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
	
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, distortion.texture, 0);
	
	distortion.program = createProgram(riftVS, riftFS);
	gl.useProgram(distortion.program);
	
	distortion.program.vertexCoordAttrib = gl.getAttribLocation(distortion.program, 'coord');
	gl.enableVertexAttribArray(distortion.program.vertexCoordAttrib);
	gl.vertexAttribPointer(distortion.program.vertexCoordAttrib, 2, gl.FLOAT, false, 16, 8);
	
	gl.uniform1i(gl.getUniformLocation(distortion.program, "texture"), 0);
}

function getShader(gl, id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}
	
	var str = "";
	var k = shaderScript.firstChild;
	
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		
		k = k.nextSibling;
	}
	
	return str;
}

function update() {
	requestAnimationFrame(update);
	updateTextures();
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, distortion.buffer);
	gl.useProgram(program);
	
	gl.uniform2f(gl.getUniformLocation(program, "offset"), 0, 0);
	gl.bindTexture(gl.TEXTURE_2D, leftTex);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	
	gl.uniform2f(gl.getUniformLocation(program, "offset"), 1, 0);
	gl.bindTexture(gl.TEXTURE_2D, rightTex);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	gl.useProgram(distortion.program);
	gl.bindTexture(gl.TEXTURE_2D, distortion.texture);
	
	gl.enable(gl.SCISSOR_TEST);
	gl.scissor(0, 0, 640, 800);
	
	gl.uniform2f(gl.getUniformLocation(distortion.program, "Scale"), 0.14069278, 0.2350845);
	gl.uniform2f(gl.getUniformLocation(distortion.program, "ScaleIn"), 4.5, 2.5);
	gl.uniform4f(gl.getUniformLocation(distortion.program, "HmdWarpParam"), 1.0535, 0.1944, 0.1718, 0.0892);
	
	// left
	gl.uniform2f(gl.getUniformLocation(distortion.program, "LensCenter"), 0.28, 0.5);
	gl.uniform2f(gl.getUniformLocation(distortion.program, "ScreenCenter"), 0.25, 0.5);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	
	// right
	gl.scissor(640, 0, 640, 800);
	gl.uniform2f(gl.getUniformLocation(distortion.program, "LensCenter"), 0.72, 0.5);
	gl.uniform2f(gl.getUniformLocation(distortion.program, "ScreenCenter"), 0.75, 0.5);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	gl.disable(gl.SCISSOR_TEST);
}

// Variables
var canvas, gl, left, right, program, leftTex, rightTex, distortion;

$(function(){
	// WebGL Context
	canvas = $("#rift")[0];
	gl = canvas.getContext("experimental-webgl");

	// Camera Feeds
	left = $("#left")[0];
	right = $("#right")[0];

	// Some Random Shit
	if (navigator.getUserMedia) {
		navigator.getUserMedia({video: true}, successLeft, error);
	}

	//-- WebGL Bullshit --\\
	// Prepare Vertex Buffer
	var vertexPosBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);

	// Vertex Data
	var vertices = [
		-1.0, -1.0, 0, 0,
		 0.0, -1.0, 1, 0,
		-1.0,  1.0, 0, 1,
		 0.0,  1.0, 1, 1,
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	// Some Shader Stuff
	var vs =
		'attribute vec2 pos;' +
		'attribute vec2 coord;' +
		'varying vec2 texCoord;' +
		'uniform vec2 offset;' +
		'void main() { texCoord = coord; gl_Position = vec4(pos + offset, 0.0, 1.0); }';
		
	var fs =
		'precision highp float;' +
		'uniform sampler2D texture;' +
		'varying vec2 texCoord;' +
		'void main() { gl_FragColor = texture2D(texture, texCoord); }';
	
	// What ever the fuck a program is
	program = createProgram(vs, fs);
	gl.useProgram(program);

	program.vertexPosAttrib = gl.getAttribLocation(program, 'pos');
	gl.enableVertexAttribArray(program.vertexPosAttrib);
	gl.vertexAttribPointer(program.vertexPosAttrib, 2, gl.FLOAT, false, 16, 0);

	program.vertexCoordAttrib = gl.getAttribLocation(program, 'coord');
	gl.enableVertexAttribArray(program.vertexCoordAttrib);
	gl.vertexAttribPointer(program.vertexCoordAttrib, 2, gl.FLOAT, false, 16, 8);

	gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
	
	leftTex = initTexture();
	rightTex = initTexture();
	initDistortion();
	update();
});