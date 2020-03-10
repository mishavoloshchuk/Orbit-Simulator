$('document').ready(function(){
	var canv = document.getElementById('canvas');
	var ctx = canv.getContext('2d');
	canv.width = window.innerWidth;
	canv.height = window.innerHeight;
	mouse = [];
	mouse_coords = [];
	mbut = 'create';
	cbut = '';
	pfb = mbut;
	swt = false;
	traj = true;
	mov_obj = '';

	cam_x = 0;
	cam_y = 0;
	prev_cam_x = 0;
	prev_cam_y = 0;
	anim_cam = [0, 0, true];

	body = {
		'earth': {'x':window.innerWidth/2, 'y': window.innerHeight/2, 'vx': 0, 'vy': 0, m: 1000, 'color': '#ffff00', 'lck': true},
		//'earth2': {'x':0, 'y': window.innerHeight/2, 'vx': 1, 'vy': 3, m: 100, 'color': '#ffff00', 'lck': false},
	};

	earth_lck = body.earth;

	let obj_count = 0;

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
		del_pulse: 10, del_pulse_state: false, pause: false, trajectory_ref: false, music: false,
		obj_count: obj_count, help: false, f_speed: 0, f_need_speed: false, device: 'desktop',
		sim_settings: false, gravit_mode: 1, r_gm: 1, interact: 0, ref_interact: 0,
		lost_x: false, lost_y: false, camera: false};

	swch = {s_track: false, t_object: false, prev_t_obj: false, vis_traj: false};

	if (sessionStorage['gravit_mode']){
		switcher.gravit_mode = sessionStorage['gravit_mode'];
	};

	if (sessionStorage['interact']){
		switcher.interact = sessionStorage['interact'];
	};

	radio_select('gravit_mode_radio', switcher.gravit_mode);
	radio_select('interact_radio', switcher.interact);

	show_obj_count();

	function radio_select(radio_id_prefix, numb){
		$('#'+radio_id_prefix+'_'+numb).attr('checked', '');	
	}
	//====time====
	t = 1;
	times = 1;
	tsw = false;
	pretime = 1;
	$('.time_speed h2').html('Скорость времени: X'+t);
	//======
	obj_color = sessionStorage['obj_color'] ? sessionStorage['obj_color'] : '#FFFFFF';
	obj_rand_color = sessionStorage['obj_rand_color'] ? (sessionStorage['obj_rand_color'] == 'true' ? true : false) : true;
	obj_radius = sessionStorage['obj_radius'] ? +sessionStorage['obj_radius'] : Math.round(getRandomArbitrary(0.1, 10)*10)/10;
	obj_reverse = sessionStorage['obj_reverse'] ? (sessionStorage['obj_reverse'] == 'true' ? true : false) : false;
	obj_cirle_orbit = sessionStorage['obj_cirle_orbit'] ? (sessionStorage['obj_cirle_orbit'] == 'true' ? true : false) : true;

	earth_lck.lck = sessionStorage['master_object_lock'] == "false" ? false : true;

	usr_object = {obj_color, obj_radius, obj_reverse, obj_cirle_orbit};

	$('.col_select').attr('value', obj_color);
	$('.radius_select').attr('value', obj_radius);
	if (obj_reverse){$('.direction_reverse_select').attr('checked', 'on');};
	if (obj_cirle_orbit){$('.orbit_select').attr('checked', 'on');};
	if (obj_rand_color){$('.rand_col_select').attr('checked', 'on');};
	if (earth_lck.lck){$('.master_object_lock').attr('checked', 'on');};

	change_state(mbut);

	//speed = 16;
	//let simulation_refresh = setInterval(frame, speed);
	window.requestAnimationFrame(frame);

	G = 0.05;
	mousedown = false;
	spawn = false;
	num = 0;
	mpos = [];
	del = false;
	body_prev = {};

	function clear(col = '#00000004'){
		if (!traj){col = '#000';}
		ctx.fillStyle = col;
		//ctx.beginPath();
		ctx.fillRect(0, 0, canv.width, canv.height);
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

	$('#canvas').mousedown(function(){
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
			mov_radius = [Infinity, '', 0];
			for (let i in body){
				r = rad(mouse_coords[0], mouse_coords[1], body[i].x + cam_x, body[i].y + cam_y);
				if (r < mov_radius[0]){
					mov_radius[0] = r;
					mov_radius[1] = i;
				}
			}
			mov_obj = mov_radius[1];
			delete mov_radius;
		}

		if (body[mov_obj]){
			mpos[2] = body[mov_obj].x; mpos[3] = body[mov_obj].y; //Координаты перемещяемого объекта
			mpos[4] = body[mov_obj].vx; mpos[5] = body[mov_obj].vy;	// Вектор перемещяемого объекта
			body[mov_obj].vx = 0; body[mov_obj].vy = 0;
		}
	});
	$('#canvas').mouseup(function(e){
		$('.power').css({display: 'none'});
		$('.power_need').css({display: 'none'});
		if (switcher.device == 'mobile'){
			close_all_menus();
		}
		switcher.f_need_speed = false;
		mousedown = false;
		mouse[2] = event.clientX; mouse[3] = event.clientY;

		if (mbut == 'delete'){
			del_radius = [Infinity, '', 0];
			if (switcher.del_radio == 2){
				elem = '';
				for (i in body){
					elem = i;
				}
				del_radius[1] = elem;
			}else{
				for (let i in body){
					r = rad(mouse_coords[0], mouse_coords[1], body[i].x + cam_x, body[i].y + cam_y);
					if (r < del_radius[0] && switcher.del_radio == 0){
						del_radius[0] = r;
						del_radius[1] = i;
					} else 
					if (r > del_radius[2] && switcher.del_radio == 1){
						del_radius[2] = r;
						del_radius[1] = i;
					}
				}
			}

			ctx.beginPath();
			ctx.fillStyle = '#000';
			ctx.arc(body[del_radius[1]].x, body[del_radius[1]].y, Math.sqrt(body[del_radius[1]].m)+1, 0, 7);
			ctx.fill();

			delete body[del_radius[1]];

			console.log('Удален!');
			$('.deleted').animate({right: 50});
			timeout = setTimeout(function(){$('.deleted').animate({right: -300});}, 2000);
		}

		if (mbut == 'move' && body[mov_obj]){
			body[mov_obj].vx = mpos[4];
			body[mov_obj].vy = mpos[5];
			mov_obj = '';
		}

		if (switcher.lost_x && switcher.lost_y){		
			ctx.strokeStyle = '#000';
			ctx.lineWidth = Math.sqrt(obj_radius)*2+1;
			ctx.beginPath();
			ctx.moveTo(mouse[0], mouse[1]);
			ctx.lineTo(switcher.lost_x, switcher.lost_y);
			ctx.stroke();
		}

		if (mbut == 'create'){
			//if (!switcher.pause){simulation_refresh = setInterval(frame, speed);};
			spawn = true;
			swch.vis_traj = false;
			obj_sp(false, false, obj_color);

			switcher.trajectory_ref = false;
			ctx.beginPath();
			ctx.fillStyle = obj_color;
			ctx.arc(mpos[0], mpos[1], Math.sqrt(obj_radius), 0, 7);
			ctx.fill();
		}

		if (mbut == 'camera' && swch.s_track){
			mod = 0;
			obj_cam = [Infinity, '', 0];
			if (mod == 2){
				elem = '';
				for (i in body){
					elem = i;
				}
				obj_cam[1] = elem;
			}else{
				for (let i in body){
					r = rad(mouse_coords[0], mouse_coords[1], body[i].x + cam_x, body[i].y + cam_y);
					if (r < obj_cam[0] && mod == 0){
						obj_cam[0] = r;
						obj_cam[1] = i;
					} else 
					if (r > obj_cam[2] && mod == 1){
						obj_cam[2] = r;
						obj_cam[1] = i;
					}
				}
			}

			ctx.beginPath();
			ctx.fillStyle = '#000';
			ctx.arc(body[del_radius[1]].x, body[del_radius[1]].y, Math.sqrt(body[del_radius[1]].m)+1, 0, 7);
			ctx.fill();

			swch.t_object = obj_cam[1];	
			swch.s_track = false;	
		}

		show_obj_count();
		//clear('#000');

		//mouse = [];
	});

	document.onmousemove = function(){

		switcher.move = false;
		if (mousedown && mbut == 'move' && mov_obj){
			switcher.move = true;
			if (body[mov_obj]){
				body[mov_obj].x = event.clientX - mpos[0] + mpos[2];
				body[mov_obj].y = event.clientY - mpos[1] + mpos[3];				
			}
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
		body_prev = JSON.parse(JSON.stringify(body));

		if (mbut == 'delete' || switcher.move || mbut == 'move' || mbut == 'camera' || swch.vis_traj){clear('#000');}else{if(!switcher.trajectory_ref){clear();};}

		visual_trajectory();

		if (switcher.interact != switcher.ref_interact){
			switcher.ref_interact = switcher.interact;
		}
		if (switcher.r_gm != switcher.gravit_mode){
			switcher.r_gm = switcher.gravit_mode;
		}

		if (tsw){
			$('.time_speed h2').html('Скорость времени: X'+t);
			for (let i in body){
				c = times/pretime;
				body[i].vx *= c;
				body[i].vy *= c;
			}
			tsw = false;
		}
		//Анимация перехода камеры
		if (swch.t_object != swch.prev_t_obj){
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
				switcher.pause = false; //Снимается пауза
			}
		}

		prev_cam_x = cam_x;
		prev_cam_y = cam_y;

		if (swch.prev_t_obj && body[swch.prev_t_obj]){
			cam_x = (window.innerWidth / 2) - (body[swch.prev_t_obj].x + body[swch.prev_t_obj].vx) + anim_cam[0];
			cam_y = (window.innerHeight / 2) - (body[swch.prev_t_obj].y + body[swch.prev_t_obj].vy) + anim_cam[1];		
		} else {
			cam_x = 0 + anim_cam[0];
			cam_y = 0 + anim_cam[1];
		}

		for (let i in body){	
			refresh(i);
			//body = JSON.parse(JSON.stringify(body_prev));
		}

		if (mbut == 'delete'){
			visual_select(switcher.del_radio, '#f006');
		}

		if (mbut == 'camera' && cbut == 'select_track' && swch.s_track){
			visual_select(0, '#0af6');
		}

		if (mbut == 'move'){
			visual_select(0, '#bbb6', mov_obj);
		}
	}

	function refresh(object){
		obj = body_prev[object];
		if(switcher.ref_interact == 0 && !switcher.pause){
			for (let i in body){
				if (i == object){continue;};
				obj2 = body_prev[i];

				R = rad(obj.x, obj.y, obj2.x, obj2.y);
				
				a = obj2.x - obj.x;
				b = obj2.y - obj.y;
				sin = b/R; cos = a/R;

				vx = gravity_func(sin, cos, R, switcher.r_gm, 'vx');
				vy = gravity_func(sin, cos, R, switcher.r_gm, 'vy');

				if (R - (Math.sqrt(obj.m) + Math.sqrt(obj2.m)/2) <= 0){
					if (obj.m >= obj2.m){
						body[object].color = mixColors(body[object].color, obj2.color, body[object].m, obj2.m);
						body[object].m += obj2.m;
						if (!obj.lck){
							body[object].vx = (obj.m*obj.vx+obj2.m*obj2.vx)/(obj.m+obj2.m);//Формула абсолютно-неупругого столкновения
							body[object].vy = (obj.m*obj.vy+obj2.m*obj2.vy)/(obj.m+obj2.m);//Формула абсолютно-неупругого столкновения
							//((body[object].m * body[object].vx)+(obj2.m * obj2.vx))/(obj2.m+body[object].m);
							//((body[object].m * body[object].vy)+(obj2.m * obj2.vy))/(obj2.m+body[object].m);
						}

						delete body[i];
						show_obj_count();
						continue;
					}else{
						continue;

					}
				}
				if(!obj.lck && !switcher.pause && !(mbut == 'move' && mousedown && object == mov_obj)){
					body[object].vx += vx;
					body[object].vy += vy;
				}	
			}
		}
		if (switcher.ref_interact == 1 && body_prev['earth'] && !switcher.pause){
			if (object != 'earth'){
				obj2 = body_prev['earth'];

				R = rad(obj.x, obj.y, obj2.x, obj2.y);

				a = obj2.x - obj.x;
				b = obj2.y - obj.y;
				sin = b/R; cos = a/R;

				vx = gravity_func(sin, cos, R, switcher.r_gm, 'vx', body_prev[object].m);
				vy = gravity_func(sin, cos, R, switcher.r_gm, 'vy', body_prev[object].m);

				if (R - (Math.sqrt(obj.m) + Math.sqrt(obj2.m)/2) <= 0){
					if (obj.m >= obj2.m){
						body[object].color = mixColors(body[object].color, obj2.color, body[object].m, obj2.m);
						body[object].m += obj2.m;
						if (!obj.lck){
							body[object].vx = ( obj.m*obj.vx + obj2.m*obj2.vx )/( obj.m + obj2.m );//Формула абсолютно-неупругого столкновения
							body[object].vy = ( obj.m*obj.vy + obj2.m*obj2.vy )/( obj.m + obj2.m );//Формула абсолютно-неупругого столкновения
							//((body[object].m * body[object].vx)+(obj2.m * obj2.vx))/(obj2.m+body[object].m);
							//((body[object].m * body[object].vy)+(obj2.m * obj2.vy))/(obj2.m+body[object].m);
						}
						delete body[i];
						show_obj_count();
						//

					}else{
						//
					}
				}
				if(!obj.lck && !switcher.pause && !(mbut == 'move' && mousedown && object == mov_obj)){
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

		//ctx.beginPath();
		//ctx.fillStyle = '#0005';
		//ctx.arc(obj.x, obj.y, Math.sqrt(obj.m), 0, 7);
		//ctx.fill();
		//cam_x = 0;
		//cam_y = 0;
		if (!switcher.pause){
			prev_x = body[object].x + prev_cam_x;
			prev_y = body[object].y + prev_cam_y;

			if(!obj.lck && !switcher.pause){
				body[object].x += body[object].vx;
				body[object].y += body[object].vy;
			}

			if (swch.prev_t_obj != object){
				ctx.beginPath();
				ctx.fillStyle = obj.color;
				ctx.arc(prev_x, prev_y, Math.sqrt(obj.m), 0, 7);
				ctx.fill();

				ctx.strokeStyle = body[object].color;
				ctx.lineWidth = Math.sqrt(body[object].m)*2;
				ctx.beginPath();
				ctx.moveTo(prev_x, prev_y);
				ctx.lineTo(body[object].x + cam_x, body[object].y + cam_y);
				ctx.stroke();			
			}
		}

		ctx.beginPath();
		if (!obj.color){obj.color = 'gray';}
		ctx.fillStyle = obj.color;
		ctx.arc(body[object].x + cam_x, body[object].y + cam_y, Math.sqrt(obj.m), 0, 7);
		ctx.fill();
		//console.log(R);
		//arr = Object.keys(body);
		//ctx.beginPath();
	};

	function gravity_func(sin, cos, R, func_num, dir, mass, user_func){
		//Обратно-пропорционально квадрату расстояния
		if (func_num == 1){
			kff = obj2.m*10*t*t;
			vx = kff*(cos/(R*R));//(obj2.x-obj.x)/10000;//~1;
			vy = kff*(sin/(R*R));//(obj2.y-obj.y)/10000;//~-0.522;
		}
		//Обранто-пропорционально кубу расстояния
		if (func_num == 0){
			kff = obj2.m*1000*t*t;
			vx = kff*(cos/(R*R*R));
			vy = kff*(sin/(R*R*R));
		}
		//Обранто-пропорционально расстоянию
		if (func_num == 2){
			kff = obj2.m*0.1*t*t;
			vx = kff*(cos/R);
			vy = kff*(sin/R);
		}
		//Постоянное притяжение
		if (func_num == 3){
			kff = obj2.m*0.001*t*t;
			vx = kff*(cos);
			vy = kff*(sin);
		}
		//Пропорционально расстоянию
		if (func_num == 4){
			kff = obj2.m*0.00001*t*t;
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
		if (mousedown && mbut == 'create'){
			//clear('#000');
			if (!(Math.abs(mouse[0]-mouse_coords[0]) <= 5 && Math.abs(mouse[1]-mouse_coords[1]) <= 5)){
				clear('#000000');
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
			ctx.strokeStyle = obj_color;
			ctx.lineWidth = Math.sqrt(obj_radius)*2;
			ctx.beginPath();
			ctx.moveTo(mouse[0], mouse[1]);
			ctx.lineTo(mouse_coords[0], mouse_coords[1]);
			ctx.stroke();

			ctx.strokeStyle = '#000a';
			ctx.lineWidth = Math.sqrt(obj_radius)*2;
			ctx.beginPath();
			ctx.moveTo(mouse[0], mouse[1]);
			ctx.lineTo(mouse_coords[0], mouse_coords[1]);
			ctx.stroke();
			switcher.lost_x = mouse_coords[0];
			switcher.lost_y = mouse_coords[1];

			ctx.beginPath();
			ctx.fillStyle = obj_color;
			ctx.arc(mpos[0], mpos[1], Math.sqrt(obj_radius), 0, 7);
			ctx.fill();
		}
	}

	function f_orbital_speed(px, py, obj){
		if (obj){
			R = rad(px, py, body.earth.x, body.earth.y);
			V = Math.sqrt((body.earth.m*10*t*t)*(R));
			a = body.earth.x - px;
			b = body.earth.y - py;
			sin = b/R; cos = a/R;
			svx = -(sin/V)*body.earth.m*10*t*t;
			svy = (cos/V)*body.earth.m*10*t*t;
			return [svx/t, svy/t];		
		} else {
			return [0, 0];
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
				if (mode == 2){
					elem = '';
					for (i in body){
						elem = i;
					}
					del_radius[1] = elem;
				}else{
					for (let i in body){
						r = rad(mouse_coords[0], mouse_coords[1], body[i].x + cam_x, body[i].y + cam_y);
						if (r < del_radius[0] && mode == 0){
							del_radius[0] = r;
							del_radius[1] = i;
						} else 
						if (r > del_radius[2] && mode == 1){
							del_radius[2] = r;
							del_radius[1] = i;
						}
					}
				}			
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

			ctx.beginPath();
			ctx.fillStyle = color;
			ctx.arc(body[del_radius[1]].x + cam_x, body[del_radius[1]].y + cam_y, Math.sqrt(body[del_radius[1]].m)+switcher.del_pulse, 0, 7);
			ctx.fill();
			ctx.beginPath();			
		}
	}

	function obj_sp(point_x,point_y,ob_col){
		if (obj_rand_color){
			if (!ob_col){obj_color = randColor();}else{obj_color = ob_col;};
			sessionStorage['obj_color'] = obj_color;
		};
		if (spawn){
			show_obj_count();
			num ++;
			if (!point_x && !point_y){
				svx = ((mouse[0]-mouse[2])/30)*t;
				svy = ((mouse[1]-mouse[3])/30)*t;				
			}
			px = mouse[0]; py = mouse[1];
			if (((Math.abs(mouse[0]-mouse[2]) <= 5 && Math.abs(mouse[1]-mouse[3]) <= 5 && obj_cirle_orbit) || (point_x && point_y))&&body.earth) {
				if (point_x && point_y){px = point_x; py = point_y;};
				R = rad(px, py, body.earth.x, body.earth.y);
				V = Math.sqrt((body.earth.m*10*t*t)*(R));
				a = body.earth.x - px;
				b = body.earth.y - py;
				sin = b/R; cos = a/R;
				svx = -(sin/V)*body.earth.m*10*t*t;
				svy = (cos/V)*body.earth.m*10*t*t;
				if (obj_reverse){
					svx = -svx;
					svy = -svy;
				}
			}
			if (!body.earth && (point_x && point_y)){
				svx = 0; svy = 0;
				px = mouse_coords[0]; py = mouse_coords[1];
			}
			body['ast'+num] = {'x': px - cam_x, 'y': py - cam_y, 'vx': svx, 'vy': svy, m: obj_radius, 'lck': false, 'color': obj_color};
			spawn = false;
		}
	}
	scale = 1;

	//Scene scale
	//document.addEventListener('wheel', function(e){
	//	if (e.deltaY > 0){
	//		scale += 0.2;
	//	} else {
	//		scale -= 0.2;
	//	}
	//	ctx.scale(scale, scale);
	//});

	document.addEventListener('keydown', function(e){
		//console.log(e.keyCode);

		//delete
		if (e.keyCode==68){
			$('#delete').mousedown();
		};

		//Space button creato circle orbit object
		if (e.keyCode == 32){
			if (mbut == 'create'){
				spawn = true;
				obj_sp(mouse_coords[0], mouse_coords[1]);				
			}
			if (mbut == 'delete'){
				$('#canvas').mousedown();
				$('#canvas').mouseup();
			}
		}

		//create
		if (e.keyCode == 67){
			$('#create').mousedown();
		}

		//timedown
		if (e.keyCode == 188){
			$('#timedown').mousedown();
		}

		//play
		if (e.keyCode == 191){
			$('#play').mousedown();
		}

		//timeup
		if (e.keyCode == 190){
			$('#timeup').mousedown();
		}

		//move
		if (e.keyCode == 77){
			$('#move').mousedown();
		}

		//pause
		if (e.keyCode == 80){
			$('#pause').mousedown();
		}

		//help
		if (e.keyCode == 72){
			$('#help').mousedown();
		}

		//settings
		if (e.keyCode == 83){
			$('#sim_settings').mousedown();
		}

		//camera
		if (e.keyCode == 86){
			$('#camera').mousedown();
		}
	});

	$('.btn').mousedown(function(){
		//alert($(this).attr('id'));
		pfb = mbut;
		mbut = $(this).attr('id');
		if (mbut == 'clear'){
			clear('#000');
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
		if (mbut == 'trajectory'){
			if (traj){
				traj = false;
			}else{
				traj = true;
			}
			mbut = pfb;	
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
			//$('.time_speed h2').html('Скорость времени: X0');
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

		if (pfb == 'move' || pfb == 'delete' || pfb == 'camera'){clear('#000');};

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
			swch.t_object = false;		
		}

	});

	function close_all_menus(e){
		$('#'+mbut).css({background: '#fff2'});
		$('.menu_options').css('display', 'none'); switcher.create = false;
		$('.del_menu_options').css('display', 'none'); switcher.delete = false;
		$('.help_menu').css('display', 'none'); switcher.help = false;
		$('.sim_settings').css('display', 'none'); switcher.sim_settings = false;
		$('.camera_menu').css('display', 'none'); switcher.camera = false;
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
			$('.time_speed').css({right: 10, top: 10});
		}
	  } else {
	  	$('.time_speed').css({right: 10, top: 10});
	}
});