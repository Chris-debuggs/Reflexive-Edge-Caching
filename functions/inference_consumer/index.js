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
        // NOTE: The token should securely come from environment variables.
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
        
        // Here we would parse the result. If severity is high (>7), we trigger the Circuit.
        // For demonstration, we check for a SEVERE tag to hook into APM.
        console.log("[SEVERE] Potential threat detected from inference!");
        
        res.status(200).json({ status: 'Processed', inference: inferenceResult });
    } catch (error) {
        console.error("Error calling QuickML:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = app;
