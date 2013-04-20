attribute vec2 pos;
attribute vec2 coord;
uniform vec2 offset;
varying vec2 texCoord;

void main()
{
	texCoord = coord;
	gl_Position = vec4(pos + offset, 0.0, 1.0);
}