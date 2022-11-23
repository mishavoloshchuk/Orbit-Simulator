export default class Vec2 {
	x;
	y;
	constructor ({x, y}){
		this.x = x;
		this.y = y;
	}
	static multiple(...vectors){
		return vectors.reduce((vec2A, vec2B) => {
			if (typeof vec2B === 'number'){
				return {x: vec2A.x * vec2B, y: vec2A.y * vec2B}
			}
			return {x: vec2A.x * vec2B.x, y: vec2A.y * vec2B.y}
		} , {x: 1, y: 1})
	}
}