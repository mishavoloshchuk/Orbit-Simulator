export default class IndicateFPS {
	static indicatorId = 0;
	label = "FPS";
	roundTo = 0;
	updateInterval = 1000; // Recomended
	goodFPS = 45
	badFPS = 20
	#lastFrameTimestamp = performance.now(); // Last frame timestamp
	#frameTime; // Last frame frametime
	#fps; // FPS
	#refreshInterval;
	#frameCount = 0;
	#fpsStatus = false;
	get frameTime() { return this.#frameTime } // Give #frameTime
	get fps() { return this.#fps } // Give #fps

	constructor(dom = document.body){
		this.element = document.createElement('div');
		Object.assign(this.element.style, { // FPS element styles:
			display: 'none',
			padding: '2px 4px',
			fontFamily: 'arial',
			color: '#FFFFFF',
			cursor: 'default',
			opacity: 0.7,
			fontFamily: 'arial',
			fontWeight: 'bold',
			transition: '0.3s'
		});
		this.element.id = 'FPS_Indicator_' + IndicateFPS.indicatorId;
		dom.appendChild(this.element); // Add FPS element to DOM
		IndicateFPS.indicatorId ++;
	}
	measure(){
		const timeStamp = performance.now(); // Time now
		this.#frameTime = timeStamp - this.#lastFrameTimestamp;
		this.#lastFrameTimestamp = timeStamp;
		this.#fps = 1000 / this.#frameTime; // Calculate FPS value
		if (this.#fpsStatus){
			this.#frameCount ++;
		}
	}
	setIndicator(val){
		// Set element html text value
		val = Math.round(val * 10**this.roundTo) / 10**this.roundTo // Round
		let color; // FPS indicator color
		if (val >= this.goodFPS) color = '#55ff55'; // Green - best FPS
		else if (val >= this.badFPS) color = '#ffff44'; // Yellow - medium FPS
		else color = '#ff0044'; // Red - low FPS
		// Set indicator value
		this.element.innerHTML = `${this.label}: <span style="color: ${color}">${val}</span>`;
	}
	turnOn(){
		this.#fpsStatus = true;
		this.element.style.display = 'block'; // Show FPS element
		this.element.innerHTML = this.label + ': __'; // Init label
		this.#frameCount = 0;
		this.#refreshInterval = setInterval(()=>{ 
			this.setIndicator(this.#frameCount * (1000 / this.updateInterval)); 
			this.#frameCount = 0;
		}, this.updateInterval); // Create refresh interval
	}
	turnOff(){
		this.#fpsStatus = false;
		this.element.style.display = 'none'; // Hide FPS element
		this.element.style.color = "#ffffff";
		clearInterval(this.#refreshInterval); // Clear refresh interval
	}
}