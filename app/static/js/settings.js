$(function () {
	loadPresents()

	$("#presents-search").keyup(function () {
		loadPresents(this.value.trim() != "" ? this.value : null)
	})
})


function saveSettings() {
	$.ajax({
		url: "/ajax/client",
		type: "POST",
		data: {
			type: "settings",
			params: {
				password: $("#settings-password").val(),
				telegram: $("#settings-telegram").val(),
			}
		},
		success: function (data) {
			if (data.status) {
				alert(data.msg)
			} else alert(data.msg);
		}
	})
}

function addPresents() {
	$.ajax({
		url: "/ajax/load.presents",
		type: "POST",
		data: {
			type: "add",
			params: {
				category: $("#presents-add-category").val(),
				domain: $("#presents-add-domain").val(),
			},
		},
		json: true,
		success: function (data) {
			if (data.status) {
				loadPresents()
				alert(data.msg);
			} else alert(data.msg)
		}
	})
}

function loadPresents(query, page) {
	if (!page) page = 0;

	$.ajax({
		url: "/ajax/load.presents",
		type: "POST",
		data: {
			type: "load",
			query: query,
			page: page,
		},
		json: true,
		success: function (data) {
			if (data.status) {
				if (page == 0) $("#presents-table tbody").html("");

				$("#list-more-presents").remove();
				$("#presents-table table").show()

				data.response.map(function (row) {
					$("#presents-table tbody").append(
						'<tr id="present-' + row.id + '">' +
						'<td>' + getPresentsCategory(row.category) + '</td>' +
						'<td>' + row.domain + '</td>' +
						'<td>' +
						'<span onclick="removePresents(' + row.id + ')" style="cursor:pointer" data-feather="trash"></span>' +
						'</td>' +
						'</tr>'
					)
				})

				if (data.response.length >= 15) {
					$("#presents-table").append(
						'<button id="list-more-presents" onclick="loadPresents(\'' + (query ? query : "") + '\', ' + (++page) + ')" class="btn btn-primary btn-block">Next (#' + (page) + ')</button>'
					);
				}

				feather.replace()
			} else alert(data.msg);
		}
	})
}

function removePresents(id) {
	$.ajax({
		url: "/ajax/load.presents",
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
				loadPresents()
				alert(data.msg);
			} else alert(data.msg)
		}
	})
}