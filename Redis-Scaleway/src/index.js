const express = require("express") // Node.js web framework
const axios   = require("axios")   // HTTP client 
const cors    = require("cors")    // Node package for allowing CORS
const Redis   = require("redis")   // Redis
const fs      = require('fs')	   // Read the cert


const redisClient = Redis.createClient({
	url: 'redis://username:password@ip:port',
	socket: {
    	tls: true,
    	ca: [ fs.readFileSync('ssl_certificate.pem', encoding='ascii') ]
  	}
})

const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.listen(3000)
redisClient.connect();


const getResource = async (redisKey, fallbackURL) => {
	// Try to fetch datas from Redis.
	const obj = await redisClient.get(redisKey)
	if (typeof obj === 'string' && obj.length > 0) {
		return {data: JSON.parse(obj), source: 'redis'}
	}

	// Else fetch from API
	const { data } = await axios.get(fallbackURL)
	await redisClient.set(redisKey, JSON.stringify(data))
	return { data, source: 'api' }
}

const REDIS_PHOTOS_KEY = 'photos'

app.get("/photos", async (req, res) => {
	try {
		const obj = await getResource(REDIS_PHOTOS_KEY, 'https://jsonplaceholder.typicode.com/photos')
		res.json(obj)
	} catch (err) {
		res.json({ error: err.toString() })
	}
})

app.get("/photos/:id", async (req, res) => {
	try {
		// Check parameter.
		const imageId = req.params.id
		if (typeof imageId !== 'string' || imageId.length === 0) {
			res.json({ error: 'Invalid image identifier' })
			return
		}
		const photoCacheId = `photos/${imageId}`

		//
		const obj = await getResource(photoCacheId, `https://jsonplaceholder.typicode.com/photos/${imageId}`)
		res.json(obj)
	} catch (err) {
		res.json({ error: err.toString() })
	}
})