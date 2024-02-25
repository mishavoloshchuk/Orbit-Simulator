import * as UIConnect from './UIConnect.js';

// Camera touch control
let prev_cam_x = 0;
let prev_cam_y = 0;
let zm_cff = null;
let zm_prev = 1;

// Mouse and touches
let multiTouch = 0;
let avTouchPoint = {x: null, y: null, xd: null, yd: null};
let mscam = true;

// Touch
let allowClick = true; // If touches > 1 cancel the click event. If true - allow click

const movingObjectsPosAndVel = []; // Moving object position and velocity

// Pause logic ====================================
self.pauseState = false; // Global pause state

const setPauseState = (state) => {
	if (state == pauseState) return; // Do nothing if state the same as previous
	// Set pause
	pauseState = (state === true);
	// Set menu state icon
	if (state){
		menuStateIcon.setState('pause');
	} else {
		menuStateIcon.temporaryReplace('play', 500, navMenu.menuSelected);
	}
	// Change pause button icon
	document.getElementById('pause').querySelector('img').setAttribute('src', 'ico/' + (state ? 'play' : 'pause') + '.png'); // Change pause button icon
}

let timeFreeze = false;
let pauseStateSavedValue = undefined;
const setTimeFreeze = (state) => {
	if (timeFreeze == state) return; // Do nothing if state the same as previous
	// Set freeze time
	timeFreeze = state;
	if (state){
		pauseStateSavedValue = pauseState;
		pauseState = true;
	} else {
		pauseState = pauseStateSavedValue;
		pauseStateSavedValue = undefined;
	}
}

self.allowRender = function(){
	renderer.allowFrameRender = true;
}

const renderLayers = document.getElementById('renderLayers');

self.ui = new Object();
// Init user interface
ui.init = function (){
	// Create object menu ================================================ 
	this.newObjColor = new UIConnect.ColorInput({id: 'newObjeColorSelect', stateSaving: true, initState: UtilityMethods.randomColor("#000000", 240)}); // Menu color select input
	this.newObjRandColor = new UIConnect.CheckboxInput({id: 'randColorCheck', stateSaving: true, initState: true}); // Menu new object random color input
	this.newObjMass = new UIConnect.MassInput({id: 'create_mass', stateSaving: true, initState: UtilityMethods.roundTo(UtilityMethods.getRandomArbitrary(0.5, 100), 1), negativeMassCheckboxParams: {id: "new_obj_negative_mass"}}); // Menu new object's mass input
	this.newObjLock = new UIConnect.CheckboxInput({type: 'checkbox', id: 'objLckCeck', initState: false}); // Menu lock created object input
	//
	this.launchForce = new UIConnect.RangeInput({id: 'launch_power', stateSaving: true, callback: (val)=>{lnch_pwr_span.innerHTML = UtilityMethods.expVal(val); mouse.move = true;}, eventName: 'input'}); // Menu launch power value input
	this.pauseWhenCreatingObject = new UIConnect.CheckboxInput({id: 'new_obj_pause', stateSaving: true, initState: true}); // Menu pause when user add object input
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
	this.showDistanceFromCursorToMainObj = new UIConnect.CheckboxInput({id: 'vis_distance_check', stateSaving: true, callback: ()=>{ launchPowerLabel.style.display = 'none'; renderer.clearLayer1(); }}); // Menu visual distance
	//
	this.showNewObjTrajectory = new UIConnect.CheckboxInput({id: 'traj_prev_check', stateSaving: true, initState: true}); // Enable trajectory calculation before create object
	this.newObjTrajLength = new UIConnect.RangeInput({id: 'traj_calc_samples', stateSaving: true}); // Trajectory calutulation length input
	this.newObjTrajAccuracity = new UIConnect.RangeInput({id: 'traj_calc_accuracity', stateSaving: true }); // Trajectory accuracity input

	// Delete object menu =================================================
	this.deletingMode = new UIConnect.RadioInput({id: 'dellMethodRadio'}); // Deleting method

	// Edit object menu ===================================================
	this.editMass = new UIConnect.MassInput({id: 'mass_edit', stateSaving: false, initState: 1000, 
		negativeMassCheckboxParams: {
			id: 'edit_obj_negative_mass',
			callback: (state) => {
				if (this.editMass){
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
	this.editMass.dontSaveToFile = true; // Don't save this parameter when saving file
	this.editColor = new UIConnect.ColorInput({id: 'col_edit', eventName: 'input', callback: (state) => addFrameBeginTask(() => {
		if (scene.objArr[swch.editObjId]){ scene.objArr[swch.editObjId].color = state; allowRender();}
	}), });
	this.editColor.dontSaveToFile = true; // Don't save this parameter when saving file
	this.editLock = new UIConnect.CheckboxInput({id: 'lck_edit_chbox', callback: (state) => addFrameBeginTask(() => {
		if (scene.objArr[swch.editObjId]){ scene.objArr[swch.editObjId].lock = state; allowRender();}
	}), });
	this.editLock.dontSaveToFile = true; // Don't save this parameter when saving file
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
				renderer.clearLayer0();
				renderer.clearLayer2();
				allowRender();
			}); // Clear render layers
		}

	} });
	// Mode 1
	this.traceMode1Length = new UIConnect.RangeInput({id: 'trace1Lnth', stateSaving: true, eventName: 'input', callback: (val, ths) => {ths.value = Math.pow(1 - val, 2)} });
	this.traceMode1Opacity = new UIConnect.RangeInput({id: 'trace_opacity', stateSaving: true, eventName: 'input', callback: (val)=>{
		renderer.canv2.style.opacity = val;
		allowRender();
	} });
	this.traceMode1Width = new UIConnect.RangeInput({id: 'trace1WdInp', stateSaving: true, initState: 1, eventName: 'input', callback: allowRender});
	this.traceMode1Blur = new UIConnect.RangeInput({id: 'trace_blur', stateSaving: true, eventName: 'input', callback: (val)=>{renderer.canv2.style.filter = `blur(${val*val}px)`; allowRender();} });
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
	this.movementResistance = new UIConnect.RangeInput({id: 'movement_resistance_value', stateSaving: true, eventName: 'input', callback: (val, ths)=>{m_resistance_value_title.innerHTML = ths.value = UtilityMethods.roundTo(Math.pow(val, 3), 5); ths.value = 1 - ths.value; }, initState: 0}); // Set gravitation (G) value
	this.movementResistance.getResistance = function (timeSpeed) { return 1 - (1 - this.value) * timeSpeed; } // Get working resistance value
	this.interactMode = new UIConnect.RadioInput({id: 'interact_radio_buttons', stateSaving: true}); // Select interactions mode
	this.collisionMode = new UIConnect.RadioInput({id: 'collision_radio_buttons', stateSaving: true}); // Select collision mode

	// Settings menu ======================================================
	// Select background color
	this.backgroundColor = new UIConnect.TextInput({id: 'background_color_select', eventName: 'input', initState: '#000000', stateSaving: true, callback: (color)=>{
		document.querySelector('body').style.backgroundColor = color;
		if (this.backgroundDarkness && this.backgroundDarkness.state > 0.9) this.backgroundDarkness.state = 0.7;
	}, });
	// Select background image
	this.backgroundImageURL = new UIConnect.TextInput({id: 'img_url_inp', stateSaving: true, callback: (value)=>{
		value = value == '' ? 'background/background.jpg' : value;
		const backgroundImgElement = document.getElementById('background_image');
		backgroundImgElement.setAttribute('src', value);
	}, });
	// Set background darkness
	this.backgroundDarkness = new UIConnect.RangeInput({id: 'bg_darkness', stateSaving: true, eventName: 'input', callback: (state, elem)=>{
		background_image.style.display = state === 0 ?'none' : 'initial';
		background_image.style.opacity = state;
	}, });
	this.backgroundFollowsMouse = new UIConnect.CheckboxInput({id: 'mouse_move_bg', stateSaving: true, initState: true}), // If true, background follows the cursor
		// Show FPS
	this.showFPS = new UIConnect.CheckboxInput({id: 'check_fps_swch', stateSaving: true, callback: (val)=>{
		if (val){ fpsIndicator.turnOn() }
		else { fpsIndicator.turnOff() }
	}, });
	this.showFPS.dontSaveToFile = true; // Don't save this parameter when saving file
	this.gpuCompute = new UIConnect.CheckboxInput({id: 'gpu_compute', stateSaving: true, initState: true, callback: (val, input)=>{
		if (!gpuComputeAvailable) {
			input.element.parentElement.style.display = 'none'; // Hide multithread option, if gpu not supported
		}
	}});
	this.gpuCompute.dontSaveToFile = true; // Don't save this parameter when saving file

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
renderLayers.addEventListener('touchstart', function(event){
	event.preventDefault();
	prev_cam_x = camera.x;
	prev_cam_y = camera.y;
	mouseDownHandler(event);
});
// Touch END
renderLayers.addEventListener('touchend', function(event){
	mouseUpHandler(event);
	zm_prev = camera.animZoom;
});
// Touch MOVE
renderLayers.addEventListener('touchmove', function(event){
	event.preventDefault();
	mouse.move = true;
	// Touch point
	event.clientX = event.targetTouches[0].clientX;// Touch X
	event.clientY = event.targetTouches[0].clientY;// Touch Y
	if (swch.tapCamMove && mouse.leftDown && !camera.hasTarget()){
		setCamPos(event);
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
			moveObjectBegin(); // Object move start
		} else {
			// Object move end
			if (scene.objArr[mov_obj]){
				scene.objArr[mov_obj].vx = movingObjectsPosAndVel[2];
				scene.objArr[mov_obj].vy = movingObjectsPosAndVel[3];
				mov_obj = null;
			}
		}
	}
	moveObject(); // Moving object if mouse down && navMenu.menuSelected == "move"
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
				setTimeFreeze(false);
			}
			renderer.clearLayer1();
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
renderLayers.addEventListener('mousedown', mouseDownHandler);
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
		renderLayers.setAttribute('mousedown', 'true');

		if (swch.allowObjCreating){
			// If pause when creating object enabled
			if (ui.pauseWhenCreatingObject.state
				&& (event.type !== 'touchstart' || multiTouch == 1)
				){
				setTimeFreeze(true);
			}
			// Ctrl precision modificator
			if (event.ctrlKey){
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
			renderer.clearLayer1();		
		}
	}
}
// Moving object function
function moveObject(){
	if (mouse.leftDown && navMenu.menuSelected == 'move' && mov_obj !== null){ // Moving object
		let newX = (mouse.x - mouse.leftDownX)/camera.animZoom + movingObjectsPosAndVel[0]; // New object X
		let newY = (mouse.y - mouse.leftDownY)/camera.animZoom + movingObjectsPosAndVel[1]; // New object Y
		if (!scene.objArr[mov_obj]) return;

		scene.objArr[mov_obj].x = newX; // New position X
		scene.objArr[mov_obj].y = newY; // New position Y
		renderer.allowFrameRender = true;
	}	
}
// Background movement
function bgMoving(){
	if (ui.backgroundFollowsMouse.state && ui.backgroundDarkness.state){
		Object.assign(document.getElementById('background_image').style, {top: (-mouse.y/25)+'px', left: (-mouse.x/25)+'px'});	
	}
}
// Start moving object
function moveObjectBegin(){
	// Перемещение ближайшео объекта
	if (navMenu.menuSelected == 'move' && mov_obj === null){
		mov_obj = scene.objectSelect();
		const movingObject = scene.objArr[mov_obj];
		if (!movingObject) return;

		movingObjectsPosAndVel[0] = movingObject.x; movingObjectsPosAndVel[1] = movingObject.y; //Координаты перемещяемого объекта
		movingObjectsPosAndVel[2] = movingObject.vx; movingObjectsPosAndVel[3] = movingObject.vy;	// Вектор перемещяемого объекта
		movingObject.vx = 0; movingObject.vy = 0;
	}
}
// Mouse UP
document.body.addEventListener('mouseup', (e) => {
		mouseUpHandler(e);
});
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
	if (
		(event.which == 1 && renderLayers.getAttribute('mousedown') === 'true')
	 	|| (event.type === 'touchend' && allowClick)
	){
		mouse.leftDown = false;
		renderLayers.removeAttribute('mousedown');
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
			scene.objArr[mov_obj].vx = movingObjectsPosAndVel[2];
			scene.objArr[mov_obj].vy = movingObjectsPosAndVel[3];
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
				setTimeFreeze(false);
			}
			renderer.clearLayer1();
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
		moveObjectBegin();
		isMinMouseMove = isMinMouseMove ? true : dist(mouse.x, mouse.y, mouse.leftDownX, mouse.leftDownY) >= minMouseMove;
	}
	moveObject(); // Moving object if mouse down && navMenu.menuSelected == "move"
	if (
		mouse.middleDown 
		|| (swch.tapCamMove && mouse.leftDown)
	){
		setCamPos(event);
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
	// console.log(e.code);
	if (!e.ctrlKey && !anyTextInputHasFocus){
		switch (e.code){
			case "KeyC":  document.querySelector('#create').click(); break; // (C) Create new object menu
			case "KeyD":  document.querySelector('#delete').click(); break; // (D) Delete object menu
			case "KeyE":  document.querySelector('#edit').click(); break; // (E) Edit object menu
			case "KeyT":  document.querySelector('#trajectory').click(); break; // (T) Trajectory menu
			case "Comma": document.querySelector('#timedown').click(); break; // (<) Time speed down
			case "Slash": document.querySelector('#play').click(); break; // (/) Play button
			case "Period": document.querySelector('#timeup').click(); break; // (>) Time speed up
			case "KeyM":  document.querySelector('#move').click(); break; // (M) Move object
			case "KeyP":  document.querySelector('#pause').click(); break; // (P) Pause button
			case "KeyH":  document.querySelector('#help').click(); break; // (H) Help menu
			case "KeyS":  document.querySelector('#settings').click(); break; // (S) Settings menu
			case "KeyV":  document.querySelector('#camera').click(); break; // (V) Camera menu
			case "KeyF":  document.querySelector('#world_settings').click(); break; // (F) World physics settings
			case "F9": ui.showFPS.state = !ui.showFPS.state; break; // (F9) Show FPS
			case "ArrowRight":  nextFrame = true; break; // Show one frame when paused (Right arrow)
			case "Space": // (Space) Create object
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
			case "NumpadAdd":  // (NumPad +) Zoom in
				camera.zoomTo(2);
				break;
			case "NumpadSubtract":  // (NumPad -) Zoom out
				camera.zoomTo(-2);
				break;
		}
		// (+) Simulation speed up withoud lost accuracity. Max limit is computer performance
		if (e.code == "Equal"){
			simulationsPerFrame *= 2;
			console.log(simulationsPerFrame);
			document.querySelector('.time_speed h2').innerHTML = 'T - X'+ui.timeSpeed.state*simulationsPerFrame;
			menuStateIcon.temporaryReplace('speedup', 300);
		} else
		// (-) Simulation speed down withoud lost accuracity. Min value is realtime
		if (e.code == "Minus"){
			if (simulationsPerFrame > 1){
				simulationsPerFrame /= 2;
				menuStateIcon.temporaryReplace('speeddown', 300);
				console.log(simulationsPerFrame);
				document.querySelector('.time_speed h2').innerHTML = 'T - X'+ui.timeSpeed.state*simulationsPerFrame;
			}
		}
	}
	//Ctrl keys
	// (Ctrl+Z) Delete last created object
	if (e.code == "KeyZ" && e.ctrlKey) addFrameBeginTask( () => scene.deleteObject( scene.objectSelect('last_created') ) );
});

class MenuStateIcon {
	#timeout = null;
	state = null;
	constructor ({iconId, format, path}) {
		this.format = format;
		this.path = path;
		this.element = document.getElementById(iconId);
		this.imgElem = this.element.querySelector('img');
	}

	#setStateImage(imageName) {
		clearTimeout(this.#timeout);
		this.imgElem.setAttribute('src', this.path + imageName + '.' + this.format);
	}
	temporaryReplace(temporaryStateName, liveTime, permanentStateName){
		if (permanentStateName) this.setState(permanentStateName);
		this.#setStateImage(temporaryStateName);
		this.#timeout = setTimeout(this.#setStateImage.bind(this), liveTime, this.state);
	}
	setState(stateName){
		this.state = stateName;
		this.#setStateImage(stateName);
	}
}

self.menuStateIcon = new MenuStateIcon({iconId: 'menuSelectedIcon', format: 'png', path: 'ico/'});

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
			setPauseState(true);
			worldSave();
			break;
		case 'sel_file_but': // Load button
			document.querySelector('#select_file').click();
			break;
		case 'clear_traces': // Clear traces
			renderer.clearLayer2();			
			for (let i in scene.objArr){
				scene.objArr[i].trace = [];
			}
			break;
		case 'max_performance_btn':
			setMaxPerformance();
			break;
	}
});

function setCamPos(event) {
	camera.x += (mouse.x - event.clientX) / camera.animZoom;
	camera.y += (mouse.y - event.clientY) / camera.animZoom;
}

function setMaxPerformance(){
	// In Chrome-based browsers the fastest traces mode is 1
	const isChromium = navigator.userAgent.match(/Chrome\/\d+/) !== null;
	ui.tracesMode.state = isChromium ? 1 : 0; // Set fastest traces mode

	// Trace mode 1 optimal parameters
	ui.traceMode1Opacity.state = 1;
	ui.traceMode1Width.state = 1;
	ui.traceMode1Blur.state = 0;

	// Trace mode 2 optimal parameters
	ui.traceMode2Particles.state = false;

	// Trace mode 3 optimal parameters
	ui.traceMode3Width.state = 1;

	// Disable background movement
	ui.backgroundFollowsMouse.state = false;
}

// Menu buttons handler
class NavigationMenu {
	menuState = false; // Menu state (Opened/Closed)
	menuSelected;
	prevMenuSelect;

	#openedMenu = false;
	#menuVisibleTimeout = null;
	#initMenuSelected;
	constructor({menuId, buttonsClassName, initMenuSelected, buttonsHandler}){
		this.#initMenuSelected = initMenuSelected;
		this.#findMenuElement(menuId);
		this.#loadState();
		menuStateIcon.setState(this.menuSelected);

		this.menuElem.addEventListener('click', (e) => {
			let eventButton = e.target.closest('.' + buttonsClassName);
			if (!eventButton) return;
			const menuSelected = eventButton.getAttribute('id'); // Clicked menu
			const menuName = eventButton.getAttribute('menuId'); // ID of menu page
			// console.log(menuSelected);
			// Menu buttons
			if (menuName){
				this.prevMenuSelect = this.menuSelected; // Prev clicked menu button
				this.menuSelected = menuSelected;
				if (menuSelected === this.prevMenuSelect){
					this.switchMenuState();
				} else {
					this.selectMenu(menuSelected);
				}
			}
			buttonsHandler(menuSelected);
		});
	}

	#findMenuElement(menuId){
		this.menuElem = document.getElementById(menuId);
	}

	#loadState(){
		const {'menuSelected': menuSelected, 'menuState': menuState} = sessionStorage;
		if (menuSelected && menuState) {
			this.selectMenu(menuSelected);
			menuState === 'false' && this.hideMenu();
		} else {
			this.selectMenu(this.#initMenuSelected);
		}

	}

	#saveState(){
		sessionStorage['menuSelected'] = this.menuSelected;
		sessionStorage['menuState'] = this.menuState;		
	}

	#getOpenedMenuId(){
		return document.getElementById(this.#openedMenu).getAttribute('menuId');;
	}

	hideMenu(){
		if (!this.menuState) return;
		document.getElementById(this.#getOpenedMenuId()).style.display = 'none';
		this.menuState = false;
		this.#openedMenu = false;
		this.#saveState();
	}

	showMenu(){
		this.#openedMenu = this.menuSelected;
		document.getElementById(this.#getOpenedMenuId()).style.display = 'inline-block';
		this.menuState = true;
		this.#saveState();
	}

	selectMenu(menuId){
		this.menuState && this.hideMenu(this.#openedMenu);
		this.menuSelected = menuId;
		this.showMenu();
		this.#openedMenu = menuId;
		if (pauseState){
			menuStateIcon.temporaryReplace(menuId, 700);
		} else {
			menuStateIcon.setState(menuId);
		}
		this.prevMenuSelect && document.getElementById(this.prevMenuSelect).removeAttribute('selected');
		this.menuSelected && document.getElementById(this.menuSelected).setAttribute('selected', '');
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
				document.getElementById(this.#getOpenedMenuId()).style.display = 'inline-block';
			} else {
				document.getElementById(this.#getOpenedMenuId()).style.display = 'none';
			}
		}, timeout);
	}
}

self.navMenu = new NavigationMenu({
	menuId: 'navigation_menu',
	buttonsClassName: 'btn',
	initMenuSelected: 'create',
	buttonsHandler: function (buttonId) {
		switch (buttonId){
		// Change time speed DOWN
		case 'timedown': 
			ui.timeSpeed.state *= 0.5;
			menuStateIcon.temporaryReplace('speeddown', 300);
			break;
		// Change time speed UP
		case 'timeup':
			ui.timeSpeed.state *= 2;
			menuStateIcon.temporaryReplace('speedup', 300);
			break;
		// Pause
		case 'pause':
			setPauseState(!pauseState);
			break;
		// Play
		case 'play':
			if (ui.timeSpeed.state != 1 || pauseState){ // If time speed == 1 or pause == true
				simulationsPerFrame = 1;
				ui.timeSpeed.state = 1;
				setPauseState(false);
			}
			break;
		default:
			swch.allowObjCreating = (buttonId === 'create' && !swch.s_mainObj); // Allow object creating if menu is "Creation menu"
		}
		if (ui.showDistanceFromCursorToMainObj.state) renderer.clearLayer1();
	}
});

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

function worldSave(){
	// Objects array saving
	const objArrWrite = UtilityMethods.deepClone(scene.objArr);
	// Remove unnecessary data from objects array
	for(let i in objArrWrite){
		objArrWrite[i].trace = [];
		delete objArrWrite[i].prevScreenX;
		delete objArrWrite[i].prevScreenY;
		delete objArrWrite[i].prevScreenR;
	}

	// Simulation state saving
	const uiToSave = {};
	for (let uiId in ui){
		const uiElem = ui[uiId];
		// Dont save
		if (uiElem.dontSaveToFile) continue;

		uiToSave[uiId] = uiElem.state;
	}

	// Data preparing
	let saveData = {
		objArr: objArrWrite, 
		ui: uiToSave
	};
	saveData = JSON.stringify(saveData);
	writeFile("Orbit Simulator - "+lanwich.getTranslatedText("my_world")+".json", saveData);
}

// Write file
function writeFile(name, data = '') {
	const download = document.createElement("a");
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
			const fileData = JSON.parse(reader.result);
			// Sync objects array to the saved objects array
			scene.objArr = fileData.objArr;

			// Sync user interface state
			for (let uiId in fileData.ui){
				const uiValue = fileData.ui[uiId];
				if (!ui[uiId]) {
					console.log('Parameter "' + uiId + '" is not supported! Continue without the parameter.');
					continue;
				}
				ui[uiId].setInputState(uiValue);
			}

			scene.show_obj_count();
			renderer.allowFrameRender = true;
			renderer.clearLayer2();
			console.log('File loaded successfully!');
		} catch(err){
			console.error(err);
			alert(lanwich.getTranslatedText('incompatible_file'));
		}
	}
	reader.onerror = function(err) {
		console.error(err);
		alert(lanwich.getTranslatedText('file_read_error'));
	}
}