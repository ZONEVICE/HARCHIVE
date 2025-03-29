const _ = {}

_.Ping = async (_, res) => {
    res.status(200).json({ status: 'success', description: 'pong' })
}

module.exports = _
