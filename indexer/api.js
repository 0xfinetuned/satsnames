require('dotenv').config()
const mysql = require('mysql2')
const connection = mysql.createConnection(process.env.DATABASE_URL)
console.log('Connected to PlanetScale!')

const fetch = require('node-fetch')
const express = require('express')
cors = require('cors')
const app = express()
app.use(express.json());
app.use(cors())

const port = 9000

const JSON5 = require('json5');

function isJsonString(str) {
	if(str == 'null') return false
	try {
		JSON5.parse(str)
	} catch (e) {
		return false;
	}
	return true;
}

function getCodePoints(str) {
	const codePoints = str.split("").map((char) => {
		const point = char.codePointAt(0);
		if (typeof point === "undefined") return "";

		if (point <= 256) {
			return char;
		} else {
			return `{\\u${point.toString(16)}}`;
		}
	});

	return codePoints.join("");
}

app.get('/names', (req, res) => {

	if(req.query.hasOwnProperty("cursor")) {

		connection.query(`select * from satsnames.index where inscription_number < ? order by inscription_number desc limit 100;`, req.query.cursor, async (err, result) => {

			res.json(await Promise.all(result.map(async e => {

				const response = await fetch('http://ec2-3-143-3-0.us-east-2.compute.amazonaws.com:9001/inscription/' + e.id);
				let text = await response.text()
				text = text.replace(/\s/g,'')

				const address_pattern = /<dt>address<\/dt><ddclass=monospace>([^<]*)<\/dd>/;
				const address_match = text.match(address_pattern);

				if(isJsonString(e.content)) {
					return {
						"name": JSON5.parse(e.content).name,
						"owner": address_match[1],
						"inscriptionId": e.id,
						"inscriptionIndex": parseInt(e.inscription_number)
					}
				} else {
					return {
						"name": e.content,
						"owner": address_match[1],
						"inscriptionId": e.id,
						"inscriptionIndex": parseInt(e.inscription_number)
					}

				}
			})))

		})

	} else {

		connection.query(`select * from satsnames.index order by inscription_number desc limit 100;`, async (err, result) => {

			res.json(await Promise.all(result.map(async e => {

				const response = await fetch('http://ec2-3-143-3-0.us-east-2.compute.amazonaws.com:9001/inscription/' + e.id);
				let text = await response.text()
				text = text.replace(/\s/g,'')

				const address_pattern = /<dt>address<\/dt><ddclass=monospace>([^<]*)<\/dd>/;
				const address_match = text.match(address_pattern);

				if(isJsonString(e.content)) {
					return {
						"name": JSON5.parse(e.content).name,
						"owner": address_match[1],
						"inscriptionId": e.id,
						"inscriptionIndex": parseInt(e.inscription_number)
					}
				} else {
					return {
						"name": e.content,
						"owner": address_match[1],
						"inscriptionId": e.id,
						"inscriptionIndex": parseInt(e.inscription_number)
					}

				}
			})))

		})

	} 

})

app.get('/names/:name', (req, res) => {

	console.log(req.params.name)

	let today = new Date();
	let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
	console.log(time)

	connection.query(`SELECT * FROM satsnames.index WHERE content LIKE CONCAT('%', ?, '%') ORDER BY genesis_height ASC`, [req.params.name], async (err, result) => {

		today = new Date();
		time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
		console.log(time)

		let chosen = result.map(e => {
			e.content = e.content.toLowerCase()
			return e
		}).filter(e => {
			if(isJsonString(e.content)) {
				return JSON5.parse(e.content).name == req.params.name
			} else {
				return e.content == req.params.name
			}
		})

		if(chosen.length == 0) {

			res.json({ "error": `${req.params.name} not found` })
			return;

		}

		today = new Date();
		time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
		console.log(time)

		const response = await fetch('http://ec2-3-143-3-0.us-east-2.compute.amazonaws.com:9001/inscription/' + chosen[0].id);
		let text = await response.text()

		today = new Date();
		time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
		console.log(time)

		const time_pattern = /<dd><time>([^<]*)<\/time><\/dd>/;
		const time_match = text.match(time_pattern);

		text = text.replace(/\s/g,'')

		const address_pattern = /<dt>address<\/dt><ddclass=monospace>([^<]*)<\/dd>/;
		const address_match = text.match(address_pattern);


		let queryDecoded = ""

		if(isJsonString(chosen[0].content)) queryDecoded = getCodePoints(JSON5.parse(chosen[0].content).name)
		else queryDecoded = getCodePoints(chosen[0].content)

		let rr = {
			"name": req.params.name,
			"inscriptionId": chosen[0].id,
			"owner": address_match[1],
			"inscriptionIndex": chosen[0].inscription_number,
			"genesisHeight": chosen[0].genesis_height,
			"registrationOp": {
				"op": "reg",
				"p": "sns",
				"name": req.params.name
			},
			//"nameIndex": 4,
			"timestamp": time_match[1],
			"queryDecoded": queryDecoded,
			"inscriptions": chosen.map(e => {
				return {
					"textContent": e.content,
					"inscriptionId": e.id,
					"inscriptionIndex": e.inscription_number
				}
			})
		}

		res.json(rr)

		//res.json(result.filter(e => JSON.parse(e.content).name == req.params.name))

	});

})


app.listen(port, () => {
	
	console.log(`Example app listening on port ${port}`)

})

