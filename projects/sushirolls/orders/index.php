<?php require_once($_SERVER['DOCUMENT_ROOT'].'/db/config.php'); 
if (isset($_POST['ordId'])){
	$id = $_POST['ordId'];
	$sql = "UPDATE `orders` SET `completed` = '1' WHERE `id` = '$id';";
	$cnct->query($sql);
}
if (isset($_POST['ordIdCancel'])){
	$id = $_POST['ordIdCancel'];
	$sql = "UPDATE `orders` SET `completed` = '0' WHERE `id` = '$id';";
	$cnct->query($sql);
}
?>
<!DOCTYPE html>
<html lang="ua">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" type="text/css" href="../styles/main.css">
	<link rel="preconnect" href="https://fonts.gstatic.com">
	<link href="https://fonts.googleapis.com/css2?family=Lobster&display=swap" rel="stylesheet">
	<link rel="preconnect" href="https://fonts.gstatic.com">
	<link href="https://fonts.googleapis.com/css2?family=Yanone+Kaffeesatz:wght@300&display=swap" rel="stylesheet">
	<link href="https://fonts.googleapis.com/css2?family=Yanone+Kaffeesatz:wght@300&display=swap" rel="stylesheet">
	<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@300&display=swap" rel="stylesheet">
	<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@200&display=swap" rel="stylesheet">
	<title>Sushi Rolls</title>
</head>
<body>
	<header>
		<div class="container unselectable">
			<div class="innerHeader container row-flex">
				<div class="logo-outer">
					<h1 class="logo" onclick="document.location.href = '/'">SushiRolls</h1>
				</div>
				<ul>
					<li><a href="/">Головна</a></li>
					<li><a onclick="sessionStorage['menu'] = 'Роли'; sessionStorage['redirect'] = true; document.location.href = '/'">Меню</a></li>
					<li class="action"><a onclick="sessionStorage['menu'] = 'Акції'; sessionStorage['redirect'] = true; document.location.href = '/'">Акції</a></li>
					<li><a href="../delivery&paynment.html">Доставка\Оплата</a></li>
					<li><a href="../contacts.html">Контакти</a></li>
				</ul>
			</div>
		</div>
	</header>
	<div class="margin-zone"></div>
	<hr>
	<section class="container about-us select-color">
		<h1>Замовлення</h1>
		<form action="" id="changeOrderState" method="POST"></form>
		<?php 
		$orders = $cnct->query("SELECT * FROM `orders` ORDER BY `date` DESC LIMIT 100");
		while ($order = $orders->fetch_assoc()){ 
			?>
			<div class="order <?php if ($order['completed']){echo 'completedCol';}?>">
				<div class="orderDoneButton"><button class="orderDoneButton" form="changeOrderState" name="<?php if ($order['completed']){echo 'ordIdCancel';} else {echo 'ordId';}?>" value="<?echo $order['id'];?>"><?php if ($order['completed']){echo 'Позначити як не виконане ⨉';} else {echo 'Позначити як виконане ✔';} ?></button></div>
				<h3>Замовлення № <?echo $order['id'];?></h3>
				<p>Ім'я замовника: <b><?echo $order['name'];?></b></p>
				<p>Телефон: <b><?echo $order['phone'];?></b></p>
				<p>Комплекти паличок: <b><?echo $order['sticksNum'];?></b></p>
				<p>Комплекти навчальних паличок: <b><?echo $order['educSticksNum'];?></b></p>
				<p>Кількість людей: <b><?echo $order['peopleNum'];?></b></p>
				<p>Адреса доставки: <b><?
				if ($order['adressHouse'] == 'Квартира'){
					echo "м. ".$order['cityName'].', вул. '.$order['streetName'].' '.$order['buildNum'].', під\'їзд: '.$order['entranceNumb'].', Поверх: '.$order['floorNumb'].', квартира № '.$order['apartmentNumb'];
				} else {
					echo "м. ".$order['cityName'].', вул. '.$order['streetName'].' '.$order['buildNum'].'.';
				}

					?></b></p>		
				<p>Повідомлення замовника: <b><?echo $order['userMessage'];?></b></p>
				<p>Дата оформлення: <b><?echo explode('.', $order['date'])[0];?></b></p>
				<p>Список замовлень:</p>
				<div class="ordersBox">
					<?php 
					$totalCost = 0;
					$ordersList = json_decode($order["jsonOrders"], true);
					foreach($ordersList as $oi){ ?>
						<div class="orderItem">
							<div class="innerOrderItem">
								<img class="ordImg" src="<?echo $oi['imgsrc'];?>" alt="">
								<div class="abouOrder">
									<div class="flex-space-between display-flex">
										<h3 class="orderTitle"><?echo $oi['title'];?></h3>
									</div>
									<div class="countAndCost flex-space-between display-flex">
										<p>Кількість: <b><?echo $oi['count'];?></b></p><h3 class="hryvna ordCost"><?echo $oi['cost']*$oi['count']; $totalCost+=$oi['cost']*$oi['count']; ?></h3>
									</div>
								</div>
							</div>
						</div>
					<?php } ?>
				</div><br>
				<p>Сума: <?echo $totalCost; ?> грн. Доставка: <?if($totalCost >= 300){echo 'Безкоштовно';}else{echo '50 грн.';} ?></p>
				<h3>Всього: <?if($totalCost >= 300){echo $totalCost;}else{echo $totalCost + 50;} ?> грн.</h3>
			</div>
		<?php } ?>
		<br><br>
	</section>
	<footer>
		<div class="container">
			<div class="innerHeader container row-flex">
				<div class="logo-outer">
					<h1 class="logo">SushiRolls</h1>
				</div>
				<span>SushiRolls © 2021</span>
			</div>
		</div>		
	</footer>
</body>
<script type="text/javascript">
let header = document.querySelector('header'); 
window.requestAnimationFrame(frame);
function frame(){
	window.requestAnimationFrame(frame);
	if (window.pageYOffset > 20){
		header.style.boxShadow = '0px 0px 10px #777777';
		header.style.padding = '5px  0';
	} else {
		header.style.boxShadow = 'none';
		header.style.padding = '10px  0';
	}
}
this.orderList = JSON.parse(window.sessionStorage.getItem('order')) || [];
if (document.querySelector('.order-count-icon')){
	document.querySelector('.order-count-icon').innerHTML = addArrIndex(orderList, 2);	
}

function addArrIndex(arr, indx){
	let count = 0;
	for (let i in arr){
		count += arr[i][indx];
	}
	return count;
}

</script>
</html>