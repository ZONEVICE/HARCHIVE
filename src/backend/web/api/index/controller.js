// =====================================================================================
// STATE.
// =====================================================================================

// Everything this file publishes.
const _ = {}

// =====================================================================================
// ROUTE CONTROLLERS.
// =====================================================================================

// Health check: answers that the process is up and serving. The first parameter is named
//  `req` although it goes unused — calling it `_` would shadow the module object this file
//  is built on.
_.ping = async (req, res) => {
    try {
        // Reaching this line is the whole answer: the process is up and routing requests.
        return res.status(200).json({ status: 'success', description: 'pong' })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'ping failed' })
    }
}

module.exports = _
