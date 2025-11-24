# Gemini 3.0 Voice Demo (Italian) - Walkthrough

## Overview
This demo showcases a voice-to-voice interaction using Google's Gemini model (simulated with Gemini 1.5 Flash for speed) and browser-based Text-to-Speech. The interface is fully in Italian.

## Prerequisites
1.  **Node.js** installed.
2.  **Gemini API Key**: You need a valid API key from Google AI Studio.
3.  **n8n Webhook URL** (Optional): For logging usage metrics.

## Setup

1.  **Configure Environment**:
    - Rename `.env.example` to `.env`.
    - Add your `GEMINI_API_KEY`.
    - Add your `N8N_WEBHOOK_URL` (if available).

    ```bash
    cp .env.example .env
    # Edit .env with your keys
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Start Server**:
    ```bash
    node server.js
    ```

4.  **Access Demo**:
    - Open Chrome (or any modern browser) and navigate to `http://localhost:3000`.

## Usage Guide

1.  **Start Recording**: Click the **"Parla"** button (Microphone icon).
2.  **Speak**: Say something in Italian, e.g., *"Ciao, puoi spiegarmi come funziona l'intelligenza artificiale?"*.
3.  **Stop Recording**: Click the **"Stop"** button.
4.  **Wait**: The system will process your audio.
5.  **Listen**: The response will be displayed as text and spoken aloud automatically.

## Verification Steps

### 1. Basic Conversation
- **Action**: Ask "Qual è la capitale d'Italia?".
- **Expected Result**:
    - Status changes to "Elaborazione...".
    - Text appears: "La capitale d'Italia è Roma." (or similar).
    - Audio plays the response in Italian.

### 2. Latency Check
- **Action**: Observe the "Latenza" metric (currently placeholder, check console/logs for actual processing time).
- **Goal**: Response should start within ~2 seconds.

### 3. n8n Logging
- **Action**: Check your n8n workflow executions.
- **Expected Result**: A JSON object containing `inputTokens`, `outputTokens`, `durationMs`, and `model`.

## Troubleshooting
- **Microphone Error**: Ensure you have granted microphone permissions to the browser.
- **No Audio**: Check your system volume. Ensure `window.speechSynthesis` is supported (Chrome/Safari/Edge/Firefox).
- **API Error**: Check server logs for invalid API key or quota limits.
