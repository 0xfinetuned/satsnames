const fetch = require('node-fetch')
const express = require('express')
cors = require('cors')
const app = express()
app.use(express.json());
app.use(cors())

const port = 9000

const { exec } = require('child_process');

const dotenv = require("dotenv");
dotenv.config();

const USER = process.env.RPC_USER;
const PASS = process.env.RPC_PASSWORD;

app.post('/scantxoutset', (req, res) => {
  
	console.log(req.body)

	const options = {
		method: 'POST',
  		headers: {"content-type": "text/plain;"},
		body: `{"jsonrpc":"1.0","id":"curltext","method":"scantxoutset","params":["start", ["addr(${req.body.address})"]]}`
	};

	fetch(`http://${USER}:${PASS}@127.0.0.1:18332/`, options)
  	.then(response => response.json())
  	.then(response => {
		console.log(response)
		res.send(response.result)
	})
  	.catch(err => console.error(err));

})

app.post('/getrawtransaction', (req, res) => {
  
	console.log(req.body)

	const options = {
		method: 'POST',
  		headers: {"content-type": "text/plain;"},
		body: `{"jsonrpc":"1.0","id":"curltext","method":"getrawtransaction","params":["${req.body.txid}", true]}`
	};

	fetch(`http://${USER}:${PASS}@127.0.0.1:18332/`, options)
  	.then(response => response.json())
  	.then(response => {
		console.log(response)
		res.send(response.result)
	})
  	.catch(err => console.error(err));

})

app.post('/sendrawtransaction', (req, res) => {
  
	console.log(req.body)

	const options = {
		method: 'POST',
  		headers: {"content-type": "text/plain;"},
		body: `{"jsonrpc":"1.0","id":"curltext","method":"sendrawtransaction","params":["${req.body.rawtx}"]}`
	};

	fetch(`http://${USER}:${PASS}@127.0.0.1:18332/`, options)
  	.then(response => response.json())
	.then(response => {
		console.log(response)
		res.send({ "txid": response.result })
	})
  	.catch(err => console.error(err));

})



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
