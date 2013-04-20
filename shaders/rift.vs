attribute vec2 coord;
varying vec2 oTexCoord;

void main()
{
	oTexCoord = coord;
	gl_Position = vec4((coord-vec2(0.5))*2.0, 0.0, 1.0);
}