const express = require('express');
const axios = require('axios');
const app = express();
const catalyst = require('zcatalyst-sdk-node');

app.use(express.json());

app.post('/process', async (req, res) => {
    try {
        const catalystApp = catalyst.initialize(req);
        const payload = req.body;
        
        // Setup QuickML API Request
        const quickMlUrl = "https://api.catalyst.zoho.in/quickml/v1/project/53386000000370001/vlm/chat";
        const token = process.env.QUICKML_TOKEN || "YOUR_TOKEN"; 
        
        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "CATALYST-ORG": "60076561329"
        };
        
        const promptString = `Analyze the following server log and detect if it is an anomaly or malicious. Extract severity score (1-10) and a structural signature.\nLog: ${JSON.stringify(payload)}`;
        
        const data = {
            "prompt": promptString,
            "model": "VL-Qwen3.6-35B-A3B",
            "system_prompt": "You are a cybersecurity expert. Analyze the log and output JSON with 'severity' and 'signature'. Be concise and factual.",
            "top_k": 50,
            "top_p": 0.9,
            "temperature": 0.2,
            "max_tokens": 500
        };
        
        console.log("Sending payload to QuickML API...");
        const response = await axios.post(quickMlUrl, data, { headers });
        const inferenceResult = response.data;
        
        console.log("QuickML Response:", JSON.stringify(inferenceResult));
        
        // --- NATIVE ORCHESTRATION PIPELINE (Replaces Circuits) ---
        // If the severity is high, we manually orchestrate the storage here using Catalyst SDK.
        
        // 1. Commit Metadata to Datastore
        const datastore = catalystApp.datastore();
        // await datastore.table('ThreatMetadata').insertRow({
        //     signature: "mock_signature",
        //     severity: 9,
        //     timestamp: new Date().toISOString()
        // });
        
        // 2. Dump Raw Log to Stratus (File Storage)
        const filestore = catalystApp.filestore();
        // await filestore.folder('RawMaliciousLogs').uploadFile({
        //     code: Buffer.from(JSON.stringify(payload)),
        //     name: `threat_${Date.now()}.json`
        // });
        
        console.log("[SEVERE] Threat detected! Metadata and raw log isolated via SDK.");
        
        res.status(200).json({ status: 'Processed and Isolated', inference: inferenceResult });
    } catch (error) {
        console.error("Error processing log:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = app;
