const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const selfsigned = require('selfsigned')
const os = require('os')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0' // Allow external connections
const port = process.env.PORT || 3001

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Generate self-signed certificate
const attrs = [{ name: 'commonName', value: 'localhost' }]
const pems = selfsigned.generate(attrs, { days: 365 })

const httpsOptions = {
  key: pems.private,
  cert: pems.cert
}

async function startServer() {
  try {
    await app.prepare()

    const server = createServer(httpsOptions, async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })

    server.listen(port, hostname, (err) => {
      if (err) throw err
      
      // Get network interfaces to show actual IP addresses
      const interfaces = os.networkInterfaces()
      const addresses = []
      
      for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
          // Skip internal and non-IPv4 addresses
          if (interface.family === 'IPv4' && !interface.internal) {
            addresses.push(interface.address)
          }
        }
      }
      
      console.log(`🚀 HTTPS Development Server Ready!`)
      console.log(``)
      console.log(`📱 For iOS mobile testing, open one of these URLs:`)
      addresses.forEach(addr => {
        console.log(`   https://${addr}:${port}`)
      })
      console.log(``)
      console.log(`💻 Local access: https://localhost:${port}`)
      console.log(``)
      console.log(`⚠️  Important: Accept the self-signed certificate warning on your device`)
      console.log(`   iOS: Tap "Advanced" → "Proceed to [address]"`)
      console.log(`   Android: Tap "Advanced" → "Proceed to [address] (unsafe)"`)
    })
  } catch (ex) {
    console.error(ex.stack)
    process.exit(1)
  }
}

startServer() 