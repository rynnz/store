var express = require("./express");
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database("database.db");

db.promiseSelect = async function dbSelect(sql, params) {
	return new Promise((res, rej) => {
		db.all(sql, params, function (err, rows) {
			if (err) rej(err);
			else res(rows);
		})
	});
}


express(db)