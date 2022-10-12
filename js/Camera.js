import UserInput from '/js/UserInput.js';
export default class Camera{
	static cameraId = 0;
	#width = window.innerWidth;
	#height = window.innerHeight;

	zoomCff = 1.25;

	#frameTime = [0, Date.now()]; // Frametime

	set width (width){
		this.width = this.canv0.width = this.canv2.width = this.canv3.width = width;
	}
	set height (height){
		this.height = this.canv0.height = this.canv2.height = this.canv3.height = height;
	}
	get width (){
		return this.#width;
	}
	get height (){
		return this.#height;
	}

	#visualObjectSelectAnimation = 10;
	#visualObjectSelectAnimDir = 0;

	obj_count = 0;

	switcher = {del_pulse: 10, del_pulse_state: false, pause: false,
		pause2: false, music: false,
		obj_count: this.obj_count, device: 'desktop',
		r_gm: 1, ref_Interact: 0,
		traj_mode: 1, traj_mode2: 1,
		sel_orb_obj: false, 
		create_obj_pause: true,
		trace_opacity: 0.7, trace_blur: 0,
		clr_trace: false, clr_canv2: true, visT: false}; // Collisions: repulsion merge none

	swch = {s_track: true, t_object: false, prev_t_obj: false, vis_traj: false,
		s_edit: true, edit_obj: false, orb_obj: 'sun', equilib_orb: false};

	menu_names = {create: 'menu_options', delete: 'del_menu_options', edit: 'edit_menu',
		help: 'help_menu', settings: 'settings_menu', camera: 'camera_menu', trajectory: 'traj_menu',
		world_settings: 'world_settings_men'}
	constructor(scene){
		this.cameraId = Camera.cameraId;
		this.canv0 = document.createElement('canvas');
		this.canv0.id = 'layer0_cam'+this.cameraId;
		this.canv0.className = 'renderLayer';
		this.canv0.style.zIndex = -2;
		this.canv0.innerHTML = 'Your browser does not support canvas!';
		document.body.appendChild(this.canv0);
		this.ctx = this.canv0.getContext('2d',{willReadFrequently: false});

		this.canv2 = document.createElement('canvas');
		this.canv2.id = 'layer1_cam'+this.cameraId;
		this.canv2.className = 'renderLayer';
		this.canv2.style.zIndex = -4;
		this.canv2.innerHTML = 'Your browser does not support canvas!';
		document.body.appendChild(this.canv2);
		this.ctx2 = this.canv2.getContext('2d');

		this.canv3 = document.createElement('canvas');
		this.canv3.id = 'layer2_cam'+this.cameraId;
		this.canv3.className = 'renderLayer';
		this.canv3.style.zIndex = -6;
		this.canv3.style.mixBlendMode = 'screen';
		this.canv3.style.filter = 'blur(0px)';
		this.canv3.style.opacity = 0.7;
		this.canv3.innerHTML = 'Your browser does not support canvas!';
		document.body.appendChild(this.canv3);
		this.ctx3 = this.canv3.getContext('2d',{willReadFrequently: false});

		// Camera resolution
		this.#width = this.canv0.width = this.canv2.width = this.canv3.width = window.innerWidth;
		this.#height = this.canv0.height = this.canv2.height = this.canv3.height = window.innerHeight;
	
		this.scene = scene;
		this.x = 0; this.y = 0; // Target camera position
		this.ax = 0; this.ay = 0; // Actualy camera postiton with animation
		this.zoom = 1; // Target zoom
		this.animZoom = 1; // Actualy zoom with animation
		this.zoomCff = 1.25; // Zoom coefficient
		this.Target = false; // Follow target object
		this.switchTarget = false;
		this.animTimeCorrect = 5;
		this.animDuration = 5;
		this.animTime = 5;
		this.animation = true; // Enable camera animation

		Camera.cameraId ++;
	}

	//Draw
	renderObjects(){
		let scn = this.scene;
		this.#frameTime[0] = Date.now() - this.#frameTime[1];
		this.#frameTime[1] = Date.now();
		this.animFunc();
		for (let objectId in scn.objArr){
			let obj = scn.objArr[objectId];
			let coll = false;
			let prev_x = obj.x - obj.vx;
			let prev_y = obj.y - obj.vy;
			let obCol = obj.color;
			let obj_rad = Math.sqrt(Math.abs(obj.m))*this.animZoom;
			obj_rad = obj_rad < 0.5 ? 0.5 : obj_rad;

			if (obj.m < 0 && !this.switcher.pause){ obj.color = obCol = this.scene.randomColor(true) }

			let render = (prev_x != obj.x && prev_y != obj.y)?true:false;
			let dcanv = scn.backgroundDarkness.state != 0 ? this.ctx3 : this.ctx;
			if (scn.tracesMode.state == 1){
				let targetVx = scn.objArr[this.Target] ? scn.objArr[this.Target].vx : 0;
				let targetVy = scn.objArr[this.Target] ? scn.objArr[this.Target].vy : 0;
				let cam_vec = scn.objArr[swch.t_object] ? [scn.objArr[swch.t_object].vx, scn.objArr[swch.t_object].vy] : [0, 0]; // Target object vector
				if (scn.backgroundDarkness.state != 0){
					if (this.Target != objectId){
						this.ctx3.fillStyle = obCol;
						this.ctx3.beginPath();
						this.ctx3.arc(this.crd(obj.x-obj.vx*scn.timeSpeed.state+targetVx, 'x'), this.crd(obj.y-obj.vy*scn.timeSpeed.state+targetVy, 'y'), obj_rad, 0, 7);
						this.ctx3.fill();
					}
				} else {
					if (!render){
						this.ctx.beginPath();
						this.ctx.fillStyle = '#000000';
						this.ctx.arc(this.crd(obj.x-obj.vx*scn.timeSpeed.state+targetVx, 'x'), this.crd(obj.y-obj.vy*scn.timeSpeed.state+targetVy, 'y'), (obj_rad+0.125), 0, 7);
						this.ctx.fill();
					}
				}
			}
			this.ctx.fillStyle = obCol;
			this.ctx.beginPath();
			this.ctx.arc(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'), obj_rad, 0, 7);
			this.ctx.fill();

			let res = false;
			let acc = 1000; // Точность следа
			//Trajectory mode 1 =====
			if (scn.tracesMode.state == 1){ // !this.switcher.pause2 && 
				if (true){//prev_t_obj != objectId
					//Target Velocity
					let targetVx = scn.objArr[this.Target] ? scn.objArr[this.Target].vx : 0;
					let targetVy = scn.objArr[this.Target] ? scn.objArr[this.Target].vy : 0;
					dcanv.strokeStyle = obCol;
					dcanv.lineWidth = obj_rad*2;
					dcanv.beginPath();
					dcanv.moveTo(this.crd(obj.x-obj.vx*scn.timeSpeed.state+targetVx, 'x'), this.crd(obj.y-obj.vy*scn.timeSpeed.state+targetVy, 'y'));
					dcanv.lineTo(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'));
					dcanv.stroke();

					//this.ctx.fillStyle = obCol;
					//this.ctx.beginPath();
					//this.ctx.arc(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'), obj_rad, 0, 7);
					//this.ctx.fill();
				}
			} else
			//Trajectory mode 2 =====
			if (scn.tracesMode.state == 2 && !obj.lck && res <= 20){
				let randKff = 0.8;
				let TLength = obj.trace.length; //Length of trace array
				let prev_randX = 0, prev_randY = 0;
				let randX = 0, randY = 0;

				this.ctx.fillStyle = obCol;
				this.ctx.strokeStyle = obCol;
				if (obj.trace[0]){
					this.ctx.lineWidth = obj_rad*2;
					this.ctx.beginPath();
					this.ctx.moveTo(this.crd(obj.x, 'x')+randX, this.crd(obj.y, 'y')+randY);
					this.ctx.lineTo(this.crd(obj.trace[0][0]/acc, 'x')+prev_randX, this.crd(obj.trace[0][1]/acc, 'y')+prev_randY);
					this.ctx.stroke();				
				}
				for (let i in obj.trace){
					let itr = i-1;
					itr = itr < 0?0:itr;
					prev_randX = randX; prev_randY = randY;
					let rnd_lim = obj_rad*(i/TLength)*randKff;
					randX = scn.getRandomArbitrary(-rnd_lim, rnd_lim);
					randY = scn.getRandomArbitrary(-rnd_lim, rnd_lim);
					this.ctx.lineWidth = obj_rad * (1-i/TLength) * 1.8;
					if (scn.traceMode2Particles.state){
						this.ctx.beginPath();
						this.ctx.arc(Math.floor(this.crd(obj.trace[itr][0]/acc,'x')+randX*2), Math.floor(this.crd(obj.trace[itr][1]/acc,'y')+randY*2), this.ctx.lineWidth/2, 0, 7);
						this.ctx.fill();			
					}
					if (!scn.traceMode2Trembling.state){ randX = randY = 0; }
					this.ctx.globalAlpha = (TLength-i/1.5)/TLength;
					this.ctx.beginPath();
					this.ctx.moveTo(this.crd(obj.trace[i][0]/acc, 'x')+randX, this.crd(obj.trace[i][1]/acc, 'y')+randY);
					this.ctx.lineTo(this.crd(obj.trace[itr][0]/acc, 'x')+prev_randX, this.crd(obj.trace[itr][1]/acc, 'y')+prev_randY);
					this.ctx.stroke();
					this.ctx.globalAlpha = 1;
				}
			} else
			//Trajectory mode 3 =====
			if (scn.tracesMode.state == 3 && !obj.lck){
				this.ctx.fillStyle = obCol;
				this.ctx.strokeStyle = obCol;
				this.ctx.lineWidth = Math.pow(scn.traceMode3Width.state, 10);
				if (obj.trace[0]){
					this.ctx.beginPath();
					this.ctx.moveTo(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'));
				}
				for (let i in obj.trace){
					let itr = i;
					this.ctx.lineTo(this.crd(obj.trace[itr][0]/acc, 'x'), this.crd(obj.trace[itr][1]/acc, 'y'));
				}	
				this.ctx.stroke();
			}
			if (obj.trace && scn.tracesMode != 2 && scn.tracesMode != 3 && scn.tracesMode != 4) {obj.trace = [];};
			if ((scn.tracesMode.state == 2 || scn.tracesMode.state == 3) && !obj.lck){// && trace_resolution[2]){
				res = scn.tracesMode.state == 3?scn.traceMode3Length.state*(1/(trace_resolution[1]+1)):Math.round(Math.pow(8, scn.traceMode3Length.state));
				//if (!this.switcher.pause2){
				//console.log(obj.trace.length);
				obj.trace.unshift([Math.round(obj.x*acc), Math.round(obj.y*acc)]);
				let trace_length = obj.trace.length;
				while (trace_length > res){
					obj.trace.pop();
					trace_length --;
				}
			}
		}
	} // End draw

	visual_trajectory(){
		this.clear2();
		let mcx = this.scene.mouse_coords[0] ? this.scene.mouse_coords[0] - (this.scene.mouse_coords[0] - mouse.x)/10 : mouse.x;
		let mcy = this.scene.mouse_coords[1] ? this.scene.mouse_coords[1] - (this.scene.mouse_coords[1] - mouse.y)/10 : mouse.y;

		if (!(Math.abs(mouse.leftDownX-mouse.x) <= dis_zone && Math.abs(mouse.leftDownY-mouse.y) <= dis_zone)){
			// let mstate = menu_state;
			// close_all_menus();
			// menu_state = mstate;
			let offsX = -10;
			let offsY = -30;
			if (['mobile', 'tablet'].includes( getDeviceType() ) ){ offsX = -25; offsY = -140; } // If device is mobile or tablet
			Object.assign(launchPowerLabel.style, {left: (mouse.x+offsX)+'px', top: (mouse.y+offsY)+'px', display: 'block', color: this.scene.newObjColor.state});
			launchPowerLabel.innerHTML = Math.round(this.scene.rad(mouse.leftDownX, mouse.leftDownY, mouse.x, mouse.y) * this.scene.powerFunc(this.scene.launchForce.state) * 100)/100;
		}
		let D = Math.sqrt(Math.abs(this.scene.newObjMass.state))*this.animZoom*2;
		this.ctx2.globalAlpha = 0.5;
		this.ctx2.strokeStyle = this.scene.newObjColor.state;
		this.ctx2.lineWidth = D < 0.5 ? 0.5 : Math.sqrt(Math.abs(this.scene.newObjMass.state))*this.animZoom*2;
		this.ctx2.beginPath();
		this.ctx2.moveTo(mouse.leftDownX, mouse.leftDownY);
		this.ctx2.lineTo(mcx, mcy);
		this.ctx2.stroke();
		this.ctx2.globalAlpha = 1;

		this.ctx2.beginPath();
		this.ctx2.fillStyle = this.scene.newObjColor.state;
		this.ctx2.arc(scene.mpos[0], scene.mpos[1], D/2, 0, 7);
		this.ctx2.fill();
	}

	//Визуальное выделение объекта
	visualObjectSelect(mode, color, objectId, alpha = 0.3) {
		if (this.scene.objArr.length){ // If there are objects
			let selectObjId;
			if (!this.scene.objArr[objectId]){
				selectObjId = this.scene.objectSelect(mode);			
			} else {
				selectObjId = objectId;
			}

			if (this.#visualObjectSelectAnimation <= 5){
				this.#visualObjectSelectAnimDir = 1;
			} else 
			if (this.#visualObjectSelectAnimation >= 30){
				this.#visualObjectSelectAnimDir = 0;
			}

			if (this.#visualObjectSelectAnimDir){
				this.#visualObjectSelectAnimation += 1;
			} else {
				this.#visualObjectSelectAnimation -= 0.5;
			}

			let mv = [0, 0];
			if (this.scene.objArr[swch.t_object] && !switcher.pause2){
				mv[0] = this.scene.objArr[swch.t_object].vx;
				mv[1] = this.scene.objArr[swch.t_object].vy;
			}

			this.ctx2.beginPath();
			this.ctx2.globalAlpha = alpha;
			this.ctx2.fillStyle = color;
			this.ctx2.arc(
				(this.crd(this.scene.objArr[selectObjId].x - mv[0], 'x')), 
				(this.crd(this.scene.objArr[selectObjId].y - mv[1], 'y')), 
				Math.sqrt(Math.abs(this.scene.objArr[selectObjId].m)) * this.animZoom + this.#visualObjectSelectAnimation, 
				0, 7);
			this.ctx2.fill();

			this.ctx2.beginPath();
			this.ctx2.globalAlpha = 1;
			this.ctx2.strokeStyle = color;
			this.ctx2.lineWidth = 2;
			this.ctx2.arc(
				(this.crd(this.scene.objArr[selectObjId].x - mv[0], 'x')), 
				(this.crd(this.scene.objArr[selectObjId].y - mv[1], 'y')), 
				Math.sqrt(Math.abs(this.scene.objArr[selectObjId].m)) * this.animZoom + this.#visualObjectSelectAnimation, 
				0, 7);
			this.ctx2.stroke();	
		}
	}

	crd (coord, axis){		// Cursor position
		let sCtrX = this.#width/2 - this.ax;
		let sCtrY = this.#height/2 - this.ay;

		switch (axis){
			case 'x': return coord*this.animZoom + sCtrX - this.ax*(this.animZoom-1);
			case 'y': return coord*this.animZoom + sCtrY - this.ay*(this.animZoom-1);
		}		
	}

	screenPix(coord, axis){		// Cursor position
		let sCtrX = window.innerWidth/2 - this.ax;
		let sCtrY = window.innerHeight/2 - this.ay;

		switch (axis){
			case 'x': return coord/this.animZoom - (sCtrX - this.ax*(this.animZoom-1))/(this.animZoom);
			case 'y': return coord/this.animZoom - (sCtrY - this.ay*(this.animZoom-1))/(this.animZoom);
		}
	}

	animFunc(){
		this.animDuration = this.animTimeCorrect*(16/this.#frameTime[0]);
		if (this.switchTarget){this.animTimeCorrect -= (this.animTime-1)/(400/this.#frameTime[0]);} else {this.animTimeCorrect = 5;}
		this.animDuration = this.animDuration < 1 ? 1 : this.animDuration;
		this.animZoom += ((this.zoom-this.animZoom)/this.animDuration);
		if (this.animation){
			this.ax += (this.x-this.ax)/(this.animDuration/(this.zoom/this.animZoom));
			this.ay += (this.y-this.ay)/(this.animDuration/(this.zoom/this.animZoom));
		} else {
			this.ax = this.x; this.ay = this.y;
		}
	}

	zoomIn(vl = this.zoomCff){ // Zoom IN. vl is a zoom coeficient
		this.zoom *= vl; // Set zoom value
		if (this.scene.zoomToCursor.state){
			this.x += (this.screenPix(mouse.x, 'x')-this.x)/(vl/(vl-1));
			this.y += (this.screenPix(mouse.y, 'y')-this.y)/(vl/(vl-1));
		}
	}

	zoomOut(vl = this.zoomCff){ // Zoom OUT. vl is a zoom coeficient
		this.zoom /= vl; // Set zoom value
		if (this.scene.zoomToCursor.state){
			this.x -= (this.screenPix(mouse.x, 'x')-this.x)/(1/(vl-1));
			this.y -= (this.screenPix(mouse.y, 'y')-this.y)/(1/(vl-1));
		}
	}

	clear(col){
		//if (this.switcher.traj_mode == 0){col = '#000';}
		if (this.scene.backgroundDarkness.state != 0){ //this.switcher.bg_darkness != 0
			if (!col){
				this.ctx3.globalAlpha = 0.01;
				col = '#000000';
				this.ctx3.fillStyle = col;
				this.ctx3.fillRect(0, 0, this.width, this.height);
				this.ctx3.globalAlpha = 1;
			} else {
				this.ctx3.clearRect(0, 0, this.width, this.height);
			}
		} else {
			if (!col){
				this.ctx.globalAlpha = 0.01;
				col = '#000000';
				this.ctx.fillStyle = col;
				this.ctx.fillRect(0, 0, this.width, this.height);
				this.ctx.globalAlpha = 1;
			} else {
				this.ctx.clearRect(0, 0, this.width, this.height);
			}			
		}
	}
	clear2(){
		this.ctx2.clearRect(0, 0, this.width, this.height);
	}
	clear3(){
		this.ctx.clearRect(0, 0, this.width, this.height);
	}

}