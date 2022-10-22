import UserInput from '/js/UserInput.js';
export default class Camera{
	static cameraId = 0;
	#width = window.innerWidth;
	#height = window.innerHeight;

	zoomCff = 1.25;

	set width (width){
		this.#width = this.canv0.width = this.canv2.width = this.canv3.width = width;
	}
	set height (height){
		this.#height = this.canv0.height = this.canv2.height = this.canv3.height = height;
	}
	get width (){
		return this.#width;
	}
	get height (){
		return this.#height;
	}

	#visualObjectSelectAnimation = 10;
	#visualObjectSelectAnimDir = 0;

	#clrDelay = false;

	x = 0; y = 0; // Target camera position
	ax = 0; ay = 0; // Actualy camera postiton with animation
	lastX = 0; lastY = 0; // Last camera position
	zoom = 1; // Target zoom
	animZoom = 1; // Actualy zoom with animation
	zoomCff = 1.25; // Zoom coefficient
	Target = false; // Follow target object
	switchTarget = false;
	animTimeCorrect = 5;
	animTime = 5;
	animationDuration = 5; // Animation duration
	animation = true; // Enable camera animation

	menu_names = {create: 'menu_options', delete: 'del_menu_options', edit: 'edit_menu',
		help: 'help_menu', settings: 'settings_menu', camera: 'camera_menu', trajectory: 'traj_menu',
		world_settings: 'world_settings_men'}
	constructor(scene){
		this.scene = scene;
		this.layersDiv = document.createElement('div');
		this.layersDiv.setAttribute('id', 'renderLayers_camera'+this.cameraId);

		this.cameraId = Camera.cameraId;
		this.canv0 = document.createElement('canvas');
		this.canv0.id = 'layer0_cam'+this.cameraId;
		this.canv0.className = 'renderLayer';
		this.canv0.style.zIndex = -2;
		this.canv0.innerHTML = 'Your browser does not support canvas!';
		this.layersDiv.appendChild(this.canv0);
		this.ctx = this.canv0.getContext('2d',{willReadFrequently: false});

		this.canv2 = document.createElement('canvas');
		this.canv2.id = 'layer1_cam'+this.cameraId;
		this.canv2.className = 'renderLayer';
		this.canv2.style.zIndex = -4;
		this.canv2.innerHTML = 'Your browser does not support canvas!';
		this.layersDiv.appendChild(this.canv2);
		this.ctx2 = this.canv2.getContext('2d');

		this.canv3 = document.createElement('canvas');
		this.canv3.id = 'layer2_cam'+this.cameraId;
		this.canv3.className = 'renderLayer';
		this.canv3.style.zIndex = -6;
		this.canv3.style.mixBlendMode = 'screen';
		this.canv3.style.filter = 'blur(0px)';
		this.canv3.style.opacity = 0.7;
		this.canv3.innerHTML = 'Your browser does not support canvas!';
		this.layersDiv.appendChild(this.canv3);
		this.ctx3 = this.canv3.getContext('2d',{willReadFrequently: false});

		document.body.appendChild(this.layersDiv);

		// Camera resolution
		this.width = window.innerWidth;
		this.height = window.innerHeight;

		Camera.cameraId ++;
	}

	//Draw
	renderObjects(){
		let scn = this.scene;
		this.clear();
		this.clear2();
		if (scn.backgroundDarkness !== 0) this.clear3();
		this.animFunc();
		for (let objectId in scn.objArr){
			let obj = scn.objArr[objectId];
			let prevScreenX = (obj.x - (obj.x - obj.vx)) != this.x - this.lastX;
			let prevScreenY = (obj.y - (obj.y - obj.vy)) != this.y - this.lastY;
			let obCol = obj.color;
			let obj_rad = Math.sqrt(Math.abs(obj.m))*this.animZoom;
			obj_rad = obj_rad < 0.5 ? 0.5 : obj_rad;

			if (obj.m < 0){ obj.color = obCol = this.scene.randomColor(true) }

			let render = (prevScreenX || prevScreenY);
			let dcanv = scn.backgroundDarkness.state != 0 ? this.ctx3 : this.ctx;
			if (scn.tracesMode.state == 1){
				let targetVx = scn.objArr[this.Target] ? scn.objArr[this.Target].vx : 0;
				let targetVy = scn.objArr[this.Target] ? scn.objArr[this.Target].vy : 0;
				if (scn.backgroundDarkness.state != 0){
					if (this.Target != objectId){
						this.ctx3.fillStyle = obCol;
						this.ctx3.beginPath();
						this.ctx3.arc(this.crd(obj.x-obj.vx*scn.timeSpeed.state+targetVx, 'x'), this.crd(obj.y-obj.vy*scn.timeSpeed.state+targetVy, 'y'), obj_rad, 0, 7);
						this.ctx3.fill();
					}
				} else {
					if (!render && objectId !== mov_obj){
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
			if (scn.tracesMode.state == 1){
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

	trajectoryCalculate(count = 256, col =  ['#006BDE', '#ffffff'], accr = 1){
		this.clear2();
		let objArrCopy = JSON.parse(JSON.stringify(this.scene.objArr));
		count /= accr;
		//sp_obj = [0,1];
		let virt_obj = objArrCopy.length;

		let svx = ((mouse.leftDownX - mouse.x)/30) * this.scene.powerFunc(this.scene.launchForce.state);
		let svy = ((mouse.leftDownY - mouse.y)/30) * this.scene.powerFunc(this.scene.launchForce.state);	

		objArrCopy[objArrCopy.length] = {
			x: this.screenPix(mouse.leftDownX, 'x'), // Position X
			y: this.screenPix(mouse.leftDownY, 'y'), // Position Y
			vx: svx, // Velocity X equals vx if given and svx if not
			vy: svy, // Velocity Y equals vy if given and svy if not
			m: this.scene.newObjMass.state, // Object mass via given radius || Radius
			color: this.scene.newObjColor.state,
			lck: this.scene.newObjLock.state,
			trace: [],
			main_obj: 0
		};

		let tsw = false;
		let refMov = [0, 0];
		let distance = [Infinity, {}, 0];
		let coll_objcts = {};
		let asd = (...args) => {
			this.scene.afterPhysics(...args);
			for (let objectId in objArrCopy){
				// let R_size = 2;
				// this.ctx2.beginPath();
				// this.ctx2.strokeStyle = "#222222";
				// this.ctx2.lineWidth = R_size/2;
				// this.ctx2.moveTo(this.crd((objArrCopy[objectId].x-objArrCopy[objectId].vx)-refMov[0], 'x'), this.crd((objArrCopy[objectId].y-objArrCopy[objectId].vy)-refMov[1], 'y'));
				// this.ctx2.lineTo(this.crd(objArrCopy[objectId].x-refMov[0], 'x'), this.crd(objArrCopy[objectId].y-refMov[1], 'y'));
				// this.ctx2.stroke();

				let rad = objectId == objArrCopy.length - 1 ? 1.2 : 0.8;
				this.ctx2.beginPath();
				this.ctx2.fillStyle = objectId == objArrCopy.length-1 ? objArrCopy[objectId].color :"#444444";
				this.ctx2.arc(this.crd(objArrCopy[objectId].x-refMov[0], 'x'), this.crd(objArrCopy[objectId].y-refMov[1], 'y'), rad, 0, 7);
				this.ctx2.fill();
				this.ctx2.beginPath();

				// this.ctx2.beginPath();
				// this.ctx2.fillStyle = "#ffffff";
				// this.ctx2.arc(100, 100, 100.5, 0, 7);
				// this.ctx2.fill();
				// this.ctx2.beginPath();
			}			
			// if (!mouse.move && mouse.leftDown){
			// 	this.scene.physicsMultiThreadCalculate(objArrCopy, asd);
			// }
		}

		for (let i = count; i--;){
			this.scene.physicsCalculate(objArrCopy, asd);
		}

		// this.scene.physicsMultiThreadCalculate(objArrCopy, (...args)=>{
		// 	//console.log(this);
		// 	asd(...args);
		// });

		
		// if (distance[2] <= count){ // Отображение точек сближения
		// 	this.ctx2.beginPath();
		// 	this.ctx2.globalAlpha = 0.5;
		// 	this.ctx2.fillStyle = body[distance[1].obj_name].color;
		// 	let mass = Math.sqrt(Math.abs(body[distance[1].obj_name].m)) < 2 ? 2 : Math.sqrt(Math.abs(body[distance[1].obj_name].m));
		// 	this.ctx2.arc(camera.crd(distance[1].x-refMov[0], 'x'), camera.crd(distance[1].y-refMov[1], 'y'), mass*camera.animZoom, 0, 7);
		// 	this.ctx2.fill();
		// 	this.ctx2.beginPath();
		// 	this.ctx2.globalAlpha = 0.6;
		// 	this.ctx2.fillStyle = obj_color;
		// 	mass = Math.sqrt(Math.abs(obj_radius))*camera.animZoom < 2 ? 2 : Math.sqrt(Math.abs(obj_radius))*camera.animZoom;
		// 	this.ctx2.arc(camera.crd(distance[1].x2-refMov[0], 'x'), camera.crd(distance[1].y2-refMov[1], 'y'), mass, 0, 7);
		// 	this.ctx2.fill();
		// 	this.ctx2.beginPath();
		// 	this.ctx2.globalAlpha = 1;
		// }
		// for (let i in coll_objcts){
		// 	var size = Math.sqrt(Math.abs(coll_objcts[i].m))*0.7 < 5? 5 : Math.sqrt(Math.abs(coll_objcts[i].m))*0.7;
		// 	if (switcher.collision_mode == 0){
		// 		drawCross(camera.crd(coll_objcts[i].x, 'x'), camera.crd(coll_objcts[i].y, 'y'), '#ff0000', 3, size , ctx2);
		// 	} else if (switcher.collision_mode == 1){
		// 		this.ctx2.beginPath();
		// 		this.ctx2.fillStyle = '#0044ff';
		// 		this.ctx2.arc(camera.crd(coll_objcts[i].x, 'x'), camera.crd(coll_objcts[i].y, 'y'), gipot(coll_objcts[i].vx, coll_objcts[i].vy)/2/t, 0, 7);
		// 		this.ctx2.fill();
		// 		this.ctx2.globalAlpha = 1;
		// 	}
		// }		
	}

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
			this.clear2();
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

			this.ctx2.beginPath();
			this.ctx2.globalAlpha = alpha;
			this.ctx2.fillStyle = color;
			this.ctx2.arc(
				(this.crd(this.scene.objArr[selectObjId].x, 'x')), 
				(this.crd(this.scene.objArr[selectObjId].y, 'y')), 
				Math.sqrt(Math.abs(this.scene.objArr[selectObjId].m)) * this.animZoom + this.#visualObjectSelectAnimation, 
				0, 7);
			this.ctx2.fill();

			this.ctx2.beginPath();
			this.ctx2.globalAlpha = 1;
			this.ctx2.strokeStyle = color;
			this.ctx2.lineWidth = 2;
			this.ctx2.arc(
				(this.crd(this.scene.objArr[selectObjId].x, 'x')), 
				(this.crd(this.scene.objArr[selectObjId].y, 'y')), 
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
		let animSpeedCorrected = this.animTimeCorrect*(16/frameTime[0]);
		if (this.switchTarget){
			this.animTimeCorrect -= (this.animTime-1)/(400/frameTime[0]);
		} else {
			this.animTimeCorrect = this.animationDuration;
		}
		animSpeedCorrected = animSpeedCorrected < 1 ? 1 : animSpeedCorrected;
		this.animZoom += ((this.zoom-this.animZoom)/animSpeedCorrected);
		this.lastX = this.ax; this.lastY = this.ay;
		if (this.animation){
			this.ax += (this.x-this.ax)/(animSpeedCorrected/(this.zoom/this.animZoom));
			this.ay += (this.y-this.ay)/(animSpeedCorrected/(this.zoom/this.animZoom));
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
		if (this.scene.tracesMode.state == 0){col = '#000000';}
		if (this.scene.backgroundDarkness.state != 0){
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