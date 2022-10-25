export default class IndicateFPS{
	static indicatorId = 0;
	#lastFrameTimestamp = performance.now(); // Last frame timestamp
	#frameTime; // Last frame frametime
	#fps; // FPS
	#refreshInterval;
	roundTo = 1;
	get frameTime() { return this.#frameTime } // Give #frameTime
	get fps() { return this.#fps } // Give #fps

	constructor(dom = document.body){
		this.element = document.createElement('div');
		Object.assign(this.element.style, { // FPS element styles:
			position: 'absolute',
			right: '10px',
			bottom: '10px',
			display: 'none',
			fontFamily: 'arial',
			cursor: 'default'
		});
		this.element.className = 'canvas';
		this.element.id = 'FPS_Indicator_' + IndicateFPS.indicatorId;
		dom.appendChild(this.element); // Add FPS element to DOM
		IndicateFPS.indicatorId ++;
	}
	measure(){
		let timeStamp = performance.now(); // Time now
		this.#frameTime = timeStamp - this.#lastFrameTimestamp; // Calculate frame time
		this.#lastFrameTimestamp = timeStamp; // Set the #lastFrameTimestamp
		this.#fps = 1000/this.#frameTime; // Calculate FPS value
	}
	setIndicator(val){
		// Get the rounded #fps value then convert it to a string and split it with dot "." >> Array(2) // Array(1) if got an integer
		let fpsString = ( Math.round( val * Math.pow(10, this.roundTo) ) / Math.pow(10, this.roundTo) ).toString().split('.');
		// Make the #fps string (if got an integer before, fill zeros after dot)
		fpsString = fpsString[0] + '.' + ( fpsString.length > 1 ? fpsString[1].padEnd(this.roundTo, '0') : '0'.repeat(this.roundTo) );
		// Set element html text value
		this.element.innerHTML = "FPS: " + fpsString;
		let color; // FPS indicator color
		if (val >= 45) color = '#00ff00'; // Green - best FPS
		else if (val >= 20) color = '#ffff00'; // Yellow - tolerant FPS
		else color = '#ff0044'; // Red - low FPS
		this.element.style.color = color; // Set indicator color
	}
	turnOn(){
		this.element.style.display = 'block'; // Show FPS element
		this.element.innerHTML = 'FPS: __'; // Inin element innerHTML state
		this.#refreshInterval = setInterval(()=>{ this.setIndicator(this.#fps); }, 500); // Create refresh interval
	}
	turnOff(){
		this.element.style.display = 'none'; // Hide FPS element
		clearInterval(this.#refreshInterval); // Clear refresh interval
	}
}