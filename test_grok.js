const key = "kYN9mdLGsnsKfjSkH1Ptd6xwEQMACsxLOqotrnWtDpTvYcPUw5fiO3K1B0YO";

const test = async () => {
  try {
    console.log("Sending request to x.ai...");
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2',
        messages: [{ role: 'user', content: 'Say hello in 5 words.' }],
      }),
    });

    const data = await response.json();
    console.log("RESPONSE:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("ERROR:", err.message);
  }
};

test();
