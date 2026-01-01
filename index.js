/**
 * YouTube Session Proxy
 * 
 * Proxies requests to bgutil-pot-server and transforms the response
 * to match the format expected by Cobalt's YOUTUBE_SESSION_SERVER.
 * 
 * bgutil returns:  { contentBinding, poToken, expiresAt }
 * Cobalt expects:  { visitor_data, potoken, updated }
 */

const express = require('express');
const app = express();

const BGUTIL_SERVER = process.env.BGUTIL_SERVER || 'https://bgutil-pot-v3.onrender.com';
const PORT = process.env.PORT || 10000;

app.use(express.json());

// Health check
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', upstream: BGUTIL_SERVER });
});

// Main token endpoint - matches yt-session-generator format
app.get('/token', async (req, res) => {
  try {
    console.log('[proxy] Token request received');
    
    const response = await fetch(`${BGUTIL_SERVER}/get_pot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      console.error('[proxy] bgutil error:', response.status);
      return res.status(502).json({ error: 'Failed to get session from bgutil' });
    }

    const data = await response.json();
    console.log('[proxy] bgutil response received, transforming...');

    // Transform to Cobalt's expected format
    // Cobalt expects: visitor_data, potoken, and updated timestamp
    const cobaltFormat = {
      visitor_data: data.contentBinding,
      potoken: data.poToken,
      updated: Date.now()  // Cobalt needs this timestamp
    };

    console.log('[proxy] Sending transformed response with updated timestamp');
    res.json(cobaltFormat);

  } catch (error) {
    console.error('[proxy] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`YouTube Session Proxy running on port ${PORT}`);
  console.log(`Upstream bgutil server: ${BGUTIL_SERVER}`);
});
