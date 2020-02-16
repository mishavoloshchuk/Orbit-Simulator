$('document').ready(function(){
	var canv = document.getElementById('canvas');
	var ctx = canv.getContext('2d');
	canv.width = window.innerWidth;
	canv.height = window.innerHeight;
	mouse = [];
	mouse_coords = [];
	mbut = 'create';
	pfb = mbut;
	swt = false;
	traj = true;

	body = {
		'earth': {'x':window.innerWidth/2, 'y': window.innerHeight/2, 'vx': 0, 'vy': 0, m: 1000, 'color': '#ffff00', 'lck': true},
		//'earth2': {'x':0, 'y': window.innerHeight/2, 'vx': 1, 'vy': 0, m: 1000, 'color': '#ffff00', 'lck': false},
	};

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
		obj_count: obj_count, help: false, f_speed: 0, f_need_speed: false};

	show_obj_count();
	//====time====
	t = 1;
	times = 1;
	tsw = false;
	pretime = 1;
	$('.time_speed h2').html('Скорость времени: X'+t);
	//======
	obj_color = sessionStorage['obj_color'] ? sessionStorage['obj_color'] : '#FFFFFF';
	obj_rand_color = sessionStorage['obj_rand_color'] ? (sessionStorage['obj_rand_color'] == 'true' ? true : false) : false;
	obj_radius = sessionStorage['obj_radius'] ? +sessionStorage['obj_radius'] : 20;
	obj_reverse = sessionStorage['obj_reverse'] ? (sessionStorage['obj_reverse'] == 'true' ? true : false) : false;
	obj_cirle_orbit = sessionStorage['obj_cirle_orbit'] ? (sessionStorage['obj_cirle_orbit'] == 'true' ? true : false) : true;

	usr_object = {obj_color, obj_radius, obj_reverse, obj_cirle_orbit};

	$('.col_select').attr('value', obj_color);
	$('.radius_select').attr('value', obj_radius);
	if (obj_reverse){$('.direction_reverse_select').attr('checked', 'on');};
	if (obj_cirle_orbit){$('.orbit_select').attr('checked', 'on');};
	if (obj_rand_color){$('.rand_col_select').attr('checked', 'on');};

	change_state(mbut);

	speed = 1.6;
	let simulation_refresh = setInterval(frame, speed);

	G = 0.05;
	mousedown = false;
	spawn = false;
	num = 0;
	mpos = [];
	del = false;
	body_prev = {};

	function clear(col = '#00000002'){
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

	$('#canvas').mousedown(function(){
		//console.log(body.moon.vx+'  '+body.moon.vy);
		mousedown = true;
		mpos[0] = event.clientX; mpos[1] = event.clientY;
		mpos[2] = body.earth.x; mpos[3] = body.earth.y;
		mouse[0] = event.clientX; mouse[1] = event.clientY;
		//if (mbut == 'create'){
		//	clearInterval(simulation_refresh);
		//}
		if (mbut == 'create'){
			switcher.trajectory_ref = true;
			if (obj_rand_color){
				obj_color = randColor();
			};		
			switcher.f_speed = f_orbital_speed(mouse[0], mouse[1]);
			$('.power_need').html("*Для круговой орбиты, нужно примерно: "+ Math.round(Math.sqrt(switcher.f_speed[0]*switcher.f_speed[0] + switcher.f_speed[1]*switcher.f_speed[1])*30)+"*");
		};
	});
	$('#canvas').mouseup(function(){
		$('.power').css({display: 'none'});
		$('.power_need').css({display: 'none'});
		switcher.f_need_speed = false;
		mousedown = false;
		mouse[2] = event.clientX; mouse[3] = event.clientY;
		if (mbut == 'create'){
			spawn = true;
			obj_sp(false, false, obj_color);
			//if (!switcher.pause){simulation_refresh = setInterval(frame, speed);};
		}

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
					r = rad(mouse_coords[0], mouse_coords[1], body[i].x, body[i].y);
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
			timeout = setTimeout(function(){$('.deleted').animate({right: -150});}, 2000);
		}

		ctx.strokeStyle = '#000';
		ctx.lineWidth = Math.sqrt(obj_radius)*2+1;
		ctx.beginPath();
		ctx.moveTo(mouse[0], mouse[1]);
		ctx.lineTo(mouse[2], mouse[3]);
		ctx.stroke();

		if (mbut == 'create'){
			switcher.trajectory_ref = false;
			ctx.beginPath();
			ctx.fillStyle = obj_color;
			ctx.arc(mpos[0], mpos[1], Math.sqrt(obj_radius), 0, 7);
			ctx.fill();
		}

		show_obj_count();
		//clear('#000');

		//mouse = [];
	});

	document.onmousemove = function(){

		switcher.move = false;
		if (mousedown && mbut == 'move'){
			switcher.move = true;
			body.earth.x = event.clientX - mpos[0] + mpos[2];
			body.earth.y = event.clientY - mpos[1] + mpos[3];
		}

		mouse_coords[0] = event.clientX;
		mouse_coords[1] = event.clientY;

		if (mousedown && mbut == 'create'){
			//clear('#000');
			if (switcher.trajectory_ref && !(Math.abs(mouse[0]-mouse_coords[0]) <= 5 && Math.abs(mouse[1]-mouse_coords[1]) <= 5)){
				clear('#000000');
				$('.power').css({left: mouse_coords[0]-10, top: mouse_coords[1]-30, display: 'block', color: obj_color});
				$('.power').html(Math.round(rad(mouse[0], mouse[1], mouse_coords[0], mouse_coords[1])));
				if (!switcher.f_need_speed){
					$('.power_need').css({display: 'block'});
					switcher.f_need_speed = true;
					console.log(123);
				};
			}

			for (let i in body){
				ctx.beginPath();
				if (!body[i].color){body[i].color = 'gray';}
				ctx.fillStyle = body[i].color;
				ctx.arc(body[i].x, body[i].y, Math.sqrt(body[i].m), 0, 7);
				ctx.fill();
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

			ctx.beginPath();
			ctx.fillStyle = obj_color;
			ctx.arc(mpos[0], mpos[1], Math.sqrt(obj_radius), 0, 7);
			ctx.fill();
		}
	};

	function rad(x1, y1, x2, y2){
		a = x1 - x2; b = y1 - y2;
		return Math.sqrt(a*a + b*b);
	};

	function gipot(a,b){return Math.sqrt(a*a + b*b);}

	function frame(){
		t = times;
		body_prev = JSON.parse(JSON.stringify(body));

		if (mbut == 'delete' || switcher.move || mbut == 'move'){clear('#000');}else{if(!switcher.trajectory_ref){clear();};}
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
					r = rad(mouse_coords[0], mouse_coords[1], body[i].x, body[i].y);
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
			ctx.fillStyle = '#f006';
			ctx.arc(body[del_radius[1]].x, body[del_radius[1]].y, Math.sqrt(body[del_radius[1]].m)+switcher.del_pulse, 0, 7);
			ctx.fill();
		}
		for (let i in body){	
			if (tsw){
				$('.time_speed h2').html('Скорость времени: x'+t);
				for (let i in body){
					c = times/pretime;
					body[i].vx *= c;
					body[i].vy *= c;
				}
				tsw = false;
			}
			refresh(i);
			//body = JSON.parse(JSON.stringify(body_prev));
		}
	}

	function refresh(object){
		obj = body_prev[object];
		for (let i in body){
			if (i == object){continue;};
			obj2 = body_prev[i];

			//alert(object+';'+i);

			R = rad(obj.x, obj.y, obj2.x, obj2.y);
			//alert(R);

			if (R - (Math.sqrt(obj.m) + Math.sqrt(obj2.m)/2) <= 0){
				if (obj.m >= obj2.m){
					body[object].color = mixColors(body[object].color, obj2.color, body[object].m, obj2.m);
					body[object].m += obj2.m;
					if (!obj.lck){
						body[object].vx = ((body[object].m * body[object].vx)+(obj2.m * obj2.vx))/(obj2.m+body[object].m);//(body[object].vx + obj2.vx)*(obj2.m/body[object].m);
						body[object].vy = ((body[object].m * body[object].vy)+(obj2.m * obj2.vy))/(obj2.m+body[object].m);//(body[object].vy + obj2.vy)*(obj2.m/body[object].m);
					}
					delete body[i];

					show_obj_count();

					continue;
				}else{
					continue;
				}

			}

			a = obj2.x - obj.x;
			b = obj2.y - obj.y;
			sin = b/R; cos = a/R;

			kff = obj2.m*10*t*t;
			vx = kff*(cos/(R*R));//(obj2.x-obj.x)/10000;//~1;
			vy = kff*(sin/(R*R));//(obj2.y-obj.y)/10000;//~-0.522;
			if(!obj.lck && !switcher.pause){
				body[object].vx += vx;
				body[object].vy += vy;
			}	
		}

		//ctx.beginPath();
		//ctx.fillStyle = '#0005';
		//ctx.arc(obj.x, obj.y, Math.sqrt(obj.m), 0, 7);
		//ctx.fill();

		if (!switcher.pause){
			prev_x = body[object].x;
			prev_y = body[object].y;

			body[object].x += body[object].vx;
			body[object].y += body[object].vy;

			ctx.strokeStyle = body[object].color;
			ctx.lineWidth = Math.sqrt(body[object].m)*2;
			ctx.beginPath();
			ctx.moveTo(prev_x, prev_y);
			ctx.lineTo(body[object].x, body[object].y);
			ctx.stroke();
		}

		ctx.beginPath();
		if (!obj.color){obj.color = 'gray';}
		ctx.fillStyle = obj.color;
		ctx.arc(body[object].x, body[object].y, Math.sqrt(obj.m), 0, 7);
		ctx.fill();
		//console.log(R);
		//arr = Object.keys(body);
		ctx.beginPath();
	};

	function f_orbital_speed(px, py){
		R = rad(px, py, body.earth.x, body.earth.y);
		V = Math.sqrt((body.earth.m*10*t*t)*(R));
		a = body.earth.x - px;
		b = body.earth.y - py;
		sin = b/R; cos = a/R;
		svx = -(sin/V)*body.earth.m*10*t*t;
		svy = (cos/V)*body.earth.m*10*t*t;
		return [svx, svy];
	}

	function obj_sp(point_x,point_y,ob_col){
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
			if ((Math.abs((mouse[0]-mouse[2]) <= 5 && Math.abs(mouse[1]-mouse[3]) <= 5) && obj_cirle_orbit) || (point_x && point_y)) {
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
			body['ast'+num] = {'x': px, 'y': py, 'vx': svx, 'vy': svy, m: obj_radius, 'lck': false, 'color': obj_color};
			spawn = false;
		}
	}

	document.addEventListener('keydown', function(e){
		//console.log(e.keyCode);

		//delete
		if (e.keyCode==68){
			$('#delete').mouseup();
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
			$('#create').mouseup();
		}

		//timedown
		if (e.keyCode == 188){
			$('#timedown').mouseup();
		}

		//play
		if (e.keyCode == 191){
			$('#play').mouseup();
		}

		//timeup
		if (e.keyCode == 190){
			$('#timeup').mouseup();
		}

		//move
		if (e.keyCode == 77){
			$('#move').mouseup();
		}

		//pause
		if (e.keyCode == 80){
			$('#pause').mouseup();
		}

		//help
		if (e.keyCode == 72){
			$('#help').mouseup();
		}
	});

	$('.btn').mouseup(function(){
		//alert($(this).attr('id'));
		pfb = mbut;
		mbut = $(this).attr('id');
		if (mbut == 'clear'){
			clear('#000');
			mbut = pfb;
		} else
		if (mbut == 'create'){
			if (pfb == 'delete'){clear('#000');};
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
		if (mbut == 'timedown' && simulation_refresh){
			mbut = pfb;
			pretime = times;
			times /= 2;
			tsw = true;
		} else
		if (mbut == 'pause' && simulation_refresh){
			mbut = pfb;
			pretime = times;
			tsw = true;
			switcher.pause = true;
			//clearInterval(simulation_refresh);
			//simulation_refresh = false;
			$('.time_speed h2').html('Скорость времени: x0');
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
		if (mbut == 'timeup' && simulation_refresh){
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
			location.href = location;
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
			if (pfb == 'delete'){clear('#000');};
			if (switcher.help){
				$('.help_menu').css('display', 'none');
				switcher.help = false;
			}else{
				close_all_menus();
				switcher.help = true;
				$('.help_menu').fadeIn(0);
			}
			change_state('help');
		}
		$('#'+pfb).css({background: 'none'});
		$('#'+mbut).css({background: '#fff2'});
		if (switcher[mbut]){$('#'+mbut).css({background: '#fff8'});}
	});
	$('#'+mbut).css({background: '#fff8'});

	function close_all_menus(e){
		$('#'+mbut).css({background: '#fff2'});
		$('.menu_options').css('display', 'none'); switcher.create = false;
		$('.del_menu_options').css('display', 'none'); switcher.delete = false;
		$('.help_menu').css('display', 'none'); switcher.help = false;
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

	function randColor() {
		var r = Math.floor(getRandomArbitrary(40, 255)),
			g = Math.floor(getRandomArbitrary(40, 255)),
			b = Math.floor(getRandomArbitrary(40, 255));

		r = r.toString(16); g = g.toString(16); b = b.toString(16);

		r = r.length < 2 ? '0'+r.toString(16) : r.toString(16);
		g = g.length < 2 ? '0'+g.toString(16) : g.toString(16);
		b = b.length < 2 ? '0'+b.toString(16) : b.toString(16);
		color = '#' + r + g + b;
		$('.col_select').attr({'value': color});
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
});
