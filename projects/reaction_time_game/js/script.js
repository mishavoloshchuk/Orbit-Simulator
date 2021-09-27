$('document').ready(function(){
	$('.h1').html('Тест на реакцию');
	var t1;
	var t2;
	var state = false;
	var now = false;
	var snd = false;
	var soundplay = false;
	var sound = false;

	document.addEventListener('keydown', function(key){
		console.log(key.keyCode);
		if (key.keyCode != 17){
			$('.screen').mousedown();
			$('.screen').mouseup();		
		}
	})

	//Touch events ======================================
	$('.screen').on('touchstart', function(event){
		event.preventDefault();
		$('.screen').trigger('mousedown', event);
	});

	$('.screen').mousedown(function(e){
		console.log(snd);
		if (!state){
			$('.h1').html('...');
			$(this).css({transition: '0.5s', background: '#000'});
			state = true;
			sec = getRandomIntInclusive(700, 7000);//5000, 30000
			time = setTimeout(react, sec);
			t2 = Date.now() + sec;
			var audio = new Audio();
			audio.preload = 'auto';
			audio.src = 'noww.wav';

			var ctrl = e.ctrlKey;
			if (ctrl){
				if (snd){soundplay = false; snd = false;}else{soundplay = true; snd = true;};
				}
			if (soundplay){soundClick(sec - 190, audio);}; //-33.(3) sound delay===================
		} else {
			if (now){

				t2 = Date.now();
				$('.h1').html(t2-t1+'ms');
				now = false;
			} else {
				t1 = Date.now();
				$(this).css({transition: '0.5s', background: '#83F054'});
				$('.h1').html('Слишком быстро! Еще:'+ (t2 - t1)+'мс');
				state = false;
				clearTimeout(time);
				clearTimeout(sound);
			}
			
			$(this).css({transition: '0.5s', background: '#83F054'});
			state = false
		}

		function react(){
			state = true;
			now = true;
			t1 = Date.now();
			$('.h1').html('КЛИКАЙ!');
			$('.screen').css({transition: '0s', background: '#FF4015'});
		};

	});

	function getRandomIntInclusive(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min; //Включаючи мінімум та максимум 
	};

	function soundClick(t, audio) {
		sound = setTimeout(function (){audio.play();}, t);
	}

	//ContextMenu
	$('*').bind('contextmenu', function(e) {
		return false;
	});

		var audio = new Audio(); // Создаём новый элемент Audio
		audio.src = '/music/music.mp3'; // Указываем путь к звуку "клика"
		audio.autoplay = true; // Автоматически запускаем

});