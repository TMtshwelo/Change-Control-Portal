const { spfi } = require('@pnp/sp');
const { SPFx } = require('@pnp/sp/behaviors/spfx');
require('dotenv').config({ path: './config.env' });

const sp = spfi(process.env.SHAREPOINT_SITE_URL).using(SPFx());

async function createChangeRequest(data) {
    try {
        const result = await sp.web.lists.getByTitle(process.env.SHAREPOINT_LIST_NAME).items.add({
            Title: data.title,
            RequestID: data.requestId,
            RequestorName: data.requestorName,
            RequestorEmail: data.requestorEmail,
            Department: data.department,
            Summary: data.summary,
            Description: data.description,
            ChangeType: data.changeType,
            Priority: data.priority,
            Status: "Pending",
            SubmittedDate: new Date().toISOString()
        });
        return result;
    } catch (error) {
        console.error('Error creating SharePoint item:', error);
        throw error;
    }
}

async function updateChangeRequest(id, data) {
    try {
        const result = await sp.web.lists.getByTitle(process.env.SHAREPOINT_LIST_NAME).items.getById(id).update(data);
        return result;
    } catch (error) {
        console.error('Error updating SharePoint item:', error);
        throw error;
    }
}

async function getChangeRequests(filter = '') {
    try {
        const items = await sp.web.lists.getByTitle(process.env.SHAREPOINT_LIST_NAME).items
            .filter(filter)
            .get();
        return items;
    } catch (error) {
        console.error('Error fetching SharePoint items:', error);
        throw error;
    }
}

module.exports = {
    createChangeRequest,
    updateChangeRequest,
    getChangeRequests
};