import * as UIConnect from './UIConnect.js';

// Camera touch control
let prev_cam_x = 0;
let prev_cam_y = 0;
let zm_cff = null;
let zm_prev = 1;

//Mouse and touches
let multiTouch = 0;
let avTouchPoint = {x: null, y: null, xd: null, yd: null};
let mscam = true;

// Touch
let allowClick = true; // If touches > 1 cancel the click event. If true - allow click

let movingObjectPosition = []; // Moving object position and velocity

function allowRender(){
	renderer.allowFrameRender = true;
}

self.ui = new Object();
// Init user interface
ui.init = function (){
	// Create object menu ================================================ 
	this.newObjColor = new UIConnect.ColorInput({id: 'newObjeColorSelect', stateSaving: true, initState: UtilityMethods.randomColor()}); // Menu color select input
	this.newObjRandColor = new UIConnect.CheckboxInput({id: 'randColorCheck', stateSaving: true, initState: true}); // Menu new object random color input
	this.newObjMass = new UIConnect.MassInput({id: 'create_mass', stateSaving: true, initState: Math.round(UtilityMethods.getRandomArbitrary(0.5, 100)*10)/10, negativeMassCheckboxParams: {id: "new_obj_negative_mass"}, callback: (state)=>{
		document.getElementById('newObjMassSpan').innerHTML = Math.round(state*1000)/1000;
	}}); // Menu new object's mass input
	this.newObjLock = new UIConnect.CheckboxInput({type: 'checkbox', id: 'objLckCeck', initState: false}); // Menu lock created object input
	//
	this.launchForce = new UIConnect.RangeInput({id: 'launch_power', stateSaving: true, callback: (val)=>{lnch_pwr_span.innerHTML = UtilityMethods.expVal(val); mouse.move = true;}, eventName: 'input'}); // Menu launch power value input
	this.pauseWhenCreatingObject = new UIConnect.CheckboxInput({id: 'new_obj_pause', stateSaving: true, initState: true, callback: (val, elem)=>{elem.prevPauseState = false}}); // Menu pause when user add object input
	this.movementCompencation = new UIConnect.CheckboxInput({id: 'movement_compencation_checkbox', stateSaving: true, initState: true});
	this.creationRelativeTo = new UIConnect.RadioInput({id: 'creation_relative_to', stateSaving: true}); // Creation relative mode
	this.newObjCircularOrbit = new UIConnect.CheckboxInput({id: 'circleOrbitCheck', stateSaving: true, initState: true, callback: (val) => {
		// Set reverse orbit checkbox disabled state
		const reverseOrbitCheckbox = document.getElementById('objReverseCheck');
		if (val){
			reverseOrbitCheckbox.removeAttribute('disabled');
		} else {
			reverseOrbitCheckbox.setAttribute('disabled', '');
		}
	}}); // Menu circle orbit on click input
	this.newObjCreateReverseOrbit = new UIConnect.CheckboxInput({id: 'objReverseCheck', stateSaving: true, initState: false}); // Menu reverse ordit direction input
	this.showDistanceFromCursorToMainObj = new UIConnect.CheckboxInput({id: 'vis_distance_check', stateSaving: true, callback: ()=>{ launchPowerLabel.style.display = 'none'; renderer.clearLayer2(); }}); // Menu visual distance
	//
	this.showNewObjTrajectory = new UIConnect.CheckboxInput({id: 'traj_prev_check', stateSaving: true, initState: true}); // Enable trajectory calculation before create object
	this.newObjTrajLength = new UIConnect.RangeInput({id: 'traj_calc_samples', stateSaving: true}); // Trajectory calutulation length input
	this.newObjTrajAccuracity = new UIConnect.RangeInput({id: 'traj_calc_accuracity', stateSaving: true }); // Trajectory accuracity input

	// Delete object menu =================================================
	this.deletingMode = new UIConnect.RadioInput({id: 'dellMethodRadio'}); // Deleting method

	// Edit object menu ===================================================
	this.editMass = new UIConnect.MassInput({id: 'mass_edit', stateSaving: false, initState: 1000, callback: (state) => {
			document.getElementById('editObjMassSpan').innerHTML = Math.round(state*1000)/1000;
		},
		negativeMassCheckboxParams: {
			id: 'edit_obj_negative_mass',
			callback: (state) => {
				if (this.editMass){
					this.editMass.state = state ? -Math.abs(this.editMass.state) : Math.abs(this.editMass.state);
					allowRender();
					addFrameBeginTask(()=>{
						if (scene.objArr[swch.editObjId]) scene.objArr[swch.editObjId].m = this.editMass.state;
					});
				}
			}
		},
		onChange: ()=>{
			addFrameBeginTask(() => {
				if (scene.objArr[swch.editObjId]){ scene.objArr[swch.editObjId].m = ui.editMass.state; allowRender();}
			});
		}
	});
	this.editColor = new UIConnect.ColorInput({id: 'col_edit', eventName: 'input', callback: (state) => addFrameBeginTask(() => {
		if (scene.objArr[swch.editObjId]){ scene.objArr[swch.editObjId].color = state; allowRender();}
	}), });
	this.editLock = new UIConnect.CheckboxInput({id: 'lck_edit_chbox', callback: (state) => addFrameBeginTask(() => {
		if (scene.objArr[swch.editObjId]){ scene.objArr[swch.editObjId].lock = state; allowRender();}
	}), });
	// Trace settings =====================================================
	this.tracesMode = new UIConnect.RadioInput({id: 'traj_radio_buttons', stateSaving: true, initState: 1, callback: (val, elem) => {
		for (let element of traj_menu.getElementsByClassName('additionalOption')){
			// Show additional options by radio value
			if ( element.id.includes(val.toString()) && !element.hasAttribute('disabled')) { 
				element.style.display = 'inline';
			} else {
				element.style.display = 'none';
				}
		}
		if (elem.prevState != val){ // If state changed
			addFrameBeginTask(()=>{
				renderer.clearLayer1();
				renderer.clearLayer3();
				allowRender();
			}); // Clear render layers
		}

	} });
	// Mode 1
	this.traceMode1Length = new UIConnect.RangeInput({id: 'trace1Lnth', stateSaving: true, eventName: 'input', callback: (val, ths) => {ths.value = Math.pow(1 - val, 2)} });
	this.traceMode1Opacity = new UIConnect.RangeInput({id: 'trace_opacity', stateSaving: true, eventName: 'input', callback: (val)=>{renderer.canv3.style.opacity = val; allowRender();} });
	this.traceMode1Blur = new UIConnect.RangeInput({id: 'trace_blur', stateSaving: true, eventName: 'input', callback: (val)=>{renderer.canv3.style.filter = `blur(${val*val}px)`; allowRender();} });
	// Mode 2
	this.traceMode2Particles = new UIConnect.CheckboxInput({id: 'trc2PrtclsChck', stateSaving: true, initState: true, callback: allowRender});
	this.traceMode2Trembling = new UIConnect.CheckboxInput({id: 'trc2TrembChck', stateSaving: true, initState: true, callback: allowRender});
	this.traceMode2Length = new UIConnect.RangeInput({id: 'trace2Lnth', stateSaving: true, eventName: 'input', callback: allowRender});
	// Mode 3 
	this.traceMode3Width = new UIConnect.RangeInput({id: 'trace3WdInp', stateSaving: true, eventName: 'input', callback: allowRender});
	this.traceMode3Quality = new UIConnect.RangeInput({id: 'trace3Qu', stateSaving: true, eventName: 'input', callback: allowRender});
	this.traceMode3Length = new UIConnect.RangeInput({id: 'trace3Lnth', stateSaving: true, eventName: 'input', callback: allowRender});

	// Camera menu ========================================================
	this.zoomToScreenCenter = new UIConnect.CheckboxInput({id: 'chck_zoomToScreenCenter', stateSaving: true, initState: false}); // Zoom to cursor as default. If enabled zoom, zooming to screen center

	// Physics menu =======================
	this.gravitationMode = new UIConnect.RadioInput({id: 'gravit_mode_radio_buttons', stateSaving: true}); // Select gravitation mode (radio)
	this.g = new UIConnect.RangeInput({id: 'g_value', eventName: 'input', callback: (val, ths)=>{g_value_title.innerHTML = ths.value = UtilityMethods.expVal(val)}, initState: 1}); // Set gravitation (G) value
	this.interactMode = new UIConnect.RadioInput({id: 'interact_radio_buttons', stateSaving: true}); // Select interactions mode
	this.collisionMode = new UIConnect.RadioInput({id: 'collision_radio_buttons', stateSaving: true}); // Select collision mode

	// Settings menu ======================================================
	// Select background image
	this.backgroundImageURL = new UIConnect.TextInput({id: 'img_url_inp', stateSaving: true, callback: (value)=>{
		value = value == '' ? 'background/background.jpg' : value;
		document.getElementById('background_image').setAttribute('src', value);
	}, });
	// Set background darkness
	this.backgroundDarkness = new UIConnect.RangeInput({id: 'bg_darkness', stateSaving: true, eventName: 'input', callback: (state, elem)=>{
		background_image.style.opacity = state;
	}, });
	this.backgroundFollowsMouse = new UIConnect.CheckboxInput({id: 'mouse_move_bg', stateSaving: true, initState: true}), // If true, background follows the cursor
		// Show FPS
	this.showFPS = new UIConnect.CheckboxInput({id: 'check_fps_swch', stateSaving: true, callback: (val)=>{
		if (val){ fpsIndicator.turnOn() }
		else { fpsIndicator.turnOff() }
	}, });
	this.gpuCompute = new UIConnect.CheckboxInput({id: 'gpu_compute', stateSaving: true, initState: true, callback: (val, input)=>{
		if (!gpuComputeAvailable) {
			input.element.parentElement.style.display = 'none'; // Hide multithread option, if gpu not supported
		}
	}});
	this.maxPerformance = new UIConnect.CheckboxInput({id: 'max_performance', stateSaving: true, callback: (state)=>{
		if (state) {
			renderer.ctx3.clearRect(0,0, renderer.resolutionX, renderer.resolutionY);
			renderer.canv3.style.display = background_image.style.display = 'none';
			additionalTrajectoryOptionsExtended1.style.display = 'none';
			renderer.allowFrameRender = true; // Render
			view_settings.className += ' disabled'; // Hide view settings
		} else {
			renderer.ctx1.clearRect(0,0, renderer.resolutionX, renderer.resolutionY);
			renderer.canv3.style.display = background_image.style.display = '';
			additionalTrajectoryOptionsExtended1.style.display = 'initial';
			renderer.allowFrameRender = true; // Render
			view_settings.className = view_settings.className.replace('disabled', ''); // Hide view settings
		}
		this.tracesMode.state = this.tracesMode.state; // Refresh trace mode menu
	}});

	this.timeSpeed = new UIConnect.ManualInput({initState: 1, callback: (val, inpVar)=>{
		document.querySelector('.time_speed h2').innerHTML = 'T - X' + (val * simulationsPerFrame);
		let changedVal = val / inpVar.prevState;
		inpVar.changed = inpVar.changed !== undefined ? inpVar.changed * changedVal : changedVal;
		addFrameBeginTask(()=>{ // Frame begin taks
			// Change time speed correction
			if (this.timeSpeed.changed !== undefined){
				for (let object of scene.objArr){
					object.x += (object.vx * this.timeSpeed.state - object.vx * (this.timeSpeed.state / this.timeSpeed.changed))/2;
					object.y += (object.vy * this.timeSpeed.state - object.vy * (this.timeSpeed.state / this.timeSpeed.changed))/2;
				}
				delete this.timeSpeed.changed;
			}
		});
		
	}, eventName: 'input'}); // Time speed control
}

//Mouse
self.mouse = {
	x: window.innerWidth/1.5,
	y: window.innerHeight/2,
	leftDown: false,
	leftDownX: window.innerWidth/2,
	leftDownY: window.innerHeight/2,
	leftUpX: window.innerWidth/1.4,
	leftUpY: window.innerHeight/2,
	ctrlModificatorMouseX: null,
	ctrlModificatorMouseY: null,
	rightDown: false,
	middleDown: false,
	move: false,

	ctrlModificatedMousePosition: function (modificator = 10) {
		let mx, my;
		if (this.ctrlModificatorMouseY !== null && this.ctrlModificatorMouseY !== null){
			mx = this.ctrlModificatorMouseX - (this.ctrlModificatorMouseX - this.x) / modificator;
			my = this.ctrlModificatorMouseY - (this.ctrlModificatorMouseY - this.y) / modificator;		
		} else {
			mx = this.x;
			my = this.y;
		}
		return [mx, my];
	},
	ctrlTriggerModificator: function (){
		this.ctrlModificatorMouseX = this.x;
		this.ctrlModificatorMouseY = this.y;
	},
	ctrlUntriggerModificator: function (){
		this.ctrlModificatorMouseX = this.ctrlModificatorMouseY = null;
	}
}

// Touch events ======================================
// Touch START
let touchStartEvent = false;
document.getElementById('renderLayers').addEventListener('touchstart', function(event){
	event.preventDefault();
	prev_cam_x = camera.x;
	prev_cam_y = camera.y;
	mouseDownHandler(event);
});
// Touch END
document.getElementById('renderLayers').addEventListener('touchend', function(event){
	mouseUpHandler(event);
	zm_prev = camera.animZoom;
});
// Touch MOVE
document.getElementById('renderLayers').addEventListener('touchmove', function(event){
	event.preventDefault();
	mouse.move = true;
	// Touch point
	event.clientX = event.targetTouches[0].clientX;// Touch X
	event.clientY = event.targetTouches[0].clientY;// Touch Y
	if (swch.tapCamMove && mouse.leftDown && !camera.hasTarget()){
		camera.x += (mouse.x - event.clientX)/camera.animZoom;
		camera.y += (mouse.y - event.clientY)/camera.animZoom;
		navMenu.menuVisibility(false);
	}
	[mouse.x, mouse.y] = [event.clientX, event.clientY]; // Set cursor position
	isMinMouseMove = isMinMouseMove ? true : dist(mouse.x, mouse.y, mouse.leftDownX, mouse.leftDownY) >= minMouseMove;
	// Averrage point of touchs
	let av_touch_x = [];
	let av_touch_y = [];
	// Object move start/end
	if (navMenu.menuSelected == 'move'){
		if (multiTouch == 1 && allowClick) {
			movingObjectBegin(); // Object move start
		} else {
			// Object move end
			if (scene.objArr[mov_obj]){
				scene.objArr[mov_obj].vx = movingObjectPosition[2];
				scene.objArr[mov_obj].vy = movingObjectPosition[3];
				mov_obj = null;
			}
		}
	}
	movingObject(); // Moving object if mouse down && navMenu.menuSelected == "move"
	if (event.changedTouches.length == 2){ // If multitouch
		//All touch points array
		for (let i = 0; i < event.changedTouches.length; i++){
			av_touch_x.push(event.changedTouches[i].clientX);
			av_touch_y.push(event.changedTouches[i].clientY);
		} 
		// Averrage point of touchs
		avTouchPoint.x = UtilityMethods.sumArray(av_touch_x)/av_touch_x.length;
		avTouchPoint.y = UtilityMethods.sumArray(av_touch_y)/av_touch_x.length;
		 // Distance between touchs
		let touchZoom = dist(event.changedTouches[0].clientX, event.changedTouches[0].clientY, event.changedTouches[1].clientX, event.changedTouches[1].clientY);
		 // Clear launch power label display
		launchPowerLabel.style.display = 'none';

		if (swch.allowObjCreating && mouse.leftDown){
			if (ui.pauseWhenCreatingObject.state){
				pauseState = ui.pauseWhenCreatingObject.prevPauseState;
			}
			renderer.clearLayer2();
		}

		mouse.leftDown = false;
		mscam = false;
		// Mouse down
		if (!avTouchPoint.xd){
			avTouchPoint.xd = avTouchPoint.x;
			avTouchPoint.yd = avTouchPoint.y;
			zm_cff = touchZoom;
		}
		// Cancel camera target if touch camera move
		if (dist(avTouchPoint.xd, avTouchPoint.yd, avTouchPoint.x, avTouchPoint.y) > Math.min(innerWidth, innerHeight)/6){
			if (camera.Target !== undefined){
				avTouchPoint.xd = avTouchPoint.x;
				avTouchPoint.yd = avTouchPoint.y;
				prev_cam_x = camera.x;
				prev_cam_y = camera.y;
				camera.setTarget();
			}
		}
		// Limit zoom
		let newZoom = zm_prev / Math.pow(Math.sqrt(zm_cff) / Math.sqrt(touchZoom), 2); // Zoom
		if (newZoom < 10000 && newZoom > 1.0e-12){
			camera.zoom = camera.animZoom = newZoom;
		}
		if (!ui.zoomToScreenCenter.state && camera.Target === undefined){ // If zoom to screen center
			camera.ax = camera.x = prev_cam_x - (avTouchPoint.x - avTouchPoint.xd)/camera.animZoom + (((window.innerWidth/2 - avTouchPoint.xd)/zm_prev)*Math.pow(Math.sqrt(zm_cff) / Math.sqrt(touchZoom), 2) - ((window.innerWidth/2 - avTouchPoint.xd)/zm_prev));
			camera.ay = camera.y = prev_cam_y - (avTouchPoint.y - avTouchPoint.yd)/camera.animZoom + (((window.innerHeight/2 - avTouchPoint.yd)/zm_prev)*Math.pow(Math.sqrt(zm_cff) / Math.sqrt(touchZoom), 2) - ((window.innerHeight/2 - avTouchPoint.yd)/zm_prev));
		}
	}
})
// Mouse events =========================================================
// Mouse DOWN
document.getElementById('renderLayers').addEventListener('mousedown', mouseDownHandler);
function mouseDownHandler(event){
	// Touch
	if (event.type === 'touchstart'){
		multiTouch ++;
		event.clientX = event.targetTouches[0].clientX;
		event.clientY = event.targetTouches[0].clientY;
		allowClick = multiTouch == 1; // If touches > 1 cancel click event (mouse up event)
		navMenu.menuVisibility(false);
		// console.log('touchstart');
	}
	// Set cursor position
	[mouse.leftDownX, mouse.leftDownY] = [event.clientX, event.clientY];
	[mouse.x, mouse.y] = [event.clientX, event.clientY];
	isMinMouseMove = false;

	// Left mouse down
	if (event.which == 1 || event.type === 'touchstart'){
		mouse.leftDown = true;

		if (swch.allowObjCreating){
			// If pause when creating object enabled
			if (event.type === 'touchstart'){
				if (ui.pauseWhenCreatingObject.state && multiTouch == 1){
					ui.pauseWhenCreatingObject.prevPauseState = pauseState;
					pauseState = true;
				}
			} else {
				if (ui.pauseWhenCreatingObject.state){
					ui.pauseWhenCreatingObject.prevPauseState = pauseState;
					pauseState = true;
				}
			}
			if (event.ctrlKey){ // If Ctrl pressed
				mouse.ctrlTriggerModificator();
			}
		}
	}
	// Middle mouse down
	if (event.which == 2){
		mouse.middleDown = true;
	}
	// Right mouse down
	if (event.which == 3){
		mouse.rightDown = true;
		if (swch.allowObjCreating && mouse.leftDown){
			launchPowerLabel.style.display = 'none';
			renderer.clearLayer2();		
		}
	}
}
// Moving object function
function movingObject(){
	if (mouse.leftDown && navMenu.menuSelected == 'move' && mov_obj !== null){ // Moving object
		let newX = (mouse.x - mouse.leftDownX)/camera.animZoom + movingObjectPosition[0]; // New object X
		let newY = (mouse.y - mouse.leftDownY)/camera.animZoom + movingObjectPosition[1]; // New object Y
		// Draw trace while user moving object
		if (scene.objArr[mov_obj]){
			if (ui.tracesMode.state == 1){ // If traces mode == 1
				let dCanv = ui.maxPerformance.state ? renderer.ctx1 : renderer.ctx3;
				dCanv.strokeStyle = scene.objArr[mov_obj].color;
				dCanv.fillStyle = scene.objArr[mov_obj].color;	
				dCanv.lineWidth = renderer.getScreenRad(scene.objArr[mov_obj].m)*2;
				// Line
				dCanv.beginPath();
				dCanv.lineCap = 'round';
				dCanv.moveTo(...renderer.crd2(scene.objArr[mov_obj].x, scene.objArr[mov_obj].y));
				// Set position to user's moving objec
				scene.objArr[mov_obj].x = newX; // New position X
				scene.objArr[mov_obj].y = newY; // New position Y

				dCanv.lineTo(...renderer.crd2(scene.objArr[mov_obj].x, scene.objArr[mov_obj].y));
				dCanv.stroke();
				dCanv.lineCap = 'butt';
			} else {
				scene.objArr[mov_obj].x = newX; // New position X
				scene.objArr[mov_obj].y = newY; // New position Y
			}
			renderer.allowFrameRender = true;
		}
	}	
}
// Background movement
function bgMoving(){
	if (ui.backgroundFollowsMouse.state && ui.backgroundDarkness.state && !ui.maxPerformance.state){
		Object.assign(document.getElementById('background_image').style, {top: (-mouse.y/25)+'px', left: (-mouse.x/25)+'px'});	
	}
}
// Start moving object
function movingObjectBegin(){
	// Перемещение ближайшео объекта
	if (navMenu.menuSelected == 'move' && mov_obj === null){
		mov_obj = scene.objectSelect();
		if (scene.objArr[mov_obj]){
			movingObjectPosition[0] = scene.objArr[mov_obj].x; movingObjectPosition[1] = scene.objArr[mov_obj].y; //Координаты перемещяемого объекта
			movingObjectPosition[2] = scene.objArr[mov_obj].vx; movingObjectPosition[3] = scene.objArr[mov_obj].vy;	// Вектор перемещяемого объекта
			scene.objArr[mov_obj].vx = 0; scene.objArr[mov_obj].vy = 0;
		}
	}
}
// Mouse UP
document.getElementById('renderLayers').addEventListener('mouseup', mouseUpHandler);
function mouseUpHandler(event){
	if (event.type === 'touchend'){
		// console.log('touchend');
		event.clientX = mouse.x;
		event.clientY = mouse.y;
	}
	// Set cursor position
	[mouse.x, mouse.y] = [event.clientX, event.clientY];
	avTouchPoint.xd = avTouchPoint.yd = null;
	// Left mouse up
	if (event.which == 1 || (event.type === 'touchend' && allowClick)){
		mouse.leftDown = false;
		[mouse.leftUpX, mouse.leftUpY] = [event.clientX, event.clientY] // Set cursor mouseUp position
		launchPowerLabel.style.display = 'none';
		// Object delete
		if (navMenu.menuSelected == 'delete' && scene.objArr.length){
			addFrameBeginTask( () => scene.deleteObject(scene.objectSelect(ui.deletingMode.state)) );
		}
		// Object edit select
		if (navMenu.menuSelected == 'edit' && swch.s_edit){
			swch.editObjId = scene.objectSelect();
			swch.s_edit = false;
			syncEditObjUi();
		}
		// // Object move end
		if (navMenu.menuSelected == 'move' && scene.objArr[mov_obj] && mov_obj !== null){
			scene.objArr[mov_obj].vx = movingObjectPosition[2];
			scene.objArr[mov_obj].vy = movingObjectPosition[3];
			mov_obj = null;
		}

		// Create object
		if (swch.allowObjCreating){
			if (mscam && !mouse.rightDown){
				addFrameBeginTask(()=>{
					scene.addNewObject(newObjParams);
				});
			}
			navMenu.menuVisibility(true, 200);
			if (ui.pauseWhenCreatingObject.state){
				pauseState = ui.pauseWhenCreatingObject.prevPauseState;
			}
			renderer.clearLayer2();
		}
		if (navMenu.menuSelected == 'camera' && swch.s_track){
			camera.setTarget(scene.objectSelect('nearest', camera.Target));
		}
		if (swch.s_mainObj){
			if (allowClick){
				swch.allowObjCreating = true;
				swch.s_mainObj = false;
				scene.objIdToOrbit = scene.objectSelect();
			}
		}
		if (swch.tapCamMove){
			navMenu.menuVisibility(true, 100);
		}
	}
	// Middle mouse up
	if (event.which == 2 || !mscam){
		mouse.middleDown = false;
		navMenu.menuVisibility(true, 100);
	}
	// Right mouse up
	if (event.which == 3){
		mouse.rightDown = false;
		if (mouse.leftDown){
			launchPowerLabel.style.display = 'block';
			launchPowerLabel.innerHTML = '0';
		}
	}
	// Touch up
	if (event.type === 'touchend'){
		multiTouch --;
		mscam = multiTouch != 0 ? false : true;
	}
}
// Mouse MOVE
document.onmousemove = function(event){
	mouse.move = true;
	if (mouse.leftDown) {
		movingObjectBegin();
		isMinMouseMove = isMinMouseMove ? true : dist(mouse.x, mouse.y, mouse.leftDownX, mouse.leftDownY) >= minMouseMove;
	}
	movingObject(); // Moving object if mouse down && navMenu.menuSelected == "move"
	if (
		mouse.middleDown 
		|| (swch.tapCamMove && mouse.leftDown)
	){
		camera.x += (mouse.x - event.clientX)/camera.animZoom;
		camera.y += (mouse.y - event.clientY)/camera.animZoom;
		navMenu.menuVisibility(false);
		camera.setTarget();
	}

	// Set cursor position
	[mouse.x, mouse.y] = [event.clientX, event.clientY];
	if (event.ctrlKey){
		if (mouse.ctrlModificatorMouseX === null){
			mouse.ctrlTriggerModificator();
		}
	} else {
		mouse.ctrlUntriggerModificator();
	}
	bgMoving();
}

//События клавиатуры
document.addEventListener('keydown', function(e){
	// console.log(e.keyCode);
	if (!e.ctrlKey && !anyTextInputHasFocus){
		switch (e.keyCode){
			case 67:  document.querySelector('#create').click(); break; // (C) Create new object menu
			case 68:  document.querySelector('#delete').click(); break; // (D) Delete object menu
			case 69:  document.querySelector('#edit').click(); break; // (E) Edit object menu
			case 84:  document.querySelector('#trajectory').click(); break; // (T) Trajectory menu
			case 188: document.querySelector('#timedown').click(); break; // (<) Time speed down
			case 191: document.querySelector('#play').click(); break; // (/) Play button
			case 190: document.querySelector('#timeup').click(); break; // (>) Time speed up
			case 77:  document.querySelector('#move').click(); break; // (M) Move object
			case 80:  document.querySelector('#pause').click(); break; // (P) Pause button
			case 72:  document.querySelector('#help').click(); break; // (H) Help menu
			case 83:  document.querySelector('#settings').click(); break; // (S) Settings menu
			case 86:  document.querySelector('#camera').click(); break; // (V) Camera menu
			case 70:  document.querySelector('#world_settings').click(); break; // (F) World physics settings
			case 120: ui.showFPS.state = !ui.showFPS.state; break; // (F9) Show FPS
			case 39:  nextFrame = true; break; // Show one frame when paused (Right arrow)
			case 32: // (Space) Create object
				if (swch.allowObjCreating){
					addFrameBeginTask(()=>{ 
						scene.addNewObject(newObjParams);
					});		
				}
				if (navMenu.menuSelected == 'delete' && scene.objArr.length){
					let delete_obj = scene.objectSelect(ui.deletingMode.state);
					addFrameBeginTask( () => scene.deleteObject(delete_obj) );
				}
				break;
			case 107:  // (NumPad +) Zoom in
				camera.zoomTo(2);
				break;
			case 109:  // (NumPad -) Zoom out
				camera.zoomTo(-2);
				break;
		}
		// (+) Simulation speed up withoud lost accuracity. Max limit is computer performance
		if (e.keyCode == 187 || e.keyCode == 61){
			simulationsPerFrame *= 2;
			console.log(simulationsPerFrame);
			document.querySelector('.time_speed h2').innerHTML = 'T - X'+ui.timeSpeed.state*simulationsPerFrame;
		} else
		// (-) Simulation speed down withoud lost accuracity. Min value is realtime
		if (e.keyCode == 189 || e.keyCode == 173){
			if (simulationsPerFrame > 1){simulationsPerFrame /= 2;}
			console.log(simulationsPerFrame);
			document.querySelector('.time_speed h2').innerHTML = 'T - X'+ui.timeSpeed.state*simulationsPerFrame;
		}
	}
	//Ctrl keys
	// (Ctrl+Z) Delete last created object
	if (e.keyCode == 90 && e.ctrlKey) addFrameBeginTask( () => scene.deleteObject( scene.objectSelect('last_created') ) );
	
	//Debug
	if (maxFPS !== false){
		// (NumPad 9) Increase max FPS
		if (e.keyCode == 105){ 
			maxFPS++;
			clearInterval(frameInterval);
			frameInterval = setInterval(frame, 1000/maxFPS);
			console.log(maxFPS);
		}
		// (NumPad 7) Decrease max FPS
		if (e.keyCode == 103){
			maxFPS--;
			clearInterval(frameInterval);
			frameInterval = setInterval(frame, 1000/maxFPS);
			console.log(maxFPS);
		}			
	}
});


// Buttons events
document.addEventListener('click', function(e){
	const target = e.target.closest('.menu_button');
	if (!target) return;
	const cbut = target.getAttribute('id');
	// console.log(cbut);
	switch (cbut) { // Pressed button id
		case 'select_track': // Visual select object to select camera target
			swch.s_track = !swch.s_track;
			break;
		case 'clear_camera_settings': // Restore camera defaults
			camera.setTarget(); // Unset camera target
			camera.x = 0; camera.y = 0; // Set default camera position
			camera.zoom = 1; // Set default camera zoom value
			zm_prev = 1;
			break;
		case 'select_edit_obj': // Visual select object to select edit object
			swch.s_edit = !swch.s_edit;			
			break;
		case 'reset_speed_btn': // Edit menu, set object velocity to 0
			if (scene.objArr[swch.editObjId]){
				scene.objArr[swch.editObjId].vx = 0;
				scene.objArr[swch.editObjId].vy = 0;	
			}
			break;
		case 'select_main_obj': // Visual select object to select main object
			swch.allowObjCreating = swch.s_mainObj;
			swch.s_mainObj = !swch.s_mainObj;
			break;
		case 'wrap_time': // Wrap time
			ui.timeSpeed.state = -ui.timeSpeed.state;
			break;
		case 'save_file': // Save button
			pauseState = true;
			setMenuStateIcon('pause');
			const objArrWrite = JSON.parse(JSON.stringify(scene.objArr));
			for(let i in objArrWrite){
				objArrWrite[i].trace = [];
				delete objArrWrite[i].prevScreenX;
				delete objArrWrite[i].prevScreenY;
				delete objArrWrite[i].prevScreenR;
			}
			let my_data = {
				objArr: objArrWrite, 
				timeSpeed: ui.timeSpeed.state, 
				interactMode: ui.interactMode.state, 
				collisionMode: ui.collisionMode.state,
				gravitationMode: ui.gravitationMode.state,
				g: ui.g.state,
			};
			my_data = JSON.stringify(my_data);
			writeFile("Orbit Simulator - "+lanwich.getTranslatedText("my_world")+".json", my_data);
			//saveFile(name, forat, value, event);
			break;
		case 'sel_file_but': // Load button
			document.querySelector('#select_file').click();
			break;
		case 'clear_traces': // Clear traces
			renderer.clearLayer3();			
			for (let i in scene.objArr){
				scene.objArr[i].trace = [];
			}
			break;
	}
});

function setMenuStateIcon(img, format = "png", path = "ico/"){
	if (img == 'world_settings'){ img = 'functionX'; }
	document.querySelector('.state').innerHTML = '<img src="'+path+img+'.'+format+'" alt="">';
}

// Menu buttons handler
class NavigationMenu {
	menuSelected = 'create';
	prevMenuSelect = 'create';
	menuState = false; // Menu state (Opened/Closed)
	menuHide = false;

	#openedMenu = false;
	#menuVisibleTimeout = '';
	constructor({menuId}){
		this.#findMenuElement(menuId);
		this.#loadState();
		setMenuStateIcon(this.menuSelected);

		this.menuElem.addEventListener('click', (e) => {
			this.prevMenuSelect = this.menuSelected; // Prev clicked menu button
			let eventButton = e.target.closest('.btn');
			if (!eventButton) return;
			this.menuSelected = eventButton.getAttribute('id'); // Clicked menu
			// console.log(this.menuSelected);
			// Menu buttons
			if (!noMenuBtns.includes(this.menuSelected)){
				if (this.menuSelected === this.prevMenuSelect){
					this.switchMenuState();
				} else {
					this.selectMenu(this.menuSelected);
				}
			} else { // Time controls
				// Change time speed
				if (this.menuSelected === 'timedown' || this.menuSelected === 'timeup'){
					ui.timeSpeed.state *= this.menuSelected == 'timedown' ? 0.5 : 2;
				} else
				// Pause
				if (this.menuSelected === 'pause'){
					let img_name = pauseState ? 'pause' : 'play';
					if (pauseState){
						setMenuStateIcon('play');
						setTimeout(() => {setMenuStateIcon(this.prevMenuSelect);}, 500);			
					} else {
						setMenuStateIcon('pause');	
					}
					pauseState = !pauseState;
					eventButton.querySelector('img').setAttribute('src', 'ico/'+img_name+'.png');
				} else
				// Play
				if (this.menuSelected === 'play'){
					if (ui.timeSpeed.state != 1 || pauseState){ // If time speed == 1 or pause == true
						simulationsPerFrame = 1;
						pauseState = false;
						ui.timeSpeed.state = 1;
						document.querySelector('#pause img').setAttribute('src', 'ico/pause.png');
						setMenuStateIcon('restore');
						setTimeout(() => {setMenuStateIcon(this.prevMenuSelect);}, 500);
					}
				}		
			}
			if (noMenuBtns.includes(this.menuSelected)) this.menuSelected = this.prevMenuSelect;
			swch.allowObjCreating = this.menuSelected === 'create' && !swch.s_mainObj; // Allow object creating if menu is "Creation menu"
			if (ui.showDistanceFromCursorToMainObj.state) renderer.clearLayer2();
		});
	}

	#findMenuElement(menuId){
		this.menuElem = document.getElementById(menuId);
	}

	#loadState(){
		const {'menuSelected': menuSelected, 'menuState': menuState} = sessionStorage;
		if ( !(menuSelected && menuState) ) return;
		this.selectMenu(menuSelected);
		menuState === 'false' && this.hideMenu();
	}

	#saveState(){
		sessionStorage['menuSelected'] = this.menuSelected;
		sessionStorage['menuState'] = this.menuState;		
	}

	hideMenu(){
		if (!this.menuState) return;
		document.getElementById(menu_names[this.#openedMenu]).style.display = 'none';
		this.menuState = false;
		this.#openedMenu = false;
		this.#saveState();
	}

	showMenu(){
		this.#openedMenu = this.menuSelected;
		document.getElementById(menu_names[this.#openedMenu]).style.display = 'inline-block';
		this.menuState = true;
		this.#saveState();
	}

	selectMenu(menuId){
		this.menuState && this.hideMenu(this.#openedMenu);
		this.menuSelected = menuId;
		this.showMenu();
		this.#openedMenu = menuId;
		setMenuStateIcon(menuId);
		document.getElementById(this.prevMenuSelect).removeAttribute('selected');
		document.getElementById(this.menuSelected).setAttribute('selected', '');
	}

	switchMenuState(){
		if (this.menuState){
			this.hideMenu();
		} else {
			this.showMenu();
		}
	}

	menuVisibility(bool, timeout = 0){
		if (!this.menuState) return;
		clearTimeout(this.#menuVisibleTimeout);
		this.#menuVisibleTimeout = setTimeout(() => {
			if (bool){
				document.getElementById(menu_names[this.#openedMenu]).style.display = 'inline-block';
			} else {
				document.getElementById(menu_names[this.#openedMenu]).style.display = 'none';
			}
		}, timeout);
	}
}

const menu_names = {create: 'menu_options', delete: 'del_menu_options', edit: 'edit_menu',
	help: 'help_menu', settings: 'settings_menu', camera: 'camera_menu', trajectory: 'traj_menu',
	world_settings: 'world_settings_menu', move: 'move_menu'}

const noMenuBtns = ['timedown', 'play', 'pause', 'timeup'];

self.navMenu = new NavigationMenu({menuId: 'navigation_menu'});

// Close menu button handler
UtilityMethods.byClassElementsLoop('close_button', function(element){
	element.addEventListener('click', (event) => {
		navMenu.hideMenu();
		event.stopPropagation();
	})
});

// File select listener
document.getElementById('select_file').addEventListener('change', function(e){
	let selectedFile = document.querySelector('#select_file').files[0];
	if (selectedFile !== undefined){
		readFile(selectedFile);
		this.value = '';
	}		
});

self.syncEditObjUi = function(){
	const eObj = scene.objArr[swch.editObjId];
	if (eObj){
		const changed = !UtilityMethods.isArrsEqual([eObj.color, eObj.m, eObj.lock], [ui.editColor.state, ui.editMass.state, ui.editLock.state]);
		if (changed && !ui.editMass.isInput){
			setEditUiState({color: eObj.color, m: eObj.m, lock: eObj.lock});
		}
	} else {
		swch.editObjId = null;
		const changed = !UtilityMethods.isArrsEqual(["#FFFFFF", 0, false], [ui.editColor.state, ui.editMass.state, ui.editLock.state]);
		if (changed){
			setEditUiState({color: "#FFFFFF", m: 0, lock: false});
		}
	}
	function setEditUiState({color, m, lock}){
		ui.editColor.state = color;
		ui.editMass.state = m;
		ui.editMass.negativeMassCheckbox.state = m < 0;
		ui.editLock.state = lock;
	}
}

// Write file
function writeFile(name, data = '') {
	let download = document.createElement("a");
	download.href = 'data:application/txt;charset=utf-8,' + encodeURIComponent(data);
	download.download = name;
	download.style.display = "none";
	download.id = "download";
	document.body.appendChild(download);
	document.getElementById("download").click();
	document.body.removeChild(download);
}
// Read file
function readFile(file) {
	let reader = new FileReader();
	reader.readAsText(file);
	reader.onload = function() {
		try {
		  	let file_data = JSON.parse(reader.result);
		  	scene.objArr = file_data.objArr;
		  	ui.interactMode.state = file_data.interactMode || 0;
		  	ui.gravitationMode.state = file_data.gravitationMode || 1;
		  	ui.g.state = file_data.g || 1;
		  	ui.collisionMode.state = file_data.collisionMode || 0;
		  	ui.timeSpeed.state = file_data.timeSpeed ? file_data.timeSpeed : 1;
		  	scene.show_obj_count();
		  	renderer.allowFrameRender = true;
		  	renderer.clearLayer3();
			console.log('File loaded successfully!');
		} catch(err){
			console.error(err);
			alert('Несовместимый файл!');
		}
	};
	reader.onerror = function(err) {
		console.error(err);
		alert("Ошибка чтения файла!");
	};
}