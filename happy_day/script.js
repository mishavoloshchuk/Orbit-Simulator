window.onload = function(){
	function roundPlus(x, n) { //x - число, n - количество знаков 
		if(isNaN(x) || isNaN(n)) {
			return false;
		} else { 
			return Math.round(x*Math.pow(10,n))/Math.pow(10,n); 
		}
	}
	function roundnumb(x, n = 1) {
		return Math.round(x*Math.pow(10,n))/Math.pow(10,n);
	}

	function zero(num, s = false) {
		if (s==false){
			if (num < 10) { return '0' + num; } else { return num; }
		} else {
			if (num != Math.round(num)){
				if (num < 10) { return '0' + num; 	} else { return num; }	
			} else {
				if (num < 10) { return '0' + num + '.0'; } else { return num + '.0'; }						
			}
		}
	}

	setInterval(ref, 100);
	function ref() {
		st  = 1591197330;
		t1 = 1622678400;
		t2 = Date.now()/1000;
		sec = roundPlus((t1 - t2), 1);

		if (sec <= 0) { document.location.href = "happy_birthday.html";	}

		remind = convertt(sec);
		progressbar.value = (1-sec/(t1-st))*100;
		timleft.innerHTML = remind;
		time.innerHTML = Math.floor(sec);
	}

	function convertt(sec, symb=':') {
		var hour = Math.floor(sec / 60 / 60);
		var minutes = Math.floor(sec / 60 - hour * 60);
		var seconds = sec % 60 % 60;
		return String(zero(hour)) + symb + String(zero(minutes)) + symb + String(zero(roundnumb(seconds, 2), true));
	}
};	