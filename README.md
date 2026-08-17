# Aegis Reflex

Aegis Reflex is a serverless, autonomous threat-intelligence telemetry pipeline deployed exclusively on the Zoho Catalyst cloud ecosystem. Built for production-first environments, it implements a reflexive edge-caching mechanism to dynamically mitigate Layer 7 log-flooding attacks and utilizes native QuickML for zero-ops log anomaly classification.

## Core Architecture

The system enforces strict decoupling between ingestion and inference. This prevents API Gateway timeouts and compute exhaustion during high-volume traffic spikes.

* **Ingestion & Edge Defense:** Incoming logs hit the Catalyst API Gateway and invoke an Advanced I/O function. The function computes a SHA-256 structural hash of the payload keys.
* **Reflexive Cache:** The edge function queries Catalyst Cache. A cache hit (identifying a known malicious structure) results in an immediate $O(1)$ rejection with a `403 Forbidden` status. 
* **Backpressure Queue:** Cache misses are queued in a Catalyst Job Pool/Queue. The edge function terminates immediately with a `202 Accepted` status, offloading the processing delay.
* **Native Inference:** A consumer function pulls log batches from the queue and queries the QuickML LLM Serving API. The model evaluates the batch against a strict classification prompt to extract anomaly severity and structural signatures.
* **Stateful Orchestration:** Catalyst Circuits manage the execution flow. When QuickML flags an anomaly, the Circuit writes the signature back to the Catalyst Cache (creating the autonomous "reflex"), commits the raw payload to Stratus Object Storage, and writes the parsed metadata to Datastore.

## Prerequisites

* Zoho Catalyst CLI (`npm install -g zcatalyst-cli`)
* A configured Zoho Catalyst Project ID
* Node.js (v18+) for function runtimes
* QuickML API access enabled in the Catalyst Console

## Local Development & Deployment

1. **Initialize the Environment:**
   Clone the repository and authenticate the CLI.
   ```bash
   git clone https://github.com/your-org/aegis-reflex.git
   cd aegis-reflex
   catalyst login
   ```

2. **Configure Datastore & Cache:**
   Apply the necessary schema definitions via the Catalyst Web Console. Ensure a Datastore table named `ThreatMetadata` is created, and initialize the Default Cache segment.

3. **Deploy the Pipeline:**
   Deploy the functions, client, and routing configurations to the Catalyst cloud environment.
   ```bash
   catalyst deploy
   ```

4. **Circuit Binding:**
   Navigate to the Catalyst Console -> Circuits. Import the state machine definition from `circuits/threat_orchestration.json` and map the deployed functions and datastore actions to their respective states.

## Telemetry and Observability

Aegis Reflex requires native cloud monitoring to guarantee operational stability.

* **Application Performance Monitoring (APM):** Must be enabled on the `ingestion_edge` and `inference_consumer` functions to track p95 latency and queue depth.
* **Application Alerts:** The consumer function emits structured JSON logs containing a `[SEVERE]` tag when processing critical anomalies. Catalyst Application Alerts must be configured to parse these logs and trigger incident response webhooks.

## System Limits & Constraints

* The Catalyst Cache segment has a maximum TTL (Time To Live). Ensure signature TTLs are calibrated to avoid cache bloat while maintaining sufficient windowing for recurring attacks.
* QuickML inference latency introduces a processing delay. The system relies entirely on the Catalyst Job Pool to buffer this impedance mismatch. Do not bypass the queue for synchronous API responses.