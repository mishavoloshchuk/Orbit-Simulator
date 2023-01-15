import Scene from './Scene.js';
import Camera from './Camera.js';
import UserInput from './UserInput.js';
import IndicateFPS from './IndicateFPS.js';
window.onload = function(){
	//Mouse
	this.mouse = {
		x: window.innerWidth/1.5,
		y: window.innerHeight/2,
		leftDown: false,
		leftDownX: window.innerWidth/2,
		leftDownY: window.innerHeight/2,
		leftUpX: window.innerWidth/1.4,
		leftUpY: window.innerHeight/2,
		rightDown: false,
		middleDown: false,
		move: false,
	}

	// Touch
	let allowClick = true; // If touches > 1 cancel the click event. If true - allow click

	// Tasks to frame begin
	this.frameTasks = new Array(); // Functions array
	function addFrameBeginTask(func, ...args){
		frameTasks.push({func: func, args: args});
	}

	this.getDeviceType = () => {
		const ua = navigator.userAgent;
		if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
			return "tablet";
		} else
		if ( /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua) ) {
		  return "mobile";
		}
		return "desktop";
	};

	// Get new object id, when objects array changed
	this.getIdAfterArrChange = (delArr, objId, defaultValue = null) => {
		return delArr.reduce((newObjId, currId) => { 
			if (objId > currId) return newObjId - 1;
			else if (objId === currId) return defaultValue;
			return newObjId; // If objId less than any of delArr
		 }, objId);
	}

	var mbut = 'create';
	var menu_state = true; // Menu state (Opened/Closed)
	if (sessionStorage['mbut'] && sessionStorage['menu_state']){
		mbut = sessionStorage['mbut'];
		menu_state = sessionStorage['menu_state'] == 'true';
	}
	//Buttons
	var cbut = '';
	var chck = '';
	var pfb = mbut;

	let anyTextInputHasFocus = false;

	// === ...
	this.mov_obj = null; // Moving object id
	this.dis_zone = 5;
	this.frameTime = [0, Date.now()]; // Frametime
	let renderStopLatency; // Frames to render after render disabled

	// Camera touch control
	var prev_cam_x = 0;
	var prev_cam_y = 0;
	var zm_prev = 1;
	var zm_cff = null;

	//Debug
	this.simulationSpeed = 1;
	this.maxFPS = false;
	this.nextFrame = false;

	this.simulationDone = simulationSpeed;

	// FPS indicator init
	this.fpsIndicator = new IndicateFPS();

	// Scene init
	this.scene = new Scene();
	scene.camera = new Camera(scene);
	scene.activCam = scene.camera;
	scene.frame = frame;

	this.pauseState = false; // Global pause state

	var switcher = {device: 'desktop',
		visT: false}; // Collisions: repulsion merge none

	this.swch = {
		s_track: true,
		s_edit: true,
		edit_obj: false,
		s_mainObj: false,
		allowObjCreating: mbut === 'create',
		tapCamMove: false
	};

	var menu_names = {create: 'menu_options', delete: 'del_menu_options', edit: 'edit_menu',
		help: 'help_menu', settings: 'settings_menu', camera: 'camera_menu', trajectory: 'traj_menu',
		world_settings: 'world_settings_menu'}

	function allowRender(){
		scene.activCam.allowFrameRender = true;
	}
	// MENU INPUTS \/ \/ \/
	// new UserInput({type: '', id: '', stateSaving: true}),

	// Create object menu ================================================
	let 
	newObjColor = new UserInput({type: 'color', id: 'newObjeColorSelect', stateSaving: true, initState: scene.randomColor()}), // Menu color select input
	newObjRandColor = new UserInput({type: 'checkbox', id: 'randColorCheck', stateSaving: true, initState: true}), // Menu new object random color input
	newObjMass = new UserInput({type: 'manualInput', id: 'new_object_mass_input', stateSaving: true, initState: Math.round(getRandomArbitrary(0.5, 100)*10)/10, callback: (state)=>{
		document.getElementById('newObjMassSpan').innerHTML = Math.round(state*1000)/1000;
	}}), // Menu new object's mass input
	newObjNegativeMass = new UserInput({type: 'checkbox', id: 'new_obj_negative_mass', stateSaving: true, callback: (state) => {newObjMass.state = state ? -Math.abs(newObjMass.state) : Math.abs(newObjMass.state)} }), // Menu new object negative mass
	newObjLock = new UserInput({type: 'checkbox', id: 'objLckCeck', initState: false}), // Menu lock created object input
	//
	newObjCircularOrbit = new UserInput({type: 'checkbox', id: 'circleOrbitCheck', stateSaving: true, initState: true}), // Menu circle orbit on click input
	newObjCreateReverseOrbit = new UserInput({type: 'checkbox', id: 'objReverseCheck', stateSaving: true, initState: false}), // Menu reverse ordit direction input
	pauseWhenCreatingObject = new UserInput({type: 'checkbox', id: 'new_obj_pause', stateSaving: true, initState: true, callback: (val, elem)=>{elem.prevPauseState = false}}), // Menu pause when user add object input
	launchForce = new UserInput({type: 'range', id: 'launch_power', stateSaving: true, callback: (val)=>{lnch_pwr_span.innerHTML = Math.round(powerFunc(val)*1000)/1000; mouse.move = true;}, eventName: 'input'}), // Menu launch power value input
	showDistanceFromCursorToMainObj = new UserInput({type: 'checkbox', id: 'vis_distance_check', stateSaving: true, callback: ()=>{ launchPowerLabel.style.display = 'none'; scene.camera.clearLayer2(); }}), // Menu visual distance
	//
	showNewObjTrajectory = new UserInput({type: 'checkbox', id: 'traj_prev_check', stateSaving: true, initState: true, callback: (val, elem)=>{
		// Show or hide additional menu
		if (val){
			additionalTrajectoryMenu.removeAttribute('disabled');
		} else {
			additionalTrajectoryMenu.setAttribute('disabled', '');
		}
	}}), // Enable trajectory calculation before create object
	newObjTrajLength = new UserInput({type: 'range', id: 'traj_calc_samples', stateSaving: true}), // Trajectory calutulation length input
	newObjTrajAccuracity = new UserInput({type: 'range', id: 'traj_calc_accuracity', stateSaving: true }), // Trajectory accuracity input

	// Delete object menu =================================================
	deletingMode = new UserInput({type: 'radio', id: 'dellMethodRadio'}), // Deleting method

	// Edit object menu ===================================================
	editMass = new UserInput({type: 'manualInput', id: 'mass_edit', initState: 1000, callback: (state) => {
			document.getElementById('editObjMassSpan').innerHTML = Math.round(state*1000)/1000;
		}
	}),
	editObjNegativeMass = new UserInput({type: 'checkbox', id: 'edit_obj_negative_mass', callback: (state) => {
		editMass.state = state ? -Math.abs(editMass.state) : Math.abs(editMass.state);
		allowRender();
		addFrameBeginTask(()=>{
			if (scene.objArr[swch.edit_obj]) scene.objArr[swch.edit_obj].m = editMass.state;
		});
	} }), // Menu edit object negative mass

	editColor = new UserInput({type: 'color', id: 'col_edit', eventName: 'input', callback: (state) => addFrameBeginTask(() => {
		if (scene.objArr[swch.edit_obj]){ scene.objArr[swch.edit_obj].color = state; allowRender();}
	}), }),
	editLock = new UserInput({type: 'checkbox', id: 'lck_edit_chbox', callback: (state) => addFrameBeginTask(() => {
		if (scene.objArr[swch.edit_obj]){ scene.objArr[swch.edit_obj].lock = state; allowRender();}
	}), }),
	// Trace settings =====================================================
	tracesMode = new UserInput({type: 'radio', id: 'traj_radio_buttons', stateSaving: true, initState: 1, callback: (val, elem) => {
		for (let element of traj_menu.getElementsByClassName('additionalOption')){
			if ( element.id.includes(val.toString()) && !element.hasAttribute('disabled')) { element.style.display = 'inline' } else { element.style.display = 'none' } // Show additional options by radio value
		}
		if (elem.prevState != val){ // If state changed
			addFrameBeginTask(()=>{
				scene.camera.clearLayer1();
				scene.camera.clearLayer3();
				allowRender();
			}); // Clear render layers
		}

	} }),
	// Mode 1
	traceMode1Opacity = new UserInput({type: 'range', id: 'trace_opacity', stateSaving: true, eventName: 'input', callback: (val)=>{scene.activCam.canv3.style.opacity = val; allowRender();} }),
	traceMode1Blur = new UserInput({type: 'range', id: 'trace_blur', stateSaving: true, eventName: 'input', callback: (val)=>{scene.activCam.canv3.style.filter = `blur(${val*val}px)`; allowRender();} }),
	// Mode 2
	traceMode2Particles = new UserInput({type: 'checkbox', id: 'trc2PrtclsChck', stateSaving: true, initState: true, callback: allowRender}),
	traceMode2Trembling = new UserInput({type: 'checkbox', id: 'trc2TrembChck', stateSaving: true, initState: true, callback: allowRender}),
	traceMode2Length = new UserInput({type: 'range', id: 'trace2Lnth', stateSaving: true, eventName: 'input', callback: allowRender}),
	// Mode 3 
	traceMode3Width = new UserInput({type: 'range', id: 'trace3WdInp', stateSaving: true, eventName: 'input', callback: allowRender}),
	traceMode3Quality = new UserInput({type: 'range', id: 'trace3Qu', stateSaving: true, eventName: 'input', callback: allowRender}),
	traceMode3Length = new UserInput({type: 'range', id: 'trace3Lnth', stateSaving: true, eventName: 'input', callback: allowRender}),

	// Camera menu ========================================================
	zoomToScreenCenter = new UserInput({type: 'checkbox', id: 'chck_zoomToScreenCenter', stateSaving: true, initState: false}), // Zoom to cursor as default. If enabled zoom, zooming to screen center

	// Physics menu =======================
	gravitationMode = new UserInput({type: 'radio', id: 'gravit_mode_radio_buttons', stateSaving: true}), // Select gravitation mode (radio)
	g = new UserInput({type: 'range', id: 'g_value', eventName: 'input', callback: (val)=>{g_value_title.innerHTML = powerFunc(val)}, initState: 1}), // Set gravitation (G) value
	interactMode = new UserInput({type: 'radio', id: 'interact_radio_buttons', stateSaving: true}), // Select interactions mode
	collisionMode = new UserInput({type: 'radio', id: 'collision_radio_buttons', stateSaving: true}), // Select collision mode

	// Settings menu ======================================================
	// Select background image
	backgroundImageURL = new UserInput({type: 'text', id: 'img_url_inp', stateSaving: true, callback: (value)=>{
		value = value == '' ? 'background/background.jpg' : value;
		document.getElementById('background_image').setAttribute('src', value);
	}, }),
	// Set background darkness
	backgroundDarkness = new UserInput({type: 'range', id: 'bg_darkness', stateSaving: true, eventName: 'input', callback: (state, elem)=>{
		background_image.style.opacity = state;
	}, }),
	backgroundFollowsMouse = new UserInput({type: 'checkbox', id: 'mouse_move_bg', stateSaving: true, initState: true}), // If true, background follows the cursor
	// Show FPS
	showFPS = new UserInput({type: 'checkbox', id: 'check_fps_swch', stateSaving: true, callback: (val)=>{
			if (val){ fpsIndicator.turnOn() }
			else { fpsIndicator.turnOff() }
	}, }),
	multitreadCompute = new UserInput({type: 'checkbox', id: 'multithread_comput', stateSaving: true, initState: getDeviceType() === 'desktop', callback: (val, input)=>{
		if (window.navigator.hardwareConcurrency < 2) {
			input.element.parentElement.style.display = 'none'; // Hide multithread option, if computer have only 1 thread
		}
	}}),
	maxPerformance = new UserInput({type: 'checkbox', id: 'max_performance', stateSaving: true, callback: (state)=>{
		if (state) {
			scene.camera.ctx3.clearRect(0,0,scene.camera.resolutionX,scene.camera.resolutionY);
			scene.camera.canv3.style.display = background_image.style.display = 'none';
			additionalTrajectoryOptions1.setAttribute('disabled', '');
			scene.activCam.allowFrameRender = true; // Render
			tracesMode.state = tracesMode.state; // Refresh trace mode menu
			view_settings.className += ' disabled'; // Hide view settings
		} else {
			scene.camera.ctx.clearRect(0,0,scene.camera.resolutionX,scene.camera.resolutionY);
			scene.camera.canv3.style.display = background_image.style.display = '';
			additionalTrajectoryOptions1.removeAttribute('disabled');
			scene.activCam.allowFrameRender = true; // Render
			tracesMode.state = tracesMode.state; // Refresh trace mode menu
			view_settings.className = view_settings.className.replace('disabled', ''); // Hide view settings
		}
	}})
	;

	let timeSpeed = new UserInput({type: 'manualInput', initState: 1, callback: (val, inpVar)=>{
		document.querySelector('.time_speed h2').innerHTML = 'T - X'+val;
		let changedVal = val / inpVar.prevState;
		inpVar.changed = inpVar.changed !== undefined ? inpVar.changed * changedVal : changedVal;
		addFrameBeginTask(()=>{ // Frame begin taks
			// Change time speed correction
			if (scene.timeSpeed.changed !== undefined){
				for (let object of scene.objArr){
					object.x += (object.vx * scene.timeSpeed.state - object.vx * (scene.timeSpeed.state / scene.timeSpeed.changed))/2;
					object.y += (object.vy * scene.timeSpeed.state - object.vy * (scene.timeSpeed.state / scene.timeSpeed.changed))/2;
				}
				delete scene.timeSpeed.changed;
			}
		});
		
	}, eventName: 'input'}); // Time speed control

	//=================================================================================================================
	//=================================================================================================================

	Object.assign(scene, {
		// Settings
		showFPS: showFPS,
		maxPerformance: maxPerformance,
		zoomToScreenCenter: zoomToScreenCenter,
		// Physics
		timeSpeed: timeSpeed,
		g: g,
		gravitationMode: gravitationMode,
		interactMode: interactMode,
		collisionMode: collisionMode,
		// New object settings
		launchForce: launchForce,
		newObjCircularOrbit: newObjCircularOrbit,
		newObjCreateReverseOrbit: newObjCreateReverseOrbit,
		newObjColor: newObjColor,
		newObjMass: newObjMass,
		newObjLock: newObjLock,
		// Trace modes
		tracesMode: tracesMode,
		traceMode2Particles: traceMode2Particles,
		traceMode2Trembling: traceMode2Trembling,
		traceMode2Length: traceMode2Length,
		traceMode3Quality: traceMode3Quality,
		traceMode3Length: traceMode3Length,
		traceMode3Width: traceMode3Width,
	});

	scene.addNewObject({vx: 0, vy: 0, mass: 1000, ob_col: '#ffff00', objLck: true}); // First object init

	change_state(mbut);

	function menu_open_restore(){
		if (menu_state){
			document.querySelector('#'+menu_names[mbut]).style.display = 'inline-block';
		}
	}
	menu_open_restore();

	//Mouse and touches
	let multiTouch = 0;
	let avTouchPoint = {x: NaN, y: NaN, xd: NaN, yd: NaN};
	let mscam = true;

	window.onresize = function(){
		scene.camera.resolutionX = window.innerWidth;
		scene.camera.resolutionY = window.innerHeight;
		scene.camera.allowFrameRender = true;
		setFullScreenIcon(); // Check full screen mode and set the button icon
		setMassRange();
	}

	// Mass range inputs =======
	setMassRange();
	function setMassRange() {
		let element = document.querySelector('#create_mass');
		if (!newObjMass.event){
			element.value = Math.pow(Math.abs(newObjMass.state) / Math.pow((innerWidth + innerHeight)/4/scene.camera.animZoom, 2), 1/3);
		}
		element = document.querySelector('#mass_edit');
		if (!editMass.event){
			element.value = Math.pow(Math.abs(editMass.state) / Math.pow((innerWidth + innerHeight)/4/scene.camera.animZoom, 2), 1/3);
		}
	}
	// New object mass edit input events
	document.getElementById('create_mass').addEventListener('input', (e)=>{
		newObjMass.event = true;
		newObjMass.state = ( Math.pow(e.target.value, 3) * Math.pow((innerWidth + innerHeight)/4/scene.camera.animZoom, 2) ) * (newObjNegativeMass.state ? -1 : 1);
		let menuContainer = document.getElementById('options_menu_container');
		if (!menuContainer.className.includes(" zero_opacity")){
			e.target.closest('.option_item').className += " nozeroopacity";
			menuContainer.className += " zero_opacity";
		}
	});
	document.getElementById('create_mass').addEventListener('change', (e)=>{
		newObjMass.event = false;
		let menuContainer = document.getElementById('options_menu_container');
		menuContainer.className = menuContainer.className.replace(" zero_opacity", "");
		e.target.closest('.option_item').className = e.target.closest('.option_item').className.replace(" nozeroopacity", "");
	});
	document.querySelector('#mass_edit').addEventListener('input', (e)=>{
		editMass.event = true;
		editMass.state = ( Math.pow(e.target.value, 3) * Math.pow((innerWidth + innerHeight)/4/scene.camera.animZoom, 2) ) * (editObjNegativeMass.state ? -1 : 1);
		let menuContainer = document.getElementById('options_menu_container');
		if (!menuContainer.className.includes(" zero_opacity")){
			e.target.closest('.option_item').className += " nozeroopacity";
			menuContainer.className += " zero_opacity";
		}
	});
	document.querySelector('#mass_edit').addEventListener('change', (e)=>{
		editMass.event = false;
		let menuContainer = document.getElementById('options_menu_container');
		menuContainer.className = menuContainer.className.replace(" zero_opacity", "");
		e.target.closest('.option_item').className = e.target.closest('.option_item').className.replace(" nozeroopacity", "");
		addFrameBeginTask(() => {
			if (scene.objArr[swch.edit_obj]){ scene.objArr[swch.edit_obj].m = editMass.state; allowRender();}
		});
	});
	// Touch events ======================================
	// Touch START
	document.getElementById('renderLayers').addEventListener('touchstart', function(event){
		event.preventDefault();
		prev_cam_x = scene.camera.x;
		prev_cam_y = scene.camera.y;
		mouseDownHandler(event);
	});
	// Touch END
	document.getElementById('renderLayers').addEventListener('touchend', function(event){
		mouseUpHandler(event);
		zm_prev = scene.camera.animZoom;
	});
	// Touch MOVE
	document.getElementById('renderLayers').addEventListener('touchmove', function(event){
		event.preventDefault();
		mouse.move = true;
		// Touch point
		event.clientX = event.targetTouches[0].clientX;// Touch X
		event.clientY = event.targetTouches[0].clientY;// Touch Y
		if (swch.tapCamMove && mouse.leftDown && !scene.camera.hasTarget()){
			scene.camera.x += (mouse.x - event.clientX)/scene.camera.animZoom;
			scene.camera.y += (mouse.y - event.clientY)/scene.camera.animZoom;
			let mstate = menu_state;
			close_all_menus(); 
			menu_state = mstate;
			scene.camera.setTarget();
		}
		[mouse.x, mouse.y] = [event.clientX, event.clientY]; // Set cursor position
		// Averrage point of touchs
		let av_touch_x = [];
		let av_touch_y = [];
		// Object move start/end
		if (mbut == 'move'){
			if (multiTouch == 1 && allowClick) {
				movingObjectBegin(); // Object move start
			} else {
				// Object move end
				if (scene.objArr[mov_obj]){
					scene.objArr[mov_obj].vx = scene.mpos[2];
					scene.objArr[mov_obj].vy = scene.mpos[3];
					mov_obj = null;
				}
			}
		}
		movingObject(); // Moving object if mouse down && mbut == "move"
		if (event.changedTouches.length == 2){ // If multitouch
			//All touch points array
			for (let i = 0; i < event.changedTouches.length; i++){
				av_touch_x.push(event.changedTouches[i].clientX);
				av_touch_y.push(event.changedTouches[i].clientY);
			} 
			// Averrage point of touchs
			avTouchPoint.x = sumArray(av_touch_x)/av_touch_x.length;
			avTouchPoint.y = sumArray(av_touch_y)/av_touch_x.length;
			 // Distance between touchs
			let touchZoom = dist(event.changedTouches[0].clientX, event.changedTouches[0].clientY, event.changedTouches[1].clientX, event.changedTouches[1].clientY);
			 // Clear launch power label display
			launchPowerLabel.style.display = 'none';

			if (swch.allowObjCreating && mouse.leftDown){
				if (pauseWhenCreatingObject.state){
					pauseState = pauseWhenCreatingObject.prevPauseState;
				}
				scene.camera.clearLayer2();
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
				if (scene.camera.Target !== undefined){
					avTouchPoint.xd = avTouchPoint.x;
					avTouchPoint.yd = avTouchPoint.y;
					prev_cam_x = scene.camera.x;
					prev_cam_y = scene.camera.y;
					scene.camera.setTarget();
					console.log(1)
				}
			}
			// Limit zoom
			let newZoom = zm_prev / Math.pow(Math.sqrt(zm_cff) / Math.sqrt(touchZoom), 2); // Zoom
			if (newZoom < 10000 && newZoom > 1.0e-12){
				scene.camera.zoom = scene.camera.animZoom = newZoom;
			}
			if (!zoomToScreenCenter.state && scene.camera.Target === undefined){ // If zoom to screen center
				scene.camera.ax = scene.camera.x = prev_cam_x - (avTouchPoint.x - avTouchPoint.xd)/scene.camera.animZoom + (((window.innerWidth/2 - avTouchPoint.xd)/zm_prev)*Math.pow(Math.sqrt(zm_cff) / Math.sqrt(touchZoom), 2) - ((window.innerWidth/2 - avTouchPoint.xd)/zm_prev));
				scene.camera.ay = scene.camera.y = prev_cam_y - (avTouchPoint.y - avTouchPoint.yd)/scene.camera.animZoom + (((window.innerHeight/2 - avTouchPoint.yd)/zm_prev)*Math.pow(Math.sqrt(zm_cff) / Math.sqrt(touchZoom), 2) - ((window.innerHeight/2 - avTouchPoint.yd)/zm_prev));
			}
		}
		bgMoving();
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
			// console.log('touchstart');
		} else {
			[mouse.leftDownX, mouse.leftDownY] = [event.clientX, event.clientY];
		}
		// Set cursor position
		[mouse.leftDownX, mouse.leftDownY] = [event.clientX, event.clientY];
		[mouse.x, mouse.y] = [event.clientX, event.clientY];

		// Left mouse down
		if (event.which == 1 || event.type === 'touchstart'){
			mouse.leftDown = true;

			if (swch.allowObjCreating){
				try{clearTimeout(mort)}catch(err){};
				// If pause when creating object enabled
				if (event.type === 'touchstart'){
					if (pauseWhenCreatingObject.state && multiTouch == 1){
						pauseWhenCreatingObject.prevPauseState = pauseState;
						pauseState = true;
					}
				} else {
					if (pauseWhenCreatingObject.state){
						pauseWhenCreatingObject.prevPauseState = pauseState;
						pauseState = true;
					}
				}
				if (event.ctrlKey){ // If Ctrl pressed
					scene.mouse_coords[0] = mouse.x;
					scene.mouse_coords[1] = mouse.y;
				}
			};
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
				scene.camera.clearLayer2();		
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
			if (mbut == 'delete' && scene.objArr.length){
				addFrameBeginTask( () => scene.deleteObject(scene.objectSelect(deletingMode.state)) );
			}
			// Object edit select
			if (mbut == 'edit' && swch.s_edit){
				swch.edit_obj = scene.objectSelect();
				swch.s_edit = false;
				if (scene.objArr[swch.edit_obj]){
					editColor.state = scene.objArr[swch.edit_obj].color;
					editMass.state = scene.objArr[swch.edit_obj].m;
					editObjNegativeMass.state = scene.objArr[swch.edit_obj].m < 0;
					document.getElementById('lck_edit_chbox').checked = scene.objArr[swch.edit_obj].lock;
				}
			}
			// // Object move end
			if (mbut == 'move' && scene.objArr[mov_obj] && mov_obj !== null){
				scene.objArr[mov_obj].vx = scene.mpos[2];
				scene.objArr[mov_obj].vy = scene.mpos[3];
				mov_obj = null;
			}

			// Create object
			if (swch.allowObjCreating){
				if (mscam && !mouse.rightDown){
					addFrameBeginTask(()=>{
						scene.addNewObject({
							ob_col: newObjColor.state,
							mass: newObjMass.state,
							objLck: newObjLock.state,
							main_obj: scene.objIdToOrbit
						});
						if (newObjRandColor.state) newObjColor.state = scene.randomColor();
					});
				}
				var mort = setTimeout(menu_open_restore, 200);
				if (pauseWhenCreatingObject.state){
					pauseState = pauseWhenCreatingObject.prevPauseState;
				}
				// scene.camera.clearLayer2();
			}
			if (mbut == 'camera' && swch.s_track){
				scene.camera.setTarget(scene.objectSelect('nearest', scene.camera.Target));
			}
			if (swch.s_mainObj){
				if (allowClick){
					swch.allowObjCreating = true;
					swch.s_mainObj = false;
					scene.objIdToOrbit = scene.objectSelect();
				}
			}
			if (swch.tapCamMove){
				menu_open_restore();
			}
		}
		// Middle mouse up
		if (event.which == 2 || !mscam){
			mouse.middleDown = false;
			menu_open_restore();
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
		if (mouse.leftDown) movingObjectBegin();
		movingObject(); // Moving object if mouse down && mbut == "move"
		if (
			mouse.middleDown 
			|| (swch.tapCamMove && mouse.leftDown)
			){
			scene.camera.x += (mouse.x - event.clientX)/scene.camera.animZoom;
			scene.camera.y += (mouse.y - event.clientY)/scene.camera.animZoom;
			let mstate = menu_state;
			close_all_menus(); 
			menu_state = mstate;
			scene.camera.setTarget();
		}

		// Set cursor position
		[mouse.x, mouse.y] = [event.clientX, event.clientY];
		if (event.ctrlKey){
			if (!scene.mouse_coords[0]){
				scene.mouse_coords[0] = mouse.x;
				scene.mouse_coords[1] = mouse.y;			
			}
		} else {
			scene.mouse_coords[0] = scene.mouse_coords [1] = false;
		}
		bgMoving();
	};
	// Background movement
	function bgMoving(){
		if (backgroundFollowsMouse.state && backgroundDarkness.state && !maxPerformance.state){
			Object.assign(document.getElementById('background_image').style, {top: (-mouse.y/25)+'px', left: (-mouse.x/25)+'px'});	
		}
	}
	//===================================================================================

	// Frame control
	let frameInterval;
	this.allowCompute = false;
	frameControl();
	function frameControl(){
		if (maxFPS !== false){
			if (!frameInterval) frameInterval = setInterval(()=>{frame(); frameControl();}, 1000/maxFPS);
		} else {
			clearInterval(frameInterval);
			if ( !scene.workersJobDone ) { // If workers job done, render frame
				frame();
			} else { // If workers are still working, allow them to call the frame (if fps < 60)
				allowCompute = true;
			}
			window.requestAnimationFrame(frameControl);
		}
	}
	function frame(){
		// Run all functions from frameTasks array
		if (!scene.workersJobDone){
			frameTasks.forEach((task)=>{
				task.func(...task.args);
			});
			frameTasks = []; // Clear frameTasks array
		}
		// Select object to orbit
		if (!scene.objArr[scene.objIdToOrbit]){
			scene.objIdToOrbit = scene.objectSelect('biggest');		
		}

		// Set move cursor style
		if (mouse.middleDown || mbut == 'move' || (mouse.leftDown && swch.tapCamMove)){scene.camera.layersDiv.style.cursor = "move";}else{scene.camera.layersDiv.style.cursor = "default";};

		swch.tapCamMove = mbut !== 'create' && !scene.camera.canv2.visualSelect;

		simulationDone = simulationSpeed;
		if (scene.objArr.length){
			if (!pauseState || nextFrame){
				scene.simulationsPerFrame = 1; // Simulations per frame (only multithread)
				for(let i = 1; i--;){
					if (window.Worker && window.navigator.hardwareConcurrency > 1 && multitreadCompute.state){
						// scene.physicsMultiThreadCalculate();
						scene.gpuComputeVelocities();
					} else {
						scene.physicsCalculate(); // Scene physics calculations (1 step)
					}
				}
			}
		}
		scene.camera.frame(); // Trigger camera frame
		// Measure FPS
		fpsIndicator.measure();
		// Frame rendering
		if (scene.activCam.allowFrameRender){
			scene.camera.renderObjects(scene.world);
			setMassRange();
			renderStopLatency = 125; // Count of frames to render after render is disabled
		} else {
			// If traces mode is 1 render ${renderStopLatency} frames after render disabled
			if (renderStopLatency && tracesMode.state == 1 && !pauseState){
				renderStopLatency --;
				setMassRange();
				scene.camera.renderObjects(scene.world);
			}
		}

		// Show distance
		if (mbut == 'create' && !mouse.leftDown && showDistanceFromCursorToMainObj.state && !scene.camera.canv2.visualSelect){
			scene.camera.clearLayer2();
			vis_distance([mouse.x, mouse.y], '#888888');
		}
		// Hide launch power label
		if (!swch.allowObjCreating || scene.camera.canv2.visualSelect){
			launchPowerLabel.style.display = 'none';
		}

		if (scene.camera.canv2.visualSelect){
			scene.camera.clearLayer2();
			delete scene.camera.canv2.visualSelect;
		}
		const nearObjId = scene.objectSelect('nearest');
		if (mbut == 'delete'){
			scene.camera.visualObjectSelect(scene.objectSelect(deletingMode.state), '#ff0000');
		} else
		if (mbut == 'camera' && swch.s_track){
			scene.camera.visualObjectSelect(scene.objectSelect('nearest', scene.camera.Target),'#0af');
		} else
		if (mbut == 'move'){
			scene.camera.visualObjectSelect(nearObjId,'#bbb');
		} else
		if (mbut == 'edit' && swch.s_edit){
			scene.camera.visualObjectSelect(nearObjId, '#f81', 0);
		} else
		if (swch.s_mainObj){
			scene.camera.visualObjectSelect(nearObjId,'#bf0');
		}
		// New object trajectory
		if (swch.allowObjCreating 
			&& mouse.leftDown 
			&& !mouse.rightDown 
			&& (mouse.move || (!pauseWhenCreatingObject.state && scene.activCam.allowFrameRender)
			)
			){
			if (!(Math.abs(mouse.leftDownX-mouse.x) <= dis_zone && Math.abs(mouse.leftDownY-mouse.y) <= dis_zone)){
				scene.camera.visual_trajectory();
				if (showNewObjTrajectory.state){
					// Trajectory calculation
					scene.camera.trajectoryCalculate({
					trajLen: newObjTrajLength.state, 
					accuracity: newObjTrajAccuracity.state, });
				}
				// Hide menu while creating new object
				let mstate = menu_state;
				close_all_menus();
				menu_state = mstate;
			}
		}

		// Visualize new object mass
		if (newObjMass.event){
			scene.camera.visObjMass(newObjMass.state, newObjColor.state);
		}
		// Visualize edit object mass
		if (editMass.event && scene.objArr[swch.edit_obj]){
			scene.camera.visObjMass(editMass.state, editColor.state, ...scene.camera.crd2(scene.objArr[swch.edit_obj].x, scene.objArr[swch.edit_obj].y));
		}

		scene.activCam.allowFrameRender = false;
		mouse.move = false;
		nextFrame = false;
		return true;
	}
	//scene.frame();
	this.addObjects = function(count = 100){
		for (let i = 0; i < count; i++){
		  	addFrameBeginTask(()=>{ 
				scene.addNewObject({
		  	 		x: scene.camera.resolutionX * Math.random(), y: scene.camera.resolutionY *Math.random(),
					ob_col: newObjColor.state,
					mass: newObjMass.state,
					objLck: newObjLock.state,
					main_obj: scene.objIdToOrbit
				});
				if (newObjRandColor.state) newObjColor.state = scene.randomColor();
			});
		}
	}
	//addObjects(100);

	// Show distance to main object
	function vis_distance(obj_cord, col = '#888888', targ_obj = scene.objIdToOrbit){
		if (scene.objArr[targ_obj]){
			let obCoords = [scene.objArr[targ_obj].x, scene.objArr[targ_obj].y];
			let size = dist(obj_cord[0], obj_cord[1], ...scene.camera.crd2(obCoords[0], obCoords[1]));
			if (size > scene.camera.getScreenRad(scene.objArr[targ_obj].m)){
				scene.camera.ctx2.strokeStyle = col;
				scene.camera.ctx2.lineWidth = 2;
				// Line
				scene.camera.ctx2.beginPath();
				scene.camera.ctx2.moveTo(obj_cord[0], obj_cord[1]);
				scene.camera.ctx2.lineTo(...scene.camera.crd2(obCoords[0], obCoords[1]));
				scene.camera.ctx2.stroke();
				// Circle
				scene.camera.ctx2.lineWidth = 0.5;
				scene.camera.ctx2.beginPath();
				scene.camera.ctx2.arc(...scene.camera.crd2(obCoords[0], obCoords[1]), size, 0, 7);
				scene.camera.ctx2.stroke();
				// Points
				scene.camera.ctx2.beginPath();
				scene.camera.ctx2.fillStyle = col;
				scene.camera.ctx2.arc(...scene.camera.crd2(obCoords[0], obCoords[1]), 3, 0, 7);
				scene.camera.ctx2.arc(obj_cord[0], obj_cord[1], 3, 0, 7);
				scene.camera.ctx2.fill();
				scene.camera.ctx2.beginPath();

				Object.assign(launchPowerLabel.style, {left: `calc(${mouse.x}px + 1em)`, top: `calc(${mouse.y}px - 1em)`, display: 'block', color: col});
				launchPowerLabel.innerHTML = Math.round(size/scene.camera.animZoom*1000)/1000;
			} else {
				if (!mouse.leftDown){
					launchPowerLabel.style.display = 'none';	
				}
			}		
		}
	}
	//Scene scale
	scene.camera.layersDiv.addEventListener('wheel', function(e){
		if (!e.ctrlKey && !mov_obj && !(mouse.leftDown && swch.allowObjCreating)){
			if (!mouse.middleDown){
				if (e.deltaY > 0){
					scene.camera.zoomOut();
				} else {
					scene.camera.zoomIn();
				}		
			}
		}
		// Change the launch force when mouse wheel spins
		if (mouse.leftDown && swch.allowObjCreating) {
			let launchForceChangeValue = 0.1;
			if (!mouse.middleDown){
				if (e.deltaY > 0){
					launchForce.state = launchForce.state > 0 ? launchForce.state - launchForceChangeValue : 0;
				} else {
					launchForce.state = launchForce.state < 2 ? launchForce.state + launchForceChangeValue : 2;
				}					
			}
		
		}
	});
	// Start moving object
	function movingObjectBegin(){
		// Перемещение ближайшео объекта
		if (mbut == 'move' && mov_obj === null){
			mov_obj = scene.objectSelect();
			if (scene.objArr[mov_obj]){
				scene.mpos[0] = scene.objArr[mov_obj].x; scene.mpos[1] = scene.objArr[mov_obj].y; //Координаты перемещяемого объекта
				scene.mpos[2] = scene.objArr[mov_obj].vx; scene.mpos[3] = scene.objArr[mov_obj].vy;	// Вектор перемещяемого объекта
				scene.objArr[mov_obj].vx = 0; scene.objArr[mov_obj].vy = 0;
			}
		}
	}
	// Moving object function
	function movingObject(){
		if (mouse.leftDown && mbut == 'move' && mov_obj !== null){ // Moving object
			let newX = (mouse.x - mouse.leftDownX)/scene.camera.animZoom + scene.mpos[0]; // New object X
			let newY = (mouse.y - mouse.leftDownY)/scene.camera.animZoom + scene.mpos[1]; // New object Y
			// Draw trace while user moving object
			if (scene.objArr[mov_obj]){
				if (tracesMode.state == 1){ // If traces mode == 1
					let dCanv = maxPerformance.state ? scene.camera.ctx : scene.camera.ctx3;
					dCanv.strokeStyle = scene.objArr[mov_obj].color;
					dCanv.fillStyle = scene.objArr[mov_obj].color;	
					dCanv.lineWidth = scene.camera.getScreenRad(scene.objArr[mov_obj].m)*2;
					// Line
					dCanv.beginPath();
					dCanv.lineCap = 'round';
					dCanv.moveTo(...scene.camera.crd2(scene.objArr[mov_obj].x, scene.objArr[mov_obj].y));
					// Set position to user's moving objec
					scene.objArr[mov_obj].x = newX; // New position X
					scene.objArr[mov_obj].y = newY; // New position Y

					dCanv.lineTo(...scene.camera.crd2(scene.objArr[mov_obj].x, scene.objArr[mov_obj].y));
					dCanv.stroke();
					dCanv.lineCap = 'butt';
				} else {
					scene.objArr[mov_obj].x = newX; // New position X
					scene.objArr[mov_obj].y = newY; // New position Y
				}
				scene.activCam.allowFrameRender = true;
			}
		}	
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
				case 120: showFPS.state = !showFPS.state; break; // (F9) Show FPS
				case 33: nextFrame = true; break; // Show one frame when paused
				case 32: // (Space) Create object
					if (swch.allowObjCreating){
						addFrameBeginTask(()=>{ 
							scene.addNewObject({
								x: mouse.x, y: mouse.y,
								ob_col: newObjColor.state,
								mass: newObjMass.state,
								objLck: newObjLock.state,
								main_obj: scene.objIdToOrbit
							});
							if (newObjRandColor.state) newObjColor.state = scene.randomColor();
						});		
					}
					if (mbut == 'delete' && scene.objArr.length){
						let delete_obj = scene.objectSelect(deletingMode.state);
						addFrameBeginTask( () => scene.deleteObject(delete_obj) );
					}
					break;
				case 107:  // (NumPad +) Zoom in
					scene.camera.zoomIn(2);
					break;
				case 109:  // (NumPad -) Zoom out
					scene.camera.zoomOut(2);
					break;
			}
			// (+) Simulation speed up withoud lost accuracity. Max limit is computer performance
			if (e.keyCode == 187 || e.keyCode == 61){
				simulationSpeed *= 2;
				console.log(simulationSpeed);
				document.querySelector('.time_speed h2').innerHTML = 'T - X'+timeSpeed.state*simulationSpeed;
			} else
			// (-) Simulation speed down withoud lost accuracity. Min value is realtime
			if (e.keyCode == 189 || e.keyCode == 173){
				if (simulationSpeed > 1){simulationSpeed /= 2;}
				console.log(simulationSpeed);
				document.querySelector('.time_speed h2').innerHTML = 'T - X'+timeSpeed.state*simulationSpeed;
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

	let noMenuBtns = ['timedown', 'play', 'pause', 'timeup'];
	// Menu buttons handler
	byClassElementsLoop('btn', (btnElement) => {
		btnElement.addEventListener('click', function(e){
			// console.log(e.target.closest('.btn').getAttribute('id'));
			pfb = mbut; // Prev clicked menu button
			let btn_elem = e.target.closest('.btn');
			mbut = btn_elem.getAttribute('id'); // Clicked menu
			let btn_id = mbut;
			// Menu buttons
			if (!noMenuBtns.includes(btn_id)){
				if (menu_state && btn_id == pfb){
					byClassElementsLoop(menu_names[mbut], (el) => { el.style.display = 'none' });
				}else{
					close_all_menus();
					byClassElementsLoop(menu_names[mbut], (el) => { el.style.display = 'inline-block' });
				}
				menu_state = !menu_state;
				change_state(mbut);
			} else { // Time controls
				// Change time speed
				if (mbut == 'timedown' || mbut == 'timeup'){
					timeSpeed.state *= mbut == 'timedown' ? 0.5 : 2;
				} else
				// Pause
				if (mbut == 'pause'){
					let img_name = pauseState ? 'pause' : 'play';
					if (pauseState){
						change_state('play');
						setTimeout(function(){change_state(pfb);}, 500);			
					} else {
						change_state('pause');	
					}
					pauseState = !pauseState;
					btn_elem.querySelector('img').setAttribute('src', 'ico/'+img_name+'.png');
				} else
				// Play
				if (mbut == 'play'){
					if (timeSpeed.state != 1 || pauseState){ // If time speed == 1 or pause == true
						simulationSpeed = 1;
						pauseState = false;
						timeSpeed.state = 1;
						document.querySelector('#pause img').setAttribute('src', 'ico/pause.png');
						change_state('restore');
						setTimeout(function(){change_state(pfb);}, 500);
					}
				}		
			}
			if (noMenuBtns.includes(mbut)) mbut = pfb;
			swch.allowObjCreating = mbut === 'create' && !swch.s_mainObj; // Allow object creating if menu is "Creation menu"
			if (showDistanceFromCursorToMainObj.state) scene.camera.clearLayer2();

			sessionStorage['mbut'] = mbut;
			sessionStorage['menu_state'] = menu_state;
		});
	});

	background_image.onerror = function(){
		this.src = 'background/background.jpg';
		let err_mess_el = document.getElementById('url_err_message');
		err_mess_el.style.opacity = '1';
		err_mess_el.style.maxHeight = '2em';
		setTimeout(function(){ err_mess_el.style.opacity = '0'; err_mess_el.style.maxHeight = '0';}, 2000);
	}

	// Get elements by class name iterator
	function byClassElementsLoop(className, callback){
		let elements = document.getElementsByClassName(className);
		for (let el = elements.length; el--;){
			callback(elements[el]);
		}
	}

	// Buttons events
	byClassElementsLoop('button', (buttonElement) => {
		buttonElement.addEventListener('mouseup', function(e){
			cbut = e.target.closest('.button').getAttribute('id');
			// console.log(cbut);
			switch (cbut) { // Pressed button id
				case 'select_track': // Visual select object to select camera target
					if (swch.s_track){
						swch.s_track = false;
					} else {
						swch.s_track = true;
					}
					break;
				case 'clear_camera_settings': // Restore camera defaults
					scene.camera.setTarget(); // Unset camera target
					scene.camera.x = 0; scene.camera.y = 0; // Set default camera position
					scene.camera.zoom = 1; // Set default camera zoom value
					zm_prev = 1;
					break;
				case 'select_edit_obj': // Visual select object to select edit object
					swch.s_edit = !swch.s_edit;			
					break;
				case 'reset_speed_btn': // Edit menu, set object velocity to 0
					if (scene.objArr[swch.edit_obj]){
						scene.objArr[swch.edit_obj].vx = 0;
						scene.objArr[swch.edit_obj].vy = 0;	
					}
					break;
				case 'select_main_obj': // Visual select object to select main object
					swch.allowObjCreating = swch.s_mainObj;
					swch.s_mainObj = !swch.s_mainObj;
					break;
				case 'wrap_time': // Wrap time
					timeSpeed.state = -timeSpeed.state;
					break;
				case 'save_file': // Save button
					pauseState = true;
					change_state('pause');
					let objArrWrite = JSON.parse(JSON.stringify(scene.objArr));
					for(let i in objArrWrite){
						objArrWrite[i].trace = [];
					}
					let my_data = {
						objArr: objArrWrite, 
						timeSpeed: timeSpeed.state, 
						interactMode: interactMode.state, 
						collisionMode: collisionMode.state,
						gravitationMode: gravitationMode.state,
						g: g.state,
					};
					my_data = JSON.stringify(my_data);
					writeFile("Orbit Simulator - "+lanwich.getTranslatedText("my_world")+".json", my_data);
					objArrWrite = null;
					//saveFile(name, forat, value, event);
					break;
				case 'sel_file_but': // Load button
					document.querySelector('#select_file').click();
					break;
				case 'clear_traces': // Clear traces
					scene.camera.clearLayer3();			
					for (let i in scene.objArr){
						scene.objArr[i].trace = [];
					}
					break;
			}
		});
	});
	// Close menu button handler
	document.querySelectorAll('.close_button').forEach(function(element){
		element.addEventListener('click', (event) => {
			close_all_menus();
			event.stopPropagation();
			sessionStorage['mbut'] = mbut;
			sessionStorage['menu_state'] = menu_state;
		})
	});

	// If texinput "input" event
	byClassElementsLoop('input_text', (inp) => {
		inp.addEventListener('focus', (event) => {
			anyTextInputHasFocus = true;
		});
		inp.addEventListener('blur', (event) => {
			anyTextInputHasFocus = false;
		});
	});

	let objDeletedMessageTimeout;

	function close_all_menus(e){
		for (let name in menu_names){
			document.querySelector('#'+menu_names[name]).style.display = 'none';
		}
		document.getElementById(pfb).removeAttribute('selected');
		document.getElementById(mbut).setAttribute('selected', '');
		menu_state = false;
	}
	document.getElementById(mbut).setAttribute('selected', '');
	
	function change_state(img, format = "png", path = "ico/"){
		if (img == 'world_settings'){ img = 'functionX'; }
		document.querySelector('.state').innerHTML = '<img src="'+path+img+'.'+format+'" alt="">';
	}

	function getRandomArbitrary(min, max) {
		return Math.random() * (max - min) + min;
	}

	function sumArray(arr){
		let sum = 0;
		for (let val of arr){ sum += val }
		return sum;
	}

	function powerFunc(F){
		if (F > 1){ return Math.round(Math.pow(F, Math.pow(F, 3))*100)/100 } else { return F }
	}

	// Toggle full screen
	document.getElementById('toggle_fullscreen').addEventListener('click', toggleFullScreen);
	function toggleFullScreen() {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen();
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			}
		}
	}
	function setFullScreenIcon() {
		let fullScreenBtn = document.getElementById("toggle_fullscreen");
		if (document.fullscreenElement) {
			fullScreenBtn.setAttribute('enabled', 'true');
		} else {
			if (document.exitFullscreen) {
				fullScreenBtn.setAttribute('enabled', 'false');
			}
		}
	}
	document.addEventListener('fullscreenchange', (e) => {
		if (!document.fullscreenElement) {
			e.target.setAttribute('enabled', 'true');
		} else {
			e.target.setAttribute('enabled', 'false');
		}
	});
	// Close\open options tabs handler
	document.querySelectorAll('.title_option_item').forEach((element) => {
		element.addEventListener('click', (e) => {
			let tab = e.target.closest('.title_option_item');
			tab.setAttribute('closed', (tab.getAttribute('closed') == 'true' ? 'false' : 'true'));
		});
	});
	// Language
	lanwich.onLanguageChange = function (language) {
		document.getElementById('language_selector').value = language;
		let loader = document.getElementById('language_loader'); // Loader element
		loader.style.opacity = 0;
		setTimeout( () => loader.style.display = 'none', 200);
	}
	document.getElementById('language_selector').addEventListener('change', function(event){
		let loader = document.getElementById('language_loader'); // Loader element
		loader.style.cssText = 'display: inline-block; opacity: 0;';
		setTimeout(()=> loader.style.opacity = 1, 16);
		lanwich.setLanguage(event.target.value);
	});
	// File select listener
	document.getElementById('select_file').addEventListener('change', function(e){
		let selectedFile = document.querySelector('#select_file').files[0];
		if (selectedFile !== undefined){
			readFile(selectedFile);
			this.value = '';
		}		
	});
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
				console.log('File loaded successfully!');
			  	scene.objArr = file_data.objArr;
			  	interactMode.state = file_data.interactMode || 0;
			  	gravitationMode.state = file_data.gravitationMode || 1;
			  	g.state = file_data.g ? file_data.g : 1;
			  	collisionMode.state = file_data.collisionMode || 0;
			  	timeSpeed.state = file_data.timeSpeed ? file_data.timeSpeed : 1;
			  	scene.show_obj_count();
			  	scene.activCam.allowFrameRender = true;
			  	scene.camera.clearLayer3();
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
};