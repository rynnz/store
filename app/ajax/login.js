var express = require("express");
var session = require("express-session");

var ajaxs = require('./app/routes/ajax');

module.exports = async function (req, res, next, db) {
	var owner = await db.promiseSelect("SELECT * FROM accounts WHERE login = ? AND password = ?", [req.body.login, req.body.password]);


	console.log(owner)


	res.end("Okay")


}
