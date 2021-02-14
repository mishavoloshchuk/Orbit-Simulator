window.onload = function(){
	function roundPlus(x, n) { //x - число, n - количество знаков 
		if(isNaN(x) || isNaN(n)) { return false;
		} else { return Math.round(x*Math.pow(10,n))/Math.pow(10,n); }
	}
	function roundnumb(x, n = 1) { return Math.round(x*Math.pow(10,n))/Math.pow(10,n) }

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
		t1 = 1622667600;
		t2 = Date.now()/1000;
		sec = roundPlus((t1 - t2), 1);
		sec = sec<0?0:sec;
		if (sec <= 0) { document.location.href = "happy_birthday.html";	}

		remind = convertt(sec);
		progressbar.value = (1-sec/(t1-st))*100;
		timleft.innerHTML = remind;
		time.innerHTML = Math.floor(sec);
	}

	function convertt(sec, symb=':') {
		var days = Math.floor(sec/60/60/24)
		var hour = Math.floor(sec / 60 / 60 - days*24);
		var minutes = Math.floor(sec / 60 - (hour + days*24) * 60);
		var seconds = sec % 60 % 60;
		var text = '';
		var mwd = window.innerWidth>window.innerHeight;
		var smlr = !mwd?false:window.innerWidth<1345;
		if (days){text += String(String(days)); text += smlr?' дн. ':wrdF(' ',days,'days'); text += mwd?' ':'<br>'}
		if (hour||days){text += String(String(hour)); text += smlr?' год. ':wrdF(' ',hour,'hours'); text += mwd?' ':'<br>'}
		if (minutes||hour||days){text += String(String(minutes)); text += smlr?' хв. ':wrdF(' ',minutes,'minutes'); text += mwd?' ':'<br>'}
		text += String(zero(roundnumb(seconds, 2), true)); text += smlr?' сек. ':wrdF(' ',seconds,'seconds');
		
		document.querySelector('h1').style.fontSize = mwd?'64px':'100px';
		return text;
	}

	function wrdF(preSymb = '', numb, type){
		snumb = String(Math.floor(numb));
		snmb = snumb.length>1? snumb[snumb.length-2]==1?true:false :false;
		snumb = Number(snumb[snumb.length-1]);
		//Words array
		words = {'days': ['днів', 'день', 'дня'], 'hours': ['годин', 'година', 'години'], 'minutes': ['хвилин', 'хвилина', 'хвилині'], 'seconds': ['секунд', 'секунда', 'секунди']}
		if (snumb == 0 || snmb){return preSymb + words[type][0]}
		if (snumb == 1){return preSymb + words[type][1]}
		if (snumb >= 2 && snumb <5){return preSymb + words[type][2]}
		if (snumb >= 5){return preSymb + words[type][0]}
	}
};	