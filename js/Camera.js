export default class Camera{
	static cameraId = 0;

	#x = 0; #y = 0; // Target camera position
	get x() { return this.#x } get y() { return this.#y } // Get x, y handler
	set x(pos) { this.#x = pos; if (this.Target === undefined) this.cameraChangedState(); } // Set x handler
	set y(pos) { this.#y = pos; if (this.Target === undefined) this.cameraChangedState(); } // Set y handler
	ax = 0; ay = 0; // Actualy camera postiton with animation
	lastX = 0; lastY = 0; // Last camera position
	centerX = innerWidth / 2; // Center camera point on screen
	centerY = innerHeight / 2; // Center camera point on screen
	#zoom = 1; // Target zoom
	set zoom(val) { this.#zoom = val; this.cameraChangedState(); }
	animZoom = 1; // Actualy zoom with animation
	zoomCff = 1.25; // Zoom coefficient
	Target = undefined; // Follow target object
	switchTarget = false;
	animTimeCorrect = 5;
	animTime = 5;
	animationDuration = 5; // Animation duration
	animation = true; // Enable camera animation
	#clrDelay = false;
	#clrDTim = 75/(1 + 1/this.animationDuration - 1); // Time to clear, after camera move animation
	#clrTmt = setTimeout(()=>{ this.#clrDelay = false }, this.#clrDTim);
	cameraChangedState(){
		this.#clrDelay = true;
		clearTimeout(this.#clrTmt);
		this.#clrTmt = setTimeout(()=>{ this.#clrDelay = false }, this.#clrDTim);
	}

	constructor(){
		Camera.cameraId ++;
	}

	screenPix(coord, axis){ // Cursor position in world
		let sCtrX = this.centerX - this.ax;
		let sCtrY = this.centerY - this.ay;
		switch (axis){
			case 'x': return coord/this.animZoom - (sCtrX - this.ax*(this.animZoom-1))/this.animZoom;
			case 'y': return coord/this.animZoom - (sCtrY - this.ay*(this.animZoom-1))/this.animZoom;
		}
	}

	screenPix2(xPix, yPix){ // Cursor position in world
		let sCtrX = this.centerX - this.ax;
		let sCtrY = this.centerY - this.ay;
		return [
			xPix/this.animZoom - (sCtrX - this.ax*(this.animZoom-1))/this.animZoom,
			yPix/this.animZoom - (sCtrY - this.ay*(this.animZoom-1))/this.animZoom
			];
	}

	animFunc(){
		let animSpeedCorrected = this.animTimeCorrect*(16/fpsIndicator.frameTime);
		if (this.switchTarget){
			this.animTimeCorrect -= (this.animTime-1)/(400/fpsIndicator.frameTime);
		} else {
			this.animTimeCorrect = this.animationDuration;
		}
		animSpeedCorrected = animSpeedCorrected < 1 ? 1 : animSpeedCorrected;
		this.animZoom += ((this.#zoom-this.animZoom)/animSpeedCorrected);
		this.lastX = this.ax; this.lastY = this.ay;
		if (this.animation){
			this.ax += (this.x-this.ax)/(animSpeedCorrected/(this.#zoom/this.animZoom));
			this.ay += (this.y-this.ay)/(animSpeedCorrected/(this.#zoom/this.animZoom));
		} else {
			this.ax = this.x; this.ay = this.y;
		}
	}

	zoomTo(zmFactor){ // Value 2 is 2x zoom. Value -2 is 0.5x zoom. Value 0.5 is 0.5x zoom.
		const dir = zmFactor > 0 ? 1 : -1; // Zoom direction. 1 zoom in, -1 zoom out.
		let fac = zmFactor > 0 ? zmFactor : -1 / zmFactor; // Calculate zoom factor
		if (zmFactor*zmFactor == 1) return; // If zoom factor == 1
		if (dir === 1){ // Zoom in
			if (this.#zoom < 10000) { // Max zoom value
				this.#zoom *= fac; // Set new zoom
			} else { return }
		} else { // Zoom out
			if (this.#zoom > 1.0e-12) { // Min zoom value
				this.#zoom *= fac; // Set new zoom
			} else { return }
		}
		this.cameraChangedState();
		if (!ui.zoomToScreenCenter.state){
			this.x += (this.screenPix(mouse.x, 'x')-this.x)/(fac/(fac-1));
			this.y += (this.screenPix(mouse.y, 'y')-this.y)/(fac/(fac-1));
		}
	}

	frame(){
		// If camera changed position or zoom
		if (this.#clrDelay){ 
			renderer.clearLayer(2);
			renderer.allowFrameRender = true;
		}
		if (this.switchTarget){
			this.cameraChangedState();
		}

		this.setPositionToTarget();

		this.animFunc(); // Camera animation
	}

	setTarget(objectId){
		if (!scene.objArr[objectId]) objectId = undefined; // If there is no object with given id
		this.Target = objectId;
		if (objectId !== undefined){
			this.switchTarget = true;
			this.animation = true;
			setTimeout(()=>{this.animation = false; this.switchTarget = false;}, 400);
		} else {
			this.animation = true;
		}
	}

	hasTarget(){
		return this.Target !== undefined;
	}

	setPositionToTarget(){
		if (scene.objArr[this.Target]){
			this.x = scene.objArr[this.Target].x;
			this.y = scene.objArr[this.Target].y;
		}
	}
}