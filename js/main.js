import Scene from '/js/Scene.js';
import Camera from '/js/Camera.js';
import UserInput from '/js/UserInput.js';
import IndicateFPS from '/js/IndicateFPS.js';
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

	// Tasks to frame begin
	this.frameTasks = new Array(); // Functions array
	function addFrameTask(func, ...args){
		frameTasks.push({func: func, args: args});
	}

	var mbut = 'create';
	var menu_state = true; // Menu state (Opened/Closed)
	if (sessionStorage['mbut'] && sessionStorage['menu_state']){
		mbut = sessionStorage['mbut'];
		menu_state = sessionStorage['menu_state'] == 'true' ? true : false;
	}
	//Buttons
	var cbut = '';
	var chck = '';
	var pfb = mbut;

	// === ...
	this.mov_obj = NaN; // Moving object id
	this.dis_zone = 5;
	this.frameTime = [0, Date.now()]; // Frametime
	let renderStopLatency; // Frames to render after render disabled

	//Camera
	var prev_cam_x = 0;
	var prev_cam_y = 0;
	var zm_prev = 1;
	var zm_cff = NaN;

	//Debug
	var ref_speed = 1;
	var maxFPS = false;

	// FPS indicator init
	this.fpsIndicator = new IndicateFPS();

	// Scene init
	this.scene = new Scene();
	scene.camera = new Camera(scene);
	scene.activCam = scene.camera;

	this.pauseState = false; // Global pause state

	var switcher = {device: 'desktop',
		sel_orb_obj: false,
		visT: false}; // Collisions: repulsion merge none

	this.swch = {s_track: true, t_object: false,
		s_edit: true, edit_obj: false};

	var menu_names = {create: 'menu_options', delete: 'del_menu_options', edit: 'edit_menu',
		help: 'help_menu', settings: 'settings_menu', camera: 'camera_menu', trajectory: 'traj_menu',
		world_settings: 'world_settings_men'}

	choise_restore('traj_mode', 'traj_mode2', 'radio');


	// MENU INPUTS \/ \/ \/
	// new UserInput({type: '', id: '', stateSaving: true}),

	// Create object menu ================================================
	let 
	newObjColor = new UserInput({type: 'color', id: 'newObjeColorSelect', stateSaving: true, initState: scene.randomColor()}), // Menu color select input
	newObjRandColor = new UserInput({type: 'checkbox', id: 'randColorCheck', stateSaving: true, initState: true}), // Menu new object random color input
	newObjMass = new UserInput({type: 'number', id: 'create_mass', stateSaving: true, initState: Math.round(getRandomArbitrary(0.5, 100)*10)/10}), // Menu new object's mass input
	newObjCircularOrbit = new UserInput({type: 'checkbox', id: 'circleOrbitCheck', stateSaving: true, initState: true, callback: (state)=>{
		circleOrbitCheckMenu.style.display = state ? 'initial' : 'none';
	}}), // Menu circle orbit on click input
	newObjCreateReverseOrbit = new UserInput({type: 'checkbox', id: 'objReverseCheck', stateSaving: true, initState: false}), // Menu reverse ordit direction input
	newObjLock = new UserInput({type: 'checkbox', id: 'objLckCeck', initState: false}), // Menu lock created object input
	pauseWhenCreatingObject = new UserInput({type: 'checkbox', id: 'new_obj_pause', stateSaving: true, initState: true, callback: (val, elem)=>{elem.prevPauseState = false}}), // Menu pause when user add object input
	launchForce = new UserInput({type: 'range', id: 'launch_power', stateSaving: true, callback: (val)=>{lnch_pwr_span.innerHTML = Math.round(powerFunc(val)*1000)/1000; mouse.move = true;}, eventName: 'input'}), // Menu launch power value input
	showDistanceFromCursorToMainObj = new UserInput({type: 'checkbox', id: 'vis_distance_check', stateSaving: true, callback: ()=>{ launchPowerLabel.style.display = 'none'; }}), // Menu visual distance
	//
	showNewObjTrajectory = new UserInput({type: 'checkbox', id: 'traj_prev_check', stateSaving: true, initState: true, callback: (val)=>{
		additionalTrajectoryMenu.style.display = val ? 'initial' : 'none'; // Show or hide additional menu
	}}), // Enable trajectory calculation before create object
	newObjTrajLength = new UserInput({type: 'range', id: 'traj_calc_samples', stateSaving: true}), // Trajectory calutulation length input
	newObjTrajAccuracity = new UserInput({type: 'range', id: 'traj_calc_accuracity', stateSaving: true }), // Trajectory accuracity input

	// Delete object menu =================================================
	deletingMode = new UserInput({type: 'radio', id: 'dellMethodRadio'}), // Deleting method

	// Edit object menu ===================================================

	// Trace settings =====================================================
	tracesMode = new UserInput({type: 'radio', id: 'traj_radio_buttons', stateSaving: true, initState: 1, callback: (val, elem) => {
		for (let element of traj_menu.getElementsByClassName('additionalOption')){
			if ( element.id.includes(val.toString()) && !element.hasAttribute('disabled')) { element.style.display = 'inline' } else { element.style.display = 'none' } // Show additional options by radio value
		}
		if (elem.prevLocalState != val){ // If state changed
			addFrameTask(()=>{
				scene.camera.clear('#000000');
				scene.camera.clear3();
				scene.objArrChanges = true;
			}); // Clear render layers
		}

	} }),
	// Mode 1
	traceMode1Opacity = new UserInput({type: 'range', id: 'trace_opacity', stateSaving: true, eventName: 'input', callback: (val)=>{scene.activCam.canv3.style.opacity = val} }),
	traceMode1Blur = new UserInput({type: 'range', id: 'trace_blur', stateSaving: true, eventName: 'input', callback: (val)=>{scene.activCam.canv3.style.filter = `blur(${val*val}px)`} }),
	// Mode 2
	traceMode2Particles = new UserInput({type: 'checkbox', id: 'trc2PrtclsChck', stateSaving: true}),
	traceMode2Trembling = new UserInput({type: 'checkbox', id: 'trc2TrembChck', stateSaving: true}),
	traceMode2Length = new UserInput({type: 'range', id: 'trace2Lnth', stateSaving: true}),
	// Mode 3 
	traceMode3Width = new UserInput({type: 'range', id: 'trace3WdInp', stateSaving: true, eventName: 'input'}),
	traceMode3Quality = new UserInput({type: 'range', id: 'trace3Qu', stateSaving: true}),
	traceMode3Length = new UserInput({type: 'range', id: 'trace3Lnth', stateSaving: true}),

	// Camera menu ========================================================
	zoomToCursor = new UserInput({type: 'checkbox', id: 'chck_zoomToScreenCenter', stateSaving: true, initState: true}), // Zoom to cursor as default. If enabled zoom, zooming to screen center

	// Physics menu =======================
	gravitationMode = new UserInput({type: 'radio', id: 'gravit_mode_radio_buttons', stateSaving: true}), // Select gravitation mode (radio)
	g = new UserInput({type: 'range', id: 'g_value', eventName: 'input', callback: (val)=>{g_value_title.innerHTML = powerFunc(val)}, initState: 1}), // Set gravitation (G) value
	interactMode = new UserInput({type: 'radio', id: 'interact_radio_buttons', stateSaving: true}), // Select interactions mode
	collisionMode = new UserInput({type: 'radio', id: 'collision_radio_buttons', stateSaving: true}), // Select collision mode

	// Settings menu ======================================================
	// Select background image
	backgroundImageURL = new UserInput({type: 'text', id: 'img_url_inp', stateSaving: true, callback: (value)=>{
		$('.bg_image').attr('src', value);
		if (value == ''){
			$('.bg_image').attr('src', 'background/background.jpg');
		}
	}, }),
	// Set background darkness
	backgroundDarkness = new UserInput({type: 'range', id: 'bg_darkness', stateSaving: true, eventName: 'input', callback: (state, elem)=>{
		if (tracesMode.state == 1){
			if (state == 0) { // If backgroundDarkness state value = 0 then copy imageData from canvas layer 3 to canvas layer 1 and hide canvas layer 3
				scene.camera.ctx.putImageData(scene.camera.ctx3.getImageData(0,0,scene.camera.canv0.width,scene.camera.canv0.height),0,0);
				scene.camera.ctx3.clearRect(0,0,scene.camera.canv0.width,scene.camera.canv0.height);
				scene.camera.canv3.style.display = background_image.style.display = 'none';
				traj_menu.children.additionalTrajectoryOptions1.setAttribute('disabled', '');
				scene.objArrChanges = true; // Render
				tracesMode.state = tracesMode.state; // Refresh trace mode menu
			} else if (!elem.prevLocalState) { // If backgroundDarkness previous state value = 0 then copy imageData from canvas layer 1 to canvas layer 3 and display canvas layer 3
				scene.camera.ctx3.putImageData(scene.camera.ctx.getImageData(0,0,scene.camera.canv0.width,scene.camera.canv0.height),0,0);
				scene.camera.ctx.clearRect(0,0,scene.camera.canv0.width,scene.camera.canv0.height);
				scene.camera.canv3.style.display = background_image.style.display = '';
				traj_menu.children.additionalTrajectoryOptions1.removeAttribute('disabled');
				scene.objArrChanges = true; // Render
				tracesMode.state = tracesMode.state; // Refresh trace mode menu
			}
		}
		background_image.style.opacity = state;
	}, }),
	backgroundFollowsMouse = new UserInput({type: 'checkbox', id: 'mouse_move_bg', stateSaving: true, initState: true}), // If true, background follows the cursor
	// Show FPS
	showFPS = new UserInput({type: 'checkbox', id: 'check_fps_swch', stateSaving: true, callback: (val)=>{
			if (val){ fpsIndicator.turnOn() }
			else { fpsIndicator.turnOff() }
	}, }),
	multitreadCompute = new UserInput({type: 'checkbox', id: 'multithread_comput', stateSaving: true, initState: true, callback: (val, input)=>{
		if (window.navigator.hardwareConcurrency < 2) {
			input.element.parentElement.style.display = 'none'; // Hide multithread option, if computer have only 1 thread
		}
	}})
	;

	// Fix background darkness
	{
		let state = backgroundDarkness.state;
		backgroundDarkness.state = 0;
		backgroundDarkness.state = state;
	}

	let timeSpeed = new UserInput({type: 'manualInput', initState: 1, callback: (val, inpVar)=>{
		document.querySelector('.time_speed h2').innerHTML = 'T - X'+val;
	}, eventName: 'input'}); // Time speed control

	//=================================================================================================================
	//=================================================================================================================

	Object.assign(scene, {
		// Settings
		showFPS: showFPS,
		backgroundDarkness: backgroundDarkness,
		zoomToCursor: zoomToCursor,
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

	radio_select('traj_radio', tracesMode.state);

	change_state(mbut);

	function radio_select(radio_id_prefix, numb){
		$('#'+radio_id_prefix+'_'+numb).click();	
	}
	function check_select(check_id, state){
		if (state == 'false' ||state == '0' ||state == 'off' ||state==''||state==NaN||state==undefined) {
			state = false;
		} else {
			state = true;
		}
		if (state){
			$('#'+check_id).attr('checked', '');
			document.getElementById(check_id).checked = true;
		} else {
			$('#'+check_id).removeAttr('checked');
			document.getElementById(check_id).checked = false;
		}
	}
	function choise_restore(name_session, var_name, cr){
		if (sessionStorage[name_session]){
			if (cr == 'checkbox'){
				switcher[var_name] = sessionStorage[name_session] != 'true' ? false : true;	
			}
			if (cr == 'radio'){
				switcher[var_name] = sessionStorage[name_session];
			}			
		}
	}
	function menu_open_restore(){
		if (menu_state){
			$('#'+menu_names[mbut]).css({display: 'inline-block'});
			$('#close_button').css({display: 'flex'});
		} else {
			$('#close_button').css({display: 'none'});
			$('#close_button').css({display: 'none'});
		}
	}
	menu_open_restore();


	//====time====
	this.timeWrap = false;
	//======

	//Mouse and touches
	let multiTouch = 0;
	let avTouchPoint = {x: NaN, y: NaN, xd: NaN, yd: NaN};
	let mscam = true;

	// Clear trace delay
	var clrDelay = false;
	var clrDTim = 75/((1+1/scene.camera.animationDuration)-1); // Time to clear, after camera move animation
	var clrTmt = setTimeout(function(){clrDelay = false}, clrDTim);

	window.onresize = function(){
		scene.camera.width = window.innerWidth;
		scene.camera.height = window.innerHeight;
		scene.camera.renderObjects();
		adaptive();
	}
	//Touch events ======================================
	$('.renderLayer').on('touchstart', function(event){
		event.preventDefault();
		prev_cam_x = scene.camera.x;
		prev_cam_y = scene.camera.y;
		$('#'+scene.activCam.canv2.id).trigger('mousedown', event);
	});

	$('.renderLayer').on('touchend', function(event){
		$('#'+scene.activCam.canv2.id).trigger('mouseup', event);
		zm_prev = scene.camera.animZoom;
	});

	$('.renderLayer').on('touchmove', function(event){
		event.preventDefault();
		mouse.move = true;
		// Touch point
		event.clientX = event.targetTouches[0].clientX;// Touch X
		event.clientY = event.targetTouches[0].clientY;// Touch Y
		[mouse.x, mouse.y] = [event.targetTouches[0].clientX, event.targetTouches[0].clientY]; // Set cursor position
		// Averrage point of touchs
		let av_touch_x = [];
		let av_touch_y = [];

		if (mouse.leftDown && mbut == 'move' && mov_obj){ // Moving object
			// Draw trace while user moving object
			if (scene.objArr[mov_obj]){
				let dcanv = backgroundDarkness.state != 0 ? ctx3 : ctx;
				dcanv.strokeStyle = scene.objArr[mov_obj].color;
				dcanv.fillStyle = scene.objArr[mov_obj].color;
				dcanv.lineWidth = Math.sqrt(scene.objArr[mov_obj].m)*2*scene.camera.animZoom < 0.5 ? 0.5 : Math.sqrt(scene.objArr[mov_obj].m)*2*scene.camera.animZoom;
				dcanv.beginPath();
				dcanv.arc(scene.camera.crd(scene.objArr[mov_obj].x, 'x'), scene.camera.crd(scene.objArr[mov_obj].y, 'y'), Math.sqrt(Math.abs(scene.objArr[mov_obj].m))*scene.camera.animZoom, 0, 7);
				dcanv.fill();
				// Line start
				dcanv.beginPath();
				dcanv.moveTo(scene.camera.crd(scene.objArr[mov_obj].x, 'x'), scene.camera.crd(scene.objArr[mov_obj].y, 'y'));
				// New position
				scene.objArr[mov_obj].x = scene.camera.x+(event.clientX-window.innerWidth/2)/scene.camera.animZoom;
				scene.objArr[mov_obj].y = scene.camera.y+(event.clientY-window.innerHeight/2)/scene.camera.animZoom;
				// Line end
				dcanv.lineTo(scene.camera.crd(scene.objArr[mov_obj].x, 'x'), scene.camera.crd(scene.objArr[mov_obj].y, 'y'));
				dcanv.stroke();
			}
		}
		if (event.changedTouches.length == 2){
			//All touch points array
			for (let i = 0; i < event.changedTouches.length; i++){
				av_touch_x.push(event.changedTouches[i].clientX);
				av_touch_y.push(event.changedTouches[i].clientY);
			} 
			// Averrage point of touchs
			avTouchPoint.x = sumArray(av_touch_x)/av_touch_x.length;
			avTouchPoint.y = sumArray(av_touch_y)/av_touch_x.length;
			 // Distance between touchs
			let touchZoom = rad(event.changedTouches[0].clientX, event.changedTouches[0].clientY, event.changedTouches[1].clientX, event.changedTouches[1].clientY);
			 // Clear launch power label display
			launchPowerLabel.style.display = 'none';

			if (mbut == 'create' && mouse.leftDown){
				if (pauseWhenCreatingObject.state){
					pauseState = pauseWhenCreatingObject.prevPauseState;
				}
				scene.camera.clear2();
			}

			mouse.leftDown = false;
			mscam = false;
			// Mouse down
			if (!avTouchPoint.xd){
				avTouchPoint.xd = avTouchPoint.x;
				avTouchPoint.yd = avTouchPoint.y;
				zm_cff = touchZoom;
			}

			clrDelay = true;
			clearTimeout(clrTmt);
			clrTmt = setTimeout(function(){clrDelay = false;}, clrDTim);

			scene.camera.zoom = scene.camera.animZoom = zm_prev / Math.pow(Math.sqrt(zm_cff) / Math.sqrt(touchZoom), 2); // Zoom
			if (zoomToCursor.state){ // If no zoom to center
				scene.camera.ax = scene.camera.x = prev_cam_x - (avTouchPoint.x - avTouchPoint.xd)/scene.camera.animZoom + (((window.innerWidth/2 - avTouchPoint.xd)/zm_prev)*Math.pow(Math.sqrt(zm_cff) / Math.sqrt(touchZoom), 2) - ((window.innerWidth/2 - avTouchPoint.xd)/zm_prev));
				scene.camera.ay = scene.camera.y = prev_cam_y - (avTouchPoint.y - avTouchPoint.yd)/scene.camera.animZoom + (((window.innerHeight/2 - avTouchPoint.yd)/zm_prev)*Math.pow(Math.sqrt(zm_cff) / Math.sqrt(touchZoom), 2) - ((window.innerHeight/2 - avTouchPoint.yd)/zm_prev));
			} else { // If zoom to center
			}
			swch.t_object = false; // Track object disable
		}
	})
	//Mouse events =========================================================
	$('.renderLayer').mousedown(function(event, touch){
		if (touch){
			[mouse.leftDownX, mouse.leftDownY] = [touch.targetTouches[0].clientX, touch.targetTouches[0].clientY];
			multiTouch ++;
			event.clientX = touch.targetTouches[0].clientX;
			event.clientY = touch.targetTouches[0].clientY;
			console.log('touchstart');
		} else {
			[mouse.leftDownX, mouse.leftDownY] = [event.clientX, event.clientY];
		}

		scene.mpos[0] = event.clientX; scene.mpos[1] = event.clientY;
		if (event.which == 1 || touch){
			mouse.leftDown = true;
			mouse.leftDown = true;

			if (mbut == 'create'){
				try{clearTimeout(mort)}catch(err){};
				// If pause when creating object enabled
				if (touch){
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
			//Перемещение ближайшео объекта
			if (mbut == 'move'){
				mov_obj = scene.objectSelect();
			}

			if (scene.objArr[mov_obj]){
				scene.mpos[2] = scene.objArr[mov_obj].x; scene.mpos[3] = scene.objArr[mov_obj].y; //Координаты перемещяемого объекта
				scene.mpos[4] = scene.objArr[mov_obj].vx; scene.mpos[5] = scene.objArr[mov_obj].vy;	// Вектор перемещяемого объекта
				scene.objArr[mov_obj].vx = 0; scene.objArr[mov_obj].vy = 0;
			}
			//Выбор объекта для редактирования
			if (mbut == 'edit' && swch.s_edit){
				swch.edit_obj = scene.objectSelect();
				swch.s_edit = false;
				if (scene.objArr[swch.edit_obj]){
					document.getElementById('col_edit').value = scene.objArr[swch.edit_obj].color;
					document.getElementById('mass_edit').value = scene.objArr[swch.edit_obj].m;
					document.getElementById('check_edit_lck').checked = scene.objArr[swch.edit_obj].lck;
				}
			}
		}
		if (event.which == 2){
			mouse.middleDown = true;
			scene.mpos[0] = event.clientX; scene.mpos[1] = event.clientY;

			scene.camera.Target = false;
			scene.camera.animation = true;
		}
		if (event.which == 3){
			mouse.rightDown = true;
			if (mbut == 'create' && mouse.leftDown){
				launchPowerLabel.style.display = 'none';
				scene.camera.clear2();		
			}
		}
	});

	$('.renderLayer').mouseup(function(event, touch){
		if (touch){
			console.log('touchend');
			event.clientX = mouse.x;
			event.clientY = mouse.y;
		}
		avTouchPoint.xd = avTouchPoint.yd = NaN;
		if (event.which == 1 || touch){
			mouse.leftDown = false;
			[mouse.leftUpX, mouse.leftUpY] = [event.clientX, event.clientY] // Set cursor mouseUp position
			launchPowerLabel.style.display = 'none';
			if (mbut == 'delete' && scene.objArr.length){
				addFrameTask( () => scene.deleteObject(scene.objectSelect(deletingMode.state)) );
				deleted();
			}
			if (mbut == 'move' && scene.objArr[mov_obj]){
				scene.objArr[mov_obj].vx = scene.mpos[4];
				scene.objArr[mov_obj].vy = scene.mpos[5];
				mov_obj = NaN;
			}

			if (mbut == 'create' && mscam && !mouse.rightDown){
				addFrameTask(()=>{
					scene.addNewObject({
						ob_col: newObjColor.state,
						mass: newObjMass.state,
						objLck: newObjLock.state,
						main_obj: scene.objIdToOrbit
					});
					if (newObjRandColor.state) newObjColor.state = scene.randomColor();
				});
				scene.camera.ctx.beginPath();
				scene.camera.ctx.fillStyle = newObjColor.state;
				scene.camera.ctx.arc(scene.mpos[0], scene.mpos[1], Math.sqrt(Math.abs(newObjMass.state))*scene.camera.animZoom, 0, 7);
				scene.camera.ctx.fill();
			}
			if (mbut == 'create'){
				var mort = setTimeout(menu_open_restore, 200);
				if (pauseWhenCreatingObject.state){
					pauseState = pauseWhenCreatingObject.prevPauseState;
				}
				scene.camera.clear2();
			}
			if (mbut == 'camera' && swch.s_track){
				scene.camera.Target = scene.objectSelect('nearest', scene.camera.Target);
				scene.camera.switchTarget = true;
				scene.camera.animation = true;
				setTimeout(()=>{scene.camera.animation = false; scene.camera.switchTarget = false;}, 400);
				scene.camera.clear('#000000');
				clrDelay = true;
				clearTimeout(clrTmt);
				clrTmt = setTimeout(function(){clrDelay = false;}, clrDTim);
			}
			if (mbut == 'sel_orb_obj'){
				scene.objIdToOrbit = scene.objectSelect();
				switcher.sel_orb_obj = false;
				mbut = 'create';
			}
		};
		if (event.which == 2 || !mscam){
			mouse.middleDown = false;
			menu_open_restore();
		}
		if (touch){
			multiTouch --;
			mscam = multiTouch != 0 ? false : true;
		}
		if (event.which == 3){
			mouse.rightDown = false;
			if (mouse.leftDown){
				launchPowerLabel.style.display = 'block';
				launchPowerLabel.innerHTML = '0';
			}
		}
	});	

	document.onmousemove = function(event){
		mouse.move = true;
		if (backgroundFollowsMouse.state && backgroundDarkness.state){
			$('.bg_image').css({top: -event.clientY/25, left: -event.clientX/25})	
		}
		// Moving object while mouse moves
		if (mouse.leftDown && mbut == 'move' && mov_obj){
			if (scene.objArr[mov_obj]){
				let dCanv = backgroundDarkness.state != 0 ? scene.camera.ctx3 : scene.camera.ctx;
				dCanv.strokeStyle = scene.objArr[mov_obj].color;
				dCanv.fillStyle = scene.objArr[mov_obj].color;
				dCanv.lineWidth = Math.sqrt(scene.objArr[mov_obj].m)*2*scene.camera.animZoom < 0.5 ? 0.5 : Math.sqrt(scene.objArr[mov_obj].m)*2*scene.camera.animZoom;
				dCanv.beginPath();
				dCanv.arc(scene.camera.crd(scene.objArr[mov_obj].x, 'x'), scene.camera.crd(scene.objArr[mov_obj].y, 'y'), Math.sqrt(Math.abs(scene.objArr[mov_obj].m))*scene.camera.animZoom, 0, 7);
				dCanv.fill();
				dCanv.beginPath();
				dCanv.moveTo(scene.camera.crd(scene.objArr[mov_obj].x, 'x'), scene.camera.crd(scene.objArr[mov_obj].y, 'y'));

				scene.objArr[mov_obj].x = (event.clientX - scene.mpos[0])/scene.camera.animZoom + scene.mpos[2]; // New position X
				scene.objArr[mov_obj].y = (event.clientY - scene.mpos[1])/scene.camera.animZoom + scene.mpos[3]; // New position Y

				dCanv.lineTo(scene.camera.crd(scene.objArr[mov_obj].x, 'x'), scene.camera.crd(scene.objArr[mov_obj].y, 'y'));
				dCanv.stroke();
				scene.objArrChanges = true;
			}
		}
		if (mouse.middleDown){
			clrDelay = true;
			clearTimeout(clrTmt);
			clrTmt = setTimeout(function(){clrDelay = false;}, clrDTim);
			scene.camera.x += (mouse.x - event.clientX)/scene.camera.animZoom;
			scene.camera.y += (mouse.y - event.clientY)/scene.camera.animZoom;
			let mstate = menu_state;
			close_all_menus(); menu_state = mstate;
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
	};
	$('*').bind('contextmenu', function(e) {
		return false;
	});
	//End mouse events ============
	$('input').on('input change', function(e){
		//alert($(this).attr('id'));
		chck = $(this).attr('id');
		let inp_name = $(this).attr('name');
		let eti = e.type == 'input'; // If input type = Input
		let etch = e.type == 'change'; // If input type = Change

		if (chck == 'check_edit_lck' && scene.objArr[swch.edit_obj]){
			if (document.getElementById(chck).checked){
				scene.objArr[swch.edit_obj].lck = true;
			} else {
				scene.objArr[swch.edit_obj].lck = false;
			}
			if (swch.edit_obj == 0){ // ID of main object
				sessionStorage['sun_lck'] = scene.objArr[swch.edit_obj].lck;
			}
		} else
		if (chck == 'mass_edit' && scene.objArr[swch.edit_obj]){		
			scene.objArr[swch.edit_obj].m = +document.getElementById(chck).value;
		} else
		if (chck == 'col_edit' && scene.objArr[swch.edit_obj]){
			scene.objArr[swch.edit_obj].color = document.getElementById(chck).value;
		} else
		if (chck == 'select_file'){
			var selectedFile = $('#select_file')[0].files[0];
			if (selectedFile !== undefined){
				readFile(document.getElementById('select_file'));
			}
		}
		/*
		 else
		if (chck == ''){
			
		}
		*/
	});

	if (maxFPS !== false){
		setInterval(frame, 1000/maxFPS);
	} else {
		// window.requestAnimationFrame(frame);
		// scene.frame = frame;
		frameControl();
	}

	function frameControl(){
		window.requestAnimationFrame(frameControl);
		if ( !scene.workersJobDone ) {
			frame();
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

		if (!scene.objArr[scene.objIdToOrbit]){
			scene.objIdToOrbit = scene.objectSelect('biggest');		
		}

		// Clear delay
		if (clrDelay){ scene.camera.clear(1) }

		// Set move cursor style
		if (mouse.middleDown || mbut == 'move'){scene.camera.layersDiv.style.cursor = "move";}else{scene.camera.layersDiv.style.cursor = "default";};

		if (scene.objArr.length){
			if (!pauseState){
				if (window.Worker && window.navigator.hardwareConcurrency > 1 && multitreadCompute.state){
					scene.physicsMultiThreadCalculate();
				} else {
					scene.physicsCalculate(); // Scene physics calculations (1 step)
				}
			}
			fpsIndicator.measure();

			if (scene.objArr[scene.camera.Target]){
				scene.camera.x = scene.objArr[scene.camera.Target].x;
				scene.camera.y = scene.objArr[scene.camera.Target].y;
			} else { scene.camera.Target = false }
		}

		if (scene.objArrChanges || clrDelay){
			scene.camera.renderObjects(scene.world);
			renderStopLatency = 125; // Count of frames to render after render is disabled
		} else {
			// If traces mode is 1 render ${renderStopLatency} frames after render disabled
			if (renderStopLatency && tracesMode.state == 1 && !pauseState){
				renderStopLatency --;
				scene.camera.renderObjects(scene.world);
			}
		}

		if (scene.camera.canv2.visualSelect){
			scene.camera.clear2();
			delete scene.camera.canv2.visualSelect;
		}

		if (mbut == 'delete'){
			scene.camera.visualObjectSelect(deletingMode.state, '#ff0000');
		} else
		if (mbut == 'camera' && swch.s_track){
			scene.camera.visualObjectSelect('nearest', '#0af', scene.objectSelect('nearest', scene.camera.Target));
		} else
		if (mbut == 'move'){
			scene.camera.visualObjectSelect('nearest', '#bbb', mov_obj);
		} else
		if (mbut == 'edit' && swch.s_edit){
			scene.camera.visualObjectSelect('nearest', '#11f', mov_obj);
		} else
		if (mbut == 'sel_orb_obj' && switcher.sel_orb_obj){
			scene.camera.visualObjectSelect('nearest', '#bf0', mov_obj);
		}
		// Show distance
		if ((mbut == 'create') && (!mouse.leftDown || (multiTouch > 0 && mbut != 'create')) && showDistanceFromCursorToMainObj.state){
			vis_distance([mouse.x, mouse.y], '#888888');
		}
		// Hide launch power label
		if (mbut != 'create'){
			launchPowerLabel.style.display = 'none';
		}
		// New object trajectory
		if (mbut == 'create' 
			&& mouse.leftDown 
			&& !mouse.rightDown 
			&& (mouse.move || (!pauseWhenCreatingObject.state && scene.objArrChanges)
			)
			){
			if (!(Math.abs(mouse.leftDownX-mouse.x) <= dis_zone && Math.abs(mouse.leftDownY-mouse.y) <= dis_zone)){
				scene.camera.visual_trajectory();
				if (showNewObjTrajectory.state){
					scene.camera.trajectoryCalculate(newObjTrajLength.state, newObjTrajAccuracity.state); // Trajectory calculation
				}
			}
		}

		scene.objArrChanges = false;
		mouse.move = false;
		return true;
	}
	//scene.frame();
	this.addObjects = function(count = 100){
		for (let i = 0; i < count; i++){
		  	addFrameTask(()=>{ 
				scene.addNewObject({
		  	 		x: scene.camera.width * Math.random(), y: scene.camera.height *Math.random(),
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

	//Визуальная дистанция до главного объекта
	function vis_distance(obj_cord, col = '#888888', targ_obj = scene.objIdToOrbit){
		if (scene.objArr[targ_obj]){
			let obCoords = scene.objArr[swch.t_object] ? [scene.objArr[targ_obj].x - scene.objArr[targ_obj].vx, scene.objArr[targ_obj].y - scene.objArr[targ_obj].vy] : [scene.objArr[targ_obj].x, scene.objArr[targ_obj].y];
			let size = rad(obj_cord[0], obj_cord[1], scene.camera.crd(obCoords[0], 'x'), scene.camera.crd(obCoords[1], 'y'));
			if (size > Math.sqrt(Math.abs(scene.objArr[targ_obj].m))*scene.camera.animZoom){
				scene.camera.ctx2.strokeStyle = col;
				scene.camera.ctx2.lineWidth = 2;
				// Line
				scene.camera.ctx2.beginPath();
				scene.camera.ctx2.moveTo(obj_cord[0], obj_cord[1]);
				scene.camera.ctx2.lineTo(scene.camera.crd(obCoords[0], 'x'), scene.camera.crd(obCoords[1], 'y'));
				scene.camera.ctx2.stroke();
				// Circle
				scene.camera.ctx2.lineWidth = 0.5;
				scene.camera.ctx2.beginPath();
				scene.camera.ctx2.arc(scene.camera.crd(obCoords[0], 'x'), scene.camera.crd(obCoords[1], 'y'), size, 0, 7);
				scene.camera.ctx2.stroke();
				// Points
				scene.camera.ctx2.beginPath();
				scene.camera.ctx2.fillStyle = col;
				scene.camera.ctx2.arc(scene.camera.crd(obCoords[0], 'x'), scene.camera.crd(obCoords[1], 'y'), 3, 0, 7);
				scene.camera.ctx2.arc(obj_cord[0], obj_cord[1], 3, 0, 7);
				scene.camera.ctx2.fill();
				scene.camera.ctx2.beginPath();

				Object.assign(launchPowerLabel.style, {left: (mouse.x-10)+'px', top: (mouse.y-30)+'px', display: 'block', color: col});
				launchPowerLabel.innerHTML = Math.round(size/scene.camera.animZoom*1000)/1000;
			} else {
				if (!mouse.leftDown){
					launchPowerLabel.style.display = 'none';	
				}
			}		
		} else {
			$('.power').css({display: 'none'});
		}
	}
	//Scene scale
	scene.camera.layersDiv.addEventListener('wheel', function(e){
		if (!e.ctrlKey && !mov_obj && !(mouse.leftDown && mbut == 'create')){
			clrDelay = true;
			clearTimeout(clrTmt);
			clrTmt = setTimeout(function(){clrDelay = false;}, clrDTim);
			if (!mouse.middleDown){
				if (e.deltaY > 0){
					scene.camera.zoomOut();
				} else {
					scene.camera.zoomIn();
				}		
			}
		}
		// Change the launch force when mouse wheel spins
		if (mouse.leftDown && mbut == 'create') {
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
	//События клавиатуры
	document.addEventListener('keydown', function(e){
		//console.log(e.keyCode);
		if (!e.ctrlKey && !document.getElementById('img_url_inp').hasfocus){
			switch (e.keyCode){
				case 67:  $('#create').mousedown(); break; // (C) Create new object menu
				case 68:  $('#delete').mousedown(); break; // (D) Delete object menu
				case 69:  $('#edit').mousedown(); break; // (E) Edit object menu
				case 84:  $('#trajectory').mousedown(); break; // (T) Trajectory menu
				case 188: $('#timedown').mousedown(); break; // (<) Time speed down
				case 191: $('#play').mousedown(); break; // (/) Play button
				case 190: $('#timeup').mousedown(); break; // (>) Time speed up
				case 77:  $('#move').mousedown(); break; // (M) Move object
				case 80:  $('#pause').mousedown(); break; // (P) Pause button
				case 72:  $('#help').mousedown(); break; // (H) Help menu
				case 83:  $('#settings').mousedown(); break; // (S) Settings menu
				case 86:  $('#camera').mousedown(); break; // (V) Camera menu
				case 70:  $('#world_settings').mousedown(); break; // (F) World physics settings
				case 120: showFPS.state = !showFPS.state; break; // (F9) Show FPS
				case 32: // (Space) Create object
					if (mbut == 'create' && mouse.x){
						addFrameTask(()=>{ 
							scene.addNewObject({
								x: mouse.x, y: mouse.y,
								ob_col: newObjColor.state,
								mass: newObjMass.state,
								objLck: newObjLock.state,
								main_obj: scene.objIdToOrbit
							});
							if (newObjRandColor.state) newObjColor.state = scene.randomColor();
						});
						let obj_rad = Math.sqrt(Math.abs(newObjMass.state))*scene.camera.animZoom;
						obj_rad = obj_rad < 0.5 ? 0.5 : obj_rad;
						scene.camera.ctx.beginPath();
						scene.camera.ctx.fillStyle = newObjColor.state;
						scene.camera.ctx.arc(mouse.x, mouse.y, obj_rad, 0, 7);
						scene.camera.ctx.fill();		
					}
					if (mbut == 'delete' && scene.objArr.length){
						//$('.renderLayer').mousedown();
						//$('.renderLayer').mouseup();
						let delete_obj = scene.objectSelect(switcher.del_radio);
						scene.camera.ctx.beginPath();
						scene.camera.ctx.fillStyle = '#000';
						scene.camera.ctx.arc(scene.objArr[delete_obj].x, scene.objArr[delete_obj].y, Math.sqrt(Math.abs(scene.objArr[delete_obj].m))+1, 0, 7);
						scene.camera.ctx.fill();
						addFrameTask( () => scene.deleteObject(delete_obj) );
						deleted();
					}
					break;
				case 107:  // (NumPad +) Zoom in
					clrDelay = true;
					clearTimeout(clrTmt);
					clrTmt = setTimeout(function(){clrDelay = false}, clrDTim);
					scene.camera.zoomIn(2);
					break;
				case 109:  // (NumPad -) Zoom out
					clrDelay = true;
					clearTimeout(clrTmt);
					clrTmt = setTimeout(function(){clrDelay = false}, clrDTim);
					scene.camera.zoomOut(2);
					break;
			}
			// (+) Simulation speed up withoud lost accuracity. Max limit is computer performance
			if (e.keyCode == 187 || e.keyCode == 61){
				ref_speed *= 2;
				console.log(ref_speed);
				$('.time_speed h2').html('T - X'+timeSpeed.state*ref_speed);
			} else
			// (-) Simulation speed down withoud lost accuracity. Min value is realtime
			if (e.keyCode == 189 || e.keyCode == 173){
				if (ref_speed > 1){ref_speed /= 2;}
				console.log(ref_speed);
				$('.time_speed h2').html('T - X'+timeSpeed.state*ref_speed);
			}
		}
		//Ctrl keys
		// (Ctrl+Z) Delete last created object
		if (e.keyCode == 90 && e.ctrlKey) addFrameTask( () => scene.deleteObject( scene.objectSelect('last_created') ) );
		
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

	let noMenuBtns = ['clear', 'timedown', 'play', 'pause', 'timeup'];

	$('.btn').mousedown(function(){
		//alert($(this).attr('id'));
		pfb = mbut;
		mbut = $(this).attr('id');
		let btn_id = mbut;
		if (mbut == 'clear'){
			scene.camera.clear('#000');
			for (let i in scene.objArr){
				scene.objArr[i].trace = [];
			}
		} else
		if (mbut == 'create'){
			if (menu_state && btn_id == pfb){
				$('.menu_options').css('display', 'none');
				menu_state = false;
			}else{
				close_all_menus();
				menu_state = true;
				$('.menu_options').fadeIn(0);
			}
			change_state('create');
		}
		if (mbut == 'edit'){
			if (menu_state && btn_id == pfb){
				$('.edit_menu').css('display', 'none');
				menu_state = false;
			}else{
				close_all_menus();
				menu_state = true;
				$('.edit_menu').fadeIn(0);
			}
			change_state('edit');
		}
		if (mbut == 'trajectory'){
			if (menu_state && btn_id == pfb){
				$('.traj_menu').css('display', 'none');
				menu_state = false;
			}else{
				close_all_menus();
				menu_state = true;	
				$('.traj_menu').fadeIn(0);
			}
			change_state('trajectory');
		}
		if (mbut == 'camera'){
			if (menu_state && btn_id == pfb){
				$('.camera_menu').css('display', 'none');
				menu_state = false;
			}else{
				close_all_menus();
				menu_state = true;
				$('.camera_menu').fadeIn(0);
			}
			change_state('camera');
		}
		if (mbut == 'timedown'){
			timeSpeed.state /= 2;
		} else
		if (mbut == 'pause'){
			let img_name;
			if (pauseState){
				img_name = 'pause';
				change_state('play');
				let change_state_play = setTimeout(function(){change_state(pfb);}, 1000);			
			} else {
				img_name = 'play';
				change_state('pause');	
				try{clearTimeout(change_state_play)}catch(err){};
			}
			pauseState = !pauseState;
			$('img',this).attr('src', 'ico/'+img_name+'.png');
			//$('.time_speed h2').html('T - X0');
		} else
		if (mbut == 'play'){
			ref_speed = 1;
			pauseState = false;
			timeSpeed.state = 1;
			$('#pause img').attr('src', 'ico/pause.png');
			change_state('restore');
			try{clearTimeout(change_state_play);}catch(err){};
			let change_state_play = setTimeout(function(){change_state(pfb);}, 1000);
		} else
		if (mbut == 'timeup'){
			timeSpeed.state *= 2;
		} else
		if (mbut == 'delete'){
			change_state('delete');
			
			if (menu_state && btn_id == pfb){
				$('.del_menu_options').css('display', 'none');
				menu_state = false;
			}else{
				close_all_menus();
				$('.del_menu_options').fadeIn(0); 				
				menu_state = true;
			}
		}
		if (mbut == 'move'){
			close_all_menus();
			change_state('move');
		}else
		if (mbut == 'help'){
			if (menu_state && btn_id == pfb){
				$('.help_menu').css('display', 'none');
				menu_state = false;
			}else{
				close_all_menus();
				menu_state = true;
				$('.help_menu').fadeIn(0);
			}
			change_state('help');
		} else
		if (mbut == 'settings'){
			if (menu_state && btn_id == pfb){
				$('.settings').css('display', 'none');
				menu_state = false;	
			} else {
				close_all_menus();
				$('.settings').fadeIn(0);
				menu_state = true;
			}
			change_state('settings');
		} else
		if (mbut == 'world_settings'){
			if (menu_state && btn_id == pfb){
				$('.world_settings_menu').css('display', 'none');
				menu_state = false;	
			} else {
				close_all_menus();
				$('.world_settings_menu').fadeIn(0);
				menu_state = true;
			}
			change_state('functionX');
		}
		if (noMenuBtns.includes(mbut)){
			mbut = pfb;
		}
		
		$('#'+pfb).css({'background': ''});
		$('#'+mbut).css({'background-color': 'rgba(255,255,255,0.15)'});
		if (menu_state){
			$('#'+mbut).css({'background-color': 'rgba(255,255,255,0.35)'});
			$('#close_button').css({display: 'flex'});
		} else {
			$('#close_button').css({display: 'none'});
		}
		sessionStorage['mbut'] = mbut;
		sessionStorage['menu_state'] = menu_state;
	});
	if (menu_state){
		$('#'+mbut).css({background: 'rgba(255,255,255,0.35)'});
	} else {
		$('#'+mbut).css({background: 'rgba(255,255,255,0.15)'});
	}

	background_image.onerror = function(){
		this.src = 'background/background.jpg';
		 $('#url_err_message').slideDown()
		setTimeout(function(){ $('#url_err_message').slideUp() }, 2000);
	}

	$('.button').mouseup(function(){
		cbut = $(this).attr('id');
		//alert(cbut);
		if (cbut == 'select_track'){
			if (swch.s_track){
				swch.s_track = false;
			} else {
				swch.s_track = true;
			}		
		}
		if (cbut == 'clear_camera_settings'){
			clrDelay = true;
			clearTimeout(clrTmt);
			clrTmt = setTimeout(function(){clrDelay = false}, clrDTim);
			swch.t_object = false;
			scene.camera.Target = false;
			scene.camera.x = 0; scene.camera.y = 0;
			scene.camera.animation = true;
			scene.camera.zoom = 1;
			zm_prev = scene.camera.zoom;
		}
		if (cbut == 'select_edit_obj'){
			if (swch.s_edit){
				swch.s_edit = false;
			} else {
				swch.s_edit = true;
			}				
		}
		if (cbut == 'reset_speed_btn' && scene.objArr[swch.edit_obj]){
			scene.objArr[swch.edit_obj].vx = 0;
			scene.objArr[swch.edit_obj].vy = 0;
		}
		if (cbut == 'select_main_obj'){
			switcher.sel_orb_obj = switcher.sel_orb_obj?false:true;
			mbut = switcher.sel_orb_obj?'sel_orb_obj':'create';
		}
		if (cbut == 'wrap_time'){
			timeWrap = true;
		}
		if (cbut == 'save_file'){
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
			writeFile("Orbit Simulator - Мой мир.osw", my_data);
			objArrWrite = null;
			//saveFile(name, forat, value, event);
		}
		if (cbut == 'sel_file_but'){
			$('#select_file').click();
		}

	});
	$('.close_button').mouseup(function(){
		$(this).css({display: 'none'});
		close_all_menus();
		sessionStorage['mbut'] = mbut;
		sessionStorage['menu_state'] = menu_state;
	});

	$('.input_text').focus(function(){
		this.hasfocus = true;
	});
	$('.input_text').blur(function(){
		this.hasfocus = false;
	});

	let no_del_anim = false;
	var mytimeout;
	function deleted(){
		if (!no_del_anim){
			$('.deleted').css({display: 'block'});
			$('.deleted').animate({right: 10}, 500);
			clearTimeout(mytimeout);				
		}
		mytimeout = setTimeout(function(){
			no_del_anim = true;
			$('.deleted').animate({right: -300}, 500, function(){
				$('.deleted').css({display: 'none'});
				no_del_anim = false;
			});
		}, 2000);
	}

	function close_all_menus(e){
		for (let name in menu_names){
			$('#'+menu_names[name]).css('display', 'none');
		}
		$('#'+mbut).css({background: '#fff2'});
		$('#close_button').css({display: 'none'});
		menu_state = false;
	}
	function change_state(img, format = "png", path = "ico/"){
		if (img == 'world_settings'){ img = 'functionX'; }
		$('.state').html('<img src="'+path+img+'.'+format+'" alt="">');
	}

	function getRandomArbitrary(min, max) {
		return Math.random() * (max - min) + min;
	}

	function sumArray(arr){
		let val = 0;
		for (let i in arr){val += arr[i];}
		return val;
	}

	function rad(x1, y1, x2, y2){ return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2)) }

	function powerFunc(F){
		if (F > 1){ return Math.round(Math.pow(F, Math.pow(F, 3))*100)/100 } else { return F }
	}
	//=====================================================

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

	adaptive();
	function adaptive(){
		if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
			switcher.device = 'mobile';
			dis_zone = 20;
			if (window.innerHeight > window.innerWidth){
				$('.time_panel').css({border: 'none', borderTop: '6px solid #fff7', borderBottom: '6px solid #fff7', borderRadius: '20px'});
				$('body').css({'font-size': 40});
				$('.btn').css({'height': 100, 'width': 130});
				$('.btn img').css({'max-width': 65, 'max-height': 65});
				$('.menu_pos').css({top: 0, left: 139});
				$('.menu').css({'flex-direction': 'column'});
				$('.time_speed').css({left: 10, bottom: 80, right: 'initial', top: 'initial'});
				$('.checkbox').css({width: 75, height: 75});
				$('.radius_select').css({'font-size': 50, width: 200, 'border-radius': 10});
				$('#col_select').css({width: 200, height: 60, 'border-radius': 10});
				$('.menu_pos_size').css({maxHeight: '80vh'});
			} else {
				$('.time_panel').css({border: 'none', borderLeft: '3px solid #fff7', borderRight: '3px solid #fff7', borderRadius: '10px'});
				$('body').css({fontSize: '2vmax'});
				$('.btn').css({'height': 50, 'width': 50});
				$('.btn img').css({'max-width': '65%', 'max-height': '65%'});
				$('.menu_pos').css({top: 54 , left: 0});
				$('.menu').css({'flex-direction': 'row'});
				$('.time_speed').css({right: 10, top: 130, left: 'initial', bottom: 'initial'});
				$('.checkbox').css({width: 20, height: 20});
				$('.radius_select').css({'font-size': 50, width: 200, 'border-radius': 10});
				$('#col_select').css({width: '20vmin', height: '7vmin', 'border-radius': 10});
				$('.menu_pos_size').css({maxHeight: '70vh'});
			}
			$('.input_num').css({width: '20vmin'});
			$('#launchPowerLabel').css({fontSize: '5vmin'})
			$('.close_button').css({width: '5vmin', height: '5vmin', padding: '0 0 0.5vh 0', fontSize: '5vmin'});
		} else {
			switcher.device = 'desktop';
			if (window.innerHeight > window.innerWidth){
				$('.menu').css({'flex-direction': 'column'});
				$('.menu_pos').css({top: 0, left: $('.menu').outerWidth()});
				$('.time_panel').css({border: 'none', borderTop: '3px solid rgba(255,255,255,0.5)', borderBottom: '3px solid rgba(255,255,255,0.5)'});
			} else {
				$('.time_panel').css({border: 'none', borderLeft: '3px solid rgba(255,255,255,0.5)', borderRight: '3px solid rgba(255,255,255,0.5)'});
				$('.menu_pos').css({top: $('.menu').outerHeight() , left: 0});
				$('.menu').css({'flex-direction': 'row'});
			}
			$('.menu_pos_size').css({maxHeight: '80vh'});
			$('.input_num').css({width: '10vmin'});
			$('#launchPowerLabel').css({fontSize: '20px'})
			$('body').css({fontSize: 'inherit'});
			$('.close_button').css({width: '30px', height: '30px', padding: '0 0 7px 0', fontSize: '30px', right: '-37px'});
			$('.time_speed').css({right: 10, top: 130});
		}	
	}
	//Запись файла
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
	function readFile(input) {
		let file = input.files[0];
		let reader = new FileReader();
		reader.readAsText(file);
		reader.onload = function() {
			try {
			  	let file_data = JSON.parse(reader.result);
				console.log('file loaded');
			  	scene.objArr = file_data.objArr;
			  	interactMode = file_data.interactMode || 0;
			  	gravitationMode = file_data.gravitationMode || 1;
			  	g = file_data.g ? file_data.g : 1;
			  	collisionMode.state = file_data.collisionMode || 0;
			  	timeSpeed = file_data.timeSpeed ? file_data.timeSpeed : 1;
			  	scene.show_obj_count();
			  	scene.objArrChanges = true;
			  	scene.camera.clear("#000000");
			} catch(err){
				alert('Несовместимый файл!');
			}
			document.getElementById('select_file').value = '';
		};
		reader.onerror = function() {
			alert("Ошибка чтения файла!");
		};
	}
};