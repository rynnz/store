$(function () {
	loadPasswords();

	$("#passwords-search").keyup(function () {
		loadPasswords(this.value.trim() != "" ? this.value : null)
	})
})

function loadPasswords(query, page) {
	if (!page) page = 0;

	$.ajax({
		url: "/ajax/load.passwords",
		type: "POST",
		data: {
			query: query,
			page: page,
		},
		json: true,
		success: function (data) {
			if (data.status) {
				if (page == 0) $("#passwords-data").html("");

				$("#pass-table table").show();
				$("#list-more-pass").remove();

				data.response.map(function (row) {
					$("#passwords-data").append(
						'<tr>' +
						'<td><img src="/img/browsers/' + row.browser + '.svg" class="img-fluid" style="width:1rem" alt="' + row.browser + '" title="' + row.browser + '"></td>' +
						'<td><a href="//' + row.url + '" target="_blank">' + row.url + '</a></td>' +
						'<td>' + row.login + '</td>' +
						'<td>' + row.password + '</td>' +
						'</tr>'
					)
				})

				if (data.response.length >= 50) {
					$("#pass-table").append(
						'<button id="list-more-pass" onclick="loadPasswords(\'' + (query ? query : "") + '\', ' + (++page) + ')" class="btn btn-primary btn-block">Next (#' + (page) + ')</button>'
					);
				}
				feather.replace()
			} else alert(data.msg);
		}
	})
}