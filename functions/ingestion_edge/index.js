const express = require('express');
const app = express();
const catalyst = require('zcatalyst-sdk-node');
const crypto = require('crypto');

app.use(express.json());

app.post('/ingest', async (req, res) => {
    try {
        const catalystApp = catalyst.initialize(req);
        const payload = req.body;
        
        // Compute structural hash
        const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
        
        // O(1) lookup in Catalyst Cache
        const cache = catalystApp.cache();
        const segment = cache.segment(); // Uses Default Segment
        
        try {
            const cachedItem = await segment.getValue(hash);
            if (cachedItem) {
                // Cache Hit: Malicious signature matched, drop at edge
                return res.status(403).json({ status: 'Forbidden', message: 'Payload rejected by edge defense' });
            }
        } catch (err) {
            // Cache Miss: Proceed to ingestion
        }
        
        res.status(202).json({ status: 'Accepted', message: 'Payload queued for inference' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = app;
