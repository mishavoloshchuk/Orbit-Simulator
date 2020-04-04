$('document').ready(function(){
	var canv = document.getElementById('canvas');
	var ctx = canv.getContext('2d');
	var canv2 = document.getElementById('canvas2');
	var ctx2 = canv2.getContext('2d');
	canv.width = window.innerWidth;
	canv.height = window.innerHeight;
	canv2.width = window.innerWidth;
	canv2.height = window.innerHeight;
	mouse_coords = [canv.width/2, canv.height/2];
	mouse = [];
	mbut = 'create';
	cbut = '';
	chck = '';
	pfb = mbut;
	swt = false;
	traj = true;
	mov_obj = '';
	new_obj_param = [0,0,0,0];
	paus = false;
	traj_smpls = [0, 2, false];

	//Camera
	cam_x = 0;
	cam_y = 0;
	mcamX = 0;
	mcamY = 0;
	prev_cam_x = 0;
	prev_cam_y = 0;
	mov = [0, 0, 0, 0];
	movAnim = [0, 0, 0, 0, true];
	anim_cam = [0, 0, true];
	zm = 1/1;
	glob_scale = 1;

	//Debug
	ref_sped = 1;
	show_center = false;
	usr_orb_obj = NaN;

	function crd(coord, axis, mode){
		if (mode == 0){
			if (axis == 'x'){
				return (coord + cam_x)*zm + mcamX + mov[0];
			}
			if (axis == 'y'){
				return (coord + cam_y)*zm + mcamY + mov[1];
			}		
		}
		if (mode == 1){
			if (axis == 'x'){
				return ((coord - mcamX - mov[0])/zm-cam_x);
			}
			if (axis == 'y'){
				return ((coord - mcamY - mov[1])/zm-cam_y);
			}			
		}
	}

	body = {
		'earth': {x:window.innerWidth/2, y: window.innerHeight/2, vx: 0, vy: 0, m: 1000, color: '#ffff00', lck: true, trace: [], main_obj: false},
		//'ast': {x:window.innerWidth/2 - 100, y: window.innerHeight/2, vx: 0, vy: 10, m: 10, color: randColor(), lck: false, trace: [], main_obj: 'earth'},
		//'earth2': {'x':0, 'y': window.innerHeight/2, 'vx': 1, 'vy': 3, m: 100, 'color': '#ffff00', 'lck': false, trace: [], main_obj: 'earth'},
	};

	//View=================
	//ctx.scale(cam_scale, cam_scale);
	//ctx.translate(mov[0], mov[1]);
	//myImageData = ctx.createImageData(0, 0, window.innerWidth, window.innerHeight);
	//ctx.putImageData(myImageData, 0, 0);

	obj_count = 0;
	function show_obj_count(){
		obj_count = 0;
		for (let i in body){
			obj_count ++;
		}

		if (obj_count != switcher.obj_count){
			$('.object_count h2').html('Количество обьектов: '+obj_count);
			switcher.obj_count = obj_count;
		}
	}

	switcher = {create: true, delete: false, del_radio: 0, 
		del_pulse: 10, del_pulse_state: false, pause: false, pause2: false, trajectory_ref: false, music: false,
		obj_count: obj_count, help: false, f_speed: 0, f_need_speed: false, device: 'desktop',
		sim_settings: false, gravit_mode: 1, r_gm: 1, interact: 0, ref_interact: 0,
		lost_x: false, lost_y: false, camera: false, edit: false, traj: false, traj_mode: 1, traj_prev_on: true,
		zoomToMouse: true, vis_distance: false, sel_orb_obj: false};

	swch = {s_track: false, t_object: false, prev_t_obj: false, vis_traj: false,
		s_edit: false, edit_obj: false, orb_obj: 'earth', equilib_orb: false};

	choise_restore('gravit_mode', 'gravit_mode', 'radio');
	choise_restore('interact', 'interact', 'radio');
	choise_restore('traj_mode', 'traj_mode', 'radio');
	choise_restore('traj_prev_on', 'traj_prev_on', 'checkbox');
	choise_restore('chck_zoomToMouse', 'zoomToMouse', 'checkbox');
	choise_restore('vis_distance_check', 'vis_distance', 'checkbox');

	radio_select('gravit_mode_radio', switcher.gravit_mode);
	radio_select('interact_radio', switcher.interact);
	radio_select('traj_radio', switcher.traj_mode);
	check_select('traj_prev_check', switcher.traj_prev_on);
	check_select('chck_zoomToMouse', switcher.zoomToMouse);
	check_select('vis_distance_check', switcher.vis_distance);

	show_obj_count();

	function radio_select(radio_id_prefix, numb){
		$('#'+radio_id_prefix+'_'+numb).attr('checked', '');	
	}
	function check_select(check_id, state){
		if (state){
			$('#'+check_id).attr('checked', '');
		}
	}
	function choise_restore(name_session, var_name, cr = 'c'){
		if (sessionStorage[name_session]){
			if (cr == 'checkbox'){
				switcher[var_name] = sessionStorage[name_session] != 'true' ? false : true;	
			}
			if (cr == 'radio'){
				switcher[var_name] = sessionStorage[name_session];
			}			
		}
	}
	//====time====
	t = 1;
	times = 1;
	tsw = false;
	t_wrap = false;
	pretime = 1;
	$('.time_speed h2').html('T - X'+t);
	//======
	obj_color = sessionStorage['obj_color'] ? sessionStorage['obj_color'] : '#FFFFFF';
	obj_rand_color = sessionStorage['obj_rand_color'] ? (sessionStorage['obj_rand_color'] == 'true' ? true : false) : true;
	obj_radius = sessionStorage['obj_radius'] ? +sessionStorage['obj_radius'] : Math.round(getRandomArbitrary(0.1, 10)*10)/10;
	obj_reverse = sessionStorage['obj_reverse'] ? (sessionStorage['obj_reverse'] == 'true' ? true : false) : false;
	obj_cirle_orbit = sessionStorage['obj_cirle_orbit'] ? (sessionStorage['obj_cirle_orbit'] == 'true' ? true : false) : true;
	obj_lck = false;

	traj_calc_smpls = sessionStorage['traj_calc_samples'] ? +sessionStorage['traj_calc_samples'] : 100;

	$('.col_select').attr('value', obj_color);
	$('.radius_select').attr('value', obj_radius);
	$('#traj_calc_samples').attr('value', traj_calc_smpls);
	if (obj_reverse){$('.direction_reverse_select').attr('checked', 'on');};
	if (obj_cirle_orbit){$('.orbit_select').attr('checked', 'on');};
	if (obj_rand_color){$('.rand_col_select').attr('checked', 'on');};

	change_state(mbut);

	//speed = 16;
	//let simulation_refresh = setInterval(frame, speed);
	window.requestAnimationFrame(frame);	

	G = 0.05;
	mousedown = false;
	middleMouseDown = false;
	spawn = false;
	num = 0;
	mpos = [];
	del = false;
	body_prev = {};

	function clear(col = '#00000004'){
		if (switcher.traj_mode == 0){col = '#000';}
		ctx.fillStyle = col;
		ctx.fillRect(0, 0, canv.width, canv.height);

		clear2();
		//ctx.clearRect(0, 0, canvas.width, canvas.height);
	}
	function clear2(){
		myImageData = ctx2.createImageData(window.innerWidth, window.innerHeight, 0, 0);
		ctx2.putImageData(myImageData, 0, 0);
	}

	function minusup(a, b){
		if (a > b){
			return a-b;
		};
		if (b > a){
			return b-a;
		};
		if (b == a){
			return 0;
		};
	};

	wind_width = window.innerWidth;
	wind_height = window.innerHeight;
	window.onresize = function(){
		if (!(wind_width == window.innerWidth) && !(wind_height == window.innerHeight)){
			if (confirm('Для корректного отображения, нужно перезагрузить страницу.')){
				location.href = location;
			}					
		}
	}

	$('.canvas').mousedown(function(event){
		if (event.which == 1){
			//console.log(body.moon.vx+'  '+body.moon.vy);
			mousedown = true;
			mpos[0] = event.clientX; mpos[1] = event.clientY;
			mouse[0] = event.clientX; mouse[1] = event.clientY;
			//if (mbut == 'create'){
			//	clearInterval(simulation_refresh);
			//}
			if (mbut == 'create'){
				if (obj_rand_color){
					obj_color = randColor();
				};
				switcher.f_speed = f_orbital_speed(mouse[0], mouse[1], 'earth');
				$('.power_need').html("*Для круговой орбиты, нужно примерно: "+ Math.round(Math.sqrt(switcher.f_speed[0]*switcher.f_speed[0] + switcher.f_speed[1]*switcher.f_speed[1])*30)+"*");
			};
			//Перемещение ближайшео объекта
			if (mbut == 'move'){
				mov_obj = select_object();
			}

			if (body[mov_obj]){
				mpos[2] = body[mov_obj].x; mpos[3] = body[mov_obj].y; //Координаты перемещяемого объекта
				mpos[4] = body[mov_obj].vx; mpos[5] = body[mov_obj].vy;	// Вектор перемещяемого объекта
				body[mov_obj].vx = 0; body[mov_obj].vy = 0;
			}
			//Выбор объекта для редактирования
			if (mbut == 'edit' && swch.s_edit){
				swch.edit_obj = select_object(0);
				swch.s_edit = false;
				if (body[swch.edit_obj]){
					document.getElementById('col_edit').value = body[swch.edit_obj].color;
					document.getElementById('mass_edit').value = body[swch.edit_obj].m;
					document.getElementById('check_edit_lck').checked = body[swch.edit_obj].lck;
				}
				delete edit_radius;
			}		
		}
		if (event.which == 2){
			middleMouseDown = true;
			mpos[0] = event.clientX - cam_x*zm; mpos[1] = event.clientY - cam_y*zm;

			mov[0] = cam_x*zm+mov[2]; mov[1] = cam_y*zm+mov[3];

			swch.t_object = false;
			swch.prev_t_obj = false;
		}
	});

	$('input').on('change', function(e){
		//alert($(this).attr('id'));
		chck = $(this).attr('id');

		if (chck == 'check_edit_lck' && body[swch.edit_obj]){
			if (document.getElementById(chck).checked){
				body[swch.edit_obj].lck = true;
			} else {
				body[swch.edit_obj].lck = false;
			}
		}
		if (chck == 'mass_edit' && body[swch.edit_obj]){		
			if (+document.getElementById(chck).value > 0 && +document.getElementById(chck).value){
				body[swch.edit_obj].m = +document.getElementById(chck).value;
			}
			//clear('#000');
		}
		if (chck == 'col_edit' && body[swch.edit_obj]){
			body[swch.edit_obj].color = document.getElementById(chck).value;
		}
		if (chck == 'traj_radio_0'){
			switcher.traj_mode = sessionStorage['traj_mode'] = 0;
		}
		if (chck == 'traj_radio_1'){
			switcher.traj_mode = sessionStorage['traj_mode'] = 1;
		}
		if (chck == 'traj_radio_2'){
			switcher.traj_mode = sessionStorage['traj_mode'] = 2;
		}
		if (chck == 'traj_radio_3'){
			switcher.traj_mode = sessionStorage['traj_mode'] = 3;
		}
		if (chck == 'traj_calc_samples'){
			traj_calc_smpls = +this.value;
			sessionStorage['traj_calc_samples'] = +this.value;
		}
		if (chck == 'traj_prev_check'){
			sessionStorage['traj_prev_on'] = switcher.traj_prev_on = (this.checked == false) ? false : true;
		}
		if (chck == 'chck_zoomToMouse'){
			sessionStorage['chck_zoomToMouse'] = switcher.zoomToMouse = (this.checked == false) ? false : true;
		}
		if (chck == 'vis_distance_check'){
			sessionStorage['vis_distance_check'] = switcher.vis_distance = (this.checked == false) ? false : true;
			$('.power').css({display: 'none'});
		}
	});


	$('.canvas').mouseup(function(e){
		if (event.which == 1){
			mousedown = false;
			mouse[2] = event.clientX; mouse[3] = event.clientY;
			$('.power').css({display: 'none'});
			$('.power_need').css({display: 'none'});
			if (switcher.device == 'mobile'){
				close_all_menus();
			}
			switcher.f_need_speed = false;

			body_length = 0;
			for (let i in body){
				body_length ++;
			}
			if (mbut == 'delete' && body_length > 0){
				delete_obj = select_object(switcher.del_radio);

				ctx.beginPath();
				ctx.fillStyle = '#000';
				ctx.arc(body[delete_obj].x, body[delete_obj].y, Math.sqrt(body[delete_obj].m)+1, 0, 7);
				ctx.fill();

				del_obj(delete_obj);

				//console.log('Удален!');
				$('.deleted').animate({right: 50});
				timeout = setTimeout(function(){$('.deleted').animate({right: -300});}, 2000);
			}
			if (mbut == 'move' && body[mov_obj]){
				body[mov_obj].vx = mpos[4];
				body[mov_obj].vy = mpos[5];
				mov_obj = '';
			}

			if (mbut == 'create'){
				spawn = true;
				swch.vis_traj = false;
				switcher.trajectory_ref = false;
				ctx.beginPath();
				ctx.fillStyle = obj_color;
				ctx.arc(mpos[0], mpos[1], Math.sqrt(obj_radius)*zm, 0, 7);
				ctx.fill();
				if (!paus){
					obj_sp(new_obj_param[0], new_obj_param[1], obj_color, new_obj_param[2], new_obj_param[3]);
				}
				//obj_sp(false, false, obj_color);
			}
			if (mbut == 'camera' && swch.s_track){
				paus = switcher.pause ? true : false; //Пауза уже включена
				swch.t_object = select_object();
				clear('#000000');

				if (mov[0] != 0 || mov[1] != 0){
					movAnim[4] = false;
				}
				mov[0] = 0;
				mov[1] = 0;
				mov[2] = 0;
				mov[3] = 0;

				swch.s_track = false;
			}
			if (mbut == 'sel_orb_obj'){
				usr_orb_obj = select_object();
				switcher.sel_orb_obj = false;
				mbut = 'create';
			}
			show_obj_count();
		};
		if (event.which == 2){
			middleMouseDown = false;
			mov[2] = mov[0];
			mov[3] = mov[1];
		}
	});	

	document.onmousemove = function(){

		switcher.move = false;
		if (mousedown && mbut == 'move' && mov_obj){
			switcher.move = true;
			if (body[mov_obj]){
				body[mov_obj].x = (event.clientX - mpos[0])/zm + mpos[2];
				body[mov_obj].y = (event.clientY - mpos[1])/zm + mpos[3];
			}
		}

		if (middleMouseDown){
			mov[0] = event.clientX - mpos[0] + mov[2];
			mov[1] = event.clientY - mpos[1] + mov[3];
			clear('#000000');
		}

		mouse_coords[0] = event.clientX;
		mouse_coords[1] = event.clientY;

	};

	function rad(x1, y1, x2, y2){
		a = x1 - x2; b = y1 - y2;
		return Math.sqrt(a*a + b*b);
	};

	function gipot(a,b){return Math.sqrt(a*a + b*b);}

	function frame(){
		window.requestAnimationFrame(frame);
		t = times;

		if (!body[usr_orb_obj]){
			swch.orb_obj = select_object(3);		
		} else {
			swch.orb_obj = usr_orb_obj;
		}

		mcamX = -window.innerWidth/2 * (zm-1);
		mcamY = -window.innerHeight/2 * (zm-1);

		if (switcher.move || switcher.traj_mode == 2 || switcher.traj_mode == 3){clear('#000');}else{if(!switcher.trajectory_ref && !switcher.pause2){clear();}; clear2();}

		if (middleMouseDown || mbut=='move'){canv.style.cursor = "move";}else{canv.style.cursor = "default";};

		if (mbut == 'create' && mousedown){
			if (!switcher.pause){
				switcher.pause = true;
				switcher.traj_pause = true;				
			}
			visual_trajectory();
			obj_for_traj = {x: crd(mouse[0], 'x', 1), y: crd(mouse[1], 'y', 1), vx: ((mouse[0]-mouse_coords[0])/30)*t, vy: ((mouse[1]-mouse_coords[1])/30)*t, m: obj_radius, color: obj_color, lck: obj_lck};
			//console.log(obj_for_traj);
			if ((!(Math.abs(mouse[0]-mouse_coords[0])<5&&Math.abs(mouse[1]-mouse_coords[1])<5))&&switcher.traj_prev_on){
				traj_prev(obj_for_traj, traj_calc_smpls, ['#ffffff33', '#ffffff88'], true);
			};
		}

		if (mbut == 'create' && !mousedown){
			if (switcher.traj_pause){
				switcher.pause = false;
				delete switcher.traj_pause;
			} else {

			}
		}

		if (switcher.interact != switcher.ref_interact){
			switcher.ref_interact = switcher.interact;
		}
		if (switcher.r_gm != switcher.gravit_mode){
			switcher.r_gm = switcher.gravit_mode;
		}

		
		//Анимация перехода камеры
		if (swch.t_object != swch.prev_t_obj && movAnim[4]){
			switcher.pause = true; //Пауза
			crds = [0,0,0,0,0,0];//Координаты и расстояния
			if (body[swch.t_object]){ //Если целевой объект существует
				crds[0] = body[swch.t_object].x; //Координаты целевого объекта по x
				crds[1] = body[swch.t_object].y; //Координаты целевого объекта по y
			} else { //Если нет
				crds[0] = window.innerWidth/2; //Цель - центр окна
				crds[1] = window.innerHeight/2; //Цель - центр окна
			}
			if (body[swch.prev_t_obj]){ //Если предыдущий целевой объект существует
				crds[2] = body[swch.prev_t_obj].x; //Координаты предыдущео целевого объекта
				crds[3] = body[swch.prev_t_obj].y; //Координаты предыдущео целевого объекта
			} else { //Если нет
				crds[2] = window.innerWidth/2; //Цель - центр окна
				crds[3] = window.innerHeight/2; //Цель - центр окна
			};
			crds[4] = crds[0] - crds[2]; //Расстояние между предыдущим целевым и целевым объектом по x
			crds[5] = crds[1] - crds[3]; //Расстояние между предыдущим целевым и целевым объектом по y
			crds[7] = crds[5]/20; //Размер шага анимации
			crds[6] = crds[4]/20; //Размер шага анимации

			anim_cam[0] -= crds[6]; //Шаг анимации
			anim_cam[1] -= crds[7]; //Шаг анимации

			if (Math.abs(anim_cam[0]) > Math.abs(crds[4]) || Math.abs(anim_cam[0]) == 0){ //Конец анимации
				swch.prev_t_obj = swch.t_object;
				anim_cam[0] = 0;
				anim_cam[1] = 0;
				anim_cam[2] = true;
				switcher.pause = paus; //Снимается пауза, если пауза была выключена
			}
			clear('#000');
		} else {
			swch.prev_t_obj = swch.t_object;
		}

		if (!middleMouseDown){
			prev_cam_x = cam_x;
			prev_cam_y = cam_y;
		} else {
			prev_cam_x = 0;
			prev_cam_y = 0;
		}

		if (swch.prev_t_obj && body[swch.prev_t_obj]){
			cam_vx = !switcher.pause2 ? body[swch.prev_t_obj].vx : 0;
			cam_vy = !switcher.pause2 ? body[swch.prev_t_obj].vy : 0;

			if (swch.t_object && !switcher.pause){
				body_prev = JSON.parse(JSON.stringify(body));
				obj = body_prev[swch.t_object];
				body_length = 0; for (let i in body){body_length ++;};
				if (switcher.ref_interact == 0 && !switcher.pause2 && body_length > 1){
					for(let i in body){
						if (i != swch.t_object){
							obj2 = body_prev[i];
							R = rad(obj.x, obj.y, obj2.x, obj2.y);
							a = obj2.x - obj.x;
							b = obj2.y - obj.y;
							sin = b/R; cos = a/R;

							vx = gravity_func(sin, cos, R, switcher.r_gm, 'vx', obj2.m);
							vy = gravity_func(sin, cos, R, switcher.r_gm, 'vy', obj2.m);

							if(!obj.lck && !switcher.pause2 && !(mbut == 'move' && mousedown && object == mov_obj)){
								cam_vx += vx;
								cam_vy += vy;
							}
						};
					}
				}
				if (switcher.ref_interact == 1 && body_prev['earth'] && !switcher.pause2 && body_length > 1){
					obj2 = body_prev['earth'];

					R = rad(obj.x, obj.y, obj2.x, obj2.y);

					a = obj2.x - obj.x;
					b = obj2.y - obj.y;
					sin = b/R; cos = a/R;

					vx = gravity_func(sin, cos, R, switcher.r_gm, 'vx', obj2.m);
					vy = gravity_func(sin, cos, R, switcher.r_gm, 'vy', obj2.m);

					if(!obj.lck && !switcher.pause2 && !(mbut == 'move' && mousedown && object == mov_obj)){
						cam_vx += vx;
						cam_vy += vy;
					}
				};					
			}

			cam_x = (window.innerWidth / 2) - (body[swch.prev_t_obj].x + cam_vx) + anim_cam[0];
			cam_y = (window.innerHeight / 2) - (body[swch.prev_t_obj].y + cam_vy) + anim_cam[1];		
		} else {
			cam_x = 0 + anim_cam[0];
			cam_y = 0 + anim_cam[1];
		}

		if (tsw){
			$('.time_speed h2').html('T - X'+t);
			for (let i in body){
				c = times/pretime;
				body[i].vx *= c;
				body[i].vy *= c;
			}
			tsw = false;
		}

		body_length = 0;
		for (let i in body){
			body_length ++;
		}
		if (switcher.pause){switcher.pause2 = true};
		if (!switcher.pause){switcher.pause2 = false};
		if (!switcher.pause){
			if (spawn){
				obj_sp(new_obj_param[0], new_obj_param[1], obj_color, new_obj_param[2], new_obj_param[3]);
			}		
		}
		for (let i = 0; i < ref_sped; i++){
			body_prev = JSON.parse(JSON.stringify(body));
			if (body_length > 0){
				for (let obj in body){	
					//traj_prev(obj, 200, '#ffffff33');
					refresh(obj);
				}			
			}
			if (!movAnim[4]){
				movAnim[4] = true;
			}			
		}
		if (t_wrap){
			$('.time_speed h2').html('T - X'+t);
			for (let i in body){
				c = times/pretime;
				body[i].vx *= c;
				body[i].vy *= c;
			}
			t_wrap = false;
		}

		if (mbut == 'delete'){
			visual_select(switcher.del_radio, '#f006');
		}

		if (mbut == 'camera' && cbut == 'select_track' && swch.s_track){
			visual_select(0, '#0af6', select_object());
		}

		if (mbut == 'move'){
			visual_select(0, '#bbb6', mov_obj);
		}

		if (mbut == 'edit'){
			if (swch.s_edit){
				visual_select(0, '#11f6', mov_obj);
			}
		}
		if (show_center){
			ctx.strokeStyle = '#000000';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(wind_width/2 - 5, wind_height/2 - 5);
			ctx.lineTo(wind_width/2 + 5, wind_height/2 + 5);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(wind_width/2 + 5, wind_height/2 - 5);
			ctx.lineTo(wind_width/2 - 5, wind_height/2 + 5);
			ctx.stroke();

			ctx.strokeStyle = '#ff0000';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(wind_width/2 - 5, wind_height/2 - 5);
			ctx.lineTo(wind_width/2 + 5, wind_height/2 + 5);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(wind_width/2 + 5, wind_height/2 - 5);
			ctx.lineTo(wind_width/2 - 5, wind_height/2 + 5);
			ctx.stroke();			
		}
		if(traj_smpls[0] >= traj_smpls[1]){
			traj_smpls[2] = true;
			traj_smpls[0] = 0;
		} else {
			traj_smpls[0] ++;
			traj_smpls[2] = false;
		}
		if ((mbut == 'create' || mbut == 'trajectory') && !mousedown && switcher.vis_distance){
			vis_distance([mouse_coords[0], mouse_coords[1]], '#888888');
		}
		if (mbut == 'sel_orb_obj' && switcher.sel_orb_obj){
			visual_select(0, '#bf06', mov_obj);
		}
		if (mbut != 'create' && mbut != 'trajectory'){
			$('.power').css({display: 'none'});
		}
	}

	function refresh(object){
		body_length = 0; for (let i in body){body_length ++;};

		obj = body_prev[object];
		if(switcher.ref_interact == 0 && !switcher.pause2 && body_length > 1){
			for (let i in body){
				if (i == object){continue;};
				obj2 = body_prev[i];

				R = rad(obj.x, obj.y, obj2.x, obj2.y);
				
				a = obj2.x - obj.x;
				b = obj2.y - obj.y;
				sin = b/R; cos = a/R;

				vx = gravity_func(sin, cos, R, switcher.r_gm, 'vx', obj2.m);
				vy = gravity_func(sin, cos, R, switcher.r_gm, 'vy', obj2.m);

				if(!obj.lck && !switcher.pause2 && !(mbut == 'move' && mousedown && object == mov_obj)){
					body[object].vx += vx;
					body[object].vy += vy;
				}

				if (R - (Math.sqrt(obj.m) + Math.sqrt(obj2.m)/2) <= 0){
					if (obj.m >= obj2.m){
						body[object].color = mixColors(obj.color, obj2.color, obj.m, obj2.m);
						body[object].m = Math.round((obj.m + obj2.m)*1000)/1000;
						if (!obj.lck){
							body[object].vx = (obj.m*obj.vx+obj2.m*obj2.vx)/(obj.m+obj2.m);//Формула абсолютно-неупругого столкновения
							body[object].vy = (obj.m*obj.vy+obj2.m*obj2.vy)/(obj.m+obj2.m);//Формула абсолютно-неупругого столкновения
							//((body[object].m * body[object].vx)+(obj2.m * obj2.vx))/(obj2.m+body[object].m);
							//((body[object].m * body[object].vy)+(obj2.m * obj2.vy))/(obj2.m+body[object].m);
						}

						del_obj(i);
						show_obj_count();
						continue;
					}else{continue;}
				}
			}
		}
		if (switcher.ref_interact == 1 && body_prev[swch.orb_obj] && !switcher.pause2 && body_length > 1){
			if (object != obj.main_obj && body[object] && obj.main_obj){
				obj2 = body_prev[obj.main_obj];

				R = rad(obj.x, obj.y, obj2.x, obj2.y);

				a = obj2.x - obj.x;
				b = obj2.y - obj.y;
				sin = b/R; cos = a/R;

				vx = gravity_func(sin, cos, R, switcher.r_gm, 'vx', obj2.m);
				vy = gravity_func(sin, cos, R, switcher.r_gm, 'vy', obj2.m);

				if(!obj.lck && !switcher.pause2 && !(mbut == 'move' && mousedown && object == mov_obj)){
					body[object].vx += vx;
					body[object].vy += vy;
				}

				//Эллипс	
				//ctx.beginPath();
				//ctx.lineWidth = Math.sqrt(body[object].m);
				//if (!obj.color){obj.color = 'gray';};
				//ctx.strokeStyle = obj.color;
				//ell_sin = body[object].vx / body[object].vy;
				//ell_cos = body[object].vy / body[object].vx;
				//V = gipot(body[object].vx, body[object].vy);
				//Mu = 100000;
				//M = (Math.pow(V, 2) / 2) - (Mu / R);//Mechanical Energy
				//ell_a = 1 / ( 2/R - (V*V) / M );
				//ctx.ellipse(body.earth.x + cam_x, body.earth.y + cam_y, Math.abs(ell_a), 250, 0, 0, 7);
				//ctx.stroke();
			};
		}

		prev_x = body[object].x + prev_cam_x + mov[0]/zm;
		prev_y = body[object].y + prev_cam_y + mov[1]/zm;

		if(!obj.lck && !switcher.pause2 && !t_wrap){
			body[object].x += body[object].vx;
			body[object].y += body[object].vy;
		}

		render = (prev_x != body[object].x + cam_x + mov[0]/zm && prev_y != body[object].y + cam_y + mov[1]/zm)?true:false;

		if (!switcher.pause2 && movAnim[4] && switcher.traj_mode == 1){
			if (swch.prev_t_obj != object){
				ctx.beginPath();
				ctx.fillStyle = obj.color;
				ctx.arc(prev_x*zm+mcamX, prev_y*zm+mcamY, Math.sqrt(obj.m)*zm, 0, 7);
				ctx.fill();

				ctx.strokeStyle = obj.color;
				ctx.lineWidth = Math.sqrt(obj.m)*2*zm;
				ctx.beginPath();
				ctx.moveTo(prev_x*zm+mcamX, prev_y*zm+mcamY);
				ctx.lineTo(crd(body[object].x, 'x', 0), crd(body[object].y, 'y', 0));
				ctx.stroke();			
			}
		}

		if (!render){
			ctx.beginPath();
			ctx.fillStyle = '#000000';
			ctx.arc(crd(body[object].x, 'x', 0), crd(body[object].y, 'y', 0), (Math.sqrt(obj.m)*zm+0.25), 0, 7);
			ctx.fill();
		}
		if (!obj.color){obj.color = 'gray';}
		ctx.fillStyle = obj.color;
		ctx.beginPath();
		ctx.arc(crd(body[object].x, 'x', 0), crd(body[object].y, 'y', 0), Math.sqrt(obj.m)*zm, 0, 7);
		ctx.fill();

		//Trajectory mode 2 =====
		if (switcher.traj_mode == 2 && !obj.lck){
			res = 20;
			rand_kf = 0.5;
			if (traj_smpls[2] && !switcher.pause2){
				body[object].trace.unshift([obj.x, obj.y]);
				if (body[object].trace.length > res){
					body[object].trace.pop();
				}			
			}
			prev_randX = 0;
			prev_randY = 0;
			randX = 0;
			randY = 0;

			ctx.fillStyle = obj.color;
			ctx.strokeStyle = obj.color;
			if (body[object].trace[0]){
				ctx.lineWidth = Math.sqrt(obj.m)*zm*2;
				ctx.beginPath();
				ctx.moveTo(crd(body[object].x, 'x', 0)+randX, crd(body[object].y, 'y', 0)+randY);
				ctx.lineTo(crd(body[object].trace[0][0], 'x', 0)+prev_randX, crd(body[object].trace[0][1], 'y', 0)+prev_randY);
				ctx.stroke();				
			}
			for (let i in body[object].trace){
				itr = i-1;
				itr = itr < 0?0:itr;
				prev_randX = randX; prev_randY = randY;
				randX = getRandomArbitrary(-(Math.sqrt(obj.m)*zm*i/10), Math.sqrt(obj.m)*zm*i/10)*rand_kf;
				randY = getRandomArbitrary(-(Math.sqrt(obj.m)*zm*i/10), Math.sqrt(obj.m)*zm*i/10)*rand_kf;

				ctx.lineWidth = Math.abs(Math.sqrt(obj.m)*zm*1.9 - (Math.sqrt(obj.m)*zm*2)/32*i*2*0.8);
				ctx.beginPath();
				ctx.arc(Math.floor(crd(body[object].trace[itr][0], 'x', 0)+randX*2), Math.floor(crd(body[object].trace[itr][1], 'y', 0)+randY*2), Math.sqrt(obj.m)*zm - (Math.sqrt(obj.m)*zm)/res*i, 0, 7);
				ctx.fill();
				ctx.beginPath();
				ctx.moveTo(crd(body[object].trace[i][0], 'x', 0)+randX, crd(body[object].trace[i][1], 'y', 0)+randY);
				ctx.lineTo(crd(body[object].trace[itr][0], 'x', 0)+prev_randX, crd(body[object].trace[itr][1], 'y', 0)+prev_randY);
				ctx.stroke();
			}
		}
		if (switcher.traj_mode == 3 && !obj.lck){
			res = 20;
			rand_kf = 0.5;
			if (traj_smpls[2] && !switcher.pause2){
				body[object].trace.unshift([obj.x, obj.y]);
				if (body[object].trace.length > res){
					body[object].trace.pop();
				}			
			}
			ctx.fillStyle = obj.color;
			ctx.strokeStyle = obj.color;
			if (body[object].trace[0]){
				ctx.lineWidth = Math.sqrt(obj.m)*zm*2*0.9;
				ctx.beginPath();
				ctx.moveTo(crd(body[object].x, 'x', 0), crd(body[object].y, 'y', 0));
				ctx.lineTo(crd(body[object].trace[0][0], 'x', 0), crd(body[object].trace[0][1], 'y', 0));
				ctx.stroke();				
			}
			for (let i in body[object].trace){
				itr = i-1;
				itr = itr < 0?0:itr;

				ctx.lineWidth = Math.abs(Math.sqrt(obj.m)*zm*1.9 - (Math.sqrt(obj.m)*zm*2)/32*i*2*0.8);
				ctx.beginPath();
				ctx.moveTo(crd(body[object].trace[i][0], 'x', 0), crd(body[object].trace[i][1], 'y', 0));
				ctx.lineTo(crd(body[object].trace[itr][0], 'x', 0), crd(body[object].trace[itr][1], 'y', 0));
				ctx.stroke();
			}
		}
		if (switcher.traj_mode != 2 && switcher.traj_mode != 3) {body[object].trace = [];};

		//console.log(R);
		//arr = Object.keys(body);
		//ctx.beginPath();
	};

	function gravity_func(sin, cos, R, func_num, dir, mass, user_func){
		//Обратно-пропорционально квадрату расстояния
		if (func_num == 1){
			kff = mass*10*t*t;
			vx = kff*(cos/(R*R));//(obj2.x-obj.x)/10000;//~1;
			vy = kff*(sin/(R*R));//(obj2.y-obj.y)/10000;//~-0.522;
		}
		//Обранто-пропорционально кубу расстояния
		if (func_num == 0){
			kff = mass*1000*t*t;
			vx = kff*(cos/(R*R*R));
			vy = kff*(sin/(R*R*R));
		}
		//Обранто-пропорционально расстоянию
		if (func_num == 2){
			kff = mass*0.1*t*t;
			vx = kff*(cos/R);
			vy = kff*(sin/R);
		}
		//Постоянное притяжение
		if (func_num == 3){
			kff = mass*0.001*t*t;
			vx = kff*(cos);
			vy = kff*(sin);
		}
		//Пропорционально расстоянию
		if (func_num == 4){
			kff = mass*0.00001*t*t;
			vx = kff*(cos*R);
			vy = kff*(sin*R);
		}
		//Функция пользователя
		if (user_func){
			//
		}
		//Отправить вектор x
		if (dir == 'vx'){
			return vx;
		}
		//Отправить вектор y 
		if (dir == 'vy'){
			return vy;
		}
	}

	function visual_trajectory(){
		//clear('#000');
		if (!(Math.abs(mouse[0]-mouse_coords[0]) <= 5 && Math.abs(mouse[1]-mouse_coords[1]) <= 5)){
			//clear('#000000');
			swch.vis_traj = true;
			$('.power').css({left: mouse_coords[0]-10, top: mouse_coords[1]-30, display: 'block', color: obj_color});
			$('.power').html(Math.round(rad(mouse[0], mouse[1], mouse_coords[0], mouse_coords[1])));
			if (!switcher.f_need_speed){
				if (switcher.gravit_mode == 1 && (swch.t_object == false || (swch.t_object == 'earth' && body.earth.lck))){					
					$('.power_need').css({display: 'block'});
				}
				switcher.f_need_speed = true;
			};
		}
		ctx2.strokeStyle = obj_color;
		ctx2.lineWidth = Math.sqrt(obj_radius)*2*zm;
		ctx2.beginPath();
		ctx2.moveTo(mouse[0], mouse[1]);
		ctx2.lineTo(mouse_coords[0], mouse_coords[1]);
		ctx2.stroke();

		ctx2.strokeStyle = '#000a';
		ctx2.lineWidth = Math.sqrt(obj_radius)*2*zm;
		ctx2.beginPath();
		ctx2.moveTo(mouse[0], mouse[1]);
		ctx2.lineTo(mouse_coords[0], mouse_coords[1]);
		ctx2.stroke();
		switcher.lost_x = mouse_coords[0];
		switcher.lost_y = mouse_coords[1];

		ctx2.beginPath();
		ctx2.fillStyle = obj_color;
		ctx2.arc(mpos[0], mpos[1], Math.sqrt(obj_radius)*zm, 0, 7);
		ctx2.fill();
	}

	function f_orbital_speed(px, py, obj){
		if (body[obj]){
			R = rad(px, py, body[obj].x*zm, body[obj].y*zm);
			V = Math.sqrt((body[obj].m/zm*10*t*t)*(R));
			a = body[obj].x*zm - px;
			b = body[obj].y*zm - py;
			sin = b/R; cos = a/R;
			svx = -(sin/V)*body[obj].m*10*t*t;
			svy = (cos/V)*body[obj].m*10*t*t;
			return [svx/t, svy/t];		
		} else {
			return [0, 0];
		}
	}

	function select_object(mode = 0){
		sel = [Infinity, '', 0];
		if (mode == 2){
			elem = '';
			for (i in body){
				elem = i;
			}
			sel[1] = elem;
		}
		if (mode == 0 || mode == 1){
			for (let i in body){
				r = rad(mouse_coords[0], mouse_coords[1], crd(body[i].x, 'x', 0), crd(body[i].y, 'y', 0));
				if (r < sel[0] && mode == 0){
					sel[0] = r;
					sel[1] = i;
				} else 
				if (r > sel[2] && mode == 1){
					sel[2] = r;
					sel[1] = i;
				}
			}
		}
		if (mode == 3){
			for(let i in body){
				if (body[i].m > sel[2]){
					sel[2] = body[i].m;
					sel[1] = i;
				}
			}
		}
		return 	sel[1];
	}

	function vis_distance(obj_cord, col = '#888888', targ_obj = swch.orb_obj){
		if (body[targ_obj]){
			size = rad(obj_cord[0], obj_cord[1], crd(body[targ_obj].x, 'x', 0), crd(body[targ_obj].y, 'y', 0));
			if (size > Math.sqrt(body[targ_obj].m)*zm){
				ctx2.strokeStyle = col;
				ctx2.lineWidth = 2;
				ctx2.beginPath();
				ctx2.moveTo(obj_cord[0], obj_cord[1]);
				ctx2.lineTo(crd(body[targ_obj].x, 'x', 0), crd(body[targ_obj].y, 'y', 0));
				ctx2.stroke();

				ctx2.lineWidth = 0.5;
				ctx2.beginPath();
				ctx2.arc(crd(body[targ_obj].x, 'x', 0), crd(body[targ_obj].y, 'y', 0), size, 0, 7);
				//ctx2.ellipse(crd(body[targ_obj].x, 'x', 0), crd(body[targ_obj].y, 'y', 0), size, size, 0, 0, 7);
				ctx2.stroke();

				ctx2.beginPath();
				ctx2.fillStyle = col;
				ctx2.arc(crd(body[targ_obj].x, 'x', 0), crd(body[targ_obj].y, 'y', 0), 3, 0, 7);
				ctx2.arc(obj_cord[0], obj_cord[1], 3, 0, 7);
				ctx2.fill();
				ctx2.beginPath();

				$('.power').css({left: mouse_coords[0]-10, top: mouse_coords[1]-30, display: 'block', color: col});
				$('.power').html((Math.round(size/zm*1000)/1000));
			} else {
				if (!mousedown){
					$('.power').css({display: 'none'});			
				}
			}		
		} else {
			$('.power').css({display: 'none'});
		}
	}

	function visual_select(mode, color, object = '') {
		obj_count = 0;
		for (let i in body){
			obj_count ++;
		}
		if (obj_count >= 1){
			del_radius = [Infinity, '', 0];
			if (!body[object]){
				del_radius[1] = select_object(mode);			
			} else {
				del_radius[1] = object;
			}

			if (switcher.del_pulse <= 5){
				switcher.del_pulse_state = true;
			} 
			if (switcher.del_pulse >= 30){
				switcher.del_pulse_state = false;
			}

			if (switcher.del_pulse_state){
				switcher.del_pulse += 1;
			}else{
				switcher.del_pulse -= 0.5;
			}

			ctx2.beginPath();
			ctx2.fillStyle = color;
			ctx2.arc((crd(body[del_radius[1]].x, 'x', 0)), (crd(body[del_radius[1]].y, 'y', 0)), Math.sqrt(body[del_radius[1]].m)*zm+switcher.del_pulse, 0, 7);
			ctx2.fill();
			ctx2.beginPath();

			col = '#fff';
			if (color.length == 4){col = color;}
			if (color.length == 5){col = color.slice(0, 4);}
			if (color.length == 7){col = color;}
			if (color.length == 9){col = color.slice(0, 8);}

			ctx2.beginPath();
			ctx2.strokeStyle = col;
			ctx2.lineWidth = 0.7;
			ctx2.arc((crd(body[del_radius[1]].x, 'x', 0)), (crd(body[del_radius[1]].y, 'y', 0)), Math.sqrt(body[del_radius[1]].m)*zm+switcher.del_pulse, 0, 7);
			ctx2.stroke();
			ctx2.beginPath();		
		}
	}

	function del_obj(obj_name_id){
		delete body[obj_name_id];
		show_obj_count();
	}

	function obj_sp(point_x,point_y,ob_col,vx,vy){
		if (obj_rand_color){
			if (!ob_col){obj_color = randColor();}else{obj_color = ob_col;};
			sessionStorage['obj_color'] = obj_color;
		};

		if (spawn){
			num ++;
			if (!point_x && !point_y){
				svx = ((mouse[0]-mouse[2])/30)*t;
				svy = ((mouse[1]-mouse[3])/30)*t;				
			}
			px = mouse[0]; py = mouse[1];
			if (((Math.abs(mouse[0]-mouse[2]) <= 5 && Math.abs(mouse[1]-mouse[3]) <= 5 && obj_cirle_orbit) || (point_x && point_y))&&body[swch.orb_obj]) {
				if (point_x && point_y){px = point_x; py = point_y;};
				R = rad(crd(px, 'x', 1), crd(py, 'y', 1), body[swch.orb_obj].x, body[swch.orb_obj].y);
				V = Math.sqrt((body[swch.orb_obj].m*10*t*t)*(R));
				a = body[swch.orb_obj].x - crd(px, 'x', 1);
				b = body[swch.orb_obj].y - crd(py, 'y', 1);
				sin = b/R; cos = a/R;
				svx = -(sin/V)*body[swch.orb_obj].m*10*t*t;
				svy = (cos/V)*body[swch.orb_obj].m*10*t*t;
				if (obj_reverse){
					svx = -svx;
					svy = -svy;
				}
				if (!body[swch.orb_obj].lck){
					svx += body[swch.orb_obj].vx;
					svy += body[swch.orb_obj].vy;
				}
			}
			if (!body[swch.orb_obj] && (point_x && point_y)){
				svx = 0; svy = 0;
				px = mouse_coords[0]; py = mouse_coords[1];
			}
			let equilib = false;
			let cff = 1.42;
			if (swch.equilib_orb){
				svx /= cff; svy /= cff;
				vx /= cff; vy /= cff;
				equilib = true;
			}
			if (vx&&vy){
				body['ast'+num] = {'x': crd(px, 'x', 1), 'y': crd(py, 'y', 1), 'vx': vx, 'vy': vy, m: obj_radius, 'lck': false, 'color': obj_color, lck: obj_lck, trace: [], main_obj: swch.orb_obj};
			}else{
				body['ast'+num] = {'x': crd(px, 'x', 1), 'y': crd(py, 'y', 1), 'vx': svx, 'vy': svy, m: obj_radius, 'lck': false, 'color': obj_color, lck: obj_lck, trace: [], main_obj: swch.orb_obj};	
			}
			if (equilib && body[swch.orb_obj]){
				vel2 = f_orbital_speed(crd(body[swch.orb_obj].x, 'x', 1), crd(body[swch.orb_obj].y, 'y', 1), ('ast'+num));
				body[swch.orb_obj].vx = vel2[0]/cff; body[swch.orb_obj].vy = vel2[1]/cff;			
				equilib = false;
			}
			spawn = false;
		}
		new_obj_param = false;
		show_obj_count();
	}

	//Прощет траэктории
	function traj_prev(obj, count = 100, col, full_object = false){
		body_traj = JSON.parse(JSON.stringify(body));
		sp_obj = [0,1];
		virt_obj = 'virtual';
		if (full_object){
			virtual = JSON.parse(JSON.stringify(obj));
			body_traj['virtual'] = JSON.parse(JSON.stringify(virtual));
		}

		if (sp_obj[0]<sp_obj[1]){
			new_obj_param = [crd(body_traj.virtual.x, 'x', 0), crd(body_traj.virtual.y, 'y', 0), body_traj.virtual.vx, body_traj.virtual.vy];
			sp_obj[0] == 10;
		}
		trash = false;
		nlock = body_traj.virtual.lck ? false : true;
		refMov = [0, 0];
		for (let i = 0; i < count && nlock; i++){
			body_traj_prev = JSON.parse(JSON.stringify(body_traj));
			for (let object in body_traj){
				//Refresh_func===============
				obj1 = body_traj_prev[object];
				if (switcher.interact == 0){
					for (let i in body_traj){
						if (i == object){continue;};
						obj2 = body_traj_prev[i];
						R = rad(obj1.x, obj1.y, obj2.x, obj2.y);
						
						a = obj2.x - obj1.x;
						b = obj2.y - obj1.y;
						sin = b/R; cos = a/R;

						if (body_traj[object]){
							vx = gravity_func(sin, cos, R, switcher.r_gm, 'vx', obj2.m);
							vy = gravity_func(sin, cos, R, switcher.r_gm, 'vy', obj2.m);

							if(!obj1.lck && !(mbut == 'move' && mousedown && object == mov_obj) && body_traj[object]){
								body_traj[object].vx += vx;
								body_traj[object].vy += vy;
							}
						}					
						if (R - (Math.sqrt(obj1.m) + Math.sqrt(obj2.m)/2) <= 0){
							if (obj1.m >= obj2.m){
								body_traj[object].color = mixColors(obj1.color, obj2.color, obj1.m, obj2.m);
								body_traj[object].m = Math.round((obj1.m + obj2.m)*1000)/1000;
								if (!obj1.lck){
									body_traj[object].vx = (obj1.m*obj1.vx+obj2.m*obj2.vx)/(obj1.m+obj2.m);//Формула абсолютно-неупругого столкновения
									body_traj[object].vy = (obj1.m*obj1.vy+obj2.m*obj2.vy)/(obj1.m+obj2.m);//Формула абсолютно-неупругого столкновения
								}
								delete body_traj[i];
								body_traj[object].trash = true;
								if (i == virt_obj){
									trash = true;
									virt_obj = object;
									nlock = obj1.lck ? false : true;
								}
								continue;
							}else{continue;}
						}
					}			
				}
				if (switcher.interact == 1 && body_traj_prev[swch.orb_obj]){
					if (object != swch.orb_obj && body_traj[object]){
						obj2 = body_traj_prev[swch.orb_obj];

						R = rad(obj1.x, obj1.y, obj2.x, obj2.y);

						a = obj2.x - obj1.x;
						b = obj2.y - obj1.y;
						sin = b/R; cos = a/R;

						if (body_traj[object]){
							vx = gravity_func(sin, cos, R, switcher.r_gm, 'vx', obj2.m);
							vy = gravity_func(sin, cos, R, switcher.r_gm, 'vy', obj2.m);

							if(!obj1.lck && !(mbut == 'move' && mousedown && object == mov_obj) && body_traj[object]){
								body_traj[object].vx += vx;
								body_traj[object].vy += vy;
							}

						}

						if(!obj1.lck && !switcher.pause2 && !(mbut == 'move' && mousedown && object == mov_obj)){
							body[object].vx += vx;
							body[object].vy += vy;
						}
					}
				}
				//End refresh_func========

				prev_x = obj1.x;
				prev_y = obj1.y;
				if(!obj1.lck && body_traj[object]){
					body_traj[object].x += body_traj[object].vx;
					body_traj[object].y += body_traj[object].vy;
				}
			}

			if (body_traj[virt_obj]){
				//ctx2.strokeStyle = col;
				//ctx2.lineWidth = 2;
				//ctx2.beginPath();
				//ctx2.moveTo(prev_x, prev_y);
				//ctx2.lineTo(body_traj[virt_obj].x + cam_x, body_traj[virt_obj].y + cam_y);
				//ctx2.stroke();
				if (swch.t_object == swch.orb_obj && body_traj[swch.orb_obj]){
					refMov[0] += body_traj[swch.orb_obj].vx;
					refMov[1] += body_traj[swch.orb_obj].vy;					
				}
				for (let ob in body_traj){
					clr = ob == virt_obj ? col[1]:col[0];
					if (body_traj[ob].trash){
						clr = '#ff666666';
					}
					ctx2.beginPath();
					ctx2.fillStyle = clr;
					ctx2.arc(crd(body_traj[ob].x-refMov[0], 'x', 0), crd(body_traj[ob].y-refMov[1], 'y', 0), 1.5, 0, 7);
					ctx2.fill();
					ctx2.beginPath();		
				}
			//ctx2.beginPath();
			//ctx2.fillStyle = col;
			//ctx2.arc(crd(body_traj[virt_obj].x, 'x', 0), crd(body_traj[virt_obj].y, 'y', 0), 1.5, 0, 7);
			//ctx2.fill();
			//ctx2.beginPath();				
			}
			
		}
	}

	//Scene scale
	document.addEventListener('wheel', function(e){
		ms = [e.clientX, e.clientY];
		if (!middleMouseDown){
			vl = 1.25;
			if (!swch.prev_t_obj && switcher.zoomToMouse){
				if (e.deltaY > 0){
					zm /= vl;
					mov[0] = mov[0] / vl - (wind_width/2 - ms[0]) / (vl/(vl-1));
					mov[1] = mov[1] / vl - (wind_height/2 - ms[1]) / (vl/(vl-1));
					mov[2] = mov[0]; mov[3] = mov[1];
				} else {
					zm *= vl
					mov[0] = mov[0] * vl + (wind_width/2 - ms[0]) / (1/(vl-1));
					mov[1] = mov[1] * vl + (wind_height/2 - ms[1]) / (1/(vl-1));
					mov[2] = mov[0]; mov[3] = mov[1];
				}
			} else {
				if (e.deltaY > 0){
					zm /= vl;
					mov[0] /= vl;
					mov[1] /= vl;
					mov[2] = mov[0]; mov[3] = mov[1];
				} else {
					zm *= vl
					mov[0] *= vl;
					mov[1] *= vl;
					mov[2] = mov[0]; mov[3] = mov[1];
				}
			}
			clear('#000');
		}
	});

	document.addEventListener('keydown', function(e){
		//console.log(e.keyCode);

		//Space button creato circle orbit object
		if (e.keyCode == 32){
			if (mbut == 'create'){
				spawn = true;
				obj_sp(mouse_coords[0], mouse_coords[1]);			
			}
			if (mbut == 'delete'){
				//$('.canvas').mousedown();
				//$('.canvas').mouseup();
				delete_obj = select_object(switcher.del_radio);
				ctx.beginPath();
				ctx.fillStyle = '#000';
				ctx.arc(body[delete_obj].x, body[delete_obj].y, Math.sqrt(body[delete_obj].m)+1, 0, 7);
				ctx.fill();
				del_obj(delete_obj);
				$('.deleted').animate({right: 50});
				timeout = setTimeout(function(){$('.deleted').animate({right: -300});}, 2000);
			}
		}
		//create
		if (e.keyCode == 67){ $('#create').mousedown(); }
		//delete
		if (e.keyCode==68){ $('#delete').mousedown(); }
		//edit
		if (e.keyCode==69){ $('#edit').mousedown(); }
		//trajectory
		if (e.keyCode == 84){ $('#trajectory').mousedown(); }
		//timedown
		if (e.keyCode == 188){ $('#timedown').mousedown(); }
		//play
		if (e.keyCode == 191){ $('#play').mousedown(); }
		//timeup
		if (e.keyCode == 190){ $('#timeup').mousedown(); }
		//move
		if (e.keyCode == 77){ $('#move').mousedown(); }
		//pause
		if (e.keyCode == 80){ $('#pause').mousedown(); }
		//help
		if (e.keyCode == 72){ $('#help').mousedown(); }
		//settings
		if (e.keyCode == 83){ $('#sim_settings').mousedown(); }
		//camera
		if (e.keyCode == 86){ $('#camera').mousedown(); }
		//Ctrl+Z
		if (e.keyCode == 90){ if(e.ctrlKey){del_obj(select_object(2)); show_obj_count();} }
		//T+
		if (e.keyCode == 187){
			ref_sped *= 2;
			console.log(ref_sped);
		}
		//T-
		if (e.keyCode == 189){
			if (ref_sped > 1){ref_sped /= 2;}
			console.log(ref_sped);
		}
		//zoom in
		if (e.keyCode == 107){
			//ctx.scale(2, 2);
			//glob_scale *= 2;
			//ctx.translate(-canv.width/4, -canv.height/4);
			zm *= 2;
			clear('#000');
		}
		//zoom out
		if (e.keyCode == 109){
			//ctx.scale(0.5, 0.5);
			//glob_scale *= 0.5;
			//ctx.translate(canv.width/2, canv.height/2);
			zm *= 0.5;
			clear('#000');
		}
	});

	$('.btn').mousedown(function(){
		//alert($(this).attr('id'));
		pfb = mbut;
		mbut = $(this).attr('id');
		if (mbut == 'clear'){
			clear('#000');
			for (let i in body){
				body[i].trace = [];
			}
			mbut = pfb;
		} else
		if (mbut == 'create'){
			if (switcher.create){
				$('.menu_options').css('display', 'none');
				switcher.create = false;
			}else{
				close_all_menus();
				switcher.create = true;
				$('.menu_options').fadeIn(0);
			}
			change_state('create');
		} else
		if (mbut == 'edit'){
			if (switcher.edit){
				$('.edit_menu').css('display', 'none');
				switcher.edit = false;
			}else{
				close_all_menus();
				switcher.edit = true;
				$('.edit_menu').fadeIn(0);
			}
			change_state('edit');
		} else
		if (mbut == 'trajectory'){
			if (switcher.traj){
				$('.traj_menu').css('display', 'none');
				switcher.traj = false;
			}else{
				close_all_menus();
				switcher.traj = true;	
				$('.traj_menu').fadeIn(0);
			}
			change_state('trajectory');
		} else
		if (mbut == 'camera'){
			if (switcher.camera){
				$('.camera_menu').css('display', 'none');
				switcher.camera = false;
			}else{
				close_all_menus();
				switcher.camera = true;
				$('.camera_menu').fadeIn(0);
			}
			change_state('camera');
		} else
		if (mbut == 'timedown'){
			mbut = pfb;
			pretime = times;
			times /= 2;
			tsw = true;
		} else
		if (mbut == 'pause'){
			mbut = pfb;
			pretime = times;
			tsw = true;
			switcher.pause = true;
			//clearInterval(simulation_refresh);
			//simulation_refresh = false;
			//$('.time_speed h2').html('T - X0');
			change_state('pause');
			try{clearTimeout(change_state_play)}catch{};
		} else
		if (mbut == 'play'){
			mbut = pfb;
			pretime = times;
			if (!switcher.pause){times = 1;}
			switcher.pause = false;
			tsw = true;
			//clearInterval(simulation_refresh);
			//simulation_refresh = setInterval(frame, speed);
			change_state('play');
			change_state_play = setTimeout(function(){change_state(pfb);}, 1000);
		} else
		if (mbut == 'timeup'){
			mbut = pfb;
			pretime = times;
			times *= 2;
			tsw = true;
		} else
		if (mbut == 'delete'){
			change_state('delete');
			
			if (switcher.delete){
				$('.del_menu_options').css('display', 'none');
				switcher.delete = false;
			}else{
				close_all_menus();
				$('.del_menu_options').fadeIn(0); 				
				switcher.delete = true;
			}
		}else
		if (mbut == 'move'){
			close_all_menus();
			change_state('move');
		}else
		if (mbut == 'refresh'){
			mbut = pfb;
			if (confirm("Это действие приведёт к обновлению страницы. Вы уверены?")){
				location.href = location;
			}
		}else
		if (mbut == 'music'){
			mbut = pfb;
			if (switcher.music){
				soundStop();
				switcher.music = false;
			} else {
				soundPlay();
				switcher.music = true;
			}
		}else
		if (mbut == 'help'){
			if (switcher.help){
				$('.help_menu').css('display', 'none');
				switcher.help = false;
			}else{
				close_all_menus();
				switcher.help = true;
				$('.help_menu').fadeIn(0);
			}
			change_state('help');
		}else
		if (mbut == 'sim_settings'){
			if (switcher.sim_settings){
				$('.sim_settings').css('display', 'none');
				switcher.sim_settings = false;			
			} else {
				close_all_menus();
				switcher.sim_settings = true;
				$('.sim_settings').fadeIn(0);
			}
			change_state('settings');
		}

		//if (pfb == 'move' || pfb == 'delete' || pfb == 'camera'){clear('#000');};
		$('#'+pfb).css({background: 'none'});
		$('#'+mbut).css({background: '#fff2'});
		if (switcher[mbut]){$('#'+mbut).css({background: '#fff8'});}
	});
	$('#'+mbut).css({background: '#fff8'});

	$('.button').mouseup(function(){
		//alert($(this).attr('id'));
		cbut = $(this).attr('id');
		if (cbut == 'select_track'){
			if (swch.s_track){
				swch.s_track = false;
			} else {
				swch.s_track = true;
			}		
		}
		if (cbut == 'clear_camera_settings'){
			clear('#000');
			swch.t_object = false;
			zm = 1;
			mov[0] = 0;
			mov[1] = 0;
			mov[2] = 0;
			mov[3] = 0;
		}
		if (cbut == 'select_edit_obj'){
			if (swch.s_edit){
				swch.s_edit = false;
			} else {
				swch.s_edit = true;
			}				
		}
		if (cbut == 'reset_speed_btn' && body[swch.edit_obj]){
			body[swch.edit_obj].vx = 0;
			body[swch.edit_obj].vy = 0;
		}
		if (cbut == 'select_main_obj'){
			switcher.sel_orb_obj = switcher.sel_orb_obj?false:true;
			mbut = switcher.sel_orb_obj?'sel_orb_obj':'create';
		}
		if (cbut == 'wrap_time'){
			pretime = times;
			times *= -1;
			t_wrap = true;
		}

	});

	function close_all_menus(e){
		$('#'+mbut).css({background: '#fff2'});
		$('.menu_options').css('display', 'none'); switcher.create = false;
		$('.del_menu_options').css('display', 'none'); switcher.delete = false;
		$('.help_menu').css('display', 'none'); switcher.help = false;
		$('.sim_settings').css('display', 'none'); switcher.sim_settings = false;
		$('.camera_menu').css('display', 'none'); switcher.camera = false;
		$('.edit_menu').css('display', 'none'); switcher.edit = false;
		$('.traj_menu').css('display', 'none'); switcher.traj = false;
		if (e){switcher[e] = true};
	}
	function change_state(img, format='png', path = '/ico/'){
		$('.state').html('<img src="'+path+img+'.'+format+'" alt="">');
	}

	$('.e0').click(function(){close_all_menus();});
	$('.e1').click(function(){close_all_menus();});

	//Cмешивение Цветов===================================
	function toHexInt(i){
	    return parseInt(i, 16);
	}

	function _mixColors(color1, color2, m1, m2){

		var color = "";
	    /*
	     * Сначала считаем среднее по красному цвету - xx---- + yy----
	     * Затем по зеленому --xx-- + --yy--
	     * И по синему ----xx + ----yy
	     */
	    for(var i = 0; i < color1.length; i += 2){
	        var partColor = Math.round((toHexInt(color1.slice(i, i+2))*m1 + toHexInt(color2.slice(i, i+2))*m2)/(m1+m2)).toString(16);

	        color += (partColor.length === 1 ? "0" + partColor : partColor);
	    }
	    return color;
	}

	function mixColors(color1, color2, m1 = 50, m2 = 50){
		var c1 = color1[0] === "#" ? color1.slice(1) : color1;
		var c2 = color2[0] === "#" ? color2.slice(1) : color2;

		return "#" + _mixColors(c1, c2, m1, m2);
	}

	function getRandomArbitrary(min, max) {
		return Math.random() * (max - min) + min;
	}

	$('.col_select').on('change', function(){
		this.value = obj_color;
	});

	function randColor() {
		var r = Math.floor(getRandomArbitrary(40, 255)),
			g = Math.floor(getRandomArbitrary(40, 255)),
			b = Math.floor(getRandomArbitrary(40, 255));

		r = r.toString(16); g = g.toString(16); b = b.toString(16);

		r = r.length < 2 ? '0'+r.toString(16) : r.toString(16);
		g = g.length < 2 ? '0'+g.toString(16) : g.toString(16);
		b = b.length < 2 ? '0'+b.toString(16) : b.toString(16);
		color = '#' + r + g + b;
		//$('#col_select').attr({'value': color});
		$('.div_col_select').html('<input type=color class=col_select value='+color+
			' id=col_select onchange="obj_color = this.value; sessionStorage[\'obj_color\'] = this.value;"\
			 style="padding: 0; border: none; width: 76px; height: 30px;" onmouseout="this.blur();">');
		return color;
	}

	//=====================================================

	var audio = new Audio(); // Создаём новый элемент Audio
	audio.src = '/music/music1.mp3'; // Указываем путь к звуку "клика"
	audio.loop = true;

	function soundPlay() {
		audio.play();
	}
	function soundStop() {
		audio.pause();
	}

	if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
		//$('.').css({width: , height: });
		switcher.device = 'mobile';
		if (window.innerHeight > window.innerWidth){
			$('body').css({'font-size': 40});
			$('.btn').css({'height': 100, 'width': 130});
			$('.btn img').css({'max-width': 65, 'max-height': 65});
			$('.menu_pos').css({top: 0, left: 139});
			$('.menu').css({'flex-direction': 'column'});
			$('.time_speed').css({left: 10, bottom: 80});
			$('.state').css({top: 10});
			$('.checkbox').css({width: 75, height: 75});
			$('.radius_select').css({'font-size': 50, width: 200, 'border-radius': 10});
			$('.col_select').css({width: 200, height: 60, 'border-radius': 10});
			//$('.menu_pos_size').css({'border-bottom-right-radius': 50});
		} else {
			$('.time_speed').css({right: 10, top: 130});
			$('.menu_pos').css({top: $('.menu').outerHeight() , left: 0});
		}
	  } else {
	  	$('.time_speed').css({right: 10, top: 130});
	  	$('.menu_pos').css({top: $('.menu').outerHeight() , left: 0});
	}
});