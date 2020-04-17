var request = require("request");

const bot_token = "token";

var queueSendMessage = [];
var timeSendedUserMessage = {};

function sendMessage(params) {
	queueSendMessage.push(params);
	return queueSendMessage;
}

function getAccessSendMessage(chat_id) {
	if (!(chat_id in timeSendedUserMessage)) return true;
	return timeSendedUserMessage[chat_id] + 1 <= Math.floor(new Date().getTime() / 1000);
}

setInterval(function () {
	queueSendMessage.map(function (form) {
		if (getAccessSendMessage(form.chat_id)) {
			queueSendMessage.shift()

			request({
				url: "https://api.telegram.org/bot" + bot_token + "/sendMessage",
				method: "POST",
				form: form,
			})

			timeSendedUserMessage[form.chat_id] = Math.floor(new Date().getTime() / 1000);
		}
	})
}, Math.round(1 / 30 * 1000));

module.exports = {
	sendMessage
}
