'use strict';

/**
 * Success message for response construction.
 *
 * @param {string} message - Message to send back
 *  to user about the successful action.
 * @param {object=} data - Optional Data Payload.
 * @param {object=} links - HATEOAS compliant links to additional
 * actions for this success
 * @param {string=} status - Status message constant
 *  for switches, defaults to 'SUCCESS'.
 * @constructor
 */
function SuccessMessage(message, data, links, status) {
    this.message = message;
    this.status = status || 'SUCCESS';
    if (data) {
        this.data = data;
    }
    if (links) {
        this.links = links;
    }
}

module.exports = {
    SuccessMessage: SuccessMessage
};
