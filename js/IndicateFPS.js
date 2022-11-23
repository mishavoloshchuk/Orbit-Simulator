export default class IndicateFPS{
	static indicatorId = 0;
	#lastFrameTimestamp = performance.now(); // Last frame timestamp
	#frameTime; // Last frame frametime
	#fps; // FPS
	#refreshInterval;
	#frameCount = 0;
	#fpsStatus = false;
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
			cursor: 'default',
			opacity: 0.7,
			fontFamily: 'arial',
			fontWeight: 'bold',
			transition: '0.3s',
			zIndex: 1
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
		if (this.#fpsStatus){
			this.#frameCount ++;
		}
	}
	setIndicator(val){
		// Set element html text value
		this.element.innerHTML = "FPS: " + val; // Set indicator value
		let color; // FPS indicator color
		if (val >= 45) color = '#55ff55'; // Green - best FPS
		else if (val >= 20) color = '#ffff44'; // Yellow - tolerant FPS
		else color = '#ff0044'; // Red - low FPS
		this.element.style.color = color; // Set indicator color
	}
	turnOn(){
		this.#fpsStatus = true;
		this.element.style.display = 'block'; // Show FPS element
		this.element.innerHTML = 'FPS: __'; // Inin element innerHTML state
		this.#frameCount = 0;
		this.#refreshInterval = setInterval(()=>{ this.setIndicator(this.#frameCount); this.#frameCount = 0; }, 1000); // Create refresh interval
	}
	turnOff(){
		this.#fpsStatus = false;
		this.element.style.display = 'none'; // Hide FPS element
		this.element.style.color = "#ffffff";
		clearInterval(this.#refreshInterval); // Clear refresh interval
	}
}