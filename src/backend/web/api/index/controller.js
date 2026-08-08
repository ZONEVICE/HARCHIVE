const _ = {}

// Health check. The parameter is named `req` even though it goes unused: calling it `_` shadowed
//  the module object this file is built on, which would have silently broken the first line of
//  code here that reached for it.
_.ping = async (req, res) => {
    try {
        return res.status(200).json({ status: 'success', description: 'pong' })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'ping failed' })
    }
}

module.exports = _
