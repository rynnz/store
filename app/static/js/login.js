$(function () {
	$("#button-login").click(function () {
		$.ajax({
			url: "/ajax/login",
			type: "POST",
			data: {
				login: $("#login").val(),
				password: $("#password").val(),
			},
			success: function (data) {
				if (data.status) {
					location.href = "/"
				} else alert(data.msg);
			}
		})
	})
})
