require('dotenv').config()
const mysql = require('mysql2')
const connection = mysql.createConnection(process.env.DATABASE_URL)
console.log('Connected to PlanetScale!')

const fs = require('fs');
const throat = require('throat');
const readline = require('readline');

const JSON5 = require('json5');

const fetch = require('node-fetch');
/*
const open = require('lmdb').open;
let db = open({
	path: 'index.db',
	// any options go here, we can turn on compression like this:
	compression: true,
});
*/
const data = fs.createReadStream('inscription_number_to_id.tsv');
let lineReader = require('readline').createInterface({
	input: data
});

function isJsonString(str) {
	if(str == 'null') return false
	try {
		JSON5.parse(str)
	} catch (e) {
		return false;
	}
	return true;
}

function arrayEquals(a, b) {
	return Array.isArray(a) &&
		Array.isArray(b) &&
		a.length === b.length &&
		a.every((val, index) => val === b[index]);
}

//lineReader.on('line', throat(1, async function (line) {
//let main = async (startFrom) => {
//for await (const line of lineReader) {

async function processLineAsync(line) {

	console.log(line)

	if(parseInt(line.split('\t')[0]) <= 13084951)	return;

	return new Promise(async (resolve, reject) => {
/*
	if(parseInt(line.split('\t')[0]) <= startFrom) {

		resolve();
		return;

	}
*/
	const response = await fetch('http://ec2-3-143-3-0.us-east-2.compute.amazonaws.com:9001/inscription/' + line.split('\t')[1]);

	let text = await response.text()
	text = text.replace(/\s/g,'')
	
	const type_pattern = /<dt>contenttype<\/dt><dd>([^<]*)<\/dd>/;
        const type_match = text.match(type_pattern);

	if(type_match == null) {
		
		resolve();
		return;

	}

	if(type_match[1].includes("text/plain") || type_match[1] == "application/json") {

		const content_pattern = /<dt>content<\/dt><dd><ahref=\/content\/([^<]*)>link<\/a><\/dd>/;
        	const content_match = text.match(content_pattern);

		const response1 = await fetch('http://ec2-3-143-3-0.us-east-2.compute.amazonaws.com:9001/content/' + content_match[1]);
        	let content = await response1.text()
		content = content.trim()

		console.log(typeof content)

		const pattern = /^\S+\.\S+$/;
		
		if(isJsonString(content)) {

			let keys = ['p', 'op', 'name', 'avatar', 'rev', 'relay']
			let required = ['p', 'op', 'name']
			let intersection = Object.keys(JSON5.parse(content)).filter(value => required.includes(value))
			//let union = [...new Set([...Object.keys(JSON5.parse(content)), ...keys])];

			if(intersection.length < 3/* || union.length > 6*/) {
				
				resolve();
				return;

			}

		} else if(pattern.test(content)) {

			console.log(content)

		} else {

			resolve();
			return;

		}

		const block_pattern = /<dt>genesisheight<\/dt><dd><ahref=\/block\/([^<]*)>/;
        	const block_match = text.match(block_pattern);
	
		console.log(text, line.split('\t'), type_match[1], content_match[1], content, block_match[1])

		connection.query('INSERT INTO satsnames.index (inscription_number, id, type, content, genesis_height) VALUES (?,?,?,?,?)', 
			[...line.split('\t'), type_match[1], content, block_match[1]], (error, results) => {if (error) throw new Error(error);});

	} else {

		console.log(line.split('\t')[0], type_match[1])

	}

	resolve();
	return;

	})

}

const main = async () => {	
	for await (const line of lineReader) {
		await processLineAsync(line);
	}
}

main()
/*
connection.query('SELECT MAX(inscription_number) FROM satsnames.index;', 
	(error, results) => {
	
		if (error) throw new Error(error);
		processLines(results[0]['max(inscription_number)'])

	});
//main()
*/

lineReader.on('SIGINT', () => {
	
	lineReader.question('Are you sure you want to exit? ', (answer) => {
		if (answer.match(/^y(es)?$/i)) lineReader.pause();
	});

}); 

lineReader.on('close', function () {
	
	console.log('all done, son');
//	db.close()
	connection.end()
});

//connection.end()


