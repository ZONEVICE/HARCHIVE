// =====================================================================================
// STATE.
// =====================================================================================

// Everything this file publishes.
const _ = {}

// =====================================================================================
// TIME.
// =====================================================================================

/**
 * The current moment as the Unix Epoch in seconds. Every timestamp the backend stores goes
 *  through here — deleted_at, the directory dates — so nothing in the project ever holds
 *  milliseconds. Date.now() is the trap this exists to close: it answers milliseconds, and a
 *  column mixing the two units is off by a factor of a thousand with no visible symptom.
 * @returns {Number} Whole seconds since 1970-01-01.
 */
_.getSystemTime = () => Math.floor(Date.now() / 1000)

module.exports = _
